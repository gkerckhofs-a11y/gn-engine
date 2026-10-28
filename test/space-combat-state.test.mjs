import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSpaceDuel} from '../src/core/space-combat-state.mjs';
const ship=(id,patch={})=>({id,hull:4,shield:2,fuel:3,maneuverability:1,weapon:'STANDARD',revisionRequired:false,...patch});
const order=(kind)=>({kind,fallback:'PASSIVE',acceptSurrender:false,ceasefire:false});
const run=(a,b,dice=[6,6,6,6,6,6,6,6],patch={})=>resolveSpaceDuel([ship('a',patch.a),ship('b',patch.b)],[order(a),order(b)],dice,patch.quiet??0);
test('Duel : feinte touche sur 3 et défense minimale 6 sans double pénalité spéciale',()=>{
 for(const defense of ['DEFEND','PIL03_2','PIL03_5']){const r=run('PIL03_3',defense,[3,1,1,5,1,1,1,1]);assert.equal(r.shots[0].hit,true);assert.equal(r.shots[0].damage,0);assert.equal(r.rolls[0].threshold,6);assert.equal(r.after[1].revisionRequired,true);}
});
test('Duel : lourd, bouclier avant coque, tir simultané et pas de destruction définitive',()=>{
 const r=run('ATTACK','ATTACK',[6,6,1,1,1,1,1,1],{a:{hull:1,shield:0,weapon:'HEAVY'},b:{hull:1,shield:1}});assert.deepEqual(r.after.map(s=>[s.hull,s.shield]),[[0,0],[0,0]]);assert.equal(r.shots.length,2);assert.equal(r.reason,'IMMOBILIZED');
});
test('Duel : poursuite égale retient, sans poursuivant fuite sans jet ni coût spécial',()=>{
 const tie=run('FLEE','PURSUE');assert.equal(tie.closed,false);assert.equal(tie.hostile,true);assert.equal(tie.after[0].revisionRequired,false);const free=run('PIL03_4','PASSIVE');assert.equal(free.reason,'FLED');assert.equal(free.used[0],false);assert.equal(free.after[0].fuel,3);assert.deepEqual(free.rolls,[]);
});
test('Duel : fuite risquée perd carburant et bouclier sur égalité, sans cumul de bonus',()=>{
 const r=run('PIL03_4','PURSUE',[1,1,1,1,4,1,6,1]);assert.equal(r.after[0].fuel,2);assert.equal(r.after[0].shield,1);assert.equal(r.after[0].revisionRequired,true);assert.equal(r.used[0],true);assert.equal(r.closed,false);
});
test('Duel : fuite immobilisée ne lance aucun dé et restitue ses réservations',()=>{
 const r=run('PIL03_4','ATTACK',undefined,{a:{hull:1,shield:0}});assert.equal(r.used[0],false);assert.equal(r.after[0].fuel,3);assert.equal(r.rolls.filter(x=>x.kind==='FLEE').length,0);
});
test('Duel : manœuvre combinée consomme sur son seul tir, esquive inactive ne consomme rien',()=>{
 const combined=run('PIL03_5','PASSIVE');assert.equal(combined.used[0],true);assert.equal(combined.shots.length,1);const idle=run('PIL03_2','DEFEND',undefined,{quiet:1});assert.equal(idle.reason,'QUIET');assert.deepEqual(idle.used,[false,false]);assert.equal(idle.after[0].revisionRequired,false);
});
