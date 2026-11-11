import test from 'node:test';
import assert from 'node:assert/strict';
import {customsDetentionsAdminHtml} from '../web/space-customs-detention.mjs';
const caseData={id:'hold',lotId:'doc',itemName:'<script>',
 ownerId:'first',holderId:'other',reason:'REGULATED_NO_LICENSE',
 reasonText:'<b>Permis</b> manquant',openedAt:10,expiresAt:900010,remainingRealMs:450000,status:'ACTIVE'};
test('Douane SO : affichage retenue, minuterie réelle et contenu échappé',()=>{
 const html=customsDetentionsAdminHtml({cases:[caseData],session:{id:'sid'}},'sid');
 assert.match(html,/15 minutes réelles/);
 assert.match(html,/450 s/);
 assert.match(html,/customsHoldRelease/);
 assert.match(html,/customsHoldStart/);
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('&lt;b&gt;Permis&lt;\/b&gt;'));
 assert.ok(!html.includes('<script>'));
});
test('Douane SO : l’expiration demande la restitution réelle, sans saisir le lot',()=>{
 const html=customsDetentionsAdminHtml({cases:[{...caseData,status:'EXPIRED',remainingRealMs:0}],session:{id:'sid'}},'sid');
 assert.match(html,/blocage numérique est levé/);
 assert.match(html,/Constater la fin/);
 assert.doesNotMatch(html,/Encaisser|Saisir définitivement/);
});
