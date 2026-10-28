import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveConvoyRound} from '../src/core/space-convoy-combat.mjs';
const ships=()=>[{id:'cargo',team:'C',hull:4,shield:2,fuel:4,maneuverability:1,weapon:'STANDARD'},{id:'pirate',team:'P',hull:4,shield:2,fuel:4,maneuverability:1,weapon:'STANDARD'},{id:'escort',team:'C',hull:3,shield:1,fuel:4,maneuverability:2,weapon:'STANDARD'}];
const order=(kind,targetId,escortLevel=0)=>({kind,targetId,escortLevel,defenseIds:[],fallback:'PASSIVE',ceasefire:false,acceptSurrender:false});
const orders=(level=1,flee='FLEE')=>[order(flee,'pirate'),order('PURSUE','cargo'),order('ESC01','cargo',level)];
test('ESC-01 : interposition réussie, un seul jet poursuivant et aucune attaque de remplacement',()=>{
 const dice=Array(13).fill(3),r=resolveConvoyRound(ships(),orders(),dice);assert.deepEqual(r.escaped,['cargo']);assert.deepEqual(r.used,[false,false,true]);assert.equal(r.closed,false);assert.equal(r.hostile,true);assert.equal(r.shots.length,0);assert.equal(r.rolls.filter(x=>x.kind==='PURSUIT').length,1);assert.equal(r.rolls.some(x=>x.kind==='FLEE'),false);assert.equal(r.after[2].hull,3);
});
test('ESC-01 : égalité échoue, N3 couvre la fuite contre le même résultat adverse',()=>{
 const dice=Array(13).fill(3);dice[8]=2;
 const n1=resolveConvoyRound(ships(),orders(1),dice),n3=resolveConvoyRound(ships(),orders(3),dice);
 assert.equal(n1.rolls.find(x=>x.kind==='INTERPOSE').success,false);assert.deepEqual(n1.escaped,[]);assert.deepEqual(n3.escaped,['cargo']);assert.equal(n3.rolls.find(x=>x.kind==='FLEE').specialBonus,1);assert.equal(n3.rolls.filter(x=>x.kind==='PURSUIT').length,1);assert.equal(n3.rolls.find(x=>x.kind==='FLEE').opposed,n3.rolls.find(x=>x.kind==='INTERPOSE').opposed);
});
test('ESC-01 : N3 ne cumule pas avec PIL-03 N4 et succès interposition rembourse la fuite',()=>{
 const dice=Array(13).fill(3);dice[8]=1;dice[10]=5;const r=resolveConvoyRound(ships(),orders(3,'PIL03_4'),dice),flee=r.rolls.find(x=>x.kind==='FLEE');assert.equal(flee.total,6);assert.equal(flee.opposed,6);assert.equal(flee.success,false);assert.equal(r.after[0].fuel,3);assert.equal(r.after[0].shield,1);assert.deepEqual(r.used,[true,false,true]);
 dice[8]=6;const saved=resolveConvoyRound(ships(),orders(5,'PIL03_4'),dice);assert.deepEqual(saved.used,[false,false,true]);assert.equal(saved.after[0].fuel,4);assert.equal(saved.after[0].shield,2);
});
test('ESC-01 : N5 ajoute un au résultat même avec manœuvrabilité permanente trois',()=>{
 const s=ships();s[2].maneuverability=3;const dice=Array(13).fill(3);dice[10]=5;
 const n4=resolveConvoyRound(s,orders(4),dice),n5=resolveConvoyRound(s,orders(5),dice);assert.equal(n4.rolls.find(x=>x.kind==='INTERPOSE').success,false);const q=n5.rolls.find(x=>x.kind==='INTERPOSE');assert.equal(q.total,7);assert.equal(q.bonus,1);assert.equal(q.success,true);assert.equal(n5.after[2].maneuverability,3);
});
test('ESC-01 : cargo passif, poursuivant absent ou escorte immobilisée ne consomment rien',()=>{
 for(const change of [(s,o)=>o[0]=order('PASSIVE','pirate'),(s,o)=>o[1]=order('PASSIVE','cargo'),(s)=>s[2].hull=0,(s)=>s[0].hull=0,(s)=>s[1].hull=0]){
  const s=ships(),o=orders(5);change(s,o);const r=resolveConvoyRound(s,o,Array(13).fill(6));assert.equal(r.used[2],false);assert.equal(r.rolls.some(x=>x.kind==='INTERPOSE'),false);assert.equal(r.shots.length,0);
 }
});
test('ESC-01 : immobilisation par tir avant la fuite ne donne ni test ni couverture',()=>{
 const s=ships();s[2].hull=1;s[2].shield=0;const o=orders(5);o[1]=order('ATTACK','escort');const r=resolveConvoyRound(s,o,Array(13).fill(6));assert.equal(r.after[2].hull,0);assert.equal(r.used[2],false);assert.equal(r.rolls.some(x=>x.kind==='INTERPOSE'),false);assert.deepEqual(r.escaped,['cargo']);
});
test('ESC-01 : reddition du cargo acceptée rend l’interposition inexécutable',()=>{
 const o=orders(5);o[0]={...o[0],kind:'SURRENDER',fallback:'FLEE'};o[1].acceptSurrender=true;const r=resolveConvoyRound(ships(),o,Array(13).fill(6));assert.equal(r.used[2],false);assert.deepEqual(r.withdrawn,['cargo']);assert.equal(r.rolls.length,0);
});
