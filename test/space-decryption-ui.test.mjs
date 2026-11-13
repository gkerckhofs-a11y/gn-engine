import test from 'node:test';
import assert from 'node:assert/strict';
import {soDecryptionHtml,soDecryptionAdminHtml} from '../web/space-decryption.mjs';
test('INF-02 : pas de texte décodé avant résolution, rendu échappé',()=>{
 const html=soDecryptionHtml({enabled:true,level:2,cooldownMs:0,active:null,documents:[{id:'doc',title:'<script>',requiredLevel:1,attempted:false,decoded:false}]},'sid');
 assert.match(html,/soDecryptionStart/);
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>'));
 assert.doesNotMatch(html,/COORDONNEES_SECRETES/);
});
test('INF-02 : une tentative consommée interdit un nouveau lancement dans l’interface',()=>{
 const html=soDecryptionHtml({enabled:true,level:2,cooldownMs:0,active:null,documents:[{id:'doc',title:'Chiffre',requiredLevel:1,attempted:true,decoded:false}]},'sid');
 assert.match(html,/disabled/);
});

test('INF-02 régie : interruption motivée et valeurs échappées',()=>{
 const html=soDecryptionAdminHtml({actions:[{id:'a',characterName:'<script>',knowledgeId:'doc',remainingMs:1000}]},'session');
 assert.match(html,/soDecryptionCancelMJ/);assert.match(html,/name="reason" maxlength="500" required/);
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 assert.match(soDecryptionAdminHtml({actions:[]},'session'),/Aucun déchiffrement/);
});
