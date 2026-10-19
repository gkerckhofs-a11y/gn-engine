import {createHash} from 'node:crypto';
import {requireThat,documentId,whole} from './validation.mjs';
import {recordPublication} from './narrative.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const text=(v,max,required=false)=>{
  requireThat(typeof v==='string' && v.length<=max && (!required||v.trim()),'INVALID_ABILITY');return v.trim();
};
const publication=v=>{requireThat(['DRAFT','READY','PUBLISHED'].includes(v),'INVALID_ABILITY');return v;};
const levels=(value,allowZero=false)=>{
  requireThat(Array.isArray(value) && value.length<=60,'INVALID_ABILITY');
  const result=value.map(x=>{requireThat(x && typeof x==='object','INVALID_ABILITY');const level=whole(x.level,'INVALID_ABILITY');requireThat(allowZero||level>0,'INVALID_ABILITY');return {skillId:documentId(x.skillId),level};});
  requireThat(new Set(result.map(x=>x.skillId)).size===result.length,'DUPLICATE_ABILITY');
  return result.sort((a,b)=>a.skillId.localeCompare(b.skillId));
};
export function skillInput(input,id,old={}){
  // Only passive expertise is executable in this release. Unknown kinds are never treated as passive.
  requireThat(input.kind==='PASSIVE','UNSUPPORTED_ABILITY');
  return {id,kind:'PASSIVE',name:text(input.name,150,true),description:text(input.description??'',6000),
    instructions:text(input.instructions??'',6000),category:text(input.category??'',150),
    gmNotes:text(input.gmNotes??'',10000),publicationState:publication(input.publicationState),revision:(old.revision??0)+1};
}
export function classInput(input,id,old={}){
  return {id,name:text(input.name,150,true),description:text(input.description??'',6000),gmNotes:text(input.gmNotes??'',10000),
    publicationState:publication(input.publicationState),skills:levels(input.skills??[]),revision:(old.revision??0)+1};
}
// Player projections contain only the confirmed snapshot, never catalog notes or override choices.
export function playerAbilities(profile){
  if(!profile?.published)return null;
  return {className:profile.class?.name??'',classDescription:profile.class?.description??'',
    skills:profile.skills.map(s=>({id:s.id,name:s.name,description:s.description,instructions:s.instructions,
      category:s.category,kind:s.kind,level:s.level,revision:s.revision}))};
}
export function abilityLevel(character,skillId){
  return playerAbilities(character.abilityProfile)?.skills.find(s=>s.id===skillId)?.level??0;
}
const writes=new Set(['saveSkill','saveSessionSkill','saveClass','saveSessionClass','setAbilityProfile']);
export const abilityAction=a=>writes.has(a)||['prepareAbilityProfile','abilityHistory'].includes(a);

export function createAbilityService({store,signed,checkSession,checkScenario,now,uuid}){
  const context=async(tx,actor,input)=>{
    requireThat(!!input.sessionId!==!!input.scenarioId,'INVALID_ABILITY');
    const session=!!input.sessionId,id=documentId(session?input.sessionId:input.scenarioId);
    const parent=session?await checkSession(tx,actor,id):await checkScenario(tx,actor,id);
    return {session,parent,base:`${session?'sessions':'scenarios'}/${id}`};
  };
  const profile=async(tx,base,input)=>{
    const cid=documentId(input.characterId),c=await tx.get(`${base}/characters/${cid}`);requireThat(c,'NOT_FOUND');
    requireThat(typeof input.published==='boolean','INVALID_ABILITY');
    const classId=input.classId?documentId(input.classId):null,overrides=levels(input.overrides??[],true);
    const model=classId?await tx.get(`${base}/classes/${classId}`):null;
    requireThat(!classId||model?.publicationState==='PUBLISHED','ABILITY_UNPUBLISHED');
    const picked=new Map((model?.skills??[]).map(x=>[x.skillId,x.level]));
    for(const x of overrides){
      requireThat(await tx.get(`${base}/skills/${x.skillId}`),'INVALID_ABILITY_REFERENCE');
      if(x.level===0)picked.delete(x.skillId);else picked.set(x.skillId,x.level);
    }
    requireThat(picked.size<=60,'INVALID_ABILITY');const skills=[];
    for(const [id,level] of [...picked].sort(([a],[b])=>a.localeCompare(b))){
      const s=await tx.get(`${base}/skills/${id}`);
      requireThat(s?.publicationState==='PUBLISHED' && s.kind==='PASSIVE','ABILITY_UNPUBLISHED');
      skills.push({id,name:s.name,description:s.description,instructions:s.instructions,category:s.category,kind:s.kind,revision:s.revision,level});
    }
    const next={revision:(c.abilityProfile?.revision??0)+1,published:input.published,
      class:model?{id:model.id,name:model.name,description:model.description,revision:model.revision}:null,
      skills,choices:{classId,overrides}};
    return {c,next};
  };
  const confirmation=(parent,c,next)=>hash(JSON.stringify([parent.revision,c.id,c.contentRevision,next]));
  return async(action,actor,input)=>{
    signed(actor);const at=now(),newId=uuid();
    if(!writes.has(action))return store.runTransaction(async tx=>{
      const {parent,base}=await context(tx,actor,input);
      if(action==='abilityHistory'){
        const kind=input.kind;requireThat(['skills','classes','characters'].includes(kind),'INVALID_ABILITY');
        const id=documentId(input.id);requireThat(await tx.get(`${base}/${kind}/${id}`),'NOT_FOUND');
        return {versions:await tx.list(`${base}/${kind}/${id}/abilityHistory`,null,{orderBy:'at',direction:'desc',limit:30})};
      }
      requireThat(parent.stage!=='ARCHIVED','SESSION_CLOSED');
      requireThat(parent.revision===input.revision,'STALE_REVISION');
      const {c,next}=await profile(tx,base,input);
      return {characterId:c.id,characterName:c.public.displayName,revision:parent.revision,
        before:c.abilityProfile??null,after:next,confirmation:confirmation(parent,c,next)};
    });
    const requestId=documentId(input.requestId),path=`operations/${hash(`${actor.uid}:${requestId}`)}`,fingerprint=hash(JSON.stringify([action,input]));
    return store.runTransaction(async tx=>{
      const {parent,base,session}=await context(tx,actor,input);
      requireThat(parent.stage!=='ARCHIVED','SESSION_CLOSED');
      if(action!=='setAbilityProfile')requireThat(session===action.startsWith('saveSession'),'INVALID_ABILITY');
      const previous=await tx.get(path);
      if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
      requireThat(parent.revision===input.revision,'STALE_REVISION');
      const reason=session?text(input.reason,500,true):'Édition du scénario';
      let result,historyPath,before,after,kind,id,characterNext;
      if(action==='setAbilityProfile'){
        const {c,next}=await profile(tx,base,input);
        requireThat(typeof input.confirmation==='string' && input.confirmation===confirmation(parent,c,next),'STALE_REVISION');
        id=c.id;kind='characters';before=c.abilityProfile??null;after=next;
        characterNext={...c,abilityProfile:next,contentRevision:(c.contentRevision??1)+1,historyStarted:true};
        // No further reads after this publication snapshot is written.
        recordPublication(tx,`${base}/characters`,c,characterNext,{id:newId,at,actorUid:actor.uid,reason,stage:parent.stage??null});
        tx.set(`${base}/characters/${id}`,characterNext);result={id,revision:next.revision};
      }else{
        const skill=action==='saveSkill'||action==='saveSessionSkill';kind=skill?'skills':'classes';
        id=input.id?documentId(input.id):newId;before=input.id?await tx.get(`${base}/${kind}/${id}`):null;
        if(input.id)requireThat(before,'NOT_FOUND');
        after=skill?skillInput(input,id,before??{}):classInput(input,id,before??{});
        if(!skill)for(const x of after.skills){
          const s=await tx.get(`${base}/skills/${x.skillId}`);requireThat(s,'INVALID_ABILITY_REFERENCE');
          requireThat(after.publicationState!=='PUBLISHED'||s.publicationState==='PUBLISHED','ABILITY_UNPUBLISHED');
        }
        tx.set(`${base}/${kind}/${id}`,after);result={id,revision:after.revision};
      }
      historyPath=`${base}/${kind}/${id}/abilityHistory/${newId}`;
      const audit={id:newId,action,at,actorUid:actor.uid,actorEmail:actor.email,reason,kind,targetId:id,before,after};
      tx.set(historyPath,audit);tx.set(base,{...parent,revision:parent.revision+1});
      if(session)tx.set(`${base}/audit/${newId}`,{id:newId,action,at,actorUid:actor.uid,reason,kind,targetId:id,...(characterNext?{characterId:id}:{}),beforeRevision:before?.revision??0,afterRevision:after.revision});
      tx.set(path,{uid:actor.uid,fingerprint,result,at});return result;
    });
  };
}
