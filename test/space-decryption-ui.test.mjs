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

test('INF-02 : sélection d’une aide existante avant le lancement, identité échappée',()=>{
 const html=soDecryptionHtml({enabled:true,level:2,cooldownMs:0,active:null,documents:[{id:'doc',title:'Message',requiredLevel:1}],aidOffers:[{id:'offer',helperName:'<img>'}]},'sid');
 assert.match(html,/name="aidOfferId"/);assert.match(html,/value="offer"/);assert.match(html,/&lt;img&gt;/);
 assert.match(html,/sans dépenser de PA/);
});

test('INF-02 : choix du décrypteur compatible avant lancement, nom échappé',()=>{
 const html=soDecryptionHtml({enabled:true,level:2,cooldownMs:0,documents:[{id:'doc',title:'Message',requiredLevel:1,bonusLots:[{id:'lot',name:'<b>Décrypteur</b>'}]}]},'sid');
 assert.match(html,/name="bonusLotId"/);assert.match(html,/value="lot"/);assert.match(html,/&lt;b&gt;Décrypteur/);
});

test('INF-02 : cryptogramme affiche sa durée puis une réponse, sans bouton de jet ni bonus',()=>{
 const d={enabled:true,level:2,cooldownMs:0,documents:[{id:'doc',title:'Cryptogramme',requiredLevel:1,mode:'CODE',durationSeconds:90}]};
 const menu=soDecryptionHtml(d,'sid');assert.match(menu,/90 secondes/);assert.doesNotMatch(menu,/name="bonusLotId"|name="aidOfferId"/);
 const html=soDecryptionHtml({...d,active:{id:'a',mode:'CODE',status:'RUNNING',remainingMs:0,challenge:{prompt:'<script>Consigne'}}},'sid');
 assert.match(html,/name="answer"/);assert.match(html,/Valider la réponse sans dé/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/Terminer et lancer le D6/);
});
