import test from 'node:test';
import assert from 'node:assert/strict';
import {customsAppealsPlayerHtml,customsAppealsAdminHtml} from '../web/space-customs-detention.mjs';
test('Contestation douanière : seule la saisie non contestée offre le dépôt',()=>{
 const receipt={id:'s1',itemName:'Document',receiptCode:'receipt',status:'SEIZED'};
 const html=customsAppealsPlayerHtml({appeals:[]},[receipt],'sid');
 assert.match(html,/customsAppealFile/);
 assert.match(html,/name="reason"/);
 const submitted=customsAppealsPlayerHtml({appeals:[{seizureId:'s1',itemName:'Document',
  receiptCode:'receipt',status:'PENDING',reason:'Requête'}]},[receipt],'sid');
 assert.doesNotMatch(submitted,/customsAppealFile/);
 assert.match(submitted,/Requête/);
});
test('Contestation douanière : auteur malveillant échappé, notes privées non projetées',()=>{
 const item={seizureId:'s1',itemName:'<script>',receiptCode:'r',
  ownerId:'c',reason:'<script>secret</script>',status:'PENDING',at:100};
 const admin=customsAppealsAdminHtml({appeals:[item]});
 assert.ok(admin.includes('&lt;script&gt;'));
 assert.ok(!admin.includes('<script>'));
 const player=customsAppealsPlayerHtml({appeals:[item]},[],'sid');
 assert.ok(player.includes('&lt;script&gt;'));
 assert.ok(!player.includes('<script>'));
 assert.doesNotMatch(player,/sourceUid|sourceAccessVersion|decisionBy/);
});
