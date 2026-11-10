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
  +(c.status==='ACTIVE'
   ?'<form data-form="customsHoldSeize" data-sid="'+esc(sid)+'" data-id="'+esc(c.id)+'">'
    +'<h4>Saisie formelle : décision MJ avant échéance</h4>'
    +'<label>Motif de décision écrit<input name="reasonText" maxlength="500" required></label>'
    +'<label><input name="authorized" type="checkbox" required>Échec de régularisation constaté, saisie autorisée par le MJ</label>'
    +'<label><input name="officialCustodyConfirmed" type="checkbox" required>Accessoire réellement déposé dans la réserve officielle du jeu</label>'
    +'<button type="submit">Prononcer la saisie et créer la quittance</button></form>':'')
  +'</article>').join('');
 return '<div class="narrow"><h1>Retenues douanières provisoires · MJ</h1>'
  +'<p>Bien réglementé sans permis, lot initialement disponible dans le sac du personnage. La saisie formelle exige une décision MJ et une consignation officielle réelle ; aucune amende ni cession de propriété.</p>'
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

export const customsSeizureErrors={
 SO_CUSTOMS_SEIZURE_DECISION:'Confirmez la décision motivée, l’échec de régularisation et la garde officielle de l’objet.',
 SO_CUSTOMS_HOLD_EXPIRED:'Les quinze minutes sont écoulées : impossible de saisir rétroactivement. Restituez l’objet.',
 SO_CUSTOMS_HOLD_STALE:'La retenue ou le lot n’est plus dans l’état attendu.',
 SO_CUSTOMS_SEIZURE_DUPLICATE:'Ce document de fiction a déjà été saisi.',
 SO_CUSTOMS_RETURN_DECISION:'Une restitution exige la décision MJ et une remise physique confirmée.',
 SO_CUSTOMS_SEIZURE_FINISHED:'Cette saisie est déjà close ou absente.',
 SO_CUSTOMS_RETURN_OWNER:'Le propriétaire initial n’est pas disponible dans la session.',
 SO_CUSTOMS_RETURN_STALE:'Le lot ou le stock officiel a changé, actualisez.',
};
export function customsSeizuresAdminHtml(d,sid){
 const rows=d.officialStock??[];
 return '<section class="panel narrow"><h2>Inventaire officiel fictif · saisies formelles</h2>'
  +'<p>Les biens restent la propriété du personnage d’origine, mais sont placés hors de son sac. Une quittance numérique est délivrée au personnage concerné.</p>'
  +(rows.map(s=>'<article class="card"><h3>'+esc(s.itemName)+'</h3>'
   +'<p>Lot : '+esc(s.lotId)+' · propriétaire initial : '+esc(s.ownerId)+'</p>'
   +'<p>Référence de quittance : '+esc(s.receiptCode)+'</p>'
   +'<p>Décision et motif MJ : '+esc(s.reasonText??'')+'</p>'
   +'<p>Statut : '+esc(s.status)+'</p>'
   +(s.status==='SEIZED'?'<form data-form="customsSeizureReturn" data-sid="'+esc(sid)+'" data-id="'+esc(s.id)+'">'
     +'<label>Motif de restitution au propriétaire initial<input name="reasonText" maxlength="500" required></label>'
     +'<label><input name="authorized" type="checkbox" required>Restitution expressément autorisée par le MJ</label>'
     +'<label><input name="physicalReturnConfirmed" type="checkbox" required>Accessoire rendu physiquement au propriétaire initial</label>'
     +'<button type="submit">Restituer le lot et actualiser la quittance</button></form>':'')
   +'</article>').join('')||'<p>Aucune saisie formelle enregistrée.</p>')
  +'</section>';
}
export function customsSeizuresPlayerHtml(d,sid){
 return '<div class="narrow"><h1>Mes quittances de douane</h1>'
  +'<p>Ces reçus concernent uniquement les biens du scénario. Ils ne constituent pas des documents officiels ou une sanction réelle.</p>'
  +((d.receipts??[]).map(r=>'<article class="panel"><h2>'+esc(r.itemName)+'</h2>'
   +'<p>Quantité saisie : '+esc(r.quantity)+' · référence du lot : '+esc(r.lotId)+'</p>'
   +'<p>Quittance : '+esc(r.receiptCode)+'</p>'
   +'<p>Motif de fiction : marchandise réglementée sans permis, régularisation non obtenue.</p>'
   +'<p>Statut : '+esc(r.status)+'</p>'+(r.returnedAt?'<p>Restitution enregistrée.</p>':'')+'</article>').join('')
    ||'<p>Aucune saisie formelle enregistrée pour ce personnage.</p>')
  +'</div>';
}

export const customsAppealErrors={
 SO_CUSTOMS_APPEAL_CLOSED:'Cette saisie est close : la contestation n’est plus ouverte.',
 SO_CUSTOMS_APPEAL_EXISTS:'Une contestation est déjà enregistrée pour cette saisie.',
 SO_CUSTOMS_APPEAL_REASON:'Expliquez votre contestation (1 à 1000 caractères).',
 SO_CUSTOMS_APPEAL_DECISION:'Choisissez maintien de la saisie ou recommandation de restitution.',
 SO_CUSTOMS_APPEAL_REPLY:'Expliquez la décision au joueur (1 à 1000 caractères).',
 SO_CUSTOMS_APPEAL_DECIDED:'Cette demande a déjà reçu une décision.',
};
const appealStatusText={
 PENDING:'En attente de décision MJ',
 DECIDED:'Décision MJ enregistrée',
 CLOSED_RETURNED:'Close après restitution au propriétaire',
};
const appealOutcomeText={
 MAINTAINED:'Maintien de la saisie',
 RETURN_RECOMMENDED:'Restitution recommandée (sans remise automatique)',
};
export function customsAppealsPlayerHtml(d,receipts,sid){
 const own=new Set((d.appeals??[]).map(a=>a.seizureId));
 const forms=(receipts??[]).filter(r=>r.status==='SEIZED'&&!own.has(r.id)).map(r=>
  '<form class="panel" data-form="customsAppealFile" data-sid="'+esc(sid)+'" data-id="'+esc(r.id)+'">'
  +'<h3>Contester la saisie : '+esc(r.itemName)+'</h3>'
  +'<p>Quittance : '+esc(r.receiptCode)+'</p>'
  +'<label>Motif de votre contestation fictive<textarea name="reason" maxlength="1000" required></textarea></label>'
  +'<button type="submit">Déposer une contestation au MJ</button></form>').join('');
 const history=(d.appeals??[]).map(a=>'<article class="panel"><h3>'+esc(a.itemName)+'</h3>'
  +'<p>Quittance : '+esc(a.receiptCode)+' · statut : '+esc(appealStatusText[a.status]??a.status)+'</p>'
  +'<p>Votre motif : '+esc(a.reason)+'</p>'
  +(a.status==='CLOSED_RETURNED'?'<p>Saisie restituée au propriétaire par le MJ ; contestation close. Toute décision antérieure reste historique.</p>':'')
  +(a.outcome?'<p>Décision '+(a.status==='CLOSED_RETURNED'?'antérieure':'du MJ')+' : '+esc(appealOutcomeText[a.outcome]??a.outcome)+' · '+esc(a.publicReply)+'</p>':'')
  +(a.status==='CLOSED_RETURNED'?'':'<p>Une contestation ou sa décision ne libère aucun lot automatiquement.</p>')+'</article>').join('');
 return '<section class="narrow"><h2>Contestations de saisie</h2>'
  +'<p>La contestation signale une demande au MJ ; elle ne rembourse rien et ne transfère aucun objet.</p>'
  +(forms||'')+(history||'<p>Aucune contestation enregistrée.</p>')+'</section>';
}
export function customsAppealsAdminHtml(d){
 const appeals=d.appeals??[];
 return '<section class="narrow"><h2>Demandes de contestation · MJ</h2>'
  +'<p>Une décision motivée peut maintenir la saisie ou recommander sa restitution. La remise physique demeure distincte et jamais automatique.</p>'
  +(appeals.map(a=>'<article class="panel"><h3>'+esc(a.itemName)+'</h3>'
    +'<p>Quittance : '+esc(a.receiptCode)+' · personnage : '+esc(a.ownerId)+'</p>'
    +'<p>Statut : '+esc(appealStatusText[a.status]??a.status)+' · demande : '+esc(a.reason)+'</p>'
    +(a.status==='CLOSED_RETURNED'?'<p>Saisie restituée par le MJ. Contestation close ; les décisions antérieures restent conservées.</p>':'')
    +(a.status==='PENDING'?'<form data-form="customsAppealDecide" data-sid="'+esc(d.session.id)+'" data-id="'+esc(a.seizureId)+'">'
      +'<label>Décision MJ<select name="outcome"><option value="MAINTAINED">Maintenir la saisie</option>'
      +'<option value="RETURN_RECOMMENDED">Recommander la restitution (sans la déclencher)</option></select></label>'
      +'<label>Réponse communiquée au personnage<textarea name="publicReply" maxlength="1000" required></textarea></label>'
      +'<label>Note privée de décision<textarea name="privateReason" maxlength="1000" required></textarea></label>'
      +'<button type="submit">Enregistrer la décision sans déplacer le lot</button></form>'
      :a.outcome?'<p>Décision '+(a.status==='CLOSED_RETURNED'?'antérieure':'enregistrée')+' : '+esc(appealOutcomeText[a.outcome]??a.outcome)+' · réponse : '+esc(a.publicReply)
        +' · note MJ : '+esc(a.privateReason??'')+'</p>':'')
    +'</article>').join('')||'<p>Aucune contestation déposée.</p>')+'</section>';
}
