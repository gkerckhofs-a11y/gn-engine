import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spaceGroupsFixture} from './space-groups-suite.mjs';
import {guardSpaceOutlawsEntry} from '../../src/core/space-outlaws-entry-guard.mjs';
export function groupChatSuite(makeStore,prefix='Messagerie de groupe'){
 const setup=async()=>{const f=await spaceGroupsFixture(makeStore);await f.config('a');await f.config('b');await f.applyGroup(f.cid,null,'a');return {...f,messages:(who=f.player,groupId='a')=>f.read('groupMessages',{groupId},who),send:(body,who=f.player,extra={})=>f.cmd('sendGroupMessage',{groupId:'a',body,...extra},who)};};
 test(`${prefix} : membres, signature, données privées, nouvelle arrivée et séparation des groupes`,async()=>{
  const f=await setup(),before=await f.assets();await f.send('Avant arrivée');
  await assert.rejects(f.messages(f.other),{code:'FORBIDDEN'});await assert.rejects(f.send('Intrus',f.other),{code:'FORBIDDEN'});
  await f.applyGroup(f.otherId,null,'a');assert.deepEqual((await f.messages(f.other)).messages,[]);
  const text='<img src=x onerror=alert(1)>\nRendez-vous au spatioport';await f.send(text);
  const d=await f.messages(f.other);assert.equal(d.messages.length,1);assert.equal(d.messages[0].body,text);assert.equal(d.messages[0].authorName,(await f.get(`characters/${f.cid}`)).public.displayName);
  assert.deepEqual(Object.keys(d.messages[0]).sort(),['at','authorName','body','id']);assert.doesNotMatch(JSON.stringify(d),/SECRET_MJ|assignedUid|authorUid|recipientIds|@/);
  await f.send('Bien reçu',f.other);assert.equal((await f.messages()).messages.length,3);
  await assert.rejects(f.messages(f.player,'b'),{code:'FORBIDDEN'});
  // Only the deliberate roster edit may alter the characters' group context.
  assert.deepEqual((await f.assets()).accounts,before.accounts);assert.deepEqual((await f.assets()).inventory,before.inventory);
 });
 test(`${prefix} : réessais concurrents, contenu invalide et retrait avant réessai`,async()=>{
  const f=await setup(),input={requestId:randomUUID()};const r=await Promise.all([f.send('Unique',f.player,input),f.send('Unique',f.player,input)]);assert.deepEqual(r[0],r[1]);assert.equal((await f.messages()).messages.length,1);
  await assert.rejects(f.send('Autre',f.player,input),{code:'REQUEST_ID_REUSED'});
  for(const body of ['', '  ', 'a'.repeat(2001),123])await assert.rejects(f.send(body),{code:'INVALID_TEXT'});
  await f.applyGroup(f.cid,'a','b');await assert.rejects(f.messages(),{code:'FORBIDDEN'});await assert.rejects(f.send('Unique',f.player,input),{code:'FORBIDDEN'});
 });
 test(`${prefix} : pause, STOP, décès, groupes masqués et ancienne version`,async()=>{
  const f=await setup();await f.stage('PAUSE');assert.equal((await f.messages()).canSend,false);await assert.rejects(f.send('Pause'),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');
  await f.cmd('stopSafety',{reason:'STOP de test'},f.player);assert.equal((await f.messages()).canSend,false);await assert.rejects(f.send('STOP'),{code:'SO_SAFETY_STOP'});await f.cmd('resumeSafety',{revision:(await f.get('')).revision,reason:'Reprise'});
  await f.edit('groups/a',g=>({...g,members:g.members.map(m=>({...m,revealed:false}))}));await assert.rejects(f.messages(),{code:'FORBIDDEN'});
  await f.edit('groups/a',g=>({...g,members:g.members.map(m=>({...m,revealed:true}))}));
  await f.edit('',s=>({...s,spaceOutlaws:{...s.spaceOutlaws,groupsVersion:0}}));await assert.rejects(f.messages(),{code:'SO_GAMEPLAY_NOT_OPEN'});await assert.rejects(f.send('Ancienne version'),{code:'SO_GAMEPLAY_NOT_OPEN'});
  await f.edit('',s=>({...s,spaceOutlaws:{...s.spaceOutlaws,groupsVersion:1}}));await f.death();await assert.rejects(f.messages(),{code:'FORBIDDEN'});
 });
 test(`${prefix} : historique borné, accès privé révoqué et capacité transactionnelle étroite`,async()=>{
  const f=await setup();for(let i=0;i<52;i++){f.advance(1000);await f.send(`Message ${i}`);}
  const rows=(await f.messages()).messages;assert.equal(rows.length,50);assert.equal(rows[0].body,'Message 2');assert.equal(rows.at(-1).body,'Message 51');
  const s=await f.get('');assert.throws(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/${f.sid}/groups/a`,{}]]),false,new Set(['GROUP_CHAT'])),{code:'SO_GAMEPLAY_NOT_OPEN'});
  await f.cmd('revokeAccess',{uid:f.player.uid});await assert.rejects(f.messages(),{code:'FORBIDDEN'});await assert.rejects(f.send('Révoqué'),{code:'FORBIDDEN'});
 });
}
