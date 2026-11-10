import test from 'node:test';
import assert from 'node:assert/strict';
import {customsSeizuresAdminHtml,customsSeizuresPlayerHtml,customsDetentionsAdminHtml} from '../web/space-customs-detention.mjs';
test('Saisie douanière : décision uniquement tant que la retenue est active',()=>{
 const base={id:'c1',lotId:'lot',itemName:'Manifeste',holderId:'p',reasonText:'Sans permis',remainingRealMs:120000};
 const active=customsDetentionsAdminHtml({cases:[{...base,status:'ACTIVE'}]},'sid');
 const expired=customsDetentionsAdminHtml({cases:[{...base,status:'EXPIRED',remainingRealMs:0}]},'sid');
 assert.match(active,/customsHoldSeize/);
 assert.doesNotMatch(expired,/customsHoldSeize/);
 assert.match(expired,/Restituer immédiatement/);
});
test('Saisie douanière : liste réservée MJ, reçu joueur sans motifs privés ni accès',()=>{
 const item={id:'seizure',lotId:'lot',ownerId:'character',itemName:'<script>',
  receiptCode:'fiction-123',reasonText:'Information privée',quantity:1,status:'SEIZED',at:100};
 const admin=customsSeizuresAdminHtml({officialStock:[item]},'sid');
 assert.match(admin,/Information privée/);
 assert.ok(admin.includes('&lt;script&gt;'));assert.ok(!admin.includes('<script>'));
 const own=customsSeizuresPlayerHtml({receipts:[{id:'seizure',lotId:'lot',itemName:'<script>',
  receiptCode:'fiction-123',quantity:1,status:'SEIZED'}]},'sid');
 assert.match(own,/fiction-123/);
 assert.ok(!own.includes('<script>'));
 assert.doesNotMatch(own,/Information privée|decisionBy|grantAdmin/);
});
