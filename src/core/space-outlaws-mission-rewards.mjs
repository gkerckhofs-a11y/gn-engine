import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryHash as hash,itemQuantity,publicItem,lotState} from './inventory-state.mjs';
import {inventoryParty} from './inventory-transfers.mjs';
import {shopStockId} from './space-outlaws-shop-state.mjs';
import {shopCustody,receivedShopLot} from './shop-custody.mjs';
import {hasMissionExecution} from './space-outlaws-mission-evidence.mjs';
import {participantAccess} from './mission-parties.mjs';

const movement=l=>({...lotState(l),ownerType:l.ownerType,ownerId:l.ownerId,holderId:l.holderId,location:l.location});
const stock=(l,shopId)=>l?.ownerType==='SHOP'&&l.ownerId===shopId&&l.holderId===shopId&&l.location?.kind==='SHOP'&&l.location.id===shopId&&l.status==='AVAILABLE';
const rows=c=>c.rewardReservations??[];
const validRows=values=>Array.isArray(values)&&values.every(r=>r&&typeof r==='object'&&!Array.isArray(r)&&typeof r.itemId==='string');
export const rewardsDisputed=c=>rows(c).some(r=>r.disputed>0);
export const rewardsFree=c=>rows(c).some(r=>r.remaining>r.disputed);
export const rewardsOpen=c=>rows(c).some(r=>r.remaining>0)||(c.rewardPickups??[]).some(p=>p.pickupStatus!=='RECEIVED');
function writeLot(tx,s,c,before,after,id,at,actor,kind,reason){
 const base=`sessions/${s.id}/inventory/${after.id}`;
 tx.set(base,after);tx.set(`${base}/history/${id}`,{id,at,kind,contractId:c.id,actorUid:actor.uid,reason,before:before?movement(before):null,after:movement(after)});
}
export async function prepareMissionRewards(tx,s,a,source,input){
 const proposed=a.rewardItems??[],selected=input.rewardSources??[];
 requireThat(validRows(selected)&&selected.length===proposed.length&&proposed.length<=20,'SO_MISSION_REWARD_SOURCE');
 if(!proposed.length)return [];
 requireThat(hasMissionExecution(s),'SO_GAMEPLAY_NOT_OPEN');
 const shop=await tx.get(`sessions/${s.id}/shops/${source.shopId}`),out=[];
 for(const r of proposed){
  const choices=selected.filter(x=>x.itemId===r.itemId);requireThat(choices.length===1,'SO_MISSION_REWARD_SOURCE');
  const offerId=documentId(choices[0].offerId),offer=await tx.get(`sessions/${s.id}/shops/${shop.id}/offers/${offerId}`),lot=await tx.get(`sessions/${s.id}/inventory/${shopStockId(offerId)}`);
  requireThat(offer?.versionId===s.spaceOutlaws.versionId&&offer.item.id===r.itemId&&stock(lot,shop.id)&&lot.item.id===r.itemId&&lot.item.revision===offer.item.revision,'SO_MISSION_REWARD_SOURCE');
  const quantity=itemQuantity(lot.item,r.quantity);requireThat(lot.quantity>=quantity,'INSUFFICIENT_STOCK');
  out.push({item:publicItem(lot.item),quantity,sourceRevision:lot.revision,sourceLotId:lot.id,shopId:shop.id,shopName:shop.name,transferable:lot.transferable!==false,resellable:lot.resellable!==false,pillable:lot.pillable!==false});
 }
 requireThat(new Set(out.map(r=>r.sourceLotId)).size===out.length,'SO_MISSION_REWARD_SOURCE');return out;
}
export const rewardTerms=rewards=>rewards.map(({sourceLotId,sourceRevision,...r})=>r);
export async function rewardStock(tx,s,c){
 const out=[];
 for(const r of c.rewardSources??[]){
  const lot=await tx.get(`sessions/${s.id}/inventory/${r.sourceLotId}`);
  requireThat(hasMissionExecution(s)&&stock(lot,r.shopId)&&lot.item.id===r.item.id&&lot.item.revision===r.item.revision&&lot.quantity>=r.quantity&&['transferable','resellable','pillable'].every(k=>(lot[k]!==false)===r[k]),'SO_MISSION_REWARD_SOURCE');out.push({r,lot});
 }
 return out;
}
export function reserveMissionRewards(tx,s,c,stock,id,at,actor){
 return stock.map(({r,lot})=>{
  const reservedLotId=hash(`contract:${c.id}:${lot.id}`),reserved={...lot,id:reservedLotId,quantity:r.quantity,status:'MISSION_RESERVED',contractId:c.id,revision:1,createdAt:at,origin:{kind:'CONTRACT_RESERVE',parentLotId:lot.id,rootLotId:lot.origin?.rootLotId??lot.id,contractId:c.id}};
  writeLot(tx,s,c,lot,{...lot,quantity:lot.quantity-r.quantity,revision:lot.revision+1},id,at,actor,'CONTRACT_RESERVE','Stock promis réservé à la signature');
  writeLot(tx,s,c,null,reserved,id,at,actor,'CONTRACT_RESERVE','Stock promis réservé à la signature');
  return {...r,reservedLotId,remaining:r.quantity,disputed:0};
 });
}
export async function readRewardReserves(tx,s,c){
 const out=[];
 for(const r of rows(c).filter(r=>r.remaining>0)){
  const lot=await tx.get(`sessions/${s.id}/inventory/${r.reservedLotId}`),source=await tx.get(`sessions/${s.id}/inventory/${r.sourceLotId}`);
  requireThat(hasMissionExecution(s)&&lot?.contractId===c.id&&lot.status==='MISSION_RESERVED'&&lot.quantity===r.remaining&&lot.item.id===r.item.id&&lot.ownerType==='SHOP'&&lot.ownerId===r.shopId&&stock(source,r.shopId)&&source.item.id===r.item.id&&source.item.revision===lot.item.revision,'SO_MISSION_REWARD_SOURCE');
  out.push({r,lot,source});
 }
 return out;
}
export function rewardDispute(c,input){
 const selected=input.rewardDisputes??[];requireThat(validRows(selected)&&selected.length<=rows(c).length&&new Set(selected.map(r=>r.itemId)).size===selected.length,'SO_MISSION_REWARD_AMOUNT');
 for(const r of selected)requireThat(rows(c).some(x=>x.item.id===r.itemId),'SO_MISSION_REWARD_AMOUNT');
 return rows(c).map(r=>{const requested=selected.find(x=>x.itemId===r.item.id),disputed=requested?whole(requested.quantity,'SO_MISSION_REWARD_AMOUNT'):r.disputed;requireThat(disputed>=r.disputed&&disputed<=r.remaining,'SO_MISSION_REWARD_AMOUNT');return {...r,disputed};});
}
export async function rewardSettlement(tx,s,c,input,kind){
 const reserves=await readRewardReserves(tx,s,c),awards=input.rewardAwards??[];
 requireThat(validRows(awards)&&new Set(awards.map(a=>a.itemId)).size===awards.length,'SO_MISSION_REWARD_AMOUNT');
 requireThat(kind==='ARBITRATE'?awards.length===rows(c).filter(r=>r.disputed>0).length:awards.length===0,'SO_MISSION_REWARD_AMOUNT');
 const plans=reserves.map(x=>{
  const r=x.r,a=awards.find(a=>a.itemId===r.item.id);requireThat(!a||r.disputed>0,'SO_MISSION_REWARD_AMOUNT');
  const recognized=kind==='ARBITRATE'&&r.disputed>0?whole(a?.quantity,'SO_MISSION_REWARD_AMOUNT'):0;requireThat(recognized<=r.disputed,'SO_MISSION_REWARD_AMOUNT');
  return {...x,pay:r.remaining-r.disputed+recognized,release:kind==='ARBITRATE'?r.disputed-recognized:0};
 });
 requireThat(awards.every(a=>reserves.some(x=>x.r.item.id===a.itemId&&x.r.disputed>0)),'SO_MISSION_REWARD_AMOUNT');
 return plans;
}
export function applyRewardSettlement(tx,s,c,plans,id,at,actor,reason){
 const reservations=[...rows(c)],pickups=[...(c.rewardPickups??[])];
 for(const {r,lot,source,pay,release} of plans){
  if(!pay&&!release)continue;
  const remaining=r.remaining-pay-release;
  writeLot(tx,s,c,lot,{...lot,quantity:remaining,status:remaining?'MISSION_RESERVED':'CONSUMED',revision:lot.revision+1},id,at,actor,'CONTRACT_REWARD',reason);
  if(release){itemQuantity(source.item,source.quantity+release);writeLot(tx,s,c,source,{...source,quantity:source.quantity+release,revision:source.revision+1},id,at,actor,'CONTRACT_RELEASE',reason);}
  if(pay){
   const lotId=hash(`reward:${id}:${lot.id}`),acquired={...lot,id:lotId,quantity:pay,status:'AVAILABLE',ownerType:'CHARACTER',ownerId:c.characterId,revision:1,createdAt:at,origin:{kind:'CONTRACT_REWARD',parentLotId:lot.id,rootLotId:lot.origin.rootLotId,contractId:c.id}};
   writeLot(tx,s,c,null,acquired,id,at,actor,'CONTRACT_REWARD',reason);
   pickups.push({id:lotId,purchasedLotId:lotId,buyerId:c.characterId,shopId:r.shopId,shopName:r.shopName,item:r.item,quantity:pay,pickupStatus:'WAITING'});
  }
  reservations[reservations.findIndex(x=>x.item.id===r.item.id)]={...r,remaining,disputed:remaining};
 }
 return {...c,rewardReservations:reservations,rewardPickups:pickups};
}
export async function rewardPickupState(tx,s,c,p,at){
 const buyer=await inventoryParty(tx,s.id,c.characterId),lot=await tx.get(`sessions/${s.id}/inventory/${p.purchasedLotId}`),x=shopCustody(s,p,buyer,lot,at);
 const blockedReason=!buyer.active||buyer.version!==c.applicantVersion?'ACCESS_CHANGED':buyer.c.survival?.dead?'CHARACTER_DEAD':!x.custody||lot.item.id!==p.item.id||lot.item.revision!==p.item.revision?'CUSTODY_CHANGED':s.safetyStop?.active?'SAFETY_STOP':s.stage!=='EN_JEU'?'SESSION_NOT_RUNNING':!x.allowed?'CHARACTER_UNAVAILABLE':null;
 return {...x,buyer,lot,blockedReason,allowed:!blockedReason,confirmation:hash(JSON.stringify([s.id,c.id,c.revision,p,lot?.revision??null,buyer.version]))};
}
async function rewardPickupView(tx,s,c,p,at,admin){
 const x=await rewardPickupState(tx,s,c,p,at),received=p.pickupStatus==='RECEIVED';
 return {...p,pickupStatus:p.pickupStatus==='READY'&&!x.ready?'STALE':p.pickupStatus,canOffer:admin&&x.allowed&&!x.ready&&!received,canReceive:!admin&&x.allowed&&x.ready&&!received,blockedReason:received?null:x.blockedReason,confirmation:x.confirmation};
}
export async function missionRewardsView(tx,s,c,at,admin){
 if(!c.rewardSources?.length)return {};
 const pickups=[];
 for(const p of c.rewardPickups??[])pickups.push(await rewardPickupView(tx,s,c,p,at,admin));
 return {rewards:rows(c).map(({item,quantity,remaining,disputed})=>({item,quantity,remaining,disputed})),rewardPickups:pickups};
}
// A public counter QR is only a route. Resolve private entitlements with the
// same participant guard and pickup state as the contract; reads move nothing.
export async function shopMissionRewards(tx,ctx,actor,at,admin,shopIds){
 const {s}=ctx;if(!hasMissionExecution(s)||s.spaceOutlaws?.missionsVersion!==1)return {};
 const rewards=[],shops=new Set(shopIds),contracts=await tx.list(`sessions/${s.id}/contracts`,admin?null:['characterId',ctx.c.id]);
 for(const c of contracts){
  if(c.terms?.spaceOutlaws!==true||!c.rewardSources?.length||!admin&&!await participantAccess(tx,s,ctx,actor,c))continue;
  for(const p of c.rewardPickups??[]){
   if(!shops.has(p.shopId))continue;
   const v=await rewardPickupView(tx,s,c,p,at,admin);
   rewards.push({contractId:c.id,contractTitle:c.terms.title,...(admin?{recipientName:c.terms.applicant.name}:{}),id:v.id,shopId:v.shopId,shopName:v.shopName,item:v.item,quantity:v.quantity,pickupStatus:v.pickupStatus,canOffer:v.canOffer,canReceive:v.canReceive,blockedReason:v.blockedReason,confirmation:v.confirmation});
  }
 }
 return {missionRewards:rewards.sort((a,b)=>Number(a.pickupStatus==='RECEIVED')-Number(b.pickupStatus==='RECEIVED')||a.contractId.localeCompare(b.contractId)||a.id.localeCompare(b.id))};
}
export const rewardActions=['offerContractRewardPickup','confirmContractRewardPickup'];
export async function takeMissionReward(tx,s,c,input,at,actor,id,receive){
 requireThat(hasMissionExecution(s)&&s.stage==='EN_JEU'&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');
 const p=(c.rewardPickups??[]).find(p=>p.id===documentId(input.pickupId));requireThat(p&&p.pickupStatus!=='RECEIVED','STALE_PICKUP');
 const x=await rewardPickupState(tx,s,c,p,at);requireThat(x.allowed&&input.confirmation===x.confirmation,'STALE_PICKUP');
 requireThat(receive?input.received===true&&x.ready:input.present===true,'STALE_PICKUP');
 const next=receive?{...p,pickupStatus:'RECEIVED',pickedUpAt:at}:{...p,pickupStatus:'READY',pickupBuyerVersion:x.buyer.version,pickupLotRevision:x.lot.revision};
 if(receive)writeLot(tx,s,c,x.lot,receivedShopLot(x.lot,c.characterId),id,at,actor,'PICKUP','Récompense présentée par le MJ puis réception confirmée par le titulaire');
 return {...c,rewardPickups:c.rewardPickups.map(v=>v.id===p.id?next:v)};
}
