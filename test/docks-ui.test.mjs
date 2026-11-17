import test from 'node:test';
import assert from 'node:assert/strict';
import {dockHtml} from '../web/docks.mjs';
import {commercialStorageHtml} from '../web/commercial-storage.mjs';
test('Docks : entrée limitée, aucune cargaison cachée ou retrait implicite',()=>{
 const d={session:{id:'s'},warehouse:{id:'w',name:'<secret>',securityTier:2},reason:'LOCAL_CREDENTIAL_REQUIRED',entry:null,intrusionTargetId:'lock',canManageStock:false,revealed:[]},html=dockHtml(d);assert.match(html,/intrusion\/s\/lock/);assert.doesNotMatch(html,/<secret>|Gérer les marchandises/);assert.match(html,/&lt;secret&gt;/);assert.doesNotMatch(dockHtml({...d,intrusionTargetId:null,entry:{method:'INF01'},revealed:[{name:'Eau'}]}),/Gérer les marchandises/);
});
test('Docks : régie expose acquisition et sécurité sans inventer de prix',()=>{
 const html=commercialStorageHtml({session:{id:'s',revision:1},warehouses:[],canConfigure:true,ports:[{id:'home',name:'Port'}],accounts:[],intrusionTargets:[],priceWarnings:['Prix à vérifier']},[],true);assert.match(html,/name="dockMode"/);assert.match(html,/name="securityTier"/);assert.match(html,/Prix à vérifier/);assert.match(html,/name="rent"[^>]*value=""/);
});
