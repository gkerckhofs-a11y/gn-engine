import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moduleMandatesHtml,moduleMandateConfirmHtml} from '../web/space-module-mandates.mjs';
import {maintenanceHtml} from '../web/space-maintenance.mjs';
import {playerRoute} from '../web/player-spaces.mjs';
const record={id:'r',status:'MODULE_OFFERED',shipName:'<img src=x>',shipId:'ship',lotId:'lot',module:{code:'MOD-01',label:'Bouclier',size:2},ownerId:'owner',ownerName:'Propriétaire',technicianId:'tech',technicianName:'<script>Tech</script>',portName:'Port',install:{level:2,seconds:600,actionPoints:1},valid:true,owner:true,canCancel:true,confirmation:'proof'};
const d={session:{id:'s',stage:'EN_JEU'},admin:false,jobs:[record]};
test('Mandats modules UI : consentement du propriétaire, refus et limites visibles, contenus échappés',()=>{
 const h=moduleMandatesHtml(d);assert.match(h,/prepareModuleMandateApproval/);assert.match(h,/declineModuleMandate/);assert.match(h,/aucun module ni vaisseau réservé/);assert.match(h,/aucun travail commencé/);assert.match(h,/MEC-03 N2, 10 min, 1 PA/);assert.doesNotMatch(h,/<script>|<img|startSpaceMaintenance|offerModuleMandate/);
 const tech=moduleMandatesHtml({...d,jobs:[{...record,owner:false}]});assert.doesNotMatch(tech,/prepareModuleMandateApproval|declineModuleMandate/);assert.match(tech,/cancelModuleMandate/);
 const invalid=moduleMandatesHtml({...d,jobs:[{...record,valid:false}]});assert.doesNotMatch(invalid,/prepareModuleMandateApproval/);assert.match(invalid,/declineModuleMandate/);
 const paused=moduleMandatesHtml({...d,session:{...d.session,stage:'PAUSE'}});assert.doesNotMatch(paused,/prepareModuleMandateApproval/);assert.match(paused,/cancelModuleMandate/);
 const stop=moduleMandatesHtml({...d,session:{...d.session,safetyStopped:true}});assert.doesNotMatch(stop,/<form/);
});
test('Mandats modules UI : propositions MJ, aperçu personnel et entrée depuis l’entretien',()=>{
 const admin=moduleMandatesHtml({...d,admin:true,ships:[{id:'ship',name:'Ship'}],lots:[{id:'lot',name:'Module',ownerId:'owner',code:'MOD-01',size:2}],characters:[{id:'tech',name:'Tech',level:3}]});assert.match(admin,/moduleMandateOffer/);assert.match(admin,/name="workshopConfirmed"/);assert.doesNotMatch(admin,/prepareModuleMandateApproval|name="(price|amount|seconds|actionPoints)"/);
 const approval=moduleMandateConfirmHtml('prepareModuleMandateApproval',record,{sessionId:'s',mandateId:'r'});assert.match(approval,/approveModuleMandate/);assert.match(approval,/name="present"/);assert.doesNotMatch(approval,/<img|<script>/);
 const h=maintenanceHtml({session:d.session,admin:false,jobs:[],moduleMandatesReady:true});assert.match(h,/#\/module-mandates\/s/);assert.doesNotMatch(maintenanceHtml({session:d.session,admin:false,jobs:[]}),/module-mandates/);assert.equal(playerRoute('module-mandates','s').space,'terminal');
 const app=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');assert.match(app,/page==='module-mandates'\|\|page==='module-mandates-admin'/);assert.match(app,/kind==='moduleMandateOffer'/);assert.match(app,/kind==='moduleMandateCommand'/);
});
