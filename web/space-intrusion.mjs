import {escapeHtml as esc} from './groups.mjs';
export const soIntrusionErrors={
 SO_INF01_CLOSED:'INF-01 n’est pas disponible pour cette version de la session.',
 SO_INF01_TARGET:'Cette serrure, ce coffre ou ce terminal fictif n’est pas préparé dans le Master de la session.',
 SO_INF01_SKILL:'Le niveau INF-01 du personnage est insuffisant.',
 SO_INF01_UNAVAILABLE:'Votre personnage ne peut pas intervenir actuellement.',
 SO_INF01_PRESENCE:'Confirmez votre présence à ce point de jeu.',
 SO_INF01_BUSY:'Une autre action ou intrusion est engagée. Actualisez.',
 SO_INF01_COOLDOWN:'Dix minutes de récupération sont requises après résolution.',
 SO_INF01_TOO_EARLY:'La durée canonique de l’intrusion n’est pas encore écoulée.',
 SO_INF01_STALE:'L’action ou la configuration a changé. Actualisez.',
 SO_INF01_ANSWER:'Saisissez un code de fiction valide avant de résoudre l’énigme.',
};
const seconds=ms=>Math.ceil(ms/1000)+' s';
export function soIntrusionHtml(d,sid){
 const t=d.target,a=d.active;
 let body='<p>Le QR donne accès à une scène fictive uniquement. Ne manipulez aucune serrure, serrure électronique ou terminal réel.</p>';
 if(!d.enabled)body+='<p>Vous ne possédez pas INF-01.</p>';
 else if(a?.status==='RUNNING'){
  body+='<p>Intrusion en cours : '+seconds(a.remainingMs)+' de jeu restantes.</p>';
  body+='<form data-form="soIntrusionFinish" data-sid="'+esc(sid)+'" data-id="'+esc(a.id)+'" data-target="'+esc(a.targetId)+'">'
   +(a.mode==='CODE'?'<p><strong>Mini-jeu à code : </strong>'+esc(t.challenge?.prompt??'')+'</p><label>Réponse de l’énigme<input name="answer" autocomplete="off" maxlength="128" required></label>':'')
   +'<label><input name="present" type="checkbox" required>Je suis toujours présent à ce point de jeu</label><button type="submit" '+(a.remainingMs>0?'disabled':'')+'>'
   +(a.mode==='CODE'?'Soumettre le code (sans lancer de dé)':'Lancer le D6 et résoudre')+'</button></form>';
  body+='<form data-form="soIntrusionCancel" data-sid="'+esc(sid)+'" data-id="'+esc(a.id)+'" data-target="'+esc(a.targetId)+'"><button type="submit">Interrompre sans coût</button></form>';
 }else if(d.cooldownMs>0)body+='<p>Récupération : '+seconds(d.cooldownMs)+' de jeu restantes.</p>';
  else body+='<form data-form="soIntrusionStart" data-sid="'+esc(sid)+'" data-target="'+esc(t.id)+'"><p>Niveau '+esc(t.minLevel)+' requis · '
   +(t.challenge?'Mini-jeu fictif : '+esc(t.challenge.durationSeconds)+' secondes, pas de D6':'1D6 + INF-01, seuil '+esc(t.threshold))
   +' · 1 PA à la résolution.</p><label><input name="present" type="checkbox" required>Je suis devant cette cible fictive préparée</label><button type="submit" '
   +(d.level<t.minLevel||t.busy||d.session.stage!=='EN_JEU'?'disabled':'')+'>Tenter l’intrusion</button></form>';
 const past=d.previous?.map(a=>'<article class="panel"><p>'+esc(a.status)+' · '+(a.mode==='CODE'?'Mini-jeu sans D6':a.roll===null?'Sans jet':esc(a.roll)+' + compétence = '+esc(a.total)+' / '+esc(a.threshold))+'</p>'+ (a.text?'<p class="prose">'+esc(a.text)+'</p>':'')+'</article>').join('')??'';
 return '<div class="narrow"><nav class="breadcrumb"><a href="#/action/'+esc(sid)+'">Mes actions</a></nav><h1>'+esc(t.title)+'</h1><p>'+esc(t.category)+' · '+esc(t.description)+'</p>'+body+past+'<button data-action="refresh" type="button" class="quiet">Actualiser</button></div>';
}
