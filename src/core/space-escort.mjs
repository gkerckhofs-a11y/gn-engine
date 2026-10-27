import {requireThat,documentId,whole} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryParty} from './inventory-transfers.mjs';
import {soRoute,navigationSkill} from './space-outlaws-navigation-state.mjs';
import {transportView} from './space-transport.mjs';
import {shopAccountId,shopStockId} from './space-outlaws-shop-state.mjs';
import {moneyState,writeLedger} from './economy-state.mjs';
import {accountEntry} from './collective-accounts.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {gameTime} from './clock.mjs';

export const hasSoEscort=s=>s.spaceOutlaws?.escortVersion===1;
const base=s=>`sessions/${s.id}`;
const idle=x=>x?.soProfile&&x.enabled&&x.docked&&!x.journey&&!x.operation&&!x.combatId&&!x.rescueId&&!x.maintenanceId&&x.hull>0&&!x.revisionRequired;
const open=c=>c.acceptedAt!=null&&!['CANCELLED','EXPIRED','DECLINED'].includes(c.status);
export const escortFuelRemaining=c=>c.escortFuel?.remaining??0;
export const contractReserve=c=>whole(c.terms.amount+escortFuelRemaining(c));
export async function escortOptions(tx,s){
 if(!hasSoEscort(s))return {};
 const contracts=await tx.list(`${base(s)}/contracts`),ships=await tx.list(`${base(s)}/ships`);
 return {escortReady:true,escortTransports:contracts.filter(c=>c.status==='ACTIVE'&&c.terms.transport).map(c=>({id:c.id,title:c.terms.title,shipName:c.terms.transport.shipName,sourceAccountId:c.sourceAccountId})),escortShips:ships.filter(idle).map(x=>({id:x.id,name:x.name,pilotId:x.pilotId}))};
}
export async function prepareEscort(tx,s,a,input,source,cid,ownId=null){
 if(!s.spaceOutlaws)return null;
 if(a.category!=='ESCORT'){requireThat(input.escort===undefined,'SO_ESCORT_INVALID');return null;}
 requireThat(hasSoEscort(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(!a.rewardItems?.length,'SO_ESCORT_INVALID');
 const p=input.escort;admissionKeys(p,['transportContractId','shipId','returnRouteId','expenses']);
 const freight=await tx.get(`${base(s)}/contracts/${documentId(p.transportContractId)}`),t=freight?.terms.transport;
 requireThat(freight?.status==='ACTIVE'&&t&&freight.sourceAccountId===source?.id,'SO_ESCORT_FREIGHT');
 const cargo=await tx.get(`${base(s)}/ships/${t.shipId}`),ship=await tx.get(`${base(s)}/ships/${documentId(p.shipId)}`),pilot=await inventoryParty(tx,s.id,cid),leader=await inventoryParty(tx,s.id,freight.characterId);
 requireThat(idle(cargo)&&idle(ship)&&ship.id!==cargo.id&&ship.pilotId===cid&&ship.ownerId===cid&&cargo.pilotId===freight.characterId&&cid!==freight.characterId&&ship.portId===t.fromPort&&cargo.portId===t.fromPort&&pilot.active&&leader.active&&navigationSkill(pilot.c,'PIL-02')>=1,'SO_ESCORT_SHIP');
 const route=await tx.get(`${base(s)}/routes/${t.routeId}`),back=await tx.get(`${base(s)}/routes/${documentId(p.returnRouteId)}`);
 requireThat(route?.versionId===s.spaceOutlaws.versionId&&back?.versionId===s.spaceOutlaws.versionId&&back.fromPort===t.toPort&&back.toPort===t.fromPort,'SO_ESCORT_ROUTE');
 const all=await tx.list(`${base(s)}/contracts`);requireThat(!all.some(c=>c.id!==ownId&&c.terms.escort&&open(c)&&['ACTIVE','SUBMITTED','REVIEWED','DISPUTED'].includes(c.status)&&(c.terms.escort.shipId===ship.id||c.terms.escort.cargoShipId===cargo.id)),'SO_ESCORT_BUSY');
 const units=soRoute(route,ship).fuelCost+soRoute(back,ship).fuelCost;
 return {terms:{transportContractId:freight.id,cargoShipId:cargo.id,cargoName:cargo.name,shipId:ship.id,shipName:ship.name,routeId:route.id,routeName:route.name,returnRouteId:back.id,returnRouteName:back.name,fromPort:route.fromPort,toPort:route.toPort,freightValue:t.value,referenceSalary:Math.max(route.riskId==='HOSTILE'?150:100,t.value*(route.riskId==='HOSTILE'?7.5:5)/100),fuelUnits:units,fuelBudget:whole(units*25),expenses:admissionText(p.expenses,2000,true)},guard:[freight.revision,ship.revision,cargo.revision,route.revision,back.revision,pilot.version,leader.version]};
}
export async function escortAcceptance(tx,s,c,source){
 if(!c.terms.escort)return null;const t=c.terms.escort;
 const x=await prepareEscort(tx,s,{category:'ESCORT'},{escort:{transportContractId:t.transportContractId,shipId:t.shipId,returnRouteId:t.returnRouteId,expenses:t.expenses}},source,c.characterId,c.id);
 requireThat(JSON.stringify(t)===JSON.stringify(x.terms),'STALE_CONTRACT');return x;
}
export async function escortEvidence(tx,s,c){
 if(!c.terms.escort||c.acceptedAt==null)return null;
 requireThat(hasSoEscort(s),'SO_GAMEPLAY_NOT_OPEN');const t=c.terms.escort,all=await tx.list(`${base(s)}/voyages`);
 // Evidence stays tied to the accepted incarnation and an actual common departure.
 const escort=all.filter(v=>v.shipId===t.shipId&&v.routeId===t.routeId&&v.departedAt>=c.acceptedAt&&v.convoyLeaderId===t.cargoShipId&&v.convoyShipIds?.includes(t.cargoShipId)&&v.missionManifest?.some(m=>m.id===c.characterId&&m.version===c.applicantVersion)).sort((a,b)=>a.departedAt-b.departedAt)[0];
 const cargo=escort?all.find(v=>v.shipId===t.cargoShipId&&v.convoyId===escort.convoyId&&v.departedAt===escort.departedAt):null,freight=await tx.get(`${base(s)}/contracts/${t.transportContractId}`),delivery=freight?await transportView(tx,s,freight):null;
 return {departed:!!(cargo&&escort),freightEmbarked:!!cargo?.transportManifest?.some(m=>m.contractId===t.transportContractId),escortVoyageId:escort?.id??null,cargoVoyageId:cargo?.id??null,escortArrived:escort?.status==='ARRIVED',cargoArrived:cargo?.status==='ARRIVED',delivered:!!(cargo?.status==='ARRIVED'&&delivery?.complete)};
}
export async function escortReview(tx,s,c,input){
 if(!c.terms.escort||input.decision==='RETURN')return null;
 const e=await escortEvidence(tx,s,c),outcome=input.escortOutcome;
 requireThat(['DELIVERED','DEFENDED','FAULT','NOT_STARTED'].includes(outcome),'SO_ESCORT_OUTCOME');
 requireThat(input.decision===(['DELIVERED','DEFENDED'].includes(outcome)?'PAY':'REJECT'),'SO_ESCORT_OUTCOME');
 if(outcome==='NOT_STARTED')requireThat(!e.departed,'SO_ESCORT_STARTED');else requireThat(e.departed,'SO_ESCORT_EVIDENCE');
 if(outcome==='DELIVERED')requireThat(e.freightEmbarked&&e.delivered&&input.protectionConfirmed===true,'SO_ESCORT_EVIDENCE');
 if(outcome==='DEFENDED')requireThat(e.freightEmbarked&&!e.delivered&&input.protectionConfirmed===true,'SO_ESCORT_EVIDENCE');
 if(outcome==='FAULT')requireThat(input.faultConfirmed===true,'SO_ESCORT_OUTCOME');
 return {outcome,evidence:e,award:outcome==='DELIVERED'?c.terms.amount:outcome==='DEFENDED'?Math.round(c.terms.amount/2):0};
}
export async function escortClosure(tx,s,c){
 if(!c.terms.escort||c.acceptedAt==null)return;
 requireThat(!(await escortEvidence(tx,s,c)).departed,'SO_ESCORT_STARTED');
 const ship=await tx.get(`${base(s)}/ships/${c.terms.escort.shipId}`);requireThat(!ship?.operation?.escortContractId,'SPACE_SHIP_BUSY');
}
export async function escortView(tx,s,c,admin){
 if(!c.terms.escort)return null;requireThat(hasSoEscort(s),'SO_GAMEPLAY_NOT_OPEN');
 const t=c.terms.escort,e=await escortEvidence(tx,s,c),ship=await tx.get(`${base(s)}/ships/${t.shipId}`),ports=await tx.list(`${base(s)}/ports`),offers=[];
 if(!admin&&open(c)&&escortFuelRemaining(c)>0&&idle(ship)&&ship.portId===s.transportRules?.homePort){
  for(const shop of await tx.list(`${base(s)}/shops`))for(const o of await tx.list(`${base(s)}/shops/${shop.id}/offers`))if(o.item.id===ship.navigation.fuelItemId&&o.unitPrice===25){const l=await tx.get(`${base(s)}/inventory/${shopStockId(o.id)}`);if(l?.status==='AVAILABLE'&&l.quantity>0)offers.push({id:o.id,shopId:shop.id,name:`${shop.name} · ${o.name}`,quantity:l.quantity});}
 }
 return {evidence:e,fuel:c.escortFuel??null,review:c.escortReview??null,offers,canRelease:open(c)&&escortFuelRemaining(c)>0&&!ship?.operation?.escortContractId&&(admin||idle(ship)&&ship.portId===t.fromPort),...(!admin&&c.acceptedAt!=null?{navigationCode:ports.find(p=>p.id===t.toPort)?.navigationCode??null,returnCode:ports.find(p=>p.id===t.fromPort)?.navigationCode??null}:{})};
}
export const escortActions=['prepareEscortRefuel','startEscortRefuel','prepareEscortFuelRelease','releaseEscortFuel','prepareEscortFuelReleaseAdmin','releaseEscortFuelAdmin'];
export const escortAdminActions=escortActions.filter(a=>a.endsWith('Admin'));
const fuelHistory=(tx,s,c,id,at,actorUid,kind,accounts,reason)=>{
 const entries=accounts.map(([before,after])=>{moneyState(after);tx.set(`${base(s)}/accounts/${after.id}`,after);return accountEntry(before,after.balance-before.balance,after);});
 writeLedger(tx,s.id,{id,at,actorUid,kind,memo:'Carburant de l’escorte',reason,contractId:c.id,createdCurrency:0,removedCurrency:0,entries});
};
export async function escortCommand(tx,s,c,ctx,input,at,id,actor,action){
 requireThat(hasSoEscort(s)&&c.terms.escort,'SO_GAMEPLAY_NOT_OPEN');
 const release=action.toLowerCase().includes('release'),admin=action.endsWith('Admin');
 admissionKeys(input,['sessionId','contractId',...(release?['reason']:['shopId','offerId','quantity']),...(action.startsWith('prepare')?[]:['confirmation','requestId',...(release?[]:['present'])])]);
 requireThat(!s.safetyStop?.active&&s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(open(c)&&escortFuelRemaining(c)>0,'SO_ESCORT_FUEL_CLOSED');
 const t=c.terms.escort,ship=await tx.get(`${base(s)}/ships/${t.shipId}`),source=await tx.get(`${base(s)}/accounts/${c.sourceAccountId}`);moneyState(source);requireThat(source.reserved>=escortFuelRemaining(c),'INVALID_ACCOUNT');
 requireThat(!ship?.operation?.escortContractId,'SPACE_SHIP_BUSY');
 if(!admin)requireThat(ship?.ownerId===c.characterId&&ship.pilotId===ctx.c.id&&idle(ship)&&ship.portId===t.fromPort&&!ctx.c.activeNavigationId&&!ctx.c.activeVoyageId&&!ctx.c.activeFieldActionId&&!ctx.c.activePersonActionId&&!ctx.c.activeCargoId&&!ctx.c.activeMaintenanceId&&!ctx.c.activeAidId&&ctx.c.hp>0&&!ctx.c.outOfCombat&&!ctx.c.survival?.dead&&!(ctx.c.convalescentUntilGameMs>gameTime(s.clock,at)),'SO_ESCORT_SHIP');
 let result,next,lot,offer,quantity,reason,guard=[];
 if(release){reason=admissionText(input.reason,2000,true);result={released:escortFuelRemaining(c),reason};next={...c,escortFuel:{...c.escortFuel,remaining:0,released:(c.escortFuel.released??0)+escortFuelRemaining(c),closedAt:at}};}
 else{
  requireThat(ship.portId===s.transportRules?.homePort,'SHIP_NOT_LOCAL');
  offer=await tx.get(`${base(s)}/shops/${documentId(input.shopId)}/offers/${documentId(input.offerId)}`);lot=await tx.get(`${base(s)}/inventory/${shopStockId(input.offerId)}`);quantity=whole(input.quantity,'INVALID_QUANTITY');
  requireThat(offer?.versionId===s.spaceOutlaws.versionId&&offer.item.id===ship.navigation.fuelItemId&&offer.unitPrice===25&&lot?.ownerType==='SHOP'&&lot.ownerId===input.shopId&&lot.location.kind==='SHOP'&&lot.location.id===input.shopId&&lot.item.id===offer.item.id&&lot.status==='AVAILABLE'&&quantity>0&&quantity<=lot.quantity,'INSUFFICIENT_STOCK');
  requireThat(quantity*25<=escortFuelRemaining(c),'SO_ESCORT_FUEL_CLOSED');requireThat(ship.fuel+quantity<=ship.navigation.tankCapacity,'TANK_FULL');
  const seller=await tx.get(`${base(s)}/accounts/${shopAccountId(input.shopId)}`);moneyState(seller);whole(seller.balance+quantity*25,'BALANCE_OVERFLOW');
  result={quantity,cost:quantity*25,shipName:ship.name,durationSeconds:120};guard=[lot.revision,offer.revision,seller.revision];next=c;
 }
 result={...result,confirmation:hash(JSON.stringify([s.revision,c.id,c.revision,ship,ctx.partyGuard??ctx.version,source.revision,guard,result]))};
 if(action.startsWith('prepare'))return {result};requireThat(input.confirmation===result.confirmation,'STALE_REVISION');authorizeSpaceOutlaws(tx,s,'ESCORT');
 if(release)fuelHistory(tx,s,c,id,at,actor.uid,'ESCORT_FUEL_RELEASE',[[source,{...source,reserved:source.reserved-result.released,revision:source.revision+1}]],reason);
 else{
  requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');const lotId=hash(`escort-fuel:${id}`),reserved={...lot,id:lotId,quantity,status:'FIELD_RESERVED',fieldActionId:id,escortContractId:c.id,revision:1},rest={...lot,quantity:lot.quantity-quantity,revision:lot.revision+1};
  tx.set(`${base(s)}/inventory/${lot.id}`,rest);tx.set(`${base(s)}/inventory/${lotId}`,reserved);
  for(const [l,before,after] of [[lot,lot,rest],[reserved,null,reserved]])tx.set(`${base(s)}/inventory/${l.id}/history/${id}`,{id,at,kind:'ESCORT_FUEL_RESERVE',contractId:c.id,actorUid:actor.uid,before,after});
  tx.set(`${base(s)}/ships/${ship.id}`,{...ship,operation:{id,kind:'REFUEL',escortContractId:c.id,pilotId:ctx.c.id,pilotVersion:ctx.version,lotId,sourceLotId:lot.id,shopId:input.shopId,quantity,readyAtGameMs:gameTime(s.clock,at)+120000},revision:ship.revision+1});tx.set(`${base(s)}/characters/${ctx.c.id}`,{...ctx.c,activeNavigationId:id});
 }
 return {result,next};
}
export async function finishEscortRefuel(tx,s,ship,lot,cancel,at,id,actorUid){
 const a=ship.operation,c=await tx.get(`${base(s)}/contracts/${a.escortContractId}`);requireThat(hasSoEscort(s)&&c?.terms.escort?.shipId===ship.id&&lot.escortContractId===c.id&&lot.quantity===a.quantity,'SO_ESCORT_INVALID');
 const original=await tx.get(`${base(s)}/inventory/${a.sourceLotId}`);requireThat(original?.ownerType==='SHOP'&&original.ownerId===a.shopId&&original.status==='AVAILABLE','SO_ESCORT_INVALID');
 const cost=a.quantity*25,source=await tx.get(`${base(s)}/accounts/${c.sourceAccountId}`),seller=await tx.get(`${base(s)}/accounts/${shopAccountId(a.shopId)}`);moneyState(source);moneyState(seller);
 requireThat(cancel||open(c)&&escortFuelRemaining(c)>=cost&&source.reserved>=cost,'SO_ESCORT_FUEL_CLOSED');authorizeSpaceOutlaws(tx,s,'ESCORT');
 const nextLot={...lot,quantity:0,status:'CONSUMED',fieldActionId:null,revision:lot.revision+1};tx.set(`${base(s)}/inventory/${lot.id}`,nextLot);tx.set(`${base(s)}/inventory/${lot.id}/history/${id}`,{id,at,kind:cancel?'ESCORT_FUEL_CANCEL':'ESCORT_FUEL_TRANSFER',contractId:c.id,actorUid,before:lot,after:nextLot});
 if(cancel){const n={...original,quantity:whole(original.quantity+lot.quantity),revision:original.revision+1};tx.set(`${base(s)}/inventory/${original.id}`,n);tx.set(`${base(s)}/inventory/${original.id}/history/${id}`,{id,at,kind:'ESCORT_FUEL_CANCEL',contractId:c.id,actorUid,before:original,after:n});return;}
 const accounts=source.id===seller.id?[[source,{...source,reserved:source.reserved-cost,revision:source.revision+1}]]:[[source,{...source,balance:source.balance-cost,reserved:source.reserved-cost,revision:source.revision+1}],[seller,{...seller,balance:whole(seller.balance+cost),revision:seller.revision+1}]];
 fuelHistory(tx,s,c,id,at,actorUid,'ESCORT_FUEL_TRANSFER',accounts,'Plein effectué en deux minutes ; carburant transféré au réservoir');
 const next={...c,escortFuel:{...c.escortFuel,remaining:c.escortFuel.remaining-cost,spent:c.escortFuel.spent+cost,units:c.escortFuel.units+a.quantity},revision:c.revision+1,updatedAt:at};tx.set(`${base(s)}/contracts/${c.id}`,next);tx.set(`${base(s)}/contracts/${c.id}/history/${id}`,{id,at,action:'ESCORT_FUEL_TRANSFER',actorUid,quantity:a.quantity,amount:cost,publicReason:'Carburant remis au réservoir ; provision financière consommée'});
}
