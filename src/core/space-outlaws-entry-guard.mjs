import {isDeepStrictEqual} from 'node:util';
import {requireThat} from './validation.mjs';

// Server-only transaction capability, never supplied by a request body.
export const spaceOutlawsTransaction=Symbol('spaceOutlawsBirth');
export const spaceOutlawsGameplay=Symbol('spaceOutlawsGameplay');
export function authorizeSpaceOutlaws(tx,s,scope){
 if(!s.spaceOutlaws)return;
 requireThat(s.spaceOutlaws.actionsVersion===1,'SO_GAMEPLAY_NOT_OPEN');
 tx[spaceOutlawsGameplay](s.id,scope);
}
export function guardSpaceOutlawsEntry(session,pending,authorized,scopes=new Set()){
 if(authorized){
  const next=pending.get(`sessions/${session.id}`);
  requireThat(next?.spaceOutlaws?.ruleProfile==='SPACE_OUTLAWS_V07'&&next.stage==='BRIEFING'&&next.revision===session.revision+1,'SO_BIRTH_CONFLICT');
  return true;
 }
 if(!session?.spaceOutlaws)return false;
 const base=`sessions/${session.id}/`;
 // Explicit capabilities open the connected gameplay services only. Other
 // legacy mutations remain blocked for canonical SPACE OUTLAWS instances.
 for(const [path] of pending){
  if(!path.startsWith(base)&&path!==base.slice(0,-1))continue;
  if(path.startsWith(`${base}audit/`))continue;
  const relative=path.slice(base.length);
  if(scopes.has('SPACE_COMBAT')&&/^(ships\/[^/]+|voyages\/[^/]+|spaceAmbushes\/[^/]+|spaceCombats\/[^/]+(?:\/rounds\/[^/]+)?|characters\/[^/]+\/resources\/actionPoints|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('SPACE_RESCUE')&&/^(ships\/[^/]+|voyages\/[^/]+|spaceRescues\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('NAVIGATION')&&/^(ships\/[^/]+|voyages\/[^/]+|logisticsHistory\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|characters\/[^/]+(?:\/resources\/actionPoints)?)$/.test(relative))continue;
  if(scopes.has('NAVIGATION_CONFIG')&&path===base.slice(0,-1)){const next=pending.get(path),strip=({transportRules,revision,...rest})=>rest;requireThat(!session.transportRules&&next.transportRules?.homePort&&next.revision===session.revision+1&&isDeepStrictEqual(strip(session),strip(next)),'SO_GAMEPLAY_NOT_OPEN');continue;}
  if(scopes.has('SHOP')&&/^(inventory\/[^/]+(?:\/history\/[^/]+)?|accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+|lotSales\/[^/]+|shopProvisions\/[^/]+)$/.test(relative))continue;
  if(scopes.has('PAYMENT')&&/^(accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+)$/.test(relative))continue;
  if(scopes.has('FIELD')&&/^(fieldActions\/[^/]+|fieldStates\/[^/]+|aidOffers\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|characters\/[^/]+(?:\/(?:resources\/actionPoints|fieldCooldowns\/[^/]+|knowledge\/[^/]+))?)$/.test(relative))continue;
  if(scopes.has('CARE')&&/^(personActions\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|characters\/[^/]+(?:\/(?:resources\/actionPoints|fieldCooldowns\/[^/]+|cooldowns\/field-care|healthHistory\/[^/]+))?)$/.test(relative))continue;
  if(scopes.has('HEALTH')&&/^characters\/[^/]+(?:\/healthHistory\/[^/]+)?$/.test(relative))continue;
  if(scopes.has('SAFETY')&&path===base.slice(0,-1)){
   const next=pending.get(path),strip=({stage,clock,vitalClock,safetyStop,revision,...rest})=>rest;
   requireThat(isDeepStrictEqual(strip(session),strip(next))&&next.revision===session.revision+1&&['EN_JEU','PAUSE'].includes(next.stage),'SO_GAMEPLAY_NOT_OPEN');continue;
  }
  if(scopes.has('AID')&&/^aidOffers\/[^/]+$/.test(relative))continue;
  if(scopes.has('KNOWLEDGE')&&/^characters\/[^/]+\/knowledge\/[^/]+$/.test(relative))continue;
  if(scopes.has('RHYTHM')&&path===base.slice(0,-1)){
   const next=pending.get(path),strip=({stage,clock,revision,registrationOpen,...rest})=>rest;
   requireThat(isDeepStrictEqual(strip(session),strip(next))&&next.revision===session.revision+1&&['EN_JEU','PAUSE','FINISHED'].includes(next.stage),'SO_GAMEPLAY_NOT_OPEN');continue;
  }
  if(path===base.slice(0,-1)){const {revision:beforeRevision,...before}=session,{revision:afterRevision,...after}=pending.get(path);requireThat(afterRevision===beforeRevision+1&&isDeepStrictEqual(before,after),'SO_GAMEPLAY_NOT_OPEN');continue;}
  if(/^registrations\/[a-f0-9]{64}$/.test(path.slice(base.length)))continue;
  requireThat(false,'SO_GAMEPLAY_NOT_OPEN');
 }
 return true;
}
export function guardSpaceOutlawsRegistration(before,after){
 const allowed=new Set(['accessActive','accessVersion','minAuthTime','briefingReadAt','briefingReadRevision']);
 const fixed=x=>Object.fromEntries(Object.entries(x??{}).filter(([k])=>!allowed.has(k)));
 requireThat(before&&isDeepStrictEqual(fixed(before),fixed(after)),'SO_GAMEPLAY_NOT_OPEN');
}
