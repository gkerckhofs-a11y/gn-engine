import test from 'node:test';
import assert from 'node:assert/strict';
import {masterEditors,masterEditor,masterEditorsFor} from '../src/shared/master-editors.mjs';
import {moduleDraft,moduleFormRow,moduleListHtml,moduleEditorHtml,filteredMasterRows,moduleMasterSheets,moduleRefreshDraft} from '../web/master-editor.mjs';
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

const catalogue=sheet=>({...workspace('personnages'),sheet,references:{allSkills:[{id:'savoir',name:'Savoir <privé>',publication:'PUBLISHED'},{id:'futur',name:'En préparation',publication:'DRAFT'}],consumables:[{id:'kit',name:'Kit de test'}]}});
test('Catalogues en ligne : choix des feuilles, types de soin et valeurs laissées à configurer',()=>{
 assert.deepEqual(masterEditorsFor('personnages').map(e=>e.sheet),['Personnages','Competences','Classes','Groupes']);
 assert.equal(masterEditor('personnages','__proto__'),null);assert.equal(masterEditor('spatioport','Classes'),null);
 const w=catalogue('Competences'),d=moduleDraft(w),list=moduleListHtml(w);
 for(const sheet of ['Personnages','Competences','Classes','Groupes'])assert.ok(list.includes(`data-sheet="${sheet}"`));
 assert.match(list,/data-sheet="Competences" aria-current="page" disabled/);
 assert.ok(!moduleEditorHtml(w,d).includes('name="soin_pv"'));
 for(const type of ['ACTIVE_SELF','ACTIVE_TARGET']){
  const active=moduleRefreshDraft(w,d,{nom:'Test',type,reason:'Motif conservé'}),html=moduleEditorHtml(w,active);
  for(const name of ['soin_pv','usages','recuperation_secondes'])assert.match(html,new RegExp(`name="${name}"[^>]*value=""`));
  assert.ok(!html.includes('name="consommable_quantite"'));
  const cost=moduleRefreshDraft(w,active,{consommable_id:'kit',soin_pv:'5',recuperation_secondes:'0'});
  assert.match(moduleEditorHtml(w,cost),/name="consommable_quantite"[^>]*required/);
  const passive=moduleRefreshDraft(w,cost,{type:'PASSIVE'});assert.ok(!moduleEditorHtml(w,passive).includes('name="soin_pv"'));
  assert.equal(moduleRefreshDraft(w,passive,{type}).row.soin_pv,'5');assert.equal(passive.reason,'Motif conservé');
 }
});
test('Classes en ligne : sélection et niveaux explicites, références absentes conservées pour correction',()=>{
 const w=catalogue('Classes');w.rows=[{row:{id:'classe',version:'2',nom:'Classe',publication:'DRAFT',competences:'savoir:3;perdue:7'}}];
 const d=moduleDraft(w,'classe'),html=moduleEditorHtml(w,d);
 assert.ok(html.includes('Savoir &lt;privé&gt;'));assert.ok(html.includes('Référence indisponible (perdue)'));
 assert.match(html,/name="competences__level__savoir"[^>]*value="3" required/);
 assert.match(html,/name="competences__level__futur"[^>]*value="" disabled/);
 const values={nom:'Classe corrigée',publication:'DRAFT',competences__levels:'1',competences__skill__savoir:'OUI',competences__level__savoir:'4',competences__level__futur:'99',reason:'Choix explicite'};
 const refreshed=moduleRefreshDraft(w,d,values);assert.equal(refreshed.row.competences,'savoir:4');assert.equal(refreshed.reason,'Choix explicite');
 assert.equal(moduleFormRow(w,d,values).competences,'savoir:4');
 assert.equal(moduleFormRow(w,d,{nom:'Sans compétence',competences__levels:'1'}).competences,'!EFFACER');
 const readOnly=moduleEditorHtml(w,d,true);assert.ok(readOnly.includes('<fieldset disabled>'));assert.ok(!readOnly.includes('data-master-form='));
});

test('Cours en ligne : choix d’un objet non coté, pas de duplication et identité figée à la modification',()=>{
 const w={...workspace('economie'),sheet:'Cours',newRow:{id:'',version:'1'},references:{items:[{id:'kit',name:'Kit <test>'}],unpricedItems:[{id:'fuel',name:'Carburant'}]},rows:[{row:{id:'kit',version:'2',prix_base:'7',actif:'OUI'},title:'Kit',state:'active'}]};
 const html=moduleEditorHtml(w,moduleDraft(w));assert.match(html,/value="fuel"/);assert.ok(!html.includes('value="kit"'));assert.match(html,/name="prix_base"[^>]*value=""/);
 assert.ok(!moduleListHtml(w).includes('data-master-action="moduleDuplicate"'));
 const d=moduleDraft(w,'kit'),existing=moduleEditorHtml(w,d);assert.match(existing,/name="id" disabled/);assert.ok(existing.includes('Kit &lt;test&gt;'));
 assert.equal(moduleFormRow(w,d,{id:'fuel',prix_base:'9',actif:'OUI'}).id,'kit');assert.throws(()=>moduleDraft(w,'kit','duplicate'),/unique/);
 assert.equal(moduleFormRow(w,moduleDraft(w),{id:'fuel',prix_base:'13',actif:'NON'}).id,'fuel');
});
test('Vaisseaux en ligne : propriétaire lié au type, première navigation et états acquis masqués',()=>{
 const w={...workspace('spatioport'),sheet:'Vaisseaux',references:{characters:[{id:'p',name:'Pilote'}],groups:[{id:'g',name:'Équipage'}],fuels:[{id:'fuel',name:'Carburant'}]}};
 let d=moduleDraft(w),html=moduleEditorHtml(w,d);assert.ok(html.includes('Équipage'));assert.ok(!html.includes('Pilote'));assert.ok(!html.includes('name="carburant_initial"'));
 d=moduleRefreshDraft(w,d,{nom:'Cargo',proprietaire_id:'g',proprietaire_type:'CHARACTER',reason:'Choisir le propriétaire'});assert.equal(d.row.proprietaire_id,'');assert.ok(moduleEditorHtml(w,d).includes('Pilote'));
 d=moduleRefreshDraft(w,d,{proprietaire_id:'p',carburant_objet_id:'fuel'});html=moduleEditorHtml(w,d);assert.match(html,/name="carburant_initial"[^>]*required[^>]*value=""/);assert.ok(html.includes('Choisir le propriétaire'));
 w.session=true;w.rows=[{row:{...d.row,id:'ship',version:'2',capacite_volume:'5',capacite_reservoir:'8'},navigationInitialized:true}];
 const existing=moduleDraft(w,'ship');html=moduleEditorHtml(w,existing);for(const f of ['carburant_initial','port_initial','a_quai'])assert.ok(!html.includes(`name="${f}"`));
 const row=moduleFormRow(w,existing,{...existing.row,carburant_initial:'100',port_initial:'ailleurs',a_quai:'OUI'});assert.ok(!Object.hasOwn(row,'carburant_initial'));assert.ok(!Object.hasOwn(row,'port_initial'));assert.ok(!Object.hasOwn(row,'a_quai'));
 w.rows[0].navigationInitialized=false;html=moduleEditorHtml(w,moduleDraft(w,'ship'));assert.ok(html.includes('name="carburant_initial"'));assert.ok(html.includes('name="port_initial"'));
});
test('Événements en ligne : effets conditionnels, bornes existantes et motif conservé',()=>{
 const w={...workspace('economie'),sheet:'EvenementsEco',references:{items:[],routes:[],installations:[]}},d=moduleDraft(w);
 let html=moduleEditorHtml(w,d);assert.match(html,/name="variation_prix_pct"[^>]*max="1000"[^>]*min="-100"[^>]*value=""/);assert.ok(!html.includes('name="route_id"'));assert.ok(!html.includes('name="installation_id"'));
 const route=moduleRefreshDraft(w,d,{titre:'Détour',cible_type:'ROUTE',declenchement:'INSTALLATION_OFFLINE',reason:'Essai'});html=moduleEditorHtml(w,route);assert.ok(!html.includes('name="objet_id"'));assert.ok(html.includes('name="route_id"'));assert.ok(html.includes('name="installation_id"'));assert.ok(html.includes('Essai'));
 const row=moduleFormRow(w,route,{...route.row,route_id:'r',installation_id:'i',variation_carburant_pct:'0',variation_duree_pct:'12',depart_suspendu:'OUI'});assert.equal(row.objet_id,'!EFFACER');assert.equal(row.commerce_suspendu,'NON');assert.equal(row.variation_prix_pct,'0');
});
