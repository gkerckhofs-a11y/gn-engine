import {documentId,requireThat,whole} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';
import {inventoryHash as hash,lotState} from './inventory-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {accountId,moneyState,moneyText,writeLedger} from './economy-state.mjs';
import {accountEntry,accountParty} from './collective-accounts.mjs';
import {shopStockId,shopAccountId} from './space-outlaws-shop-state.mjs';
import {navigationSkill} from './space-outlaws-navigation-state.mjs';
import {resumeSpaceJourney} from './space-combat-state.mjs';
import {actionPointPath,actionPointState,reserveActionPoints,resolveActionPoints,releaseActionPoints,actionPointMaximum} from './action-point-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {gameTime} from './clock.mjs';

const offerFields=['shipId','payerId','technicianId','shopId','offerId','kind','points','source','reason','present'];
const fields={spaceMaintenance:[],spaceMaintenanceAdmin:[],prepareSpaceMaintenanceOffer:offerFields,offerSpaceMaintenance:[...offerFields,'confirmation'],prepareSpaceMaintenance:['maintenanceId'],acceptSpaceMaintenance:['maintenanceId','confirmation','present'],startSpaceMaintenance:['maintenanceId','confirmation','present'],finishSpaceMaintenancePoint:['maintenanceId','confirmation','performed'],cancelSpaceMaintenance:['maintenanceId','confirmation','reason'],cancelSpaceMaintenanceAdmin:['maintenanceId','confirmation','reason']};
export const spaceMaintenanceActions=Object.keys(fields);
export const hasSoLogistics=s=>s.spaceOutlaws?.logisticsVersion===1&&s.spaceOutlaws?.navigationVersion===1;
const reads=new Set(['spaceMaintenance','spaceMaintenanceAdmin','prepareSpaceMaintenanceOffer','prepareSpaceMaintenance']);
const admins=new Set(['spaceMaintenanceAdmin','prepareSpaceMaintenanceOffer','offerSpaceMaintenance','cancelSpaceMaintenanceAdmin']);
const open=r=>['OFFERED','AWAITING_TECH','ACTIVE'].includes(r.status);
const fit=(c,time,id=null)=>c?.hp>0&&!c.outOfCombat&&!c.survival?.dead&&!c.activeNavigationId&&!c.activeCargoId&&!c.activeAidId&&!c.activeFieldActionId&&!c.activePersonActionId&&(!c.activeMaintenanceId||c.activeMaintenanceId===id)&&!(c.convalescentUntilGameMs>time);
const accessible=(s,ship,c)=>ship.journey?ship.journey.suspended&&c.activeVoyageId===ship.journey.id&&ship.journey.manifest.some(m=>m.id===c.id):ship.docked&&!c.activeVoyageId&&(c.spacePortId??s.transportRules?.homePort)===ship.portId;
const eligible=(ship,id=null)=>ship?.soProfile&&!ship.operation&&!ship.combatId&&!ship.rescueId&&(!ship.maintenanceId||ship.maintenanceId===id)&&(ship.docked&&!ship.journey||ship.journey?.suspended);
export function maintenancePlan(ship,kind,points){
 requireThat(['REVISION','HULL','SHIELD'].includes(kind),'INVALID_MAINTENANCE');whole(points,'INVALID_MAINTENANCE');
 const missing=kind==='REVISION'?(ship.revisionRequired?1:0):Math.max(0,ship.soProfile[kind==='HULL'?'hullMax':'shieldMax']-ship[kind==='HULL'?'hull':'shield']);
 requireThat(points>0&&points<=missing,'MAINTENANCE_NOT_NEEDED');
 return {kind,points,unitCost:ship.soProfile.referencePrice*({REVISION:0.01,HULL:0.05,SHIELD:0.005}[kind]),secondsPerPoint:kind==='SHIELD'?120:300};
}
const view=(r,time,confirmation,cid)=>({id:r.id,shipId:r.shipId,shipName:r.shipName,kind:r.kind,points:r.points,completed:r.completed,unitCost:r.unitCost,fee:r.fee,amount:r.amount,remainingAmount:r.remainingAmount,status:r.status,provider:r.provider,technicianName:r.technicianName,secondsPerPoint:r.secondsPerPoint,remainingSeconds:r.status==='ACTIVE'?Math.max(0,Math.ceil((r.readyAtGameMs-time)/1000)):null,payer:cid===r.payerId,technician:cid===r.technicianId,pnj:!r.technicianId,confirmation});
export function createSpaceMaintenanceService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);const at=now(),id=uuid();
  return store.runTransaction(async tx=>{
   const admin=admins.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`,time=gameTime(s.clock,at);requireThat(hasSoLogistics(s),'SO_GAMEPLAY_NOT_OPEN');
   const proof=r=>hash(JSON.stringify([s.id,s.revision,r,version??null]));
   if(action==='spaceMaintenance'||action==='spaceMaintenanceAdmin'){
    const jobs=(await tx.list(`${base}/shipMaintenance`)).filter(r=>admin||[r.ownerId,r.payerId,r.technicianId].includes(c.id)).map(r=>view(r,time,proof(r),c?.id));
    if(!admin)return {session:{id:s.id,stage:s.stage},admin:false,jobs};
    const supplies=[];for(const shop of await tx.list(`${base}/shops`))for(const o of await tx.list(`${base}/shops/${shop.id}/offers`)){if(o.item.consumable&&o.item.kind==='STACKABLE'&&!o.item.laserRecharge&&o.unitPrice>0){const l=await tx.get(`${base}/inventory/${shopStockId(o.id)}`);supplies.push({shopId:shop.id,offerId:o.id,name:`${shop.name} · ${o.name}`,itemId:o.item.id,unitPrice:o.unitPrice,stock:l?.status==='AVAILABLE'?l.quantity:0});}}
    const fleet=await tx.list(`${base}/ships`),characters=(await tx.list(`${base}/characters`)).filter(x=>x.birth);
    return {session:{id:s.id,stage:s.stage},admin:true,jobs,supplies:supplies.filter(o=>!fleet.some(x=>x.navigation?.fuelItemId===o.itemId)),ships:fleet.filter(x=>eligible(x)).map(x=>({id:x.id,name:x.name,ownerId:x.ownerId,pilotId:x.pilotId,hull:x.hull,shield:x.shield,revisionRequired:x.revisionRequired,profile:x.soProfile})),characters:characters.map(x=>({id:x.id,name:x.public.displayName,mecLevel:navigationSkill(x,'MEC-02')}))};
   }
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input]));
   if(op){const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===version,'FORBIDDEN');return old.result;}}
   requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');const cancel=action.startsWith('cancel');requireThat(s.stage==='EN_JEU'||cancel&&s.stage==='PAUSE','SESSION_NOT_RUNNING');
   const audit=(result,before,after,extra={})=>{authorizeSpaceOutlaws(tx,s,'MAINTENANCE');tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,before,after,...extra});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});tx.set(op,{fingerprint,guard:version??null,result,at});return result;};
   if(['prepareSpaceMaintenanceOffer','offerSpaceMaintenance'].includes(action)){
    requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');const ship=await tx.get(`${base}/ships/${documentId(input.shipId)}`);requireThat(eligible(ship),'SPACE_SHIP_BUSY');const plan=maintenancePlan(ship,input.kind,input.points),payer=await inventoryParty(tx,s.id,documentId(input.payerId));requireThat(payer.active&&[ship.ownerId,ship.pilotId].includes(payer.c.id),'FORBIDDEN');
    const technician=input.technicianId?await inventoryParty(tx,s.id,documentId(input.technicianId)):null;
    if(technician)requireThat(technician.active&&navigationSkill(technician.c,'MEC-02')>=2&&fit(technician.c,time)&&accessible(s,ship,technician.c),'MAINTENANCE_TECH_REQUIRED');
    requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(l=>l.kind==='HOLD'&&l.id===ship.id)),'CARGO_TRANSFERS_OPEN');
    const shop=await tx.get(`${base}/shops/${documentId(input.shopId)}`),offer=await tx.get(`${base}/shops/${documentId(input.shopId)}/offers/${documentId(input.offerId)}`);
    requireThat(shop?.versionId===s.versionId&&offer?.versionId===s.versionId&&offer.item.consumable&&offer.item.kind==='STACKABLE'&&!offer.item.laserRecharge&&offer.item.id!==ship.navigation.fuelItemId&&offer.unitPrice>0&&plan.unitCost%offer.unitPrice===0,'MAINTENANCE_SUPPLY_REQUIRED');
    const source=moneyText(input.source),reason=moneyText(input.reason),fee=technician?0:ship.soProfile.referencePrice*0.005,amount=whole(plan.unitCost*plan.points+fee,'INVALID_AMOUNT'),unitsPerPoint=plan.unitCost/offer.unitPrice;
    const data={shipId:ship.id,shipName:ship.name,ownerId:ship.ownerId,payerId:payer.c.id,payerVersion:payer.version,technicianId:technician?.c.id??null,technicianVersion:technician?.version??null,technicianName:technician?.c.public.displayName??'Prestataire PNJ',shopId:shop.id,offerId:offer.id,provider:shop.name,supplyItemId:offer.item.id,unitsPerPoint,...plan,fee,amount,remainingAmount:amount,source,reason,journeyId:ship.journey?.id??null,portId:ship.portId};
    const confirmation=hash(JSON.stringify([s.revision,ship,data]));if(action==='prepareSpaceMaintenanceOffer')return {...data,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(!(await tx.list(`${base}/shipMaintenance`)).some(r=>r.shipId===ship.id&&open(r)),'SPACE_SHIP_BUSY');
    const record={id,...data,status:'OFFERED',completed:0,revision:1,createdAt:at};tx.set(`${base}/shipMaintenance/${id}`,record);return audit({id,status:record.status},null,record);
   }
   const r=await tx.get(`${base}/shipMaintenance/${documentId(input.maintenanceId)}`);requireThat(r&&(admin||[r.payerId,r.technicianId].includes(c.id)),'FORBIDDEN');requireThat(open(r),'MAINTENANCE_CLOSED');
   const ship=await tx.get(`${base}/ships/${r.shipId}`),payer=await inventoryParty(tx,s.id,r.payerId),tech=r.technicianId?await inventoryParty(tx,s.id,r.technicianId):null;
   const lot=await tx.get(`${base}/inventory/${shopStockId(r.offerId)}`),a=await tx.get(`${base}/accounts/${accountId(r.payerId)}`),b=await tx.get(`${base}/accounts/${shopAccountId(r.shopId)}`);
   if(!cancel){requireThat(payer.active&&payer.version===r.payerVersion&&ship.ownerId===r.ownerId,'INVALID_RECIPIENT');requireThat(eligible(ship,r.id)&&ship.journey?.id===(r.journeyId??undefined)&&ship.portId===r.portId,'SPACE_SHIP_BUSY');maintenancePlan(ship,r.kind,r.points-r.completed);}
   if(['prepareSpaceMaintenance','acceptSpaceMaintenance'].includes(action)){
    requireThat(c.id===r.payerId&&r.status==='OFFERED'&&!ship.maintenanceId,'FORBIDDEN');requireThat(c.hp>0&&!c.outOfCombat,'OUT_OF_COMBAT');requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(l=>l.kind==='HOLD'&&l.id===ship.id)),'CARGO_TRANSFERS_OPEN');if(tech)requireThat(tech.active&&tech.version===r.technicianVersion&&fit(tech.c,time)&&accessible(s,ship,tech.c)&&navigationSkill(tech.c,'MEC-02')>=2,'MAINTENANCE_TECH_REQUIRED');
    requireThat(lot?.ownerType==='SHOP'&&lot.ownerId===r.shopId&&lot.location.kind==='SHOP'&&lot.item.id===r.supplyItemId&&lot.status==='AVAILABLE'&&lot.quantity>=r.unitsPerPoint*r.points,'INSUFFICIENT_STOCK');requireThat(lot.transferable!==false||ship.ownerId===c.id,'SO_PROTECTED_PURCHASE');
    requireThat(a?.characterId===c.id&&b?.ownerType==='SHOP'&&b.shopId===r.shopId,'ACCOUNT_UNAVAILABLE');const before=moneyState(a);moneyState(b);requireThat(before.available>=r.amount,'INSUFFICIENT_FUNDS');whole(b.balance+r.amount,'BALANCE_OVERFLOW');
    const confirmation=hash(JSON.stringify([proof(r),ship,lot,a,b])),result={...view(r,time,confirmation,c.id),before,after:{available:before.available-r.amount},units:r.unitsPerPoint*r.points};if(action==='prepareSpaceMaintenance')return result;
    requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
    const next={...r,status:tech?'AWAITING_TECH':'ACTIVE',readyAtGameMs:tech?null:time+r.secondsPerPoint*1000,revision:r.revision+1};tx.set(`${base}/shipMaintenance/${r.id}`,next);tx.set(`${base}/ships/${ship.id}`,{...ship,maintenanceId:r.id,revision:ship.revision+1});tx.set(`${base}/accounts/${a.id}`,{...a,reserved:a.reserved+r.amount,revision:a.revision+1});tx.set(`${base}/inventory/${lot.id}`,{...lot,status:'FIELD_RESERVED',fieldActionId:r.id,revision:lot.revision+1});return audit({id:r.id,status:next.status},r,next);
   }
   requireThat(input.confirmation===proof(r),'STALE_REVISION');
   let points=tech?actionPointState(s,tech.c,await tx.get(actionPointPath(s.id,tech.c.id)),at):null;
   if(action==='startSpaceMaintenance'){
    requireThat(r.status==='AWAITING_TECH'&&c.id===r.technicianId&&tech.active&&tech.version===r.technicianVersion,'FORBIDDEN');requireThat(navigationSkill(c,'MEC-02')>=2&&fit(c,time)&&accessible(s,ship,c),'MAINTENANCE_TECH_REQUIRED');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
    const next={...r,status:'ACTIVE',readyAtGameMs:time+r.secondsPerPoint*1000,revision:r.revision+1};tx.set(actionPointPath(s.id,c.id),reserveActionPoints(points,1));tx.set(`${base}/characters/${c.id}`,{...c,activeMaintenanceId:r.id});tx.set(`${base}/shipMaintenance/${r.id}`,next);return audit({id:r.id,status:next.status},r,next);
   }
   if(r.status==='OFFERED'){requireThat(cancel,'MAINTENANCE_CLOSED');const next={...r,status:'CANCELLED',revision:r.revision+1,closedAt:at};tx.set(`${base}/shipMaintenance/${r.id}`,next);return audit({id:r.id,status:next.status},r,next,{reason:moneyText(input.reason)});}
   requireThat(ship.maintenanceId===r.id&&lot?.status==='FIELD_RESERVED'&&lot.fieldActionId===r.id,'MAINTENANCE_CLOSED');moneyState(a);requireThat(a.reserved>=r.remainingAmount,'INSUFFICIENT_FUNDS');
   if(!cancel){requireThat(action==='finishSpaceMaintenancePoint'&&r.status==='ACTIVE','MAINTENANCE_CLOSED');requireThat(c.id===(tech?r.technicianId:r.payerId),'FORBIDDEN');requireThat(input.performed===true,'FIELD_PRESENCE_REQUIRED');requireThat(time>=r.readyAtGameMs,'MAINTENANCE_NOT_READY');if(tech)requireThat(tech.active&&tech.version===r.technicianVersion&&fit(c,time,r.id)&&accessible(s,ship,c)&&navigationSkill(c,'MEC-02')>=2,'MAINTENANCE_TECH_REQUIRED');moneyState(b);}
   const cost=cancel?0:r.unitCost+(r.completed===0?r.fee:0),completed=r.completed+(cancel?0:1),closed=cancel||completed===r.points;whole(b.balance+cost,'BALANCE_OVERFLOW');
   const nextLot={...lot,quantity:lot.quantity-(cancel?0:r.unitsPerPoint),status:closed?'AVAILABLE':'FIELD_RESERVED',fieldActionId:closed?null:r.id,revision:lot.revision+1};requireThat(nextLot.quantity>=0,'INSUFFICIENT_STOCK');
   const an={...a,balance:a.balance-cost,reserved:a.reserved-(cancel?r.remainingAmount:cost),revision:a.revision+1};
   let nextShip={...ship,maintenanceId:closed?null:r.id,revision:ship.revision+1};if(!cancel){if(r.kind==='REVISION')nextShip.revisionRequired=false;else nextShip[r.kind==='HULL'?'hull':'shield']++;}
   if(nextShip.journey)nextShip=resumeSpaceJourney(nextShip,time);
   if(tech&&r.status==='ACTIVE'){if(!cancel&&r.completed===0)tx.set(actionPointPath(s.id,tech.c.id),resolveActionPoints(points,1));if(cancel&&r.completed===0)tx.set(actionPointPath(s.id,tech.c.id),releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,tech.c)));if(closed)tx.set(`${base}/characters/${tech.c.id}`,{...tech.c,activeMaintenanceId:null});}
   if(cost){const bn={...b,balance:b.balance+cost,revision:b.revision+1};tx.set(`${base}/accounts/${b.id}`,bn);writeLedger(tx,s.id,{id,kind:'SHIP_MAINTENANCE',at,actorUid:actor.uid,memo:`${r.kind} · ${ship.name} · point ${completed}/${r.points}`,source:accountParty({a,name:payer.c.public.displayName}),recipient:accountParty({a:b,name:r.provider}),createdCurrency:0,removedCurrency:0,entries:[accountEntry(a,-cost,an),accountEntry(b,cost,bn)]});}
   tx.set(`${base}/accounts/${a.id}`,an);tx.set(`${base}/inventory/${lot.id}`,nextLot);tx.set(`${base}/inventory/${lot.id}/history/${id}`,{id,kind:action,at,before:lotState(lot),after:lotState(nextLot)});tx.set(`${base}/ships/${ship.id}`,nextShip);if(nextShip.journey)tx.set(`${base}/voyages/${nextShip.journey.id}`,{...nextShip.journey,shipId:ship.id,status:nextShip.journey.suspended?'SUSPENDED':'IN_TRANSIT'});
   const next={...r,completed,remainingAmount:cancel?0:r.remainingAmount-cost,status:cancel?'CANCELLED':closed?'COMPLETED':'ACTIVE',readyAtGameMs:closed?null:time+r.secondsPerPoint*1000,revision:r.revision+1,...(closed?{closedAt:at}:{})};tx.set(`${base}/shipMaintenance/${r.id}`,next);return audit({id:r.id,status:next.status,completed},r,next,cancel?{reason:moneyText(input.reason)}:{});
  });
 };
}
