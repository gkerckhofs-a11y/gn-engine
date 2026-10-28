import test from 'node:test';
import assert from 'node:assert/strict';
import {moduleBundleSheets,moduleBundleHtml} from '../web/master-module-export.mjs';
import {writeMasterXlsx} from '../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../web/master-xlsx.mjs';
const meta=[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',destination_id:'destination',base_revision:'3',module:'spatioport'}];
const part=(sheet,rows)=>({sheet,module:'spatioport',meta,session:false,errors:[],rows});
const workspace=()=>({bundle:true,module:'spatioport',meta,editable:true,workspaces:[part('Routes',[{row:{id:'r',operation:'MODIFIER',version:'2',nom:'Route'},archived:false},{row:{id:'ancien',operation:'MODIFIER',version:'4',nom:'Ancienne'},archived:true}]),part('Vaisseaux',[])]});
test('Export groupé : toutes les lignes, archives et métadonnées communes au contrat XLSX',()=>{
 const w=workspace(),sheets=moduleBundleSheets(w);assert.deepEqual(Object.keys(sheets),['Meta','Routes','Vaisseaux']);assert.deepEqual(sheets.Routes[1],{id:'ancien',operation:'ARCHIVER',version:'4'});assert.equal(readMasterXlsx(writeMasterXlsx(sheets)).Routes.length,2);
 const html=moduleBundleHtml(w);assert.match(html,/Routes : 2 lignes/);assert.match(html,/indépendamment du filtre/);assert.match(html,/références des autres modules/);assert.match(html,/moduleDownloadAll/);
 assert.match(moduleBundleHtml({...w,editable:false}),/import Master est fermé/);
});
test('Export groupé : ambiguïté ou incohérence bloque le téléchargement entier',()=>{
 const w=workspace();w.workspaces[1].errors=['Identité <ambiguë>'];assert.throws(()=>moduleBundleSheets(w),/Identité/);const html=moduleBundleHtml(w);assert.match(html,/&lt;ambiguë&gt;/);assert.ok(!html.includes('data-master-action="moduleDownloadAll"'));
 const mixed=workspace();mixed.workspaces[1].meta=[{...meta[0],base_revision:'4'}];assert.throws(()=>moduleBundleSheets(mixed),/même destination/);
 const duplicate=workspace();duplicate.workspaces.push(duplicate.workspaces[0]);assert.throws(()=>moduleBundleSheets(duplicate),/Feuille répétée/);
 const huge=workspace();huge.workspaces[0].rows=Array(251).fill(huge.workspaces[0].rows[0]);assert.throws(()=>writeMasterXlsx(moduleBundleSheets(huge)),/limites/);
});
