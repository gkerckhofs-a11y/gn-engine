import {uiStatus} from './ui-language.mjs';
import {escapeHtml as esc} from './groups.mjs';
export const soForgeryErrors={
 SO_INF03_CLOSED:'INF-03 n’est pas actif dans cette version de jeu.',
 SO_INF03_TARGET:'Cet atelier ou modèle de document n’est pas publié.',
 SO_INF03_SKILL:'Votre niveau INF-03 ne permet pas de fabriquer ce document.',
 SO_INF03_UNAVAILABLE:'Votre personnage ne peut pas agir actuellement.',
 SO_INF03_PRESENCE:'Vous devez être physiquement à l’atelier de fiction.',
 SO_INF03_FORM:'Formulaire vierge absent, indisponible ou déjà réservé.',
 SO_INF03_BUSY:'Une autre action ou un autre participant utilise cet atelier.',
 SO_INF03_COOLDOWN:'Dix minutes de récupération sont encore nécessaires.',
 SO_INF03_STALE:'L’action ou le modèle a changé. Actualisez.',
 SO_INF03_RECORD:'Aucun document falsifié suivi ne correspond à cet identifiant.',
 SO_INF03_TOO_EARLY:'La durée de falsification n’est pas écoulée.',
};
const seconds=n=>Math.ceil(n/1000)+' s';
export function soForgeryHtml(d,sid){
 const target=d.target,a=d.active;
 let body='<p>Document exclusivement fictif. Aucun droit informatique ni habilitation réelle n’est créé.</p>';
 if(!d.enabled&&!a)body+='<p>La compétence INF-03 est indisponible.</p>';
 else if(a?.status==='RUNNING'){
  body+='<p>Fabrication en cours · '+seconds(a.remainingMs)+' de jeu restantes.</p>';
  body+='<form data-form="soForgeryFinish" data-sid="'+esc(sid)+'" data-target="'+esc(a.targetId)+'" data-id="'+esc(a.id)+'"><label><input type="checkbox" name="present" required>Je suis toujours à l’atelier</label><button type="submit" '+(a.remainingMs>0?'disabled':'')+'>Terminer et résoudre au D6</button></form>';
  body+='<form data-form="soForgeryCancel" data-sid="'+esc(sid)+'" data-target="'+esc(a.targetId)+'" data-id="'+esc(a.id)+'"><button>Annuler avant résolution (PA et formulaire restitués)</button></form>';
 }else if(d.cooldownMs>0)body+='<p>Récupération personnelle : '+seconds(d.cooldownMs)+'.</p>';
 else {
  const options=d.blanks.map(l=>'<option value="'+esc(l.id)+'">'+esc(l.name)+' · '+esc(l.quantity)+' disponible(s)</option>').join('');
  body+='<p>INF-03 N'+esc(target.minLevel)+' requis, difficulté '+esc(target.threshold)+' (1D6 + niveau), 1 PA et un formulaire vierge consommé au jet.</p>';
  body+='<form data-form="soForgeryStart" data-sid="'+esc(sid)+'" data-target="'+esc(target.id)+'"><label>Formulaire vierge dans votre sac<select name="blankLotId" required>'+options+'</select></label><label><input type="checkbox" name="present" required>Je suis devant l’atelier et j’ai le matériel physique prévu</label><button type="submit" '+(d.level<target.minLevel||target.busy||d.session.stage!=='EN_JEU'||!options?'disabled':'')+'>Commencer la falsification</button></form>';
 }
 return '<div class="narrow"><nav class="breadcrumb"><a href="#/action/'+esc(sid)+'">Mes actions</a></nav><h1>'+esc(target.title)+'</h1><p class="prose">'+esc(target.description)+'</p>'+body+
  '<p class="muted">Une réussite crée un seul document fictif suivi dans votre sac. Un échec détruit le formulaire. Les vérifications de conformité douanière et d’identité des vaisseaux utilisent des protocoles distincts.</p></div>';
}

export function soForgeryInspectionHtml(d,sid,lotId=''){
 const content=d?'<section class="panel"><h2>Contrôle MJ — document de fiction</h2><p>'+esc(d.documentName)+'</p><p>Qualité : '+esc(d.quality)+' · modèle : '+esc(d.templateId)+' (révision '+esc(d.templateRevision)+')</p><p>Anomalies préparées : '+esc(d.anomalies)+'</p><p>Possesseur actuel : '+esc(d.holderId)+'</p><p>Identifiant du document : '+esc(d.lotId)+'</p>'
  +'<p>État du lot : '+esc(d.status??'inconnu')+' · quantité : '+esc(d.quantity??'?')
  +' · emplacement enregistré : '+esc(d.locationKind??'inconnu')+' ('+esc(d.locationId??'—')+')</p>'
  +(d.quantity===0?'<p>Document retiré du jeu : la preuve historique reste consultable par le MJ.</p>':'')
  +'<h3>Remises enregistrées</h3>'
 +(d.transfers?.length?'<ul>'+d.transfers.map(t=>'<li>'+esc(t.sourceName)+' → '+esc(t.recipientName)+' · '+esc(t.transferId)+'</li>').join('')+'</ul>':'<p>Aucune remise enregistrée pour ce document.</p>')
 +'<h3>Vols et pillages consignés</h3>'
  +(d.otherMovements?.length
    ?'<ul>'+d.otherMovements.map(e=>'<li>'+esc(e.kind==='SO_PICKPOCKET'?'Vol à la tire':'Pillage')
      +' · '+esc(e.sourceId??'inconnu')+' → '+esc(e.destinationId??'inconnu')+'</li>').join('')+'</ul>'
    :'<p>Aucun mouvement de ce type.</p>')
  +'<h3>Corrections du lot consignées</h3>'
  +(d.inventoryEvents?.length
    ?'<ul>'+d.inventoryEvents.map(e=>'<li>'+esc(e.beforeStatus??'inconnu')
      +' → '+esc(uiStatus(e.status))+' · quantité : '+esc(e.quantity)
      +' · motif MJ : '+esc(e.reason)+'</li>').join('')+'</ul>'
    :'<p>Aucune correction de lot enregistrée.</p>')
  +'<p>Ce contrôle ne réalise ni saisie formelle ni transfert en entrepôt. Il conserve les faits enregistrés, sans accorder de droit technique.</p></section>':'<p>Renseignez l’identifiant de lot du document présenté par le joueur.</p>';
 return '<div class="narrow"><h1>Contrôle MJ — faux documents INF-03</h1><form data-form="soForgeryInspect" data-sid="'+esc(sid)+'"><label>Identifiant de lot<input name="lotId" value="'+esc(lotId)+'" maxlength="128" required></label><button>Vérifier la provenance</button></form>'+content+'</div>';
}

export function soForgeryAdminHtml(d,sid){
 return '<section class="panel"><h2>Fabrications en cours</h2><p>Interrompre libère le PA, le formulaire et l’atelier, même si l’accès du joueur a été retiré. Aucun document n’est créé.</p>'+(d.actions.length?d.actions.map(a=>'<article><h3>'+esc(a.characterName)+'</h3><p>'+seconds(a.remainingMs)+' de jeu restantes</p><form data-form="soForgeryCancelMJ" data-sid="'+esc(sid)+'" data-id="'+esc(a.id)+'"><label>Motif<input name="reason" maxlength="500" required></label><button>Interrompre la fabrication</button></form></article>').join(''):'<p>Aucune fabrication en cours.</p>')+'</section>';
}
