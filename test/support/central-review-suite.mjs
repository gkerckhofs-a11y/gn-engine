import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {centralCheckFixture} from './central-check-suite.mjs';
import {centralStaffPath} from '../../src/core/central-master.mjs';

export const reviewGrant={active:true,readWorkshops:['M1','M2','M3','M4','M5','M6','M7'],editWorkshops:[],checkCentral:true,reason:'Relecture globale explicitement déléguée'};
export function centralReviewSuite(makeStore,prefix='Délégation C2b'){
 test(`${prefix} : contrôle explicite en lecture seule, sans édition ni rôle de session`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.grant(reviewGrant);await f.saveCharacter();
  const d=await f.view('M2',f.mj),r=await f.check(1,f.mj);assert.equal(d.rights.checkCentral,true);assert.equal(d.rights.manageStaff,false);assert.deepEqual(d.rights.editWorkshops,[]);assert.deepEqual(d.staff,[]);
  assert.deepEqual(r.authority,{kind:'DELEGATED',revision:1});assert.equal(r.publicationAvailable,false);assert.equal(r.workshops.length,7);assert.equal(r.diff[0].type,'character');assert.doesNotMatch(JSON.stringify(r),/Secret de fiction|Biographie fictive|@example/);
  await assert.rejects(f.save({},f.mj),{code:'FORBIDDEN'});await assert.rejects(f.saveCharacter({},f.mj),{code:'FORBIDDEN'});
  for(const action of ['session','admissionAdmin'])await assert.rejects(f.read(action,f.mj,{sessionId:f.sid}),{code:'FORBIDDEN'});
  await assert.rejects(f.cmd('setCentralStaff',{campaignId:f.cid,...reviewGrant,email:f.player.email,revision:0},f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : sept lectures ou édition ne donnent aucun contrôle implicite`,async()=>{
  const f=await centralCheckFixture(makeStore),{checkCentral,...legacy}=reviewGrant;await f.grant({...legacy,editWorkshops:['M1','M2','M4']});
  assert.equal((await f.view('M1',f.mj)).rights.checkCentral,false);await assert.rejects(f.check(0,f.mj),{code:'FORBIDDEN'});
  // A stored pre-C2b grant without the field keeps exactly the old authority.
  const path=centralStaffPath(f.cid,f.mj.email),g=await f.store.get(path);delete g.checkCentral;await f.store.runTransaction(async tx=>tx.set(path,g));
  await assert.rejects(f.check(0,f.mj),{code:'FORBIDDEN'});assert.equal((await f.view('M1',f.mj)).rights.canPublish,undefined);
 });
 test(`${prefix} : choix explicite, sept lectures et activité requis sans élargissement automatique`,async()=>{
  const f=await centralCheckFixture(makeStore);
  for(const missing of reviewGrant.readWorkshops)await assert.rejects(f.grant({...reviewGrant,readWorkshops:reviewGrant.readWorkshops.filter(w=>w!==missing)}),{code:'CENTRAL_CHECK_ACCESS_REQUIRED'});
  await assert.rejects(f.grant({...reviewGrant,active:false}),{code:'CENTRAL_CHECK_ACCESS_REQUIRED'});
  for(const checkCentral of ['true',1,null,{}])await assert.rejects(f.grant({...reviewGrant,checkCentral}),{code:'INVALID_CENTRAL_GRANT'});
  assert.equal(await f.store.get(centralStaffPath(f.cid,f.mj.email)),null);assert.equal(await f.store.get(f.base),null);
 });
 test(`${prefix} : révocation du seul contrôle conserve les lectures et bloque avant toute liste`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.grant(reviewGrant);await f.check(0,f.mj);await f.grant({...reviewGrant,revision:1,checkCentral:false});
  assert.equal((await f.view('M1',f.mj)).rights.checkCentral,false);
  const run=f.store.runTransaction.bind(f.store),lists=[];f.store.runTransaction=fn=>run(tx=>fn({...tx,list:async(...args)=>{lists.push(args[0]);return tx.list(...args);}}));
  await assert.rejects(f.check(0,f.mj),{code:'FORBIDDEN'});assert.deepEqual(lists,[]);
 });
 test(`${prefix} : désactivation par ancien client puis réactivation ne restaure pas le contrôle`,async()=>{
  const f=await centralCheckFixture(makeStore),{checkCentral,...legacy}=reviewGrant;await f.grant(reviewGrant);
  await f.grant({...legacy,active:false,revision:1});const g=await f.store.get(centralStaffPath(f.cid,f.mj.email));assert.equal(g.checkCentral,false);
  await assert.rejects(f.check(0,f.mj),{code:'FORBIDDEN'});await f.grant({...legacy,active:true,revision:2});
  await assert.rejects(f.check(0,f.mj),{code:'FORBIDDEN'});assert.equal((await f.view('M1',f.mj)).rights.checkCentral,false);
 });
 test(`${prefix} : modification active exige un choix explicite après attribution du contrôle`,async()=>{
  const f=await centralCheckFixture(makeStore),{checkCentral,...legacy}=reviewGrant;await f.grant(reviewGrant);const before=await f.store.get(centralStaffPath(f.cid,f.mj.email));
  await assert.rejects(f.grant({...legacy,revision:1}),{code:'CENTRAL_CHECK_CHOICE_REQUIRED'});
  await assert.rejects(f.grant({...reviewGrant,revision:1,readWorkshops:['M1']}),{code:'CENTRAL_CHECK_ACCESS_REQUIRED'});
  assert.deepEqual(await f.store.get(centralStaffPath(f.cid,f.mj.email)),before);
  await f.grant({...reviewGrant,revision:1,checkCentral:false,readWorkshops:['M1']});assert.deepEqual((await f.view('M1',f.mj)).rights.readWorkshops,['M1']);await assert.rejects(f.check(0,f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : compte Google vérifié, portée campagne et propriétaire courants`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.grant({...reviewGrant,email:f.mj.email.toUpperCase()});
  await f.check(0,{...f.mj,email:f.mj.email.toUpperCase()});await assert.rejects(f.check(0,{...f.mj,emailVerified:false}),{code:'LOGIN_REQUIRED'});await assert.rejects(f.check(0,f.player),{code:'FORBIDDEN'});
  const other=await f.create({creationId:randomUUID()});await assert.rejects(f.check(0,f.mj,{campaignId:other.campaignId}),{code:'FORBIDDEN'});
  const path=`campaigns/${f.cid}`,c=await f.store.get(path);await f.store.runTransaction(async tx=>tx.set(path,{...c,ownerUid:'new-owner'}));await assert.rejects(f.check(0,f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : état de délégation corrompu refusé au rapport et au tableau de bord`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.grant(reviewGrant);const path=centralStaffPath(f.cid,f.mj.email),g=await f.store.get(path);
  for(const patch of [{checkCentral:'true'},{revision:0},{revision:1.5},{readWorkshops:['M1']},{campaignId:'another'},{ownerUid:'another'}]){
   await f.store.runTransaction(async tx=>tx.set(path,{...g,...patch}));await assert.rejects(f.check(0,f.mj),{code:'FORBIDDEN'});await assert.rejects(f.read('dashboard',f.mj),{code:'FORBIDDEN'});
  }
 });
 test(`${prefix} : motif, auteur, avant et après audités sans modifier le brouillon`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.save();const before=await f.store.get(f.base),c=await f.store.get(`campaigns/${f.cid}`);
  await f.grant(reviewGrant);await f.grant({...reviewGrant,checkCentral:false,revision:1,reason:'Fin de la relecture'});
  const history=(await f.store.list(`campaigns/${f.cid}/history`)).filter(x=>x.action==='setCentralStaff'),revoked=history.find(x=>x.after.revision===2);
  assert.equal(history.length,2);assert.equal(revoked.actorUid,f.owner.uid);assert.equal(revoked.reason,'Fin de la relecture');assert.equal(revoked.before.checkCentral,true);assert.equal(revoked.after.checkCentral,false);
  assert.deepEqual(await f.store.get(f.base),before);assert.deepEqual(await f.store.get(`campaigns/${f.cid}`),c);assert.equal((await f.view()).staff[0].checkCentral,false);
 });
 test(`${prefix} : réponse perdue et ancien reçu ne restaurent pas une autorité révoquée`,async()=>{
  const f=await centralCheckFixture(makeStore),input={...reviewGrant,requestId:randomUUID()};const first=await f.grant(input);assert.deepEqual(await f.grant(input),first);
  await f.grant({...reviewGrant,checkCentral:false,revision:1});assert.deepEqual(await f.grant(input),first);
  assert.equal((await f.store.get(centralStaffPath(f.cid,f.mj.email))).checkCentral,false);await assert.rejects(f.check(0,f.mj),{code:'FORBIDDEN'});
  assert.equal((await f.store.list(`campaigns/${f.cid}/history`)).filter(x=>x.action==='setCentralStaff').length,2);
 });
 test(`${prefix} : deux changements concurrents des droits ne fusionnent pas les choix`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.grant(reviewGrant);
  const outcomes=await Promise.allSettled([f.grant({...reviewGrant,checkCentral:false,revision:1}),f.grant({...reviewGrant,editWorkshops:['M1'],revision:1})]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');
  const g=await f.store.get(centralStaffPath(f.cid,f.mj.email));assert.equal(g.revision,2);assert.deepEqual(g.editWorkshops,g.checkCentral?['M1']:[]);
  assert.equal((await f.store.list(`campaigns/${f.cid}/history`)).filter(x=>x.action==='setCentralStaff').length,2);
 });
 test(`${prefix} : empreinte stable liée au lecteur et à la révision des droits`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.grant(reviewGrant);const first=await f.check(0,f.mj);assert.deepEqual(await f.check(0,f.mj),first);
  assert.notEqual((await f.check()).fingerprint,first.fingerprint);assert.notEqual((await f.check(0,{...f.mj,uid:randomUUID()})).fingerprint,first.fingerprint);
  await f.grant({...reviewGrant,revision:1,editWorkshops:['M1']});const second=await f.check(0,f.mj);assert.notEqual(second.fingerprint,first.fingerprint);assert.equal(second.authority.revision,2);assert.equal(second.draft.revision,first.draft.revision);
  await f.grant({...reviewGrant,revision:2,checkCentral:false});await f.grant({...reviewGrant,revision:3});const third=await f.check(0,f.mj);assert.notEqual(third.fingerprint,first.fingerprint);assert.notEqual(third.fingerprint,second.fingerprint);
 });
 test(`${prefix} : contrôle concurrent à une révocation cohérent, prochain accès refusé`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.grant(reviewGrant);await f.save();const first=await f.check(1,f.mj);
  const [read,write]=await Promise.allSettled([f.check(1,f.mj),f.grant({...reviewGrant,checkCentral:false,revision:1})]);assert.equal(write.status,'fulfilled');
  if(read.status==='fulfilled')assert.deepEqual(read.value,first);else assert.equal(read.reason.code,'FORBIDDEN');await assert.rejects(f.check(1,f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : rapport délégué sans écritures ni lecture des admissions, historiques ou instances`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.grant(reviewGrant);await f.configure();await f.saveCharacter({draftRevision:1});const run=f.store.runTransaction.bind(f.store),reads=[];
  f.store.runTransaction=fn=>run(tx=>fn({...tx,get:async p=>{reads.push(p);return tx.get(p);},list:async(...args)=>{reads.push(args[0]);return tx.list(...args);},set:()=>assert.fail('Contrôle délégué en lecture seule')}));
  const r=await f.check(2,f.mj);assert.equal(r.publicationAvailable,false);assert.equal(r.diff.length,2);
  const allowed=[`campaigns/${f.cid}`,`sessions/${f.sid}`,f.base,`${f.base}/changes`,centralStaffPath(f.cid,f.mj.email)];assert.ok(reads.every(p=>allowed.includes(p)),JSON.stringify(reads));
 });
 test(`${prefix} : cycle publié et révision périmée refusés aussi au délégué`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.grant(reviewGrant);await f.save();await assert.rejects(f.check(0,f.mj),{code:'STALE_REVISION'});
  await assert.rejects(f.check(1,f.mj,{publish:true}),{code:'INVALID_CENTRAL_MASTER'});const path=`campaigns/${f.cid}`,c=await f.store.get(path);
  await f.store.runTransaction(async tx=>tx.set(path,{...c,master:{...c.master,activeVersionId:'published'}}));await assert.rejects(f.check(1,f.mj),{code:'CENTRAL_DRAFT_UNAVAILABLE'});
 });
}
