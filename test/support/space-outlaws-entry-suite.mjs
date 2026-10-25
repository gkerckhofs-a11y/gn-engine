import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {admissionM2Fixture} from './admission-m2-suite.mjs';
import {centralTestItem} from './central-master-suite.mjs';
import {initialClassKit} from '../../src/shared/initial-class-kit.mjs';
import {admissionClasses} from '../../src/shared/admission-rules.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {actionPointPath} from '../../src/core/action-point-state.mjs';

export async function entryFixture(makeStore,{classId='COM',nature='HUMANOID'}={}){
 const f=await admissionM2Fixture(makeStore,{proposal:{classId,secondaryId:classId==='MED'?'COM-03':'MED-02',speciesId:nature==='DROID'?'droid-test':'species-test'}});
 const m2=await f.prepare(await f.preview());let revision=m2.draftRevision;
 const kit=initialClassKit(classId),bindings=[];
 for(const slot of kit.slots){
  const itemId=`kit_${slot.id}`;bindings.push({slotId:slot.id,itemId});
  await f.cc('saveCentralItem',{itemId,itemRevision:0,draftRevision:revision++,item:{...centralTestItem,name:slot.label,kind:slot.requiresConsumable?'STACKABLE':'INDIVIDUAL',consumable:slot.requiresConsumable,pillable:true},reason:'Kit de recette'});
 }
 await f.cc('saveCentralClassKit',{classKitId:classId,classKitRevision:0,draftRevision:revision,classKit:{bindings,gmNotes:'Note MJ cachée'},reason:'Kit canonique'});
 const options={weaponApplicable:true,startingInformation:['PIL','COU'].includes(classId)?'Informations fictives remises par le MJ':''};
 const releasePreview=()=>f.read('previewSpaceOutlawsRelease');
 const release=(p,extra={},actor=f.owner)=>f.cmd('releaseSpaceOutlaws',{confirmation:p.confirmation,reason:'Version de recette',...extra},actor);
 const birthPreview=(actor=f.owner,patch={})=>f.read('previewSpaceOutlawsBirth',actor,{uid:f.player.uid,options,...patch});
 const birth=(p,extra={},actor=f.owner)=>f.cmd('birthSpaceOutlaws',{uid:f.player.uid,options,confirmation:p.confirmation,reason:'Naissance de recette',...extra},actor);
 return {...f,m2,options,releasePreview,release,birthPreview,birth};
}
export function spaceOutlawsEntrySuite(makeStore,prefix='Entrée SPACE OUTLAWS'){
 test(`${prefix} : publication globale puis naissance et fiche privée, sans double dotation`,async()=>{
  const f=await entryFixture(makeStore),p=await f.releasePreview();assert.deepEqual(p.blockers,[]);assert.equal(p.canRelease,true);
  const out=await f.release(p);assert.ok(out.versionId);for(const name of ['characters','inventory','accounts','ledger'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${name}`),[]);
  assert.deepEqual(await f.release(p),out);const b=await f.birthPreview();assert.equal(b.hp,4);assert.equal(b.actionPoints,5);assert.equal(b.protectedCredits,200);
  const requestId=randomUUID(),born=await f.birth(b,{requestId}),me=await f.read('mySession',f.player);
  assert.equal(me.character.id,born.characterId);assert.equal(me.character.displayName,'Ari Test');assert.equal(me.character.hp,4);assert.equal(me.character.protection,1);assert.equal(me.actionPoints.available,5);assert.equal(me.session.stage,'BRIEFING');
  assert.equal(me.character.spaceOutlawsSkills.skills.length,4);assert.equal(me.character.spaceOutlawsSkills.skills[0].level,null);
  assert.doesNotMatch(JSON.stringify(me.character),/Note MJ|actorUid|assignedUid|friends|email|versionId/);
  const balance=await f.store.get(`sessions/${f.sid}/accounts/${accountId(born.characterId)}`);assert.equal(balance.balance,0);assert.equal(balance.protectedCredits,200);
  const lots=await f.store.list(`sessions/${f.sid}/inventory`);assert.equal(lots.length,4);assert.ok(lots.every(l=>!l.pillable&&!l.transferable&&!l.resellable));
  const before=await f.store.get(actionPointPath(f.sid,born.characterId));assert.deepEqual(await f.birth(b,{requestId}),born);assert.equal((await f.birth(b)).alreadyBorn,true);assert.deepEqual(await f.store.get(actionPointPath(f.sid,born.characterId)),before);assert.equal((await f.store.list(`sessions/${f.sid}/inventory`)).length,4);
  const badge=await f.read('publicBadge',null,{characterId:born.characterId});assert.equal(badge.displayName,'Ari Test');assert.doesNotMatch(JSON.stringify(badge),/biography|email|uid|secrets|classId|protectedCredits/);
  assert.equal((await f.read('mySpaceOutlawsEntry',f.player)).accessActive,true);await assert.rejects(f.read('mySpaceOutlawsEntry',f.other),{code:'FORBIDDEN'});
  await f.cmd('confirmBriefing',{},f.player);assert.ok((await f.read('mySession',f.player)).registration.briefingReadAt);
 });
 test(`${prefix} : les huit classes et les droïdes reçoivent leurs quantités exactes`,async()=>{
  for(const {id} of admissionClasses){const f=await entryFixture(makeStore,{classId:id,nature:'DROID'});await f.release(await f.releasePreview());const p=await f.birthPreview();await f.birth(p);const me=await f.read('mySession',f.player);assert.equal(me.character.nature,'DROID');assert.equal(me.character.hp,id==='COM'?4:3);assert.equal(me.character.spaceOutlawsSkills.skills.length,4);const lots=await f.store.list(`sessions/${f.sid}/inventory`);for(const slot of initialClassKit(id).slots)assert.equal(lots.filter(l=>l.origin.slotId===slot.id).reduce((n,l)=>n+l.quantity,0),slot.quantity);}
 });
 test(`${prefix} : absence de publication, références et domaines non raccordés bloquent sans effet`,async()=>{
  const f=await entryFixture(makeStore);await assert.rejects(f.birthPreview(),{code:'SO_RELEASE_REQUIRED'});
  const view=await f.central('centralMaster',{workshop:'M1'});await f.cc('archiveCentralItem',{itemId:'kit_communicator',itemRevision:1,draftRevision:view.draft.revision,reason:'Archive'});const p=await f.releasePreview();assert.equal(p.canRelease,false);assert.ok(p.blockers.length);await assert.rejects(f.release(p),{code:'SO_RELEASE_BLOCKED'});assert.equal((await f.store.list(`campaigns/${f.campaignId}/versions`)).length,0);
 });
 test(`${prefix} : droits courants, réception exclue et révocation avant reçu`,async()=>{
  const f=await entryFixture(makeStore),p=await f.releasePreview();for(const actor of [f.player,f.other])await assert.rejects(f.release(p,{},actor),{code:'FORBIDDEN'});
  await f.role();await assert.rejects(f.read('previewSpaceOutlawsRelease',f.mj),{code:'FORBIDDEN'});await f.release(await f.releasePreview());
  const b=await f.birthPreview(f.mj),requestId=randomUUID();await f.birth(b,{requestId},f.mj);
  // Staff management has no resource mutation; revocation must remain available.
  const s=await f.read('session');await f.cmd('setStaff',{email:f.mj.email,role:'MJ',active:false,revision:s.revision,reason:'Révocation'});
  await assert.rejects(f.birth(b,{requestId},f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : un autre compte et des paramètres modifiés invalident la confirmation`,async()=>{
  const f=await entryFixture(makeStore);await f.role();await f.release(await f.releasePreview());const b=await f.birthPreview();await assert.rejects(f.birth(b,{},f.mj),{code:'SO_ENTRY_STALE'});await assert.rejects(f.birth(b,{options:{...f.options,weaponApplicable:false}}),{code:'SO_ENTRY_STALE'});assert.deepEqual(await f.store.list(`sessions/${f.sid}/characters`),[]);
 });
 test(`${prefix} : accès révoqué jamais réactivé par une nouvelle naissance`,async()=>{
  const f=await entryFixture(makeStore);await f.release(await f.releasePreview());const b=await f.birthPreview(),born=await f.birth(b);await f.cmd('revokeAccess',{uid:f.player.uid});const retry=await f.birth(b);assert.equal(retry.accessActive,false);assert.equal((await f.read('mySession',f.player)).character,null);assert.equal((await f.store.get(`sessions/${f.sid}/accounts/${accountId(born.characterId)}`)).protectedCredits,200);
 });
 test(`${prefix} : deux naissances concurrentes créent une seule incarnation`,async()=>{
  const f=await entryFixture(makeStore);await f.release(await f.releasePreview());const p=await f.birthPreview();const results=await Promise.all([f.birth(p),f.birth(p)]);assert.equal(results[0].characterId,results[1].characterId);assert.equal((await f.store.list(`sessions/${f.sid}/characters`)).length,1);assert.equal((await f.store.list(`sessions/${f.sid}/accounts`)).length,1);
 });
 test(`${prefix} : données figées intègres, quotas revérifiés et arme facultative explicite`,async()=>{
  const f=await entryFixture(makeStore);await f.release(await f.releasePreview());const p=await f.birthPreview(f.owner,{options:{...f.options,weaponApplicable:false}});await f.birth(p,{options:p.options});assert.ok((await f.store.list(`sessions/${f.sid}/inventory`)).every(l=>l.origin.slotId!=='weapon'));
  const g=await entryFixture(makeStore);const released=await g.release(await g.releasePreview()),path=`campaigns/${g.campaignId}/versions/${released.versionId}/pages/0`,page=await g.store.get(path);await g.store.runTransaction(async tx=>tx.set(path,{...page,entries:[]}));await assert.rejects(g.birthPreview(),{code:'SO_VERSION_INVALID'});
 });
 test(`${prefix} : anciens éditeurs et lancement du jeu ne peuvent modifier cette incarnation`,async()=>{
  const f=await entryFixture(makeStore);await f.release(await f.releasePreview());await f.birth(await f.birthPreview());const s=await f.read('session');await assert.rejects(f.cmd('setStage',{revision:s.revision,stage:'EN_JEU'}),{code:'SO_GAMEPLAY_NOT_OPEN'});assert.equal((await f.read('session')).stage,'BRIEFING');
 });
 test(`${prefix} : plusieurs joueurs gardent des incarnations et dotations distinctes`,async()=>{
  const f=await entryFixture(makeStore),session=await f.read('session'),view=await f.view(),draftRevision=view.draft.revision;
  await f.begin(f.token,f.other,{sessionRevision:session.revision,draftRevision});
  await f.save({sessionRevision:session.revision,draftRevision,proposal:{firstName:'Bela',lastName:'Test',speciesId:'species-test',classId:'COM',secondaryId:'MED-02',background:'Autre fiction',friends:''}},f.other);
  await f.cmd('reviewAdmission',{uid:f.other.uid,revision:2,policyRevision:1,draftRevision,decision:'APPROVE',reason:'Deuxième place'});
  const m2=await f.read('previewAdmissionM2',f.owner,{uid:f.other.uid});await f.prepare(m2,{uid:f.other.uid});
  await f.release(await f.releasePreview());await f.birth(await f.birthPreview());
  const p=await f.birthPreview(f.owner,{uid:f.other.uid});await f.birth(p,{uid:f.other.uid});
  const first=await f.read('mySession',f.player),second=await f.read('mySession',f.other);assert.notEqual(first.character.id,second.character.id);assert.equal(second.character.displayName,'Bela Test');assert.equal(second.character.biography,'Autre fiction');assert.equal(second.actionPoints.available,5);assert.equal((await f.read('session')).accepted,2);assert.equal((await f.store.list(`sessions/${f.sid}/accounts`)).length,2);
 });
 test(`${prefix} : interruption de naissance annule ressources, accès et transition`,async()=>{
  const raw=makeStore();let fail=false;
  const wrapped={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:callback=>raw.runTransaction(async tx=>{const result=await callback(tx);if(fail)throw new Error('INTERRUPTION');return result;})};
  const f=await entryFixture(()=>wrapped);await f.release(await f.releasePreview());const p=await f.birthPreview(),requestId=randomUUID();fail=true;await assert.rejects(f.birth(p,{requestId}),/INTERRUPTION/);fail=false;assert.equal((await f.read('session')).stage,'PREPARATION');for(const name of ['characters','accounts','inventory','ledger'])assert.deepEqual(await raw.list(`sessions/${f.sid}/${name}`),[]);await f.birth(p,{requestId});assert.ok((await f.read('mySession',f.player)).character);
 });
 test(`${prefix} : aperçu global périmé et quota corrompu refusés sans création`,async()=>{
  const f=await entryFixture(makeStore),p=await f.releasePreview(),s=await f.read('session');await f.cmd('setStaff',{email:f.mj.email,role:'MJ',active:true,revision:s.revision,reason:'Équipe'});await assert.rejects(f.release(p),{code:'SO_ENTRY_STALE'});await f.release(await f.releasePreview());
  const path=`sessions/${f.sid}/admission/occupancy`,counts=await f.store.get(path);await f.store.runTransaction(async tx=>tx.set(path,{...counts,byClass:{...counts.byClass,COM:0,ROG:1}}));await assert.rejects(f.birthPreview(),{code:'ADMISSION_ACCOUNTING_CONFLICT'});assert.deepEqual(await f.store.list(`sessions/${f.sid}/characters`),[]);
 });

}
