import test from 'node:test';
import assert from 'node:assert/strict';
import {dockTheftForm,dockTheftsHtml} from '../web/dock-theft.mjs';
test('Vol de stockage : destination obligatoire et absence de sac dans le choix',()=>{
 const d={theftEnabled:true,warehouse:{id:'w'},destinations:[],revealed:[]};assert.doesNotMatch(dockTheftForm(d),/data-theft="prepare"/);const html=dockTheftForm({...d,destinations:[{name:'<cellule>',location:{kind:'WAREHOUSE',id:'dest'}}],revealed:[{id:'lot',name:'<secret>',quantity:3}]});assert.match(html,/WAREHOUSE:dest/);assert.match(html,/data-qr/);assert.match(html,/5 unités de volume/);assert.doesNotMatch(html,/<secret>|CHARACTER/);assert.match(html,/&lt;cellule&gt;/);
});
test('Vol de stockage : attestation physique uniquement dans la régie MJ',()=>{
 const d={session:{id:'s',stage:'EN_JEU'},thefts:[{id:'t',status:'HANDOVER',remainingMs:0,warehouseName:'Source',destinationName:'Destination',name:'Caisses',quantity:3,volume:3,physical:true}]};assert.doesNotMatch(dockTheftsHtml(d),/data-theft="handover"/);assert.match(dockTheftsHtml({...d,admin:true}),/data-theft="handover"/);assert.match(dockTheftsHtml({...d,admin:true}),/handedOver/);assert.doesNotMatch(dockTheftsHtml({...d,admin:true}),/Faire réussir|Décider du résultat/);
});
