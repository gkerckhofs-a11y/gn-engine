import test from 'node:test';
import assert from 'node:assert/strict';
import {boardingCargoFixture} from './space-boarding-cargo-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
import {readSoEpisode} from '../../src/core/space-outlaws-episodes.mjs';
import {randomUUID} from 'node:crypto';
const setup=async makeStore=>{
 const f=await boardingCargoFixture(makeStore),report=async(actor=f.owner)=>(await f.read('cargoAdmin',{},actor)).boardingCustody,take=async(quantity=2)=>{const t=await f.start({quantity});f.advance(180000);await f.finish(t);return t;},snapshot=()=>f.store.runTransaction(async tx=>(await readSoEpisode(tx,await tx.get(`sessions/${f.sid}`))).entries);
 return {...f,report,take,snapshot};
};
export function boardingCustodySuite(makeStore,prefix='Suivi des gardes SO'){
 test(`${prefix} : seuls les lots reçus sous garde figurent au suivi, volume réel et propriétaire conservés`,async()=>{
  const f=await setup(makeStore);assert.deepEqual((await f.report()).lots,[]);await f.edit(`inventory/${f.ids[0]}`,l=>({...l,item:{...l.item,unitVolume:2}}));const t=await f.start();assert.deepEqual((await f.report()).lots,[]);f.advance(180000);await f.finish(t);const d=await f.report(),l=d.lots[0];assert.equal(d.lots.length,1);assert.equal(d.totalVolume,4);assert.equal(l.quantity,2);assert.equal(l.owner.id,f.cid);assert.equal(l.holder.id,f.otherId);assert.equal(l.ship.id,'second');assert.equal(l.combatId,f.combatId());assert.equal(l.boardingId,f.input.boardingId);assert.ok(l.alerts.includes('SHIP_NOT_LOCAL'));assert.doesNotMatch(JSON.stringify(d),/reason|confirmation|actorUid|assignedUid|accessVersion|navigationCode|journeyIds|rootLotId/);
 });
 test(`${prefix} : scission et restitution partielle ne doublent ni volume ni lot reçu`,async()=>{
  const f=await setup(makeStore),t=await f.take(5);await f.arrive();const r=await f.start({lotId:t.lotId,direction:'RETURN',quantity:2});let d=await f.report();assert.equal(d.lots.length,2);assert.equal(d.totalVolume,5);assert.equal(d.loading,1);assert.equal(d.lots.find(l=>l.lotId===r.lotId).loading.direction,'RETURN');assert.equal(d.lots.find(l=>l.lotId===r.lotId).loading.remainingSeconds,180);f.advance(180000);await f.finish(r);d=await f.report();assert.equal(d.lots.length,1);assert.equal(d.totalVolume,3);assert.equal(d.loading,0);assert.equal(d.lots[0].lotId,t.lotId);const last=await f.start({lotId:t.lotId,direction:'RETURN',quantity:3});f.advance(180000);await f.finish(last);assert.deepEqual((await f.report()).lots,[]);assert.equal(await f.total(),5);
 });
 test(`${prefix} : annuler une restitution conserve toute la garde et libère seulement sa réservation`,async()=>{
  const f=await setup(makeStore),t=await f.take(5);await f.arrive();const r=await f.start({lotId:t.lotId,direction:'RETURN',quantity:2});await f.finish(r,false);const d=await f.report();assert.equal(d.totalVolume,5);assert.equal(d.loading,0);assert.equal(d.lots.length,2);assert.ok(d.lots.every(l=>l.owner.id===f.cid&&l.status==='AVAILABLE'));
 });
 test(`${prefix} : régie et bilan partagent le même état après libération sans aucun effet de lecture`,async()=>{
  const f=await setup(makeStore);await f.take();await f.release();const e=await episodeHarness(f);await e.stage('PAUSE');const before=await f.snapshot(),d=await f.report(),q=await e.read('prepareCampaignClosure',e.closeInput());assert.equal(q.canClose,true);assert.deepEqual(q.summary.continuity.boardingCustody,d);assert.equal(d.totalVolume,2);assert.equal((await f.board()).boardings[0].status,'RELEASED');assert.deepEqual(await f.snapshot(),before);await f.report();assert.deepEqual(await f.snapshot(),before);
 });
 test(`${prefix} : pause et STOP figent le délai affiché sans réception ni clôture implicite`,async()=>{
  const f=await setup(makeStore),t=await f.take();await f.arrive();await f.start({lotId:t.lotId,direction:'RETURN'});f.advance(30000);await f.stage('PAUSE');const d=await f.report();assert.equal(d.lots[0].loading.remainingSeconds,150);f.advance(600000);assert.deepEqual(await f.report(),d);await f.cmd('stopSafety',{reason:'Contrôle du suivi'});f.advance(600000);assert.deepEqual(await f.report(),d);const e=await episodeHarness(f);await assert.rejects(e.read('prepareCampaignClosure',e.closeInput()),{code:'SO_SAFETY_STOP'});assert.equal((await f.lot(t.lotId)).status,'CARGO_RESERVED');
 });
 test(`${prefix} : accès révoqué, décès et absence du propriétaire restent visibles sans succession`,async()=>{
  const f=await setup(makeStore),t=await f.take();await f.arrive();assert.deepEqual((await f.report()).lots[0].alerts,[]);await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);let d=await f.report();assert.ok(d.lots[0].alerts.includes('OWNER_ACCESS_CHANGED'));await f.edit(`characters/${f.cid}`,c=>({...c,survival:{...c.survival,dead:true},spacePortId:'home'}));d=await f.report();assert.ok(d.lots[0].alerts.includes('OWNER_DEAD'));assert.ok(d.lots[0].alerts.includes('OWNER_NOT_LOCAL'));assert.equal(d.lots[0].owner.id,f.cid);assert.equal((await f.lot(t.lotId)).ownerId,f.cid);
 });
 test(`${prefix} : MJ courant seulement, aucune nouvelle projection globale dans les vues joueurs`,async()=>{
  const f=await setup(makeStore);await f.take();for(const actor of [f.player,f.other]){await assert.rejects(f.report(actor),{code:'FORBIDDEN'});assert.equal((await f.read('myCargo',{},actor)).boardingCustody,undefined);assert.equal((await f.read('mySession',{},actor)).boardingCustody,undefined);}const mj={...f.other,uid:randomUUID(),email:`garde-${randomUUID()}@example.invalid`,authTime:Date.now()},staff=async active=>f.cmd('setStaff',{revision:(await f.store.get(`sessions/${f.sid}`)).revision,email:mj.email,role:'MJ',active,reason:'Suivi temporaire du fret'},f.owner);await staff(true);assert.equal((await f.report(mj)).totalVolume,2);await staff(false);await assert.rejects(f.report(mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : ancien manifeste sans marqueur fermé, dossier incohérent signalé sans inventer un droit`,async()=>{
  const f=await setup(makeStore),t=await f.take();await f.edit(`spaceCombats/${f.combatId()}/boardings/${f.input.boardingId}`,r=>({...r,targetShipId:'missing'}));let d=await f.report();assert.ok(d.lots[0].alerts.includes('DOSSIER_UNAVAILABLE'));assert.equal(d.lots[0].owner.id,f.cid);await f.edit('ships/second',s=>({...s,portId:'missing'}));assert.ok((await f.report()).lots[0].alerts.includes('PORT_UNAVAILABLE'));await f.store.runTransaction(async tx=>{const path=`sessions/${f.sid}`,s=await tx.get(path),{boardingShopReturnVersion,boardingFreightVersion,boardingCargoVersion,...spaceOutlaws}=s.spaceOutlaws;tx.set(path,{...s,spaceOutlaws});});assert.equal(await f.report(),undefined);const e=await episodeHarness(f);await e.stage('PAUSE');const q=await e.read('prepareCampaignClosure',e.closeInput());assert.equal(q.summary.continuity.boardingCustody,undefined);assert.equal((await f.lot(t.lotId)).ownerId,f.cid);
 });
 test(`${prefix} : réservation incohérente signalée sans inventer une tranche recevable`,async()=>{
  const f=await setup(makeStore),t=await f.take();await f.arrive();const r=await f.start({lotId:t.lotId,direction:'RETURN'});await f.edit(`cargoTransfers/${r.id}`,x=>({...x,quantity:x.quantity+1}));const d=await f.report();assert.equal(d.totalVolume,2);assert.equal(d.loading,0);assert.equal(d.lots[0].loading,null);assert.ok(d.lots[0].alerts.includes('LOT_UNAVAILABLE'));assert.equal((await f.lot(r.lotId)).status,'CARGO_RESERVED');
 });
 test(`${prefix} : clôture et reprise conservent garde et suivi, sans nouvelle attribution`,async()=>{
  const f=await setup(makeStore),t=await f.take(),e=await episodeHarness(f),before=await f.lot(t.lotId);await e.close();await e.resume(await e.begin());const d=(await e.read('cargoAdmin')).boardingCustody;assert.equal(d.sessionId,e.sid);assert.equal(d.totalVolume,2);assert.equal(d.lots[0].owner.id,f.cid);assert.equal(d.lots[0].lotId,t.lotId);assert.deepEqual(await e.get(`inventory/${t.lotId}`),before);assert.equal((await e.read('spaceBoardingAdmin',{combatId:f.combatId()})).boardings[0].status,'CONTROLLED');await assert.rejects(f.report(),{code:'SESSION_CLOSED'});
 });
}
