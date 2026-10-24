import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralUi} from '../web/central-master.mjs';
import {centralShopPayload,centralOfferPayload} from '../web/central-shops.mjs';
import {centralWorkshops} from '../src/shared/central-workshops.mjs';
const ui=createCentralUi({button:(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
const shop={type:'shop',entityId:'same',operation:'UPSERT',data:{name:'<b>Comptoir</b>',description:'<img src=x>',sellerCharacterId:'seller',locationTargetId:'counter',gmNotes:'Préparation privée',revision:3}};
const offer={type:'offer',entityId:'same',operation:'UPSERT',data:{name:'Offre',shopId:'same',itemId:'item',unitPrice:17,buybackPrice:null,conditions:'<b>Condition</b>',gmNotes:'Note réservée',revision:2}};
const d={campaign:{id:'campaign',title:'Préparation'},draft:{revision:6},rights:{readWorkshops:['M5'],editWorkshops:[],manageStaff:false},workshop:'M5',workshops:centralWorkshops.map(w=>({...w,canRead:w.id==='M5',canEdit:false})),changes:[shop,offer],history:[],staff:[],references:{shops:[{id:'same',name:'<b>Comptoir</b>',revision:3,source:'WEB'}],itemsReadable:false,charactersReadable:false,items:[],characters:[]},diagnostics:[{entityType:'shop',entityId:'same',field:'sellerCharacterId',reference:'<img>',message:'Lecture M2 requise'}]};
test('M5 central UI : lecture échappée, actions restreintes et export autorisé',()=>{
 const h=ui.page(d);assert.match(h,/&lt;b&gt;Comptoir/);assert.match(h,/&lt;img src=x&gt;/);assert.match(h,/&lt;img&gt;/);assert.match(h,/Lecture M1 non accordée/);assert.match(h,/Lecture M2 non accordée/);assert.match(h,/Excel M5 prépare les boutiques et leurs offres avec aperçu/);
 assert.doesNotMatch(h,/<img|<b>|data-action="central(?:Shop|Offer|Import)/);assert.match(ui.staffForm(d),/name="edit_M5"/);assert.doesNotMatch(h,/data-action="publish/);
});
test('M5 central UI : formulaires typés, motif, révisions et aucune ressource',()=>{
 const h=ui.shopForm(d,'same',shop),o=ui.offerForm(d,'same',offer);assert.match(h,/data-form="centralShop"/);assert.match(o,/data-form="centralOffer"/);
 for(const form of [h,o]){assert.match(form,/data-id="same"/);assert.match(form,/data-draft="6"/);assert.match(form,/name="reason"[^>]+required/);assert.doesNotMatch(form,/name="(publicationState|published|stock|quantity|accountId|sellerUid|role|publicCode)"/);}
 assert.match(h,/data-revision="3"/);assert.match(o,/data-revision="2"/);assert.match(h,/value="seller"/);assert.match(o,/value="item"/);assert.match(ui.offerForm(d,'new'),/data-revision="0"/);assert.match(ui.offerForm(d,'new'),/name="unitPrice"[^>]*value=""/);assert.match(ui.offerForm(d,'new'),/Aucun tarif n’est imposé/);
});
test('M5 central UI : suggestions minimales avec provenance et état des références',()=>{
 const data={...d,references:{...d.references,itemsReadable:true,charactersReadable:true,items:[{id:'item',name:'<i>Objet</i>',revision:4,source:'XLSX',archived:true}],characters:[{id:'seller',name:'<i>Vendeur</i>',revision:2,source:'WEB',archived:false}]}},o=ui.offerForm(data,'same',offer),s=ui.shopForm(data,'same',shop);
 assert.match(o,/&lt;i&gt;Objet/);assert.match(o,/archivé · r4 · XLSX/);assert.match(s,/&lt;i&gt;Vendeur/);assert.match(s,/brouillon · r2 · WEB/);assert.match(o,/list="central-offer-items"/);assert.match(s,/list="central-shop-characters"/);assert.doesNotMatch(o,/<i>/);assert.doesNotMatch(s,/<i>/);
});
test('M5 central UI : prix vides nuls et charges utiles sans privilèges',()=>{
 const s=centralShopPayload({name:'Nom',description:'Texte',sellerCharacterId:' seller ',locationTargetId:' ',gmNotes:'Note',stock:10}),o=centralOfferPayload({name:'Offre',shopId:' same ',itemId:' item ',unitPrice:'',buybackPrice:'',conditions:'',gmNotes:'',canSell:true});
 assert.equal(s.sellerCharacterId,'seller');assert.equal(s.locationTargetId,null);assert.equal(s.stock,undefined);assert.equal(o.shopId,'same');assert.equal(o.itemId,'item');assert.equal(o.unitPrice,null);assert.equal(o.buybackPrice,null);assert.equal(o.canSell,undefined);
 assert.equal(centralOfferPayload({...o,unitPrice:'0',buybackPrice:'4'}).unitPrice,0);assert.equal(centralOfferPayload({...o,unitPrice:'17',buybackPrice:'4'}).buybackPrice,4);
});
test('M5 central UI : archives distinctes pour des identifiants homonymes',()=>{
 const edit={...d,rights:{...d.rights,editWorkshops:['M5']}};const h=ui.page(edit);assert.match(h,/data-action="centralShopArchive"/);assert.match(h,/data-action="centralOfferArchive"/);
 const archived=ui.page({...edit,changes:d.changes.map(c=>({...c,operation:'ARCHIVE'}))});assert.doesNotMatch(archived,/data-action="central(?:Shop|Offer)Archive"/);assert.match(archived,/Restaurer \/ modifier/);
 assert.match(ui.shopArchiveForm(d,shop),/data-form="centralShopArchive"/);assert.match(ui.shopArchiveForm(d,offer),/data-form="centralOfferArchive"/);assert.match(ui.shopArchiveForm(d,shop),/data-revision="3"/);assert.match(ui.shopArchiveForm(d,offer),/data-revision="2"/);
});
