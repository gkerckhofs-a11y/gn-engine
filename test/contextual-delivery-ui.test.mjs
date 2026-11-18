import test from 'node:test';
import assert from 'node:assert/strict';
import {centralOfferInput} from '../src/core/central-shops.mjs';
import {importedShop,exportedShop} from '../src/core/central-shop-import.mjs';
import {centralImportSheets} from '../src/shared/central-import-schema.mjs';
import {centralOfferPayload,createCentralShopUi} from '../web/central-shops.mjs';
import {shopPurchaseHtml,shopOrdersHtml} from '../web/shops.mjs';
const input={name:'Objet',shopId:'counter',itemId:'item',unitPrice:30,buybackPrice:null,conditions:'',gmNotes:''};
test('Livraison M5 : champ versionné explicite, vieux imports préservés et export compatible',()=>{
 const old=centralOfferInput(input,'offer');assert.equal(old.deliveryMode,undefined);const digital=centralOfferInput({...input,deliveryMode:'DIGITAL',negotiationLevel:2},'offer');assert.equal(digital.deliverySchemaVersion,1);
 const c={type:'offer',entityId:'offer',operation:'UPSERT',data:digital};assert.equal(exportedShop(c).mode_livraison,'DIGITAL');assert.ok(centralImportSheets.Offres.includes('mode_livraison'));
 const imported=importedShop('offer',{id:'offer',nom:'Autre nom'},c);assert.equal(imported.deliveryMode,'DIGITAL');assert.equal(imported.negotiationLevel,2);
 assert.equal(importedShop('offer',{id:'offer',mode_livraison:'PHYSICAL'},c).deliveryMode,'PHYSICAL');assert.throws(()=>importedShop('offer',{id:'offer',mode_livraison:'UNKNOWN'},c),{column:'mode_livraison'});
});
test('Livraison M5 : nouveau formulaire exige un choix, édition historique le conserve',()=>{
 const ui=createCentralShopUi({button:()=>''}),d={campaign:{id:'c'},draft:{revision:1},references:{shops:[],items:[],itemsReadable:true}};assert.match(ui.offerForm(d,'new'),/name="deliveryMode" required/);assert.doesNotMatch(ui.offerForm(d,'new'),/value="LEGACY"/);assert.match(ui.offerForm(d,'old',{data:input}),/value="LEGACY" selected/);
 assert.equal(centralOfferPayload({...input,deliveryMode:'DIGITAL',unitPrice:'30',buybackPrice:''}).deliveryMode,'DIGITAL');assert.equal(centralOfferPayload({...input,deliveryMode:'LEGACY',unitPrice:'30',buybackPrice:''}).deliveryMode,undefined);
});
test('Achat et reçu : mode numérique visible, aucune remise physique annoncée pour cette commande',()=>{
 const d={shop:{name:'Comptoir',location:'Quai'},offer:{name:'Objet',unitPrice:30,item:{usage:'PERSONAL'},conditions:'',deliveryMode:'DIGITAL'},quantity:1,amount:30,protectedAmount:0,ordinaryAmount:30,quoteAt:100,confirmation:'q'},html=shopPurchaseHtml(d,{sessionId:'s'});assert.match(html,/Livraison numérique immédiate/);assert.doesNotMatch(html,/resteront inutilisables/);
 const physical=shopPurchaseHtml({...d,offer:{...d.offer,deliveryMode:'PHYSICAL'}},{sessionId:'s'});assert.match(physical,/resteront inutilisables/);
 const receipt=shopOrdersHtml({session:{id:'s'},admin:false,orders:[{id:'r',item:{name:'Objet',unit:'unité'},quantity:1,amount:30,seller:{name:'Comptoir'},buyer:{name:'Client'},deliveryMode:'DIGITAL',pickupStatus:'RECEIVED',pickupPlace:'Quai',conditions:''}]});assert.match(receipt,/Livraison numérique effectuée/);assert.doesNotMatch(receipt,/confirmShopPickup/);
});
