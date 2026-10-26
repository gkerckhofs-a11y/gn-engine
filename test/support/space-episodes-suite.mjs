import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {spaceMissionsFixture} from './space-missions-suite.mjs';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {encountersFixture} from './space-encounters-suite.mjs';
import {missionExecutionFixture} from './mission-execution-suite.mjs';
import {staffPath} from '../../src/core/staff.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
const sorted=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id));
const hash=v=>createHash('sha256').update(v).digest('hex');

export async function episodeHarness(f){
 let sid=f.sid;const firstSid=sid,campaignId=(await f.store.get(`sessions/${sid}`)).campaignId;
 const read=(a,p={},actor=f.owner)=>f.actionRead(a,{...p,sessionId:sid},actor),cmd=(a,p={},actor=f.owner)=>read(a,{requestId:randomUUID(),...p},actor);
 const get=p=>f.store.get(`sessions/${sid}${p?'/'+p:''}`),stage=async stage=>cmd('setStage',{stage,revision:(await get('')).revision});
 const closeInput=(p={})=>({reason:'Fin de partie validée par la régie',participantUids:[f.player.uid,f.other.uid],...p});
 const close=async(p={})=>{if((await get('')).stage==='EN_JEU')await stage('PAUSE');const input=closeInput(p),q=await read('prepareCampaignClosure',input);assert.equal(q.canClose,true,JSON.stringify(q.blocks));return cmd('closeCampaignSession',{...input,confirmation:q.confirmation});};
 const nextInput=(p={})=>({campaignId,title:'SPACE OUTLAWS · épisode suivant',capacity:20,privacy:'Données du jeu conservées pour la campagne',healthPolicy:'PRESERVE',reason:'Reprendre les acquis validés',fields:[],...p});
 const begin=async(p={})=>{const input=nextInput(p),q=await read('prepareCampaignEpisode',input);return cmd('beginCampaignEpisode',{...input,confirmation:q.confirmation});};
 const resume=async b=>{let result=b;while(result.status!=='READY')result=await cmd('advanceCampaignEpisode',{campaignId,buildId:b.buildId});sid=result.id;return result;};
 return {f,firstSid,campaignId,get,read,cmd,stage,closeInput,close,nextInput,begin,resume,get sid(){return sid;}};
}
export function spaceEpisodesSuite(makeStore,prefix='Épisodes SO'){
 test(`${prefix} : clôture, copie reprenable et mêmes identités, biens, PV et droits`,async()=>{
  const f=await spaceMissionsFixture(makeStore),e=await episodeHarness(f);await f.edit(`characters/${f.cid}`,c=>({...c,hp:2,convalescentUntilGameMs:9999999}));
  const r=await e.get(`registrations/${hash(f.player.uid)}`),lots=await f.store.list(`sessions/${e.sid}/inventory`),wallet=await f.wallet();await e.close();
  assert.equal((await e.get(`characters/${f.cid}`)).xp,3);assert.equal((await e.get('')).campaignSealed,true);await assert.rejects(e.stage('EN_JEU'),{code:'INVALID_TRANSITION'});
  const b=await e.begin();assert.ok(b.pages>1);await e.cmd('advanceCampaignEpisode',{campaignId:e.campaignId,buildId:b.buildId});assert.equal(await f.store.get(`sessions/${b.id}`),null);
  const input={campaignId:e.campaignId,buildId:b.buildId,requestId:randomUUID()},once=await e.cmd('advanceCampaignEpisode',input);assert.deepEqual(await e.cmd('advanceCampaignEpisode',input),once);
  f.advance(30*86400000);await e.resume(b);const s=await e.get(''),next=await e.get(`characters/${f.cid}`),nr=await e.get(`registrations/${r.id}`),nw=await e.get(`accounts/${accountId(f.cid)}`);
  assert.equal(s.campaignEpisode,2);assert.equal(s.stage,'BRIEFING');assert.equal(next.assignedUid,f.player.uid);assert.equal(nr.accessVersion,r.accessVersion);assert.equal(next.hp,2);assert.equal(next.convalescentUntilGameMs,0);assert.equal(next.xp,3);
  assert.equal(nw.balance,wallet.balance+wallet.protectedCredits);assert.equal(nw.protectedCredits,0);assert.deepEqual(sorted(await f.store.list(`sessions/${e.sid}/inventory`)),sorted(lots));
  const me=await e.read('mySession',{},f.player);assert.equal(me.character.id,f.cid);assert.equal(me.actionPoints.available,5);await e.stage('EN_JEU');assert.ok((await e.get('')).vitalClock.runningSince);
  assert.equal((await e.read('spaceOutlawsEntry')).campaignEpisode,2);await assert.rejects(e.read('previewSpaceOutlawsBirth',{uid:f.player.uid,options:{weaponApplicable:true,startingInformation:''}}),{code:'SO_ENTRY_CLOSED'});
 });
 test(`${prefix} : contrat, réserves matérielles, preuve et délai traversent la clôture`,async()=>{
  const f=await spaceMissionsFixture(makeStore,{rewardItems:[{itemId:'kit_medical-supplies',quantity:3}]}),e=await episodeHarness(f),{c}=await f.active();f.advance(60000);await f.submit(c);await f.review(c);await f.dispute(c,40);f.advance(120000);
  const contract=await e.get(`contracts/${c.id}`),till=await f.till();await e.close();const source=e.sid;f.advance(7*86400000);await e.resume(await e.begin());assert.deepEqual(await e.get(`contracts/${c.id}`),contract);
  assert.equal((await e.get(`accounts/${till.id}`)).reserved,100);assert.deepEqual(sorted(await f.store.list(`sessions/${e.sid}/contracts/${c.id}/history`)),sorted(await f.store.list(`sessions/${source}/contracts/${c.id}/history`)));
  const d=await e.read('contractDetail',{contractId:c.id},f.player);assert.equal(d.settlement.contestRemainingMs,480000);await e.stage('EN_JEU');f.advance(480000);const p={contractId:c.id,reason:'Part libre'},q=await e.read('prepareContractSettlement',p);await e.cmd('settleContract',{...p,confirmation:q.confirmation});assert.equal((await e.get(`accounts/${accountId(f.cid)}`)).balance,110);assert.equal((await e.read('contractDetail',{contractId:c.id},f.player)).rewardPickups[0].quantity,3);
 });
 test(`${prefix} : voyage conserve carburant, événement, manifeste et temps restant`,async()=>{
  const f=await soVoyagesFixture(makeStore),e=await episodeHarness(f);await f.refuel(2);await f.fly();f.advance(60000);const ship=await f.ship();await e.close();await e.resume(await e.begin());assert.deepEqual(await e.get('ships/ship'),ship);
  assert.equal((await e.read('shipNavigation',{shipId:'ship'},f.player)).ship.journey.remainingSeconds,240);f.advance(86400000);await e.stage('EN_JEU');f.advance(240000);const q=await e.read('shipNavigation',{shipId:'ship'},f.player);await e.cmd('arriveShip',{shipId:'ship',confirmation:q.confirmation},f.player);assert.equal((await e.get('ships/ship')).portId,'away');
 });
 test(`${prefix} : round et PA PIL-03 réservés repris sans révéler les ordres`,async()=>{
  const f=await encountersFixture(makeStore),e=await episodeHarness(f);await f.begin();await f.submit('PIL03_2');f.advance(30000);await e.close();const combat=await e.get(`spaceCombats/${f.combatId()}`);await e.resume(await e.begin());assert.deepEqual(await e.get(`spaceCombats/${f.combatId()}`),combat);
  const me=await e.read('mySession',{},f.player);assert.equal(me.actionPoints.reserved,1);assert.equal(me.actionPoints.available,4);const d=(await e.read('spaceCombat',{combatId:f.combatId()},f.other)).combat;assert.equal(d.remainingSeconds,60);assert.equal(d.ownOrder,null);
  await e.stage('EN_JEU');f.advance(60000);const admin=(await e.read('spaceCombatAdmin')).combats.find(x=>x.id===f.combatId());await e.cmd('resolveSpaceRoundAdmin',{combatId:f.combatId(),confirmation:admin.confirmation});assert.equal((await e.read('mySession',{},f.player)).actionPoints.reserved,0);
 });
 test(`${prefix} : participants explicites, XP uniques et niveau joueur à la cinquième`,async()=>{
  const f=await spaceMissionsFixture(makeStore),e=await episodeHarness(f);for(let n=0;n<4;n++){await e.close({participantUids:[f.player.uid]});await e.resume(await e.begin());if(n<3)await e.stage('EN_JEU');}
  const c=await e.get(`characters/${f.cid}`),other=await e.get(`characters/${f.otherId}`);assert.equal(c.xp,12);assert.equal(c.earnedXp,12);assert.equal(c.globalLevel,2);assert.equal(other.xp,0);assert.equal(other.globalLevel,1);assert.equal((await e.read('mySession',{},f.player)).actionPoints.available,8);assert.equal((await e.get(`registrations/${hash(f.player.uid)}`)).progression.completedSessions,4);
  assert.equal((await e.get(`accounts/${accountId(f.cid)}`)).balance,50);assert.equal((await f.store.list(`sessions/${e.sid}/ledger`)).filter(x=>x.kind==='SO_PROTECTION_EXPIRED'&&x.entries[0].characterId===f.cid).length,1);
 });
 test(`${prefix} : survie, action continue, STOP et ancien manifeste bloquent sans perte`,async()=>{
  const f=await spaceMissionsFixture(makeStore),e=await episodeHarness(f),a=await f.start();await e.stage('PAUSE');let p=await e.read('prepareCampaignClosure',e.closeInput());assert.equal(p.canClose,false);assert.ok(p.blocks.some(x=>x.kind==='FIELD_ACTION'));
  await assert.rejects(e.cmd('closeCampaignSession',{...e.closeInput(),confirmation:p.confirmation}),{code:'CAMPAIGN_UNRESOLVED'});await f.actionCmd('cancelFieldAction',{actionId:a.id,reason:'Fin de partie'});
  await f.edit(`characters/${f.cid}`,c=>({...c,hp:0,survival:{deadline:999999999}}));p=await e.read('prepareCampaignClosure',e.closeInput());assert.ok(p.blocks.some(x=>x.kind==='SURVIVAL'));await f.edit('',s=>({...s,safetyStop:{active:true}}));await assert.rejects(e.read('prepareCampaignClosure',e.closeInput()),{code:'SO_SAFETY_STOP'});
  await f.edit('',s=>{const {episodesVersion,...old}=s.spaceOutlaws;return {...s,safetyStop:{active:false},spaceOutlaws:old};});await assert.rejects(e.read('prepareCampaignClosure',e.closeInput()),{code:'SO_GAMEPLAY_NOT_OPEN'});assert.equal((await e.get('')).campaignSealed,false);
 });
 test(`${prefix} : aperçu périmé et clôtures concurrentes ne dupliquent pas les XP`,async()=>{
  const f=await spaceMissionsFixture(makeStore),e=await episodeHarness(f);await e.stage('PAUSE');await assert.rejects(e.read('prepareCampaignClosure',{reason:'Sans liste'}),{code:'SO_PARTICIPANTS_REQUIRED'});await assert.rejects(e.read('prepareCampaignClosure',e.closeInput({participantUids:['unknown']})),{code:'SO_PARTICIPANTS_REQUIRED'});
  let p=await e.read('prepareCampaignClosure',e.closeInput());await f.edit(`accounts/${accountId(f.cid)}`,a=>({...a,balance:1,revision:a.revision+1}));await assert.rejects(e.cmd('closeCampaignSession',{...e.closeInput(),confirmation:p.confirmation}),{code:'STALE_REVISION'});p=await e.read('prepareCampaignClosure',e.closeInput());const results=await Promise.allSettled([1,2].map(()=>e.cmd('closeCampaignSession',{...e.closeInput(),confirmation:p.confirmation})));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await e.get(`characters/${f.cid}`)).xp,3);
  await assert.rejects(e.begin({healthPolicy:'RESTORE'}),{code:'SO_EPISODE_PRESERVE_REQUIRED'});await assert.rejects(e.read('prepareCampaignEpisode',e.nextInput(),f.player),{code:'FORBIDDEN'});
 });
 test(`${prefix} : preuve native et retrait réel après reprise, historique financier intact`,async()=>{
  const f=await missionExecutionFixture(makeStore),e=await episodeHarness(f),{c}=await f.active(),duration=(await f.prepareAction()).durationSeconds,a=await f.start();f.advance(duration*1000);await f.finish(a);await e.close();await e.resume(await e.begin());await e.stage('EN_JEU');
  const confirm=async(prep,action,p,actor=f.owner)=>{const q=await e.read(prep,p,actor);return e.cmd(action,{...p,confirmation:q.confirmation},actor);};
  await confirm('prepareContractProof','submitContractProof',{contractId:c.id,completedStepIds:['meet','report'],body:'Analyse de l’épisode précédent'},f.player);assert.equal((await e.read('contractDetail',{contractId:c.id},f.player)).contract.proof.evidence[0].recordId,a.id);
  await confirm('prepareContractReview','reviewContract',{contractId:c.id,decision:'PAY',reason:'Vérifié'});f.advance(600000);await confirm('prepareContractSettlement','settleContract',{contractId:c.id,reason:'Part libre'});const payment=(await e.get(`contracts/${c.id}`)).paymentId;await e.close();await e.resume(await e.begin());await e.stage('EN_JEU');
  let p=(await e.read('sessionContract',{contractId:c.id})).rewardPickups[0];await e.cmd('offerContractRewardPickup',{contractId:c.id,pickupId:p.id,confirmation:p.confirmation,present:true});p=(await e.read('contractDetail',{contractId:c.id},f.player)).rewardPickups[0];await e.cmd('confirmContractRewardPickup',{contractId:c.id,pickupId:p.id,confirmation:p.confirmation,received:true},f.player);
  assert.equal((await e.get(`inventory/${p.id}`)).location.id,f.cid);assert.equal((await e.get(`ledger/${payment}`)).contractId,c.id);assert.equal((await e.get(`accounts/${accountId(f.cid)}`)).balance,150);
 });
 test(`${prefix} : recours admis jusqu’à la fin de l’épisode suivant, décision conservée`,async()=>{
  const f=await spaceMissionsFixture(makeStore),e=await episodeHarness(f),{c}=await f.validated();f.advance(600000);await f.settle(c);assert.equal((await e.get(`contracts/${c.id}`)).settledEpisode,1);await e.close();await e.resume(await e.begin());assert.equal((await e.read('contractDetail',{contractId:c.id},f.player)).canAppeal,false);await e.stage('EN_JEU');
  const input={contractId:c.id,reason:'Erreur matérielle',newEvidence:'Pièce retrouvée'},q=await e.read('prepareContractAppeal',input,f.player);await e.cmd('appealContract',{...input,confirmation:q.confirmation},f.player);await e.close();await e.resume(await e.begin());await e.stage('EN_JEU');assert.equal((await e.read('contractDetail',{contractId:c.id},f.player)).canAppeal,false);
  await assert.rejects(e.read('prepareContractAppeal',input,f.player),{code:'SO_APPEAL_CLOSED'});const decision={contractId:c.id,reason:'Preuve examinée',outcome:'FOLLOW_UP'},p=await e.read('prepareContractAppealDecision',decision);await e.cmd('decideContractAppeal',{...decision,confirmation:p.confirmation});assert.equal((await e.get(`contracts/${c.id}`)).appeal.status,'FOLLOW_UP');
 });
 test(`${prefix} : interruption de clôture et copie, reprise exacte et lien joueur révocable`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})};
  const f=await spaceMissionsFixture(()=>store),e=await episodeHarness(f);await e.stage('PAUSE');const p=await e.read('prepareCampaignClosure',e.closeInput()),input={...e.closeInput(),confirmation:p.confirmation,requestId:randomUUID()};fail=true;await assert.rejects(e.cmd('closeCampaignSession',input),/INTERRUPTION/);fail=false;assert.equal((await e.get(`characters/${f.cid}`)).xp,0);await e.cmd('closeCampaignSession',input);await e.cmd('closeCampaignSession',input);assert.equal((await e.get(`characters/${f.cid}`)).xp,3);
  assert.equal((await e.read('mySession',{},f.player)).continuation,null);const b=await e.begin();fail=true;await assert.rejects(e.cmd('advanceCampaignEpisode',{campaignId:e.campaignId,buildId:b.buildId}),/INTERRUPTION/);fail=false;assert.equal((await store.get(`campaignBuilds/${b.buildId}`)).cursor,0);await e.resume(b);
  assert.equal((await f.actionRead('mySession',{},f.player)).continuation.id,e.sid);await e.cmd('revokeAccess',{uid:f.player.uid});assert.equal((await f.actionRead('mySession',{},f.player)).continuation,null);assert.equal((await e.read('mySession',{},f.player)).character,null);assert.equal((await e.get(`accounts/${accountId(f.cid)}`)).balance,50);
 });
 test(`${prefix} : droits MJ courants, absence de fuite et XP en attente sans personnage actif`,async()=>{
  const f=await spaceMissionsFixture(makeStore),e=await episodeHarness(f),mj={...f.other,uid:randomUUID(),email:`mj-${randomUUID()}@example.invalid`};
  await e.cmd('setStaff',{revision:(await e.get('')).revision,email:mj.email,role:'MJ',active:true,reason:'Régie'});await f.edit(`characters/${f.cid}`,c=>({...c,survival:{dead:true},hp:0}));await e.stage('PAUSE');const input=e.closeInput(),p=await e.read('prepareCampaignClosure',input,mj),command={...input,confirmation:p.confirmation,requestId:randomUUID()};await e.cmd('closeCampaignSession',command,mj);
  assert.equal((await e.get(`registrations/${hash(f.player.uid)}`)).progression.pendingXp,3);assert.equal((await e.get(`characters/${f.cid}`)).xp,0);await e.cmd('setStaff',{revision:(await e.get('')).revision,email:mj.email,role:'MJ',active:false,reason:'Fin de mandat'});await assert.rejects(e.cmd('closeCampaignSession',command,mj),{code:'FORBIDDEN'});
  await e.resume(await e.begin());assert.equal((await f.store.get(staffPath(e.sid,mj.email))).active,false);await assert.rejects(e.read('session',{},mj),{code:'FORBIDDEN'});assert.equal((await e.get(`accounts/${accountId(f.cid)}`)).balance,0);assert.equal((await e.get(`accounts/${accountId(f.cid)}`)).protectedCredits,0);
 });
}
