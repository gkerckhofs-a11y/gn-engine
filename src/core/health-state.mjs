import {hasSoHealth,survival} from './space-outlaws-health-state.mjs';
import {naturePatch} from './character-nature.mjs';
import {gameTime} from './clock.mjs';
import {requireThat,whole,documentId} from './validation.mjs';
export const outOfCombatActions=['discover','share','publish','heal','transfer','pay'];
export function healthRulesInput(input){
  requireThat(input&&typeof input.enabled==='boolean','INVALID_HEALTH');
  const defaultMaxHp=input.defaultMaxHp==null?null:whole(input.defaultMaxHp,'INVALID_HEALTH');
  requireThat(!input.enabled||(defaultMaxHp!==null&&defaultMaxHp>0),'INVALID_HEALTH');
  requireThat(defaultMaxHp===null||defaultMaxHp>0,'INVALID_HEALTH');
  requireThat(['HP_POSITIVE','MJ'].includes(input.returnMode),'INVALID_HEALTH');
  const allowed={};for(const key of outOfCombatActions){const v=input.allowed?.[key]??false;requireThat(typeof v==='boolean','INVALID_HEALTH');allowed[key]=v;}
  return {enabled:input.enabled,defaultMaxHp,returnMode:input.returnMode,allowed};
}
export function healthState(c){
  requireThat(Number.isSafeInteger(c.maxHp)&&c.maxHp>0&&Number.isSafeInteger(c.hp)&&c.hp>=0&&c.hp<=c.maxHp,'HEALTH_NOT_CONFIGURED');
  return {hp:c.hp,maxHp:c.maxHp,outOfCombat:c.hp===0||c.outOfCombat===true,revision:c.healthRevision??0};
}
export const initialHealth=(rules,character={})=>rules?.enabled?{hp:character.initialMaxHp??rules.defaultMaxHp,maxHp:character.initialMaxHp??rules.defaultMaxHp,outOfCombat:false,healthRevision:1}:{};
export function healthSummary(s,c,at=Date.now()){
  return s.healthRules?.enabled&&c?{...healthState(c),...(hasSoHealth(s)?{spaceOutlaws:true,...survival(s,c,at)}:{}),convalescenceMs:c.convalescentUntilGameMs?Math.max(0,c.convalescentUntilGameMs-gameTime(s.clock,at)):0,stage:s.stage,returnMode:s.healthRules.returnMode,allowed:s.healthRules.allowed}:null;
}
export const canGameAction=(s,c,action,at=Date.now())=>!(['discover','heal','transfer'].includes(action)&&(c.activeNavigationId||c.activeVoyageId||s.spaceOutlaws?.navigationVersion&&c.spacePortId&&c.spacePortId!==s.transportRules?.homePort))&&!(['discover','heal'].includes(action)&&(c.activeAidId||(c.convalescentUntilGameMs>0&&c.convalescentUntilGameMs>gameTime(s.clock,at))))&&(!(s.healthRules?.enabled&&(c.hp===0||c.outOfCombat===true))||s.healthRules?.allowed?.[action]===true);
export function requireGameAction(s,c,action,at=Date.now()){requireThat(canGameAction(s,c,action,at),'OUT_OF_COMBAT');}
export function healingInput(value,old={}){
  requireThat(value&&value.effect==='HEAL_HP','INVALID_HEALING');
  const amount=whole(value.amount,'INVALID_HEALING'),cooldownSeconds=whole(value.cooldownSeconds,'INVALID_HEALING');
  const uses=value.uses==null?null:whole(value.uses,'INVALID_HEALING');
  requireThat(amount>0&&(uses===null||uses>0)&&Number.isSafeInteger(cooldownSeconds*1000),'INVALID_HEALING');
  let consumable=null;
  if(value.consumable!=null){const itemId=documentId(value.consumable.itemId),quantity=whole(value.consumable.quantity,'INVALID_HEALING');requireThat(quantity>0,'INVALID_HEALING');consumable={itemId,quantity};}
  const cooldownScope=value.cooldownScope??'ACTOR';requireThat(['ACTOR','PATIENT','NONE'].includes(cooldownScope),'INVALID_HEALING');
  return {...naturePatch(value,old,'patientNature'),effect:'HEAL_HP',amount,uses,cooldownSeconds,consumable,...(value.cooldownScope!==undefined?{cooldownScope}:{})};
}
