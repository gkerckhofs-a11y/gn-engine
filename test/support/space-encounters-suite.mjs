import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {inventoryHash} from '../../src/core/inventory-state.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {shopStockId,shopAccountId} from '../../src/core/space-outlaws-shop-state.mjs';
export const order=(kind,patch={})=>({kind,fallback:'PASSIVE',acceptSurrender:false,ceasefire:false,...patch});
export async function encountersFixture(makeStore,{combat=true,encounter=true,...options}={}){
 const f=await soVoyagesFixture(makeStore,options),base=`sessions/${f.sid}`;
 const edit=async(path,fn)=>f.store.runTransaction(async tx=>tx.set(`${base}/${path}`,fn(await tx.get(`${base}/${path}`))));
 const stock=async(quantity=10)=>{const p={shopId:'counter',offerId:'fuel',provisionId:randomUUID(),quantity,restricted:true,source:'Réserve physique PNJ',reason:'Assistance autorisée'},q=await f.read('prepareShopProvision',p,f.owner);return f.cmd('provisionShop',{...p,confirmation:q.confirmation},f.owner);};
 const get=(p)=>f.store.get(`${base}/${p}`);
 const wallet=()=>get(`accounts/${accountId(f.cid)}`);
 let combatId;
 const detail=async(actor=f.player)=>(await f.read('spaceCombat',{combatId},actor)).combat;
 const adminDetail=async()=>(await f.read('spaceCombatAdmin',{},f.owner)).combats.find(e=>e.id===combatId);
 const combatCmd=async(action,patch={},actor=f.player)=>{const admin=actor===f.owner,d=admin?await adminDetail():await detail(actor);return f.cmd(action,{combatId,...(!admin?{shipId:d.ownShipId}:{}),confirmation:d.confirmation,...patch},actor);};
 const submit=(kind,actor=f.player,patch={})=>combatCmd('submitSpaceOrder',{order:order(kind,patch)},actor);
 const resolve=async()=>{f.advance(90000);return combatCmd('resolveSpaceRound');};
 const arm=async(shipId='second',actor=f.other)=>{const p={shipId,navigationCode:'OUT-SECRET'},q=await f.read('prepareSpaceAmbush',p,actor);return f.cmd('armSpaceAmbush',{...p,confirmation:q.confirmation,present:true},actor);};
 const intercept=async()=>{const q=await f.read('prepareSpaceInterception',{shipId:'ship'},f.owner),e=await f.cmd('triggerSpaceInterception',{shipId:'ship',confirmation:q.confirmation,reason:'Interception réelle sur cette liaison'},f.owner);combatId=e.id;return e;};
 const begin=()=>combatCmd('startSpaceCombat',{reason:'Options expliquées aux deux pilotes',briefed:true},f.owner);
 if(combat){
  await f.provision({shipId:'second',name:'Pirate',pilotId:f.otherId,ownerId:f.otherId});await stock();
  const sale=await f.buy({offerId:'fuel',quantity:6},f.other);await f.pickup(sale,f.other);await f.refuel(6);
  const lot=(await f.read('myInventory',{},f.other)).lots.find(x=>x.item.id==='propellant'),p={shipId:'second',lotId:lot.id,quantity:6},q=await f.read('prepareRefuel',p,f.other);
  await f.cmd('refuelShip',{...p,confirmation:q.confirmation,present:true},f.other);f.advance(120000);await f.navCommand('finishSoRefuel',{shipId:'second'},f.other);
  await f.startFlight();await f.startFlight({shipId:'second'},f.other);f.advance(180000);await f.navCommand('finishSoPreparation');await f.navCommand('finishSoPreparation',{shipId:'second'},f.other);
  await arm();if(encounter)await intercept();
 }
 const offer=async(quantity=2)=>{const p={shipId:'ship',shopId:'counter',offerId:'fuel',quantity,source:'PNJ physiquement disponible',reason:'Panne sèche',present:true},q=await f.read('prepareSpaceRescueOffer',p,f.owner);return f.cmd('offerSpaceRescue',{...p,confirmation:q.confirmation},f.owner);};
 const rescues=async(actor=f.player)=>(await f.read(actor===f.owner?'spaceRescueAdmin':'spaceRescues',{},actor)).rescues;
 const rescueCmd=async(action,r,patch={},actor=f.player)=>{const d=(await rescues(actor)).find(x=>x.id===r.id);return f.cmd(action,{rescueId:r.id,confirmation:d.confirmation,...patch},actor);};
 const rescueStart=async r=>{const d=await f.read('prepareSpaceRescue',{rescueId:r.id});return f.cmd('startSpaceRescue',{rescueId:r.id,confirmation:d.confirmation,present:true});};
 const panne=async()=>{await stock();await f.refuel(2);f.setDice([1,5]);await f.fly();assert.equal((await f.ship()).journey.event.fuelDebt,1);};
 return {...f,edit,get,stock,wallet,detail,adminDetail,combatCmd,submit,resolve,arm,intercept,begin,offer,rescues,rescueCmd,rescueStart,panne,combatId:()=>combatId};
}
export function spaceEncountersSuite(makeStore,prefix='Rencontres spatiales SO'){
 test(`${prefix} : dépannage réel, réservation puis débit ordinaire et stock consommé`,async()=>{
  const f=await encountersFixture(makeStore,{combat:false});await f.panne();const r=await f.offer(),before=await f.wallet(),stock=await f.get(`inventory/${shopStockId('fuel')}`),till=await f.get(`accounts/${shopAccountId('counter')}`);const pa=await f.points();
  await assert.rejects(f.read('spaceRescueAdmin'),{code:'FORBIDDEN'});assert.deepEqual(await f.rescues(f.other),[]);assert.doesNotMatch(JSON.stringify(await f.rescues()),/source|PNJ physiquement/);
  await f.rescueStart(r);assert.equal((await f.wallet()).reserved,150);assert.equal((await f.wallet()).balance,before.balance);await assert.rejects(f.rescueCmd('finishSpaceRescue',r,{received:true}),{code:'VOYAGE_NOT_READY'});
  f.advance(120000);const proof=(await f.rescues())[0],input={rescueId:r.id,confirmation:proof.confirmation,received:true,requestId:randomUUID()};const done=await f.cmd('finishSpaceRescue',input);assert.deepEqual(await f.cmd('finishSpaceRescue',input),done);
  assert.equal((await f.wallet()).balance,before.balance-150);assert.equal((await f.wallet()).protectedCredits,before.protectedCredits);assert.equal((await f.wallet()).reserved,0);assert.equal((await f.get(`accounts/${shopAccountId('counter')}`)).balance,till.balance+150);assert.equal((await f.get(`inventory/${stock.id}`)).quantity,stock.quantity-2);assert.equal((await f.ship()).fuel,1);assert.equal((await f.ship()).journey.suspended,false);assert.equal((await f.ship()).journey.event.fuelDebt,0);assert.equal((await f.points()).available,pa.available);assert.ok((await f.read('myWallet')).entries.some(x=>x.kind==='SPACE_RESCUE'));
 });
 test(`${prefix} : dépannage annulé en pause, stocks et crédits intégralement libérés`,async()=>{
  const f=await encountersFixture(makeStore,{combat:false});await f.panne();const r=await f.offer();await f.rescueStart(r);await f.stage('PAUSE');f.advance(600000);assert.equal((await f.rescues())[0].remainingSeconds,120);await f.rescueCmd('cancelSpaceRescue',r,{reason:'Intervention abandonnée'});assert.equal((await f.wallet()).balance,200);assert.equal((await f.wallet()).reserved,0);assert.equal((await f.get(`inventory/${shopStockId('fuel')}`)).quantity,10);assert.equal((await f.ship()).journey.suspended,true);assert.equal((await f.ship()).rescueId,null);
 });
 test(`${prefix} : fonds protégés, faux stock, ancien devis et double dépannage refusés`,async()=>{
  const f=await encountersFixture(makeStore,{combat:false});await f.panne();const r=await f.offer();await assert.rejects(f.offer(),{code:'SPACE_SHIP_BUSY'});const q=await f.read('prepareSpaceRescue',{rescueId:r.id});await f.stock();await assert.rejects(f.cmd('startSpaceRescue',{rescueId:r.id,confirmation:q.confirmation,present:true}),{code:'STALE_REVISION'});await f.edit(`accounts/${accountId(f.cid)}`,a=>({...a,balance:0,protectedCredits:999}));await assert.rejects(f.rescueStart(r),{code:'INSUFFICIENT_FUNDS'});await f.edit(`accounts/${accountId(f.cid)}`,a=>({...a,balance:200}));await f.edit(`inventory/${shopStockId('fuel')}`,l=>({...l,quantity:0}));await assert.rejects(f.rescueStart(r),{code:'INSUFFICIENT_STOCK'});
 });
 test(`${prefix} : rencontre réelle suspend deux voyages, paix mutuelle reprend le temps restant`,async()=>{
  const f=await encountersFixture(makeStore);const original=(await f.ship()).journey.remainingMs;assert.equal(original,300000);assert.equal((await f.ship()).journey.intercepted,true);assert.equal((await f.get('ships/second')).journey.suspended,true);await assert.rejects(f.cmd('continueSoVoyage',{shipId:'ship',confirmation:(await f.read('spaceportAdmin',{},f.owner)).ships[0].confirmation,reason:'Contournement'},f.owner),{code:'SPACE_SHIP_BUSY'});
  await f.combatCmd('consentSpacePeace',{agree:true});assert.equal((await f.detail()).status,'ENCOUNTER');f.advance(500000);await f.combatCmd('consentSpacePeace',{agree:true},f.other);assert.equal((await f.detail()).reason,'CEASEFIRE');assert.equal((await f.navigation()).ship.journey.remainingSeconds,300);assert.equal((await f.ship()).revisionRequired,false);await assert.rejects(f.arm('ship',f.player),{code:'SPACE_SHIP_BUSY'});
 });
 test(`${prefix} : seuls les participants lisent, aucun ordre adverse avant verrouillage`,async()=>{
  const f=await encountersFixture(makeStore);await f.begin();const before=await f.detail(f.other);await f.submit('ATTACK');const after=await f.detail(f.other);assert.equal(after.confirmation,before.confirmation);assert.equal(after.ownOrder,null);assert.doesNotMatch(JSON.stringify(after),/ATTACK|candidateIds|OUT-SECRET|Interception réelle/);await assert.rejects(f.read('spaceCombatAdmin'),{code:'FORBIDDEN'});await assert.rejects(f.combatCmd('resolveSpaceRound'),{code:'SPACE_ROUND_PENDING'});await f.resolve();const publicResult=await f.detail();assert.ok(publicResult.lastRound.shots.length);assert.ok(publicResult.lastRound.after.every(x=>!('fuel'in x)&&!('maneuverability'in x)));
 });
 test(`${prefix} : deux tirs simultanés à zéro Coque sans mort ni transfert de propriété`,async()=>{
  const f=await encountersFixture(makeStore);for(const id of ['ship','second'])await f.edit(`ships/${id}`,s=>({...s,hull:1,shield:0}));const chars=await Promise.all([f.get(`characters/${f.cid}`),f.get(`characters/${f.otherId}`)]);await f.begin();await f.submit('ATTACK');await f.submit('ATTACK',f.other);f.setDie(6);const r=await f.resolve();assert.equal(r.status,'CLOSED');assert.equal(r.result.shots.length,2);for(const [i,id]of ['ship','second'].entries()){const s=await f.get(`ships/${id}`);assert.equal(s.hull,0);assert.equal(s.revisionRequired,true);assert.equal(s.journey.suspended,true);assert.equal(s.ownerId,chars[i].id);assert.equal((await f.get(`characters/${chars[i].id}`)).hp,chars[i].hp);}await assert.rejects(f.cmd('continueSoVoyage',{shipId:'ship',confirmation:(await f.read('spaceportAdmin',{},f.owner)).ships.find(x=>x.shipId==='ship').confirmation,reason:'Sans réparation'},f.owner),{code:'VOYAGE_SUSPENDED'});
 });
 test(`${prefix} : ordres absents, silence sur reddition, deux rounds calmes sans gagnant`,async()=>{
  const f=await encountersFixture(makeStore);await f.begin();await f.submit('SURRENDER');await f.resolve();assert.equal((await f.detail()).status,'ROUND');await f.resolve();assert.equal((await f.detail()).reason,'QUIET');assert.equal((await f.ship()).revisionRequired,false);assert.equal((await f.points()).available,4);
 });
 test(`${prefix} : reddition acceptée explicitement et repli hostile en cas de refus`,async()=>{
  const f=await encountersFixture(makeStore);await f.begin();await f.submit('SURRENDER',f.player,{fallback:'ATTACK'});await f.resolve();assert.equal((await f.detail()).lastRound.shots.length,1);await f.submit('SURRENDER');await f.submit('PASSIVE',f.other,{acceptSurrender:true});await f.resolve();assert.equal((await f.detail()).reason,'SURRENDER');
 });
 test(`${prefix} : round de 90 secondes suspendu par la pause, preuve périmée refusée`,async()=>{
  const f=await encountersFixture(makeStore);await f.begin();const d=await f.detail();f.advance(30000);await f.stage('PAUSE');f.advance(600000);assert.equal((await f.detail()).remainingSeconds,60);await assert.rejects(f.submit('ATTACK'),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await assert.rejects(f.cmd('submitSpaceOrder',{combatId:f.combatId(),shipId:'ship',confirmation:d.confirmation,order:order('ATTACK')}),{code:'STALE_REVISION'});f.advance(60000);await assert.rejects(f.submit('ATTACK'),{code:'SPACE_ROUND_LOCKED'});await f.combatCmd('resolveSpaceRound');
 });
 test(`${prefix} : PIL-03 N1 consomme un PA une fois, échec conserve la rencontre`,async()=>{
  const f=await encountersFixture(makeStore);f.setDie(1);const r=await f.combatCmd('spaceBreakaway');assert.equal(r.success,false);assert.equal((await f.points()).available,3);await assert.rejects(f.combatCmd('spaceBreakaway'),{code:'SPACE_COMBAT_PHASE'});await f.begin();await assert.rejects(f.submit('PIL03_2'),{code:'SPACE_SPECIAL_USED'});
 });
 test(`${prefix} : PIL-03 N1 réussi reprend le vol sans révision ni combat`,async()=>{
  const f=await encountersFixture(makeStore);f.setDie(6);await f.combatCmd('spaceBreakaway');assert.equal((await f.detail()).reason,'BREAKAWAY');assert.equal((await f.ship()).journey.suspended,false);assert.equal((await f.ship()).revisionRequired,false);
 });
 test(`${prefix} : PIL-03 N2 réserve, remplace et rembourse sans attaque désignée`,async()=>{
  const f=await encountersFixture(makeStore);await f.begin();await f.submit('PIL03_2');assert.equal((await f.points()).reserved,1);await f.submit('DEFEND');assert.equal((await f.points()).reserved,0);assert.equal((await f.points()).available,4);await f.submit('PIL03_2');await f.resolve();assert.equal((await f.points()).reserved,0);assert.equal((await f.points()).available,4);assert.equal((await f.ship()).journey.pil03Used,false);await f.submit('PIL03_2');await f.submit('ATTACK',f.other);await f.resolve();assert.equal((await f.points()).available,3);assert.equal((await f.ship()).journey.pil03Used,true);
 });
 test(`${prefix} : niveau insuffisant et champs de dé injectés refusés`,async()=>{
  const f=await encountersFixture(makeStore);await f.begin();await assert.rejects(f.submit('PIL03_5'),{code:'FIELD_SKILL_REQUIRED'});await assert.rejects(f.submit('ATTACK',f.player,{die:6}),{code:'INVALID_ADMISSION'});
 });
 test(`${prefix} : pilote révoqué, ordre spécial remboursé et résolution MJ possible`,async()=>{
  const f=await encountersFixture(makeStore);await f.begin();await f.submit('PIL03_2');await f.edit(`registrations/${inventoryHash(f.player.uid)}`,r=>({...r,accessActive:false}));await assert.rejects(f.detail());f.advance(90000);await f.combatCmd('resolveSpaceRoundAdmin',{},f.owner);const resource=await f.get(`characters/${f.cid}/resources/actionPoints`);assert.equal(resource.reserved,0);assert.equal((await f.ship()).journey.pil03Used,false);
 });
 test(`${prefix} : PIL-03 N3 à N5 exécutés avec coûts réels et limite par voyage`,async()=>{
  for(const [kind,enemy]of [['PIL03_3','DEFEND'],['PIL03_4','PURSUE'],['PIL03_5','ATTACK']]){const f=await encountersFixture(makeStore);await f.edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(s=>s.id==='PIL-03'?{...s,level:5}:s)}}));await f.begin();const before=(await f.ship()).fuel;await f.submit(kind);await f.submit(enemy,f.other);f.setDice([6,6,1,1,1,1,6,1]);await f.resolve();assert.equal((await f.points()).available,3);assert.equal((await f.points()).reserved,0);assert.equal((await f.ship()).journey.pil03Used,true);assert.equal((await f.ship()).fuel,before-(kind==='PIL03_4'?1:0));if((await f.detail()).status==='ROUND')await assert.rejects(f.submit(kind),{code:'SPACE_SPECIAL_USED'});}
 });
 test(`${prefix} : anciens manifestes sans combat restent fermés`,async()=>{
  const f=await soVoyagesFixture(makeStore,{release:false});await f.release(await f.releasePreview());const s=await f.read('session',{},f.owner);
  // A real old manifest digest, not an implicit runtime migration.
  const campaign=await f.store.get(`campaigns/${s.campaignId}`),vp=`campaigns/${s.campaignId}/versions/${campaign.master.activeVersionId}`;
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await f.store.runTransaction(async tx=>{const {combatVersion,manifestDigest,...h}=await tx.get(vp);tx.set(vp,{...h,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(h))).digest('hex')});});await f.birth(await f.birthPreview());await assert.rejects(f.read('spaceCombats'),{code:'SO_GAMEPLAY_NOT_OPEN'});await assert.rejects(f.read('spaceRescues'),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : deux soumissions concurrentes et double résolution ne doublent aucun coût`,async()=>{
  const f=await encountersFixture(makeStore);await f.begin();const d=await f.detail(),input={combatId:f.combatId(),shipId:'ship',confirmation:d.confirmation,order:order('PIL03_2')};const submitted=await Promise.allSettled([f.cmd('submitSpaceOrder',input),f.cmd('submitSpaceOrder',input)]);assert.equal(submitted.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.points()).reserved,1);await f.submit('ATTACK',f.other);f.advance(90000);const q=await f.detail(),resolve={combatId:f.combatId(),shipId:'ship',confirmation:q.confirmation};const results=await Promise.allSettled([f.cmd('resolveSpaceRound',resolve),f.cmd('resolveSpaceRound',resolve)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.points()).available,3);assert.equal((await f.store.list(`sessions/${f.sid}/spaceCombats/${f.combatId()}/rounds`)).length,1);
 });
 test(`${prefix} : interruption atomique du dépannage conserve stock, fonds et dette`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await encountersFixture(()=>store,{combat:false});await f.panne();const r=await f.offer();await f.rescueStart(r);f.advance(120000);fail=true;await assert.rejects(f.rescueCmd('finishSpaceRescue',r,{received:true}),/INTERRUPTION/);fail=false;assert.equal((await f.wallet()).balance,200);assert.equal((await f.wallet()).reserved,150);assert.equal((await f.ship()).journey.event.fuelDebt,1);assert.equal((await f.get(`inventory/${shopStockId('fuel')}`)).quantity,10);await f.rescueCmd('finishSpaceRescue',r,{received:true});assert.equal((await f.wallet()).balance,50);
 });
 test(`${prefix} : dépannage révoqué ne rejoue pas son reçu, le MJ peut libérer les réserves`,async()=>{
  const f=await encountersFixture(makeStore,{combat:false});await f.panne();const r=await f.offer(),q=await f.read('prepareSpaceRescue',{rescueId:r.id}),input={rescueId:r.id,confirmation:q.confirmation,present:true,requestId:randomUUID()};await f.cmd('startSpaceRescue',input);await f.edit(`registrations/${inventoryHash(f.player.uid)}`,r=>({...r,accessActive:false}));await assert.rejects(f.cmd('startSpaceRescue',input),{code:'FORBIDDEN'});await f.rescueCmd('cancelSpaceRescueAdmin',r,{reason:'Pilote révoqué'},f.owner);assert.equal((await f.wallet()).reserved,0);assert.equal((await f.ship()).rescueId,null);
 });
 test(`${prefix} : STOP bloque ordres, jet et débit, sans faire avancer le round`,async()=>{
  const f=await encountersFixture(makeStore);await f.begin();await f.store.runTransaction(async tx=>{const p=`sessions/${f.sid}`,s=await tx.get(p);tx.set(p,{...s,safetyStop:{active:true},clock:{...s.clock,runningSince:null}});});await assert.rejects(f.submit('ATTACK'),{code:'SO_SAFETY_STOP'});f.advance(90000);await assert.rejects(f.combatCmd('resolveSpaceRound'),{code:'SO_SAFETY_STOP'});assert.equal((await f.points()).reserved,0);
 });

 test(`${prefix} : embuscade liée au voyage, arrivée expire la position sans interception fictive`,async()=>{
  const f=await encountersFixture(makeStore,{encounter:false});await assert.rejects(f.arm(),{code:'SPACE_SHIP_BUSY'});await assert.rejects(f.read('prepareSpaceAmbush',{shipId:'ship',navigationCode:'FAUX'}),{code:'ROUTE_UNAVAILABLE'});const a=(await f.read('spaceCombats',{},f.other)).ambushes[0];f.advance(300000);const d=await f.navigation('second',f.other);await f.cmd('arriveShip',{shipId:'second',confirmation:d.confirmation},f.other);assert.equal((await f.get(`spaceAmbushes/${a.id}`)).status,'EXPIRED');assert.equal((await f.get('ships/second')).ambushId,null);assert.deepEqual((await f.read('spaceCombats',{},f.other)).ambushes,[]);assert.equal((await f.get('ships/second')).revisionRequired,false);
 });

}
