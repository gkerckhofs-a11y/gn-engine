import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {shopsFixture} from './space-outlaws-shops-suite.mjs';
import {centralTestItem} from './central-master-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';

export async function soVoyagesFixture(makeStore,{profileId='CARGO',riskId='SECURED',distanceId='SHORT',release=true,prepareExtra=null,departureCode='AWAY-CODE'}={}){
 const f=await shopsFixture(makeStore,{classId:'PIL',release:false}),read=f.actionRead,cmd=f.actionCmd;let revision=(await f.view()).draft.revision;
 // The shop fixture references a medical supply: prepare it explicitly for this pilot fixture.
 await f.cc('saveCentralItem',{itemId:'kit_medical-supplies',itemRevision:0,draftRevision:revision++,item:{...centralTestItem,name:'Fourniture de soins',kind:'STACKABLE',consumable:true,pillable:true},reason:'Offre de soins'});
 await f.cc('saveCentralItem',{itemId:'propellant',itemRevision:0,draftRevision:revision++,item:{...centralTestItem,name:'Carburant propulsif',kind:'STACKABLE',consumable:true,pillable:true},reason:'Réserve réelle de carburant'});
 await f.cc('saveCentralOffer',{offerId:'fuel',offerRevision:0,draftRevision:revision++,offer:{name:'Carburant',shopId:'counter',itemId:'propellant',unitPrice:25,buybackPrice:null,conditions:'Remise physique',gmNotes:'SECRET_FUEL'},reason:'Prix V0.7'});
 await f.cc('saveCentralShipModel',{shipModelId:'model',shipModelRevision:0,draftRevision:revision++,shipModel:{name:'Modèle de vol',description:'Coque standard',gmNotes:'SECRET_MODEL',profileId},reason:'Modèle V0.7'});
 for(const [portId,navigationCode] of [['home','HOME-CODE'],['away','AWAY-CODE']])await f.cc('saveCentralPort',{portId,portRevision:0,draftRevision:revision++,port:{name:portId,description:'Port',gmNotes:'SECRET_PORT',navigationCode,locationTargetId:null},reason:'Port préparé'});
 for(const [routeId,fromPort,toPort,navigationCode] of [['out','home','away','OUT-SECRET'],['back','away','home','BACK-SECRET']])await f.cc('saveCentralRoute',{routeId,routeRevision:0,draftRevision:revision++,route:{name:routeId,description:'Liaison',gmNotes:'SECRET_ROUTE',fromPort,toPort,navigationCode,distanceId,riskId},reason:'Liaison préparée'});
 if(prepareExtra)await prepareExtra(f,revision);
 let cid,otherId;
 const provisionInput=(patch={})=>({shipId:'ship',modelId:'model',name:'Nom du vaisseau',ownerId:cid,pilotId:cid,homePort:'home',fuelItemId:'propellant',source:'Vaisseau existant du scénario autorisé',reason:'Attribution MJ documentée',...patch});
 const provision=async(patch={},actor=f.owner)=>{const input=provisionInput(patch),p=await read('prepareSoShip',input,actor);return cmd('provisionSoShip',{...input,confirmation:p.confirmation},actor);};
 const navigation=(shipId='ship',actor=f.player)=>read('shipNavigation',{shipId},actor);
 const command=async(action,patch={},actor=f.player)=>{const shipId=patch.shipId??'ship',p=actor===f.owner?(await read('spaceportAdmin',{},actor)).ships.find(x=>x.shipId===shipId):await navigation(shipId,actor);return cmd(action,{shipId,present:true,confirmation:p.confirmation,...patch},actor);};
 const refuel=async(quantity,shipId='ship')=>{const lot=(await read('myInventory')).lots.find(l=>l.item.id==='propellant');const input={shipId,lotId:lot.id,quantity},p=await read('prepareRefuel',input);await cmd('refuelShip',{...input,present:true,confirmation:p.confirmation});f.advance(120000);return command('finishSoRefuel',{shipId});};
 const startFlight=async(patch={},actor=f.player)=>{const input={shipId:'ship',navigationCode:departureCode,passengerCodes:[],...patch},p=await read('prepareVoyage',input,actor);return cmd('departShip',{...input,confirmation:p.confirmation,present:true},actor);};
 const fly=async(patch={})=>{await startFlight(patch);f.advance(180000);return command('finishSoPreparation');};
 if(release){assert.deepEqual((await f.releasePreview()).blockers,[]);await f.release(await f.releasePreview());await f.birth(await f.birthPreview());await f.birth(await f.birthPreview(f.owner,{uid:f.other.uid}),{uid:f.other.uid});cid=(await read('mySession')).character.id;otherId=(await read('mySession',{},f.other)).character.id;
  await provision();await f.provision({offerId:'fuel',quantity:40,restricted:true});await f.stage('EN_JEU');
  // Money here is a test setup, never a gameplay grant.
  await f.store.runTransaction(async tx=>{const a=await tx.get(`sessions/${f.sid}/accounts/${accountId(cid)}`);tx.set(`sessions/${f.sid}/accounts/${a.id}`,{...a,balance:1000,revision:a.revision+1});});
  const sale=await f.buy({offerId:'fuel',quantity:40});await f.pickup(sale);f.setDie(6);
 }
 return {...f,read,cmd,provisionInput,provision,navigation,navCommand:command,refuel,startFlight,fly,cid,otherId,ship:()=>f.store.get(`sessions/${f.sid}/ships/ship`)};
}
export function spaceOutlawsVoyagesSuite(makeStore,prefix='Vols SPACE OUTLAWS'){
 test(`${prefix} : modèle publié sans dotation, attribution explicite et secrets privés`,async()=>{
  const f=await soVoyagesFixture(makeStore);const d=await f.navigation();assert.equal(d.ship.fuel,0);assert.equal(d.ship.hull,4);assert.equal(d.ship.profile.seats,6);assert.equal((await f.ship()).capacity,20);assert.doesNotMatch(JSON.stringify(d),/SECRET_|OUT-SECRET|AWAY-CODE|HOME-CODE|source|actorUid|provisionIntent/);await assert.rejects(f.read('spaceportAdmin'),{code:'FORBIDDEN'});await assert.rejects(f.navigation('ship',f.other),{code:'FORBIDDEN'});
  await f.provision();assert.equal((await f.store.list(`sessions/${f.sid}/ships`)).length,1);await assert.rejects(f.provision({name:'Autre'}),{code:'SHIP_EXISTS'});
 });
 test(`${prefix} : plein en deux minutes, stock réservé puis consommé, zéro PA`,async()=>{
  const f=await soVoyagesFixture(makeStore),lot=(await f.read('myInventory')).lots.find(l=>l.item.id==='propellant'),p=await f.read('prepareRefuel',{shipId:'ship',lotId:lot.id,quantity:6});
  const input={shipId:'ship',lotId:lot.id,quantity:6,present:true,confirmation:p.confirmation,requestId:randomUUID()};await f.cmd('refuelShip',input);await f.cmd('refuelShip',input);assert.equal((await f.ship()).fuel,0);await assert.rejects(f.navCommand('finishSoRefuel'),{code:'VOYAGE_NOT_READY'});await assert.rejects(f.startFlight(),{code:'SHIP_UNAVAILABLE'});await assert.rejects(f.buy(),{code:'OUT_OF_COMBAT'});f.advance(120000);await f.navCommand('finishSoRefuel');assert.equal((await f.ship()).fuel,6);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).quantity,34);assert.equal((await f.points()).available,5);
 });
 test(`${prefix} : PIL-02 réserve un PA, départ unique, trajet et arrivée sans révision`,async()=>{
  const f=await soVoyagesFixture(makeStore);await f.refuel(2);await f.startFlight();assert.equal((await f.points()).reserved,1);assert.equal((await f.ship()).fuel,2);await assert.rejects(f.navCommand('finishSoPreparation'),{code:'VOYAGE_NOT_READY'});f.advance(180000);const p=await f.navigation(),input={shipId:'ship',confirmation:p.confirmation,present:true,requestId:randomUUID()};const out=await f.cmd('finishSoPreparation',input);f.setDie(1);assert.deepEqual(await f.cmd('finishSoPreparation',input),out);assert.equal((await f.ship()).fuel,0);assert.equal((await f.points()).reserved,0);assert.equal((await f.points()).available,4);assert.equal((await f.ship()).journey.event.roll,6);await assert.rejects(f.stage('FINISHED'),{code:'VOYAGES_OPEN'});
  const arrive=async()=>{const p=await f.navigation();return f.cmd('arriveShip',{shipId:'ship',confirmation:p.confirmation});};await assert.rejects(arrive(),{code:'VOYAGE_NOT_READY'});f.advance(300000);await arrive();assert.equal((await f.ship()).portId,'away');assert.equal((await f.ship()).revisionRequired,false);assert.equal((await f.ship()).fuel,0);assert.equal((await f.store.get(`sessions/${f.sid}/characters/${f.cid}`)).activeVoyageId,null);await assert.rejects(f.buy(),{code:'OUT_OF_COMBAT'});
 });
 test(`${prefix} : trois gabarits, neuf consommations et zéro fret du chasseur`,async()=>{
  for(const [profileId,size,tank] of [['FIGHTER',1,8],['CARGO',2,16],['TRANSPORT',3,24]])for(const [distanceId,factor,seconds] of [['SHORT',1,300],['MEDIUM',2,600],['LONG',3,900]]){const f=await soVoyagesFixture(makeStore,{profileId,distanceId});await f.refuel(size*factor);const p=await f.read('prepareVoyage',{shipId:'ship',navigationCode:'AWAY-CODE',passengerCodes:[]});assert.equal(p.route.fuelCost,size*factor);assert.equal(p.route.durationSeconds,seconds);assert.equal((await f.ship()).navigation.tankCapacity,tank);if(size===1)assert.equal((await f.ship()).capacity,0);}
 });
 test(`${prefix} : manifeste borné, places réelles et aucun double voyage`,async()=>{
  const f=await soVoyagesFixture(makeStore),other=await f.store.get(`sessions/${f.sid}/characters/${f.otherId}`);await f.refuel(6);await f.startFlight({passengerCodes:[other.publicCode]});await f.provision({shipId:'second',pilotId:f.otherId,ownerId:f.otherId});await assert.rejects(f.startFlight({shipId:'second'},f.other),{code:'INVALID_MANIFEST'});f.advance(180000);await f.navCommand('finishSoPreparation');assert.equal((await f.navigation('ship',f.other)).ship.journey.manifest.length,2);await assert.rejects(f.cmd('arriveShip',{shipId:'ship',confirmation:(await f.navigation('ship',f.other)).confirmation},f.other),{code:'FORBIDDEN'});
  const g=await soVoyagesFixture(makeStore,{profileId:'FIGHTER'});await g.refuel(1);const passenger=await g.store.get(`sessions/${g.sid}/characters/${g.otherId}`);await assert.rejects(g.startFlight({passengerCodes:[passenger.publicCode]}),{code:'INVALID_MANIFEST'});
 });
 test(`${prefix} : pause suspend les délais, annulation libère le PA et le manifeste`,async()=>{
  const f=await soVoyagesFixture(makeStore);await f.refuel(4);await f.startFlight();f.advance(30000);await f.stage('PAUSE');const left=(await f.navigation()).ship.operation.remainingSeconds;f.advance(3600000);assert.equal((await f.navigation()).ship.operation.remainingSeconds,left);await assert.rejects(f.navCommand('finishSoPreparation'),{code:'SESSION_NOT_RUNNING'});const p=await f.navigation();await f.cmd('cancelSoNavigation',{shipId:'ship',confirmation:p.confirmation,reason:'Interruption'});assert.equal((await f.points()).available,5);assert.equal((await f.points()).reserved,0);assert.equal((await f.ship()).fuel,4);await f.stage('EN_JEU');await f.startFlight();
 });
 test(`${prefix} : révocation bloque le reçu et annulation MJ libère sans accès joueur`,async()=>{
  const f=await soVoyagesFixture(makeStore);await f.refuel(4);await f.startFlight();await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.navigation(),{code:'FORBIDDEN'});const ship=(await f.read('spaceportAdmin',{},f.owner)).ships[0];await f.cmd('cancelSoNavigationAdmin',{shipId:'ship',confirmation:ship.confirmation,reason:'Pilote révoqué'},f.owner);assert.equal((await f.ship()).operation,null);assert.equal((await f.store.get(`sessions/${f.sid}/characters/${f.cid}`)).activeNavigationId,null);
 });
 test(`${prefix} : événement conservé, rencontre suspendue puis reprise au temps restant`,async()=>{
  const f=await soVoyagesFixture(makeStore);await f.refuel(6);f.setDie(1);await f.fly();const j=(await f.ship()).journey;assert.equal(j.suspended,true);assert.equal(j.event.tableRoll,1);f.advance(1000000);assert.equal((await f.navigation()).ship.journey.remainingSeconds,300);const p=(await f.read('spaceportAdmin',{},f.owner)).ships[0];await f.cmd('continueSoVoyage',{shipId:'ship',confirmation:p.confirmation,reason:'Rencontre jouée, aucune récompense créée'},f.owner);assert.equal((await f.ship()).journey.event.roll,1);assert.equal((await f.navigation()).ship.journey.remainingSeconds,300);assert.equal((await f.ship()).fuel,4);assert.equal((await f.points()).available,4);
 });
 test(`${prefix} : confirmation périmée, code inconnu, injection et départ concurrent`,async()=>{
  const f=await soVoyagesFixture(makeStore);await f.refuel(6);await assert.rejects(f.startFlight({navigationCode:'INCONNU'}),{code:'ROUTE_UNAVAILABLE'});await assert.rejects(f.read('prepareVoyage',{shipId:'ship',navigationCode:'AWAY-CODE',passengerCodes:[],fuelCost:0}),{code:'INVALID_ADMISSION'});const input={shipId:'ship',navigationCode:'AWAY-CODE',passengerCodes:[]},p=await f.read('prepareVoyage',input);const results=await Promise.allSettled([f.cmd('departShip',{...input,confirmation:p.confirmation,present:true}),f.cmd('departShip',{...input,confirmation:p.confirmation,present:true})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.points()).reserved,1);
 });
 test(`${prefix} : STOP et voies historiques ne contournent ni propriété ni préparation`,async()=>{
  const f=await soVoyagesFixture(makeStore);await f.refuel(4);await f.cmd('stopSafety',{reason:'Sécurité'});await assert.rejects(f.startFlight(),{code:'SO_SAFETY_STOP'});await assert.rejects(f.cmd('resolveVoyageAdmin',{shipId:'ship',shipRevision:1,outcome:'ARRIVE',reason:'Tentative'},f.owner),{code:'SO_GAMEPLAY_NOT_OPEN'});assert.equal((await f.ship()).fuel,4);
 });
 test(`${prefix} : manifeste historique jamais enrichi en navigation`,async()=>{
  const f=await soVoyagesFixture(makeStore,{release:false}),r=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${r.versionId}`,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await f.store.runTransaction(async tx=>{const {maintenanceSuppliesVersion,routeAnalysisVersion,detourVersion,escortManeuverVersion,escortAmendmentVersion,escortVersion,convoyVersion,transportVersion,navigationVersion,manifestDigest,...old}=await tx.get(path);tx.set(path,{...old,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(old))).digest('hex')});});await f.birth(await f.birthPreview());assert.deepEqual(await f.store.list(`sessions/${f.sid}/ships`),[]);assert.deepEqual(await f.store.list(`sessions/${f.sid}/routes`),[]);await assert.rejects(f.read('mySpaceport'),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : événements mécaniques, panne sèche sans perte et absence de combat automatique`,async()=>{
  for(const [riskId,table,fuel,delay,debt,suspended] of [['SECURED',4,4,180,0,false],['SECURED',5,2,0,1,true],['SECURED',6,2,0,0,false],['DANGEROUS',5,2,300,0,false],['HOSTILE',6,2,0,0,true]]){
   const f=await soVoyagesFixture(makeStore,{riskId});await f.refuel(fuel);f.setDice([1,table]);await f.fly();const ship=await f.ship(),j=ship.journey;assert.equal(j.event.delaySeconds,delay);assert.equal(j.event.fuelDebt,debt);assert.equal(j.suspended,suspended);assert.equal(ship.hull,4);assert.equal(ship.ownerId,f.cid);assert.equal(ship.revisionRequired,false);assert.equal(j.event.tableRoll,table);assert.deepEqual(await f.store.list(`sessions/${f.sid}/combats`),[]);if(debt){const p=(await f.read('spaceportAdmin',{},f.owner)).ships[0];await assert.rejects(f.cmd('continueSoVoyage',{shipId:'ship',confirmation:p.confirmation,reason:'Sans vrai carburant'},f.owner),{code:'VOYAGE_SUSPENDED'});}
  }
 });
 test(`${prefix} : annulation du plein et retour au port avec les mêmes biens`,async()=>{
  const f=await soVoyagesFixture(makeStore),lot=(await f.read('myInventory')).lots.find(l=>l.item.id==='propellant'),input={shipId:'ship',lotId:lot.id,quantity:2},p=await f.read('prepareRefuel',input);await f.cmd('refuelShip',{...input,present:true,confirmation:p.confirmation});let n=await f.navigation();await f.cmd('cancelSoNavigation',{shipId:'ship',confirmation:n.confirmation,reason:'Interruption du plein'});assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).quantity,40);assert.equal((await f.ship()).fuel,0);
  await f.refuel(4);await f.fly();f.advance(300000);n=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation});await f.fly({navigationCode:'HOME-CODE'});f.advance(300000);n=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation});assert.equal((await f.ship()).fuel,0);assert.equal((await f.ship()).portId,'home');assert.equal((await f.points()).available,3);assert.equal((await f.read('myInventory')).lots.find(l=>l.id===lot.id).quantity,36);
 });
 test(`${prefix} : pilote distinct du propriétaire, refus de carburant protégé d’un tiers`,async()=>{
  const f=await soVoyagesFixture(makeStore);await f.provision({shipId:'other-owned',ownerId:f.otherId});const d=await f.navigation('other-owned');assert.equal(d.canPilot,true);assert.equal(d.lots.length,0);const owner=await f.navigation('other-owned',f.other);assert.equal(owner.canPilot,false);await assert.rejects(f.startFlight({shipId:'other-owned'},f.other),{code:'FORBIDDEN'});assert.equal((await f.store.get(`sessions/${f.sid}/ships/other-owned`)).ownerId,f.otherId);
 });
 test(`${prefix} : interruption transactionnelle ne débite ni PA ni carburant`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await soVoyagesFixture(()=>store);await f.refuel(6);await f.startFlight();f.advance(180000);const p=await f.navigation(),input={shipId:'ship',confirmation:p.confirmation,present:true,requestId:randomUUID()};fail=true;await assert.rejects(f.cmd('finishSoPreparation',input),/INTERRUPTION/);fail=false;assert.equal((await f.ship()).fuel,6);assert.equal((await f.points()).reserved,1);assert.deepEqual(await f.store.list(`sessions/${f.sid}/voyages`),[]);await f.cmd('finishSoPreparation',input);assert.equal((await f.ship()).fuel,4);assert.equal((await f.points()).reserved,0);
 });

 test(`${prefix} : relève MJ à quai, mandat seul et réessai sans seconde écriture`,async()=>{
  const f=await soVoyagesFixture(makeStore);await f.refuel(4);const before=await f.ship(),pa=await f.points(),input={shipId:'ship',pilotId:f.otherId,reason:'Mandat et accord vérifiés au port'},q=await f.read('prepareSoPilot',input,f.owner),p={...input,confirmation:q.confirmation,present:true,requestId:randomUUID()};
  await assert.rejects(f.read('prepareSoPilot',input),{code:'FORBIDDEN'});await assert.rejects(f.cmd('changeSoPilot',p),{code:'FORBIDDEN'});
  await assert.rejects(f.cmd('changeSoPilot',{...p,present:false},f.owner),{code:'FIELD_PRESENCE_REQUIRED'});
  const result=await f.cmd('changeSoPilot',p,f.owner);assert.deepEqual(await f.cmd('changeSoPilot',p,f.owner),result);
  assert.deepEqual(await f.ship(),{...before,pilotId:f.otherId,revision:before.revision+1});assert.deepEqual(await f.points(),pa);
  assert.equal((await f.navigation()).canPilot,false);assert.equal((await f.navigation('ship',f.other)).canPilot,true);await assert.rejects(f.startFlight(),{code:'FORBIDDEN'});
  await f.startFlight({},f.other);assert.equal((await f.ship()).operation.pilotId,f.otherId);
  const history=(await f.store.list(`sessions/${f.sid}/logisticsHistory`)).filter(x=>x.kind==='changeSoPilot');assert.equal(history.length,1);assert.equal(history[0].reason,input.reason);assert.doesNotMatch(JSON.stringify(await f.navigation()),/Mandat et accord/);
 });
 test(`${prefix} : relève refuse indisponibilité, mauvais port, compétence et accès retiré`,async()=>{
  const f=await soVoyagesFixture(makeStore),path=`sessions/${f.sid}/characters/${f.otherId}`,original=await f.store.get(path),input={shipId:'ship',pilotId:f.otherId,reason:'Relève vérifiée'},q=await f.read('prepareSoPilot',input,f.owner);
  for(const [patch,code] of [[{hp:0},'OUT_OF_COMBAT'],[{activeNavigationId:'busy'},'OUT_OF_COMBAT'],[{activeVoyageId:'busy'},'OUT_OF_COMBAT'],[{activeCargoId:'busy'},'OUT_OF_COMBAT'],[{spacePortId:'away'},'SHIP_NOT_LOCAL'],[{abilityProfile:{...original.abilityProfile,skills:[]}},'FIELD_SKILL_REQUIRED']]){
   await f.store.runTransaction(async tx=>tx.set(path,{...original,...patch}));await assert.rejects(f.cmd('changeSoPilot',{...input,confirmation:q.confirmation,present:true},f.owner),{code});
  }
  await f.store.runTransaction(async tx=>tx.set(path,original));await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.cmd('changeSoPilot',{...input,confirmation:q.confirmation,present:true},f.owner),{code:'INVALID_RECIPIENT'});assert.equal((await f.ship()).pilotId,f.cid);
 });
 test(`${prefix} : relève exclut opérations, convoi, fret et provisions même après paiement`,async()=>{
  const f=await soVoyagesFixture(makeStore),path=`sessions/${f.sid}/ships/ship`,original=await f.ship(),input={shipId:'ship',pilotId:f.otherId,reason:'Mandat vérifié'};
  for(const patch of [{docked:false},{operation:{id:'busy'}},{journey:{id:'busy'}},{convoy:{id:'busy'}},{convoyOffer:{id:'busy'}},{combatId:'busy'},{maintenanceId:'busy'},{rescueId:'busy'},{ambushId:'busy'}]){
   await f.store.runTransaction(async tx=>tx.set(path,{...original,...patch}));await assert.rejects(f.read('prepareSoPilot',input,f.owner),{code:'SPACE_SHIP_BUSY'});
  }
  await f.store.runTransaction(async tx=>tx.set(path,original));
  const cp=`sessions/${f.sid}/contracts/guard`,contract={id:'guard',acceptedAt:1,status:'ACTIVE',terms:{escort:{shipId:'ship'}}};
  for(const patch of [{},{status:'PAID',escortFuel:{remaining:25}}]){await f.store.runTransaction(async tx=>tx.set(cp,{...contract,...patch}));await assert.rejects(f.read('prepareSoPilot',input,f.owner),{code:'SO_PILOT_CONTRACT_OPEN'});}
  await f.store.runTransaction(async tx=>tx.set(cp,{...contract,status:'PAID'}));assert.ok((await f.read('prepareSoPilot',input,f.owner)).confirmation);
  const tp=`sessions/${f.sid}/cargoTransfers/guard`;await f.store.runTransaction(async tx=>tx.set(tp,{id:'guard',status:'LOADING',source:{kind:'HOLD',id:'ship'},destination:{kind:'PORT',id:'home'}}));await assert.rejects(f.read('prepareSoPilot',input,f.owner),{code:'CARGO_TRANSFERS_OPEN'});
 });
 test(`${prefix} : relève concurrente unique, aperçu périmé et STOP`,async()=>{
  const f=await soVoyagesFixture(makeStore),input={shipId:'ship',pilotId:f.otherId,reason:'Mandat vérifié'},q=await f.read('prepareSoPilot',input,f.owner),p={...input,confirmation:q.confirmation,present:true};
  await assert.rejects(f.cmd('changeSoPilot',{...p,reason:'Autre motif'},f.owner),{code:'STALE_REVISION'});
  const rs=await Promise.allSettled([f.cmd('changeSoPilot',p,f.owner),f.cmd('changeSoPilot',p,f.owner)]);assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);
  await f.cmd('stopSafety',{reason:'Sécurité'},f.other);await assert.rejects(f.read('prepareSoPilot',{...input,pilotId:f.cid},f.owner),{code:'SO_SAFETY_STOP'});
 });
 test(`${prefix} : relève interrompue sans modification du mandat ni historique`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await soVoyagesFixture(()=>store),before=await f.ship(),input={shipId:'ship',pilotId:f.otherId,reason:'Mandat vérifié'},q=await f.read('prepareSoPilot',input,f.owner),p={...input,confirmation:q.confirmation,present:true,requestId:randomUUID()};
  fail=true;await assert.rejects(f.cmd('changeSoPilot',p,f.owner),/INTERRUPTION/);fail=false;assert.deepEqual(await f.ship(),before);assert.equal((await f.store.list(`sessions/${f.sid}/logisticsHistory`)).filter(x=>x.kind==='changeSoPilot').length,0);await f.cmd('changeSoPilot',p,f.owner);assert.equal((await f.ship()).pilotId,f.otherId);
 });

}
