import test from 'node:test';
import assert from 'node:assert/strict';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
export async function escapeFixture(makeStore){
 const f=await actionsFixture(makeStore,{classId:'ROG'});
 await f.stage('EN_JEU');
 const id=(await f.actionRead('mySession')).character.id;
 const capture=(kind='CELL',patch={})=>f.actionCmd('setSoCaptivity',{characterId:id,kind,safePath:true,reason:'Détention fictive supervisée',...patch},f.owner);
 const guard=watched=>f.actionCmd('guardSoCaptivity',{characterId:id,guarded:watched},f.owner);
 const release=()=>f.actionCmd('endSoCaptivity',{characterId:id},f.owner);
 const start=(code,patch={})=>f.actionCmd('startSoEscape',{code,present:true,...patch});
 const finish=id=>f.actionCmd('finishSoEscape',{actionId:id,safeExit:true});
 const cancel=id=>f.actionCmd('cancelSoEscape',{actionId:id});
 return {...f,id,capture,guard,release,start,finish,cancel};
}
export function soEscapeSuite(makeStore,prefix='ROG-03'){
 test(prefix+' : QR cellule, durée, PA et évasion',async()=>{
  const f=await escapeFixture(makeStore),cap=await f.capture();
  const d=await f.actionRead('mySoEscape');
  assert.equal(d.enabled,true);assert.equal(d.level,2);
  assert.equal(d.captivity.status,'ACTIVE');
  await assert.rejects(f.start('WRONG_QR'),{code:'SO_ESCAPE_QR'});
  const a=await f.start(cap.code);assert.equal(a.durationSeconds,45);
  assert.equal((await f.points()).reserved,1);
  await assert.rejects(f.finish(a.id),{code:'SO_ESCAPE_TOO_EARLY'});
  f.advance(45000);
  assert.equal((await f.finish(a.id)).status,'ESCAPED');
  assert.equal((await f.points()).available,4);
  assert.equal((await f.points()).reserved,0);
  await assert.rejects(f.start(cap.code),{code:'SO_ESCAPE_UNAVAILABLE'});
 });
 test(prefix+' : gardien, découverte et récupération sans PA',async()=>{
  const f=await escapeFixture(makeStore),cap=await f.capture('CELL',{guarded:true});
  await assert.rejects(f.start(cap.code),{code:'SO_ESCAPE_GUARDED'});
  await f.guard(false);
  const a=await f.start(cap.code);
  assert.equal((await f.guard(true)).discovered,true);
  assert.equal((await f.points()).available,5);
  assert.equal((await f.points()).reserved,0);
  await assert.rejects(f.finish(a.id),{code:'SO_ESCAPE_STALE'});
  await f.guard(false);
  await assert.rejects(f.start(cap.code),{code:'SO_ESCAPE_COOLDOWN'});
  f.advance(600000);
  const next=await f.start(cap.code);
  await f.cancel(next.id);
  assert.equal((await f.points()).available,5);
 });
 test(prefix+' : escorte N2 refusée, N5 sans QR, temps réel et libération',async()=>{
  const f=await escapeFixture(makeStore),cap=await f.capture('ESCORT');
  await assert.rejects(f.start(cap.code),{code:'SO_ESCAPE_SKILL'});
  await f.release();
  const cell=await f.capture('CELL');
  const attempt=await f.start(cell.code);await f.cancel(attempt.id);
  assert.equal((await f.points()).available,5);
  await f.release();
  const path='sessions/'+f.sid+'/characters/'+f.id;
  await f.store.runTransaction(async tx=>{
   const c=await tx.get(path);
   tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='ROG-03'?{...k,level:5}:k)}});
  });
  await f.capture('OPEN');
  const open=await f.start(undefined);assert.equal(open.durationSeconds,30);
  await f.cancel(open.id);
  f.advance(1200000);
  assert.equal((await f.actionRead('mySoEscape')).releaseDue,true);
  await assert.rejects(f.start(undefined),{code:'SO_ESCAPE_RELEASE_DUE'});
  assert.equal((await f.release()).releaseDue,true);
 });
 test(prefix+' : permissions MJ, ancienne version et STOP',async()=>{
  const f=await escapeFixture(makeStore);
  await assert.rejects(f.actionCmd('setSoCaptivity',{characterId:f.id,kind:'CELL',safePath:true,reason:'Invalide'}),{code:'FORBIDDEN'});
  const cap=await f.capture();
  await f.actionCmd('stopSafety',{reason:'Sécurité réelle'});
  await assert.rejects(f.start(cap.code),{code:'SESSION_NOT_RUNNING'});
  const path='sessions/'+f.sid,session=await f.store.get(path);
  await f.store.runTransaction(async tx=>{const {escapeVersion,...rest}=session.spaceOutlaws;tx.set(path,{...session,spaceOutlaws:rest});});
  await assert.rejects(f.actionRead('mySoEscape'),{code:'SO_ESCAPE_CLOSED'});
 });
}
