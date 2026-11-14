import test from 'node:test';
import assert from 'node:assert/strict';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {routeAnalysisFixture} from './space-route-analysis-suite.mjs';
import {shipCrewFixture} from './ship-crew-suite.mjs';
import {knownMapNetwork} from '../../src/core/galactic-map.mjs';
import {mapItineraries} from '../../src/core/galactic-map-planning.mjs';
import {readSoEpisode} from '../../src/core/space-outlaws-episodes.mjs';
const map=(f,p={},actor=f.player)=>f.read('galacticMap',p,actor);
export function galacticMapSuite(makeStore,prefix='Carte galactique'){
 test(`${prefix} : code explicite, estimation native et consultation sans écriture`,async()=>{
  const f=await soVoyagesFixture(makeStore);await f.refuel(4);
  const snapshot=()=>f.store.runTransaction(async tx=>readSoEpisode(tx,await tx.get(`sessions/${f.sid}`))),before=await snapshot();
  let d=await map(f);assert.deepEqual(d.ports.map(p=>p.id),['home']);assert.deepEqual(d.routes,[]);assert.equal(d.ships.length,1);
  d=await map(f,{codes:['AWAY-CODE'],destinationId:'away',shipId:'ship'});
  const q=await f.read('prepareVoyage',{shipId:'ship',navigationCode:'AWAY-CODE',passengerCodes:[]});
  assert.equal(d.routes.length,1);assert.equal(d.routes[0].fuelCost,q.route.fuelCost);assert.equal(d.routes[0].durationSeconds,q.route.durationSeconds);assert.equal(d.routes[0].risk,null);assert.equal(d.routes[0].navigationCode,'AWAY-CODE');assert.deepEqual(d.itineraries[0].legs,['out']);assert.equal(d.itineraries[0].remainingFuelWithoutExtraStock,2);
  assert.doesNotMatch(JSON.stringify(d),/SECRET_|OUT-SECRET|BACK-SECRET|HOME-CODE|assignedUid|actorUid|manifest|gmNotes/);assert.deepEqual(await snapshot(),before);
  await assert.rejects(map(f,{codes:['out'],destinationId:'away'}),{code:'MAP_DESTINATION_UNAVAILABLE'});
  await assert.rejects(map(f,{codes:Array(21).fill('x')}),{code:'INVALID_MAP_CODES'});
  await assert.rejects(map(f,{codes:['x'],fuelCost:0}),{code:'INVALID_ADMISSION'});
 });
 test(`${prefix} : droits de lecture, liens directs et révocation de l’équipage`,async()=>{
  const f=await shipCrewFixture(makeStore);let d=await map(f,{},f.other);assert.deepEqual(d.ships,[]);
  await assert.rejects(map(f,{shipId:'ship'},f.other),{code:'FORBIDDEN'});await assert.rejects(f.read('galacticMapAdmin'),{code:'FORBIDDEN'});
  const invite=await f.invite();await f.respond(invite.id);d=await map(f,{shipId:'ship'},f.other);assert.equal(d.shipId,'ship');assert.equal(d.canOpenFlight,false);
  await f.change('REMOVE');await assert.rejects(map(f,{shipId:'ship'},f.other),{code:'FORBIDDEN'});assert.deepEqual((await map(f,{},f.other)).ships,[]);
  const admin=await f.read('galacticMapAdmin',{},f.owner);assert.equal(admin.routes.length,2);assert.equal(admin.ports.length,2);assert.doesNotMatch(JSON.stringify(admin),/SECRET|navigationCode|gmNotes|manifest/);
 });
 test(`${prefix} : compétence et résultat d’analyse réellement obtenus, révision contrôlée`,async()=>{
  const f=await routeAnalysisFixture(makeStore);await f.level(3);let d=await map(f,{codes:['OUT-SECRET']});assert.equal(d.routes[0].risk,null);
  const a=await f.startAnalysis();f.advance(90000);await f.finish(a);
  d=await map(f);assert.equal(d.routes.length,1);assert.equal(d.routes[0].risk,'Sécurisée');assert.equal(d.routes[0].navigationCode,undefined);assert.doesNotMatch(JSON.stringify(d),/PREPARED_PRIVATE|SECRET_TRUTH|OUT-SECRET|gmTruth/);
  await f.level(2);assert.equal((await map(f)).routes[0].risk,null);
  await f.edit('routes/out',r=>({...r,revision:r.revision+1}));assert.deepEqual((await map(f)).routes,[]);
  await f.level(0);await assert.rejects(map(f,{codes:['AWAY-CODE']}),{code:'MAP_SKILL_REQUIRED'});assert.deepEqual((await map(f)).routes,[]);
 });
 test(`${prefix} : destination connue sans origine secrète et codes ambigus refusés`,()=>{
  const ports=['home','away','hidden'].map(id=>({id,navigationCode:id.toUpperCase()})),routes=[{id:'out',fromPort:'home',toPort:'away',navigationCode:'OUT'},{id:'secret',fromPort:'hidden',toPort:'away',navigationCode:'SECRET'}];
  let d=knownMapNetwork(ports,routes,['home'],new Map(),['AWAY']);assert.deepEqual(d.ports.map(p=>p.id),['home','away']);assert.deepEqual(d.routes.map(r=>r.route.id),['out']);
  d=knownMapNetwork(ports,routes,['home'],new Map(),['SECRET']);assert.deepEqual(d.routes.map(r=>r.route.id),['secret']);
  d=knownMapNetwork(ports,[...routes,{...routes[0],id:'duplicate',navigationCode:'SECOND'}],['home'],new Map(),['AWAY']);assert.deepEqual(d.routes,[]);
 });
 test(`${prefix} : ports publics sans compétence, données privées exclues`,async()=>{
  const f=await routeAnalysisFixture(makeStore);await f.level(0);await f.edit('planetMarkets/public',()=>({id:'public',enabled:true,portId:'away',secret:'SECRET_MARKET'}));
  const d=await map(f);assert.deepEqual(d.ports.map(p=>p.id).sort(),['away','home']);assert.deepEqual(d.routes,[]);assert.equal(d.canAnalyze,false);assert.doesNotMatch(JSON.stringify(d),/SECRET|navigationCode/);
 });
 test(`${prefix} : pause, sécurité et préparation engagée restent consultables`,async()=>{
  const f=await soVoyagesFixture(makeStore);await f.refuel(4);await f.startFlight();const before=await f.ship(),points=await f.points();let d=await map(f,{codes:['AWAY-CODE'],destinationId:'away'});assert.match(d.operation,/cours/);assert.deepEqual(await f.ship(),before);assert.deepEqual(await f.points(),points);
  await f.stage('PAUSE');d=await map(f,{codes:['AWAY-CODE']});assert.ok(d.operation);await assert.rejects(f.navCommand('finishSoPreparation'),{code:'SESSION_NOT_RUNNING'});
  await f.cmd('stopSafety',{reason:'Sécurité'});assert.equal((await map(f)).shipId,'ship');
 });
 test(`${prefix} : trajets dirigés, autonomie, escales et aucun retour forcé`,()=>{
  const edge=(id,fromPort,toPort,durationSeconds,fuelCost)=>({id,fromPort,toPort,durationSeconds,fuelCost,available:true});
  const routes=[edge('direct','a','c',300,6),edge('first','a','b',300,2),edge('second','b','c',300,2)],ship={fuel:2,tankCapacity:8},p=mapItineraries(routes,'a','c',ship);
  assert.deepEqual(p.map(p=>p.legs),[['direct'],['first','second']]);assert.deepEqual(p[0].refuels,[{portId:'a',minimumUnits:4,availabilityConfirmed:false}]);assert.deepEqual(p[1].refuels,[{portId:'b',minimumUnits:2,availabilityConfirmed:false}]);assert.equal(p[1].remainingFuelWithoutExtraStock,null);assert.deepEqual(mapItineraries(routes,'c','a',ship),[]);
  const small=mapItineraries(routes,'a','c',{fuel:4,tankCapacity:4});assert.equal(small.length,1);assert.deepEqual(small[0].modes,['TIME','FUEL']);assert.equal(small[0].remainingFuelWithoutExtraStock,0);assert.deepEqual(mapItineraries(routes,'a','c',{fuel:1,tankCapacity:1}),[]);const collective=mapItineraries(routes.filter(r=>r.id!=='direct').map(r=>({...r,minimumDepartureFuel:3})),'a','c',{fuel:4,tankCapacity:4});assert.deepEqual(collective[0].refuels,[{portId:'b',minimumUnits:1,availabilityConfirmed:false}]);
 });
 test(`${prefix} : remorquage et vaisseau collectif reprennent les consommations natives`,async()=>{
  const {towingFlightFixture}=await import('./space-towing-flight-suite.mjs'),{spaceGroupPilotFixture}=await import('./space-group-pilot-suite.mjs');
  const f=await towingFlightFixture(makeStore),d=await map(f,{shipId:'ship',codes:['AWAY-CODE'],destinationId:'away'}),q=await f.read('prepareVoyage',{shipId:'ship',navigationCode:'AWAY-CODE',passengerCodes:[]});assert.equal(d.routes[0].fuelCost,4);assert.equal(d.routes[0].fuelCost,q.route.fuelCost);
  const g=await spaceGroupPilotFixture(makeStore);await g.refuelGroup(6);const gd=await map(g,{shipId:g.shipId,codes:['AWAY-CODE'],destinationId:'away'}),gq=await g.read('prepareVoyage',{shipId:g.shipId,navigationCode:'AWAY-CODE',passengerCodes:[]});assert.equal(gd.routes[0].fuelCost,gq.route.fuelCost);assert.equal(gd.routes[0].fuelCost,2);assert.equal(gd.routes[0].minimumDepartureFuel,3);await g.reserve();g.advance(180000);await g.navCommand('finishSoPreparation',{shipId:g.shipId});assert.equal((await g.ship()).fuel,4);
 });

 test(`${prefix} : ancienne session de navigation sans moteur d’analyse, aucun outil promis`,async()=>{
  const f=await routeAnalysisFixture(makeStore);await f.store.runTransaction(async tx=>{const path=`sessions/${f.sid}`,s=await tx.get(path);tx.set(path,{...s,spaceOutlaws:{...s.spaceOutlaws,routeAnalysisVersion:0}});});const d=await map(f,{codes:['AWAY-CODE']});assert.equal(d.canNavigate,true);assert.equal(d.canAnalyze,false);assert.equal(d.routes[0].analysisAvailable,false);assert.equal(d.routes[0].fuelCost,2);
 });

}
