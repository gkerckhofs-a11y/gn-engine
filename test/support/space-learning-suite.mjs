import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
import {successionFixture} from './space-succession-suite.mjs';
import {learningSkill,learningAbilityProfile} from '../../src/shared/space-outlaws-learning.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
export async function learningFixture(makeStore,{episodes=1,classId='COM'}={}){
 const f=await actionsFixture(makeStore,{classId}),e=await episodeHarness(f),cid=(await f.actionRead('mySession')).character.id;
 const cycle=async()=>{await e.stage('EN_JEU');await e.close({participantUids:[f.player.uid]});await e.resume(await e.begin());};
 for(let n=0;n<episodes;n++)await cycle();
 const read=(a,p={},actor=f.player)=>e.read(a,p,actor),cmd=(a,p={},actor=f.player)=>e.cmd(a,p,actor);
 const input=(skillId,replaceId)=>({characterId:cid,skillId,...(replaceId?{replaceId}:{})});
 const preview=(id,replace)=>read('prepareSoLearning',input(id,replace));
 const learn=async(id,replace)=>{const p=await preview(id,replace);return cmd('learnSoSkill',{...input(id,replace),confirmation:p.confirmation});};
 const authorize=(id,replace)=>cmd('authorizeSoLearning',{...input(id,replace),uid:f.player.uid,kind:replace?'RETRAIN':'RARE',reason:'Formation reconnue par la régie'},f.owner);
 const edit=(path,fn)=>f.store.runTransaction(async tx=>{const p=`sessions/${e.sid}/${path}`,old=await tx.get(p);tx.set(p,fn(old));});
 const addSkills=async(ids)=>edit(`characters/${cid}`,c=>{const skills=c.spaceOutlawsSkills.skills.concat(ids.map(id=>{const d=learningSkill(id);return {id,name:d.name,kind:d.kind,source:'LEARNED',level:d.kind==='FIXED'?null:1};})),profile={...c.spaceOutlawsSkills,skills,secondarySlotsUsed:skills.filter(k=>k.source!=='CLASS').length};return {...c,spaceOutlawsSkills:profile,abilityProfile:learningAbilityProfile(profile,c.abilityProfile)};});
 return {f,e,cid,read,cmd,input,preview,learn,authorize,edit,cycle,addSkills,character:()=>e.get(`characters/${cid}`),registration:()=>e.get(`registrations/${hash(f.player.uid)}`)};
}
export function spaceLearningSuite(makeStore,prefix='Apprentissage SO'){
 test(`${prefix} : achat ordinaire après clôture, solde débité et patrimoine intact`,async()=>{
  const f=await learningFixture(makeStore),before=await f.character(),wallet=await f.e.get(`accounts/${accountId(f.cid)}`),ap=await f.e.get(`characters/${f.cid}/resources/actionPoints`),lots=await f.f.store.list(`sessions/${f.e.sid}/inventory`);
  const p=await f.preview('TRA-01');assert.equal(p.cost,2);assert.equal(p.xpBefore,3);assert.equal(p.xpAfter,1);await f.learn('TRA-01');const c=await f.character();
  assert.equal(c.xp,1);assert.equal(c.earnedXp,3);assert.equal(c.spaceOutlawsSkills.secondarySlotsUsed,2);assert.equal(c.abilityProfile.skills.find(k=>k.id==='TRA-01').level,1);
  for(const key of ['hp','maxHp','protection','globalLevel','assignedUid','publicCode'])assert.equal(c[key],before[key]);assert.deepEqual(await f.e.get(`accounts/${accountId(f.cid)}`),wallet);assert.deepEqual(await f.e.get(`characters/${f.cid}/resources/actionPoints`),ap);assert.deepEqual(await f.f.store.list(`sessions/${f.e.sid}/inventory`),lots);
  assert.equal((await f.read('mySession')).character.spaceOutlawsSkills.skills.find(k=>k.id==='TRA-01').level,1);assert.equal((await f.registration()).progression.learningSessionId,f.e.sid);
 });
 test(`${prefix} : augmentation N2 vers N3 à 6 XP utilisée par les actions natives`,async()=>{
  const f=await learningFixture(makeStore,{episodes:2});const p=await f.preview('COM-03');assert.equal(p.cost,6);assert.equal(p.skill.level,3);await f.learn('COM-03');await f.e.stage('EN_JEU');
  const q=await f.read('prepareFieldAction',{targetId:'scene',kind:'ANALYZE'});assert.equal(q.level,3);assert.equal(q.durationSeconds,90);assert.equal((await f.character()).earnedXp,6);
  const a=await f.cmd('startFieldAction',{targetId:'scene',kind:'ANALYZE',present:true,confirmation:q.confirmation});f.f.advance(90000);const result=await f.cmd('finishFieldAction',{actionId:a.id,present:true});assert.deepEqual(result.result.information.map(k=>k.id),['ordinary','higher']);
 });
 test(`${prefix} : double clic, concurrence et nouvel identifiant ne doublent jamais le choix`,async()=>{
  const f=await learningFixture(makeStore),p=await f.preview('TRA-01'),q=await f.preview('PIL-01'),a={...f.input('TRA-01'),confirmation:p.confirmation,requestId:randomUUID()},b={...f.input('PIL-01'),confirmation:q.confirmation,requestId:randomUUID()};
  const results=await Promise.allSettled([f.cmd('learnSoSkill',a),f.cmd('learnSoSkill',b)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);const win=results[0].status==='fulfilled'?a:b;assert.deepEqual(await f.cmd('learnSoSkill',win),results.find(x=>x.status==='fulfilled').value);assert.equal((await f.character()).xp,1);
  await assert.rejects(f.preview('FIL-01'),{code:'SO_LEARNING_USED'});await assert.rejects(f.cmd('learnSoSkill',{...win,skillId:'INF-02'}),{code:'REQUEST_ID_REUSED'});
 });
 test(`${prefix} : aucun achat à la naissance, en jeu, en pause, sous STOP ou après décès`,async()=>{
  const f=await learningFixture(makeStore,{episodes:0});await assert.rejects(f.preview('TRA-01'),{code:'SO_LEARNING_CLOSED'});await f.cycle();await f.e.stage('EN_JEU');await assert.rejects(f.preview('TRA-01'),{code:'SO_LEARNING_CLOSED'});await f.e.stage('PAUSE');await assert.rejects(f.preview('TRA-01'),{code:'SO_LEARNING_CLOSED'});
  await f.e.close({participantUids:[f.f.player.uid]});await f.e.resume(await f.e.begin());await f.f.store.runTransaction(async tx=>{const path=`sessions/${f.e.sid}`,s=await tx.get(path);tx.set(path,{...s,safetyStop:{active:true}});});await assert.rejects(f.preview('TRA-01'),{code:'SO_SAFETY_STOP'});
  await f.f.store.runTransaction(async tx=>{const path=`sessions/${f.e.sid}`,s=await tx.get(path);tx.set(path,{...s,safetyStop:{active:false}});});await f.edit(`characters/${f.cid}`,c=>({...c,survival:{dead:true}}));await assert.rejects(f.preview('TRA-01'),{code:'SO_LEARNING_DEAD'});
 });
 test(`${prefix} : coûts et paliers serveur, capacités exclusives et Force refusées`,async()=>{
  const f=await learningFixture(makeStore);await assert.rejects(f.preview('COM-03'),{code:'SO_LEARNING_XP'});
  for(const id of ['ROG-01','FOR-01','PNJ_FORCE_SENSITIVE'])await assert.rejects(f.preview(id),e=>['SO_LEARNING_CLASS_ONLY','INVALID_ADMISSION_CHOICE'].includes(e.code));
  for(const extra of [{level:5},{cost:0},{xp:100},{uid:f.f.other.uid},{unlocked:true}])await assert.rejects(f.read('prepareSoLearning',{...f.input('TRA-01'),...extra}),{code:'INVALID_ADMISSION'});
  await f.edit(`characters/${f.cid}`,c=>{const p={...c.spaceOutlawsSkills,skills:c.spaceOutlawsSkills.skills.map(k=>k.id==='COM-03'?{...k,level:5}:k)};return {...c,xp:100,spaceOutlawsSkills:p,abilityProfile:learningAbilityProfile(p,c.abilityProfile)};});await assert.rejects(f.preview('COM-03'),{code:'SO_LEARNING_MAX'});
 });
 test(`${prefix} : rare débloquée par MJ, XP obligatoires et formation conservée`,async()=>{
  const f=await learningFixture(makeStore);await assert.rejects(f.preview('SABOTAGE'),{code:'SO_LEARNING_RARE'});await assert.rejects(f.cmd('authorizeSoLearning',{...f.input('SABOTAGE'),uid:f.f.player.uid,kind:'RARE',reason:'Je décide'}),{code:'FORBIDDEN'});
  await f.authorize('SABOTAGE');assert.equal((await f.character()).xp,3);assert.ok(!(await f.character()).spaceOutlawsSkills.skills.some(k=>k.id==='SABOTAGE'));await f.learn('SABOTAGE');await f.cycle();const p=await f.preview('SABOTAGE');assert.equal(p.cost,4);assert.equal(p.skill.level,2);await f.learn('SABOTAGE');assert.equal((await f.character()).xp,0);
  assert.doesNotMatch(JSON.stringify(await f.read('mySoLearning')),/actorUid|Formation reconnue|gmNotes|VERITE_MJ/);
 });
 test(`${prefix} : cinq places secondaires, initiation et technique fixe comprises`,async()=>{
  const f=await learningFixture(makeStore);await f.addSkills(['TRA-01','PIL-01','INF-02']);await f.edit(`characters/${f.cid}`,c=>({...c,xp:20}));await f.learn('GARDE_DU_CORPS');assert.equal((await f.character()).spaceOutlawsSkills.secondarySlotsUsed,5);assert.equal((await f.character()).xp,16);await f.cycle();
  await assert.rejects(f.preview('FIL-01'),{code:'SO_LEARNING_FULL'});assert.equal((await f.preview('MED-02')).cost,4);await assert.rejects(f.preview('GARDE_DU_CORPS'),{code:'SO_LEARNING_MAX'});
 });
 test(`${prefix} : PIL-03 exige PIL-02, et reconversion ne retire pas ce prérequis`,async()=>{
  const f=await learningFixture(makeStore);await assert.rejects(f.preview('PIL-03'),{code:'SO_LEARNING_PREREQUISITE'});await f.learn('PIL-02');await f.cycle();await f.learn('PIL-03');await f.cycle();
  await assert.rejects(f.authorize('TRA-01','PIL-02'),{code:'SO_LEARNING_PREREQUISITE'});assert.ok((await f.character()).spaceOutlawsSkills.skills.some(k=>k.id==='PIL-02'));
 });
 test(`${prefix} : reconversion précise consentie, aucun remboursement ni initiation gratuite`,async()=>{
  const f=await learningFixture(makeStore);await assert.rejects(f.preview('TRA-01','MED-02'),{code:'SO_LEARNING_RETRAIN'});await f.authorize('TRA-01','MED-02');assert.equal((await f.character()).xp,3);await assert.rejects(f.preview('INF-02','MED-02'),{code:'SO_LEARNING_RETRAIN'});
  const p=await f.preview('TRA-01','MED-02');assert.equal(p.cost,2);assert.equal(p.secondarySlotsUsed,1);await f.learn('TRA-01','MED-02');const c=await f.character();assert.equal(c.xp,1);assert.ok(!c.abilityProfile.skills.some(s=>s.id==='MED-02'));assert.equal(c.spaceOutlawsSkills.skills.find(s=>s.id==='TRA-01').source,'LEARNED');await assert.rejects(f.preview('TRA-01'),{code:'SO_LEARNING_USED'});
 });
 test(`${prefix} : reconversion bloquée par activité ou réserve PA et autorisation périmée`,async()=>{
  const f=await learningFixture(makeStore);await f.authorize('TRA-01','MED-02');await f.edit(`characters/${f.cid}/resources/actionPoints`,p=>({...p,reserved:1,available:4}));await assert.rejects(f.preview('TRA-01','MED-02'),{code:'SO_LEARNING_BUSY'});await f.edit(`characters/${f.cid}/resources/actionPoints`,p=>({...p,reserved:0,available:5}));
  await f.edit(`characters/${f.cid}`,c=>({...c,activeVoyageId:'voyage'}));await assert.rejects(f.preview('TRA-01','MED-02'),{code:'SO_LEARNING_BUSY'});await f.edit(`characters/${f.cid}`,c=>({...c,activeVoyageId:null}));await f.addSkills(['PIL-01']);await assert.rejects(f.preview('TRA-01','MED-02'),{code:'SO_LEARNING_RETRAIN'});
 });
 test(`${prefix} : droits courants et révocation contrôlés avant retour du reçu`,async()=>{
  const f=await learningFixture(makeStore),p=await f.preview('TRA-01'),input={...f.input('TRA-01'),confirmation:p.confirmation,requestId:randomUUID()};
  await assert.rejects(f.read('mySoLearning',{},f.f.other),{code:'FORBIDDEN'});await assert.rejects(f.read('soLearningAdmin'),{code:'FORBIDDEN'});await assert.rejects(f.read('mySoLearning',{},null),{code:'LOGIN_REQUIRED'});await f.cmd('learnSoSkill',input);await f.e.cmd('revokeAccess',{uid:f.f.player.uid});await assert.rejects(f.cmd('learnSoSkill',input),{code:'FORBIDDEN'});
 });
 test(`${prefix} : aperçu périmé, ancien marqueur et fiche incohérente refusés`,async()=>{
  const f=await learningFixture(makeStore),p=await f.preview('TRA-01');await f.edit(`characters/${f.cid}`,c=>({...c,xp:4}));await assert.rejects(f.cmd('learnSoSkill',{...f.input('TRA-01'),confirmation:p.confirmation}),{code:'SO_LEARNING_STALE'});
  await f.edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[]}}));await assert.rejects(f.preview('TRA-01'),{code:'SO_LEARNING_PROFILE'});
  await f.f.store.runTransaction(async tx=>{const path=`sessions/${f.e.sid}`,s=await tx.get(path),{learningVersion,...spaceOutlaws}=s.spaceOutlaws;tx.set(path,{...s,spaceOutlaws});});await assert.rejects(f.read('mySoLearning'),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : interruption atomique puis reprise conserve XP, profil et plafond`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})};const f=await learningFixture(()=>store),p=await f.preview('TRA-01'),input={...f.input('TRA-01'),confirmation:p.confirmation,requestId:randomUUID()};fail=true;await assert.rejects(f.cmd('learnSoSkill',input),/INTERRUPTION/);fail=false;
  assert.equal((await f.character()).xp,3);assert.equal((await f.registration()).progression.learningSessionId,undefined);await f.cmd('learnSoSkill',input);await f.cycle();assert.equal((await f.character()).xp,4);assert.equal((await f.character()).earnedXp,6);await f.learn('TRA-01');assert.equal((await f.character()).xp,0);
 });
 test(`${prefix} : relève conserve le plafond du participant et exclut les formations du défunt`,async()=>{
  const f=await successionFixture(makeStore,{dead:false}),e=await episodeHarness(f);await e.close({participantUids:[f.player.uid]});await e.resume(await e.begin());const input={characterId:f.cid,skillId:'TRA-01'},p=await e.read('prepareSoLearning',input,f.player);await e.cmd('learnSoSkill',{...input,confirmation:p.confirmation},f.player);
  await f.store.runTransaction(async tx=>{const path=`sessions/${e.sid}/characters/${f.cid}`,c=await tx.get(path);tx.set(path,{...c,survival:{dead:true},hp:0,learningUnlocks:{SABOTAGE:{unlocked:true}}});});const q=await e.read('prepareSpaceOutlawsSuccession',f.input());const result=await e.cmd('succeedSpaceOutlawsCharacter',{...f.input(),confirmation:q.confirmation,reason:'Relève en intersession'});
  assert.equal((await e.get(`characters/${result.characterId}`)).learningUnlocks,undefined);await assert.rejects(e.read('prepareSoLearning',{characterId:result.characterId,skillId:'TRA-01'},f.player),{code:'SO_LEARNING_USED'});assert.equal((await e.read('mySoLearning',{},f.player)).lastLearning,null);
 });
 test(`${prefix} : les cinq paliers coûtent 30 XP au total sans saut ni niveau six`,async()=>{
  const f=await learningFixture(makeStore);await f.edit(`characters/${f.cid}`,c=>({...c,xp:50}));let spent=0;
  for(const [level,cost] of [[1,2],[2,4],[3,6],[4,8],[5,10]]){const p=await f.preview('FIL-01');assert.equal(p.skill.level,level);assert.equal(p.cost,cost);spent+=p.cost;await f.learn('FIL-01');if(level<5)await f.cycle();}
  assert.equal(spent,30);assert.equal((await f.character()).xp,32);await f.cycle();await assert.rejects(f.preview('FIL-01'),{code:'SO_LEARNING_MAX'});
 });
 test(`${prefix} : Désarmement hors classe à 4 XP sans Vétéran, kit ou PV supplémentaire`,async()=>{
  const f=await learningFixture(makeStore,{classId:'ROG',episodes:2}),p=await f.preview('COM-02');assert.equal(p.cost,4);assert.equal(p.skill.level,null);await f.learn('COM-02');const c=await f.character();assert.equal(c.xp,2);assert.equal(c.hp,3);assert.equal(c.spaceOutlawsSkills.classId,'ROG');assert.ok(!c.spaceOutlawsSkills.skills.some(k=>k.id==='COM-01'));
 });
 test(`${prefix} : ancienne publication sans marqueur ne reçoit aucun apprentissage implicite`,async()=>{
  const f=await actionsFixture(makeStore,{release:false}),released=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${released.versionId}`;
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await f.store.runTransaction(async tx=>{const {learningVersion,manifestDigest,...old}=await tx.get(path);tx.set(path,{...old,manifestDigest:hash(JSON.stringify(canonical(old)))});});await f.birth(await f.birthPreview());
  assert.equal((await f.actionRead('mySession')).session.spaceOutlaws.learningVersion,undefined);await assert.rejects(f.actionRead('mySoLearning'),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : accueil exclu et mandat MJ révoqué avant le reçu de formation`,async()=>{
  const f=await learningFixture(makeStore),mj=f.f.mj;
  const role=async(role,active=true)=>f.e.cmd('setStaff',{email:mj.email,role,active,revision:(await f.e.get('')).revision,reason:'Mandat apprentissage'});
  const input={...f.input('SABOTAGE'),uid:f.f.player.uid,kind:'RARE',reason:'Formation reconnue',requestId:randomUUID()};await role('RECEPTION');await assert.rejects(f.cmd('authorizeSoLearning',input,mj),{code:'FORBIDDEN'});await role('MJ');await f.cmd('authorizeSoLearning',input,mj);await role('MJ',false);await assert.rejects(f.cmd('authorizeSoLearning',input,mj),{code:'FORBIDDEN'});
 });

}
