import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {writeMasterXlsx} from '../web/master-xlsx-write.mjs';
import {masterPanel,assertMasterType,createMasterController} from '../web/masters.mjs';

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
 const doc={body:{append(){}},addEventListener:(event,fn)=>events[event]=fn,createElement:()=>dialog};
 const ui=createMasterController({document:doc,getContext:scope=>({id:`${scope}-id`,title:'Destination',revision:1}),api:async(command,payload)=>{calls.push({command,payload});if(command==='masterWorkspace')return options.workspace;return {errors:[],changes:[],canApply:true,confirmation:'confirmed'};},mutate:async(command,payload)=>{calls.push({command,payload});return {id:'saved'};},notice:message=>notices.push(message),onApplied:async()=>{}});
 return {ui,dialog,status,calls,notices,click(action,dataset={}){return events.click({target:{closest:()=>({dataset:{masterAction:action,...dataset}})}});},select(scope,file){const input={files:[file],value:'chosen.xlsx',dataset:{scope}};events.change({target:{closest:()=>input}});assert.equal(input.value,'');},submit(kind='upload',values={reason:'Préparer le jeu'},dataset={}){const form={dataset:{masterForm:kind,...dataset},values,querySelector:()=>({disabled:false})};return dialogEvents.submit({target:{closest:()=>form},preventDefault(){}});}};
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
