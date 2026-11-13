import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectedTargetPath} from '../web/player-action-menu.mjs';
import {createCentralUi} from '../web/central-master.mjs';
import {centralFieldTargetInput} from '../src/core/central-field-targets.mjs';
import {analysisTarget} from './support/space-outlaws-actions-suite.mjs';
import {itemInput} from '../src/core/inventory-state.mjs';
import {soReleaseDefinitionChecks} from '../src/core/space-outlaws-release-check.mjs';
test('TRA-03 : QR et saisie DOC conservent l’action et la session, champs M1 facultatifs',()=>{
 const intent={id:'TRA-03',mode:'field'},origin='https://jeu.example';
 assert.equal(selectedTargetPath('DOC:original',intent,origin,'s'),'?document=original');
 assert.equal(selectedTargetPath(`${origin}/#/act/s/TRA-03?document=original`,intent,origin,'s'),'?document=original');
 assert.throws(()=>selectedTargetPath(`${origin}/#/act/elsewhere/TRA-03?document=original`,intent,origin,'s'));
 assert.throws(()=>selectedTargetPath('https://other.example/#/act/s/TRA-03?document=original',intent,origin,'s'));
 const ui=createCentralUi({button:()=>'',link:()=>''}),html=ui.itemForm({campaign:{id:'c'},draft:{revision:1}},'paper');
 for(const name of ['knowledgeId','reviewTargetId']){const input=html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0];assert.ok(input);assert.doesNotMatch(input,/required/);}
 const app=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');assert.match(app,/api\('myDocumentReviews'/);assert.match(app,/documentLotId/);
 const field=readFileSync(new URL('../web/field-actions.mjs',import.meta.url),'utf8');assert.match(field,/documentLotId:page.documentLotId/);
});
test('TRA-03 : dossiers liés typés et références vérifiées avant publication',()=>{
 const t=centralFieldTargetInput(analysisTarget('TRA-03',{documentOnly:true}),'review');assert.equal(t.documentOnly,true);
 assert.throws(()=>centralFieldTargetInput(analysisTarget('COM-03',{documentOnly:true}),'review'),{code:'INVALID_FIELD_TARGET'});
 const v={name:'Document',kind:'INDIVIDUAL',consumable:false,publicationState:'DRAFT',reviewTargetId:'review'},item=itemInput(v,'paper');
 assert.throws(()=>itemInput({...v,kind:'STACKABLE'},'paper'),{code:'INVALID_ITEM'});
 const change=(type,id,data)=>({id:`${type}_${id}`,entityId:id,type,operation:'UPSERT',data});
 const c=change('item','paper',item);assert.ok(soReleaseDefinitionChecks([c]).definitions.some(b=>b.code==='SO_DOCUMENT_REVIEW_REFERENCE'));
 assert.ok(!soReleaseDefinitionChecks([c,change('fieldTarget','review',t)]).definitions.some(b=>b.code==='SO_DOCUMENT_REVIEW_REFERENCE'));
});

 test('INF-03 : annulation visible après retrait de compétence et régie avec motif',async()=>{
  const {soForgeryHtml,soForgeryAdminHtml}=await import('../web/space-forgery.mjs');
  const html=soForgeryHtml({enabled:false,target:{title:'Atelier',description:''},active:{id:'a',targetId:'t',status:'RUNNING',remainingMs:10}},'s');
  assert.match(html,/soForgeryCancel/);
  const admin=soForgeryAdminHtml({actions:[{id:'a',characterName:'<secret>',remainingMs:10}]},'s');
  assert.match(admin,/soForgeryCancelMJ/);assert.match(admin,/name="reason"/);assert.doesNotMatch(admin,/<secret>/);
 });
