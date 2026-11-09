import test from 'node:test';
import assert from 'node:assert/strict';
import {soDecryptionHtml} from '../web/space-decryption.mjs';
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
