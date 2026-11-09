import test from 'node:test';
import assert from 'node:assert/strict';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';

export async function intrusionFixture(makeStore,{minLevel=1,threshold=6}={}){
 const f=await actionsFixture(makeStore,{classId:'INF',release:false});
 const d=await f.view();
 const target={kind:'INTRUSION',title:'Serrure de cantina',description:'Une serrure fictive portant le QR du jeu.',
  gmNotes:'SECRET_MJ',profiles:{},rewards:[],intrusion:{category:'LOCK',minLevel,threshold,
   successText:'LE_PASSAGE_FICTIF_EST_AUTORISE',failureText:'La serrure fictive résiste.'}};
 await f.cc('saveCentralFieldTarget',{fieldTargetId:'cantina_lock',fieldTargetRevision:0,
  draftRevision:d.draft.revision,fieldTarget:target,reason:'Préparer une intrusion fictive'});
 const p=await f.releasePreview();assert.deepEqual(p.blockers,[]);
 await f.release(p);
 await f.birth(await f.birthPreview());
 await f.stage('EN_JEU');
 const read=(name='mySoIntrusion')=>f.actionRead(name,{targetId:'cantina_lock'});
 const start=(patch={})=>f.actionCmd('startSoIntrusion',{targetId:'cantina_lock',present:true,...patch});
 const finish=(id,patch={})=>f.actionCmd('finishSoIntrusion',{targetId:'cantina_lock',actionId:id,present:true,...patch});
 const cancel=id=>f.actionCmd('cancelSoIntrusion',{targetId:'cantina_lock',actionId:id});
 const cid=(await f.actionRead('mySession')).character.id;
 return {...f,target,cid,read,start,finish,cancel};
}
export function soIntrusionSuite(makeStore,prefix='INF-01'){
 test(prefix+' : serrure de fiction via M6, D6, PA et récit secret seulement après succès',async()=>{
  const f=await intrusionFixture(makeStore);
  const before=await f.read();
  assert.equal(before.target.title,'Serrure de cantina');
  assert.equal(before.level,2);
  assert.doesNotMatch(JSON.stringify(before),/LE_PASSAGE_FICTIF_EST_AUTORISE|SECRET_MJ/);
  const a=await f.start();
  assert.equal(a.durationSeconds,165);assert.equal((await f.points()).reserved,1);
  await assert.rejects(f.finish(a.id),{code:'SO_INF01_TOO_EARLY'});
  f.advance(165000);f.setDie(4);
  const done=await f.finish(a.id);
  assert.equal(done.status,'SUCCESS');assert.equal(done.roll,4);assert.equal(done.total,6);
  assert.equal(done.text,'LE_PASSAGE_FICTIF_EST_AUTORISE');
  assert.equal((await f.points()).available,4);assert.equal((await f.points()).reserved,0);
  assert.equal((await f.read()).previous.at(-1).text,'LE_PASSAGE_FICTIF_EST_AUTORISE');
  assert.equal((await f.store.get('sessions/'+f.sid+'/fieldStates/cantina_lock')).activeActionId,null);
  assert.equal((await f.store.get('sessions/'+f.sid+'/characters/'+f.cid)).activeFieldActionId,null);
  await assert.rejects(f.start(),{code:'SO_INF01_COOLDOWN'});
 });
 test(prefix+' : échec, temps de récupération et nouvelle tentative ordinaire',async()=>{
  const f=await intrusionFixture(makeStore);
  let a=await f.start();f.advance(165000);f.setDie(1);
  let r=await f.finish(a.id);assert.equal(r.status,'FAILED');assert.equal(r.total,3);
  assert.doesNotMatch(JSON.stringify(r),/LE_PASSAGE_FICTIF_EST_AUTORISE/);
  assert.equal((await f.points()).available,4);
  f.advance(600000);
  a=await f.start();assert.equal(a.status,'RUNNING');
 });
 test(prefix+' : annulation restitue les PA et libère la serrure commune',async()=>{
  const f=await intrusionFixture(makeStore);
  const a=await f.start();
  assert.equal((await f.cancel(a.id)).status,'CANCELLED');
  assert.equal((await f.points()).available,5);assert.equal((await f.points()).reserved,0);
  const b=await f.start();assert.notEqual(a.id,b.id);
 });
 test(prefix+' : accès au niveau, captif, QR non préparé et ancienne version refusés',async()=>{
  const f=await intrusionFixture(makeStore,{minLevel:3});
  await assert.rejects(f.start(),{code:'SO_INF01_SKILL'});
  await assert.rejects(f.actionCmd('startSoIntrusion',{targetId:'missing',present:true}),{code:'SO_INF01_TARGET'});
  const cpath='sessions/'+f.sid+'/characters/'+f.cid;
  await f.store.runTransaction(async tx=>{
   const c=await tx.get(cpath);
   tx.set(cpath,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(x=>x.id==='INF-01'?{...x,level:3}:x)}});
  });
  await f.actionCmd('setSoCaptivity',{characterId:f.cid,kind:'CELL',reason:'Détention fictive',safePath:true},f.owner);
  await assert.rejects(f.start(),{code:'SO_INF01_BUSY'});
  await f.actionCmd('endSoCaptivity',{characterId:f.cid},f.owner);
  const a=await f.start();assert.equal(a.durationSeconds,150);
  await f.cancel(a.id);
  const s=await f.store.get('sessions/'+f.sid);
  await f.store.runTransaction(async tx=>{const {inf01Version,...rest}=s.spaceOutlaws;tx.set('sessions/'+f.sid,{...s,spaceOutlaws:rest});});
  await assert.rejects(f.read(),{code:'SO_INF01_CLOSED'});
 });
 test(prefix+' : refus des doubles départs sur une même serrure',async()=>{
  const f=await intrusionFixture(makeStore);
  const result=await Promise.allSettled([f.start(),f.start()]);
  assert.equal(result.filter(x=>x.status==='fulfilled').length,1);
  assert.equal((await f.points()).reserved,1);
 });
}
