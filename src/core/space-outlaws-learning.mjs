import {createHash} from 'node:crypto';
import {documentId,requireThat,whole,DomainError} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {readSoEntryVersion} from './space-outlaws-entry.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {actionPointPath} from './action-point-state.mjs';
import {admissionClasses} from '../shared/admission-rules.mjs';
import {soLearningCatalogue,learningSkill,learningCost,learningAbilityProfile} from '../shared/space-outlaws-learning.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>hash(JSON.stringify(canonical(v)));
const regPath=(sid,uid)=>`sessions/${sid}/registrations/${hash(uid)}`;
const reads=['mySoLearning','soLearningAdmin','prepareSoLearning'];
export const soLearningActions=[...reads,'learnSoSkill','authorizeSoLearning'];
const windowOpen=s=>s.stage==='BRIEFING'&&s.campaignEpisode>1&&!!s.previousSessionId&&s.clock.runningSince===null&&!s.safetyStop?.active;
const busy=c=>['activeFieldActionId','activePersonActionId','activeAidId','activeNavigationId','activeMaintenanceId','activeCargoId','activeVoyageId'].some(k=>c[k]);

function profileOf(c){
 const p=c.spaceOutlawsSkills;
 requireThat(p&&admissionClasses.some(x=>x.id===p.classId)&&Array.isArray(p.skills)&&p.skills.length>=3&&p.skills.length<=8,'SO_LEARNING_PROFILE');
 requireThat(new Set(p.skills.map(x=>x.id)).size===p.skills.length,'SO_LEARNING_PROFILE');
 for(const k of p.skills){const def=learningSkill(k.id);requireThat(def&&k.kind===def.kind&&(k.kind==='FIXED'?k.level===null:Number.isSafeInteger(k.level)&&k.level>=1&&k.level<=5),'SO_LEARNING_PROFILE');
  requireThat(def.classId===p.classId?k.source==='CLASS':['INITIATION','LEARNED'].includes(k.source)&&!def.classOnly,'SO_LEARNING_PROFILE');}
 requireThat(soLearningCatalogue.filter(k=>k.classId===p.classId).every(k=>p.skills.some(s=>s.id===k.id)),'SO_LEARNING_PROFILE');
 const count=p.skills.filter(k=>k.source!=='CLASS').length;requireThat(count<=5&&count===p.secondarySlotsUsed,'SO_LEARNING_PROFILE');
 requireThat(c.abilityProfile?.published&&c.abilityProfile.skills.length===p.skills.length&&p.skills.every(k=>c.abilityProfile.skills.some(s=>s.id===k.id&&s.kind==='PASSIVE'&&s.level===(k.level??1))),'SO_LEARNING_PROFILE');
 whole(c.xp??0);return p;
}
function choice(c,r,s,skillId,replaceId=null,{approval=false,ignoreXp=false}={}){
 const p=profileOf(c),def=learningSkill(skillId);requireThat(def,'INVALID_ADMISSION_CHOICE');
 requireThat(!def.classOnly||def.classId===p.classId,'SO_LEARNING_CLASS_ONLY');
 const old=p.skills.find(k=>k.id===def.id),removed=replaceId?p.skills.find(k=>k.id===replaceId):null;
 if(replaceId)requireThat(removed&&removed.source!=='CLASS'&&!old,'SO_LEARNING_RETRAIN');
 requireThat(!old||old.kind==='EVOLVING'&&old.level<5,'SO_LEARNING_MAX');
 if(def.rare)requireThat(c.learningUnlocks?.[def.id]?.unlocked===true,'SO_LEARNING_RARE');
 const next={id:def.id,name:def.name,source:old?.source??(def.classId===p.classId?'CLASS':'LEARNED'),kind:def.kind,level:def.kind==='FIXED'?null:old?old.level+1:1};
 const skills=p.skills.filter(k=>k.id!==def.id&&k.id!==replaceId).concat(next),secondarySlotsUsed=skills.filter(k=>k.source!=='CLASS').length;
 requireThat(secondarySlotsUsed<=5,'SO_LEARNING_FULL');
 for(const k of skills)for(const required of learningSkill(k.id).prerequisites)requireThat(skills.some(x=>x.id===required.id&&(x.level??1)>=required.level),'SO_LEARNING_PREREQUISITE');
 if(replaceId&&!approval){const a=r.progression?.retraining;requireThat(a?.sessionId===s.id&&a.characterId===c.id&&a.from===replaceId&&a.to===skillId&&a.profileDigest===digest(p),'SO_LEARNING_RETRAIN');}
 const cost=learningCost(def,next.level);if(!ignoreXp)requireThat((c.xp??0)>=cost,'SO_LEARNING_XP');
 return {skill:{id:def.id,name:def.name,kind:def.kind,level:next.level},previousLevel:old?.level??null,replaced:removed?{id:removed.id,name:removed.name,level:removed.level}:null,cost,xpBefore:c.xp??0,xpAfter:(c.xp??0)-cost,profile:{...p,skills,secondarySlotsUsed}};
}
function currentRegistration(r){requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&r.admission?.status==='APPROVED','FORBIDDEN');}
function projection(s,r,c,admin=false){
 const p=profileOf(c),used=r.progression?.learningSessionId===s.id,dead=c.survival?.dead===true;
 const blocked=dead?'SO_LEARNING_DEAD':!windowOpen(s)?'SO_LEARNING_CLOSED':used?'SO_LEARNING_USED':null;
 const options=soLearningCatalogue.filter(k=>!k.classOnly).map(k=>{
  try {const x=choice(c,r,s,k.id);return {id:k.id,name:k.name,rare:k.rare,kind:k.kind,cost:x.cost,level:x.skill.level,blocked};}
  catch(e){if(!(e instanceof DomainError))throw e;return {id:k.id,name:k.name,rare:k.rare,kind:k.kind,blocked:blocked??e.code};}
 });
 const a=r.progression?.retraining;
 return {characterId:c.id,name:c.public.displayName,xp:c.xp??0,earnedXp:c.earnedXp??0,inheritedXp:c.inheritedXp??0,secondarySlotsUsed:p.secondarySlotsUsed,skills:p.skills,blocked,options,
  retraining:a?.sessionId===s.id&&a.characterId===c.id&&a.profileDigest===digest(p)?{from:a.from,to:a.to}:null,
  unlocked:Object.keys(c.learningUnlocks??{}).filter(id=>learningSkill(id)?.rare&&c.learningUnlocks[id].unlocked),
  ...(admin?{uid:r.uid}:{}),lastLearning:r.progression?.lastLearning?.characterId===c.id?r.progression.lastLearning:null};
}

export function createSoLearningService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);const sid=documentId(input.sessionId),read=reads.includes(action),admin=['soLearningAdmin','authorizeSoLearning'].includes(action);
  const requestId=read?null:documentId(input.requestId);
  return store.runTransaction(async tx=>{
   const at=now(),s=admin?await checkSession(tx,actor,sid,'content',true):await tx.get(`sessions/${sid}`);
   requireThat(s?.spaceOutlaws?.learningVersion===1,'SO_GAMEPLAY_NOT_OPEN');
   const campaign=await tx.get(`campaigns/${s.campaignId}`);
   requireThat(campaign?.activeSessionId===sid&&!campaign.activeBuildId&&!s.campaignSealed,'SO_LEARNING_CLOSED');
   const version=await readSoEntryVersion(tx,campaign);
   requireThat(version.header.learningVersion===1&&version.header.id===s.versionId,'SO_GAMEPLAY_NOT_OPEN');
   if(action==='soLearningAdmin'){
    admissionKeys(input,['sessionId']);const registrations=await tx.list(`sessions/${sid}/registrations`,null,{limit:1001});
    requireThat(registrations.length<=1000,'SO_RELEASE_LIMIT');const people=[];
    for(const r of registrations.filter(r=>r.status==='ACCEPTED'&&r.accessActive&&r.characterId)){
     const c=await tx.get(`sessions/${sid}/characters/${r.characterId}`);
     if(c?.assignedUid===r.uid&&!c.survival?.dead)people.push(projection(s,r,c,true));
    }
    return {session:{id:sid,title:s.title},open:windowOpen(s),people,catalogue:soLearningCatalogue.filter(k=>!k.classOnly)};
   }
   const uid=admin?documentId(input.uid):actor.uid,r=await tx.get(regPath(sid,uid));currentRegistration(r);
   if(!admin)requireThat(actor.authTime>=r.minAuthTime,'FORBIDDEN');
   const c=await tx.get(`sessions/${sid}/characters/${r.characterId}`);requireThat(c?.assignedUid===uid,'FORBIDDEN');
   if(action==='mySoLearning'){admissionKeys(input,['sessionId']);return {session:{id:sid,title:s.title},...projection(s,r,c)};}
   admissionKeys(input,['sessionId','characterId','skillId','replaceId',...(admin?['uid','kind','reason']:[]),...(read?[]:['requestId',...(admin?[]:['confirmation'])])]);
   requireThat(documentId(input.characterId)===c.id,'SO_LEARNING_STALE');
   const skillId=documentId(input.skillId),replaceId=input.replaceId?documentId(input.replaceId):null;
   const op=requestId?`operations/${hash(`${actor.uid}:${requestId}`)}`:null,fingerprint=digest([action,input]),prior=op?await tx.get(op):null;
   // Current session, identity and access always precede the receipt.
   if(prior){requireThat(prior.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(prior.accessVersion===r.accessVersion,'FORBIDDEN');return prior.result;}
   requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(windowOpen(s),'SO_LEARNING_CLOSED');
   requireThat(!c.survival?.dead,'SO_LEARNING_DEAD');const profile=profileOf(c);
   let result,next=c,nextR=r,event;
   if(admin){
    const reason=admissionText(input.reason,500,true);requireThat(['RARE','RETRAIN'].includes(input.kind),'INVALID_ADMISSION_CHOICE');
    if(input.kind==='RARE'){
     requireThat(!replaceId&&learningSkill(skillId)?.rare,'INVALID_ADMISSION_CHOICE');
     if(c.learningUnlocks?.[skillId]?.unlocked)result={characterId:c.id,skillId,unlocked:true};
     else {next={...c,learningUnlocks:{...c.learningUnlocks,[skillId]:{unlocked:true,at,actorUid:actor.uid,reason}}};result={characterId:c.id,skillId,unlocked:true};}
    }else{
     requireThat(r.progression?.learningSessionId!==sid,'SO_LEARNING_USED');requireThat(replaceId,'SO_LEARNING_RETRAIN');
     choice(c,r,s,skillId,replaceId,{approval:true,ignoreXp:true});
     nextR={...r,progression:{...r.progression,retraining:{sessionId:sid,characterId:c.id,from:replaceId,to:skillId,profileDigest:digest(profile),at,actorUid:actor.uid,reason}}};
     result={characterId:c.id,from:replaceId,to:skillId,approved:true};
    }
    event={kind:input.kind==='RARE'?'SO_LEARNING_UNLOCK':'SO_LEARNING_RETRAIN_APPROVED',reason,skillId,replaceId};
   }else{
    requireThat(r.progression?.learningSessionId!==sid,'SO_LEARNING_USED');
    const points=replaceId?await tx.get(actionPointPath(sid,c.id)):null;
    if(replaceId)requireThat(!busy(c)&&!points?.reserved,'SO_LEARNING_BUSY');
    const p=choice(c,r,s,skillId,replaceId),confirmation=digest([actor.uid,s,version.header.manifestDigest,r,c,points,skillId,replaceId]);
    const {profile:nextProfile,...preview}=p;
    if(read)return {...preview,characterId:c.id,name:c.public.displayName,secondarySlotsUsed:nextProfile.secondarySlotsUsed,confirmation};
    requireThat(input.confirmation===confirmation,'SO_LEARNING_STALE');
    next={...c,xp:p.xpAfter,spaceOutlawsSkills:nextProfile,abilityProfile:learningAbilityProfile(nextProfile,c.abilityProfile)};
    result={characterId:c.id,skill:p.skill,cost:p.cost,xp:p.xpAfter,replaced:p.replaced};
    nextR={...r,progression:{...r.progression,learningSessionId:sid,lastLearning:{sessionId:sid,...result},retraining:null}};
    event={kind:'SO_LEARNING',skillId,replaceId,cost:p.cost,xpBefore:p.xpBefore,xpAfter:p.xpAfter,before:profile,after:nextProfile};
   }
   authorizeSpaceOutlaws(tx,s,'LEARNING');const id=uuid(),base=`sessions/${sid}`;
   if(next!==c)tx.set(`${base}/characters/${c.id}`,next);
   if(nextR!==r)tx.set(regPath(sid,uid),nextR);
   const record={id,at,actorUid:actor.uid,characterId:c.id,sessionId:sid,...event};
   tx.set(`${base}/characters/${c.id}/history/${id}`,record);tx.set(`${base}/audit/${id}`,record);
   tx.set(op,{fingerprint,accessVersion:r.accessVersion,result,at});return result;
  });
 };
}
