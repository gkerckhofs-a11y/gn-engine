import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
import {shopAccountId,shopStockId} from '../../src/core/space-outlaws-shop-state.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
export async function transportFixture(makeStore,{quantity=6,durationMinutes=60,prepareExtra=null,departureCode='AWAY-CODE'}={}){
 const f=await soVoyagesFixture(makeStore,{departureCode,prepareExtra:async(f,draftRevision)=>{await f.cc('saveCentralMission',{missionId:'freight',missionRevision:0,draftRevision,mission:{title:'Fournitures pour le dispensaire',description:'Livraison de fret confié',gmNotes:'SECRET_MJ',steps:[{id:'delivery',title:'Livrer les fournitures',description:'Remettre au destinataire annoncé'}],giverCharacterId:'merchant',requiredKnowledgeIds:[],rewardItems:[],conditions:'Livraison complète au port indiqué',proofExpected:'Réception contrôlée par le MJ'},reason:'Mission de transport'});if(prepareExtra)await prepareExtra(f,draftRevision+1);}});
 const read=f.read,cmd=f.cmd,get=p=>f.store.get(`sessions/${f.sid}/${p}`);
 const confirm=async(prep,act,p,actor=f.owner)=>{const q=await read(prep,p,actor);return cmd(act,{...p,confirmation:q.confirmation},actor);};
 const stock={shopId:'counter',offerId:'supply',provisionId:randomUUID(),quantity:10,restricted:false,source:'Dix caisses présentes au comptoir',reason:'Stock réel de la mission'};
 await confirm('prepareShopProvision','provisionShop',stock);await f.refuel(4);
 const a=await confirm('prepareAnnouncement','saveAnnouncement',{missionId:'freight',revision:0,title:'Livraison',description:'Transport rémunéré',category:'TRANSPORT',mode:'ASSIGNMENT',participation:'PERSONAL',sponsorKind:'NPC',sponsorName:'Dispensaire',rewardType:'FIXED',rewardText:'100 Cr',places:2,conditions:'Livraison intégrale',proofExpected:'Réception MJ',briefing:'SECRET_BRIEFING',gmNotes:'SECRET_ORGANISATION',publication:'PUBLISHED',opensAt:0,deadline:8640000000000000,audience:{kind:'ALL',characterIds:[],groupIds:[]},reason:'Publication'});
 const application=await confirm('prepareAnnouncementResponse','respondAnnouncement',{announcementId:a.id,intent:'APPLICATION',body:'Je transporte ce fret'},f.player);
 const input={applicationId:application.id,amount:100,durationMinutes,funding:'ACCOUNT',sourceAccountId:shopAccountId('counter'),advance:0,guarantee:0,conditions:'Livraison complète',proofExpected:'Voyage et caisses vérifiés par MJ',confidentiality:'Route privée',failureTerms:'Litige soumis au MJ',reason:'Budget réel du dispensaire',transport:{shipId:'ship',routeId:'out',offerId:'supply',quantity,rate:'ORDINARY',recipient:'Agent du dispensaire',expenses:'Carburant à charge du transporteur ; aucune assurance souscrite.'}};
 const offer=patch=>confirm('prepareMissionContract','proposeMissionContract',{...input,...patch}),c=await offer();
 const accept=()=>confirm('prepareContractAcceptance','acceptContract',{contractId:c.id},f.player);
 const view=()=>read('contractDetail',{contractId:c.id});
 const lots=async()=> (await f.store.list(`sessions/${f.sid}/inventory`)).filter(l=>l.transportContractId===c.id&&l.quantity>0);
 // Presence belongs to the mutation, not the preview's strict request schema.
 const start=async(lot,destination,qty=lot.quantity)=>{const p={lotId:lot.id,quantity:qty,destination},q=await read('prepareCargoTransfer',p);return cmd('startCargoTransfer',{...p,confirmation:q.confirmation,present:true});};
 const receive=async(t)=>{f.advance(180000);const p=await read('prepareCargoReceipt',{transferId:t.id});return cmd('receiveCargoTransfer',{transferId:t.id,confirmation:p.confirmation,received:true});};
 const load=async()=>{for(const l of await lots())if(l.location.kind==='SHOP'){let left=l.quantity;while(left){const current=(await lots()).find(x=>x.id===l.id),n=Math.min(5,left);await receive(await start(current,{kind:'HOLD',id:'ship'},n));left-=n;}}};
 const arrive=async()=>{await f.fly();f.advance(300000);const p=await f.navigation();return cmd('arriveShip',{shipId:'ship',confirmation:p.confirmation});};
 const deliver=async()=>{for(const l of await lots())if(l.location.kind==='HOLD')await receive(await start(l,{kind:'PORT',id:'away'}));};
 const proof=()=>confirm('prepareContractProof','submitContractProof',{contractId:c.id,body:'Caisses remises à l’agent annoncé',completedStepIds:['delivery']},f.player);
 const review=(patch={})=>confirm('prepareContractReview','reviewContract',{contractId:c.id,decision:'PAY',reason:'Destination, lots et réception contrôlés par le MJ',...patch});
 const close=()=>confirm('prepareContractClosure','closeContract',{contractId:c.id,decision:'CANCEL',notStarted:true,reason:'Annulation avant départ, fret restitué'});
 return {...f,read,cmd,get,confirm,a,application,input,c,offer,accept,view,lots,start,receive,load,arrive,deliver,proof,review,close,source:()=>get(`inventory/${shopStockId('supply')}`),wallet:()=>get(`accounts/${accountId(f.cid)}`)};
}
export function spaceTransportSuite(makeStore,prefix='Transport SO'){
 test(`${prefix} : fret confié, deux tranches, voyage réel, réception MJ et salaire unique`,async()=>{
  const f=await transportFixture(makeStore),before=await f.wallet();await f.accept();assert.equal((await f.source()).quantity,4);assert.equal((await f.till()).reserved,100);const d=await f.view();assert.equal(d.contract.terms.transport.referenceSalary,100);assert.equal(d.transport.complete,false);
  await f.load();assert.equal((await f.lots()).reduce((n,l)=>n+l.quantity,0),6);await f.arrive();await f.deliver();assert.equal((await f.view()).transport.delivered,6);f.advance(3600000);await f.proof();assert.equal((await f.view()).contract.proof.lateByMs,0);await f.review();assert.equal((await f.wallet()).balance,before.balance);f.advance(600000);await f.confirm('prepareContractSettlement','settleContract',{contractId:f.c.id,reason:'Contestation échue'});assert.equal((await f.wallet()).balance,before.balance+100);assert.equal((await f.till()).reserved,0);
  const lots=await f.lots();assert.ok(lots.every(l=>l.ownerType==='SHOP'&&l.ownerId==='counter'&&l.location.kind==='PORT'&&l.location.id==='away'));assert.equal(lots.reduce((n,l)=>n+l.quantity,0)+(await f.source()).quantity,10);assert.equal((await f.ship()).fuel,2);assert.equal((await f.wallet()).protectedCredits,before.protectedCredits);
 });
 test(`${prefix} : stock et salaire réservés atomiquement, reçu et concurrence uniques`,async()=>{
  const f=await transportFixture(makeStore),p={contractId:f.c.id},q=await f.read('prepareContractAcceptance',p),input={...p,confirmation:q.confirmation,requestId:randomUUID()};const r=await Promise.allSettled([f.cmd('acceptContract',input),f.cmd('acceptContract',{...input,requestId:randomUUID()})]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.source()).quantity,4);assert.equal((await f.lots()).length,1);assert.equal((await f.till()).reserved,100);await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.cmd('acceptContract',input),{code:'FORBIDDEN'});
 });
 test(`${prefix} : ni stock protégé, tiers, injection ni cargaison fictive`,async()=>{
  const f=await transportFixture(makeStore);await f.close();await assert.rejects(f.offer({transport:{...f.input.transport,quantity:11}}),{code:'INSUFFICIENT_STOCK'});await assert.rejects(f.offer({transport:{...f.input.transport,unitValue:1}}),{code:'INVALID_ADMISSION'});await f.confirm('prepareShopProvision','provisionShop',{shopId:'counter',offerId:'fuel',provisionId:randomUUID(),quantity:10,restricted:true,source:'Stock protégé réel',reason:'Vérification'});await assert.rejects(f.offer({transport:{...f.input.transport,offerId:'fuel'}}),{code:'INSUFFICIENT_STOCK'});Object.assign(f.c,await f.offer());await f.accept();const lot=(await f.lots())[0];await assert.rejects(f.read('cargoLot',{lotId:lot.id},f.other),{code:'FORBIDDEN'});await assert.rejects(f.start(lot,{kind:'CHARACTER',id:f.cid}),{code:'FORBIDDEN'});await assert.rejects(f.start(lot,{kind:'PORT',id:'away'}),{code:'FORBIDDEN'});assert.doesNotMatch(JSON.stringify(await f.read('announcements')),/SECRET_|navigationCode|OUT-SECRET|AWAY-CODE|transportManifest/);
 });
 test(`${prefix} : annulation d’une tranche puis restitution, sans perte ni paiement`,async()=>{
  const f=await transportFixture(makeStore);await f.accept();const t=await f.start((await f.lots())[0],{kind:'HOLD',id:'ship'},5);await assert.rejects(f.close(),{code:'SO_TRANSPORT_IN_PROGRESS'});const p=await f.read('cargoTransfer',{transferId:t.id});await f.cmd('cancelCargoTransfer',{transferId:t.id,confirmation:p.confirmation});await f.close();assert.equal((await f.source()).quantity,10);assert.equal((await f.till()).reserved,0);assert.deepEqual(await f.lots(),[]);
 });
 test(`${prefix} : chargement incomplet, faux départ et clôture après départ refusés`,async()=>{
  const f=await transportFixture(makeStore);await f.accept();await f.receive(await f.start((await f.lots())[0],{kind:'HOLD',id:'ship'},5));await assert.rejects(f.startFlight(),{code:'SO_TRANSPORT_LOAD'});await f.load();await f.fly();await assert.rejects(f.close(),{code:'SO_TRANSPORT_IN_PROGRESS'});await assert.rejects(f.start((await f.lots())[0],{kind:'PORT',id:'away'}),e=>['OUT_OF_COMBAT','FORBIDDEN'].includes(e.code));assert.doesNotMatch(JSON.stringify(await f.navigation()),/transportManifest|transportContractId|lotIds/);
 });
 test(`${prefix} : récit seul insuffisant, livraison tardive soumise au MJ`,async()=>{
  const f=await transportFixture(makeStore,{durationMinutes:1});await f.accept();await f.proof();await assert.rejects(f.review(),{code:'SO_TRANSPORT_DELIVERY'});await f.review({decision:'RETURN'});await f.load();await f.arrive();await f.deliver();await f.proof();await assert.rejects(f.review(),{code:'SO_TRANSPORT_DELAY'});await f.review({delayJustified:true});assert.equal((await f.view()).contract.status,'REVIEWED');
 });
 test(`${prefix} : pause et STOP suspendent la manutention et interdisent la remise`,async()=>{
  const f=await transportFixture(makeStore,{quantity:5});await f.accept();const t=await f.start((await f.lots())[0],{kind:'HOLD',id:'ship'});await f.stage('PAUSE');f.advance(600000);await assert.rejects(f.read('prepareCargoReceipt',{transferId:t.id}),{code:'SO_CARGO_NOT_READY'});await f.stage('EN_JEU');await f.cmd('stopSafety',{reason:'Interruption de sécurité'});const p=await f.read('cargoTransfer',{transferId:t.id});assert.equal(p.canReceive,false);await assert.rejects(f.cmd('receiveCargoTransfer',{transferId:t.id,confirmation:p.confirmation,received:true}),{code:'SO_SAFETY_STOP'});
 });
 test(`${prefix} : ancienne session fermée au transport et reprise conserve les réserves`,async()=>{
  const f=await transportFixture(makeStore);await f.accept();const e=await episodeHarness(f);await e.stage('PAUSE');await e.close({participantUids:[f.player.uid]});await e.resume(await e.begin());const c=await e.get(`contracts/${f.c.id}`),lots=(await f.store.list(`sessions/${e.sid}/inventory`)).filter(l=>l.transportContractId===f.c.id&&l.quantity>0);assert.equal(c.terms.transport.quantity,6);assert.equal(lots.length,1);assert.equal(lots[0].quantity,6);assert.equal((await e.get(`accounts/${shopAccountId('counter')}`)).reserved,100);
  await f.store.runTransaction(async tx=>{const path=`sessions/${e.sid}`,s=await tx.get(path),{transportVersion,...spaceOutlaws}=s.spaceOutlaws;tx.set(path,{...s,spaceOutlaws});});await assert.rejects(e.read('cargoLot',{lotId:lots[0].id},f.player),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : interruption transactionnelle conserve le stock et le compte`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await transportFixture(()=>store);fail=true;await assert.rejects(f.accept(),/INTERRUPTION/);fail=false;assert.equal((await f.source()).quantity,10);assert.equal((await f.till()).reserved,0);assert.deepEqual(await f.lots(),[]);await f.accept();assert.equal((await f.source()).quantity,4);
 });
 test(`${prefix} : retour physique avant médiation, stock restitué sans téléportation`,async()=>{
  const f=await transportFixture(makeStore,{quantity:5}),before=await f.wallet();await f.accept();await f.load();await f.arrive();await f.proof();await f.review({decision:'REJECT'});f.advance(1200000);
  const arbitrate=()=>f.confirm('prepareContractArbitration','arbitrateContract',{contractId:f.c.id,payAmount:50,reason:'Client annule après départ, fret réellement restitué'});
  await assert.rejects(arbitrate(),{code:'SO_TRANSPORT_CUSTODY'});assert.equal((await f.till()).reserved,100);
  await f.fly({navigationCode:'HOME-CODE'});f.advance(300000);let n=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation});await f.receive(await f.start((await f.lots())[0],{kind:'SHOP',id:'counter'}));await arbitrate();assert.equal((await f.source()).quantity,10);const after=await f.wallet();assert.equal(after.balance+(after.protectedCredits??0),before.balance+(before.protectedCredits??0)+50);assert.equal((await f.till()).reserved,0);assert.deepEqual(await f.lots(),[]);
 });
 test(`${prefix} : QR du port privé, lecture sans effet et régie sans secrets de navigation`,async()=>{
  const f=await transportFixture(makeStore),port={portId:'away'};await assert.rejects(f.read('cargoPort',port),{code:'FORBIDDEN'});await f.accept();
  const before=[await f.lots(),await f.wallet(),await f.till(),await f.get(`contracts/${f.c.id}`)],d=await f.read('cargoPort',port);
  assert.equal(d.contracts.length,1);assert.equal(d.contracts[0].id,f.c.id);assert.equal(d.contracts[0].delivered,0);assert.deepEqual(d.contracts[0].lots,[]);assert.doesNotMatch(JSON.stringify(d),/SECRET_|AWAY-CODE|OUT-SECRET|navigationCode|applicantUid|applicantVersion|carrierName/);
  assert.deepEqual([await f.lots(),await f.wallet(),await f.till(),await f.get(`contracts/${f.c.id}`)],before);
  for(const p of [port,{portId:'home'},{portId:'unknown'}])await assert.rejects(f.read('cargoPort',p,f.other),{code:'FORBIDDEN'});
  await assert.rejects(f.read('cargoPortAdmin',port),{code:'FORBIDDEN'});const admin=await f.read('cargoPortAdmin',port,f.owner);assert.ok(admin.contracts[0].carrierName);assert.doesNotMatch(JSON.stringify(admin),/SECRET_|AWAY-CODE|navigationCode/);assert.equal((await f.read('cargoPortAdmin',{portId:'home'},f.owner)).contracts.length,0);
  const regy=await f.read('cargoAdmin',{},f.owner);assert.ok(regy.deliveryPorts.some(p=>p.id==='away'));assert.ok(regy.deliveryPorts.every(p=>Object.keys(p).sort().join(',')==='id,name'));
 });
 test(`${prefix} : QR reçu à distance ne remplace ni voyage, présence ni limite de tranche`,async()=>{
  const f=await transportFixture(makeStore);await f.accept();await f.load();let d=await f.read('cargoPort',{portId:'away'});assert.ok(d.contracts[0].lots.every(l=>!l.canMove));
  const lot=d.contracts[0].lots[0].lot,p={portId:'away',lotId:lot.id,quantity:lot.quantity,destination:{kind:'PORT',id:'away'}};
  await assert.rejects(f.read('prepareCargoTransfer',p),{code:'FORBIDDEN'});await f.arrive();d=await f.read('cargoPort',{portId:'away'});assert.ok(d.contracts[0].lots.every(l=>l.canMove));
  const q=await f.read('prepareCargoTransfer',p);await assert.rejects(f.cmd('startCargoTransfer',{...p,confirmation:q.confirmation}),{code:'FIELD_PRESENCE_REQUIRED'});await f.cmd('startCargoTransfer',{...p,confirmation:q.confirmation,present:true});
  const current=await f.read('cargoPort',{portId:'away'});assert.ok(current.contracts[0].lots.every(l=>!l.canMove));assert.equal(current.contracts[0].transfers[0].transfer.remainingSeconds,180);assert.equal(current.contracts[0].transfers[0].canReceive,false);
 });
 test(`${prefix} : réception QR par tranches, concurrence et réessai sans salaire ni doublon`,async()=>{
  const f=await transportFixture(makeStore),wallet=await f.wallet();await f.accept();await f.load();await f.arrive();let delivered=0;
  for(const lot of await f.lots()){
   const p={portId:'away',lotId:lot.id,quantity:lot.quantity,destination:{kind:'PORT',id:'away'}},q=await f.read('prepareCargoTransfer',p),t=await f.cmd('startCargoTransfer',{...p,confirmation:q.confirmation,present:true});
   await assert.rejects(f.read('prepareCargoReceipt',{transferId:t.id,portId:'away'}),{code:'SO_CARGO_NOT_READY'});f.advance(180000);
   const view=(await f.read('cargoPort',{portId:'away'})).contracts[0].transfers[0];assert.equal(view.canReceive,true);
   const input={portId:'away',transferId:t.id,confirmation:view.confirmation,received:true,requestId:randomUUID()};await assert.rejects(f.cmd('receiveCargoTransfer',{...input,received:false}),{code:'CARGO_RECEIPT_REQUIRED'});
   const inputs=[input,{...input,requestId:randomUUID()}],results=await Promise.allSettled(inputs.map(p=>f.cmd('receiveCargoTransfer',p)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const winner=results.findIndex(r=>r.status==='fulfilled');assert.deepEqual(await f.cmd('receiveCargoTransfer',inputs[winner]),results[winner].value);
   delivered+=lot.quantity;const d=(await f.read('cargoPort',{portId:'away'})).contracts[0];assert.equal(d.delivered,delivered);assert.equal(d.complete,delivered===6);assert.equal(d.transfers.length,0);
  }
  assert.deepEqual(await f.wallet(),wallet);assert.equal((await f.till()).reserved,100);assert.equal((await f.get(`contracts/${f.c.id}`)).status,'ACTIVE');assert.equal((await f.lots()).reduce((n,l)=>n+l.quantity,0)+(await f.source()).quantity,10);
 });
 test(`${prefix} : QR d’un autre port, d’un chargement et champs injectés refusés`,async()=>{
  const f=await transportFixture(makeStore,{quantity:5});await f.accept();const lot=(await f.lots())[0],t=await f.start(lot,{kind:'HOLD',id:'ship'});f.advance(180000);
  await assert.rejects(f.read('prepareCargoReceipt',{transferId:t.id,portId:'away'}),{code:'FORBIDDEN'});await f.receive(t);await f.arrive();const p={lotId:lot.id,quantity:5,destination:{kind:'PORT',id:'away'}};
  await assert.rejects(f.read('prepareCargoTransfer',{...p,portId:'home'}),{code:'FORBIDDEN'});await assert.rejects(f.read('cargoPort',{portId:'away',admin:true}),{code:'INVALID_ADMISSION'});
  const q=await f.read('prepareCargoTransfer',{...p,portId:'away'}),u=await f.cmd('startCargoTransfer',{...p,portId:'away',confirmation:q.confirmation,present:true});f.advance(180000);const v=(await f.read('cargoPort',{portId:'away'})).contracts[0].transfers[0];
  await assert.rejects(f.cmd('receiveCargoTransfer',{portId:'home',transferId:u.id,confirmation:v.confirmation,received:true}),{code:'FORBIDDEN'});assert.equal((await f.get(`inventory/${lot.id}`)).location.kind,'HOLD');
 });
 test(`${prefix} : annulation au port conserve les tranches reçues et recommence le délai`,async()=>{
  const f=await transportFixture(makeStore);await f.accept();await f.load();await f.arrive();const lots=await f.lots();await f.receive(await f.start(lots[0],{kind:'PORT',id:'away'}));const t=await f.start(lots[1],{kind:'PORT',id:'away'});f.advance(120000);
  const v=await f.read('cargoTransfer',{transferId:t.id,portId:'away'});await f.cmd('cancelCargoTransfer',{transferId:t.id,confirmation:v.confirmation});const d=(await f.read('cargoPort',{portId:'away'})).contracts[0];assert.equal(d.delivered,lots[0].quantity);assert.equal(d.transfers.length,0);assert.equal(d.lots[0].canMove,true);
  const next=await f.start(d.lots[0].lot,{kind:'PORT',id:'away'});assert.equal((await f.read('cargoTransfer',{transferId:next.id,portId:'away'})).transfer.remainingSeconds,180);assert.equal((await f.lots()).reduce((n,l)=>n+l.quantity,0),6);
 });
 test(`${prefix} : QR suspendu en pause, STOP et décès, sans réception anticipée`,async()=>{
  const f=await transportFixture(makeStore,{quantity:5});await f.accept();await f.load();await f.arrive();const t=await f.start((await f.lots())[0],{kind:'PORT',id:'away'}),port={portId:'away'};await f.stage('PAUSE');f.advance(600000);
  let v=(await f.read('cargoPort',port)).contracts[0].transfers[0];assert.equal(v.transfer.remainingSeconds,180);assert.equal(v.canReceive,false);await f.stage('EN_JEU');f.advance(180000);await f.cmd('stopSafety',{reason:'Pause physique'});
  v=(await f.read('cargoPort',port)).contracts[0].transfers[0];assert.equal(v.canReceive,false);await assert.rejects(f.cmd('receiveCargoTransfer',{...port,transferId:t.id,confirmation:v.confirmation,received:true}),{code:'SO_SAFETY_STOP'});
  await f.cmd('resumeSafety',{revision:(await f.store.get(`sessions/${f.sid}`)).revision,reason:'Danger écarté'},f.owner);await freightEdit(f,`characters/${f.cid}`,c=>({...c,survival:{...c.survival,dead:true}}));v=(await f.read('cargoPort',port)).contracts[0].transfers[0];assert.equal(v.canReceive,false);await assert.rejects(f.cmd('receiveCargoTransfer',{...port,transferId:t.id,confirmation:v.confirmation,received:true}),{code:'OUT_OF_COMBAT'});assert.equal((await f.get(`inventory/${t.lotId}`)).status,'CARGO_RESERVED');
 });
 test(`${prefix} : affectation modifiée et accès révoqué bloquent le QR et son reçu`,async()=>{
  const f=await transportFixture(makeStore,{quantity:5});await f.accept();await f.load();await f.arrive();const t=await f.start((await f.lots())[0],{kind:'PORT',id:'away'});f.advance(180000);const v=(await f.read('cargoPort',{portId:'away'})).contracts[0].transfers[0],input={portId:'away',transferId:t.id,confirmation:v.confirmation,received:true,requestId:randomUUID()};await f.cmd('receiveCargoTransfer',input);
  await freightEdit(f,`characters/${f.cid}`,c=>({...c,public:{...c.public,displayName:'Nouvelle identité'}}));await assert.rejects(f.read('cargoPort',{portId:'away'}),{code:'FORBIDDEN'});await assert.rejects(f.read('cargoLot',{lotId:t.lotId}),{code:'FORBIDDEN'});await assert.rejects(f.cmd('receiveCargoTransfer',input),{code:'FORBIDDEN'});
  await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.read('cargoPort',{portId:'away'}),{code:'FORBIDDEN'});await assert.rejects(f.cmd('receiveCargoTransfer',input),{code:'FORBIDDEN'});
 });
 test(`${prefix} : port non publié, ancien manifeste et garde du lot refusés`,async()=>{
  const f=await transportFixture(makeStore,{quantity:5});await f.accept();await f.load();await f.arrive();const t=await f.start((await f.lots())[0],{kind:'PORT',id:'away'});f.advance(180000);const v=(await f.read('cargoPort',{portId:'away'})).contracts[0].transfers[0];
  await freightEdit(f,`inventory/${t.lotId}`,l=>({...l,quantity:l.quantity-1}));assert.equal((await f.read('cargoPort',{portId:'away'})).contracts[0].transfers[0].canReceive,false);await assert.rejects(f.cmd('receiveCargoTransfer',{portId:'away',transferId:t.id,confirmation:v.confirmation,received:true}),{code:'CARGO_TRANSFER_CLOSED'});
  await freightEdit(f,'ports/away',p=>({...p,versionId:'different'}));await assert.rejects(f.read('cargoPort',{portId:'away'}),{code:'FORBIDDEN'});await freightEdit(f,'',s=>{const {transportVersion,...spaceOutlaws}=s.spaceOutlaws;return {...s,spaceOutlaws};});await assert.rejects(f.read('cargoPort',{portId:'away'}),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : réception QR atomique après interruption transactionnelle`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await transportFixture(()=>store,{quantity:5});await f.accept();await f.load();await f.arrive();const t=await f.start((await f.lots())[0],{kind:'PORT',id:'away'});f.advance(180000);
  const v=(await f.read('cargoPort',{portId:'away'})).contracts[0].transfers[0],input={portId:'away',transferId:t.id,confirmation:v.confirmation,received:true,requestId:randomUUID()},before=[await f.lots(),await f.ship(),await f.get(`characters/${f.cid}`),await f.wallet(),await f.till()];fail=true;await assert.rejects(f.cmd('receiveCargoTransfer',input),/INTERRUPTION/);fail=false;assert.deepEqual([await f.lots(),await f.ship(),await f.get(`characters/${f.cid}`),await f.wallet(),await f.till()],before);await f.cmd('receiveCargoTransfer',input);assert.equal((await f.read('cargoPort',{portId:'away'})).contracts[0].complete,true);
 });
 test(`${prefix} : QR d’épisode repris conserve livraison partielle et réserve salariale`,async()=>{
  const f=await transportFixture(makeStore);await f.accept();await f.load();await f.arrive();const lots=await f.lots();await f.receive(await f.start(lots[0],{kind:'PORT',id:'away'}));const e=await episodeHarness(f);await e.close();await e.resume(await e.begin());await e.stage('EN_JEU');
  const d=await e.read('cargoPort',{portId:'away'},f.player);assert.equal(d.session.id,e.sid);assert.equal(d.contracts[0].delivered,lots[0].quantity);assert.equal(d.contracts[0].complete,false);assert.equal(d.contracts[0].lots[0].canMove,true);assert.equal((await e.get(`accounts/${shopAccountId('counter')}`)).reserved,100);
  const lot=d.contracts[0].lots[0].lot,p={portId:'away',lotId:lot.id,quantity:lot.quantity,destination:{kind:'PORT',id:'away'}},q=await e.read('prepareCargoTransfer',p,f.player),t=await e.cmd('startCargoTransfer',{...p,confirmation:q.confirmation,present:true},f.player);f.advance(180000);const v=(await e.read('cargoPort',{portId:'away'},f.player)).contracts[0].transfers[0];await e.cmd('receiveCargoTransfer',{portId:'away',transferId:t.id,confirmation:v.confirmation,received:true},f.player);assert.equal((await e.read('cargoPort',{portId:'away'},f.player)).contracts[0].complete,true);assert.equal((await e.get(`contracts/${f.c.id}`)).status,'ACTIVE');await assert.rejects(f.cmd('receiveCargoTransfer',{portId:'away',transferId:t.id,confirmation:v.confirmation,received:true}),{code:'FORBIDDEN'});
 });

 test(`${prefix} : obligations de fret suivent la garde réelle et les tranches reçues`,async()=>{
  const f=await transportFixture(makeStore),row=async()=>(await f.read('sessionContracts',{},f.owner)).contracts.find(c=>c.id===f.c.id).obligations;await f.accept();let o=await row();assert.equal(o.freight.inCustody,6);assert.equal(o.freight.delivered,0);await f.load();await f.arrive();const lots=await f.lots(),t=await f.start(lots[0],{kind:'PORT',id:'away'});o=await row();assert.equal(o.freight.loading,1);assert.equal(o.freight.delivered,0);await f.receive(t);o=await row();assert.equal(o.freight.delivered,lots[0].quantity);assert.equal(o.freight.inCustody,lots[1].quantity);assert.equal(o.freight.loading,0);await f.deliver();o=await row();assert.equal(o.freight.complete,true);assert.equal(o.freight.inCustody,0);assert.ok(!o.tasks.some(t=>t.kind==='FREIGHT'));assert.equal(o.salaryReserved,100);assert.equal(o.tasks[0].kind,'MISSION');assert.doesNotMatch(JSON.stringify(o),/SECRET_|navigationCode|voyageId|applicantUid/);
 });

}

async function freightEdit(f,path,change){await f.store.runTransaction(async tx=>{const key=`sessions/${f.sid}${path?'/'+path:''}`,old=await tx.get(key);tx.set(key,change(old));});}
