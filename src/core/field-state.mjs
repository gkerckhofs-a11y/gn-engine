import {tracePolicyInput} from './fictional-trace-state.mjs';
import {documentId,requireThat,whole} from './validation.mjs';
import {createHash} from 'node:crypto';
import {gameTime} from './clock.mjs';
import {isDeepStrictEqual} from 'node:util';
import {analysisProfile} from '../shared/space-outlaws-analysis.mjs';
import {isPlaceSearch,searchTargetInput,initialSearchState} from './space-outlaws-search-state.mjs';

const check=v=>requireThat(v,'INVALID_FIELD_TARGET');
const text=(v,max,required=false)=>{check(typeof v==='string'&&v.length<=max&&(!required||v.trim()));return v.trim();};
const num=(v,max=1000000)=>{whole(v,'INVALID_FIELD_TARGET');check(v<=max);return v;};
export const fieldKinds=['SEARCH','SABOTAGE','REPAIR','ANALYZE'];
const normalizeIntrusionCode=code=>{
 check(typeof code==='string');
 const value=code.normalize('NFKC').trim().toUpperCase().replace(/\s+/g,' ');
 check(value.length>=4&&value.length<=64&&/^[\p{L}\p{N} -]+$/u.test(value));
 return value;
};
export const intrusionAnswerDigest=code=>createHash('sha256').update(normalizeIntrusionCode(code)).digest('hex');

export function codeChallengeInput(inputChallenge,oldChallenge){
  check(inputChallenge===undefined||inputChallenge&&typeof inputChallenge==='object'&&!Array.isArray(inputChallenge));
  let challenge;
  if(inputChallenge){
   check(inputChallenge.type==='CODE'&&Object.keys(inputChallenge).every(key=>['type','prompt','durationSeconds','answerCode','answerDigest'].includes(key)));
   const supplied=typeof inputChallenge.answerCode==='string'&&inputChallenge.answerCode.trim()?intrusionAnswerDigest(inputChallenge.answerCode):null;
   const answerDigest=supplied??inputChallenge.answerDigest??oldChallenge?.answerDigest;
   check(typeof answerDigest==='string'&&/^[a-f0-9]{64}$/.test(answerDigest));
   const durationSeconds=num(inputChallenge.durationSeconds,3600);
   check(durationSeconds>0);
   challenge={type:'CODE',prompt:text(inputChallenge.prompt,3000,true),durationSeconds,answerDigest};
  }
  return challenge;
}

export function fieldProfile(v,kind){
 check(v&&typeof v==='object'&&!Array.isArray(v));check(Array.isArray(v.bonusItems??[]));const skillId=v.skillId?documentId(v.skillId):null;
 const durationByLevel={};check(Object.keys(v.durationByLevel??{}).length<=20);
 for(const [level,seconds] of Object.entries(v.durationByLevel??{})){check(/^[1-9]\d*$/.test(level));durationByLevel[level]=num(seconds,86400);}
 check(['AUTO','D6'].includes(v.test));const bonusItems=(v.bonusItems??[]).map(x=>{check(x&&typeof x==='object');return {itemId:documentId(x.itemId),bonus:num(x.bonus,2)};});
 check(bonusItems.length<=20&&new Set(bonusItems.map(x=>x.itemId)).size===bonusItems.length);
 const consumable=v.consumable?{itemId:documentId(v.consumable.itemId),quantity:num(v.consumable.quantity)}:null;check(!consumable||consumable.quantity>0);
 const minLevel=num(v.minLevel??1,100);check(!skillId||minLevel>0);
 return {kind,skillId,minLevel,instructions:text(v.instructions??'',4000),durationSeconds:num(v.durationSeconds,86400),durationByLevel,
  test:v.test,threshold:num(v.threshold??0,10000),cost:v.cost==null?null:num(v.cost,1000),cooldownSeconds:v.cooldownSeconds==null?null:num(v.cooldownSeconds,86400),
  bonusItems,consumable,successText:text(v.successText??'',4000),failureText:text(v.failureText??'',4000)};
}
export function fieldTargetInput(v,id,old={}){
 const tracePolicy=tracePolicyInput(v?.tracePolicy);check(!tracePolicy||!v.documentOnly&&tracePolicy.actions.every(k=>({SEARCH:['SEARCH'],ANALYSIS:['ANALYZE'],INSTALLATION:['SABOTAGE','REPAIR'],INTRUSION:['INTRUSION'],FORGERY:['FORGERY']}[v.kind]??[]).includes(k)));return {...baseFieldTargetInput(v,id,old),...(tracePolicy?{tracePolicy}:{})};
}
function baseFieldTargetInput(v,id,old={}){
 if(isPlaceSearch(v))return searchTargetInput(v,id,old);
 if(v?.kind==='FORGERY'){
  check(['DRAFT','READY','PUBLISHED'].includes(v.publicationState));
  const x=v.forgery;
  check(x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>[
   'category','minLevel','threshold','blankItemId','documentTitle','documentText','anomalies','reviewTargetId'
  ].includes(k)));
  const categories={RECEIPT:1,MANIFEST:2,LICENSE:3,ORDER:4,EXCEPTIONAL:5};
  check(Object.hasOwn(categories,x.category));
  check(Number.isSafeInteger(x.minLevel)&&x.minLevel>=categories[x.category]&&x.minLevel<=5);
  check(Number.isSafeInteger(x.threshold)&&x.threshold>=2&&x.threshold<=12);
  check((v.rewards??[]).length===0&&Object.keys(v.profiles??{}).length===0&&!v.dependencyId);
  return {id,kind:'FORGERY',title:text(v.title,150,true),description:text(v.description??'',6000),
   gmNotes:text(v.gmNotes??'',10000),publicationState:v.publicationState,profiles:{},rewards:[],
   forgery:{...(x.reviewTargetId?{reviewTargetId:documentId(x.reviewTargetId)}:{}),category:x.category,minLevel:x.minLevel,threshold:x.threshold,
    blankItemId:documentId(x.blankItemId),documentTitle:text(x.documentTitle,150,true),
    documentText:text(x.documentText,6000,true),anomalies:text(x.anomalies??'',6000,true)},
   dependencyId:null,offlineSeconds:0,failureLockSeconds:0,repairProtectionSeconds:0,
   revision:(old.revision??0)+1};
 }
 if(v?.kind==='INTRUSION'){
  check(v.publicationState==='DRAFT'||v.publicationState==='READY'||v.publicationState==='PUBLISHED');
  check(v.intrusion&&typeof v.intrusion==='object'&&!Array.isArray(v.intrusion));
  const i=v.intrusion;
  check(Object.keys(i).every(k=>['category','minLevel','threshold','successText','failureText','challenge','bonusItemIds','consumable','hints'].includes(k)));
  const bonusItemIds=i.bonusItemIds??[];check(Array.isArray(bonusItemIds)&&bonusItemIds.length<=20&&new Set(bonusItemIds).size===bonusItemIds.length);bonusItemIds.forEach(documentId);
  const consumable=i.consumable?{itemId:documentId(i.consumable.itemId),quantity:num(i.consumable.quantity,1000)}:null;check(!consumable||consumable.quantity>0);
  const hints=i.hints??[];check(Array.isArray(hints)&&hints.length<=20);
  const preparedHints=hints.map(h=>{check(h&&Object.keys(h).every(k=>['id','minLevel','text'].includes(k)));check(Number.isSafeInteger(h.minLevel)&&h.minLevel>=3&&h.minLevel<=5);return {id:documentId(h.id),minLevel:h.minLevel,text:text(h.text,3000,true)};});
  check(new Set(preparedHints.map(h=>h.id)).size===preparedHints.length);
  check(i.challenge||preparedHints.length===0);check(!i.challenge||!bonusItemIds.length&&!consumable);

  check(['LOCK','SAFE','TERMINAL'].includes(i.category));
  check(Number.isSafeInteger(i.minLevel)&&i.minLevel>=1&&i.minLevel<=5);
  check(Number.isSafeInteger(i.threshold)&&i.threshold>=2&&i.threshold<=12);
  check((v.rewards??[]).length===0&&Object.keys(v.profiles??{}).length===0&&!v.dependencyId);
  const challenge=codeChallengeInput(i.challenge,old.intrusion?.challenge);
  return {id,kind:'INTRUSION',title:text(v.title,150,true),description:text(v.description??'',6000),
   gmNotes:text(v.gmNotes??'',10000),publicationState:v.publicationState,profiles:{},rewards:[],
   intrusion:{category:i.category,minLevel:i.minLevel,threshold:i.threshold,...(bonusItemIds.length?{bonusItemIds}:{}),...(consumable?{consumable}:{}),...(preparedHints.length?{hints:preparedHints}:{}),
    successText:text(i.successText,4000,true),failureText:text(i.failureText??'',4000),
    ...(challenge?{challenge}:{})},
   dependencyId:null,offlineSeconds:0,failureLockSeconds:challenge?0:num(v.failureLockSeconds??0,86400),repairProtectionSeconds:0,
   revision:(old.revision??0)+1};
 }

 check(v&&['SEARCH','INSTALLATION','ANALYSIS'].includes(v.kind));check(['DRAFT','READY','PUBLISHED'].includes(v.publicationState));
 check(v.profiles&&typeof v.profiles==='object'&&!Array.isArray(v.profiles));check(Array.isArray(v.rewards??[]));
 const analysis=v.kind==='ANALYSIS';
 check(v.laboratory===undefined||typeof v.laboratory==='boolean');if(v.laboratory)check(v.kind==='INSTALLATION');
 check(v.documentOnly===undefined||typeof v.documentOnly==='boolean');
 if(v.documentOnly)check(analysis&&v.profiles?.ANALYZE?.skillId==='TRA-03');
 const profiles={};for(const k of Object.keys(v.profiles??{})){check(analysis?k==='ANALYZE':v.kind==='SEARCH'?k==='SEARCH':['SABOTAGE','REPAIR'].includes(k));profiles[k]=fieldProfile(v.profiles[k],k);}
 check(analysis?!!profiles.ANALYZE:v.kind==='SEARCH'?!!profiles.SEARCH:!!profiles.SABOTAGE&&!!profiles.REPAIR);
 if(analysis){const p=profiles.ANALYZE,canonical=analysisProfile(p.skillId,p);check(canonical&&isDeepStrictEqual(p,fieldProfile(canonical,'ANALYZE')));}
 const rewards=(v.rewards??[]).map(r=>{check(r&&typeof r==='object');check(['CREDITS','ITEM','KNOWLEDGE'].includes(r.kind));const quantity=num(r.quantity??1),stock=num(r.stock??1),perCharacter=num(r.perCharacter??1,1000);check(quantity>0&&stock>0&&perCharacter>0);return {id:documentId(r.id),kind:r.kind,quantity,stock,perCharacter,itemId:r.kind==='ITEM'?documentId(r.itemId):null,knowledgeId:r.kind==='KNOWLEDGE'?documentId(r.knowledgeId):null};});
 if(analysis)for(let i=0;i<rewards.length;i++){
  const r=rewards[i],input=v.rewards[i];check(r.kind==='KNOWLEDGE'&&r.quantity===1&&r.stock===1&&r.perCharacter===1);
  check(Number.isInteger(input.minLevel)&&input.minLevel>=1&&input.minLevel<=5&&typeof input.bonus==='boolean');
  check(!input.bonus||profiles.ANALYZE.test==='D6');Object.assign(r,{minLevel:input.minLevel,bonus:input.bonus});
 }
 check(rewards.length<=20&&new Set(rewards.map(r=>r.id)).size===rewards.length);check(v.kind==='SEARCH'||analysis?rewards.length>0:rewards.length===0);
 if(analysis)check(rewards.some(r=>!r.bonus&&r.minLevel<=(profiles.ANALYZE.skillId==='COU-03'?profiles.ANALYZE.minLevel:1))&&new Set(rewards.map(r=>r.knowledgeId)).size===rewards.length);
 const dependencyId=v.dependencyId?documentId(v.dependencyId):null;check(!dependencyId||(v.kind==='SEARCH'&&dependencyId!==id));
 return {...(v.laboratory===true?{laboratory:true}:{}),...(v.documentOnly===true?{documentOnly:true}:{}),id,kind:v.kind,title:text(v.title,150,true),description:text(v.description??'',6000),gmNotes:text(v.gmNotes??'',10000),publicationState:v.publicationState,profiles,rewards,dependencyId,
  offlineSeconds:num(v.offlineSeconds??0,604800),failureLockSeconds:num(v.failureLockSeconds??300,86400),repairProtectionSeconds:num(v.repairProtectionSeconds??0,86400),revision:(old.revision??0)+1};
}
export function validateFieldReferences(t,records){
 const find=(kind,id)=>records[kind]?.find(x=>x.id===id),published=t.publicationState==='PUBLISHED';
 const reference=(kind,id)=>{const x=find(kind,id);requireThat(x&&(!published||x.publicationState==='PUBLISHED'),'FIELD_REFERENCE');return x;};
 if(isPlaceSearch(t)){
  for(const f of t.finds){if(f.itemId){const i=reference('items',f.itemId);requireThat(i.kind!=='INDIVIDUAL'||f.quantity===1,'FIELD_REFERENCE');}if(f.knowledgeId)reference('knowledge',f.knowledgeId);}
  for(const b of t.search.bonuses)if(b.kind==='ITEM')reference('items',b.sourceId);
  return;
 }
 for(const p of Object.values(t.profiles)){
  if(p.skillId&&t.kind!=='ANALYSIS')requireThat(reference('skills',p.skillId).kind==='PASSIVE','FIELD_REFERENCE');
  for(const b of p.bonusItems)reference('items',b.itemId);
  if(p.consumable){const i=reference('items',p.consumable.itemId);requireThat(i.consumable&&(i.kind!=='INDIVIDUAL'||p.consumable.quantity===1),'FIELD_REFERENCE');}
 }
 for(const r of t.rewards){if(r.kind==='ITEM'){const i=reference('items',r.itemId);requireThat(i.kind!=='INDIVIDUAL'||r.quantity===1,'FIELD_REFERENCE');}if(r.kind==='KNOWLEDGE')reference('knowledge',r.knowledgeId);}
 if(t.dependencyId)requireThat(reference('fieldTargets',t.dependencyId).kind==='INSTALLATION','FIELD_REFERENCE');
}
export const initialFieldState=t=>({id:t.id,revision:1,status:'ONLINE',offlineUntilGameMs:null,protectedUntilGameMs:0,lockedUntilGameMs:0,activeActionId:null,stock:Object.fromEntries(t.rewards.map(r=>[r.id,r.stock])),claims:{},...(isPlaceSearch(t)?initialSearchState(t):{})});
export function effectiveFieldState(s,state,at){
 const time=gameTime(s.clock,at);return state.status==='OFFLINE'&&state.offlineUntilGameMs!==null&&time>=state.offlineUntilGameMs?{...state,status:'ONLINE',...(state.protectionAfterExpirySeconds?{protectedUntilGameMs:Math.max(state.protectedUntilGameMs??0,state.offlineUntilGameMs+state.protectionAfterExpirySeconds*1000)}:{}),offlineUntilGameMs:null}:state;
}
export function seedFieldTargets(tx,s,targets){for(const t of targets??[]){tx.set(`sessions/${s.id}/fieldTargets/${t.id}`,t);tx.set(`sessions/${s.id}/fieldStates/${t.id}`,initialFieldState(t));}}
