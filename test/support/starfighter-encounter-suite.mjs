import test from 'node:test';
import assert from 'node:assert/strict';
import {encountersFixture,order} from './space-encounters-suite.mjs';

export function starfighterEncounterSuite(makeStore){
async function pair(){
 const f=await encountersFixture(makeStore,{encounter:false});
 await f.cmd('configureStarfighter',{stationCount:2,combat:true,revision:0},f.owner);
 for(const [id,stationId] of [['ship','cockpit-1'],['second','cockpit-2']]){
  const sh=await f.get('ships/'+id);
  await f.edit('ships/'+id,s=>({...s,cockpit:{status:'ASSIGNED',starfighter:true,pilotId:sh.pilotId,stationId,operationId:id}}));
  await f.edit('cockpitStations/'+stationId,()=>({id:stationId,shipId:id,operationId:id}));
 }
 async function consoleFor(second=false){
  const actor=second?f.other:f.player,stationId=second?'cockpit-2':'cockpit-1';
  const d=await f.read('cockpitStation',{stationId},actor),combatId=d.ship.combatId;
  const c=combatId?(await f.read('spaceCombat',{combatId},actor)).combat:null;
  const cmd=(command,fields)=>f.cmd('cockpitCommand',{stationId,command,payload:{sessionId:f.sid,shipId:d.ship.shipId,...fields}},actor);
  const pulse=()=>cmd('starfighterPulse',{confirmation:d.confirmation,...(c?{combatId,roundConfirmation:c.confirmation}:{})});
  return {d,c,cmd,pulse};
 }
 return {f,consoleFor};
}
test('Deux postes : interception, négociation, ordres privés, résolution concurrente unique',async()=>{
 const {f,consoleFor}=await pair();
 await (await consoleFor()).pulse();
 const a=await consoleFor(),b=await consoleFor(true);
 assert.equal(a.c.id,b.c.id);assert.equal(a.c.negotiationSeconds,90);
 assert.equal((await a.pulse()).status,'WAIT');
 await f.stage('PAUSE');f.advance(90000);
 await assert.rejects((await consoleFor()).pulse());await f.stage('EN_JEU');
 assert.equal((await consoleFor()).c.negotiationSeconds,90);
 f.advance(90000);await (await consoleFor()).pulse();
 const first=await consoleFor();
 assert.equal(first.c.round,1);assert.equal(first.c.remainingSeconds,90);
 await first.cmd('submitSpaceOrder',{combatId:first.c.id,confirmation:first.c.confirmation,order:order('ATTACK')});
 const second=await consoleFor(true);assert.equal(second.c.ownOrder,null);
 await second.cmd('submitSpaceOrder',{combatId:second.c.id,confirmation:second.c.confirmation,order:order('DEFEND')});
 f.advance(90000);
 const posts=await Promise.all([consoleFor(),consoleFor(true)]);
 await Promise.allSettled(posts.map(p=>p.pulse()));
 const after=await consoleFor();assert.equal(after.c.lastRound.round,1);assert.equal(after.c.round,2);
});
test('Un accord pendant la négociation clôt la rencontre avant tout round',async()=>{
 const {consoleFor}=await pair();await (await consoleFor()).pulse();
 for(const second of [false,true]){
  const p=await consoleFor(second);await p.cmd('consentSpacePeace',{combatId:p.c.id,confirmation:p.c.confirmation,agree:true});
 }
 const returned=await consoleFor();assert.equal(returned.d.ship.combatId,null);assert.ok(returned.d.starfighter.previousCombatId);
});
test('STOP, révocation, pilote remplacé et archive ferment un ancien poste',async()=>{
 const {f,consoleFor}=await pair();const p=await consoleFor();
 await f.cmd('stopSafety',{reason:'Essai isolé de STOP'});
 await assert.rejects(p.pulse());assert.equal((await f.get('ships/ship')).combatId??null,null);
 const session=await f.store.get('sessions/'+f.sid);
 await f.cmd('resumeSafety',{revision:session.revision,reason:'Reprise isolée'},f.owner);
 const admin=await f.read('spaceportAdmin',{},f.owner),row=admin.ships.find(s=>s.shipId==='ship');
 await f.cmd('revokeSoCockpit',{shipId:'ship',confirmation:row.confirmation},f.owner);
 await assert.rejects(p.pulse(),{code:'COCKPIT_UNAVAILABLE'});
 const b=await consoleFor(true);
 await f.edit('ships/second',s=>({...s,pilotId:f.cid}));
 await assert.rejects(b.pulse());
 await f.store.runTransaction(async tx=>{const key='sessions/'+f.sid;const s=await tx.get(key);tx.set(key,{...s,stage:'ARCHIVED'});});
 await assert.rejects(f.read('cockpitStation',{stationId:'cockpit-2'},f.other));
});
}
