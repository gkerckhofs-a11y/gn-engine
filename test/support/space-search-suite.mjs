import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {shopsFixture} from './space-outlaws-shops-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {shopAccountId,shopStockId} from '../../src/core/space-outlaws-shop-state.mjs';
import {createWorkflow} from '../../src/core/workflow.mjs';
import {processImage} from '../../src/adapters/media-images.mjs';
import {MemoryImages,sampleImage} from './media-suite.mjs';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {spaceMissionsFixture} from './space-missions-suite.mjs';
import {personFixture} from './person-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
export const searchDefinition=(patch={})=>({kind:'SEARCH',searchVersion:1,title:'Cache balisée',description:'Lieu public',gmNotes:'SECRET_MJ',search:{active:true,difficulty:6,showDifficulty:false,maxAttempts:null,bonuses:[]},finds:[
 {id:'view',kind:'INDICE_A_VOIR',title:'Gravure',active:true,knowledgeId:'ordinary'},
 {id:'take',kind:'INDICE_A_PRENDRE',title:'Datapad',active:true,knowledgeId:'higher'},
 {id:'item',kind:'OBJET_A_TROUVER',title:'Trousse',active:true,itemId:'kit_medical-supplies',quantity:2},
 {id:'cash',kind:'CREDITS_A_TROUVER',title:'Cache de crédits',active:true,quantity:30},
 ],...patch});
export async function searchFixture(makeStore,{definition=searchDefinition(),fund=true}={}){
 const f=await shopsFixture(makeStore,{release:false});let rev=(await f.view()).draft.revision;
 await f.cc('saveCentralFieldTarget',{fieldTargetId:'cache',fieldTargetRevision:0,draftRevision:rev++,fieldTarget:definition,reason:'Fouille V3.6'});
 await f.cc('saveCentralOffer',{offerId:'loot',offerRevision:0,draftRevision:rev++,offer:{name:'Réserve terrain',shopId:'counter',itemId:'kit_medical-supplies',unitPrice:30,buybackPrice:null,conditions:'Stock physique',gmNotes:''},reason:'Réserve réelle'});
 const p=await f.releasePreview();assert.deepEqual(p.blockers,[]);await f.release(p);
 assert.equal((await f.store.list(`sessions/${f.sid}/inventory`)).length,0);
 await f.birth(await f.birthPreview());await f.birth(await f.birthPreview(f.owner,{uid:f.other.uid}),{uid:f.other.uid});
 const state=()=>f.store.get(`sessions/${f.sid}/fieldStates/cache`);
 const provision=async(findId,extra={})=>f.actionCmd('provisionFieldFind',{targetId:'cache',findId,revision:(await state()).revision,reason:'Affectation terrain',sourceLotId:shopStockId('loot'),sourceAccountId:shopAccountId('counter'),...extra},f.owner);
 if(fund){await f.provision({quantity:4});await f.provision({offerId:'loot',quantity:3,restricted:false});await f.stage('EN_JEU');await f.buy();await f.stage('PAUSE');await provision('item');await provision('cash');}
 await f.stage('EN_JEU');
 const search=async(actor=f.player,die=12)=>{f.setDie(die);const a=await f.start({targetId:'cache',kind:'SEARCH'},actor);f.advance(60000);return f.finish(a,{},actor);};
 const take=(a,findId,actor=f.player,extra={})=>f.actionCmd('takeFieldFind',{actionId:a.id,findId,present:true,...extra},actor);
 return {...f,state,provisionFind:provision,search,take,cid:(await f.actionRead('mySession')).character.id,otherId:(await f.actionRead('mySession',{},f.other)).character.id};
}
export function spaceSearchSuite(makeStore,prefix='Fouilles V3.6'){
 test(`${prefix} V36-01 : sans TRA-02, D12 serveur, durée PA et reprise uniques`,async()=>{
  const f=await searchFixture(makeStore),scan=await f.actionRead('fieldTarget',{targetId:'cache'});assert.equal(scan.profiles[0].qualified,true);assert.equal(scan.profiles[0].test,'D12');assert.equal(scan.profiles[0].threshold,null);assert.doesNotMatch(JSON.stringify(scan),/Gravure|Datapad|SECRET|Cache de crédits/);
  const a=await f.start({targetId:'cache',kind:'SEARCH'});await assert.rejects(f.finish(a),{code:'FIELD_TOO_EARLY'});f.setDie(12);f.advance(60000);const r=await f.finish(a,{die:1});assert.equal(r.result.roll,12);assert.equal(r.result.total,12);assert.equal(r.result.discoveries.length,4);assert.equal((await f.points()).available,4);assert.deepEqual((await f.finish(a)).result,r.result);await assert.rejects(f.start({targetId:'cache',kind:'SEARCH'}),{code:'COOLDOWN_ACTIVE'});
 });
 test(`${prefix} V36-02 : seuls bonus publiés et sources réellement présentes`,async()=>{
  const d=searchDefinition();d.search.bonuses=[{id:'med',kind:'SKILL',sourceId:'MED-02',minLevel:2,value:2,rule:'Règle publiée : matériel médical reconnu au N2'}];
  const f=await searchFixture(makeStore,{definition:d});await f.store.runTransaction(async tx=>{const path=`sessions/${f.sid}/characters/${f.otherId}`,c=await tx.get(path);tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills:[]}});});
  const a=await f.search(f.player,4),b=await f.search(f.other,4);assert.equal(a.result.total,6);assert.equal(b.result.total,4);assert.equal(b.result.discoveries.length,0);assert.equal(a.result.bonuses[0].sourceId,'MED-02');
 });
 test(`${prefix} V36-03 : échec et réserve vide indistinguables, aucune difficulté cachée`,async()=>{
  const f=await searchFixture(makeStore),a=await f.search(f.player,1);assert.equal(a.result.text,'Vous ne trouvez rien de plus.');assert.deepEqual(a.result.discoveries,[]);assert.equal(a.result.threshold,null);assert.doesNotMatch(JSON.stringify(a),/Gravure|Datapad|knowledgeId|accountId|lotId|SECRET/);
  await f.store.runTransaction(async tx=>{const p=`sessions/${f.sid}/fieldStates/cache`,st=await tx.get(p);tx.set(p,{...st,finds:Object.fromEntries(Object.entries(st.finds).map(([k,v])=>[k,{...v,status:'TAKEN'}]))});});const b=await f.search(f.other,1);assert.deepEqual(b.result,a.result);
 });
 test(`${prefix} V36-04 : indice à voir persistant pour deux personnages`,async()=>{
  const f=await searchFixture(makeStore);await f.search();await f.search(f.other);assert.equal((await f.state()).finds.view.status,'AVAILABLE');for(const actor of [f.player,f.other])assert.equal((await f.actionRead('knowledgeDetail',{knowledgeId:'ordinary'},actor)).knowledge.body,'TEXTE_PRIVE_ordinary');
 });
 test(`${prefix} V36-05 et V36-08 : prise unique concurrente du document`,async()=>{
  const f=await searchFixture(makeStore),a=await f.search(),b=await f.search(f.other),results=await Promise.allSettled([f.take(a,'take'),f.take(b,'take',f.other)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.state()).finds.take.status,'TAKEN');assert.equal((await f.store.list(`sessions/${f.sid}/audit`)).filter(e=>e.kind==='FIELD_TAKE').length,1);
 });
 test(`${prefix} V36-06 : transfert de stock M1 et historique sans création`,async()=>{
  const f=await searchFixture(makeStore),stock=(await f.state()).finds.item.lotId,a=await f.search(),r=await f.take(a,'item');assert.equal(r.lotId,stock);const lots=await f.store.list(`sessions/${f.sid}/inventory`);assert.equal(lots.find(l=>l.id===stock).ownerId,f.cid);assert.equal(lots.find(l=>l.id===shopStockId('loot')).quantity,1);assert.equal(lots.filter(l=>l.id===stock).length,1);assert.equal((await f.actionRead('myInventory')).lots.filter(l=>l.id===stock).length,1);
 });
 test(`${prefix} V36-07 : crédits réservés réels, débit/crédit atomique et refus sans fonds`,async()=>{
  const f=await searchFixture(makeStore),a=await f.search(),r=await f.take(a,'cash');assert.equal(r.amount,30);const source=await f.store.get(`sessions/${f.sid}/accounts/${shopAccountId('counter')}`),wallet=await f.store.get(`sessions/${f.sid}/accounts/${accountId(f.cid)}`);assert.equal(source.balance,0);assert.equal(source.reserved,0);assert.equal(wallet.balance,30);const e=(await f.store.list(`sessions/${f.sid}/ledger`)).find(e=>e.kind==='FIELD_TAKE');assert.equal(e.entries.reduce((n,e)=>n+e.delta,0),0);assert.equal(e.createdCurrency,0);
  const g=await searchFixture(makeStore,{fund:false});await g.provision({quantity:1});await g.stage('PAUSE');await assert.rejects(g.provisionFind('cash'),{code:'INSUFFICIENT_FUNDS'});assert.equal((await g.state()).finds.cash.status,'UNFUNDED');
 });
 test(`${prefix} V36-09 : réessai, nouveau requestId et reconnexion ne doublent pas une prise`,async()=>{
  const f=await searchFixture(makeStore),a=await f.search(),input={requestId:randomUUID()},r=await f.take(a,'cash',f.player,input);assert.deepEqual(await f.take(a,'cash',f.player,input),r);assert.deepEqual(await f.take(a,'cash'),r);const mine=await f.actionRead('myFieldActions');assert.equal(mine.actions[0].result.discoveries.find(d=>d.id==='cash').status,'TAKEN');await f.actionCmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.take(a,'cash',f.player,input),{code:'FORBIDDEN'});
 });
 test(`${prefix} : deux prises simultanées d’objet ou de crédits conservent quantité et monnaie`,async()=>{
  for(const find of ['item','cash']){const f=await searchFixture(makeStore),a=await f.search(),b=await f.search(f.other),out=await Promise.allSettled([f.take(a,find),f.take(b,find,f.other)]);assert.equal(out.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.store.list(`sessions/${f.sid}/audit`)).filter(e=>e.kind==='FIELD_TAKE'&&e.findId===find).length,1);}
 });
 test(`${prefix} : rollback de prise ne laisse ni débit, reçu ni transfert partiel`,async()=>{
  const raw=makeStore();let fail=false;const wrapped={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await searchFixture(()=>wrapped),a=await f.search(),input={requestId:randomUUID()};
  fail=true;await assert.rejects(f.take(a,'cash',f.player,input),/INTERRUPTION/);fail=false;assert.equal((await f.state()).finds.cash.status,'AVAILABLE');assert.equal((await raw.get(`sessions/${f.sid}/accounts/${accountId(f.cid)}`)).balance,0);assert.equal((await raw.get(`sessions/${f.sid}/accounts/${shopAccountId('counter')}`)).reserved,30);assert.equal((await f.take(a,'cash',f.player,input)).amount,30);
 });
 test(`${prefix} V36-10 : difficulté propre supérieure et inférieure à celle du lieu`,async()=>{
  const d=searchDefinition();d.finds[0].difficulty=2;d.finds[1].difficulty=10;const f=await searchFixture(makeStore,{definition:d}),a=await f.search(f.player,3);assert.deepEqual(a.result.discoveries.map(d=>d.id),['view']);assert.doesNotMatch(JSON.stringify(a.result),/Datapad|10|higher/);
 });
 test(`${prefix} : validation D12, droits MJ, aucun ancien manifeste ouvert`,async()=>{
  const f=await searchFixture(makeStore);await assert.rejects(f.actionCmd('provisionFieldFind',{targetId:'cache',findId:'cash',revision:1,reason:'Usurpation'}),{code:'FORBIDDEN'});await f.store.runTransaction(async tx=>{const path=`sessions/${f.sid}`,s=await tx.get(path);delete s.spaceOutlaws.searchVersion;tx.set(path,s);});await assert.rejects(f.search(),{code:'SO_GAMEPLAY_NOT_OPEN'});
  for(const difficulty of [0,13,1.5]){const d=searchDefinition();d.search.difficulty=difficulty;await assert.rejects(searchFixture(makeStore,{definition:d}),{code:'INVALID_PLACE_SEARCH'});}
 });
 test(`${prefix} : réserves, prises et reçus conservés entre épisodes ; reset explicite sans dotation`,async()=>{
  const f=await searchFixture(makeStore),a=await f.search();await f.take(a,'item');await f.take(a,'take');const before=await f.state(),e=await episodeHarness(f);await e.close();await e.resume(await e.begin());assert.deepEqual(await e.get('fieldStates/cache'),before);
  const input={targetId:'cache',findId:'item',revision:before.revision,reset:true,reason:'Nouvelle cache pour cet épisode'};await e.cmd('provisionFieldFind',input);assert.equal((await e.get('fieldStates/cache')).finds.item.status,'UNFUNDED');assert.equal((await e.get(`inventory/${before.finds.item.receipt.lotId}`)).ownerId,f.cid);assert.equal((await e.get(`accounts/${shopAccountId('counter')}`)).reserved,30);
  await e.stage('EN_JEU');const r=await e.cmd('takeFieldFind',{actionId:a.id,findId:'cash',present:true},f.player);assert.equal(r.amount,30);await assert.rejects(e.cmd('takeFieldFind',{actionId:a.id,findId:'item',present:true},f.player),{code:'FIELD_UNAVAILABLE'});
 });
 test(`${prefix} V36-11 : fouille méthodique native sur captif reste automatique et partage seulement le délai FOUILLE`,async()=>{
  const f=await personFixture(makeStore),lot=await f.lootLot(),p=await f.savePerson('LOOT_METHODICAL',{durationSeconds:120,durationByLevel:{1:120,2:105,3:90,4:75,5:60},cost:1,cooldownSeconds:600});
  const a=await f.startPerson(p);f.advance(120000);const r=await f.finishPerson(a);assert.equal(r.result.roll,null);assert.equal((await f.r('myPersonActions')).actions[0].canChoose,true);await f.q('chooseLoot',{actionId:a.id,lotId:lot.id,present:true});await f.cancelPerson(a);const cache=await f.search();await assert.rejects(f.start(cache.id),{code:'COOLDOWN_ACTIVE'});
 });
 test(`${prefix} V36-12 : quatre images principales réutilisent la médiathèque, remplacement et retrait sans copie`,async()=>{
  const f=await soVoyagesFixture(makeStore),g=await spaceMissionsFixture(makeStore),announcement=await g.announce();
  for(const [fixture,targets] of [[f,[{kind:'character',id:f.cid,slot:'portrait'},{kind:'item',id:'propellant',slot:'illustration'},{kind:'ship',id:'ship',slot:'illustration'}]],[g,[{kind:'announcement',id:announcement.id,slot:'illustration'}]]]){
   const images=new MemoryImages(),w=createWorkflow({store:fixture.store,ownerEmail:fixture.owner.email,now:()=>1000000,images,processImage}),read=(a,p,actor=fixture.owner)=>w.dispatch(a,actor,p),cmd=(a,p,actor)=>read(a,{requestId:randomUUID(),...p},actor);
   const image=await cmd('mediaUpload',{sessionId:fixture.sid,name:'Visuel',data:await sampleImage()}),writes=images.writes;
   const assign=async(mediaId)=>{const p={targets:targets.map(t=>({...t,scope:'session',scopeId:fixture.sid,mediaId})),reason:'Image principale'},q=await read('prepareMediaAssignments',p);return cmd('assignMedia',{...p,confirmation:q.confirmation});};
   await assign(image.id);assert.equal(images.writes,writes);assert.equal((await fixture.store.get(`media/${image.id}`)).usageCount>0,true);
   for(const t of targets.filter(t=>t.kind!=='item'))assert.equal((await read('mediaRead',{context:{mode:'player',scope:'session',scopeId:fixture.sid,...t},slot:t.slot},fixture.player)).mime,'image/webp');
   const second=await cmd('mediaUpload',{sessionId:fixture.sid,name:'Autre',data:await sampleImage({r:200,g:10,b:40,alpha:1})});await assign(second.id);await assign(null);assert.equal(images.writes,writes*2);
   for(const t of targets){const path={character:'characters',item:'items',ship:'ships',announcement:'announcements'}[t.kind],r=await fixture.store.get(`sessions/${fixture.sid}/${path}/${t.id}`);assert.equal(r.mediaImages[t.slot],undefined);assert.equal((await fixture.store.list(`sessions/${fixture.sid}/${path}/${t.id}/mediaHistory`)).length,3);}
   await assert.rejects(read('prepareMediaAssignments',{targets:[{...targets[0],scope:'session',scopeId:fixture.sid,mediaId:image.id}]},fixture.player),{code:'FORBIDDEN'});
  }
 });
}
