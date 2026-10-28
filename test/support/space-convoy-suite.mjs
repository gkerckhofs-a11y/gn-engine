import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {transportFixture} from './space-transport-suite.mjs';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {inventoryHash as hash} from '../../src/core/inventory-state.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
import {order} from './space-encounters-suite.mjs';

export async function convoyFixture(makeStore,{fuel=6,form=true,combat=false,intercept=true,freight=false,separateBeforeInterception=false,...options}={}){
 const f=freight?await transportFixture(makeStore,{quantity:5}):await soVoyagesFixture(makeStore,options),base=`sessions/${f.sid}`,get=p=>f.store.get(`${base}/${p}`),edit=(p,fn)=>f.store.runTransaction(async tx=>{const x=await tx.get(`${base}/${p}`);tx.set(`${base}/${p}`,fn(x));});
 await f.provision({shipId:'escort',name:'Escorte',ownerId:f.otherId,pilotId:f.otherId});
 const stock=async q=>{const p={shopId:'counter',offerId:'fuel',provisionId:randomUUID(),quantity:q,restricted:true,source:'Stock synthétique explicite',reason:'Recette convoi'},r=await f.read('prepareShopProvision',p,f.owner);await f.cmd('provisionShop',{...p,confirmation:r.confirmation},f.owner);};
 const fill=async(shipId,actor,quantity)=>{await stock(quantity);const sale=await f.buy({offerId:'fuel',quantity},actor);await f.pickup(sale,actor);const lot=(await f.read('myInventory',{},actor)).lots.find(l=>l.id===sale.purchasedLotId),p={shipId,lotId:lot.id,quantity},q=await f.read('prepareRefuel',p,actor);await f.cmd('refuelShip',{...p,confirmation:q.confirmation,present:true},actor);f.advance(120000);await f.navCommand('finishSoRefuel',{shipId},actor);};
 if(freight){if(fuel>4)await f.refuel(fuel-4);await f.accept();await f.load();}else await f.refuel(fuel);await fill('escort',f.other,fuel);
 const propose=async()=>{const p={shipId:'ship',escortShipId:'escort',navigationCode:options.departureCode??'AWAY-CODE'},q=await f.read('prepareSoConvoy',p);return f.cmd('proposeSoConvoy',{...p,confirmation:q.confirmation});};
 const accept=async()=>{const o=(await f.navigation('escort',f.other)).invitations[0];return f.cmd('acceptSoConvoy',{shipId:'escort',leaderShipId:'ship',confirmation:o.confirmation},f.other);};
 const launch=async(dice=[6,6,1])=>{await f.startFlight();await f.startFlight({shipId:'escort'},f.other);f.advance(180000);await f.navCommand('finishSoPreparation');f.setDice(dice);return f.navCommand('finishSoPreparation',{shipId:'escort'},f.other);};
 const leave=async(actor=f.player,shipId='ship')=>{const q=await f.navigation(shipId,actor);return f.cmd('leaveSoConvoy',{shipId,confirmation:q.confirmation,reason:'Séparation consentie'},actor);};
 if(form){await propose();await accept();}
 let pirate=null,pirateId=null,combatId=null;
 if(combat){
  // Additional authenticated participant is synthetic test setup; the actual
  // ship, fuel purchases, preparations and encounter use gameplay commands.
  pirate={...f.other,uid:randomUUID(),email:`pirate-${randomUUID()}@example.invalid`};pirateId=randomUUID();
  const ch=await get(`characters/${f.otherId}`),reg=await get(`registrations/${hash(f.other.uid)}`),wallet=await get(`accounts/${accountId(f.otherId)}`);
  await f.store.runTransaction(async tx=>{tx.set(`${base}/characters/${pirateId}`,{...ch,id:pirateId,assignedUid:pirate.uid,publicCode:randomUUID(),public:{...ch.public,displayName:'Pirate synthétique'}});tx.set(`${base}/registrations/${hash(pirate.uid)}`,{...reg,id:hash(pirate.uid),uid:pirate.uid,characterId:pirateId});tx.set(`${base}/accounts/${accountId(pirateId)}`,{...wallet,id:accountId(pirateId),characterId:pirateId,ownerId:pirateId,balance:200,protectedCredits:0});});
  await f.provision({shipId:'pirate',name:'Pirate',ownerId:pirateId,pilotId:pirateId});await fill('pirate',pirate,6);await launch();if(separateBeforeInterception)await leave();await f.startFlight({shipId:'pirate'},pirate);f.advance(180000);await f.navCommand('finishSoPreparation',{shipId:'pirate'},pirate);
  const arm={shipId:'pirate',navigationCode:'AWAY-CODE'},q=await f.read('prepareSpaceAmbush',arm,pirate);await f.cmd('armSpaceAmbush',{...arm,confirmation:q.confirmation,present:true},pirate);
  if(intercept){const p=await f.read('prepareSpaceInterception',{shipId:'escort'},f.owner),e=await f.cmd('triggerSpaceInterception',{shipId:'escort',confirmation:p.confirmation,reason:'Interception de convoi synthétique'},f.owner);combatId=e.id;}
 }
 const detail=async(actor=f.player)=>(await f.read(actor===f.owner?'spaceCombatAdmin':'spaceCombat',actor===f.owner?{}:{combatId},actor))[actor===f.owner?'combats':'combat'];
 const combatCmd=async(action,patch={},actor=f.player)=>{const d=actor===f.owner?(await detail(actor)).find(e=>e.id===combatId):await detail(actor);return f.cmd(action,{combatId,confirmation:d.confirmation,...(actor===f.owner?{}:{shipId:d.ownShipId}),...patch},actor);};
 const submit=(kind,targetId,actor=f.player,patch={})=>combatCmd('submitSpaceOrder',{order:order(kind,{targetId,defenseIds:[],...patch})},actor);
 const begin=()=>combatCmd('startSpaceCombat',{briefed:true,reason:'Briefing des trois pilotes'},f.owner);
 const round=async(dice=Array(13).fill(1))=>{f.advance(90000);f.setDice(dice);return combatCmd('resolveSpaceRoundAdmin',{},f.owner);};
 return {...f,get,edit,stock,fill,propose,accept,launch,leave,pirate,pirateId,combatId,detail,combatCmd,submit,begin,round};
}
export function spaceConvoySuite(makeStore,prefix='Convois SO'){
 test(`${prefix} : invitation privée, accord distinct et aucun accès aux secrets du partenaire`,async()=>{
  const f=await convoyFixture(makeStore,{form:false});await f.propose();assert.equal((await f.get('ships/escort')).convoy,undefined);const d=await f.navigation('escort',f.other);assert.equal(d.invitations.length,1);assert.doesNotMatch(JSON.stringify(d),/OUT-SECRET|SECRET_|leaderPilotVersion|escortPilotId|AWAY-CODE/);await assert.rejects(f.navigation('ship',f.other),{code:'FORBIDDEN'});await f.accept();assert.ok((await f.get('ships/ship')).convoy);assert.equal((await f.navigation('escort',f.other)).convoyCode,'AWAY-CODE');await assert.rejects(f.read('prepareVoyage',{shipId:'escort',navigationCode:'HOME-CODE',passengerCodes:[]},f.other));
 });
 test(`${prefix} : deux préparations, un départ, deux coûts réels et arrivée commune`,async()=>{
  const f=await convoyFixture(makeStore);await f.startFlight();await f.startFlight({shipId:'escort'},f.other);f.advance(180000);const wait=await f.navCommand('finishSoPreparation');assert.equal(wait.status,'WAITING_CONVOY');assert.equal((await f.ship()).fuel,6);assert.equal((await f.points()).reserved,1);
  const q=await f.navigation('escort',f.other),p={shipId:'escort',confirmation:q.confirmation,present:true,requestId:randomUUID()},done=await f.cmd('finishSoPreparation',p,f.other);assert.deepEqual(await f.cmd('finishSoPreparation',p,f.other),done);const a=await f.ship(),b=await f.get('ships/escort');assert.equal(a.journey.convoyId,b.journey.convoyId);assert.equal(a.journey.departedAt,b.journey.departedAt);assert.equal(a.fuel,4);assert.equal(b.fuel,4);assert.equal((await f.points()).available,4);assert.equal((await f.points(f.other)).available,4);
  await assert.rejects(f.read('prepareSpaceAmbush',{shipId:'ship',navigationCode:'AWAY-CODE'}),{code:'SPACE_SHIP_BUSY'});f.advance(300000);const n=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation});assert.equal((await f.get('ships/escort')).portId,'away');assert.equal((await f.ship()).convoy,null);assert.equal((await f.get(`characters/${f.otherId}`)).activeVoyageId,null);
 });
 test(`${prefix} : événement commun, surcharge d’un seul appareil et reprise MJ commune`,async()=>{
  const f=await convoyFixture(makeStore);await f.launch([1,5,2]);assert.equal((await f.ship()).fuel,4);assert.equal((await f.get('ships/escort')).fuel,3);assert.equal((await f.ship()).journey.event.affectedShipId,'escort');assert.equal((await f.get('ships/escort')).journey.event.roll,1);
  const g=await convoyFixture(makeStore);await g.launch([1,1,1]);assert.ok((await g.get('ships/escort')).journey.suspended);g.advance(900000);const q=(await g.read('spaceportAdmin',{},g.owner)).ships.find(x=>x.shipId==='ship');await g.cmd('continueSoVoyage',{shipId:'ship',confirmation:q.confirmation,reason:'Rencontre commune terminée'},g.owner);assert.equal((await g.navigation('escort',g.other)).ship.journey.remainingSeconds,300);assert.equal((await g.ship()).journey.event.roll,1);
 });
 test(`${prefix} : pause, préparation annulée et séparation ne consomment aucune réserve`,async()=>{
  const f=await convoyFixture(makeStore);await f.startFlight();await f.startFlight({shipId:'escort'},f.other);f.advance(180000);await f.navCommand('finishSoPreparation');await f.stage('PAUSE');f.advance(999999);await assert.rejects(f.navCommand('finishSoPreparation',{shipId:'escort'},f.other),{code:'SESSION_NOT_RUNNING'});await assert.rejects(f.leave(),{code:'SPACE_SHIP_BUSY'});for(const [shipId,actor] of [['ship',f.player],['escort',f.other]]){const q=await f.navigation(shipId,actor);await f.cmd('cancelSoNavigation',{shipId,confirmation:q.confirmation,reason:'Interruption'},actor);}await f.leave();assert.equal((await f.points()).available,5);assert.equal((await f.points(f.other)).available,5);assert.equal((await f.ship()).fuel,6);assert.equal((await f.get('ships/escort')).convoy,null);
 });
 test(`${prefix} : révocation avant acceptation ou second départ bloque le reçu`,async()=>{
  const f=await convoyFixture(makeStore,{form:false});await f.propose();await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.accept(),{code:'SO_CONVOY_CLOSED'});
  const g=await convoyFixture(makeStore);await g.startFlight();await g.startFlight({shipId:'escort'},g.other);g.advance(180000);await g.navCommand('finishSoPreparation');await g.cmd('revokeAccess',{uid:g.player.uid},g.owner);await assert.rejects(g.navCommand('finishSoPreparation',{shipId:'escort'},g.other),{code:'INVALID_MANIFEST'});assert.equal((await g.get('ships/escort')).fuel,6);
 });
 test(`${prefix} : séparation en vol conserve temps, événement et carburant`,async()=>{
  const f=await convoyFixture(makeStore);await f.launch([1,4,1]);f.advance(60000);const before=await f.ship();await f.leave();for(const id of ['ship','escort']){const x=await f.get(`ships/${id}`);assert.equal(x.convoy,null);assert.equal(x.journey.arrivesAtGameMs,before.journey.arrivesAtGameMs);assert.equal(x.journey.event.tableRoll,4);assert.equal(x.fuel,4);}await assert.rejects(f.read('prepareSoConvoy',{shipId:'ship',escortShipId:'escort',navigationCode:'AWAY-CODE'}),{code:'SPACE_SHIP_BUSY'});
 });
 test(`${prefix} : interception unique suspend trois appareils, paix unanime et ordres privés`,async()=>{
  const f=await convoyFixture(makeStore,{combat:true});assert.equal((await f.detail()).ships.length,3);for(const id of ['ship','escort','pirate'])assert.equal((await f.get(`ships/${id}`)).combatId,f.combatId);await assert.rejects(f.read('prepareSpaceInterception',{shipId:'escort'},f.owner),{code:'SPACE_INTERCEPTION_USED'});
  await f.combatCmd('consentSpacePeace',{agree:true});await f.combatCmd('consentSpacePeace',{agree:true},f.pirate);assert.equal((await f.detail()).status,'ENCOUNTER');await f.combatCmd('consentSpacePeace',{agree:true},f.other);assert.equal((await f.detail()).status,'CLOSED');assert.equal((await f.get('ships/escort')).journey.intercepted,true);assert.equal((await f.ship()).revisionRequired,false);
 });
 test(`${prefix} : le cargo peut fuir pendant que l’escorte combat, puis arriver séparément`,async()=>{
  const f=await convoyFixture(makeStore,{combat:true});await f.begin();await f.submit('FLEE','pirate');await f.submit('ATTACK','pirate',f.other);await f.submit('ATTACK','escort',f.pirate);const privateView=await f.detail();assert.equal(privateView.ownOrder.kind,'FLEE');assert.doesNotMatch(JSON.stringify(privateView),/"kind":"ATTACK"/);await f.round(Array(13).fill(6));assert.equal((await f.ship()).combatId,null);assert.equal((await f.get('ships/escort')).combatId,f.combatId);assert.deepEqual((await f.detail(f.other)).activeShipIds,['pirate','escort']);await assert.rejects(f.submit('ATTACK','pirate'),{code:'OUT_OF_COMBAT'});
  f.advance(300000);const n=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation});await f.round();await f.round();assert.equal((await f.detail(f.other)).status,'CLOSED');assert.equal((await f.ship()).journey,null);
 });
 test(`${prefix} : tirs simultanés, défense désignée unique et PA spécial inexécuté remboursé`,async()=>{
  const f=await convoyFixture(makeStore,{combat:true});await f.begin();await f.submit('ATTACK','pirate');await f.submit('ATTACK','pirate',f.other);await f.submit('DEFEND','ship',f.pirate,{defenseIds:['ship']});const r=await f.round(Array(13).fill(6));assert.equal(r.result.shots.length,2);assert.equal((await f.get('ships/pirate')).shield,1);assert.equal((await f.get('ships/pirate')).hull,4);assert.equal((await f.ship()).revisionRequired,true);
  await f.submit('PIL03_2','pirate',f.other,{defenseIds:['pirate']});assert.equal((await f.points(f.other)).reserved,1);await f.round();assert.equal((await f.points(f.other)).reserved,0);assert.equal((await f.get('ships/escort')).journey.pil03Used,false);
 });
 test(`${prefix} : poursuite de coalition coordonnée, STOP et paramètre injecté refusés`,async()=>{
  const f=await convoyFixture(makeStore,{combat:true});await f.begin();await f.submit('PURSUE','pirate');await assert.rejects(f.submit('PURSUE','pirate',f.other),{code:'SPACE_PURSUER_ALREADY_CHOSEN'});await assert.rejects(f.submit('ATTACK','escort'),{code:'INVALID_SPACE_ORDER'});await assert.rejects(f.submit('ATTACK','pirate',f.other,{roll:6}),{code:'INVALID_ADMISSION'});await f.store.runTransaction(async tx=>{const p=`sessions/${f.sid}`,s=await tx.get(p);tx.set(p,{...s,safetyStop:{active:true},clock:{...s.clock,runningSince:null}});});await assert.rejects(f.submit('ATTACK','pirate'),{code:'SO_SAFETY_STOP'});f.advance(90000);await assert.rejects(f.combatCmd('resolveSpaceRoundAdmin',{},f.owner),{code:'SO_SAFETY_STOP'});
 });
 test(`${prefix} : marqueur ancien fermé et concurrence ne double pas la formation`,async()=>{
  const f=await convoyFixture(makeStore,{form:false});await f.propose();const o=(await f.navigation('escort',f.other)).invitations[0],p={shipId:'escort',leaderShipId:'ship',confirmation:o.confirmation};const rs=await Promise.allSettled([f.cmd('acceptSoConvoy',p,f.other),f.cmd('acceptSoConvoy',p,f.other)]);assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);await f.leave();await f.store.runTransaction(async tx=>{const path=`sessions/${f.sid}`,s=await tx.get(path),{convoyVersion,...spaceOutlaws}=s.spaceOutlaws;tx.set(path,{...s,spaceOutlaws});});assert.equal((await f.navigation()).convoyReady,false);await assert.rejects(f.propose(),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : convoi et événement persistent entre épisodes sans ravitaillement`,async()=>{
  const f=await convoyFixture(makeStore);await f.launch([1,4,1]);f.advance(60000);const before=await f.ship(),e=await episodeHarness(f);await e.close();await e.resume(await e.begin());const a=await e.get('ships/ship'),b=await e.get('ships/escort');assert.equal(a.convoy.id,b.convoy.id);assert.deepEqual(a.journey.event,before.journey.event);assert.equal(a.fuel,before.fuel);await e.stage('EN_JEU');f.advance(420000);const n=await e.read('shipNavigation',{shipId:'ship'},f.player);await e.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation},f.player);assert.equal((await e.get('ships/escort')).portId,'away');
 });
 test(`${prefix} : panne d’un appareil suspend le groupe jusqu’au dépannage réel`,async()=>{
  const f=await convoyFixture(makeStore,{fuel:2});await f.launch([1,5,2]);assert.equal((await f.get('ships/escort')).journey.event.fuelDebt,1);assert.equal((await f.ship()).journey.suspended,true);await f.stock(4);await f.edit(`accounts/${accountId(f.otherId)}`,a=>({...a,balance:200}));
  const p={shipId:'escort',shopId:'counter',offerId:'fuel',quantity:2,source:'Service présent',reason:'Panne de convoi',present:true},q=await f.read('prepareSpaceRescueOffer',p,f.owner),r=await f.cmd('offerSpaceRescue',{...p,confirmation:q.confirmation},f.owner),a=await f.read('prepareSpaceRescue',{rescueId:r.id},f.other);await f.cmd('startSpaceRescue',{rescueId:r.id,confirmation:a.confirmation,present:true},f.other);f.advance(120000);const done=(await f.read('spaceRescues',{},f.other)).rescues.find(x=>x.id===r.id);await f.cmd('finishSpaceRescue',{rescueId:r.id,confirmation:done.confirmation,received:true},f.other);assert.equal((await f.get('ships/escort')).journey.suspended,true);
  const n=(await f.read('spaceportAdmin',{},f.owner)).ships.find(x=>x.shipId==='ship');await f.cmd('continueSoVoyage',{shipId:'ship',confirmation:n.confirmation,reason:'Dépannage terminé, convoi prêt'},f.owner);assert.equal((await f.ship()).journey.suspended,false);assert.equal((await f.get('ships/escort')).journey.suspended,false);
 });

 test(`${prefix} : interruption du second départ ne consomme ni PA ni carburant`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await convoyFixture(()=>store);await f.startFlight();await f.startFlight({shipId:'escort'},f.other);f.advance(180000);await f.navCommand('finishSoPreparation');fail=true;await assert.rejects(f.navCommand('finishSoPreparation',{shipId:'escort'},f.other),/INTERRUPTION/);fail=false;assert.equal((await f.ship()).fuel,6);assert.equal((await f.get('ships/escort')).fuel,6);assert.equal((await f.points()).reserved,1);assert.equal((await f.points(f.other)).reserved,1);assert.deepEqual(await f.store.list(`sessions/${f.sid}/voyages`),[]);await f.navCommand('finishSoPreparation',{shipId:'escort'},f.other);assert.equal((await f.store.list(`sessions/${f.sid}/voyages`)).length,2);
 });
 test(`${prefix} : séparation ne permet pas une deuxième interception du même tronçon`,async()=>{
  const f=await convoyFixture(makeStore,{combat:true,separateBeforeInterception:true});assert.equal((await f.detail(f.other)).ships.length,2);assert.equal((await f.ship()).journey.interceptionCovered,true);assert.equal((await f.ship()).combatId,undefined);await assert.rejects(f.read('prepareSpaceInterception',{shipId:'ship'},f.owner),{code:'SPACE_INTERCEPTION_USED'});await assert.rejects(f.read('prepareSpaceAmbush',{shipId:'ship',navigationCode:'AWAY-CODE'}),{code:'SPACE_SHIP_BUSY'});
 });
 test(`${prefix} : fret PNJ livré par le convoi sans accès de l’escorte à la soute privée`,async()=>{
  const f=await convoyFixture(makeStore,{freight:true});await f.launch();const cargo=await f.ship(),lot=(await f.lots())[0];assert.equal(lot.transportVoyageId,cargo.journey.id);assert.doesNotMatch(JSON.stringify(await f.navigation('escort',f.other)),/transportManifest|transportContractId|SECRET_BRIEFING/);await assert.rejects(f.read('contractDetail',{contractId:f.c.id},f.other),{code:'FORBIDDEN'});f.advance(300000);const q=await f.navigation('escort',f.other);await f.cmd('arriveShip',{shipId:'escort',confirmation:q.confirmation},f.other);await f.deliver();await f.proof();await f.review();assert.equal((await f.lots())[0].ownerType,'SHOP');assert.equal((await f.lots())[0].location.kind,'PORT');
 });

}
