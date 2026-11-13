import test from 'node:test';
import {createHash,randomUUID} from 'node:crypto';
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
 test(prefix+' : reprise réseau idempotente et changement de version d’accès refusé',async()=>{
  const f=await decryptionFixture(makeStore),input={knowledgeId:'ordinary',requestId:randomUUID()};
  const a=await f.actionCmd('startSoDecryption',input);
  assert.deepEqual(await f.actionCmd('startSoDecryption',input),a);
  assert.equal((await f.points()).reserved,1);
  const path='sessions/'+f.sid+'/registrations/'+createHash('sha256').update(f.player.uid).digest('hex');
  await f.store.runTransaction(async tx=>{const r=await tx.get(path);tx.set(path,{...r,accessVersion:r.accessVersion+1});});
  await assert.rejects(f.actionCmd('startSoDecryption',input),{code:'FORBIDDEN'});
  f.advance(165000);f.setDie(6);
  await assert.rejects(f.finish(a.id),{code:'SO_INF02_STALE'});
  assert.equal((await f.points()).reserved,1);
  assert.equal((await f.store.get(f.rpath)).decodedRevision,undefined);
 });
 test(prefix+' : résolution répétée sans double dépense, reçu inaccessible après réaffectation',async()=>{
  const f=await decryptionFixture(makeStore,{helper:true}),a=await f.start();
  f.advance(165000);f.setDie(6);
  const input={actionId:a.id,requestId:randomUUID()},result=await f.actionCmd('finishSoDecryption',input);
  assert.deepEqual(await f.actionCmd('finishSoDecryption',input),result);
  assert.equal((await f.points()).available,4);
  const other=(await f.actionRead('mySession',{},f.other)).character.id;
  const path='sessions/'+f.sid+'/registrations/'+createHash('sha256').update(f.player.uid).digest('hex');
  await f.store.runTransaction(async tx=>{
   const r=await tx.get(path),cp='sessions/'+f.sid+'/characters/'+other,c=await tx.get(cp);
   tx.set(path,{...r,characterId:other});tx.set(cp,{...c,assignedUid:f.player.uid});
  });
  await assert.rejects(f.actionCmd('finishSoDecryption',input),{code:'FORBIDDEN'});
 });
 test(prefix+' : convalescence contrôlée au lancement et à la résolution, annulation possible',async()=>{
  const f=await decryptionFixture(makeStore),path='sessions/'+f.sid+'/characters/'+f.c;
  const edit=until=>f.store.runTransaction(async tx=>{const c=await tx.get(path);tx.set(path,{...c,convalescentUntilGameMs:until});});
  await edit(99999999);await assert.rejects(f.start(),{code:'OUT_OF_COMBAT'});
  await edit(0);const a=await f.start();await edit(99999999);f.advance(165000);
  await assert.rejects(f.finish(a.id),{code:'OUT_OF_COMBAT'});
  await f.cancel(a.id);assert.equal((await f.points()).available,5);assert.equal((await f.points()).reserved,0);
 });
 test(prefix+' : diminution de compétence pendant l’action ne conserve pas l’ancien bonus',async()=>{
  const f=await decryptionFixture(makeStore),a=await f.start(),path='sessions/'+f.sid+'/characters/'+f.c;
  await f.store.runTransaction(async tx=>{const c=await tx.get(path);tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(s=>s.id==='INF-02'?{...s,level:1}:s)}});});
  f.advance(165000);f.setDie(6);await assert.rejects(f.finish(a.id),{code:'SO_INF02_SKILL'});
  assert.equal((await f.store.get(f.rpath)).decodedRevision,undefined);
  await f.cancel(a.id);assert.equal((await f.points()).available,5);
 });
 test(prefix+' : dé invalide et reçu révoqué sans consommation ni révélation',async()=>{
  const f=await decryptionFixture(makeStore),a=await f.start();f.advance(165000);
  for(const die of [0,7,1.5]){f.setDie(die);await assert.rejects(f.finish(a.id),{code:'INVALID_DIE'});}
  assert.equal((await f.points()).reserved,1);
  await f.store.runTransaction(async tx=>{const r=await tx.get(f.rpath);tx.set(f.rpath,{...r,active:false});});
  f.setDie(6);await assert.rejects(f.finish(a.id),{code:'SO_INF02_DOCUMENT'});
  assert.equal((await f.store.get(f.rpath)).decodedRevision,undefined);
  await f.cancel(a.id);assert.equal((await f.points()).available,5);
 });

 test(prefix+' : le MJ libère une action après révocation avec motif et sans texte secret',async()=>{
  const f=await decryptionFixture(makeStore),a=await f.start();
  await f.actionCmd('revokeAccess',{uid:f.player.uid},f.owner);
  await assert.rejects(f.finish(a.id),{code:'FORBIDDEN'});
  const view=await f.actionRead('soDecryptionAdmin',{},f.owner);
  assert.equal(view.actions[0].id,a.id);assert.doesNotMatch(JSON.stringify(view),/COORDONNEES_SECRETES/);
  const body={actionId:a.id,reason:'Accès révoqué : libération de réservation',requestId:randomUUID()};
  const r=await f.actionCmd('cancelSoDecryptionMJ',body,f.owner);assert.equal(r.status,'CANCELLED');
  assert.deepEqual(await f.actionCmd('cancelSoDecryptionMJ',body,f.owner),r);
  assert.deepEqual(await f.actionCmd('cancelSoDecryptionMJ',{...body,requestId:randomUUID()},f.owner),r);
  const points=await f.store.get('sessions/'+f.sid+'/characters/'+f.c+'/resources/actionPoints');
  assert.equal(points.reserved,0);assert.equal(points.available,5);
  assert.equal((await f.store.get(f.rpath)).decodedRevision,undefined);
  assert.equal((await f.store.get('sessions/'+f.sid+'/characters/'+f.c)).activeFieldActionId,null);
  const audits=(await f.store.list('sessions/'+f.sid+'/audit')).filter(x=>x.action==='cancelSoDecryptionMJ');
  assert.equal(audits.length,1);assert.equal(audits[0].reason,body.reason);
  assert.equal((await f.actionRead('soDecryptionAdmin',{},f.owner)).actions.length,0);
 });
 test(prefix+' : annulation MJ réservée au contenu, motif requis, permissions revérifiées au rejeu',async()=>{
  const f=await decryptionFixture(makeStore),a=await f.start(),body={actionId:a.id,reason:'Interruption contrôlée',requestId:randomUUID()};
  await assert.rejects(f.actionRead('soDecryptionAdmin'),{code:'FORBIDDEN'});
  await assert.rejects(f.actionCmd('cancelSoDecryptionMJ',body),{code:'FORBIDDEN'});
  await assert.rejects(f.actionCmd('cancelSoDecryptionMJ',{actionId:a.id,reason:' '},f.owner),{code:'REASON_REQUIRED'});
  await f.role(true,'RECEPTION');
  await assert.rejects(f.actionRead('soDecryptionAdmin',{},f.mj),{code:'FORBIDDEN'});
  await f.role(true,'MJ');
  await f.actionCmd('cancelSoDecryptionMJ',body,f.mj);
  await f.role(false,'MJ');
  await assert.rejects(f.actionCmd('cancelSoDecryptionMJ',body,f.mj),{code:'FORBIDDEN'});
  assert.equal((await f.points()).available,5);
 });
 test(prefix+' : arrêt en pause et nouvelle tentative, sans annulation d’une réussite',async()=>{
  const f=await decryptionFixture(makeStore),a=await f.start();await f.stage('PAUSE');
  await f.actionCmd('cancelSoDecryptionMJ',{actionId:a.id,reason:'Interruption de scène'},f.owner);
  await f.stage('EN_JEU');const b=await f.start();f.advance(165000);f.setDie(6);await f.finish(b.id);
  await assert.rejects(f.actionCmd('cancelSoDecryptionMJ',{actionId:b.id,reason:'Trop tard'},f.owner),{code:'SO_INF02_STALE'});
  assert.equal((await f.points()).available,4);
 });
 test(prefix+' : résolution et annulation MJ concurrentes produisent un seul résultat économique',async()=>{
  const f=await decryptionFixture(makeStore),a=await f.start();f.advance(165000);f.setDie(6);
  const results=await Promise.allSettled([f.finish(a.id),f.actionCmd('cancelSoDecryptionMJ',{actionId:a.id,reason:'Interruption concurrente'},f.owner)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const ended=await f.store.get('sessions/'+f.sid+'/inf02Actions/'+a.id),points=await f.points();
  assert.equal(points.reserved,0);assert.equal(points.available,ended.status==='SUCCESS'?4:5);
  assert.equal((await f.store.get(f.rpath)).decodedRevision!==undefined,ended.status==='SUCCESS');
 });

}
