import {hasSoGroupStock,hasSoGroupWallets} from '../shared/space-outlaws-groups.mjs';
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
  if(scopes.has('GROUP_CHAT')&&session.spaceOutlaws.groupsVersion===1&&/^groups\/[^/]+\/(?:messages\/[^/]+|inboxes\/[^/]+\/messages\/[^/]+)$/.test(relative))continue;
  if(scopes.has('GROUP_MANAGEMENT')&&session.spaceOutlaws.groupsVersion===1&&/^groups\/[^/]+(?:\/history\/[^/]+)?$/.test(relative))continue;
  if(scopes.has('GROUP_WALLET_CONFIG')&&hasSoGroupWallets(session)&&/^(groups\/[^/]+(?:\/history\/[^/]+)?|accounts\/[a-f0-9]{64}(?:\/history\/[a-f0-9]{64})?|ledger\/[a-f0-9]{64})$/.test(relative))continue;
  if(scopes.has('GROUP_STOCK_CONFIG')&&hasSoGroupStock(session)&&/^(warehouses\/[^/]+|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('GROUP_STOCK_MOVE')&&hasSoGroupStock(session)&&/^(warehouses\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('ESCORT_AMENDMENT')&&session.spaceOutlaws.escortAmendmentVersion===1&&/^(ships\/[^/]+|contracts\/[^/]+(?:\/history\/[^/]+)?|accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+)$/.test(relative))continue;
  if(scopes.has('ESCORT')&&session.spaceOutlaws.escortVersion===1&&/^(ships\/[^/]+|characters\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|contracts\/[^/]+(?:\/history\/[^/]+)?|accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+)$/.test(relative))continue;
  if(scopes.has('TRANSPORT')&&session.spaceOutlaws.transportVersion===1&&/^inventory\/[^/]+(?:\/history\/[^/]+)?$/.test(relative))continue;
  if(scopes.has('LEARNING')&&session.spaceOutlaws.learningVersion===1&&/^(characters\/[^/]+(?:\/history\/[^/]+)?|registrations\/[a-f0-9]{64})$/.test(relative))continue;
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
  if(scopes.has('BOUNTIES')&&session.spaceOutlaws.bountyVersion===1&&/^bounties\/[^/]+(?:\/history\/[^/]+|\/claims\/[^/]+(?:\/history\/[^/]+)?)?$/.test(relative))continue;
  if(scopes.has('MISSIONS')&&/^(announcements\/[^/]+(?:\/history\/[^/]+)?|applications\/[^/]+(?:\/messages\/[^/]+)?|contracts\/[^/]+(?:\/history\/[^/]+)?|accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+)$/.test(relative))continue;
  if(scopes.has('INTELLIGENCE')&&session.spaceOutlaws.intelligenceVersion===1&&/^(knowledgeDeals\/[^/]+|characters\/[^/]+\/knowledge\/[^/]+|accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('TOWING_RECOVERY')&&session.spaceOutlaws.towingRecoveryVersion===1&&/^(ships\/[^/]+|shipMaintenance\/[^/]+|characters\/[^/]+|voyages\/[^/]+|accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('TOWING_COMBAT')&&session.spaceOutlaws.towingCombatVersion===1&&session.spaceOutlaws.towingFlightVersion===1&&/^(ships\/[^/]+|shipMaintenance\/[^/]+|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('TOWING_FLIGHT')&&session.spaceOutlaws.towingFlightVersion===1&&session.spaceOutlaws.towingAttachmentVersion===1&&session.spaceOutlaws.towingWorkVersion===1&&/^(ships\/[^/]+|shipMaintenance\/[^/]+|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('TOWING_ATTACHMENT')&&session.spaceOutlaws.towingAttachmentVersion===1&&session.spaceOutlaws.towingWorkVersion===1&&/^(ships\/[^/]+|shipMaintenance\/[^/]+|characters\/[^/]+(?:\/resources\/actionPoints)?|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('TOWING_WORK')&&session.spaceOutlaws.towingWorkVersion===1&&/^(ships\/[^/]+|shipMaintenance\/[^/]+|characters\/[^/]+(?:\/resources\/actionPoints)?|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('MODULE_WORK')&&session.spaceOutlaws.moduleWorkVersion===1&&/^(shipMaintenance\/[^/]+|logisticsHistory\/[^/]+|ships\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|characters\/[^/]+(?:\/resources\/actionPoints)?)$/.test(relative))continue;
  if(scopes.has('MODULE_MANDATES')&&session.spaceOutlaws.moduleMandatesVersion===1&&/^(shipMaintenance\/[^/]+|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('MAINTENANCE')&&/^(ships\/[^/]+|voyages\/[^/]+|shipMaintenance\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+|characters\/[^/]+(?:\/resources\/actionPoints)?|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('CUSTOMS_SHIP_CONSENT')&&session.spaceOutlaws.hiddenCargoVersion===1&&/^customsShipConsents\/[A-Za-z0-9_-]{1,128}$/.test(relative))continue;
  if(scopes.has('CUSTOMS_CONSENT')&&session.spaceOutlaws.hiddenCargoVersion===1&&/^customsConsents\/[A-Za-z0-9_-]{1,128}$/.test(relative))continue;
  if(scopes.has('HIDDEN_CARGO')&&session.spaceOutlaws.hiddenCargoVersion===1&&/^(ships\/[^/]+|shipMaintenance\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|characters\/[^/]+(?:\/resources\/actionPoints)?|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('SO_CARGO')&&/^(ships\/[^/]+|cargoTransfers\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|characters\/[^/]+|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('SPACE_COMBAT')&&session.spaceOutlaws.boardingVersion===1&&/^spaceCombats\/[^/]+\/boardings\/[^/]+$/.test(relative))continue;
  if(scopes.has('SPACE_COMBAT')&&/^(ships\/[^/]+|voyages\/[^/]+|spaceAmbushes\/[^/]+|spaceCombats\/[^/]+(?:\/rounds\/[^/]+)?|characters\/[^/]+\/resources\/actionPoints|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('SPACE_RESCUE')&&/^(ships\/[^/]+|voyages\/[^/]+|spaceRescues\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+|logisticsHistory\/[^/]+)$/.test(relative))continue;
  if(scopes.has('COCKPIT')&&(/^(cockpitStations\/[^/]+|cockpitSettings\/main)$/.test(relative)))continue;
  if(scopes.has('NAVIGATION')&&/^(ships\/[^/]+|voyages\/[^/]+|logisticsHistory\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|characters\/[^/]+(?:\/resources\/actionPoints)?)$/.test(relative))continue;
  if(scopes.has('NAVIGATION_CONFIG')&&path===base.slice(0,-1)){const next=pending.get(path),strip=({transportRules,revision,...rest})=>rest;requireThat(!session.transportRules&&next.transportRules?.homePort&&next.revision===session.revision+1&&isDeepStrictEqual(strip(session),strip(next)),'SO_GAMEPLAY_NOT_OPEN');continue;}
  if(scopes.has('SHOP')&&/^(inventory\/[^/]+(?:\/history\/[^/]+)?|accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+|lotSales\/[^/]+|shopProvisions\/[^/]+)$/.test(relative))continue;
  if(scopes.has('SABACC_WALLET')&&/^(accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+)$/.test(relative))continue;
  if(scopes.has('PAYMENT')&&/^(accounts\/[^/]+(?:\/history\/[^/]+)?|ledger\/[^/]+)$/.test(relative))continue;
  if(scopes.has('FIELD')&&/^(fieldActions\/[^/]+|fieldStates\/[^/]+|aidOffers\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|characters\/[^/]+(?:\/(?:resources\/actionPoints|fieldCooldowns\/[^/]+|knowledge\/[^/]+))?)$/.test(relative))continue;
  if(scopes.has('PERSONAL_TRANSFER')&&session.spaceOutlaws.actionsVersion===1
    &&/^(lotTransfers\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?)$/.test(relative))continue;
  if(scopes.has('FORGERY_TRANSFER')&&session.spaceOutlaws.inf03Version===1
    &&/^(lotTransfers\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?)$/.test(relative))continue;
  if(scopes.has('CUSTOMS_APPEAL')&&session.spaceOutlaws.customsDetentionVersion===1
    &&/^customsSeizureAppeals\/[^/]+$/.test(relative))continue;
  if(scopes.has('CUSTOMS_SEIZURE')&&session.spaceOutlaws.customsDetentionVersion===1
    &&/^(customsDetentions\/[^/]+|customsSeizures\/[^/]+|customsOfficialInventory\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?)$/.test(relative))continue;
  if(scopes.has('CUSTOMS_DETENTION')&&session.spaceOutlaws.customsDetentionVersion===1
    &&/^(customsDetentions\/[^/]+|customsDetentionByLot\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?)$/.test(relative))continue;
  if(scopes.has('INF03')&&session.spaceOutlaws.inf03Version===1&&/^(inf03Actions\/[^/]+|inf03Actors\/[^/]+|forgeryRecords\/[^/]+|fieldStates\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|characters\/[^/]+(?:\/resources\/actionPoints)?)$/.test(relative))continue;
  if(scopes.has('INF01')&&session.spaceOutlaws.inf01Version===1&&/^(aidOffers\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|inf01Actions\/[^/]+|inf01Actors\/[^/]+|fieldStates\/[^/]+|characters\/[^/]+(?:\/(?:fieldCooldowns\/[^/]+|resources\/actionPoints))?)$/.test(relative))continue;
  if(scopes.has('INF02')&&session.spaceOutlaws.inf02Version===1&&/^(inventory\/[^/]+(?:\/history\/[^/]+)?|aidOffers\/[^/]+|inf02Actions\/[^/]+|inf02Actors\/[^/]+|inf02Attempts\/[^/]+|characters\/[^/]+(?:\/(?:knowledge\/[^/]+|fieldCooldowns\/[^/]+|resources\/actionPoints))?)$/.test(relative))continue;
  if(scopes.has('ESCAPE')&&session.spaceOutlaws.escapeVersion===1&&/^(soCaptivities\/[^/]+|soEscapeActions\/[^/]+|soEscapeRogues\/[^/]+|characters\/[^/]+\/resources\/actionPoints)$/.test(relative))continue;
  if(scopes.has('PICKPOCKET')&&session.spaceOutlaws.pickpocketVersion===1&&/^(pickpocketActions\/[^/]+|pickpocketRogues\/[^/]+|pickpocketVictims\/[^/]+|pickpocketAlerts\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|characters\/[^/]+\/resources\/actionPoints)$/.test(relative))continue;
  if(scopes.has('NEGOTIATION_REDEEM')&&session.spaceOutlaws.merchantNegotiationVersion===1&&/^fieldActions\/[^/]+$/.test(relative))continue;
  if(scopes.has('DIAGNOSIS_CONFIG')&&session.spaceOutlaws.medicalDiagnosisVersion===1&&/^medicalDossiers\/[^/]+(?:\/history\/[^/]+)?$/.test(relative))continue;
  if(scopes.has('CLINIC_CONFIG')&&session.spaceOutlaws.healthVersion===1&&/^personProfiles\/SO-CLINIC-[^/]+(?:\/history\/[^/]+)?$/.test(relative))continue;
  if(scopes.has('PROTECTION_CONFIG')&&session.spaceOutlaws.healthVersion===1&&/^personProfiles\/SO-ARMOR-[^/]+(?:\/history\/[^/]+)?$/.test(relative))continue;
  if(scopes.has('HEALTH_CORRECTION')&&session.spaceOutlaws.healthVersion===1){
   if(/^(characters\/[^/]+(?:\/healthHistory\/[^/]+)?|healthHistory\/[^/]+)$/.test(relative))continue;
   if(path===base.slice(0,-1)){const next=pending.get(path),strip=({revision,...rest})=>rest;requireThat(next.revision===session.revision+1&&isDeepStrictEqual(strip(session),strip(next)),'SO_GAMEPLAY_NOT_OPEN');continue;}
  }
  if(scopes.has('CARE')&&/^(personActions\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|characters\/[^/]+(?:\/(?:resources\/actionPoints|fieldCooldowns\/[^/]+|cooldowns\/field-care|diagnoses\/[^/]+|healthHistory\/[^/]+))?)$/.test(relative))continue;
  if(scopes.has('FICTIONAL_TRACES')&&session.spaceOutlaws.fictionalTracesVersion===1&&/^(fictionalTraces|fictionalTraceHeads|fictionalTraceMasks|fictionalTraceActors|fictionalTraceConsents|fictionalShipTraceBindings|fictionalShipTraceTargets|fictionalPursuits|fictionalTraceAlerts)\/[^/]+$/.test(relative))continue;
  if(scopes.has('TOXICOLOGY')&&session.spaceOutlaws.toxicologyVersion===1&&/^(toxicDoses\/[^/]+|inventory\/[^/]+(?:\/history\/[^/]+)?|characters\/[^/]+(?:\/healthHistory\/[^/]+)?)$/.test(relative))continue;
  if(scopes.has('HEALTH')&&/^characters\/[^/]+(?:\/healthHistory\/[^/]+)?$/.test(relative))continue;
  if(scopes.has('SAFETY')&&path===base.slice(0,-1)){
   const next=pending.get(path),strip=({stage,clock,vitalClock,safetyStop,revision,...rest})=>rest;
   requireThat(isDeepStrictEqual(strip(session),strip(next))&&next.revision===session.revision+1&&['EN_JEU','PAUSE'].includes(next.stage),'SO_GAMEPLAY_NOT_OPEN');continue;
  }
  if(scopes.has('AID')&&/^aidOffers\/[^/]+$/.test(relative))continue;
  if(scopes.has('KNOWLEDGE')&&/^(characters\/[^/]+\/knowledge\/[^/]+|knowledge\/[^/]+\/history\/[^/]+)$/.test(relative))continue;
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
export function guardSpaceOutlawsRegistration(before,after,episode=false,succession=false,learning=false){
 if(learning){
  const strip=({learningSessionId,lastLearning,retraining,...rest}={})=>rest;
  requireThat(isDeepStrictEqual(strip(before?.progression),strip(after?.progression)),'SO_GAMEPLAY_NOT_OPEN');
 }
 const allowed=new Set(succession?['succession','admission','characterId','previousCharacterId','progression','accessVersion','briefingReadAt','briefingReadRevision']:episode||learning?['progression']:['accessActive','accessVersion','minAuthTime','briefingReadAt','briefingReadRevision']);
 const fixed=x=>Object.fromEntries(Object.entries(x??{}).filter(([k])=>!allowed.has(k)));
 requireThat(before&&isDeepStrictEqual(fixed(before),fixed(after)),'SO_GAMEPLAY_NOT_OPEN');
}
