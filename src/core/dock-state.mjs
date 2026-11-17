import {abilityLevel} from './abilities.mjs';
import {documentId,requireThat} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';
import {gameTime} from './clock.mjs';
import {localAuthorization,localBindingId} from './contextual-access.mjs';
import {warehouseAccess,storageGroups} from './storage-state.mjs';

export function dockInput(input,old){
 if(input==null){requireThat(!old,'INVALID_DOCK');return null;}
 admissionKeys(input,['mode','securityTier','intrusionTargetId','revealFields','theftEnabled','physical']);
 requireThat(['RENT','OWN'].includes(input.mode)&&Number.isInteger(input.securityTier)&&input.securityTier>=1&&input.securityTier<=5,'INVALID_DOCK');
 requireThat(typeof input.theftEnabled==='boolean'&&typeof input.physical==='boolean'&&Array.isArray(input.revealFields),'INVALID_DOCK');
 const allowed=['name','quantity','legality'];requireThat(input.revealFields.every(x=>allowed.includes(x))&&new Set(input.revealFields).size===input.revealFields.length,'INVALID_DOCK');
 requireThat(!old||old.mode===input.mode,'DOCK_TITLE_LOCKED');
 return {schemaVersion:1,mode:input.mode,securityTier:input.securityTier,intrusionTargetId:input.intrusionTargetId?documentId(input.intrusionTargetId):null,revealFields:input.revealFields,theftEnabled:input.theftEnabled,physical:input.physical};
}
export const dockLeaseActive=(w,time)=>!!w.tenantId&&(w.dock?.mode==='OWN'||time<w.expiresAtGameMs);
export async function dockMandates(tx,s,c,w){
 return warehouseAccess(w,c.id,storageGroups(s,await tx.list(`sessions/${s.id}/groups`),c.id,{factionStock:true}));
}
// Presence is always required. A successful INF-01 only bypasses the lock,
// never any native warehouse, lot or vessel mandate.
export async function dockEntry(tx,ctx,w,at,{forceOnly=false}={}){
 const {s,c,version}=ctx,time=gameTime(s.clock,at),b=`localAccess/${s.id}`;
 requireThat(w?.dock?.schemaVersion===1&&w.portId===(c.spacePortId??s.transportRules?.homePort),'DOCK_NOT_LOCAL');
 const binding=await tx.get(`${b}/bindings/${localBindingId('dockEntry',w.id)}`),t=binding?await tx.get(`${b}/terminals/${binding.terminalId}`):null,p=await tx.get(`${b}/presence/${c.id}`);
 requireThat(binding?.active&&t?.active&&t.portId===w.portId,'LOCAL_TERMINAL_CLOSED');
 requireThat(p&&p.terminalId===t.id&&p.terminalRevision===t.revision&&p.characterVersion===version&&p.expiresGameMs>time,'LOCAL_SCAN_REQUIRED');
 const rule=t.operations.find(o=>o.action==='dockEntry'&&o.resourceId===w.id);requireThat(rule,'FORBIDDEN');
 requireThat(!rule.characterIds.length||rule.characterIds.includes(c.id),'FORBIDDEN');requireThat(!rule.skillId||abilityLevel(c,rule.skillId)>=rule.minLevel,'LOCAL_SKILL_REQUIRED');
 if(!forceOnly){
  try{requireThat(rule.credentialIds?.length>0,'LOCAL_CREDENTIAL_REQUIRED');await localAuthorization(tx,ctx,'dockEntry',w.id,at);return {terminalId:t.id,method:'CREDENTIAL'};}catch(e){if(e.code!=='LOCAL_CREDENTIAL_REQUIRED')throw e;}
 }
 const target=w.dock.intrusionTargetId?await tx.get(`sessions/${s.id}/fieldTargets/${w.dock.intrusionTargetId}`):null;
 const rows=target?.publicationState==='PUBLISHED'&&target.intrusion?.minLevel===w.dock.securityTier?await tx.list(`sessions/${s.id}/inf01Actions`,['characterId',c.id],{limit:1001}):[];
 requireThat(rows.length<=1000,'SO_RELEASE_LIMIT');
 const a=rows.find(a=>a.targetId===target.id&&a.targetRevision===target.revision&&a.accessVersion===ctx.r.accessVersion&&a.status==='SUCCESS'&&a.finishedAtGameMs<=time&&a.finishedAtGameMs+600000>time&&a.level>=w.dock.securityTier);
 requireThat(a,'LOCAL_CREDENTIAL_REQUIRED');return {terminalId:t.id,method:'INF01',expiresGameMs:a.finishedAtGameMs+600000};
}
export async function dockIntrusionGuard(tx,ctx,tid,at){
 const cells=(await tx.list(`sessions/${ctx.s.id}/warehouses`)).filter(w=>w.dock?.intrusionTargetId===tid);
 requireThat(cells.length<=1,'INVALID_DOCK');if(!cells.length)return;
 const w=cells[0],target=await tx.get(`sessions/${ctx.s.id}/fieldTargets/${tid}`);
 requireThat(target?.publicationState==='PUBLISHED'&&target.intrusion?.minLevel===w.dock.securityTier,'INVALID_DOCK');
 const b=`localAccess/${ctx.s.id}`,binding=await tx.get(`${b}/bindings/${localBindingId('dockEntry',w.id)}`),t=binding?await tx.get(`${b}/terminals/${binding.terminalId}`):null,p=await tx.get(`${b}/presence/${ctx.c.id}`);
 requireThat(binding?.active&&t?.active&&t.portId===w.portId&&w.portId===(ctx.c.spacePortId??ctx.s.transportRules?.homePort),'DOCK_NOT_LOCAL');
 requireThat(p?.terminalId===t.id&&p.terminalRevision===t.revision&&p.characterVersion===ctx.version&&p.expiresGameMs>gameTime(ctx.s.clock,at),'LOCAL_SCAN_REQUIRED');
 requireThat(abilityLevel(ctx.c,'INF-01')>=w.dock.securityTier,'SO_INF01_SKILL');
}
