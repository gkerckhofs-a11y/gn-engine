import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createWorkflow,hash} from '../../src/core/workflow.mjs';
import {campaignGuardStore} from '../../src/core/campaigns.mjs';

const metadata={title:'Une session à Breach Port',summary:'Fiction',date:'2027-04-03',time:'10 h',place:'Lieu fictif',practical:'Test seulement',privacy:'Notice fictive',capacity:60};
export function preparationFixture(makeStore){
 const store=makeStore(),owner={uid:randomUUID(),email:`owner-${randomUUID()}@example.invalid`,emailVerified:true,provider:'google.com',authTime:1000};
 const mj={...owner,uid:randomUUID(),email:`mj-${randomUUID()}@example.invalid`},player={...mj,uid:randomUUID(),email:`player-${randomUUID()}@example.invalid`};
 const workflow=createWorkflow({store,ownerEmail:owner.email,now:()=>1000000});
 const read=(action,actor=owner,input={})=>workflow.dispatch(action,actor,input);
 const cmd=(action,input={},actor=owner)=>read(action,actor,{requestId:randomUUID(),...input});
 const creation={...metadata,campaignTitle:'SPACE OUTLAWS synthétique',creationId:randomUUID()};
 const create=(patch={},actor=owner)=>cmd('createSpaceOutlawsPreparation',{...creation,...patch},actor);
 return {store,owner,mj,player,read,cmd,creation,create};
}
export function preparationsSuite(makeStore,prefix='Préparation SO'){
 test(`${prefix} : contexte privé sans scénario, version, dotation ou épisode joué`,async()=>{
  const f=preparationFixture(makeStore),r=await f.create(),s=await f.read('session',f.owner,{sessionId:r.id});
  assert.equal(s.preparationKind,'SPACE_OUTLAWS_V07');assert.equal(s.stage,'PREPARATION');assert.equal(s.registrationOpen,false);assert.equal(s.accepted,0);assert.equal(s.versionId,null);
  const c=await f.read('campaign',f.owner,{campaignId:r.campaignId});assert.equal(c.preparationSessionId,r.id);assert.equal(c.episodeCount,0);assert.equal(c.activeSessionId,null);assert.equal(c.latestSessionId,null);assert.deepEqual(c.checkpoints,[]);
  for(const kind of ['characters','registrations','groups','accounts','inventory','ledger','skills','classes','items','knowledge','ships','fieldTargets','fieldStates','recipes','masterRows'])assert.deepEqual(await f.store.list(`sessions/${r.id}/${kind}`),[],kind);
  assert.deepEqual(await f.store.list('scenarios',['ownerUid',f.owner.uid]),[]);
  const d=await f.read('dashboard');assert.equal(d.campaigns[0].preparationSessionId,r.id);assert.equal(d.sessions[0].preparationKind,s.preparationKind);
 });
 test(`${prefix} : création concurrente, réponse perdue et nouveaux requestId donnent une seule préparation`,async()=>{
  const f=preparationFixture(makeStore),input={...f.creation,requestId:randomUUID()};
  const results=await Promise.all([f.cmd('createSpaceOutlawsPreparation',input),...Array.from({length:3},()=>f.create())]);
  for(const r of results)assert.deepEqual(r,results[0]);assert.deepEqual(await f.cmd('createSpaceOutlawsPreparation',input),results[0]);
  const d=await f.read('dashboard');assert.equal(d.campaigns.length,1);assert.equal(d.sessions.length,1);
  assert.equal((await f.store.list(`sessions/${results[0].id}/audit`)).length,1);
  await assert.rejects(f.create({title:'Autre intention, même clé'}),{code:'PREPARATION_EXISTS'});
  assert.equal((await f.read('dashboard')).campaigns.length,1);
 });
 test(`${prefix} : échec avant commit puis reprise ne laisse aucun contexte partiel`,async()=>{
  const base=makeStore();let fail=true;
  const guarded={get:base.get.bind(base),list:base.list.bind(base),runTransaction:cb=>base.runTransaction(async tx=>{const r=await cb(tx);if(fail){fail=false;throw new Error('SIMULATED_INTERRUPTION');}return r;})};
  const f=preparationFixture(()=>guarded);await assert.rejects(f.create(),/SIMULATED_INTERRUPTION/);
  assert.deepEqual(await base.list('campaigns',['ownerUid',f.owner.uid]),[]);assert.deepEqual(await base.list('sessions',['ownerUid',f.owner.uid]),[]);
  const r=await f.create();assert.deepEqual(await f.create(),r);assert.equal((await base.list(`campaigns/${r.campaignId}/history`)).length,1);
 });
 test(`${prefix} : authentification, propriétaire et confidentialité vérifiés au serveur`,async()=>{
  const f=preparationFixture(makeStore);
  await assert.rejects(f.create({},null),{code:'LOGIN_REQUIRED'});await assert.rejects(f.create({}, {...f.owner,emailVerified:false}),{code:'LOGIN_REQUIRED'});
  await assert.rejects(f.create({},f.player),{code:'FORBIDDEN'});const r=await f.create();
  for(const action of ['publicSession','publicBadge'])await assert.rejects(f.read(action,null,{sessionId:r.id,characterId:'any'}),{code:'NOT_FOUND'});
  await assert.rejects(f.read('mySession',f.player,{sessionId:r.id}),{code:'NOT_FOUND'});
  await assert.rejects(f.read('session',f.player,{sessionId:r.id}),{code:'FORBIDDEN'});
  await assert.rejects(f.read('campaign',f.player,{campaignId:r.campaignId}),{code:'FORBIDDEN'});
  await assert.rejects(f.read('session',{...f.owner,uid:randomUUID()},{sessionId:r.id}),{code:'FORBIDDEN'});
 });
 test(`${prefix} : refus des champs de migration, règles, droits et ressources injectés`,async()=>{
  const f=preparationFixture(makeStore);
  for(const patch of [{scenarioId:'ancien'},{campaignId:'ancien'},{ruleProfile:'FOR-01'},{ownerUid:'other'},{startingCredits:200},{capacity:0},{capacity:1.5},{title:''},{privacy:''}])await assert.rejects(f.create(patch));
  assert.equal((await f.read('dashboard')).campaigns.length,0);
 });
 test(`${prefix} : deux éditions concurrentes refusent la révision périmée sans version hybride`,async()=>{
  const f=preparationFixture(makeStore),r=await f.create(),base={...metadata,sessionId:r.id,revision:1,reason:'Mise à jour'};
  const results=await Promise.allSettled([f.cmd('saveSpaceOutlawsPreparation',{...base,title:'A',place:'Lieu A'}),f.cmd('saveSpaceOutlawsPreparation',{...base,title:'B',place:'Lieu B'})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'STALE_REVISION');
  const s=await f.read('session',f.owner,{sessionId:r.id});assert.ok(['A','B'].includes(s.title));assert.equal(s.place,`Lieu ${s.title}`);assert.equal(s.revision,2);assert.equal(s.audit.length,2);
  assert.equal(s.characters.length,0);assert.equal(s.accounts.length,0);assert.equal(s.inventory.length,0);
 });
 test(`${prefix} : MJ délégué, Accueil en lecture et révocation avant rejeu d’un reçu`,async()=>{
  const f=preparationFixture(makeStore),r=await f.create();
  await f.cmd('setStaff',{sessionId:r.id,revision:1,email:f.mj.email,role:'MJ',active:true,reason:'Préparation'});
  const input={...metadata,sessionId:r.id,revision:2,reason:'Changer le lieu',place:'Autre lieu',requestId:randomUUID()};
  const result=await f.cmd('saveSpaceOutlawsPreparation',input,f.mj);assert.deepEqual(await f.cmd('saveSpaceOutlawsPreparation',input,f.mj),result);
  await f.cmd('setStaff',{sessionId:r.id,revision:3,email:f.mj.email,role:'MJ',active:false,reason:'Fin de mandat'});
  await assert.rejects(f.cmd('saveSpaceOutlawsPreparation',input,f.mj),{code:'FORBIDDEN'});
  await f.cmd('setStaff',{sessionId:r.id,revision:4,email:f.player.email,role:'RECEPTION',active:true,reason:'Accueil'});
  assert.equal((await f.read('session',f.player,{sessionId:r.id})).role,'RECEPTION');
  await assert.rejects(f.cmd('saveSpaceOutlawsPreparation',{...input,revision:5},f.player),{code:'FORBIDDEN'});
  const other=await f.create({creationId:randomUUID()});await assert.rejects(f.read('session',f.player,{sessionId:other.id}),{code:'FORBIDDEN'});
 });
 test(`${prefix} : anciennes commandes et imports ne peuvent ouvrir ou doter la préparation`,async()=>{
  const f=preparationFixture(makeStore),r=await f.create(),base={sessionId:r.id,revision:1};
  for(const [action,input] of [['setRegistrationOpen',{open:true}],['setStage',{stage:'BRIEFING'}],['saveSessionItem',{name:'Objet',kind:'STACKABLE'}],['prepareMasterImport',{sheets:{}}],['assign',{uid:f.player.uid,characterId:'new'}],['issueInvitation',{uid:f.player.uid,tokenHash:hash('token'),hours:1}],['prepareCampaignClosure',{reason:'Clôture'}]])await assert.rejects(f.cmd(action,{...base,...input}),{code:'PREPARATION_ONLY'});
  await assert.rejects(f.cmd('register',{sessionId:r.id,name:'Joueur'},f.player));
  await assert.rejects(f.cmd('prepareCampaignEpisode',{campaignId:r.campaignId}),{code:'PREPARATION_ONLY'});
  const s=await f.read('session',f.owner,{sessionId:r.id});assert.equal(s.revision,1);assert.equal(s.audit.length,1);assert.deepEqual(s.registrations,[]);
 });
 test(`${prefix} : barrière transactionnelle commune annule aussi une écriture de service non prévue`,async()=>{
  const f=preparationFixture(makeStore),r=await f.create(),store=campaignGuardStore(f.store),s=await f.store.get(`sessions/${r.id}`);
  for(const [path,data] of [[`sessions/${r.id}`,{...s,revision:2,registrationOpen:true}],[`sessions/${r.id}`,{...s,revision:2,preparationKind:null}],[`sessions/${r.id}/accounts/rogue`,{balance:200}],[`sessions/${r.id}/registrations/rogue`,{status:'ACCEPTED'}]]){
   await assert.rejects(store.runTransaction(async tx=>{tx.set(path,data);tx.set(`sessions/${r.id}/audit/rogue`,{action:'shouldRollback'});}),{code:'PREPARATION_ONLY'});
   assert.equal(await f.store.get(`sessions/${r.id}/audit/rogue`),null);
  }
  assert.deepEqual(await f.store.get(`sessions/${r.id}`),s);
 });
 test(`${prefix} : nouvelle préparation et ancienne session coexistent sans conversion`,async()=>{
  const f=preparationFixture(makeStore),scenario=await f.cmd('createScenario',{title:'Historique'});
  await f.cmd('saveCharacter',{scenarioId:scenario.id,revision:1,displayName:'Ancien',publicationState:'PUBLISHED'});
  const version=await f.cmd('publishScenario',{scenarioId:scenario.id,revision:2});
  const legacy=await f.cmd('createSession',{...metadata,scenarioId:scenario.id,versionId:version.id});
  const before=await f.read('session',f.owner,{sessionId:legacy.id});await f.create();
  await assert.rejects(f.cmd('saveSpaceOutlawsPreparation',{...metadata,sessionId:legacy.id,revision:1,reason:'Conversion interdite'}),{code:'NOT_A_PREPARATION'});
  assert.deepEqual(await f.read('session',f.owner,{sessionId:legacy.id}),before);
  await f.cmd('setRegistrationOpen',{sessionId:legacy.id,revision:1,open:true});await f.cmd('register',{sessionId:legacy.id,name:'Ancien parcours'},f.player);
  assert.equal((await f.read('session',f.owner,{sessionId:legacy.id})).accepted,1);
 });
}
