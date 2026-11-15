import {droidModuleWork} from '../shared/space-droid-modules.mjs';
import {documentId,requireThat} from './validation.mjs';
import {abilityLevel} from './abilities.mjs';
import {personalLot,lotState,inventoryHash as hash} from './inventory-state.mjs';
import {activeCharacter} from './aid-state.mjs';
import {effectiveFieldState} from './field-state.mjs';
import {gameTime} from './clock.mjs';
export const isDroidWork=p=>p?.kind==='DROID_MODULE';
export function droidWorkshopProfile(input,id,revision,records,s){
 requireThat(s.spaceOutlaws?.droidModulesVersion===1&&id.startsWith('SO-DROID-'),'SO_GAMEPLAY_NOT_OPEN');
 requireThat(['INSTALL','REMOVE','REPAIR'].includes(input.moduleOperation)&&['DRAFT','PUBLISHED'].includes(input.publicationState),'INVALID_PERSON_PROFILE');
 const target=records.fieldTargets.find(t=>t.id===input.clinicTargetId&&t.publicationState==='PUBLISHED');requireThat(target,'FIELD_REFERENCE');
 const repair=input.moduleOperation==='REPAIR',parts=repair?records.items.find(i=>i.id===input.partsItemId):null;
 requireThat(!repair||parts?.versionId===s.versionId&&parts.consumable&&parts.kind==='STACKABLE'&&Number.isSafeInteger(parts.referenceUnitValueCr)&&parts.referenceUnitValueCr>0&&25%parts.referenceUnitValueCr===0,'SO_MODULE_PARTS');
 const label={INSTALL:'Installer un module de droïde',REMOVE:'Retirer un module de droïde',REPAIR:'Réparer un module de droïde'}[input.moduleOperation];
 return {id,revision,kind:'DROID_MODULE',moduleOperation:input.moduleOperation,publicationState:input.publicationState,name:label,
  clinicTargetId:target.id,clinicTargetRevision:target.revision,clinicTitle:target.title,...(parts?{partsItemId:parts.id,partsUnitValue:parts.referenceUnitValueCr}:{}),
  patientNature:'DROID',skillId:repair?'MEC-02':'MEC-03',minLevel:repair?2:1,prerequisites:[],test:'AUTO',threshold:0,cost:1,cooldownSeconds:600,
  durationSeconds:300,durationByLevel:{},bonusItems:[],consumable:null,extraConsumables:[],continuationSeconds:0,healAmount:0,reviveLevel:0,convalescenceSeconds:0,patientCooldownSeconds:0,
  instructions:`${label} dans l’atelier ${target.title}, hors combat, avec l’accord du propriétaire. 1 PA ; durée selon le module et l’opération. Aucun PV rendu. Une réparation ne recharge pas la protection. L’objet et son contenu restent les mêmes.`};
}
export async function requireDroidWorkshop(tx,s,p,at){
 requireThat(s.spaceOutlaws?.droidModulesVersion===1,'SO_GAMEPLAY_NOT_OPEN');
 const current=await tx.get(`sessions/${s.id}/personProfiles/${p.id}`),target=await tx.get(`sessions/${s.id}/fieldTargets/${p.clinicTargetId}`),state=await tx.get(`sessions/${s.id}/fieldStates/${p.clinicTargetId}`);
 requireThat(current?.revision===p.revision&&current.publicationState==='PUBLISHED'&&isDroidWork(current),'FIELD_STATE_CHANGED');
 requireThat(target?.revision===p.clinicTargetRevision&&target.publicationState==='PUBLISHED'&&state&&effectiveFieldState(s,state,at).status==='ONLINE','FIELD_UNAVAILABLE');
}
export function installedDroidModule(c,l){return l?.status==='INSTALLED'&&(l.ownerType??'CHARACTER')==='CHARACTER'&&l.ownerId===c.id&&l.holderId===c.id&&l.location?.kind==='DROID_MODULE'&&l.location.id===c.id&&c.droidModules?.some(m=>m.lotId===l.id&&m.code===l.item.droidModule?.code);}
const binding=(t,l,consent)=>hash(JSON.stringify([t.id,t.droidModules??[],l.id,l.revision,l.ownerId,l.item.droidModule,l.moduleState??null,consent??null]));
export async function droidWorkPlan(tx,s,c,t,p,input,at,{ownerApproval=false}={}){
 await requireDroidWorkshop(tx,s,p,at);requireThat(t.nature==='DROID'&&t.hp>0&&!t.outOfCombat&&!t.survival?.dead,'PATIENT_NATURE_MISMATCH');
 const l=await tx.get(`sessions/${s.id}/inventory/${documentId(input.moduleLotId)}`),q=droidModuleWork(l?.item.droidModule?.code,p.moduleOperation);requireThat(q&&l.quantity===1,'SO_DROID_MODULE');
 requireThat(!l.memoryActionId,'FIELD_TARGET_BUSY');const installing=q.operation==='INSTALL';requireThat(!installing||l.ownerId===t.id||l.transferable!==false&&l.origin?.kind!=='SO_BIRTH','SO_DROID_MODULE');
 requireThat(installing?l.status==='AVAILABLE'&&(personalLot(l,c.id)||personalLot(l,t.id)):installedDroidModule(t,l),'SO_DROID_MODULE');
 requireThat(abilityLevel(c,q.skillId)>=q.minLevel&&(q.operation!=='REPAIR'||abilityLevel(c,'MEC-03')>=q.level),'FIELD_SKILL_REQUIRED');
 const state=installing?l.moduleState:t.droidModules.find(m=>m.lotId===l.id);
 requireThat(!installing||(t.droidModules??[]).length<2,'SO_DROID_SLOTS');
 requireThat(q.operation!=='REPAIR'||state?.status==='DAMAGED','MAINTENANCE_NOT_NEEDED');
 requireThat(q.operation!=='REMOVE'||!state?.contentLotId,'MODULE_CONTENT_NOT_EMPTY');
 let consent=null;
 if(c.id!==t.id&&!ownerApproval){
  consent=t.droidWorkshopConsent;
  const a=await activeCharacter(tx,s.id,c.id),b=await activeCharacter(tx,s.id,t.id);
  requireThat(consent?.technicianId===c.id&&consent.technicianVersion===a.r.accessVersion&&consent.ownerVersion===b.r.accessVersion&&consent.moduleLotId===l.id&&consent.profileId===p.id&&consent.profileRevision===p.revision,'SO_DROID_CONSENT');
 }
 let supply=null;
 if(q.operation==='REPAIR'){
  const parts=await tx.get(`sessions/${s.id}/items/${p.partsItemId}`);requireThat(parts?.versionId===s.versionId&&parts.referenceUnitValueCr===p.partsUnitValue&&q.partsValue%p.partsUnitValue===0,'SO_MODULE_PARTS');
  supply={itemId:p.partsItemId,quantity:q.partsValue/p.partsUnitValue};
 }
 return {lot:l,binding:binding(t,l,consent),profile:{...p,minLevel:q.minLevel,prerequisites:q.operation==='REPAIR'?[{skillId:'MEC-03',minLevel:q.level}]:[],durationSeconds:q.seconds,consumable:supply,moduleCode:q.code,moduleLotId:l.id,moduleOriginalStatus:l.status,moduleConsent:consent,modulePlan:q}};
}
export async function checkDroidWork(tx,s,c,t,a,at){
 const l=await tx.get(`sessions/${s.id}/inventory/${a.profile.moduleLotId}`);requireThat(l?.status==='FIELD_RESERVED'&&l.fieldActionId===a.id,'SO_DROID_MODULE');
 const normalized={...l,status:a.profile.moduleOriginalStatus,revision:l.revision-1,fieldActionId:null};
 const reader={get:path=>path===`sessions/${s.id}/inventory/${l.id}`?Promise.resolve(normalized):tx.get(path),list:(...args)=>tx.list(...args)};
 const plan=await droidWorkPlan(reader,s,c,t,a.profile,{moduleLotId:l.id},at);requireThat(plan.binding===a.droidWorkBinding,'FIELD_STATE_CHANGED');return l;
}
export function finishDroidWork(tx,s,c,t,a,l,at,id,{cancel=false}={}){
 const p=a.profile,install=p.moduleOperation==='INSTALL',remove=p.moduleOperation==='REMOVE';
 if(cancel){tx.set(`sessions/${s.id}/inventory/${l.id}`,{...l,status:p.moduleOriginalStatus,fieldActionId:null,revision:l.revision+1});return t;}
 let modules=t.droidModules??[],state=modules.find(m=>m.lotId===l.id);
 if(install){state={...(l.moduleState??{}),lotId:l.id,code:p.moduleCode,status:l.moduleState?.status??'OPERATIONAL'};modules=[...modules,state];}
 else if(remove){if(p.moduleCode==='DR-01')state={...state,protectionCharge:t.protectionSourceLotId===l.id?t.protection:state.protectionCharge??0};modules=modules.filter(m=>m.lotId!==l.id);}
 else modules=modules.map(m=>m.lotId===l.id?{...m,status:'OPERATIONAL'}:m);
 const next={...l,status:remove?'AVAILABLE':'INSTALLED',holderId:t.id,ownerId:t.id,ownerType:'CHARACTER',location:{kind:remove?'CHARACTER':'DROID_MODULE',id:t.id},fieldActionId:null,revision:l.revision+1,...(remove?{moduleState:state}:{})};
 tx.set(`sessions/${s.id}/inventory/${l.id}`,next);tx.set(`sessions/${s.id}/inventory/${l.id}/history/${id}`,{id,at,kind:`DROID_${p.moduleOperation}`,characterId:c.id,actionId:a.id,before:lotState(l),after:lotState(next)});
 // Installing a blindage never manufactures a fresh protection point.
 return {...t,droidModules:modules,droidWorkshopConsent:null,...(install&&p.moduleCode==='DR-01'&&state.protectionCharge===1&&(t.protection??0)===0?{protection:1,protectionSourceLotId:l.id,healthRevision:t.healthRevision+1}:{}),...(remove&&p.moduleCode==='DR-01'&&t.protectionSourceLotId===l.id?{protection:0,protectionSourceLotId:null,healthRevision:t.healthRevision+1}:{})};
}
// The owner authorizes an identified intervention; the technician never asserts consent.
export async function droidConsentPlan(tx,s,owner,registration,input,at){
 requireThat(s.spaceOutlaws?.droidModulesVersion===1&&owner.nature==='DROID'&&owner.hp>0&&!owner.outOfCombat&&!owner.survival?.dead,'SO_DROID_CONSENT');
 requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage)&&!s.safetyStop?.active,'SO_GAMEPLAY_NOT_OPEN');
 const {c:technician,r}=await activeCharacter(tx,s.id,documentId(input.technicianId));requireThat(technician.id!==owner.id,'INVALID_RECIPIENT');
 const p=await tx.get(`sessions/${s.id}/personProfiles/${documentId(input.profileId)}`);requireThat(isDroidWork(p)&&p.publicationState==='PUBLISHED','PERSON_PROFILE_UNAVAILABLE');
 const plan=await droidWorkPlan(tx,s,technician,owner,p,input,at,{ownerApproval:true});
 const consent={technicianId:technician.id,technicianVersion:r.accessVersion,ownerVersion:registration.accessVersion,moduleLotId:plan.lot.id,profileId:p.id,profileRevision:p.revision};
 return {consent,preview:{technicianName:technician.public.displayName,name:p.name,moduleName:plan.lot.item.name,seconds:plan.profile.durationSeconds,confirmation:hash(JSON.stringify([consent,plan.binding]))}};
}
export async function droidWorkOptions(tx,s,c,t,profiles,at){
 if(s.spaceOutlaws?.droidModulesVersion!==1)return {};
 const own=c.id===t.id,consent=t.droidWorkshopConsent;let allowed=own;
 if(!own&&consent?.technicianId===c.id){const a=await activeCharacter(tx,s.id,c.id),b=await activeCharacter(tx,s.id,t.id),p=await tx.get(`sessions/${s.id}/personProfiles/${consent.profileId}`);allowed=consent.technicianVersion===a.r.accessVersion&&consent.ownerVersion===b.r.accessVersion&&p?.publicationState==='PUBLISHED'&&p.revision===consent.profileRevision;}
 const all=[...await tx.list(`sessions/${s.id}/inventory`,['holderId',c.id]),...(!own&&allowed?await tx.list(`sessions/${s.id}/inventory`,['holderId',t.id]):[])],valid=l=>!!droidModuleWork(l.item?.droidModule?.code,'INSTALL')&&l.quantity===1;
 const modules=all.filter(l=>valid(l)&&(personalLot(l,c.id)&&l.status==='AVAILABLE'||allowed&&(own||l.id===consent?.moduleLotId)&&(personalLot(l,t.id)&&l.status==='AVAILABLE'||installedDroidModule(t,l))));
 const row=l=>{const m=installedDroidModule(t,l)?t.droidModules.find(m=>m.lotId===l.id):l.moduleState;return {id:l.id,name:l.item.name,code:l.item.droidModule.code,status:l.status,condition:m?.status??'OPERATIONAL',neutralizedMs:Math.max(0,(m?.neutralizedUntilGameMs??0)-gameTime(s.clock,at)),...(l.item.droidModule.code==='DR-01'?{protectionCharge:t.protectionSourceLotId===l.id?t.protection:m?.protectionCharge??0}:{})};};
 const options={moduleLots:modules.map(row)};
 if(own&&c.nature==='DROID'){
  const choices=(await tx.list(`sessions/${s.id}/personProfiles`)).filter(p=>isDroidWork(p)&&p.publicationState==='PUBLISHED');
  options.droidWorkshop={profiles:choices.map(p=>({id:p.id,name:p.name,operation:p.moduleOperation,workshop:p.clinicTitle})),modules:modules.map(row),consent:consent?{moduleLotId:consent.moduleLotId,profileId:consent.profileId}:null};
 }
 return options;
}

export async function droidBonusOptions(tx,s,c,p,at){
 if(s.spaceOutlaws?.droidModulesVersion!==1||p.test!=='D6')return [];
 const code=['MEC-01','TRA-01'].includes(p.skillId)?'DR-03':p.skillId==='INF-01'&&p.category==='TERMINAL'?'DR-04':null;if(!code)return [];
 const ids=p.bonusItemIds??p.bonusItems?.map(b=>b.itemId)??[],out=[];
 for(const m of c.droidModules??[]){
  if(m.code!==code||m.status!=='OPERATIONAL'||(m.neutralizedUntilGameMs??0)>gameTime(s.clock,at))continue;
  const lot=await tx.get(`sessions/${s.id}/inventory/${m.lotId}`);
  if(!installedDroidModule(c,lot)||!ids.includes(lot.item.id))continue;
  out.push({id:lot.id,lotId:lot.id,code,name:lot.item.name,itemId:lot.item.id,revision:lot.revision,bonus:1,state:hash(JSON.stringify(m))});
 }
 return out;
}
export async function requireDroidBonus(tx,s,c,p,snapshot,at){
 if(!snapshot)return;
 const current=(await droidBonusOptions(tx,s,c,p,at)).find(m=>m.lotId===snapshot.lotId);
 requireThat(current&&current.revision===snapshot.revision&&current.state===snapshot.state,'FIELD_EQUIPMENT_UNAVAILABLE');
}

// A scenario incident marks damage; returning to service requires the repair action.
export async function damageDroidModule(tx,s,input,at,id,actor){
 requireThat(s.spaceOutlaws?.droidModulesVersion===1&&['BRIEFING','EN_JEU','PAUSE'].includes(s.stage)&&!s.safetyStop?.active,'SO_GAMEPLAY_NOT_OPEN');
 requireThat(typeof input.reason==='string'&&input.reason.trim()&&input.reason.length<=500,'REASON_REQUIRED');
 const l=await tx.get(`sessions/${s.id}/inventory/${documentId(input.moduleLotId)}`),c=l?await tx.get(`sessions/${s.id}/characters/${l.ownerId}`):null;
 requireThat(c&&l?.item.droidModule&&l.quantity===1&&['AVAILABLE','INSTALLED'].includes(l.status)&&!l.memoryActionId,'SO_DROID_MODULE');
 requireThat(l.revision===input.revision,'STALE_REVISION');requireThat(!c.activeFieldActionId&&!c.activePersonActionId,'FIELD_TARGET_BUSY');
 const installed=installedDroidModule(c,l);requireThat(installed||personalLot(l,c.id)&&l.status==='AVAILABLE','SO_DROID_MODULE');
 const before=installed?c.droidModules.find(m=>m.lotId===l.id):l.moduleState??{status:'OPERATIONAL'};requireThat(before.status!=='DAMAGED','MAINTENANCE_NOT_NEEDED');
 const state={...before,status:'DAMAGED'},next={...l,revision:l.revision+1,...(!installed?{moduleState:state}:{})};
 tx.set(`sessions/${s.id}/inventory/${l.id}`,next);
 if(installed)tx.set(`sessions/${s.id}/characters/${c.id}`,{...c,droidModules:c.droidModules.map(m=>m.lotId===l.id?state:m),healthRevision:c.healthRevision+1});
 tx.set(`sessions/${s.id}/inventory/${l.id}/history/${id}`,{id,at,kind:'DROID_DAMAGE',actorUid:actor.uid,reason:input.reason.trim(),before,after:state});
 tx.set(`sessions/${s.id}/audit/${id}`,{id,at,action:'damageDroidModule',actorUid:actor.uid,reason:input.reason.trim(),moduleLotId:l.id,characterId:c.id});
 return {id:l.id,status:'DAMAGED',revision:next.revision};
}
export async function droidAdminModules(tx,s){
 if(s.spaceOutlaws?.droidModulesVersion!==1)return [];
 const lots=(await tx.list(`sessions/${s.id}/inventory`)).filter(l=>l.item.droidModule&&l.quantity===1&&['INSTALLED','AVAILABLE'].includes(l.status));const result=[];
 for(const l of lots){const c=await tx.get(`sessions/${s.id}/characters/${l.ownerId}`),m=installedDroidModule(c??{},l)?c.droidModules.find(m=>m.lotId===l.id):l.moduleState;result.push({id:l.id,name:l.item.name,ownerName:c?.public?.displayName??l.ownerId,status:m?.status??'OPERATIONAL',revision:l.revision});}
 return result;
}
