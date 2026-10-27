import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {escortFixture} from './space-escort-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';

export async function amendmentFixture(makeStore,{amount=100,...options}={}){
 const f=await escortFixture(makeStore,{accept:true,amount,prepareExtra:async(f,revision)=>{
  for(const id of ['stop','far','side'])await f.cc('saveCentralPort',{portId:id,portRevision:0,draftRevision:revision++,port:{name:`Escale ${id}`,description:'Escale préparée',gmNotes:'SECRET_ESCALE',navigationCode:`${id.toUpperCase()}-CODE`,locationTargetId:null},reason:'Liaisons du détour'});
  for(const [id,fromPort,toPort] of [['via1','home','stop'],['alt1','home','stop'],['via2','stop','away'],['via3','stop','far'],['via4','far','away'],['via5','far','side'],['via6','side','away'],['loop1','away','far']])await f.cc('saveCentralRoute',{routeId:id,routeRevision:0,draftRevision:revision++,route:{name:`Liaison ${id}`,description:'Liaison publiée',gmNotes:'SECRET_LIAISON',fromPort,toPort,navigationCode:`${id.toUpperCase()}-CODE`,distanceId:'SHORT',riskId:'SECURED'},reason:'Détour réellement navigable'});
 }});
 const input={contractId:f.ec.id,routeIds:['via1','via2'],overCapApproved:false,approvalReason:'',reason:'Le client demande une escale supplémentaire',...options};
 const propose=(patch={})=>f.confirm('prepareEscortAmendmentAdmin','proposeEscortAmendmentAdmin',{...input,...patch});
 const response=(escort=true,decision='ACCEPT')=>f.confirm(escort?'prepareEscortAmendmentResponse':'prepareTransportAmendmentResponse',escort?'respondEscortAmendment':'respondTransportAmendment',{contractId:escort?f.ec.id:f.c.id,decision,reason:decision==='ACCEPT'?'Trajet supplémentaire accepté':'Détour refusé ; séparation au port sûr'},escort?f.other:f.player);
 const cancel=()=>f.confirm('prepareEscortAmendmentCancelAdmin','cancelEscortAmendmentAdmin',{contractId:f.ec.id,reason:'Demande client retirée'});
 const flight=async(code)=>{
  if(!(await f.ship()).convoy){const p={shipId:'ship',escortShipId:'escort',navigationCode:code},q=await f.read('prepareSoConvoy',p);await f.cmd('proposeSoConvoy',{...p,confirmation:q.confirmation});const invitation=(await f.navigation('escort',f.other)).invitations[0];await f.cmd('acceptSoConvoy',{shipId:'escort',leaderShipId:'ship',confirmation:invitation.confirmation},f.other);}
  for(const [shipId,actor] of [['ship',f.player],['escort',f.other]])await f.startFlight({shipId,navigationCode:code},actor);
  f.advance(180000);await f.navCommand('finishSoPreparation');f.setDice([6,6,1]);await f.navCommand('finishSoPreparation',{shipId:'escort'},f.other);f.advance(300000);const n=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation});
 };
 return {...f,input,proposeAmendment:propose,respondAmendment:response,cancelAmendment:cancel,flight};
}

export function spaceEscortAmendmentsSuite(makeStore,prefix='Avenants escorte SO'){
 test(`${prefix} : deux consentements, réserves séparées et arrondi sur salaire initial`,async()=>{
  const f=await amendmentFixture(makeStore,{amount:101}),before=await f.till(),wallet=await f.escortWallet();await f.proposeAmendment();await f.respondAmendment(false);
  assert.equal((await f.till()).reserved,before.reserved);assert.equal((await f.detail()).contract.terms.amount,101);
  await f.respondAmendment();const d=await f.detail();assert.equal(d.contract.terms.amount,126);assert.equal(d.escort.fuel.budget,150);assert.equal((await f.till()).reserved,before.reserved+75);assert.equal((await f.till()).balance,before.balance);assert.equal((await f.escort()).fuel,0);assert.deepEqual(await f.escortWallet(),wallet);
  assert.deepEqual((await f.get(`contracts/${f.c.id}`)).transportPlan.routes.map(r=>r.id),['via1','via2']);assert.equal(d.amendment.proposal.status,'ACCEPTED');
 });
 test(`${prefix} : le fret suit chaque liaison et seul le port initial valide la livraison`,async()=>{
  const f=await amendmentFixture(makeStore);await f.form();await f.proposeAmendment();await f.respondAmendment();await f.respondAmendment(false);assert.equal((await f.ship()).convoy.routeId,'via1');assert.equal((await f.escort()).convoy.routeId,'via1');await f.fuel(6);await f.refuel(2);await f.load();assert.equal((await f.detail()).escort.navigationCode,'VIA1-CODE');
  await assert.rejects(f.startFlight(),{code:'SO_CONVOY_ROUTE'});await f.flight('VIA1-CODE');assert.equal((await f.ship()).portId,'stop');assert.equal((await f.detail()).escort.navigationCode,'VIA2-CODE');
  const lot=(await f.lots())[0];await assert.rejects(f.start(lot,{kind:'PORT',id:'away'}));assert.equal((await f.view()).transport.complete,false);
  await f.flight('AWAY-CODE');await f.deliver();assert.equal((await f.view()).transport.complete,true);assert.equal((await f.detail()).escort.evidence.delivered,true);
  const freight=(await f.lots())[0];assert.notEqual(freight.transportVoyageId,freight.transportLastVoyageId);assert.equal(freight.transportLegIndex,2);assert.equal(freight.ownerType,'SHOP');
  const wallet=await f.escortWallet();await f.escortProof();await f.escortReview();f.advance(600000);await f.settleEscort();assert.equal((await f.escortWallet()).balance,wallet.balance+125);
 });
 test(`${prefix} : deuxième avenant non composé, plafond et accord MJ explicite`,async()=>{
  const f=await amendmentFixture(makeStore,{amount:101});await f.proposeAmendment();await f.respondAmendment();await f.respondAmendment(false);
  await f.proposeAmendment({routeIds:['via1','via3','via4']});await f.respondAmendment();await f.respondAmendment(false);assert.equal((await f.detail()).contract.terms.amount,152);
  await assert.rejects(f.proposeAmendment({routeIds:['via1','via3','via5','via6']}));
  await f.proposeAmendment({routeIds:['via1','via3','via5','via6'],overCapApproved:true,approvalReason:'Troisième tronçon supplémentaire autorisé explicitement par le MJ'});await f.respondAmendment();await f.respondAmendment(false);assert.equal((await f.detail()).contract.terms.amount,177);
 });
 test(`${prefix} : refus avant départ conserve contrat, route, salaire et budgets`,async()=>{
  const f=await amendmentFixture(makeStore),b=await f.till();await f.proposeAmendment();await f.respondAmendment(true,'REFUSE');const d=await f.detail();assert.equal(d.amendment.proposal.status,'REFUSED');assert.equal(d.amendment.separation,null);assert.equal(d.contract.terms.amount,100);assert.deepEqual(await f.till(),b);assert.equal((await f.get(`contracts/${f.c.id}`)).transportPlan,undefined);
 });
 test(`${prefix} : refus après départ, séparation sûre et moitié du salaire initial`,async()=>{
  const f=await amendmentFixture(makeStore,{amount:101});await f.proposeAmendment();await f.respondAmendment();await f.respondAmendment(false);await f.fuel(6);await f.refuel(2);await f.load();await f.flight('VIA1-CODE');
  // Re-form the convoy at the safe stop, then refuse the new client request.
  await f.form();await f.proposeAmendment({routeIds:['via3','via4']});await f.respondAmendment(true,'REFUSE');const d=await f.detail();assert.equal((await f.ship()).convoy,null);assert.equal((await f.escort()).convoy,null);assert.equal(d.amendment.separation.portId,'stop');assert.equal(d.amendment.separation.award,51);assert.equal(d.contract.terms.amount,126);assert.equal((await f.escort()).fuel,4);
  const wallet=await f.escortWallet();await f.escortProof();await f.confirm('prepareContractReview','reviewContract',{contractId:f.ec.id,decision:'PAY',escortOutcome:'DETOUR_REFUSED',reason:'Séparation sûre après refus constatée'});f.advance(600000);await f.settleEscort();assert.equal((await f.escortWallet()).balance,wallet.balance+51);assert.equal((await f.get(`contracts/${f.c.id}`)).status,'ACTIVE');
  await assert.rejects(f.proposeAmendment(),{code:'SO_AMENDMENT_UNAVAILABLE'});
 });
 test(`${prefix} : refus du cargo et retrait MJ ne créent ni salaire ni séparation`,async()=>{
  const f=await amendmentFixture(makeStore),b=await f.till();await f.proposeAmendment();await f.respondAmendment(false,'REFUSE');assert.equal((await f.detail()).amendment.separation,null);await f.proposeAmendment();await f.cancelAmendment();assert.equal((await f.detail()).amendment.proposal.status,'CANCELLED');assert.deepEqual(await f.till(),b);
 });
 test(`${prefix} : route discontinue, mauvaise destination et montant injecté refusés`,async()=>{
  const f=await amendmentFixture(makeStore);for(const routeIds of [['via2'],['via1'],['via1','via1'],['inconnue']])await assert.rejects(f.proposeAmendment({routeIds}));
  await assert.rejects(f.read('prepareEscortAmendmentAdmin',{...f.input,newSalary:0},f.owner),{code:'INVALID_ADMISSION'});await assert.rejects(f.proposeAmendment({routeIds:['out']}),{code:'SO_AMENDMENT_ROUTE'});
 });
 test(`${prefix} : le pilote cargo ne voit ni salaire, ni budget, ni briefing de l’escorte`,async()=>{
  const f=await amendmentFixture(makeStore);await f.proposeAmendment();const d=await f.view();assert.ok(d.amendment.canRespond);assert.equal(d.amendment.proposal.newSalary,undefined);assert.equal(d.amendment.proposal.addedFuelBudget,undefined);assert.doesNotMatch(JSON.stringify(d),/SECRET_ESCORT_BRIEFING|SECRET_MJ_ESCORT|SECRET_ESCALE|SECRET_LIAISON|contextGuard|routeGuard/);
  await assert.rejects(f.read('prepareEscortAmendmentResponse',{contractId:f.ec.id,decision:'ACCEPT',reason:'Usurpation'},f.player),{code:'FORBIDDEN'});await assert.rejects(f.read('prepareEscortAmendmentAdmin',f.input,f.other),{code:'FORBIDDEN'});
 });
 test(`${prefix} : aucun départ ou plein changé entre deux consentements n’est accepté`,async()=>{
  const f=await amendmentFixture(makeStore);await f.proposeAmendment();await f.respondAmendment(false);await f.fuel(2);await assert.rejects(f.respondAmendment(),{code:'SO_AMENDMENT_STALE'});assert.equal((await f.detail()).contract.terms.amount,100);await f.cancelAmendment();await f.proposeAmendment();await f.respondAmendment();await f.respondAmendment(false);
 });
 test(`${prefix} : fonds insuffisants au deuxième accord, aucune mutation partielle`,async()=>{
  const f=await amendmentFixture(makeStore);await f.proposeAmendment();await f.respondAmendment(false);const b=await f.till();await f.edit(`accounts/${b.id}`,a=>({...a,balance:a.reserved,revision:a.revision+1}));await assert.rejects(f.respondAmendment(),{code:'INSUFFICIENT_FUNDS'});assert.equal((await f.till()).reserved,b.reserved);assert.equal((await f.detail()).amendment.proposal.accepted.escort,false);
 });
 test(`${prefix} : révocation du premier signataire bloque le second accord`,async()=>{
  const f=await amendmentFixture(makeStore);await f.proposeAmendment();await f.respondAmendment(false);const b=await f.till();await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.respondAmendment(),{code:'FORBIDDEN'});assert.equal((await f.till()).reserved,b.reserved);assert.equal((await f.get(`contracts/${f.ec.id}`)).terms.amount,100);
 });
 test(`${prefix} : concurrence et reçu ne réservent qu’une fois, révocation avant reçu`,async()=>{
  const f=await amendmentFixture(makeStore);await f.proposeAmendment();await f.respondAmendment(false);const input={contractId:f.ec.id,decision:'ACCEPT',reason:'Accord explicite'},q=await f.read('prepareEscortAmendmentResponse',input,f.other),p={...input,confirmation:q.confirmation,requestId:randomUUID()},b=await f.till();
  const attempts=[p,{...p,requestId:randomUUID()}],r=await Promise.allSettled(attempts.map(a=>f.cmd('respondEscortAmendment',a,f.other)));const winner=r.findIndex(x=>x.status==='fulfilled');assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.till()).reserved,b.reserved+75);assert.deepEqual(await f.cmd('respondEscortAmendment',attempts[winner],f.other),r[winner].value);
  await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.cmd('respondEscortAmendment',attempts[winner],f.other),{code:'FORBIDDEN'});
 });
 test(`${prefix} : anciennes versions fermées, STOP et proposition en vol refusés`,async()=>{
  const f=await amendmentFixture(makeStore);await f.edit('',s=>{const {escortAmendmentVersion,...spaceOutlaws}=s.spaceOutlaws;return {...s,spaceOutlaws};});assert.equal((await f.detail()).amendment,null);await assert.rejects(f.proposeAmendment(),{code:'SO_GAMEPLAY_NOT_OPEN'});
  const g=await amendmentFixture(makeStore);await g.fuel();await g.launch();await assert.rejects(g.proposeAmendment(),{code:'SO_AMENDMENT_PORT'});await g.cmd('stopSafety',{reason:'Sécurité'});await assert.rejects(g.proposeAmendment(),{code:'SO_SAFETY_STOP'});
 });
 test(`${prefix} : parcours et provision conservés après reprise d’épisode`,async()=>{
  const f=await amendmentFixture(makeStore);await f.proposeAmendment();await f.respondAmendment();await f.respondAmendment(false);const e=await episodeHarness(f),before=await f.till();await e.close();await e.resume(await e.begin());const c=await e.get(`contracts/${f.ec.id}`);assert.equal(c.terms.amount,125);assert.equal(c.escortFuel.remaining,150);assert.equal((await e.get(`accounts/${before.id}`)).reserved,before.reserved);assert.deepEqual((await e.get(`contracts/${f.c.id}`)).transportPlan.routes.map(r=>r.id),['via1','via2']);
 });
 test(`${prefix} : interruption transactionnelle du second accord ne modifie rien`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await amendmentFixture(()=>store);await f.proposeAmendment();await f.respondAmendment(false);const b=await f.till();fail=true;await assert.rejects(f.respondAmendment(),/INTERRUPTION/);fail=false;assert.deepEqual(await f.till(),b);assert.equal((await f.detail()).contract.terms.amount,100);await f.respondAmendment();assert.equal((await f.detail()).contract.terms.amount,125);
 });
}
