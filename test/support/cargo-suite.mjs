import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {logisticsFixture} from './logistics-suite.mjs';
import {cargoCommands} from '../../src/core/cargo.mjs';
import {accountId} from '../../src/core/economy-state.mjs';

export function cargoSuite(makeStore,prefix='Cargaisons'){
 async function fixture(campaign=false){
  const f=await logisticsFixture(makeStore,campaign);
  const admin=()=>f.logRead('cargoAdmin',{},f.owner);
  const ship=async(patch={},shipId)=>{const d=await admin(),old=d.ships.find(x=>x.id===shipId);return f.logCmd('saveShip',{name:'Soute test',description:'Fret',ownerType:'CHARACTER',ownerId:f.characters[0],capacity:8,docked:true,enabled:true,...old,...patch,shipId,shipRevision:old?.revision,revision:d.session.revision,reason:'Configuration test'},f.owner);};
  const hid=(await ship()).id,hold=()=>f.logRead('shipHold',{shipId:hid});
  const input=(quantity=1,lotId=f.lotId,destination={kind:'HOLD',id:hid})=>({lotId,quantity,destination});
  const start=async(p=input(),who=f.alice)=>f.logCmd('startCargoTransfer',await f.prepared('prepareCargoTransfer',p,who),who);
  const transfer=(id,who=f.alice)=>f.logRead('cargoTransfer',{transferId:id},who);
  const finish=async(id,receive=true,who=f.alice)=>{const d=await transfer(id,who);return f.logCmd(receive?'receiveCargoTransfer':'cancelCargoTransfer',{transferId:id,confirmation:d.confirmation,...(receive?{received:true}:{})},who);};
  return {...f,get sid(){return f.sid;},cargoAdmin:admin,ship,hid,hold,cargoInput:input,start,transfer,finish};
 }
 test(`${prefix} : QR privé, réservation partielle, réception et conservation de propriété`,async()=>{
  const f=await fixture(),p=await f.logRead('cargoLot',{lotId:f.lotId});assert.equal(p.canMove,true);assert.equal(p.destinations[0].location.id,f.hid);
  await assert.rejects(f.logRead('cargoLot',{lotId:f.lotId},f.bob),{code:'FORBIDDEN'});
  const r=await f.start(f.cargoInput(2));assert.notEqual(r.lotId,f.lotId);assert.equal((await f.storedLot(f.lotId)).quantity,1);
  let lot=await f.storedLot(r.lotId);assert.equal(lot.status,'CARGO_RESERVED');assert.equal(lot.location.kind,'CHARACTER');assert.equal(lot.origin.parentLotId,f.lotId);
  assert.equal((await f.hold()).hold.incoming,4);assert.equal((await f.hold()).hold.used,0);
  await f.finish(r.id);lot=await f.storedLot(r.lotId);assert.equal(lot.status,'AVAILABLE');assert.equal(lot.location.kind,'HOLD');assert.equal(lot.ownerId,f.characters[0]);assert.equal(lot.holderId,f.characters[0]);
  assert.equal((await f.hold()).hold.used,4);assert.equal((await f.hold()).hold.incoming,0);assert.equal((await f.logRead('myInventory')).stored[0].id,r.lotId);
  const q=await f.start(f.cargoInput(2,r.lotId,{kind:'CHARACTER',id:f.characters[0]}));assert.equal(q.lotId,r.lotId);assert.deepEqual((await f.logRead('myCargo',{},f.bob)).transfers,[]);await f.finish(q.id);assert.equal((await f.storedLot(q.lotId)).location.kind,'CHARACTER');
  assert.equal((await f.store.list(`${f.base}/inventory`)).filter(l=>l.item.id===f.cargo).reduce((n,l)=>n+l.quantity,0),3);
 });
 test(`${prefix} : entrepôt vers soute d’une bande, réception par un autre membre, aucun don implicite`,async()=>{
  const f=await fixture(),members=f.characters.slice(0,2).map(characterId=>({characterId,active:true,revealed:true,permissions:{readStock:true,depositStock:true,withdrawStock:true,manageStorage:true}}));
  const {id:gid}=await f.logCmd('saveSessionGroup',{revision:(await f.session()).revision,name:'BANDE_SECRETE',visibility:'SECRET',publicationState:'PUBLISHED',members,reason:'Test'},f.owner);
  await f.logCmd('setGroupModule',{revision:(await f.session()).revision,enabled:true,reason:'Test'},f.owner);await f.ship({ownerType:'GROUP',ownerId:gid},f.hid);
  await f.rent(f.alice,f.wid,{tenantType:'GROUP',groupId:gid});await f.move(3);
  assert.equal((await f.logRead('myCargo',{},f.eve)).holds.length,0);await assert.rejects(f.logRead('shipHold',{shipId:f.hid},f.eve),{code:'FORBIDDEN'});
  const r=await f.start(f.cargoInput(2));await f.finish(r.id,true,f.bob);const l=await f.storedLot(r.lotId);assert.equal(l.ownerType,'GROUP');assert.equal(l.ownerId,gid);assert.equal(l.holderId,null);assert.equal((await f.detail(f.wid)).used,2);
  await assert.rejects(f.start(f.cargoInput(1,r.lotId,{kind:'CHARACTER',id:f.characters[1]}),f.bob),{code:'CARGO_OWNER_MISMATCH'});
  await assert.rejects(f.start(f.cargoInput(1,f.rechargeLotId)),{code:'CARGO_OWNER_MISMATCH'});
 });
 test(`${prefix} : réservations concurrentes de capacité et annulation sans perte`,async()=>{
  const f=await fixture();await f.ship({capacity:2},f.hid);const extra=(await f.grant(f.cargo,1)).id;
  const a=await f.prepared('prepareCargoTransfer',f.cargoInput()),b=await f.prepared('prepareCargoTransfer',f.cargoInput(1,extra));
  const rs=await Promise.allSettled([f.logCmd('startCargoTransfer',a),f.logCmd('startCargoTransfer',b)]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);
  const r=rs.find(r=>r.status==='fulfilled').value;assert.equal((await f.hold()).hold.incoming,2);
  await assert.rejects(f.ship({capacity:1},f.hid),{code:'WAREHOUSE_FULL'});await assert.rejects(f.ship({docked:false},f.hid),{code:'CARGO_TRANSFERS_OPEN'});
  await f.finish(r.id,false);assert.equal((await f.hold()).hold.incoming,0);assert.equal((await f.storedLot(r.lotId)).status,'AVAILABLE');assert.equal((await f.storedLot(r.lotId)).location.kind,'CHARACTER');
 });
 test(`${prefix} : réservation d’arrivée respectée par les anciens dépôts et corrections MJ`,async()=>{
  const f=await fixture();await f.rent();await f.configure({capacity:2},f.wid);const r=await f.start(f.cargoInput(1,f.lotId,{kind:'WAREHOUSE',id:f.wid}));
  await assert.rejects(f.move(),{code:'WAREHOUSE_FULL'});await assert.rejects(f.configure({capacity:1},f.wid),{code:'WAREHOUSE_FULL'});await assert.rejects(f.logRead('prepareWarehouseRelease',{warehouseId:f.wid}),{code:'WAREHOUSE_NOT_EMPTY'});
  await f.finish(r.id);await f.configure({capacity:4},f.wid);const q=await f.start(f.cargoInput(1,f.lotId,{kind:'WAREHOUSE',id:f.wid})),l=await f.storedLot(r.lotId);
  await assert.rejects(f.logCmd('correctLot',{revision:(await f.session()).revision,lotId:l.id,lotRevision:l.revision,quantity:2,status:'AVAILABLE',reason:'Test'},f.owner),{code:'WAREHOUSE_FULL'});
  await f.finish(q.id,false);
 });
 test(`${prefix} : quantité sans volume, destination nulle, propriétaire tiers et vaisseau absent`,async()=>{
  const f=await fixture();const other=(await f.ship({ownerId:f.characters[1]})).id;
  await assert.rejects(f.start(f.cargoInput(1,f.lotId,{kind:'HOLD',id:other})),{code:'FORBIDDEN'});
  await assert.rejects(f.start({...f.cargoInput(),destination:null}),{code:'INVALID_DESTINATION'});
  await assert.rejects(f.start(f.cargoInput(1,f.lotId,{kind:'CHARACTER',id:f.characters[0]})),{code:'INVALID_DESTINATION'});
  await f.ship({docked:false},f.hid);await assert.rejects(f.start(),{code:'FORBIDDEN'});await f.ship({docked:true},f.hid);
  const id=(await f.grant(await f.item({unitVolume:null}),1)).id;await assert.rejects(f.start(f.cargoInput(1,id)),{code:'VOLUME_REQUIRED'});
  for(const quantity of [0,-1,1.5,4])await assert.rejects(f.start(f.cargoInput(quantity)));
 });
 test(`${prefix} : chargement bloque vente, remise et correction ; preuve de réception obligatoire`,async()=>{
  const f=await fixture(),r=await f.start(f.cargoInput(3)),d=await f.transfer(r.id),l=await f.storedLot(r.lotId);
  await assert.rejects(f.logCmd('receiveCargoTransfer',{transferId:r.id,confirmation:d.confirmation}),{code:'CARGO_RECEIPT_REQUIRED'});
  await assert.rejects(f.logRead('prepareLotTransfer',{lotId:l.id,quantity:1,recipientId:f.characters[1]}));
  await assert.rejects(f.logRead('prepareMarketListing',{lotId:l.id,quantity:1,amount:1,minutes:5,pickupPlace:'Quai',conditions:''}));
  await assert.rejects(f.logCmd('correctLot',{revision:(await f.session()).revision,lotId:l.id,lotRevision:l.revision,quantity:2,status:'AVAILABLE',reason:'Test'},f.owner),{code:'LOT_CLOSED'});
  await f.stage('PAUSE');await assert.rejects(f.finish(r.id));await f.finish(r.id,false);assert.equal((await f.storedLot(l.id)).quantity,3);
 });
 test(`${prefix} : double clic, concurrence réception-annulation et confirmation périmée`,async()=>{
  const f=await fixture(),input={...await f.prepared('prepareCargoTransfer',f.cargoInput()),requestId:randomUUID()},r=await f.logCmd('startCargoTransfer',input);
  assert.deepEqual(await f.logCmd('startCargoTransfer',input),r);assert.equal((await f.hold()).hold.incoming,2);
  const old=await f.transfer(r.id);await f.ship({name:'Autre nom'},f.hid);await assert.rejects(f.logCmd('receiveCargoTransfer',{transferId:r.id,confirmation:old.confirmation,received:true}),{code:'STALE_REVISION'});
  const p={transferId:r.id,confirmation:(await f.transfer(r.id)).confirmation,received:true},rs=await Promise.allSettled([f.logCmd('receiveCargoTransfer',p),f.logCmd('cancelCargoTransfer',{transferId:r.id,confirmation:p.confirmation})]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.hold()).hold.incoming,0);
  const ended=await f.transfer(r.id);assert.equal(ended.canReceive,false);assert.equal(ended.canCancel,false);
 });
 test(`${prefix} : permissions de bande révoquées, groupe masqué et reprise administrative`,async()=>{
  const f=await fixture(),members=[{characterId:f.characters[0],active:true,revealed:true,permissions:{readStock:true,withdrawStock:true,depositStock:true,manageStorage:true}}];
  const {id:gid}=await f.logCmd('saveSessionGroup',{revision:(await f.session()).revision,name:'Secret',visibility:'SECRET',publicationState:'PUBLISHED',members,reason:'Test'},f.owner);await f.logCmd('setGroupModule',{revision:(await f.session()).revision,enabled:true,reason:'Test'},f.owner);await f.ship({ownerType:'GROUP',ownerId:gid},f.hid);await f.rent(f.alice,f.wid,{tenantType:'GROUP',groupId:gid});await f.move(3);
  const p={...await f.prepared('prepareCargoTransfer',f.cargoInput()),requestId:randomUUID()},r=await f.logCmd('startCargoTransfer',p);
  const s=await f.session(),g=s.groups.find(g=>g.id===gid);await f.logCmd('saveSessionGroup',{...g,groupId:gid,revision:s.revision,members:members.map(m=>({...m,revealed:false})),reason:'Test'},f.owner);
  await assert.rejects(f.logCmd('startCargoTransfer',p),{code:'FORBIDDEN'});assert.deepEqual((await f.logRead('myCargo')).transfers,[]);await assert.rejects(f.transfer(r.id),{code:'FORBIDDEN'});
  const t=(await f.cargoAdmin()).transfers[0];await f.logCmd('cancelCargoTransferAdmin',{transferId:t.id,transferRevision:t.revision,reason:'Chargement repris par le MJ'},f.owner);assert.equal((await f.storedLot(r.lotId)).status,'AVAILABLE');
 });
 test(`${prefix} : volume nul protège aussi le bail et annulation MJ depuis un sac`,async()=>{
  const f=await fixture();await f.rent();const lot=(await f.grant(await f.item({unitVolume:0}),1)).id,r=await f.start(f.cargoInput(1,lot,{kind:'WAREHOUSE',id:f.wid}));
  assert.equal((await f.detail(f.wid)).canRelease,false);await assert.rejects(f.logRead('prepareWarehouseRelease',{warehouseId:f.wid}),{code:'WAREHOUSE_NOT_EMPTY'});
  await f.stage('FINISHED');await assert.rejects(f.stage('ARCHIVED'),{code:'CARGO_TRANSFERS_OPEN'});
  const t=(await f.cargoAdmin()).transfers[0];await f.logCmd('cancelCargoTransferAdmin',{transferId:r.id,transferRevision:t.revision,reason:'Retour source'},f.owner);await f.stage('ARCHIVED');
 });
 test(`${prefix} : panne transactionnelle ne perd ni quantité ni réservation`,async()=>{
  const f=await fixture(),original=f.store.runTransaction.bind(f.store);let abort=false;f.store.runTransaction=fn=>original(async tx=>{const r=await fn(tx);if(abort){abort=false;throw Error('Panne test');}return r;});
  const p=await f.prepared('prepareCargoTransfer',f.cargoInput(2));abort=true;await assert.rejects(f.logCmd('startCargoTransfer',p),/Panne test/);assert.equal((await f.storedLot(f.lotId)).quantity,3);assert.equal((await f.hold()).hold.incoming,0);
  const r=await f.logCmd('startCargoTransfer',p),d=await f.transfer(r.id);abort=true;await assert.rejects(f.logCmd('receiveCargoTransfer',{transferId:r.id,confirmation:d.confirmation,received:true}),/Panne test/);assert.equal((await f.storedLot(r.lotId)).status,'CARGO_RESERVED');assert.equal((await f.hold()).hold.incoming,4);await f.finish(r.id);
 });
 test(`${prefix} : carburant acheté, réception commerciale puis chargement sans consommation implicite`,async()=>{
  const f=await fixture(),item=await f.item({name:'Carburant test',category:'Carburant',consumable:true,unit:'bidon de test',unitVolume:1}),lot=(await f.grant(item,2)).id;
  await f.adjust(await f.prepareAdjustment({characterId:f.characters[1],amount:10}));const input={lotId:lot,quantity:2,buyerId:f.characters[1],amount:6,minutes:10,conditions:'Remise réelle',pickupPlace:'Quai'};
  const sale=await f.logCmd('proposeLotSale',await f.prepared('prepareLotSale',input)),buy={saleId:sale.id,fromAccountId:accountId(f.characters[1])},sold=await f.logCmd('buyLot',await f.prepared('prepareLotPurchase',buy,f.bob),f.bob);
  const h=(await f.ship({ownerId:f.characters[1]})).id,cargo=f.cargoInput(2,sold.purchasedLotId,{kind:'HOLD',id:h});await assert.rejects(f.start(cargo,f.bob));
  let detail=await f.logRead('lotSaleDetail',{saleId:sale.id});await f.logCmd('offerSalePickup',{saleId:sale.id,confirmation:detail.pickupConfirmation});detail=await f.logRead('lotSaleDetail',{saleId:sale.id},f.bob);await f.logCmd('confirmSalePickup',{saleId:sale.id,confirmation:detail.pickupConfirmation,received:true},f.bob);
  const r=await f.start(cargo,f.bob);await f.finish(r.id,true,f.bob);const stored=await f.storedLot(r.lotId);assert.equal(stored.quantity,2);assert.equal(stored.item.category,'Carburant');assert.equal(stored.location.id,h);assert.equal((await f.logRead('myWallet',{},f.bob)).account.balance,4);
 });
 test(`${prefix} : campagne bloque un chargement ouvert et conserve soute, propriétaire et stock`,async()=>{
  const f=await fixture(true),r=await f.start(f.cargoInput(2));const closing=await f.closing();assert.equal(closing.view.canClose,false);assert.ok(closing.view.blocks.some(b=>b.kind==='CARGO_TRANSFER'));
  await f.stage('EN_JEU');await f.finish(r.id);await f.close();await f.resume(await f.begin());await f.activate(f.alice,f.characters[0]);await f.run();
  const h=await f.read('shipHold',f.alice,{sessionId:f.sid,shipId:f.hid});assert.equal(h.hold.used,4);assert.equal(h.stock[0].ownerId,f.characters[0]);assert.equal(h.stock[0].id,r.lotId);assert.equal(h.hold.incoming,0);
 });
 test(`${prefix} : commandes privées et droits administrateur non falsifiables`,async()=>{
  const f=await fixture();for(const action of cargoCommands)await assert.rejects(f.cmd(action,null,{sessionId:f.sessionId}),{code:'LOGIN_REQUIRED'});
  for(const action of ['cargoAdmin','saveShip','cancelCargoTransferAdmin'])await assert.rejects(f.logCmd(action,{admin:true}),{code:'FORBIDDEN'});
  await assert.rejects(f.logRead('cargoLot',{sessionId:randomUUID(),lotId:f.lotId}),{code:'FORBIDDEN'});
 });
}
