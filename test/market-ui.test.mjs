import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketUi,marketMatches} from '../web/market.mjs';
import {createSaleUi} from '../web/sales.mjs';
import {createInventoryUi} from '../web/inventory.mjs';
const helpers={button:(l,a,x='')=>`<button data-action="${a}" ${x}>${l}</button>`,link:(l,u)=>`<a href="#/${u}">${l}</a>`},ui=createMarketUi(helpers),evil='<img src=x onerror="bad()">';
const listing={id:'listing',item:{id:'item',name:evil,description:evil,category:'Matériel',unit:'caisse'},seller:{id:'s',name:evil},quantity:2,amount:40,currency:{unit:'crédit'},pickupPlace:'Quai',conditions:evil,minutes:10,expiresAt:600000,status:'ACTIVE',own:false,canBuy:true};
test('marché UI : champs explicites, prix total, réservation et confirmation échappés',()=>{
  const form=ui.form('session',{id:'lot',item:listing.item,quantity:3},listing.currency);for(const name of ['quantity','amount','minutes','pickupPlace','conditions'])assert.match(form,new RegExp(`name="${name}"`));assert.match(form,/prix sera versé sur votre portefeuille personnel/);assert.doesNotMatch(form,/<img|badgeUrl/);const confirm=ui.confirm(listing,{sessionId:'session'});assert.match(confirm,/publishMarketListing/);assert.match(confirm,/réserver ce stock/);assert.doesNotMatch(confirm,/<img/);
});
test('marché UI : filtres vendeur, lieu, catégorie et annonces propres expirées',()=>{
  const p={...listing,seller:{name:'Alice'},item:{name:'Caisse',description:'Supplies',category:'Matériel'}};assert.equal(marketMatches(p,'alice'),true);assert.equal(marketMatches(p,'quai'),true);assert.equal(marketMatches(p,'','Autre'),false);assert.equal(marketMatches({...p,status:'EXPIRED',own:true},'','ALL','OWN'),true);assert.equal(marketMatches({...p,status:'EXPIRED'},''),false);
  const html=ui.page({session:{id:'session'},economyEnabled:true,listings:[listing]});assert.match(html,/data-market-search/);assert.match(html,/Mes annonces/);assert.match(html,/marketDetail/);assert.doesNotMatch(html,/<img|withdrawSessionListing/);
});
test('marché UI : compte payeur autorisé, solde masqué et reçu réutilisé',()=>{
  const html=ui.detail('session',listing,[{id:'reader',name:'LECTURE_SEULE',canSpend:false},{id:'payer',name:evil,kind:'GROUP',canSpend:true}]);assert.match(html,/marketPurchasePrepare/);assert.doesNotMatch(html,/LECTURE_SEULE|<img/);const sale={...listing,buyer:{id:'b',name:'Acheteur'}},p=createSaleUi(helpers).purchase({sale,source:{name:'Caisse'},recipient:listing.seller,total:40},{sessionId:'session'},true);assert.match(p,/marketCommand/);assert.match(p,/buyMarketListing/);assert.match(p,/ne permet pas de consulter/);assert.doesNotMatch(p,/Disponible :|<img/);
});
test('marché UI : vendeur retire avec confirmation, MJ avec motif et aperçu sans action',()=>{
  const own={...listing,canBuy:false,own:true,canWithdraw:true,confirmation:'proof'};assert.match(ui.detail('session',own),/withdrawMarketListing/);const admin=ui.page({session:{id:'session'},admin:true,economyEnabled:false,listings:[own]});assert.match(admin,/withdrawSessionListing/);assert.match(admin,/name="reason" maxlength="500" required/);assert.match(admin,/type="checkbox" required/);assert.doesNotMatch(admin,/<img/);
  const data={session:{id:'session'},character:{id:'s',name:'Vendeur'},lots:[{id:'lot',item:listing.item,quantity:2,status:'RESERVED',marketReservation:{listingId:'listing',expiresAt:600000}}],transfers:[],sales:[],preview:true};assert.doesNotMatch(createInventoryUi(helpers).page(data),/<button|<form|<img|<a /);assert.match(createInventoryUi(helpers).page({...data,preview:false}),/Gérer cette annonce/);
});
