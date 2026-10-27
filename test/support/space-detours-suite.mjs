import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {convoyFixture} from './space-convoy-suite.mjs';
import {encountersFixture} from './space-encounters-suite.mjs';
import {transportFixture} from './space-transport-suite.mjs';
import {amendmentFixture} from './space-escort-amendments-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';

export async function detourRoutes(f,revision){
 await f.cc('saveCentralPort',{portId:'side',portRevision:0,draftRevision:revision++,port:{name:'Port alternatif',description:'Port préparé',gmNotes:'SECRET_PORT',navigationCode:'SIDE-CODE',locationTargetId:null},reason:'Destination alternative publiée'});
 for(const [id,fromPort,toPort,distanceId,riskId] of [['alternate','home','side','MEDIUM','HOSTILE'],['parallel','home','away','SHORT','SECURED'],['rejoin','side','away','SHORT','SECURED']])await f.cc('saveCentralRoute',{routeId:id,routeRevision:0,draftRevision:revision++,route:{name:`Liaison ${id}`,description:'Liaison préparée',gmNotes:'SECRET_ROUTE',fromPort,toPort,navigationCode:`${id.toUpperCase()}-CODE`,distanceId,riskId},reason:'Détour réel'});
}
export async function detoursFixture(makeStore,{convoy=false,fuel=8,dice=[6,6,1],launch=true,...options}={}){
 const f=convoy?await convoyFixture(makeStore,{fuel,departureCode:'OUT-SECRET',prepareExtra:detourRoutes,...options}):await soVoyagesFixture(makeStore,{departureCode:'OUT-SECRET',prepareExtra:detourRoutes,...options});
 const get=p=>f.store.get(`sessions/${f.sid}${p?'/'+p:''}`),edit=(p,fn)=>f.store.runTransaction(async tx=>{const path=`sessions/${f.sid}${p?'/'+p:''}`;tx.set(path,fn(await tx.get(path)));});
 if(!convoy)await f.refuel(fuel);
 if(launch){if(convoy)await f.launch(dice);else {f.setDice(dice);await f.fly();}}
 const preview=(patch={},actor=f.player)=>f.read('prepareSoDetour',{shipId:'ship',navigationCode:'ALTERNATE-CODE',...patch},actor);
 const attempt=async(patch={},actor=f.player)=>{const p={shipId:'ship',navigationCode:'ALTERNATE-CODE',...patch},q=await preview(p,actor);return f.cmd('attemptSoDetour',{...p,confirmation:q.confirmation},actor);};
 return {...f,get,edit,preview,attempt};
}
export function spaceDetoursSuite(makeStore,prefix='Détours PIL-01 SO'){
 test(`${prefix} : réussite, coût réel, temps acquis, événement et identité conservés`,async()=>{
  const f=await detoursFixture(makeStore),before=await f.ship();f.advance(60000);const points=await f.points(),q=await f.preview();assert.equal(q.remainingSeconds,540);assert.equal(q.ships[0].surcharge,2);assert.equal(q.ships[0].extraFuel,2);assert.equal(q.canPay,true);assert.equal((await f.ship()).fuel,6);assert.deepEqual(await f.points(),points);assert.doesNotMatch(JSON.stringify(q),/SECRET_|missionManifest|transportManifest|pilotGuard|SIDE-CODE/);
  f.setDie(5);const r=await f.attempt(),s=await f.ship();assert.equal(r.success,true);assert.equal(r.total,7);assert.equal(s.fuel,2);assert.equal(s.journey.id,before.journey.id);assert.equal(s.journey.routeId,'alternate');assert.equal(s.journey.toPort,'side');assert.deepEqual(s.journey.event,before.journey.event);assert.deepEqual(s.journey.manifest,before.journey.manifest);assert.equal((await f.navigation()).ship.journey.remainingSeconds,540);assert.equal((await f.points()).available,points.available-1);assert.equal(s.journey.pil03Used,undefined);
  f.advance(540000);const n=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation});assert.equal((await f.ship()).portId,'side');assert.equal((await f.ship()).fuel,2);assert.equal((await f.get(`voyages/${s.journey.id}`)).status,'ARRIVED');
 });
 test(`${prefix} : échec sans manœuvrabilité, surcharge seule, reçu unique et quota`,async()=>{
  const f=await detoursFixture(makeStore),before=await f.ship();f.setDie(4);const q=await f.preview(),p={shipId:'ship',navigationCode:'ALTERNATE-CODE',confirmation:q.confirmation,requestId:randomUUID()},r=await f.cmd('attemptSoDetour',p);assert.equal(r.total,6);assert.equal(r.success,false);f.setDie(6);assert.deepEqual(await f.cmd('attemptSoDetour',p),r);const s=await f.ship();assert.equal(s.fuel,4);assert.equal(s.journey.routeId,'out');assert.equal(s.journey.arrivesAtGameMs,before.journey.arrivesAtGameMs);assert.deepEqual(s.journey.event,before.journey.event);assert.equal((await f.points()).available,3);await assert.rejects(f.attempt(),{code:'SO_DETOUR_USED'});
 });
 test(`${prefix} : route raccourcie, aucun remboursement et deux minutes minimales`,async()=>{
  const f=await detoursFixture(makeStore,{distanceId:'LONG',fuel:10});f.advance(840000);f.setDie(6);const q=await f.preview({navigationCode:'PARALLEL-CODE'});assert.equal(q.remainingSeconds,120);assert.equal(q.ships[0].extraFuel,0);await f.attempt({navigationCode:'PARALLEL-CODE'});assert.equal((await f.ship()).fuel,2);assert.equal((await f.navigation()).ship.journey.remainingSeconds,120);f.advance(119000);const n=await f.navigation();await assert.rejects(f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation}),{code:'VOYAGE_NOT_READY'});
 });
 test(`${prefix} : ressources maximales requises avant le jet et zéro débit si insuffisant`,async()=>{
  const f=await detoursFixture(makeStore,{fuel:5}),before=await f.ship(),points=await f.points();const q=await f.preview();assert.equal(q.canPay,false);f.setDie(1);await assert.rejects(f.attempt(),{code:'SO_DETOUR_FUEL'});assert.deepEqual(await f.ship(),before);assert.deepEqual(await f.points(),points);
  await f.edit(`characters/${f.cid}/resources/actionPoints`,p=>({...p,available:0}));await assert.rejects(f.attempt({navigationCode:'PARALLEL-CODE'}),{code:'NOT_ENOUGH_ACTION_POINTS'});assert.deepEqual(await f.ship(),before);
 });
 test(`${prefix} : convoi, un jet du meneur, coûts propres et aucun PA du second pilote`,async()=>{
  const f=await detoursFixture(makeStore,{convoy:true}),points=await f.points(f.other);await assert.rejects(f.preview({shipId:'escort'},f.other),{code:'SO_DETOUR_LEADER'});f.setDice([5,1]);const r=await f.attempt();assert.equal(r.success,true);for(const id of ['ship','escort']){const x=await f.get(`ships/${id}`);assert.equal(x.fuel,2);assert.equal(x.journey.detour.roll,5);assert.equal(x.journey.routeId,'alternate');assert.equal(x.convoy.routeId,'alternate');assert.equal(x.journey.detour.id,r.id);}assert.deepEqual(await f.points(f.other),points);assert.equal((await f.points()).available,3);await f.leave();await assert.rejects(f.preview({shipId:'escort'},f.other),{code:'SO_DETOUR_USED'});
 });
 test(`${prefix} : appareil impécunieux ne suit pas gratuitement, séparation puis détour solo`,async()=>{
  const f=await detoursFixture(makeStore,{convoy:true});await f.edit('ships/escort',s=>({...s,fuel:1,revision:s.revision+1}));const before=await f.ship(),other=await f.get('ships/escort');assert.equal((await f.preview()).canPay,false);await assert.rejects(f.attempt(),{code:'SO_DETOUR_FUEL'});assert.deepEqual(await f.ship(),before);assert.deepEqual(await f.get('ships/escort'),other);await f.leave();f.setDie(6);await f.attempt();assert.equal((await f.get('ships/escort')).journey.routeId,'out');assert.equal((await f.get('ships/escort')).fuel,1);assert.equal((await f.ship()).journey.routeId,'alternate');
 });
 test(`${prefix} : rencontre MJ et effet mécanique conservés sans nouveau tirage`,async()=>{
  for(const dice of [[1,1,1],[1,4,1],[1,5,1]]){
   const f=await detoursFixture(makeStore,{dice}),before=await f.ship();f.setDie(6);await f.attempt();const s=await f.ship();assert.deepEqual(s.journey.event,before.journey.event);assert.equal(s.journey.suspended,before.journey.suspended);assert.equal(s.fuel,before.fuel-4);if(s.journey.suspended){f.advance(999000);assert.equal((await f.navigation()).ship.journey.remainingSeconds,600);const q=(await f.read('spaceportAdmin',{},f.owner)).ships.find(x=>x.shipId==='ship');await f.cmd('continueSoVoyage',{shipId:'ship',confirmation:q.confirmation,reason:'Rencontre déjà tirée effectivement jouée'},f.owner);assert.equal((await f.navigation()).ship.journey.remainingSeconds,600);}
  }
 });
 test(`${prefix} : code inconnu, liaison identique et données injectées refusés`,async()=>{
  const f=await detoursFixture(makeStore);for(const navigationCode of ['UNKNOWN','OUT-SECRET','HOME-CODE'])await assert.rejects(f.preview({navigationCode}),{code:'ROUTE_UNAVAILABLE'});
  for(const extra of [{roll:6},{level:5},{fuelCost:0},{routeId:'alternate'}])await assert.rejects(f.preview(extra),{code:'INVALID_ADMISSION'});assert.doesNotMatch(JSON.stringify(await f.navigation()),/ALTERNATE-CODE|PARALLEL-CODE|SECRET_ROUTE|SIDE-CODE/);
 });
 test(`${prefix} : rôle, compétence, état et révocation du convoi revérifiés`,async()=>{
  const f=await detoursFixture(makeStore,{convoy:true});await assert.rejects(f.preview({},f.other),{code:'FORBIDDEN'});const q=await f.preview();await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.cmd('attemptSoDetour',{shipId:'ship',navigationCode:'ALTERNATE-CODE',confirmation:q.confirmation}),{code:'INVALID_RECIPIENT'});assert.equal((await f.ship()).fuel,6);
  const g=await detoursFixture(makeStore);await g.edit(`characters/${g.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.filter(k=>k.id!=='PIL-01')}}));await assert.rejects(g.preview(),{code:'FIELD_SKILL_REQUIRED'});assert.equal((await g.navigation()).detour.canAttempt,false);
 });
 test(`${prefix} : confirmation périmée et concurrence ne doublent jamais les coûts`,async()=>{
  const f=await detoursFixture(makeStore),q=await f.preview(),p={shipId:'ship',navigationCode:'ALTERNATE-CODE',confirmation:q.confirmation};await f.edit('ships/ship',s=>({...s,fuel:s.fuel-1,revision:s.revision+1}));await assert.rejects(f.cmd('attemptSoDetour',p),{code:'STALE_REVISION'});const next=await f.preview(),attempts=[1,2].map(()=>({...p,confirmation:next.confirmation,requestId:randomUUID()}));f.setDie(6);const r=await Promise.allSettled(attempts.map(p=>f.cmd('attemptSoDetour',p)));assert.equal(r.filter(x=>x.status==='fulfilled').length,1);const winner=r.findIndex(x=>x.status==='fulfilled');assert.deepEqual(await f.cmd('attemptSoDetour',attempts[winner]),r[winner].value);assert.equal((await f.ship()).fuel,1);assert.equal((await f.points()).available,3);await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.cmd('attemptSoDetour',attempts[winner]),{code:'FORBIDDEN'});
 });
 test(`${prefix} : pause, STOP, arrivée et ancienne publication ferment la manœuvre`,async()=>{
  const f=await detoursFixture(makeStore);await f.stage('PAUSE');f.advance(600000);await assert.rejects(f.preview(),{code:'SESSION_NOT_RUNNING'});assert.equal((await f.navigation()).ship.journey.remainingSeconds,300);await f.stage('EN_JEU');await f.cmd('stopSafety',{reason:'Sécurité'});await assert.rejects(f.preview(),{code:'SO_SAFETY_STOP'});
  const g=await detoursFixture(makeStore);g.advance(300000);await assert.rejects(g.preview(),{code:'SO_DETOUR_UNAVAILABLE'});await g.edit('',s=>{const {detourVersion,...spaceOutlaws}=s.spaceOutlaws;return {...s,spaceOutlaws};});assert.equal((await g.navigation()).detour,null);await assert.rejects(g.preview(),{code:'SO_GAMEPLAY_NOT_OPEN'});
  const h=await soVoyagesFixture(makeStore,{release:false,departureCode:'OUT-SECRET',prepareExtra:detourRoutes}),r=await h.release(await h.releasePreview()),path=`campaigns/${h.campaignId}/versions/${r.versionId}`,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await h.store.runTransaction(async tx=>{const {detourVersion,manifestDigest,...old}=await tx.get(path);tx.set(path,{...old,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(old))).digest('hex')});});await h.birth(await h.birthPreview());assert.equal((await h.store.get(`sessions/${h.sid}`)).spaceOutlaws.detourVersion,undefined);await assert.rejects(h.read('prepareSoDetour',{shipId:'unknown',navigationCode:'ALTERNATE-CODE'}));
 });
 test(`${prefix} : détour et quota conservés entre épisodes, aucun PA ou carburant rejoué`,async()=>{
  const f=await detoursFixture(makeStore,{convoy:true});f.advance(60000);f.setDie(6);await f.attempt();const before=await f.ship(),e=await episodeHarness(f);await e.close();await e.resume(await e.begin());assert.deepEqual(await e.get('ships/ship'),before);assert.equal((await e.read('shipNavigation',{shipId:'ship'},f.player)).ship.journey.remainingSeconds,540);await e.stage('EN_JEU');await assert.rejects(e.read('prepareSoDetour',{shipId:'ship',navigationCode:'PARALLEL-CODE'},f.player),{code:'SO_DETOUR_USED'});assert.equal((await e.get('ships/ship')).fuel,2);
 });
 test(`${prefix} : interruption atomique ne consomme ni PA ni carburant ni quota`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await detoursFixture(()=>store,{convoy:true}),before=await f.ship(),points=await f.points(),q=await f.preview(),input={shipId:'ship',navigationCode:'ALTERNATE-CODE',confirmation:q.confirmation,requestId:randomUUID()};fail=true;await assert.rejects(f.cmd('attemptSoDetour',input),/INTERRUPTION/);fail=false;assert.deepEqual(await f.ship(),before);assert.deepEqual(await f.points(),points);f.setDie(6);await f.attempt();assert.equal((await f.ship()).fuel,2);
 });
 test(`${prefix} : embuscade ancienne inapplicable, plan adverse secret et nouvelle liaison exposée`,async()=>{
  const f=await encountersFixture(makeStore,{encounter:false,departureCode:'OUT-SECRET',prepareExtra:detourRoutes}),p={shipId:'ship',navigationCode:'PARALLEL-CODE'},q=await f.read('prepareSoDetour',p),old=await f.read('prepareSpaceInterception',{shipId:'ship'},f.owner);f.setDie(6);await f.cmd('attemptSoDetour',{...p,confirmation:q.confirmation});await assert.rejects(f.cmd('triggerSpaceInterception',{shipId:'ship',confirmation:old.confirmation,reason:'Ancien aperçu'},f.owner),{code:'SPACE_NO_AMBUSH'});assert.equal((await f.get(`spaceAmbushes/${(await f.get('ships/second')).ambushId}`)).status,'ACTIVE');
  const other={shipId:'second',navigationCode:'PARALLEL-CODE'},v=await f.read('prepareSoDetour',other,f.other);await f.cmd('attemptSoDetour',{...other,confirmation:v.confirmation},f.other);assert.equal((await f.get('ships/second')).ambushId,null);const a=await f.read('prepareSpaceAmbush',other,f.other);await f.cmd('armSpaceAmbush',{...other,confirmation:a.confirmation,present:true},f.other);await f.intercept();assert.ok((await f.ship()).combatId);await assert.rejects(f.read('prepareSoDetour',p),{code:'SPACE_SHIP_BUSY'});
 });
 test(`${prefix} : fret confié, détour hors destination puis retour réel et livraison initiale`,async()=>{
  const f=await transportFixture(makeStore,{quantity:5,departureCode:'OUT-SECRET',prepareExtra:detourRoutes});await f.refuel(4);await f.accept();await f.load();await f.fly();const contract=await f.get(`contracts/${f.c.id}`),lots=await f.lots(),p={shipId:'ship',navigationCode:'ALTERNATE-CODE'},q=await f.read('prepareSoDetour',p);f.setDie(6);await f.cmd('attemptSoDetour',{...p,confirmation:q.confirmation});assert.deepEqual(await f.get(`contracts/${f.c.id}`),contract);assert.equal((await f.lots())[0].ownerId,lots[0].ownerId);f.advance(600000);let n=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation});assert.equal((await f.view()).transport.complete,false);assert.equal((await f.view()).transport.navigationCode,'REJOIN-CODE');assert.equal((await f.read('cargoPort',{portId:'away'})).contracts[0].lots[0].canMove,false);await assert.rejects(f.read('cargoPort',{portId:(await f.ship()).portId}),{code:'FORBIDDEN'});await assert.rejects(f.deliver());
  await f.fly({navigationCode:'REJOIN-CODE'});f.advance(300000);n=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation});assert.equal((await f.read('cargoPort',{portId:'away'})).contracts[0].lots[0].canMove,true);await f.deliver();assert.equal((await f.read('cargoPort',{portId:'away'})).contracts[0].complete,true);assert.equal((await f.view()).transport.complete,true);assert.equal((await f.ship()).fuel,0);assert.equal((await f.lots())[0].transportLegIndex,1);assert.deepEqual(await f.get(`contracts/${f.c.id}`),contract);
 });
 test(`${prefix} : autre liaison vers le port prévu permet la réception, sans changer le contrat`,async()=>{
  const f=await transportFixture(makeStore,{quantity:5,departureCode:'OUT-SECRET',prepareExtra:detourRoutes});await f.accept();await f.load();await f.fly();const p={shipId:'ship',navigationCode:'PARALLEL-CODE'},q=await f.read('prepareSoDetour',p);f.setDie(6);await f.cmd('attemptSoDetour',{...p,confirmation:q.confirmation});f.advance(300000);const n=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation});await f.deliver();assert.equal((await f.view()).transport.complete,true);assert.equal((await f.ship()).fuel,0);
 });
 test(`${prefix} : trois gabarits paient leur propre surcharge et leur distance`,async()=>{
  for(const [profileId,size] of [['FIGHTER',1],['CARGO',2],['TRANSPORT',3]]){const f=await detoursFixture(makeStore,{profileId,fuel:size*4}),q=await f.preview();assert.equal(q.ships[0].surcharge,size);assert.equal(q.ships[0].extraFuel,size);f.setDie(5);await f.attempt();assert.equal((await f.ship()).fuel,size);assert.equal((await f.points()).available,3);}
 });
 test(`${prefix} : convoi en échec conserve les deux routes, ressources du meneur seulement`,async()=>{
  const f=await detoursFixture(makeStore,{convoy:true});f.setDie(1);const r=await f.attempt();assert.equal(r.success,false);for(const id of ['ship','escort']){const x=await f.get(`ships/${id}`);assert.equal(x.journey.routeId,'out');assert.equal(x.convoy.routeId,'out');assert.equal(x.fuel,4);assert.equal(x.journey.detour.extraFuel,0);}assert.equal((await f.points()).available,3);assert.equal((await f.points(f.other)).available,4);
 });
 test(`${prefix} : le détour respecte les étapes d’un avenant et le salaire déjà consenti`,async()=>{
  const f=await amendmentFixture(makeStore);await f.form();await f.proposeAmendment();await f.respondAmendment();await f.respondAmendment(false);await f.fuel(6);await f.refuel(2);await f.load();
  for(const [shipId,actor] of [['ship',f.player],['escort',f.other]])await f.startFlight({shipId,navigationCode:'VIA1-CODE'},actor);f.advance(180000);await f.navCommand('finishSoPreparation');await f.navCommand('finishSoPreparation',{shipId:'escort'},f.other);
  const before=await f.get(`contracts/${f.ec.id}`),p={shipId:'ship',navigationCode:'ALT1-CODE'},q=await f.read('prepareSoDetour',p);f.setDie(6);await f.cmd('attemptSoDetour',{...p,confirmation:q.confirmation});f.advance(300000);const n=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation});assert.equal((await f.view()).transport.complete,false);await f.flight('AWAY-CODE');await f.deliver();assert.equal((await f.view()).transport.complete,true);assert.equal((await f.lots())[0].transportLegIndex,2);assert.deepEqual(await f.get(`contracts/${f.ec.id}`),before);
 });

 test(`${prefix} : séparation et nouvelle liaison gardent les reçus d’interception sur leur tronçon`,async()=>{
  const f=await convoyFixture(makeStore,{fuel:8,combat:true,intercept:false,departureCode:'OUT-SECRET',prepareExtra:detourRoutes});await f.leave();const input={shipId:'ship',navigationCode:'ALTERNATE-CODE'},q=await f.read('prepareSoDetour',input);f.setDie(6);await f.cmd('attemptSoDetour',{...input,confirmation:q.confirmation});const p=await f.read('prepareSpaceInterception',{shipId:'escort'},f.owner);await f.cmd('triggerSpaceInterception',{shipId:'escort',confirmation:p.confirmation,reason:'L’escorte séparée reste sur la liaison initiale'},f.owner);assert.equal((await f.ship()).journey.interceptionCovered,undefined);assert.equal((await f.ship()).combatId,undefined);assert.ok((await f.get('ships/escort')).combatId);
 });

}
