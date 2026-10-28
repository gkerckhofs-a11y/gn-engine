import test from 'node:test';
import assert from 'node:assert/strict';
import {globalMasterSheets,globalMasterHtml} from '../web/master-global-export.mjs';
import {workshopModules} from '../src/shared/workshop-modules.mjs';
const workspace=()=>{
 const meta=[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',destination_id:'<destination>',base_revision:'3',module:''}];
 return {scope:'GLOBAL',bundle:true,editable:true,meta,bundles:workshopModules.map(m=>({bundle:true,module:m.id,meta:[{...meta[0],module:m.id}],workspaces:[],...(m.id==='economie'?{tariffs:[]}:{})}))};
};
test('Master global : une vue manquante, répétée ou périmée bloque tout téléchargement',()=>{
 for(const change of [w=>w.bundles.pop(),w=>w.bundles.push(w.bundles[0]),w=>w.bundles[0].meta[0].base_revision='4']){
  const w=workspace();change(w);assert.throws(()=>globalMasterSheets(w));assert.ok(!globalMasterHtml(w).includes('data-master-action="globalDownload"'));
 }
 const w=workspace(),html=globalMasterHtml(w);assert.match(html,/&lt;destination&gt;/);assert.match(html,/ni une sauvegarde/);assert.match(html,/globalDownload/);assert.equal(globalMasterSheets(w).Meta[0].module,'');
 assert.match(globalMasterHtml({...w,editable:false,session:true}),/import Master est fermé/);
});
test('Master global : une erreur de fiche ou un dépassement des limites ne produit pas de fichier partiel',()=>{
 const w=workspace(),bundle=w.bundles.find(b=>b.module==='magasins');
 bundle.workspaces=[{module:'magasins',sheet:'Objets',meta:bundle.meta,errors:['Identité <ambiguë>'],rows:[]}];
 assert.throws(()=>globalMasterSheets(w),/Identité/);assert.match(globalMasterHtml(w),/&lt;ambiguë&gt;/);assert.ok(!globalMasterHtml(w).includes('data-master-action="globalDownload"'));
 bundle.workspaces[0].errors=[];bundle.workspaces[0].rows=Array.from({length:251},(_,i)=>({row:{id:`objet-${i}`,nom:'Objet'}}));
 assert.match(globalMasterHtml(w),/limites/);assert.ok(!globalMasterHtml(w).includes('data-master-action="globalDownload"'));
});
