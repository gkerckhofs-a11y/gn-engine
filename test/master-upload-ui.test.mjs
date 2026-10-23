import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {writeMasterXlsx} from '../web/master-xlsx-write.mjs';
import {masterPanel,assertMasterType,createMasterController} from '../web/masters.mjs';
import {workshopModules} from '../src/shared/workshop-modules.mjs';
import {recipeMasterExample} from '../src/shared/recipe-example.mjs';
import {readMasterXlsx} from '../web/master-xlsx.mjs';

test('Imports : chaque destination possède son champ et uniquement ses modèles',()=>{
 const campaign=masterPanel({title:'Scénario <privé>'},'scenario');
 const session=masterPanel({role:'OWNER',stage:'PREPARATION',title:'Épisode 2'},'session');
 for(const [html,label,file,other,scope] of [[campaign,'campagne','Campagne','Session','scenario'],[session,'session','Session','Campagne','session']]){
  assert.ok(html.includes(`id="master-${label}"`));
  assert.ok(html.includes(`Fichier master de ${label} (.xlsx)`));
  assert.ok(html.includes(`data-master-file data-scope="${scope}"`));
  assert.ok(html.includes(`/masters/GN_Engine_Master_${file}.xlsx`));
  assert.ok(html.includes(`/masters/GN_Engine_Exemple_${file}.xlsx`));
  assert.ok(!html.includes(`/masters/GN_Engine_Master_${other}.xlsx`));
 }
 assert.ok(campaign.includes('Scénario &lt;privé&gt;'));
 assert.equal(masterPanel({role:'MJ',stage:'PREPARATION'},'session'),'');
 assert.ok(!masterPanel({role:'OWNER',stage:'EN_JEU'},'session').includes('data-master-file'));
});

test('Imports : un type inversé ou absent indique le bon emplacement sans le convertir',()=>{
 const campaign={Meta:[{type:'CAMPAGNE',_row:2}]},session={Meta:[{type:'SESSION',_row:2}]};
 assert.doesNotThrow(()=>assertMasterType(campaign,'scenario'));
 assert.doesNotThrow(()=>assertMasterType(session,'session'));
 assert.throws(()=>assertMasterType(campaign,'session'),e=>e.sheet==='Meta'&&e.column==='type'&&e.row===2&&e.message.includes('l’atelier du scénario'));
 assert.throws(()=>assertMasterType(session,'scenario'),/la régie de la session en préparation/);
 for(const Meta of [undefined,[],[{}],[{type:'AUTRE'}],[{type:'SESSION'},{type:'SESSION'}]])assert.throws(()=>assertMasterType({Meta},'session'),/une seule ligne dans Meta, avec type = SESSION/);
 assert.equal(campaign.Meta[0].type,'CAMPAGNE');
});

function controllerFixture(options={}){
 const events={},dialogEvents={},status={textContent:''},calls=[],notices=[];
 const dialog={innerHTML:'',open:false,close(){this.open=false;},showModal(){this.open=true;},addEventListener:(event,fn)=>dialogEvents[event]=fn,querySelector:()=>status};
 const doc={body:{append(){}},addEventListener:(event,fn)=>events[event]=fn,createElement:name=>name==='a'&&options.anchor?options.anchor:dialog};
 const ui=createMasterController({document:doc,getContext:scope=>({id:`${scope}-id`,title:'Destination',revision:1}),api:async(command,payload)=>{calls.push({command,payload});if(command==='masterWorkspace')return typeof options.workspace==='function'?options.workspace(payload):options.workspace;return {errors:[],changes:[],canApply:true,confirmation:'confirmed'};},mutate:async(command,payload)=>{calls.push({command,payload});return {id:'saved'};},notice:message=>notices.push(message),onApplied:async()=>{}});
 return {ui,dialog,status,calls,notices,refresh(values,name='type'){const form={values};return dialogEvents.change({target:{name,closest:selector=>selector==='[data-master-refresh]'?{}:form}});},click(action,dataset={},values={}){return events.click({target:{closest:selector=>selector==='[data-master-action]'?{dataset:{masterAction:action,...dataset}}:{values}}});},select(scope,file){const input={files:[file],value:'chosen.xlsx',dataset:{scope}};events.change({target:{closest:()=>input}});assert.equal(input.value,'');},submit(kind='upload',values={reason:'Préparer le jeu'},dataset={}){const form={dataset:{masterForm:kind,...dataset},values,querySelector:()=>({disabled:false})};return dialogEvents.submit({target:{closest:()=>form},preventDefault(){}});}};
}
async function workbook(type,name='fichier-renommé.xlsx'){
 const bytes=await readFile(new URL(`../assets/masters/GN_Engine_Exemple_${type}.xlsx`,import.meta.url));
 return {name,size:bytes.length,arrayBuffer:async()=>bytes};
}
async function withFormData(run){
 const original=globalThis.FormData;
 globalThis.FormData=class{constructor(form){return Object.entries(form.values);}};
 try{await run();}finally{globalThis.FormData=original;}
}

test('SO-06b contrôleur : exemple adapté et sous-Master téléchargés sans mutation, puis aperçu obligatoire',async()=>withFormData(async()=>{
 const example=recipeMasterExample([{format:'gn-engine-master',version:'1',type:'CAMPAGNE',module:'magasins',destination_id:'scenario-id',base_revision:'1'}]),meta=example.Meta;
 const w={module:'magasins',sheet:'Recettes',meta,editable:true,errors:[],rows:example.Recettes.map(row=>({row,archived:false,title:row.nom,state:'draft'})),references:{}},objects={...w,sheet:'Objets',rows:example.Objets.map(row=>({row,archived:false}))};
 let downloads=0;const anchor={click(){downloads++;}},f=controllerFixture({anchor,workspace:i=>i.bundle?{module:'magasins',bundle:true,meta,workspaces:[objects,w],editable:true}:w});
 f.click('moduleMaster',{scope:'scenario',module:'magasins'});await new Promise(r=>setImmediate(r));f.click('recipeExample');assert.equal(downloads,1);assert.equal(f.calls.length,1);
 const bytes=new Uint8Array(await (await fetch(anchor.href)).arrayBuffer()),data=readMasterXlsx(bytes);assert.equal(data.Recettes.length,5);assert.equal(data.Objets.length,15);assert.ok(data.Recettes.every(r=>r.publication==='DRAFT'));
 f.click('moduleExportAll');await new Promise(r=>setImmediate(r));f.click('moduleDownloadRecipes');assert.equal(downloads,2);assert.equal(f.calls.length,2);assert.match(anchor.download,/GN_Engine_Recettes_Campagne/);
 const subset=readMasterXlsx(new Uint8Array(await (await fetch(anchor.href)).arrayBuffer()));assert.equal(subset.Objets.length,14);
 f.ui.open('scenario',{name:'Exemple adapté.xlsx',size:bytes.length,arrayBuffer:async()=>bytes},'magasins');await f.submit();assert.equal(f.calls.at(-1).command,'prepareMasterImport');assert.ok(f.calls.every(c=>c.command!=='applyMasterImport'));
 await f.submit('confirm',{});assert.equal(f.calls.at(-1).command,'applyMasterImport');assert.equal(f.calls.at(-1).payload.module,'magasins');
}));

test('Imports : les fichiers inversés sont arrêtés avant tout appel serveur',async()=>withFormData(async()=>{
 for(const [scope,fileType,where] of [['session','Campagne','l’atelier du scénario'],['scenario','Session','la régie de la session en préparation']]){
  const f=controllerFixture();f.select(scope,await workbook(fileType));await f.submit();
  assert.equal(f.calls.length,0);assert.ok(f.status.textContent.includes(where));
  assert.ok(f.dialog.open);assert.ok(!f.dialog.innerHTML.includes('data-master-form="confirm"'));
 }
}));

test('Imports : le fichier choisi reste associé à sa destination et attend une confirmation',async()=>withFormData(async()=>{
 for(const [scope,fileType] of [['scenario','Campagne'],['session','Session']]){
  const f=controllerFixture();f.select(scope,await workbook(fileType,'<img src=x>.xlsx'));
  assert.ok(f.dialog.innerHTML.includes('&lt;img src=x&gt;.xlsx'));assert.equal(f.calls.length,0);
  await f.submit();assert.equal(f.calls.length,1);assert.equal(f.calls[0].command,'prepareMasterImport');
  assert.equal(f.calls[0].payload[`${scope}Id`],`${scope}-id`);
  assert.equal(f.calls[0].payload.filename,'<img src=x>.xlsx');
  assert.ok(f.dialog.innerHTML.includes('data-master-form="confirm"'));
  await f.submit('confirm',{});assert.equal(f.calls.length,2);assert.equal(f.calls[1].command,'applyMasterImport');
  assert.equal(f.calls[1].payload.confirmation,'confirmed');assert.equal(f.dialog.open,false);
 }
}));

test('Imports : fermer pendant la lecture abandonne le fichier sans appel serveur',async()=>withFormData(async()=>{
 const file=await workbook('Campagne'),f=controllerFixture();let finish;
 f.select('scenario',{...file,arrayBuffer:()=>new Promise(resolve=>finish=resolve)});
 const pending=f.submit();f.ui.clear();finish(await file.arrayBuffer());await pending;
 assert.equal(f.calls.length,0);assert.equal(f.dialog.open,false);assert.equal(f.dialog.innerHTML,'');
}));


test('Imports modulaires : mauvais onglet arrêté, bon module transmis à chaque confirmation',async()=>withFormData(async()=>{
 const f=controllerFixture(),bytes=writeMasterXlsx({Meta:[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',module:'economie'}],Tarifs:[{id:'t',operation:'MODIFIER',version:'2',montant_fixe:'12'}]}),file={name:'tarifs.xlsx',size:bytes.length,arrayBuffer:async()=>bytes};
 f.ui.open('scenario',file,'personnages');await f.submit();assert.equal(f.calls.length,0);assert.match(f.status.textContent,/autre module/);
 f.ui.open('scenario',await workbook('Campagne'),'economie');await f.submit();assert.equal(f.calls.length,0);assert.match(f.status.textContent,/ne relève pas/);
 f.ui.open('scenario',file,'economie');await f.submit();assert.equal(f.calls[0].payload.module,'economie');assert.equal(f.calls.length,1);
 await f.submit('confirm',{});assert.equal(f.calls[1].payload.module,'economie');assert.equal(f.calls[1].payload.sheets.Meta[0].module,'economie');
}));

test('Tarifs en ligne : aucun enregistrement avant aperçu puis confirmation commune',async()=>withFormData(async()=>{
 const workspace={editable:true,meta:[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',destination_id:'scenario-id',base_revision:'1',module:'economie'}],newTariff:{id:'serveur-id',operation:'CREER',version:'1'},tariffs:[],items:[],beneficiaries:[]},f=controllerFixture({workspace});
 f.click('tariffs',{scope:'scenario'});await new Promise(resolve=>setImmediate(resolve));f.click('tariffEdit');
 assert.ok(f.dialog.innerHTML.includes('serveur-id'));assert.equal(f.calls.length,1);
 await f.submit('tariff',{titre:'Droit',description:'',nature:'CUSTOMS',mouvement:'LOAD',objet_id:'!EFFACER',montant_fixe:'0',montant_unitaire:'0',beneficiary:'SINK',actif:'NON',reason:'Réglage'},{id:'',archive:'false'});
 assert.equal(f.calls[1].command,'prepareMasterImport');assert.equal(f.calls[1].payload.sheets.Tarifs[0].id,'serveur-id');assert.equal(f.calls.length,2);
 await f.submit('confirm',{});assert.equal(f.calls[2].command,'applyMasterImport');assert.equal(f.calls[2].payload.module,'economie');assert.equal(f.dialog.open,false);
}));

test('Masters en ligne : filtrer, corriger la saisie après aperçu et confirmer le bon module',async()=>withFormData(async()=>{
 const workspace={module:'spatioport',sheet:'Routes',session:false,editable:true,errors:[],references:{},newRow:{id:'route-serveur',operation:'CREER',version:'1'},meta:[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',destination_id:'scenario-id',base_revision:'1',module:'spatioport'}],rows:[]},f=controllerFixture({workspace});
 f.click('moduleMaster',{scope:'scenario',module:'spatioport'});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.calls[0].payload.module,'spatioport');await f.submit('moduleFilter',{query:'test',state:'draft'});assert.equal(f.calls.length,1);
 f.click('moduleEdit');assert.ok(f.dialog.innerHTML.includes('route-serveur'));
 const values={nom:'Route test',description:'',depart_port:'a',arrivee_port:'b',duree_secondes:'60',carburant_cout:'0',ouvert:'NON',reason:'Préparation fictive'};
 await f.submit('moduleRow',values);assert.equal(f.calls[1].command,'prepareMasterImport');assert.equal(f.calls[1].payload.module,'spatioport');assert.deepEqual(Object.keys(f.calls[1].payload.sheets),['Meta','Routes']);
 f.click('moduleBack');assert.ok(f.dialog.innerHTML.includes('Route test'));assert.ok(f.dialog.innerHTML.includes('Préparation fictive'));
 await f.submit('moduleRow',{...values,duree_secondes:'90'});assert.equal(f.calls[2].payload.sheets.Routes[0].duree_secondes,'90');assert.equal(f.calls.length,3);
 await f.submit('confirm',{});assert.equal(f.calls[3].command,'applyMasterImport');assert.equal(f.calls[3].payload.module,'spatioport');assert.equal(f.dialog.open,false);
}));

test('Catalogues en ligne : changer de feuille et de type conserve la saisie, puis confirme la bonne feuille',async()=>withFormData(async()=>{
 const w={module:'personnages',sheet:'Personnages',session:false,editable:true,errors:[],references:{consumables:[],allSkills:[]},newRow:{id:'catalogue-id',operation:'CREER',version:'1'},meta:[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',destination_id:'scenario-id',base_revision:'1',module:'personnages'}],rows:[]};
 const f=controllerFixture({workspace:input=>({...w,sheet:input.sheet??'Personnages'})});
 f.click('moduleMaster',{scope:'scenario',module:'personnages'});await new Promise(resolve=>setImmediate(resolve));
 f.click('moduleSheet',{sheet:'Competences'});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.calls[1].payload.sheet,'Competences');assert.equal(f.calls[1].payload.module,'personnages');f.click('moduleEdit');
 const values={nom:'Soin fictif',type:'ACTIVE_TARGET',publication:'DRAFT',reason:'Motif maintenu'};
 f.refresh(values);assert.ok(f.dialog.innerHTML.includes('name="soin_pv"'));assert.ok(f.dialog.innerHTML.includes('Soin fictif'));assert.ok(f.dialog.innerHTML.includes('Motif maintenu'));
 await f.submit('moduleRow',{...values,soin_pv:'2',recuperation_secondes:'20',portee_recuperation:'ACTOR'});
 assert.deepEqual(Object.keys(f.calls[2].payload.sheets),['Meta','Competences']);assert.equal(f.calls[2].payload.sheets.Competences[0].soin_pv,'2');
 f.click('moduleBack');assert.ok(f.dialog.innerHTML.includes('Motif maintenu'));
 await f.submit('moduleRow',{...values,type:'PASSIVE'});assert.ok(!Object.hasOwn(f.calls[3].payload.sheets.Competences[0],'soin_pv'));
 await f.submit('confirm',{});assert.deepEqual(f.calls[4].payload.sheets,f.calls[3].payload.sheets);assert.equal(f.calls[4].command,'applyMasterImport');
 f.click('moduleMaster',{scope:'scenario',module:'personnages'});await new Promise(resolve=>setImmediate(resolve));
 f.click('moduleSheet',{sheet:'Classes'});await new Promise(resolve=>setImmediate(resolve));f.click('moduleEdit');
 await f.submit('moduleRow',{nom:'Classe fictive',publication:'DRAFT',competences__levels:'1',competences__skill__savoir:'OUI',competences__level__savoir:'2',reason:'Sélection'});
 assert.deepEqual(Object.keys(f.calls.at(-1).payload.sheets),['Meta','Classes']);assert.equal(f.calls.at(-1).payload.sheets.Classes[0].competences,'savoir:2');
}));

test('Économie en ligne : changement de cible corrigé dans l’aperçu, cours lié à l’objet et confirmation',async()=>withFormData(async()=>{
 const w={module:'economie',sheet:'Entrepots',session:false,editable:true,errors:[],references:{items:[{id:'kit',name:'Kit'}],unpricedItems:[{id:'kit',name:'Kit'}],routes:[{id:'r',name:'Route'}],installations:[]},newRow:{id:'event-id',operation:'CREER',version:'1'},meta:[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',destination_id:'scenario-id',base_revision:'1',module:'economie'}],rows:[]};
 const f=controllerFixture({workspace:input=>({...w,sheet:input.sheet??'Entrepots',...(input.sheet==='Cours'?{newRow:{id:'',operation:'CREER',version:'1'}}:{})})});
 f.click('moduleMaster',{scope:'scenario',module:'economie'});await new Promise(resolve=>setImmediate(resolve));f.click('moduleSheet',{sheet:'EvenementsEco'});await new Promise(resolve=>setImmediate(resolve));f.click('moduleEdit');
 const values={titre:'Test',cible_type:'COMMODITY',objet_id:'kit',variation_prix_pct:'25',commerce_suspendu:'OUI',declenchement:'MANUAL',actif:'NON',reason:'Réglage fictif'};
 f.refresh(values,'cible_type');f.refresh({...values,cible_type:'ROUTE'},'cible_type');assert.ok(!f.dialog.innerHTML.includes('name="objet_id"'));assert.ok(f.dialog.innerHTML.includes('Réglage fictif'));
 const route={...values,cible_type:'ROUTE',route_id:'r',variation_carburant_pct:'0',variation_duree_pct:'20',depart_suspendu:'NON'};
 await f.submit('moduleRow',route);const preview=f.calls.at(-1);assert.equal(preview.command,'prepareMasterImport');assert.equal(preview.payload.sheets.EvenementsEco[0].objet_id,'!EFFACER');assert.equal(preview.payload.sheets.EvenementsEco[0].variation_prix_pct,'0');
 f.click('moduleBack');assert.ok(f.dialog.innerHTML.includes('name="route_id"'));await f.submit('moduleRow',route);await f.submit('confirm',{});assert.equal(f.calls.at(-1).command,'applyMasterImport');assert.equal(f.calls.at(-1).payload.module,'economie');
 f.click('moduleMaster',{scope:'scenario',module:'economie'});await new Promise(resolve=>setImmediate(resolve));f.click('moduleSheet',{sheet:'Cours'});await new Promise(resolve=>setImmediate(resolve));f.click('moduleEdit');
 await f.submit('moduleRow',{id:'kit',prix_base:'9',actif:'NON',reason:'Prix choisi'});assert.deepEqual(Object.keys(f.calls.at(-1).payload.sheets),['Meta','Cours']);assert.equal(f.calls.at(-1).payload.sheets.Cours[0].id,'kit');
 await f.submit('confirm',{});assert.equal(f.calls.at(-1).payload.sheets.Cours[0].id,'kit');
}));

test('Membres en ligne : droits choisis dans l’aperçu, identités conservées et confirmation dans Personnages',async()=>withFormData(async()=>{
 const w={module:'personnages',sheet:'Personnages',session:false,editable:true,errors:[],references:{characters:[{id:'c',name:'Personnage'}],groups:[{id:'g',name:'Groupe'}],groupPermissions:[{id:'readStock',name:'readStock'},{id:'withdrawStock',name:'withdrawStock'}]},newRow:{id:'membre-serveur',operation:'CREER',version:'1'},meta:[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',destination_id:'scenario-id',base_revision:'1',module:'personnages'}],rows:[]};
 const f=controllerFixture({workspace:input=>({...w,sheet:input.sheet??'Personnages'})});f.click('moduleMaster',{scope:'scenario',module:'personnages'});await new Promise(resolve=>setImmediate(resolve));f.click('moduleSheet',{sheet:'Membres'});await new Promise(resolve=>setImmediate(resolve));f.click('moduleEdit');
 const v={groupe_id:'g',personnage_id:'c',role:'Intendant',actif:'NON',revele:'NON',visible_membres:'NON',affiliation_publique:'NON',droits__checks:'1',droits__choice__readStock:'OUI',droits__choice__withdrawStock:'OUI',reason:'Attribution explicite'};
 await f.submit('moduleRow',v);const p=f.calls.at(-1);assert.equal(p.command,'prepareMasterImport');assert.deepEqual(Object.keys(p.payload.sheets),['Meta','Membres']);assert.equal(p.payload.sheets.Membres[0].droits,'readStock;withdrawStock');assert.ok(!f.calls.some(c=>c.command==='applyMasterImport'));
 f.click('moduleBack');assert.ok(f.dialog.innerHTML.includes('Intendant'));assert.ok(f.dialog.innerHTML.includes('Attribution explicite'));await f.submit('moduleRow',{...v,droits__choice__withdrawStock:'NON'});await f.submit('confirm',{});
 assert.equal(f.calls.at(-1).command,'applyMasterImport');assert.equal(f.calls.at(-1).payload.module,'personnages');assert.equal(f.calls.at(-1).payload.sheets.Membres[0].droits,'readStock');assert.equal(f.calls.at(-1).payload.sheets.Membres[0].id,'membre-serveur');
}));


test('Terrain en ligne : création groupée, ajout/retrait conservés après aperçu et confirmation unique',async()=>withFormData(async()=>{
 const workspace={module:'informations',sheet:'Lieux',session:false,editable:true,errors:[],references:{skills:[],items:[],knowledge:[],installations:[],fieldConsumables:[]},newRow:{id:'terrain-id',operation:'CREER',version:'1'},meta:[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',module:'informations'}],rows:[]},f=controllerFixture({workspace});
 f.click('moduleMaster',{scope:'scenario',module:'informations'});await new Promise(resolve=>setImmediate(resolve));f.click('moduleEdit');
 const values={titre:'Fouille test',type:'SEARCH',publication:'DRAFT',action_SEARCH__test:'AUTO',action_SEARCH__duree_secondes:'0',reason:'Préparation fictive'};
 f.click('terrainAddReward',{},values);assert.ok(f.dialog.innerHTML.includes('Fouille test'));assert.ok(f.dialog.innerHTML.includes('Préparation fictive'));assert.ok(f.dialog.innerHTML.includes('reward-terrain-id-1'));
 const second={...values,'reward_reward-terrain-id-1__type':'ITEM','reward_reward-terrain-id-1__objet_id':'kit','reward_reward-terrain-id-1__quantite':'1','reward_reward-terrain-id-1__stock_initial':'3','reward_reward-terrain-id-1__limite_personnage':'1'};
 f.click('terrainRemoveReward',{id:'reward-terrain-id-0'},second);assert.equal(f.calls.length,1);
 await f.submit('moduleRow',second);assert.equal(f.calls.at(-1).command,'prepareMasterImport');let sheets=f.calls.at(-1).payload.sheets;assert.deepEqual(Object.keys(sheets),['Meta','Lieux','ActionsTerrain','Recompenses']);assert.equal(sheets.Lieux[0].id,'terrain-id');assert.equal(sheets.ActionsTerrain[0].lieu_id,'terrain-id');assert.equal(sheets.Recompenses.length,1);assert.equal(sheets.Recompenses[0].id,'reward-terrain-id-1');
 f.click('moduleBack');assert.ok(f.dialog.innerHTML.includes('Retrait prévu à la confirmation'));assert.ok(f.dialog.innerHTML.includes('Préparation fictive'));
 await f.submit('moduleRow',{...second,action_SEARCH__duree_secondes:'9'});sheets=f.calls.at(-1).payload.sheets;assert.equal(sheets.ActionsTerrain[0].duree_secondes,'9');assert.ok(f.calls.every(c=>c.command!=='applyMasterImport'));
 await f.submit('confirm',{});assert.equal(f.calls.at(-1).command,'applyMasterImport');assert.deepEqual(f.calls.at(-1).payload.sheets,sheets);assert.equal(f.calls.at(-1).payload.module,'informations');assert.equal(f.dialog.open,false);
}));

test('Interactions en ligne : choix du type, aperçu, correction et confirmation sans écriture anticipée',async()=>withFormData(async()=>{
 const w={module:'personnages',sheet:'Interactions',session:false,editable:true,errors:[],references:{skills:[{id:'s',name:'Expertise'}],fieldConsumables:[]},newRow:{id:'interaction-id',operation:'CREER',version:'1'},meta:[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',module:'personnages'}],rows:[]},f=controllerFixture({workspace:w});
 f.click('moduleMaster',{scope:'scenario',module:'personnages'});await new Promise(resolve=>setImmediate(resolve));f.click('moduleEdit');
 const values={nom:'Interaction fictive',type:'LOOT_COMMON',publication:'DRAFT',duree_secondes:'12',recuperation_secondes:'15',reason:'Motif fictif'};f.refresh(values);assert.ok(!f.dialog.innerHTML.includes('name="consommable_id"'));
 await f.submit('moduleRow',values);assert.equal(f.calls.at(-1).command,'prepareMasterImport');assert.equal(f.calls.at(-1).payload.sheets.Interactions[0].consommables_supplementaires,'!EFFACER');f.click('moduleBack');assert.ok(f.dialog.innerHTML.includes('Motif fictif'));
 const changed={...values,type:'CLINIC_FAST',competence_id:'s',niveau_minimum:'1',seuil:'6',complement_secondes:'30'};f.refresh(changed);assert.ok(f.dialog.innerHTML.includes('name="complement_secondes"'));await f.submit('moduleRow',changed);const sheets=f.calls.at(-1).payload.sheets;assert.equal(sheets.Interactions[0].recuperation_secondes,'0');assert.ok(f.calls.every(c=>c.command!=='applyMasterImport'));
 await f.submit('confirm',{});assert.deepEqual(f.calls.at(-1).payload.sheets,sheets);assert.equal(f.calls.at(-1).command,'applyMasterImport');assert.equal(f.calls.at(-1).payload.module,'personnages');
}));


test('Création groupée personnage : retour depuis aperçu conserve profil et dotations, confirmation unique',async()=>withFormData(async()=>{
 const w={module:'personnages',sheet:'Personnages',session:false,editable:true,errors:[],references:{publishedClasses:[{id:'c',name:'Classe'}],publishedSkills:[{id:'s',name:'Savoir'}],publishedItems:[{id:'kit',name:'Kit'}]},newRow:{id:'personnage-id',operation:'CREER',version:'1'},meta:[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',module:'personnages'}],rows:[]},f=controllerFixture({workspace:w});
 f.click('moduleMaster',{scope:'scenario',module:'personnages'});await new Promise(resolve=>setImmediate(resolve));f.click('moduleEdit');
 const values={nom:'Renfort fictif',initial_profile:'OUI',initial_class:'c',initial_profile_publication:'NON',initial_skills__levels:'1',initial_skills__skill__s:'OUI',initial_skills__level__s:'2',initial_items__levels:'1',initial_items__skill__kit:'OUI',initial_items__level__kit:'3',initial_credits:'17',reason:'Création complète'};
 f.refresh(values);await f.submit('moduleRow',values);const first=f.calls.at(-1).payload.sheets;assert.deepEqual(Object.keys(first),['Meta','Personnages','Attributions','Dotations']);assert.ok(f.calls.every(c=>c.command!=='applyMasterImport'));
 f.click('moduleBack');assert.ok(f.dialog.innerHTML.includes('Création complète'));assert.match(f.dialog.innerHTML,/name="initial_items__level__kit"[^>]*value="3" required/);assert.match(f.dialog.innerHTML,/name="initial_skills__level__s"[^>]*value="2" required/);assert.match(f.dialog.innerHTML,/name="initial_credits"[^>]*value="17"/);
 await f.submit('moduleRow',{...values,initial_credits:'19'});const sheets=f.calls.at(-1).payload.sheets;assert.equal(sheets.Dotations[0].quantite,'19');assert.equal(sheets.Dotations[0].id,first.Dotations[0].id);
 await f.submit('confirm',{});assert.equal(f.calls.at(-1).command,'applyMasterImport');assert.equal(f.calls.at(-1).payload.module,'personnages');assert.deepEqual(f.calls.at(-1).payload.sheets,sheets);assert.equal(f.calls.filter(c=>c.command==='applyMasterImport').length,1);
}));

test('Paramètres modulaires : aperçu, retour avec motif et correction, une seule confirmation',async()=>withFormData(async()=>{
 const w={module:'spatioport',sheet:'Parametres',session:false,editable:true,errors:[],references:{},configured:{},values:{astroport_id:'port-initial'},meta:[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',module:'spatioport'}],rows:[]},f=controllerFixture({workspace:w});
 f.click('moduleMaster',{scope:'scenario',module:'spatioport'});await new Promise(resolve=>setImmediate(resolve));f.click('moduleEdit');
 await f.submit('moduleRow',{astroport_id:'port-suivant',reason:'Choix du port'});assert.equal(f.calls.at(-1).command,'prepareMasterImport');assert.deepEqual(f.calls.at(-1).payload.sheets.Parametres,[{cle:'astroport_id',valeur:'port-suivant'}]);assert.ok(f.calls.every(c=>c.command!=='applyMasterImport'));
 f.click('moduleBack');assert.ok(f.dialog.innerHTML.includes('port-suivant'));assert.ok(f.dialog.innerHTML.includes('Choix du port'));await f.submit('moduleRow',{astroport_id:'port-corrige',reason:'Correction'});const sheets=f.calls.at(-1).payload.sheets;
 await f.submit('confirm',{});assert.equal(f.calls.at(-1).command,'applyMasterImport');assert.equal(f.calls.at(-1).payload.module,'spatioport');assert.deepEqual(f.calls.at(-1).payload.sheets,sheets);assert.equal(sheets.Parametres[0].valeur,'port-corrige');assert.equal(f.calls.filter(c=>c.command==='applyMasterImport').length,1);
}));


test('Relevé dotations : navigation, filtre et téléchargement sans commande de modification',async()=>withFormData(async()=>{
 const {dotationsProjection}=await import('../src/core/master-dotations-projection.mjs');
 let downloads=0;const anchor={click(){downloads++;}},w={...dotationsProjection([{id:'a',public:{displayName:'Un personnage'},startingCredits:{amount:12,revision:1}}]),meta:[{type:'CAMPAGNE',destination_id:'scenario-id',campaign_id:'',base_revision:'1'}]};
 const f=controllerFixture({workspace:w,anchor});f.click('moduleMaster',{scope:'scenario',module:'personnages'});await new Promise(resolve=>setTimeout(resolve,0));
 assert.match(f.dialog.innerHTML,/Dotations de départ/);await f.submit('moduleFilter',{query:'personnage',state:'all'});
 f.click('moduleEdit');f.click('moduleDuplicate');f.click('moduleArchive');assert.equal(f.calls.length,1);
 f.click('moduleExport');assert.equal(downloads,1);assert.match(anchor.download,/GN_Engine_Releve_Dotations_Campagne_scenario-id.xlsx/);assert.match(f.status.textContent,/ne peut pas être réimporté/);assert.equal(f.calls.length,1);assert.deepEqual(f.notices,[]);
}));

test('Export groupé : requête unique, annonce du périmètre et téléchargement sans mutation',async()=>withFormData(async()=>{
 const meta=[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',destination_id:'scenario-id',base_revision:'1',module:'magasins'}];
 const w={module:'magasins',sheet:'Objets',meta,editable:true,errors:[],rows:[],references:{}};let downloads=0;const anchor={click(){downloads++;}},f=controllerFixture({anchor,workspace:input=>input.bundle?{module:'magasins',bundle:true,meta,editable:true,workspaces:[w]}:w});
 f.click('moduleMaster',{scope:'scenario',module:'magasins'});await new Promise(r=>setTimeout(r,0));assert.match(f.dialog.innerHTML,/moduleExportAll/);
 f.click('moduleExportAll');await new Promise(r=>setTimeout(r,0));assert.equal(f.calls.length,2);assert.deepEqual(f.calls[1].payload,{scenarioId:'scenario-id',module:'magasins',bundle:true});assert.match(f.dialog.innerHTML,/Objets : 0 lignes/);
 f.click('moduleDownloadAll');assert.equal(downloads,1);assert.match(anchor.download,/GN_Engine_Module_magasins_Campagne/);assert.equal(f.calls.length,2);f.click('moduleList');f.click('moduleDownloadAll');assert.equal(downloads,1);
}));

test('Export groupé : fermer pendant la lecture abandonne la réponse',async()=>{
 let finish;const w={module:'magasins',sheet:'Objets',meta:[{module:'magasins'}],editable:true,errors:[],rows:[],references:{}};
 const f=controllerFixture({workspace:input=>input.bundle?new Promise(resolve=>finish=resolve):w});f.click('moduleMaster',{scope:'scenario',module:'magasins'});await new Promise(r=>setTimeout(r,0));f.click('moduleExportAll');f.ui.clear();finish({module:'magasins',bundle:true,meta:w.meta,workspaces:[w]});await new Promise(r=>setTimeout(r,0));assert.equal(f.dialog.open,false);assert.equal(f.dialog.innerHTML,'');assert.deepEqual(f.notices,[]);
});

test('Master global : une seule requête propriétaire, téléchargement puis réimport avec confirmation',async()=>withFormData(async()=>{
 const meta=[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',destination_id:'scenario-id',base_revision:'1',module:''}];
 const w={scope:'GLOBAL',bundle:true,meta,editable:true,bundles:workshopModules.map(m=>({module:m.id,bundle:true,meta:[{...meta[0],module:m.id}],workspaces:[],...(m.id==='economie'?{tariffs:[]}:{})}))};
 let downloads=0;const anchor={click(){downloads++;}},f=controllerFixture({anchor,workspace:w});
 f.click('globalExport',{scope:'scenario'});await new Promise(r=>setImmediate(r));assert.deepEqual(f.calls,[{command:'masterWorkspace',payload:{scenarioId:'scenario-id',bundle:true}}]);
 f.click('globalDownload');assert.equal(downloads,1);assert.match(anchor.download,/GN_Engine_Catalogue_Campagne_scenario-id.xlsx/);
 const bytes=new Uint8Array(await (await fetch(anchor.href)).arrayBuffer());
 f.ui.open('scenario',{name:anchor.download,size:bytes.length,arrayBuffer:async()=>bytes});await f.submit();assert.equal(f.calls[1].command,'prepareMasterImport');assert.equal(f.calls[1].payload.sheets.Meta[0].module,'');assert.ok(!f.calls[1].payload.module);
 await f.submit('confirm',{});assert.equal(f.calls[2].command,'applyMasterImport');assert.equal(f.dialog.open,false);assert.deepEqual(f.notices,['Master appliqué. Les acquis ont été conservés.']);
}));

test('Master global : fermeture abandonne les réponses tardives, y compris un refus serveur',async()=>{
 for(const denied of [false,true]){
  let finish;const f=controllerFixture({workspace:()=>new Promise((resolve,reject)=>{finish=()=>denied?reject(new Error('FORBIDDEN')):resolve({});})});
  f.click('globalExport',{scope:'scenario'});f.ui.clear();finish();await new Promise(r=>setImmediate(r));
  assert.equal(f.dialog.open,false);assert.equal(f.dialog.innerHTML,'');f.click('globalDownload');assert.deepEqual(f.notices,[]);
 }
});
