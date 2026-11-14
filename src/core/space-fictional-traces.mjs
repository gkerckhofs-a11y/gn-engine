import {groupVisible,memberFor} from './groups.mjs';
import {requireGameAction} from './health-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {createHash} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
import {gameTime} from './clock.mjs';
import {abilityLevel} from './abilities.mjs';
import {activeCharacter} from './aid-state.mjs';
import {activeTraceMask} from './fictional-trace-state.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const base=s=>`sessions/${s.id}`;
const path=(s,collection,id)=>`${base(s)}/${collection}/${documentId(id)}`;
const enabled=s=>requireThat(s.spaceOutlaws?.fictionalTracesVersion===1,'SO_TRACE_CLOSED');
// Fictional, opt-in events. Technical audit records are never a source for player tracking.
export async function recordFictionalTrace(tx,s,c,target,kind,actionId,at,extra={}){
 if(s.spaceOutlaws?.fictionalTracesVersion!==1||!target?.tracePolicy?.actions.includes(kind))return;
 authorizeSpaceOutlaws(tx,s,'FICTIONAL_TRACES');
 const id=hash([s.id,kind,actionId]),head=await tx.get(path(s,'fictionalTraceHeads',target.id));
 requireThat(Object.keys(head?.byCharacter??{}).length<1000||head?.byCharacter?.[c.id],'SO_RELEASE_LIMIT');
 const trace={...extra,id,sessionId:s.id,targetId:target.id,targetTitle:target.title,targetRevision:target.revision,minLevel:target.tracePolicy.minLevel,characterId:c.id,characterName:c.public.displayName,kind,actionId,atGameMs:gameTime(s.clock,at),at};
 tx.set(path(s,'fictionalTraces',id),trace);tx.set(path(s,'fictionalTraceHeads',target.id),{id:target.id,lastTraceId:id,byCharacter:{...head?.byCharacter,[c.id]:id},revision:(head?.revision??0)+1});
}
const profile=(mode,minLevel)=>({kind:'ANALYZE',skillId:mode==='TRACK'?'FIL-01':'EFF-01',minLevel,instructions:mode==='TRACK'?'Rechercher les traces fictives autorisées de ce point. Aucun accès aux journaux techniques ou à la localisation réelle.':'Brouiller une trace fictive admissible de moins de quinze minutes. Les événements réels et les biens restent inchangés.',durationSeconds:120,durationByLevel:{1:120,2:105,3:90,4:75,5:60},cost:1,cooldownSeconds:600,test:'AUTO',threshold:0,bonusItems:[],consumable:null,successText:'Recherche terminée.',failureText:''});
export async function traceTarget(tx,s,c,input,at){
 enabled(s);const sourceId=documentId(input.traceTargetId),mode=input.traceMode;requireThat(['TRACK','ERASE'].includes(mode),'SO_TRACE_POLICY');
 const source=await tx.get(path(s,'fieldTargets',sourceId)),sourceState=await tx.get(path(s,'fieldStates',sourceId));requireThat(source?.publicationState==='PUBLISHED'&&source.tracePolicy&&sourceState,'SO_TRACE_TARGET');
 const shipPoint=source.tracePolicy.actions.includes('DEPARTURE'),binding=shipPoint?await tx.get(path(s,'fictionalShipTraceTargets',sourceId)):null,boundShip=binding?await tx.get(path(s,'ships',binding.shipId)):null;requireThat(!shipPoint||boundShip,'SO_TRACE_TARGET');
 const authorizedShip=shipPoint&&mode==='ERASE'?await shipTraceAuthority(tx,s,c,boundShip):false;
 const level=abilityLevel(c,mode==='TRACK'?'FIL-01':'EFF-01');requireThat(!shipPoint||level>=(mode==='TRACK'?3:4),'FIELD_SKILL_REQUIRED');requireThat(level>=source.tracePolicy.minLevel,'FIELD_SKILL_REQUIRED');
 const head=await tx.get(path(s,'fictionalTraceHeads',sourceId));
 let traceId=mode==='TRACK'?head?.lastTraceId:input.traceId??(shipPoint?head?.lastTraceId:head?.byCharacter?.[c.id]),trace=traceId?await tx.get(path(s,'fictionalTraces',traceId)):null,consent=null;
 requireThat(!trace||trace.targetId===source.id,'SO_TRACE_TARGET');
 if(mode==='ERASE'){
  requireThat(trace&&trace.sessionId===s.id&&head?.byCharacter?.[trace.characterId]===trace.id&&(!shipPoint||head.lastTraceId===trace.id),'SO_TRACE_LAST');
  requireThat(gameTime(s.clock,at)-trace.atGameMs<=900000,'SO_TRACE_TOO_OLD');requireThat(level>=trace.minLevel,'FIELD_SKILL_REQUIRED');
  if(trace.characterId!==c.id&&!authorizedShip){
   requireThat(level>=3,'FIELD_SKILL_REQUIRED');const subject=await activeCharacter(tx,s.id,trace.characterId),recipient=await activeCharacter(tx,s.id,c.id);consent=await tx.get(path(s,'fictionalTraceConsents',hash([trace.id,c.id])));
   requireThat(!shipPoint||await shipTraceAuthority(tx,s,subject.c,boundShip),'SO_TRACE_CONSENT');
   requireThat(consent?.active===true&&consent.subjectAccessVersion===subject.r.accessVersion&&consent.recipientAccessVersion===recipient.r.accessVersion&&consent.subjectUid===subject.c.assignedUid,'SO_TRACE_CONSENT');
  }
 }
 requireThat(!shipPoint||mode==='TRACK'||authorizedShip||trace?.characterId!==c.id&&consent?.active,'SO_TRACE_CONSENT');
 const mask=trace?await tx.get(path(s,'fictionalTraceMasks',trace.id)):null;
 const lead=input.falseLeadId?source.tracePolicy.falseLeads.find(x=>x.id===input.falseLeadId):null;
 const actorState=mode==='ERASE'?await tx.get(path(s,'fictionalTraceActors',c.id)):null,oldLead=actorState?.falseLeadTraceId?await tx.get(path(s,'fictionalTraceMasks',actorState.falseLeadTraceId)):null;
 if(input.falseLeadId){requireThat(mode==='ERASE'&&level>=5&&lead?.scenarioAuthorized===true,'SO_TRACE_FALSE_LEAD');requireThat(!activeTraceMask(s,oldLead),'SO_TRACE_FALSE_LEAD_ACTIVE');}
 let pursuit=null;if(input.pursuitShipId){requireThat(mode==='TRACK'&&shipPoint&&level>=4&&trace?.departure&&(!activeTraceMask(s,mask)||level>=mask.level),'SO_TRACE_PURSUIT');pursuit=await pursuitContext(tx,s,c,trace.departure,documentId(input.pursuitShipId),at);}
 const onboard=!!(pursuit||shipPoint&&authorizedShip&&boundShip.journey?.id===c.activeVoyageId&&boundShip.journey.manifest.some(m=>m.id===c.id));
 const advanced=pursuit&&level>=5?source.tracePolicy.routes?.find(r=>r.routeId===pursuit.targetRouteId)??null:null;
 const work={onboard,pursuit,advanced,authorizedShip,sourceId,sourceRevision:source.revision,mode,traceId:trace?.id??null,trace,mask:activeTraceMask(s,mask)?mask:null,consentRevision:consent?.revision??null,falseLead:lead??null};
 return {id:`trace_${hash([sourceId,mode,c.id])}`,kind:'ANALYSIS',publicationState:'PUBLISHED',title:(mode==='TRACK'?'Pistage : ':'Effacement : ')+source.title,description:source.description,revision:hash(work),profiles:{ANALYZE:profile(mode,shipPoint?(mode==='TRACK'?3:4):source.tracePolicy.minLevel)},rewards:[],dependencyId:sourceId,offlineSeconds:0,failureLockSeconds:0,repairProtectionSeconds:0,traceWork:work,traceInput:{traceTargetId:sourceId,traceMode:mode,...(pursuit?{pursuitShipId:pursuit.ownShipId}:{}),...(mode==='ERASE'?{traceId:trace?.id}:{}),...(lead?{falseLeadId:lead.id}:{})}};
}
export async function resolveTrace(tx,s,c,a,t,at,dice){
 const w=t.traceWork;requireThat(t.revision===a.targetRevision,'FIELD_STATE_CHANGED');
 if(w.mode==='TRACK'){
  if(!w.trace)return {text:'Aucune interaction traçable enregistrée sur ce point.',trace:{found:false}};
  if(w.mask&&a.level<w.mask.level)return {text:w.mask.falseLead?.text??'Aucune trace exploitable retrouvée.',trace:{found:false,information:w.mask.falseLead?.text??null}};
  if(w.mask)tx.set(path(s,'fictionalTraceMasks',w.trace.id),{...w.mask,status:'DISCOVERED',discoveredBy:c.id,discoveredAt:at,revision:w.mask.revision+1});
  if(w.trace.departure){
   const departure={shipName:w.trace.departure.shipName,fromPort:w.trace.departure.fromPort,at:w.trace.at};
   if(w.pursuit){const [roll,opponentRoll]=dice();requireThat([roll,opponentRoll].every(n=>Number.isInteger(n)&&n>=1&&n<=6),'INVALID_DIE');const total=roll+a.level,opponentTotal=opponentRoll+w.pursuit.targetPilotLevel,success=total>opponentTotal;
    tx.set(path(s,'fictionalPursuits',a.id),{id:a.id,sessionId:s.id,characterId:c.id,...w.pursuit,roll,opponentRoll,total,opponentTotal,success,at});
    if(opponentTotal-total>=2){const id=hash([w.pursuit.targetJourneyId,a.id]);tx.set(path(s,'fictionalTraceAlerts',id),{id,recipientId:w.pursuit.targetPilotId,journeyId:w.pursuit.targetJourneyId,at,message:'Une signature suspecte suit votre trajectoire. Aucune identité identifiée.'});}
    return {success,text:success?'Filature fictive maintenue sur ce trajet.':'La piste spatiale est perdue.',departure,pursuit:{success,roll,total,...(success&&w.advanced?{nextSegment:w.advanced.nextSegment,arrivalWindow:w.advanced.arrivalWindow}:{})}};
   }
   return {text:'Dernier départ fictif enregistré.',departure};
  }
  return {text:'Trace fictive retrouvée.',trace:{found:true,characterName:w.trace.characterName,...(a.level>=2?{atGameMs:w.trace.atGameMs,at:w.trace.at}:{}),reconstructed:!!w.mask}};
 }
 const prior=await tx.get(path(s,'fictionalTraceMasks',w.trace.id));
 const mask={id:w.trace.id,sessionId:s.id,status:'ACTIVE',level:a.level,erasedBy:c.id,actionId:a.id,at,revision:(prior?.revision??0)+1,falseLead:w.falseLead};tx.set(path(s,'fictionalTraceMasks',w.trace.id),mask);
 if(w.falseLead)tx.set(path(s,'fictionalTraceActors',c.id),{id:c.id,falseLeadTraceId:w.trace.id});
 if(w.trace.characterId!==c.id&&!w.authorizedShip){const id=hash([w.trace.id,c.id]),consent=await tx.get(path(s,'fictionalTraceConsents',id));tx.set(path(s,'fictionalTraceConsents',id),{...consent,active:false,usedByActionId:a.id,revision:consent.revision+1});}
 return {text:w.falseLead?'Fausse piste préparée activée.':'Trace fictive brouillée.',trace:{erased:true,falseLead:!!w.falseLead}};
}
export async function traceOptions(tx,s,c,sourceId,at){
 enabled(s);const source=await tx.get(path(s,'fieldTargets',sourceId));requireThat(source?.publicationState==='PUBLISHED'&&source.tracePolicy,'SO_TRACE_TARGET');
 const level=abilityLevel(c,'EFF-01'),shipPoint=source.tracePolicy.actions.includes('DEPARTURE');requireThat(level>=(shipPoint?4:source.tracePolicy.minLevel),'FIELD_SKILL_REQUIRED');const head=await tx.get(path(s,'fictionalTraceHeads',sourceId)),candidates=[];
 const binding=shipPoint?await tx.get(path(s,'fictionalShipTraceTargets',sourceId)):null,ship=binding?await tx.get(path(s,'ships',binding.shipId)):null,authorized=ship&&await shipTraceAuthority(tx,s,c,ship);
 for(const [cid,id] of Object.entries(head?.byCharacter??{})){if(shipPoint&&id!==head.lastTraceId)continue;
  const trace=await tx.get(path(s,'fictionalTraces',id));if(!trace||trace.sessionId!==s.id||gameTime(s.clock,at)-trace.atGameMs>900000)continue;
  if(cid!==c.id&&!authorized){if(level<3)continue;const consent=await tx.get(path(s,'fictionalTraceConsents',hash([trace.id,c.id])));if(!consent?.active)continue;try{const subject=await activeCharacter(tx,s.id,cid),recipient=await activeCharacter(tx,s.id,c.id);if(shipPoint&&!await shipTraceAuthority(tx,s,subject.c,ship))continue;if(consent.subjectAccessVersion!==subject.r.accessVersion||consent.recipientAccessVersion!==recipient.r.accessVersion||consent.subjectUid!==subject.c.assignedUid)continue;}catch(e){if(['FORBIDDEN','INVALID_RECIPIENT'].includes(e.code))continue;throw e;}}
  if(shipPoint&&cid===c.id&&!authorized)continue;
  candidates.push({id:trace.id,name:shipPoint?trace.departure.shipName:trace.characterName,own:cid===c.id||!!authorized});
 }
 return {traceTargetId:sourceId,title:source.title,candidates,falseLeads:level>=5?source.tracePolicy.falseLeads.map(l=>({id:l.id,label:l.label})):[]};
}
export async function myTraceConsents(tx,s,c,at){
 enabled(s);const rows=await tx.list(`${base(s)}/fictionalTraces`,['characterId',c.id],{limit:1001});requireThat(rows.length<=1000,'SO_RELEASE_LIMIT');const traces=[];
 for(const t of rows.filter(t=>t.sessionId===s.id&&gameTime(s.clock,at)-t.atGameMs<=900000)){const h=await tx.get(path(s,'fictionalTraceHeads',t.targetId));if(h?.byCharacter?.[c.id]===t.id)traces.push({id:t.id,title:t.targetTitle});}
 const consents=await tx.list(`${base(s)}/fictionalTraceConsents`,['subjectId',c.id],{limit:1001});requireThat(consents.length<=1000,'SO_RELEASE_LIMIT');return {sessionId:s.id,traces,consents:consents.filter(x=>x.active).map(x=>({id:x.id,traceId:x.traceId,recipientId:x.recipientId,recipientName:x.recipientName}))};
}
export async function consentTrace(tx,s,c,r,input,at){
 enabled(s);requireThat(s.stage==='EN_JEU'&&!s.safetyStop?.active&&input.present===true,'FIELD_PRESENCE_REQUIRED');const recipient=await activeCharacter(tx,s.id,documentId(input.recipientId)),trace=await tx.get(path(s,'fictionalTraces',input.traceId));
 requireThat(trace?.characterId===c.id&&trace.sessionId===s.id&&gameTime(s.clock,at)-trace.atGameMs<=900000,'SO_TRACE_CONSENT');requireThat(typeof input.enabled==='boolean'&&c.id!==recipient.c.id,'SO_TRACE_CONSENT');
 const id=hash([trace.id,recipient.c.id]),old=await tx.get(path(s,'fictionalTraceConsents',id));const next={id,traceId:trace.id,subjectId:c.id,subjectUid:c.assignedUid,subjectAccessVersion:r.accessVersion,recipientId:recipient.c.id,recipientName:recipient.c.public.displayName,recipientAccessVersion:recipient.r.accessVersion,active:input.enabled,revision:(old?.revision??0)+1,at};tx.set(path(s,'fictionalTraceConsents',id),next);return {active:next.active};
}
// Bind an existing ship to an explicitly prepared departure QR; never invent a voyage.
export async function bindShipTracePoint(tx,s,input,at,actor,id){
 enabled(s);requireThat(['BRIEFING','EN_JEU'].includes(s.stage)&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');
 const shipId=documentId(input.shipId),targetId=documentId(input.targetId),ship=await tx.get(path(s,'ships',shipId)),target=await tx.get(path(s,'fieldTargets',targetId));
 requireThat(ship?.enabled&&ship.docked&&!ship.journey&&target?.publicationState==='PUBLISHED'&&target.tracePolicy?.actions.includes('DEPARTURE'),'SO_TRACE_TARGET');
 const old=await tx.get(path(s,'fictionalShipTraceBindings',shipId)),other=await tx.get(path(s,'fictionalShipTraceTargets',targetId));requireThat((!old||old.targetId===targetId)&&(!other||other.shipId===shipId),'SO_TRACE_BINDING');
 requireThat(typeof input.reason==='string'&&input.reason.trim()&&input.reason.length<=500,'REASON_REQUIRED');authorizeSpaceOutlaws(tx,s,'FICTIONAL_TRACES');
 tx.set(path(s,'fictionalShipTraceBindings',shipId),{id:shipId,targetId,at});tx.set(path(s,'fictionalShipTraceTargets',targetId),{id:targetId,shipId,at});tx.set(`${base(s)}/audit/${id}`,{id,at,action:'bindShipTracePoint',actorUid:actor.uid,shipId,targetId,reason:input.reason.trim()});return {shipId,targetId};
}
export async function recordShipDeparture(tx,s,ship,pilot,journey,at){
 if(s.spaceOutlaws?.fictionalTracesVersion!==1)return;const binding=await tx.get(path(s,'fictionalShipTraceBindings',ship.id));if(!binding)return;
 const target=await tx.get(path(s,'fieldTargets',binding.targetId));if(!target?.tracePolicy?.actions.includes('DEPARTURE'))return;
 await recordFictionalTrace(tx,s,pilot,target,'DEPARTURE',`${journey.id}:${ship.id}`,at,{departure:{shipId:ship.id,shipName:ship.name,journeyId:journey.id,fromPort:journey.fromPort,routeId:journey.routeId,pilotId:journey.pilotId}});
}
const journeyBinding=ship=>hash([ship.id,ship.journey?.id,ship.journey?.routeId,ship.journey?.fromPort,ship.journey?.toPort,ship.journey?.detour?.id??null,ship.journey?.arrivesAtGameMs]);
async function shipTraceAuthority(tx,s,c,ship){
 if(ship.ownerType==='CHARACTER'&&ship.ownerId===c.id)return true;
 if(ship.ownerType==='GROUP'){
  const g=await tx.get(path(s,'groups',ship.ownerId));return ship.groupPilotId===c.id&&g&&groupVisible(g,c.id)&&memberFor(g,c.id)?.permissions.pilotShip===true;
 }
 return ship.pilotId===c.id;
}
async function pursuitContext(tx,s,c,departure,shipId,at){
 const time=gameTime(s.clock,at),own=await tx.get(path(s,'ships',shipId)),target=await tx.get(path(s,'ships',departure.shipId));
 const moving=x=>x?.enabled&&!x.docked&&x.hull>0&&x.journey&&!x.journey.suspended&&!x.journey.intercepted&&!x.combatId&&!x.rescueId&&!x.operation&&x.journey.arrivesAtGameMs>time&&!(x.journey.event?.fuelDebt>0);
 requireThat(own?.id!==target?.id&&moving(own)&&moving(target)&&target.journey.id===departure.journeyId,'SO_TRACE_PURSUIT');
 requireThat(c.activeVoyageId===own.journey.id&&own.journey.manifest.some(m=>m.id===c.id)&&own.journey.routeId===target.journey.routeId,'SO_TRACE_PURSUIT');
 const ownPilot=await activeCharacter(tx,s.id,own.journey.pilotId),targetPilot=await activeCharacter(tx,s.id,target.journey.pilotId);
 requireThat(ownPilot.c.hp>0&&!ownPilot.c.survival?.dead&&ownPilot.c.activeVoyageId===own.journey.id&&abilityLevel(ownPilot.c,'PIL-02')>=1,'SO_TRACE_PURSUIT');
 const ledger=await tx.get(path(s,'voyages',own.journey.id));requireThat(ledger?.shipId===own.id&&ledger.departedAtGameMs===own.journey.departedAtGameMs&&own.journey.fuelCost>0,'SO_TRACE_PURSUIT');
 return {ownShipId:own.id,ownJourneyId:own.journey.id,ownBinding:journeyBinding(own),targetShipId:target.id,targetRouteId:target.journey.routeId,targetJourneyId:target.journey.id,targetBinding:journeyBinding(target),targetPilotId:targetPilot.c.id,targetPilotLevel:abilityLevel(targetPilot.c,'PIL-01'),targetPilotAccessVersion:targetPilot.r.accessVersion,ownPilotAccessVersion:ownPilot.r.accessVersion};
}
export function requireTraceActor(s,c,t,at){
 // Only a confirmed passenger of a native journey may use the onboard trace branch.
 const onboard=t?.traceWork?.onboard===true;
 requireGameAction(s,onboard?{...c,activeVoyageId:null,spacePortId:s.transportRules?.homePort}:c,'discover',at);
}
export async function pursuitContinuity(tx,s,c,a,at){
 if(!a.result?.pursuit?.success)return null;const p=await tx.get(path(s,'fictionalPursuits',a.id));if(!p||p.characterId!==c.id||p.sessionId!==s.id)return false;
 const own=await tx.get(path(s,'ships',p.ownShipId)),target=await tx.get(path(s,'ships',p.targetShipId));return !!(own?.journey&&target?.journey&&p.success&&own.journey.arrivesAtGameMs>gameTime(s.clock,at)&&target.journey.arrivesAtGameMs>gameTime(s.clock,at)&&!own.journey.suspended&&!target.journey.suspended&&own.journey.id===c.activeVoyageId&&journeyBinding(own)===p.ownBinding&&journeyBinding(target)===p.targetBinding);
}
export async function myTraceAlerts(tx,s,c){
 if(s.spaceOutlaws?.fictionalTracesVersion!==1)return [];const rows=await tx.list(`${base(s)}/fictionalTraceAlerts`,['recipientId',c.id],{limit:1001});requireThat(rows.length<=1000,'SO_RELEASE_LIMIT');return rows.map(r=>({message:r.message,at:r.at}));
}

export async function tracePursuitOptions(tx,s,c){
 enabled(s);requireThat(abilityLevel(c,'FIL-01')>=4,'FIELD_SKILL_REQUIRED');
 const rows=await tx.list(`${base(s)}/ships`,null,{limit:1001});requireThat(rows.length<=1000,'SO_RELEASE_LIMIT');
 return {ships:rows.filter(x=>x.enabled&&x.journey?.id===c.activeVoyageId&&x.journey?.manifest.some(m=>m.id===c.id)).map(x=>({id:x.id,name:x.name}))};
}
