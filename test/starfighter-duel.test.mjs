import test from 'node:test';
import assert from 'node:assert/strict';
import {duel,step,decision,relative,controls} from '../web/cockpit/duel-model.mjs';
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
