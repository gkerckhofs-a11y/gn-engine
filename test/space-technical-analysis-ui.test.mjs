import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {technicalAnalysisFixture} from './support/space-technical-analysis-suite.mjs';
import {fieldTargetHtml,fieldResultHtml} from '../web/field-actions.mjs';
import {createCentralUi} from '../web/central-master.mjs';
const ui=createCentralUi({button:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
test('UI diagnostic technique : préparation M6 distingue profil automatique et défauts à test non ouverts',async()=>{
 const f=await technicalAnalysisFixture(()=>new MemoryStore(),{release:false}),d=await f.central('centralMaster',{workshop:'M6'}),h=ui.fieldTargetForm(d,'new',null,'ANALYSIS');assert.match(h,/MEC-01/);assert.match(h,/Diagnostic technique préparé/);assert.match(h,/60 secondes/);assert.match(h,/défauts exigeant un test restent hors/);assert.match(h,/version correspondent à la panne préparée/);assert.doesNotMatch(h,/name="repairShip|name="transponder|name="hull/);
});
test('UI diagnostic technique : QR privé, scène sûre, sans aide ou matériel, puis résultat sans relance',async()=>{
 const f=await technicalAnalysisFixture(()=>new MemoryStore());await f.stage('EN_JEU');const d=await f.read('fieldTarget',{targetId:'scene'}),h=fieldTargetHtml(d);assert.match(h,/Diagnostic technique/);assert.match(h,/60 s de jeu · 1 PA/);assert.match(h,/Aucune manipulation réelle/);assert.match(h,/Résolution automatique/);assert.doesNotMatch(h,/name="bonusLotId"|name="aidOfferId"|TEXTE_PRIVE|VERITE_MJ|SECRET_MJ/);assert.match(fieldTargetHtml({...d,session:{...d.session,stage:'PAUSE'}}),/disabled>Préparer cette action/);const a=await f.start();f.advance(60000);const r=await f.finish(a),result=fieldResultHtml(r);assert.match(result,/Informations acquises/);assert.doesNotMatch(result,/Lancer|relancer|Dé :|field-roll|TEXTE_PRIVE|VERITE_MJ/);assert.match(fieldTargetHtml(await f.read('fieldTarget',{targetId:'scene'})),/Relire mes informations sans PA/);
});
