import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {targetedAmbushFixture} from './space-targeted-ambushes-suite.mjs';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {inventoryHash as hash} from '../../src/core/inventory-state.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {order} from './space-encounters-suite.mjs';

export async function pirateAllianceFixture(makeStore,{declare=true}={}){
 const f=await targetedAmbushFixture(makeStore),support=await f.competitor(),leader=await f.arm();let combatId;
 // The competitor is an explicit synthetic authenticated participant/ship, as
 // in the convoy fixture. Give this participant its native test wallet too.
 const wallet=await f.wallet();await f.store.runTransaction(async tx=>{const ship=await tx.get(`${f.base}/ships/${support.shipId}`),c=await tx.get(`${f.base}/characters/${support.cid}`),r=await tx.get(`${f.base}/registrations/${hash(support.actor.uid)}`),version=hash(JSON.stringify([c.id,c.assignedUid,r.accessVersion,c.public.displayName]));tx.set(`${f.base}/characters/${c.id}`,{...c,activeVoyageId:ship.journey.id});tx.set(`${f.base}/ships/${ship.id}`,{...ship,journey:{...ship.journey,pilotId:c.id,manifest:[{id:c.id,name:c.public.displayName}],missionManifest:[{id:c.id,version}]}});tx.set(`${f.base}/accounts/${accountId(support.cid)}`,{...wallet,id:accountId(support.cid),characterId:support.cid,ownerId:support.cid});});
 const view=async(actor=f.pirate)=>(await f.read(actor===f.owner?'spaceCombatAdmin':'spaceCombats',{},actor)).pirateAlliances;
 const input={shipId:'second',supportShipId:support.shipId},propose=async()=>{const q=await f.read('preparePirateAlliance',input);return f.cmd('proposePirateAlliance',{...input,confirmation:q.confirmation});};
 const acceptInput=async()=>({shipId:support.shipId,leaderShipId:'second',confirmation:(await view(support.actor)).ships.find(s=>s.id===support.shipId).incoming[0].confirmation});
 const accept=async()=>f.cmd('acceptPirateAlliance',await acceptInput(),support.actor);
 const leave=async(actor=f.pirate,shipId='second')=>{const s=(await view(actor)).ships.find(s=>s.id===shipId);return f.cmd(actor===f.owner?'leavePirateAllianceAdmin':'leavePirateAlliance',{shipId,confirmation:s.confirmation,reason:'Dissolution consentie'},actor);};
 const trigger=async()=>{const r=await f.trigger();combatId=r.id;return r;},detail=async(actor=f.pirate)=>(await f.read(actor===f.owner?'spaceCombatAdmin':'spaceCombat',actor===f.owner?{}:{combatId},actor))[actor===f.owner?'combats':'combat'];
 const command=async(action,patch={},actor=f.pirate)=>{const d=actor===f.owner?(await detail(actor)).find(c=>c.id===combatId):await detail(actor);return f.cmd(action,{combatId,confirmation:d.confirmation,...(actor===f.owner?{}:{shipId:d.ownShipId}),...patch},actor);};
 const submit=(kind,actor=f.pirate,patch={})=>command('submitSpaceOrder',{order:order(kind,{targetId:actor===f.player?'second':'ship',defenseIds:[],...patch})},actor),begin=()=>command('startSpaceCombat',{briefed:true,reason:'Briefing des trois capitaines'},f.owner),round=async(dice=Array(13).fill(1))=>{f.advance(90000);f.setDice(dice);return command('resolveSpaceRoundAdmin',{},f.owner);};
 if(declare){await propose();await accept();}
 return {...f,support,leader,view,input,propose,acceptInput,accept,leave,trigger,detail,command,submit,begin,round,combatId:()=>combatId};
}
export function pirateAllianceSuite(makeStore,prefix='Alliances pirates SO'){
 test(`${prefix} : accords distincts, une position sélectionnée et trois voyages dans la rencontre native`,async()=>{
  const f=await pirateAllianceFixture(makeStore),wallet=await f.wallet(),points=await f.points(f.pirate),q=await f.candidates();assert.equal(q.candidates.length,1);assert.equal(q.candidates[0].supportName,'Concurrent');const r=await f.trigger(),e=await f.get(`spaceCombats/${r.id}`);assert.deepEqual(e.shipIds,['ship','second',f.support.shipId]);assert.equal(e.convoyId,undefined);assert.equal(e.pirateAlliance.supportShipId,f.support.shipId);assert.equal(e.teams[f.support.shipId],'PIRATE');assert.deepEqual(e.selection.candidateIds,[f.leader.id]);for(const id of [f.leader.id,f.support.ambushId])assert.equal((await f.get(`spaceAmbushes/${id}`)).status,'CONSUMED');assert.deepEqual(await f.wallet(),wallet);assert.deepEqual(await f.points(f.pirate),points);assert.equal((await f.get('ships/second')).pirateAlliance,null);
 });
 test(`${prefix} : invitation seule ne fait pas entrer le second, accord après déclenchement refusé`,async()=>{
  const f=await pirateAllianceFixture(makeStore,{declare:false});await f.propose();const p=await f.acceptInput(),r=await f.trigger();assert.equal((await f.get(`spaceCombats/${r.id}`)).shipIds.length,2);assert.equal((await f.get(`spaceAmbushes/${f.support.ambushId}`)).status,'ACTIVE');await assert.rejects(f.cmd('acceptPirateAlliance',p,f.support.actor),{code:'SPACE_ALLIANCE_UNAVAILABLE'});
 });
 test(`${prefix} : reçus ciblés, voyages et ordres adverses restent privés entre alliés`,async()=>{
  const f=await pirateAllianceFixture(makeStore),d=await f.view(f.support.actor);assert.ok(!JSON.stringify(d).includes(f.targetVoyageId));assert.doesNotMatch(JSON.stringify(d),/knowledgeId|pilotVersion|TEXTE_PRIVE|ordinary/);await f.trigger();await f.begin();const before=await f.detail(f.support.actor);await f.submit('ATTACK');const after=await f.detail(f.support.actor);assert.equal(after.confirmation,before.confirmation);assert.equal(after.ownOrder,null);assert.doesNotMatch(JSON.stringify(after),/"kind":"ATTACK"|pirateAlliance|pilotVersion|knowledgeId|targetVoyageId/);assert.deepEqual(after.targets.map(x=>x.id),['ship']);
 });
 test(`${prefix} : mauvais capitaine, même vaisseau, autre liaison ou position absente refusés`,async()=>{
  const f=await pirateAllianceFixture(makeStore,{declare:false});await assert.rejects(f.read('preparePirateAlliance',f.input,f.player),{code:'FORBIDDEN'});await assert.rejects(f.read('preparePirateAlliance',{shipId:'second',supportShipId:'second'}),{code:'SPACE_ALLIANCE_UNAVAILABLE'});await f.edit(`ships/${f.support.shipId}`,s=>({...s,journey:{...s.journey,routeId:'back'}}));await assert.rejects(f.propose(),{code:'SPACE_ALLIANCE_UNAVAILABLE'});await f.edit(`ships/${f.support.shipId}`,s=>({...s,ambushId:null,journey:{...s.journey,routeId:'out'}}));await assert.rejects(f.propose(),{code:'SPACE_ALLIANCE_UNAVAILABLE'});
 });
 test(`${prefix} : confirmation périmée et dissolution en pause sans retirer les positions`,async()=>{
  const f=await pirateAllianceFixture(makeStore,{declare:false});await f.propose();const p=await f.acceptInput();await f.edit(`ships/${f.support.shipId}`,s=>({...s,revision:s.revision+1}));await assert.rejects(f.cmd('acceptPirateAlliance',p,f.support.actor),{code:'STALE_REVISION'});await f.accept();await assert.rejects(f.cancel(),{code:'SPACE_ALLIANCE_UNAVAILABLE'});await f.stage('PAUSE');await f.leave(f.support.actor,f.support.shipId);assert.equal((await f.get('ships/second')).pirateAlliance,null);for(const id of [f.leader.id,f.support.ambushId])assert.equal((await f.get(`spaceAmbushes/${id}`)).status,'ACTIVE');
 });
 test(`${prefix} : support révoqué exclut la déclaration, dissolution MJ conserve les fonds`,async()=>{
  const f=await pirateAllianceFixture(makeStore),wallet=await f.wallet();await f.cmd('revokeAccess',{uid:f.support.actor.uid},f.owner);await assert.rejects(f.candidates(),{code:'SPACE_NO_AMBUSH'});await assert.rejects(f.view(f.support.actor),{code:'FORBIDDEN'});await f.leave(f.owner);assert.deepEqual(await f.wallet(),wallet);assert.equal((await f.candidates()).candidates.length,1);
 });
 test(`${prefix} : acceptations et interceptions concurrentes ne doublent aucune participation`,async()=>{
  const f=await pirateAllianceFixture(makeStore,{declare:false});await f.propose();const p={...await f.acceptInput(),requestId:randomUUID()},r=await f.cmd('acceptPirateAlliance',p,f.support.actor);assert.deepEqual(await f.cmd('acceptPirateAlliance',p,f.support.actor),r);const q=await f.candidates(),inputs=[1,2].map(()=>({shipId:'ship',confirmation:q.confirmation,reason:'Interception',requestId:randomUUID()})),rs=await Promise.allSettled(inputs.map(p=>f.cmd('triggerSpaceInterception',p,f.owner)));assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.store.list(`${f.base}/spaceCombats`)).length,1);await f.cmd('revokeAccess',{uid:f.support.actor.uid},f.owner);await assert.rejects(f.cmd('acceptPirateAlliance',p,f.support.actor),{code:'FORBIDDEN'});
 });
 test(`${prefix} : interruption d’accord ou de déclenchement ne laisse pas de demi-alliance`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await pirateAllianceFixture(()=>store,{declare:false});await f.propose();fail=true;await assert.rejects(f.accept(),/INTERRUPTION/);fail=false;assert.equal((await f.get('ships/second')).pirateAlliance,undefined);assert.equal((await f.get(`ships/${f.support.shipId}`)).pirateAlliance,undefined);await f.accept();fail=true;await assert.rejects(f.trigger(),/INTERRUPTION/);fail=false;assert.ok((await f.get('ships/second')).pirateAlliance);assert.equal((await f.get(`spaceAmbushes/${f.support.ambushId}`)).status,'ACTIVE');assert.equal((await f.ship()).journey.suspended,false);await f.trigger();
 });
 test(`${prefix} : paix unanime des trois capitaines et décrochage libèrent tous les temps restants`,async()=>{
  const f=await pirateAllianceFixture(makeStore);await f.trigger();await f.command('consentSpacePeace',{agree:true},f.player);await f.command('consentSpacePeace',{agree:true});assert.equal((await f.detail()).status,'ENCOUNTER');await f.command('consentSpacePeace',{agree:true},f.support.actor);assert.equal((await f.detail()).reason,'CEASEFIRE');for(const id of ['ship','second',f.support.shipId])assert.equal((await f.get(`ships/${id}`)).journey.suspended,false);
  const g=await pirateAllianceFixture(makeStore);await g.trigger();g.setDie(6);await g.command('spaceBreakaway',{},g.player);assert.equal((await g.detail()).reason,'BREAKAWAY');for(const id of ['ship','second',g.support.shipId])assert.equal((await g.get(`ships/${id}`)).combatId,null);await assert.rejects(g.candidates(),{code:'SPACE_INTERCEPTION_USED'});
 });
 test(`${prefix} : les capitaines coordonnent un poursuivant unique avant verrouillage`,async()=>{
  const f=await pirateAllianceFixture(makeStore);await f.trigger();await f.begin();await f.submit('PURSUE');await assert.rejects(f.submit('PURSUE',f.support.actor),{code:'SPACE_PURSUER_ALREADY_CHOSEN'});await f.submit('PASSIVE');await f.submit('PURSUE',f.support.actor);await f.submit('FLEE',f.player);const r=await f.round();assert.equal(r.result.rolls.filter(x=>x.kind==='PURSUIT').length,1);assert.equal(r.result.rolls.find(x=>x.kind==='PURSUIT').shipId,f.support.shipId);assert.equal(r.result.shots.length,0);
 });
 test(`${prefix} : deux tirs simultanés, défense d’un seul attaquant et reddition individuelle`,async()=>{
  const f=await pirateAllianceFixture(makeStore);await f.trigger();await f.begin();await f.submit('ATTACK');await f.submit('ATTACK',f.support.actor);await f.submit('DEFEND',f.player,{defenseIds:['second']});const before=await f.ship(),r=await f.round(Array(13).fill(6));assert.equal(r.result.shots.length,2);assert.equal(r.result.shots.find(x=>x.shipId==='second').damage,0);assert.equal(r.result.shots.find(x=>x.shipId===f.support.shipId).damage,1);assert.equal((await f.ship()).shield,before.shield-1);
  await f.submit('SURRENDER',f.support.actor);await f.submit('PASSIVE',f.player,{acceptSurrender:true});await f.round();assert.equal((await f.get(`ships/${f.support.shipId}`)).combatId,null);assert.equal((await f.detail()).status,'ROUND');
 });
 test(`${prefix} : STOP interdit nouvel accord et action, sans modifier les positions`,async()=>{
  const f=await pirateAllianceFixture(makeStore,{declare:false});await f.propose();await f.cmd('stopSafety',{reason:'Sécurité'});await assert.rejects(f.accept(),{code:'SO_SAFETY_STOP'});await assert.rejects(f.leave(),{code:'SO_SAFETY_STOP'});assert.ok((await f.get('ships/second')).pirateOffer);assert.equal((await f.get(`spaceAmbushes/${f.leader.id}`)).status,'ACTIVE');
 });
 test(`${prefix} : coalition face à un convoi escorté reste fermée sans rencontre à quatre implicite`,async()=>{
  const f=await pirateAllianceFixture(makeStore);await assert.rejects(f.read('prepareSpaceInterception',{shipId:'second'},f.owner),{code:'SPACE_ALLIANCE_UNAVAILABLE'});const ship=await f.ship(),id=randomUUID(),g={id:randomUUID(),leaderShipId:'ship',shipIds:['ship',id]};
  // Explicit synthetic merchant convoy only for the unsupported-boundary test.
  await f.store.runTransaction(async tx=>{tx.set(`${f.base}/ships/ship`,{...ship,convoy:g});tx.set(`${f.base}/ships/${id}`,{...ship,id,convoy:g,journey:{...ship.journey,id:randomUUID()}});});await assert.rejects(f.candidates(),{code:'SPACE_NO_AMBUSH'});assert.equal((await f.store.list(`${f.base}/spaceCombats`)).length,0);
 });
 test(`${prefix} : déclaration consommée et historique conservés entre épisodes sans réarmement`,async()=>{
  const {episodeHarness}=await import('./space-episodes-suite.mjs'),f=await pirateAllianceFixture(makeStore),r=await f.trigger();for(const actor of [f.player,f.pirate,f.support.actor])await f.command('consentSpacePeace',{agree:true},actor);f.advance(300000);for(const [actor,shipId]of [[f.player,'ship'],[f.pirate,'second'],[f.support.actor,f.support.shipId]]){const n=await f.navigation(shipId,actor);await f.cmd('arriveShip',{shipId,confirmation:n.confirmation},actor);}const e=await episodeHarness(f);await e.close({participantUids:[f.player.uid,f.pirate.uid,f.support.actor.uid]});await e.resume(await e.begin());assert.equal((await e.get('')).spaceOutlaws.pirateAllianceVersion,1);assert.equal((await e.get(`spaceCombats/${r.id}`)).pirateAlliance.supportShipId,f.support.shipId);assert.equal((await e.get('ships/second')).pirateAlliance,null);assert.equal((await e.get(`spaceAmbushes/${f.support.ambushId}`)).status,'CONSUMED');
 });
 test(`${prefix} : ancien manifeste réel non enrichi garde ses positions individuelles`,async()=>{
  const f=await soVoyagesFixture(makeStore,{release:false}),r=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${r.versionId}`,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;await f.store.runTransaction(async tx=>{const {pirateAllianceVersion,manifestDigest,...h}=await tx.get(path);tx.set(path,{...h,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(h))).digest('hex')});});await f.birth(await f.birthPreview());assert.equal((await f.read('mySession')).session.spaceOutlaws.pirateAllianceVersion,undefined);assert.deepEqual((await f.read('spaceCombats')).pirateAlliances,{ready:false,ships:[]});
 });
}
