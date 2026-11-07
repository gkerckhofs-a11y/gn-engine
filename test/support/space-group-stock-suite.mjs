import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spaceGroupsFixture} from './space-groups-suite.mjs';
import {rosterMembership} from './group-management-suite.mjs';
import {itemInput,newLot} from '../../src/core/inventory-state.mjs';
import {centralTestItem} from './central-master-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';

export async function spaceGroupStockFixture(makeStore){
 const f=await spaceGroupsFixture(makeStore);
 const groupId='stock-faction',lotId='personal-stock';
 await f.config(groupId,{kind:'FACTION',name:'Cellule privée'});
 const save=async(p={},actor=f.owner)=>f.cmd('saveWarehouse',{
  revision:(await f.get('')).revision,groupId,name:'Dépôt privé',description:'Entrepôt de la cellule',
  capacity:10,enabled:true,reason:'Attribution par le MJ',...p
 },actor);
 const {id:warehouseId}=await save();
 const warehouse=()=>f.get(`warehouses/${warehouseId}`);
 const grant=(cid,permissions,from=null)=>f.applyGroup(cid,from,groupId,{membership:rosterMembership(permissions)});
 await grant(f.cid,['depositStock']);
 await grant(f.otherId,['readStock','withdrawStock']);
 const item=itemInput({...centralTestItem,name:'Caisse ordinaire',kind:'STACKABLE',unitVolume:2,publicationState:'PUBLISHED'},'ordinary');
 await f.edit(`inventory/${lotId}`,()=>newLot(lotId,item,5,f.cid,1,{kind:'TEST_ORDINARY'}));
 const deposit={warehouseId,lotId,direction:'DEPOSIT',quantity:3};
 const detail=actor=>f.read('warehouseDetail',{warehouseId},actor);
 const prepare=(p,actor=f.player)=>f.read('prepareWarehouseMove',p,actor);
 const confirm=(p,quote,actor=f.player,requestId=randomUUID())=>f.cmd('moveWarehouseStock',{...p,confirmation:quote.confirmation,requestId},actor);
 return {...f,groupId,warehouseId,lotId,save,warehouse,grant,deposit,detail,prepare,confirm};
}

export function spaceGroupStockSuite(makeStore,prefix='Stocks SO'){
 test(`${prefix} : dépôt fractionné, stock privé, retrait au bénéfice du personnage et patrimoine conservé`,async()=>{
  const f=await spaceGroupStockFixture(makeStore),initial=await f.assets();
  const before=await f.detail(f.player);
  assert.equal(before.canDeposit,true);
  assert.equal(before.used,null);
  assert.equal(before.incoming,null);
  assert.deepEqual(before.stock,[]);
  const q=await f.prepare(f.deposit);
  assert.equal(q.used,undefined);
  assert.equal(q.afterVolume,undefined);
  assert.equal(q.ownershipTransfer.to,'Cellule privée');
  const id=randomUUID(),deposited=await f.confirm(f.deposit,q,f.player,id);
  assert.deepEqual(await f.confirm(f.deposit,q,f.player,id),deposited);
  const lot=await f.get(`inventory/${deposited.id}`);
  assert.deepEqual([lot.ownerType,lot.ownerId,lot.holderId,lot.quantity],['GROUP',f.groupId,null,3]);
  assert.equal((await f.get(`inventory/${f.lotId}`)).quantity,2);
  assert.equal((await f.detail(f.player)).used,null);
  assert.equal((await f.detail(f.other)).used,6);
  const withdrawal={warehouseId:f.warehouseId,lotId:lot.id,direction:'WITHDRAW',quantity:2};
  await assert.rejects(f.prepare(withdrawal),{code:'FORBIDDEN'});
  const next=await f.confirm(withdrawal,await f.prepare(withdrawal,f.other),f.other);
  const received=await f.get(`inventory/${next.id}`);
  assert.deepEqual([received.ownerType,received.ownerId,received.holderId,received.quantity],['CHARACTER',f.otherId,f.otherId,2]);
  assert.equal((await f.get(`inventory/${lot.id}`)).quantity,1);
  assert.deepEqual((await f.assets()).accounts,initial.accounts);
  assert.deepEqual((await f.assets()).ledger,initial.ledger);
  const journal=(await f.read('warehouseAdmin')).events;
  assert.ok(journal.some(e=>e.kind==='DEPOSIT'&&e.ownershipTransfer.to==='Cellule privée'));
  assert.ok(journal.some(e=>e.kind==='WITHDRAW'&&e.ownershipTransfer.from==='Cellule privée'));
 });
 test(`${prefix} : autorité MJ, affectation fixe, capacité et matériel de création protégé`,async()=>{
  const f=await spaceGroupStockFixture(makeStore);
  await assert.rejects(f.save({},f.player),{code:'FORBIDDEN'});
  await assert.rejects(f.save({rent:25}),{code:'INVALID_WAREHOUSE'});
  const warehouse=await f.warehouse();
  await f.config('other',{kind:'FACTION'});
  await assert.rejects(f.save({groupId:'other',warehouseId:f.warehouseId,warehouseRevision:warehouse.revision}),{code:'INVALID_WAREHOUSE'});
  const kit=(await f.assets()).inventory.find(l=>l.ownerId===f.cid&&l.transferable===false);
  assert.ok(kit);
  assert.ok(!(await f.detail(f.player)).bag.some(l=>l.id===kit.id));
  await assert.rejects(f.prepare({...f.deposit,lotId:kit.id,quantity:1}),{code:'FORBIDDEN'});
  const dep=await f.confirm(f.deposit,await f.prepare(f.deposit));
  const current=await f.warehouse();
  await assert.rejects(f.save({warehouseId:current.id,warehouseRevision:current.revision,capacity:5}),{code:'WAREHOUSE_FULL'});
  await f.save({warehouseId:current.id,warehouseRevision:current.revision,enabled:false});
  await assert.rejects(f.prepare({...f.deposit,quantity:1}),{code:'WAREHOUSE_UNAVAILABLE'});
  assert.equal((await f.detail(f.other)).canMove,true);
  assert.equal((await f.get(`inventory/${dep.id}`)).ownerId,f.groupId);
 });
 test(`${prefix} : révocation ferme le détail, les reçus et les aperçus sans déplacer les biens`,async()=>{
  const f=await spaceGroupStockFixture(makeStore),requestId=randomUUID(),q=await f.prepare(f.deposit);
  const dep=await f.confirm(f.deposit,q,f.player,requestId);
  const another={...f.deposit,quantity:1},pending=await f.prepare(another);
  await f.applyGroup(f.cid,f.groupId,null);
  assert.deepEqual((await f.read('warehouses',{},f.player)).warehouses,[]);
  await assert.rejects(f.detail(f.player),{code:'FORBIDDEN'});
  await assert.rejects(f.confirm(f.deposit,q,f.player,requestId),{code:'FORBIDDEN'});
  await assert.rejects(f.confirm(another,pending),{code:'FORBIDDEN'});
  assert.equal((await f.get(`inventory/${dep.id}`)).ownerId,f.groupId);
 });
 test(`${prefix} : un seul dépôt concurrent et STOP vérifié avant écriture`,async()=>{
  const f=await spaceGroupStockFixture(makeStore),q=await f.prepare(f.deposit);
  await f.cmd('stopSafety',{reason:'Test STOP'},f.player);
  assert.equal((await f.detail(f.player)).canDeposit,false);
  await assert.rejects(f.confirm(f.deposit,q),{code:'SO_SAFETY_STOP'});
  await f.cmd('resumeSafety',{revision:(await f.get('')).revision,reason:'Reprise'});
  const fresh=await f.prepare(f.deposit);
  const outcomes=await Promise.allSettled([f.confirm(f.deposit,fresh),f.confirm(f.deposit,fresh)]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await f.detail(f.other)).stock.length,1);
 });
 test(`${prefix} : décès et relève sans mandat hérité, entrepôt et lots conservés dans l’épisode suivant`,async()=>{
  const f=await spaceGroupStockFixture(makeStore);
  const moved=await f.confirm(f.deposit,await f.prepare(f.deposit));
  const saved=await f.warehouse(),lot=await f.get(`inventory/${moved.id}`);
  await f.death();
  await assert.rejects(f.detail(f.player),{code:'FORBIDDEN'});
  await f.succeed(await f.previewSuccession());
  assert.deepEqual((await f.read('warehouses',{},f.player)).warehouses,[]);
  const e=await episodeHarness(f);
  await e.close();
  await e.resume(await e.begin());
  assert.deepEqual(await e.get(`warehouses/${f.warehouseId}`),saved);
  assert.deepEqual(await e.get(`inventory/${moved.id}`),lot);
  assert.equal((await e.read('warehouseDetail',{warehouseId:f.warehouseId},f.other)).canReadStock,true);
 });
 test(`${prefix} : locations et routes fret fermées, anciennes versions sans ouverture`,async()=>{
  const f=await spaceGroupStockFixture(makeStore);
  const moved=await f.confirm(f.deposit,await f.prepare(f.deposit));
  await assert.rejects(f.read('prepareWarehouseRent',{warehouseId:f.warehouseId},f.other),{code:'SO_GAMEPLAY_NOT_OPEN'});
  await assert.rejects(f.read('cargoLot',{lotId:moved.id},f.other),{code:'SO_GAMEPLAY_NOT_OPEN'});
  await f.edit('',s=>{const {groupStockVersion,...spaceOutlaws}=s.spaceOutlaws;return {...s,spaceOutlaws};});
  await assert.rejects(f.detail(f.player),{code:'SO_GAMEPLAY_NOT_OPEN'});
  await assert.rejects(f.save(),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
}
