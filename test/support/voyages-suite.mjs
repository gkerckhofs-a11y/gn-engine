import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {logisticsFixture} from './logistics-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {voyageCommands} from '../../src/core/voyages.mjs';

export function voyagesSuite(makeStore,prefix='Navigation'){
 async function fixture(campaign=false){
  const f=await logisticsFixture(makeStore,campaign),admin=()=>f.logRead('cargoAdmin',{},f.owner);
  const fuelItem=await f.item({name:'Carburant test',consumable:true,unitVolume:1}),fuelLot=(await f.grant(fuelItem,12)).id;
  await f.logCmd('saveTransportRules',{homePort:'local',revision:(await f.session()).revision,reason:'Test'},f.owner);
  const ship=async(patch={},shipId)=>{const d=await admin(),old=d.ships.find(x=>x.id===shipId);return f.logCmd('saveShip',{name:'Vaisseau test',ownerType:'CHARACTER',ownerId:f.characters[0],capacity:20,docked:true,enabled:true,navigation:{fuelItemId:fuelItem,tankCapacity:10,initialFuel:0,initialPort:'local'},...old,...patch,shipId,shipRevision:old?.revision,revision:d.session.revision,reason:'Test'},f.owner);};
  const hid=(await ship()).id;
  const route=async(patch={},routeId)=>{const d=await admin(),old=d.routes.find(x=>x.id===routeId);return f.logCmd('saveRoute',{name:'Aller test',fromPort:'local',toPort:'distant',durationSeconds:60,fuelCost:3,enabled:true,...old,...patch,routeId,routeRevision:old?.revision,revision:d.session.revision,reason:'Test'},f.owner);};
  const rid=(await route()).id,back=(await route({name:'Retour test',fromPort:'distant',toPort:'local'})).id;
  const nav=(who=f.alice)=>f.logRead('shipNavigation',{shipId:hid},who),refuelInput=(quantity=6,lotId=fuelLot)=>({shipId:hid,lotId,quantity});
  const refuel=async(quantity=6,lotId=fuelLot,who=f.alice)=>f.logCmd('refuelShip',await f.prepared('prepareRefuel',refuelInput(quantity,lotId),who),who);
  const depart=async(routeId=rid,who=f.alice)=>f.logCmd('departShip',await f.prepared('prepareVoyage',{shipId:hid,routeId},who),who);
  const arrive=async()=>f.logCmd('arriveShip',{shipId:hid,confirmation:(await nav()).confirmation});
  const load=async(lotId=f.lotId)=>{const p={lotId,quantity:1,destination:{kind:'HOLD',id:hid}},r=await f.logCmd('startCargoTransfer',await f.prepared('prepareCargoTransfer',p));return r;};
  const receive=async id=>f.logCmd('receiveCargoTransfer',{transferId:id,received:true,confirmation:(await f.logRead('cargoTransfer',{transferId:id})).confirmation});
  return {...f,get sid(){return f.sid;},admin,ship,route,hid,rid,back,fuelItem,fuelLot,nav,refuelInput,refuel,depart,arrive,load,receive};
 }
 test(`${prefix} : événements de route, devis périmé, cumul, blocus et voyage figé`,async()=>{
  const f=await fixture();await f.refuel(10);
  const event=async(patch={})=>{const d=await f.logRead('priceAdmin',{},f.owner),old=d.events.find(e=>e.id===patch.eventId),p={targetKind:'ROUTE',routeId:f.rid,title:'Détour test',description:'Information publique',fuelPercent:50,durationPercent:25,trigger:'MANUAL',enabled:true,...old,...patch,recordRevision:old?.revision??0,revision:d.session.revision,reason:'ORIGINE_MJ'};return f.logCmd('savePriceEvent',await f.prepared('preparePriceEvent',p,f.owner),f.owner);};
  const ready=await f.prepared('prepareVoyage',{shipId:f.hid,routeId:f.rid}),e=await event();
  let r=(await f.nav()).routes.find(r=>r.id===f.rid);assert.equal(r.fuelCost,5);assert.equal(r.durationSeconds,75);assert.equal(r.baseFuelCost,3);
  assert.equal(JSON.stringify(await f.nav()).includes('ORIGINE_MJ'),false);
  await assert.rejects(f.logCmd('departShip',ready),{code:'STALE_REVISION'});assert.equal((await f.nav()).ship.fuel,10);
  const e2=await event({fuelPercent:-25,durationPercent:25});r=(await f.nav()).routes.find(r=>r.id===f.rid);assert.equal(r.fuelCost,4);assert.equal(r.durationSeconds,90);
  await event({eventId:e2.id,departureBlocked:true});assert.equal((await f.nav()).routes[0].affordable,false);await assert.rejects(f.depart(),{code:'DEPARTURE_SUSPENDED'});
  await event({eventId:e2.id,enabled:false});const q={...await f.prepared('prepareVoyage',{shipId:f.hid,routeId:f.rid}),requestId:randomUUID()};
  const result=await f.logCmd('departShip',q);assert.deepEqual(await f.logCmd('departShip',q),result);assert.equal((await f.nav()).ship.fuel,5);
  await event({eventId:e.id,departureBlocked:true,fuelPercent:1000,durationPercent:1000});let j=(await f.nav()).ship.journey;assert.equal(j.durationSeconds,75);assert.equal(j.fuelCost,5);assert.equal(j.effects[0].fuelPercent,50);
  f.advance(75000);await f.arrive();await f.depart(f.back);assert.equal((await f.nav()).ship.fuel,2);
 });
 test(`${prefix} : carburant acheté, remise reçue puis plein et départ`,async()=>{
  const f=await fixture(),lotId=(await f.grant(f.fuelItem,6,f.characters[1])).id;
  const input={lotId,quantity:6,buyerId:f.characters[0],amount:9,minutes:10,conditions:'Remise au comptoir',pickupPlace:'Quai'},sale=await f.logCmd('proposeLotSale',await f.prepared('prepareLotSale',input,f.bob),f.bob);
  const buy={saleId:sale.id,fromAccountId:accountId(f.characters[0])},sold=await f.logCmd('buyLot',await f.prepared('prepareLotPurchase',buy));
  await assert.rejects(f.refuel(6,sold.purchasedLotId),{code:'INVALID_FUEL'});
  let detail=await f.logRead('lotSaleDetail',{saleId:sale.id},f.bob);await f.logCmd('offerSalePickup',{saleId:sale.id,confirmation:detail.pickupConfirmation},f.bob);detail=await f.logRead('lotSaleDetail',{saleId:sale.id});await f.logCmd('confirmSalePickup',{saleId:sale.id,confirmation:detail.pickupConfirmation,received:true});
  await f.refuel(6,sold.purchasedLotId);assert.equal((await f.storedLot(sold.purchasedLotId)).status,'CONSUMED');await f.depart();assert.equal((await f.nav()).ship.fuel,3);assert.equal((await f.wallet()).account.balance,91);
 });
 test(`${prefix} : plein réel, aperçu sans effet, idempotence et limites`,async()=>{
  const f=await fixture(),p=await f.prepared('prepareRefuel',f.refuelInput());assert.equal((await f.nav()).ship.fuel,0);
  const input={...p,requestId:randomUUID()},r=await f.logCmd('refuelShip',input);assert.deepEqual(await f.logCmd('refuelShip',input),r);assert.equal(r.fuel,6);assert.equal((await f.storedLot(f.fuelLot)).quantity,6);
  await assert.rejects(f.refuel(5),{code:'TANK_FULL'});await assert.rejects(f.refuel(1,f.rechargeLotId),{code:'INVALID_FUEL'});await assert.rejects(f.refuel(0));
  const other=(await f.grant(f.fuelItem,1,f.characters[1])).id;await assert.rejects(f.refuel(1,other),{code:'INVALID_FUEL'});
  await f.refuel(4);assert.equal((await f.nav()).ship.fuel,10);assert.equal((await f.storedLot(f.fuelLot)).quantity,2);
 });
 test(`${prefix} : changement de propriétaire bloque aussi une ancienne requête mémorisée`,async()=>{
  const f=await fixture(),input={...await f.prepared('prepareRefuel',f.refuelInput()),requestId:randomUUID()};await f.logCmd('refuelShip',input);await f.ship({ownerType:'CHARACTER',ownerId:f.characters[1]},f.hid);
  await assert.rejects(f.logCmd('refuelShip',input),{code:'FORBIDDEN'});await assert.rejects(f.nav(),{code:'FORBIDDEN'});assert.equal((await f.nav(f.bob)).ship.fuel,6);
 });
 test(`${prefix} : plein puis aller-retour, horloge suspendue, cargaison intacte et débarquement local`,async()=>{
  const f=await fixture(),load=await f.load();await f.receive(load.id);const before=await f.storedLot(load.lotId);await f.refuel();await f.depart();
  assert.equal((await f.nav()).ship.fuel,3);assert.equal((await f.logRead('shipHold',{shipId:f.hid})).hold.canWithdraw,false);
  await assert.rejects(f.arrive(),{code:'VOYAGE_NOT_READY'});await assert.rejects(f.refuel(1),{code:'SHIP_NOT_LOCAL'});await assert.rejects(f.depart(),{code:'SHIP_UNAVAILABLE'});
  f.advance(30000);await f.stage('PAUSE');f.advance(600000);assert.equal((await f.nav()).ship.journey.remainingSeconds,30);await assert.rejects(f.arrive(),{code:'SESSION_NOT_RUNNING'});
  await f.stage('EN_JEU');f.advance(30000);await f.arrive();assert.equal((await f.nav()).ship.portId,'distant');assert.equal((await f.nav()).ship.local,false);await assert.rejects(f.refuel(1),{code:'SHIP_NOT_LOCAL'});
  const transfer={lotId:load.lotId,quantity:1,destination:{kind:'CHARACTER',id:f.characters[0]}};await assert.rejects(f.logRead('prepareCargoTransfer',transfer),{code:'FORBIDDEN'});
  assert.deepEqual(await f.storedLot(load.lotId),before);await f.depart(f.back);f.advance(60000);await f.arrive();assert.equal((await f.nav()).ship.fuel,0);assert.equal((await f.nav()).ship.local,true);assert.ok((await f.logRead('prepareCargoTransfer',transfer)).confirmation);
 });
 test(`${prefix} : chargements ouverts bloquent le départ et lot réservé exclu du plein`,async()=>{
  const f=await fixture();await f.refuel();const t=await f.load(f.fuelLot);await assert.rejects(f.depart(),{code:'CARGO_TRANSFERS_OPEN'});await assert.rejects(f.refuel(1,t.lotId),{code:'INVALID_FUEL'});
  await f.receive(t.id);await f.refuel(1,t.lotId);assert.equal((await f.storedLot(t.lotId)).status,'CONSUMED');await f.depart();
  await assert.rejects(f.load(),{code:'FORBIDDEN'});await assert.rejects(f.ship({docked:true},f.hid),{code:'VOYAGES_OPEN'});
 });
 test(`${prefix} : confirmations périmées et départ concurrent consommé une seule fois`,async()=>{
  const f=await fixture();await f.refuel();const p=await f.prepared('prepareVoyage',{shipId:f.hid,routeId:f.rid});await f.route({fuelCost:4},f.rid);await assert.rejects(f.logCmd('departShip',p),{code:'STALE_REVISION'});
  const q=await f.prepared('prepareVoyage',{shipId:f.hid,routeId:f.rid}),rs=await Promise.allSettled([f.logCmd('departShip',q),f.logCmd('departShip',q)]);assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.nav()).ship.fuel,2);
  await f.route({fuelCost:1,durationSeconds:1},f.rid);assert.equal((await f.nav()).ship.journey.durationSeconds,60);f.advance(1000);await assert.rejects(f.arrive(),{code:'VOYAGE_NOT_READY'});
 });
 test(`${prefix} : deux pleins concurrents, rupture de transaction et état hors combat`,async()=>{
  const f=await fixture(),p=await f.prepared('prepareRefuel',f.refuelInput(6));const rs=await Promise.allSettled([f.logCmd('refuelShip',p),f.logCmd('refuelShip',p)]);assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.nav()).ship.fuel,6);assert.equal((await f.storedLot(f.fuelLot)).quantity,6);
  const ready=await f.prepared('prepareRefuel',f.refuelInput(1)),original=f.store.runTransaction.bind(f.store);f.store.runTransaction=cb=>original(async tx=>{const r=await cb(tx);throw new Error('ROLLBACK');});await assert.rejects(f.logCmd('refuelShip',ready),/ROLLBACK/);f.store.runTransaction=original;assert.equal((await f.nav()).ship.fuel,6);
  await f.damage();assert.equal((await f.nav()).canAct,false);await assert.rejects(f.depart(),{code:'OUT_OF_COMBAT'});
 });
 test(`${prefix} : pilotage de bande distinct du stock, révocation et arbitrage MJ`,async()=>{
  const f=await fixture(),members=f.characters.slice(0,2).map((characterId,i)=>({characterId,active:true,revealed:true,permissions:i?{readStock:true}:{pilotShip:true}}));
  const gid=(await f.logCmd('saveSessionGroup',{revision:(await f.session()).revision,name:'Bande test',visibility:'SECRET',publicationState:'PUBLISHED',members,reason:'Test'},f.owner)).id;await f.logCmd('setGroupModule',{revision:(await f.session()).revision,enabled:true,reason:'Test'},f.owner);await f.ship({ownerType:'GROUP',ownerId:gid},f.hid);
  assert.equal((await f.nav(f.bob)).canPilot,false);await assert.rejects(f.depart(f.rid,f.bob),{code:'FORBIDDEN'});assert.deepEqual((await f.logRead('shipHold',{shipId:f.hid})).stock,[]);await assert.rejects(f.nav(f.eve),{code:'FORBIDDEN'});
  await f.refuel();const p={...await f.prepared('prepareVoyage',{shipId:f.hid,routeId:f.rid}),requestId:randomUUID()};await f.logCmd('departShip',p);
  const s=await f.session(),g=s.groups.find(x=>x.id===gid);await f.logCmd('saveSessionGroup',{...g,groupId:gid,revision:s.revision,members:members.map(m=>({...m,permissions:{readStock:true}})),reason:'Révocation'},f.owner);await assert.rejects(f.logCmd('departShip',p),{code:'FORBIDDEN'});
  await f.stage('PAUSE');const sh=(await f.admin()).ships.find(x=>x.id===f.hid);await f.logCmd('resolveVoyageAdmin',{shipId:f.hid,shipRevision:sh.revision,outcome:'RETURN',reason:'Arbitrage test'},f.owner);assert.equal((await f.nav()).ship.portId,'local');assert.equal((await f.nav()).ship.fuel,3);
 });
 test(`${prefix} : configuration conserve le carburant, refuse surcapacité et mauvais carburant`,async()=>{
  const f=await fixture();await f.refuel();let sh=(await f.admin()).ships[0];await f.ship({navigation:{...sh.navigation,initialFuel:9,initialPort:'ailleurs'}},f.hid);assert.equal((await f.nav()).ship.fuel,6);assert.equal((await f.nav()).ship.portId,'local');
  await assert.rejects(f.ship({navigation:{...sh.navigation,tankCapacity:5}},f.hid),{code:'TANK_FULL'});await assert.rejects(f.ship({navigation:null},f.hid),{code:'NAVIGATION_LOCKED'});await assert.rejects(f.ship({navigation:{...sh.navigation,fuelItemId:f.recharge}},f.hid),{code:'INVALID_FUEL'});
  const other=await f.item({consumable:true});await assert.rejects(f.ship({navigation:{...sh.navigation,fuelItemId:other}},f.hid),{code:'FUEL_TYPE_LOCKED'});
 });
 test(`${prefix} : campagne bloque un transit puis conserve carburant, position et routes`,async()=>{
  const f=await fixture(true);await f.refuel();await f.depart();const closing=await f.closing();assert.equal(closing.view.canClose,false);assert.ok(closing.view.blocks.some(b=>b.kind==='VOYAGE'));
  const sh=(await f.admin()).ships[0];await f.logCmd('resolveVoyageAdmin',{shipId:f.hid,shipRevision:sh.revision,outcome:'ARRIVE',reason:'Clôture test'},f.owner);await f.close();await f.resume(await f.begin());
  const s=await f.store.get(`sessions/${f.sid}`),next=await f.store.get(`sessions/${f.sid}/ships/${f.hid}`);assert.equal(s.transportRules.homePort,'local');assert.equal(next.fuel,3);assert.equal(next.portId,'distant');assert.equal(next.journey,null);assert.equal((await f.store.list(`sessions/${f.sid}/routes`)).length,2);
 });
 test(`${prefix} : accès privé, rôle falsifié, archivage et trajet impossible`,async()=>{
  const f=await fixture();for(const action of voyageCommands)await assert.rejects(f.logRead(action,{shipId:f.hid},null),{code:'LOGIN_REQUIRED'});
  await assert.rejects(f.logCmd('saveRoute',{revision:(await f.session()).revision,role:'OWNER'}),{code:'FORBIDDEN'});await assert.rejects(f.depart(),{code:'INSUFFICIENT_FUEL'});
  await f.refuel();await assert.rejects(f.depart(f.back),{code:'ROUTE_UNAVAILABLE'});await f.depart();await f.stage('FINISHED');await assert.rejects(f.stage('ARCHIVED'),{code:'VOYAGES_OPEN'});
 });
}
