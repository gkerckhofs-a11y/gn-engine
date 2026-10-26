import {seedSoNavigation} from './space-outlaws-navigation-state.mjs';
import {shopBlockers,seedSoShops} from './space-outlaws-shop-state.mjs';
import {soCareProfiles} from './space-outlaws-health-state.mjs';
import {createHash} from 'node:crypto';
import {requireThat,documentId} from './validation.mjs';
import {spaceOutlawsProfile,isPreparation} from './preparation-state.mjs';
import {centralAuthority,requireCentralPreparation} from './central-master.mjs';
import {centralDraftCheck,centralCheckLimits} from './central-check.mjs';
import {checkAdmissionM2} from './admission-m2-check.mjs';
import {approvedAdmissionM2,admissionM2Fiction} from './admission-m2.mjs';
import {admissionOccupancy,admissionKeys,admissionText} from './admission-state.mjs';
import {initialCharacterProfile} from '../shared/initial-character-profile.mjs';
import {initialClassKit} from '../shared/initial-class-kit.mjs';
import {campaignPagesFor,campaignLimits} from './campaigns.mjs';
import {portBrecheActionPoints,actionPointPath,actionPointState} from './action-point-state.mjs';
import {accountId,openWallet,writeLedger,moneyState} from './economy-state.mjs';
import {newLot,lotState} from './inventory-state.mjs';
import {recordPublication} from './narrative.mjs';
import {spaceOutlawsTransaction} from './space-outlaws-entry-guard.mjs';
import {seedFieldTargets} from './field-state.mjs';
import {initialReceipt} from './knowledge.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>hash(JSON.stringify(canonical(v)));
const regPath=(sid,uid)=>`sessions/${sid}/registrations/${hash(uid)}`;
const reads=['spaceOutlawsEntry','mySpaceOutlawsEntry','previewSpaceOutlawsRelease','previewSpaceOutlawsBirth'];
export const spaceOutlawsEntryActions=[...reads,'releaseSpaceOutlaws','birthSpaceOutlaws'];
const supported=new Set(['speciesCatalogue','item','classKit','character','knowledge','fieldTarget','shop','offer','shipModel','port','route']);
const versionKind='SPACE_OUTLAWS_ENTRY_V1';
const publicSession=s=>({id:s.id,title:s.title,date:s.date,time:s.time,place:s.place});

async function context(tx,s,c){
 const base=`campaigns/${c.id}/masterDrafts/initial`;
 const [draft,policy,counts,species]=await Promise.all([tx.get(base),tx.get(`sessions/${s.id}/admission/settings`),tx.get(`sessions/${s.id}/admission/occupancy`),tx.get(`${base}/changes/speciesCatalogue_player`)]);
 return {c,s,draft,policy,occupancy:admissionOccupancy(counts,s.accepted),settings:policy?{...policy,species:species?.data??[]}:null};
}
async function readVersion(tx,c){
 const id=c.master?.activeVersionId;requireThat(id,'SO_RELEASE_REQUIRED');
 const base=`campaigns/${c.id}/versions/${id}`,h=await tx.get(base);
 requireThat(h?.kind===versionKind&&h.status==='READY'&&h.id===id&&h.campaignId===c.id&&h.ruleProfile===spaceOutlawsProfile&&Array.isArray(h.pages)&&h.pages.length<=100,'SO_VERSION_INVALID');
 const {manifestDigest,...manifest}=h;requireThat(digest(manifest)===manifestDigest,'SO_VERSION_INVALID');
 const pages=await Promise.all(h.pages.map(p=>tx.get(`${base}/pages/${p.id}`))),entries=[];
 for(let i=0;i<pages.length;i++){const p=pages[i];requireThat(p?.id===String(i)&&p.versionId===id&&digest(p)===h.pages[i].digest&&Array.isArray(p.entries),'SO_VERSION_INVALID');entries.push(...p.entries);}
 requireThat(digest(entries)===h.contentDigest&&entries.length===h.records&&Buffer.byteLength(JSON.stringify(entries))<=campaignLimits.bytes,'SO_VERSION_INVALID');
 const changes=entries.map(e=>e.data);
 requireThat(h.logisticsVersion===undefined||h.logisticsVersion===1,'SO_VERSION_INVALID');
 requireThat(h.combatVersion===undefined||h.combatVersion===1,'SO_VERSION_INVALID');
 requireThat(h.navigationVersion===undefined||h.navigationVersion===1,'SO_VERSION_INVALID');
 requireThat(h.shopsVersion===undefined||h.shopsVersion===1,'SO_VERSION_INVALID');
 requireThat(h.healthVersion===undefined||h.healthVersion===1,'SO_VERSION_INVALID');
 if(h.healthVersion===1)requireThat(digest(h.careProfiles)===digest(soCareProfiles(changes)),'SO_VERSION_INVALID');
 return {header:h,changes};
}
async function releasePlan(tx,actor,ctx,authority,at){
 requireCentralPreparation(ctx.c,ctx.s,ctx.draft);
 const changes=await tx.list(`campaigns/${ctx.c.id}/masterDrafts/initial/changes`,null,{limit:centralCheckLimits.records+1});
 const report=centralDraftCheck({campaign:ctx.c,session:ctx.s,draft:ctx.draft,changes,actorUid:actor.uid,authority:{kind:'OWNER',revision:null},at});
 const admissions=await checkAdmissionM2({tx,ctx,actor,authority,at});
 const blockers=[...shopBlockers(changes),...report.diagnostics.map(d=>({code:d.code,message:d.message,entityId:d.entityId})),...admissions.diagnostics.map(d=>({code:d.code,message:'Reprendre ce dossier dans les candidatures.',entityId:d.characterId??''}))];
 for(const ch of changes)if(ch.operation==='UPSERT'&&!supported.has(ch.type))blockers.push({code:'SO_DOMAIN_NOT_CONNECTED',entityId:ch.entityId,message:`${ch.workshop} : ${ch.type} doit être raccordé au jeu avant publication. Le brouillon reste intact.`});
 for(const ch of changes)if(ch.operation==='UPSERT'&&ch.type==='fieldTarget'&&ch.data?.kind!=='ANALYSIS')blockers.push({code:'SO_DOMAIN_NOT_CONNECTED',entityId:ch.entityId,message:'Seules les analyses tactiques, de traces et de documents sont raccordées au jeu pour ce jalon.'});
 const active=changes.filter(ch=>ch.operation==='UPSERT'),knowledge=active.filter(ch=>ch.type==='knowledge'),targets=active.filter(ch=>ch.type==='fieldTarget');
 const maxInitial=Math.max(0,...active.filter(ch=>ch.type==='character').map(ch=>knowledge.filter(k=>Array.isArray(k.data?.initialCharacterIds)&&k.data.initialCharacterIds.includes(ch.entityId)).length));
 if(knowledge.length+2*targets.length+maxInitial+active.filter(ch=>['shop','offer','shipModel','port','route','item'].includes(ch.type)).length>440)blockers.push({code:'SO_RUNTIME_LIMIT',entityId:'M6',message:'Trop de définitions et informations initiales pour une activation atomique (440 écritures de définitions maximum). Réduire la version de départ.'});
 const entries=changes.sort((a,b)=>a.id.localeCompare(b.id)).map(data=>({path:`changes/${data.id}`,data}));
 requireThat(Buffer.byteLength(JSON.stringify(entries))<=campaignLimits.bytes,'SO_RELEASE_LIMIT');
 const pages=campaignPagesFor(entries);requireThat(pages.length>0&&pages.length<=100,'SO_RELEASE_LIMIT');
 const confirmation=digest({logisticsVersion:1,combatVersion:1,navigationVersion:1,shopsVersion:1,healthVersion:1,actorUid:actor.uid,c:ctx.c,s:ctx.s,draft:ctx.draft,entries,admissions:admissions.fingerprint});
 return {entries,pages,confirmation,blockers,draftRevision:ctx.draft.revision,characters:changes.filter(c=>c.type==='character'&&c.operation==='UPSERT').length,approved:admissions.totals.approved};
}
function optionsInput(v){
 admissionKeys(v,['weaponApplicable','startingInformation']);requireThat(typeof v.weaponApplicable==='boolean','SO_BIRTH_OPTIONS_REQUIRED');
 return {weaponApplicable:v.weaponApplicable,startingInformation:admissionText(v.startingInformation??'',4000)};
}
async function birthPlan(tx,actor,ctx,version,uid,options){
 const {s,c}=ctx,r=await tx.get(regPath(s.id,uid));requireThat(r?.admission?.status==='APPROVED','ADMISSION_NOT_APPROVED');
 requireThat(['PREPARATION','BRIEFING'].includes(s.stage)&&version.header.sessionId===s.id,'SO_ENTRY_CLOSED');
 requireThat(ctx.draft?.status==='SEALED'&&ctx.draft.publishedVersionId===version.header.id&&ctx.draft.revision===version.header.draftRevision,'SO_VERSION_INVALID');
 ctx.settings={...ctx.settings,species:version.changes.find(ch=>ch.type==='speciesCatalogue'&&ch.operation==='UPSERT')?.data??[]};
 const proposal=await approvedAdmissionM2(tx,ctx,r),id=r.admission.m2Preparation?.characterId;requireThat(id,'ADMISSION_M2_NOT_PREPARED');
 const record=version.changes.find(ch=>ch.type==='character'&&ch.entityId===id&&ch.operation==='UPSERT');requireThat(record,'ADMISSION_M2_LINK_BROKEN');
 const fiction=admissionM2Fiction(proposal),d=record.data;
 requireThat(d.public.displayName===fiction.displayName&&d.nature===fiction.nature&&['classId','speciesId','secondaryId'].every(k=>d.creationPlan?.[k]===fiction.creationPlan[k]),'ADMISSION_M2_DIVERGED');
 const registrations=await tx.list(`sessions/${s.id}/registrations`,null,{limit:1001});requireThat(registrations.length<=1000,'SO_RELEASE_LIMIT');
 const confirmed=registrations.filter(x=>x.admission?.status==='APPROVED');
 requireThat(confirmed.length===s.accepted&&Object.keys(ctx.occupancy.byClass).every(cl=>confirmed.filter(x=>x.admission.confirmation?.classId===cl).length===ctx.occupancy.byClass[cl]),'ADMISSION_ACCOUNTING_CONFLICT');
 const ordinary=confirmed.filter(x=>!x.admission.confirmation.exception);
 requireThat(ordinary.length<=s.capacity&&Object.keys(ctx.settings.quotas).every(cl=>ordinary.filter(x=>x.admission.confirmation.classId===cl).length<=ctx.settings.quotas[cl]),'ADMISSION_QUOTA_FULL');
 const existing=await tx.get(`sessions/${s.id}/characters/${id}`);
 if(existing){requireThat(existing.birth?.versionId===version.header.id&&existing.assignedUid===uid&&r.characterId===id,'SO_BIRTH_CONFLICT');return {alreadyBorn:true,characterId:id,accessActive:r.accessActive};}
 requireThat(r.status==='RECEIVED'&&!r.characterId&&!r.accessActive,'SO_BIRTH_CONFLICT');
 requireThat(!(await tx.list(`sessions/${s.id}/characters`,['assignedUid',uid],{limit:1})).length,'SO_BIRTH_CONFLICT');
 requireThat(!await tx.get(`sessions/${s.id}/accounts/${accountId(id)}`)&&!await tx.get(actionPointPath(s.id,id)),'SO_BIRTH_CONFLICT');
 const profile=initialCharacterProfile(proposal.classId,proposal.secondaryId),spec=initialClassKit(proposal.classId);
 const kit=version.changes.find(ch=>ch.type==='classKit'&&ch.entityId===proposal.classId&&ch.operation==='UPSERT');requireThat(kit,'CLASS_KIT_MISSING');
 if(['PIL','COU'].includes(profile.classId))requireThat(options.startingInformation.length>0,'SO_INITIAL_INFORMATION_REQUIRED');
 const lots=[];
 for(const slot of spec.slots){
  if(slot.id==='weapon'&&!options.weaponApplicable)continue;
  const binding=kit.data.bindings.find(b=>b.slotId===slot.id),item=version.changes.find(ch=>ch.type==='item'&&ch.entityId===binding?.itemId&&ch.operation==='UPSERT')?.data;
  requireThat(item&&(!slot.requiresConsumable||item.consumable),'CLASS_KIT_INCOMPLETE');
  const count=item.kind==='INDIVIDUAL'?slot.quantity:1;
  for(let n=0;n<count;n++){
   const lotId=hash(`so-birth:${s.id}:${id}:${slot.id}:${n}`);requireThat(!await tx.get(`sessions/${s.id}/inventory/${lotId}`),'SO_BIRTH_CONFLICT');
   lots.push({slotId:slot.id,id:lotId,item,quantity:item.kind==='INDIVIDUAL'?1:slot.quantity});
  }
 }
 return {r,definition:d,characterId:id,profile,lots,options,confirmation:digest({actorUid:actor.uid,s,c,admission:r.admission,policy:ctx.policy,occupancy:ctx.occupancy,version:version.header.manifestDigest,options})};
}

export function createSpaceOutlawsEntryService({store,signed,isAdmin,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);const sid=documentId(input.sessionId),read=reads.includes(action),requestId=read?null:documentId(input.requestId);
  return store.runTransaction(async tx=>{
   const at=now(),s=await tx.get(`sessions/${sid}`);requireThat(s&&(isPreparation(s)||s.spaceOutlaws?.ruleProfile===spaceOutlawsProfile),'NOT_A_PREPARATION');
   const c=await tx.get(`campaigns/${s.campaignId}`);requireThat(c?.ownerUid===s.ownerUid&&c.preparationSessionId===sid,'FORBIDDEN');
   if(action==='mySpaceOutlawsEntry'){
    admissionKeys(input,['sessionId']);const r=await tx.get(regPath(sid,actor.uid));requireThat(r?.admission,'FORBIDDEN');
    return {session:publicSession(s),released:!!c.master?.activeVersionId,status:r.admission.status,characterId:r.characterId??null,accessActive:r.accessActive===true};
   }
   await checkSession(tx,actor,sid,'content',true);
   const authority=await centralAuthority(tx,actor,c,isAdmin),publishing=['previewSpaceOutlawsRelease','releaseSpaceOutlaws'].includes(action);
   if(publishing)requireThat(authority.owner,'FORBIDDEN');
   const ctx=await context(tx,s,c);
   if(action==='spaceOutlawsEntry'){
    admissionKeys(input,['sessionId']);const version=c.master?.activeVersionId?await readVersion(tx,c):null;
    const registrations=await tx.list(`sessions/${sid}/registrations`,null,{limit:1001});requireThat(registrations.length<=1000,'SO_RELEASE_LIMIT');
    return {session:{...publicSession(s),revision:s.revision},stage:s.stage,canRelease:authority.owner,actionsReady:s.spaceOutlaws?.actionsVersion===1,navigationReady:s.spaceOutlaws?.navigationVersion===1,shopsReady:s.spaceOutlaws?.shopsVersion===1,healthReady:s.spaceOutlaws?.healthVersion===1,safetyStopped:s.safetyStop?.active===true,versionId:version?.header.id??null,draftRevision:ctx.draft?.revision??0,
     targets:(version?.changes??[]).filter(ch=>ch.type==='fieldTarget'&&ch.operation==='UPSERT').map(ch=>({id:ch.entityId,title:ch.data.title})),
     registrations:registrations.filter(r=>r.admission?.status==='APPROVED').map(r=>({uid:r.uid,name:`${r.admission.proposal.firstName} ${r.admission.proposal.lastName}`,classId:r.admission.proposal.classId,characterId:r.characterId??null,accessActive:r.accessActive,m2Prepared:!!r.admission.m2Preparation}))};
   }
   const op=requestId?`operations/${hash(`${actor.uid}:${requestId}`)}`:null,fingerprint=digest([action,input]);
   if(op){const receipt=await tx.get(op);if(receipt){requireThat(receipt.fingerprint===fingerprint,'REQUEST_ID_REUSED');return receipt.result;}}
   if(publishing){
    admissionKeys(input,['sessionId',...(read?[]:['requestId','confirmation','reason'])]);
    if(c.master?.activeVersionId){const version=await readVersion(tx,c);requireThat(!read&&version.header.confirmation===input.confirmation,'SO_ALREADY_RELEASED');return {versionId:version.header.id};}
    const plan=await releasePlan(tx,actor,ctx,authority,at);
    if(read)return {careProfiles:plan.blockers.length?[]:soCareProfiles(plan.entries.map(e=>e.data)).map(p=>({name:p.name,itemId:p.consumable?.itemId??null})),confirmation:plan.confirmation,blockers:plan.blockers,canRelease:!plan.blockers.length,draftRevision:plan.draftRevision,characters:plan.characters,approved:plan.approved};
    const reason=admissionText(input.reason,500,true);requireThat(!plan.blockers.length,'SO_RELEASE_BLOCKED');requireThat(plan.confirmation===input.confirmation,'SO_ENTRY_STALE');
    const id=`so_${plan.confirmation}`,base=`campaigns/${c.id}/versions/${id}`,pages=plan.pages.map((entries,i)=>({id:String(i),versionId:id,entries}));
    const manifest={id,kind:versionKind,status:'READY',ruleProfile:spaceOutlawsProfile,campaignId:c.id,sessionId:sid,draftRevision:plan.draftRevision,confirmation:plan.confirmation,createdAt:at,actorUid:actor.uid,reason,logisticsVersion:1,combatVersion:1,navigationVersion:1,shopsVersion:1,healthVersion:1,careProfiles:soCareProfiles(plan.entries.map(e=>e.data)),records:plan.entries.length,contentDigest:digest(plan.entries),pages:pages.map(p=>({id:p.id,digest:digest(p)}))};
    for(const p of pages)tx.set(`${base}/pages/${p.id}`,p);
    tx.set(base,{...manifest,manifestDigest:digest(manifest)});
    tx.set(`campaigns/${c.id}`,{...c,revision:c.revision+1,master:{...c.master,activeVersionId:id,pointerRevision:1,openDraftId:null}});
    tx.set(`campaigns/${c.id}/masterDrafts/initial`,{...ctx.draft,status:'SEALED',publishedVersionId:id,updatedAt:at});
    const eventId=uuid();tx.set(`campaigns/${c.id}/history/${eventId}`,{id:eventId,action,actorUid:actor.uid,at,reason,versionId:id,draftRevision:plan.draftRevision});
    const result={versionId:id};tx.set(op,{fingerprint,result,at});return result;
   }
   admissionKeys(input,['sessionId','uid','options',...(read?[]:['requestId','confirmation','reason'])]);
   const uid=documentId(input.uid),options=optionsInput(input.options),version=await readVersion(tx,c),plan=await birthPlan(tx,actor,ctx,version,uid,options);
   if(plan.alreadyBorn)return {characterId:plan.characterId,alreadyBorn:true,accessActive:plan.accessActive};
   if(read)return {characterId:plan.characterId,name:plan.definition.public.displayName,profile:plan.profile,hp:plan.profile.classId==='COM'?4:3,protection:plan.profile.classId==='COM'?1:0,actionPoints:5,protectedCredits:200,kit:plan.lots.map(l=>({name:l.item.name,quantity:l.quantity})),options,confirmation:plan.confirmation};
   const reason=admissionText(input.reason,500,true);requireThat(plan.confirmation===input.confirmation,'SO_ENTRY_STALE');
   const id=plan.characterId,eventId=uuid(),base=`sessions/${sid}`,maxHp=plan.profile.classId==='COM'?4:3;
   const character={...plan.definition,sessionId:sid,assignedUid:uid,publicCode:uuid(),publicationState:'PUBLISHED',public:{...plan.definition.public,publicationState:'PUBLISHED'},
    objectives:plan.definition.objectives.map(o=>({...o,published:true,steps:o.steps.map(st=>({...st,published:true}))})),relations:plan.definition.relations.map(r=>({...r,published:true})),
    globalLevel:1,xp:0,hp:maxHp,maxHp,outOfCombat:false,healthRevision:1,protection:plan.profile.classId==='COM'?1:0,
    spaceOutlawsSkills:plan.profile,startingInformation:options.startingInformation,birth:{versionId:version.header.id,at,actorUid:actor.uid,weaponApplicable:options.weaponApplicable},
    abilityProfile:{published:true,revision:1,class:{id:plan.profile.classId,name:plan.profile.className,description:''},skills:plan.profile.skills.map(k=>({id:k.id,name:k.name,kind:'PASSIVE',level:k.level??1,revision:1,description:k.kind==='FIXED'?'Technique acquise (sans niveau).':`Niveau ${k.level}`,instructions:'',category:k.source,healing:null}))}};
   const {preparationKind,preparationVersion,...prior}=s;
   const healthEnabled=version.header.healthVersion===1,shopsEnabled=version.header.shopsVersion===1,navigationEnabled=version.header.navigationVersion===1,combatEnabled=version.header.combatVersion===1,logisticsEnabled=version.header.logisticsVersion===1;
   requireThat(!s.spaceOutlaws||!!s.spaceOutlaws.logisticsVersion===logisticsEnabled,'SO_VERSION_INVALID');
   requireThat(!s.spaceOutlaws||!!s.spaceOutlaws.combatVersion===combatEnabled,'SO_VERSION_INVALID');
   requireThat(!s.spaceOutlaws||!!s.spaceOutlaws.navigationVersion===navigationEnabled,'SO_VERSION_INVALID');
   requireThat(!s.spaceOutlaws||!!s.spaceOutlaws.shopsVersion===shopsEnabled,'SO_VERSION_INVALID');
   requireThat(!s.spaceOutlaws||!!s.spaceOutlaws.healthVersion===healthEnabled,'SO_VERSION_INVALID');
   const nextSession={...prior,...(healthEnabled?{vitalClock:s.vitalClock??{elapsedMs:at,runningSince:at},safetyStop:s.safetyStop??{active:false}}:{}),stage:'BRIEFING',revision:s.revision+1,versionId:version.header.id,spaceOutlaws:{ruleProfile:spaceOutlawsProfile,entryVersion:1,actionsVersion:1,...(healthEnabled?{healthVersion:1}:{}),...(shopsEnabled?{shopsVersion:1}:{}),...(navigationEnabled?{navigationVersion:1}:{}),...(combatEnabled?{combatVersion:1}:{}),...(logisticsEnabled?{logisticsVersion:1}:{}),versionId:version.header.id},
    actionPointRules:{...portBrecheActionPoints},economyRules:{enabled:true,name:'Crédits',unit:'Cr'},healthRules:{enabled:true,defaultMaxHp:3,returnMode:'HP_POSITIVE',allowed:{discover:false,share:false,publish:false,heal:false,transfer:false,pay:false}}};
   tx[spaceOutlawsTransaction](sid);tx.set(base,nextSession);tx.set(`${base}/characters/${id}`,character);
   const knowledge=version.changes.filter(ch=>ch.type==='knowledge'&&ch.operation==='UPSERT').map(ch=>({...ch.data,publicationState:'PUBLISHED'}));
   if(!s.spaceOutlaws){
    if(navigationEnabled)seedSoNavigation(tx,sid,version.changes,version.header.id);
    if(shopsEnabled)seedSoShops(tx,sid,version.changes,version.header.id);
    if(healthEnabled)for(const p of version.header.careProfiles)tx.set(`${base}/personProfiles/${p.id}`,p);
    for(const k of knowledge)tx.set(`${base}/knowledge/${k.id}`,k);
    seedFieldTargets(tx,nextSession,version.changes.filter(ch=>ch.type==='fieldTarget'&&ch.operation==='UPSERT').map(ch=>({...ch.data,publicationState:'PUBLISHED'})));
   }
   for(const k of knowledge)if(k.initialCharacterIds.includes(id))tx.set(`${base}/characters/${id}/knowledge/${k.id}`,initialReceipt(k,at));
   tx.set(regPath(sid,uid),{...plan.r,status:'ACCEPTED',characterId:id,accessActive:true,accessVersion:1,minAuthTime:0});
   recordPublication(tx,`${base}/characters`,null,character,{id:eventId,at,actorUid:actor.uid,reason,stage:'BRIEFING'});
   tx.set(actionPointPath(sid,id),{...actionPointState(nextSession,character,null,at),revision:1});
   const wallet=openWallet(tx,sid,character,0,at,actor.uid,'SO_BIRTH'),protectedWallet={...wallet,protectedCredits:200,protectedOrigin:{kind:'SO_BIRTH',characterId:id,sessionId:sid},revision:2};
   tx.set(`${base}/accounts/${wallet.id}`,protectedWallet);
   writeLedger(tx,sid,{id:eventId,at,kind:'SO_PROTECTED_GRANT',actorUid:actor.uid,memo:'200 Cr de création protégés',reason,createdCurrency:200,removedCurrency:0,entries:[{accountId:wallet.id,characterId:id,delta:0,protectedDelta:200,before:moneyState(wallet),after:moneyState(protectedWallet)}]});
   for(const l of plan.lots){const lot={...newLot(l.id,{...l.item,pillable:false},l.quantity,id,at,{kind:'SO_BIRTH',slotId:l.slotId,versionId:version.header.id}),pillable:false,transferable:false,resellable:false};tx.set(`${base}/inventory/${l.id}`,lot);tx.set(`${base}/inventory/${l.id}/history/${eventId}`,{id:eventId,kind:'SO_BIRTH',at,actorUid:actor.uid,reason,before:null,after:lotState(lot)});}
   tx.set(`${base}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,reason,characterId:id,versionId:version.header.id});
   const result={characterId:id,accessActive:true};tx.set(op,{fingerprint,result,at});return result;
  });
 };
}
