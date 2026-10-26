import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
import {centralTestCharacter} from './central-characters-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
import {initialClassKit} from '../../src/shared/initial-class-kit.mjs';
import {centralTestItem} from './central-master-suite.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
export const successorProposal={firstName:'Cora',lastName:'Relève',speciesId:'species-test',classId:'COM',secondaryId:'MED-02',background:'Une nouvelle histoire privée.',friends:''};
export async function successionFixture(makeStore,{helper=false,dead=true}={}){
 const f=await actionsFixture(makeStore,{helper,release:false});
 const bindings=[];for(const slot of initialClassKit('ROG').slots){const itemId=`rog_${slot.id}`;bindings.push({slotId:slot.id,itemId});const d=await f.view();await f.cc('saveCentralItem',{itemId,itemRevision:0,draftRevision:d.draft.revision,item:{...centralTestItem,name:slot.label,kind:slot.requiresConsumable?'STACKABLE':'INDIVIDUAL',consumable:slot.requiresConsumable},reason:'Kit publié pour la relève'});}
 await f.cc('saveCentralClassKit',{classKitId:'ROG',classKitRevision:0,draftRevision:(await f.view()).draft.revision,classKit:{bindings,gmNotes:''},reason:'Kit publié pour la relève'});
 for(const [id,name] of [['reserve','Dana Réserve'],['reserve2','Eli Réserve']]){const d=await f.view();await f.cc('saveCentralCharacter',{characterId:id,characterRevision:0,draftRevision:d.draft.revision,character:{...centralTestCharacter,displayName:name,nature:'HUMANOID',creationPlan:{classId:'COM',speciesId:'species-test',secondaryId:'MED-02'},objectives:[],relations:[]},reason:'Réserve jamais incarnée'});}
 await f.release(await f.releasePreview());await f.birth(await f.birthPreview());if(helper){const p=await f.birthPreview(f.owner,{uid:f.other.uid});await f.birth(p,{uid:f.other.uid});}
 const cid=(await f.actionRead('mySession')).character.id,otherId=helper?(await f.actionRead('mySession',{},f.other)).character.id:null;
 const get=path=>f.store.get(`sessions/${f.sid}${path?'/'+path:''}`),edit=async(path,fn)=>f.store.runTransaction(async tx=>{const p=`sessions/${f.sid}${path?'/'+path:''}`,old=await tx.get(p);tx.set(p,fn(old));});
 const death=async(actor=f.player)=>{const me=await f.actionRead('mySession',{},actor),input={amount:99,damageKind:'LASER',counted:true,secondsSinceDown:300};const p=await f.actionRead('prepareDamage',input,actor);await f.actionCmd('applyDamage',{...input,confirmation:p.confirmation,reportedAt:p.reportedAt},actor);const c=await get(`characters/${me.character.id}`);await f.actionCmd('confirmSurvivalDeath',{characterId:c.id,healthRevision:c.healthRevision,reason:'Décès terrain confirmé'},f.owner);};
 await f.stage('EN_JEU');if(dead)await death();
 const read=(action,p={},actor=f.owner)=>f.actionRead(action,p,actor),cmd=(action,p={},actor=f.owner)=>f.actionCmd(action,p,actor);
 const input=(patch={})=>({uid:f.player.uid,predecessorId:cid,source:'RESERVE',reserveId:'reserve',options:f.options,...patch});
 const preview=(p=input(),actor=f.owner)=>read('prepareSpaceOutlawsSuccession',p,actor);
 const succeed=(q,p=input(),extra={},actor=f.owner)=>cmd('succeedSpaceOutlawsCharacter',{...p,confirmation:q.confirmation,reason:'Remise des accessoires et relève validée',...extra},actor);
 const open=async(actor=f.player)=>{const r=await get(`registrations/${hash(actor.uid)}`);return cmd('openSpaceOutlawsSuccession',{uid:actor.uid,predecessorId:r.characterId,revision:r.succession?.revision??0,reason:'Proposez votre nouveau personnage.'});};
 const submit=async(proposal=successorProposal,actor=f.player)=>{const r=await get(`registrations/${hash(actor.uid)}`);return cmd('submitSpaceOutlawsSuccessor',{predecessorId:r.characterId,revision:r.succession.revision,proposal},actor);};
 return {...f,cid,otherId,get,edit,death,readSuccession:read,cmdSuccession:cmd,input,previewSuccession:preview,succeed,open,submit};
}
export function spaceSuccessionSuite(makeStore,prefix='Succession SO'){
 test(`${prefix} : décès confirmé, réserve publiée, nouvelle fiche et dotation unique`,async()=>{
  const f=await successionFixture(makeStore),before=await f.get(''),oldWallet=await f.get(`accounts/${accountId(f.cid)}`),oldLots=await f.store.list(`sessions/${f.sid}/inventory`);
  await f.edit(`characters/${f.cid}`,c=>({...c,earnedXp:38,xp:1,inheritedXp:9}));await f.edit(`registrations/${hash(f.player.uid)}`,r=>({...r,progression:{completedSessions:4,pendingXp:3}}));
  const q=await f.previewSuccession();assert.equal(q.inheritedXp,9);assert.equal(q.pendingXp,3);assert.equal(q.xp,12);assert.equal(q.actionPoints,8);
  const requestId=randomUUID(),done=await f.succeed(q,f.input(),{requestId}),me=await f.actionRead('mySession');
  assert.equal(done.characterId,'reserve');assert.equal(me.character.displayName,'Dana Réserve');assert.equal(me.progression.xp,12);assert.equal(me.progression.earnedXp,3);assert.equal(me.globalLevel,2);assert.equal(me.actionPoints.available,8);assert.equal(me.actionPoints.nextRefillGameMs,q.nextRefillGameMs);
  assert.deepEqual(await f.get(''),before);assert.equal((await f.get(`characters/${f.cid}`)).assignedUid,null);assert.equal((await f.get(`characters/${f.cid}`)).survival.dead,true);assert.equal((await f.get('characters/reserve')).birth.order,2);
  assert.deepEqual(await f.get(`accounts/${accountId(f.cid)}`),oldWallet);for(const l of oldLots)assert.deepEqual(await f.get(`inventory/${l.id}`),l);
  const wallet=await f.actionRead('myWallet');assert.equal(wallet.account.balance,0);assert.equal(wallet.account.protectedCredits,200);
  assert.deepEqual(await f.succeed(q,f.input(),{requestId}),done);await assert.rejects(f.succeed(q),{code:'SO_SUCCESSION_STALE'});
  assert.equal((await f.store.list(`sessions/${f.sid}/ledger`)).filter(l=>l.kind==='SO_PROTECTED_GRANT').length,2);assert.equal((await f.get(`registrations/${hash(f.player.uid)}`)).progression.pendingXp,0);
 });
 test(`${prefix} : proposition joueur privée, correction MJ et naissance sans republication`,async()=>{
  const f=await successionFixture(makeStore),version=(await f.get('')).versionId;
  await assert.rejects(f.cmdSuccession('submitSpaceOutlawsSuccessor',{predecessorId:f.cid,revision:0,proposal:successorProposal},f.player),{code:'SO_SUCCESSION_NOT_OPEN'});
  await f.open();await f.submit();const d=await f.readSuccession('mySpaceOutlawsSuccession',{},f.player);assert.equal(d.dossier.status,'SUBMITTED');assert.doesNotMatch(JSON.stringify(d),/gmNotes|Dana|actorUid|uid|email|FOR-01|PNJ_FORCE/);
  await f.open();await f.submit({...successorProposal,firstName:'Corrigée'});const p=f.input({source:'PROPOSAL',reserveId:undefined}),q=await f.previewSuccession(p),done=await f.succeed(q,p);
  assert.equal((await f.actionRead('mySession')).character.displayName,'Corrigée Relève');assert.equal((await f.get('')).versionId,version);assert.equal((await f.store.list(`campaigns/${f.campaignId}/versions`)).length,1);assert.equal((await f.get(`characters/${done.characterId}`)).birth.source,'PROPOSAL');
 });
 test(`${prefix} : mort indispensable, choix canoniques et kits publiés obligatoires`,async()=>{
  const f=await successionFixture(makeStore,{dead:false});await assert.rejects(f.previewSuccession(),{code:'SO_SUCCESSION_DEATH_REQUIRED'});await f.death();await f.open();
  for(const patch of [{classId:'PNJ_FORCE_SENSITIVE'},{secondaryId:'FOR-01'},{secondaryId:'COM-03'},{speciesId:'invented'}])await assert.rejects(f.submit({...successorProposal,...patch}),e=>['INVALID_ADMISSION_CHOICE','INVALID_ADMISSION'].includes(e.code));
  await f.submit({...successorProposal,classId:'TRA'});await assert.rejects(f.previewSuccession(f.input({source:'PROPOSAL',reserveId:undefined})),{code:'CLASS_KIT_MISSING'});assert.equal((await f.store.list(`sessions/${f.sid}/characters`)).length,1);
 });
 test(`${prefix} : identité conservée, réserve liée à autrui et double incarnation interdites`,async()=>{
  const f=await successionFixture(makeStore,{helper:true});await assert.rejects(f.previewSuccession(f.input({reserveId:f.otherId})),{code:'SO_SUCCESSION_RESERVE_UNAVAILABLE'});
  await f.open();await f.submit({...successorProposal,firstName:'Ari',lastName:'Test'});await assert.rejects(f.previewSuccession(f.input({source:'PROPOSAL',reserveId:undefined})),{code:'ADMISSION_IDENTITY_TAKEN'});
  await f.succeed(await f.previewSuccession());await f.death();await assert.rejects(f.previewSuccession(f.input({predecessorId:'reserve'})),{code:'SO_SUCCESSION_RESERVE_UNAVAILABLE'});
 });
 test(`${prefix} : deux MJ concurrents ne créent qu’une relève et une dotation`,async()=>{
  const f=await successionFixture(makeStore);await f.role();const p=f.input(),q=await f.previewSuccession(p),m=await f.previewSuccession(p,f.mj),results=await Promise.allSettled([f.succeed(q,p),f.succeed(m,p,{},f.mj)]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.store.list(`sessions/${f.sid}/characters`)).length,2);assert.equal((await f.store.list(`sessions/${f.sid}/ledger`)).filter(x=>x.kind==='SO_PROTECTED_GRANT').length,2);
 });
 test(`${prefix} : une réserve ne peut pas être attribuée à deux participants`,async()=>{
  const f=await successionFixture(makeStore,{helper:true});await f.death(f.other);const a=f.input(),b=f.input({uid:f.other.uid,predecessorId:f.otherId}),pa=await f.previewSuccession(a),pb=await f.previewSuccession(b);
  const results=await Promise.allSettled([f.succeed(pa,a),f.succeed(pb,b)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.store.list(`sessions/${f.sid}/characters`)).length,3);
 });
 test(`${prefix} : quota plein et comptage incohérent refusés sans libérer de place`,async()=>{
  const f=await successionFixture(makeStore,{helper:true});await f.edit('admission/settings',p=>({...p,quotas:{...p.quotas,COM:1}}));await assert.rejects(f.previewSuccession(),{code:'ADMISSION_QUOTA_FULL'});assert.equal((await f.get('admission/occupancy')).byClass.COM,2);
  await f.edit('admission/occupancy',o=>({...o,byClass:{...o.byClass,COM:1,ROG:1}}));await assert.rejects(f.previewSuccession(),{code:'ADMISSION_ACCOUNTING_CONFLICT'});
 });
 test(`${prefix} : autorité MJ et accès courant avant aperçu ou reçu`,async()=>{
  const f=await successionFixture(makeStore);for(const actor of [f.player,f.other])await assert.rejects(f.previewSuccession(f.input(),actor),{code:'FORBIDDEN'});await f.role(true,'RECEPTION');await assert.rejects(f.previewSuccession(f.input(),f.mj),{code:'FORBIDDEN'});await f.role();
  const q=await f.previewSuccession(f.input(),f.mj),extra={requestId:randomUUID()};await f.succeed(q,f.input(),extra,f.mj);const r=await f.get(`registrations/${hash(f.player.uid)}`);assert.equal(r.admission.confirmation.actorUid,f.mj.uid);assert.equal(r.admission.confirmation.sourceRevision,r.admission.revision-1);await f.role(false);await assert.rejects(f.succeed(q,f.input(),extra,f.mj),{code:'FORBIDDEN'});
  await f.cmdSuccession('revokeAccess',{uid:f.player.uid});await assert.rejects(f.readSuccession('mySpaceOutlawsSuccession',{},f.player),{code:'FORBIDDEN'});await assert.rejects(f.succeed(q,f.input(),extra),{code:'FORBIDDEN'});
 });
 test(`${prefix} : droits de groupe retirés dès le décès, patrimoine et secrets restent au défunt`,async()=>{
  const f=await successionFixture(makeStore,{dead:false});await f.edit('groups/team',()=>({id:'team',name:'Équipe',revision:1,publicationState:'PUBLISHED',visibility:'PUBLIC',roster:{kind:'TEAM',capacity:2,leaderId:f.cid,archived:false},members:[{characterId:f.cid,active:true,revealed:true,permissions:{readBriefing:true,payWallet:true,readWallet:true}}],briefing:'SECRET_GROUPE'}));
  await f.edit(`characters/${f.cid}/knowledge/private`,()=>({id:'private',active:true,snapshot:{body:'SECRET_DEFUNT'}}));await f.edit('accounts/group_team',()=>({id:'group_team',balance:987,ownerType:'GROUP',ownerId:'team'}));
  await f.death();const group=await f.get('groups/team');assert.equal(group.members[0].active,false);assert.equal(group.members[0].permissions.payWallet,false);assert.equal(group.roster.leaderId,null);
  await f.succeed(await f.previewSuccession());assert.deepEqual((await f.actionRead('mySession')).groups,[]);assert.deepEqual((await f.actionRead('myKnowledge')).items,[]);assert.equal((await f.get('accounts/group_team')).balance,987);assert.ok(await f.get(`characters/${f.cid}/knowledge/private`));
 });
 test(`${prefix} : deux décès successifs excluent les XP hérités et gardent le cycle PA`,async()=>{
  const f=await successionFixture(makeStore);await f.edit(`characters/${f.cid}`,c=>({...c,earnedXp:35,xp:100,inheritedXp:9}));const a=await f.previewSuccession();assert.equal(a.inheritedXp,8);await f.succeed(a);await f.death();
  const p=f.input({predecessorId:'reserve',reserveId:'reserve2'}),b=await f.previewSuccession(p);assert.equal(b.inheritedXp,0);assert.equal(b.nextRefillGameMs,a.nextRefillGameMs);await f.succeed(b,p);assert.equal((await f.actionRead('mySession')).actionPoints.available,5);
 });
 test(`${prefix} : reprise d’épisode conserve le dossier, les XP en attente et la réserve consommée`,async()=>{
  const f=await successionFixture(makeStore),e=await episodeHarness(f);await f.open();await f.submit();await e.close({participantUids:[f.player.uid]});await e.resume(await e.begin());
  const p=f.input({source:'PROPOSAL',reserveId:undefined}),q=await e.read('prepareSpaceOutlawsSuccession',p);assert.equal(q.pendingXp,3);assert.equal(q.inheritedXp,0);const result=await e.cmd('succeedSpaceOutlawsCharacter',{...p,confirmation:q.confirmation,reason:'Relève au briefing suivant'});
  assert.equal((await e.read('mySession',{},f.player)).progression.earnedXp,3);assert.equal((await e.get(`characters/${result.characterId}`)).birth.order,2);assert.equal((await e.get(`registrations/${hash(f.player.uid)}`)).progression.pendingXp,0);assert.ok((await f.store.list(`sessions/${e.sid}/registrations/${hash(f.player.uid)}/successionHistory`)).length>=3);
 });
 test(`${prefix} : interruption atomique conserve identité, quota, droits et dotations`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})};const f=await successionFixture(()=>store),q=await f.previewSuccession(),counts=await f.get('admission/occupancy'),requestId=randomUUID();fail=true;await assert.rejects(f.succeed(q,f.input(),{requestId}),/INTERRUPTION/);fail=false;
  assert.equal((await f.get(`characters/${f.cid}`)).assignedUid,f.player.uid);assert.equal(await f.get('characters/reserve'),null);assert.deepEqual(await f.get('admission/occupancy'),counts);assert.equal((await raw.list(`sessions/${f.sid}/accounts`)).length,1);await f.succeed(q,f.input(),{requestId});
 });
 test(`${prefix} : STOP, PA engagés, aperçu périmé et anciens marqueurs restent fermés`,async()=>{
  const f=await successionFixture(makeStore),q=await f.previewSuccession();await f.edit(`characters/${f.cid}`,c=>({...c,earnedXp:8}));await assert.rejects(f.succeed(q),{code:'SO_SUCCESSION_STALE'});
  await f.edit(`characters/${f.cid}/resources/actionPoints`,p=>({...p,reserved:1,available:4}));await assert.rejects(f.previewSuccession(),{code:'SO_SUCCESSION_BUSY'});await f.edit(`characters/${f.cid}/resources/actionPoints`,p=>({...p,reserved:0}));
  await f.edit('',s=>({...s,safetyStop:{active:true}}));await assert.rejects(f.previewSuccession(),{code:'SO_SAFETY_STOP'});await f.edit('',s=>{const {successionVersion,...spaceOutlaws}=s.spaceOutlaws;return {...s,spaceOutlaws};});await assert.rejects(f.previewSuccession(),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : changement de classe, quota remplacé et XP de clôture au dernier actif`,async()=>{
  const f=await successionFixture(makeStore);await f.open();await f.submit({...successorProposal,classId:'ROG',speciesId:'droid-test'});const p=f.input({source:'PROPOSAL',reserveId:undefined}),q=await f.previewSuccession(p),done=await f.succeed(q,p),me=await f.actionRead('mySession');
  assert.equal(me.character.hp,3);assert.equal(me.character.protection,0);assert.equal(me.character.nature,'DROID');assert.equal(me.character.spaceOutlawsSkills.classId,'ROG');assert.equal((await f.get('admission/occupancy')).byClass.COM,0);assert.equal((await f.get('admission/occupancy')).byClass.ROG,1);assert.equal((await f.get('')).accepted,1);
  const e=await episodeHarness(f);await e.close({participantUids:[f.player.uid]});assert.equal((await e.get(`characters/${done.characterId}`)).earnedXp,3);assert.equal((await e.get(`characters/${f.cid}`)).earnedXp??0,0);await e.resume(await e.begin());assert.equal((await e.read('mySession',{},f.player)).character.id,done.characterId);assert.equal((await e.get(`accounts/${accountId(done.characterId)}`)).balance,200);
 });
 test(`${prefix} : reçus d’action et proposition précédents restent liés à l’ancienne identité`,async()=>{
  const f=await successionFixture(makeStore,{dead:false}),a=await f.start();f.advance(105000);const finishInput={requestId:randomUUID()};await f.finish(a,finishInput);await f.death();await f.open();const r=await f.get(`registrations/${hash(f.player.uid)}`),submitInput={predecessorId:f.cid,revision:r.succession.revision,proposal:successorProposal,requestId:randomUUID()};await f.cmdSuccession('submitSpaceOutlawsSuccessor',submitInput,f.player);
  await f.succeed(await f.previewSuccession());await assert.rejects(f.finish(a,finishInput),{code:'FORBIDDEN'});await assert.rejects(f.cmdSuccession('submitSpaceOutlawsSuccessor',submitInput,f.player),{code:'FORBIDDEN'});assert.deepEqual((await f.actionRead('myFieldActions')).actions,[]);assert.deepEqual((await f.actionRead('myKnowledge')).items,[]);
 });
 test(`${prefix} : réserve avec mandat et réserve déjà dotée ne sont pas activées implicitement`,async()=>{
  const f=await successionFixture(makeStore);await f.edit('groups/faction',()=>({id:'faction',name:'Faction',revision:1,members:[{characterId:'reserve',active:true,permissions:{payWallet:true}}]}));await assert.rejects(f.previewSuccession(),{code:'SO_SUCCESSION_GROUP_CONFLICT'});await f.edit('groups/faction',g=>({...g,members:[]}));await f.edit(`accounts/${accountId('reserve')}`,()=>({id:accountId('reserve'),balance:0,protectedCredits:200}));await assert.rejects(f.previewSuccession(),{code:'SO_BIRTH_CONFLICT'});
 });
}
