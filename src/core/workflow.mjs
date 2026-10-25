import {createShopService,shopActions} from './shops.mjs';
import {hasSoHealth,survival} from './space-outlaws-health-state.mjs';
import {createSpaceOutlawsEntryService,spaceOutlawsEntryActions} from './space-outlaws-entry.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {characterInput} from './character-state.mjs';
import {recipeInput,validateRecipeReferences} from './recipe-state.mjs';
import {createCentralMasterService,centralMasterAction,centralDashboard} from './central-master.mjs';
import {isPreparation} from './preparation-state.mjs';
import {createAdmissionService,admissionAction} from './admissions.mjs';
import {createGroupManagementService,groupManagementAction} from './group-management.mjs';
import {preserveSessionNature} from './character-nature.mjs';
import {validateCargoTariffReferences} from './customs-state.mjs';
import {validateEconomicReferences} from './price-state.mjs';
import {createPriceService,priceAction} from './prices.mjs';
import {validateNavigationReferences} from './navigation-state.mjs';
import {createVoyageService,voyageAction} from './voyages.mjs';
import {createCargoService,cargoAction} from './cargo.mjs';
import {createLogisticsService,logisticsAction} from './logistics.mjs';
import {createPersonService,personAction} from './person-actions.mjs';
import {playerRules} from './player-rules.mjs';
import {validatePersonReferences,personOpen} from './person-state.mjs';
import {createFieldService,fieldAction} from './field-actions.mjs';
import {validateFieldReferences} from './field-state.mjs';
import {createMasterService,masterAction} from './masters.mjs';
import {createCampaignService,campaignAction,campaignGuardStore} from './campaigns.mjs';
import {readScenarioVersion,sessionFromVersion,seedScenarioSession} from './session-seed.mjs';
import {createActionPointService,actionPointAction} from './action-points.mjs';
import {actionPointMaximum,actionPointSummary,actionPointPath} from './action-point-state.mjs';
import {createMediaService,mediaAction} from './media.mjs';
import {createScenarioArchiveService,archiveAction} from './scenario-archives.mjs';
import {mediaTrackedStore,mediaFields} from './media-state.mjs';
import {createBountyService,bountyAction} from './bounties.mjs';
import {createContractService,contractAction} from './contracts.mjs';
import {createAnnouncementService,announcementAction} from './announcements.mjs';
import {createMarketService,marketAction} from './market.mjs';
import {createCustomsService,customsAction} from './customs.mjs';
import {createNegotiationService,negotiationAction} from './market-negotiations.mjs';
import {createSaleService,saleAction} from './sales.mjs';
import {createCollectiveService,collectiveAction} from './collective-accounts.mjs';
import {createEconomyService,economyAction} from './economy.mjs';
import {seedWallets,groupAccountId} from './economy-state.mjs';
import {createHash, randomUUID} from 'node:crypto';
import {requireThat, documentId, whole} from './validation.mjs';
import {publicCharacter, participantCharacter} from './projections.mjs';
import {createClock, pauseClock, resumeClock, gameTime} from './clock.mjs';
import {staffPath,staffEmail,capabilities,sessionCommands,receptionCharacter} from './staff.mjs';
import {validateRelations,recordPublication} from './narrative.mjs';
import {createHealthService,healthAction} from './health.mjs';
import {createInventoryService,inventoryAction} from './inventory.mjs';
import {createLotTransferService,lotTransferAction} from './inventory-transfers.mjs';
import {seedInventory,effectiveLot} from './inventory-state.mjs';
import {healthSummary,initialHealth,requireGameAction,canGameAction} from './health-state.mjs';
import {createAbilityService,abilityAction} from './abilities.mjs';
import {createNotebookService,notebookAction} from './notebook.mjs';
import {createKnowledgeService,knowledgeAction,seedKnowledge} from './knowledge.mjs';
import {groupInput,validateGroupMembers,memberFor,groupVisible,groupSummary,groupDetail,publicAffiliations} from './groups.mjs';

export const hash = value => createHash('sha256').update(value).digest('hex');
const text = (value, max = 4000, required = false) => {
  requireThat(typeof value === 'string' && value.length <= max && (!required || value.trim()), 'INVALID_TEXT');
  return value.trim();
};
const optional = (value, max) => text(value ?? '', max);
const status = (value, allowed) => { requireThat(allowed.includes(value), 'INVALID_STATUS'); return value; };
const regPath = (sid, uid) => `sessions/${sid}/registrations/${hash(uid)}`;
const charPath = (sid, cid) => `sessions/${sid}/characters/${cid}`;
const privateSession = s => ({id:s.id, title:s.title, summary:s.summary, date:s.date, time:s.time, place:s.place,
  practical:s.practical, privacy:s.privacy, capacity:s.capacity, accepted:s.accepted, registrationOpen:s.registrationOpen,
  stage:s.stage, fields:s.fields,...(s.spaceOutlaws?{spaceOutlaws:s.spaceOutlaws}:{}), scenarioId:s.scenarioId, versionId:s.versionId, revision:s.revision,
  ...(isPreparation(s)?{preparationKind:s.preparationKind,preparationVersion:s.preparationVersion}:{})});
const publicSession = s => ({id:s.id, title:s.title, summary:s.summary, date:s.date, time:s.time, place:s.place,
  practical:s.practical, privacy:s.privacy, capacity:s.capacity, available:Math.max(0,s.capacity-s.accepted),
  registrationOpen:s.registrationOpen, stage:s.stage, fields:s.fields,...(s.spaceOutlaws?{spaceOutlaws:s.spaceOutlaws}:{})});
const ownRegistration = r => r ? ({name:r.name, email:r.email, answers:r.answers, status:r.status,
  characterId:r.characterId, accessActive:r.accessActive, briefingReadAt:r.briefingReadAt ?? null,
  briefingReadRevision:r.briefingReadRevision??null}) : null;


/** Authenticated actor is supplied by the HTTP adapter, never by input JSON. */
export function createWorkflow({store, ownerEmail, now = Date.now, uuid = randomUUID, images=null, processImage=null,rollD6}) {
  store=mediaTrackedStore(campaignGuardStore(store));
  const isAdmin = actor => !!actor && actor.emailVerified === true && actor.provider === 'google.com'
    && actor.email?.toLowerCase() === ownerEmail?.toLowerCase();
  function signed(actor) { requireThat(actor?.uid && typeof actor.email==='string' && actor.email && actor.emailVerified === true && actor.provider === 'google.com', 'LOGIN_REQUIRED'); }
  function admin(actor) { signed(actor); requireThat(isAdmin(actor), 'FORBIDDEN'); }
  const sessionAccess = async (tx, actor, sid) => {
    signed(actor);requireThat(sid,'INVALID_ID');const s=await tx.get(`sessions/${sid}`);
    requireThat(s,'FORBIDDEN');
    if(isAdmin(actor) && s.ownerUid===actor.uid) return {s,role:'OWNER',permissions:capabilities('OWNER')};
    const grant=await tx.get(staffPath(sid,actor.email));
    requireThat(grant?.active && grant.ownerUid===s.ownerUid && ['MJ','RECEPTION'].includes(grant.role),'FORBIDDEN');
    return {s,role:grant.role,permissions:capabilities(grant.role)};
  };
  const checkSession = async (tx, actor, sid, permission='content',allowPreparation=false) => {
    const access=await sessionAccess(tx,actor,sid);
    requireThat(access.permissions[permission],'FORBIDDEN');
    requireThat(!isPreparation(access.s)||allowPreparation||permission==='staff','PREPARATION_ONLY');return access.s;
  };
  const checkScenario = async (tx,actor,id) => {
    admin(actor); const s = await tx.get(`scenarios/${id}`);
    requireThat(s && s.ownerUid === actor.uid,'FORBIDDEN'); return s;
  };
  const revision = (record, value) => requireThat(record.revision === value, 'STALE_REVISION');
  const groupContext=async(tx,actor,sid,input,preview=false)=>{
    signed(actor);
    const s=preview?await checkSession(tx,actor,sid):await tx.get(`sessions/${sid}`);
    requireThat(s && s.stage!=='ARCHIVED','FORBIDDEN');
    let cid;
    if(preview)cid=documentId(input.characterId);
    else {
      const r=await tx.get(regPath(sid,actor.uid));
      requireThat(r?.status==='ACCEPTED' && r.accessActive && r.characterId && actor.authTime>=r.minAuthTime,'FORBIDDEN');
      cid=r.characterId;
    }
    const c=await tx.get(charPath(sid,cid));
    requireThat(c && (preview||c.assignedUid===actor.uid),'FORBIDDEN');
    requireThat(['BRIEFING','EN_JEU','PAUSE','FINISHED'].includes(s.stage),'BRIEFING_CLOSED');
    requireThat(c.publicationState==='PUBLISHED' && c.public.publicationState==='PUBLISHED','CONTENT_UNPUBLISHED');
    requireThat(s.modules?.groups===true,'MODULE_DISABLED');
    const gid=documentId(input.groupId),g=await tx.get(`sessions/${sid}/groups/${gid}`);
    requireThat(groupVisible(g,cid),'FORBIDDEN');
    return {s,c,g,m:memberFor(g,cid)};
  };

  const mediaService=createMediaService({store,signed,admin,isAdmin,checkSession,checkScenario,now,uuid,images,processImage,authorizeRead:async(actor,context,slot)=>{
    requireThat(context&&typeof context==='object','INVALID_MEDIA_TARGET');
    const id=documentId(context.id),scopeId=documentId(context.scopeId);let record;
    if(context.mode==='organizer')return store.runTransaction(async tx=>{
      requireThat(['scenario','session'].includes(context.scope),'INVALID_MEDIA_TARGET');
      if(context.scope==='session')await checkSession(tx,actor,scopeId);else await checkScenario(tx,actor,scopeId);
      const kinds={character:'characters',item:'items',inventory:'inventory',announcement:'announcements',contract:'contracts'};requireThat(kinds[context.kind],'INVALID_MEDIA_TARGET');
      const r=await tx.get(`${context.scope==='session'?'sessions':'scenarios'}/${scopeId}/${kinds[context.kind]}/${id}`);requireThat(r,'FORBIDDEN');return (context.kind==='inventory'?r.item:r).mediaImages?.[slot]??null;
    });
    if(context.mode==='public'){
      requireThat(context.kind==='character'&&slot==='portrait'&&context.scope==='session','FORBIDDEN');
      record=await dispatch('publicBadge',actor,{sessionId:scopeId,characterId:id});
    }else{
      signed(actor);requireThat(context.mode==='player'&&context.scope==='session','FORBIDDEN');
      if(context.kind==='character'){const d=await dispatch('mySession',actor,{sessionId:scopeId});requireThat(d.character?.id===id,'FORBIDDEN');record=d.character;}
      else if(context.kind==='inventory'){const d=await dispatch('myInventory',actor,{sessionId:scopeId}),l=[...d.lots,...d.stored,...d.ownedElsewhere,...d.heldForOthers].find(l=>l.id===id);requireThat(l,'FORBIDDEN');record=l.item;}
      else if(context.kind==='announcement')record=(await dispatch('announcementDetail',actor,{sessionId:scopeId,announcementId:id})).announcement;
      else if(context.kind==='contract')record=(await dispatch('contractDetail',actor,{sessionId:scopeId,contractId:id})).contract;
      else requireThat(false,'FORBIDDEN');
    }
    return record.mediaImages?.[slot]??null;
  }});
  const priceService=createPriceService({store,signed,checkSession,now,uuid});
  const voyageService=createVoyageService({store,signed,checkSession,now,uuid,rollD6});
  const cargoService=createCargoService({store,signed,checkSession,now,uuid});
  const logisticsService=createLogisticsService({store,signed,checkSession,now,uuid});
  const campaignService=createCampaignService({store,signed,admin,checkSession,checkScenario,now,uuid});
  const admissionService=createAdmissionService({store,signed,isAdmin,checkSession,now,uuid});
  const entryService=createSpaceOutlawsEntryService({store,signed,isAdmin,checkSession,now,uuid});
  const centralMasterService=createCentralMasterService({store,signed,isAdmin,now,uuid});
  const groupManagementService=createGroupManagementService({store,signed,checkSession,now,uuid});
  const personService=createPersonService({store,signed,checkSession,checkScenario,now,uuid,rollD6});
  const fieldService=createFieldService({store,signed,checkSession,checkScenario,now,uuid,rollD6});
  const masterService=createMasterService({store,admin,checkSession,checkScenario,now,uuid});
  const archiveService=createScenarioArchiveService({store,admin,checkScenario,now,uuid,images,archiveUpload:mediaService.archiveUpload});
  const actionPointService=createActionPointService({store,signed,checkSession,checkScenario,now,uuid});
  const bountyService=createBountyService({store,signed,checkSession,now,uuid});
  const contractService=createContractService({store,signed,checkSession,now,uuid});
  const announcementService=createAnnouncementService({store,signed,checkSession,now,uuid});
  const marketService=createMarketService({store,signed,checkSession,now,uuid});
  const customsService=createCustomsService({store,signed,checkSession,now,uuid});
  const negotiationService=createNegotiationService({store,signed,now,uuid});
  const shopService=createShopService({store,signed,checkSession,now,uuid});
  const saleService=createSaleService({store,signed,now,uuid});
  const collectiveService=createCollectiveService({store,signed,checkSession,checkScenario,now,uuid});
  const economyService=createEconomyService({store,signed,checkSession,checkScenario,now,uuid});
  const inventoryService=createInventoryService({store,signed,checkSession,checkScenario,now,uuid});
  const lotTransferService=createLotTransferService({store,signed,now,uuid});
  const healthService=createHealthService({store,signed,checkSession,checkScenario,now,uuid});
  const abilityService=createAbilityService({store,signed,checkSession,checkScenario,now,uuid});
  const notebookService=createNotebookService({store,signed,now,uuid});
  const knowledgeService=createKnowledgeService({store,signed,checkSession,checkScenario,now,uuid});

  async function dispatch(action,actor,input={}) {
    if(shopActions.includes(action))return shopService(action,actor,input);
    if(spaceOutlawsEntryActions.includes(action))return entryService(action,actor,input);
    if(admissionAction(action))return admissionService(action,actor,input);
    if(centralMasterAction(action))return centralMasterService(action,actor,input);
    if(groupManagementAction(action))return groupManagementService(action,actor,input);
    if(priceAction(action))return priceService(action,actor,input);
    if(voyageAction(action))return voyageService(action,actor,input);
    if(cargoAction(action))return cargoService(action,actor,input);
    if(logisticsAction(action))return logisticsService(action,actor,input);
    if(personAction(action))return personService(action,actor,input);
    if(fieldAction(action))return fieldService(action,actor,input);
    if(masterAction(action))return masterService(action,actor,input);
    if(campaignAction(action))return campaignService(action,actor,input);
    if(archiveAction(action))return archiveService(action,actor,input);
    if(mediaAction(action))return mediaService(action,actor,input);
    if(action==='setStage'&&['BRIEFING','EN_JEU'].includes(input.stage)){
      const health=await mediaService('mediaHealth',actor,{sessionId:input.sessionId});requireThat(health.issues.length===0,'MEDIA_MISSING');
    }
    if(actionPointAction(action))return actionPointService(action,actor,input);
    if(bountyAction(action))return bountyService(action,actor,input);
    if(contractAction(action))return contractService(action,actor,input);
    if(announcementAction(action))return announcementService(action,actor,input);
    if(marketAction(action))return marketService(action,actor,input);
    if(customsAction(action))return customsService(action,actor,input);
    if(negotiationAction(action))return negotiationService(action,actor,input);
    if(saleAction(action))return saleService(action,actor,input);
    if(collectiveAction(action))return collectiveService(action,actor,input);
    if(economyAction(action))return economyService(action,actor,input);
    if(lotTransferAction(action))return lotTransferService(action,actor,input);
    if(inventoryAction(action))return inventoryService(action,actor,input);
    if(healthAction(action))return healthService(action,actor,input);
    if(abilityAction(action))return abilityService(action,actor,input);
    if(notebookAction(action))return notebookService(action,actor,input);
    if(knowledgeAction(action))return knowledgeService(action,actor,input);
    const at=now(); const sid=input.sessionId ? documentId(input.sessionId) : null;
    if(action==='identity') {
      const verified=actor?.uid && actor.emailVerified===true && actor.provider==='google.com';
      const grants=verified && !isAdmin(actor) ? await store.list('sessionStaff',['email',actor.email.toLowerCase()]) : [];
      const central=verified&&!isAdmin(actor)?await store.runTransaction(tx=>centralDashboard(tx,actor,false)):[];
      return {uid:actor?.uid??null,email:actor?.email??null,admin:isAdmin(actor),organizer:isAdmin(actor)||grants.some(g=>g.active)||central.length>0};
    }
    if(action==='dashboard') {
      signed(actor);
      return store.runTransaction(async tx=>{
        const grants=await tx.list('sessionStaff',['email',actor.email.toLowerCase()]);
        const own=isAdmin(actor);
        const centralCampaigns=await centralDashboard(tx,actor,own);
        requireThat(own||grants.some(g=>g.active)||centralCampaigns.length>0,'FORBIDDEN');
        const [scenarios,sessions]=own ? await Promise.all([tx.list('scenarios',['ownerUid',actor.uid]),tx.list('sessions',['ownerUid',actor.uid])]) : [[],[]];
        const visible=sessions.map(s=>({...privateSession(s),role:'OWNER'}));
        for(const g of grants.filter(g=>g.active)) {
          const s=await tx.get(`sessions/${g.sessionId}`);
          if(s && s.ownerUid===g.ownerUid && !visible.some(x=>x.id===s.id)) visible.push({...privateSession(s),role:g.role});
        }
        const campaigns=own?await tx.list('campaigns',['ownerUid',actor.uid]):[];
        return {scenarios,sessions:visible,centralCampaigns,campaigns:campaigns.map(c=>({id:c.id,title:c.title,episodeCount:c.episodeCount,activeSessionId:c.activeSessionId,activeBuildId:c.activeBuildId,latestSessionId:c.latestSessionId,...(c.preparationSessionId?{preparationSessionId:c.preparationSessionId}:{})}))};
      });
    }
    if(action==='publicSession') {
      requireThat(sid,'INVALID_ID'); const s=await store.get(`sessions/${sid}`);
      requireThat(s && !isPreparation(s) && s.stage!=='ARCHIVED','NOT_FOUND'); return publicSession(s);
    }
    if(action==='publicBadge') {
      const cid=documentId(input.characterId);
      return store.runTransaction(async tx=>{
        const s=await tx.get(`sessions/${sid}`); const c=await tx.get(charPath(sid,cid));
        requireThat(s && !isPreparation(s) && s.stage!=='ARCHIVED' && c,'NOT_FOUND');
        const character=publicCharacter(c);
        const groups=s.modules?.groups===true ? await tx.list(`sessions/${sid}/groups`) : [];
        return {...character,affiliations:publicAffiliations(groups,cid)};
      });
    }
    if(action==='scenario') return store.runTransaction(async tx=>{
      const id=documentId(input.scenarioId); const s=await checkScenario(tx,actor,id);
      const [characters,versions,groups,knowledge,skills,classes,items]=await Promise.all([tx.list(`scenarios/${id}/characters`),tx.list(`scenarios/${id}/versions`),tx.list(`scenarios/${id}/groups`),tx.list(`scenarios/${id}/knowledge`),tx.list(`scenarios/${id}/skills`),tx.list(`scenarios/${id}/classes`),tx.list(`scenarios/${id}/items`)]);
      return {...s,characters,versions,groups,knowledge,skills,classes,items,warehouses:await tx.list(`scenarios/${id}/warehouses`)};
    });
    if(action==='session') return store.runTransaction(async tx=>{
      const {s,role,permissions}=await sessionAccess(tx,actor,sid);
      const [characters,registrations,audit,staff,groups,knowledge,skills,classes,items,inventory,accounts]=await Promise.all([tx.list(`sessions/${sid}/characters`),tx.list(`sessions/${sid}/registrations`),
        permissions.content?tx.list(`sessions/${sid}/audit`):[],permissions.staff?tx.list('sessionStaff',['sessionId',sid]):[],
        permissions.content?tx.list(`sessions/${sid}/groups`):[],permissions.content?tx.list(`sessions/${sid}/knowledge`):[],
        permissions.content?tx.list(`sessions/${sid}/skills`):[],permissions.content?tx.list(`sessions/${sid}/classes`):[],permissions.content?tx.list(`sessions/${sid}/items`):[],permissions.content?tx.list(`sessions/${sid}/inventory`):[],permissions.content?tx.list(`sessions/${sid}/accounts`):[]]);
      const ap=permissions.content&&s.actionPointRules?.enabled?await Promise.all(characters.map(c=>tx.get(actionPointPath(sid,c.id)))):null;
      if(ap)characters.forEach((c,i)=>c.actionPoints=actionPointSummary(s,c,ap[i],at));
      return {...privateSession(s),role,permissions,characters:permissions.content?characters:characters.map(receptionCharacter),registrations:(isPreparation(s)&&!permissions.content?[]:registrations).map(r=>({...r,previousCharacterId:s.campaignId?characters.find(c=>c.previousAssignedUid===r.uid)?.id??null:null})),
        ...(permissions.content?{campaignId:s.campaignId??null,campaignEpisode:s.campaignEpisode??null,campaignSealed:s.campaignSealed===true,previousSessionId:s.previousSessionId??null,groups,groupsEnabled:s.modules?.groups===true,knowledge,skills,classes,items,inventory:inventory.map(l=>effectiveLot(l,now())),accounts,actionPointRules:s.actionPointRules??null,economyRules:s.economyRules??null,healthRules:s.healthRules??null}:{}),
        audit:audit.sort((a,b)=>b.at-a.at).slice(0,50),staff:staff.map(g=>({email:g.email,role:g.role,active:g.active,updatedAt:g.updatedAt}))};
    });
    if(action==='myGroup' || action==='previewGroup') return store.runTransaction(async tx=>{
      const preview=action==='previewGroup';
      const {s,c,g}=await groupContext(tx,actor,sid,input,preview);
      const detail=await groupDetail(tx,`sessions/${sid}`,g,c.id);detail.permissions.publishUpdates=detail.permissions.publishUpdates&&canGameAction(s,c,'publish');
      return {session:publicSession(s),characterName:c.public.displayName,preview,group:detail,walletAccountId:s.economyRules?.enabled&&g.walletConfig&&(detail.permissions.readWallet||detail.permissions.payWallet)?groupAccountId(g.id):null};
    });
    if(action==='groupHistory') return store.runTransaction(async tx=>{
      let base;
      if(sid){await checkSession(tx,actor,sid);base=`sessions/${sid}`;}
      else {const id=documentId(input.scenarioId);await checkScenario(tx,actor,id);base=`scenarios/${id}`;}
      const gid=documentId(input.groupId);requireThat(await tx.get(`${base}/groups/${gid}`),'NOT_FOUND');
      return {versions:await tx.list(`${base}/groups/${gid}/history`,null,{orderBy:'at',direction:'desc',limit:30})};
    });
    if(action==='characterHistory') return store.runTransaction(async tx=>{
      const cid=documentId(input.characterId);
      let base;
      if(sid){await checkSession(tx,actor,sid);base=`sessions/${sid}/characters`;}
      else {const id=documentId(input.scenarioId);await checkScenario(tx,actor,id);base=`scenarios/${id}/characters`;}
      requireThat(await tx.get(`${base}/${cid}`),'NOT_FOUND');
      return {versions:(await tx.list(`${base}/${cid}/history`)).sort((a,b)=>b.revision-a.revision)};
    });
    if(action==='mySession' || action==='preview') return store.runTransaction(async tx=>{
      signed(actor); const s=await tx.get(`sessions/${sid}`); requireThat(s && !isPreparation(s) && s.stage!=='ARCHIVED','NOT_FOUND');
      const preview=action==='preview';
      if(preview) await checkSession(tx,actor,sid);
      const r=preview ? null : await tx.get(regPath(sid,actor.uid));
      let character=null, reason=null,rawCharacter=null;
      const cid=preview ? documentId(input.characterId) : r?.characterId;
      if(cid) {
        const c=await tx.get(charPath(sid,cid));
        const allowed=preview || (r.status==='ACCEPTED' && r.accessActive && c?.assignedUid===actor.uid
          && actor.authTime>=r.minAuthTime);
        if(!allowed) reason='ACCESS_INACTIVE';
        else if(!['BRIEFING','EN_JEU','PAUSE','FINISHED'].includes(s.stage)) reason='BRIEFING_CLOSED';
        else if(c?.publicationState!=='PUBLISHED' || c?.public.publicationState!=='PUBLISHED') reason='CONTENT_UNPUBLISHED';
        else {rawCharacter=c;character=participantCharacter(c,{active:true,uid:actor.uid,characterId:cid,sessionId:sid},actor.uid);}
      }
      if(character?.abilities&&s.actionPointRules?.enabled)for(const skill of character.abilities.skills){
        if(skill.healing){const scope=skill.healing.cooldownScope??'ACTOR';skill.healing={...skill.healing,cooldownScope:scope,cooldownSeconds:scope==='NONE'?0:scope==='PATIENT'?s.actionPointRules.patientCooldownSeconds:s.actionPointRules.cooldownSeconds};}
      }
      const groups=character && s.modules?.groups===true ? await tx.list(`sessions/${sid}/groups`) : [];
      return {session:publicSession(s),registration:ownRegistration(r),character,economyEnabled:s.economyRules?.enabled===true,actionPoints:rawCharacter&&s.actionPointRules?.enabled?actionPointSummary(s,rawCharacter,await tx.get(actionPointPath(sid,rawCharacter.id)),at):null,health:healthSummary(s,rawCharacter,at),reason,gameTimeMs:gameTime(s.clock,at),
        globalLevel:character?(rawCharacter.globalLevel??1):null,playerRules:character?playerRules(s):null,
        groups:groups.filter(g=>groupVisible(g,cid)).map(g=>groupSummary(g,cid))};
    });
    signed(actor);
    // Invitation redemption deliberately refuses every second consumption.
    if(action==='redeem') {
      requireThat(typeof input.token==='string' && /^[A-Za-z0-9_-]{43}$/.test(input.token),'INVALID_INVITATION');
      const tokenHash=hash(input.token);
      return store.runTransaction(async tx=>{
        const inv=await tx.get(`invitations/${tokenHash}`);
        requireThat(inv?.uid===actor.uid && inv.sessionId===sid && (!inv.purpose||inv.purpose==='PRIVATE_ACCESS'),'INVALID_INVITATION');
        const r=await tx.get(regPath(sid,actor.uid)); const c=await tx.get(charPath(sid,inv.characterId));
        const s=await tx.get(`sessions/${sid}`);
        requireThat(inv.status==='ACTIVE' && at<inv.expiresAt,'INVITATION_EXPIRED_OR_USED');
        requireThat(s && s.stage!=='ARCHIVED' && r?.status==='ACCEPTED' && r.characterId===inv.characterId
          && r.accessVersion===inv.accessVersion && c?.assignedUid===actor.uid,'ACCESS_INACTIVE');
        requireThat(actor.authTime>=r.minAuthTime,'REAUTH_REQUIRED');
        tx.set(`invitations/${tokenHash}`,{...inv,status:'CONSUMED',consumedAt:at});
        tx.set(regPath(sid,actor.uid),{...r,accessActive:true});
        return {activated:true};
      });
    }
    const requestId=documentId(input.requestId); const operationPath=`operations/${hash(`${actor.uid}:${requestId}`)}`;
    const fingerprint=hash(JSON.stringify([action,input])); const newId=uuid();
    return store.runTransaction(async tx=>{
      // A revoked staff member must not recover cached results by replaying a command.
      if(sessionCommands[action]) await checkSession(tx,actor,sid,sessionCommands[action]);
      let postingContext;
      if(action==='publishGroupUpdate') {
        postingContext=await groupContext(tx,actor,sid,input);
        requireThat(postingContext.m.permissions.publishUpdates===true,'FORBIDDEN');requireGameAction(postingContext.s,postingContext.c,'publish');
      }
      const previous=await tx.get(operationPath);
      if(previous) { requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED'); return previous.result; }
      let result, auditSid=sid;
      const audit={id:newId,action,at,actorUid:actor.uid};
      if(action==='createScenario') {
        admin(actor); const s={id:newId,ownerUid:actor.uid,title:text(input.title,150,true),summary:optional(input.summary,4000),revision:1,createdAt:at};
        tx.set(`scenarios/${newId}`,s); result={id:newId};
      } else if(action==='saveGroup' || action==='saveSessionGroup') {
        const session=action==='saveSessionGroup';
        const id=session ? sid : documentId(input.scenarioId);
        const parent=session?await checkSession(tx,actor,sid):await checkScenario(tx,actor,id);
        revision(parent,input.revision);if(session)requireThat(parent.stage!=='ARCHIVED','SESSION_CLOSED');
        const base=`${session?'sessions':'scenarios'}/${id}`,gid=input.groupId?documentId(input.groupId):newId;
        const old=input.groupId?await tx.get(`${base}/groups/${gid}`):null;
        if(input.groupId)requireThat(old,'NOT_FOUND');
        const next=groupInput(input,gid,old??{});await validateGroupMembers(tx,base,next);
        const reason=session?text(input.reason,500,true):'Édition du scénario';
        tx.set(`${base}/groups/${gid}`,next);
        tx.set(`${base}/groups/${gid}/history/${newId}`,{id:newId,at,actorUid:actor.uid,actorEmail:actor.email,reason,before:old,after:next});
        tx.set(base,{...parent,revision:parent.revision+1});
        Object.assign(audit,{groupId:gid,reason,beforeRevision:old?.revision??0,afterRevision:next.revision});
        result={id:gid};
      } else if(action==='setGroupModule') {
        const s=await checkSession(tx,actor,sid);revision(s,input.revision);requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
        requireThat(typeof input.enabled==='boolean','INVALID_STATUS');const reason=text(input.reason,500,true);
        tx.set(`sessions/${sid}`,{...s,modules:{...s.modules,groups:input.enabled},revision:s.revision+1});
        Object.assign(audit,{reason,before:s.modules?.groups===true,after:input.enabled});result={enabled:input.enabled};
      } else if(action==='publishGroupUpdate') {
        const {s,c,g}=postingContext;requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');
        const title=text(input.title,150,true),body=text(input.body,6000,true);
        const recipients=g.members.filter(m=>m.active && m.revealed && m.permissions.readUpdates);
        const update={id:newId,at,title,body,authorName:c.public.displayName};
        tx.set(`sessions/${sid}/groups/${g.id}/updates/${newId}`,{...update,
          authorUid:actor.uid,authorCharacterId:c.id,recipientIds:recipients.map(m=>m.characterId)});
        // A member added later receives only future posts, not the group's past.
        for(const m of recipients)tx.set(`sessions/${sid}/groups/${g.id}/inboxes/${m.characterId}/updates/${newId}`,update);
        Object.assign(audit,{groupId:g.id,characterId:c.id,updateId:newId});result={id:newId};
      } else if(action==='saveSessionCharacter') {
        const s=await checkSession(tx,actor,sid);revision(s,input.revision);requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
        const cid=documentId(input.characterId),c=await tx.get(charPath(sid,cid));requireThat(c,'NOT_FOUND');
        preserveSessionNature(input,c);
        const reason=text(input.reason,500,true),next=characterInput(input,cid,c),base=`sessions/${sid}/characters`;
        await validateRelations(tx,base,next);
        recordPublication(tx,base,c,next,{id:newId,at,actorUid:actor.uid,reason,stage:s.stage});
        tx.set(charPath(sid,cid),next);
        Object.assign(audit,{characterId:cid,reason,beforeRevision:c.contentRevision??1,afterRevision:next.contentRevision});
        tx.set(`sessions/${sid}`,{...s,revision:s.revision+1});result={id:cid};
      } else if(action==='saveCharacter') {
        const id=documentId(input.scenarioId), s=await checkScenario(tx,actor,id); revision(s,input.revision);
        const cid=input.characterId ? documentId(input.characterId) : newId;
        const base=`scenarios/${id}/characters`,old=input.characterId ? await tx.get(`${base}/${cid}`) : null;
        if(input.characterId) requireThat(old,'NOT_FOUND');
        const next=characterInput(input,cid,old??{});await validateRelations(tx,base,next);
        recordPublication(tx,base,old,next,{id:newId,at,actorUid:actor.uid,reason:'Édition du scénario'});
        tx.set(`${base}/${cid}`,next);
        tx.set(`scenarios/${id}`,{...s,revision:s.revision+1}); result={id:cid};
      } else if(action==='publishScenario') {
        const id=documentId(input.scenarioId),s=await checkScenario(tx,actor,id); revision(s,input.revision);
        const [chars,groups,knowledge,skills,classes,items]=await Promise.all([tx.list(`scenarios/${id}/characters`),tx.list(`scenarios/${id}/groups`),tx.list(`scenarios/${id}/knowledge`),tx.list(`scenarios/${id}/skills`),tx.list(`scenarios/${id}/classes`),tx.list(`scenarios/${id}/items`)]); requireThat(chars.length>0,'EMPTY_SCENARIO');
        if(s.actionPointRules)for(const c of chars)actionPointMaximum(s.actionPointRules,c);
        const fieldTargets=await tx.list(`scenarios/${id}/fieldTargets`);for(const t of fieldTargets)validateFieldReferences(t,{fieldTargets,skills,items,knowledge});
        const personProfiles=await tx.list(`scenarios/${id}/personProfiles`);for(const p of personProfiles)validatePersonReferences(p,{skills,items});
        const warehouses=await tx.list(`scenarios/${id}/warehouses`),ships=await tx.list(`scenarios/${id}/ships`),routes=await tx.list(`scenarios/${id}/routes`);
        for(const ship of ships)validateNavigationReferences(ship,{characters:chars,groups,items});
        const commodityPrices=await tx.list(`scenarios/${id}/commodityPrices`),priceEvents=await tx.list(`scenarios/${id}/priceEvents`);
        validateEconomicReferences({commodityPrices,priceEvents,items,fieldTargets,routes});
        const cargoTariffs=await tx.list(`scenarios/${id}/cargoTariffs`);validateCargoTariffReferences({cargoTariffs,characters:chars,groups,items,economyRules:s.economyRules});
        const recipes=await tx.list(`scenarios/${id}/recipes`);for(const r of recipes){recipeInput(r,r.id);validateRecipeReferences(r,{items,skills,knowledge,fieldTargets});}
        const masterRows=await tx.list(`scenarios/${id}/masterRows`);
        const version={id:newId,transportRules:s.transportRules??null,masterRowBaseline:masterRows,title:s.title,summary:s.summary,sourceRevision:s.revision,createdAt:at,characterCount:chars.length,groupCount:groups.length,knowledgeCount:knowledge.length,skillCount:skills.length,classCount:classes.length,itemCount:items.length,actionPointRules:s.actionPointRules??null,economyRules:s.economyRules??null,healthRules:s.healthRules??null};
        tx.set(`scenarios/${id}/versions/${newId}`,version);
        for(const c of chars) tx.set(`scenarios/${id}/versions/${newId}/characters/${c.id}`,c);
        for(const g of groups)tx.set(`scenarios/${id}/versions/${newId}/groups/${g.id}`,g);
        for(const k of knowledge)tx.set(`scenarios/${id}/versions/${newId}/knowledge/${k.id}`,k);
        for(const k of skills)tx.set(`scenarios/${id}/versions/${newId}/skills/${k.id}`,k);
        for(const k of classes)tx.set(`scenarios/${id}/versions/${newId}/classes/${k.id}`,k);
        for(const k of items)tx.set(`scenarios/${id}/versions/${newId}/items/${k.id}`,k);
        for(const t of fieldTargets)tx.set(`scenarios/${id}/versions/${newId}/fieldTargets/${t.id}`,t);
        for(const p of personProfiles)tx.set(`scenarios/${id}/versions/${newId}/personProfiles/${p.id}`,p);
        for(const sh of ships)tx.set(`scenarios/${id}/versions/${newId}/ships/${sh.id}`,sh);
        for(const rt of routes)tx.set(`scenarios/${id}/versions/${newId}/routes/${rt.id}`,rt);
        for(const w of warehouses)tx.set(`scenarios/${id}/versions/${newId}/warehouses/${w.id}`,w);
        for(const [kind,records] of [['commodityPrices',commodityPrices],['priceEvents',priceEvents],['cargoTariffs',cargoTariffs],['recipes',recipes]])for(const r of records)tx.set(`scenarios/${id}/versions/${newId}/${kind}/${r.id}`,r);
        result={id:newId};
      } else if(action==='createSession') {
        const id=documentId(input.scenarioId),vid=documentId(input.versionId);await checkScenario(tx,actor,id);
        requireThat(input.mode===undefined||input.mode==='INDEPENDENT','INVALID_SESSION_MODE');
        const data=await readScenarioVersion(tx,id,vid),s=sessionFromVersion(input,data,newId,actor,at);
        seedScenarioSession(tx,s,data,actor,at);result={id:newId};auditSid=newId;
      } else if(action==='setStaff') {
        const s=await checkSession(tx,actor,sid,'staff');revision(s,input.revision);
        requireThat(s.stage!=='ARCHIVED'||(s.campaignSealed&&input.active===false),'SESSION_CLOSED');
        const email=staffEmail(input.email),role=status(input.role,['MJ','RECEPTION']);
        requireThat(email!==ownerEmail.toLowerCase() && typeof input.active==='boolean','INVALID_STAFF');
        const reason=text(input.reason,500,true),path=staffPath(sid,email),old=await tx.get(path);
        tx.set(path,{sessionId:sid,ownerUid:s.ownerUid,email,role,active:input.active,updatedAt:at,updatedBy:actor.uid});
        if(!s.campaignSealed)tx.set(`sessions/${sid}`,{...s,revision:s.revision+1});
        Object.assign(audit,{email,reason,before:old?{role:old.role,active:old.active}:null,after:{role,active:input.active}});
        if(s.campaignSealed){auditSid=null;tx.set(`campaigns/${s.campaignId}/history/${newId}`,{...audit,sessionId:sid});}
        result={email,role,active:input.active};
      } else if(action==='setRegistrationOpen' || action==='setStage') {
        const s=await checkSession(tx,actor,sid,sessionCommands[action]); revision(s,input.revision);
        let next={...s,revision:s.revision+1};
        if(action==='setRegistrationOpen') {
          requireThat(!['FINISHED','ARCHIVED'].includes(s.stage),'SESSION_CLOSED');
          requireThat(typeof input.open==='boolean','INVALID_STATUS'); next.registrationOpen=input.open;
        } else {
          const transitions={PREPARATION:['BRIEFING'],BRIEFING:['EN_JEU'],EN_JEU:['PAUSE','FINISHED'],PAUSE:['EN_JEU','FINISHED'],FINISHED:['ARCHIVED'],ARCHIVED:[]};
          requireThat(transitions[s.stage].includes(input.stage),'INVALID_TRANSITION');
          if(s.spaceOutlaws){
            authorizeSpaceOutlaws(tx,s,'RHYTHM');
            requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
            if(s.stage==='BRIEFING'&&!hasSoHealth(s))requireThat((await tx.list(`sessions/${sid}/fieldTargets`)).some(t=>t.kind==='ANALYSIS'&&t.publicationState==='PUBLISHED'),'SO_ACTION_TARGET_REQUIRED');
            if(input.stage==='FINISHED'){
              requireThat(!(await tx.list(`sessions/${sid}/fieldActions`)).some(a=>a.status==='ACTIVE'),'FIELD_ACTIONS_OPEN');
              requireThat(!(await tx.list(`sessions/${sid}/ships`)).some(x=>x.journey||x.operation),'VOYAGES_OPEN');
              requireThat(!(await tx.list(`sessions/${sid}/personActions`)).some(personOpen),'PERSON_ACTIONS_OPEN');
              if(hasSoHealth(s))requireThat(!(await tx.list(`sessions/${sid}/characters`)).some(c=>['URGENT','EXPIRED'].includes(survival(s,c,at).status)),'SO_SURVIVAL_OPEN');
            }
          }
          if(input.stage==='ARCHIVED')requireThat(!(await tx.list(`sessions/${sid}/personActions`)).some(personOpen),'PERSON_ACTIONS_OPEN');
          if(input.stage==='ARCHIVED')requireThat(!(await tx.list(`sessions/${sid}/fieldActions`)).some(a=>a.status==='ACTIVE'),'FIELD_ACTIONS_OPEN');
          if(input.stage==='ARCHIVED')requireThat(!(await tx.list(`sessions/${sid}/ships`)).some(s=>s.journey),'VOYAGES_OPEN');
          if(input.stage==='ARCHIVED')requireThat(!(await tx.list(`sessions/${sid}/cargoTransfers`)).some(t=>t.status==='LOADING'),'CARGO_TRANSFERS_OPEN');
          if(input.stage==='ARCHIVED')requireThat(!s.campaignId,'CAMPAIGN_CLOSE_REQUIRED');
          if(input.stage==='ARCHIVED')requireThat(!(await tx.list(`sessions/${sid}/bounties`)).some(b=>b.status==='OPEN'),'BOUNTIES_OPEN');
          if(input.stage==='ARCHIVED')requireThat(!(await tx.list(`sessions/${sid}/contracts`)).some(c=>['PROPOSED','ACTIVE','SUBMITTED'].includes(c.status)),'CONTRACTS_OPEN');
          next.stage=input.stage;
          if(s.stage==='EN_JEU') next.clock=pauseClock(s.clock,at);
          if(input.stage==='EN_JEU') next.clock=resumeClock(s.clock,at);
          if(['FINISHED','ARCHIVED'].includes(input.stage)) next.registrationOpen=false;
        }
        tx.set(`sessions/${sid}`,next); result=privateSession(next);
      } else if(action==='register') {
        const s=await tx.get(`sessions/${sid}`); const existing=await tx.get(regPath(sid,actor.uid));
        requireThat(s?.registrationOpen && !['FINISHED','ARCHIVED'].includes(s.stage),'REGISTRATION_CLOSED');
        requireThat(!existing,'ALREADY_REGISTERED');
        const answers={}; for(const f of s.fields) answers[f.id]=text(input.answers?.[f.id] ?? '',2000,f.required);
        const accepted=s.accepted<s.capacity;
        const r={uid:actor.uid,sessionId:sid,name:text(input.name,150,true),email:actor.email,answers,
          status:accepted?'ACCEPTED':'WAITLISTED',characterId:null,accessActive:false,accessVersion:0,minAuthTime:0,createdAt:at};
        tx.set(regPath(sid,actor.uid),r);
        if(accepted) tx.set(`sessions/${sid}`,{...s,accepted:s.accepted+1,revision:s.revision+1});
        result=ownRegistration(r);
      } else if(action==='setRegistrationStatus' || action==='cancelRegistration') {
        const s=action==='cancelRegistration' ? await tx.get(`sessions/${sid}`) : await checkSession(tx,actor,sid,'reception');
        const uid=action==='cancelRegistration' ? actor.uid : text(input.uid,128,true);
        const r=await tx.get(regPath(sid,uid)); requireThat(r && s,'NOT_FOUND');
        const nextStatus=action==='cancelRegistration' ? 'CANCELLED' : status(input.status,['RECEIVED','INCOMPLETE','ACCEPTED','WAITLISTED','REFUSED','CANCELLED']);
        const accepted=s.accepted+(nextStatus==='ACCEPTED'?1:0)-(r.status==='ACCEPTED'?1:0);
        requireThat(accepted<=s.capacity,'CAPACITY_REACHED');
        const c=r.characterId ? await tx.get(charPath(sid,r.characterId)) : null;
        const next={...r,status:nextStatus};
        if(nextStatus!=='ACCEPTED') { next.characterId=null; next.accessActive=false; next.accessVersion++; if(c) tx.set(charPath(sid,c.id),{...c,assignedUid:null}); }
        tx.set(regPath(sid,uid),next); tx.set(`sessions/${sid}`,{...s,accepted,revision:s.revision+1}); result={status:nextStatus};
      } else if(action==='assign') {
        const s=await checkSession(tx,actor,sid,'reception'); requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
        const uid=text(input.uid,128,true), cid=documentId(input.characterId);
        const r=await tx.get(regPath(sid,uid)), c=await tx.get(charPath(sid,cid));
        requireThat(r?.status==='ACCEPTED' && c,'INVALID_ASSIGNMENT');
        requireThat(!c.assignedUid || c.assignedUid===uid || input.replace===true,'CHARACTER_TAKEN');
        const oldChar=r.characterId && r.characterId!==cid ? await tx.get(charPath(sid,r.characterId)) : null;
        const oldReg=c.assignedUid && c.assignedUid!==uid ? await tx.get(regPath(sid,c.assignedUid)) : null;
        if(oldChar) tx.set(charPath(sid,oldChar.id),{...oldChar,assignedUid:null});
        if(oldReg) tx.set(regPath(sid,oldReg.uid),{...oldReg,characterId:null,accessActive:false,accessVersion:oldReg.accessVersion+1});
        tx.set(charPath(sid,cid),{...c,assignedUid:uid});
        tx.set(regPath(sid,uid),{...r,characterId:cid,accessActive:false,accessVersion:r.accessVersion+1,briefingReadAt:null});
        result={assigned:true};
      } else if(action==='issueInvitation' || action==='revokeAccess') {
        await checkSession(tx,actor,sid,'reception'); const uid=text(input.uid,128,true),r=await tx.get(regPath(sid,uid));
        requireThat(r?.characterId && r.status==='ACCEPTED','INVALID_ASSIGNMENT');
        const version=r.accessVersion+1;
        if(action==='issueInvitation') {
          requireThat(typeof input.tokenHash==='string' && /^[a-f0-9]{64}$/.test(input.tokenHash),'INVALID_INVITATION');
          requireThat(!await tx.get(`invitations/${input.tokenHash}`),'INVALID_INVITATION');
          const hours=whole(input.hours); requireThat(hours>=1 && hours<=168,'INVALID_EXPIRY');
          const expiresAt=at+hours*3600000;
          tx.set(`invitations/${input.tokenHash}`,{purpose:'PRIVATE_ACCESS',uid,sessionId:sid,characterId:r.characterId,accessVersion:version,status:'ACTIVE',expiresAt});
          result={expiresAt};
        } else result={revoked:true};
        tx.set(regPath(sid,uid),{...r,accessActive:false,accessVersion:version,
          minAuthTime:action==='revokeAccess' ? Math.floor(at/1000)+1 : r.minAuthTime});
      } else if(action==='confirmBriefing') {
        const s=await tx.get(`sessions/${sid}`),r=await tx.get(regPath(sid,actor.uid));
        requireThat(r?.characterId,'FORBIDDEN'); const c=await tx.get(charPath(sid,r.characterId));
        requireThat(r.accessActive && actor.authTime>=r.minAuthTime && r.status==='ACCEPTED' && c?.assignedUid===actor.uid,'FORBIDDEN');
        requireThat(['BRIEFING','EN_JEU','PAUSE','FINISHED'].includes(s?.stage) && c.publicationState==='PUBLISHED','BRIEFING_CLOSED');
        tx.set(regPath(sid,actor.uid),{...r,briefingReadAt:at,briefingReadRevision:c.contentRevision??1}); result={confirmed:true};
      } else requireThat(false,'UNKNOWN_ACTION');
      tx.set(operationPath,{uid:actor.uid,fingerprint,result,at});
      if(auditSid) tx.set(`sessions/${auditSid}/audit/${newId}`,audit);
      return result;
    });
  }
  return {dispatch};
}

