import {MemoryStore} from './support/memory.mjs';
import {secureVaultSuite} from './support/space-secure-vault-suite.mjs';
import {sensorFabricationsHtml,sensorFabricationConfirm} from '../web/space-sensor-fabrication.mjs';
import {vaultCargoHtml,vaultCargoConfirm} from '../web/space-vault-cargo.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
secureVaultSuite(()=>new MemoryStore());
test('Coffre R04-02 : commandes de fabrication et de verrouillage affichées',()=>{
 const row={id:'job',status:'OFFERED',owner:true,shipName:'Cargo',module:{code:'R04-02',size:2,label:'Coffre sécurisé'},materials:[{name:'Plan'},{name:'Alliage',quantity:20},{name:'Cristaux',quantity:10}],ownerName:'A',technicianName:'B',portName:'Port',source:'Atelier',confirmation:'proof'};
 const h=sensorFabricationsHtml({moduleCode:'R04-02',session:{id:'game',stage:'EN_JEU',safetyStopped:false},jobs:[row],admin:false});assert.match(h,/prepareVaultFabricationApproval/);
 assert.match(sensorFabricationConfirm('prepareVaultFabricationApproval',row,{sessionId:'game'}),/approveVaultFabrication/);
 const d={session:{id:'game',stage:'EN_JEU'},ship:{id:'ship',name:'Cargo'},capacity:5,used:0,lots:[{id:'lot',item:{name:'Caisse'},quantity:2,status:'AVAILABLE',secured:false}]};
 assert.match(vaultCargoHtml(d),/vaultCargoPrepare/);assert.match(vaultCargoConfirm({secure:true,name:'Caisse',quantity:2,used:0,confirmation:'token'},{sessionId:'game',shipId:'ship',lotId:'lot',secure:true}),/vaultCargoSet/);
});
