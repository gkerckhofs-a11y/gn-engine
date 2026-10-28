import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shopsHtml,shopPurchaseHtml,shopProvisionHtml,shopProvisionConfirmHtml,soInventoryHtml} from '../web/shops.mjs';
import {playerShell,playerRoute,terminalHtml,actionIntroHtml,playerTargetPath} from '../web/player-spaces.mjs';
const item={id:'i',name:'Trousse <script>',description:'Soin <script>',unit:'unité',kind:'STACKABLE',consumable:true};
const offer={id:'o',name:'Trousse',unitPrice:30,stock:2,restricted:true,canBuy:true,conditions:'Retrait',item};
const shop={id:'counter',name:'Comptoir <script>',location:'Port',description:'Public',offers:[offer],account:{balance:30}};
const order={id:'sale',shopId:'counter',item,quantity:1,amount:30,protectedAmount:30,seller:{name:'PNJ'},buyer:{name:'Ari'},pickupStatus:'READY',pickupPlace:'Port',conditions:'',purchasedLotId:'lot',confirmation:'proof',canPickup:true,canOfferPickup:true};
test('Boutiques SO UI : devis visible, fonds séparés et retrait annoncé avant paiement',()=>{
 const d={shop,offer,quantity:1,amount:30,protectedAmount:20,ordinaryAmount:10,after:{protectedCredits:0,available:15},restricted:true,quoteAt:1,confirmation:'proof'},html=shopPurchaseHtml(d,{sessionId:'s',shopId:'counter',offerId:'o',quantity:1,useProtected:true});assert.match(html,/20 Cr protégés \+ 10 Cr ordinaires/);assert.match(html,/inutilisables jusqu’à la remise/);assert.match(html,/quoteAt/);assert.match(html,/buyShopOffer/);assert.doesNotMatch(html,/<script>/);
});
test('Boutiques SO UI : contrôle de retrait joueur, dotation MJ explicite et aucune action dupliquée',()=>{
 const d={session:{id:'s'},shops:[shop],orders:[order]},player=shopsHtml(d),admin=shopsHtml({...d,admin:true,canProvision:true});assert.match(player,/name="useProtected"/);assert.match(player,/confirmShopPickup/);assert.match(player,/name="received" required/);assert.doesNotMatch(player,/offerShopPickup|shopProvision|shopQr|Caisse PNJ/);assert.match(admin,/offerShopPickup/);assert.match(admin,/shopProvision|shopQr/);assert.doesNotMatch(admin,/data-form="shopPurchase"|confirmShopPickup|<script>/);
 const form=shopProvisionHtml('s',shop,offer,'stable');assert.match(form,/name="source"/);assert.match(form,/name="provisionId"/);assert.match(form,/name="restricted"/);const done=shopProvisionConfirmHtml({alreadyProvisioned:true,provisionId:'stable',quantity:2},{});assert.doesNotMatch(done,/<form/);
});
test('Boutiques SO UI : sac distingue lots consommés, réservés et achats en attente',()=>{
 const d={session:{id:'s',spaceOutlaws:{shopsVersion:1}},lots:[{id:'used',item,quantity:0,status:'CONSUMED',pillable:false,transferable:false,resellable:false},{id:'busy',item,quantity:1,status:'FIELD_RESERVED',pillable:false}]},html=soInventoryHtml(d,{account:{protectedCredits:170,available:0}},{session:d.session,orders:[order]});assert.match(html,/Consommé/);assert.match(html,/Réservé pour une action/);assert.match(html,/170 Cr de création/);assert.match(html,/#\/shops\/s/);assert.match(html,/confirmShopPickup/);assert.doesNotMatch(html,/kit initial|<script>/);
});
test('Boutiques SO UI : navigation, QR même session et régie santé sur le bon identifiant',()=>{
 const d={session:{id:'s',spaceOutlaws:{shopsVersion:1,actionsVersion:1}},character:{id:'c',displayName:'A'}};assert.equal(playerRoute('shop','s','counter').space,'terminal');assert.match(playerShell(d,playerRoute('shops','s'),'X'),/#\/terminal\/s/);assert.match(terminalHtml(d),/#\/shops\/s/);assert.doesNotMatch(terminalHtml(d),/#\/cargo|#\/missions/);assert.match(actionIntroHtml('s','c',true,true,true),/value="shop"/);assert.equal(playerTargetPath('https://game.test/#/shop/s/counter','shop','https://game.test','s'),'shop/s/counter');assert.throws(()=>playerTargetPath('https://game.test/#/shop/other/counter','shop','https://game.test','s'));
 const source=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8'),session=source.slice(source.indexOf('async function sessionPage'),source.indexOf('async function playerPage'));assert.equal(/survivalAdmin',\{sessionId:sid\}/.test(session),false);
});
