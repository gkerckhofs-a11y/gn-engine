import {documentId,requireThat,whole} from './validation.mjs';
import {gameTime} from './clock.mjs';
import {isDeepStrictEqual} from 'node:util';
import {analysisProfile} from '../shared/space-outlaws-analysis.mjs';
import {isPlaceSearch,searchTargetInput,initialSearchState} from './space-outlaws-search-state.mjs';

const check=v=>requireThat(v,'INVALID_FIELD_TARGET');
const text=(v,max,required=false)=>{check(typeof v==='string'&&v.length<=max&&(!required||v.trim()));return v.trim();};
const num=(v,max=1000000)=>{whole(v,'INVALID_FIELD_TARGET');check(v<=max);return v;};
export const fieldKinds=['SEARCH','SABOTAGE','REPAIR','ANALYZE'];
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
 if(isPlaceSearch(v))return searchTargetInput(v,id,old);
 check(v&&['SEARCH','INSTALLATION','ANALYSIS'].includes(v.kind));check(['DRAFT','READY','PUBLISHED'].includes(v.publicationState));
 check(v.profiles&&typeof v.profiles==='object'&&!Array.isArray(v.profiles));check(Array.isArray(v.rewards??[]));
 const analysis=v.kind==='ANALYSIS';
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
 if(analysis)check(rewards.some(r=>!r.bonus&&r.minLevel===1)&&new Set(rewards.map(r=>r.knowledgeId)).size===rewards.length);
 const dependencyId=v.dependencyId?documentId(v.dependencyId):null;check(!dependencyId||(v.kind==='SEARCH'&&dependencyId!==id));
 return {id,kind:v.kind,title:text(v.title,150,true),description:text(v.description??'',6000),gmNotes:text(v.gmNotes??'',10000),publicationState:v.publicationState,profiles,rewards,dependencyId,
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
 const time=gameTime(s.clock,at);return state.status==='OFFLINE'&&state.offlineUntilGameMs!==null&&time>=state.offlineUntilGameMs?{...state,status:'ONLINE',offlineUntilGameMs:null}:state;
}
export function seedFieldTargets(tx,s,targets){for(const t of targets??[]){tx.set(`sessions/${s.id}/fieldTargets/${t.id}`,t);tx.set(`sessions/${s.id}/fieldStates/${t.id}`,initialFieldState(t));}}
