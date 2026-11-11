import test from 'node:test';
import assert from 'node:assert/strict';
import {intelligenceHtml,intelligenceConfirmHtml,intelligenceInput} from '../web/intelligence.mjs';
import {terminalHtml,playerRoute} from '../web/player-spaces.mjs';
const offer={id:'offer',title:'Piste <privée>',label:'Rumeur commerciale',price:50,provider:'<contact>',status:'OFFERED',confirmation:'buyer-proof',knowledgeId:'SECRET_M6',source:'SECRET_SOURCE',voyageId:'SECRET_VOYAGE'};
test('Renseignements UI : offre publique sans contenu ni liens privés, achat puis carnet',()=>{
 const d={session:{id:'s'},offers:[offer]},h=intelligenceHtml(d);assert.match(h,/Piste &lt;privée&gt;/);assert.match(h,/&lt;contact&gt;/);assert.match(h,/50 Cr/);assert.match(h,/buyer-proof/);assert.doesNotMatch(h,/SECRET_|<contact>|Lire dans mon carnet/);assert.match(h,/prepareIntelligencePurchase/);assert.match(intelligenceHtml({...d,offers:[{...offer,status:'PURCHASED'}]}),/#\/knowledge\/s\/SECRET_M6/);
});
test('Renseignements UI : confirmation financière sans révélation, présence obligatoire',()=>{
 const h=intelligenceConfirmHtml('prepareIntelligencePurchase',{offer,before:{available:100},after:{available:50},confirmation:'purchase-proof'},{sessionId:'s',offerId:'offer'});assert.match(h,/100 → 50 Cr/);assert.match(h,/type="checkbox" required/);assert.match(h,/purchase-proof/);assert.doesNotMatch(h,/SECRET_/);assert.match(h,/vérité et son actualité ne sont pas garanties/);
});
test('Renseignements UI : préparation MJ sur références natives et tarifs fixes, champs normalisés',()=>{
 const h=intelligenceHtml({admin:true,session:{id:'s'},offers:[],characters:[{id:'c',name:'Joueur'}],knowledge:[{id:'k',title:'M6 <secret>'}],shops:[{id:'shop',name:'Comptoir'}],voyages:[{id:'v',shipId:'ship'}],products:[{category:'RUMOR',label:'Rumeur',price:50},{category:'FLIGHT_PLAN',label:'Plan',price:150},{category:'CONFIDENTIAL',label:'Dossier',price:300}]});assert.match(h,/M6 &lt;secret&gt;/);assert.match(h,/300 Cr/);assert.doesNotMatch(h,/name="price"/);assert.match(h,/name="voyageId"/);assert.deepEqual(intelligenceInput('prepareIntelligenceOffer',{sessionId:'s'},{category:'RUMOR',voyageId:'v'},true),{sessionId:'s',category:'RUMOR',voyageId:null,present:true});assert.equal(intelligenceInput('prepareIntelligenceOffer',{}, {category:'FLIGHT_PLAN',voyageId:''},true).voyageId,null);assert.deepEqual(intelligenceInput('declineIntelligence',{confirmation:'buyer-proof'},{reason:'Non'},undefined),{confirmation:'buyer-proof',reason:'Non'});
});
test('Renseignements UI : terminal seulement sous marqueur, route joueur native',()=>{
 assert.equal(playerRoute('intelligence','s').space,'terminal');const d={session:{id:'s',spaceOutlaws:{}}};assert.doesNotMatch(terminalHtml(d),/intelligence\/s/);assert.match(terminalHtml({...d,session:{...d.session,intelligenceVersion:1,spaceOutlaws:{intelligenceVersion:1}}}),/intelligence\/s/);
});
