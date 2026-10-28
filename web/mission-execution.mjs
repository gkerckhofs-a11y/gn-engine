import {escapeHtml as esc} from './groups.mjs';

export function missionExecutionEditor(d){
 const x=d.missionExecution;if(!x)return '';
 const choice=(kind,r)=>`<option value="${esc(JSON.stringify({kind,id:r.id}))}">${kind==='FIELD'?'Analyse':'Voyage'} · ${esc(r.name)}</option>`;
 return `<fieldset><legend>Preuves des étapes privées</legend><p>Choisissez une action réussie ou un trajet arrivé après l’acceptation. Le simple scan ne suffit pas. Le MJ valide ensuite le récit.</p>${x.steps.map(st=>`<label>${esc(st.title)}<select name="stepEvidence:${esc(st.id)}"><option value="">Récit et vérification MJ</option>${x.targets.map(r=>choice('FIELD',r)).join('')}${x.routes.map(r=>choice('VOYAGE',r)).join('')}</select></label>`).join('')}</fieldset>${x.rewards.length?`<fieldset><legend>Objets promis · stock réel</legend><p>Chaque lot doit appartenir au comptoir qui finance le contrat. Il sera réservé à l’acceptation, puis remis physiquement après règlement.</p>${x.rewards.map(r=>`<label>${esc(r.itemId)} · ${esc(r.quantity)} unité(s)<select name="rewardSource:${esc(r.itemId)}" required><option value="">Choisir le stock</option>${x.offers.filter(o=>o.itemId===r.itemId).map(o=>`<option value="${esc(o.id)}">${esc(o.shopName)} · ${esc(o.name)}</option>`).join('')}</select></label>`).join('')}</fieldset>`:''}`;
}
export function missionExecutionPayload(values){
 const stepEvidence=[],rewardSources=[];
 for(const [key,value] of Object.entries(values)){
  if(key.startsWith('stepEvidence:')&&value){const b=JSON.parse(value);stepEvidence.push({stepId:key.slice(13),kind:b.kind,...(b.kind==='FIELD'?{targetId:b.id}:{routeId:b.id})});}
  if(key.startsWith('rewardSource:'))rewardSources.push({itemId:key.slice(13),offerId:value});
 }
 return {...(stepEvidence.length?{stepEvidence}:{}),...(rewardSources.length?{rewardSources}:{})};
}
export function rewardTermsHtml(rewards=[]){
 if(!rewards.length)return '';
 return `<section class="panel"><h3>Récompense matérielle promise</h3>${rewards.map(r=>`<p>${esc(r.quantity)} ${esc(r.item.unit)} · ${esc(r.item.name)} · retrait : ${esc(r.shopName)}${r.transferable===false?' · non transférable':''}${r.resellable===false?' · non revendable':''}${r.pillable===false?' · non pillable':''}</p>`).join('')}<p>Réservation dans le stock existant à l’acceptation. Après décision et contestation, les objets attribués restent au comptoir jusqu’à votre réception.</p></section>`;
}
export function evidenceHtml(rows=[]){return rows.length?`<section class="panel"><h3>Événements vérifiés</h3>${rows.map(r=>`<p>${esc(r.name)} · ${r.verified?'Événement accompli et retrouvé':'Événement requis encore manquant'}${r.completedAt?` · ${esc(new Date(r.completedAt).toLocaleString('fr-FR'))}`:''}</p>`).join('')}</section>`:'';}
export function rewardQuantityFields(rows=[],kind){
 return rows.filter(r=>kind==='DISPUTE'?r.remaining>0:r.disputed>0).map(r=>`<label>${kind==='DISPUTE'?'Quantité totale contestée':'Quantité litigieuse attribuée au titulaire'} · ${esc(r.item.name)}<input name="${kind==='DISPUTE'?'rewardDispute':'rewardAward'}:${esc(r.item.id)}" type="number" min="${kind==='DISPUTE'?r.disputed:0}" max="${kind==='DISPUTE'?r.remaining:r.disputed}" value="${kind==='DISPUTE'?r.disputed:''}" step="1" required></label>`).join('');
}
export function rewardResolutionPayload(kind,values){
 const prefix=kind.startsWith('DISPUTE')?'rewardDispute:':kind==='ARBITRATE'?'rewardAward:':null;
 if(!prefix)return {};
 const rows=Object.entries(values).filter(([key])=>key.startsWith(prefix)).map(([key,value])=>({itemId:key.slice(prefix.length),quantity:Number(value)}));
 return rows.length?{[kind.startsWith('DISPUTE')?'rewardDisputes':'rewardAwards']:rows}:{};
}
export function rewardChangesHtml(d){return `${(d.rewardChanges??[]).map(r=>`<p>${esc(r.item.name)} : ${r.pay} attribué(s), ${r.release} libéré(s), ${r.disputed} en litige.</p>`).join('')}${(d.rewardDisputes??[]).map(r=>`<p>${esc(r.item.name)} : ${r.quantity} en litige.</p>`).join('')}`;}
const pickupStatuses={WAITING:'Remise en attente du MJ',READY:'Présenté, à confirmer par le titulaire',STALE:'Remise à présenter à nouveau',RECEIVED:'Réception confirmée'};
const pickupBlocks={ACCESS_CHANGED:'Les droits ou l’incarnation ont changé. La régie doit traiter ce dossier.',CHARACTER_DEAD:'Le titulaire est décédé. La récompense reste en attente de traitement par la régie.',CUSTODY_CHANGED:'Le lot n’est plus disponible pour cette remise. La régie doit vérifier sa garde.',SAFETY_STOP:'Remise suspendue pendant le STOP SÉCURITÉ.',SESSION_NOT_RUNNING:'Remise disponible seulement pendant le jeu.',CHARACTER_UNAVAILABLE:'Le titulaire doit être disponible au comptoir pour recevoir le lot.'};
function pickupCard(sid,c,p,admin,atShop=false){
 const action=p.canOffer?'offerContractRewardPickup':'confirmContractRewardPickup',input={sessionId:sid,contractId:c.id,pickupId:p.id,confirmation:p.confirmation,...(p.canOffer?{present:true}:{received:true})};
 return `<article class="group-update"><h3>${esc(p.quantity)} ${esc(p.item.unit)} · ${esc(p.item.name)}</h3>${atShop?`<p>Mission : ${esc(c.title)}${admin?` · Titulaire : ${esc(p.recipientName)}`:''}</p>`:''}<p>Au comptoir ${esc(p.shopName)} · ${esc(pickupStatuses[p.pickupStatus]??p.pickupStatus)}</p>${p.blockedReason?`<p>${esc(pickupBlocks[p.blockedReason]??'Remise indisponible. Consultez la régie.')}</p>`:''}${p.canOffer||p.canReceive?`<form data-form="contractCommand" data-command="${action}" data-payload="${esc(JSON.stringify(input))}"${atShop?' data-counter-pickup="true"':''}><label class="check"><input type="checkbox" required>${p.canOffer?'Le lot et le titulaire sont présents au comptoir.':'J’ai physiquement reçu ces objets.'}</label><button type="submit">${p.canOffer?'Présenter la récompense':'Confirmer la réception · sans paiement'}</button></form>`:''}<p><a href="#/${admin?'contract-admin':'contract'}/${esc(sid)}/${esc(c.id)}">Consulter le contrat</a>${!atShop&&p.shopId?` · <a href="#/${admin?`shops-admin/${esc(sid)}`:`shop/${esc(sid)}/${esc(p.shopId)}`}">${admin?'Régie des comptoirs':'Ouvrir le comptoir de retrait'}</a>`:''}</p></article>`;
}
export function shopMissionRewardsHtml(d){
 if(!d.missionRewards)return '';
 const pending=d.missionRewards.filter(p=>p.pickupStatus!=='RECEIVED'),received=d.missionRewards.filter(p=>p.pickupStatus==='RECEIVED'),card=p=>pickupCard(d.session.id,{id:p.contractId,title:p.contractTitle},p,d.admin,true);
 return `<section class="panel"><h2>${d.admin?'Récompenses de mission à remettre':'Mes récompenses de mission'}</h2><p>Ces objets sont déjà attribués par contrat. Aucun achat ni nouveau paiement : le MJ présente le lot, puis le titulaire confirme sa réception physique.</p><p>Le QR ouvre ce comptoir ; il ne prouve pas la présence. Rejoignez le comptoir avant de confirmer.</p>${pending.map(card).join('')||'<p>Aucune récompense de mission en attente de retrait.</p>'}${received.length?`<details><summary>Réceptions confirmées · ${received.length}</summary>${received.map(card).join('')}</details>`:''}</section>`;
}
export function rewardPickupsHtml(d){
 if(!d.rewardPickups?.length)return '';
 return `<section class="panel"><h2>Récompenses à retirer</h2>${d.rewardPickups.map(p=>pickupCard(d.session.id,d.contract,p,d.admin)).join('')}</section>`;
}
