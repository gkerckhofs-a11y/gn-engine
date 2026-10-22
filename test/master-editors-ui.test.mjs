import test from 'node:test';
import assert from 'node:assert/strict';
import {masterEditors,masterEditor,masterEditorsFor} from '../src/shared/master-editors.mjs';
import {moduleDraft,moduleFormRow,moduleListHtml,moduleEditorHtml,filteredMasterRows,moduleMasterSheets,moduleRefreshDraft,moduleFormSheets} from '../web/master-editor.mjs';
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
 assert.deepEqual(masterEditorsFor('personnages').map(e=>e.sheet),['Personnages','Attributions','Interactions','Competences','Classes','Groupes','Relations','Membres']);
 assert.equal(masterEditor('personnages','__proto__'),null);assert.equal(masterEditor('spatioport','Classes'),null);
 const w=catalogue('Competences'),d=moduleDraft(w),list=moduleListHtml(w);
 for(const sheet of ['Personnages','Attributions','Interactions','Competences','Classes','Groupes','Relations','Membres'])assert.ok(list.includes(`data-sheet="${sheet}"`));
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

test('Membres en ligne : droits guidés, aucune permission par défaut et retrait explicite de toutes les cases',()=>{
 const w={...workspace('personnages'),sheet:'Membres',references:{characters:[{id:'c',name:'Personnage'}],groups:[{id:'g',name:'Groupe'}],groupPermissions:[{id:'readWallet',name:'readWallet'},{id:'payWallet',name:'payWallet'}]}};
 const d=moduleDraft(w),html=moduleEditorHtml(w,d);assert.ok(!html.includes('checked'));assert.ok(html.includes('Consulter la caisse'));assert.ok(html.includes('Payer avec la caisse'));
 const values={...d.row,groupe_id:'g',personnage_id:'c',droits__checks:'1',droits__choice__readWallet:'OUI',droits__choice__payWallet:'NON'};
 assert.equal(moduleFormRow(w,d,values).droits,'readWallet');assert.equal(moduleFormRow(w,d,{...values,droits__choice__readWallet:'NON'}).droits,'!EFFACER');
 w.rows=[{row:{id:'m',version:'2',groupe_id:'g',personnage_id:'c',droits:'readWallet'},title:'Personnage — Groupe',state:'draft'}];const existing=moduleDraft(w,'m'),read=moduleEditorHtml(w,existing,true);assert.ok(read.includes('<fieldset disabled>'));assert.ok(!read.includes('data-master-form='));
 assert.ok(!moduleListHtml(w).includes('moduleDuplicate'));assert.ok(moduleListHtml(w).includes('Appartenance inactive'));assert.ok(moduleListHtml(w).includes('Désactiver'));
 assert.throws(()=>moduleDraft(w,'m','duplicate'),/appartenance est unique/);
});
test('Liens sociaux en ligne : identités non déplaçables, archivage ciblé et copie de relation non publiée',()=>{
 const w={...workspace('personnages'),sheet:'Membres',references:{},rows:[{row:{id:'m',version:'2',groupe_id:'g',personnage_id:'c',role:'Ancien'}}]};
 const d=moduleDraft(w,'m'),refreshed=moduleRefreshDraft(w,d,{groupe_id:'intrus',personnage_id:'autre',role:'Nouveau',reason:'Motif'});assert.equal(refreshed.row.groupe_id,'g');assert.equal(refreshed.row.personnage_id,'c');assert.equal(refreshed.row.role,'Nouveau');
 assert.deepEqual(moduleFormRow(w,moduleDraft(w,'m','archive'),{}),{id:'m',version:'2',operation:'ARCHIVER',personnage_id:'c',groupe_id:'g'});
 const relation={...workspace('personnages'),sheet:'Relations',rows:[{row:{id:'r',version:'3',personnage_id:'c',cible_id:'x',titre:'<Lien>',publication:'OUI',notes_mj:'Note privée'},title:'<Lien>',ownerLabel:'Personnage',state:'active'}]};
 const copy=moduleDraft(relation,'r','duplicate');assert.notEqual(copy.row.id,'r');assert.equal(copy.row.publication,'NON');assert.ok(moduleEditorHtml(relation,copy).includes('&lt;Lien&gt;'));assert.equal(copy.row.notes_mj,'Note privée');
});
test('Membres en ligne : ambiguïté historique interdit les actions et l’export sans masquer le diagnostic',()=>{
 const w={...workspace('personnages'),sheet:'Membres',references:{},errors:['Plusieurs identifiants <anciens>'],rows:[]};
 const html=moduleListHtml(w);assert.ok(html.includes('Plusieurs identifiants &lt;anciens&gt;'));assert.ok(!html.includes('data-master-action="moduleEdit"'));assert.ok(!html.includes('data-master-action="moduleExport"'));assert.throws(()=>moduleMasterSheets(w),/Plusieurs identifiants/);
});

test('Interactions en ligne : paramètres adaptés au type, valeurs explicites et prérequis guidés',()=>{
 const w={...workspace('personnages'),sheet:'Interactions',references:{skills:[{id:'secours',name:'Secours <fictifs>'}],fieldConsumables:[{id:'kit',name:'Kit'}]}},d=moduleDraft(w);
 let html=moduleEditorHtml(w,d);for(const name of ['duree_secondes','soin_pv','niveau_reanimation','convalescence_secondes','recuperation_patient_secondes'])assert.match(html,new RegExp(`name="${name}"[^>]*value=""`));assert.ok(!html.includes('name="recuperation_secondes"'));assert.ok(html.includes('Secours &lt;fictifs&gt;'));
 const fast=moduleRefreshDraft(w,d,{nom:'Clinique',type:'CLINIC_FAST',reason:'Motif'});html=moduleEditorHtml(w,fast);assert.ok(html.includes('name="seuil"'));assert.ok(html.includes('name="complement_secondes"'));assert.ok(!html.includes('name="soin_pv"'));
 const loot=moduleRefreshDraft(w,fast,{type:'LOOT_COMMON'});html=moduleEditorHtml(w,loot);assert.ok(html.includes('name="recuperation_secondes"'));assert.ok(!html.includes('name="consommable_id"'));assert.ok(!html.includes('name="competence_id"'));assert.ok(html.includes('Motif'));assert.ok(!moduleEditorHtml(w,loot,true).includes('data-master-form='));
 const row=moduleFormRow(w,loot,{...loot.row,duree_secondes:'0',recuperation_secondes:'',prerequis__levels:'1',prerequis__skill__secours:'OUI',prerequis__level__secours:'2'});assert.equal(row.prerequis,'secours:2');assert.equal(row.recuperation_secondes,'!EFFACER');assert.equal(row.consommable_id,'!EFFACER');assert.equal(row.competence_id,'!EFFACER');
});
test('Interactions en ligne : correction des champs inactifs, copie non publiée et archivage ciblé',()=>{
 const w={...workspace('personnages'),sheet:'Interactions',references:{skills:[],fieldConsumables:[]},rows:[{row:{id:'i',version:'4',nom:'Test',type:'LOOT_METHODICAL',publication:'PUBLISHED',competence_id:'secours',niveau_minimum:'1',duree_secondes:'7',recuperation_secondes:'99'}}]};
 const d=moduleDraft(w,'i'),row=moduleFormRow(w,d,{...d.row,type:'FIELD_CARE',soin_pv:'2',niveau_reanimation:'3',convalescence_secondes:'0',recuperation_patient_secondes:'11',prerequis__levels:'1'});assert.equal(row.recuperation_secondes,'0');assert.equal(row.prerequis,'!EFFACER');
 assert.deepEqual(moduleFormRow(w,moduleDraft(w,'i','archive'),{}),{id:'i',operation:'ARCHIVER',version:'4'});const copy=moduleDraft(w,'i','duplicate');assert.equal(copy.row.publication,'DRAFT');assert.notEqual(copy.row.id,'i');
 assert.throws(()=>moduleFormRow(w,moduleDraft(w),{nom:'Incomplet',type:'FIELD_CARE'}),/obligatoire/);
});


test('Création personnage : profil conditionnel, quantités explicites et trois feuilles du contrat',()=>{
 const w={...workspace('personnages'),references:{publishedClasses:[{id:'c',name:'Classe <test>'}],publishedSkills:[{id:'s',name:'Savoir'}],publishedItems:[{id:'kit',name:'Kit <test>'}]}},d=moduleDraft(w);
 let html=moduleEditorHtml(w,d);assert.ok(!html.includes('name="initial_class"'));assert.match(html,/name="initial_credits"[^>]*value=""/);assert.ok(html.includes('Quantité de Kit &lt;test&gt;'));
 const values={nom:'Nouveau',initial_profile:'OUI',initial_class:'c',initial_profile_publication:'NON',initial_skills__levels:'1',initial_skills__skill__s:'OUI',initial_skills__level__s:'3',initial_items__levels:'1',initial_items__skill__kit:'OUI',initial_items__level__kit:'2',initial_credits:'11',reason:'Choix explicites'};
 const refreshed=moduleRefreshDraft(w,d,values);html=moduleEditorHtml(w,refreshed);assert.ok(html.includes('Classe &lt;test&gt;'));assert.match(html,/name="initial_skills__level__s"[^>]*min="1"[^>]*value="3" required/);assert.ok(html.includes('Choix explicites'));
 const sheets=moduleFormSheets(w,refreshed,values);assert.deepEqual(Object.keys(sheets),['Meta','Personnages','Attributions','Dotations']);assert.equal(sheets.Attributions[0].competences,'s:3');assert.equal(sheets.Dotations[1].quantite,'2');assert.equal(sheets.Dotations[1].personnage_id,'server-id');assert.ok(!Object.keys(sheets.Personnages[0]).some(k=>k.startsWith('initial_')));
 const off=moduleFormSheets(w,refreshed,{...values,initial_profile:'NON',initial_items__skill__kit:'NON',initial_credits:'0'});assert.deepEqual(Object.keys(off),['Meta','Personnages']);assert.ok(!moduleEditorHtml(w,refreshed,true).includes('data-master-form='));
});
test('Création personnage : édition et export excluent toute redistribution, copie sans choix hérités',()=>{
 const w=workspace('personnages');w.rows=[{row:{id:'p',version:'2',nom:'Existant',publication:'PUBLISHED',initial_profile:'OUI',initial_credits:'99',initial_items:'kit:7'},title:'Existant'}];
 for(const session of [false,true]){
  w.session=session;const d=moduleDraft(w,'p'),html=moduleEditorHtml(w,d);assert.ok(!html.includes('name="initial_credits"'));assert.ok(!html.includes('name="initial_profile"'));
  assert.deepEqual(Object.keys(moduleFormSheets(w,d,{...d.row,initial_items:'kit:99'})),['Meta','Personnages']);
  const copy=moduleDraft(w,'p','duplicate');assert.equal(copy.row.initial_profile,'NON');assert.equal(copy.row.initial_credits,'');assert.equal(copy.row.initial_items,'');assert.deepEqual(Object.keys(moduleFormSheets(w,copy,copy.row)),['Meta','Personnages']);
  const archived=moduleDraft(w,'p','archive');assert.deepEqual(Object.keys(moduleFormSheets(w,archived,{initial_credits:'99'})),['Meta','Personnages']);
 }
 assert.throws(()=>moduleFormSheets({...w,editable:false},moduleDraft(w),{nom:'Interdit'}),/ne peut pas être modifié/);
});


test('Attributions : scénario seul, personnage verrouillé, niveaux et export ciblé',()=>{
 const w={...workspace('personnages'),sheet:'Attributions',references:{characters:[{id:'p',name:'Personnage'}],unprofiledCharacters:[{id:'n',name:'Nouveau'}],publishedClasses:[],publishedSkills:[{id:'s',name:'Savoir'}]},rows:[{row:{id:'a',version:'2',personnage_id:'p',classe_id:'!EFFACER',competences:'s:2',publication:'OUI'},title:'Personnage',state:'active'}]};
 assert.ok(moduleEditorHtml(w,moduleDraft(w)).includes('Nouveau (n)'));const d=moduleDraft(w,'a');assert.match(moduleEditorHtml(w,d),/name="personnage_id" disabled/);
 const sheets=moduleFormSheets(w,d,{personnage_id:'n',competences__levels:'1',competences__skill__s:'OUI',competences__level__s:'4',publication:'NON'});assert.equal(sheets.Attributions[0].personnage_id,'p');assert.equal(sheets.Attributions[0].competences,'s:4');assert.deepEqual(Object.keys(moduleMasterSheets(w)),['Meta','Attributions']);
 assert.ok(!moduleListHtml({...workspace('personnages'),session:true}).includes('data-sheet="Attributions"'));assert.throws(()=>moduleMasterSheets({...w,session:true}),/réservé au scénario/);assert.throws(()=>moduleFormSheets({...w,session:true},d,d.row),/réservé au scénario/);
});
