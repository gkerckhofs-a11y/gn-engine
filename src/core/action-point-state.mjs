import {requireThat,whole} from './validation.mjs';
import {gameTime} from './clock.mjs';

export const portBrecheActionPoints=Object.freeze({enabled:true,maxByLevel:{1:5,2:8},renewalMinutes:300,cost:1,cooldownSeconds:600,patientCooldownSeconds:600});
const integer=(n,positive=false)=>{whole(n,'INVALID_ACTION_POINTS');requireThat(!positive||n>0,'INVALID_ACTION_POINTS');return n;};
export function actionPointRulesInput(input){
  requireThat(input&&typeof input.enabled==='boolean'&&input.maxByLevel&&typeof input.maxByLevel==='object'&&!Array.isArray(input.maxByLevel),'INVALID_ACTION_POINTS');
  const entries=Object.entries(input.maxByLevel);requireThat(entries.length>0&&entries.length<=100,'INVALID_ACTION_POINTS');
  const maxByLevel={};for(const [key,v] of entries){requireThat(/^[1-9]\d*$/.test(key),'INVALID_ACTION_POINTS');integer(Number(key),true);maxByLevel[key]=integer(v,true);}
  const renewalMinutes=integer(input.renewalMinutes,true),cost=integer(input.cost),cooldownSeconds=integer(input.cooldownSeconds),patientCooldownSeconds=integer(input.patientCooldownSeconds);
  for(const [n,m] of [[renewalMinutes,60000],[cooldownSeconds,1000],[patientCooldownSeconds,1000]])integer(n*m);
  return {enabled:input.enabled,maxByLevel,renewalMinutes,cost,cooldownSeconds,patientCooldownSeconds};
}
export function globalLevel(value=1){return integer(value,true);}
export function actionPointMaximum(rules,character){
  const level=globalLevel(character.globalLevel??1),max=rules.maxByLevel[level];
  requireThat(Number.isSafeInteger(max)&&max>0,'ACTION_POINT_LEVEL_UNCONFIGURED');return max;
}
export const actionPointPath=(sid,cid)=>`sessions/${sid}/characters/${cid}/resources/actionPoints`;
export function actionPointSchedule(session,time){
  const rules=session.actionPointRules,period=rules.renewalMinutes*60000;
  const next=session.actionPointSchedule?.nextAtGameMs??period;
  if(time<next)return {nextAtGameMs:next,lastAtGameMs:null};
  const cycles=Math.floor((time-next)/period),lastAtGameMs=integer(next+cycles*period);
  return {lastAtGameMs,nextAtGameMs:integer(lastAtGameMs+period)};
}
// A balance contains available + reserved PA. Refill never adds missed cycles.
export function actionPointState(session,character,stored,at){
  const time=gameTime(session.clock,at),max=actionPointMaximum(session.actionPointRules,character),schedule=actionPointSchedule(session,time);
  const state=stored?{...stored}:{available:max,reserved:0,lastRefillGameMs:schedule.lastAtGameMs??0,revision:0};
  integer(state.available);integer(state.reserved);integer(state.revision);integer(state.lastRefillGameMs);
  requireThat(state.reserved<=max,'ACTION_POINTS_RESERVED');
  if(schedule.lastAtGameMs!==null&&schedule.lastAtGameMs>state.lastRefillGameMs){state.available=max-state.reserved;state.lastRefillGameMs=schedule.lastAtGameMs;state.revision++;}
  state.available=Math.min(state.available,max-state.reserved);
  return state;
}
export function actionPointSummary(session,character,stored,at){
  if(!session.actionPointRules?.enabled)return null;
  const state=actionPointState(session,character,stored,at),time=gameTime(session.clock,at),schedule=actionPointSchedule(session,time);
  return {...state,maximum:actionPointMaximum(session.actionPointRules,character),globalLevel:character.globalLevel??1,
    nextRefillInMs:schedule.nextAtGameMs-time,nextRefillGameMs:schedule.nextAtGameMs,renewalMinutes:session.actionPointRules.renewalMinutes,
    rulesRevision:session.actionPointRulesRevision??1,stage:session.stage};
}
export function reserveActionPoints(state,cost){integer(cost);requireThat(state.available>=cost,'NOT_ENOUGH_ACTION_POINTS');return {...state,available:state.available-cost,reserved:integer(state.reserved+cost),revision:state.revision+1};}
export function resolveActionPoints(state,cost){integer(cost);requireThat(state.reserved>=cost,'ACTION_POINTS_RESERVED');return {...state,reserved:state.reserved-cost,revision:state.revision+1};}
export function releaseActionPoints(state,cost,max){integer(cost);requireThat(state.reserved>=cost,'ACTION_POINTS_RESERVED');return {...state,reserved:state.reserved-cost,available:Math.min(max-state.reserved+cost,integer(state.available+cost)),revision:state.revision+1};}
export const spendActionPoints=(state,cost)=>resolveActionPoints(reserveActionPoints(state,cost),cost);
