import {escapeHtml as esc} from './groups.mjs';
export const soDecryptionErrors={
 SO_INF02_CLOSED:'INF-02 n’est pas activé pour cette version de jeu.',
 SO_INF02_SKILL:'Votre niveau de déchiffrement est insuffisant.',
 SO_INF02_DOCUMENT:'Document introuvable ou non obtenu par votre personnage.',
 SO_INF02_COOLDOWN:'Récupération en cours : 10 minutes de jeu après chaque tentative résolue.',
 SO_INF02_BUSY:'Une autre action occupe votre personnage.',
 SO_INF02_ALREADY:'Ce personnage a déjà tenté cette version du document.',
 SO_INF02_STALE:'Le document ou votre tentative a changé. Actualisez.',
 SO_INF02_TOO_EARLY:'Le temps de déchiffrement n’est pas encore écoulé.',
 SO_INF02_UNAVAILABLE:'Votre personnage ne peut pas agir actuellement.',
};
const secs=ms=>Math.ceil(ms/1000)+' s';
export function soDecryptionHtml(d,sid){
 if(!d?.enabled)return '<section class="panel"><h2>INF-02 · Déchiffrement</h2><p class="rp">Derrière les signes brouillés, un message attend votre regard.</p><p>La compétence INF-02 n’est pas disponible pour ce personnage.</p></section>';
 const a=d.active;
 let body='';
 if(a?.status==='RUNNING'){
  body='<p>Déchiffrement engagé : encore '+secs(a.remainingMs)+'.</p>'+
   '<form data-form="soDecryptionFinish" data-sid="'+esc(sid)+'" data-id="'+esc(a.id)+'"><button type="submit" '+(a.remainingMs>0?'disabled':'')+'>Terminer et lancer le D6</button></form>'+
   '<form data-form="soDecryptionCancel" data-sid="'+esc(sid)+'" data-id="'+esc(a.id)+'"><button type="submit">Annuler avant résolution, sans PA</button></form>';
 }else if(d.cooldownMs>0)body='<p>Récupération personnelle : '+secs(d.cooldownMs)+'.</p>';
 else body=d.documents.map(k=>'<form data-form="soDecryptionStart" data-sid="'+esc(sid)+'" data-id="'+esc(k.id)+'"><p><strong>'+esc(k.title)+'</strong> · N'+esc(k.requiredLevel)+' requis. '+(k.decoded?'Déjà déchiffré.':k.attempted?'Tentative consommée.':'Une seule tentative par version.')+'</p>'+
  '<label>Décrypteur compatible (+1)<select name="bonusLotId"><option value="">Sans équipement</option>'+(k.bonusLots??[]).map(l=>'<option value="'+esc(l.id)+'">'+esc(l.name)+'</option>').join('')+'</select></label>'+
  '<label>Aide compétente (+1)<select name="aidOfferId"><option value="">Sans aide</option>'+(d.aidOffers??[]).map(o=>'<option value="'+esc(o.id)+'">'+esc(o.helperName)+'</option>').join('')+'</select></label>'+
  '<button type="submit" '+(k.attempted||k.decoded||d.level<k.requiredLevel?'disabled':'')+'>Tenter INF-02</button></form>').join('');
 if(!body)body='<p>Aucun document chiffré actuellement accessible. Obtenez d’abord un document en jeu.</p>';
 return '<section class="panel"><h2>INF-02 · Déchiffrement</h2><p class="rp">Derrière les signes brouillés, un message attend votre regard.</p><p>Un document obtenu en jeu, 1 PA et 1D6 + niveau + un décrypteur compatible éventuel (+1) + une aide compétente éventuelle (+1) contre le seuil du scénario. L’aidant reste présent et récupère dix minutes sans dépenser de PA. Révélation uniquement en cas de réussite. Aucun accès technique réel n’est ouvert.</p>'+body+'</section>';
}

export function soDecryptionAdminHtml(d,sid){
 return '<section class="panel"><h2>Déchiffrements en cours</h2><p>Interrompre libère le PA réservé, sans révéler le texte ni consommer la tentative. Le motif est conservé dans le journal MJ.</p>'+d.actions.map(a=>'<form data-form="soDecryptionCancelMJ" data-sid="'+esc(sid)+'" data-id="'+esc(a.id)+'"><h3>'+esc(a.characterName)+'</h3><p>Document '+esc(a.knowledgeId)+' · '+secs(a.remainingMs)+'</p><label>Motif<input name="reason" maxlength="500" required></label><button type="submit">Interrompre et libérer le PA</button></form>').join('')+(d.actions.length?'':'<p>Aucun déchiffrement en cours.</p>')+'</section>';
}
