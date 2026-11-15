import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {droidWorkFixture} from './space-droid-work-suite.mjs';

export async function droidStorageFixture(makeStore,code='DR-05'){
 const f=await droidWorkFixture(makeStore,{code});await f.consent();await f.finishModule(await f.startModule());
 await f.edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills,{id:'INF-02',name:'Déchiffrement',kind:'PASSIVE',level:2},{id:'TRA-02',name:'Fouille',kind:'PASSIVE',level:2},{id:'ROG-02',name:'Vol',kind:'PASSIVE',level:2}]}}));
 await f.store.runTransaction(async tx=>{
  const sample=await tx.get(`${f.base}/inventory/module`);
  tx.set(`${f.base}/knowledge/doc`,{id:'doc',kind:'DOCUMENT',title:'Rapport confidentiel',origin:'Rapport de scénario',shareMode:'TRANSFER',tags:[],body:'Texte chiffré fictif',cipher:{plaintext:'Secret intérieur',minLevel:3,threshold:7},publicationState:'PUBLISHED',revision:1});
  tx.set(`${f.base}/inventory/content`,{...sample,id:'content',item:{id:'content',name:'Support privé',kind:'INDIVIDUAL',consumable:false,knowledgeId:'doc',concealable:true,pickpocketable:true,pillable:true},location:{kind:'CHARACTER',id:f.tid},status:'AVAILABLE',revision:1,pillable:true});
 });
 const move=async(operation,lotId='content',patch={})=>f.actionCmd('moveDroidContent',{moduleLotId:'module',revision:(await f.get('inventory/module')).revision,operation,lotId,...patch},f.other);
 const decrypt=(patch={})=>f.actionCmd('startSoDecryption',{memoryLotId:'module',present:true,...patch});
 return {...f,move,decrypt};
}
export function droidStorageSuite(makeStore,prefix='Contenants droïdes'){
 test(`${prefix} : mémoire privée, ouverture N2 sans copie ni déchiffrement du contenu`,async()=>{
  const f=await droidStorageFixture(makeStore);await f.move('STORE');
  const count=(await f.store.list(`${f.base}/inventory`)).length;
  const d=await f.actionRead('personTarget',{targetId:f.tid});assert.equal(d.droidStorage,undefined);assert.doesNotMatch(JSON.stringify(d),/Texte chiffré|Support privé/);
  await assert.rejects(f.actionCmd('moveDroidContent',{moduleLotId:'module',revision:(await f.get('inventory/module')).revision,operation:'TAKE'}),{code:'SO_DROID_STORAGE'});
  await f.actionCmd('openInventoryDocument',{lotId:'content'},f.other);
  await assert.rejects(f.consent('REMOVE'),{code:'MODULE_CONTENT_NOT_EMPTY'});
  const a=await f.decrypt();assert.equal(a.durationSeconds,165);await assert.rejects(f.move('TAKE'),{code:'FIELD_TARGET_BUSY'});
  f.advance(165000);f.setDie(4);const requestId=randomUUID(),r=await f.actionCmd('finishSoDecryption',{actionId:a.id,requestId});
  assert.equal(r.success,true);assert.equal(r.memoryResult.body,'Texte chiffré fictif');assert.doesNotMatch(JSON.stringify(r),/Secret intérieur/);
  assert.deepEqual(await f.actionCmd('finishSoDecryption',{actionId:a.id,requestId}),r);
  assert.equal((await f.store.list(`${f.base}/inventory`)).length,count);assert.equal((await f.get('inventory/content')).location.kind,'DROID_CONTENT');assert.equal(await f.get(`characters/${f.cid}/knowledge/doc`),null);
  assert.equal((await f.actionRead('mySoDecryption')).memoryReads.length,1);assert.equal((await f.actionRead('mySoDecryption',{},f.other)).memoryReads.length,0);
  await f.move('TAKE');assert.equal((await f.get('inventory/content')).id,'content');assert.equal((await f.get('inventory/content')).ownerId,f.tid);
 });
 test(`${prefix} : niveau, annulation, document modifié et accès révoqué pendant ouverture`,async()=>{
  const f=await droidStorageFixture(makeStore);await f.move('STORE');
  await f.edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='INF-02'?{...k,level:1}:k)}}));
  await assert.rejects(f.decrypt(),{code:'SO_INF02_SKILL'});
  await f.edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='INF-02'?{...k,level:2}:k)}}));
  const a=await f.decrypt();await f.edit('knowledge/doc',k=>({...k,revision:k.revision+1}));f.advance(165000);await assert.rejects(f.actionCmd('finishSoDecryption',{actionId:a.id}),{code:'SO_INF02_STALE'});
  await f.actionCmd('cancelSoDecryption',{actionId:a.id});assert.equal((await f.points()).available,4);assert.equal((await f.get('inventory/module')).memoryActionId,null);
  const b=await f.decrypt();await f.actionCmd('revokeAccess',{uid:f.other.uid},f.owner);f.advance(165000);await assert.rejects(f.actionCmd('finishSoDecryption',{actionId:b.id}),{code:'INVALID_RECIPIENT'});
  await f.actionCmd('cancelSoDecryptionMJ',{actionId:b.id,reason:'Accès retiré'},f.owner);assert.equal((await f.points()).available,4);assert.equal((await f.get('inventory/content')).location.kind,'DROID_CONTENT');
 });
 test(`${prefix} : une unité cachée à ROG-02, trouvée par TRA-02 et remise sans duplication`,async()=>{
  const f=await droidStorageFixture(makeStore,'DR-06');
  await f.edit('inventory/content',l=>({...l,item:{...l.item,kind:'STACKABLE',knowledgeId:null},quantity:2}));
  const stored=await f.move('STORE');assert.notEqual(stored.lotId,'content');assert.equal((await f.get('inventory/content')).quantity,1);
  const theft=await f.actionCmd('startSoPickpocket',{targetId:f.tid,firstName:'Bela',lastName:'Test',present:true});f.advance(45000);const stolen=await f.actionCmd('finishSoPickpocket',{actionId:theft.id});assert.equal(stolen.status,'SUCCESS');assert.equal((await f.get('inventory/'+stored.lotId)).holderId,f.tid);
  await f.actionCmd('setSoCaptivity',{characterId:f.tid,kind:'CELL',safePath:true,reason:'Fouille préparée'},f.owner);
  const i={targetId:f.tid,profileId:'SO-TRA-02'},p=await f.actionRead('preparePersonAction',i),a=await f.actionCmd('startPersonAction',{...i,confirmation:p.confirmation,present:true});f.advance(a.remainingMs);await f.finishCare(a);
  assert.equal((await f.get(`characters/${f.tid}`)).droidModules[0].contentLotId,null);assert.equal((await f.get('inventory/'+stored.lotId)).location.kind,'CHARACTER');
  await f.actionCmd('chooseLoot',{actionId:a.id,lotId:stored.lotId,present:true});await f.actionCmd('confirmLootHandover',{actionId:a.id,present:true,handedOver:true},f.other);
  assert.equal((await f.get('inventory/'+stored.lotId)).holderId,f.cid);assert.equal((await f.get(`characters/${f.tid}`)).lootEncounter.taken,true);
  assert.equal((await f.store.list(`${f.base}/inventory`)).filter(l=>l.item.id==='content').reduce((n,l)=>n+l.quantity,0),2);
 });
 test(`${prefix} : blindage neutralisé ne consomme pas sa réserve, réparation distincte du soin`,async()=>{
  const f=await droidWorkFixture(makeStore,{code:'DR-01'});await f.consent();await f.finishModule(await f.startModule());
  await f.edit(`characters/${f.tid}`,c=>({...c,protection:1,protectionSourceLotId:'module',droidModules:c.droidModules.map(m=>({...m,status:'DAMAGED'}))}));
  const hp=(await f.health()).hp;await f.damage();assert.equal((await f.health()).hp,hp-1);assert.equal((await f.health()).protection,1);
  await f.consent('REPAIR');await f.finishModule(await f.startModule('REPAIR'));assert.equal((await f.health()).hp,hp-1);await f.damage();assert.equal((await f.health()).hp,hp-1);assert.equal((await f.health()).protection,0);
  f.advance(600000);await f.consent('REMOVE');await f.finishModule(await f.startModule('REMOVE'));assert.equal((await f.get('inventory/module')).moduleState.protectionCharge,0);
  f.advance(600000);await f.consent('INSTALL');await f.finishModule(await f.startModule('INSTALL'));assert.equal((await f.health()).protection,0);
 });
 test(`${prefix} : épisode suivant conserve panne, protection vide, contenu et tentative de mémoire`,async()=>{
  const f=await droidStorageFixture(makeStore);await f.move('STORE');const a=await f.decrypt();f.advance(165000);f.setDie(4);await f.actionCmd('finishSoDecryption',{actionId:a.id});
  await f.actionCmd('damageDroidModule',{moduleLotId:'module',revision:(await f.get('inventory/module')).revision,reason:'Dommage durable'},f.owner);
  await f.edit(`characters/${f.tid}`,c=>({...c,protection:0}));const before=await f.get(`characters/${f.tid}`),lots=await f.store.list(`${f.base}/inventory`);
  const {episodeHarness}=await import('./space-episodes-suite.mjs'),e=await episodeHarness(f);await e.close();await e.resume(await e.begin());
  assert.deepEqual((await e.get(`characters/${f.tid}`)).droidModules,before.droidModules);assert.equal((await e.get(`characters/${f.tid}`)).protection,0);
  for(const l of lots)assert.deepEqual(await e.get('inventory/'+l.id),l);
  await e.stage('EN_JEU');f.advance(600000);await f.store.runTransaction(async tx=>{const path=`sessions/${e.sid}/characters/${f.tid}`,c=await tx.get(path);tx.set(path,{...c,droidModules:c.droidModules.map(m=>({...m,status:'OPERATIONAL'}))});});
  await assert.rejects(e.cmd('startSoDecryption',{memoryLotId:'module',present:true},f.player),{code:'SO_INF02_ALREADY'});
 });

}
