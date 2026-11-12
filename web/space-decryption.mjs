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
  '<button type="submit" '+(k.attempted||k.decoded||d.level<k.requiredLevel?'disabled':'')+'>Tenter INF-02</button></form>').join('');
 if(!body)body='<p>Aucun document chiffré actuellement accessible. Obtenez d’abord un document en jeu.</p>';
 return '<section class="panel"><h2>INF-02 · Déchiffrement</h2><p class="rp">Derrière les signes brouillés, un message attend votre regard.</p><p>Un document obtenu en jeu, 1 PA et 1D6 + niveau contre le seuil du scénario. Révélation uniquement en cas de réussite. Aucun accès technique réel n’est ouvert.</p>'+body+'</section>';
}
