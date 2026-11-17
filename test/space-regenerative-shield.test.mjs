import {MemoryStore} from './support/memory.mjs';
import {regenerativeShieldSuite} from './support/space-regenerative-shield-suite.mjs';
import {sensorFabricationsHtml,sensorFabricationConfirm} from '../web/space-sensor-fabrication.mjs';
import {shipModuleRepairPlan} from '../src/shared/space-ship-modules.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
regenerativeShieldSuite(()=>new MemoryStore());
test('Bouclier R05-01 : réparation N5 et commandes de fabrication affichées',()=>{
 const plan=shipModuleRepairPlan({code:'R05-01',size:2,lotId:'module'});
 assert.equal(plan.unitCost,1250);
 assert.equal(plan.secondsPerPoint,900);
 assert.equal(plan.moduleLevel,5);
 const row={id:'work',status:'OFFERED',owner:true,shipName:'Cargo',module:{code:'R05-01',size:2,label:'Bouclier régénératif'},materials:[{name:'Plan'},{name:'Alliage',quantity:30},{name:'Cristaux',quantity:20}],ownerName:'A',technicianName:'B',portName:'Port',source:'Atelier',confirmation:'proof'};
 const html=sensorFabricationsHtml({moduleCode:'R05-01',session:{id:'game',stage:'EN_JEU',safetyStopped:false},admin:false,jobs:[row]});
 assert.match(html,/prepareShieldFabricationApproval/);
 assert.match(html,/cancelShieldFabrication/);
 assert.match(sensorFabricationConfirm('prepareShieldFabricationApproval',row,{sessionId:'game'}),/approveShieldFabrication/);
});
