import test from 'node:test';
import assert from 'node:assert/strict';
import {soForgerySuite} from './support/space-forgery-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
import {centralFieldTargetInput,centralFieldTargetEditable} from '../src/core/central-field-targets.mjs';
import {validForgeryEvidence,isForgedLot} from '../src/core/space-forgery-evidence.mjs';
soForgerySuite(()=>new MemoryStore());
const base={kind:'FORGERY',title:'Atelier fictif',description:'Décor de jeu',gmNotes:'Privé',
 profiles:{},rewards:[],forgery:{category:'RECEIPT',minLevel:1,threshold:6,
 blankItemId:'kit_blank-forms',documentTitle:'Fausse attestation dans le jeu',
 documentText:'Fiction sans aucun droit technique',anomalies:'Sigle incorrect'}};
test('M6 INF-03 : modèle de faux suivi et révision sans droits réels',()=>{
 const c=centralFieldTargetInput(base,'forge');
 assert.equal(c.kind,'FORGERY');assert.equal(c.forgery.category,'RECEIPT');
 assert.deepEqual(c.profiles,{});assert.deepEqual(c.rewards,[]);
 assert.deepEqual(centralFieldTargetInput(centralFieldTargetEditable(c),'forge').forgery,c.forgery);
});
test('M6 INF-03 : catégories, niveau, consommable et champs inattendus verrouillés',()=>{
 for(const forgery of [
  {...base.forgery,category:'SHIP_IDENTITY'},
  {...base.forgery,category:'LICENSE',minLevel:2},
  {...base.forgery,minLevel:0},
  {...base.forgery,threshold:13},
  {...base.forgery,blankItemId:'not valid'},
  {...base.forgery,documentText:''},
  {...base.forgery,anomalies:''},
  {...base.forgery,grantAdmin:true}
 ]){
  assert.throws(()=>centralFieldTargetInput({...base,forgery},'bad'));
 }
});

test('INF-03 : preuves conservées pour un objet saisi ou détruit, sans réactiver ses transferts',()=>{
 const lot={id:'doc',origin:{kind:'SO_FORGERY',actionId:'a1',templateId:'M6',templateRevision:2},
  item:{kind:'INDIVIDUAL'},quantity:1,status:'AVAILABLE',transferable:true};
 const record={id:'doc',actionId:'a1',templateId:'M6',templateRevision:2,quality:3};
 assert.equal(isForgedLot(lot),true);
 assert.equal(validForgeryEvidence(lot,record),true);
 const seized={...lot,status:'SEIZED',location:{kind:'CUSTOMS',id:'desk'}};
 assert.equal(validForgeryEvidence(seized,record,{allowArchived:true}),true);
 const destroyed={...lot,status:'DESTROYED',quantity:0};
 assert.equal(validForgeryEvidence(destroyed,record),false);
 assert.equal(validForgeryEvidence(destroyed,record,{allowArchived:true}),true);
 assert.equal(validForgeryEvidence({...lot,status:'AVAILABLE',quantity:0},record,{allowArchived:true}),false);
 assert.equal(validForgeryEvidence({...lot,status:'DESTROYED',quantity:1},record,{allowArchived:true}),false);
 assert.equal(validForgeryEvidence({...lot,id:'other'},record,{allowArchived:true}),false);
 assert.equal(validForgeryEvidence(lot,{...record,templateRevision:99},{allowArchived:true}),false);
 assert.equal(validForgeryEvidence(lot,null,{allowArchived:true}),false);
});
