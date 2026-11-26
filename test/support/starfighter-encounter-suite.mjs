import test from 'node:test';
import assert from 'node:assert/strict';
import {encountersFixture,order} from './space-encounters-suite.mjs';

export function starfighterEncounterSuite(makeStore){
async function pair(settings={}){
 const f=await encountersFixture(makeStore,{encounter:false});
 await f.cmd('configureStarfighter',{stationCount:2,combat:true,revision:0,...settings},f.owner);
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
test('Duel connecté : deux postes pilotent, le serveur arbitre les impacts, la coque n’absorbe rien avant les boucliers',async()=>{
 const {f,consoleFor}=await pair({flightDuel:true,shieldFactor:10});
 for(const id of ['ship','second'])await f.edit('ships/'+id,s=>({...s,shield:1,hull:2}));
 await (await consoleFor()).pulse();
 const a=await consoleFor(),b=await consoleFor(true);
 assert.equal(a.c.shieldFactor,10);
 const frame=(post,seq,controls={})=>post.cmd('starfighterFrame',{combatId:a.c.id,seq,controls});
 const msg=(post,message)=>post.cmd('starfighterSignal',{combatId:a.c.id,message});
 assert.equal((await frame(a,null)).room.ships[1].shield,10);
 await frame(a,1,{fire:true});await frame(b,1);
 f.advance(500);
 const talk=await frame(a,2,{fire:true});assert.equal(talk.room.shots.length,0);
 await msg(b,{type:'ready'});assert.equal((await frame(a,null)).signal.type,'ready');
 await msg(a,{type:'offer',sdp:'SDP privé de test'});
 assert.equal((await frame(b,null)).signal.sdp,'SDP privé de test');
 assert.ok(!JSON.stringify((await consoleFor()).c).includes('SDP privé'));
 await assert.rejects(msg(b,{type:'offer',sdp:'mauvais siège'}));
 await assert.rejects(frame(b,2,{hull:0}));
 await assert.rejects(f.cmd('cockpitCommand',{stationId:'cockpit-2',command:'starfighterFrame',payload:{sessionId:f.sid,shipId:'ship',combatId:a.c.id}},f.player));
 await f.stage('PAUSE');await assert.rejects(frame(a,3,{fire:true}));
 f.advance(50000);await f.stage('EN_JEU');f.advance(90000);
 await (await consoleFor()).pulse();assert.equal((await consoleFor()).c.status,'DOGFIGHT');
 await assert.rejects(msg(a,{type:'ready'}));
 const active=await consoleFor();
 await assert.rejects(active.cmd('submitSpaceOrder',{combatId:a.c.id,confirmation:active.c.confirmation,order:order('ATTACK')}));
 let seqA=3,seqB=2,shieldHit=false,seenHull=false,final;
 await frame(a,seqA++,{fire:true});const launch=await frame(b,seqB++);
 assert.equal(launch.room.shots.length,0);
 for(let i=0;i<42;i++){
  f.advance(250);
  const x=await frame(a,seqA++,{fire:true});final=x;
  const target=x.room.ships[1];
  if(target.shield<10&&target.shield>0){assert.equal(target.hull,2);shieldHit=true;}
  if(target.hull<2){assert.equal(target.shield,0);seenHull=true;}
  if(x.room.phase==='fin')break;
  const retry=await frame(a,seqA-1,{turn:1});assert.deepEqual(retry.room,x.room);
  await frame(b,seqB++);
 }
 assert.ok(shieldHit&&seenHull);assert.equal(final.room.phase,'fin');
 const result=await f.get('spaceCombats/'+a.c.id),loser=await f.get('ships/second'),winner=await f.get('ships/ship');
 assert.equal(result.reason,'IMMOBILIZED');assert.equal(result.lastRound.after[1].hull,0);
 assert.equal(loser.journey.immobilized,true);assert.equal(loser.combatId,null);assert.equal(winner.combatId,null);
 assert.equal(winner.revisionRequired,true);assert.equal(loser.shield,0);assert.equal(loser.hull,0);
 await assert.rejects(frame(a,seqA,{fire:true}));
});
test('Duel connecté : perte du second poste, capacité de tir suspendue et reprise de secours par la régie',async()=>{
 const {f,consoleFor}=await pair({flightDuel:true,shieldFactor:3});
 await (await consoleFor()).pulse();const a=await consoleFor(),b=await consoleFor(true);
 f.advance(90000);await (await consoleFor()).pulse();
 const frame=(p,seq,controls)=>p.cmd('starfighterFrame',{combatId:a.c.id,seq,controls});
 await frame(a,1,{fire:true});await frame(b,1,{turn:1});
 f.advance(250);const online=await frame(a,2,{fire:true});assert.ok(online.room.ships[1].yaw>Math.PI);
 f.advance(12000);const offline=await frame(a,3,{fire:true});assert.equal(offline.ready,false);
 f.advance(1000);assert.deepEqual((await frame(a,4,{fire:true})).room,offline.room);
 await f.edit('cockpitStations/cockpit-2',s=>({...s,operationId:'remplace'}));
 await assert.rejects(frame(a,5,{}),{code:'COCKPIT_UNAVAILABLE'});
 const admin=(await f.read('spaceCombatAdmin',{},f.owner)).combats.find(e=>e.id===a.c.id);
 await f.cmd('restoreSpaceRounds',{combatId:a.c.id,confirmation:admin.confirmation,reason:'Poste hors service'},f.owner);
 assert.equal((await consoleFor()).c.status,'ROUND');await assert.rejects(frame(a,5,{}));
});

}
