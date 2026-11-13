import {escapeHtml as esc} from './groups.mjs';
export const soPickpocketErrors={
 SO_PICKPOCKET_CLOSED:'Le vol à la tire n’est pas activé pour cette version de la session.',
 SO_PICKPOCKET_SKILL:'Votre personnage ne maîtrise pas ROG-02.',
 SO_PICKPOCKET_UNAVAILABLE:'Cette tentative n’est plus disponible. Actualisez votre espace.',
 SO_PICKPOCKET_QUOTA:'Cette cible a atteint sa limite de tentatives ou a déjà subi un vol réussi.',
 SO_PICKPOCKET_COOLDOWN:'Attendez la fin de votre récupération avant une nouvelle tentative.',
 SO_PICKPOCKET_TARGET:'Ce QR ne désigne pas un personnage valide pour cette action.',
 SO_PICKPOCKET_PRESENCE:'La tentative est réservée au poste organisation.',
 SO_PICKPOCKET_TOO_EARLY:'La durée de la tentative n’est pas encore écoulée.',
 SO_PICKPOCKET_CHOICE:'Ce type d’objet n’est plus proposé.',
};
const time=ms=>Math.ceil(ms/1000)+' secondes';
const hidden=(name,value)=>'';
export function soPickpocketHtml(d,alerts,sid){
 const notices=(alerts?.alerts??[]).map(a=>'<p role="status" class="banner">'+esc(a.message)+'</p>').join('');
 if(!d?.enabled)return notices;
 const a=d.active;
 const info='<p class="muted">ROG-02 se pratique exclusivement au poste organisation, avec le QR public de la cible et ses nom et prénom fictifs. Aucun inventaire privé ne s’affiche avant la résolution. Les objets physiques éventuels sont remis discrètement par le MJ.</p>';
 let body='';
 if(a?.status==='RUNNING'){
  body='<p>Action engagée. Durée : '+esc(a.durationSeconds)+' secondes · reste '+time(a.remainingMs)+'. Aucun objet n’est encore révélé.</p><form data-form="soPickpocketFinish" data-sid="'+esc(sid)+'" data-id="'+esc(a.id)+'"><button class="primary" type="submit" '+(a.remainingMs>0?'disabled':'')+'>Résoudre la tentative</button></form><form data-form="soPickpocketCancel" data-sid="'+esc(sid)+'" data-id="'+esc(a.id)+'"><button class="quiet" type="submit">Annuler avant la résolution (sans PA ni quota)</button></form>';
 }else if(a?.status==='CHOOSING'){
  body='<p>La durée est écoulée. Choisissez un seul type parmi les choix autorisés ; aucun objet n’a encore été déplacé.</p><form data-form="soPickpocketChoose" data-sid="'+esc(sid)+'" data-id="'+esc(a.id)+'"><label>Type d’objet<select name="itemId" required>'+a.choices.map(c=>'<option value="'+esc(c.itemId)+'">'+esc(c.name)+'</option>').join('')+'</select></label><button type="submit" class="primary">Confirmer le vol</button></form><form data-form="soPickpocketCancel" data-sid="'+esc(sid)+'" data-id="'+esc(a.id)+'"><button class="quiet" type="submit">Renoncer au choix (tentative comptabilisée)</button></form>';
 }else{
  body=(d.cooldownMs>0?'<p>Récupération personnelle : encore '+time(d.cooldownMs)+'.</p>':'<form data-form="soPickpocketStart" data-sid="'+esc(sid)+'"><label>QR ou ID du personnage / QR du personnage visé<input name="badgeUrl" required maxlength="2048" placeholder="Coller le lien du QR du personnage"></label><label>Prénom fictif<input name="firstName" maxlength="80" required autocomplete="off"></label><label>Nom fictif<input name="lastName" maxlength="80" required autocomplete="off"></label><label class="check"><input name="present" type="checkbox" required>Je suis au poste organisation avec le QR de la cible</label><button type="submit" class="primary">Commencer la tentative</button></form>');
 }
 return notices+'<section class="panel"><h2>ROG-02 · Vol à la tire</h2><p class="rp">Une distraction suffit parfois à faire changer un objet de propriétaire.</p>'+info+'<p>Niveau '+esc(d.level)+' · durée '+esc(d.durationSeconds)+' s · récupération 10 minutes · 1 PA uniquement si un objet est pris.</p>'+body+'<button type="button" data-action="refresh" class="quiet small">Actualiser les délais</button></section>';
}
