import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLogisticsUi} from '../web/logistics.mjs';
import {createInventoryUi} from '../web/inventory.mjs';
import {playerRoute,terminalHtml} from '../web/player-spaces.mjs';
const helpers={button:(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`};
const ui=createLogisticsUi(helpers),evil='<img src=x onerror="bad()">';
const w={id:'warehouse',name:evil,description:evil,capacity:10,rent:5,periodMinutes:60,enabled:true,rented:true,mine:true,remainingMs:300000,revision:2};
const lot={id:'lot',item:{id:'recharge',name:evil,unit:'recharge',description:'',category:'',unitVolume:1,kind:'STACKABLE',consumable:true,laserRecharge:{pelletsPerUnit:500}},quantity:3,status:'AVAILABLE',location:{kind:'CHARACTER',id:'character'}};
const data={session:{id:'session',stage:'EN_JEU',revision:1},currency:{unit:'cr'},warehouse:w,warehouses:[w],used:3,stock:[lot],bag:[lot],canMove:true,canReadStock:true,canDeposit:true,canRent:true,rentChoices:[{type:'CHARACTER',id:'character',name:'Personnel'}],accounts:[],events:[]};
test('logistique UI : formulaires, destinations et textes publics échappés',()=>{
  for(const html of [ui.overview(data),ui.detail(data,[{id:'account',name:evil,canSpend:true}]),ui.editor(data,w),ui.admin({...data,warehouses:[{...w,used:3}]}),ui.recharge('session',lot)])assert.doesNotMatch(html,/<img|onerror="bad/);
  const page=ui.detail(data,[{id:'account',name:'Compte joueur',canSpend:true},{id:'readonly',name:'Lecture seule',canSpend:false}]);assert.match(page,/data-form="warehouseRent"/);assert.match(page,/data-direction="DEPOSIT"/);assert.match(page,/data-direction="WITHDRAW"/);assert.doesNotMatch(page,/Lecture seule/);assert.match(page,/bail personnel garde les objets à votre nom/);
  const expired=ui.detail({...data,canDeposit:false,canRent:false,warehouse:{...w,expired:true}});assert.doesNotMatch(expired,/data-direction="DEPOSIT"/);assert.match(expired,/data-direction="WITHDRAW"/);
  const paused=ui.detail({...data,canMove:false,canDeposit:false,canRent:false});assert.doesNotMatch(paused,/data-form="warehouseMove"|data-form="warehouseRent"|warehouseRelease/);
});
test('logistique UI : titulaire distinct du payeur, droits limités et transfert explicite',()=>{
 const d={...data,warehouse:{...w,group:{id:'group',name:evil},tenantType:'GROUP'},rentChoices:[{type:'GROUP',id:'group',name:evil}],canReadStock:false,stock:[],canMove:false,canDeposit:true,canRelease:false};
 const html=ui.detail(d,[]);assert.match(html,/name="tenant"/);assert.match(html,/value="GROUP:group"/);assert.match(html,/droit de consulter/);assert.match(html,/data-direction="DEPOSIT"/);assert.doesNotMatch(html,/data-direction="WITHDRAW"|warehouseRelease|<img/);
 const confirm=ui.confirm('move',{direction:'DEPOSIT',name:'Objet',quantity:1,warehouseName:'Hangar',used:0,afterVolume:1,capacity:10,ownershipTransfer:{from:'Personnage',to:evil}},{});assert.match(confirm,/Transfert de propriété/);assert.doesNotMatch(confirm,/<img/);
});
test('logistique UI : confirmation de la consommation et du paiement avec preuve serveur',()=>{
  const p={sessionId:'session',lotId:'lot',quantity:2},html=ui.confirm('recharge',{name:evil,quantity:2,pellets:1000,remaining:1,confirmation:'proof'},p);
  assert.match(html,/name="opened" required/);assert.match(html,/data-command="openLaserRecharge"/);assert.match(html,/1000 billes/);assert.match(html,/ne compte pas les tirs/);assert.doesNotMatch(html,/<img/);
  const rent=ui.confirm('rent',{warehouse:w,amount:5,currency:{unit:'cr'},source:{name:'Caisse'},periodMinutes:60,renewal:true,confirmation:'proof'},{});assert.match(rent,/Aucun débit automatique/);assert.match(rent,/Payer et confirmer/);
});
test('logistique UI : parcours Terminal, sac et organisation raccordés sans actions dans la prévisualisation',()=>{
  assert.equal(playerRoute('warehouse','session','warehouse').space,'terminal');assert.equal(playerRoute('warehouses','session').space,'terminal');assert.equal(playerRoute('warehouses-admin','session'),null);
  assert.match(terminalHtml({session:{id:'session'}}),/#\/warehouses\/session/);
  const inventory=createInventoryUi(helpers),d={session:{id:'session'},character:{id:'character',name:'Joueur'},lots:[lot],stored:[{...lot,id:'stored',location:{kind:'WAREHOUSE',id:'warehouse'}}],canTransfer:true};
  assert.match(inventory.page(d),/data-action="laserRecharge"/);assert.match(inventory.page(d),/#\/warehouse\/session\/warehouse/);assert.doesNotMatch(inventory.page({...d,preview:true}),/<button|<a /);
  const app=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');for(const form of ['warehouseEditor','warehouseRent','warehouseMove','laserRecharge','logisticsCommand'])assert.ok(app.includes(`kind==='${form}'`));
});
