import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {economyFixture} from './economy-suite.mjs';
import {hash,createWorkflow} from '../../src/core/workflow.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {actionPointPath,portBrecheActionPoints} from '../../src/core/action-point-state.mjs';

export async function campaignFixture(makeStore){
 const f=await economyFixture(makeStore),{owner,read,cmd}=f;
 const setup={...f.sessionInput,campaignTitle:'La campagne test',title:'Épisode un'};
 const p=await read('prepareCampaignStart',owner,setup),started=await cmd('startCampaign',owner,{...setup,confirmation:p.confirmation});
 let sid=started.id;const campaignId=started.campaignId;
 const session=()=>read('session',owner,{sessionId:sid}),raw=()=>f.store.get(`sessions/${sid}`),campaign=()=>read('campaign',owner,{campaignId});
 const stage=async st=>cmd('setStage',owner,{sessionId:sid,revision:(await session()).revision,stage:st});
 const activate=async(who,cid)=>{
  const r=await read('mySession',who,{sessionId:sid});
  if(!r.registration){const s=await session();if(!s.registrationOpen)await cmd('setRegistrationOpen',owner,{sessionId:sid,revision:s.revision,open:true});await cmd('register',who,{sessionId:sid,name:'Participant de retour'});}
  await cmd('assign',owner,{sessionId:sid,uid:who.uid,characterId:cid,replace:true});
  const token=randomBytes(32).toString('base64url');await cmd('issueInvitation',owner,{sessionId:sid,uid:who.uid,tokenHash:hash(token),hours:1});await read('redeem',who,{sessionId:sid,token});return token;
 };
 const run=async()=>{await stage('BRIEFING');await stage('EN_JEU');};
 const closing=async(patch={})=>{const s=await session();if(s.stage==='EN_JEU')await stage('PAUSE');const input={sessionId:sid,reason:'Fin de l’épisode',cancelOffers:false,...patch};return {input,view:await read('prepareCampaignClosure',owner,input)};};
 const close=async(patch={})=>{const p=await closing(patch);return cmd('closeCampaignSession',owner,{...p.input,confirmation:p.view.confirmation});};
 const nextInput=patch=>({campaignId,title:'Épisode suivant',capacity:3,privacy:'Notice nouvelle session',healthPolicy:'PRESERVE',reason:'Continuité de test',...patch});
 const begin=async(patch={})=>{const input=nextInput(patch),view=await read('prepareCampaignEpisode',owner,input);return cmd('beginCampaignEpisode',owner,{...input,confirmation:view.confirmation});};
 const advance=(build,extra={})=>cmd('advanceCampaignEpisode',owner,{campaignId,buildId:build.buildId,...extra});
 const resume=async build=>{let result=build;while(result.status!=='READY')result=await advance(build);sid=result.id;return result;};
 for(const [i,who] of [f.alice,f.bob,f.eve].entries())await activate(who,f.characters[i]);
 await run();
 return {...f,setup,campaignId,get sid(){return sid;},session,raw,campaign,stage,activate,run,closing,close,nextInput,begin,advanceBuild:advance,resume,useSession:id=>{sid=id;}};
}
export function campaignsSuite(makeStore,prefix='Campagnes'){
 test(`${prefix} : création confirmée, mode indépendant conservé et réessai sans double dotation`,async()=>{
  const f=await economyFixture(makeStore),input={...f.sessionInput,campaignTitle:'Une campagne',title:'Premier épisode'};
  const before=await f.read('dashboard');const p=await f.read('prepareCampaignStart',f.owner,input);assert.equal((await f.read('dashboard')).campaigns.length,before.campaigns.length);
  const requestId=randomUUID(),r=await f.cmd('startCampaign',f.owner,{...input,confirmation:p.confirmation,requestId});
  assert.deepEqual(await f.cmd('startCampaign',f.owner,{...input,confirmation:p.confirmation,requestId}),r);
  const s=await f.read('session',f.owner,{sessionId:r.id});assert.equal(s.accounts.find(a=>a.characterId===f.characters[0]).balance,100);assert.equal(s.campaignEpisode,1);
  await f.pay(await f.prepare());assert.equal((await f.wallet()).account.balance,20);assert.equal((await f.read('session',f.owner,{sessionId:r.id})).accounts.find(a=>a.characterId===f.characters[0]).balance,100);
  await assert.rejects(f.cmd('createSession',f.owner,{...input,mode:'CAMPAIGN'}),{code:'INVALID_SESSION_MODE'});
 });
 test(`${prefix} : soldes réellement joués, objets et compétences conservés sans réappliquer le scénario`,async()=>{
  const f=await campaignFixture(makeStore),sid=f.sid,cid=f.characters[0];
  const payInput={sessionId:sid,recipientId:f.characters[1],amount:37,memo:'Achat'},pay=await f.read('preparePayment',f.alice,payInput);await f.cmd('payCredits',f.alice,{...payInput,confirmation:pay.confirmation});
  const item=(await f.cmd('saveSessionItem',f.owner,{sessionId:sid,revision:(await f.session()).revision,name:'Billes',kind:'STACKABLE',consumable:true,publicationState:'PUBLISHED',reason:'Stock'})).id;
  const grant={sessionId:sid,revision:(await f.session()).revision,characterId:cid,itemId:item,quantity:7,reason:'Lot réel'},gp=await f.read('prepareGrantItem',f.owner,grant);await f.cmd('grantItem',f.owner,{...grant,confirmation:gp.confirmation});
  const skill=(await f.cmd('saveSessionSkill',f.owner,{sessionId:sid,revision:(await f.session()).revision,name:'Pilotage',kind:'PASSIVE',publicationState:'PUBLISHED',reason:'Progression'})).id;
  const ab={sessionId:sid,revision:(await f.session()).revision,characterId:cid,classId:null,overrides:[{skillId:skill,level:2}],published:true,reason:'Apprentissage'},ap=await f.read('prepareAbilityProfile',f.owner,ab);await f.cmd('setAbilityProfile',f.owner,{...ab,confirmation:ap.confirmation});
  const before=await f.session();await f.close();await f.seed(cid,999);await f.resume(await f.begin());const next=await f.session();
  assert.deepEqual(next.accounts.map(a=>[a.id,a.balance]).sort(),before.accounts.map(a=>[a.id,a.balance]).sort());assert.deepEqual(next.inventory,before.inventory);
  assert.deepEqual(next.characters.find(c=>c.id===cid).abilityProfile,before.characters.find(c=>c.id===cid).abilityProfile);
  const carry=await f.store.list(`sessions/${f.sid}/ledger`);assert.ok(carry.every(e=>e.kind==='CAMPAIGN_CARRY'&&e.createdCurrency===0&&e.removedCurrency===0&&e.entries[0].delta===0));
  assert.equal(next.previousSessionId,sid);assert.equal(next.campaignEpisode,2);
 });
 test(`${prefix} : découvertes, retraits de connaissances et audiences des anciens messages conservés`,async()=>{
  const f=await campaignFixture(makeStore),sid=f.sid,cid=f.characters[0];
  const kid=(await f.cmd('saveSessionKnowledge',f.owner,{sessionId:sid,revision:(await f.session()).revision,title:'Secret',body:'Version reçue',kind:'CLUE',publicationState:'PUBLISHED',shareMode:'COPY',qrEnabled:true,qrAudience:'ALL_PLAYERS',reason:'Indice'})).id;
  await f.cmd('discoverKnowledge',f.alice,{sessionId:sid,knowledgeId:kid});await f.cmd('discoverKnowledge',f.bob,{sessionId:sid,knowledgeId:kid});
  const current=await f.store.get(`sessions/${sid}/knowledge/${kid}`);await f.cmd('grantKnowledge',f.owner,{sessionId:sid,knowledgeId:kid,characterId:f.characters[1],knowledgeRevision:current.revision,grantRevision:1,enabled:false,reason:'Retrait'});
  const g={name:'Cellule secrète',visibility:'SECRET',publicationState:'PUBLISHED',members:[{characterId:cid,active:true,revealed:true,permissions:{readUpdates:true,publishUpdates:true}}]};
  const gid=(await f.cmd('saveSessionGroup',f.owner,{...g,sessionId:sid,revision:(await f.session()).revision,reason:'Cellule'})).id;
  await f.cmd('setGroupModule',f.owner,{sessionId:sid,revision:(await f.session()).revision,enabled:true,reason:'Groupes'});
  await f.cmd('publishGroupUpdate',f.alice,{sessionId:sid,groupId:gid,title:'Message antérieur',body:'À Alice seulement'});
  await f.cmd('saveSessionGroup',f.owner,{...g,groupId:gid,sessionId:sid,revision:(await f.session()).revision,reason:'Nouveau membre',members:[...g.members,{characterId:f.characters[2],active:true,revealed:true,permissions:{readUpdates:true}}]});
  await f.close();await f.resume(await f.begin());await f.activate(f.alice,cid);await f.activate(f.eve,f.characters[2]);await f.run();
  assert.equal((await f.read('knowledgeDetail',f.alice,{sessionId:f.sid,knowledgeId:kid})).knowledge.body,'Version reçue');
  assert.equal((await f.store.get(`sessions/${f.sid}/characters/${f.characters[1]}/knowledge/${kid}`)).active,false);
  assert.equal((await f.read('myGroup',f.alice,{sessionId:f.sid,groupId:gid})).group.updates.length,1);
  assert.equal((await f.read('myGroup',f.eve,{sessionId:f.sid,groupId:gid})).group.updates.length,0);
 });
 test(`${prefix} : blessures choisies explicitement, PA pleins et délais remis à zéro au nouvel épisode`,async()=>{
  const f=await campaignFixture(makeStore),cid=f.characters[0],sid=f.sid;
  const rules={sessionId:sid,revision:(await f.session()).revision,rules:portBrecheActionPoints,reason:'PA'},p=await f.read('prepareActionPointRules',f.owner,rules);await f.cmd('saveActionPointRules',f.owner,{...rules,confirmation:p.confirmation});
  const level={sessionId:sid,revision:(await f.session()).revision,characterId:cid,level:2,reason:'Niveau'},lp=await f.read('prepareGlobalLevel',f.owner,level);await f.cmd('setGlobalLevel',f.owner,{...level,confirmation:lp.confirmation});
  const damage={sessionId:sid,amount:4},dp=await f.read('prepareDamage',f.alice,damage);await f.cmd('applyDamage',f.alice,{...damage,confirmation:dp.confirmation});
  await f.store.runTransaction(async tx=>{tx.set(actionPointPath(sid,cid),{available:1,reserved:0,lastRefillGameMs:0,revision:2});tx.set(`sessions/${sid}/characters/${cid}/skillUses/test`,{id:'test',used:9,readyAtGameMs:999999});tx.set(`sessions/${sid}/characters/${cid}/cooldowns/field-care`,{readyAtGameMs:999999});});
  await f.close();await assert.rejects(f.read('prepareCampaignEpisode',f.owner,f.nextInput({healthPolicy:undefined})),{code:'CAMPAIGN_HEALTH_POLICY_REQUIRED'});
  f.advance(40*86400000);await f.resume(await f.begin());let s=await f.session();assert.equal(s.characters.find(c=>c.id===cid).hp,6);assert.equal(s.characters.find(c=>c.id===cid).actionPoints.available,8);
  assert.equal((await f.store.list(`sessions/${f.sid}/characters/${cid}/skillUses`)).length,0);assert.equal(await f.store.get(`sessions/${f.sid}/characters/${cid}/cooldowns/field-care`),null);
  await f.run();await f.close();const preview=await f.read('prepareCampaignEpisode',f.owner,f.nextInput({healthPolicy:'RESTORE'}));assert.equal(preview.summary.characters.find(c=>c.id===cid).hpAfter,10);
  await f.resume(await f.begin({healthPolicy:'RESTORE'}));assert.equal((await f.session()).characters.find(c=>c.id===cid).hp,10);
 });
 test(`${prefix} : clôture refuse contrats, primes, retraits et réservations non résolus`,async()=>{
  const f=await campaignFixture(makeStore),sid=f.sid,cid=f.characters[0];await f.stage('PAUSE');
  await f.store.runTransaction(async tx=>{tx.set(`sessions/${sid}/contracts/test`,{id:'test',status:'ACTIVE',terms:{title:'Mission'}});tx.set(`sessions/${sid}/bounties/test`,{id:'test',status:'OPEN'});tx.set(`sessions/${sid}/lotSales/test`,{id:'test',status:'SOLD',pickupStatus:'WAITING'});tx.set(actionPointPath(sid,cid),{available:0,reserved:1,revision:1});});
  const p=await f.closing();assert.equal(p.view.canClose,false);assert.deepEqual(new Set(p.view.blocks.map(b=>b.kind)),new Set(['CONTRACT','BOUNTY','PICKUP','RESERVED_AP']));
  await assert.rejects(f.cmd('closeCampaignSession',f.owner,{...p.input,confirmation:p.view.confirmation}),{code:'CAMPAIGN_UNRESOLVED'});
  assert.equal((await f.campaign()).activeSessionId,sid);await f.stage('FINISHED');await f.cmd('reopenCampaignSession',f.owner,{sessionId:sid,reason:'Régulariser'});assert.equal((await f.session()).stage,'PAUSE');
 });
 test(`${prefix} : annulation explicite des offres et libération du stock sans duplication`,async()=>{
  const f=await campaignFixture(makeStore),sid=f.sid,cid=f.characters[0];
  const item={id:'billes',name:'Billes',description:'',kind:'STACKABLE',category:'',unit:'recharge',consumable:true,unitVolume:1,legality:'LEGAL',revision:1};
  await f.store.runTransaction(async tx=>{tx.set(`sessions/${sid}/inventory/lot`,{id:'lot',item,quantity:3,ownerId:cid,holderId:cid,location:{kind:'CHARACTER',id:cid},status:'RESERVED',revision:3,marketReservation:{listingId:'offer',expiresAt:100001}});tx.set(`sessions/${sid}/marketListings/offer`,{id:'offer',status:'ACTIVE',lotId:'lot',revision:1});tx.set(`sessions/${sid}/lotTransfers/transfer`,{id:'transfer',status:'PENDING',revision:1});tx.set(`sessions/${sid}/lotSales/sale`,{id:'sale',status:'PENDING',revision:1});});
  const no=await f.closing();assert.equal(no.view.canClose,false);assert.deepEqual(no.view.cancelled,{market:1,sales:1,transfers:1});
  const yes=await f.closing({cancelOffers:true}),requestId=randomUUID();f.advance(600000);const input={...yes.input,confirmation:yes.view.confirmation,requestId};await f.cmd('closeCampaignSession',f.owner,input);await f.cmd('closeCampaignSession',f.owner,input);
  assert.equal((await f.store.get(`sessions/${sid}/inventory/lot`)).status,'AVAILABLE');await f.resume(await f.begin());const lots=(await f.session()).inventory;assert.equal(lots.length,1);assert.equal(lots[0].quantity,3);assert.equal(lots[0].status,'AVAILABLE');assert.equal((await f.store.list(`sessions/${f.sid}/marketListings`)).length,0);
 });
 test(`${prefix} : aperçu périmé refusé et état scellé protégé des anciens services`,async()=>{
  const f=await campaignFixture(makeStore),sid=f.sid;const old=await f.closing();
  const p={sessionId:sid,revision:(await f.session()).revision,characterId:f.characters[0],amount:1,mode:'CREDIT',memo:'Prime',reason:'Correction'},preview=await f.read('prepareCreditAdjustment',f.owner,p);await f.cmd('applyCreditAdjustment',f.owner,{...p,confirmation:preview.confirmation});
  await assert.rejects(f.cmd('closeCampaignSession',f.owner,{...old.input,confirmation:old.view.confirmation}),{code:'STALE_REVISION'});await f.close();
  await assert.rejects(f.cmd('setRegistrationStatus',f.owner,{sessionId:sid,uid:f.alice.uid,status:'CANCELLED'}),{code:'CAMPAIGN_SESSION_SEALED'});
  await assert.rejects(f.cmd('cancelRegistration',f.alice,{sessionId:sid}),{code:'CAMPAIGN_SESSION_SEALED'});
  assert.equal((await f.store.get(`sessions/${sid}/characters/${f.characters[0]}`)).assignedUid,f.alice.uid);
  await assert.rejects(f.cmd('setStage',f.owner,{sessionId:sid,revision:(await f.session()).revision,stage:'EN_JEU'}));
 });
 test(`${prefix} : une seule reprise concurrente et aucune session partielle accessible`,async()=>{
  const f=await campaignFixture(makeStore);await f.close();const input=f.nextInput(),p=await f.read('prepareCampaignEpisode',f.owner,input);
  const attempts=await Promise.allSettled([f.cmd('beginCampaignEpisode',f.owner,{...input,confirmation:p.confirmation}),f.cmd('beginCampaignEpisode',f.owner,{...input,confirmation:p.confirmation})]);
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);const build=attempts.find(r=>r.status==='fulfilled').value;
  await assert.rejects(f.read('publicSession',null,{sessionId:build.id}),{code:'NOT_FOUND'});
  assert.equal((await f.read('dashboard')).sessions.some(s=>s.id===build.id),false);await assert.rejects(f.begin(),{code:'CAMPAIGN_EPISODE_ACTIVE'});
  await f.resume(build);await assert.rejects(f.begin(),{code:'CAMPAIGN_EPISODE_ACTIVE'});assert.equal((await f.campaign()).activeSessionId,build.id);
 });
 test(`${prefix} : interruption, répétition d’une page et reprise après reconnexion sans nouvelle monnaie`,async()=>{
  const f=await campaignFixture(makeStore),source=f.sid;
  // Synthetic sixty-character state exercises multiple copy pages without production data.
  const sample=await f.store.get(`sessions/${source}/characters/${f.characters[0]}`);
  await f.store.runTransaction(async tx=>{for(let i=3;i<60;i++)tx.set(`sessions/${source}/characters/extra-${i}`,{...sample,id:`extra-${i}`,assignedUid:null,public:{...sample.public,displayName:`Rôle ${i}`}});});
  await f.close();const build=await f.begin();assert.ok(build.pages>1);const requestId=randomUUID();const first=await f.advanceBuild(build,{requestId});assert.equal(first.cursor,1);assert.deepEqual(await f.advanceBuild(build,{requestId}),first);
  const recovered=await f.campaign();assert.equal(recovered.build.cursor,1);const wf=createWorkflow({store:f.store,ownerEmail:f.owner.email});
  const r=await wf.dispatch('advanceCampaignEpisode',f.owner,{campaignId:f.campaignId,buildId:build.buildId,requestId:randomUUID()});assert.equal(r.cursor,2);
  await f.resume(build);assert.equal((await f.session()).characters.length,60);const ledger=await f.store.list(`sessions/${f.sid}/ledger`);assert.equal(ledger.length,3);assert.equal(ledger.reduce((n,e)=>n+e.createdCurrency,0),0);
 });
 test(`${prefix} : anciens accès non reconduits, rôle précédent proposé et réattribution sans biens dupliqués`,async()=>{
  const f=await campaignFixture(makeStore),old=f.sid;await f.close();await f.resume(await f.begin());
  assert.equal((await f.read('mySession',f.alice,{sessionId:f.sid})).character,null);assert.equal((await f.session()).registrations.length,0);
  await f.cmd('setRegistrationOpen',f.owner,{sessionId:f.sid,revision:(await f.session()).revision,open:true});await f.cmd('register',f.alice,{sessionId:f.sid,name:'Alice'});
  assert.equal((await f.session()).registrations[0].previousCharacterId,f.characters[0]);await f.activate(f.bob,f.characters[0]);await f.run();
  assert.equal((await f.read('mySession',f.alice,{sessionId:f.sid})).character,null);assert.equal((await f.read('myWallet',f.bob,{sessionId:f.sid})).account.balance,100);
  await assert.rejects(f.read('myWallet',f.alice,{sessionId:old}));assert.equal((await f.session()).accounts.length,3);
 });
 test(`${prefix} : campagne privée, rôle Accueil exclu et délégation MJ vérifiée avant réessai`,async()=>{
  const f=await campaignFixture(makeStore);await f.cmd('setStaff',f.owner,{sessionId:f.sid,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Accueil'});
  for(const actor of [f.alice,f.staff]){await assert.rejects(f.read('campaign',actor,{campaignId:f.campaignId}),{code:'FORBIDDEN'});await assert.rejects(f.read('prepareCampaignClosure',actor,{sessionId:f.sid,reason:'Fin'}),{code:'FORBIDDEN'});}
  assert.equal('campaignId' in await f.read('session',f.staff,{sessionId:f.sid}),false);assert.equal((await f.read('dashboard',f.staff)).campaigns.length,0);
  await f.cmd('setStaff',f.owner,{sessionId:f.sid,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:true,reason:'MJ'});await f.stage('PAUSE');
  const input={sessionId:f.sid,reason:'Bilan MJ'},p=await f.read('prepareCampaignClosure',f.staff,input);await f.cmd('setStaff',f.owner,{sessionId:f.sid,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:false,reason:'Retrait'});
  await assert.rejects(f.cmd('closeCampaignSession',f.staff,{...input,confirmation:p.confirmation}),{code:'FORBIDDEN'});
  for(const action of ['campaign','prepareCampaignStart','startCampaign','prepareCampaignEpisode','beginCampaignEpisode','advanceCampaignEpisode'])await assert.rejects(f.cmd(action,null,{}),{code:'LOGIN_REQUIRED'});
 });
 test(`${prefix} : caisses, droits, images et lots épuisés restent dans leur état de fin`,async()=>{
  const f=await campaignFixture(makeStore),sid=f.sid,cid=f.characters[0];
  const gid=(await f.cmd('saveSessionGroup',f.owner,{sessionId:sid,revision:(await f.session()).revision,name:'Bande',visibility:'SECRET',publicationState:'PUBLISHED',members:[{characterId:cid,active:true,revealed:true,permissions:{readWallet:true,payWallet:true}}],reason:'Bande'})).id;
  const config={sessionId:sid,revision:(await f.session()).revision,groupId:gid,label:'Caisse du Comptoir',reason:'Caisse'},wp=await f.read('prepareGroupWallet',f.owner,config);await f.cmd('setGroupWallet',f.owner,{...config,confirmation:wp.confirmation});
  const credit={sessionId:sid,revision:(await f.session()).revision,groupId:gid,amount:47,mode:'CREDIT',memo:'Bénéfice',reason:'Recette'},cp=await f.read('prepareCreditAdjustment',f.owner,credit);await f.cmd('applyCreditAdjustment',f.owner,{...credit,confirmation:cp.confirmation});
  const image=randomUUID(),path=`sessions/${sid}/characters/${cid}`,character=await f.store.get(path);
  await f.store.runTransaction(async tx=>{tx.set(`media/${image}`,{id:image,ownerUid:f.owner.uid,status:'READY',usageCount:1,refsRevision:1});tx.set(`media/${image}/usages/${hash(path)}`,{path,active:true,scope:'session',scopeId:sid});tx.set(path,{...character,mediaImages:{portrait:{id:image,version:1}}});tx.set(`sessions/${sid}/inventory/empty`,{id:'empty',quantity:0,status:'CONSUMED',revision:2,ownerId:cid,holderId:cid,location:{kind:'CHARACTER',id:cid},item:{id:'fuel',name:'Carburant',kind:'STACKABLE',consumable:true,revision:1}});});
  const before=await f.session();await f.close();await f.resume(await f.begin());const next=await f.session();
  assert.equal(next.accounts.find(a=>a.groupId===gid).balance,47);assert.deepEqual(next.groups,before.groups);assert.equal(next.inventory.find(l=>l.id==='empty').quantity,0);assert.equal(next.inventory.find(l=>l.id==='empty').status,'CONSUMED');
  assert.equal(next.characters.find(c=>c.id===cid).mediaImages.portrait.id,image);assert.ok((await f.store.get(`media/${image}`)).usageCount>=3);
 });
 test(`${prefix} : le propriétaire peut retirer un accès MJ après clôture sans modifier le bilan`,async()=>{
  const f=await campaignFixture(makeStore),sid=f.sid;
  await f.cmd('setStaff',f.owner,{sessionId:sid,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:true,reason:'MJ'});await f.close();const state=await f.raw();
  await f.cmd('setStaff',f.owner,{sessionId:sid,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:false,reason:'Fin de délégation'});
  assert.deepEqual(await f.raw(),state);await assert.rejects(f.read('session',f.staff,{sessionId:sid}),{code:'FORBIDDEN'});
 });

}
