import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {commercialTransportFixture} from './support/commercial-transport-suite.mjs';
import {commercialLogisticsFixture} from './support/commercial-logistics-suite.mjs';
import {commercialTransportsHtml,freightConfirmation} from '../web/commercial-transport.mjs';
test('Réception commerciale : coût réel, consentement explicite et absence de mutation à l’aperçu',async()=>{
 const f=await commercialLogisticsFixture(()=>new MemoryStore()),lot=await f.delivered(),d=await f.read('commercialTransports',{},f.client);d.receipts=(await f.read('commercialReceipts',{},f.client)).receipts;const html=commercialTransportsHtml(d);assert.match(html,/data-form="freightReceipt"/);const before=await f.clientWallet(),q=await f.read('prepareCommercialReceipt',{lotId:lot.id},f.client),confirmation=freightConfirmation('receipt',q,{sessionId:f.sid,lotId:lot.id},'receipt-fixed');assert.match(confirmation,/8 Cr/);assert.match(confirmation,/receiveCommercialReceipt/);assert.match(confirmation,/received&quot;:true/);assert.match(confirmation,/type="checkbox" required/);assert.deepEqual(await f.clientWallet(),before);d.receipts[0].local=false;assert.doesNotMatch(commercialTransportsHtml(d),/data-form="freightReceipt"/);assert.match(commercialTransportsHtml(d),/Rejoignez cette planète/);
});
test('Commande distante : le formulaire explique la garde du comptoir et la quantité entière',async()=>{
 const f=await commercialTransportFixture(()=>new MemoryStore(),{pickup:false,buyQuantity:4,requestQuantity:4}),d=await f.read('commercialTransports',{},f.client);assert.equal(d.lots.length,1);assert.match(commercialTransportsHtml(d),/commande encore au comptoir doit être confiée en entier/i);assert.match(commercialTransportsHtml(d),/MJ présentera les caisses/);
});
