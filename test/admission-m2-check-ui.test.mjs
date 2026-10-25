import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAdmissionUi} from '../web/admissions.mjs';
import {MemoryStore} from './support/memory.mjs';
import {reconciliationFixture} from './support/admission-m2-reconciliation-suite.mjs';
const ui=createAdmissionUi({button:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
test('Contrôle dossiers M2 UI : accès visible avec lecture M2 sans droit de rapprochement',()=>{
 const d={sessionId:'s',settings:{open:false},registrations:[],invitations:[],canPrepareM2:false};assert.match(ui.admin({...d,canCheckM2:true}),/data-action="checkAdmissionM2"/);assert.doesNotMatch(ui.admin({...d,canCheckM2:false}),/data-action="checkAdmissionM2"/);
});
test('Contrôle dossiers M2 UI : véritable rapport concordant, portée et relance explicites',async()=>{
 const f=await reconciliationFixture(()=>new MemoryStore()),d=await f.read('checkAdmissionM2'),html=ui.m2Check(d);assert.match(html,/1 dossiers approuvés · 1 concordants/);assert.match(html,/Identité et choix concordants/);assert.match(html,/n’autorise aucune publication ni naissance/);assert.match(html,/Une modification ultérieure exige un nouveau contrôle/);assert.match(html,/data-action="checkAdmissionM2"/);assert.match(html,/Combattant/);assert.doesNotMatch(html,/data-form=|type="submit"|name="confirmation"/);assert.ok(!html.includes(f.player.email));
});
test('Contrôle dossiers M2 UI : corrections, texte MJ conservé, contenu échappé',async()=>{
 const f=await reconciliationFixture(()=>new MemoryStore());await f.edit({biography:'Récit MJ à conserver'});await f.review('CHANGE_CLASS',{classId:'ROG',secondaryId:'MED-02'});const d=await f.read('checkAdmissionM2');d.rows[0].displayName='<script>Test</script>';d.diagnostics.push({code:'constructor',characterId:'<img onerror=x>'});const html=ui.m2Check(d);assert.match(html,/des corrections ou décisions/i);assert.match(html,/<details open>/);assert.match(html,/Écarts : classe/);assert.match(html,/Sa conservation est autorisée/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<script>|<img |function Object|Récit MJ à conserver/);
});
test('Contrôle dossiers M2 UI : API de lecture seule et protection contre retour de navigation',()=>{
 const source=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');assert.match(source,/if\(a==='checkAdmissionM2'\)\{const d=await api\('checkAdmissionM2',\{sessionId:currentAdmission.sessionId\}\);if\(actionVersion!==routeVersion\)return;modal\(admissionUi.m2Check\(d\)\);return;\}/);assert.doesNotMatch(source,/mutate\('checkAdmissionM2'/);
});
