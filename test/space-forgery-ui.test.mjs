import test from 'node:test';
import assert from 'node:assert/strict';
import {soForgeryHtml,soForgeryInspectionHtml} from '../web/space-forgery.mjs';
import {centralFieldTargetPayload} from '../web/central-field-targets.mjs';
const d={enabled:true,level:2,session:{stage:'EN_JEU'},target:{id:'forge',
 title:'<script>',description:'Atelier en décor',category:'RECEIPT',minLevel:1,
 threshold:6,busy:false,blankItemId:'form'},cooldownMs:0,active:null,
 blanks:[{id:'lot1',name:'Formulaire vierge',quantity:2}]};
test('INF-03 : HTML échappé, consommation annoncée et aucun secret MJ',()=>{
 const html=soForgeryHtml(d,'s');
 assert.match(html,/soForgeryStart/);assert.match(html,/lot1/);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
 assert.doesNotMatch(html,/Sigle incorrect|grantAdmin|forgeryEvidence/);
});
test('INF-03 : absence de formulaire désactive le démarrage',()=>{
 const html=soForgeryHtml({...d,blanks:[]},'s');
 assert.match(html,/disabled/);
});
test('INF-03 : éditeur M6 propose une référence modèle, sans habilitation réelle',()=>{
 const model=centralFieldTargetPayload({kind:'FORGERY',title:'Atelier',description:'Fiction',gmNotes:'',
  forgeryCategory:'RECEIPT',forgeryLevel:'1',forgeryThreshold:'6',forgeryBlankItemId:'form',
  forgeryDocumentTitle:'Reçu imaginaire',forgeryDocumentText:'Texte de fiction',
  forgeryAnomalies:'Erreur de tampon'},[]);
 assert.equal(model.kind,'FORGERY');assert.deepEqual(model.profiles,{});
 assert.equal(model.forgery.blankItemId,'form');assert.equal(model.forgery.threshold,6);
});

test('INF-03 : contrôle MJ échappe les données et n’accorde aucune permission',()=>{
 const html=soForgeryInspectionHtml({lotId:'lot',documentName:'<script>',quality:2,templateId:'M6',templateRevision:1,
  anomalies:'Tampon incorrect',holderId:'c',status:'AVAILABLE'},'sid','lot');
 assert.match(html,/Contrôle MJ/);
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>'));
 assert.doesNotMatch(html,/grantAdmin|permissionsGranted/);
});
