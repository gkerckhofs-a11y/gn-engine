import {escapeHtml as esc} from './groups.mjs';
export const customsDetentionErrors={
 SO_CUSTOMS_HOLD_CLOSED:'La retenue douanière est indisponible dans cette session.',
 SO_CUSTOMS_HOLD_REASON:'La retenue provisoire est limitée aux biens réglementés sans permis déclaré par le MJ.',
 SO_CUSTOMS_HOLD_CUSTODY:'Confirmez que l’objet de fiction est consigné, sans retenir une personne.',
 SO_CUSTOMS_HOLD_LOT:'Le lot doit être disponible dans le sac de son propriétaire.',
 SO_CUSTOMS_HOLD_REPEAT:'Ce lot a déjà été retenu au cours de cette session.',
 SO_CUSTOMS_HOLD_FINISHED:'La retenue est déjà terminée.',
 SO_CUSTOMS_HOLD_STALE:'Le lot a changé d’état, actualisez.',
};
const seconds=ms=>Math.ceil(ms/1000)+' s';
const names={ACTIVE:'Retenue en cours',EXPIRED:'Retenue échue',RELEASED:'Libéré'};
export function customsDetentionsAdminHtml(d,sid){
 const current=d.cases.filter(c=>['ACTIVE','EXPIRED'].includes(c.status));
 const past=d.cases.filter(c=>!['ACTIVE','EXPIRED'].includes(c.status));
 const cards=rows=>rows.map(c=>'<article class="panel"><h3>'+esc(c.itemName)+' · '+esc(c.lotId)+'</h3>'
  +'<p>'+esc(names[c.status]??c.status)+' · personnage : '+esc(c.holderId)+'</p>'
  +(c.status==='ACTIVE'?'<p>Échéance réelle dans '+seconds(c.remainingRealMs)+'.</p>':'')
  +(c.status==='EXPIRED'?'<p role="status">15 minutes écoulées : le blocage numérique est levé. Restituer immédiatement l’accessoire réel.</p>':'')
  +'<p>Motif MJ : '+esc(c.reasonText??'')+'</p>'
  +(['ACTIVE','EXPIRED'].includes(c.status)
   ?'<form data-form="customsHoldRelease" data-sid="'+esc(sid)+'" data-id="'+esc(c.id)+'"><label>Motif de clôture<input name="reasonText" maxlength="500" required></label><button type="submit">'+(c.status==='EXPIRED'?'Constater la fin et la restitution':'Libérer avant échéance')+'</button></form>':'')
  +'</article>').join('');
 return '<div class="narrow"><h1>Retenues douanières provisoires · MJ</h1>'
  +'<p>Première tranche : bien réglementé sans permis, lot disponible dans le sac du personnage. Aucune saisie formelle, amende ni transfert de propriété.</p>'
  +'<p><strong>15 minutes réelles maximum</strong>, y compris en pause. Le blocage numérique cesse automatiquement à l’échéance. Ne jamais retenir physiquement une personne.</p>'
  +'<form data-form="customsHoldStart" data-sid="'+esc(sid)+'" class="panel"><h2>Consigner un lot de fiction</h2>'
  +'<label>Identifiant du lot<input name="lotId" maxlength="128" required></label>'
  +'<label>Contexte MJ<input name="reasonText" maxlength="500" required></label>'
  +'<label><input name="secured" type="checkbox" required>Objet de fiction consigné en sécurité, joueur libre</label>'
  +'<button type="submit">Enregistrer la retenue provisoire</button></form>'
  +'<h2>Retenues à suivre</h2>'+(cards(current)||'<p>Aucune retenue en cours.</p>')
  +'<details><summary>Historique récent</summary>'+(cards(past)||'<p>Aucune clôture enregistrée.</p>')+'</details>'
  +'<p>Une seule retenue de ce lot par session, sans prolongation artificielle.</p></div>';
}
