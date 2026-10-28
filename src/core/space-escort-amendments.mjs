import {requireThat,documentId,whole} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryParty} from './inventory-transfers.mjs';
import {soRoute} from './space-outlaws-navigation-state.mjs';
import {transportLots,transportProgress} from './space-transport.mjs';
import {escortEvidence} from './space-escort.mjs';
import {moneyState,writeLedger} from './economy-state.mjs';
import {accountEntry} from './collective-accounts.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {canGameAction} from './health-state.mjs';

export const hasEscortAmendments=s=>s.spaceOutlaws?.escortAmendmentVersion===1;
export const amendmentActions=[
 'prepareEscortAmendmentAdmin','proposeEscortAmendmentAdmin',
 'prepareEscortAmendmentResponse','respondEscortAmendment',
 'prepareTransportAmendmentResponse','respondTransportAmendment',
 'prepareEscortAmendmentCancelAdmin','cancelEscortAmendmentAdmin',
];
export const amendmentAdminActions=amendmentActions.filter(a=>a.endsWith('Admin'));
const base=s=>`sessions/${s.id}`;
const digest=x=>hash(JSON.stringify(x));
const idle=x=>x?.soProfile&&x.enabled&&x.docked&&!x.journey&&!x.operation&&!x.combatId&&!x.rescueId&&!x.maintenanceId&&!x.convoyOffer&&x.hull>0&&!x.revisionRequired;
const publicRoute=r=>({id:r.id,name:r.name,fromPort:r.fromPort,toPort:r.toPort});

async function pair(tx,s,c){
 const escort=c.terms.escort?c:c.escortAmendmentContractId?await tx.get(`${base(s)}/contracts/${c.escortAmendmentContractId}`):null;
 requireThat(escort?.terms.escort,'SO_AMENDMENT_UNAVAILABLE');
 const freight=c.terms.transport?c:await tx.get(`${base(s)}/contracts/${escort.terms.escort.transportContractId}`);
 requireThat(freight?.terms.transport&&escort.terms.escort.transportContractId===freight.id&&freight.sourceAccountId===escort.sourceAccountId,'SO_AMENDMENT_UNAVAILABLE');
 return {escort,freight};
}

async function context(tx,s,escort,freight){
 requireThat(escort.status==='ACTIVE'&&freight.status==='ACTIVE'&&!escort.escortSeparation,'SO_AMENDMENT_UNAVAILABLE');
 const t=escort.terms.escort,cargo=await tx.get(`${base(s)}/ships/${t.cargoShipId}`),ship=await tx.get(`${base(s)}/ships/${t.shipId}`);
 requireThat(idle(cargo)&&idle(ship)&&cargo.portId===ship.portId,'SO_AMENDMENT_PORT');
 requireThat(!cargo.convoy&&!ship.convoy||cargo.convoy?.id===ship.convoy?.id&&cargo.convoy?.leaderShipId===cargo.id&&cargo.convoy.shipIds.length===2&&cargo.convoy.shipIds.includes(ship.id),'SO_AMENDMENT_PORT');
 const leader=await inventoryParty(tx,s.id,freight.characterId),pilot=await inventoryParty(tx,s.id,escort.characterId);
 requireThat(leader.active&&pilot.active&&leader.version===freight.applicantVersion&&pilot.version===escort.applicantVersion&&cargo.pilotId===leader.c.id&&ship.pilotId===pilot.c.id,'FORBIDDEN');
 requireThat(canGameAction(s,leader.c,'publish')&&canGameAction(s,pilot.c,'publish'),'OUT_OF_COMBAT');
 const lots=await transportLots(tx,s,freight),progress=transportProgress(freight,lots);
 requireThat(lots.reduce((n,l)=>n+l.quantity,0)===freight.terms.transport.quantity&&lots.every(l=>l.status==='AVAILABLE'&&!l.transportDelivered&&(progress.index===0?l.location.kind==='SHOP'||l.location.kind==='HOLD'&&l.location.id===cargo.id:l.location.kind==='HOLD'&&l.location.id===cargo.id))&&progress.unanimous,'SO_AMENDMENT_CARGO');
 requireThat(!(await tx.list(`${base(s)}/cargoTransfers`)).some(x=>x.transportContractId===freight.id&&x.status==='LOADING'),'CARGO_TRANSFERS_OPEN');
 const plan=freight.transportPlan?.routes??[publicRoute(await tx.get(`${base(s)}/routes/${freight.terms.transport.routeId}`))];
 requireThat(progress.index<=plan.length&&cargo.portId===(progress.index?plan[progress.index-1].toPort:freight.terms.transport.fromPort),'SO_AMENDMENT_PORT');
 const guard=digest([cargo,ship,leader.version,pilot.version,escort.termsHash,escort.escortFuel,freight.termsHash,freight.transportPlan??null,lots.map(l=>[l.id,l.revision,l.quantity]).sort()]);
 return {cargo,ship,leader,pilot,lots,progress,plan,guard};
}

async function proposal(tx,s,e,f,x,input){
 requireThat(Array.isArray(input.routeIds)&&input.routeIds.length>=1&&input.routeIds.length<=8&&new Set(input.routeIds).size===input.routeIds.length,'SO_AMENDMENT_ROUTE');
 const routes=[];let from=x.cargo.portId;
 for(const value of input.routeIds){
  const r=await tx.get(`${base(s)}/routes/${documentId(value)}`);
  requireThat(r?.versionId===s.spaceOutlaws.versionId&&r.fromPort===from,'SO_AMENDMENT_ROUTE');soRoute(r,x.cargo);soRoute(r,x.ship);routes.push(r);from=r.toPort;
 }
 requireThat(from===f.terms.transport.toPort,'SO_AMENDMENT_ROUTE');
 const totalRoutes=[...x.plan.slice(0,x.progress.index),...routes.map(publicRoute)],extraLegs=totalRoutes.length-1;
 requireThat(extraLegs>(e.escortExtraLegs??0)&&extraLegs<=8,'SO_AMENDMENT_ROUTE');
 requireThat(typeof input.overCapApproved==='boolean','SO_AMENDMENT_CAP');
 const approvalReason=admissionText(input.approvalReason??'',2000,extraLegs>2);
 requireThat(extraLegs<=2||input.overCapApproved&&approvalReason,'SO_AMENDMENT_CAP');
 const originalSalary=e.escortOriginalSalary??e.terms.amount,newSalary=whole(originalSalary+Math.round(originalSalary*extraLegs/4)),addedSalary=newSalary-e.terms.amount;
 let oldUnits=0;for(const r of x.plan.slice(x.progress.index)){const live=await tx.get(`${base(s)}/routes/${r.id}`);oldUnits+=soRoute(live,x.ship).fuelCost;}
 const addedFuelUnits=Math.max(0,routes.reduce((n,r)=>n+soRoute(r,x.ship).fuelCost,0)-oldUnits),addedFuelBudget=whole(addedFuelUnits*25);
 return {routeIds:routes.map(r=>r.id),routes:routes.map(publicRoute),totalRoutes,startIndex:x.progress.index,extraLegs,originalSalary,newSalary,addedSalary,addedFuelUnits,addedFuelBudget,reason:admissionText(input.reason,2000,true),overCapApproved:input.overCapApproved,approvalReason,
   routeGuard:digest(routes),contextGuard:x.guard,accepted:{cargo:false,escort:false}};
}

function routeResult(a,escortParty){
 return {id:a.id,status:a.status,routes:a.routes,extraLegs:a.extraLegs,reason:a.reason,accepted:a.accepted,
  ...(escortParty?{originalSalary:a.originalSalary,newSalary:a.newSalary,addedSalary:a.addedSalary,addedFuelUnits:a.addedFuelUnits,addedFuelBudget:a.addedFuelBudget,overCapApproved:a.overCapApproved,approvalReason:a.approvalReason}:{})};
}

export async function amendmentView(tx,s,c,admin){
 if(!hasEscortAmendments(s)||(!c.terms.escort&&!c.escortAmendmentContractId))return null;
 const {escort:e,freight:f}=await pair(tx,s,c),ownEscort=!!c.terms.escort,a=e.escortAmendment;
 let available=false,stale=false;try{const x=await context(tx,s,e,f);available=true;stale=a?.status==='PROPOSED'&&x.guard!==a.contextGuard;}catch(err){if(!err.code)throw err;}
 const next=ownEscort?e.escortRoutePlan:f.transportPlan;
 return {escortParty:ownEscort,proposal:a?routeResult(a,ownEscort||admin):null,separation:ownEscort?e.escortSeparation??null:null,
  plan:next?.routes??null,canPropose:admin&&ownEscort&&available&&a?.status!=='PROPOSED',canCancel:admin&&ownEscort&&a?.status==='PROPOSED',
  stale,canRespond:!admin&&available&&!stale&&a?.status==='PROPOSED'&&!a.accepted[ownEscort?'escort':'cargo'],
  ...(admin&&ownEscort?{routes:(await tx.list(`${base(s)}/routes`)).filter(r=>r.versionId===s.spaceOutlaws.versionId).map(publicRoute)}:{})};
}

export async function amendmentCommand(tx,s,c,ctx,input,at,id,actor,action){
 requireThat(hasEscortAmendments(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(s.stage==='EN_JEU'&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');
 const prepare=action.startsWith('prepare'),cancel=action.includes('Cancel')||action.startsWith('cancel'),response=action.includes('Response')||action.startsWith('respond');
 admissionKeys(input,['sessionId','contractId',...(response?['decision','reason']:cancel?['reason']:['routeIds','overCapApproved','approvalReason','reason']),...(prepare?[]:['confirmation','requestId'])]);
 const {escort:e,freight:f}=await pair(tx,s,c),ownEscort=!!c.terms.escort;
 requireThat(action.includes('Transport')?!ownEscort:ownEscort,'FORBIDDEN');
 let x,a,result,source;
 if(cancel){
  requireThat(e.escortAmendment?.status==='PROPOSED','SO_AMENDMENT_UNAVAILABLE');a=e.escortAmendment;
  result={...routeResult(a,true),reason:admissionText(input.reason,2000,true)};
 }else{
  x=await context(tx,s,e,f);
  if(response){
   a=e.escortAmendment;requireThat(a?.status==='PROPOSED'&&x.guard===a.contextGuard,'SO_AMENDMENT_STALE');
   const routes=[];for(const rid of a.routeIds)routes.push(await tx.get(`${base(s)}/routes/${rid}`));requireThat(digest(routes)===a.routeGuard,'SO_AMENDMENT_STALE');
   requireThat(['ACCEPT','REFUSE'].includes(input.decision)&&!a.accepted[ownEscort?'escort':'cargo'],'SO_AMENDMENT_UNAVAILABLE');
   result={...routeResult(a,ownEscort),decision:input.decision,reason:admissionText(input.reason,2000,true)};
   if(ownEscort&&input.decision==='REFUSE'){
    const evidence=await escortEvidence(tx,s,e);result.safeSeparation=!!(evidence.departed&&evidence.freightEmbarked);
    if(result.safeSeparation)result.refusalAward=Math.round(a.originalSalary/2);
   }
  }else{
   requireThat(e.escortAmendment?.status!=='PROPOSED','SO_AMENDMENT_UNAVAILABLE');a=await proposal(tx,s,e,f,x,input);result={...routeResult(a,true)};
  }
  source=await tx.get(`${base(s)}/accounts/${e.sourceAccountId}`);moneyState(source);
  if(!response||input.decision==='ACCEPT')requireThat(moneyState(source).available>=a.addedSalary+a.addedFuelBudget,'INSUFFICIENT_FUNDS');
 }
 result.confirmation=digest([s.revision,c.id,e.revision,f.revision,ctx.partyGuard??ctx.version,a,source?.revision??null,result]);
 if(prepare)return {result};requireThat(input.confirmation===result.confirmation,'STALE_REVISION');authorizeSpaceOutlaws(tx,s,'ESCORT_AMENDMENT');
 let escortNext=e,freightNext=f;
 if(cancel)escortNext={...e,escortAmendment:{...a,status:'CANCELLED',closedAt:at}};
 else if(!response){escortNext={...e,escortAmendment:{...a,id,status:'PROPOSED',proposedAt:at}};freightNext={...f,escortAmendmentContractId:e.id};}
 else if(input.decision==='REFUSE'){
  escortNext={...e,escortAmendment:{...a,status:'REFUSED',refusedBy:ownEscort?'escort':'cargo',closedAt:at}};
  if(result.safeSeparation){
   escortNext.escortSeparation={amendmentId:a.id,at,portId:x.ship.portId,originalSalary:a.originalSalary,award:result.refusalAward,reason:result.reason};
   if(x.ship.convoy)for(const ship of [x.cargo,x.ship])tx.set(`${base(s)}/ships/${ship.id}`,{...ship,convoy:null,revision:ship.revision+1});
  }
 }else{
  const accepted={...a.accepted,[ownEscort?'escort':'cargo']:true};escortNext={...e,escortAmendment:{...a,accepted}};
  if(accepted.cargo&&accepted.escort){
   const nextSource={...source,reserved:whole(source.reserved+a.addedSalary+a.addedFuelBudget),revision:source.revision+1};moneyState(nextSource);tx.set(`${base(s)}/accounts/${source.id}`,nextSource);
   writeLedger(tx,s.id,{id,at,actorUid:actor.uid,kind:'ESCORT_AMENDMENT_RESERVE',memo:'Avenant de détour accepté',reason:a.reason,contractId:e.id,createdCurrency:0,removedCurrency:0,entries:[accountEntry(source,0,nextSource)]});
   const terms={...e.terms,amount:a.newSalary},plan={amendmentId:a.id,routes:a.totalRoutes};
   escortNext={...escortNext,terms,termsHash:digest(terms),acceptedTermsHash:digest(terms),escortOriginalSalary:a.originalSalary,escortExtraLegs:a.extraLegs,escortRoutePlan:plan,escortAmendment:{...a,accepted,status:'ACCEPTED',closedAt:at},escortFuel:{...e.escortFuel,budget:whole(e.escortFuel.budget+a.addedFuelBudget),remaining:whole(e.escortFuel.remaining+a.addedFuelBudget),...(a.addedFuelBudget?{closedAt:null}:{})}};
   freightNext={...f,transportPlan:plan};
   if(x.cargo.convoy){const r=await tx.get(`${base(s)}/routes/${a.routeIds[0]}`),g={...x.cargo.convoy,routeId:r.id,routeName:r.name,fromPort:r.fromPort,toPort:r.toPort,navigationCode:r.navigationCode};for(const ship of [x.cargo,x.ship])tx.set(`${base(s)}/ships/${ship.id}`,{...ship,convoy:g,revision:ship.revision+1});}
  }
 }
 const other=ownEscort?freightNext:escortNext,prior=ownEscort?f:e;
 if(other!==prior){tx.set(`${base(s)}/contracts/${other.id}`,{...other,revision:prior.revision+1,updatedAt:at});tx.set(`${base(s)}/contracts/${other.id}/history/${id}`,{id,at,action,actorUid:actor.uid,publicReason:result.reason});}
 return {next:ownEscort?escortNext:freightNext,result,event:{publicReason:result.reason,...(ownEscort?{amendment:routeResult(escortNext.escortAmendment,true)}:{})}};
}
