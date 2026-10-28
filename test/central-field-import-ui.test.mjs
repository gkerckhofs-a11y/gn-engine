import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCentralImportUi} from '../web/central-import.mjs';
import {MemoryStore} from './support/memory.mjs';
import {fieldImportFixture,fieldImportRow} from './support/central-field-import-suite.mjs';
const ui=createCentralImportUi({button:(label,action)=>`<button data-action="${action}">${label}</button>`});
const d={campaign:{id:'c'},workshop:'M6',rights:{editWorkshops:[]},changes:[{type:'knowledge',entityId:'same',operation:'UPSERT',data:{title:'<img>Information',revision:3}},{type:'fieldTarget',entityId:'same',operation:'ARCHIVE',data:{title:'<b>Lieu',revision:2}},{type:'item',entityId:'foreign',data:{name:'Étranger'}}]};
test('Excel lieux UI : sélection M6 typée, schéma explicite et noms échappés',()=>{
 const h=ui.exportForm(d);assert.match(h,/data-schema="2"/);assert.match(h,/value="knowledge_same"/);assert.match(h,/value="fieldTarget_same"/);assert.match(h,/Informations · &lt;img&gt;Information/);assert.match(h,/Lieux · &lt;b&gt;Lieu · same · r2 · archivé/);assert.doesNotMatch(h,/undefined|value="foreign"|<img>|<b>/);assert.match(ui.exportForm({...d,workshop:'M1'}),/data-schema="1"/);const source=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');assert.match(source,/schemaVersion:Number\(form.dataset.schema\)/);assert.match(source,/readCentralXlsx/);
});
test('Excel lieux UI : lecture seule, formats historiques et structures complètes expliqués',()=>{
 assert.match(ui.buttons(d),/centralExport/);assert.doesNotMatch(ui.buttons(d),/data-action="centralImport"/);assert.match(ui.buttons({...d,rights:{editWorkshops:['M6']}}),/centralImport/);const h=ui.importForm(d);for(const text of ['Informations et Lieux','100 lignes cumulées','anciens fichiers Informations seuls','profils_json','recompenses_json','SABOTAGE et REPAIR','installation exige []','en secondes','ne crée ni réserve','ActionsTerrain/Recompenses'])assert.ok(h.includes(text),text);assert.match(h,/accept=".xlsx" required/);
});
test('Excel lieux UI : aperçu privé échappé, colonne et confirmation requise',async()=>{
 const f=await fieldImportFixture(()=>new MemoryStore()),row={...fieldImportRow(),notes_mj:'<script>Secret</script>'},input=await f.file([row]),p=await f.prepare(input),h=ui.preview(d,p,'<x>.xlsx');assert.match(h,/Lieux ligne 2 · recompenses_json/);assert.match(h,/&lt;script&gt;Secret/);assert.match(h,/name="confirmed" type="checkbox" required/);assert.doesNotMatch(h,/<script>|<x>/);input.sheets.Lieux[0].profils_json='{}';const bad=ui.preview(d,await f.prepare(input),'Terrain.xlsx');assert.match(bad,/Lieux · ligne 2 · profils_json/);assert.doesNotMatch(bad,/data-form="centralImportApply"/);
});
