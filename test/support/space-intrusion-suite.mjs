import {episodeHarness} from './space-episodes-suite.mjs';
import {newLot,itemInput} from '../../src/core/inventory-state.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';

export async function intrusionFixture(makeStore,{minLevel=1,threshold=6,challenge=false,helper=false,resources=false,hints=false,failureLockSeconds=0,trace=false}={}){
 const f=await actionsFixture(makeStore,{classId:'INF',release:false,helper});
 if(resources)await f.cc('saveCentralItem',{itemId:'circuit',itemRevision:0,draftRevision:(await f.view()).draft.revision,item:{name:'Circuit consommable fictif',kind:'STACKABLE',consumable:true},reason:'Fourniture préparée'});
 const d=await f.view();
 const target={...(trace?{tracePolicy:{minLevel:1,actions:['INTRUSION'],falseLeads:[]}}:{}),kind:'INTRUSION',title:'Serrure de cantina',description:'Une serrure fictive portant le QR du jeu.',
  gmNotes:'SECRET_MJ',failureLockSeconds,profiles:{},rewards:[],intrusion:{category:'LOCK',minLevel,threshold,
   successText:'LE_PASSAGE_FICTIF_EST_AUTORISE',failureText:'La serrure fictive résiste.',...(resources?{bonusItemIds:['kit_communicator'],consumable:{itemId:'circuit',quantity:2}}:{}),...(hints?{hints:[{id:'hint3',minLevel:3,text:'INDICE_PRIVE_N3'},{id:'hint5',minLevel:5,text:'INDICE_PRIVE_N5'}]}:{}),
   ...(challenge?{challenge:{type:'CODE',prompt:'Trouver la devise de la station, gravée sur le décor.',
     answerCode:'NOVA 2042',durationSeconds:90}}:{})}};
 await f.cc('saveCentralFieldTarget',{fieldTargetId:'cantina_lock',fieldTargetRevision:0,
  draftRevision:d.draft.revision,fieldTarget:target,reason:'Préparer une intrusion fictive'});
 const p=await f.releasePreview();assert.deepEqual(p.blockers,[]);
 await f.release(p);
 await f.birth(await f.birthPreview());if(helper)await f.birth(await f.birthPreview(f.owner,{uid:f.other.uid}),{uid:f.other.uid});
 await f.stage('EN_JEU');
 const read=(name='mySoIntrusion')=>f.actionRead(name,{targetId:'cantina_lock'});
 const start=(patch={})=>f.actionCmd('startSoIntrusion',{targetId:'cantina_lock',present:true,...patch});
 const finish=(id,patch={})=>f.actionCmd('finishSoIntrusion',{targetId:'cantina_lock',actionId:id,present:true,...patch});
 const cancel=id=>f.actionCmd('cancelSoIntrusion',{targetId:'cantina_lock',actionId:id});
 const cid=(await f.actionRead('mySession')).character.id;
 if(resources){const item=await f.store.get(`sessions/${f.sid}/items/circuit`);await f.store.runTransaction(async tx=>tx.set(`sessions/${f.sid}/inventory/circuit`,newLot('circuit',item,6,cid,1000000,{kind:'SCENARIO_VERSION'})));}
 return {...f,target,cid,read,start,finish,cancel};
}
export function soIntrusionSuite(makeStore,prefix='INF-01'){

 test(prefix+' : équipement et aide natifs cumulés, fourniture exacte consommée au jet',async()=>{
  const f=await intrusionFixture(makeStore,{resources:true,helper:true}),view=await f.read(),lot=view.bonusLots[0];assert.ok(lot);assert.equal(view.consumableLots[0].quantity,6);
  const offer=await f.actionCmd('offerAid',{targetId:f.cid,skillId:'INF-01',present:true},f.other);
  const a=await f.start({bonusLotId:lot.id,consumableLotId:'circuit',aidOfferId:offer.id});assert.equal(a.bonus,1);assert.equal(a.aid,1);assert.equal((await f.points(f.other)).reserved,0);
  f.advance(165000);f.setDie(2);const r=await f.finish(a.id,{requestId:'resolve-once'});assert.equal(r.total,6);assert.equal(r.success,true);
  assert.deepEqual(await f.finish(a.id,{requestId:'resolve-once'}),r);assert.equal(f.rollCount(),1);
  assert.equal((await f.store.get(`sessions/${f.sid}/inventory/circuit`)).quantity,4);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).status,'AVAILABLE');
  await assert.rejects(f.actionCmd('startSoIntrusion',{targetId:'cantina_lock',present:true,consumableLotId:'circuit'},f.other),{code:'SO_INF01_COOLDOWN'});
 });
 test(prefix+' : fournitures manquantes, matériel incompatible et annulation par l’aidant sans dépense',async()=>{
  const f=await intrusionFixture(makeStore,{resources:true,helper:true}),view=await f.read();
  await assert.rejects(f.start(),{code:'FIELD_CONSUMABLE_REQUIRED'});await assert.rejects(f.start({consumableLotId:'circuit',bonusLotId:'circuit'}),{code:'FIELD_EQUIPMENT_UNAVAILABLE'});assert.equal((await f.points()).reserved,0);
  const offer=await f.actionCmd('offerAid',{targetId:f.cid,skillId:'INF-01',present:true},f.other),a=await f.start({consumableLotId:'circuit',bonusLotId:view.bonusLots[0].id,aidOfferId:offer.id});
  await f.actionCmd('cancelSoIntrusionAid',{actionId:a.id},f.other);assert.equal((await f.points()).available,5);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/circuit`)).quantity,6);
  assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${view.bonusLots[0].id}`)).status,'AVAILABLE');assert.equal((await f.points(f.other)).available,5);
 });
 test(prefix+' : échec consomme les fournitures et le verrou préparé de cible est partagé',async()=>{
  const f=await intrusionFixture(makeStore,{resources:true,helper:true,failureLockSeconds:700}),a=await f.start({consumableLotId:'circuit'});f.advance(165000);f.setDie(1);assert.equal((await f.finish(a.id)).success,false);
  assert.equal((await f.store.get(`sessions/${f.sid}/inventory/circuit`)).quantity,4);f.advance(600000);await assert.rejects(f.start({consumableLotId:'circuit'}),{code:'SO_INF01_BUSY'});f.advance(100000);await f.cancel((await f.start({consumableLotId:'circuit'})).id);
 });
 test(prefix+' : cinq niveaux et trois types de cible, baisse de niveau sans jet puis annulation',async()=>{
  for(let level=1;level<=5;level++){
   const f=await intrusionFixture(makeStore),cp=`sessions/${f.sid}/characters/${f.cid}`,tp=`sessions/${f.sid}/fieldTargets/cantina_lock`;
   await f.store.runTransaction(async tx=>{const c=await tx.get(cp),t=await tx.get(tp);tx.set(cp,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='INF-01'?{...k,level}:k)}});tx.set(tp,{...t,intrusion:{...t.intrusion,category:['LOCK','SAFE','TERMINAL'][level%3]}});});
   const a=await f.start();assert.equal(a.durationSeconds,[180,165,150,135,120][level-1]);f.advance(a.durationSeconds*1000);
   await f.store.runTransaction(async tx=>{const c=await tx.get(cp);tx.set(cp,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.filter(k=>k.id!=='INF-01')}});});
   await assert.rejects(f.finish(a.id),{code:'SO_INF01_SKILL'});assert.equal(f.rollCount(),0);await f.cancel(a.id);assert.equal((await f.points()).available,5);
  }
 });
 test(prefix+' : indice au niveau requis, unique par version malgré relance, aucun dé de mini-jeu',async()=>{
  const f=await intrusionFixture(makeStore,{challenge:true,hints:true}),cp=`sessions/${f.sid}/characters/${f.cid}`;
  const level=async level=>f.store.runTransaction(async tx=>{const c=await tx.get(cp);tx.set(cp,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='INF-01'?{...k,level}:k)}});});
  assert.doesNotMatch(JSON.stringify(await f.read()),/INDICE_PRIVE/);await level(3);const a=await f.start();
  const claim={targetId:'cantina_lock',hintId:'hint3',present:true,requestId:'hint-once'};
  await assert.rejects(f.actionCmd('claimSoIntrusionHint',{...claim,hintId:'hint5'}),{code:'SO_INF01_SKILL'});
  const h=await f.actionCmd('claimSoIntrusionHint',claim);assert.equal(h.text,'INDICE_PRIVE_N3');assert.deepEqual(await f.actionCmd('claimSoIntrusionHint',claim),h);
  await assert.rejects(f.actionCmd('claimSoIntrusionHint',{...claim,requestId:'hint-again'}),{code:'SO_INF01_HINT_USED'});
  await f.cancel(a.id);const b=await f.start();await assert.rejects(f.actionCmd('claimSoIntrusionHint',{...claim,requestId:'hint-third'}),{code:'SO_INF01_HINT_USED'});
  assert.equal((await f.read()).hints[0].used,true);assert.doesNotMatch(JSON.stringify(await f.read()),/INDICE_PRIVE/);
  f.advance(90000);await f.finish(b.id,{answer:'nova 2042'});assert.equal(f.rollCount(),0);
  const next=await episodeHarness(f);await next.close({participantUids:[f.player.uid]});await next.resume(await next.begin());assert.equal((await next.read('mySoIntrusion',{targetId:'cantina_lock'},f.player)).hints[0].used,true);assert.equal((await next.get('inf01Actions/'+b.id)).status,'SUCCESS');
 });
 test(prefix+' : régie interrompt après révocation, droits au rejeu et ressources libérées une fois',async()=>{
  const f=await intrusionFixture(makeStore,{resources:true,helper:true}),a=await f.start({consumableLotId:'circuit'}),body={actionId:a.id,reason:'Accès retiré',requestId:'cancel-mj'};
  await assert.rejects(f.actionRead('soIntrusionAdmin'),{code:'FORBIDDEN'});await assert.rejects(f.actionCmd('cancelSoIntrusionMJ',body),{code:'FORBIDDEN'});
  await f.actionCmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.finish(a.id),{code:'FORBIDDEN'});
  const view=await f.actionRead('soIntrusionAdmin',{},f.owner);assert.equal(view.actions[0].id,a.id);assert.doesNotMatch(JSON.stringify(view),/SECRET_MJ|PASSAGE_FICTIF/);
  await f.role(true,'MJ');const r=await f.actionCmd('cancelSoIntrusionMJ',body,f.mj);assert.deepEqual(await f.actionCmd('cancelSoIntrusionMJ',body,f.mj),r);await f.role(false,'MJ');await assert.rejects(f.actionCmd('cancelSoIntrusionMJ',body,f.mj),{code:'FORBIDDEN'});
  const points=await f.store.get(`sessions/${f.sid}/characters/${f.cid}/resources/actionPoints`);assert.equal(points.reserved,0);assert.equal(points.available,5);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/circuit`)).quantity,6);
 });
 test(prefix+' : concurrence résolution/annulation et interruption transactionnelle sans duplication',async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})};
  const f=await intrusionFixture(()=>store,{resources:true}),a=await f.start({consumableLotId:'circuit'});f.advance(165000);f.setDie(6);fail=true;await assert.rejects(f.finish(a.id),/INTERRUPTION/);fail=false;
  assert.equal((await f.store.get(`sessions/${f.sid}/inventory/circuit`)).quantity,6);assert.equal((await f.points()).reserved,1);
  const results=await Promise.allSettled([f.finish(a.id),f.actionCmd('cancelSoIntrusionMJ',{actionId:a.id,reason:'Scène interrompue'},f.owner)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const ended=await raw.get(`sessions/${f.sid}/inf01Actions/${a.id}`);assert.equal((await f.points()).available,ended.success?4:5);assert.equal((await raw.get(`sessions/${f.sid}/inventory/circuit`)).quantity,ended.success?4:6);
 });
 test(prefix+' : serrure de fiction via M6, D6, PA et récit secret seulement après succès',async()=>{
  const f=await intrusionFixture(makeStore);
  const before=await f.read();
  assert.equal(before.target.title,'Serrure de cantina');
  assert.equal(before.level,2);
  assert.doesNotMatch(JSON.stringify(before),/LE_PASSAGE_FICTIF_EST_AUTORISE|SECRET_MJ/);
  const a=await f.start();
  assert.equal(a.durationSeconds,165);assert.equal((await f.points()).reserved,1);
  await assert.rejects(f.finish(a.id),{code:'SO_INF01_TOO_EARLY'});
  f.advance(165000);f.setDie(4);
  const done=await f.finish(a.id);
  assert.equal(done.status,'SUCCESS');assert.equal(done.roll,4);assert.equal(done.total,6);
  assert.equal(done.text,'LE_PASSAGE_FICTIF_EST_AUTORISE');
  assert.equal((await f.points()).available,4);assert.equal((await f.points()).reserved,0);
  assert.equal((await f.read()).previous.at(-1).text,'LE_PASSAGE_FICTIF_EST_AUTORISE');
  assert.equal((await f.store.get('sessions/'+f.sid+'/fieldStates/cantina_lock')).activeActionId,null);
  assert.equal((await f.store.get('sessions/'+f.sid+'/characters/'+f.cid)).activeFieldActionId,null);
  await assert.rejects(f.start(),{code:'SO_INF01_COOLDOWN'});
 });
 test(prefix+' : échec, temps de récupération et nouvelle tentative ordinaire',async()=>{
  const f=await intrusionFixture(makeStore);
  let a=await f.start();f.advance(165000);f.setDie(1);
  let r=await f.finish(a.id);assert.equal(r.status,'FAILED');assert.equal(r.total,3);
  assert.doesNotMatch(JSON.stringify(r),/LE_PASSAGE_FICTIF_EST_AUTORISE/);
  assert.equal((await f.points()).available,4);
  f.advance(600000);
  a=await f.start();assert.equal(a.status,'RUNNING');
 });
 test(prefix+' : annulation restitue les PA et libère la serrure commune',async()=>{
  const f=await intrusionFixture(makeStore);
  const a=await f.start();
  assert.equal((await f.cancel(a.id)).status,'CANCELLED');
  assert.equal((await f.points()).available,5);assert.equal((await f.points()).reserved,0);
  const b=await f.start();assert.notEqual(a.id,b.id);
 });
 test(prefix+' : accès au niveau, captif, QR non préparé et ancienne version refusés',async()=>{
  const f=await intrusionFixture(makeStore,{minLevel:3});
  await assert.rejects(f.start(),{code:'SO_INF01_SKILL'});
  await assert.rejects(f.actionCmd('startSoIntrusion',{targetId:'missing',present:true}),{code:'SO_INF01_TARGET'});
  const cpath='sessions/'+f.sid+'/characters/'+f.cid;
  await f.store.runTransaction(async tx=>{
   const c=await tx.get(cpath);
   tx.set(cpath,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(x=>x.id==='INF-01'?{...x,level:3}:x)}});
  });
  await f.actionCmd('setSoCaptivity',{characterId:f.cid,kind:'CELL',reason:'Détention fictive',safePath:true},f.owner);
  await assert.rejects(f.start(),{code:'SO_INF01_BUSY'});
  await f.actionCmd('endSoCaptivity',{characterId:f.cid},f.owner);
  const a=await f.start();assert.equal(a.durationSeconds,150);
  await f.cancel(a.id);
  const s=await f.store.get('sessions/'+f.sid);
  await f.store.runTransaction(async tx=>{const {inf01Version,...rest}=s.spaceOutlaws;tx.set('sessions/'+f.sid,{...s,spaceOutlaws:rest});});
  await assert.rejects(f.read(),{code:'SO_INF01_CLOSED'});
 });
 test(prefix+' : mini-jeu à code sans D6, réponse jamais projetée avant réussite',async()=>{
  const f=await intrusionFixture(makeStore,{challenge:true});
  const d=await f.read();
  assert.equal(d.target.challenge.type,'CODE');
  assert.equal(d.target.challenge.durationSeconds,90);
  assert.doesNotMatch(JSON.stringify(d),/NOVA 2042|answerCode|answerDigest|LE_PASSAGE_FICTIF_EST_AUTORISE/);
  const saved=await f.store.get('sessions/'+f.sid+'/fieldTargets/cantina_lock');
  assert.match(saved.intrusion.challenge.answerDigest,/^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(saved),/answerCode|NOVA 2042/);
  const started=await f.start();
  assert.equal(started.mode,'CODE');assert.equal(started.durationSeconds,90);
  assert.equal((await f.points()).reserved,1);
  f.setDie(1); // Un D6 aurait échoué au seuil ordinaire, mais n'existe pas en mode CODE.
  f.advance(90000);
  await assert.rejects(f.finish(started.id),{code:'SO_INF01_ANSWER'});
  const result=await f.finish(started.id,{answer:'nova 2042'});
  assert.equal(result.status,'SUCCESS');assert.equal(result.mode,'CODE');
  assert.equal(result.roll,null);assert.equal(result.total,null);assert.equal(result.threshold,null);
  assert.equal(result.text,'LE_PASSAGE_FICTIF_EST_AUTORISE');
  assert.equal((await f.points()).available,4);assert.equal((await f.points()).reserved,0);
  assert.equal((await f.read()).previous.at(-1).mode,'CODE');
 });
 test(prefix+' : mini-jeu échoué, récupération dix minutes et nouveau PA',async()=>{
  const f=await intrusionFixture(makeStore,{challenge:true});
  const a=await f.start();
  f.advance(90000);
  const failed=await f.finish(a.id,{answer:'FAUX 2042'});
  assert.equal(failed.status,'FAILED');assert.equal(failed.roll,null);
  assert.doesNotMatch(JSON.stringify(failed),/NOVA 2042|LE_PASSAGE_FICTIF_EST_AUTORISE/);
  assert.equal((await f.points()).available,4);
  await assert.rejects(f.start(),{code:'SO_INF01_COOLDOWN'});
  f.advance(600000);
  const b=await f.start();assert.notEqual(b.id,a.id);
  assert.equal((await f.points()).reserved,1);
  f.advance(90000);
  assert.equal((await f.finish(b.id,{answer:'NOVA 2042'})).status,'SUCCESS');
  assert.equal((await f.points()).available,3);
 });
 test(prefix+' : annuler un mini-jeu avant résolution rend le PA',async()=>{
  const f=await intrusionFixture(makeStore,{challenge:true});
  const a=await f.start();assert.equal(a.mode,'CODE');
  assert.equal((await f.cancel(a.id)).status,'CANCELLED');
  assert.equal((await f.points()).available,5);
  assert.equal((await f.points()).reserved,0);
  const b=await f.start();assert.equal(b.mode,'CODE');
 });
 test(prefix+' : refus des doubles départs sur une même serrure',async()=>{
  const f=await intrusionFixture(makeStore);
  const result=await Promise.allSettled([f.start(),f.start()]);
  assert.equal(result.filter(x=>x.status==='fulfilled').length,1);
  assert.equal((await f.points()).reserved,1);
 });
}
