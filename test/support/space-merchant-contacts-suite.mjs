import test from 'node:test';
import assert from 'node:assert/strict';
import {actionsFixture,analysisTarget} from './space-outlaws-actions-suite.mjs';
import {analysisProfile} from '../../src/shared/space-outlaws-analysis.mjs';
import {terminalItems} from '../../web/player-terminal.mjs';
export function merchantContactsSuite(makeStore){
async function fixture(level=2,minLevel=1){
 const rewards=[{id:'reply',kind:'KNOWLEDGE',knowledgeId:'ordinary',quantity:1,stock:1,perCharacter:1,minLevel,bonus:false}];
 const f=await actionsFixture(makeStore,{classId:'COU',skillId:'COU-03',targetPatch:{profiles:{ANALYZE:analysisProfile('COU-03',{minLevel})},rewards}}),cid=(await f.actionRead('mySession')).character.id,base=`sessions/${f.sid}`;
 await f.store.runTransaction(async tx=>{const path=`${base}/characters/${cid}`,c=await tx.get(path),t=await tx.get(`${base}/fieldTargets/scene`),s=await tx.get(`${base}/fieldStates/scene`);tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(s=>s.id==='COU-03'?{...s,level}:s)}});for(let i=0;i<5;i++){tx.set(`${base}/fieldTargets/contact${i}`,{...t,id:`contact${i}`});tx.set(`${base}/fieldStates/contact${i}`,{...s,id:`contact${i}`});}});
 await f.stage('EN_JEU');return f;
}
test('COU-03 : quotas N1 à N5, réponse préparée après cinq minutes sans dé, sans stock ni argent créé',async()=>{
 for(let level=1;level<=5;level++){
  const f=await fixture(level),quota=level>=5?4:level>=3?3:2;assert.ok(terminalItems(await f.actionRead('mySession')).some(i=>i.id==='merchant-contacts'));const stock=await f.store.list(`sessions/${f.sid}/inventory`),accounts=await f.store.list(`sessions/${f.sid}/accounts`);
  for(let i=0;i<quota;i++){const a=await f.start({targetId:`contact${i}`});assert.equal(a.durationSeconds,300);f.advance(299999);await assert.rejects(f.finish(a),{code:'FIELD_TOO_EARLY'});f.advance(1);const r=await f.finish(a);assert.equal(r.result.roll,null);assert.deepEqual(r.result.information.map(k=>k.id),['ordinary']);f.advance(600000);}
  await assert.rejects(f.start({targetId:`contact${quota}`}),{code:'CONTACT_QUOTA_EXHAUSTED'});assert.equal((await f.points()).available,5-quota);assert.deepEqual(await f.store.list(`sessions/${f.sid}/inventory`),stock);assert.deepEqual(await f.store.list(`sessions/${f.sid}/accounts`),accounts);assert.equal((await f.actionRead('fieldTarget',{targetId:'scene'})).profiles[0].remainingUses,0);
 }
});
test('COU-03 : réseau supérieur refusé, réponse absente indisponible, annulation ne prend pas un usage',async()=>{
 const f=await fixture(1,3);await assert.rejects(f.start(),{code:'FIELD_SKILL_REQUIRED'});const g=await fixture();const a=await g.start();await g.actionCmd('cancelFieldAction',{actionId:a.id,reason:'Sans réponse'});assert.equal((await g.actionRead('fieldTarget',{targetId:'scene'})).profiles[0].remainingUses,2);await assert.rejects(g.start({targetId:'absent'}),{code:'FIELD_UNAVAILABLE'});assert.equal((await g.points()).available,5);
});
test('COU-03 : M6 refuse un contact sans réponse préparée et un supplément au D6',async()=>{
 const f=await actionsFixture(makeStore,{release:false}),d=await f.view();
 for(const rewards of [[],[{id:'bad',kind:'KNOWLEDGE',knowledgeId:'ordinary',quantity:1,stock:1,perCharacter:1,minLevel:1,bonus:true}]])await assert.rejects(f.cc('saveCentralFieldTarget',{fieldTargetId:'contact',fieldTargetRevision:0,draftRevision:d.draft.revision,fieldTarget:analysisTarget('COU-03',{rewards}),reason:'Contact'}),{code:'INVALID_FIELD_TARGET'});
 assert.equal(analysisProfile('COU-03',{minLevel:6}),null);
});

}
