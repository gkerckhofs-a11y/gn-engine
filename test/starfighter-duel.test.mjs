import test from 'node:test';
import assert from 'node:assert/strict';
import {duel,step,decision,relative,controls,MAX_SPEED,STEP} from '../web/cockpit/duel-model.mjs';
test('Deux liaisons ouvrent les 90 secondes, la paix exige deux accords',()=>{
 const s=duel();decision(s,0,'liaison');assert.equal(s.phase,'appel');decision(s,1,'liaison');
 assert.equal(s.seconds,90);step(s,[{fire:true},{}]);assert.equal(s.shots.length,0);
 decision(s,0,'accord');decision(s,0,'accord');assert.equal(s.phase,'parole');
 decision(s,1,'accord');step(s,[{fire:true},{}]);assert.equal(s.phase,'paix');assert.equal(s.shots.length,0);
});
test('Tir effectif, bouclier puis coque, fin stable',()=>{
 const s=duel();decision(s,1,'rompre');s.ships.forEach(v=>v.speed=0);
 for(let i=0;i<200;i++)step(s,[{fire:true},{}]);
 assert.equal(s.phase,'fin');assert.equal(s.ships[1].hull,0);assert.equal(s.ships[0].shield,3);
});
test('Un écart latéral évite une salve, un demi-tour place le contact derrière',()=>{
 const s=duel();decision(s,0,'rompre');s.ships[1].yaw=Math.PI/2;s.ships[1].speed=110;
 step(s,[{fire:true},{}]);for(let i=0;i<55;i++)step(s,[{},{}]);assert.equal(s.ships[1].shield,3);
 s.ships[0].yaw=Math.PI;assert.ok(relative(...s.ships).z<0);
});
test('Délai automatique et bornage des entrées',()=>{
 const s=duel();for(let i=0;i<602;i++)step(s,[{},{}]);assert.equal(s.phase,'combat');
 assert.equal(controls({turn:Infinity}).turn,0);assert.equal(controls({turn:5}).turn,1);
});

test('Chaque pilote rejoint progressivement sa consigne, y compris à l’arrêt',()=>{
  const state=duel();
  const [pilot,wing]=state.ships;
  step(state,[{targetSpeed:7},{targetSpeed:MAX_SPEED+30}]);
  assert.equal(pilot.speed,55*STEP);
  assert.equal(wing.targetSpeed,MAX_SPEED);
  for(let i=0;i<60;i++)step(state,[{},{}]);
  assert.equal(pilot.speed,7);
  assert.equal(wing.speed,MAX_SPEED);
  step(state,[{targetSpeed:0},{}]);
  assert.equal(pilot.speed,7-55*STEP);
  for(let i=0;i<60;i++)step(state,[{},{}]);
  assert.equal(pilot.speed,0);
  assert.equal(pilot.targetSpeed,0);
  assert.equal(wing.speed,MAX_SPEED);
});

test('La commande manuelle prime immédiatement, les consignes invalides sont ignorées',()=>{
  const state=duel();
  const ship=state.ships[0];
  step(state,[{targetSpeed:80},{}]);
  for(const invalid of ['50',Infinity,NaN,null]){
    step(state,[{targetSpeed:invalid},{}]);
    assert.equal(ship.targetSpeed,80);
  }
  const speed=ship.speed;
  step(state,[{targetSpeed:MAX_SPEED,throttle:-.5},{}]);
  assert.equal(ship.targetSpeed,null);
  assert.equal(ship.speed,speed-.5*55*STEP);
  step(state,[{},{}]);
  assert.equal(ship.speed,speed-.5*55*STEP);
  step(state,[{targetSpeed:-25},{}]);
  assert.equal(ship.targetSpeed,0);
});

test('Un accord ou une élimination fige la propulsion des deux sièges',()=>{
  for(const phase of ['paix','fin']){
    const state=duel();
    step(state,[{targetSpeed:90},{targetSpeed:50}]);
    state.phase=phase;
    const previous=structuredClone(state);
    step(state,[{targetSpeed:0},{throttle:-1}]);
    assert.deepEqual(state,previous);
  }
});
