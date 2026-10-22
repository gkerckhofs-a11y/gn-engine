import test from 'node:test';
import assert from 'node:assert/strict';
import {masterEditors} from '../src/shared/master-editors.mjs';
import {moduleDraft,moduleFormRow,moduleListHtml,moduleEditorHtml,filteredMasterRows,moduleMasterSheets} from '../web/master-editor.mjs';
const workspace=module=>({module,sheet:masterEditors[module].sheet,session:false,editable:true,errors:[],meta:[{module}],newRow:{id:'server-id',operation:'CREER',version:'1'},rows:[],references:{characters:[{id:'p',name:'<nom>'}],wallets:[],skills:[]}});
test('Masters en ligne : six formulaires sans barème imposé, affichage échappé et lecture seule',()=>{
 for(const module of Object.keys(masterEditors)){
  const w=workspace(module),d=moduleDraft(w),html=moduleEditorHtml(w,d);
  assert.ok(html.includes('server-id'));assert.match(html,/data-master-form="moduleRow"/);
  for(const f of masterEditors[module].fields.filter(f=>f.type==='number'))assert.match(html,new RegExp(`name="${f.name}"[^>]+value=""`));
  assert.ok(!moduleEditorHtml(w,d,true).includes('data-master-form='));
  assert.ok(!moduleListHtml({...w,editable:false}).includes('data-master-action="moduleEdit"'));
 }
 const w=workspace('communication');assert.ok(moduleEditorHtml(w,moduleDraft(w)).includes('&lt;nom&gt;'));
 w.rows=[{title:'<script>',ownerLabel:'<p>',state:'draft',row:{id:'o',personnage_id:'p',version:'2',titre:'<script>'}}];
 const d=moduleDraft(w,'o');assert.equal(moduleFormRow(w,d,{personnage_id:'intrus',titre:'Titre'}).personnage_id,'p');assert.ok(moduleListHtml(w).includes('&lt;script&gt;'));
});
test('Masters en ligne : filtre et export portent exactement sur les fiches affichées',()=>{
 const w=workspace('spatioport');w.rows=[{row:{id:'a',version:'3',nom:'Route A'},title:'Route A',ownerLabel:'',state:'draft',archived:false},{row:{id:'b',version:'5',nom:'Route B'},title:'Route B',ownerLabel:'',state:'archived',archived:true}];
 assert.equal(filteredMasterRows(w,'route','draft').length,1);assert.equal(filteredMasterRows(w,'B')[0].row.id,'b');
 const file=moduleMasterSheets(w,filteredMasterRows(w,'','archived'));assert.deepEqual(file.Routes,[{id:'b',operation:'ARCHIVER',version:'5'}]);assert.deepEqual(Object.keys(file),['Meta','Routes']);
 assert.equal(w.rows.length,2);assert.throws(()=>moduleMasterSheets({...w,errors:['Collision']}),/Collision/);
});
test('Masters en ligne : les champs acquis restent absents des formulaires de session existants',()=>{
 for(const module of ['personnages','informations']){
  const w=workspace(module);w.session=true;w.rows=[{title:'Test',state:'active',row:{id:'id',version:'2',nom:'Test',titre:'Test',texte:'Texte',publication:'PUBLISHED'}}];
  const html=moduleEditorHtml(w,moduleDraft(w,'id'));
  for(const field of ['niveau_global','pv_max_initiaux','personnages_initiaux'])assert.ok(!html.includes(`name="${field}"`));
  const copied=moduleDraft(w,'id','duplicate');assert.notEqual(copied.row.id,'id');assert.equal(copied.row.publication,'DRAFT');
 }
});
