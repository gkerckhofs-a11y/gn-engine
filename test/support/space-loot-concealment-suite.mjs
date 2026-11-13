import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
import {itemInput,newLot} from '../../src/core/inventory-state.mjs';
import {actionMenuItems} from '../../web/player-action-menu.mjs';
export async function lootFixture(makeStore,{level=2,concealLevel=2,quantity=1}={}){
 const f=await actionsFixture(makeStore,{classId:'TRA',helper:true});await f.stage('EN_JEU');
 const cid=(await f.actionRead('mySession')).character.id,tid=(await f.actionRead('mySession',{},f.other)).character.id,base=`sessions/${f.sid}`;
 const edit=(p,fn)=>f.store.runTransaction(async tx=>tx.set(`${base}/${p}`,fn(await tx.get(`${base}/${p}`))));
 await edit(`characters/${cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(s=>s.id==='TRA-02'?{...s,level}:s)}}));
 await edit(`characters/${tid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills,{id:'DISSIMULATION',kind:'PASSIVE',level:concealLevel}]}}));
 const lot=newLot('loot-original',itemInput({name:'Document pillable',kind:quantity===1?'INDIVIDUAL':'STACKABLE',consumable:false,publicationState:'PUBLISHED',pillable:true,pickpocketable:true,concealable:true},'loot-item'),quantity,tid,1000000,{kind:'SCENARIO_VERSION'});
 await f.store.runTransaction(async tx=>tx.set(`${base}/inventory/${lot.id}`,lot));
 const start=async(profileId,actor=f.player,extra={})=>{const input={targetId:tid,profileId,...extra},p=await f.actionRead('preparePersonAction',input,actor);return f.actionCmd('startPersonAction',{...input,confirmation:p.confirmation,present:true},actor);};
 const finish=(a,actor=f.player)=>f.actionCmd('finishPersonAction',{actionId:a.id,present:true},actor);
 const capture=()=>f.actionCmd('setSoCaptivity',{characterId:tid,kind:'CELL',safePath:true,reason:'Rencontre fictive'},f.owner);
 const hide=async()=>{const a=await start('SO-CONCEAL',f.other,{concealLotId:lot.id});f.advance((135-concealLevel*15)*1000);return finish(a,f.other);};
 return {...f,cid,tid,base,lot,edit,start,finish,capture,hide};
}
export function lootConcealmentSuite(makeStore,prefix='Fouille et Dissimulation SO'){
 test(prefix+' : niveaux de Dissimulation et durée exacte, aucun bien étranger ou non admissible',async()=>{
  for(let level=1;level<=5;level++){const f=await lootFixture(makeStore,{concealLevel:level});const p=await f.actionRead('preparePersonAction',{targetId:f.tid,profileId:'SO-CONCEAL',concealLotId:f.lot.id},f.other);assert.equal(p.durationSeconds,135-level*15);assert.equal(p.cost,1);assert.equal(p.test,'AUTO');}
  const f=await lootFixture(makeStore);await f.edit(`inventory/${f.lot.id}`,l=>({...l,item:{...l.item,concealable:false}}));await assert.rejects(f.hide(),{code:'SO_CONCEAL_ITEM'});assert.equal((await f.points(f.other)).reserved,0);
  await assert.rejects(f.start('SO-CONCEAL',f.player,{targetId:f.cid,concealLotId:f.lot.id}),{code:'FIELD_SKILL_REQUIRED'});
 });

 test(prefix+' : inventaire méthodique inaccessible après libération avant le choix',async()=>{
  const f=await lootFixture(makeStore);await f.capture();const a=await f.start('SO-TRA-02');f.advance(105000);await f.finish(a);assert.equal((await f.actionRead('myPersonActions')).actions.find(x=>x.id===a.id).lootLots.length,1);
  await f.actionCmd('endSoCaptivity',{characterId:f.tid},f.owner);const v=(await f.actionRead('myPersonActions')).actions.find(x=>x.id===a.id);assert.equal(v.canChoose,false);assert.deepEqual(v.lootLots,[]);
 });
 test(prefix+' : perte de captivité pendant la fouille interdit le résultat et rend le PA à l’annulation',async()=>{
  const f=await lootFixture(makeStore);await f.capture();const a=await f.start('SO-TRA-02');await f.actionCmd('endSoCaptivity',{characterId:f.tid},f.owner);f.advance(105000);await assert.rejects(f.finish(a),{code:'LOOT_TARGET_REQUIRED'});await f.actionCmd('cancelPersonActionMJ',{actionId:a.id,reason:'Cible libérée'},f.owner);assert.equal((await f.points()).available,5);
 });
 test(prefix+' : interruption transactionnelle de la cache ne crée aucune unité ni débit partiel',async()=>{
  const raw=makeStore();let fail=false;const wrapped={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})};
  const f=await lootFixture(()=>wrapped,{quantity:2}),a=await f.start('SO-CONCEAL',f.other,{concealLotId:f.lot.id});f.advance(105000);fail=true;await assert.rejects(f.finish(a,f.other),/INTERRUPTION/);fail=false;assert.equal((await f.points(f.other)).reserved,1);assert.equal((await f.store.get(`${f.base}/inventory/${f.lot.id}`)).quantity,2);await f.finish(a,f.other);const lots=(await f.actionRead('myInventory',{},f.other)).lots.filter(l=>l.item.id===f.lot.item.id);assert.equal(lots.reduce((n,l)=>n+l.quantity,0),2);assert.equal(lots.filter(l=>l.concealment).length,1);
 });

 test(prefix+' : ordinaire, choix victime, unité unique, quota commun et nouveau MJ explicite',async()=>{
  const f=await lootFixture(makeStore);await assert.rejects(f.start('SO-LOOT-COMMON'),{code:'LOOT_TARGET_REQUIRED'});await f.capture();
  const a=await f.start('SO-LOOT-COMMON');assert.equal(a.remainingMs,60000);f.advance(60000);const r=await f.finish(a);assert.equal(r.status,'AWAITING_PICK');assert.equal(f.rollCount(),0);
  await assert.rejects(f.actionCmd('chooseLoot',{actionId:a.id,lotId:f.lot.id,present:true}),{code:'FORBIDDEN'});
  await f.actionCmd('chooseLoot',{actionId:a.id,lotId:f.lot.id,present:true},f.other);const p={actionId:a.id,present:true,handedOver:true,requestId:randomUUID()};const done=await f.actionCmd('confirmLootHandover',p,f.other);assert.deepEqual(await f.actionCmd('confirmLootHandover',p,f.other),done);
  assert.equal((await f.store.get(`${f.base}/inventory/${f.lot.id}`)).ownerId,f.cid);assert.equal((await f.points()).available,4);
  f.advance(1800000);await f.actionCmd('endSoCaptivity',{characterId:f.tid},f.owner);await f.capture();await assert.rejects(f.start('SO-TRA-02'),{code:'LOOT_ENCOUNTER_LIMIT'});
  await assert.rejects(f.actionCmd('resetLootEncounter',{characterId:f.tid,revision:1,newEncounter:true,reason:'Autre scène'}),{code:'FORBIDDEN'});
  await f.actionCmd('resetLootEncounter',{characterId:f.tid,revision:1,newEncounter:true,reason:'Situation réellement nouvelle'},f.owner);assert.equal((await f.start('SO-TRA-02')).remainingMs,105000);
 });
 test(prefix+' : préparation de cache, une unité séparée, pause et expiration en temps de jeu',async()=>{
  const f=await lootFixture(makeStore,{quantity:3});const a=await f.start('SO-CONCEAL',f.other,{concealLotId:f.lot.id});assert.equal(a.remainingMs,105000);f.advance(5000);await f.stage('PAUSE');f.advance(600000);await f.stage('EN_JEU');await assert.rejects(f.finish(a,f.other),{code:'FIELD_TOO_EARLY'});f.advance(100000);const r=await f.finish(a,f.other);
  const inventory=await f.actionRead('myInventory',{},f.other),hidden=inventory.lots.find(l=>l.concealment);assert.equal(hidden.id,r.result.lotId);assert.equal(hidden.quantity,1);assert.equal(inventory.lots.find(l=>l.id===f.lot.id).quantity,2);assert.equal((await f.points(f.other)).available,4);assert.equal(f.rollCount(),0);
  f.advance(600000);await assert.rejects(f.start('SO-CONCEAL',f.other,{concealLotId:f.lot.id}),{code:'SO_CONCEAL_ACTIVE'});await f.stage('PAUSE');f.advance(1800000);assert.ok((await f.actionRead('myInventory',{},f.other)).lots.some(l=>l.concealment));await f.stage('EN_JEU');f.advance(1200000);assert.ok(!(await f.actionRead('myInventory',{},f.other)).lots.some(l=>l.concealment));
 });
 test(prefix+' : opposition sans dé, inférieur protège, égal ou supérieur révèle immédiatement',async()=>{
  for(const level of [1,2,3,4,5]){const f=await lootFixture(makeStore,{level});await f.hide();await f.capture();const a=await f.start('SO-TRA-02');f.advance((135-level*15)*1000);const r=await f.finish(a);assert.equal(r.status,level<2?'SUCCEEDED':'AWAITING_PICK');assert.equal(f.rollCount(),0);
   const inv=await f.actionRead('myInventory',{},f.other);assert.equal(!!inv.lots.find(l=>l.id===f.lot.id).concealment,level<2);
   if(level>=2){const v=await f.actionRead('myPersonActions');assert.equal(v.actions.find(x=>x.id===a.id).lootLots[0].id,f.lot.id);await f.actionCmd('chooseLoot',{actionId:a.id,lotId:f.lot.id,present:true});await f.actionCmd('confirmLootHandover',{actionId:a.id,present:true,handedOver:true},f.other);assert.equal((await f.store.get(`${f.base}/inventory/${f.lot.id}`)).ownerId,f.cid);}
  }
 });
 test(prefix+' : cache invisible à la fouille commune et au Rogue, même N5',async()=>{
  const f=await lootFixture(makeStore);await f.hide();await f.capture();const a=await f.start('SO-LOOT-COMMON');f.advance(60000);assert.equal((await f.finish(a)).status,'SUCCEEDED');
  await f.edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills,{id:'ROG-02',kind:'PASSIVE',level:5}]}}));
  const p=await f.actionCmd('startSoPickpocket',{targetId:f.tid,firstName:'Bela',lastName:'Test',present:true});f.advance(30000);const r=await f.actionCmd('finishSoPickpocket',{actionId:p.id});assert.equal(r.status,'EMPTY');assert.equal((await f.points()).available,4);assert.equal((await f.store.get(`${f.base}/inventory/${f.lot.id}`)).ownerId,f.tid);
 });
 test(prefix+' : don retire la cache, retour ne la réactive pas et original conserve son identité',async()=>{
  const f=await lootFixture(makeStore);await f.hide();const transfer=async(from,to)=>{const input={lotId:f.lot.id,recipientId:to,quantity:1},p=await f.actionRead('prepareLotTransfer',input,from),a=await f.actionCmd('proposeLotTransfer',{...input,confirmation:p.confirmation},from),receiver=from===f.other?f.player:f.other,d=await f.actionRead('lotTransferDetail',{transferId:a.id},receiver);await f.actionCmd('acceptLotTransfer',{transferId:a.id,confirmation:d.confirmation,received:true},receiver);};
  await transfer(f.other,f.cid);await transfer(f.player,f.tid);assert.ok(!(await f.actionRead('myInventory',{},f.other)).lots.some(l=>l.concealment));assert.deepEqual((await f.store.get(`${f.base}/inventory/${f.lot.id}`)).origin,f.lot.origin);
 });
 test(prefix+' : annulation et concurrence de cache sans double PA ni unité créée',async()=>{
  const f=await lootFixture(makeStore,{quantity:2}),input={targetId:f.tid,profileId:'SO-CONCEAL',concealLotId:f.lot.id},p=await f.actionRead('preparePersonAction',input,f.other),out=await Promise.allSettled([1,2].map(()=>f.actionCmd('startPersonAction',{...input,present:true,confirmation:p.confirmation},f.other)));assert.equal(out.filter(r=>r.status==='fulfilled').length,1);const a=out.find(r=>r.status==='fulfilled').value;
  await f.actionCmd('cancelPersonAction',{actionId:a.id,reason:'Interrompu'},f.other);assert.equal((await f.points(f.other)).available,5);assert.equal((await f.store.get(`${f.base}/inventory/${f.lot.id}`)).quantity,2);assert.ok(!(await f.actionRead('myInventory',{},f.other)).lots.some(l=>l.concealment));
  assert.ok(actionMenuItems(await f.actionRead('mySession',{},f.other)).some(i=>i.id==='DISSIMULATION'&&i.self));
 });
 test(prefix+' : fouiller un personnage à zéro PV ne le stabilise pas',async()=>{
  const f=await lootFixture(makeStore);const damage={amount:3,damageKind:'ORDINARY',counted:true,secondsSinceDown:0},p=await f.actionRead('prepareDamage',damage,f.other);await f.actionCmd('applyDamage',{...damage,reportedAt:p.reportedAt,confirmation:p.confirmation},f.other);
  const a=await f.start('SO-TRA-02');assert.equal(a.urgent,false);f.advance(105000);await f.finish(a);const c=await f.store.get(`${f.base}/characters/${f.tid}`);assert.equal(c.hp,0);assert.equal(c.survival.stabilized,false);
 });
}
