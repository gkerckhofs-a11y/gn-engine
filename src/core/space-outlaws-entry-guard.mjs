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
  if(scopes.has('SUCCESSION')&&session.spaceOutlaws.successionVersion===1&&/^(characters\/[^/]+(?:\/(history\/[^/]+|resources\/actionPoints|knowledge\/[^/]+))?|publicCharacters\/[^/]+|registrations\/[a-f0-9]{64}(?:\/successionHistory\/[^/]+)?|admission\/occupancy|admissionIdentities\/[a-f0-9]{64}|groups\/[^/]+(?:\/history\/[^/]+)?|inventory\/[^/]+(?:\/history\/[^/]+)?|accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+)$/.test(relative))continue;
  if(scopes.has('MEDIA')&&session.spaceOutlaws.mediaVersion===1&&/^(characters|items|inventory|announcements|ships)\/[^/]+(?:\/(mediaHistory|history)\/[^/]+)?$/.test(relative))continue;
  if(scopes.has('MEDIA')&&session.spaceOutlaws.mediaVersion===1&&/^publicCharacters\/[^/]+$/.test(relative))continue;
  if(scopes.has('SEARCH')&&session.spaceOutlaws.searchVersion===1&&/^(fieldTargets\/[^/]+(?:\/history\/[^/]+)?|fieldStates\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+)$/.test(relative))continue;
  if(scopes.has('EPISODES')&&session.spaceOutlaws.episodesVersion===1){
   if(/^registrations\/[a-f0-9]{64}$/.test(relative))continue;
   if(/^characters\/[^/]+$/.test(relative))continue;
   if(path===base.slice(0,-1)){
    const next=pending.get(path),strip=({stage,registrationOpen,campaignSealed,campaignClosedAt,vitalClock,revision,...rest})=>rest;
    requireThat(['PAUSE','FINISHED'].includes(session.stage)&&next.stage==='ARCHIVED'&&next.campaignSealed===true&&next.revision===session.revision+1&&isDeepStrictEqual(strip(session),strip(next)),'SO_GAMEPLAY_NOT_OPEN');continue;
   }
  }
  if(scopes.has('MISSION_REWARDS')&&session.spaceOutlaws.missionExecutionVersion===1&&/^inventory\/[^/]+(?:\/history\/[^/]+)?$/.test(relative))continue;
  if(scopes.has('MISSIONS')&&/^(announcements\/[^/]+(?:\/history\/[^/]+)?|applications\/[^/]+(?:\/messages\/[^/]+)?|contracts\/[^/]+(?:\/history\/[^/]+)?|accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+)$/.test(relative))continue;
  if(scopes.has('MAINTENANCE')&&/^(ships\/[^/]+|voyages\/[^/]+|shipMaintenance\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+|characters\/[^/]+(?:\/resources\/actionPoints)?|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('SO_CARGO')&&/^(ships\/[^/]+|cargoTransfers\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|characters\/[^/]+|logisticsHistory\/[^/]+)$/.test(relative))continue;
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
   const next=pending.get(path),strip=({stage,clock,vitalClock,revision,registrationOpen,...rest})=>rest;
   requireThat(isDeepStrictEqual(session.vitalClock,next.vitalClock)||session.spaceOutlaws.episodesVersion===1&&session.stage==='BRIEFING'&&next.stage==='EN_JEU'&&session.vitalClock.runningSince===null&&next.vitalClock.elapsedMs===session.vitalClock.elapsedMs,'SO_GAMEPLAY_NOT_OPEN');
   requireThat(isDeepStrictEqual(strip(session),strip(next))&&next.revision===session.revision+1&&['EN_JEU','PAUSE','FINISHED'].includes(next.stage),'SO_GAMEPLAY_NOT_OPEN');continue;
  }
  if(path===base.slice(0,-1)){const {revision:beforeRevision,...before}=session,{revision:afterRevision,...after}=pending.get(path);requireThat(afterRevision===beforeRevision+1&&isDeepStrictEqual(before,after),'SO_GAMEPLAY_NOT_OPEN');continue;}
  if(/^registrations\/[a-f0-9]{64}$/.test(path.slice(base.length)))continue;
  requireThat(false,'SO_GAMEPLAY_NOT_OPEN');
 }
 return true;
}
export function guardSpaceOutlawsRegistration(before,after,episode=false,succession=false){
 const allowed=new Set(succession?['succession','admission','characterId','previousCharacterId','progression','accessVersion','briefingReadAt','briefingReadRevision']:episode?['progression']:['accessActive','accessVersion','minAuthTime','briefingReadAt','briefingReadRevision']);
 const fixed=x=>Object.fromEntries(Object.entries(x??{}).filter(([k])=>!allowed.has(k)));
 requireThat(before&&isDeepStrictEqual(fixed(before),fixed(after)),'SO_GAMEPLAY_NOT_OPEN');
}
