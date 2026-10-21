import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {cargoFixture} from './cargo-suite.mjs';
import {customsCommands} from '../../src/core/customs.mjs';
import {accountId,groupAccountId} from '../../src/core/economy-state.mjs';

async function fixture(makeStore,campaign=false){
 const f=await cargoFixture(makeStore,campaign),admin=()=>f.logRead('cargoTariffsAdmin',{},f.owner);
 const config=async(patch={},tariffId)=>{const d=await admin(),old=d.tariffs.find(t=>t.id===tariffId);return {title:'Passage',description:'Frais publics',kind:'CUSTOMS',direction:'LOAD',itemId:null,flatAmount:3,unitAmount:2,recipientAccountId:accountId(f.characters[1]),enabled:true,...old,...patch,tariffId,recordRevision:old?.revision??0,revision:d.session.revision,reason:'MOTIF_PRIVE'};};
 const tariff=async(patch={},id)=>f.logCmd('saveCargoTariff',await f.prepared('prepareCargoTariff',await config(patch,id),f.owner),f.owner);
 const receipt=(transferId,fromAccountId=accountId(f.characters[0]),who=f.alice)=>f.prepared('prepareCargoReceipt',{transferId,fromAccountId},who);
 const receive=(p,patch={},who=f.alice)=>f.logCmd('receiveCargoTransfer',{...p,received:true,...patch},who);
 const fees=async()=>(await f.store.list(`${f.base}/ledger`)).filter(e=>e.kind==='CARGO_FEES');
 return {...f,get sid(){return f.sid;},admin,config,tariff,receipt,receive,fees};
}
export function customsSuite(makeStore,prefix='Douanes'){
 test(`${prefix} : configuration explicite, aperçu sans effet, révisions et réessai unique`,async()=>{
  const f=await fixture(makeStore);assert.deepEqual((await f.admin()).tariffs,[]);
  const input=await f.config(),p=await f.prepared('prepareCargoTariff',input,f.owner);assert.equal((await f.admin()).tariffs.length,0);
  const requestId=randomUUID(),r=await f.logCmd('saveCargoTariff',{...p,requestId},f.owner);assert.deepEqual(await f.logCmd('saveCargoTariff',{...p,requestId},f.owner),r);
  await assert.rejects(f.logCmd('saveCargoTariff',p,f.owner),{code:'STALE_REVISION'});await assert.rejects(f.logCmd('saveCargoTariff',{...p,requestId,title:'Autre'},f.owner),{code:'REQUEST_ID_REUSED'});
  for(const patch of [{flatAmount:-1},{unitAmount:0.5},{direction:'BUY'},{kind:'EXEMPT'},{enabled:'yes'},{title:''},{recipientAccountId:randomUUID()},{itemId:randomUUID()}])await assert.rejects(f.logRead('prepareCargoTariff',await f.config(patch),f.owner));
  await f.tariff({enabled:false},r.id);const d=await f.admin();assert.equal(d.tariffs.length,1);assert.equal(d.tariffs[0].revision,2);assert.equal(d.history.length,2);
 });
 test(`${prefix} : montant annoncé, bénéficiaires cumulés et paiement atomique à la réception`,async()=>{
  const f=await fixture(makeStore);await f.tariff();await f.tariff({kind:'CORRUPTION',flatAmount:4,unitAmount:0,recipientAccountId:accountId(f.characters[2])});await f.tariff({flatAmount:1,unitAmount:0,recipientAccountId:null});
  const q=await f.logRead('prepareCargoTransfer',f.cargoInput(2));assert.equal(q.clearance.total,12);assert.equal((await f.wallet()).account.balance,100);
  const r=await f.start(f.cargoInput(2));assert.equal((await f.wallet()).account.balance,100);assert.equal((await f.wallet()).account.reserved,0);assert.equal((await f.fees()).length,0);
  const d=await f.transfer(r.id);for(const hidden of ['tariffId','recipientAccountId','actorUid','MOTIF_PRIVE'])assert.equal(JSON.stringify(d).includes(hidden),false,hidden);
  const paid=await f.receive(await f.receipt(r.id)),l=await f.storedLot(r.lotId);assert.equal(l.location.id,f.hid);assert.equal(l.status,'AVAILABLE');assert.equal(paid.feeReceipt.total,12);
  assert.equal((await f.wallet()).account.balance,88);assert.equal((await f.wallet(f.bob)).account.balance,7);assert.equal((await f.wallet(f.eve)).account.balance,4);
  const [e]=await f.fees();assert.equal(e.createdCurrency,0);assert.equal(e.removedCurrency,1);assert.equal(e.entries.reduce((n,x)=>n+x.delta,0),-1);assert.equal(e.cargoTransferId,r.id);
  const entry=(await f.wallet(f.bob)).entries.find(x=>x.id===e.id);assert.equal(entry.counterparty.name,'Alice');assert.equal(entry.cargoTransferId,r.id);assert.equal(JSON.stringify(entry).includes('actorUid'),false);
  assert.equal((await f.store.list(`${f.base}/inventory`)).filter(x=>x.item.id===f.cargo).reduce((n,x)=>n+x.quantity,0),3);
 });
 test(`${prefix} : sens, filtrage par objet, tarif nul et mouvements locaux gratuits`,async()=>{
  const f=await fixture(makeStore);await f.tariff({direction:'UNLOAD',flatAmount:9,unitAmount:0});await f.tariff({direction:'TRANSSHIP',flatAmount:11,unitAmount:0});await f.tariff({itemId:f.recharge,flatAmount:50,unitAmount:0});
  const q=await f.logRead('prepareCargoTransfer',f.cargoInput());assert.equal(q.clearance.total,0);const r=await f.start();await f.finish(r.id);
  assert.equal((await f.logRead('prepareCargoTransfer',f.cargoInput(1,r.lotId,{kind:'CHARACTER',id:f.characters[0]}))).clearance.total,9);
  const hid=(await f.ship()).id;assert.equal((await f.logRead('prepareCargoTransfer',f.cargoInput(1,r.lotId,{kind:'HOLD',id:hid}))).clearance.total,11);
  await f.rent();assert.equal((await f.logRead('prepareCargoTransfer',f.cargoInput(1,f.lotId,{kind:'WAREHOUSE',id:f.wid}))).clearance.total,0);
  await f.tariff({flatAmount:0,unitAmount:0});const free=await f.start();await f.finish(free.id);assert.equal((await f.fees()).length,0);
 });
 test(`${prefix} : tarif figé à la réservation, aperçu périmé refusé et ancien chargement gratuit`,async()=>{
  const f=await fixture(makeStore),t=await f.tariff(),r=await f.start(),p=await f.prepared('prepareCargoTransfer',f.cargoInput());
  await f.tariff({flatAmount:90},t.id);await assert.rejects(f.logCmd('startCargoTransfer',p),{code:'STALE_REVISION'});await f.tariff({enabled:false},t.id);
  assert.equal((await f.transfer(r.id)).transfer.clearance.total,5);await f.receive(await f.receipt(r.id));assert.equal((await f.wallet()).account.balance,95);
  const old=await f.start();await f.store.runTransaction(async tx=>{const path=`${f.base}/cargoTransfers/${old.id}`,x=await tx.get(path);delete x.clearance;tx.set(path,x);});await f.tariff({enabled:true},t.id);await f.finish(old.id);assert.equal((await f.fees()).length,1);
 });
 test(`${prefix} : confirmation de paiement et réception physique obligatoires, identité serveur`,async()=>{
  const f=await fixture(makeStore);await f.tariff();const r=await f.start(),d=await f.transfer(r.id);
  await assert.rejects(f.finish(r.id),{code:'CARGO_PAYER_REQUIRED'});await assert.rejects(f.receipt(r.id,accountId(f.characters[1])),{code:'FORBIDDEN'});await assert.rejects(f.transfer(r.id,f.bob),{code:'FORBIDDEN'});
  await assert.rejects(f.receive({transferId:r.id,fromAccountId:accountId(f.characters[0]),confirmation:d.confirmation}),{code:'STALE_REVISION'});
  const p=await f.receipt(r.id);await assert.rejects(f.receive(p,{received:false}),{code:'CARGO_RECEIPT_REQUIRED'});assert.equal((await f.fees()).length,0);await f.receive(p,{total:0,amount:0});assert.equal((await f.wallet()).account.balance,95);
 });
 test(`${prefix} : fonds disponibles, débordement bénéficiaire et preuves périmées sans effet partiel`,async()=>{
  const f=await fixture(makeStore);await f.tariff();const r=await f.start();await f.injectAccount(f.characters[0],{reserved:96});await assert.rejects(f.receipt(r.id),{code:'INSUFFICIENT_FUNDS'});
  await f.injectAccount(f.characters[0],{reserved:0});await f.injectAccount(f.characters[1],{balance:Number.MAX_SAFE_INTEGER});await assert.rejects(f.receipt(r.id),{code:'BALANCE_OVERFLOW'});
  await f.injectAccount(f.characters[1],{balance:0});const p=await f.receipt(r.id);await f.pay(await f.prepare({amount:1}));await assert.rejects(f.receive(p),{code:'STALE_REVISION'});
  assert.equal((await f.storedLot(r.lotId)).status,'CARGO_RESERVED');assert.equal((await f.fees()).length,0);assert.equal((await f.wallet()).account.balance,99);
  await f.receive(await f.receipt(r.id));assert.equal((await f.wallet()).account.balance,94);
 });
 test(`${prefix} : deux réceptions ou réception et annulation concurrentes, débit unique`,async()=>{
  const f=await fixture(makeStore);await f.tariff();const r=await f.start(),p=await f.receipt(r.id),ids=[randomUUID(),randomUUID()];
  const outcomes=await Promise.allSettled(ids.map(requestId=>f.receive(p,{requestId}))); assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
  const paid=outcomes.find(x=>x.status==='fulfilled').value;await f.receive(p,{requestId:ids[outcomes.findIndex(x=>x.status==='fulfilled')]});assert.equal((await f.fees()).length,1);assert.equal((await f.wallet()).account.balance,95);assert.equal(paid.status,'RECEIVED');
  const r2=await f.start(),p2=await f.receipt(r2.id),d=await f.transfer(r2.id);const races=await Promise.allSettled([f.logCmd('cancelCargoTransfer',{transferId:r2.id,confirmation:d.confirmation}),f.receive(p2)]);assert.equal(races.filter(x=>x.status==='fulfilled').length,1);
  const end=(await f.transfer(r2.id)).transfer.status;assert.equal((await f.wallet()).account.balance,end==='RECEIVED'?90:95);assert.equal((await f.storedLot(r2.lotId)).status,'AVAILABLE');
 });
 test(`${prefix} : bénéficiaire identique au payeur et plusieurs lignes sur un compte, conservation`,async()=>{
  const f=await fixture(makeStore);await f.tariff({recipientAccountId:accountId(f.characters[0]),flatAmount:7,unitAmount:0});await f.tariff({recipientAccountId:accountId(f.characters[0]),flatAmount:3,unitAmount:0});await f.tariff({recipientAccountId:null,flatAmount:2,unitAmount:0});
  const r=await f.start(),p=await f.logRead('prepareCargoReceipt',{transferId:r.id,fromAccountId:accountId(f.characters[0])});assert.equal(p.fees.total,12);assert.equal(p.after.balance,98);
  await f.receive({...p,transferId:r.id,fromAccountId:accountId(f.characters[0])});const [e]=await f.fees();assert.equal(e.entries.length,1);assert.equal(e.entries[0].delta,-2);assert.equal(e.removedCurrency,2);assert.equal((await f.wallet()).account.balance,98);
 });
 test(`${prefix} : caisse sans lecture de solde, alias public et révocation avant réessai`,async()=>{
  const f=await fixture(makeStore),members=[{characterId:f.characters[0],active:true,revealed:true,permissions:{payWallet:true}}];
  const {id:gid}=await f.logCmd('saveSessionGroup',{revision:(await f.session()).revision,name:'CELLULE_SECRETE',visibility:'SECRET',publicationState:'PUBLISHED',members,reason:'Test'},f.owner);
  await f.logCmd('setGroupModule',{revision:(await f.session()).revision,enabled:true,reason:'Test'},f.owner);
  await f.logCmd('setGroupWallet',await f.prepared('prepareGroupWallet',{revision:(await f.session()).revision,groupId:gid,label:'Comptoir neutre',reason:'Test'},f.owner),f.owner);
  await f.adjust(await f.prepareAdjustment({groupId:gid,amount:30}));const aid=groupAccountId(gid);await f.tariff({recipientAccountId:aid});const r=await f.start();
  const data=await f.logRead('prepareCargoReceipt',{transferId:r.id,fromAccountId:aid});assert.equal('before' in data,false);assert.equal('after' in data,false);assert.equal(JSON.stringify(data).includes('CELLULE_SECRETE'),false);assert.equal(data.payer.name,'Comptoir neutre');
  const p=await f.receipt(r.id,aid),requestId=randomUUID();await f.receive(p,{requestId});const g=(await f.session()).groups.find(g=>g.id===gid);await f.logCmd('saveSessionGroup',{...g,groupId:gid,revision:(await f.session()).revision,members:[{...members[0],permissions:{readWallet:true}}],reason:'Retrait'},f.owner);
  await assert.rejects(f.receive(p,{requestId}),{code:'FORBIDDEN'});assert.equal((await f.fees()).length,1);assert.equal((await f.store.get(`${f.base}/accounts/${aid}`)).balance,30);
 });
 test(`${prefix} : pause, économie désactivée, hors combat et annulation gratuite`,async()=>{
  const f=await fixture(makeStore);await f.tariff();const r=await f.start();await f.stage('PAUSE');await assert.rejects(f.receipt(r.id),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');
  await f.rules({enabled:false});assert.equal((await f.transfer(r.id)).canReceive,false);await assert.rejects(f.receipt(r.id),{code:'ECONOMY_DISABLED'});await f.finish(r.id,false);await f.rules({});assert.equal((await f.wallet()).account.balance,100);
  const r2=await f.start();await f.damage();await assert.rejects(f.receipt(r2.id),{code:'OUT_OF_COMBAT'});await f.finish(r2.id,false);assert.equal((await f.fees()).length,0);
 });
 test(`${prefix} : campagne conserve tarifs et soldes, clôture bloque un passage en attente`,async()=>{
  const f=await fixture(makeStore,true),sid=f.sid,t=await f.tariff(),r=await f.start();const closure=await f.closing();assert.equal(closure.view.canClose,false);await f.stage('EN_JEU');await f.receive(await f.receipt(r.id));await f.close();
  await assert.rejects(f.tariff({},t.id),{code:'SESSION_CLOSED'});await f.resume(await f.begin());await f.activate(f.alice,f.characters[0]);await f.run();
  const d=await f.read('cargoTariffsAdmin',f.owner,{sessionId:f.sid});assert.equal(d.tariffs[0].id,t.id);assert.equal(d.tariffs[0].recipientAccountId,accountId(f.characters[1]));assert.equal((await f.read('myWallet',f.alice,{sessionId:f.sid})).account.balance,95);
  assert.equal((await f.store.list(`sessions/${sid}/ledger`)).filter(e=>e.kind==='CARGO_FEES').length,1);assert.equal((await f.store.list(`sessions/${f.sid}/ledger`)).filter(e=>e.kind==='CARGO_FEES').length,0);
 });
 test(`${prefix} : panne après préparation des écritures annule argent, reçu et mouvement`,async()=>{
  const f=await fixture(makeStore);await f.tariff();const r=await f.start(),p=await f.receipt(r.id),original=f.store.runTransaction.bind(f.store);let abort=true;
  f.store.runTransaction=fn=>original(async tx=>{const result=await fn(tx);if(abort){abort=false;throw Error('Panne après écritures');}return result;});
  await assert.rejects(f.receive(p),/Panne après écritures/);assert.equal((await f.wallet()).account.balance,100);assert.equal((await f.wallet(f.bob)).account.balance,0);assert.equal((await f.fees()).length,0);assert.equal((await f.storedLot(r.lotId)).status,'CARGO_RESERVED');assert.equal((await f.transfer(r.id)).transfer.feeReceipt,null);
  await f.receive(p);assert.equal((await f.wallet()).account.balance,95);assert.equal((await f.fees()).length,1);
 });
 test(`${prefix} : commandes privées, régie protégée et précision des grands montants`,async()=>{
  const f=await fixture(makeStore);for(const action of [...customsCommands,'prepareCargoReceipt'])await assert.rejects(f.cmd(action,null,{sessionId:f.sessionId}),{code:'LOGIN_REQUIRED'});
  for(const action of customsCommands)await assert.rejects(f.logCmd(action,{admin:true}),{code:'FORBIDDEN'});
  await f.tariff({flatAmount:1,unitAmount:Number.MAX_SAFE_INTEGER});await assert.rejects(f.start(),{code:'BALANCE_OVERFLOW'});assert.equal((await f.storedLot(f.lotId)).quantity,3);assert.equal((await f.fees()).length,0);
 });
}
