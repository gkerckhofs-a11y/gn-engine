import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {economyFixture} from './economy-suite.mjs';
import {campaignFixture} from './campaigns-suite.mjs';
import {accountId,groupAccountId} from '../../src/core/economy-state.mjs';
import {logisticsCommands} from '../../src/core/logistics.mjs';

export async function logisticsFixture(makeStore,campaign=false){
  const f=await (campaign?campaignFixture:economyFixture)(makeStore),sid=campaign?f.sid:f.sessionId,base=`sessions/${sid}`;
  const read=(a,p={},who=f.alice)=>f.read(a,who,{sessionId:sid,...p}),cmd=(a,p={},who=f.alice)=>f.cmd(a,who,{sessionId:sid,...p});
  const prepared=async(a,p={},who=f.alice)=>({...p,confirmation:(await read(a,p,who)).confirmation});
  const admin=()=>read('warehouseAdmin',{},f.owner),detail=(id,who=f.alice)=>read('warehouseDetail',{warehouseId:id},who);
  const configure=async(patch={},warehouseId=null)=>{const d=await admin(),old=d.warehouses.find(w=>w.id===warehouseId);return cmd('saveWarehouse',{name:'Hangar test',description:'Description publique',capacity:6,rent:20,periodMinutes:10,enabled:true,rentAccountId:null,...old,warehouseId:warehouseId??undefined,warehouseRevision:old?.revision,revision:d.session.revision,reason:'MOTIF_SECRET',...patch},f.owner);};
  const wid=(await configure()).id;
  const item=async(patch={})=>(await cmd('saveSessionItem',{revision:(await f.session()).revision,name:'Caisse test',kind:'STACKABLE',consumable:false,unitVolume:2,publicationState:'PUBLISHED',reason:'Modèle test',...patch},f.owner)).id;
  const grant=async(itemId,quantity=3,characterId=f.characters[0])=>{const p={revision:(await f.session()).revision,characterId,itemId,quantity,reason:'Dotation test'};return cmd('grantItem',await prepared('prepareGrantItem',p,f.owner),f.owner);};
  const cargo=await item(),recharge=await item({name:'Recharge laser',consumable:true,unitVolume:1,laserRecharge:{pelletsPerUnit:500}});
  const lotId=(await grant(cargo)).id,rechargeLotId=(await grant(recharge)).id;
  const rentInput=(who=f.alice,warehouseId=wid,extra={})=>({warehouseId,fromAccountId:accountId(f.characters[[f.alice.uid,f.bob.uid,f.eve.uid].indexOf(who.uid)]),...extra});
  const rent=async(who=f.alice,warehouseId=wid,extra={})=>cmd('rentWarehouse',await prepared('prepareWarehouseRent',rentInput(who,warehouseId,extra),who),who);
  const moveInput=(quantity=1,direction='DEPOSIT',lot=lotId,warehouseId=wid)=>({warehouseId,lotId:lot,quantity,direction});
  const move=async(quantity=1,direction='DEPOSIT',lot=lotId,warehouseId=wid)=>cmd('moveWarehouseStock',await prepared('prepareWarehouseMove',moveInput(quantity,direction,lot,warehouseId)));
  const lot=id=>f.store.get(`${base}/inventory/${id}`);
  return {...f,get sid(){return f.sid;},sessionId:sid,base,logRead:read,logCmd:cmd,prepared,admin,detail,configure,wid,item,grant,cargo,recharge,lotId,rechargeLotId,rentInput,rent,moveInput,move,storedLot:lot};
}
export function logisticsSuite(makeStore,prefix='Logistique'){
  const fixture=campaign=>logisticsFixture(makeStore,campaign);
  test(`${prefix} : location confirmée, débit unique et monnaie retirée explicitement`,async()=>{
    const f=await fixture(),p=await f.prepared('prepareWarehouseRent',f.rentInput()),requestId=randomUUID();
    assert.equal((await f.detail(f.wid)).warehouse.rented,false);assert.equal((await f.wallet()).account.balance,100);
    const r=await f.logCmd('rentWarehouse',{...p,requestId});assert.deepEqual(await f.logCmd('rentWarehouse',{...p,requestId}),r);
    assert.equal((await f.wallet()).account.balance,80);assert.equal((await f.detail(f.wid)).warehouse.remainingMs,600000);
    const event=(await f.ledger()).find(e=>e.kind==='WAREHOUSE_RENT');assert.equal(event.removedCurrency,20);assert.equal(event.entries.reduce((s,e)=>s+e.delta,0),-20);
    await assert.rejects(f.logCmd('rentWarehouse',{...p,requestId,fromAccountId:'other'}),{code:'REQUEST_ID_REUSED'});
  });
  test(`${prefix} : entrepôt unique, deux locations concurrentes et confidentialité du stock`,async()=>{
    const f=await fixture();await f.configure({rent:0},f.wid);
    const a=await f.prepared('prepareWarehouseRent',f.rentInput()),b=await f.prepared('prepareWarehouseRent',f.rentInput(f.bob),f.bob);
    const r=await Promise.allSettled([f.logCmd('rentWarehouse',a),f.logCmd('rentWarehouse',b,f.bob)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);
    const own=(await f.detail(f.wid)).warehouse.mine,other=own?f.bob:f.alice;
    const d=await f.detail(f.wid,other);assert.deepEqual(d.stock,[]);assert.deepEqual(d.bag,[]);assert.equal(d.used,null);assert.equal(d.warehouse.remainingMs,null);
    const serialized=JSON.stringify(await f.logRead('warehouses',{},other));for(const secret of ['MOTIF_SECRET','tenantId',f.alice.uid,'rentAccountId'])assert.equal(serialized.includes(secret),false);
    await assert.rejects(f.logRead('prepareWarehouseRelease',{warehouseId:f.wid},other),{code:'FORBIDDEN'});
  });
  test(`${prefix} : dépôt partiel, retrait et filiation des lots sans duplication`,async()=>{
    const f=await fixture();await f.rent();const r=await f.move(2),d=await f.detail(f.wid);
    assert.equal(d.used,4);assert.equal(d.stock[0].quantity,2);assert.equal((await f.storedLot(f.lotId)).quantity,1);assert.equal(d.stock[0].ownerId,f.characters[0]);
    const bag=await f.logRead('myInventory');assert.equal(bag.stored[0].id,r.id);assert.equal(bag.lots.some(l=>l.id===r.id),false);
    await f.move(1,'WITHDRAW',r.id);assert.equal((await f.detail(f.wid)).used,2);
    const all=(await f.store.list(`${f.base}/inventory`)).filter(l=>l.item.id===f.cargo);assert.equal(all.reduce((n,l)=>n+l.quantity,0),3);assert.ok(all.every(l=>l.ownerId===f.characters[0]));
    assert.equal((await f.store.list(`${f.base}/inventory/${r.id}/history`)).length,2);
  });
  test(`${prefix} : capacité contrôlée face à deux dépôts, correction MJ et changement de capacité`,async()=>{
    const f=await fixture();await f.rent();await f.configure({capacity:4},f.wid);const extra=(await f.grant(f.cargo,2)).id;
    const a=await f.prepared('prepareWarehouseMove',f.moveInput(2)),b=await f.prepared('prepareWarehouseMove',f.moveInput(2,'DEPOSIT',extra));
    const results=await Promise.allSettled([f.logCmd('moveWarehouseStock',a),f.logCmd('moveWarehouseStock',b)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.detail(f.wid)).used,4);
    await assert.rejects(f.configure({capacity:3},f.wid),{code:'WAREHOUSE_FULL'});
    const l=(await f.detail(f.wid)).stock[0];await assert.rejects(f.logCmd('correctLot',{revision:(await f.session()).revision,lotId:l.id,lotRevision:l.revision,quantity:3,status:'AVAILABLE',reason:'Correction test'},f.owner),{code:'WAREHOUSE_FULL'});
    await f.logCmd('correctLot',{revision:(await f.session()).revision,lotId:l.id,lotRevision:l.revision,quantity:0,status:'DESTROYED',reason:'Correction test'},f.owner);assert.equal((await f.detail(f.wid)).used,0);
  });
  test(`${prefix} : volume manquant refusé et paramètres invalides sans écriture`,async()=>{
    const f=await fixture();await f.rent();const item=await f.item({unitVolume:null}),lot=(await f.grant(item)).id;
    await assert.rejects(f.move(1,'DEPOSIT',lot),{code:'VOLUME_REQUIRED'});
    for(const patch of [{capacity:0},{capacity:1.5},{rent:-1},{periodMinutes:0},{periodMinutes:Number.MAX_SAFE_INTEGER},{enabled:'yes'}])await assert.rejects(f.configure(patch,f.wid),{code:'INVALID_WAREHOUSE'});
    for(const quantity of [0,-1,1.5,4])await assert.rejects(f.move(quantity));assert.equal((await f.detail(f.wid)).used,0);
  });
  test(`${prefix} : expiration en temps de jeu, pause, retrait conservé et renouvellement`,async()=>{
    const f=await fixture();await f.rent();const {id}=await f.move(1);f.advance(300000);await f.stage('PAUSE');f.advance(3600000);
    assert.equal((await f.detail(f.wid)).warehouse.remainingMs,300000);await assert.rejects(f.move(1,'WITHDRAW',id),{code:'SESSION_NOT_RUNNING'});
    await f.stage('EN_JEU');f.advance(300000);assert.equal((await f.detail(f.wid)).warehouse.expired,true);
    await assert.rejects(f.move(),{code:'WAREHOUSE_EXPIRED'});await f.move(1,'WITHDRAW',id);assert.equal((await f.detail(f.wid)).used,0);
    await f.rent();assert.equal((await f.detail(f.wid)).warehouse.remainingMs,600000);await f.rent();assert.equal((await f.detail(f.wid)).warehouse.remainingMs,1200000);
    assert.equal((await f.wallet()).account.balance,40);
  });
  test(`${prefix} : fermeture et restitution ne détruisent pas les biens, aucun remboursement implicite`,async()=>{
    const f=await fixture();await f.rent();const {id}=await f.move();await f.configure({enabled:false},f.wid);
    await assert.rejects(f.rent(),{code:'WAREHOUSE_UNAVAILABLE'});await assert.rejects(f.move(),{code:'WAREHOUSE_UNAVAILABLE'});
    await assert.rejects(f.logRead('prepareWarehouseRelease',{warehouseId:f.wid}),{code:'WAREHOUSE_NOT_EMPTY'});
    await f.move(1,'WITHDRAW',id);const p=await f.prepared('prepareWarehouseRelease',{warehouseId:f.wid});await f.logCmd('releaseWarehouse',p);
    assert.equal((await f.wallet()).account.balance,80);assert.equal((await f.admin()).warehouses[0].tenantId,null);
  });
  test(`${prefix} : stockage rend les ventes, remises et recharges indisponibles depuis le sac`,async()=>{
    const f=await fixture();await f.rent();await f.move(3,'DEPOSIT',f.rechargeLotId);
    await assert.rejects(f.logRead('prepareLaserRecharge',{lotId:f.rechargeLotId,quantity:1}),{code:'INVALID_RECHARGE'});
    await assert.rejects(f.logRead('prepareMarketListing',{lotId:f.rechargeLotId,quantity:1,amount:10,minutes:10,pickupPlace:'Quai',conditions:''}));
    await assert.rejects(f.logRead('prepareLotTransfer',{lotId:f.rechargeLotId,quantity:1,recipientId:f.characters[1]}));
    await f.move(3,'WITHDRAW',f.rechargeLotId);assert.equal((await f.logRead('prepareLaserRecharge',{lotId:f.rechargeLotId,quantity:1})).pellets,500);
  });
  test(`${prefix} : tarif modifié et lot modifié invalident une ancienne confirmation`,async()=>{
    const f=await fixture(),p=await f.prepared('prepareWarehouseRent',f.rentInput());await f.configure({rent:25},f.wid);
    await assert.rejects(f.logCmd('rentWarehouse',p),{code:'STALE_REVISION'});await f.rent();
    const m=await f.prepared('prepareWarehouseMove',f.moveInput());await f.move();await assert.rejects(f.logCmd('moveWarehouseStock',m),{code:'STALE_REVISION'});
    assert.equal((await f.wallet()).account.balance,75);
  });
  test(`${prefix} : réserve de crédits, compte tiers, hors combat et accès révoqué`,async()=>{
    const f=await fixture();await f.injectAccount(f.characters[0],{reserved:90});await assert.rejects(f.rent(),{code:'INSUFFICIENT_FUNDS'});
    await f.injectAccount(f.characters[0],{reserved:0});await assert.rejects(f.rent(f.bob,f.wid,{fromAccountId:accountId(f.characters[0])}),{code:'FORBIDDEN'});
    await f.damage();await assert.rejects(f.rent(),{code:'OUT_OF_COMBAT'});
    for(const action of logisticsCommands)await assert.rejects(f.cmd(action,null,{sessionId:f.sessionId}),{code:'LOGIN_REQUIRED'});
    await assert.rejects(f.logRead('warehouseAdmin'),{code:'FORBIDDEN'});await assert.rejects(f.logRead('warehouses',{sessionId:randomUUID()}),{code:'FORBIDDEN'});
    const path=`${f.base}/registrations/${(await import('../../src/core/workflow.mjs')).hash(f.alice.uid)}`;
    await f.store.runTransaction(async tx=>{const r=await tx.get(path);tx.set(path,{...r,accessActive:false});});await assert.rejects(f.detail(f.wid),{code:'FORBIDDEN'});
  });
  test(`${prefix} : loyers vers une caisse, droit de dépense collectif et absence de fuite du groupe secret`,async()=>{
    const f=await fixture(),members=[{characterId:f.characters[0],active:true,revealed:true,permissions:{payWallet:true}}];
    const {id:gid}=await f.logCmd('saveSessionGroup',{revision:(await f.session()).revision,name:'GROUPE_SECRET',visibility:'SECRET',publicationState:'PUBLISHED',members,reason:'Configuration'},f.owner);
    await f.logCmd('setGroupModule',{revision:(await f.session()).revision,enabled:true,reason:'Configuration'},f.owner);
    const p={groupId:gid,revision:(await f.session()).revision,label:'EXPLOITANT_SECRET',reason:'Configuration'};await f.logCmd('setGroupWallet',await f.prepared('prepareGroupWallet',p,f.owner),f.owner);
    const aid=groupAccountId(gid);await f.configure({rentAccountId:aid},f.wid);await f.rent();
    assert.equal((await f.store.get(`${f.base}/accounts/${aid}`)).balance,20);const e=(await f.ledger()).find(e=>e.kind==='WAREHOUSE_RENT');assert.equal(e.entries.reduce((n,x)=>n+x.delta,0),0);assert.equal(e.removedCurrency,0);
    assert.equal(JSON.stringify(await f.wallet()).includes('EXPLOITANT_SECRET'),false);assert.equal(JSON.stringify(await f.detail(f.wid)).includes(aid),false);
    const w2=(await f.configure()).id,q=await f.logRead('prepareWarehouseRent',{warehouseId:w2,fromAccountId:aid});assert.equal(JSON.stringify(q).includes('balance'),false);
    await f.logCmd('rentWarehouse',{warehouseId:w2,fromAccountId:aid,confirmation:q.confirmation});assert.equal((await f.store.get(`${f.base}/accounts/${aid}`)).balance,0);assert.equal((await f.detail(w2)).warehouse.mine,true);
    await assert.rejects(f.rent(f.bob,w2,{fromAccountId:aid}));
  });
  test(`${prefix} : recharges reçues, ouverture confirmée, double clic et concurrence`,async()=>{
    const f=await fixture(),p=await f.prepared('prepareLaserRecharge',{lotId:f.rechargeLotId,quantity:2});assert.equal((await f.storedLot(f.rechargeLotId)).quantity,3);
    await assert.rejects(f.logCmd('openLaserRecharge',p),{code:'RECHARGE_CONFIRMATION_REQUIRED'});
    const requestId=randomUUID(),input={...p,opened:true,requestId},r=await f.logCmd('openLaserRecharge',input);assert.equal(r.pellets,1000);assert.deepEqual(await f.logCmd('openLaserRecharge',input),r);assert.equal((await f.storedLot(f.rechargeLotId)).quantity,1);
    const q=await f.prepared('prepareLaserRecharge',{lotId:f.rechargeLotId,quantity:1}),results=await Promise.allSettled([f.logCmd('openLaserRecharge',{...q,opened:true}),f.logCmd('openLaserRecharge',{...q,opened:true})]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.storedLot(f.rechargeLotId)).status,'CONSUMED');
    const events=(await f.admin()).events.filter(e=>e.kind==='LASER_RECHARGE');assert.equal(events.reduce((s,e)=>s+e.pellets,0),1500);
    assert.equal((await f.wallet()).account.balance,100);
  });
  test(`${prefix} : recharges achetées inutilisables avant remise physique et modèle figé`,async()=>{
    const f=await fixture(),sale={lotId:f.rechargeLotId,quantity:1,buyerId:f.characters[1],amount:1,minutes:10,conditions:'Retrait physique',pickupPlace:'Comptoir'};
    await f.adjust(await f.prepareAdjustment({characterId:f.characters[1],amount:10}));
    const p=await f.logRead('prepareLotSale',sale),proposed=await f.logCmd('proposeLotSale',{...sale,confirmation:p.confirmation});
    const buy={saleId:proposed.id,fromAccountId:accountId(f.characters[1])},q=await f.logRead('prepareLotPurchase',buy,f.bob),sold=await f.logCmd('buyLot',{...buy,confirmation:q.confirmation},f.bob);
    const lots=(await f.store.list(`${f.base}/inventory`)).filter(l=>l.ownerId===f.characters[1]);assert.equal(lots.length,1);
    await assert.rejects(f.logRead('prepareLaserRecharge',{lotId:lots[0].id,quantity:1},f.bob),{code:'INVALID_RECHARGE'});
    const s=await f.session(),model=s.items.find(i=>i.id===f.recharge);await f.logCmd('saveSessionItem',{...model,revision:s.revision,laserRecharge:{pelletsPerUnit:700},reason:'Changer le conditionnement'},f.owner);
    assert.equal((await f.storedLot(f.rechargeLotId)).item.laserRecharge.pelletsPerUnit,500);const before=await f.logRead('lotSaleDetail',{saleId:proposed.id});await f.logCmd('offerSalePickup',{saleId:proposed.id,confirmation:before.pickupConfirmation});const ready=await f.logRead('lotSaleDetail',{saleId:proposed.id},f.bob);await f.logCmd('confirmSalePickup',{saleId:proposed.id,confirmation:ready.pickupConfirmation,received:true},f.bob);assert.equal((await f.logRead('prepareLaserRecharge',{lotId:sold.purchasedLotId,quantity:1},f.bob)).pellets,500);
  });
  test(`${prefix} : panne transactionnelle ne débite ni ne déplace, puis réessai possible`,async()=>{
    const f=await fixture(),original=f.store.runTransaction.bind(f.store);let abort=false;
    f.store.runTransaction=fn=>original(async tx=>{const r=await fn(tx);if(abort){abort=false;throw Error('Panne synthétique');}return r;});
    const p=await f.prepared('prepareWarehouseRent',f.rentInput());abort=true;await assert.rejects(f.logCmd('rentWarehouse',p),/Panne synthétique/);assert.equal((await f.wallet()).account.balance,100);assert.equal((await f.detail(f.wid)).warehouse.rented,false);
    await f.logCmd('rentWarehouse',p);const m=await f.prepared('prepareWarehouseMove',f.moveInput());abort=true;await assert.rejects(f.logCmd('moveWarehouseStock',m),/Panne synthétique/);assert.equal((await f.detail(f.wid)).used,0);assert.equal((await f.storedLot(f.lotId)).quantity,3);
  });
  test(`${prefix} : campagne conserve stock, conditionnement et durée restante sans double loyer`,async()=>{
    const f=await fixture(true);await f.rent();await f.move(2);f.advance(180000);await f.close();
    const build=await f.begin();f.advance(3600000);await f.resume(build);const sid=f.sid;
    const w=await f.store.get(`sessions/${sid}/warehouses/${f.wid}`);assert.equal(w.expiresAtGameMs,420000);assert.equal(w.tenantId,f.characters[0]);
    const s=await f.session();assert.equal(s.accounts.find(a=>a.characterId===f.characters[0]).balance,80);assert.equal(s.inventory.filter(l=>l.location.kind==='WAREHOUSE').reduce((n,l)=>n+l.quantity,0),2);
    assert.equal(s.items.find(i=>i.id===f.recharge).laserRecharge.pelletsPerUnit,500);
    await f.activate(f.alice,f.characters[0]);await f.run();const d=await f.read('warehouseDetail',f.alice,{sessionId:sid,warehouseId:f.wid});assert.equal(d.used,4);assert.equal(d.warehouse.remainingMs,420000);
  });
}
