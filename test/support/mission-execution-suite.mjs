import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spaceMissionsFixture} from './space-missions-suite.mjs';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {shopAccountId} from '../../src/core/space-outlaws-shop-state.mjs';

const rewardItems=[{itemId:'kit_medical-supplies',quantity:3}],stepEvidence=[{stepId:'meet',kind:'FIELD',targetId:'scene'}];
export const missionExecutionFixture=makeStore=>spaceMissionsFixture(makeStore,{rewardItems,stepEvidence});
async function analyze(f){const q=await f.prepareAction(),a=await f.start();f.advance(q.durationSeconds*1000);await f.finish(a);return a;}
async function pickup(f,c){let p=(await f.contract(c,f.owner)).rewardPickups.find(p=>p.pickupStatus!=='RECEIVED');await f.cmd('offerContractRewardPickup',{contractId:c.id,pickupId:p.id,confirmation:p.confirmation,present:true},f.owner);p=(await f.contract(c)).rewardPickups.find(x=>x.id===p.id);return {contractId:c.id,pickupId:p.id,confirmation:p.confirmation,received:true};}
export function missionExecutionSuite(makeStore,prefix='Exécution missions SO'){
 missionCounterSuite(makeStore,prefix);
 test(`${prefix} : analyse réelle après signature, récit privé et PA consommé une seule fois`,async()=>{
  const f=await missionExecutionFixture(makeStore),{c}=await f.active();assert.equal((await f.remaining()).quantity,2);assert.equal((await f.till()).reserved,100);
  await f.read('fieldTarget',{targetId:'scene'});await assert.rejects(f.submit(c),{code:'SO_MISSION_EVIDENCE_REQUIRED'});const a=await analyze(f);await f.edit(`fieldActions/${a.id}`,x=>({...x,status:'FAILED'}));await assert.rejects(f.submit(c),{code:'SO_MISSION_EVIDENCE_REQUIRED'});await f.edit(`fieldActions/${a.id}`,x=>({...x,status:'SUCCEEDED'}));await f.submit(c);const d=await f.contract(c,f.owner);assert.equal(d.contract.proof.evidence[0].recordId,a.id);assert.equal((await f.points()).available,4);assert.equal((await f.wallet()).balance,0);assert.doesNotMatch(JSON.stringify(d.contract.proof),/TEXTE_PRIVE|VERITE_MJ|accessVersion|actorUid/);await assert.rejects(f.contract(c,f.other),{code:'FORBIDDEN'});
 });
 test(`${prefix} : preuve antérieure, action d’autrui, mauvais lieu et liaison invalide refusés`,async()=>{
  const f=await spaceMissionsFixture(makeStore,{stepEvidence});await analyze(f);f.advance(1);const {c}=await f.active();await assert.rejects(f.submit(c),{code:'SO_MISSION_EVIDENCE_REQUIRED'});
  const q=await f.prepareAction({},f.other),other=await f.start({},f.other);f.advance(q.durationSeconds*1000);await f.finish(other,{},f.other);await assert.rejects(f.submit(c),{code:'SO_MISSION_EVIDENCE_REQUIRED'});
  const a=await f.announce(),t=await f.apply(a);for(const b of [{stepId:'missing',kind:'FIELD',targetId:'scene'},{stepId:'meet',kind:'FIELD',targetId:'absent'},{stepId:'meet',kind:'VOYAGE',routeId:'absent'}])await assert.rejects(f.offer(t,{stepEvidence:[b],amount:30}),{code:'SO_MISSION_EVIDENCE_INVALID'});
  const x=await f.offer(t,{stepEvidence:[{stepId:'meet',kind:'FIELD',targetId:'elsewhere'}],amount:30});await f.accept(x);await assert.rejects(f.submit(x),{code:'SO_MISSION_EVIDENCE_REQUIRED'});
 });
 test(`${prefix} : sources M1/M5 explicites et stock insuffisant ne réservent aucun crédit`,async()=>{
  const f=await missionExecutionFixture(makeStore),a=await f.announce(),t=await f.apply(a);for(const rewardSources of [[],[{itemId:rewardItems[0].itemId,offerId:'absent'}],[{itemId:'invented',offerId:'supply'}]])await assert.rejects(f.offer(t,{rewardSources}),{code:'SO_MISSION_REWARD_SOURCE'});
  const c=await f.offer(t),q=await f.read('prepareContractAcceptance',{contractId:c.id});await f.buy({quantity:3},f.other);await assert.rejects(f.cmd('acceptContract',{contractId:c.id,confirmation:q.confirmation}),{code:'SO_MISSION_REWARD_SOURCE'});assert.equal((await f.till()).reserved,0);assert.equal((await f.contract(c)).contract.status,'PROPOSED');
 });
 test(`${prefix} : paiement et propriété sans téléportation, double remise puis stock utilisable`,async()=>{
  const f=await missionExecutionFixture(makeStore),{c}=await f.active();await analyze(f);await f.submit(c);await f.review(c);f.advance(600000);await f.settle(c);
  const d=await f.contract(c),p=d.rewardPickups[0],lot=await f.get(`inventory/${p.id}`);assert.equal(lot.quantity,3);assert.equal(lot.ownerId,f.cid);assert.equal(lot.location.kind,'SHOP');assert.equal(lot.transferable,false);assert.equal(lot.resellable,false);assert.equal((await f.wallet()).balance,100);await assert.rejects(f.stage('FINISHED'),{code:'CONTRACTS_OPEN'});
  await assert.rejects(f.cmd('confirmContractRewardPickup',{contractId:c.id,pickupId:p.id,confirmation:p.confirmation,received:true}),{code:'STALE_PICKUP'});const input={...await pickup(f,c),requestId:randomUUID()},done=await f.cmd('confirmContractRewardPickup',input);assert.deepEqual(await f.cmd('confirmContractRewardPickup',input),done);assert.equal((await f.get(`inventory/${p.id}`)).location.id,f.cid);assert.equal((await f.contract(c)).rewardPickups[0].pickupStatus,'RECEIVED');assert.equal((await f.remaining()).quantity,2);assert.equal((await f.read('myInventory')).lots.find(l=>l.id===p.id).quantity,3);
 });
 test(`${prefix} : litige matériel seul, part libre puis arbitrage explicite sans prorata`,async()=>{
  const f=await spaceMissionsFixture(makeStore,{rewardItems}),{c}=await f.validated();await f.confirm('prepareContractDispute','disputeContract',{contractId:c.id,amount:0,rewardDisputes:[{itemId:rewardItems[0].itemId,quantity:2}],reason:'Deux fournitures contestées'},f.player);f.advance(600000);await f.settle(c);
  const paymentId=(await f.get(`contracts/${c.id}`)).paymentId;assert.equal((await f.get(`ledger/${paymentId}`)).contractId,c.id);let d=await f.contract(c);assert.equal(d.contract.status,'DISPUTED');assert.equal(d.rewardPickups[0].quantity,1);assert.equal(d.rewards[0].remaining,2);assert.equal((await f.wallet()).balance,100);f.advance(600000);await assert.rejects(f.arbitrate(c,0),{code:'SO_MISSION_REWARD_AMOUNT'});
  await f.confirm('prepareContractArbitration','arbitrateContract',{contractId:c.id,payAmount:0,rewardAwards:[{itemId:rewardItems[0].itemId,quantity:1}],reason:'Une unité reconnue, une restituée au stock'});d=await f.contract(c);assert.equal((await f.get(`contracts/${c.id}`)).paymentId,paymentId);assert.equal(d.rewards[0].remaining,0);assert.equal(d.rewardPickups.reduce((n,p)=>n+p.quantity,0),2);assert.equal((await f.remaining()).quantity,3);assert.equal((await f.wallet()).balance,100);assert.equal((await f.till()).reserved,0);
 });
 test(`${prefix} : refus MJ garde les objets, arbitrage nul et annulation libèrent exactement`,async()=>{
  const f=await spaceMissionsFixture(makeStore,{rewardItems}),{c}=await f.active();await f.submit(c);await f.review(c,'REJECT');assert.equal((await f.contract(c)).rewards[0].disputed,3);f.advance(1200000);await f.confirm('prepareContractArbitration','arbitrateContract',{contractId:c.id,payAmount:0,rewardAwards:[{itemId:rewardItems[0].itemId,quantity:0}],reason:'Service non exécuté'});assert.equal((await f.remaining()).quantity,5);assert.equal((await f.wallet()).balance,0);
  const x=await f.active();await f.confirm('prepareContractClosure','closeContract',{contractId:x.c.id,decision:'CANCEL',reason:'Non commencé',notStarted:true});assert.equal((await f.remaining()).quantity,5);assert.equal((await f.till()).reserved,0);
 });
 test(`${prefix} : dernier stock concurrent, quote périmée et réserves isolées`,async()=>{
  const f=await spaceMissionsFixture(makeStore,{rewardItems}),a=await f.announce({places:2}),t=await f.apply(a),u=await f.apply(a,f.other),c=await f.offer(t,{amount:50}),d=await f.offer(u,{amount:50}),p=await f.read('prepareContractAcceptance',{contractId:c.id}),q=await f.read('prepareContractAcceptance',{contractId:d.id},f.other);
  const results=await Promise.allSettled([f.cmd('acceptContract',{contractId:c.id,confirmation:p.confirmation}),f.cmd('acceptContract',{contractId:d.id,confirmation:q.confirmation},f.other)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.remaining()).quantity,2);assert.equal((await f.till()).reserved,50);assert.equal((await f.store.list(`sessions/${f.sid}/inventory`)).filter(l=>l.status==='MISSION_RESERVED').length,1);
 });
 test(`${prefix} : interruption de réservation et règlement atomiques, réessai sans duplication`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await spaceMissionsFixture(()=>store,{rewardItems}),a=await f.announce(),t=await f.apply(a),c=await f.offer(t),q=await f.read('prepareContractAcceptance',{contractId:c.id}),input={contractId:c.id,confirmation:q.confirmation,requestId:randomUUID()};
  fail=true;await assert.rejects(f.cmd('acceptContract',input),/INTERRUPTION/);fail=false;assert.equal((await f.remaining()).quantity,5);assert.equal((await f.till()).reserved,0);await f.cmd('acceptContract',input);await f.cmd('acceptContract',input);await f.submit(c);await f.review(c);f.advance(600000);const params={contractId:c.id,reason:'Règlement'},quote=await f.read('prepareContractSettlement',params,f.owner),settle={...params,confirmation:quote.confirmation,requestId:randomUUID()};
  fail=true;await assert.rejects(f.cmd('settleContract',settle,f.owner),/INTERRUPTION/);fail=false;assert.equal((await f.contract(c)).rewardPickups.length,0);assert.equal((await f.wallet()).balance,0);await f.cmd('settleContract',settle,f.owner);await f.cmd('settleContract',settle,f.owner);assert.equal((await f.contract(c)).rewardPickups.length,1);assert.equal((await f.wallet()).balance,100);
 });
 test(`${prefix} : pause, STOP, santé et révocation interdisent la remise et le reçu`,async()=>{
  const f=await spaceMissionsFixture(makeStore,{rewardItems}),{c}=await f.validated();f.advance(600000);await f.settle(c);const input=await pickup(f,c);const character=await f.get(`characters/${f.cid}`);await f.edit(`characters/${f.cid}`,x=>({...x,hp:0,outOfCombat:true}));await assert.rejects(f.cmd('confirmContractRewardPickup',input),{code:'STALE_PICKUP'});await f.edit(`characters/${f.cid}`,()=>character);await f.stage('PAUSE');await assert.rejects(f.cmd('confirmContractRewardPickup',input),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await f.edit('',s=>({...s,safetyStop:{active:true}}));await assert.rejects(f.cmd('confirmContractRewardPickup',input),{code:'SO_SAFETY_STOP'});await f.edit('',s=>({...s,safetyStop:{active:false}}));await f.cmd('confirmContractRewardPickup',{...input,requestId:'receipt'});await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.cmd('confirmContractRewardPickup',{...input,requestId:'receipt'}),{code:'FORBIDDEN'});
 });
 test(`${prefix} : ancien marqueur conserve les contrats narratifs et refuse les extensions`,async()=>{
  const f=await spaceMissionsFixture(makeStore);await f.edit('',s=>{const {missionExecutionVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});const a=await f.announce(),t=await f.apply(a);await assert.rejects(f.offer(t,{stepEvidence}),{code:'SO_GAMEPLAY_NOT_OPEN'});const c=await f.offer(t);await f.accept(c);await f.submit(c);await f.review(c);f.advance(600000);await f.settle(c);assert.equal((await f.wallet()).balance,100);
 });
 test(`${prefix} : arrivée native, identité du manifeste et absence de fuite des codes`,async()=>{
  const mission={title:'Rejoindre le port',description:'Traversée',gmNotes:'SECRET_MJ',steps:[{id:'arrive',title:'Arriver',description:'Au port suivant'}],giverCharacterId:'merchant',requiredKnowledgeIds:[],rewardItems:[],conditions:'Après signature',proofExpected:'Arrivée'};
  const f=await soVoyagesFixture(makeStore,{prepareExtra:async(f,draftRevision)=>f.cc('saveCentralMission',{missionId:'flight',missionRevision:0,draftRevision,mission,reason:'Mission de voyage'})}),confirm=async(prep,act,input,actor=f.owner)=>{const q=await f.read(prep,input,actor);return f.cmd(act,{...input,confirmation:q.confirmation},actor);};
  const a=await confirm('prepareAnnouncement','saveAnnouncement',{missionId:'flight',revision:0,title:mission.title,description:mission.description,category:'OTHER',mode:'ASSIGNMENT',participation:'PERSONAL',sponsorKind:'NPC',sponsorName:'Comptoir',rewardType:'FIXED',rewardText:'100 Cr',places:1,conditions:mission.conditions,proofExpected:mission.proofExpected,briefing:'PRIVE',gmNotes:'SECRET',publication:'PUBLISHED',opensAt:0,deadline:8640000000000000,audience:{kind:'ALL',characterIds:[],groupIds:[]},reason:'Voyage'}),t=await confirm('prepareAnnouncementResponse','respondAnnouncement',{announcementId:a.id,intent:'APPLICATION',body:'Pilote disponible'},f.player),c=await confirm('prepareMissionContract','proposeMissionContract',{applicationId:t.id,amount:100,durationMinutes:60,funding:'ACCOUNT',sourceAccountId:shopAccountId('counter'),advance:0,guarantee:0,conditions:'Voyager',proofExpected:'Arriver',confidentiality:'Privé',failureTerms:'MJ',reason:'Transport du pilote',stepEvidence:[{stepId:'arrive',kind:'VOYAGE',routeId:'out'}]});await confirm('prepareContractAcceptance','acceptContract',{contractId:c.id},f.player);
  const proof={contractId:c.id,completedStepIds:['arrive'],body:'Arrivée'},submit=()=>confirm('prepareContractProof','submitContractProof',proof,f.player);await assert.rejects(submit(),{code:'SO_MISSION_EVIDENCE_REQUIRED'});await f.refuel(2);await f.fly();assert.doesNotMatch(JSON.stringify(await f.navigation()),/missionManifest|OUT-SECRET|AWAY-CODE|version/);await assert.rejects(submit(),{code:'SO_MISSION_EVIDENCE_REQUIRED'});f.advance(300000);await f.cmd('arriveShip',{shipId:'ship',confirmation:(await f.navigation()).confirmation});await submit();const d=await f.read('contractDetail',{contractId:c.id});assert.equal(d.contract.proof.evidence[0].kind,'VOYAGE');assert.doesNotMatch(JSON.stringify(d.contract.proof),/manifest|SECRET|shipId|pilotId/);
 });
}

// Exercise the public counter route with actual contract reserves and awards.
async function settledCounter(makeStore){
 const f=await spaceMissionsFixture(makeStore,{rewardItems}),{c}=await f.validated();f.advance(600000);await f.settle(c);return {f,c};
}
const counter=(f,actor=f.player,shopId='counter')=>f.read(actor===f.owner?'shopAdmin':'shop',actor===f.owner?{}:{shopId},actor);
const rewardInput=p=>({contractId:p.contractId,pickupId:p.id,confirmation:p.confirmation});
async function presentCounter(f,c){
 const p=(await counter(f,f.owner)).missionRewards.find(p=>p.contractId===c.id&&p.pickupStatus!=='RECEIVED');
 await f.cmd('offerContractRewardPickup',{...rewardInput(p),present:true},f.owner);
 return (await counter(f)).missionRewards.find(row=>row.id===p.id);
}
function missionCounterSuite(makeStore,prefix){
 test(`${prefix} : comptoir QR privé, lecture sans effet et aucun retrait avant attribution`,async()=>{
  const f=await spaceMissionsFixture(makeStore,{rewardItems}),{c}=await f.active();assert.deepEqual((await counter(f)).missionRewards,[]);await f.submit(c);await f.review(c);assert.deepEqual((await counter(f)).missionRewards,[]);f.advance(600000);await f.settle(c);
  const before={contract:await f.get(`contracts/${c.id}`),wallet:await f.wallet(),till:await f.till(),lots:await f.store.list(`sessions/${f.sid}/inventory`)},d=await counter(f),p=d.missionRewards[0];
  assert.equal(p.contractId,c.id);assert.equal(p.quantity,3);assert.equal(p.pickupStatus,'WAITING');assert.equal(p.canReceive,false);assert.equal(p.canOffer,false);assert.equal('recipientName' in p,false);
  assert.doesNotMatch(JSON.stringify(p),/SECRET_|gmNotes|briefing|applicantUid|Version|sourceAccount|proof|buyerId/);assert.deepEqual((await counter(f,f.other)).missionRewards,[]);
  assert.deepEqual({contract:await f.get(`contracts/${c.id}`),wallet:await f.wallet(),till:await f.till(),lots:await f.store.list(`sessions/${f.sid}/inventory`)},before);
  const admin=(await counter(f,f.owner)).missionRewards[0];assert.ok(admin.recipientName);assert.equal(admin.canOffer,true);assert.equal(admin.canReceive,false);
  await f.edit('shops/other-counter',()=>({...d.shops[0],id:'other-counter',versionId:(before.contract.missionVersionId)}));
  assert.deepEqual((await counter(f,f.player,'other-counter')).missionRewards,[]);await assert.rejects(counter(f,f.player,'absent'),{code:'NOT_FOUND'});
 });
 test(`${prefix} : remise depuis le comptoir et le contrat partagent un seul lot et un seul reçu`,async()=>{
  const {f,c}=await settledCounter(makeStore),p=await presentCounter(f,c),detail=(await f.contract(c)).rewardPickups[0],wallet=await f.wallet(),till=await f.till(),ledger=await f.store.list(`sessions/${f.sid}/ledger`);
  assert.equal(p.confirmation,detail.confirmation);assert.equal(p.canReceive,true);await assert.rejects(f.cmd('confirmContractRewardPickup',{...rewardInput(p),received:true},f.other),{code:'FORBIDDEN'});
  const input={...rewardInput(p),received:true,requestId:randomUUID()},done=await f.cmd('confirmContractRewardPickup',input);assert.deepEqual(await f.cmd('confirmContractRewardPickup',input),done);
  const received=(await counter(f)).missionRewards[0];assert.equal(received.pickupStatus,'RECEIVED');assert.equal(received.canReceive,false);assert.equal(received.blockedReason,null);assert.equal((await f.get(`inventory/${p.id}`)).location.id,f.cid);
  assert.deepEqual(await f.wallet(),wallet);assert.deepEqual(await f.till(),till);assert.deepEqual(await f.store.list(`sessions/${f.sid}/ledger`),ledger);assert.equal((await f.store.list(`sessions/${f.sid}/inventory/${p.id}/history`)).filter(x=>x.kind==='PICKUP').length,1);
 });
 test(`${prefix} : présentation puis réception concurrentes ne déplacent le lot qu’une fois`,async()=>{
  const {f,c}=await settledCounter(makeStore),p=(await counter(f,f.owner)).missionRewards[0],offer={...rewardInput(p),present:true};
  let results=await Promise.allSettled([f.cmd('offerContractRewardPickup',offer,f.owner),f.cmd('offerContractRewardPickup',offer,f.owner)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const ready=(await counter(f)).missionRewards[0],receive={...rewardInput(ready),received:true};results=await Promise.allSettled([f.cmd('confirmContractRewardPickup',receive),f.cmd('confirmContractRewardPickup',receive)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await f.get(`inventory/${ready.id}`)).quantity,3);assert.equal((await f.store.list(`sessions/${f.sid}/inventory/${ready.id}/history`)).filter(x=>x.kind==='PICKUP').length,1);assert.equal((await f.contract(c)).rewardPickups[0].pickupStatus,'RECEIVED');
 });
 test(`${prefix} : présentation périmée visible, nouvelle présentation requise après changement du lot`,async()=>{
  const {f,c}=await settledCounter(makeStore),p=await presentCounter(f,c);await f.edit(`inventory/${p.id}`,l=>({...l,revision:l.revision+1}));
  const d=(await counter(f)).missionRewards[0];assert.equal(d.pickupStatus,'STALE');assert.equal(d.canReceive,false);assert.equal((await counter(f,f.owner)).missionRewards[0].canOffer,true);
  await assert.rejects(f.cmd('confirmContractRewardPickup',{...rewardInput(p),received:true}),{code:'STALE_PICKUP'});const fresh=await presentCounter(f,c);await f.cmd('confirmContractRewardPickup',{...rewardInput(fresh),received:true});assert.equal((await f.get(`inventory/${p.id}`)).holderId,f.cid);
 });
 test(`${prefix} : champs injectés, mauvais titulaire et absence de consentement refusés au retrait`,async()=>{
  const {f,c}=await settledCounter(makeStore),p=(await counter(f,f.owner)).missionRewards[0];await assert.rejects(f.cmd('offerContractRewardPickup',{...rewardInput(p),present:true}),{code:'FORBIDDEN'});
  await assert.rejects(f.cmd('offerContractRewardPickup',{...rewardInput(p),present:false},f.owner),{code:'STALE_PICKUP'});const ready=await presentCounter(f,c);
  for(const patch of [{received:false},{received:true,quantity:99},{received:true,shopId:'elsewhere'},{received:true,recipientId:f.otherId}])await assert.rejects(f.cmd('confirmContractRewardPickup',{...rewardInput(ready),...patch}));
  assert.equal((await f.get(`inventory/${ready.id}`)).holderId,'counter');assert.equal((await f.wallet()).balance,100);
 });
 test(`${prefix} : pause, STOP, éloignement et décès ferment les boutons et la remise réelle`,async()=>{
  const {f,c}=await settledCounter(makeStore),p=await presentCounter(f,c),input={...rewardInput(p),received:true};await f.stage('PAUSE');assert.equal((await counter(f)).missionRewards[0].blockedReason,'SESSION_NOT_RUNNING');await assert.rejects(f.cmd('confirmContractRewardPickup',input),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');
  await f.edit('',s=>({...s,safetyStop:{active:true}}));assert.equal((await counter(f)).missionRewards[0].blockedReason,'SAFETY_STOP');await assert.rejects(f.cmd('confirmContractRewardPickup',input),{code:'SO_SAFETY_STOP'});await f.edit('',s=>({...s,safetyStop:{active:false}}));
  await f.edit(`characters/${f.cid}`,x=>({...x,activeVoyageId:'in-flight'}));assert.equal((await counter(f)).missionRewards[0].blockedReason,'CHARACTER_UNAVAILABLE');await assert.rejects(f.cmd('confirmContractRewardPickup',input),{code:'STALE_PICKUP'});
  await f.edit(`characters/${f.cid}`,x=>({...x,activeVoyageId:null,survival:{dead:true}}));assert.equal((await counter(f)).missionRewards[0].blockedReason,'CHARACTER_DEAD');assert.equal((await counter(f,f.owner)).missionRewards[0].canOffer,false);await assert.rejects(f.cmd('confirmContractRewardPickup',input),{code:'STALE_PICKUP'});assert.equal((await f.get(`inventory/${p.id}`)).holderId,'counter');
 });
 test(`${prefix} : révocation et nouvelle version d’identité ne réutilisent pas une remise`,async()=>{
  const {f,c}=await settledCounter(makeStore),p=await presentCounter(f,c);await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(counter(f),{code:'FORBIDDEN'});assert.equal((await counter(f,f.owner)).missionRewards[0].blockedReason,'ACCESS_CHANGED');
  await assert.rejects(f.cmd('confirmContractRewardPickup',{...rewardInput(p),received:true}),{code:'FORBIDDEN'});assert.equal((await f.get(`inventory/${p.id}`)).holderId,'counter');
  const g=await settledCounter(makeStore),r=await presentCounter(g.f,g.c);await g.f.edit(`contracts/${g.c.id}`,x=>({...x,applicantVersion:'old-incarnation'}));assert.deepEqual((await counter(g.f)).missionRewards,[]);assert.equal((await counter(g.f,g.f.owner)).missionRewards[0].blockedReason,'ACCESS_CHANGED');await assert.rejects(g.f.cmd('confirmContractRewardPickup',{...rewardInput(r),received:true}),{code:'FORBIDDEN'});
 });
 test(`${prefix} : part matérielle litigieuse absente du comptoir jusqu’à son attribution`,async()=>{
  const f=await spaceMissionsFixture(makeStore,{rewardItems}),{c}=await f.validated();await f.confirm('prepareContractDispute','disputeContract',{contractId:c.id,amount:0,rewardDisputes:[{itemId:rewardItems[0].itemId,quantity:2}],reason:'Quantité contestée'},f.player);f.advance(600000);await f.settle(c);
  let d=await counter(f);assert.equal(d.missionRewards.length,1);assert.equal(d.missionRewards[0].quantity,1);const p=await presentCounter(f,c);await f.cmd('confirmContractRewardPickup',{...rewardInput(p),received:true});f.advance(600000);
  await f.confirm('prepareContractArbitration','arbitrateContract',{contractId:c.id,payAmount:0,rewardAwards:[{itemId:rewardItems[0].itemId,quantity:1}],reason:'Une unité reconnue'});d=await counter(f);assert.equal(d.missionRewards.length,2);assert.equal(d.missionRewards[0].pickupStatus,'WAITING');assert.equal(d.missionRewards[1].pickupStatus,'RECEIVED');assert.equal(d.missionRewards.reduce((n,p)=>n+p.quantity,0),2);assert.equal((await f.remaining()).quantity,3);
 });
 test(`${prefix} : lot substitué ou déplacé ne peut pas être remis depuis un ancien QR`,async()=>{
  const {f,c}=await settledCounter(makeStore),p=await presentCounter(f,c),original=await f.get(`inventory/${p.id}`);
  for(const patch of [{item:{...original.item,id:'another-item'}},{quantity:original.quantity+1},{holderId:f.otherId},{location:{kind:'CHARACTER',id:f.cid}}]){
   await f.edit(`inventory/${p.id}`,()=>({...original,...patch}));const row=(await counter(f)).missionRewards[0];assert.equal(row.blockedReason,'CUSTODY_CHANGED');assert.equal(row.canReceive,false);assert.equal((await counter(f,f.owner)).missionRewards[0].canOffer,false);await assert.rejects(f.cmd('confirmContractRewardPickup',{...rewardInput(p),received:true}),{code:'STALE_PICKUP'});
  }
  await f.edit(`inventory/${p.id}`,()=>original);assert.equal((await counter(f)).missionRewards[0].canReceive,true);
 });
 test(`${prefix} : ancien manifeste sans exécution ne reçoit ni projection ni nouvelle remise`,async()=>{
  const {f,c}=await settledCounter(makeStore),p=await presentCounter(f,c);await f.edit('',s=>{const {missionExecutionVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});assert.equal((await counter(f)).missionRewards,undefined);assert.equal((await counter(f,f.owner)).missionRewards,undefined);await assert.rejects(f.cmd('confirmContractRewardPickup',{...rewardInput(p),received:true}),{code:'SESSION_NOT_RUNNING'});assert.equal((await f.get(`inventory/${p.id}`)).holderId,'counter');
 });
 test(`${prefix} : reprise du retrait au nouveau QR sans copie de prime, stock ou paiement`,async()=>{
  const {episodeHarness}=await import('./space-episodes-suite.mjs'),{f,c}=await settledCounter(makeStore),p=await presentCounter(f,c),e=await episodeHarness(f);await e.close();await e.resume(await e.begin());
  await assert.rejects(counter(f),{code:'FORBIDDEN'});let d=await e.read('shop',{shopId:'counter'},f.player);assert.equal(d.missionRewards[0].blockedReason,'SESSION_NOT_RUNNING');assert.equal(d.missionRewards[0].id,p.id);await e.stage('EN_JEU');
  d=await e.read('shop',{shopId:'counter'},f.player);assert.equal(d.missionRewards[0].canReceive,true);assert.notEqual(d.missionRewards[0].confirmation,p.confirmation);await assert.rejects(e.cmd('confirmContractRewardPickup',{...rewardInput(p),received:true},f.player),{code:'STALE_PICKUP'});
  const wallet=await e.read('myWallet',{},f.player),r=d.missionRewards[0];await e.cmd('confirmContractRewardPickup',{...rewardInput(r),received:true},f.player);assert.deepEqual(await e.read('myWallet',{},f.player),wallet);assert.equal((await e.get(`inventory/${p.id}`)).holderId,f.cid);assert.equal((await e.read('shop',{shopId:'counter'},f.player)).missionRewards[0].pickupStatus,'RECEIVED');
 });
 test(`${prefix} : interruption du retrait atomique puis réessai sans doublon`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const result=await cb(tx);if(fail)throw Error('PICKUP_INTERRUPTED');return result;})};
  const {f,c}=await settledCounter(()=>store),p=await presentCounter(f,c),input={...rewardInput(p),received:true,requestId:randomUUID()};fail=true;await assert.rejects(f.cmd('confirmContractRewardPickup',input),/PICKUP_INTERRUPTED/);fail=false;
  assert.equal((await f.get(`inventory/${p.id}`)).holderId,'counter');assert.equal((await counter(f)).missionRewards[0].pickupStatus,'READY');const result=await f.cmd('confirmContractRewardPickup',input);assert.deepEqual(await f.cmd('confirmContractRewardPickup',input),result);assert.equal((await f.store.list(`sessions/${f.sid}/inventory/${p.id}/history`)).filter(x=>x.kind==='PICKUP').length,1);
 });

 test(`${prefix} : obligations conservent les retraits d’un salaire déjà payé`,async()=>{
  const {f,c}=await settledCounter(makeStore),row=async()=>(await f.read('sessionContracts',{},f.owner)).contracts.find(x=>x.id===c.id),before=[await f.wallet(),await f.till(),await f.get(`contracts/${c.id}`)];let r=await row();assert.equal(r.status,'PAID');assert.equal(r.obligations.pending,true);assert.deepEqual(r.obligations.tasks,[{kind:'MATERIALS'}]);assert.equal(r.obligations.pickups.length,1);assert.equal(r.obligations.pickups[0].quantity,3);assert.equal(r.obligations.salaryReserved,0);assert.equal(r.obligations.salaryPaid,100);assert.deepEqual([await f.wallet(),await f.till(),await f.get(`contracts/${c.id}`)],before);
  const p=await presentCounter(f,c);assert.equal((await row()).obligations.pending,true);await f.cmd('confirmContractRewardPickup',{...rewardInput(p),received:true});r=await row();assert.equal(r.obligations.pending,false);assert.deepEqual(r.obligations.pickups,[]);assert.equal((await f.wallet()).balance,before[0].balance);
 });
 test(`${prefix} : obligations d’un litige matériel restent visibles sans réserve salariale`,async()=>{
  const f=await spaceMissionsFixture(makeStore,{rewardItems}),{c}=await f.validated();await f.confirm('prepareContractDispute','disputeContract',{contractId:c.id,amount:0,rewardDisputes:[{itemId:rewardItems[0].itemId,quantity:2}],reason:'Deux objets contestés'},f.player);f.advance(600000);await f.settle(c);const o=(await f.read('sessionContracts',{},f.owner)).contracts.find(x=>x.id===c.id).obligations;assert.equal(o.reserved,0);assert.equal(o.salaryPaid,100);assert.equal(o.rewards[0].remaining,2);assert.equal(o.rewards[0].disputed,2);assert.equal(o.pickups[0].quantity,1);assert.deepEqual(o.tasks.map(t=>t.kind),['MEDIATION','MATERIALS']);assert.equal((await f.till()).reserved,0);
 });

}
