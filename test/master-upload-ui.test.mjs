import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
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

function controllerFixture(){
 const events={},dialogEvents={},status={textContent:''},calls=[],notices=[];
 const dialog={innerHTML:'',open:false,close(){this.open=false;},showModal(){this.open=true;},addEventListener:(event,fn)=>dialogEvents[event]=fn,querySelector:()=>status};
 const doc={body:{append(){}},addEventListener:(event,fn)=>events[event]=fn,createElement:()=>dialog};
 const ui=createMasterController({document:doc,getContext:scope=>({id:`${scope}-id`,title:'Destination',revision:1}),api:async(command,payload)=>{calls.push({command,payload});return {errors:[],changes:[],canApply:true,confirmation:'confirmed'};},mutate:async(command,payload)=>{calls.push({command,payload});return {id:'saved'};},notice:message=>notices.push(message),onApplied:async()=>{}});
 return {ui,dialog,status,calls,notices,select(scope,file){const input={files:[file],value:'chosen.xlsx',dataset:{scope}};events.change({target:{closest:()=>input}});assert.equal(input.value,'');},submit(kind='upload',values={reason:'Préparer le jeu'}){const form={dataset:{masterForm:kind},values,querySelector:()=>({disabled:false})};return dialogEvents.submit({target:{closest:()=>form},preventDefault(){}});}};
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
