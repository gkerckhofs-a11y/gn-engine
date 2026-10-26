import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceHtml,maintenanceConfirmHtml} from '../web/space-maintenance.mjs';
import {spaceFormInput} from '../web/space-encounters.mjs';
import {createCargoUi} from '../web/cargo.mjs';
import {soInventoryHtml} from '../web/shops.mjs';
import {playerRoute,terminalHtml} from '../web/player-spaces.mjs';
const ui=createCargoUi({button:(label,action)=>`<button data-action="${action}">${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
const job={id:'r',shipName:'Vaisseau <script>',kind:'HULL',points:2,completed:0,amount:1050,unitCost:500,fee:50,provider:'Atelier',technicianName:'PNJ',pnj:true,payer:true,technician:false,confirmation:'proof',remainingSeconds:0};
test('Entretien UI : devis puis consentement personnel du Mécano, source MJ explicite',()=>{
 const admin=maintenanceHtml({session:{id:'s'},admin:true,jobs:[],ships:[],characters:[],supplies:[]});assert.match(admin,/name="source"/);assert.match(admin,/name="technicianId"/);assert.match(admin,/name="present" type="checkbox" required/);
 const waiting=maintenanceHtml({session:{id:'s'},jobs:[{...job,pnj:false,payer:false,technician:true,status:'AWAITING_TECH'}]});assert.match(waiting,/startSpaceMaintenance/);assert.match(waiting,/Réserver 1 PA/);assert.doesNotMatch(waiting,/<script>/);
});
test('Entretien UI : coûts exacts, points conservés et présence à la confirmation',()=>{
 const d={...job,before:{available:6000},after:{available:4950},units:20};const confirm=maintenanceConfirmHtml('prepareSpaceMaintenance',d,{sessionId:'s',maintenanceId:'r'});assert.match(confirm,/6000 → 4950/);assert.match(confirm,/au premier point uniquement/);const html=maintenanceHtml({session:{id:'s'},jobs:[{...job,status:'ACTIVE'}]});assert.match(html,/finishSpaceMaintenancePoint/);assert.match(html,/name="performed" type="checkbox" required/);assert.match(html,/points précédents restent acquis/);assert.doesNotMatch(maintenanceHtml({session:{id:'s'},jobs:[{...job,status:'ACTIVE',remainingSeconds:60}]}),/finishSpaceMaintenancePoint/);
});
test('Fret SO UI : trois minutes et présence requises, réception masquée avant échéance',()=>{
 const c=ui.confirm({name:'Caisses',quantity:5,volume:5,source:{name:'Sac'},destination:{name:'Soute'},durationSeconds:180,confirmation:'p'},{sessionId:'s',lotId:'l'});assert.match(c,/180 secondes/);assert.match(c,/name="present" type="checkbox" required/);const transfer=ui.transfer({session:{id:'s',spaceOutlaws:true},transfer:{id:'t',name:'Caisses',quantity:5,lotId:'l',status:'LOADING',remainingSeconds:180},canReceive:false,canCancel:true});assert.match(transfer,/180 secondes/);assert.doesNotMatch(transfer,/receiveCargoTransfer/);const admin=ui.admin({session:{id:'s',spaceOutlaws:true},ships:[],transfers:[]});assert.doesNotMatch(admin,/shipEditor|cargoTariffs/);
});
test('Logistique UI : Terminal, sac et formulaires ne proposent aucun ancien éditeur',()=>{
 assert.equal(playerRoute('space-maintenance','s').space,'terminal');assert.match(terminalHtml({session:{id:'s',spaceOutlaws:{logisticsVersion:1}}}),/space-maintenance\/s/);const d={session:{id:'s'},lots:[{id:'l',quantity:2,status:'AVAILABLE',item:{name:'Pièces',unit:'lot',unitVolume:1}}]};assert.match(soInventoryHtml(d,null,null,true),/cargo\/s\/l/);assert.doesNotMatch(soInventoryHtml(d,null),/cargo\/s\/l/);
 const form={dataset:{form:'spacePrepare',payload:'{"sessionId":"s"}'},elements:{namedItem:n=>n==='present'?{checked:true}:null}};assert.deepEqual(spaceFormInput(form,{kind:'HULL',points:'2',technicianId:'PNJ',payerId:'c'}),{sessionId:'s',kind:'HULL',points:2,technicianId:null,payerId:'c',present:true});
});
