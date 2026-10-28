import test from 'node:test';
import assert from 'node:assert/strict';
import {centralPlanForm,centralPlanPayload,centralPlanPreview,syncCentralPlanForm} from '../web/central-character-plan.mjs';
import {centralCharacterPayload,createCentralCharacterUi} from '../web/central-characters.mjs';
import {centralCheckFixture} from './support/central-check-suite.mjs';
import {centralTestCharacter} from './support/central-characters-suite.mjs';
import {centralTestPlan} from './support/central-character-plan-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
test('C2c UI : huit classes, espèce différée, initiation propre désactivée et texte échappé',()=>{
 const html=centralPlanForm({references:{species:[{id:'species',label:'<img src=x>',nature:'HUMANOID',available:false}]}},centralTestPlan);
 assert.equal((html.match(/<option value="(?:COM|ROG|TRA|MED|MEC|PIL|COU|INF)"/g)||[]).length,8);assert.match(html,/value="COM-03" disabled/);assert.doesNotMatch(html,/<option value="(?:FOR-01|LAS-01|JEDI|SITH|PNJ_FORCE_SENSITIVE)"/);assert.match(html,/&lt;img src=x&gt;/);assert.doesNotMatch(html,/<img/);assert.match(html,/non proposée aux nouvelles candidatures/);assert.match(html,/name="profileSpecies"/);assert.match(html,/Aucun bonus d’espèce/);
 assert.match(centralPlanForm({}),/name="profileClass" disabled/);assert.match(centralPlanForm({}),/Aucun profil joueur préparé/);
});
test('C2c UI : ancien formulaire conserve, nouveau formulaire retire ou prépare explicitement',()=>{
 assert.deepEqual(centralPlanPayload({}),{});assert.deepEqual(centralPlanPayload({profileMode:'NONE'}),{creationPlan:null});
 const values={profileMode:'PLAYER',profileClass:'COM',profileSpecies:' species-test ',profileSecondary:'MED-02'};assert.deepEqual(centralPlanPayload(values),{creationPlan:centralTestPlan});
 const p=centralCharacterPayload({...centralTestCharacter,...values},[],[]);assert.deepEqual(p.creationPlan,centralTestPlan);assert.equal(p.creationPlan.skills,undefined);assert.equal(p.abilityProfile,undefined);
});
test('C2c UI : changement de classe retire seulement une initiation devenue interdite',()=>{
 const options=[{value:'',disabled:false},{value:'COM-03',disabled:false},{value:'MED-02',disabled:false}];let value='COM-03';const secondary={options,get value(){return value;},set value(v){value=v;},get selectedOptions(){return options.filter(x=>x.value===value);}};
 const fields={profileMode:{value:'PLAYER'},profileClass:{value:'COM'},profileSpecies:{value:'species'},profileSecondary:secondary},preview={};const form={elements:fields,querySelector:()=>preview};syncCentralPlanForm(form);assert.equal(secondary.value,'');assert.equal(fields.profileSpecies.required,true);assert.equal(fields.profileSpecies.disabled,false);assert.match(preview.innerHTML,/Choisissez une classe/);
 secondary.value='MED-02';syncCentralPlanForm(form);assert.equal(secondary.value,'MED-02');assert.match(preview.innerHTML,/COM-01.*acquis fixe/);assert.match(preview.innerHTML,/COM-03.*N2/);assert.match(preview.innerHTML,/MED-02.*N1/);
 fields.profileMode.value='NONE';syncCentralPlanForm(form);assert.equal(fields.profileClass.disabled,true);assert.equal(fields.profileSpecies.required,false);assert.match(preview.innerHTML,/Aucun profil/);
});
test('C2c UI : aperçu privé sans bouton d’activation, plan conservé dans l’éditeur narratif',async()=>{
 const f=await centralCheckFixture(()=>new MemoryStore());await f.saveCharacter({character:{...centralTestCharacter,creationPlan:centralTestPlan}});const d=await f.view('M2'),ui=createCentralCharacterUi({button:(label,action)=>`<button data-action="${action}">${label}</button>`});
 assert.match(ui.form(d,'character',d.changes[0]),/value="COM" selected/);assert.match(ui.page(d),/Profil joueur initial préparé/);assert.match(ui.page(d),/Une place secondaire occupée sur cinq/);assert.doesNotMatch(centralPlanPreview(centralTestPlan),/<button|data-action|200 Cr|PV au maximum/);assert.equal(centralPlanPreview({classId:'<script>',secondaryId:'FOR-01'}).includes('<script>'),false);
});
