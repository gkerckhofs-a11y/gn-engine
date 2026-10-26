import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
import {shopAccountId,shopStockId} from '../../src/core/space-outlaws-shop-state.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
export async function transportFixture(makeStore,{quantity=6,durationMinutes=60}={}){
 const f=await soVoyagesFixture(makeStore,{prepareExtra:async(f,draftRevision)=>f.cc('saveCentralMission',{missionId:'freight',missionRevision:0,draftRevision,mission:{title:'Fournitures pour le dispensaire',description:'Livraison de fret confié',gmNotes:'SECRET_MJ',steps:[{id:'delivery',title:'Livrer les fournitures',description:'Remettre au destinataire annoncé'}],giverCharacterId:'merchant',requiredKnowledgeIds:[],rewardItems:[],conditions:'Livraison complète au port indiqué',proofExpected:'Réception contrôlée par le MJ'},reason:'Mission de transport'})});
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

}
