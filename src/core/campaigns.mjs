import {personOpen} from './person-state.mjs';
import {spaceOutlawsProfile,isPreparation,preparationInput,preparationSession,guardPreparationWrites} from './preparation-state.mjs';
import {effectiveFieldState} from './field-state.mjs';
import {createHash} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
import {readScenarioVersion,sessionFromVersion,seedScenarioSession} from './session-seed.mjs';
import {gameTime} from './clock.mjs';
import {recordPublication} from './narrative.mjs';
import {actionPointPath,actionPointMaximum} from './action-point-state.mjs';
import {accountId,moneyState,writeLedger} from './economy-state.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>hash(JSON.stringify(canonical(v)));
const text=(v,max=500)=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=max,'INVALID_CAMPAIGN');return v.trim();};
const sorted=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id));
const root=id=>`campaigns/${documentId(id)}`;
const collections=['characters','groups','knowledge','skills','classes','items','accounts','inventory','masterRows','fieldTargets','fieldStates','personProfiles','warehouses','ships','routes','commodityPrices','priceEvents','cargoTariffs','recipes'];
const reads=['campaign','prepareCampaignStart','prepareCampaignClosure','prepareCampaignEpisode'];
const writes=['createSpaceOutlawsPreparation','saveSpaceOutlawsPreparation','startCampaign','closeCampaignSession','beginCampaignEpisode','advanceCampaignEpisode','reopenCampaignSession'];
export const campaignCommands=[...reads,...writes];
export const campaignAction=a=>campaignCommands.includes(a);
export const campaignLimits={records:5000,bytes:6*1024*1024,pageRecords:30,pageBytes:250000,closureWrites:200};

// Every mutation, including legacy services and in-flight transactions, checks the seal.
// Buffering preserves the Firestore rule that all reads precede all writes.
export function campaignGuardStore(store){
 return {get:store.get.bind(store),list:store.list.bind(store),runTransaction:callback=>store.runTransaction(async tx=>{
  const pending=new Map(),result=await callback({...tx,set:(path,data)=>pending.set(path,data)});
  const ids=new Set([...pending.keys()].filter(p=>p.startsWith('sessions/')).map(p=>p.split('/')[1]));
  for(const sid of ids){const s=await tx.get(`sessions/${sid}`);requireThat(!s?.campaignSealed,'CAMPAIGN_SESSION_SEALED');guardPreparationWrites(s,pending);}
  for(const [path,data] of pending)tx.set(path,data);return result;
 })};
}

async function readState(tx,s){
 const base=`sessions/${s.id}`,data=Object.fromEntries(await Promise.all(collections.map(async k=>[k,sorted(await tx.list(`${base}/${k}`))])));
 data.receipts=Object.fromEntries(await Promise.all(data.characters.map(async c=>[c.id,sorted(await tx.list(`${base}/characters/${c.id}/knowledge`))])));
 data.updates=Object.fromEntries(await Promise.all(data.groups.map(async g=>[g.id,sorted(await tx.list(`${base}/groups/${g.id}/updates`))])));
 return data;
}
function stateSummary(data,healthPolicy='PRESERVE'){
 return {characters:data.characters.map(c=>({id:c.id,name:c.public.displayName,level:c.globalLevel??1,skills:c.abilityProfile?.skills.length??0,
  balance:data.accounts.find(a=>a.id===accountId(c.id))?.balance??null,hpBefore:c.hp??null,hpAfter:healthPolicy==='RESTORE'&&c.maxHp!=null?c.maxHp:c.hp??null,maxHp:c.maxHp??null,
  lots:data.inventory.filter(l=>l.ownerType!=='GROUP'&&l.ownerId===c.id&&l.quantity>0).length,knowledge:(data.receipts[c.id]??[]).filter(r=>r.active).length})),
  accounts:data.accounts.map(a=>({id:a.id,ownerType:a.ownerType,label:a.ownerType==='GROUP'?a.label:data.characters.find(c=>c.id===a.characterId)?.public.displayName??a.id,balance:a.balance,reserved:a.reserved})),
  groups:data.groups.length,lots:data.inventory.length,quantity:data.inventory.reduce((n,l)=>n+l.quantity,0),receipts:Object.values(data.receipts).reduce((n,r)=>n+r.length,0)};
}
const cpSummary=c=>({id:c.id,title:c.title,revision:c.revision,activeSessionId:c.activeSessionId,activeBuildId:c.activeBuildId,latestSessionId:c.latestSessionId,episodeCount:c.episodeCount,...(c.preparationSessionId?{preparationSessionId:c.preparationSessionId,ruleProfile:c.ruleProfile}:{})});
const sourceIdentity=s=>({id:s.id,revision:s.revision,scenarioId:s.scenarioId,versionId:s.versionId,actionPointRules:s.actionPointRules??null,healthRules:s.healthRules??null,economyRules:s.economyRules??null,modules:s.modules??{},transportRules:s.transportRules??null});
function episodeHeader(input,source,campaign,newId,actor,at){
 requireThat(['PRESERVE','RESTORE'].includes(input.healthPolicy),'CAMPAIGN_HEALTH_POLICY_REQUIRED');
 const template={v:{transportRules:source.transportRules??null,masterRowBaseline:source.masterRowBaseline??[],summary:source.summary,economyRules:source.economyRules??null,healthRules:null,actionPointRules:source.actionPointRules??null},chars:[],groups:[]};
 const s=sessionFromVersion({...input,scenarioId:source.scenarioId,versionId:source.versionId},template,newId,actor,at);
 return {...s,healthRules:source.healthRules??null,modules:source.modules??{},campaignId:campaign.id,campaignEpisode:campaign.episodeCount+1,
  previousSessionId:source.id,campaignSealed:false,campaignHealthPolicy:input.healthPolicy};
}
function episodeEntries(data,source,s,actor,at){
 const entries=[],put=(path,value)=>entries.push({path,data:value});
 const reason=`Reprise de l’épisode ${source.campaignEpisode} — ${source.id}`;
 for(const c of data.characters){
  const next={...c,sessionId:s.id,assignedUid:null,previousAssignedUid:c.assignedUid??c.previousAssignedUid??null,
   contentRevision:1,historyStarted:true,campaignId:s.campaignId,campaignCharacterId:c.campaignCharacterId??c.id};
  delete next.actionPoints;delete next.activeFieldActionId;delete next.activePersonActionId;delete next.activeAidId;delete next.lootEncounter;
  next.convalescentUntilGameMs=s.campaignHealthPolicy==='RESTORE'?0:Math.max(0,(c.convalescentUntilGameMs??0)-gameTime(source.clock,at));
  if(s.campaignHealthPolicy==='RESTORE'&&c.maxHp!=null)Object.assign(next,{hp:c.maxHp,outOfCombat:false,healthRevision:(c.healthRevision??0)+1});
  if(s.actionPointRules)actionPointMaximum(s.actionPointRules,next);
  put(`characters/${c.id}`,next);
  recordPublication({set:(path,value)=>put(path.slice(`sessions/${s.id}/`.length),value)},`sessions/${s.id}/characters`,null,next,{id:s.id,at,actorUid:actor.uid,reason,stage:'PREPARATION'});
  for(const r of data.receipts[c.id]??[])put(`characters/${c.id}/knowledge/${r.id}`,r);
 }
 for(const key of ['groups','knowledge','skills','classes','items','masterRows','fieldTargets','personProfiles','ships','routes','commodityPrices','priceEvents','cargoTariffs','recipes'])for(const row of data[key])put(`${key}/${row.id}`,row);
 for(const w of data.warehouses)put(`warehouses/${w.id}`,{...w,revision:1,expiresAtGameMs:w.tenantId?Math.max(0,w.expiresAtGameMs-gameTime(source.clock,at)):null});
 for(const row of data.fieldStates){const state=effectiveFieldState(source,row,at),time=gameTime(source.clock,at);put(`fieldStates/${row.id}`,{...state,activeActionId:null,offlineUntilGameMs:state.offlineUntilGameMs===null?null:Math.max(0,state.offlineUntilGameMs-time),lockedUntilGameMs:Math.max(0,state.lockedUntilGameMs-time),protectedUntilGameMs:Math.max(0,state.protectedUntilGameMs-time)});}
 for(const g of data.groups)for(const u of data.updates[g.id]??[]){
  put(`groups/${g.id}/updates/${u.id}`,u);
  // Preserve the original audience. Later members never receive earlier posts.
  for(const cid of u.recipientIds??[])put(`groups/${g.id}/inboxes/${cid}/updates/${u.id}`,{id:u.id,at:u.at,title:u.title,body:u.body,authorName:u.authorName});
 }
 for(const a of data.accounts){
  const next={...a,sessionId:s.id,revision:1,carriedFrom:{sessionId:source.id,revision:a.revision}};put(`accounts/${a.id}`,next);
  const event={id:hash(`carry:${a.id}`),at,kind:'CAMPAIGN_CARRY',actorUid:actor.uid,memo:'Solde conservé de l’épisode précédent',reason,sourceSessionId:source.id,createdCurrency:0,removedCurrency:0,
   entries:[{accountId:a.id,characterId:a.characterId??null,groupId:a.groupId??null,delta:0,before:moneyState(next),after:moneyState(next)}]};
  writeLedger({set:(path,value)=>put(path.slice(`sessions/${s.id}/`.length),value)},s.id,event);
 }
 for(const l of data.inventory){put(`inventory/${l.id}`,l);put(`inventory/${l.id}/history/${s.id}`,{id:s.id,kind:'CAMPAIGN_CARRY',at,actorUid:actor.uid,reason,sourceSessionId:source.id,before:{quantity:l.quantity,status:l.status,revision:l.revision},after:{quantity:l.quantity,status:l.status,revision:l.revision}});}
 requireThat(entries.length<=campaignLimits.records&&Buffer.byteLength(JSON.stringify(entries))<=campaignLimits.bytes,'CAMPAIGN_TOO_LARGE');
 return entries;
}
export function campaignPagesFor(entries){
 const pages=[];let page=[],bytes=0;
 for(const entry of entries){const size=Buffer.byteLength(JSON.stringify(entry));requireThat(size<800000,'CAMPAIGN_RECORD_TOO_LARGE');
  if(page.length&&(page.length>=campaignLimits.pageRecords||bytes+size>campaignLimits.pageBytes)){pages.push(page);page=[];bytes=0;}
  page.push(entry);bytes+=size;
 }
 if(page.length)pages.push(page);return pages;
}

export function createCampaignService({store,signed,admin,checkScenario,checkSession,now,uuid}){
 const owned=async(tx,actor,id)=>{admin(actor);const c=await tx.get(root(id));requireThat(c&&c.ownerUid===actor.uid,'FORBIDDEN');return c;};
 const sessionContext=async(tx,actor,input)=>{const s=await checkSession(tx,actor,documentId(input.sessionId));requireThat(s.campaignId,'NOT_A_CAMPAIGN');const c=await tx.get(root(s.campaignId));requireThat(c&&c.ownerUid===s.ownerUid,'FORBIDDEN');return {s,c};};
 async function startPlan(tx,actor,input){
  await checkScenario(tx,actor,documentId(input.scenarioId));const data=await readScenarioVersion(tx,input.scenarioId,documentId(input.versionId));
  const title=text(input.campaignTitle,150),header=sessionFromVersion(input,data,'preview',actor,0);
  return {data,title,confirmation:digest({title,header,data}),summary:{characters:data.chars.length,groups:data.groups.length,mode:'NEW_CAMPAIGN',title}};
 }
 async function closurePlan(tx,s,c,input,at){
  requireThat(!s.campaignSealed&&c.activeSessionId===s.id,'CAMPAIGN_SESSION_SEALED');
  requireThat(['PREPARATION','BRIEFING','PAUSE','FINISHED'].includes(s.stage),'CAMPAIGN_PAUSE_REQUIRED');
  const data=await readState(tx,s),base=`sessions/${s.id}`,blocks=[],changes=[];
  const [contracts,bounties,sales,transfers,listings,resources]=await Promise.all([
   tx.list(`${base}/contracts`),tx.list(`${base}/bounties`),tx.list(`${base}/lotSales`),tx.list(`${base}/lotTransfers`),tx.list(`${base}/marketListings`),
   Promise.all(data.characters.map(ch=>tx.get(actionPointPath(s.id,ch.id))))]);
  const block=(kind,rows)=>{for(const r of rows)blocks.push({kind,id:r.id,title:r.terms?.title??r.item?.name??r.label??r.name??r.id});};
  const personActions=await tx.list(`${base}/personActions`);block('PERSON_ACTION',personActions.filter(personOpen));
  const fieldActions=await tx.list(`${base}/fieldActions`);block('FIELD_ACTION',fieldActions.filter(a=>a.status==='ACTIVE'));
  block('VOYAGE',data.ships.filter(sh=>sh.journey));
  block('CARGO_RESERVED',data.inventory.filter(l=>l.status==='CARGO_RESERVED'));
  const cargoTransfers=await tx.list(`${base}/cargoTransfers`);block('CARGO_TRANSFER',cargoTransfers.filter(t=>t.status==='LOADING'));
  block('FIELD_RESERVED',data.inventory.filter(l=>l.status==='FIELD_RESERVED'));
  block('CONTRACT',contracts.filter(r=>['PROPOSED','ACTIVE','SUBMITTED'].includes(r.status)));
  block('BOUNTY',bounties.filter(r=>r.status==='OPEN'));
  block('PICKUP',sales.filter(r=>r.status==='SOLD'&&r.pickupStatus!=='RECEIVED'));
  block('RESERVED_CREDITS',data.accounts.filter(r=>r.reserved!==0));
  block('RESERVED_AP',data.characters.filter((ch,i)=>(resources[i]?.reserved??0)>0));
  const openListings=listings.filter(r=>r.status==='ACTIVE'),openSales=sales.filter(r=>r.status==='PENDING'),openTransfers=transfers.filter(r=>r.status==='PENDING');
  for(const lot of data.inventory)if(lot.status==='RESERVED'){
   const listing=openListings.find(r=>r.id===lot.marketReservation?.listingId&&r.lotId===lot.id);
   if(!listing)block('RESERVED_STOCK',[lot]);
   else changes.push({path:`inventory/${lot.id}`,data:{...lot,status:'AVAILABLE',marketReservation:null,revision:lot.revision+1}});
  }
  for(const [key,rows,status] of [['marketListings',openListings,'WITHDRAWN'],['lotSales',openSales,'CANCELLED'],['lotTransfers',openTransfers,'CANCELLED']])for(const r of rows)changes.push({path:`${key}/${r.id}`,data:{...r,status,revision:r.revision+1,closedAt:at,closeReason:'Clôture de campagne'}});
  if(changes.length>campaignLimits.closureWrites)blocks.push({kind:'TOO_MANY_OFFERS',id:s.id,title:'Retirer des offres avant de recommencer le bilan.'});
  const cancelled={market:openListings.length,sales:openSales.length,transfers:openTransfers.length};
  const summary=stateSummary(data),reason=text(input.reason);
  // No real time in the consent: the paused source does not change by waiting.
  const confirmation=digest({session:s,revision:c.revision,data,contracts:sorted(contracts),bounties:sorted(bounties),sales:sorted(sales),transfers:sorted(transfers),listings:sorted(listings),resources,fieldActions,personActions,cargoTransfers,reason,cancelOffers:input.cancelOffers===true});
  return {data,changes,summary,blocks,cancelled,reason,confirmation,canClose:blocks.length===0&&(Object.values(cancelled).every(n=>n===0)||input.cancelOffers===true)};
 }
 async function episodePlan(tx,actor,c,input){
  requireThat(!c.preparationSessionId,'PREPARATION_ONLY');
  requireThat(!c.activeSessionId&&!c.activeBuildId,'CAMPAIGN_EPISODE_ACTIVE');requireThat(c.latestSessionId,'CAMPAIGN_NO_CHECKPOINT');
  const source=await tx.get(`sessions/${c.latestSessionId}`);requireThat(source?.campaignSealed&&source.campaignId===c.id,'CAMPAIGN_NO_CHECKPOINT');
  const data=await readState(tx,source),header=episodeHeader(input,source,c,'preview',actor,0);
  const entries=episodeEntries(data,source,header,actor,0),summary=stateSummary(data,input.healthPolicy),reason=text(input.reason);
  return {source,data,summary,confirmation:digest({campaign:cpSummary(c),source:sourceIdentity(source),header,entries,reason}),recordCount:entries.length};
 }
 return async function dispatch(action,actor,input){
  signed(actor);const at=now();
  if(action==='createSpaceOutlawsPreparation'){
   admin(actor);const metadata=preparationInput(input,{creating:true}),title=text(input.campaignTitle,150);
   const creationId=documentId(input.creationId),requestId=documentId(input.requestId);
   const id=`so_${hash(`${actor.uid}:${creationId}`)}`,sid=`so_${hash(`preparation:${id}`)}`;
   const intent=digest({metadata,title}),op=`operations/${hash(`${actor.uid}:${requestId}`)}`,fingerprint=digest([action,input]);
   return store.runTransaction(async tx=>{
    const old=await tx.get(root(id)),previous=await tx.get(op);
    if(old)requireThat(old.ownerUid===actor.uid&&old.preparationIntent===intent,'PREPARATION_EXISTS');
    if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
    const result={id:sid,campaignId:id};
    if(!old){
     const campaign={id,title,ownerUid:actor.uid,ruleProfile:spaceOutlawsProfile,preparationSessionId:sid,preparationIntent:intent,
      scenarioId:null,versionId:null,revision:1,activeSessionId:null,activeBuildId:null,latestSessionId:null,episodeCount:0,createdAt:at};
     tx.set(root(id),campaign);tx.set(`sessions/${sid}`,preparationSession(metadata,{id:sid,campaignId:id,ownerUid:actor.uid,at}));
     const event={id:sid,action,at,actorUid:actor.uid,sessionId:sid,campaignId:id,ruleProfile:spaceOutlawsProfile};
     tx.set(`${root(id)}/history/${sid}`,event);tx.set(`sessions/${sid}/audit/${sid}`,event);
    }
    tx.set(op,{fingerprint,result,at});return result;
   });
  }
  if(action==='saveSpaceOutlawsPreparation'){
   const sid=documentId(input.sessionId),requestId=documentId(input.requestId),eventId=uuid();
   const op=`operations/${hash(`${actor.uid}:${requestId}`)}`,fingerprint=digest([action,input]);
   return store.runTransaction(async tx=>{
    const s=await checkSession(tx,actor,sid,'content',true);requireThat(isPreparation(s),'NOT_A_PREPARATION');
    const c=await tx.get(root(s.campaignId));requireThat(c?.preparationSessionId===sid&&c.ownerUid===s.ownerUid,'FORBIDDEN');
    const previous=await tx.get(op);if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
    requireThat(s.revision===input.revision,'STALE_REVISION');const metadata=preparationInput(input),reason=text(input.reason);
    const next={...s,...metadata,revision:s.revision+1,updatedAt:at};
    tx.set(`sessions/${sid}`,next);
    tx.set(`sessions/${sid}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,reason,before:preparationInput(Object.fromEntries([...Object.keys(metadata)].map(k=>[k,s[k]]))),after:metadata,beforeRevision:s.revision,afterRevision:next.revision});
    const result={id:sid,campaignId:c.id,revision:next.revision};tx.set(op,{fingerprint,result,at});return result;
   });
  }
  if(reads.includes(action))return store.runTransaction(async tx=>{
   if(action==='prepareCampaignStart'){const p=await startPlan(tx,actor,input);return {summary:p.summary,confirmation:p.confirmation};}
   if(action==='prepareCampaignClosure'){const {s,c}=await sessionContext(tx,actor,input),p=await closurePlan(tx,s,c,input,at);return {campaign:cpSummary(c),sessionId:s.id,...Object.fromEntries(['summary','blocks','cancelled','confirmation','canClose'].map(k=>[k,p[k]]))};}
   const c=await owned(tx,actor,documentId(input.campaignId));
   if(action==='campaign')return {...cpSummary(c),checkpoints:sorted(await tx.list(`${root(c.id)}/checkpoints`)),build:c.activeBuildId?await tx.get(`campaignBuilds/${c.activeBuildId}`):null};
   const p=await episodePlan(tx,actor,c,input);return {campaign:cpSummary(c),summary:p.summary,confirmation:p.confirmation,sourceSessionId:p.source.id,recordCount:p.recordCount,healthPolicy:input.healthPolicy};
  });
  const requestId=documentId(input.requestId),op=`operations/${hash(`${actor.uid}:${requestId}`)}`,fingerprint=digest([action,input]),newId=uuid(),newSessionId=uuid();
  return store.runTransaction(async tx=>{
   let c,s,build;
   if(action==='startCampaign')await checkScenario(tx,actor,documentId(input.scenarioId));
   else if(['closeCampaignSession','reopenCampaignSession'].includes(action))({s,c}=await sessionContext(tx,actor,input));
   else {c=await owned(tx,actor,documentId(input.campaignId));if(action==='advanceCampaignEpisode'){build=await tx.get(`campaignBuilds/${documentId(input.buildId)}`);requireThat(build?.campaignId===c.id&&build.ownerUid===actor.uid,'FORBIDDEN');}}
   const previous=await tx.get(op);if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
   let result;
   if(action==='startCampaign'){
    const p=await startPlan(tx,actor,input);requireThat(input.confirmation===p.confirmation,'STALE_REVISION');
    c={id:newId,title:p.title,ownerUid:actor.uid,scenarioId:input.scenarioId,versionId:input.versionId,revision:1,activeSessionId:newSessionId,activeBuildId:null,latestSessionId:null,episodeCount:1,createdAt:at};
    s={...sessionFromVersion(input,p.data,newSessionId,actor,at),campaignId:c.id,campaignEpisode:1,campaignSealed:false};
    seedScenarioSession(tx,s,p.data,actor,at);tx.set(root(c.id),c);
    tx.set(`${root(c.id)}/history/${newId}`,{id:newId,action,at,actorUid:actor.uid,sessionId:s.id});result={id:s.id,campaignId:c.id};
   }else if(action==='closeCampaignSession'){
    const p=await closurePlan(tx,s,c,input,at);requireThat(input.confirmation===p.confirmation,'STALE_REVISION');requireThat(p.canClose,'CAMPAIGN_UNRESOLVED');
    for(const change of p.changes)tx.set(`sessions/${s.id}/${change.path}`,change.data);
    const seal={id:s.id,title:s.title,episode:s.campaignEpisode,at,actorUid:actor.uid,reason:p.reason,gameTimeMs:gameTime(s.clock,at),summary:p.summary,cancelled:p.cancelled};
    tx.set(`sessions/${s.id}`,{...s,stage:'ARCHIVED',registrationOpen:false,campaignSealed:true,campaignClosedAt:at,revision:s.revision+1});
    tx.set(`${root(c.id)}/checkpoints/${s.id}`,seal);tx.set(root(c.id),{...c,activeSessionId:null,latestSessionId:s.id,revision:c.revision+1});
    tx.set(`sessions/${s.id}/audit/${newId}`,{id:newId,action,at,actorUid:actor.uid,reason:p.reason,cancelled:p.cancelled});result={id:s.id,campaignId:c.id,closed:true};
   }else if(action==='reopenCampaignSession'){
    requireThat(c.activeSessionId===s.id&&!s.campaignSealed&&s.stage==='FINISHED','INVALID_TRANSITION');const reason=text(input.reason);
    tx.set(`sessions/${s.id}`,{...s,stage:'PAUSE',revision:s.revision+1});tx.set(`sessions/${s.id}/audit/${newId}`,{id:newId,action,at,actorUid:actor.uid,reason});result={id:s.id};
   }else if(action==='beginCampaignEpisode'){
    const p=await episodePlan(tx,actor,c,input);requireThat(input.confirmation===p.confirmation,'STALE_REVISION');const reason=text(input.reason);
    const header=episodeHeader(input,p.source,c,newSessionId,actor,at),pages=campaignPagesFor(episodeEntries(p.data,p.source,header,actor,at));
    build={id:newId,campaignId:c.id,ownerUid:actor.uid,sessionId:header.id,header,sourceSessionId:p.source.id,createdAt:at,reason,status:'COPYING',cursor:0,pages:pages.length,recordCount:p.recordCount};
    for(const [i,entries] of pages.entries())tx.set(`campaignBuilds/${build.id}/pages/${i}`,{id:String(i),entries});
    tx.set(`campaignBuilds/${build.id}`,build);tx.set(root(c.id),{...c,activeBuildId:build.id,revision:c.revision+1});result={id:build.sessionId,buildId:build.id,campaignId:c.id,status:build.status,cursor:0,pages:build.pages};
   }else if(action==='advanceCampaignEpisode'){
    if(build.status==='READY')result={id:build.sessionId,campaignId:c.id,status:'READY',cursor:build.cursor,pages:build.pages};
    else {
     requireThat(c.activeBuildId===build.id&&!c.activeSessionId,'CAMPAIGN_EPISODE_ACTIVE');
     const page=await tx.get(`campaignBuilds/${build.id}/pages/${build.cursor}`);requireThat(page,'CAMPAIGN_BUILD_INVALID');
     const last=build.cursor+1===build.pages;
     for(const entry of page.entries)tx.set(`sessions/${build.sessionId}/${entry.path}`,entry.data);
     const next={...build,cursor:build.cursor+1,status:last?'READY':'COPYING'};tx.set(`campaignBuilds/${build.id}`,next);
     if(last){
      tx.set(`sessions/${build.sessionId}`,{...build.header,createdAt:at});
      tx.set(root(c.id),{...c,activeBuildId:null,activeSessionId:build.sessionId,episodeCount:build.header.campaignEpisode,revision:c.revision+1});
      tx.set(`${root(c.id)}/history/${newId}`,{id:newId,action:'startEpisode',at,actorUid:actor.uid,reason:build.reason,sourceSessionId:build.sourceSessionId,sessionId:build.sessionId});
      tx.set(`sessions/${build.sessionId}/audit/${newId}`,{id:newId,action:'campaignCarry',at,actorUid:actor.uid,reason:build.reason,sourceSessionId:build.sourceSessionId,healthPolicy:build.header.campaignHealthPolicy});
     }
     result={id:build.sessionId,campaignId:c.id,status:next.status,cursor:next.cursor,pages:build.pages};
    }
   }else requireThat(false,'UNKNOWN_ACTION');
   tx.set(op,{fingerprint,result,at});return result;
  });
 };
}
