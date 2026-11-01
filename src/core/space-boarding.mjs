import {boardingCargoProjection} from './space-boarding-cargo.mjs';
import {preparePersonalPayment,settlePersonalPayment} from './economy.mjs';
import {documentId,requireThat} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {moneyText} from './economy-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {boardingEncounterEnabled,hasSoCombat,pauseSpaceJourney,resumeSpaceJourney} from './space-combat-state.mjs';
import {gameTime} from './clock.mjs';

const docking=['combatId','attackerShipId','targetShipId','zone','reason','present','safe'];
const outcome=['combatId','boardingId','outcome','mode','orders','reason','present','safe'];
const ransom=['combatId','boardingId','amount','memo'];
const fields={prepareBoardingRansom:ransom,payBoardingRansom:[...ransom,'confirmation'],spaceBoarding:['combatId'],spaceBoardingAdmin:['combatId'],prepareSpaceDocking:docking,startSpaceDocking:[...docking,'confirmation'],finishSpaceDocking:['combatId','boardingId','confirmation','present','safe'],prepareSpaceBoardingOutcome:outcome,resolveSpaceBoarding:[...outcome,'confirmation'],cancelSpaceBoarding:['combatId','boardingId','confirmation','reason'],releaseSpaceBoarding:['combatId','boardingId','confirmation','reason','present']};
export const spaceBoardingActions=Object.keys(fields);
const reads=new Set(['prepareBoardingRansom','spaceBoarding','spaceBoardingAdmin','prepareSpaceDocking','prepareSpaceBoardingOutcome']);
const fit=(c,time)=>c?.hp>0&&!c.outOfCombat&&!c.survival?.dead&&!c.activeAidId&&!c.activeFieldActionId&&!c.activePersonActionId&&!c.activeNavigationId&&!c.activeMaintenanceId&&!c.activeCargoId&&!(c.convalescentUntilGameMs>time);
const attest=input=>{requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');requireThat(input.safe===true,'BOARDING_SAFETY_REQUIRED');};
const eligibleTarget=(e,x)=>e.fleetBoardingVersion===1?!!(x.hull===0&&e.boardingTargets?.[x.id]?.immobilized||e.boardingTargets?.[x.id]?.surrendered):x.hull===0&&e.lastRound?.after.some(a=>a.id===x.id&&a.hull===0)||(e.lastRound?.surrendered??[]).includes(x.id);
const opponents=(e,a,b)=>a&&b&&a.id!==b.id&&(!e.teams||e.teams[a.id]!==e.teams[b.id]);
const native=(e,x,time,locked=false)=>!!x?.journey&&!(e.boardingDepartedShipIds??[]).includes(x.id)&&x.journey.id===e.journeyIds?.[x.id]&&!x.docked&&(locked?x.combatId===e.id:x.enabled&&!x.operation&&!x.rescueId&&!x.maintenanceId&&!x.combatId&&(x.journey.suspended||time<x.journey.arrivesAtGameMs));
const publicRow=(r,time,confirmation,viewerId)=>({id:r.id,status:r.status,attackerShipId:r.attackerShipId,targetShipId:r.targetShipId,attackerName:r.attackerName,targetName:r.targetName,zone:r.zone,crew:r.crew.map(({id,name,shipId})=>({id,name,shipId})),remainingSeconds:r.status==='DOCKING'?Math.max(0,Math.ceil((r.readyAtGameMs-time)/1000)):null,outcome:r.outcome??null,mode:r.mode??null,orders:r.orders??null,...(r.ransom?{ransomPaid:true}:{}),...(r.ransom&&(confirmation||[r.ransom.source.id,r.ransom.recipient.id].includes(viewerId))?{ransom:r.ransom}:{}),...(confirmation?{confirmation}:{})});

export function createSpaceBoardingService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);const at=now(),id=uuid();
  return store.runTransaction(async tx=>{
   const admin=!['spaceBoarding','prepareBoardingRansom','payBoardingRansom'].includes(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`,time=gameTime(s.clock,at);
   requireThat(hasSoCombat(s)&&s.spaceOutlaws.boardingVersion===1,'SO_GAMEPLAY_NOT_OPEN');
   const ep=`${base}/spaceCombats/${documentId(input.combatId)}`,e=await tx.get(ep);
   requireThat(boardingEncounterEnabled(s,e),'BOARDING_UNAVAILABLE');
   const fleet=[];for(const sid of e.shipIds)fleet.push(await tx.get(`${base}/ships/${sid}`));
   const members=[];for(const member of e.boardingCrew??[])members.push({...member,...await inventoryParty(tx,s.id,member.id)});
   let ships=fleet,parties=members;
   const select=(attackerId,targetId)=>{ships=fleet.filter(x=>x&&(x.id===attackerId||x.id===targetId));parties=members.filter(p=>ships.some(x=>x.id===p.shipId));};
   const originalCrew=()=>parties.length>0&&parties.every(p=>{const ship=ships.find(x=>x?.id===p.shipId);return ship?.journey?.id===e.journeyIds[p.shipId]&&ship.journey.manifest.some(m=>m.id===p.id)&&p.c?.activeVoyageId===ship.journey.id;})&&ships.every(x=>x?.journey&&x.journey.manifest.length===parties.filter(p=>p.shipId===x.id).length);
   const crewReady=()=>originalCrew()&&parties.every(p=>p.active&&p.version===p.originalVersion&&fit(p.c,time));
   const proof=r=>hash(JSON.stringify([s.revision,e,ships,parties,r]));
   const ransomParties=r=>({source:parties.find(p=>p.id===c?.id&&p.shipId===r.targetShipId&&p.originalVersion===version&&p.active),recipient:parties.find(p=>p.shipId===r.attackerShipId&&p.id===ships.find(x=>x.id===r.attackerShipId)?.pilotId&&p.active&&p.version===p.originalVersion)});
   const ransomEnabled=r=>s.spaceOutlaws.boardingRansomVersion===1&&r.ransomVersion===1;
   if(!admin)requireThat(parties.some(p=>p.id===c.id&&p.originalVersion===version),'FORBIDDEN');
   const rows=await tx.list(`${ep}/boardings`);
   if(action==='spaceBoarding'||action==='spaceBoardingAdmin'){
    const choices=[];if(admin&&!e.activeBoardingId)for(const target of fleet)if(target&&eligibleTarget(e,target))for(const attacker of fleet)if(opponents(e,attacker,target)){
     select(attacker.id,target.id);const pilot=parties.find(p=>p.id===attacker.pilotId);if(ships.length===2&&ships.every(x=>native(e,x,time))&&originalCrew()&&attacker.journey.routeId===target.journey.routeId&&attacker.hull>0&&pilot?.active&&pilot.version===pilot.originalVersion&&fit(pilot.c,time))choices.push({attackerShipId:attacker.id,targetShipId:target.id,name:`${attacker.name} → ${target.name}`});
    }
    const boardings=await Promise.all(rows.filter(r=>admin||r.crew.some(p=>p.id===c.id)).map(async r=>{select(r.attackerShipId,r.targetShipId);const row=publicRow(r,time,admin?proof(r):null,c?.id),p=ransomParties(r),canPayRansom=!admin&&ransomEnabled(r)&&r.status==='CONTROLLED'&&!r.ransom&&s.stage==='EN_JEU'&&!s.safetyStop?.active&&originalCrew()&&p.source&&p.recipient&&fit(p.source.c,time)&&!p.recipient.c.survival?.dead;return {...row,...await boardingCargoProjection(tx,s,r,time,admin),...(canPayRansom?{canPayRansom:true,ransomPayee:{name:p.recipient.c.public.displayName}}:{})};}));
    const current=rows.find(r=>r.id===e.activeBoardingId);if(current)select(current.attackerShipId,current.targetShipId);
    return {session:{id:s.id,stage:s.stage},admin,combatId:e.id,fleetEncounter:e.shipIds.length>2,boardings,...(admin?{choices,crewReady:current?crewReady():false}: {})};
   }
   const rp=input.boardingId?`${ep}/boardings/${documentId(input.boardingId)}`:null,r=rp?await tx.get(rp):null;
   select(r?.attackerShipId??input.attackerShipId,r?.targetShipId??input.targetShipId);
   const isRansom=['prepareBoardingRansom','payBoardingRansom'].includes(action);
   if(isRansom){requireThat(r&&ransomEnabled(r),'SO_GAMEPLAY_NOT_OPEN');const p=ransomParties(r);requireThat(p.source&&p.recipient&&!p.source.c.survival?.dead&&!p.recipient.c.survival?.dead,'FORBIDDEN');}
   const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId??'preview')}`)}`,fingerprint=hash(JSON.stringify([action,input]));
   if(!reads.has(action)){const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===version,'FORBIDDEN');return old.result;}}
   requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat((['cancelSpaceBoarding','releaseSpaceBoarding'].includes(action)?['BRIEFING','EN_JEU','PAUSE']:['EN_JEU']).includes(s.stage),'SESSION_NOT_RUNNING');
   const audit=(r,before,reason,paymentResult)=>{authorizeSpaceOutlaws(tx,s,'SPACE_COMBAT');tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,before,after:r,...(reason?{reason}:{})});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});const result=paymentResult??{id:r.id,status:r.status};tx.set(op,{fingerprint,result,guard:version??null,at});return result;};
   const saveShip=x=>{tx.set(`${base}/ships/${x.id}`,x);tx.set(`${base}/voyages/${x.journey.id}`,{...x.journey,shipId:x.id,status:x.journey.suspended?'SUSPENDED':'IN_TRANSIT'});};
   const unlock=()=>{for(const ship of ships)saveShip(resumeSpaceJourney({...ship,combatId:null,revision:ship.revision+1},time));tx.set(ep,{...e,activeBoardingId:null,revision:e.revision+1});};
   if(['prepareSpaceDocking','startSpaceDocking'].includes(action)){
    attest(input);const attacker=ships.find(x=>x?.id===documentId(input.attackerShipId)),target=ships.find(x=>x?.id===documentId(input.targetShipId));
    requireThat(opponents(e,attacker,target)&&ships.length===2&&!e.activeBoardingId&&ships.every(x=>native(e,x,time))&&attacker.journey.routeId===target.journey.routeId,'BOARDING_UNAVAILABLE');
    requireThat(attacker.hull>0&&eligibleTarget(e,target),'BOARDING_UNAVAILABLE');requireThat(originalCrew(),'BOARDING_CREW_CHANGED');
    const pilot=parties.find(p=>p.id===attacker.pilotId);requireThat(pilot?.active&&pilot.version===pilot.originalVersion&&fit(pilot.c,time),'INVALID_RECIPIENT');
    const zone=moneyText(input.zone),reason=moneyText(input.reason),confirmation=hash(JSON.stringify([proof(null),attacker.id,target.id,zone,reason]));
    const crew=parties.map(p=>({id:p.id,name:p.name,shipId:p.shipId,version:p.originalVersion}));
    if(action==='prepareSpaceDocking')return {attackerName:attacker.name,targetName:target.name,zone,durationSeconds:120,crew:crew.map(({version,...p})=>p),confirmation};
    requireThat(input.confirmation===confirmation,'STALE_REVISION');
    const r={id,attackerShipId:attacker.id,targetShipId:target.id,attackerName:attacker.name,targetName:target.name,zone,crew,...(s.spaceOutlaws.boardingFreightVersion===1?{freightVersion:1}:{}),...(s.spaceOutlaws.boardingCargoVersion===1?{cargoVersion:1}:{}),...(s.spaceOutlaws.boardingRansomVersion===1?{ransomVersion:1}:{}),status:'DOCKING',readyAtGameMs:time+120000,revision:1,createdAt:at};
    for(const ship of ships)saveShip({...pauseSpaceJourney(ship,time),combatId:e.id,revision:ship.revision+1});tx.set(ep,{...e,activeBoardingId:id,revision:e.revision+1});tx.set(`${ep}/boardings/${id}`,r);return audit(r,null,reason);
   }
   requireThat(r&&e.activeBoardingId===r.id&&ships.length===2&&ships.every(x=>native(e,x,time,true)),'BOARDING_CLOSED');
   if(isRansom){
    requireThat(r.status==='CONTROLLED','BOARDING_PHASE');requireThat(!r.ransom,'BOARDING_RANSOM_PAID');requireThat(originalCrew(),'BOARDING_CREW_CHANGED');
    const p=ransomParties(r);requireThat(fit(c,time),'OUT_OF_COMBAT');
    const x=await preparePersonalPayment(tx,ctx,{recipientId:p.recipient.id,amount:input.amount,memo:`Rançon négociée · ${r.id} : ${moneyText(input.memo,350)}`}),confirmation=hash(JSON.stringify([proof(r),x.result.confirmation]));
    if(action==='prepareBoardingRansom')return {...x.result,confirmation};
    requireThat(input.confirmation===confirmation,'STALE_REVISION');const payment=settlePersonalPayment(tx,ctx,x,{id,at,actorUid:actor.uid}),next={...r,revision:r.revision+1,ransom:{paymentId:payment.id,amount:payment.amount,currency:payment.currency,source:x.result.source,recipient:payment.recipient,memo:x.result.memo,at}};
    tx.set(rp,next);return audit(next,r,'Paiement personnel librement confirmé ; libération MJ distincte',{id:r.id,status:r.status,paymentId:payment.id,amount:payment.amount,account:payment.account});
   }
   if(['prepareSpaceBoardingOutcome','resolveSpaceBoarding'].includes(action)){
    attest(input);requireThat(r.status==='SCENE','BOARDING_PHASE');requireThat(originalCrew(),'BOARDING_CREW_CHANGED');
    requireThat(['CONTROLLED','NO_CONTROL'].includes(input.outcome)&&['PLAYED','ANNOUNCED'].includes(input.mode),'BOARDING_OUTCOME_REQUIRED');
    if(input.mode==='PLAYED')requireThat(crewReady(),'BOARDING_ORDERS_REQUIRED');
    const orders=input.mode==='ANNOUNCED'?moneyText(input.orders):null;requireThat(input.mode==='ANNOUNCED'||input.orders===''||input.orders===undefined,'BOARDING_OUTCOME_REQUIRED');
    const reason=moneyText(input.reason),confirmation=hash(JSON.stringify([proof(r),input.outcome,input.mode,orders,reason]));
    if(action==='prepareSpaceBoardingOutcome')return {...publicRow(r,time),outcome:input.outcome,mode:input.mode,orders,confirmation};
    requireThat(input.confirmation===confirmation,'STALE_REVISION');const next={...r,status:input.outcome==='CONTROLLED'?'CONTROLLED':'RESOLVED',outcome:input.outcome,mode:input.mode,orders,resolvedAt:at,revision:r.revision+1};
    if(next.status==='RESOLVED')unlock();tx.set(rp,next);return audit(next,r,reason);
   }
   requireThat(input.confirmation===proof(r),'STALE_REVISION');let status;
   if(action==='finishSpaceDocking'){attest(input);requireThat(r.status==='DOCKING','BOARDING_PHASE');requireThat(time>=r.readyAtGameMs,'BOARDING_NOT_READY');requireThat(originalCrew(),'BOARDING_CREW_CHANGED');status='SCENE';}
   else if(action==='cancelSpaceBoarding'){requireThat(['DOCKING','SCENE'].includes(r.status),'BOARDING_PHASE');status='CANCELLED';}
   else {requireThat(action==='releaseSpaceBoarding'&&r.status==='CONTROLLED','BOARDING_PHASE');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');requireThat(!(await tx.list(`${base}/cargoTransfers`,['boardingId',r.id])).some(t=>t.status==='LOADING'),'CARGO_TRANSFERS_OPEN');status='RELEASED';}
   const reason=action==='finishSpaceDocking'?null:moneyText(input.reason),next={...r,status,revision:r.revision+1,...(status==='SCENE'?{sceneAt:at}:{closedAt:at})};
   if(status!=='SCENE')unlock();tx.set(rp,next);return audit(next,r,reason);
  });
 };
}
