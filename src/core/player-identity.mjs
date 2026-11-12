import {requireThat,documentId} from './validation.mjs';
import {mediaHash} from './media-state.mjs';
import {admissionClasses} from '../shared/admission-rules.mjs';

export async function playerIdentityContext(tx,actor,sid,{editing=false}={}){
 const s=await tx.get(`sessions/${documentId(sid)}`);
 requireThat(s&&!s.campaignSealed&&['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'FORBIDDEN');
 const r=await tx.get(`sessions/${sid}/registrations/${mediaHash(actor.uid)}`);
 requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&actor.authTime>=r.minAuthTime,'FORBIDDEN');
 const c=await tx.get(`sessions/${sid}/characters/${r.characterId}`);
 requireThat(c?.assignedUid===actor.uid&&c.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED'&&!c.survival?.dead,'FORBIDDEN');
 if(editing)requireThat(!s.safetyStop?.active&&(!s.spaceOutlaws||s.spaceOutlaws.mediaVersion===1),'FORBIDDEN');
 return {s,c,r};
}
export const identityCommands=['playerDirectory','playerDirectorySettings','savePlayerDirectorySettings'];
export function createPlayerIdentityService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);const sid=documentId(input.sessionId),path=`playerDirectorySettings/${sid}`;
  return store.runTransaction(async tx=>{
   if(action==='playerDirectory'){
    const {s,c}=await playerIdentityContext(tx,actor,sid),settings=await tx.get(path);
    const classId=c.birth?.classId??c.abilityProfile?.class?.id;
    requireThat(settings?.classIds?.includes(classId),'DIRECTORY_FORBIDDEN');
    const [characters,registrations]=await Promise.all([tx.list(`sessions/${sid}/characters`),tx.list(`sessions/${sid}/registrations`)]);
    const rows=characters.filter(x=>x.publicationState==='PUBLISHED'&&x.public?.publicationState==='PUBLISHED'&&!x.survival?.dead&&registrations.some(r=>r.characterId===x.id&&r.uid===x.assignedUid&&r.status==='ACCEPTED'&&r.accessActive));
    return {sessionId:s.id,characters:rows.map(x=>({id:x.id,name:x.public.displayName,profession:x.public.profession??'',description:x.public.description??'',...(x.mediaImages?.portrait?{portrait:x.mediaImages.portrait}:{})})).sort((a,b)=>a.name.localeCompare(b.name,'fr'))};
   }
   const s=await checkSession(tx,actor,sid,'content');requireThat(!s.campaignSealed&&s.stage!=='ARCHIVED','SESSION_CLOSED');
   const old=await tx.get(path)??{revision:0,classIds:[]};
   if(action==='playerDirectorySettings')return {sessionId:sid,revision:old.revision,classIds:old.classIds,classes:admissionClasses.map(({id,label})=>({id,label}))};
   const op=`playerDirectoryOperations/${mediaHash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=JSON.stringify([sid,input.revision,input.classIds]),previous=await tx.get(op);
   if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
   requireThat(input.revision===old.revision,'STALE_REVISION');
   requireThat(Array.isArray(input.classIds)&&input.classIds.length<=8&&new Set(input.classIds).size===input.classIds.length&&input.classIds.every(id=>admissionClasses.some(c=>c.id===id)),'INVALID_DIRECTORY_CLASSES');
   const next={revision:old.revision+1,classIds:[...input.classIds].sort(),sessionId:sid,updatedBy:actor.uid,updatedAt:now()};
   tx.set(path,next);tx.set(`${path}/history/${uuid()}`,{...next,before:old.classIds});
   const result={revision:next.revision};tx.set(op,{fingerprint,result});return result;
  });
 };
}
