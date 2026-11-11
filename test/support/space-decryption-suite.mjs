import test from 'node:test';
import assert from 'node:assert/strict';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
import {knowledgeSnapshot} from '../../src/core/knowledge.mjs';

export async function decryptionFixture(makeStore,{helper=false}={}){
 const f=await actionsFixture(makeStore,{classId:'INF',helper});
 await f.stage('EN_JEU');
 const c=(await f.actionRead('mySession')).character.id;
 const kpath='sessions/'+f.sid+'/knowledge/ordinary';
 const rpath='sessions/'+f.sid+'/characters/'+c+'/knowledge/ordinary';
 const plaintext='COORDONNEES_SECRETES';
 await f.store.runTransaction(async tx=>{
  const current=await tx.get(kpath);
  assert.ok(current,'M6 fixture must contain published knowledge');
  const k={...current,kind:'DOCUMENT',body:'ZYX-7 / CODE FICTIF',cipher:{minLevel:1,threshold:6,plaintext}};
  tx.set(kpath,k);
  tx.set(rpath,{id:'ordinary',active:true,snapshot:knowledgeSnapshot(k),receivedAt:1000000,
   source:'GM',sourceName:'Document obtenu en jeu',readAt:null,grantRevision:1});
 });
 const start=()=>f.actionCmd('startSoDecryption',{knowledgeId:'ordinary'});
 const finish=id=>f.actionCmd('finishSoDecryption',{actionId:id});
 const cancel=id=>f.actionCmd('cancelSoDecryption',{actionId:id});
 return {...f,c,plaintext,start,finish,cancel,kpath,rpath};
}
export function soDecryptionSuite(makeStore,prefix='INF-02'){
 test(prefix+' : document acquis, D6 + niveau, temps de jeu, un PA et révélation après succès',async()=>{
  const f=await decryptionFixture(makeStore);
  const before=(await f.actionRead('knowledgeDetail',{knowledgeId:'ordinary'})).knowledge.body;
  assert.match(before,/ZYX-7/);
  assert.doesNotMatch(JSON.stringify(await f.actionRead('mySoDecryption')),/COORDONNEES_SECRETES/);
  const p=await f.start();assert.equal(p.durationSeconds,165);
  assert.equal((await f.store.get('sessions/'+f.sid+'/characters/'+f.c)).activeFieldActionId,p.id);
  assert.equal((await f.points()).reserved,1);
  await assert.rejects(f.finish(p.id),{code:'SO_INF02_TOO_EARLY'});
  f.advance(165000);f.setDie(4);
  const r=await f.finish(p.id);
  assert.equal(r.status,'SUCCESS');
  assert.equal(r.total,6);
  assert.equal((await f.points()).available,4);
  assert.equal((await f.points()).reserved,0);
  assert.equal((await f.store.get('sessions/'+f.sid+'/characters/'+f.c)).activeFieldActionId,null);
  const after=(await f.actionRead('knowledgeDetail',{knowledgeId:'ordinary'})).knowledge.body;
  assert.equal(after,f.plaintext);
  assert.equal((await f.actionRead('mySoDecryption')).documents[0].decoded,true);
  assert.doesNotMatch(JSON.stringify(r),/COORDONNEES_SECRETES/);
  await assert.rejects(f.start(),{code:'SO_INF02_COOLDOWN'});
 });
 test(prefix+' : échec dépense le PA, garde le chiffré et bloque une seconde tentative pour la même version',async()=>{
  const f=await decryptionFixture(makeStore);
  const a=await f.start();f.advance(165000);f.setDie(1);
  const r=await f.finish(a.id);assert.equal(r.status,'FAILED');assert.equal(r.total,3);
  assert.equal((await f.points()).available,4);
  assert.match((await f.actionRead('knowledgeDetail',{knowledgeId:'ordinary'})).knowledge.body,/ZYX-7/);
  f.advance(600000);
  await assert.rejects(f.start(),{code:'SO_INF02_ALREADY'});
 });
 test(prefix+' : annulation restitue le PA et ne consomme pas la tentative',async()=>{
  const f=await decryptionFixture(makeStore);
  const a=await f.start();
  assert.equal((await f.cancel(a.id)).status,'CANCELLED');
  assert.equal((await f.points()).available,5);
  assert.equal((await f.points()).reserved,0);
  assert.equal((await f.store.get('sessions/'+f.sid+'/characters/'+f.c)).activeFieldActionId,null);
  const b=await f.start();
  assert.notEqual(b.id,a.id);
 });
 test(prefix+' : révocation du reçu et changement de version empêchent de récupérer un texte secret',async()=>{
  const f=await decryptionFixture(makeStore);
  const a=await f.start();
  await f.store.runTransaction(async tx=>{
   const k=await tx.get(f.kpath);tx.set(f.kpath,{...k,revision:k.revision+1,cipher:{...k.cipher,plaintext:'NOUVEAU_SECRET'}});
  });
  f.advance(165000);f.setDie(6);
  await assert.rejects(f.finish(a.id),{code:'SO_INF02_STALE'});
  assert.match((await f.actionRead('knowledgeDetail',{knowledgeId:'ordinary'})).knowledge.body,/ZYX-7/);
 });
 test(prefix+' : le déchiffrement refuse les actions Rogue encore actives',async()=>{
  const f=await decryptionFixture(makeStore);
  await f.store.runTransaction(async tx=>tx.set('sessions/'+f.sid+'/pickpocketRogues/'+f.c,{activeId:'pickpocket-active',cooldownUntil:0}));
  await assert.rejects(f.start(),{code:'SO_INF02_BUSY'});
  await f.store.runTransaction(async tx=>{
   tx.set('sessions/'+f.sid+'/pickpocketRogues/'+f.c,{activeId:null,cooldownUntil:0});
   tx.set('sessions/'+f.sid+'/soEscapeRogues/'+f.c,{activeId:'escape-active',cooldownUntil:0});
  });
  await assert.rejects(f.start(),{code:'SO_INF02_BUSY'});
 });
 test(prefix+' : un captif et un joueur sans reçu ne peuvent déchiffrer',async()=>{
  const f=await decryptionFixture(makeStore,{helper:true});
  await f.actionCmd('setSoCaptivity',{characterId:f.c,kind:'CELL',safePath:true,reason:'Détention sous MJ'},f.owner);
  await assert.rejects(f.start(),{code:'SO_ESCAPE_CAPTIVE'});
  await f.actionCmd('endSoCaptivity',{characterId:f.c},f.owner);
  await assert.rejects(f.actionCmd('startSoDecryption',{knowledgeId:'ordinary'},f.other),{code:'SO_INF02_DOCUMENT'});
 });
}
