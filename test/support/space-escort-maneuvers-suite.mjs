import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {convoyFixture} from './space-convoy-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';

export async function escortManeuversFixture(makeStore,{level=1,...options}={}){
 const f=await convoyFixture(makeStore,{combat:true,...options});
 // A published, previously acquired rare skill; acquisition/unlock is covered by
 // the native learning suite. No production command grants arbitrary levels.
 const skill=async(cid,id,level)=>f.edit(`characters/${cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills.filter(k=>k.id!==id),...(level?[{id,level}]:[])]}}));
 await skill(f.otherId,'ESC-01',level);
 const interpose=()=>f.submit('ESC01','ship',f.other);
 const breakaway=async()=>{f.setDice([1]);return f.combatCmd('spaceBreakaway');};
 const precombat=async(dice=[6,1])=>{f.setDice(dice);return f.combatCmd('spaceEscortInterpose',{},f.other);};
 const turns=async({flee='FLEE',pursue='PURSUE'}={})=>{await f.submit(flee,'pirate');await f.submit(pursue,'ship',f.pirate);await interpose();};
 const dice=(escort=6,pirate=1,cargo=1)=>{const d=Array(13).fill(1);d[8]=escort;d[10]=pirate;d[6]=cargo;return d;};
 return {...f,skill,interpose,breakaway,precombat,turns,dice};
}
export function spaceEscortManeuversSuite(makeStore,prefix='Manœuvres ESC-01 SO'){
 test(`${prefix} : N1 réserve un PA, détourne la poursuite et conserve le quota PIL-03`,async()=>{
  const f=await escortManeuversFixture(makeStore),before=await f.points(f.other);await f.begin();await f.turns();assert.equal((await f.points(f.other)).reserved,1);assert.equal((await f.points(f.other)).available,before.available-1);
  const r=await f.round(f.dice());assert.deepEqual(r.result.escaped,['ship']);assert.equal((await f.ship()).combatId,null);assert.equal((await f.get('ships/escort')).combatId,f.combatId);assert.equal((await f.points(f.other)).reserved,0);assert.equal((await f.points(f.other)).available,before.available-1);assert.equal(!!(await f.get('ships/escort')).journey.pil03Used,false);assert.equal((await f.detail(f.other)).escortManeuver.used,true);assert.equal((await f.get('ships/escort')).revisionRequired,false);
 });
 test(`${prefix} : tentative échouée consomme le quota de rencontre sans second essai`,async()=>{
  const f=await escortManeuversFixture(makeStore);await f.begin();await f.turns();await f.round(f.dice(1,6,1));assert.equal((await f.ship()).combatId,f.combatId);await assert.rejects(f.interpose(),{code:'SPACE_ESCORT_USED'});assert.equal((await f.points(f.other)).available,3);
 });
 test(`${prefix} : N2 observe uniquement catégorie et manœuvrabilité de l’adversaire identifié`,async()=>{
  const f=await escortManeuversFixture(makeStore,{level:2});await f.begin();await f.submit('ATTACK','ship',f.pirate);const d=await f.detail(f.other);assert.deepEqual(d.escortManeuver.observations,[{id:'pirate',name:'Pirate',category:'CARGO',maneuverability:1}]);assert.equal(d.ownOrder,null);assert.equal(d.ships.find(x=>x.id==='pirate').fuel,undefined);assert.doesNotMatch(JSON.stringify(d),/"kind":"ATTACK"|missionManifest|transportManifest|actorVersion|SECRET_|OUT-SECRET/);assert.equal((await f.detail()).escortManeuver,null);assert.equal((await f.points(f.other)).available,4);
  await f.skill(f.otherId,'ESC-01',1);assert.deepEqual((await f.detail(f.other)).escortManeuver.observations,[]);
 });
 test(`${prefix} : N3 couvre la fuite après échec, avec un seul jet poursuivant`,async()=>{
  const f=await escortManeuversFixture(makeStore,{level:3});await f.begin();await f.turns();const r=await f.round(f.dice(2,3,3));const rolls=r.result.rolls;assert.equal(rolls.find(x=>x.kind==='INTERPOSE').success,false);assert.equal(rolls.find(x=>x.kind==='FLEE').specialBonus,1);assert.deepEqual(r.result.escaped,['ship']);assert.equal(rolls.filter(x=>x.kind==='PURSUIT').length,1);
 });
 test(`${prefix} : succès escorte rend PA et carburant de PIL-03 N4 non exécuté au cargo`,async()=>{
  const f=await escortManeuversFixture(makeStore,{level:5});await f.skill(f.cid,'PIL-03',4);await f.begin();const before=await f.ship();await f.turns({flee:'PIL03_4'});assert.equal((await f.points()).reserved,1);await f.round(f.dice());assert.equal((await f.points()).reserved,0);assert.equal((await f.points()).available,4);assert.equal((await f.ship()).fuel,before.fuel);assert.equal((await f.ship()).journey.pil03Used,false);
 });
 test(`${prefix} : remplacement d’ordre rembourse ESC-01 et réserve au plus une action spéciale`,async()=>{
  const f=await escortManeuversFixture(makeStore);await f.begin();await f.interpose();await f.interpose();assert.equal((await f.points(f.other)).reserved,1);await f.submit('PIL03_2','pirate',f.other,{defenseIds:['pirate']});assert.equal((await f.points(f.other)).reserved,1);await f.submit('PASSIVE','pirate',f.other);assert.equal((await f.points(f.other)).available,4);assert.equal((await f.points(f.other)).reserved,0);assert.equal((await f.detail(f.other)).escortManeuver.used,false);
 });
 test(`${prefix} : absence de poursuite ou cargo passif rembourse sans effet de remplacement`,async()=>{
  const f=await escortManeuversFixture(makeStore);await f.begin();await f.interpose();const r=await f.round();assert.equal((await f.points(f.other)).available,4);assert.equal((await f.detail(f.other)).escortManeuver.used,false);assert.equal(r.result.rolls.length,0);assert.equal(r.result.shots.length,0);await f.turns({pursue:'PASSIVE'});await f.round();assert.equal((await f.points(f.other)).available,4);
 });
 test(`${prefix} : escorte immobilisée par les tirs ne fait aucun test et récupère son PA`,async()=>{
  const f=await escortManeuversFixture(makeStore);await f.edit('ships/escort',x=>({...x,hull:1,shield:0}));await f.begin();await f.turns({pursue:'ATTACK'});await f.submit('ATTACK','escort',f.pirate);const r=await f.round(Array(13).fill(6));assert.equal((await f.get('ships/escort')).hull,0);assert.equal((await f.points(f.other)).available,4);assert.equal(r.result.rolls.some(x=>x.kind==='INTERPOSE'),false);
 });
 test(`${prefix} : N4 exige échec préalable du cargo et évite le combat sans révision`,async()=>{
  const f=await escortManeuversFixture(makeStore,{level:4});await assert.rejects(f.precombat(),{code:'SPACE_ESCORT_UNAVAILABLE'});await f.breakaway();const r=await f.precombat();assert.equal(r.success,true);assert.deepEqual((await f.detail(f.other)).activeShipIds,['pirate','escort']);assert.equal((await f.ship()).combatId,null);assert.equal((await f.ship()).revisionRequired,false);assert.equal(!!(await f.get('ships/escort')).journey.pil03Used,false);assert.equal((await f.points(f.other)).available,3);
  await assert.rejects(f.combatCmd('spaceBreakaway',{},f.other),{code:'SPACE_COMBAT_PHASE'});await f.begin();await f.submit('PIL03_2','pirate',f.other,{defenseIds:['pirate']});assert.equal((await f.points(f.other)).reserved,1);
 });
 test(`${prefix} : N4 échoué et interposition en combat partagent le même quota`,async()=>{
  const f=await escortManeuversFixture(makeStore,{level:4});await f.breakaway();assert.equal((await f.precombat([1,6])).success,false);await assert.rejects(f.precombat(),{code:'SPACE_ESCORT_USED'});await f.begin();await assert.rejects(f.interpose(),{code:'SPACE_ESCORT_USED'});assert.equal((await f.points(f.other)).available,3);
 });
 test(`${prefix} : compétence rare non acquise, mauvais rôle, cible et paramètres injectés refusés`,async()=>{
  const f=await escortManeuversFixture(makeStore,{level:0});await f.breakaway();await assert.rejects(f.precombat(),{code:'FIELD_SKILL_REQUIRED'});await f.begin();await assert.rejects(f.interpose(),{code:'FIELD_SKILL_REQUIRED'});await f.skill(f.otherId,'ESC-01',5);await assert.rejects(f.submit('ESC01','pirate',f.other),{code:'INVALID_SPACE_ORDER'});await assert.rejects(f.submit('ESC01','escort'),{code:'INVALID_SPACE_ORDER'});await assert.rejects(f.submit('ESC01','ship',f.other,{escortLevel:5}),{code:'INVALID_ADMISSION'});await assert.rejects(f.submit('ESC01','ship',f.other,{defenseIds:['pirate']}),{code:'INVALID_SPACE_ORDER'});
 });
 test(`${prefix} : révocation et compétence retirée rendent la réservation sans effet`,async()=>{
  const f=await escortManeuversFixture(makeStore);await f.begin();await f.turns();await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);const r=await f.round(f.dice());assert.equal(r.result.rolls.some(x=>x.kind==='INTERPOSE'),false);assert.equal((await f.get(`characters/${f.otherId}/resources/actionPoints`)).reserved,0);
  const g=await escortManeuversFixture(makeStore);await g.begin();await g.turns();await g.skill(g.otherId,'ESC-01',0);await g.round(g.dice());assert.equal((await g.points(g.other)).available,4);
 });
 test(`${prefix} : concurrence de résolution et reçu ne consomment qu’un PA`,async()=>{
  const f=await escortManeuversFixture(makeStore);await f.begin();await f.turns();f.advance(90000);f.setDice(f.dice());const d=(await f.detail(f.owner)).find(x=>x.id===f.combatId),input={combatId:f.combatId,confirmation:d.confirmation,requestId:randomUUID()},attempts=[input,{...input,requestId:randomUUID()}],results=await Promise.allSettled(attempts.map(p=>f.cmd('resolveSpaceRoundAdmin',p,f.owner))),winner=results.findIndex(x=>x.status==='fulfilled');assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.deepEqual(await f.cmd('resolveSpaceRoundAdmin',attempts[winner],f.owner),results[winner].value);assert.equal((await f.points(f.other)).available,3);assert.equal((await f.get(`spaceCombats/${f.combatId}/rounds/1`)).rolls.filter(x=>x.kind==='INTERPOSE').length,1);
 });
 test(`${prefix} : N4 réessai unique, droits vérifiés avant restitution du reçu`,async()=>{
  const f=await escortManeuversFixture(makeStore,{level:4});await f.breakaway();const d=await f.detail(f.other),input={combatId:f.combatId,shipId:'escort',confirmation:d.confirmation,requestId:randomUUID()};f.setDice([6,1]);const r=await f.cmd('spaceEscortInterpose',input,f.other);assert.deepEqual(await f.cmd('spaceEscortInterpose',input,f.other),r);assert.equal((await f.points(f.other)).available,3);await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.cmd('spaceEscortInterpose',input,f.other),{code:'FORBIDDEN'});
 });
 test(`${prefix} : ancien manifeste fermé, STOP et pause respectés`,async()=>{
  const f=await escortManeuversFixture(makeStore,{level:4});await f.store.runTransaction(async tx=>{const path=`sessions/${f.sid}`,s=await tx.get(path),{escortManeuverVersion,...spaceOutlaws}=s.spaceOutlaws;tx.set(path,{...s,spaceOutlaws});});assert.equal((await f.detail(f.other)).escortManeuver,null);await f.breakaway();await assert.rejects(f.precombat(),{code:'SO_GAMEPLAY_NOT_OPEN'});await f.begin();await assert.rejects(f.interpose(),{code:'SO_GAMEPLAY_NOT_OPEN'});
  const g=await escortManeuversFixture(makeStore,{level:4});await g.breakaway();await g.stage('PAUSE');await assert.rejects(g.precombat(),{code:'SESSION_NOT_RUNNING'});await g.stage('EN_JEU');await g.cmd('stopSafety',{reason:'Sécurité'});await assert.rejects(g.precombat(),{code:'SO_SAFETY_STOP'});
 });
 test(`${prefix} : ordre réservé et quota consommé conservés entre épisodes`,async()=>{
  const f=await escortManeuversFixture(makeStore);await f.begin();await f.turns();const e=await episodeHarness(f);await e.close();await e.resume(await e.begin());assert.equal((await e.get(`characters/${f.otherId}/resources/actionPoints`)).reserved,1);await e.stage('EN_JEU');f.advance(90000);f.setDice(f.dice(1,6,1));const d=(await e.read('spaceCombatAdmin',{},f.owner)).combats.find(x=>x.id===f.combatId);await e.cmd('resolveSpaceRoundAdmin',{combatId:f.combatId,confirmation:d.confirmation},f.owner);assert.ok((await e.get(`spaceCombats/${f.combatId}`)).escortUses.escort);assert.equal((await e.get(`characters/${f.otherId}/resources/actionPoints`)).reserved,0);
 });
 test(`${prefix} : interruption transactionnelle rend PA et quota intacts`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await escortManeuversFixture(()=>store,{level:4});await f.breakaway();fail=true;await assert.rejects(f.precombat(),/INTERRUPTION/);fail=false;assert.equal((await f.points(f.other)).available,4);assert.equal((await f.detail(f.other)).escortManeuver.used,false);assert.equal((await f.ship()).combatId,f.combatId);await f.precombat();assert.equal((await f.points(f.other)).available,3);
 });
 test(`${prefix} : interposition N4 consommée reste consommée après reprise d’épisode`,async()=>{
  const f=await escortManeuversFixture(makeStore,{level:4});await f.breakaway();await f.precombat([1,6]);const e=await episodeHarness(f);await e.close();await e.resume(await e.begin());const c=await e.get(`spaceCombats/${f.combatId}`);assert.equal(c.precombatEscort.success,false);assert.equal(c.escortUses.escort.phase,'ENCOUNTER');await e.stage('EN_JEU');const d=(await e.read('spaceCombat',{combatId:f.combatId},f.other)).combat;assert.equal(d.escortManeuver.used,true);await assert.rejects(e.cmd('spaceEscortInterpose',{combatId:f.combatId,shipId:'escort',confirmation:d.confirmation},f.other),{code:'SPACE_ESCORT_USED'});
 });
}
