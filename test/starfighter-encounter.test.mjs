import {MemoryStore} from './support/memory.mjs';
import {starfighterEncounterSuite} from './support/starfighter-encounter-suite.mjs';
starfighterEncounterSuite(()=>new MemoryStore());
import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedRoundCue} from '../web/cockpit/state.mjs';
test('HUD : tir manqué, défendu, bouclier et coque sur round confirmé uniquement',()=>{
 const before={id:'duel',round:2,hull:4,shield:1};
 const cue=(hull,shield,shot,previous=before)=>confirmedRoundCue(previous,{id:'duel',lastRound:{round:2,after:[{id:'moi',hull,shield}],shots:[{targetId:'moi',...shot}]}},'moi');
 assert.equal(cue(4,1,{hit:false}).effect,'miss');
 assert.equal(cue(4,1,{hit:true,defended:true}).effect,'defended');
 assert.equal(cue(4,0,{hit:true}).effect,'shield');
 assert.equal(cue(3,0,{hit:true}).effect,'hull');
 assert.equal(cue(3,0,{hit:true},null),null);
 assert.equal(cue(3,0,{hit:true},{...before,round:1}),null);
});
