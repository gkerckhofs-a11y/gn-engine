import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {intelligenceFixture} from './intelligence-suite.mjs';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {inventoryHash as hash} from '../../src/core/inventory-state.mjs';

export async function targetedAmbushFixture(makeStore){
 const f=await intelligenceFixture(makeStore),pirate=f.buyer,base=f.base;
 await f.provision({shipId:'second',name:'Pirate ciblé',pilotId:f.buyerId,ownerId:f.buyerId});
 const stock={shopId:'counter',offerId:'fuel',provisionId:randomUUID(),quantity:6,restricted:true,source:'Stock de recette explicite',reason:'Carburant réel'},sq=await f.read('prepareShopProvision',stock,f.owner);await f.cmd('provisionShop',{...stock,confirmation:sq.confirmation},f.owner);
 const p={shopId:'counter',offerId:'fuel',quantity:6,useProtected:false},q=await f.read('prepareShopPurchase',p,pirate);
 const fuel=await f.cmd('buyShopOffer',{...p,quoteAt:q.quoteAt,confirmation:q.confirmation},pirate);
 await f.pickup(fuel,pirate);await f.refuel(6);
 const lot=(await f.read('myInventory',{},pirate)).lots.find(l=>l.item.id==='propellant'),rp={shipId:'second',lotId:lot.id,quantity:6},rq=await f.read('prepareRefuel',rp,pirate);await f.cmd('refuelShip',{...rp,confirmation:rq.confirmation,present:true},pirate);f.advance(120000);await f.navCommand('finishSoRefuel',{shipId:'second'},pirate);
 await f.fly();const targetVoyageId=(await f.ship()).journey.id,r=await f.offer({category:'FLIGHT_PLAN',voyageId:targetVoyageId});await f.buy(r);
 await f.startFlight({shipId:'second'},pirate);f.advance(180000);await f.navCommand('finishSoPreparation',{shipId:'second'},pirate);
 const get=p=>f.store.get(`${base}/${p}`),armInput=(patch={})=>({shipId:'second',navigationCode:'OUT-SECRET',knowledgeId:'ordinary',...patch});
 const prepare=patch=>f.read('prepareSpaceAmbush',armInput(patch),pirate),arm=async(patch={})=>{const p=armInput(patch),q=await prepare(patch);return f.cmd('armSpaceAmbush',{...p,confirmation:q.confirmation,present:true},pirate);};
 const candidates=()=>f.read('prepareSpaceInterception',{shipId:'ship'},f.owner),trigger=async()=>{const q=await candidates();return f.cmd('triggerSpaceInterception',{shipId:'ship',confirmation:q.confirmation,reason:'Rencontre ciblée réelle'},f.owner);};
 const cancel=async()=>{const a=(await f.read('spaceCombats',{},pirate)).ambushes.find(a=>a.shipId==='second');return f.cmd('cancelSpaceAmbush',{shipId:'second',confirmation:a.confirmation},pirate);};
 // Explicit synthetic extra participant/ship for competition tests, as in the
 // convoy fixture. All arming and interception still use native commands.
 const competitor=async(kind='OPPORTUNISTIC')=>{
  const actor={...pirate,uid:randomUUID()},cid=randomUUID(),sid=randomUUID(),c=await get(`characters/${f.buyerId}`),reg=await get(`registrations/${hash(pirate.uid)}`),ship=await get('ships/second'),receipt=await f.receipt('ordinary');
  await f.store.runTransaction(async tx=>{tx.set(`${base}/characters/${cid}`,{...c,id:cid,assignedUid:actor.uid,publicCode:randomUUID()});tx.set(`${base}/registrations/${hash(actor.uid)}`,{...reg,id:hash(actor.uid),uid:actor.uid,characterId:cid});tx.set(`${base}/ships/${sid}`,{...ship,id:sid,name:'Concurrent',pilotId:cid,ownerId:cid,ambushId:null,journey:{...ship.journey,id:randomUUID()}});if(kind==='TARGETED')tx.set(`${base}/characters/${cid}/knowledge/ordinary`,receipt);});
  const p={shipId:sid,navigationCode:'OUT-SECRET',...(kind==='TARGETED'?{knowledgeId:'ordinary'}:{})},q=await f.read('prepareSpaceAmbush',p,actor),a=await f.cmd('armSpaceAmbush',{...p,confirmation:q.confirmation,present:true},actor);return {actor,cid,shipId:sid,ambushId:a.id};
 };
 return {...f,pirate,targetVoyageId,get,prepare,arm,candidates,trigger,cancel,competitor,armInput};
}

export function targetedAmbushSuite(makeStore,prefix='Embuscades ciblées SO'){
 test(`${prefix} : achat réel, position, rencontre et paix sans paiement ni PA supplémentaires`,async()=>{
  const f=await targetedAmbushFixture(makeStore),wallet=await f.wallet(),points=await f.points(f.pirate),r=await f.arm();assert.equal((await f.get(`spaceAmbushes/${r.id}`)).targetVoyageId,f.targetVoyageId);const q=await f.candidates();assert.equal(q.priority,'TARGETED');const e=await f.trigger(),record=await f.get(`spaceCombats/${e.id}`);assert.equal(record.selection.kind,'TARGETED');assert.deepEqual(record.shipIds,['ship','second']);assert.equal((await f.ship()).journey.intercepted,true);assert.equal((await f.get('ships/second')).journey.suspended,true);assert.deepEqual(await f.wallet(),wallet);assert.deepEqual(await f.points(f.pirate),points);
  for(const [actor,shipId]of [[f.player,'ship'],[f.pirate,'second']]){const d=(await f.read('spaceCombat',{combatId:e.id},actor)).combat;await f.cmd('consentSpacePeace',{combatId:e.id,shipId,confirmation:d.confirmation,agree:true},actor);}assert.equal((await f.ship()).journey.suspended,false);assert.equal((await f.receipt('ordinary')).active,true);await assert.rejects(f.candidates(),{code:'SPACE_INTERCEPTION_USED'});
 });
 test(`${prefix} : aucun vrai plan, identifiant ciblé ou alerte de validité dans les projections joueur`,async()=>{
  const f=await targetedAmbushFixture(makeStore),q=await f.prepare();await f.arm();const d=await f.read('spaceCombats'),n=await f.navigation('second',f.pirate);assert.equal(q.knowledgeTitle,'Titre ordinary');for(const x of [q,d,n]){const text=JSON.stringify(x);assert.ok(!text.includes(f.targetVoyageId));assert.doesNotMatch(text,/targetVoyageId|knowledgeGrantRevision|VERITE_MJ|gmTruth|candidateIds/);}assert.deepEqual(n.targetKnowledge,[{id:'ordinary',title:'Titre ordinary'}]);
 });
 test(`${prefix} : titre seul, rumeur, connaissance révoquée et champs de cible injectés refusés`,async()=>{
  const f=await targetedAmbushFixture(makeStore);await assert.rejects(f.prepare({knowledgeId:'absent'}),{code:'SPACE_TARGET_KNOWLEDGE_REQUIRED'});await assert.rejects(f.prepare({targetVoyageId:f.targetVoyageId}),{code:'INVALID_ADMISSION'});const old=await f.receipt('ordinary');for(const patch of [{active:false},{intelligence:{...old.intelligence,category:'RUMOR'}}]){await f.edit(`characters/${f.buyerId}/knowledge/ordinary`,()=>({...old,...patch}));await assert.rejects(f.prepare(),{code:'SPACE_TARGET_KNOWLEDGE_REQUIRED'});}await f.edit(`characters/${f.buyerId}/knowledge/ordinary`,()=>old);
 });
 test(`${prefix} : document modifié périme le consentement et retiré exclut la position`,async()=>{
  const f=await targetedAmbushFixture(makeStore),q=await f.prepare();await f.edit(`characters/${f.buyerId}/knowledge/ordinary`,k=>({...k,grantRevision:k.grantRevision+1}));await assert.rejects(f.cmd('armSpaceAmbush',{...f.armInput(),confirmation:q.confirmation,present:true}),{code:'STALE_REVISION'});await f.arm();await f.edit(`characters/${f.buyerId}/knowledge/ordinary`,k=>({...k,active:false}));await assert.rejects(f.candidates(),{code:'SPACE_NO_AMBUSH'});assert.equal((await f.read('spaceCombats')).ambushes.length,1);await f.cancel();
 });
 test(`${prefix} : ciblée prioritaire sur opportuniste, tirage et sélection journalisés`,async()=>{
  const f=await targetedAmbushFixture(makeStore),op=await f.competitor(),target=await f.arm(),q=await f.candidates();assert.deepEqual(q.candidates.map(x=>x.id),['second']);const e=await f.trigger(),r=await f.get(`spaceCombats/${e.id}`);assert.deepEqual(r.selection.candidateIds,[target.id]);assert.equal(r.selection.selectedIndex,0);assert.equal((await f.get(`spaceAmbushes/${op.ambushId}`)).status,'ACTIVE');
 });
 test(`${prefix} : deux ciblées de même priorité participent au tirage, sans priorité au premier clic`,async()=>{
  const f=await targetedAmbushFixture(makeStore),first=await f.arm(),other=await f.competitor('TARGETED'),q=await f.candidates();assert.equal(q.candidates.length,2);const e=await f.trigger(),r=await f.get(`spaceCombats/${e.id}`);assert.deepEqual(r.selection.candidateIds,[first.id,other.ambushId].sort());assert.ok([0,1].includes(r.selection.selectedIndex));assert.equal(r.selection.ambushId,r.selection.candidateIds[r.selection.selectedIndex]);
 });
 test(`${prefix} : route changée ou autre voyage ne suivent pas la cible, sans avertissement joueur`,async()=>{
  for(const patch of [{routeId:'back'},{id:randomUUID()}]){const f=await targetedAmbushFixture(makeStore);await f.edit('ships/ship',s=>({...s,journey:{...s.journey,...patch}}));const q=await f.prepare();assert.equal(q.kind,'TARGETED');await f.arm();await assert.rejects(f.candidates(),{code:'SPACE_NO_AMBUSH'});assert.equal((await f.read('spaceCombats')).ambushes.length,1);assert.equal((await f.receipt('ordinary')).snapshot.body,'TEXTE_PRIVE_ordinary');if(!patch.routeId){const op=await f.competitor();const pool=await f.candidates();assert.equal(pool.priority,'OPPORTUNISTIC');assert.deepEqual(pool.candidates.map(x=>x.id),[op.shipId]);}}
 });
 test(`${prefix} : arrivée réelle interdit la rétro-interception sans retirer le vieux document`,async()=>{
  const f=await targetedAmbushFixture(makeStore);f.advance(120000);const n=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation},f.player);const q=await f.prepare();assert.equal(q.kind,'TARGETED');await f.arm();await assert.rejects(f.candidates(),{code:'SPACE_INTERCEPTION_USED'});assert.equal((await f.read('knowledgeDetail',{knowledgeId:'ordinary'})).knowledge.body,'TEXTE_PRIVE_ordinary');assert.equal((await f.read('spaceCombats')).ambushes.length,1);
 });
 test(`${prefix} : nouveau concurrent périme l’aperçu MJ sans rencontre partielle`,async()=>{
  const f=await targetedAmbushFixture(makeStore);await f.competitor();const q=await f.candidates();await f.arm();await assert.rejects(f.cmd('triggerSpaceInterception',{shipId:'ship',confirmation:q.confirmation,reason:'Ancien pool'},f.owner),{code:'STALE_REVISION'});assert.equal((await f.store.list(`${f.base}/spaceCombats`)).length,0);assert.equal((await f.ship()).journey.suspended,false);
 });
 test(`${prefix} : concurrence et réessai ne créent qu’une rencontre, révocation avant reçu`,async()=>{
  const f=await targetedAmbushFixture(makeStore),q=await f.prepare(),p={...f.armInput(),confirmation:q.confirmation,present:true,requestId:randomUUID()},r=await f.cmd('armSpaceAmbush',p);assert.deepEqual(await f.cmd('armSpaceAmbush',p),r);const i=await f.candidates(),inputs=[1,2].map(()=>({shipId:'ship',confirmation:i.confirmation,reason:'Interception',requestId:randomUUID()})),rs=await Promise.allSettled(inputs.map(p=>f.cmd('triggerSpaceInterception',p,f.owner)));assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.store.list(`${f.base}/spaceCombats`)).length,1);await f.cmd('revokeAccess',{uid:f.pirate.uid},f.owner);await assert.rejects(f.cmd('armSpaceAmbush',p),{code:'FORBIDDEN'});
 });
 test(`${prefix} : STOP, pause et présence bloquent l’armement sans effet`,async()=>{
  const f=await targetedAmbushFixture(makeStore),q=await f.prepare();await assert.rejects(f.cmd('armSpaceAmbush',{...f.armInput(),confirmation:q.confirmation,present:false}),{code:'FIELD_PRESENCE_REQUIRED'});await f.stage('PAUSE');await assert.rejects(f.arm(),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await f.cmd('stopSafety',{reason:'Sécurité'},f.pirate);await assert.rejects(f.arm(),{code:'SO_SAFETY_STOP'});assert.equal((await f.get('ships/second')).ambushId,undefined);
 });
 test(`${prefix} : interruption transactionnelle ne consomme aucune position ou voyage`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await targetedAmbushFixture(()=>store),a=await f.arm();fail=true;await assert.rejects(f.trigger(),/INTERRUPTION/);fail=false;assert.equal((await f.get(`spaceAmbushes/${a.id}`)).status,'ACTIVE');assert.equal((await f.ship()).journey.suspended,false);assert.equal((await f.store.list(`${f.base}/spaceCombats`)).length,0);await f.trigger();
 });
 test(`${prefix} : ciblage du cargo ou de son escorte conserve les rôles et le décrochage de la cible`,async()=>{
  const {convoyFixture}=await import('./space-convoy-suite.mjs'),{knowledgeSnapshot}=await import('../../src/core/knowledge.mjs');
  for(const target of ['ship','escort']){const f=await convoyFixture(makeStore,{combat:true,intercept:false}),a=(await f.read('spaceCombats',{},f.pirate)).ambushes[0];await f.cmd('cancelSpaceAmbush',{shipId:'pirate',confirmation:a.confirmation},f.pirate);
   // Synthetic already-acquired receipt for this three-person integration case;
   // purchase and snapshots are exercised end to end by targetedAmbushFixture.
   const k=await f.get('knowledge/ordinary'),voyageId=(await f.get(`ships/${target}`)).journey.id;await f.store.runTransaction(async tx=>tx.set(`sessions/${f.sid}/characters/${f.pirateId}/knowledge/ordinary`,{id:'ordinary',active:true,snapshot:knowledgeSnapshot(k),grantRevision:1,intelligence:{category:'CONFIDENTIAL',voyageId}}));
   const p={shipId:'pirate',navigationCode:'OUT-SECRET',knowledgeId:'ordinary'},q=await f.read('prepareSpaceAmbush',p,f.pirate);await f.cmd('armSpaceAmbush',{...p,confirmation:q.confirmation,present:true},f.pirate);const i=await f.read('prepareSpaceInterception',{shipId:'escort'},f.owner),r=await f.cmd('triggerSpaceInterception',{shipId:'escort',confirmation:i.confirmation,reason:'Voyage ciblé du convoi'},f.owner),d=(await f.read('spaceCombat',{combatId:r.id},target==='ship'?f.player:f.other)).combat;assert.equal(d.victimId,target);assert.deepEqual(d.ships.map(x=>x.id),['ship','pirate','escort']);f.setDie(6);await f.cmd('spaceBreakaway',{combatId:r.id,shipId:target,confirmation:d.confirmation},target==='ship'?f.player:f.other);assert.equal((await f.get(`ships/${target}`)).combatId,null);assert.equal((await f.get(`ships/${target==='ship'?'escort':'ship'}`)).combatId,r.id);await assert.rejects(f.read('prepareSpaceInterception',{shipId:target},f.owner),{code:'SPACE_INTERCEPTION_USED'});
  }
 });
 test(`${prefix} : historique ciblé et renseignement ancien conservés entre épisodes sans réarmement`,async()=>{
  const {episodeHarness}=await import('./space-episodes-suite.mjs'),f=await targetedAmbushFixture(makeStore),a=await f.arm(),r=await f.trigger();for(const [actor,shipId]of [[f.player,'ship'],[f.pirate,'second']]){const d=(await f.read('spaceCombat',{combatId:r.id},actor)).combat;await f.cmd('consentSpacePeace',{combatId:r.id,shipId,confirmation:d.confirmation,agree:true},actor);}f.advance(300000);for(const [actor,shipId]of [[f.player,'ship'],[f.pirate,'second']]){const d=await f.navigation(shipId,actor);await f.cmd('arriveShip',{shipId,confirmation:d.confirmation},actor);}const e=await episodeHarness(f);await e.close();await e.resume(await e.begin());assert.equal((await e.get('')).spaceOutlaws.targetedAmbushVersion,1);assert.equal((await e.get(`spaceAmbushes/${a.id}`)).status,'CONSUMED');assert.equal((await e.get(`spaceCombats/${r.id}`)).selection.kind,'TARGETED');assert.equal((await e.get(`characters/${f.buyerId}/knowledge/ordinary`)).intelligence.voyageId,f.targetVoyageId);assert.equal((await e.get('ships/second')).ambushId,null);
 });
 test(`${prefix} : ancien manifeste réel conserve les embuscades opportunistes seulement`,async()=>{
  const f=await soVoyagesFixture(makeStore,{release:false}),r=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${r.versionId}`,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await f.store.runTransaction(async tx=>{const {targetedAmbushVersion,manifestDigest,...h}=await tx.get(path);tx.set(path,{...h,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(h))).digest('hex')});});await f.birth(await f.birthPreview());assert.equal((await f.read('mySession')).session.spaceOutlaws.targetedAmbushVersion,undefined);assert.ok((await f.read('spaceCombats')).ambushes);assert.equal((await f.read('mySpaceport')).session.combatReady,true);
 });
}
