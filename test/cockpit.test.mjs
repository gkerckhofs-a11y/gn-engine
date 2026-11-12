import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,applyVisualEvent} from '../web/cockpit/state.mjs';
test('Cockpit : rejouer un effet ne dépense ni carburant ni état du vaisseau',()=>{
 const s=initialState(),event={id:'server-event-1',type:'impact'},next=applyVisualEvent(s,event);
 assert.equal(next.hull,s.hull);assert.equal(next.shield,s.shield);assert.equal(next.fuel,s.fuel);assert.equal(applyVisualEvent(next,event),next);
 assert.deepEqual(initialState(),s);
});
test('Cockpit : un résultat reçu actualise les instruments sans rejouer de calcul',()=>{
 const s=applyVisualEvent(initialState(),{id:'confirmed-state',type:'telemetry',hull:3,shield:0,fuel:5});
 const shot=applyVisualEvent(s,{id:'confirmed-shot',type:'shot'});
 assert.equal(shot.hull,3);assert.equal(shot.shield,0);assert.equal(shot.fuel,5);
 for(const value of [-1,NaN,Infinity,99])assert.throws(()=>applyVisualEvent(s,{id:'invalid',type:'telemetry',hull:value}));
 assert.equal(s.hull,3);
});
test('Cockpit : seuls les événements connus changent une scène',()=>{
 assert.throws(()=>applyVisualEvent(initialState(),{id:'bad',type:'damage'}));
 assert.throws(()=>applyVisualEvent(initialState(),{id:'bad',type:'phase',phase:'unknown'}));
 const s=initialState();assert.equal(applyVisualEvent(s,null),s);
 assert.equal(applyVisualEvent(s,{id:'departure',type:'phase',phase:'launch'}).phase,'launch');
 assert.equal(s.phase,'docked');
});
