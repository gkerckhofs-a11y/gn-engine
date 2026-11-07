import test from 'node:test';
import assert from 'node:assert/strict';
import {successionFixture} from './space-succession-suite.mjs';
import {rosterMembership} from './group-management-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
import {readSoEntryVersion} from '../../src/core/space-outlaws-entry.mjs';
import {inventoryHash as hash} from '../../src/core/inventory-state.mjs';
export const friendWishA='Équipe phare — SECRET_AMIS_A <img src=x onerror=alert(1)>';
export const friendWishB='Équipe phare — SECRET_AMIS_B';
export async function groupRequestsFixture(makeStore){
 const f=await successionFixture(makeStore,{dead:false,helper:true,friends:friendWishA,otherFriends:friendWishB}),read=f.readSuccession,cmd=f.cmdSuccession;
 const group=id=>f.get(`groups/${id}`);
 const config=async(id='phare')=>{const old=await group(id);return cmd('saveGroupRoster',{groupId:id,groupRevision:old?.revision??0,name:'Équipe phare',description:'Équipe fictive',briefing:'BRIEFING_DU_GROUPE',gmNotes:'NOTES_MJ',visibility:'SECRET',publicationState:'PUBLISHED',kind:'TEAM',capacity:2,leaderId:null,reason:'Configuration de test'});};
 const assign=async(cid=f.cid)=>{const input={characterId:cid,sourceGroupId:null,targetGroupId:'phare',membership:rosterMembership(['readBriefing']),authorizePermissions:true,reason:'Coordination validée'},p=await read('prepareGroupMembership',input);return cmd('applyGroupMembership',{...input,confirmation:p.confirmation});};
 const assets=async()=>Object.fromEntries(await Promise.all(['characters','registrations','groups','inventory','accounts','ledger','ships','audit'].map(async col=>[col,(await f.store.list(`sessions/${f.sid}/${col}`)).sort((a,b)=>a.id.localeCompare(b.id))])));
 return {...f,read,cmd,group,config,assignFromWish:assign,assets};
}
export function groupRequestsSuite(makeStore,prefix='Souhaits de groupe SO'){
 test(`${prefix} : souhaits courants privés, même texte sans lien ni appartenance automatique`,async()=>{
  const f=await groupRequestsFixture(makeStore),before=await f.assets(),d=await f.read('groupManagement');assert.equal(d.friendRequests.length,2);const a=d.friendRequests.find(r=>r.characterId===f.cid);assert.equal(a.wish,friendWishA);assert.equal(a.name,'Ari Test');assert.equal(a.state,'CURRENT');assert.equal(a.canManage,true);assert.deepEqual(Object.keys(a).sort(),['name','wish','characterId','state','outOfCombat','canManage'].sort());assert.deepEqual(await f.assets(),before);assert.deepEqual(d.groups,[]);
 });
 test(`${prefix} : textes absents des versions M2 et de toutes les lectures joueur`,async()=>{
  const f=await groupRequestsFixture(makeStore),version=await f.store.runTransaction(async tx=>readSoEntryVersion(tx,await tx.get(`campaigns/${f.campaignId}`)));assert.doesNotMatch(JSON.stringify(version.changes),/SECRET_AMIS_A|SECRET_AMIS_B/);
  for(const actor of [f.player,f.other]){assert.doesNotMatch(JSON.stringify(await f.read('mySession',{},actor)),/SECRET_AMIS_A|SECRET_AMIS_B/);assert.doesNotMatch(JSON.stringify(await f.read('publicBadge',{characterId:f.cid},actor)),/SECRET_AMIS_A|SECRET_AMIS_B/);await assert.rejects(f.read('groupManagement',{},actor),{code:'FORBIDDEN'});}
 });
 test(`${prefix} : affectation par la commande native et aucun souhait copié dans le groupe ou son historique`,async()=>{
  const f=await groupRequestsFixture(makeStore);await f.config();await f.read('groupManagement');assert.deepEqual((await f.group('phare')).members,[]);await assert.rejects(f.read('myGroup',{groupId:'phare'},f.player),{code:'FORBIDDEN'});const accounts=await f.store.list(`sessions/${f.sid}/accounts`);await f.assignFromWish();assert.deepEqual(await f.store.list(`sessions/${f.sid}/accounts`),accounts);assert.equal((await f.read('myGroup',{groupId:'phare'},f.player)).group.briefing,'BRIEFING_DU_GROUPE');assert.doesNotMatch(JSON.stringify(await f.group('phare')),/SECRET_AMIS_A|SECRET_AMIS_B/);assert.doesNotMatch(JSON.stringify(await f.store.list(`sessions/${f.sid}/groups/phare/history`)),/SECRET_AMIS_A|SECRET_AMIS_B/);assert.doesNotMatch(JSON.stringify(await f.read('myGroup',{groupId:'phare'},f.player)),/SECRET_AMIS_A|SECRET_AMIS_B/);
 });
 test(`${prefix} : MJ courant seulement, accueil et révocation exclus avant lecture`,async()=>{
  const f=await groupRequestsFixture(makeStore),role=async(role,active=true)=>f.cmd('setStaff',{email:f.mj.email,role,active,revision:(await f.get('')).revision,reason:'Délégation de test'});await role('RECEPTION');await assert.rejects(f.read('groupManagement',{},f.mj),{code:'FORBIDDEN'});await role('MJ');assert.equal((await f.read('groupManagement',{},f.mj)).friendRequests.length,2);await role('MJ',false);await assert.rejects(f.read('groupManagement',{},f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : personne pas encore née visible sans bouton d’affectation ni nouveaux droits`,async()=>{
  const f=await groupRequestsFixture(makeStore),r=await f.get(`registrations/${hash(f.other.uid)}`);await f.edit(`registrations/${r.id}`,old=>({...old,status:'RECEIVED',characterId:null,accessActive:false}));const row=(await f.read('groupManagement')).friendRequests.find(r=>r.wish===friendWishB);assert.equal(row.name,'Bela Test');assert.equal(row.characterId,null);assert.equal(row.state,'UNBORN');assert.equal(row.canManage,false);
 });
 test(`${prefix} : dossiers retirés et souhait vide ne sont pas réaffichés`,async()=>{
  const f=await groupRequestsFixture(makeStore);await f.edit(`registrations/${hash(f.player.uid)}`,r=>({...r,admission:{...r.admission,status:'WITHDRAWN'}}));await f.edit(`registrations/${hash(f.other.uid)}`,r=>({...r,admission:{...r.admission,proposal:{...r.admission.proposal,friends:'   '}}}));assert.deepEqual((await f.read('groupManagement')).friendRequests,[]);
 });
 test(`${prefix} : décès puis réserve ne reportent pas l’ancien souhait sur une nouvelle incarnation`,async()=>{
  const f=await groupRequestsFixture(makeStore);await f.death();let row=(await f.read('groupManagement')).friendRequests.find(r=>r.wish===friendWishA);assert.equal(row.state,'DEAD');assert.equal(row.canManage,false);await f.succeed(await f.previewSuccession());const d=await f.read('groupManagement');assert.equal(d.friendRequests.length,1);assert.equal(d.friendRequests[0].wish,friendWishB);assert.doesNotMatch(JSON.stringify(await f.read('mySession',{},f.player)),/SECRET_AMIS_A|SECRET_AMIS_B/);
 });
 test(`${prefix} : incohérence d’attribution ne donne pas un accès à un autre personnage`,async()=>{
  const f=await groupRequestsFixture(makeStore);await f.edit(`registrations/${hash(f.player.uid)}`,r=>({...r,characterId:f.otherId}));const row=(await f.read('groupManagement')).friendRequests.find(r=>r.wish===friendWishA);assert.equal(row.name,'Ari Test');assert.equal(row.characterId,null);assert.equal(row.state,'UNAVAILABLE');assert.equal(row.canManage,false);
 });
 test(`${prefix} : STOP et clôture conservent la consultation sans commande d’affectation`,async()=>{
  const f=await groupRequestsFixture(makeStore);await f.cmd('stopSafety',{reason:'STOP'},f.player);assert.ok((await f.read('groupManagement')).friendRequests.every(r=>!r.canManage));await f.cmd('resumeSafety',{revision:(await f.get('')).revision,reason:'Reprise'});const e=await episodeHarness(f);await e.close();const d=await f.read('groupManagement');assert.equal(d.closed,true);assert.ok(d.friendRequests.every(r=>!r.canManage));
 });
 test(`${prefix} : épisodes suivants conservent uniquement le dossier courant sans affectation nouvelle`,async()=>{
  const f=await groupRequestsFixture(makeStore),before=(await f.read('groupManagement')).friendRequests,e=await episodeHarness(f);await e.close();await e.resume(await e.begin());assert.deepEqual((await e.read('groupManagement')).friendRequests,before);assert.deepEqual(await f.store.list(`sessions/${e.sid}/groups`),[]);
 });
 test(`${prefix} : texte de souhait corrompu refusé sans projection de données arbitraires`,async()=>{
  const f=await groupRequestsFixture(makeStore);await f.edit(`registrations/${hash(f.player.uid)}`,r=>({...r,admission:{...r.admission,proposal:{...r.admission.proposal,friends:{uid:'SECRET_INJECTE'}}}}));await assert.rejects(f.read('groupManagement'),{code:'INVALID_ADMISSION'});
 });
 test(`${prefix} : autre session et ancienne version sans groupes restent exclues`,async()=>{
  const raw=makeStore(),f=await groupRequestsFixture(()=>raw),other=await groupRequestsFixture(()=>raw);await assert.rejects(f.read('groupManagement',{sessionId:other.sid}),{code:'FORBIDDEN'});const s=await f.get('');await f.edit('',()=>{const {groupsVersion,groupDefinitionsVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});const d=await f.read('groupManagement');assert.equal(d.closed,true);assert.equal(d.friendRequests,undefined);
 });
}
