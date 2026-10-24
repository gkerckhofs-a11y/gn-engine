import test from 'node:test';
import assert from 'node:assert/strict';
import {centralDraftCheck} from '../src/core/central-check.mjs';
import {centralCharacterInput} from '../src/core/central-characters.mjs';
import {recipeInput} from '../src/core/recipe-state.mjs';
import {centralTestCharacter} from './support/central-characters-suite.mjs';
import {centralTestRecipe} from './support/central-recipes-suite.mjs';
import {centralClassKitInput} from '../src/core/central-class-kits.mjs';

const context={campaign:{id:'campaign',title:'Fiction',revision:1,ruleProfile:'SPACE_OUTLAWS_V07',ownerUid:'owner'},session:{id:'session',revision:1},draft:{revision:1},actorUid:'owner',at:1};
const character=id=>({id:`character_${id}`,entityId:id,type:'character',workshop:'M2',operation:'UPSERT',revision:1,source:'WEB',actorUid:'owner',at:1,data:centralCharacterInput({...centralTestCharacter,relations:[]},id)});
test('C2a : empreinte stable malgré ordre des documents et des clés',()=>{
 const changes=[character('a'),character('b')],reverse=v=>Array.isArray(v)?v.map(reverse):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reverse(x)])):v;
 const a=centralDraftCheck({...context,changes}),b=centralDraftCheck({...context,changes:changes.reverse().map(reverse),at:2});
 assert.equal(a.fingerprint,b.fingerprint);assert.deepEqual(a.diff,b.diff);assert.notEqual(a.checkedAt,b.checkedAt);
});
test('C2a : doublon stocké exclu des cibles et du diff',()=>{
 const c=character('same'),r=centralDraftCheck({...context,changes:[c,c]});assert.equal(r.totals.invalid,2);assert.deepEqual(r.diff,[]);assert.equal(r.diagnostics[0].code,'INVALID_RECORD');
});
test('C2f : un kit dupliqué reste une cible invalide même si une copie est valide',()=>{
 const c=character('player');c.data=centralCharacterInput({...centralTestCharacter,relations:[],creationPlan:{classId:'MED',speciesId:'species',secondaryId:'COM-03'}},'player');
 const kit={id:'classKit_MED',entityId:'MED',type:'classKit',workshop:'M1',operation:'UPSERT',revision:1,source:'WEB',actorUid:'owner',at:1,data:centralClassKitInput({bindings:[]},'MED')};
 const r=centralDraftCheck({...context,changes:[kit,kit,c]});assert.equal(r.totals.invalid,2);assert.equal(r.initialPreparation.classes.find(c=>c.classId==='MED').kitStatus,'INVALID');assert.ok(r.diagnostics.some(d=>d.code==='CLASS_KIT_INVALID'));assert.equal(r.edges.find(e=>e.to.type==='classKit').status,'INVALID');
});
test('C2f : plan invalide exclu du résumé, ordre des documents sans effet sur la cohérence',()=>{
 const c=character('player'),bad=character('invalid');c.data=centralCharacterInput({...centralTestCharacter,relations:[],creationPlan:{classId:'MED',speciesId:'species',secondaryId:'COM-03'}},'player');bad.data.creationPlan={...c.data.creationPlan,classId:'FOR'};
 const a=centralDraftCheck({...context,changes:[c,bad]}),b=centralDraftCheck({...context,changes:[bad,c]});assert.equal(a.totals.invalid,1);assert.equal(a.initialPreparation.plannedCharacters,1);assert.equal(a.initialPreparation.narrativeOnlyCharacters,0);assert.deepEqual(a.initialPreparation,b.initialPreparation);assert.equal(a.fingerprint,b.fingerprint);assert.ok(a.diagnostics.some(d=>d.code==='INVALID_RECORD'));
});
test('C2a : budget global de contenu contrôlé avant projection',()=>{
 assert.throws(()=>centralDraftCheck({...context,changes:[{data:'x'.repeat(16*1024*1024)}]}),{code:'CENTRAL_CHECK_LIMIT'});
});
test('C2a : trop de diagnostics renvoie une limite explicite sans rapport tronqué',()=>{
 const ref=i=>`${i}_${'x'.repeat(120)}`;
 const chars=Array.from({length:100},(_,i)=>{const c=character(`c${i}`);c.data=centralCharacterInput({...centralTestCharacter,relations:Array.from({length:60},(_,j)=>({id:`r${j}`,title:'Contact',description:'',gmNotes:'',targetId:ref(j)}))},`c${i}`);return c;});
 const recipes=Array.from({length:250},(_,i)=>({id:`recipe_r${i}`,entityId:`r${i}`,type:'recipe',workshop:'M4',operation:'UPSERT',revision:1,source:'WEB',actorUid:'owner',at:1,data:recipeInput({...centralTestRecipe,publicationState:'DRAFT',components:Array.from({length:20},(_,j)=>({itemId:ref(j),quantity:1}))},`r${i}`)}));
 assert.throws(()=>centralDraftCheck({...context,changes:[...chars,...recipes]}),{code:'CENTRAL_CHECK_LIMIT'});
});
