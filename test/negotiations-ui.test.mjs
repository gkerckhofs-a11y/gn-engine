import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createNegotiationUi} from '../web/market-negotiations.mjs';
import {createMarketUi} from '../web/market.mjs';
import {createSaleUi} from '../web/sales.mjs';
const helpers={button:(l,a,x='')=>`<button data-action="${a}" ${x}>${l}</button>`,link:(l,u)=>`<a href="#/${u}">${l}</a>`},ui=createNegotiationUi(helpers),evil='<img src=x onerror="bad()">';
const listing={id:'listing',item:{name:evil,description:evil,category:'Matériel',unit:'caisse'},seller:{id:'s',name:evil},quantity:3,amount:40,currency:{unit:'crédit'},pickupPlace:evil,conditions:evil,expiresAt:600000,status:'ACTIVE',canNegotiate:true};
const thread={id:'thread',listingId:'listing',listing,seller:listing.seller,buyer:{id:'b',name:evil},amount:25,message:evil,status:'OPEN',expiresAt:300000,canReply:true,canClose:true,confirmation:'proof',history:[{at:0,kind:'OFFER',author:{name:evil},amount:25,message:evil}]};
test('négociation UI : durée explicite, lot entier, prix fixe et confirmation échappée',()=>{
  const form=ui.form('sid',listing);for(const name of ['amount','minutes','message'])assert.match(form,new RegExp(`name="${name}"`));assert.match(form,/lot entier/);assert.doesNotMatch(form,/<img/);
  const confirm=ui.confirm({listing,recipient:thread.seller,amount:25,minutes:10,message:evil},{sessionId:'sid'});assert.match(confirm,/sendMarketOffer/);assert.match(confirm,/ne réserve pas le lot pour vous/);assert.match(confirm,/prix est fixe/);assert.doesNotMatch(confirm,/<img/);
});
test('négociation UI : réponses selon le tour, clôture explicite et historique privé échappé',()=>{
  const html=ui.detail('sid',thread);assert.match(html,/acceptMarketOffer/);assert.match(html,/closeMarketNegotiation/);assert.match(html,/data-id="thread"/);assert.doesNotMatch(html,/name="minutes"|<img/);
  const waiting=ui.detail('sid',{...thread,canReply:false,ownOffer:true});assert.doesNotMatch(waiting,/acceptMarketOffer|marketOfferPrepare/);assert.match(waiting,/En attente de la réponse/);
  const closed=ui.detail('sid',{...thread,status:'EXPIRED',canReply:false,canClose:false});assert.doesNotMatch(closed,/<form|<img/);
});
test('négociation UI : paiement au prix accepté avec comptes autorisés et reçu identifié',()=>{
  const d={...thread,status:'ACCEPTED',canReply:false,canBuy:true},html=ui.detail('sid',d,[{id:'reader',canSpend:false,name:'LECTURE_SEULE'},{id:'payer',kind:'GROUP',canSpend:true,name:evil}]);
  assert.match(html,/data-negotiation="thread"/);assert.match(html,/Vérifier le paiement au prix accepté/);assert.doesNotMatch(html,/LECTURE_SEULE|<img/);
  const sale={...listing,buyer:thread.buyer,negotiationId:thread.id};const payment=createSaleUi(helpers).purchase({sale,source:{name:'Caisse'},recipient:thread.seller,total:25},{sessionId:'sid',listingId:'listing',negotiationId:'thread'},true);
  assert.match(payment,/Prix négocié fixe accepté/);assert.match(payment,/negotiationId/);assert.match(payment,/buyMarketListing/);assert.doesNotMatch(payment,/<img/);
});
test('négociation UI : accès marché et branchements conservant identifiant avant paiement',async()=>{
  const market=createMarketUi(helpers);assert.match(market.detail('sid',listing),/Négocier le prix/);assert.match(market.page({session:{id:'sid'},listings:[],economyEnabled:true},ui.list('sid',[thread])),/Mes négociations/);
  const app=await readFile(new URL('../web/app.mjs',import.meta.url),'utf8');for(const action of ['myMarketNegotiations','marketNegotiation','prepareMarketOffer'])assert.ok(app.includes(`api('${action}'`));assert.match(app,/negotiationId:form.dataset.negotiation/);
});
