import {participantCurrent} from './mission-parties.mjs';
import {requireThat,documentId,whole} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {shopStockId} from './space-outlaws-shop-state.mjs';
import {publicLot,inventoryHash as hash,itemQuantity} from './inventory-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {warehouseStock,stockVolume,incomingVolume} from './storage-state.mjs';

export const hasSoTransport=s=>s.spaceOutlaws?.transportVersion===1;
const base=s=>`sessions/${s.id}`;
const idle=ship=>ship?.soProfile&&ship.enabled&&ship.docked&&!ship.journey&&!ship.operation&&!ship.combatId&&!ship.rescueId&&!ship.maintenanceId;
const stockMatches=(lot,t)=>lot?.ownerType==='SHOP'&&lot.ownerId===t.shopId&&lot.location.kind==='SHOP'&&lot.location.id===t.shopId&&lot.status==='AVAILABLE'&&lot.item.id===t.item.id&&lot.item.revision===t.item.revision&&lot.transferable===true&&lot.resellable===true;
export async function transportOptions(tx,s){
 if(!hasSoTransport(s))return {};
 return {transportShips:(await tx.list(`${base(s)}/ships`)).filter(x=>x.soProfile&&x.capacity>0).map(x=>({id:x.id,name:x.name,ownerId:x.ownerId})),transportReady:true};
}
export async function prepareTransport(tx,s,a,input,source,characterId){
 if(!s.spaceOutlaws)return null;
 if(a.category!=='TRANSPORT'){requireThat(input.transport===undefined,'SO_TRANSPORT_INVALID');return null;}
 requireThat(hasSoTransport(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(source?.ownerType==='SHOP'&&!(a.rewardItems??[]).length,'SO_TRANSPORT_INVALID');
 const p=input.transport;admissionKeys(p,['shipId','routeId','offerId','quantity','rate','recipient','expenses']);
 requireThat(['ORDINARY','RISK'].includes(p.rate),'SO_TRANSPORT_INVALID');
 const route=await tx.get(`${base(s)}/routes/${documentId(p.routeId)}`),ship=await tx.get(`${base(s)}/ships/${documentId(p.shipId)}`);
 requireThat(route?.versionId===s.spaceOutlaws.versionId&&route.fromPort===s.transportRules?.homePort,'SO_TRANSPORT_INVALID');
 requireThat(idle(ship)&&ship.ownerType==='CHARACTER'&&ship.ownerId===characterId&&ship.pilotId===characterId&&ship.portId===route.fromPort&&ship.capacity>0,'SO_TRANSPORT_SHIP');
 const offer=await tx.get(`${base(s)}/shops/${source.shopId}/offers/${documentId(p.offerId)}`);
 requireThat(offer?.versionId===s.spaceOutlaws.versionId&&offer.shopId===source.shopId,'SO_TRANSPORT_INVALID');
 const quantity=itemQuantity(offer.item,p.quantity),lot=await tx.get(`${base(s)}/inventory/${shopStockId(offer.id)}`);
 const t={shopId:source.shopId,offerId:offer.id,offerRevision:offer.revision,shipId:ship.id,shipName:ship.name,routeId:route.id,routeName:route.name,fromPort:route.fromPort,toPort:route.toPort,item:offer.item,quantity,unitValue:offer.unitPrice,value:whole(offer.unitPrice*quantity),rate:p.rate,recipient:admissionText(p.recipient,200,true),expenses:admissionText(p.expenses,2000,true),partialDelivery:false};
 requireThat(stockMatches(lot,t)&&lot.quantity>=quantity,'INSUFFICIENT_STOCK');
 const volume=stockVolume([{...lot,quantity}]);requireThat(volume>0&&volume+stockVolume(await warehouseStock(tx,s.id,ship.id,'HOLD'))+await incomingVolume(tx,s.id,ship.id,'HOLD')<=ship.capacity,'WAREHOUSE_FULL');
 // Reference only: the agreed integer salary remains explicit and negotiable.
 t.referenceSalary=Math.max(100,t.value*(p.rate==='RISK'?15:10)/100);
 return {terms:t,lot,guard:[ship.revision,lot.revision,offer.revision,route.revision]};
}
export async function transportAcceptance(tx,s,c){
 if(!c.terms.transport)return null;
 const t=c.terms.transport;
 const x=await prepareTransport(tx,s,{category:'TRANSPORT',rewardItems:[]},{transport:{shipId:t.shipId,routeId:t.routeId,offerId:t.offerId,quantity:t.quantity,rate:t.rate,recipient:t.recipient,expenses:t.expenses}},{ownerType:'SHOP',shopId:t.shopId},c.characterId);
 requireThat(JSON.stringify(x.terms)===JSON.stringify(t),'STALE_CONTRACT');return x;
}
export function reserveTransport(tx,s,c,x,at,actorUid){
 if(!x)return;
 authorizeSpaceOutlaws(tx,s,'TRANSPORT');const id=hash(`transport:${c.id}`),lot=x.lot,quantity=x.terms.quantity;
 const next={...lot,quantity:lot.quantity-quantity,revision:lot.revision+1},reserved={...lot,id,quantity,revision:1,transportContractId:c.id,createdAt:at,origin:{kind:'TRANSPORT_RESERVE',parentLotId:lot.id,rootLotId:id}};
 tx.set(`${base(s)}/inventory/${lot.id}`,next);tx.set(`${base(s)}/inventory/${id}`,reserved);
 for(const [l,before,after] of [[lot,lot,next],[reserved,null,reserved]])tx.set(`${base(s)}/inventory/${l.id}/history/${id}`,{id,kind:'TRANSPORT_RESERVE',at,actorUid,contractId:c.id,before,after});
}
export async function transportLots(tx,s,c){return (await tx.list(`${base(s)}/inventory`)).filter(l=>l.transportContractId===c.id&&l.quantity>0);}
export function transportProgress(c,lots){
 const indices=lots.map(l=>l.transportLegIndex??(l.transportVoyageId?1:0));
 return {index:indices[0]??0,unanimous:indices.every(i=>i===indices[0])};
}
export function transportDeliveryState(c,lots,transfers){
 const delivered=lots.filter(l=>l.transportDelivered&&l.location.kind==='PORT'&&l.location.id===c.terms.transport.toPort),quantity=delivered.reduce((n,l)=>n+l.quantity,0);
 return {delivered:quantity,complete:quantity===c.terms.transport.quantity&&transfers.length===0,deliveredGameMs:quantity===c.terms.transport.quantity?Math.max(...delivered.map(l=>l.transportDeliveredGameMs)):null};
}
export async function transportView(tx,s,c){
 if(!c.terms.transport||c.acceptedAt==null)return null;
 const t=c.terms.transport,lots=await transportLots(tx,s,c),transfers=(await tx.list(`${base(s)}/cargoTransfers`)).filter(x=>x.transportContractId===c.id&&x.status==='LOADING');
 const delivery=transportDeliveryState(c,lots,transfers);
 const progress=transportProgress(c,lots),next=c.transportPlan?.routes[progress.index],port=await tx.get(`${base(s)}/ports/${next?.toPort??t.toPort}`),route=next?await tx.get(`${base(s)}/routes/${next.id}`):null;
 const detour=s.spaceOutlaws.detourVersion===1?lots[0]?.transportDetour:null,voyage=detour?await tx.get(`${base(s)}/voyages/${detour.voyageId}`):null;
 const recovery=voyage?.status==='ARRIVED'&&voyage.toPort!==detour.toPort?{fromPort:voyage.toPort,toPort:detour.toPort}:null;
 const recoveryRoutes=recovery?(await tx.list(`${base(s)}/routes`)).filter(r=>r.versionId===s.versionId&&r.fromPort===recovery.fromPort&&r.toPort===recovery.toPort):[];
 return {lots:lots.map(publicLot),transfers:transfers.map(x=>({id:x.id,name:x.name,quantity:x.quantity})),...delivery,navigationCode:recovery?(recoveryRoutes.length===1?recoveryRoutes[0].navigationCode:null):route?.navigationCode??port?.navigationCode??null,...(recovery?{recovery}:{}),...(c.transportPlan?{itinerary:{routes:c.transportPlan.routes,index:progress.index}}:{})};
}
export async function transportProof(tx,s,c){
 const d=await transportView(tx,s,c);if(!d)return {};
 return {transportEvidence:{complete:d.complete,delivered:d.delivered,expected:c.terms.transport.quantity,deliveredGameMs:d.deliveredGameMs,lateByMs:d.deliveredGameMs===null?null:Math.max(0,d.deliveredGameMs-c.deadlineGameMs)}};
}
export async function transportReview(tx,s,c,input){
 if(!c.terms.transport||input.decision!=='PAY')return {};
 const d=await transportProof(tx,s,c),e=d.transportEvidence;requireThat(e.complete,'SO_TRANSPORT_DELIVERY');
 requireThat(e.lateByMs<=600000||input.delayJustified===true,'SO_TRANSPORT_DELAY');
 return {...d,delayJustified:input.delayJustified===true};
}
export async function transportReleasePlan(tx,s,c){
 if(!c.terms.transport||c.acceptedAt==null)return null;
 const t=c.terms.transport,lots=await transportLots(tx,s,c),source=await tx.get(`${base(s)}/inventory/${shopStockId(t.offerId)}`);
 requireThat(lots.reduce((n,l)=>n+l.quantity,0)===t.quantity&&lots.every(l=>stockMatches(l,t)&&!l.transportVoyageId),'SO_TRANSPORT_IN_PROGRESS');
 requireThat(stockMatches(source,t),'SO_TRANSPORT_INVALID');return {lots,source};
}
export function releaseTransport(tx,s,c,p,at,actorUid,id){
 if(!p)return;authorizeSpaceOutlaws(tx,s,'TRANSPORT');
 const next={...p.source,quantity:whole(p.source.quantity+p.lots.reduce((n,l)=>n+l.quantity,0)),revision:p.source.revision+1};
 tx.set(`${base(s)}/inventory/${next.id}`,next);tx.set(`${base(s)}/inventory/${next.id}/history/${id}`,{id,kind:'TRANSPORT_RELEASE',at,actorUid,contractId:c.id,before:p.source,after:next});
 for(const l of p.lots){const n={...l,quantity:0,status:'CONSUMED',revision:l.revision+1};tx.set(`${base(s)}/inventory/${l.id}`,n);tx.set(`${base(s)}/inventory/${l.id}/history/${id}`,{id,kind:'TRANSPORT_RELEASE',at,actorUid,contractId:c.id,before:l,after:n});}
}
// Narrow custody grant. It never grants access to the rest of the client's stock.
export async function transportCargoAccess(tx,s,lot,cid,admin=false){
 if(!lot?.transportContractId)return null;
 requireThat(hasSoTransport(s),'SO_GAMEPLAY_NOT_OPEN');const c=await tx.get(`${base(s)}/contracts/${lot.transportContractId}`),t=c?.terms.transport;
 requireThat(t&&(admin||c.characterId===cid)&&c.acceptedAt!=null,'FORBIDDEN');
 if(!admin)requireThat((await participantCurrent(tx,s,c)).current,'FORBIDDEN');
 requireThat(lot.ownerType==='SHOP'&&lot.ownerId===t.shopId&&lot.item.id===t.item.id,'SO_TRANSPORT_INVALID');
 const ship=await tx.get(`${base(s)}/ships/${t.shipId}`),voyage=lot.transportVoyageId?await tx.get(`${base(s)}/voyages/${lot.transportLastVoyageId??lot.transportVoyageId}`):null;
 const active=c.status==='ACTIVE',returnOnly=['SUBMITTED','REVIEWED','DISPUTED'].includes(c.status),local=idle(ship)&&(admin||ship.ownerId===cid&&ship.pilotId===cid);
 const routeId=s.spaceOutlaws.detourVersion===1&&lot.transportDetour&&lot.transportDetour.voyageId===voyage?.id&&voyage?.toPort===lot.transportDetour.toPort?lot.transportDetour.routeId:voyage?.routeId;
 const routeDelivered=c.transportPlan?lot.transportLegIndex===c.transportPlan.routes.length&&routeId===c.transportPlan.routes.at(-1).id:routeId===t.routeId;
 return {c,t,ship,active,returnOnly,local,deliveryAllowed:!!(active&&local&&ship.portId===t.toPort&&voyage?.status==='ARRIVED'&&voyage.shipId===t.shipId&&routeDelivered&&voyage.departedAt>=c.acceptedAt),owner:{type:'SHOP',id:t.shopId}};
}
export function transportPlaceAllowed(grant,loc){return !!grant&&(loc.kind==='SHOP'&&loc.id===grant.t.shopId||loc.kind==='PORT'&&loc.id===grant.t.toPort||loc.kind==='HOLD'&&loc.id===grant.t.shipId);}
export async function transportDeparture(tx,s,ship,route,journeyId,at){
 const lots=(await warehouseStock(tx,s.id,ship.id,'HOLD')).filter(l=>l.transportContractId);if(!lots.length)return [];
 requireThat(hasSoTransport(s),'SO_GAMEPLAY_NOT_OPEN');const manifest=[],updates=[];
 for(const cid of new Set(lots.map(l=>l.transportContractId))){
  const c=await tx.get(`${base(s)}/contracts/${cid}`),t=c?.terms.transport,rows=lots.filter(l=>l.transportContractId===cid);
  const returning=rows.every(l=>l.transportVoyageId);
  requireThat((c?.status==='ACTIVE'||returning&&['SUBMITTED','REVIEWED','DISPUTED'].includes(c?.status))&&t?.shipId===ship.id&&c.characterId===ship.pilotId&&rows.every(l=>l.status==='AVAILABLE'&&l.ownerType==='SHOP'&&l.ownerId===t.shopId)&&(returning||(c.transportPlan?.routes[0]?.id??t.routeId)===route.id&&rows.every(l=>!l.transportVoyageId)&&rows.reduce((n,l)=>n+l.quantity,0)===t.quantity),'SO_TRANSPORT_LOAD');
  const progress=transportProgress(c,rows),last=rows[0].transportDetour,previous=last?await tx.get(`${base(s)}/voyages/${last.voyageId}`):null;
  const recovery=s.spaceOutlaws.detourVersion===1&&last&&previous?.status==='ARRIVED'&&previous.toPort!==last.toPort&&c.status==='ACTIVE';
  if(recovery)requireThat(previous.shipId===ship.id&&ship.portId===previous.toPort&&rows.every(l=>l.transportDetour?.voyageId===last.voyageId&&l.transportDetour?.routeId===last.routeId)&&route.toPort===last.toPort,'SO_TRANSPORT_RECOVERY');
  if(c.transportPlan&&c.status==='ACTIVE')requireThat(s.spaceOutlaws.escortAmendmentVersion===1&&progress.unanimous&&(recovery?c.transportPlan.routes[progress.index-1]?.id===last.routeId:c.transportPlan.routes[progress.index]?.id===route.id)&&rows.reduce((n,l)=>n+l.quantity,0)===t.quantity,'SO_AMENDMENT_ROUTE');
  manifest.push({contractId:cid,quantity:t.quantity,lotIds:rows.map(l=>l.id)});
  for(const lot of rows)updates.push({lot,index:c.transportPlan&&c.status==='ACTIVE'&&!recovery?progress.index+1:progress.index||1,recovery});
 }
 if(journeyId){authorizeSpaceOutlaws(tx,s,'TRANSPORT');for(const {lot,index,recovery} of updates.filter(({lot})=>!lot.transportVoyageId||s.spaceOutlaws.escortAmendmentVersion===1||s.spaceOutlaws.detourVersion===1)){const next={...lot,transportVoyageId:lot.transportVoyageId??journeyId,...(s.spaceOutlaws.escortAmendmentVersion===1||s.spaceOutlaws.detourVersion===1?{transportLastVoyageId:journeyId,transportLegIndex:index}:{}),...(lot.transportDetour?{transportDetour:recovery?{...lot.transportDetour,voyageId:journeyId}:null}:{}),revision:lot.revision+1};tx.set(`${base(s)}/inventory/${lot.id}`,next);tx.set(`${base(s)}/inventory/${lot.id}/history/${journeyId}`,{id:journeyId,kind:'TRANSPORT_DEPARTURE',at,contractId:lot.transportContractId,before:lot,after:next});}}
 return manifest;
}

// The physical journey can change; the entrusted leg and delivery port cannot.
export async function transportDetour(tx,s,ship,id,at){
 const lots=(await warehouseStock(tx,s.id,ship.id,'HOLD')).filter(l=>l.transportContractId);
 if(!lots.length)return;requireThat(hasSoTransport(s),'SO_GAMEPLAY_NOT_OPEN');authorizeSpaceOutlaws(tx,s,'TRANSPORT');
 for(const lot of lots){
  requireThat((lot.transportLastVoyageId??lot.transportVoyageId)===ship.journey.id,'SO_TRANSPORT_LOAD');
  const transportDetour=lot.transportDetour?.voyageId===ship.journey.id?lot.transportDetour:{voyageId:ship.journey.id,routeId:ship.journey.routeId,toPort:ship.journey.toPort};
  const next={...lot,transportDetour,revision:lot.revision+1};tx.set(`${base(s)}/inventory/${lot.id}`,next);tx.set(`${base(s)}/inventory/${lot.id}/history/${id}`,{id,kind:'TRANSPORT_DETOUR',at,contractId:lot.transportContractId,before:lot,after:next});
 }
}

export async function transportSettlementPlan(tx,s,c){
 if(!c.terms.transport)return null;
 const t=c.terms.transport,lots=await transportLots(tx,s,c);
 requireThat(lots.every(l=>l.status==='AVAILABLE'&&(l.location.kind==='PORT'&&l.location.id===t.toPort&&l.transportDelivered||stockMatches(l,t))),'SO_TRANSPORT_CUSTODY');
 const returned=lots.filter(l=>l.location.kind==='SHOP');if(!returned.length)return null;
 const source=await tx.get(`${base(s)}/inventory/${shopStockId(t.offerId)}`);requireThat(stockMatches(source,t),'SO_TRANSPORT_INVALID');return {lots:returned,source};
}
