import test from 'node:test';
import assert from 'node:assert/strict';
import {standardShipModules,standardShipModuleQuote,playableShipModuleQuote,installedShipProfile} from '../src/shared/space-ship-modules.mjs';
import {itemInput,newLot,publicItem} from '../src/core/inventory-state.mjs';
import {shipModuleCatalogSuite,moduleItem} from './support/space-ship-module-catalog-suite.mjs';
import {moduleOfferValid} from '../src/core/space-outlaws-shop-state.mjs';
import {MemoryStore} from './support/memory.mjs';

test('Catalogue modules : douze prix canoniques et profils MEC-03 distincts',()=>{
 const expected={'MOD-01':[750,1500,3000],'MOD-02':[750,1500,3000],'MOD-03':[1250,2500,5000],'MOD-06':[1000,2000,4000]};
 assert.deepEqual(standardShipModules.filter(m=>!m.requiresHiddenCargo&&!m.requiresTowing).map(m=>m.code),Object.keys(expected));
 for(const [code,prices] of Object.entries(expected))for(const [i,price] of prices.entries()){
  const q=standardShipModuleQuote({code,size:i+1}),advanced=['MOD-03','MOD-06'].includes(code);
  assert.equal(q.price,price);assert.deepEqual(q.install,{skillId:'MEC-03',level:advanced?3:2,seconds:advanced?900:600,actionPoints:1});
  assert.deepEqual(q.remove,{skillId:'MEC-03',level:2,seconds:300,actionPoints:1});
 }
 for(const input of [null,undefined,'MOD-01',{},...['MOD-04','MOD-05','R04-01','mod-01'].map(code=>({code,size:1})),...[0,4,1.5,'1'].map(size=>({code:'MOD-01',size}))])assert.equal(standardShipModuleQuote(input),null);
});
test('Catalogue modules : un lot fige sa calibration indépendamment du modèle futur',()=>{
 const definition=itemInput({...moduleItem,publicationState:'DRAFT'},'shield'),lot=newLot('lot',definition,1,'owner',1000,{kind:'TEST'});
 const updated=itemInput({...moduleItem,shipModule:{code:'MOD-01',size:3},publicationState:'DRAFT'},'shield',definition);
 assert.deepEqual(lot.item.shipModule,{code:'MOD-01',size:2});assert.equal(standardShipModuleQuote(lot.item.shipModule).price,1500);assert.equal(standardShipModuleQuote(updated.shipModule).price,3000);
 const projected=publicItem(lot.item);projected.shipModule.size=1;assert.equal(lot.item.shipModule.size,2);
 assert.equal(lot.status,'AVAILABLE');assert.deepEqual(lot.location,{kind:'CHARACTER',id:'owner'});assert.equal('gmNotes' in projected,false);
});
shipModuleCatalogSuite(()=>new MemoryStore());

test('MOD-04 : 10 % du gabarit, 5/20 ou 10/50 unités et ouverture sous capacité de session explicite',()=>{
 for(const [size,price,hidden,total]of [[2,1000,5,20],[3,2000,10,50]]){const q=standardShipModuleQuote({code:'MOD-04',size});assert.equal(q.price,price);assert.equal(q.hiddenCargoCapacity,hidden);assert.equal(q.cargoCapacity,total);assert.equal(q.requiresHiddenCargo,true);assert.deepEqual(q.install,{skillId:'MEC-03',level:2,seconds:600,actionPoints:1});assert.equal(playableShipModuleQuote({code:'MOD-04',size}),null);assert.equal(playableShipModuleQuote({code:'MOD-04',size},{hiddenCargo:true}).price,price);assert.equal(moduleOfferValid({item:{...moduleItem,shipModule:{code:'MOD-04',size}},unitPrice:price}),false);assert.equal(installedShipProfile({id:size===2?'CARGO':'TRANSPORT'},[{code:'MOD-04',size,status:'OPERATIONAL'}]),null);}
 assert.equal(standardShipModuleQuote({code:'MOD-04',size:1}),null);
});

test('MOD-05 : tarifs et atelier canoniques sans ouverture implicite des profils ni du commerce',()=>{
 for(const [size,price]of [[2,1000],[3,2000]]){const calibration={code:'MOD-05',size},q=standardShipModuleQuote(calibration);assert.equal(q.price,price);assert.equal(q.requiresTowing,true);assert.deepEqual(q.install,{skillId:'MEC-03',level:2,seconds:600,actionPoints:1});assert.deepEqual(q.remove,{skillId:'MEC-03',level:2,seconds:300,actionPoints:1});assert.equal(playableShipModuleQuote(calibration,{hiddenCargo:true}),null);assert.equal(playableShipModuleQuote(calibration,{towing:true}).price,price);assert.equal(moduleOfferValid({item:{...moduleItem,shipModule:calibration},unitPrice:price},{hiddenCargo:true}),false);assert.equal(installedShipProfile({id:size===2?'CARGO':'TRANSPORT'},[{...calibration,status:'OPERATIONAL'}],{hiddenCargo:true}),null);}
 assert.equal(standardShipModuleQuote({code:'MOD-05',size:1}),null);
});
