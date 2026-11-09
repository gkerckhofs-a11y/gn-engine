import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
import {itemInput,newLot} from '../../src/core/inventory-state.mjs';
import {actionPointPath} from '../../src/core/action-point-state.mjs';

export async function pickpocketFixture(makeStore){
 const f=await actionsFixture(makeStore,{classId:'ROG',helper:true});
 const thief=(await f.actionRead('mySession')).character.id;
 const victim=(await f.actionRead('mySession',{},f.other)).character.id;
 await f.stage('EN_JEU');
 const give=async(id,quantity=1,pickpocketable=true)=>{
  const item=itemInput({name:'Jeton '+id,description:'Jeton numérique',category:'Bien',unit:'unité',kind:'STACKABLE',consumable:false,publicationState:'PUBLISHED',pillable:false,pickpocketable},id);
  const lot=newLot('lot_'+id,item,quantity,victim,1000000,{kind:'TEST_STOCK'});
  await f.store.runTransaction(async tx=>tx.set('sessions/'+f.sid+'/inventory/'+lot.id,lot));
  return lot;
 };
 const start=(firstName='Bela',lastName='Test')=>f.actionCmd('startSoPickpocket',{targetId:victim,firstName,lastName,present:true});
 const finish=id=>f.actionCmd('finishSoPickpocket',{actionId:id});
 const choose=(id,itemId)=>f.actionCmd('chooseSoPickpocket',{actionId:id,itemId});
 const cancel=id=>f.actionCmd('cancelSoPickpocket',{actionId:id});
 return {...f,thief,victim,give,start,finish,choose,cancel};
}
export function soPickpocketSuite(makeStore,prefix='ROG-02'){
 test(prefix+' : identité, départ, minuterie, PA conditionnels, vol et notification différée',async()=>{
  const f=await pickpocketFixture(makeStore);
  const kit=await f.store.list('sessions/'+f.sid+'/inventory');
  assert.ok(kit.every(l=>l.item.pickpocketable!==true));
  await f.give('eligible',2);
  assert.equal((await f.actionRead('mySoPickpocket')).level,1);
  const a=await f.start();
  assert.equal(a.status,'RUNNING');
  assert.equal(a.durationSeconds,60);
  assert.equal((await f.points()).reserved,1);
  await assert.rejects(f.finish(a.id),{code:'SO_PICKPOCKET_TOO_EARLY'});
  assert.deepEqual((await f.actionRead('mySoPickpocketAlerts',{},f.other)).alerts,[]);
  f.advance(60000);
  const r=await f.finish(a.id);
  assert.equal(r.status,'SUCCESS');
  assert.equal(r.result.quantity,1);
  assert.equal((await f.points()).reserved,0);
  assert.equal((await f.points()).available,4);
  const lots=await f.store.list('sessions/'+f.sid+'/inventory');
  assert.equal(lots.filter(l=>l.item.id==='eligible'&&l.holderId===f.victim).reduce((n,l)=>n+l.quantity,0),1);
  assert.equal(lots.filter(l=>l.item.id==='eligible'&&l.holderId===f.thief).reduce((n,l)=>n+l.quantity,0),1);
  assert.deepEqual((await f.actionRead('mySoPickpocketAlerts',{},f.other)).alerts,[]);
  f.advance(600000);
  const alert=await f.actionRead('mySoPickpocketAlerts',{},f.other);
  assert.equal(alert.alerts.length,1);
  assert.doesNotMatch(JSON.stringify(alert),new RegExp(f.thief));
  await assert.rejects(f.start(),{code:'SO_PICKPOCKET_QUOTA'});
 });
 test(prefix+' : mauvais nom, aucun quota/PA, inventaire vide puis quota global',async()=>{
  const f=await pickpocketFixture(makeStore);
  const wrong=await f.start('Autre','Nom');
  assert.equal(wrong.status,'WRONG_IDENTITY');
  assert.equal((await f.points()).available,5);
  assert.equal((await f.points()).reserved,0);
  assert.equal(await f.store.get('sessions/'+f.sid+'/pickpocketVictims/'+f.victim),null);
  await assert.rejects(f.start(),{code:'SO_PICKPOCKET_COOLDOWN'});
  f.advance(600000);
  const a=await f.start();f.advance(60000);
  const empty=await f.finish(a.id);
  assert.equal(empty.status,'EMPTY');
  assert.equal((await f.points()).available,5);
  const q=await f.store.get('sessions/'+f.sid+'/pickpocketVictims/'+f.victim);
  assert.equal(q.attempts,1);
  assert.equal(q.success,false);
  f.advance(600000);
  const second=await f.start();f.advance(60000);await f.finish(second.id);
  f.advance(600000);
  await assert.rejects(f.start(),{code:'SO_PICKPOCKET_QUOTA'});
 });
 test(prefix+' : concurrence sur cible, annulation avant résolution et types masqués jusqu’à la fin',async()=>{
  const f=await pickpocketFixture(makeStore);await f.give('one',2);await f.give('two',2);
  const both=await Promise.allSettled([f.start(),f.start()]);
  assert.equal(both.filter(x=>x.status==='fulfilled').length,1);
  const a=both.find(x=>x.status==='fulfilled').value;
  assert.doesNotMatch(JSON.stringify(a),/Jeton one|Jeton two/);
  await f.cancel(a.id);
  assert.equal((await f.points()).available,5);
  assert.equal((await f.store.get('sessions/'+f.sid+'/pickpocketVictims/'+f.victim)).attempts,0);
  // Test the two-choice branch by publishing an upgraded learned level in this isolated fixture.
  const path='sessions/'+f.sid+'/characters/'+f.thief;
  await f.store.runTransaction(async tx=>{
   const c=await tx.get(path);
   const skills=c.abilityProfile.skills.map(s=>s.id==='ROG-02'?{...s,level:3}:s);
   tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills}});
  });
  const b=await f.start();
  assert.equal(b.level,3);
  f.advance(45000);
  const r=await f.finish(b.id);
  assert.equal(r.status,'CHOOSING');
  assert.equal(r.choices.length,2);
  assert.equal((await f.points()).reserved,1);
  const chosen=await f.choose(b.id,r.choices[0].itemId);
  assert.equal(chosen.status,'SUCCESS');
  assert.equal((await f.points()).reserved,0);
  const attempted=await f.store.get('sessions/'+f.sid+'/pickpocketVictims/'+f.victim);
  assert.equal(attempted.attempts,1);
  assert.equal(attempted.success,true);
 });
 test(prefix+' : objet non éligible, ancienne version et STOP refusés sans transfert',async()=>{
  const f=await pickpocketFixture(makeStore);await f.give('protected',1,false);
  const a=await f.start();f.advance(60000);
  assert.equal((await f.finish(a.id)).status,'EMPTY');
  const sessionPath='sessions/'+f.sid,s=await f.store.get(sessionPath);
  await f.store.runTransaction(async tx=>{const {pickpocketVersion,...other}=s.spaceOutlaws;tx.set(sessionPath,{...s,spaceOutlaws:other});});
  await assert.rejects(f.actionRead('mySoPickpocket'),{code:'SO_PICKPOCKET_CLOSED'});
 });
}
