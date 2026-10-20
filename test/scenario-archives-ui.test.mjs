import test from 'node:test';
import assert from 'node:assert/strict';
import {createArchiveController} from '../web/scenario-archives.mjs';
test('Export privé : une réponse tardive après déconnexion ne crée aucun lien de téléchargement',async()=>{
  const handlers={},elements=new Map();let resolve,created=0;
  const doc={body:{append(){}},addEventListener(){},createElement:()=>({innerHTML:'',open:false,close(){this.open=false;},showModal(){this.open=true;},addEventListener:(event,fn)=>handlers[event]=fn,querySelector:key=>{if(!elements.has(key))elements.set(key,{textContent:'',innerHTML:''});return elements.get(key);}})};
  const oldForm=globalThis.FormData,oldCreate=URL.createObjectURL;globalThis.FormData=class{get(){return '';}};URL.createObjectURL=()=>{created++;return 'blob:private';};
  try{
    const ui=createArchiveController({document:doc,api:()=>new Promise(r=>resolve=r),mutate:async()=>{},notice(){},go(){},getScenario:()=>({id:'scenario',title:'Privé',revision:1,versions:[]})});ui.openExport();
    const form={dataset:{archiveForm:'export'},querySelector:()=>({disabled:false})},pending=handlers.submit({target:{closest:()=>form},preventDefault(){}});ui.clear();resolve({manifest:{images:[],scenario:{title:'SECRET'}},summary:{counts:{},images:0,bytes:0}});await pending;assert.equal(created,0);
  }finally{globalThis.FormData=oldForm;URL.createObjectURL=oldCreate;}
});
test('Reprise privée : la liste arrivée après fermeture ne rouvre pas la fenêtre',async()=>{
  let resolve,shown=0;const dialog={innerHTML:'',open:false,close(){this.open=false;},showModal(){this.open=true;shown++;},addEventListener(){}};
  const doc={body:{append(){}},addEventListener(){},createElement:()=>dialog},ui=createArchiveController({document:doc,api:()=>new Promise(r=>resolve=r),mutate:async()=>{},notice(){},go(){},getScenario:()=>null});
  const pending=ui.openImport();ui.clear();resolve({imports:[{id:'private',title:'SECRET',summary:{}}]});await pending;assert.equal(shown,1);assert.equal(dialog.open,false);assert.equal(dialog.innerHTML,'');
});
