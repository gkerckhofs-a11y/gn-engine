import test from 'node:test';
import assert from 'node:assert/strict';
import {soIntrusionSuite} from './support/space-intrusion-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
import {centralFieldTargetInput,centralFieldTargetEditable} from '../src/core/central-field-targets.mjs';
soIntrusionSuite(()=>new MemoryStore());
const target={kind:'INTRUSION',title:'Serrure fictive',description:'Décor uniquement',gmNotes:'Vérité MJ',
 profiles:{},rewards:[],intrusion:{category:'LOCK',minLevel:2,threshold:6,
 successText:'CODE_SECRET_APRES_SUCCES',failureText:'Action refusée'}};
test('M6 : une intrusion est préparée sans matériel réel ni effet technique',()=>{
 const v=centralFieldTargetInput(target,'lock');
 assert.equal(v.kind,'INTRUSION');assert.deepEqual(v.profiles,{});
 assert.equal(v.intrusion.minLevel,2);assert.equal(v.publicationState,'DRAFT');
 const round=centralFieldTargetInput(centralFieldTargetEditable(v),'lock',v);
 assert.equal(round.intrusion.successText,v.intrusion.successText);
});
test('M6 : code secret haché, édition conservée, aucune réponse brute dans le Master',()=>{
 const raw={...target,intrusion:{...target.intrusion,
  challenge:{type:'CODE',prompt:'Quel est le code de la station ?',answerCode:'NOVA 2042',durationSeconds:90}}};
 const created=centralFieldTargetInput(raw,'lock');
 const challenge=created.intrusion.challenge;
 assert.equal(challenge.type,'CODE');
 assert.equal(challenge.durationSeconds,90);
 assert.match(challenge.answerDigest,/^[a-f0-9]{64}$/);
 assert.doesNotMatch(JSON.stringify(created),/NOVA 2042|answerCode/);
 const modified=centralFieldTargetInput({...raw,intrusion:{...raw.intrusion,
  challenge:{type:'CODE',prompt:'Quel est le nouveau panneau ?',answerCode:'',durationSeconds:120}}},'lock',created);
 assert.equal(modified.intrusion.challenge.answerDigest,challenge.answerDigest);
 assert.equal(modified.intrusion.challenge.durationSeconds,120);
 const checked=centralFieldTargetInput(centralFieldTargetEditable(created),'lock');
 assert.deepEqual(checked.intrusion.challenge,created.intrusion.challenge);
});
test('M6 : mini-jeu sans solution ou avec une durée invalide refusé',()=>{
 for(const challenge of [
  {type:'CODE',prompt:'Puzzle',durationSeconds:90},
  {type:'CODE',prompt:'Puzzle',durationSeconds:0,answerCode:'NOVA 2042'},
  {type:'CODE',prompt:'',durationSeconds:90,answerCode:'NOVA 2042'},
  {type:'CODE',prompt:'Puzzle',durationSeconds:90,answerCode:'A'},
  {type:'CODE',prompt:'Puzzle',durationSeconds:90,answerCode:'NOVA 2042',untrusted:true},
 ]){
  assert.throws(()=>centralFieldTargetInput({...target,intrusion:{...target.intrusion,challenge}},'bad'));
 }
});
test('M6 : refus des paramètres d intrusion incohérents',()=>{
 for(const patch of [{category:'REAL_DOOR'},{threshold:13},{minLevel:0},{successText:''}]){
  assert.throws(()=>centralFieldTargetInput({...target,intrusion:{...target.intrusion,...patch}},'invalid'));
 }
 assert.throws(()=>centralFieldTargetInput({...target,rewards:[{id:'credit',kind:'CREDITS'}]},'invalid'));
});
