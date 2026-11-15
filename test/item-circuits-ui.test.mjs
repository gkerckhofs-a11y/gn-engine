import test from 'node:test';
import assert from 'node:assert/strict';
import {shopsHtml,soInventoryHtml} from '../web/shops.mjs';
import {createMarketUi} from '../web/market.mjs';
import {itemInput,publicItem} from '../src/core/inventory-state.mjs';
const item={id:'i',name:'Voucher <script>',description:'Unités réelles',unit:'unité',kind:'STACKABLE',consumable:true,usage:'FUEL'};
const offer=(usage,name)=>({id:usage,name,item:{...item,usage,name},unitPrice:25,stock:5,canBuy:true,conditions:''});
test('Circuits UI : boutiques et centrale filtrent leurs offres, sans dépendre des noms',()=>{
 const d={session:{id:'s'},shops:[{id:'counter',name:'Comptoir',description:'',location:'Port',offers:[offer('FUEL','Voucher'),offer('COMMERCIAL','Bacta commercial'),offer('PERSONAL','Outil')]}],orders:[]},personal=shopsHtml(d),commercial=shopsHtml({...d,circuit:'COMMERCIAL'});
 assert.match(personal,/Voucher|Outil/);assert.doesNotMatch(personal,/Bacta commercial/);assert.match(commercial,/Bacta commercial/);assert.doesNotMatch(commercial,/name="quantity"[^>]*>.*Voucher/);assert.doesNotMatch(commercial,/>Outil</);
});
test('Circuits UI : sac propose seulement les droits calculés et les actions métier existantes',()=>{
 const d={session:{id:'s'},lots:[{id:'allowed',item,quantity:5,status:'AVAILABLE',canSellPersonal:true,canTransferByHand:true},{id:'protected',item:{...item,name:'Protégé'},quantity:1,status:'AVAILABLE',transferable:false,resellable:false}],fuelTargets:{allowed:[{shipId:'ship',name:'Cargo',maximum:5}]},sales:[],transfers:[]},html=soInventoryHtml(d,null);
 assert.match(html,/Revendre à un joueur/);assert.match(html,/data-action="saleForm" data-sid="s" data-lot="allowed"/);assert.doesNotMatch(html,/data-action="saleForm" data-sid="s" data-lot="protected"/);assert.match(html,/Historique/);assert.match(html,/data-action="useFuel"/);assert.doesNotMatch(html,/#\/cargo\/|<script>/);
});
test('Circuits UI : stock commercial accessible au chargement et aux annonces',()=>{
 const ui=createMarketUi({button:(label,action)=>`<button data-action="${action}">${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`}),d={session:{id:'s',itemCircuits:true},stock:[{id:'freight',item:{...item,usage:'COMMERCIAL',name:'Fret'},quantity:2,status:'AVAILABLE'}],listings:[],prices:[],restrictions:[],economyEnabled:true,currency:{unit:'Cr'}};
 const html=ui.page(d);assert.match(html,/Centrale commerciale|Mon stock commercial/);assert.match(html,/#\/cargo\/s\/freight/);assert.match(html,/data-action="marketForm"/);
});
test('Circuits modèles : données explicites, anciennes définitions inchangées et carburant valide',()=>{
 const base={name:'Carburant marchand',description:'',category:'Carburant',unit:'unité',kind:'STACKABLE',consumable:true,unitVolume:1,publicationState:'DRAFT'};
 const legacy=itemInput(base,'old');assert.equal(Object.hasOwn(publicItem(legacy),'usage'),false);
 for(const usage of ['PERSONAL','COMMERCIAL','FUEL'])assert.equal(publicItem(itemInput({...base,usage,transferable:false,resellable:false},'new')).usage,usage);
 assert.throws(()=>itemInput({...base,usage:'fuel'},'bad'),{code:'INVALID_ITEM_USAGE'});assert.throws(()=>itemInput({...base,usage:'FUEL',consumable:false},'bad'),{code:'INVALID_FUEL'});assert.throws(()=>itemInput({...base,usage:'FUEL',kind:'INDIVIDUAL'},'bad'),{code:'INVALID_FUEL'});
});
test('Circuits UI : les parcours de carburant proviennent des aperçus serveur, sans commande',async()=>{
 const {fuelUseOptions}=await import('../web/item-circuits.mjs'),calls=[],api=async(action,input)=>{calls.push({action,input});if(action==='mySpaceport')return {ships:[{shipId:'allowed',docked:true,fuel:0,tankCapacity:5},{shipId:'denied',docked:true,fuel:0,tankCapacity:5}]};if(input.shipId==='denied')throw Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'});return {shipName:'Cargo',capacity:5,before:2};};
 assert.deepEqual(await fuelUseOptions(api,'s',[{id:'voucher',item,quantity:4,status:'AVAILABLE'}]),{voucher:[{shipId:'allowed',name:'Cargo',maximum:3}]});assert.ok(calls.every(c=>['mySpaceport','prepareRefuel'].includes(c.action)));assert.deepEqual(await fuelUseOptions(api,'s',[{id:'used',item,quantity:0,status:'CONSUMED'}]),{});
});
test('Circuits Master : article non classé et tarif voucher incorrect bloquent la publication',async()=>{
 const {shopBlockers}=await import('../src/core/space-outlaws-shop-state.mjs'),change=(type,id,data)=>({id:`${type}_${id}`,type,entityId:id,operation:'UPSERT',data}),rows=[change('item','classified',{...item,id:'classified'}),change('item','legacy',{id:'legacy',consumable:true}),change('offer','old-offer',{itemId:'legacy',buybackPrice:null}),change('offer','fuel-offer',{itemId:'classified',unitPrice:24,buybackPrice:null})],d=shopBlockers(rows);assert.ok(d.some(v=>v.entityId==='old-offer'&&/Classer/.test(v.message)));assert.ok(d.some(v=>v.entityId==='fuel-offer'&&v.detailField==='unitPrice'&&/25 Cr/.test(v.message)));
});
test('Circuits versionnés : un modèle archivé ne peut pas activer de nouveaux droits',async()=>{
 const {writeSoReleaseVersion}=await import('../src/core/space-outlaws-entry.mjs'),saved=new Map(),tx={set:(p,v)=>saved.set(p,v)},entry=operation=>({path:'changes/item_old',data:{id:'item_old',type:'item',entityId:'old',operation,data:{...item}}});
 for(const operation of ['ARCHIVE','UPSERT']){saved.clear();const entries=[entry(operation)],id=writeSoReleaseVersion(tx,{campaignId:'campaign',confirmation:'release',entries,pages:[entries]});assert.equal(saved.get(`campaigns/campaign/versions/${id}`).itemCircuitsVersion,operation==='UPSERT'?1:undefined);}
});
