import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {createCentralImportUi} from '../web/central-import.mjs';
import {readCentralXlsx,writeCentralXlsx} from '../web/central-xlsx.mjs';
import {readMasterXlsx} from '../web/master-xlsx.mjs';
import {importFixture} from './support/central-import-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
const ui=createCentralImportUi({button:(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`});
const d={campaign:{id:'campaign'},workshop:'M1',rights:{editWorkshops:[]},changes:[{entityId:'ingredient',data:{name:'<script>',revision:2},operation:'UPSERT'}]};
test('Excel central UI : lecture seule exporte, édition ouvre un fichier avec aperçu',()=>{
 assert.match(ui.buttons(d),/data-action="centralExport"/);assert.doesNotMatch(ui.buttons(d),/data-action="centralImport"/);assert.match(ui.buttons({...d,rights:{editWorkshops:['M1']}}),/data-action="centralImport"/);assert.equal(ui.buttons({...d,workshop:'M2'}),'');
 const h=ui.exportForm(d);assert.match(h,/name="selected" value="ingredient"/);assert.match(h,/Sans sélection/);assert.doesNotMatch(h,/<script>| checked/);assert.match(h,/&lt;script&gt;/);assert.match(ui.importForm(d),/accept=".xlsx" required/);
});
test('Excel central UI : erreurs et lot déjà enregistré ne proposent aucune confirmation',()=>{
 const p={errors:[{sheet:'Objets',row:7,column:'nom',id:'x',message:'<img>'}],changes:[],diagnostics:[],confirmation:null};let h=ui.preview(d,p,'<script>.xlsx');assert.match(h,/ligne 7/);assert.match(h,/&lt;img&gt;/);assert.doesNotMatch(h,/<img>|<script>|data-form="centralImportApply"/);
 h=ui.preview(d,{...p,errors:[],alreadyApplied:{changed:2,draftRevision:3}},'rejeu.xlsx');assert.match(h,/déjà été enregistré/);assert.doesNotMatch(h,/data-form="centralImportApply"/);
});
test('Excel central UI : aperçu avant/après et confirmation explicite avec motif',()=>{
 const h=ui.preview(d,{errors:[],changes:[{id:'x',sheet:'Objets',row:3,operation:'MODIFIER',fields:[{field:'name',before:'Ancien',after:'<img>'}]}],diagnostics:[{entityId:'x',field:'product',reference:'<b>',message:'Manquant'}],confirmation:'hash'},'test.xlsx');assert.match(h,/Avant/);assert.match(h,/Après/);assert.match(h,/&lt;img&gt;/);assert.match(h,/&lt;b&gt;/);assert.match(h,/name="reason" maxlength="500" required/);assert.match(h,/name="confirmed" type="checkbox" required/);assert.match(h,/data-action="centralImport" type="button"/);assert.doesNotMatch(h,/<img>|<b>/);
});
test('Excel central XLSX : refus formules, macros, entités, colonnes et anciennes feuilles',async()=>{
 const f=await importFixture(()=>new MemoryStore()),e=await f.exportFile(),original=unzipSync(writeCentralXlsx(e.sheets));
 const mutated=fn=>{const files=structuredClone(original);fn(files);return zipSync(files);};
 assert.throws(()=>readCentralXlsx(mutated(f=>f['xl/worksheets/sheet1.xml']=strToU8(strFromU8(f['xl/worksheets/sheet1.xml']).replace('<is>','<f>1+1</f><is>')))),/formule/);
 assert.throws(()=>readCentralXlsx(mutated(f=>f['xl/vbaProject.bin']=strToU8('macro'))),/macro/i);
 assert.throws(()=>readCentralXlsx(mutated(f=>f['xl/workbook.xml']=strToU8(strFromU8(f['xl/workbook.xml']).replace('?>','?><!DOCTYPE w [<!ENTITY x SYSTEM "file:///etc/passwd">]>')))),/XML/);
 assert.throws(()=>readCentralXlsx(mutated(f=>f['xl/worksheets/sheet2.xml']=strToU8(strFromU8(f['xl/worksheets/sheet2.xml']).replace('revision','stock')))),/Colonne/);
 assert.throws(()=>readCentralXlsx(mutated(f=>f['xl/workbook.xml']=strToU8(strFromU8(f['xl/workbook.xml']).replace('name="Objets"','name="Dotations"')))),/Onglet/);
 assert.throws(()=>readMasterXlsx(writeCentralXlsx(e.sheets)),/Colonne/);assert.throws(()=>readCentralXlsx(new Uint8Array(8*1024*1024+1)),/8 Mio/);
});
