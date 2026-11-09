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
test('M6 : refus des paramètres d intrusion incohérents',()=>{
 for(const patch of [{category:'REAL_DOOR'},{threshold:13},{minLevel:0},{successText:''}]){
  assert.throws(()=>centralFieldTargetInput({...target,intrusion:{...target.intrusion,...patch}},'invalid'));
 }
 assert.throws(()=>centralFieldTargetInput({...target,rewards:[{id:'credit',kind:'CREDITS'}]},'invalid'));
});
