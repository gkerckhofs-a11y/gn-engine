import test from 'node:test';
import assert from 'node:assert/strict';
import {createSaleUi} from '../web/sales.mjs';
import {createInventoryUi} from '../web/inventory.mjs';
const helpers={button:(l,a,x='')=>`<button data-action="${a}" ${x}>${l}</button>`,link:(l,u)=>`<a href="#/${u}">${l}</a>`},ui=createSaleUi(helpers),evil='<img src=x onerror="bad()">';
const sale={id:'s',seller:{id:'a',name:evil},buyer:{id:'b',name:'Acheteur'},item:{name:evil,unit:'caisse',description:evil},lotId:'l',quantity:2,amount:40,currency:{unit:'crédit'},conditions:evil,pickupPlace:evil,minutes:60,expiresAt:600000,status:'PENDING',direction:'IN',confirmation:'proof',pickupConfirmation:'pickup',canBuy:true,canClose:true};
test('vente UI : prix total explicite, durée, lieu, conditions et confirmation sans réservation',()=>{
  const form=ui.form('session',{id:'l',item:sale.item,quantity:3},sale.currency);assert.match(form,/Prix total du lot/);for(const name of ['badgeUrl','quantity','amount','minutes','pickupPlace','conditions'])assert.match(form,new RegExp(`name="${name}"`));assert.doesNotMatch(form,/<img/);
  const confirm=ui.confirm(sale,{sessionId:'session'});assert.match(confirm,/proposeLotSale/);assert.match(confirm,/Aucun stock ni fonds réservé/);assert.doesNotMatch(confirm,/<img/);
});
test('vente UI : comptes autorisés seulement, propriété personnelle explicite et aucun solde pay-only',()=>{
  const d=ui.detail('session',sale,[{id:'reader',name:'LECTURE_SEULE',canSpend:false},{id:'payer',name:evil,kind:'GROUP',canSpend:true}]);assert.doesNotMatch(d,/LECTURE_SEULE|<img/);assert.match(d,/caisse finance l’achat/);assert.match(d,/purchasePrepare/);
  const p=ui.purchase({sale,source:{name:evil},recipient:sale.seller,total:40},{sessionId:'session',fromAccountId:'payer'});assert.match(p,/Payer et devenir propriétaire/);assert.match(p,/ne permet pas de consulter/);assert.doesNotMatch(p,/Disponible :|<img/);
});
test('vente UI : retrait exige réception et ne repropose pas de paiement',()=>{
  const html=ui.detail('session',{...sale,status:'SOLD',canBuy:false,canClose:false,canPickup:true,pickupStatus:'READY',payer:{name:'Personnel'},paymentId:'payment',purchasedLotId:'lot'});assert.match(html,/confirmSalePickup/);assert.match(html,/name="received" required/);assert.match(html,/aucun nouveau paiement/);assert.doesNotMatch(html,/purchasePrepare|buyLot|<img/);
});
test('vente UI : biens détenus pour autrui, objets à récupérer et aperçu sans commande',()=>{
  const lot={id:'lot',item:sale.item,quantity:2,status:'AVAILABLE'},d={session:{id:'s'},character:{id:'b',name:'Acheteur'},lots:[],transfers:[],sales:[sale],ownedElsewhere:[lot],heldForOthers:[lot],preview:true};
  const html=createInventoryUi(helpers).page(d);assert.match(html,/Mes objets à récupérer/);assert.match(html,/Objets détenus pour autrui/);assert.match(html,/Mes achats et ventes/);assert.doesNotMatch(html,/<button|<form|<img|<a /);
});
