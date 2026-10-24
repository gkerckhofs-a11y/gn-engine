import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralCheckUi} from '../web/central-check.mjs';
import {createCentralUi} from '../web/central-master.mjs';
import {centralCheckFixture} from './support/central-check-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
const link=(label,path,cls)=>`<a class="${cls}" href="#/${path}">${label}</a>`;
const button=(label,action,extra='',cls='')=>`<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
test('C2a UI : entrée de contrôle réservée au propriétaire et liée à la révision',async()=>{
 const f=await centralCheckFixture(()=>new MemoryStore()),ui=createCentralUi({button,link});await f.save();
 assert.ok(ui.page(await f.view()).includes(`central-check/${f.cid}/1`));await f.grant();assert.doesNotMatch(ui.page(await f.view('M1',f.mj)),/central-check/);
});
test('C2a UI : couverture partielle explicite et aucune action de publication',async()=>{
 const f=await centralCheckFixture(()=>new MemoryStore()),html=createCentralCheckUi({link}).page(await f.check());
 assert.match(html,/ne certifie pas encore toute la campagne/);assert.match(html,/Contrôles encore nécessaires/);assert.match(html,/M7/);assert.match(html,/Aucune définition préparée/);assert.doesNotMatch(html,/<form|<button|data-action="publish|Campagne valide/);
});
test('C2a UI : provenance, diagnostics et références échappés, secrets non rendus',async()=>{
 const f=await centralCheckFixture(()=>new MemoryStore());await f.saveCharacter();const r=await f.check(1);
 r.campaign.title='<script>bad</script>';r.diff[0].name='<img onerror=bad>';r.diagnostics[0].fileName='<svg onload=bad>';r.diagnostics[0].sheet='Recettes';r.diagnostics[0].row=8;r.diagnostics[0].column='produit_id';r.diagnostics[0].batchId='batch';
 const html=createCentralCheckUi({link}).page(r);assert.doesNotMatch(html,/<script|<img|<svg|Secret de fiction|Biographie fictive/);assert.match(html,/&lt;script&gt;/);assert.match(html,/ligne 8/);assert.match(html,/produit_id/);assert.match(html,/cible absente/);assert.match(html,/Contenus réservés/);assert.ok(html.includes(`central/${f.cid}/M2`));
});
