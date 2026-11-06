import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {episodeHarness} from './space-episodes-suite.mjs';
import {entryFixture} from './space-outlaws-entry-suite.mjs';
import {successionFixture} from './space-succession-suite.mjs';
import {rosterMembership} from './group-management-suite.mjs';
import {guardSpaceOutlawsEntry} from '../../src/core/space-outlaws-entry-guard.mjs';
export async function spaceGroupsFixture(makeStore){
 const f=await successionFixture(makeStore,{dead:false,helper:true}),read=f.readSuccession,cmd=f.cmdSuccession;
 const group=id=>f.get(`groups/${id}`);
 const config=async(id,patch={})=>{const g=await group(id);return cmd('saveGroupRoster',{groupId:id,groupRevision:g?.revision??0,name:id,description:'Présentation fictive',briefing:`SECRET_${id}`,gmNotes:'SECRET_MJ',visibility:'SECRET',publicationState:'PUBLISHED',kind:g?.roster.kind??'TEAM',capacity:g?.roster.capacity??null,leaderId:g?.roster.leaderId??null,reason:'Paramétrage de régie',...patch});};
 const prepare=async(cid,from,to,patch={})=>{const input={characterId:cid,sourceGroupId:from,targetGroupId:to,membership:to?rosterMembership(['readBriefing','readMembers'],{visibleToMembers:true}):null,authorizePermissions:!!to,reason:'Affectation de régie',...patch};return {...input,confirmation:(await read('prepareGroupMembership',input)).confirmation};};
 const apply=async(cid,from,to,patch={})=>cmd('applyGroupMembership',await prepare(cid,from,to,patch));
 const assets=async()=>Object.fromEntries(await Promise.all(['characters','inventory','accounts','ledger','ships','registrations'].map(async col=>[col,(await f.store.list(`sessions/${f.sid}/${col}`)).sort((a,b)=>a.id.localeCompare(b.id))])));
 return {...f,read,cmd,group,config,prepareGroup:prepare,applyGroup:apply,assets};
}
export function spaceGroupsSuite(makeStore,prefix='Groupes SO'){
 test(`${prefix} : version native, nouvelle régie sans publication ni redistribution`,async()=>{
  const f=await spaceGroupsFixture(makeStore),s=await f.get(''),before=await f.assets(),version=(await f.store.get(`campaigns/${f.campaignId}`)).master.activeVersionId;
  assert.equal(s.spaceOutlaws.groupsVersion,1);assert.equal(s.modules.groups,true);assert.equal((await f.read('spaceOutlawsEntry')).groupsReady,true);
  await f.config('a');await f.config('b',{kind:'FACTION'});await f.applyGroup(f.cid,null,'a');await f.applyGroup(f.cid,null,'b');await f.config('a',{leaderId:f.cid});
  assert.deepEqual(await f.assets(),before);assert.equal((await f.store.get(`campaigns/${f.campaignId}`)).master.activeVersionId,version);assert.deepEqual((await f.read('groupManagement')).availablePermissions,['readBriefing','readMembers']);
  const d=await f.read('myGroup',{groupId:'a'},f.player);assert.equal(d.group.briefing,'SECRET_a');assert.doesNotMatch(JSON.stringify(d),/SECRET_MJ|assignedUid|actorUid|@/);assert.equal(d.group.permissions.payWallet,false);
 });
 test(`${prefix} : transfert, secrets révoqués immédiatement, responsable et contre-opération`,async()=>{
  const f=await spaceGroupsFixture(makeStore);await f.config('a');await f.config('b');await f.applyGroup(f.cid,null,'a');await f.config('a',{leaderId:f.cid});const before=await f.assets(),out=await f.applyGroup(f.cid,'a','b');
  await assert.rejects(f.read('myGroup',{groupId:'a'},f.player),{code:'FORBIDDEN'});assert.equal((await f.read('myGroup',{groupId:'b'},f.player)).group.briefing,'SECRET_b');assert.equal((await f.group('a')).roster.leaderId,null);assert.ok(Object.values((await f.group('a')).members[0].permissions).every(v=>v===false));assert.deepEqual(await f.assets(),before);
  await f.applyGroup(f.cid,'b','a',{reversesEventId:out.id});await assert.rejects(f.read('myGroup',{groupId:'b'},f.player),{code:'FORBIDDEN'});assert.equal((await f.group('a')).members[0].permissions.readBriefing,true);
 });
 test(`${prefix} : dernière place concurrente, équipe unique et factions multiples`,async()=>{
  const f=await spaceGroupsFixture(makeStore);await f.config('a',{capacity:1});await f.config('b');await f.config('c',{kind:'FACTION'});
  const inputs=await Promise.all([f.prepareGroup(f.cid,null,'a'),f.prepareGroup(f.otherId,null,'a')]),results=await Promise.allSettled(inputs.map(p=>f.cmd('applyGroupMembership',p)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const winner=(await f.group('a')).members.find(m=>m.active).characterId;await assert.rejects(f.applyGroup(winner,null,'b'),{code:'GROUP_PRIMARY_CONFLICT'});await f.applyGroup(winner,null,'c');assert.equal((await f.group('c')).members[0].active,true);
 });
 test(`${prefix} : autorités courantes, STOP, anciennes versions et permissions fermées`,async()=>{
  const f=await spaceGroupsFixture(makeStore);await f.config('a');for(const actor of [f.player,f.other])await assert.rejects(f.read('groupManagement',{},actor),{code:'FORBIDDEN'});
  await assert.rejects(f.prepareGroup(f.cid,null,'a',{membership:rosterMembership(['payWallet'])}),{code:'SO_GROUP_PERMISSION_NOT_OPEN'});
  const p=await f.prepareGroup(f.cid,null,'a');await f.cmd('stopSafety',{reason:'STOP de test'},f.player);assert.equal((await f.read('groupManagement')).closed,true);await assert.rejects(f.cmd('applyGroupMembership',p),{code:'SO_SAFETY_STOP'});const s=await f.get('');await f.cmd('resumeSafety',{revision:s.revision,reason:'Reprise du test'});
  await f.edit('',s=>{const {groupsVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});assert.equal((await f.read('groupManagement')).closed,true);await assert.rejects(f.cmd('applyGroupMembership',p),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : décès, relève sans héritage, nouvelle affectation explicite`,async()=>{
  const f=await spaceGroupsFixture(makeStore);await f.config('a');await f.applyGroup(f.cid,null,'a');await f.config('a',{leaderId:f.cid});await f.death();await assert.rejects(f.read('myGroup',{groupId:'a'},f.player),{code:'FORBIDDEN'});assert.deepEqual((await f.read('mySession',{},f.player)).groups,[]);await assert.rejects(f.applyGroup(f.cid,null,'a'),{code:'SO_GROUP_CHARACTER_UNAVAILABLE'});
  const done=await f.succeed(await f.previewSuccession()),cid=done.characterId;assert.equal((await f.group('a')).members[0].active,false);assert.equal((await f.group('a')).roster.leaderId,null);assert.deepEqual((await f.read('mySession',{},f.player)).groups,[]);await f.applyGroup(cid,null,'a');assert.equal((await f.read('myGroup',{groupId:'a'},f.player)).group.briefing,'SECRET_a');
 });
 test(`${prefix} : idempotence, archivage et restauration sans réactivation`,async()=>{
  const f=await spaceGroupsFixture(makeStore);await f.config('a');const input={...await f.prepareGroup(f.cid,null,'a'),requestId:randomUUID()},r=await f.cmd('applyGroupMembership',input);assert.deepEqual(await f.cmd('applyGroupMembership',input),r);const before=await f.assets();
  const archive=async archived=>f.cmd('setGroupArchived',{groupId:'a',groupRevision:(await f.group('a')).revision,archived,reason:'Archivage de test'});await archive(true);await archive(false);assert.equal((await f.group('a')).members[0].active,false);assert.deepEqual(await f.assets(),before);await assert.rejects(f.read('myGroup',{groupId:'a'},f.player),{code:'FORBIDDEN'});
 });
 test(`${prefix} : délégation MJ, retrait de rôle avant réessai et accueil exclu`,async()=>{
  const f=await spaceGroupsFixture(makeStore);await f.config('a');const role=async(role,active=true)=>f.cmd('setStaff',{email:f.mj.email,role,active,revision:(await f.get('')).revision,reason:'Délégation de test'});
  await role('RECEPTION');await assert.rejects(f.read('groupManagement',{},f.mj),{code:'FORBIDDEN'});await role('MJ');const p=await f.prepareGroup(f.cid,null,'a'),input={...p,requestId:randomUUID()};await f.cmd('applyGroupMembership',input,f.mj);await role('MJ',false);await assert.rejects(f.cmd('applyGroupMembership',input,f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : interruption atomique et réessai du même transfert`,async()=>{
  const f=await spaceGroupsFixture(makeStore);await f.config('a');await f.config('b');await f.applyGroup(f.cid,null,'a');const p={...await f.prepareGroup(f.cid,'a','b'),requestId:randomUUID()},before=await f.assets(),a=await f.group('a'),b=await f.group('b'),run=f.store.runTransaction.bind(f.store);
  f.store.runTransaction=cb=>run(async tx=>{await cb(tx);throw Error('INTERRUPTION');});await assert.rejects(f.cmd('applyGroupMembership',p),/INTERRUPTION/);f.store.runTransaction=run;assert.deepEqual(await f.group('a'),a);assert.deepEqual(await f.group('b'),b);assert.deepEqual(await f.assets(),before);await f.cmd('applyGroupMembership',p);assert.equal((await f.group('b')).members[0].active,true);
 });
 test(`${prefix} : capacité bornée aux groupes, aucun droit sur personnages ou ressources`,()=>{
  const s={id:'s',revision:1,spaceOutlaws:{actionsVersion:1,groupsVersion:1}},allowed=new Set(['GROUP_MANAGEMENT']);
  assert.equal(guardSpaceOutlawsEntry(s,new Map([['sessions/s/groups/a',{id:'a'}]]),false,allowed),true);
  for(const path of ['characters/c','accounts/a','inventory/i','ships/s','groups/a/updates/u'])assert.throws(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/s/${path}`,{}]]),false,allowed),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : épisode suivant conserve les groupes et leurs mandats sans réaffectation`,async()=>{
  const f=await spaceGroupsFixture(makeStore);await f.config('a');await f.applyGroup(f.cid,null,'a');const before=await f.group('a'),e=await episodeHarness(f);await e.close();assert.equal((await f.read('groupManagement')).closed,true);await e.resume(await e.begin());assert.equal((await e.get('')).spaceOutlaws.groupsVersion,1);assert.equal((await e.get('')).modules.groups,true);assert.deepEqual(await e.get('groups/a'),before);assert.equal((await e.read('myGroup',{groupId:'a'},f.player)).group.briefing,'SECRET_a');
 });
 test(`${prefix} : ancien manifeste conservé, aucune activation rétroactive`,async()=>{
  const f=await entryFixture(makeStore),r=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${r.versionId}`,h=await f.store.get(path);assert.equal(h.groupsVersion,1);
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await f.store.runTransaction(async tx=>{const {groupDefinitionsVersion,groupsVersion,manifestDigest,...old}=h;tx.set(path,{...old,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(old))).digest('hex')});});
  await f.birth(await f.birthPreview());const s=await f.store.get(`sessions/${f.sid}`);assert.equal(s.spaceOutlaws.groupsVersion,undefined);assert.equal(s.modules.groups,false);assert.equal((await f.store.get(path)).groupsVersion,undefined);const d=await f.read('groupManagement');assert.equal(d.closed,true);assert.equal(d.connected,false);
 });
}
