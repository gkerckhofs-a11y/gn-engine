import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {personalLot} from '../../src/core/inventory-state.mjs';

export function storageGroupsSuite(fixture,prefix){
  async function setup(campaign=false){
    const f=await fixture(campaign);
    const members=[{characterId:f.characters[0],active:true,revealed:true,permissions:{readStock:true,depositStock:true,withdrawStock:true,manageStorage:true}},{characterId:f.characters[1],active:true,revealed:true,permissions:{readStock:true,withdrawStock:true}}];
    const {id:gid}=await f.logCmd('saveSessionGroup',{revision:(await f.session()).revision,name:'BANDE_CONFIDENTIELLE',visibility:'SECRET',publicationState:'PUBLISHED',members,reason:'Test'},f.owner);
    await f.logCmd('setGroupModule',{revision:(await f.session()).revision,enabled:true,reason:'Test'},f.owner);
    const update=async(patch={})=>{const s=await f.session(),g=s.groups.find(g=>g.id===gid);return f.logCmd('saveSessionGroup',{...g,groupId:gid,revision:s.revision,reason:'Test',...patch},f.owner);};
    const rent=()=>f.rent(f.alice,f.wid,{tenantType:'GROUP',groupId:gid});
    const bobMove=async(lotId,quantity=1)=>{const p=f.moveInput(quantity,'WITHDRAW',lotId);return f.logCmd('moveWarehouseStock',await f.prepared('prepareWarehouseMove',p,f.bob),f.bob);};
    return {...f,get sid(){return f.sid;},gid,members,update,rent,bobMove};
  }
  test(`${prefix} : propriété collective, retrait par un autre membre et conservation des quantités`,async()=>{
    const f=await setup();await f.rent();const p=await f.logRead('prepareWarehouseMove',f.moveInput(2));assert.equal(p.ownershipTransfer.to,'BANDE_CONFIDENTIELLE');
    const r=await f.logCmd('moveWarehouseStock',{...f.moveInput(2),confirmation:p.confirmation}),l=await f.storedLot(r.id);
    assert.equal(l.ownerType,'GROUP');assert.equal(l.ownerId,f.gid);assert.equal(l.holderId,null);assert.equal(personalLot(l,f.gid),false);
    assert.equal((await f.logRead('myInventory')).stored.length,0);assert.equal((await f.logRead('myInventory')).ownedElsewhere.length,0);
    const withdrawn=await f.bobMove(l.id),received=await f.storedLot(withdrawn.id);assert.ok(personalLot(received,f.characters[1]));assert.equal((await f.detail(f.wid,f.bob)).used,2);
    const lots=(await f.store.list(`${f.base}/inventory`)).filter(l=>l.item.id===f.cargo);assert.equal(lots.reduce((n,l)=>n+l.quantity,0),3);
    const history=await f.store.list(`${f.base}/inventory/${withdrawn.id}/history`);assert.equal(history[0].ownershipTransfer.from,'BANDE_CONFIDENTIELLE');assert.equal(history[0].after.ownerType,'CHARACTER');
  });
  test(`${prefix} : lecture, dépôt, retrait et gestion de bail restent distincts`,async()=>{
    const f=await setup();await f.rent();const {id}=await f.move();
    for(const permissions of [{readStock:true},{depositStock:true},{withdrawStock:true},{manageStorage:true}]){
      await f.update({members:[f.members[0],{...f.members[1],permissions}]});const d=await f.detail(f.wid,f.bob);
      assert.equal(d.stock.length,permissions.readStock?1:0);assert.equal(d.canDeposit,!!permissions.depositStock);assert.equal(d.canMove,false);assert.equal(d.canRent,!!permissions.manageStorage);
      await assert.rejects(f.bobMove(id),{code:'FORBIDDEN'});
    }
    await f.update({members:[f.members[0],{...f.members[1],permissions:{readStock:true,withdrawStock:true}}]});await f.bobMove(id);
    await assert.rejects(f.logRead('prepareWarehouseRelease',{warehouseId:f.wid},f.bob),{code:'FORBIDDEN'});
    const bobLot=(await f.grant(f.cargo,1,f.characters[1])).id;
    await f.update({members:[f.members[0],{...f.members[1],permissions:{depositStock:true}}]});
    const p=f.moveInput(1,'DEPOSIT',bobLot);await f.logCmd('moveWarehouseStock',await f.prepared('prepareWarehouseMove',p,f.bob),f.bob);assert.equal((await f.detail(f.wid)).used,2);
  });
  test(`${prefix} : groupe secret, membre masqué, révocation et réessai mémorisé`,async()=>{
    const f=await setup();await f.rent();const input=await f.prepared('prepareWarehouseMove',f.moveInput()),requestId=randomUUID();await f.logCmd('moveWarehouseStock',{...input,requestId});
    const d=await f.detail(f.wid,f.eve);assert.deepEqual(d.stock,[]);assert.equal(d.used,null);assert.ok(!JSON.stringify(d).includes('BANDE_CONFIDENTIELLE'));assert.ok(!JSON.stringify(d).includes(f.gid));
    await f.update({members:f.members.map(m=>({...m,revealed:false}))});assert.equal((await f.detail(f.wid)).warehouse.mine,false);
    await assert.rejects(f.logCmd('moveWarehouseStock',{...input,requestId}),{code:'FORBIDDEN'});
    await assert.rejects(f.logRead('prepareWarehouseRent',f.rentInput(f.alice,f.wid,{tenantType:'GROUP',groupId:f.gid})),{code:'FORBIDDEN'});
    await f.update();await f.logCmd('setGroupModule',{revision:(await f.session()).revision,enabled:false,reason:'Test'},f.owner);assert.deepEqual((await f.detail(f.wid)).stock,[]);
  });
  test(`${prefix} : confirmations liées au titulaire et aux droits, bail personnel inchangé`,async()=>{
    const f=await setup(),p=await f.prepared('prepareWarehouseRent',f.rentInput());
    await assert.rejects(f.logCmd('rentWarehouse',{...p,tenantType:'GROUP',groupId:f.gid}),{code:'STALE_REVISION'});
    await f.rent();const move=await f.prepared('prepareWarehouseMove',f.moveInput());await f.update({members:[{...f.members[0],permissions:{readStock:true,manageStorage:true}},f.members[1]]});await assert.rejects(f.logCmd('moveWarehouseStock',move),{code:'FORBIDDEN'});
    await assert.rejects(f.logRead('prepareWarehouseRent',f.rentInput()),{code:'WAREHOUSE_UNAVAILABLE'});
    assert.equal((await f.admin()).warehouses[0].tenantType,'GROUP');
  });
  test(`${prefix} : deux retraits concurrents, fermeture et restitution sans perte`,async()=>{
    const f=await setup();await f.rent();const {id}=await f.move(1);await f.configure({enabled:false},f.wid);
    const p=f.moveInput(1,'WITHDRAW',id),a=await f.prepared('prepareWarehouseMove',p),b=await f.prepared('prepareWarehouseMove',p,f.bob);
    const results=await Promise.allSettled([f.logCmd('moveWarehouseStock',a),f.logCmd('moveWarehouseStock',b,f.bob)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.detail(f.wid)).used,0);
    const q=await f.prepared('prepareWarehouseRelease',{warehouseId:f.wid});await f.logCmd('releaseWarehouse',q);assert.equal((await f.admin()).warehouses[0].tenantId,null);
  });
  test(`${prefix} : groupe et personnage homonymes ne partagent pas leur inventaire`,async()=>{
    const f=await setup();await f.rent();const {id}=await f.move();
    await f.store.runTransaction(async tx=>{const l=await tx.get(`${f.base}/inventory/${id}`);tx.set(`${f.base}/inventory/${id}`,{...l,ownerId:f.characters[2]});});
    const d=await f.logRead('myInventory',{},f.eve);assert.equal(d.stored.length,0);assert.equal(d.ownedElsewhere.length,0);
    await assert.rejects(f.logRead('prepareLotTransfer',{lotId:id,quantity:1,recipientId:f.characters[0]},f.eve));
  });
  test(`${prefix} : campagne conserve le titulaire collectif, ses droits et les biens`,async()=>{
    const f=await setup(true);await f.rent();const {id}=await f.move(2);f.advance(120000);await f.close();const b=await f.begin();await f.resume(b);
    const w=await f.store.get(`sessions/${f.sid}/warehouses/${f.wid}`),l=await f.store.get(`sessions/${f.sid}/inventory/${id}`);assert.equal(w.tenantType,'GROUP');assert.equal(w.tenantId,f.gid);assert.equal(w.expiresAtGameMs,480000);assert.equal(l.ownerType,'GROUP');assert.equal(l.quantity,2);
    await f.activate(f.bob,f.characters[1]);await f.run();const d=await f.read('warehouseDetail',f.bob,{sessionId:f.sid,warehouseId:f.wid});assert.equal(d.stock[0].id,id);assert.equal(d.canMove,true);assert.equal(d.canDeposit,false);
  });
}
