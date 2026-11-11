import test from 'node:test';
import assert from 'node:assert/strict';
import {spaceArmHtml,spaceConfirmHtml,spaceFormInput} from '../web/space-encounters.mjs';
test('Embuscade ciblée UI : choix du carnet sous marqueur, sans voyage réel ni garantie',()=>{
 const h=spaceArmHtml('s','ship',true,[{id:'k',title:'Plan <ancien>'}]);assert.match(h,/Plan &lt;ancien&gt;/);assert.match(h,/name="knowledgeId"/);assert.match(h,/document ancien reste sélectionnable/);assert.doesNotMatch(h,/targetVoyageId|<ancien>/);assert.doesNotMatch(spaceArmHtml('s','ship'),/name="knowledgeId"/);
});
test('Embuscade ciblée UI : confirmation du document et présence, priorité visible uniquement à la régie',()=>{
 const h=spaceConfirmHtml('prepareSpaceAmbush',{name:'Pirate',routeName:'Liaison',kind:'TARGETED',knowledgeTitle:'<privé>',confirmation:'proof'},{sessionId:'s',shipId:'ship',knowledgeId:'k'});assert.match(h,/&lt;privé&gt;/);assert.match(h,/sans confirmation de vérité/);assert.match(h,/type="checkbox" required/);assert.match(h,/knowledgeId/);const mj=spaceConfirmHtml('prepareSpaceInterception',{name:'Cargo',priority:'TARGETED',candidates:[{name:'Pirate'}],confirmation:'mj-proof'},{sessionId:'s',shipId:'cargo'});assert.match(mj,/Priorité retenue : ciblée/);
});
test('Embuscade ciblée UI : formulaire opportuniste garde le protocole historique sans champ vide',()=>{
 const f={dataset:{form:'spacePrepare',payload:JSON.stringify({sessionId:'s',shipId:'ship'})},elements:{namedItem:()=>null}},v={knowledgeId:'',navigationCode:'known'};assert.deepEqual(spaceFormInput(f,v),{sessionId:'s',shipId:'ship',navigationCode:'known'});assert.equal(spaceFormInput(f,{...v,knowledgeId:'k'}).knowledgeId,'k');
});
