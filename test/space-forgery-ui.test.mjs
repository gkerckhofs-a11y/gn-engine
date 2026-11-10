import test from 'node:test';
import assert from 'node:assert/strict';
import {soForgeryHtml,soForgeryInspectionHtml} from '../web/space-forgery.mjs';
import {centralFieldTargetPayload} from '../web/central-field-targets.mjs';
import {createInventoryUi} from '../web/inventory.mjs';
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

test('INF-03 : le MJ voit le vol fictif avec identifiants échappés',()=>{
 const html=soForgeryInspectionHtml({
  lotId:'lot',documentName:'Faux document',quality:2,templateId:'M6',
  templateRevision:1,anomalies:'Date fausse',holderId:'rogue',
  transfers:[],otherMovements:[{kind:'SO_PICKPOCKET',
   sourceId:'<script>',destinationId:'rogue',at:10}]
 },'session','lot');
 assert.match(html,/Vol à la tire/);
 assert.ok(html.includes('&lt;script&gt;'));
 assert.doesNotMatch(html,/<script>/);
});
test('INF-03 : historique MJ affiché sans insertion HTML non fiable',()=>{
 const html=soForgeryInspectionHtml({lotId:'lot',documentName:'Reçu',quality:2,
 templateId:'model',templateRevision:1,anomalies:'Faux tampon',holderId:'bob',
 transfers:[{transferId:'handover',sourceName:'<script>',recipientName:'Bob',at:123}]},'s','lot');
 assert.match(html,/handover/);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
});
test('INF-03 : seule la remise éligible apparaît dans le sac Space Outlaws',()=>{
 const button=(label)=>'<button>'+label+'</button>';
 const link=(label)=>'<a>'+label+'</a>';
 const inventory=createInventoryUi({button,link});
 const lot={id:'doc1',item:{id:'forged',name:'Document',description:'Fiction',
 category:'Document de fiction',kind:'INDIVIDUAL',unit:'document',revision:1,
 consumable:false,unitVolume:null,legality:'UNSPECIFIED'},quantity:1,status:'AVAILABLE',
 pillable:true,canTransferByHand:true};
 const d={session:{id:'session',stage:'EN_JEU',spaceOutlaws:{inf03Version:1}},
 character:{name:'Infiltrateur'},lots:[lot],transfers:[],stored:[],installed:[],
 preview:false,canTransfer:false,canSell:false,economyEnabled:false,healthEnabled:false,sales:[]};
 const html=inventory.page(d);
 assert.match(html,/Remettre à un joueur/);
 const other=inventory.page({...d,lots:[{...lot,id:'normal',canTransferByHand:false}]});
 assert.doesNotMatch(other,/Remettre à un joueur/);
});

test('INF-03 : état saisi et pièce détruite restent lisibles uniquement dans la régie MJ',()=>{
 const html=soForgeryInspectionHtml({lotId:'doc',documentName:'Faux manifeste',
  quality:2,templateId:'M6',templateRevision:1,anomalies:'Filigrane incorrect',
  holderId:'holder',status:'DESTROYED',quantity:0,locationKind:'CUSTOMS',locationId:'desk',
  transfers:[],otherMovements:[],inventoryEvents:[
   {at:10200,beforeStatus:'SEIZED',status:'DESTROYED',quantity:0,reason:'<script>motif privé</script>'},
   {at:10100,beforeStatus:'AVAILABLE',status:'SEIZED',quantity:1,reason:'Contrôle de fiction'}
  ]},'s','doc');
 assert.match(html,/Document retiré du jeu/);
 assert.match(html,/SEIZED/);
 assert.match(html,/DESTROYED/);
 assert.match(html,/Filigrane incorrect/);
 assert.ok(html.includes('&lt;script&gt;motif privé&lt;/script&gt;'));
 assert.ok(!html.includes('<script>'));
 assert.match(html,/ni saisie formelle ni transfert en entrepôt/);
});
