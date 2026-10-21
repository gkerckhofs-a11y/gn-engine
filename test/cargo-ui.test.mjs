import test from 'node:test';
import assert from 'node:assert/strict';
import {createCargoUi,cargoDestination} from '../web/cargo.mjs';
import {playerTargetPath,playerRoute,terminalHtml} from '../web/player-spaces.mjs';
import {createInventoryUi} from '../web/inventory.mjs';
const helpers={button:(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`};
const ui=createCargoUi(helpers),evil='<img src=x onerror="bad()">',sid='session';
const p={location:{kind:'HOLD',id:'hold'},name:evil,capacity:10,used:4,incoming:2,canDeposit:true,canWithdraw:true};
const lot={id:'lot',quantity:2,status:'AVAILABLE',item:{name:evil,description:evil,category:'Carburant',unit:evil,unitVolume:2,legality:'LEGAL'}};
test('Cargaison UI : QR reconnus, même origine/session, destination de stockage uniquement',()=>{
 for(const kind of ['cargo','warehouse','hold']){assert.equal(playerTargetPath(`https://gn-engine.web.app/#/${kind}/${sid}/target`,'field','https://gn-engine.web.app',sid),`${kind}/${sid}/target`);assert.equal(playerRoute(kind,sid).space,'terminal');}
 assert.deepEqual(cargoDestination(`https://gn-engine.web.app/#/hold/${sid}/target`,'https://gn-engine.web.app',sid),{kind:'HOLD',id:'target'});
 for(const link of [`https://evil.example/#/hold/${sid}/target`,`https://gn-engine.web.app/#/hold/other/target`,`https://gn-engine.web.app/#/cargo/${sid}/target`,`https://gn-engine.web.app/sub/#/hold/${sid}/target`])assert.throws(()=>cargoDestination(link,'https://gn-engine.web.app',sid));
 assert.match(terminalHtml({session:{id:sid}}),/#\/cargo\/session/);
});
test('Cargaison UI : droits serveur, confirmations de réception et textes échappés',()=>{
 const base={session:{id:sid},lot,source:p,owner:{name:evil},canMove:true,destinations:[p]},t={id:'t',status:'LOADING',lotId:'lot',name:evil,quantity:2,sourceName:evil,destinationName:evil};
 for(const html of [ui.lot(base),ui.hold({session:{id:sid},hold:{...p,description:evil,docked:true},stock:[lot],canRead:true}),ui.transfer({session:{id:sid},transfer:t,canReceive:true,canCancel:true,confirmation:'proof'}),ui.editor({session:{id:sid,revision:1},owners:[{id:'g',type:'GROUP',name:evil}]})])assert.doesNotMatch(html,/<img|onerror="bad/);
 assert.match(ui.lot(base),/data-form="cargoPrepare"/);assert.doesNotMatch(ui.lot({...base,canMove:false}),/data-form="cargoPrepare"/);
 assert.match(ui.transfer({session:{id:sid},transfer:t,canReceive:true}),/name="received" type="checkbox" required/);
 assert.doesNotMatch(ui.transfer({session:{id:sid},transfer:t,canReceive:false,canCancel:false}),/data-form="cargoCommand"/);
 assert.doesNotMatch(ui.hold({session:{id:sid},hold:p,stock:[lot],canRead:false}),/Cargaison et QR/);
});
test('Carburant UI : création explicite, catégorie commerciale et absence de consommation de trajet',()=>{
 const inventory=createInventoryUi(helpers);assert.match(inventory.admin({id:sid,items:[],inventory:[]},'session'),/Préparer du carburant/);
 const html=inventory.page({session:{id:sid},character:{id:'c',name:'Joueur'},lots:[{...lot,item:{...lot.item,kind:'STACKABLE',consumable:true},location:{kind:'CHARACTER',id:'c'}}],canSell:true,canTransfer:true});
 assert.match(html,/Publier au marché/);assert.match(html,/consommation des voyages seront gérés/);assert.match(html,/#\/cargo\/session\/lot/);
});
