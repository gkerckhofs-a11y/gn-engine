import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {healthFixture} from './space-outlaws-health-suite.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
export function spaceStealthSuite(makeStore,prefix='Neutralisation physique'){
 const fixture=async()=>{
  const f=await healthFixture(makeStore,{classId:'ROG'});
  const read=(actor=f.player)=>f.actionRead('myStealthAttempts',{},actor);
  const report=async(p={},actor=f.player)=>f.actionCmd('recordStealthAttempt',{revision:(await read(actor)).revision,secondsSinceAttempt:0,outcome:'FAILED',safe:true,announced:true,...p},actor);
  return {...f,read,report};
 };
 test(`${prefix} : chaque annonce, réussite ou échec, sans PA, dé ni dégâts à distance`,async()=>{
  const f=await fixture();f.advance(120000);const before=await f.health(f.other),points=await f.points();
  const r=await f.report({secondsSinceAttempt:30,outcome:'SUCCEEDED',targetId:f.tid});assert.equal(r.waitMs,570000);assert.equal(r.wasRecovering,false);
  assert.deepEqual(await f.health(f.other),before);assert.equal((await f.points()).available,points.available);assert.equal(f.rollCount(),0);
  await f.stage('PAUSE');f.advance(600000);assert.equal((await f.read()).waitMs,570000);
  await f.stage('EN_JEU');f.advance(570000);assert.equal((await f.read()).waitMs,0);
  const next=await f.report();assert.equal(next.waitMs,600000);assert.equal(next.wasRecovering,false);
  const history=(await f.read()).events;assert.equal(history.length,2);assert.deepEqual(new Set(history.map(e=>e.outcome)),new Set(['SUCCEEDED','FAILED']));
  assert.deepEqual((await f.read(f.other)).events,[]);
  assert.equal((await f.actionRead('healthHistory',{characterId:f.cid},f.owner)).events.filter(e=>e.kind==='STEALTH_ATTEMPT').length,2);
 });
 test(`${prefix} : double clic, concurrence, réessai et révocation`,async()=>{
  const f=await fixture(),requestId=randomUUID(),payload={revision:0,secondsSinceAttempt:0,outcome:'FAILED',safe:true,announced:true,requestId};
  const results=await Promise.allSettled([f.actionCmd('recordStealthAttempt',payload),f.actionCmd('recordStealthAttempt',{...payload,requestId:randomUUID()})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.read()).events.length,1);
  if(results[0].status==='fulfilled')assert.deepEqual(await f.actionCmd('recordStealthAttempt',payload),results[0].value);
  await f.actionCmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.actionCmd('recordStealthAttempt',payload),{code:'FORBIDDEN'});
 });
 test(`${prefix} : déclaration tardive à 0 PV, aucune réinitialisation du délai mortel`,async()=>{
  const f=await fixture();f.advance(60000);await f.damage(3,f.player);const before=await f.health(f.player);
  const r=await f.report({secondsSinceAttempt:10});assert.equal(r.waitMs,590000);assert.deepEqual(await f.health(f.player),before);
  f.advance(1000);const mistaken=await f.report();assert.equal(mistaken.wasRecovering,true);assert.equal(mistaken.waitMs,600000);
  await assert.rejects(f.report({secondsSinceAttempt:2}),{code:'SO_STEALTH_TIME'});assert.equal((await f.read()).waitMs,600000);
 });
 test(`${prefix} : compétence, confirmation, temps et STOP vérifiés sans écriture`,async()=>{
  const f=await fixture();for(const patch of [{safe:false},{announced:false},{outcome:'UNKNOWN'}])await assert.rejects(f.report(patch),{code:'SO_STEALTH_CONFIRM'});
  for(const secondsSinceAttempt of [-1,1,86401,1.5])await assert.rejects(f.report({secondsSinceAttempt}),{code:'SO_STEALTH_TIME'});
  assert.equal((await f.read()).events.length,0);await f.actionCmd('stopSafety',{reason:'Scène interrompue'});
  await assert.rejects(f.report(),{code:'SESSION_NOT_RUNNING'});
  const g=await healthFixture(makeStore,{classId:'COM'});await assert.rejects(g.actionRead('myStealthAttempts'),{code:'FIELD_SKILL_REQUIRED'});
  assert.equal((await g.points()).available,5);
 });
 test(`${prefix} : interruption transactionnelle ne crée ni délai ni événement partiel`,async()=>{
  const raw=makeStore();let fail=false;
  const wrapped={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const result=await cb(tx);if(fail)throw Error('INTERRUPTION');return result;})};
  const f=await healthFixture(()=>wrapped,{classId:'ROG'}),p={revision:0,secondsSinceAttempt:0,outcome:'FAILED',safe:true,announced:true};
  fail=true;await assert.rejects(f.actionCmd('recordStealthAttempt',p),/INTERRUPTION/);fail=false;
  assert.equal((await f.actionRead('myStealthAttempts')).waitMs,0);
  assert.equal(await raw.get(`sessions/${f.sid}/characters/${f.cid}/fieldCooldowns/${hash('SKILL:ROG-01')}`),null);
  assert.equal((await f.actionRead('myStealthAttempts')).events.length,0);
  await f.actionCmd('recordStealthAttempt',p);assert.equal((await f.actionRead('myStealthAttempts')).waitMs,600000);
 });
}
