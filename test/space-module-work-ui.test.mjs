import test from 'node:test';
import assert from 'node:assert/strict';
import {moduleWorkConfirmHtml} from '../web/space-module-work.mjs';
import {moduleMandatesHtml} from '../web/space-module-mandates.mjs';
const r={id:'m',status:'MODULE_APPROVED',shipName:'<script>Ship</script>',lotId:'lot',module:{code:'MOD-01',label:'Bouclier',size:2},ownerName:'Owner',technicianName:'Tech',portName:'Port',install:{seconds:600,level:2,actionPoints:1},before:{available:5},after:{available:4},confirmation:'proof',valid:true,technician:true,workEnabled:true};
test('Travaux modules UI : aperçu de réserve, présence et atelier, finalisation distincte',()=>{
 const h=moduleWorkConfirmHtml('prepareModuleWorkStart',r,{sessionId:'s',mandateId:'m'});assert.match(h,/5 → 4 disponibles/);assert.match(h,/name="present"/);assert.match(h,/name="workshopConfirmed"/);assert.match(h,/startModuleWork/);assert.match(h,/ne monte pas le module/);assert.doesNotMatch(h,/<script>|name="(seconds|amount|actionPoints)"/);
 const page=moduleMandatesHtml({session:{id:'s',stage:'EN_JEU'},jobs:[r]});assert.match(page,/prepareModuleWorkStart/);assert.doesNotMatch(moduleMandatesHtml({session:{id:'s',stage:'EN_JEU'},jobs:[{...r,technician:false}]}),/prepareModuleWorkStart/);
});
test('Travaux modules UI : interruption, minuteur et absence de finalisation automatique',()=>{
 const active={...r,status:'MODULE_ACTIVE',working:true,remainingSeconds:0,canCancel:true},h=moduleWorkConfirmHtml('moduleWorkAdmin',active,{sessionId:'s',mandateId:'m'});assert.match(h,/cancelModuleWorkAdmin/);assert.match(h,/name="reason"/);assert.match(h,/ne consomme pas le PA automatiquement/);assert.doesNotMatch(moduleWorkConfirmHtml('moduleWork',{...active,canCancel:false},{}),/<form/);
 const page=moduleMandatesHtml({session:{id:'s',stage:'EN_JEU'},jobs:[active]});assert.match(page,/Temps restant : 0 s/);assert.match(page,/moduleWork/);assert.doesNotMatch(page,/prepareModuleWorkStart|finishModule|<script>/);
});

test('Montage modules UI : finalisation personnelle après délai, compte rendu et limites à quai',()=>{
 const d={...r,status:'MODULE_ACTIVE',remainingSeconds:0,canCancel:true,canFinish:true};assert.match(moduleWorkConfirmHtml('moduleWork',d,{sessionId:'s',mandateId:'m'}),/prepareModuleInstallation/);assert.doesNotMatch(moduleWorkConfirmHtml('moduleWorkAdmin',{...d,canFinish:false},{}),/prepareModuleInstallation/);
 const h=moduleWorkConfirmHtml('prepareModuleInstallation',{...d,hull:2,shield:1,afterProfile:{hullMax:4,shieldMax:3,maneuverability:1}},{});assert.match(h,/finishModuleInstallation/);for(const name of ['present','workshopConfirmed','performed'])assert.match(h,new RegExp(`name="${name}"`));assert.match(h,/restent à 2 et 1/);assert.match(h,/voyages avec modules restent à ouvrir/);assert.doesNotMatch(h,/<script>|name="(hull|shield|seconds|actionPoints)"/);
});

test('Retrait modules UI : opération explicite, cinq minutes et confirmation de restitution sans points rendus',()=>{
 const d={...r,moduleOperation:'REMOVE',install:{level:2,seconds:300,actionPoints:1},remainingSeconds:0,canFinish:true,canCancel:true};const h=moduleWorkConfirmHtml('moduleWork',d,{});assert.match(h,/prepareModuleRemoval/);assert.match(h,/en conservant le module monté/);assert.doesNotMatch(h,/data-command="prepareModuleInstallation"/);const q=moduleWorkConfirmHtml('prepareModuleRemoval',{...d,hull:5,afterHull:4,shield:1,afterShield:1,afterProfile:{hullMax:4,shieldMax:2}},{});assert.match(q,/finishModuleRemoval/);assert.match(q,/5 → 4/);assert.match(q,/Aucun point rendu/);assert.match(q,/name="performed"/);assert.doesNotMatch(q,/<script>|name="(seconds|quantity|hull)"/);
});
