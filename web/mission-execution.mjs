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
export function rewardPickupsHtml(d){
 if(!d.rewardPickups?.length)return '';
 return `<section class="panel"><h2>Récompenses à retirer</h2>${d.rewardPickups.map(p=>{
  const action=p.canOffer?'offerContractRewardPickup':'confirmContractRewardPickup',payload={sessionId:d.session.id,contractId:d.contract.id,pickupId:p.id,confirmation:p.confirmation,...(p.canOffer?{present:true}:{received:true})};
  return `<article><h3>${esc(p.quantity)} ${esc(p.item.unit)} · ${esc(p.item.name)}</h3><p>Au comptoir ${esc(p.shopName)} · ${p.pickupStatus==='RECEIVED'?'Reçu':p.canReceive?'Présenté, à confirmer':'Remise en attente'}</p>${p.canOffer||p.canReceive?`<form data-form="contractCommand" data-command="${action}" data-payload="${esc(JSON.stringify(payload))}"><label class="check"><input type="checkbox" required>${p.canOffer?'Le lot et le titulaire sont présents au comptoir.':'J’ai physiquement reçu ces objets.'}</label><button type="submit">${p.canOffer?'Présenter la récompense':'Confirmer la réception'}</button></form>`:''}</article>`;
 }).join('')}</section>`;
}
