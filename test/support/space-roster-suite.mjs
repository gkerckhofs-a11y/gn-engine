import test from 'node:test';
import assert from 'node:assert/strict';
import {spaceGroupsFixture} from './space-groups-suite.mjs';
import {groupDefinitionsFixture} from './space-group-definitions-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
export function spaceRosterSuite(makeStore,prefix='Catalogue SO'){
 test(`${prefix} : instances, première naissance et réserves sans mutation`,async()=>{
  const f=await groupDefinitionsFixture(makeStore,{reserve:true,second:false}),before=await f.assets(),d=await f.read('groupManagement');
  assert.equal(d.characters.find(c=>c.id===f.cid).rosterState,'ACTIVE');assert.equal(d.characters.find(c=>c.id===f.otherId).rosterState,'UNBORN');
  const r=d.characters.find(c=>c.id==='reserve');assert.equal(r.rosterState,'RESERVE');assert.equal(r.definitionOnly,true);assert.equal(r.canManageMembership,false);assert.deepEqual(await f.assets(),before);assert.equal(new Set(d.characters.map(c=>c.id)).size,d.characters.length);
  assert.doesNotMatch(JSON.stringify(d.characters),/assignedUid|@|SECRET_|creationPlan|objectives|relations/);
  await f.config();await assert.rejects(f.read('prepareGroupMembership',{characterId:'reserve',sourceGroupId:null,targetGroupId:'prepared',membership:null,authorizePermissions:false,reason:'Test réserve'}));assert.deepEqual(await f.assets(),before);
 });
 test(`${prefix} : naissance réelle remplace la projection sans doublon`,async()=>{
  const f=await groupDefinitionsFixture(makeStore,{reserve:true,second:false});await f.birth(await f.birthPreview(f.owner,{uid:f.other.uid}),{uid:f.other.uid});const d=await f.read('groupManagement'),rows=d.characters.filter(c=>c.id===f.otherId);assert.equal(rows.length,1);assert.equal(rows[0].rosterState,'ACTIVE');assert.equal(rows[0].definitionOnly,false);assert.equal(rows[0].canManageMembership,true);
 });
 test(`${prefix} : hors combat, décès puis relève avec liens réciproques`,async()=>{
  const f=await spaceGroupsFixture(makeStore),original=await f.get(`characters/${f.cid}`);await f.edit(`characters/${f.cid}`,c=>({...c,hp:0,outOfCombat:true}));let d=await f.read('groupManagement');assert.equal(d.characters.find(c=>c.id===f.cid).rosterState,'ACTIVE');assert.equal(d.characters.find(c=>c.id===f.cid).outOfCombat,true);
  await f.edit(`characters/${f.cid}`,()=>original);await f.death();d=await f.read('groupManagement');assert.equal(d.characters.find(c=>c.id===f.cid).rosterState,'DEAD');assert.equal(d.characters.find(c=>c.id===f.cid).canManageMembership,false);
  const done=await f.succeed(await f.previewSuccession());d=await f.read('groupManagement');const old=d.characters.find(c=>c.id===f.cid),next=d.characters.find(c=>c.id===done.characterId);assert.equal(old.rosterState,'REPLACED');assert.equal(next.rosterState,'ACTIVE');assert.equal(old.successor.id,next.id);assert.equal(next.predecessor.id,old.id);assert.equal(d.characters.filter(c=>c.id===next.id).length,1);assert.equal(d.characters.find(c=>c.id==='reserve2').rosterState,'RESERVE');
 });
 test(`${prefix} : affectation périmée et faux successeur fermés`,async()=>{
  const f=await spaceGroupsFixture(makeStore);await f.edit(`characters/${f.cid}`,c=>({...c,assignedUid:'unautre'}));let d=await f.read('groupManagement');assert.equal(d.characters.find(c=>c.id===f.cid).rosterState,'UNAVAILABLE');assert.equal(d.characters.find(c=>c.id===f.cid).canManageMembership,false);
  await f.edit(`characters/${f.cid}`,c=>({...c,assignedUid:f.player.uid,successorId:f.otherId}));d=await f.read('groupManagement');assert.equal(d.characters.find(c=>c.id===f.cid).successor,null);assert.equal(d.characters.find(c=>c.id===f.cid).rosterState,'UNAVAILABLE');
 });
 test(`${prefix} : STOP, clôture et accès joueurs`,async()=>{
  const f=await spaceGroupsFixture(makeStore);for(const actor of [f.player,f.other])await assert.rejects(f.read('groupManagement',{},actor),{code:'FORBIDDEN'});
  await f.cmd('stopSafety',{reason:'Test catalogue'},f.player);assert.ok((await f.read('groupManagement')).characters.every(c=>!c.canManageMembership));
  const s=await f.get('');await f.cmd('resumeSafety',{revision:s.revision,reason:'Reprise catalogue'});const e=await episodeHarness(f);await e.close();assert.ok((await f.read('groupManagement')).characters.every(c=>!c.canManageMembership));await e.resume(await e.begin());const d=await e.read('groupManagement');assert.equal(d.characters.find(c=>c.id==='reserve').rosterState,'RESERVE');assert.equal(d.characters.find(c=>c.id===f.cid).rosterState,'ACTIVE');
 });
 test(`${prefix} : dossier retiré ne libère pas sa définition comme réserve`,async()=>{
  const f=await groupDefinitionsFixture(makeStore,{reserve:true,second:false});await f.store.runTransaction(async tx=>{const rows=await tx.list(`sessions/${f.sid}/registrations`),r=rows.find(r=>r.admission?.m2Preparation?.characterId===f.otherId);tx.set(`sessions/${f.sid}/registrations/${r.id}`,{...r,status:'WITHDRAWN'});});const d=await f.read('groupManagement');assert.equal(d.characters.find(c=>c.id===f.otherId).rosterState,'UNAVAILABLE');assert.equal(d.characters.find(c=>c.id==='reserve').rosterState,'RESERVE');
 });
 test(`${prefix} : version de session conservée malgré nouveau pointeur Master`,async()=>{
  const f=await spaceGroupsFixture(makeStore),before=(await f.read('groupManagement')).characters;await f.store.runTransaction(async tx=>{const path=`campaigns/${f.campaignId}`,c=await tx.get(path);tx.set(path,{...c,master:{...c.master,activeVersionId:'version-absente'}});});assert.deepEqual((await f.read('groupManagement')).characters,before);
 });
}
