import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spaceMissionsFixture} from './space-missions-suite.mjs';
import {healthFixture} from './space-outlaws-health-suite.mjs';

export function identityNewsHealthSuite(makeStore,prefix='Identité News Santé'){
 test(`${prefix} : transmission programmée invisible avant ouverture, publique ensuite, sans candidature`,async()=>{
  const f=await spaceMissionsFixture(makeStore);
  const a=await f.announce({mode:'BULLETIN',missionId:null,sessionMission:true,rewardText:'',conditions:'',proofExpected:'',opensAt:1e12,deadline:1e12+86400000});
  assert.equal((await f.read('announcements')).announcements.length,0);
  await assert.rejects(f.read('announcementDetail',{announcementId:a.id}),{code:'FORBIDDEN'});
  f.advance(1e12);const board=await f.read('announcements');assert.equal(board.announcements.length,1);assert.equal(board.announcements[0].mode,'BULLETIN');
  assert.equal((await f.read('announcementDetail',{announcementId:a.id})).canRespond,false);
  assert.doesNotMatch(JSON.stringify(board),/SECRET_BRIEFING|SECRET_ORGANISATION|audience|missionSteps/);
  await assert.rejects(f.apply(a),{code:'ANNOUNCEMENT_CLOSED'});
 });
 test(`${prefix} : lecture universelle, candidature et contrat contrôlent la classe actuelle`,async()=>{
  const f=await spaceMissionsFixture(makeStore),c=await f.get(`characters/${f.cid}`),classId=c.abilityProfile.class.id,excluded=classId==='PIL'?'TRA':'PIL';
  const wrong=await f.announce({eligibleClassIds:[excluded]});assert.equal((await f.read('announcements')).announcements.length,1);
  assert.equal((await f.read('announcementDetail',{announcementId:wrong.id})).canRespond,false);
  await assert.rejects(f.apply(wrong),{code:'MISSION_CLASS_REQUIRED'});
  const a=await f.announce({eligibleClassIds:[classId]}),t=await f.apply(a),offer=await f.offer(t),preview=await f.read('prepareContractAcceptance',{contractId:offer.id});
  await f.edit(`characters/${f.cid}`,c=>({...c,birth:{...c.birth,classId:excluded}}));
  await assert.rejects(f.cmd('acceptContract',{contractId:offer.id,confirmation:preview.confirmation}),{code:'MISSION_CLASS_REQUIRED'});
  assert.equal((await f.contract(offer)).canAccept,false);assert.equal((await f.till()).reserved,0);
 });
 test(`${prefix} : mission libre avec récompense facultative utilise le contrat et les preuves natifs`,async()=>{
  const f=await spaceMissionsFixture(makeStore),a=await f.announce({missionId:null,sessionMission:true,rewardText:''}),t=await f.apply(a),c=await f.offer(t,{amount:0});
  await f.accept(c);assert.deepEqual((await f.contract(c)).contract.steps.map(x=>x.id),['objective']);
  await f.submit(c,{completedStepIds:['objective']});assert.equal((await f.contract(c)).contract.status,'SUBMITTED');await f.review(c);f.advance(600000);await f.settle(c);assert.equal((await f.contract(c)).contract.status,'PAID');assert.equal((await f.wallet()).balance,0);
  await assert.rejects(f.announce({missionId:null,sessionMission:true,eligibleClassIds:['ADMIN']}),{code:'INVALID_ANNOUNCEMENT_CLASSES'});
  await assert.rejects(f.announce({missionId:null,sessionMission:true,audience:{kind:'TARGETED',characterIds:[f.cid],groupIds:[]}}),{code:'SO_MISSION_UNSUPPORTED'});
 });
 test(`${prefix} : aperçu dégâts, QR soigneur et correction MJ conservent les deux compteurs`,async()=>{
  const f=await healthFixture(makeStore),base=`sessions/${f.sid}`,patch={characterId:f.tid,revision:(await f.actionRead('session',{},f.owner)).revision,healthRevision:(await f.health()).revision,hp:3,maxHp:3,protection:1,outOfCombat:false,reason:'Corriger une erreur de saisie'};
  await assert.rejects(f.actionCmd('correctHealth',patch,f.other));
  await f.actionCmd('correctHealth',patch,f.owner);
  const preview=await f.actionRead('prepareDamage',{amount:2,counted:true,damageKind:'ORDINARY',secondsSinceDown:0},f.other);
  assert.equal(preview.before.protection,1);assert.equal(preview.after.protection,0);assert.equal(preview.after.hp,2);
  await f.damage(2);const scanned=await f.actionRead('personTarget',{targetId:f.tid});assert.equal(scanned.target.hp,2);assert.equal(scanned.target.protection,0);
  const a=await f.startCare();f.advance(105000);await f.finishCare(a);assert.equal((await f.health()).hp,3);assert.equal((await f.health()).protection,0);
  const history=await f.store.list(`${base}/characters/${f.tid}/healthHistory`);assert.ok(history.some(x=>x.kind==='GM'&&x.after.protection===1&&x.reason===patch.reason));
  await assert.rejects(f.actionCmd('correctHealth',{...patch,revision:(await f.actionRead('session',{},f.owner)).revision,healthRevision:(await f.health()).revision,protection:2},f.owner),{code:'INVALID_HEALTH'});
 });
 async function armorFixture(){
  const f=await healthFixture(makeStore,{classId:'COM'}),base=`sessions/${f.sid}`;
  // Fixture publishes explicit armour / plate references, not name-based matching.
  await f.store.runTransaction(async tx=>{
   const c=await tx.get(`${base}/characters/${f.cid}`),lots=await tx.list(`${base}/inventory`);
   const armor=lots.find(l=>l.holderId===f.tid&&l.item.id==='kit_armor');assert.ok(armor);
   tx.set(`${base}/items/test-plate`,{id:'test-plate',name:'Plaque de test',versionId:c.birth.versionId,consumable:true,kind:'STACK',unit:'plaque'});
   const exemplar=lots.find(l=>l.holderId===f.cid);
   tx.set(`${base}/inventory/test-plate`,{...exemplar,id:'test-plate',quantity:2,item:{id:'test-plate',name:'Plaque de test',consumable:true,kind:'STACK',unit:'plaque'},status:'AVAILABLE',revision:1});
   tx.set(`${base}/characters/${f.cid}`,{...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills,{id:'ENTRETIEN_PROTECTION',name:'Entretien de protection',kind:'PASSIVE',level:1}]}});
  });
  const p=await f.actionCmd('savePersonProfile',{profile:{kind:'PROTECTION',protectedItemId:'kit_armor',consumable:{itemId:'test-plate'},publicationState:'PUBLISHED'},revision:0,reason:'Associer armure et plaque homologuées'},f.owner);
  const input={targetId:f.tid,profileId:p.id,supplyLots:{'test-plate':'test-plate'}};
  const prepare=()=>f.actionRead('preparePersonAction',input),start=async()=>f.actionCmd('startPersonAction',{...input,confirmation:(await prepare()).confirmation,present:true});
  return {...f,base,p,input,prepare,start};
 }
 test(`${prefix} : réparation armure consomme une plaque et 1 PA, sans soin, avec durée et récupération`,async()=>{
  const f=await armorFixture();await assert.rejects(f.prepare(),{code:'NO_PROTECTION_NEEDED'});await f.damage(2);const hpBefore=(await f.health()).hp;
  const p=await f.prepare();assert.equal(p.durationSeconds,120);assert.equal(p.cost,1);
  const a=await f.start();await assert.rejects(f.finishCare(a),{code:'FIELD_TOO_EARLY'});f.advance(120000);
  const requestId=randomUUID(),r=await f.finishCare(a,f.player,{requestId});assert.equal(r.result.protection,1);assert.equal((await f.health()).hp,hpBefore);
  assert.equal((await f.store.get(`${f.base}/inventory/test-plate`)).quantity,1);assert.equal((await f.points()).available,4);
  assert.deepEqual(await f.finishCare(a,f.player,{requestId}),r);await f.damage();await assert.rejects(f.prepare(),{code:'COOLDOWN_ACTIVE'});
 });
 test(`${prefix} : annulation de réparation restitue les réservations ; compétence absente et faux équipement refusés`,async()=>{
  const f=await armorFixture();await f.damage();const a=await f.start();await f.cancelCare(a);assert.equal((await f.points()).reserved,0);assert.equal((await f.store.get(`${f.base}/inventory/test-plate`)).quantity,2);assert.equal((await f.health()).protection,0);
  await f.store.runTransaction(async tx=>{const c=await tx.get(`${f.base}/characters/${f.cid}`);tx.set(`${f.base}/characters/${f.cid}`,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.filter(s=>s.id!=='ENTRETIEN_PROTECTION')}});});
  await assert.rejects(f.prepare(),{code:'FIELD_SKILL_REQUIRED'});
  await assert.rejects(f.actionCmd('savePersonProfile',{profile:{kind:'PROTECTION',protectedItemId:'missing',consumable:{itemId:'test-plate'},publicationState:'PUBLISHED'},revision:0,reason:'Test refus'},f.owner),{code:'FIELD_REFERENCE'});
 });
}
