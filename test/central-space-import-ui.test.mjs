import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralImportUi} from '../web/central-import.mjs';
import {spaceImportFixture,centralModelRow,centralPortRow,centralRouteRow} from './support/central-space-import-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
const ui=createCentralImportUi({button:(label,action)=>`<button data-action="${action}">${label}</button>`});
const d={campaign:{id:'c'},workshop:'M3',rights:{editWorkshops:[]},changes:[{type:'shipModel',entityId:'same',operation:'UPSERT',data:{name:'<img>Modèle',revision:3}},{type:'port',entityId:'same',operation:'ARCHIVE',data:{name:'<b>Port',revision:2}},{type:'route',entityId:'same',operation:'UPSERT',data:{name:'<i>Route',revision:1}},{type:'item',entityId:'foreign',operation:'UPSERT',data:{name:'Étranger'}}]};
test('Excel M3 UI : sélection typée des trois homonymes et noms échappés',()=>{
 const h=ui.exportForm(d);for(const type of ['shipModel','port','route'])assert.ok(h.includes(`value="${type}_same"`));assert.match(h,/Modeles · &lt;img&gt;Modèle · same · r3/);assert.match(h,/Ports · &lt;b&gt;Port · same · r2 · archivé/);assert.match(h,/Routes · &lt;i&gt;Route · same · r1/);assert.doesNotMatch(h,/value="foreign"|<img>|<b>|<i>|undefined/);
});
test('Excel M3 UI : lecture seule exporte, édition explicite requise pour importer',()=>{
 assert.match(ui.buttons(d),/centralExport/);assert.doesNotMatch(ui.buttons(d),/data-action="centralImport"/);assert.match(ui.buttons({...d,rights:{editWorkshops:['M3']}}),/data-action="centralImport"/);
});
test('Excel M3 UI : trois feuilles, valeurs fermées et codes sans défaut',()=>{
 const h=ui.importForm(d);for(const text of ['trois feuilles Modeles, Ports et Routes','même vides','100 lignes au total','sans ajouter de préfixe','FIGHTER, CARGO ou TRANSPORT','SHORT, MEDIUM ou LONG','SECURED, DANGEROUS ou HOSTILE','indépendant de la distance','origine_port_id','destination_port_id','code_navigation','sans code par défaut','Aucun vaisseau, voyage'])assert.ok(h.includes(text),text);assert.match(h,/accept=".xlsx" required/);assert.doesNotMatch(ui.importForm({...d,workshop:'M1'}),/trois feuilles Modeles/);
});
test('Excel M3 UI : aperçu et erreurs par feuille, secrets échappés, confirmation requise',()=>{
 const p={errors:[],changes:[{id:'same',type:'port',sheet:'Ports',row:2,operation:'MODIFIER',fields:[{field:'navigationCode',before:'Privé',after:'<script>Code</script>'}]},{id:'same',type:'route',sheet:'Routes',row:4,operation:'CREER',fields:[]}],diagnostics:[{entityId:'same',field:'fromPort',reference:'<x>',sheet:'Routes',row:4,column:'origine_port_id',message:'À préparer'}],confirmation:'hash'},h=ui.preview(d,p,'<b>.xlsx');assert.match(h,/Ports ligne 2/);assert.match(h,/Routes ligne 4 · origine_port_id/);assert.match(h,/&lt;script&gt;Code/);assert.match(h,/name="confirmed" type="checkbox" required/);assert.doesNotMatch(h,/<script>|<x>|<b>/);const bad=ui.preview(d,{...p,errors:[{sheet:'Routes',row:4,column:'distance_id',message:'Invalide'}],confirmation:null},'M3.xlsx');assert.match(bad,/Routes · ligne 4 · distance_id/);assert.doesNotMatch(bad,/data-form="centralImportApply"/);
});
test('Excel M3 UI : vrai XLSX des trois types avec formules littérales et secrets',async()=>{
 const f=await spaceImportFixture(()=>new MemoryStore()),input=await f.file([{...centralModelRow,id:'same',nom:'=1+1',notes_mj:'!!EFFACER'}],[{...centralPortRow,id:'same',code_navigation:'!!!Code'}],[{...centralRouteRow,id:'same',origine_port_id:'same',nom:'@route',notes_mj:'!!!Privé'}]);await f.apply(input,await f.prepare(input));const out=await f.round(['shipModel_same','port_same','route_same']);assert.equal(out.sheets.Modeles[0].nom,'=1+1');assert.equal(out.sheets.Modeles[0].notes_mj,'!!EFFACER');assert.equal(out.sheets.Ports[0].code_navigation,'!!!Code');assert.equal(out.sheets.Routes[0].nom,'@route');assert.equal(out.sheets.Routes[0].notes_mj,'!!!Privé');assert.ok((await f.prepare(out)).changes.every(c=>c.operation==='INCHANGE'));
});
