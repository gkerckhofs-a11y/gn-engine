import {intrusionFixture} from './space-intrusion-suite.mjs';
import {forgeryFixture} from './space-forgery-suite.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
export async function tracesFixture(makeStore,{level=2,trackLevel=1,minLevel=1}={}){
 const f=await actionsFixture(makeStore,{helper:true,targetPatch:{tracePolicy:{minLevel,actions:['ANALYZE'],falseLeads:[{id:'decoy',label:'Signal préparé',text:'Un signal brouillé pointe vers le sas Est.',scenarioAuthorized:true}]}}});await f.stage('EN_JEU');
 const cid=(await f.actionRead('mySession')).character.id,otherId=(await f.actionRead('mySession',{},f.other)).character.id,base=`sessions/${f.sid}`;
 const skills=async(id,fil,eff)=>f.store.runTransaction(async tx=>{const path=base+'/characters/'+id,c=await tx.get(path);tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills.filter(x=>!['FIL-01','EFF-01'].includes(x.id)),{id:'FIL-01',kind:'PASSIVE',level:fil},{id:'EFF-01',kind:'PASSIVE',level:eff}]}});});await skills(cid,level,level);await skills(otherId,trackLevel,level);
 const start=async(mode='TRACK',actor=f.other,extra={})=>{const input={traceTargetId:'scene',traceMode:mode,kind:'ANALYZE',...extra},p=await f.actionRead('prepareFieldAction',input,actor);return f.actionCmd('startFieldAction',{...input,confirmation:p.confirmation,present:true},actor);};
 const finish=(a,actor=f.other)=>f.actionCmd('finishFieldAction',{actionId:a.id,present:true},actor);
 const event=async(actor=f.player,extra={})=>{const input={targetId:'scene',kind:'ANALYZE',...extra},q=await f.actionRead('prepareFieldAction',input,actor),a=await f.actionCmd('startFieldAction',{...input,confirmation:q.confirmation,present:true},actor);f.advance(120000);await finish(a,actor);return (await f.store.get(base+'/fictionalTraceHeads/'+(extra.targetId??'scene'))).lastTraceId;};
 return {...f,cid,otherId,base,skills,traceStart:start,traceFinish:finish,event};
}
export function fictionalTracesSuite(makeStore,prefix='Traces fictives'){
 test(prefix+' : seule une interaction marquée produit une trace, jamais un scan',async()=>{
  const f=await tracesFixture(makeStore);await f.actionRead('fieldTarget',{targetId:'scene'});assert.equal((await f.store.list(f.base+'/fictionalTraces')).length,0);const id=await f.event();assert.ok(id);const a=await f.traceStart();f.advance(120000);const r=await f.traceFinish(a);assert.equal(r.result.trace.found,true);assert.equal(r.result.trace.at,undefined);assert.equal((await f.store.list(f.base+'/fictionalTraces')).length,1);assert.doesNotMatch(JSON.stringify(r),/actorUid|SECRET_MJ|VERITE_MJ/);
 });
 test(prefix+' : opposition FIL/EFF sans dé et journal original intact',async()=>{
  const f=await tracesFixture(makeStore),id=await f.event(),before=await f.store.get(f.base+'/fictionalTraces/'+id),audit=await f.store.list(f.base+'/audit');const a=await f.traceStart('ERASE',f.player);f.advance(105000);await f.traceFinish(a,f.player);
  const low=await f.traceStart();f.advance(120000);const hidden=await f.traceFinish(low);assert.equal(hidden.result.trace.found,false);assert.doesNotMatch(JSON.stringify(hidden.result),new RegExp(before.characterName));
  await f.skills(f.otherId,2,2);f.advance(600000);const equal=await f.traceStart();f.advance(105000);const r=await f.traceFinish(equal);assert.equal(r.result.trace.found,true);assert.equal(r.result.trace.reconstructed,true);assert.equal(r.result.trace.at,before.at);assert.deepEqual(await f.store.get(f.base+'/fictionalTraces/'+id),before);assert.equal((await f.store.get(f.base+'/fictionalTraceMasks/'+id)).status,'DISCOVERED');for(const row of audit)assert.deepEqual(await f.store.get(f.base+'/audit/'+row.id),row);assert.equal(f.rollCount(),0);
 });
 test(prefix+' : une trace trop ancienne, mauvais niveau ou non consentie ne consomme pas de PA',async()=>{
  const f=await tracesFixture(makeStore),id=await f.event();await assert.rejects(f.traceStart('ERASE',f.other,{traceId:id}),{code:'FIELD_SKILL_REQUIRED'});f.advance(900001);await assert.rejects(f.traceStart('ERASE',f.player),{code:'SO_TRACE_TOO_OLD'});assert.equal((await f.points()).available,4);
  const g=await tracesFixture(makeStore,{minLevel:2});await g.event();await assert.rejects(g.traceStart(),{code:'FIELD_SKILL_REQUIRED'});
 });
 test(prefix+' : complice consentant, révocation puis nouvel accord vérifiés à la résolution',async()=>{
  const f=await tracesFixture(makeStore,{level:3,trackLevel:3}),id=await f.event();await assert.rejects(f.traceStart('ERASE',f.other,{traceId:id}),{code:'SO_TRACE_CONSENT'});
  const consent=enabled=>f.actionCmd('consentTraceErasure',{traceId:id,recipientId:f.otherId,present:true,enabled});await consent(true);const a=await f.traceStart('ERASE',f.other,{traceId:id});await consent(false);f.advance(90000);await assert.rejects(f.traceFinish(a),{code:'SO_TRACE_CONSENT'});await f.actionCmd('cancelFieldAction',{actionId:a.id,reason:'Accord retiré'},f.other);assert.equal((await f.points(f.other)).available,5);
  await consent(true);const b=await f.traceStart('ERASE',f.other,{traceId:id});f.advance(90000);await f.traceFinish(b);assert.equal((await f.actionRead('myTraceConsents')).consents.length,0);
 });
 test(prefix+' : fausse piste préparée unique et fin de session sans suppression de preuve',async()=>{
  const f=await tracesFixture(makeStore,{level:5}),id=await f.event();const a=await f.traceStart('ERASE',f.player,{falseLeadId:'decoy'});f.advance(60000);await f.traceFinish(a,f.player);const low=await f.traceStart();f.advance(120000);const r=await f.traceFinish(low);assert.equal(r.result.trace.information,'Un signal brouillé pointe vers le sas Est.');f.advance(600000);await assert.rejects(f.traceStart('ERASE',f.player,{falseLeadId:'decoy'}),{code:'SO_TRACE_FALSE_LEAD_ACTIVE'});
  const e=await episodeHarness(f);await e.close();await e.resume(await e.begin());await e.stage('EN_JEU');const input={traceTargetId:'scene',traceMode:'TRACK',kind:'ANALYZE'},q=await e.read('prepareFieldAction',input,f.other),b=await e.cmd('startFieldAction',{...input,confirmation:q.confirmation,present:true},f.other);f.advance(120000);const found=await e.cmd('finishFieldAction',{actionId:b.id,present:true},f.other);assert.equal(found.result.trace.found,true);assert.deepEqual(await e.get('fictionalTraces/'+id),await f.store.get(f.base+'/fictionalTraces/'+id));
 });
 test(prefix+' : intrusion et falsification marquées produisent leurs événements métier',async()=>{
  for(const [fixture,kind] of [[intrusionFixture,'INTRUSION'],[forgeryFixture,'FORGERY']]){const f=await fixture(makeStore,{trace:true}),a=await f.start();f.advance(300000);await f.finish(a.id);const rows=await f.store.list(`sessions/${f.sid}/fictionalTraces`);assert.equal(rows.length,1);assert.equal(rows[0].kind,kind);assert.equal(rows[0].actionId,a.id);}
 });
 test(prefix+' : pistage immobilise le personnage et annulation libère le PA sans masque',async()=>{
  const f=await tracesFixture(makeStore);await f.event();const a=await f.traceStart();await assert.rejects(f.actionRead('prepareFieldAction',{targetId:'scene',kind:'ANALYZE'},f.other),{code:'FIELD_ACTOR_BUSY'});await f.actionCmd('cancelFieldAction',{actionId:a.id,reason:'Scène interrompue'},f.other);assert.equal((await f.points(f.other)).available,5);assert.equal((await f.store.list(f.base+'/fictionalTraceMasks')).length,0);
 });

}
