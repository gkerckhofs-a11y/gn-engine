import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPriceUi,priceBoardHtml} from '../web/prices.mjs';
import {createMarketUi} from '../web/market.mjs';
import {commodityQuote,indexedListing,routeQuote,priceEventInput} from '../src/core/price-state.mjs';
const helpers={button:(l,a,x='')=>`<button data-action="${a}" ${x}>${l}</button>`,link:(l,u)=>`<a href="#/${u}">${l}</a>`};
const evil='<img src=x onerror="bad()">',item={id:'fuel',name:evil,unit:'bidon',kind:'STACKABLE',publicationState:'PUBLISHED'},price={id:'fuel',item,baseUnitPrice:10,enabled:true,revision:1};
const event={id:'event',itemId:'fuel',title:evil,description:evil,percent:50,enabled:true,active:true,trigger:'INSTALLATION_OFFLINE',targetId:'installation',revision:1};
test('cours UI : réglages et consentement explicites, textes échappés, installation privée dans la régie',()=>{
 const ui=createPriceUi(helpers),d={session:{id:'session',revision:1},currency:{unit:'crédit'},enabled:true,items:[item],prices:[price],events:[event],targets:[{id:'installation',title:'CIBLE_PRIVEE'}],board:[],history:[]};
 const html=ui.page(d);assert.match(html,/priceEventEditor|priceEditor/);assert.match(html,/CIBLE_PRIVEE/);assert.doesNotMatch(html,/<img/);
 const form=ui.eventForm(d,event);for(const field of ['title','description','percent','trigger','targetId','enabled','reason'])assert.match(form,new RegExp(`name="${field}"`));assert.match(form,/name="targetId" required/);assert.doesNotMatch(form,/<img/);
 const p=ui.priceForm({...d,items:[]},price);assert.match(p,/value="fuel"/);assert.match(p,/baseUnitPrice/);
 const confirm=ui.confirm('event',{before:null,after:event,reason:evil,commodityName:evil,installationTitle:'CIBLE_PRIVEE',confirmation:'proof'},{sessionId:'session'});assert.match(confirm,/savePriceEvent/);assert.match(confirm,/type="checkbox" required/);assert.match(confirm,/CIBLE_PRIVEE/);assert.doesNotMatch(confirm,/<img/);
});
test('cours UI : choix fixe ou indexé, cours indisponible explicite et aucun achat proposé',()=>{
 const ui=createMarketUi(helpers),form=ui.form('s',{id:'lot',item,quantity:2},{unit:'crédit'});assert.match(form,/data-market-pricing/);assert.match(form,/value="FIXED"/);assert.match(form,/value="INDEXED"/);
 const p={id:'offer',item,seller:{name:'Alice'},quantity:2,amount:null,currency:{unit:'crédit'},pricing:'INDEXED',priceAvailable:false,canBuy:false,status:'ACTIVE',expiresAt:1234,pickupPlace:'Quai',conditions:'Retrait'};const html=ui.detail('s',p);assert.match(html,/Cours indisponible/);assert.doesNotMatch(html,/marketPurchasePrepare|Prix total du lot : 0|<img/);
 const q=commodityQuote({prices:[price],items:[item],events:[event]},item),board=priceBoardHtml([{item,...q}],{unit:'crédit'});assert.doesNotMatch(board,/installation|targetId|<img/);assert.match(board,/15/);
});
test('cours : calcul entier exact, dépassement fermé et anciennes annonces fixes compatibles',()=>{
 const book={prices:[{...price,baseUnitPrice:Number.MAX_SAFE_INTEGER}],items:[item],events:[{...event,percent:0}]};assert.equal(commodityQuote(book,item).unitPrice,Number.MAX_SAFE_INTEGER);
 assert.equal(indexedListing({item,quantity:2,status:'ACTIVE',pricing:'INDEXED'},book).priceAvailable,false);book.events[0].percent=1;assert.equal(commodityQuote(book,item),null);
 assert.equal(indexedListing({amount:20,status:'ACTIVE'},null).amount,20);book.prices[0].baseUnitPrice=1;book.events[0].percent=-100;assert.equal(commodityQuote(book,item).unitPrice,1);
});
test('cours UI : branchements de régie et bascule des champs requis',async()=>{
 const app=await readFile(new URL('../web/app.mjs',import.meta.url),'utf8'),inventory=await readFile(new URL('../web/inventory.mjs',import.meta.url),'utf8');
 assert.match(app,/prices-admin.*priceAdminPage/);assert.match(app,/amount\.required=!indexed/);assert.match(app,/field\.required=linked/);assert.match(inventory,/Cours et événements/);
});
test('événements : bornes du transport et effets incompatibles fermés',()=>{
 const r={id:'route',fuelCost:3,durationSeconds:61},e={id:'e',targetKind:'ROUTE',routeId:'route',active:true,revision:1,fuelPercent:50,durationPercent:50};
 let q=routeQuote({events:[e]},r);assert.equal(q.fuelCost,5);assert.equal(q.durationSeconds,92);
 q=routeQuote({events:[{...e,fuelPercent:-100,durationPercent:-100}]},r);assert.equal(q.fuelCost,0);assert.equal(q.durationSeconds,1);
 q=routeQuote({events:[e]},{...r,fuelCost:Number.MAX_SAFE_INTEGER});assert.equal(q.available,false);assert.equal(q.fuelCost,null);
 assert.throws(()=>priceEventInput({...event,targetKind:'ROUTE',routeId:'route'},'e'),{code:'INVALID_PRICE_EVENT'});
});
test('événements UI : cible distincte, effets visibles et sources de sabotage privées',()=>{
 const ui=createPriceUi(helpers),e={...event,targetKind:'ROUTE',itemId:null,routeId:'r',fuelPercent:25,durationPercent:50,departureBlocked:true},d={session:{id:'s',revision:1},items:[item],routes:[{id:'r',name:evil}],targets:[],events:[e]};
 const form=ui.eventForm(d,e);assert.match(form,/data-economic-fields="COMMODITY" hidden disabled/);assert.match(form,/data-economic-fields="ROUTE" >/);for(const name of ['targetKind','routeId','tradeBlocked','departureBlocked','fuelPercent','durationPercent'])assert.ok(form.includes(`name="${name}"`));assert.doesNotMatch(form,/<img/);
});
