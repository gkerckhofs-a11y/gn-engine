import {documentId,requireThat} from './validation.mjs';
import {activeCharacter,aidHash as hash} from './aid-state.mjs';
import {abilityLevel} from './abilities.mjs';
import {gameTime} from './clock.mjs';
import {flightShip,activeModuleOutages,hasModuleFlights} from './space-module-flight.mjs';
import {validSoInstallation,systemRestoration} from '../shared/space-installation.mjs';
const base=s=>`sessions/${s.id}`;
const ready=s=>s.spaceOutlaws?.nativeSabotageVersion===1;
export async function nativeSabotageAdmin(tx,s,at){
 if(!ready(s))return null;const lots=await tx.list(`${base(s)}/inventory`),entities=[];
 for(const l of lots.filter(l=>l.status==='INSTALLED')){
  if(l.item.droidModule){const c=await tx.get(`${base(s)}/characters/${l.ownerId}`);if(c?.nature==='DROID')entities.push({kind:'DROID_MODULE',entityId:c.id,lotId:l.id,code:l.item.droidModule.code,name:`${c.public.displayName} · ${l.item.name}`,remainingMs:Math.max(0,(c.droidModules?.find(m=>m.lotId===l.id)?.neutralizedUntilGameMs??0)-gameTime(s.clock,at)),protectedMs:Math.max(0,(l.sabotage?.protectedUntilGameMs??0)-gameTime(s.clock,at))});}
  if(l.item.shipModule&&l.location?.kind==='SHIP_MODULE'){const sh=await tx.get(`${base(s)}/ships/${l.location.id}`);if(sh)entities.push({kind:'SHIP_MODULE',entityId:sh.id,lotId:l.id,code:l.item.shipModule.code,name:`${sh.name} · ${l.item.name}`,remainingMs:Math.max(0,...(sh.moduleNeutralizations??[]).filter(n=>n.lotId===l.id).map(n=>n.untilGameMs-gameTime(s.clock,at))),protectedMs:Math.max(0,(l.sabotage?.protectedUntilGameMs??0)-gameTime(s.clock,at))});}
 }
 return {bindings:await tx.list(`${base(s)}/nativeSabotageBindings`),entities};
}
export async function bindNativeSabotage(tx,s,input,at,id,actor){
 requireThat(ready(s)&&['BRIEFING','EN_JEU','PAUSE'].includes(s.stage)&&!s.safetyStop?.active,'SO_GAMEPLAY_NOT_OPEN');const targetId=documentId(input.targetId),entityId=documentId(input.entityId),lotId=documentId(input.lotId),t=await tx.get(`${base(s)}/fieldTargets/${targetId}`),state=await tx.get(`${base(s)}/fieldStates/${targetId}`),old=await tx.get(`${base(s)}/nativeSabotageBindings/${targetId}`);
 requireThat(t?.publicationState==='PUBLISHED'&&t.sabotageSystem&&validSoInstallation(t)&&state&&!state.activeActionId,'FIELD_UNAVAILABLE');requireThat((old?.revision??0)===input.revision,'STALE_REVISION');requireThat(typeof input.active==='boolean'&&typeof input.reason==='string'&&input.reason.trim()&&input.reason.length<=500,'SO_SABOTAGE_BINDING');
 requireThat(!old||old.entityId===entityId&&old.lotId===lotId,'SO_SABOTAGE_BINDING');requireThat(['OUT_OF_COMBAT','CAPTURE','AUTHORIZED_MAINTENANCE','DOCK'].includes(input.accessContext)&&((t.sabotageSystem.kind==='SHIP_MODULE')===(input.accessContext==='DOCK')),'SO_SABOTAGE_BINDING');
 const l=await tx.get(`${base(s)}/inventory/${lotId}`);requireThat(l?.status==='INSTALLED'&&!l.sabotageActionId&&(t.sabotageSystem.kind==='DROID_MODULE'?l.ownerId===entityId&&l.location?.kind==='DROID_MODULE'&&l.location.id===entityId&&l.item.droidModule?.code===t.sabotageSystem.code:l.location?.kind==='SHIP_MODULE'&&l.location.id===entityId&&l.item.shipModule?.code===t.sabotageSystem.code),'SO_SABOTAGE_BINDING');
 requireThat(!(await tx.list(`${base(s)}/nativeSabotageBindings`)).some(b=>b.id!==targetId&&b.active&&b.lotId===lotId),'FIELD_TARGET_BUSY');const next={id:targetId,entityId,lotId,active:input.active,reason:input.reason.trim(),accessContext:input.accessContext,targetRevision:t.revision,revision:(old?.revision??0)+1};tx.set(`${base(s)}/nativeSabotageBindings/${targetId}`,next);tx.set(`${base(s)}/audit/${id}`,{id,at,action:'bindNativeSabotage',actorUid:actor.uid,targetId,reason:input.reason.trim(),before:old,after:next});return {id:targetId,revision:next.revision};
}
export async function nativeSabotageTarget(tx,s,c,t,state,at,action=null){
 if(!t?.sabotageSystem)return {t,state};requireThat(ready(s),'SO_GAMEPLAY_NOT_OPEN');const b=await tx.get(`${base(s)}/nativeSabotageBindings/${t.id}`),time=gameTime(s.clock,at);requireThat(b?.active&&b.targetRevision===t.revision,'FIELD_UNAVAILABLE');
 let lot=await tx.get(`${base(s)}/inventory/${b.lotId}`);requireThat(lot?.status==='INSTALLED'&&lot.quantity===1,'FIELD_STATE_CHANGED');if(action){requireThat(lot.sabotageActionId===action.id,'FIELD_STATE_CHANGED');lot={...lot,revision:lot.revision-1,sabotageActionId:null};}
 const x=t.sabotageSystem;let native,entityProof,until=0;
 if(x.kind==='DROID_MODULE'){
  const {c:owner,r}=await activeCharacter(tx,s.id,b.entityId),m=owner.droidModules?.find(m=>m.lotId===lot.id&&m.code===x.code);requireThat(owner.nature==='DROID'&&!owner.survival?.dead&&m&&lot.ownerId===owner.id&&lot.holderId===owner.id&&lot.location?.kind==='DROID_MODULE'&&lot.location.id===owner.id&&lot.item.droidModule?.code===x.code,'FIELD_STATE_CHANGED');
  requireThat(!owner.activeVoyageId&&!owner.activeNavigationId&&(!c||!c.activeVoyageId&&!c.activeNavigationId&&(c.spacePortId??s.transportRules?.homePort)===(owner.spacePortId??s.transportRules?.homePort)),'FIELD_UNAVAILABLE');if(b.accessContext==='CAPTURE')requireThat((owner.lootEncounter?.captureUntil??0)>at,'FIELD_UNAVAILABLE');
  until=m.neutralizedUntilGameMs??0;native={kind:x.kind,entity:owner,module:m};entityProof=[owner.id,owner.assignedUid,r.accessVersion,owner.healthRevision,m];
 }else{
  requireThat(hasModuleFlights(s),'SO_GAMEPLAY_NOT_OPEN');const raw=await tx.get(`${base(s)}/ships/${b.entityId}`),ship=raw?flightShip(s,raw,time):null,m=ship?.modules?.find(m=>m.lotId===lot.id&&m.code===x.code);requireThat(m&&lot.ownerId===ship.ownerId&&lot.holderId===ship.id&&lot.location?.kind==='SHIP_MODULE'&&lot.location.id===ship.id&&lot.item.shipModule?.code===x.code,'FIELD_STATE_CHANGED');
  requireThat(ship.docked&&!ship.journey&&!ship.operation&&!ship.combatId&&!ship.maintenanceId&&!ship.towingAttachment&&(!c||!c.activeVoyageId&&(c.spacePortId??s.transportRules?.homePort)===ship.portId),'FIELD_UNAVAILABLE');until=Math.max(0,...activeModuleOutages(ship,time).filter(n=>n.lotId===lot.id).map(n=>n.untilGameMs));native={kind:x.kind,entity:ship,module:m};entityProof=[ship.id,ship.revision,ship.ownerId,ship.portId,m,raw.moduleNeutralizations??[]];
 }
 const work={binding:hash(JSON.stringify([b,lot.id,lot.revision,lot.ownerId,entityProof])),lotId:lot.id,entityId:b.entityId,kind:x.kind,restore:systemRestoration(x)};
 const virtualState={...state,status:until>time?'OFFLINE':'ONLINE',offlineUntilGameMs:until>time?until:null,activeActionId:lot.sabotageActionId??state.activeActionId,lockedUntilGameMs:Math.max(state.lockedUntilGameMs??0,lot.sabotage?.lockedUntilGameMs??0),protectedUntilGameMs:Math.max(state.protectedUntilGameMs??0,lot.sabotage?.protectedUntilGameMs??0)};
 return {t:{...t,nativeSystemWork:work},state:virtualState,lot,native};
}
export function requireNativeRestoration(c,work,kind){if(work&&kind==='REPAIR')requireThat(abilityLevel(c,'MEC-03')>=work.restore.mec03,'FIELD_SKILL_REQUIRED');}
export async function reserveNativeSabotage(tx,s,a){
 if(!a.nativeSystemWork)return;const l=await tx.get(`${base(s)}/inventory/${a.nativeSystemWork.lotId}`);requireThat(l?.status==='INSTALLED'&&!l.sabotageActionId,'FIELD_TARGET_BUSY');tx.set(`${base(s)}/inventory/${l.id}`,{...l,sabotageActionId:a.id,revision:l.revision+1});
}
export async function resolveNativeSabotage(tx,s,c,t,state,a,at,id,actor,{cancel=false,success=false}={}){
 const work=a.nativeSystemWork;if(!work)return null;const path=`${base(s)}/inventory/${work.lotId}`,l=await tx.get(path);requireThat(l?.sabotageActionId===a.id,'FIELD_STATE_CHANGED');let next={...l,sabotageActionId:null,revision:l.revision+1},character=null;const time=gameTime(s.clock,at);
 if(!cancel){const current=await nativeSabotageTarget(tx,s,c,t,state,at,a);requireThat(current.t.nativeSystemWork.binding===work.binding,'FIELD_STATE_CHANGED');requireNativeRestoration(c,work,a.kind);
  if(success){const until=a.kind==='SABOTAGE'?time+a.offlineSeconds*1000:time;next={...next,sabotage:{...l.sabotage,protectedUntilGameMs:until+900000,lockedUntilGameMs:0,lastActionId:a.id}};
   if(current.native.kind==='DROID_MODULE'){const owner=current.native.entity;character={...owner,droidModules:owner.droidModules.map(m=>m.lotId===l.id?{...m,neutralizedUntilGameMs:until,neutralizationSource:{kind:'SABOTAGE',targetId:a.targetId,actionId:a.id}}:m),healthRevision:owner.healthRevision+1};tx.set(`${base(s)}/characters/${owner.id}`,character);}
   else{const ship=current.native.entity,neutralizations=ship.moduleNeutralizations??[],moduleNeutralizations=a.kind==='SABOTAGE'?[...neutralizations,{lotId:l.id,code:current.native.module.code,source:'SABOTAGE',targetId:a.targetId,actionId:a.id,startedAtGameMs:time,untilGameMs:until}]:neutralizations.map(n=>n.lotId===l.id&&n.untilGameMs>time?{...n,untilGameMs:time,endedBy:a.id}:n);tx.set(`${base(s)}/ships/${ship.id}`,flightShip(s,{...ship,moduleNeutralizations,revision:ship.revision+1},time));}
  }else if(a.kind==='SABOTAGE')next={...next,sabotage:{...l.sabotage,lockedUntilGameMs:time+300000}};
 }
 tx.set(path,next);tx.set(`${path}/history/${id}`,{id,at,kind:cancel?'SABOTAGE_CANCEL':a.kind==='REPAIR'?'SABOTAGE_RESTORE':'SABOTAGE_ATTEMPT',actorUid:actor.uid,actionId:a.id,targetId:a.targetId,success:!cancel&&success,before:l.sabotage??null,after:next.sabotage??null});return character;
}
