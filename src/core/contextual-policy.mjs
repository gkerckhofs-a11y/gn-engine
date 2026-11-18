import {createHash} from 'node:crypto';
import {requireThat} from './validation.mjs';
import {abilityLevel} from './abilities.mjs';
import {gameTime} from './clock.mjs';
import {localCredentialAllowed} from './contextual-credentials.mjs';
const base=sid=>`localAccess/${sid}`;
export const localBindingId=(action,id)=>createHash('sha256').update(JSON.stringify([action,id])).digest('hex');
const live=s=>{requireThat(!s.campaignSealed&&s.stage!=='ARCHIVED','SESSION_CLOSED');requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');};
export async function localAuthorization(tx,ctx,action,resourceId,at,{assumePresent=false,code=null}={}){
 const {s,c,version}=ctx,b=base(s.id),binding=await tx.get(`${b}/bindings/${localBindingId(action,resourceId)}`);
 if(!binding){requireThat(s.spaceOutlaws?.terminalQrVersion!==1,'LOCAL_BINDING_REQUIRED');return null;}
 const t=await tx.get(`${b}/terminals/${binding.terminalId}`),p=await tx.get(`${b}/presence/${c.id}`);
 requireThat(t?.active&&binding.active,'LOCAL_TERMINAL_CLOSED');live(s);
 requireThat(assumePresent||p&&p.terminalId===t.id&&p.terminalRevision===t.revision&&p.characterVersion===version&&p.expiresGameMs>gameTime(s.clock,at),'LOCAL_SCAN_REQUIRED');
 const rule=t.operations.find(o=>o.action===action&&o.resourceId===resourceId);requireThat(rule,'FORBIDDEN');
 requireThat(!rule.characterIds.length||rule.characterIds.includes(c.id),'FORBIDDEN');
 requireThat(!rule.skillId||abilityLevel(c,rule.skillId)>=rule.minLevel,'LOCAL_SKILL_REQUIRED');
 requireThat(await localCredentialAllowed(tx,ctx,t,rule,assumePresent?null:p,code),'LOCAL_CREDENTIAL_REQUIRED');
 return {terminalId:t.id,placeId:t.placeId,resourceId,characterId:c.id};
}
