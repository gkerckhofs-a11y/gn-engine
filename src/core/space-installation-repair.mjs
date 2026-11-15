import {documentId,requireThat} from './validation.mjs';
import {fieldProfile} from './field-state.mjs';
import {validSoInstallation} from '../shared/space-installation.mjs';
const base=s=>`sessions/${s.id}`;
const ready=s=>s.spaceOutlaws?.installationRepairVersion===1;
export const ordinaryInstallation=t=>t?.durableWork?{...t,profiles:Object.fromEntries(Object.entries(t.profiles).filter(([k])=>k!=='REPAIR_DURABLE'))}:t;
export async function installationRepairAdmin(tx,s){return ready(s)?{profiles:await tx.list(`${base(s)}/installationRepairProfiles`)}:null;}
export async function installationRepairCommand(tx,s,input,at,id,actor,action){
 requireThat(ready(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage)&&!s.safetyStop?.active,'SO_GAMEPLAY_NOT_OPEN');
 requireThat(typeof input.reason==='string'&&input.reason.trim()&&input.reason.length<=500,'REASON_REQUIRED');const targetId=documentId(input.targetId),t=await tx.get(`${base(s)}/fieldTargets/${targetId}`),state=await tx.get(`${base(s)}/fieldStates/${targetId}`),old=await tx.get(`${base(s)}/installationRepairProfiles/${targetId}`);
 requireThat(t?.publicationState==='PUBLISHED'&&validSoInstallation(t)&&state&&!state.activeActionId,'FIELD_UNAVAILABLE');let next;
 if(action==='configureInstallationRepair'){
  requireThat((old?.revision??0)===input.revision,'STALE_REVISION');requireThat(Number.isInteger(input.minLevel)&&input.minLevel>=1&&input.minLevel<=5&&Number.isInteger(input.threshold)&&input.threshold>=1&&input.threshold<=10000,'SO_INSTALLATION_REPAIR');
  const parts=await tx.get(`${base(s)}/items/${documentId(input.partsItemId)}`);requireThat(parts?.versionId===s.versionId&&parts.kind==='STACKABLE'&&parts.consumable&&parts.usage!=='FUEL'&&!parts.laserRecharge&&!parts.shipModule,'FIELD_REFERENCE');
  requireThat(Array.isArray(input.bonusItems??[])&&(input.bonusItems??[]).length<=20,'SO_INSTALLATION_REPAIR');for(const itemId of input.bonusItems??[]){const i=await tx.get(`${base(s)}/items/${documentId(itemId)}`);requireThat(i?.versionId===s.versionId&&!i.consumable&&!i.shipModule&&!i.droidModule,'FIELD_REFERENCE');}
  const profile=fieldProfile({skillId:'MEC-02',minLevel:input.minLevel,durationSeconds:300,durationByLevel:{},cost:1,cooldownSeconds:600,test:'D6',threshold:input.threshold,consumable:{itemId:parts.id,quantity:2},bonusItems:(input.bonusItems??[]).map(itemId=>({itemId,bonus:1})),instructions:'Réparer la panne durable : 5 minutes, 1 PA, 2 pièces consommées au jet même en cas d’échec. La neutralisation temporaire reste distincte. Intervention fictive, sans manipuler de dispositif réel.',successText:'Panne durable réparée ; les autres effets restent inchangés.',failureText:'La panne demeure ; les deux pièces et le PA sont consommés.'},'REPAIR_DURABLE');
  next={id:targetId,revision:(old?.revision??0)+1,targetRevision:t.revision,profile};tx.set(`${base(s)}/installationRepairProfiles/${targetId}`,next);
 }else{
  requireThat(action==='damageInstallation'&&old?.targetRevision===t.revision,'SO_INSTALLATION_REPAIR');requireThat(state.revision===input.revision,'STALE_REVISION');requireThat(!state.durableFailure,'MAINTENANCE_NOT_NEEDED');
  next={...state,status:'OFFLINE',durableFailure:{id,at},revision:state.revision+1};tx.set(`${base(s)}/fieldStates/${targetId}`,next);
 }
 tx.set(`${base(s)}/audit/${id}`,{id,at,action,actorUid:actor.uid,targetId,reason:input.reason.trim(),before:action==='configureInstallationRepair'?old:state,after:next});return {id:targetId,revision:next.revision};
}
export async function installationRepairTarget(tx,s,t,state){
 if(t?.kind!=='INSTALLATION'||!state?.durableFailure)return t;requireThat(ready(s),'SO_GAMEPLAY_NOT_OPEN');const config=await tx.get(`${base(s)}/installationRepairProfiles/${t.id}`);requireThat(config?.targetRevision===t.revision,'SO_INSTALLATION_REPAIR');return {...t,profiles:{...t.profiles,REPAIR_DURABLE:config.profile},durableWork:{configRevision:config.revision,failureId:state.durableFailure.id}};
}
