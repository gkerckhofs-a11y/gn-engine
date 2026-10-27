import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {transportFixture} from './space-transport-suite.mjs';
import {shopStockId,shopAccountId} from '../../src/core/space-outlaws-shop-state.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
export async function escortFixture(makeStore,{accept=false,amount=100}={}){
 const f=await transportFixture(makeStore,{quantity:5});await f.accept();await f.provision({shipId:'escort',name:'Protecteur',ownerId:f.otherId,pilotId:f.otherId});
 await f.confirm('prepareShopProvision','provisionShop',{shopId:'counter',offerId:'fuel',provisionId:randomUUID(),quantity:20,restricted:true,source:'Vingt unités de carburant existantes',reason:'Recette de provision séparée'});
 const a=await f.confirm('prepareAnnouncement','saveAnnouncement',{missionId:'freight',revision:0,title:'Protection du dispensaire',description:'Accompagner le fret',category:'ESCORT',mode:'ASSIGNMENT',participation:'PERSONAL',sponsorKind:'NPC',sponsorName:'Dispensaire',rewardType:'FIXED',rewardText:'100 Cr + carburant',places:1,conditions:'Protection raisonnable, sans sacrifice imposé',proofExpected:'Service et livraison vérifiés par MJ',briefing:'SECRET_ESCORT_BRIEFING',gmNotes:'SECRET_MJ_ESCORT',publication:'PUBLISHED',opensAt:0,deadline:8640000000000000,audience:{kind:'ALL',characterIds:[],groupIds:[]},reason:'Contrat distinct du fret'});
 const application=await f.confirm('prepareAnnouncementResponse','respondAnnouncement',{announcementId:a.id,intent:'APPLICATION',body:'Je protège le cargo'},f.other);
 const {transport,...base}=f.input,p={...base,applicationId:application.id,amount,escort:{transportContractId:f.c.id,shipId:'escort',returnRouteId:'back',expenses:'Client : carburant normal aller-retour ; escorteur : réparations et remorquage sauf accord ultérieur.'}};
 const c=await f.confirm('prepareMissionContract','proposeMissionContract',p),acceptEscort=()=>f.confirm('prepareContractAcceptance','acceptContract',{contractId:c.id},f.other);
 const detail=(actor=f.other)=>f.read(actor===f.owner?'sessionContract':'contractDetail',{contractId:c.id},actor);
 const fuel=async(quantity=4,finish=true)=>{const p={contractId:c.id,shopId:'counter',offerId:'fuel',quantity},q=await f.read('prepareEscortRefuel',p,f.other),r=await f.cmd('startEscortRefuel',{...p,confirmation:q.confirmation,present:true},f.other);if(finish){f.advance(120000);await f.navCommand('finishSoRefuel',{shipId:'escort'},f.other);}return r;};
 const form=async()=>{const p={shipId:'ship',escortShipId:'escort',navigationCode:'AWAY-CODE'},q=await f.read('prepareSoConvoy',p);await f.cmd('proposeSoConvoy',{...p,confirmation:q.confirmation});const o=(await f.navigation('escort',f.other)).invitations[0];await f.cmd('acceptSoConvoy',{shipId:'escort',leaderShipId:'ship',confirmation:o.confirmation},f.other);};
 const launch=async()=>{await f.load();await form();await f.startFlight();await f.startFlight({shipId:'escort'},f.other);f.advance(180000);await f.navCommand('finishSoPreparation');f.setDice([6,6,1]);await f.navCommand('finishSoPreparation',{shipId:'escort'},f.other);};
 const deliver=async()=>{f.advance(300000);const q=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:q.confirmation});await f.deliver();};
 const proof=()=>f.confirm('prepareContractProof','submitContractProof',{contractId:c.id,body:'Preuve du service de protection soumise au MJ',completedStepIds:['delivery']},f.other);
 const review=(outcome='DELIVERED',patch={})=>f.confirm('prepareContractReview','reviewContract',{contractId:c.id,decision:['DELIVERED','DEFENDED'].includes(outcome)?'PAY':'REJECT',escortOutcome:outcome,protectionConfirmed:true,faultConfirmed:true,reason:'Service, circonstances et issue vérifiés physiquement par le MJ',...patch});
 const settle=()=>f.confirm('prepareContractSettlement','settleContract',{contractId:c.id,reason:'Dix minutes de contestation écoulées'});
 const release=(admin=false)=>f.confirm(admin?'prepareEscortFuelReleaseAdmin':'prepareEscortFuelRelease',admin?'releaseEscortFuelAdmin':'releaseEscortFuel',{contractId:c.id,reason:'Restitution de la provision financière non utilisée'},admin?f.owner:f.other);
 const close=()=>f.confirm('prepareContractClosure','closeContract',{contractId:c.id,decision:'CANCEL',notStarted:true,reason:'Service non commencé'});
 const get=f.get,edit=(p,fn)=>f.store.runTransaction(async tx=>{const x=await tx.get(`sessions/${f.sid}${p?'/'+p:''}`);tx.set(`sessions/${f.sid}${p?'/'+p:''}`,fn(x));});
 if(accept)await acceptEscort();
 return {...f,ec:c,ea:a,ep:p,acceptEscort,detail,fuel,form,launch,deliverEscort:deliver,escortProof:proof,escortReview:review,settleEscort:settle,releaseFuel:release,closeEscort:close,edit,escort:()=>get('ships/escort'),fuelStock:()=>get(`inventory/${shopStockId('fuel')}`),escortWallet:()=>get(`accounts/${accountId(f.otherId)}`)};
}
export function spaceEscortSuite(makeStore,prefix='Escortes SO'){
 test(`${prefix} : contrat distinct, salaire et provision réservés une fois, aucun secret de soute`,async()=>{
  const f=await escortFixture(makeStore);assert.equal((await f.till()).reserved,100);const q=await f.read('prepareContractAcceptance',{contractId:f.ec.id},f.other),p={contractId:f.ec.id,confirmation:q.confirmation,requestId:randomUUID()},r=await f.cmd('acceptContract',p,f.other);assert.deepEqual(await f.cmd('acceptContract',p,f.other),r);assert.equal((await f.till()).reserved,300);const d=await f.detail();assert.equal(d.contract.terms.escort.referenceSalary,100);assert.equal(d.escort.fuel.remaining,100);assert.equal(d.escort.fuel.units,0);assert.equal((await f.escort()).fuel,0);assert.doesNotMatch(JSON.stringify(d),/SECRET_MJ|SECRET_ORGANISATION|SECRET_BRIEFING|kit_medical|transportManifest|lotIds/);await assert.rejects(f.read('contractDetail',{contractId:f.c.id},f.other),{code:'FORBIDDEN'});await assert.rejects(f.detail(f.player),{code:'FORBIDDEN'});
 });
 test(`${prefix} : plein réel de deux minutes, stock et budget, aucun versement au pilote`,async()=>{
  const f=await escortFixture(makeStore,{accept:true}),w=await f.escortWallet(),b=await f.till();await f.fuel(2,false);assert.equal((await f.fuelStock()).quantity,18);assert.equal((await f.till()).reserved,300);await assert.rejects(f.navCommand('finishSoRefuel',{shipId:'escort'},f.other),{code:'VOYAGE_NOT_READY'});f.advance(120000);const n=await f.navigation('escort',f.other),p={shipId:'escort',confirmation:n.confirmation,present:true,requestId:randomUUID()},r=await f.cmd('finishSoRefuel',p,f.other);assert.deepEqual(await f.cmd('finishSoRefuel',p,f.other),r);assert.equal((await f.escort()).fuel,2);assert.equal((await f.till()).reserved,250);assert.equal((await f.till()).balance,b.balance);assert.equal((await f.detail()).escort.fuel.spent,50);assert.deepEqual(await f.escortWallet(),w);assert.equal((await f.points(f.other)).available,5);
 });
 test(`${prefix} : interruption du plein restitue uniquement le stock réservé, salaire intact`,async()=>{
  const f=await escortFixture(makeStore,{accept:true});await f.fuel(3,false);await assert.rejects(f.releaseFuel(),{code:'SPACE_SHIP_BUSY'});await assert.rejects(f.closeEscort(),{code:'SPACE_SHIP_BUSY'});const n=await f.navigation('escort',f.other);await f.cmd('cancelSoNavigation',{shipId:'escort',confirmation:n.confirmation,reason:'Interruption constatée'},f.other);assert.equal((await f.fuelStock()).quantity,20);assert.equal((await f.detail()).escort.fuel.remaining,100);assert.equal((await f.escort()).fuel,0);assert.equal((await f.till()).reserved,300);
 });
 test(`${prefix} : reliquat financier rendu sans retirer le carburant déjà transféré`,async()=>{
  const f=await escortFixture(makeStore,{accept:true});await f.fuel(2);await f.releaseFuel();assert.equal((await f.escort()).fuel,2);assert.equal((await f.till()).reserved,200);assert.equal((await f.detail()).escort.fuel.released,50);await assert.rejects(f.fuel(1),{code:'SO_ESCORT_FUEL_CLOSED'});
 });
 test(`${prefix} : livraison, dix minutes, salaire plein et retour distinct`,async()=>{
  const f=await escortFixture(makeStore,{accept:true}),w=await f.escortWallet();await f.fuel();await f.launch();await f.deliverEscort();assert.equal((await f.detail()).escort.evidence.delivered,true);await f.escortProof();await f.escortReview();await assert.rejects(f.settleEscort(),{code:'SO_CONTEST_OPEN'});f.advance(600000);await f.settleEscort();assert.equal((await f.escortWallet()).balance,w.balance+100);assert.equal((await f.till()).reserved,100);assert.equal((await f.get(`contracts/${f.c.id}`)).status,'ACTIVE');assert.equal((await f.escort()).fuel,2);
 });
 test(`${prefix} : défense réelle sans livraison, moitié libre puis médiation sur le solde`,async()=>{
  const f=await escortFixture(makeStore,{accept:true,amount:101}),w=await f.escortWallet();await f.fuel();await f.launch();await f.escortProof();await f.escortReview('DEFENDED');assert.equal((await f.detail()).settlement.disputed,50);f.advance(600000);await f.settleEscort();assert.equal((await f.escortWallet()).balance,w.balance+51);await assert.rejects(f.confirm('prepareContractArbitration','arbitrateContract',{contractId:f.ec.id,payAmount:0,reason:'Défense reconnue, mission perdue'}),{code:'SO_MEDIATION_OPEN'});f.advance(600000);await f.confirm('prepareContractArbitration','arbitrateContract',{contractId:f.ec.id,payAmount:0,reason:'Défense reconnue, mission perdue'});assert.equal((await f.till()).reserved,100);assert.equal((await f.detail()).contract.status,'SETTLED');
 });
 test(`${prefix} : faute motivée, zéro salaire après médiation, pas de pénalité supplémentaire`,async()=>{
  const f=await escortFixture(makeStore,{accept:true}),w=await f.escortWallet();await f.fuel();await f.launch();await f.escortProof();await assert.rejects(f.escortReview('FAULT',{faultConfirmed:false}),{code:'SO_ESCORT_OUTCOME'});await f.escortReview('FAULT');f.advance(1200000);await f.confirm('prepareContractArbitration','arbitrateContract',{contractId:f.ec.id,payAmount:0,reason:'Trahison constatée et motivée, responsabilité limitée au salaire'});assert.deepEqual(await f.escortWallet(),w);assert.equal((await f.till()).reserved,100);
 });
 test(`${prefix} : déclaration seule ne prouve ni départ, ni livraison, ni défense`,async()=>{
  const f=await escortFixture(makeStore,{accept:true});await f.escortProof();await assert.rejects(f.escortReview(),{code:'SO_ESCORT_EVIDENCE'});await assert.rejects(f.escortReview('DEFENDED'),{code:'SO_ESCORT_EVIDENCE'});await f.escortReview('NOT_STARTED');
 });
 test(`${prefix} : fermeture avant départ libère deux réserves, après départ exige arbitrage`,async()=>{
  const f=await escortFixture(makeStore,{accept:true});await f.fuel(2);await f.closeEscort();assert.equal((await f.till()).reserved,100);assert.equal((await f.escort()).fuel,2);assert.equal((await f.detail()).escort.fuel.released,50);
  const g=await escortFixture(makeStore,{accept:true});await g.fuel();await g.launch();await assert.rejects(g.closeEscort(),{code:'SO_ESCORT_STARTED'});
 });
 test(`${prefix} : fonds insuffisants empêchent la signature sans réservation partielle`,async()=>{
  const f=await escortFixture(makeStore);await f.edit(`accounts/${(await f.till()).id}`,x=>({...x,balance:x.reserved+199,revision:x.revision+1}));await assert.rejects(f.acceptEscort(),{code:'INSUFFICIENT_FUNDS'});assert.equal((await f.till()).reserved,100);
 });
 test(`${prefix} : mauvais trajet, pilote et termes injectés refusés`,async()=>{
  const f=await escortFixture(makeStore);await f.cmd('declineContract',{contractId:f.ec.id,revision:1},f.other);
  for(const [patch,code] of [[{shipId:'ship'},'SO_ESCORT_SHIP'],[{returnRouteId:'out'},'SO_ESCORT_ROUTE'],[{fuelBudget:0},'INVALID_ADMISSION']])await assert.rejects(f.read('prepareMissionContract',{...f.ep,escort:{...f.ep.escort,...patch}},f.owner),{code});
 });
 test(`${prefix} : comptoir de carburant distinct crédité au réel, aucun crédit créé`,async()=>{
  const f=await escortFixture(makeStore,{accept:true}),before=await f.till(),other=shopAccountId('pump');
  // A second prepared shop is synthetic fixture data; purchase and transfer use native commands.
  await f.store.runTransaction(async tx=>{const b=`sessions/${f.sid}`,shop=await tx.get(`${b}/shops/counter`),offer=await tx.get(`${b}/shops/counter/offers/fuel`),lot=await tx.get(`${b}/inventory/${shopStockId('fuel')}`);tx.set(`${b}/shops/pump`,{...shop,id:'pump',name:'Pompe indépendante'});tx.set(`${b}/shops/pump/offers/pump-fuel`,{...offer,id:'pump-fuel',shopId:'pump'});tx.set(`${b}/inventory/${shopStockId('pump-fuel')}`,{...lot,id:shopStockId('pump-fuel'),ownerId:'pump',location:{kind:'SHOP',id:'pump'},quantity:3});tx.set(`${b}/accounts/${other}`,{...before,id:other,shopId:'pump',balance:0,reserved:0,revision:1});});
  const p={contractId:f.ec.id,shopId:'pump',offerId:'pump-fuel',quantity:3},q=await f.read('prepareEscortRefuel',p,f.other);await f.cmd('startEscortRefuel',{...p,confirmation:q.confirmation,present:true},f.other);f.advance(120000);await f.navCommand('finishSoRefuel',{shipId:'escort'},f.other);assert.equal((await f.till()).balance,before.balance-75);assert.equal((await f.get(`accounts/${other}`)).balance,75);assert.equal((await f.escort()).fuel,3);assert.equal((await f.detail()).escort.fuel.remaining,25);
 });
 test(`${prefix} : un cargo parti sans fret ne justifie pas le salaire de protection`,async()=>{
  const f=await escortFixture(makeStore,{accept:true});await f.fuel();await f.form();await f.startFlight();await f.startFlight({shipId:'escort'},f.other);f.advance(180000);await f.navCommand('finishSoPreparation');f.setDice([6,6,1]);await f.navCommand('finishSoPreparation',{shipId:'escort'},f.other);assert.equal((await f.detail()).escort.evidence.freightEmbarked,false);await assert.rejects(f.closeEscort(),{code:'SO_ESCORT_STARTED'});await f.escortProof();await assert.rejects(f.escortReview('DEFENDED'),{code:'SO_ESCORT_EVIDENCE'});
 });
 test(`${prefix} : concurrence du plein et révocation avant reçu ne doublent ni stock ni crédits`,async()=>{
  const f=await escortFixture(makeStore,{accept:true}),p={contractId:f.ec.id,shopId:'counter',offerId:'fuel',quantity:4},q=await f.read('prepareEscortRefuel',p,f.other),input={...p,confirmation:q.confirmation,present:true,requestId:randomUUID()};const rs=await Promise.allSettled([f.cmd('startEscortRefuel',input,f.other),f.cmd('startEscortRefuel',{...input,requestId:randomUUID()},f.other)]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.fuelStock()).quantity,16);await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.cmd('startEscortRefuel',input,f.other),{code:'FORBIDDEN'});const n=(await f.read('spaceportAdmin',{},f.owner)).ships.find(x=>x.shipId==='escort');await f.cmd('cancelSoNavigationAdmin',{shipId:'escort',confirmation:n.confirmation,reason:'Accès retiré pendant le plein'},f.owner);assert.equal((await f.fuelStock()).quantity,20);
 });
 test(`${prefix} : anciens manifestes fermés, STOP et paramètres de carburant stricts`,async()=>{
  const f=await escortFixture(makeStore,{accept:true});await assert.rejects(f.read('prepareEscortRefuel',{contractId:f.ec.id,shopId:'counter',offerId:'fuel',quantity:1,price:0},f.other),{code:'INVALID_ADMISSION'});await f.edit('',s=>({...s,safetyStop:{active:true}}));await assert.rejects(f.fuel(),{code:'SO_SAFETY_STOP'});await f.edit('',s=>{const {escortVersion,...spaceOutlaws}=s.spaceOutlaws;return {...s,safetyStop:{active:false},spaceOutlaws};});await assert.rejects(f.detail(),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : provision et salaire persistent entre épisodes sans recharge`,async()=>{
  const f=await escortFixture(makeStore,{accept:true});await f.fuel(2);const h=await episodeHarness(f),pre=await f.till();await h.close();const resumed=await h.resume(await h.begin());const c=await f.store.get(`sessions/${resumed.id}/contracts/${f.ec.id}`),ship=await f.store.get(`sessions/${resumed.id}/ships/escort`);assert.equal(c.escortFuel.remaining,50);assert.equal(c.escortFuel.spent,50);assert.equal(ship.fuel,2);assert.equal((await f.store.get(`sessions/${resumed.id}/accounts/${pre.id}`)).reserved,pre.reserved);
 });
 test(`${prefix} : salaire réglé garde le budget retour et empêche une fin abandonnant les réserves`,async()=>{
  const f=await escortFixture(makeStore,{accept:true});await f.close();await f.escortProof();await f.escortReview('NOT_STARTED');f.advance(1200000);await f.confirm('prepareContractArbitration','arbitrateContract',{contractId:f.ec.id,payAmount:0,reason:'Aucun départ, aucun salaire'});assert.equal((await f.detail()).escort.fuel.remaining,100);await assert.rejects(f.stage('FINISHED'),{code:'CONTRACTS_OPEN'});await f.releaseFuel(true);assert.equal((await f.till()).reserved,0);await f.stage('FINISHED');
 });
 test(`${prefix} : échec transactionnel du plein ne consomme aucune provision`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})};const f=await escortFixture(()=>store,{accept:true});await f.fuel(4,false);f.advance(120000);const n=await f.navigation('escort',f.other),p={shipId:'escort',confirmation:n.confirmation,present:true,requestId:randomUUID()};fail=true;await assert.rejects(f.cmd('finishSoRefuel',p,f.other),/INTERRUPTION/);fail=false;assert.equal((await f.escort()).fuel,0);assert.equal((await f.detail()).escort.fuel.remaining,100);await f.cmd('finishSoRefuel',p,f.other);assert.equal((await f.escort()).fuel,4);assert.equal((await f.detail()).escort.fuel.remaining,0);
 });
}
