import {uiStatus} from './ui-language.mjs';
import {escapeHtml as esc} from './groups.mjs';
export const soIntrusionErrors={
 SO_INF01_HINT_USED:'Cet indice a déjà été consulté pour cette version du défi.',
 SO_INF01_CLOSED:'INF-01 n’est pas disponible pour cette version de la session.',
 SO_INF01_TARGET:'Cette serrure, ce coffre ou ce terminal fictif n’est pas prévu pour cette action. Demandez au MJ de vérifier le point de jeu.',
 SO_INF01_SKILL:'Le niveau INF-01 du personnage est insuffisant.',
 SO_INF01_UNAVAILABLE:'Votre personnage ne peut pas intervenir actuellement.',
 SO_INF01_PRESENCE:'Confirmez votre présence à ce point de jeu.',
 SO_INF01_BUSY:'Une autre action ou intrusion est engagée. Actualisez.',
 SO_INF01_COOLDOWN:'Dix minutes de récupération sont requises après résolution.',
 SO_INF01_TOO_EARLY:'L’intrusion est encore en cours. Attendez la fin du délai indiqué avant de terminer.',
 SO_INF01_STALE:'L’action ou la configuration a changé. Actualisez.',
 SO_INF01_ANSWER:'Saisissez un code de fiction valide avant de résoudre l’énigme.',
};
const seconds=ms=>Math.ceil(ms/1000)+' s';
export function soIntrusionHtml(d,sid){
 const t=d.target,a=d.active;
 let body='<p>Le QR donne accès à une scène fictive uniquement. Ne manipulez aucune serrure, serrure électronique ou terminal réel.</p>';
 if(!d.enabled&&!a)body+='<p>Vous ne possédez pas INF-01.</p>';
 else if(a?.status==='RUNNING'){
  body+='<p>Intrusion en cours : '+seconds(a.remainingMs)+' de jeu restantes.</p>';
  if(a.mode==='CODE')body+=(d.hints??[]).map(h=>'<form data-form="soIntrusionHint" data-sid="'+esc(sid)+'" data-target="'+esc(t.id)+'" data-hint="'+esc(h.id)+'"><button '+(h.used?'disabled':'')+'>Indice N'+esc(h.minLevel)+(h.used?' déjà consulté':' (une seule consultation)')+'</button><p data-hint-result></p></form>').join('');
  body+='<form data-form="soIntrusionFinish" data-sid="'+esc(sid)+'" data-id="'+esc(a.id)+'" data-target="'+esc(a.targetId)+'">'
   +(a.mode==='CODE'?'<p><strong>Mini-jeu à code : </strong>'+esc(t.challenge?.prompt??'')+'</p><label>Réponse de l’énigme<input name="answer" autocomplete="off" maxlength="128" required></label>':'')
   +'<label><input name="present" type="checkbox" required>Je suis toujours présent à ce point de jeu</label><button type="submit" '+(a.remainingMs>0?'disabled':'')+'>'
   +(a.mode==='CODE'?'Soumettre le code (sans lancer de dé)':'Lancer le D6 et résoudre')+'</button></form>';
  body+='<form data-form="soIntrusionCancel" data-sid="'+esc(sid)+'" data-id="'+esc(a.id)+'" data-target="'+esc(a.targetId)+'"><button type="submit">Interrompre sans coût</button></form>';
 }else if(d.cooldownMs>0)body+='<p>Récupération : '+seconds(d.cooldownMs)+' de jeu restantes.</p>';
  else body+='<form data-form="soIntrusionStart" data-sid="'+esc(sid)+'" data-target="'+esc(t.id)+'"><p>Niveau '+esc(t.minLevel)+' requis · '
   +(t.challenge?'Mini-jeu fictif : '+esc(t.challenge.durationSeconds)+' secondes, pas de D6':'1D6 + INF-01, seuil '+esc(t.threshold))
   +' · 1 PA à la résolution.</p>'+(!t.challenge?'<label>Équipement compatible (+1)<select name="bonusLotId"><option value="">Sans équipement bonus</option>'+(d.bonusLots??[]).map(l=>'<option value="'+esc(l.id)+'">'+esc(l.name)+'</option>').join('')+'</select></label>'+(d.consumable?'<label>Fourniture requise : '+esc(d.consumable.quantity)+' unité(s)<select name="consumableLotId" required><option value="">Choisir dans le sac</option>'+(d.consumableLots??[]).map(l=>'<option value="'+esc(l.id)+'">'+esc(l.name)+' ('+esc(l.quantity)+')</option>').join('')+'</select></label>':'')+'<label>Aide proposée (+1)<select name="aidOfferId"><option value="">Sans aide</option>'+(d.aidOffers??[]).map(o=>'<option value="'+esc(o.id)+'">'+esc(o.helperName)+'</option>').join('')+'</select></label>':'')+'<label><input name="present" type="checkbox" required>Je suis devant cette cible fictive préparée</label><button type="submit" '
   +(d.level<t.minLevel||t.busy||d.session.stage!=='EN_JEU'?'disabled':'')+'>Tenter l’intrusion</button></form>';
 const past=d.previous?.map(a=>'<article class="panel"><p>'+esc(uiStatus(a.status))+' · '+(a.mode==='CODE'?'Mini-jeu sans D6':a.roll===null?'Sans jet':esc(a.roll)+' + compétence = '+esc(a.total)+' / '+esc(a.threshold))+'</p>'+ (a.text?'<p class="prose">'+esc(a.text)+'</p>':'')+'</article>').join('')??'';
 return '<div class="narrow"><nav class="breadcrumb"><a href="#/action/'+esc(sid)+'">Mes actions</a></nav><h1>'+esc(t.title)+'</h1><p>'+esc(t.category)+' · '+esc(t.description)+'</p>'+body+past+'<button data-action="refresh" type="button" class="quiet">Actualiser</button></div>';
}

export function soIntrusionAdminHtml(d,sid){
 return '<div class="narrow"><h1>Intrusions en cours</h1><p>L’interruption restitue les ressources encore réservées, sans résoudre la cible.</p>'+(d.actions.length?d.actions.map(a=>'<section class="panel"><h2>'+esc(a.characterName)+'</h2><p>'+seconds(a.remainingMs)+' de jeu restantes</p><form data-form="soIntrusionCancelMJ" data-sid="'+esc(sid)+'" data-id="'+esc(a.id)+'"><label>Motif<input name="reason" maxlength="500" required></label><button>Interrompre l’intrusion</button></form></section>').join(''):'<p>Aucune intrusion en cours.</p>')+'</div>';
}
