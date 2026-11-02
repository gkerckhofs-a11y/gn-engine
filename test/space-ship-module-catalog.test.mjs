import test from 'node:test';
import assert from 'node:assert/strict';
import {standardShipModules,standardShipModuleQuote} from '../src/shared/space-ship-modules.mjs';
import {itemInput,newLot,publicItem} from '../src/core/inventory-state.mjs';
import {shipModuleCatalogSuite,moduleItem} from './support/space-ship-module-catalog-suite.mjs';
import {MemoryStore} from './support/memory.mjs';

test('Catalogue modules : douze prix canoniques et profils MEC-03 distincts',()=>{
 const expected={'MOD-01':[750,1500,3000],'MOD-02':[750,1500,3000],'MOD-03':[1250,2500,5000],'MOD-06':[1000,2000,4000]};
 assert.deepEqual(standardShipModules.map(m=>m.code),Object.keys(expected));
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
