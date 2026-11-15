import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {commercialStorageFixture} from './support/commercial-storage-suite.mjs';
import {commercialStorageHtml,commercialStorageConfirm} from '../web/commercial-storage.mjs';
test('Entrepôts : tarifs explicites, confirmation native, propriétaire et planète conservés',async()=>{
 const f=await commercialStorageFixture(()=>new MemoryStore()),d=await f.detail(),accounts=(await f.read('myAccounts',{},f.client)).accounts,html=commercialStorageHtml(d,accounts);assert.match(html,/10 Cr/);assert.match(html,/data-form="commercialStorageRent"/);assert.match(html,/bail reste à votre nom/);const p={sessionId:f.sid,warehouseId:f.wid,tenantType:'CHARACTER',fromAccountId:accounts[0].id},q=await f.read('prepareCommercialStorageRent',{warehouseId:f.wid,tenantType:'CHARACTER',fromAccountId:accounts[0].id},f.client);assert.match(commercialStorageConfirm('rent',q,p,'stable'),/rentCommercialStorage/);assert.match(commercialStorageConfirm('rent',q,p,'stable'),/10 Cr pour 5 minutes/);assert.match(commercialStorageConfirm('rent',q,p,'stable'),/type="checkbox" required/);const admin=await f.read('commercialStorageAdmin',{},f.owner);assert.match(commercialStorageHtml(admin,[],true),/name="rent"/);assert.match(commercialStorageHtml(admin,[],true),/tarif explicites/);
});
