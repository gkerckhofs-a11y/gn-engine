import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {encountersFixture} from './space-encounters-suite.mjs';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
export async function boardingFixture(makeStore,{closed=true,immobilized=false,...options}={}){
 const f=await encountersFixture(makeStore,options);
 if(closed){await f.begin();if(immobilized){await f.edit('ships/ship',s=>({...s,hull:1,shield:0}));f.setDie(6);await f.submit('ATTACK',f.other);}else {await f.submit('SURRENDER');await f.submit('PASSIVE',f.other,{acceptSurrender:true});}await f.resolve();}
 const combatId=f.combatId(),input={combatId,attackerShipId:'second',targetShipId:'ship',zone:'Zone d’abordage validée par le MJ',reason:'Scène supervisée',present:true,safe:true};
 const board=async(actor=f.owner)=>f.read(actor===f.owner?'spaceBoardingAdmin':'spaceBoarding',{combatId},actor);
 const prepare=(p={})=>f.read('prepareSpaceDocking',{...input,...p},f.owner);
 const start=async(p={})=>{const q=await prepare(p);return f.cmd('startSpaceDocking',{...input,...p,confirmation:q.confirmation},f.owner);};
 const command=async(action,patch={})=>{const r=(await board()).boardings.find(r=>['DOCKING','SCENE','CONTROLLED'].includes(r.status));return f.cmd(action,{combatId,boardingId:r.id,confirmation:r.confirmation,...patch},f.owner);};
 const scene=async()=>{await start();f.advance(120000);return command('finishSpaceDocking',{present:true,safe:true});};
 const resultInput={outcome:'CONTROLLED',mode:'PLAYED',orders:'',reason:'Résultat effectivement constaté par le MJ',present:true,safe:true};
 const outcome=async(p={})=>{const r=(await board()).boardings.find(r=>r.status==='SCENE'),args={combatId,boardingId:r.id,...resultInput,...p},q=await f.read('prepareSpaceBoardingOutcome',args,f.owner);return f.cmd('resolveSpaceBoarding',{...args,confirmation:q.confirmation},f.owner);};
 return {...f,board,prepare,start,command,scene,outcome,input,resultInput};
}
export function spaceBoardingSuite(makeStore,prefix='Abordage SO'){
 test(`${prefix} : arrimage deux minutes, scène puis contrôle temporaire sans mutation des acquis`,async()=>{
  const f=await boardingFixture(makeStore),before=await f.ship(),other=await f.get('ships/second'),pa=await f.points(),wallet=await f.wallet(),crew=await f.get(`characters/${f.cid}`),r=await f.start();
  assert.equal(r.status,'DOCKING');assert.equal((await f.ship()).combatId,f.combatId());assert.equal((await f.board()).boardings[0].remainingSeconds,120);assert.equal((await f.detail()).status,'CLOSED');
  f.advance(119999);await assert.rejects(f.command('finishSpaceDocking',{present:true,safe:true}),{code:'BOARDING_NOT_READY'});f.advance(1);await f.command('finishSpaceDocking',{present:true,safe:true});assert.equal((await f.board()).boardings[0].status,'SCENE');
  await f.outcome();assert.equal((await f.board()).boardings[0].status,'CONTROLLED');assert.equal((await f.ship()).journey.suspended,true);assert.equal((await f.ship()).ownerId,before.ownerId);assert.equal((await f.ship()).pilotId,before.pilotId);assert.equal((await f.get('ships/second')).ownerId,other.ownerId);assert.equal((await f.points()).available,pa.available);assert.equal((await f.points()).reserved,pa.reserved);assert.equal((await f.points()).revision,pa.revision);assert.deepEqual(await f.wallet(),wallet);assert.deepEqual(await f.get(`characters/${f.cid}`),crew);
  await f.command('releaseSpaceBoarding',{reason:'Équipages revenus à leurs postes d’origine',present:true});assert.equal((await f.ship()).combatId,null);assert.equal((await f.ship()).journey.suspended,false);assert.equal((await f.board()).boardings[0].status,'RELEASED');
 });
 test(`${prefix} : coque zéro ouvre une scène, sans inconscience ni réparation automatique`,async()=>{
  const f=await boardingFixture(makeStore,{immobilized:true}),crew=await f.get(`characters/${f.cid}`);assert.equal((await f.ship()).hull,0);await f.scene();await f.outcome({outcome:'NO_CONTROL'});assert.equal((await f.ship()).hull,0);assert.equal((await f.ship()).journey.suspended,true);assert.equal((await f.ship()).combatId,null);assert.deepEqual(await f.get(`characters/${f.cid}`),crew);
 });
 test(`${prefix} : seule la reddition effectivement acceptée rend sa cible abordable`,async()=>{
  const f=await boardingFixture(makeStore,{closed:false});await f.begin();await f.submit('SURRENDER',f.player,{acceptSurrender:true});await f.submit('SURRENDER',f.other);await f.resolve();const e=await f.get(`spaceCombats/${f.combatId()}`);assert.deepEqual(e.lastRound.surrendered,['second']);assert.deepEqual((await f.board()).choices.map(x=>x.targetShipId),['second']);await assert.rejects(f.prepare(),{code:'BOARDING_UNAVAILABLE'});
 });
 test(`${prefix} : reddition refusée et rencontre encore ouverte ne donnent aucun droit d’abordage`,async()=>{
  const f=await boardingFixture(makeStore,{closed:false});await f.begin();await f.submit('SURRENDER');await f.submit('PASSIVE',f.other);await f.resolve();await assert.rejects(f.board(),{code:'BOARDING_UNAVAILABLE'});await f.resolve();assert.deepEqual((await f.board()).choices,[]);await assert.rejects(f.start(),{code:'BOARDING_UNAVAILABLE'});
 });
 test(`${prefix} : disponibilité physique ou ordres annoncés explicitement par le MJ`,async()=>{
  const f=await boardingFixture(makeStore);await f.scene();await f.edit(`characters/${f.cid}`,c=>({...c,outOfCombat:true,hp:0}));await assert.rejects(f.outcome(),{code:'BOARDING_ORDERS_REQUIRED'});await assert.rejects(f.outcome({mode:'ANNOUNCED',orders:''}),e=>!!e.code);assert.equal((await f.board()).boardings[0].status,'SCENE');await f.outcome({mode:'ANNOUNCED',orders:'Défenseurs indisponibles : retrait négocié et annoncé aux deux équipages',outcome:'NO_CONTROL'});assert.equal((await f.board(f.other)).boardings[0].mode,'ANNOUNCED');assert.equal((await f.get(`characters/${f.cid}`)).hp,0);
 });
 test(`${prefix} : aucun équipier ajouté, remplacé ou engagé ailleurs pendant la scène`,async()=>{
  const f=await boardingFixture(makeStore);await f.scene();await f.edit(`characters/${f.cid}`,c=>({...c,activeVoyageId:'autre-trajet'}));await assert.rejects(f.outcome({mode:'ANNOUNCED',orders:'Ordres annoncés'}),{code:'BOARDING_CREW_CHANGED'});await f.command('cancelSpaceBoarding',{reason:'Manifeste incohérent signalé au MJ'});assert.equal((await f.ship()).combatId,null);
 });
 test(`${prefix} : droits courants, secrets MJ et reçus jamais accessibles aux joueurs`,async()=>{
  const f=await boardingFixture(makeStore);await assert.rejects(f.board(f.other2??{uid:'outsider',authTime:0}),e=>!!e.code);await assert.rejects(f.read('spaceBoardingAdmin',{combatId:f.combatId()}),{code:'FORBIDDEN'});await assert.rejects(f.cmd('startSpaceDocking',{...f.input,confirmation:(await f.prepare()).confirmation}),{code:'FORBIDDEN'});await f.start();const d=await f.board(f.player);assert.equal(d.boardings[0].crew.length,2);assert.doesNotMatch(JSON.stringify(d),/confirmation|originalVersion|actorUid|Scène supervisée|journeyIds|assignedUid|knowledge|missionManifest|cargoContents|transportContractId/);
 });
 test(`${prefix} : réessai, concurrence et vérification de présence/sécurité avant effet`,async()=>{
  const f=await boardingFixture(makeStore);await assert.rejects(f.prepare({safe:false}),{code:'BOARDING_SAFETY_REQUIRED'});await assert.rejects(f.prepare({present:false}),{code:'FIELD_PRESENCE_REQUIRED'});const q=await f.prepare(),inputs=[1,2].map(()=>({...f.input,confirmation:q.confirmation,requestId:randomUUID()})),rs=await Promise.allSettled(inputs.map(p=>f.cmd('startSpaceDocking',p,f.owner)));assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);const n=rs.findIndex(x=>x.status==='fulfilled');assert.deepEqual(await f.cmd('startSpaceDocking',inputs[n],f.owner),rs[n].value);assert.equal((await f.board()).boardings.length,1);await assert.rejects(f.cmd('startSpaceDocking',{...inputs[n],zone:'Autre zone'},f.owner),{code:'REQUEST_ID_REUSED'});
 });
 test(`${prefix} : annulation conserve le temps restant et autorise une nouvelle tentative journalisée`,async()=>{
  const f=await boardingFixture(makeStore),before=await f.ship();await f.start();const remaining=(await f.ship()).journey.remainingMs;f.advance(60000);await f.command('cancelSpaceBoarding',{reason:'Zone devenue indisponible'});const after=await f.ship();assert.equal(after.journey.id,before.journey.id);assert.equal(after.journey.arrivesAtGameMs-after.journey.startedAtGameMs,before.journey.arrivesAtGameMs-before.journey.startedAtGameMs+60000);assert.ok(remaining>0);await f.start();assert.equal((await f.board()).boardings.length,2);assert.equal((await f.board()).boardings.filter(x=>x.status==='DOCKING').length,1);
 });
 test(`${prefix} : arrivée échue ou nouveau trajet ne réutilisent jamais une ancienne rencontre`,async()=>{
  const f=await boardingFixture(makeStore);f.advance(9999999);assert.deepEqual((await f.board()).choices,[]);await assert.rejects(f.start(),{code:'BOARDING_UNAVAILABLE'});const g=await boardingFixture(makeStore);await g.edit('ships/ship',s=>({...s,journey:{...s.journey,id:'nouveau-trajet'}}));await assert.rejects(g.start(),{code:'BOARDING_UNAVAILABLE'});
 });
 test(`${prefix} : verrous natifs interdisent arrivée, second abordage et opérations concurrentes`,async()=>{
  const f=await boardingFixture(makeStore);await f.start();const n=await f.navigation();await assert.rejects(f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation}),{code:'SPACE_SHIP_BUSY'});await assert.rejects(f.start(),{code:'BOARDING_UNAVAILABLE'});await f.command('cancelSpaceBoarding',{reason:'Fin de démonstration'});assert.equal((await f.get(`spaceCombats/${f.combatId()}`)).activeBoardingId,null);
 });
 test(`${prefix} : révocation impose des ordres annoncés et ne bloque pas le déverrouillage MJ`,async()=>{
  const f=await boardingFixture(makeStore);await f.scene();await f.edit(`characters/${f.cid}`,c=>({...c,assignedUid:'nouvel-utilisateur'}));await assert.rejects(f.board(f.player),e=>!!e.code);await assert.rejects(f.outcome(),{code:'BOARDING_ORDERS_REQUIRED'});await f.outcome({mode:'ANNOUNCED',orders:'Défense annoncée sans participation du joueur indisponible'});await f.command('releaseSpaceBoarding',{reason:'Équipages revenus, fin du contrôle temporaire',present:true});assert.equal((await f.ship()).combatId,null);
 });
 test(`${prefix} : interruption transactionnelle ne laisse ni arrimage ni verrou ni reçu`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await boardingFixture(()=>store),q=await f.prepare(),p={...f.input,confirmation:q.confirmation,requestId:randomUUID()};fail=true;await assert.rejects(f.cmd('startSpaceDocking',p,f.owner),/INTERRUPTION/);fail=false;assert.equal((await f.board()).boardings.length,0);assert.equal((await f.ship()).combatId,null);await f.cmd('startSpaceDocking',p,f.owner);assert.equal((await f.board()).boardings.length,1);
 });
 test(`${prefix} : anciennes publications relues sans activer implicitement l’abordage`,async()=>{
  const f=await soVoyagesFixture(makeStore,{release:false}),r=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${r.versionId}`,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;await f.store.runTransaction(async tx=>{const {boardingFreightVersion,boardingCargoVersion,boardingRansomVersion,fleetBoardingVersion,boardingVersion,manifestDigest,...h}=await tx.get(path);tx.set(path,{...h,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(h))).digest('hex')});});await f.birth(await f.birthPreview());assert.equal((await f.read('mySession')).session.spaceOutlaws.boardingVersion,undefined);await assert.rejects(f.read('spaceBoardingAdmin',{combatId:'ancienne'},f.owner),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : pause et STOP suspendent le délai sans capture automatique`,async()=>{
  const f=await boardingFixture(makeStore);await f.start();f.advance(30000);await f.stage('PAUSE');f.advance(600000);assert.equal((await f.board()).boardings[0].remainingSeconds,90);await assert.rejects(f.command('finishSpaceDocking',{present:true,safe:true}),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await f.cmd('stopSafety',{reason:'Arrêt sécurité'});f.advance(600000);assert.equal((await f.board()).boardings[0].remainingSeconds,90);await assert.rejects(f.command('cancelSpaceBoarding',{reason:'Annulation pendant STOP'}),{code:'SO_SAFETY_STOP'});assert.equal((await f.board()).boardings[0].status,'DOCKING');
 });
 test(`${prefix} : reprise de campagne conserve arrimage, verrou et historique sans écoulement hors jeu`,async()=>{
  const f=await boardingFixture(makeStore),{episodeHarness}=await import('./space-episodes-suite.mjs'),e=await episodeHarness(f);await f.start();f.advance(30000);await e.close();const old=(await f.board()).boardings[0],source=e.sid;await e.resume(await e.begin());f.advance(86400000);const d=await e.read('spaceBoardingAdmin',{combatId:f.combatId()});assert.equal(d.boardings[0].id,old.id);assert.equal(d.boardings[0].remainingSeconds,90);assert.equal((await e.get('ships/ship')).combatId,f.combatId());assert.equal((await e.get(`spaceCombats/${f.combatId()}`)).activeBoardingId,old.id);assert.deepEqual(await f.store.list(`sessions/${e.sid}/spaceCombats/${f.combatId()}/boardings`),await f.store.list(`sessions/${source}/spaceCombats/${f.combatId()}/boardings`));await e.stage('EN_JEU');f.advance(90000);const r=(await e.read('spaceBoardingAdmin',{combatId:f.combatId()})).boardings[0];await e.cmd('finishSpaceDocking',{combatId:f.combatId(),boardingId:r.id,confirmation:r.confirmation,present:true,safe:true});assert.equal((await e.read('spaceBoardingAdmin',{combatId:f.combatId()})).boardings[0].status,'SCENE');
 });
 test(`${prefix} : anciennes rencontres et flottes de trois ou quatre restent hors de cette tranche`,async()=>{
  const f=await boardingFixture(makeStore);await f.edit(`spaceCombats/${f.combatId()}`,e=>{const {boardingFreightVersion,boardingCargoVersion,boardingRansomVersion,fleetBoardingVersion,boardingVersion,...old}=e;return old;});await assert.rejects(f.board(),{code:'BOARDING_UNAVAILABLE'});const g=await boardingFixture(makeStore);await g.edit(`spaceCombats/${g.combatId()}`,e=>({...e,shipIds:[...e.shipIds,'troisieme']}));await assert.rejects(g.board(),{code:'BOARDING_UNAVAILABLE'});
 });

 test(`${prefix} : confirmation périmée et attributs client injectés refusés sans effet`,async()=>{
  const f=await boardingFixture(makeStore),q=await f.prepare();await assert.rejects(f.cmd('startSpaceDocking',{...f.input,confirmation:q.confirmation,crew:[{id:'intrus'}]},f.owner),e=>!!e.code);await f.edit('ships/second',s=>({...s,revision:s.revision+1}));await assert.rejects(f.cmd('startSpaceDocking',{...f.input,confirmation:q.confirmation},f.owner),{code:'STALE_REVISION'});assert.equal((await f.board()).boardings.length,0);await f.scene();const r=(await f.board()).boardings[0],args={combatId:f.combatId(),boardingId:r.id,...f.resultInput},p=await f.read('prepareSpaceBoardingOutcome',args,f.owner);await f.edit(`characters/${f.cid}`,c=>({...c,hp:c.hp-1}));await assert.rejects(f.cmd('resolveSpaceBoarding',{...args,confirmation:p.confirmation},f.owner),{code:'STALE_REVISION'});assert.equal((await f.board()).boardings[0].status,'SCENE');
 });
 test(`${prefix} : mandat MJ révoqué vérifié avant tout reçu d’arrimage`,async()=>{
  const f=await boardingFixture(makeStore),mj={...f.other,uid:randomUUID(),email:`boarding-mj-${randomUUID()}@example.invalid`},staff=async active=>f.cmd('setStaff',{revision:(await f.store.get(`sessions/${f.sid}`)).revision,email:mj.email,role:'MJ',active,reason:'Mandat de supervision'},f.owner);await staff(true);const q=await f.read('prepareSpaceDocking',f.input,mj),p={...f.input,confirmation:q.confirmation,requestId:randomUUID()},r=await f.cmd('startSpaceDocking',p,mj);assert.deepEqual(await f.cmd('startSpaceDocking',p,mj),r);await staff(false);await assert.rejects(f.cmd('startSpaceDocking',p,mj),{code:'FORBIDDEN'});await f.command('cancelSpaceBoarding',{reason:'La régie propriétaire termine l’intervention'});assert.equal((await f.ship()).combatId,null);
 });

}
