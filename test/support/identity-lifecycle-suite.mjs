import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createWorkflow} from '../../src/core/workflow.mjs';
import {codeCandidate} from '../../src/core/character-codes.mjs';
export function identityLifecycleSuite(makeStore,prefix='Identités et corbeille'){
 test(`${prefix} : alias concurrent stable, collision évitée et droits serveur`,async()=>{
  const store=await makeStore(),sid=randomUUID(),cid=randomUUID(),owner={uid:randomUUID(),email:`${randomUUID()}@example.invalid`,provider:'google.com',emailVerified:true};
  const c={id:cid,public:{displayName:'Personnage fictif',publicationState:'PUBLISHED'},publicationState:'PUBLISHED'};
  const collision=codeCandidate(sid,cid);
  await store.runTransaction(async tx=>{tx.set(`sessions/${sid}`,{id:sid,ownerUid:owner.uid,stage:'EN_JEU',revision:1});tx.set(`sessions/${sid}/characters/${cid}`,c);tx.set(`characterCodes/${sid}/codes/${collision}`,{characterId:'existing'});});
  const w=createWorkflow({store,ownerEmail:owner.email}),input={sessionId:sid,characterId:cid};
  const rows=await Promise.all(Array.from({length:3},()=>w.dispatch('ensureCharacterCode',owner,input)));
  assert.match(rows[0].code,/^[A-Z]{3}\d{3}$/);assert.notEqual(rows[0].code,collision);assert.ok(rows.every(r=>r.code===rows[0].code));assert.deepEqual(await store.get(`sessions/${sid}/characters/${cid}`),c);
  assert.deepEqual(await w.dispatch('resolveCharacterCode',owner,{sessionId:sid,code:rows[0].code.toLowerCase()}),{characterId:cid});
  await assert.rejects(w.dispatch('ensureCharacterCode',{...owner,uid:'intruder'},input),{code:'FORBIDDEN'});
 });
 test(`${prefix} : suppression restaurable, refus public et refus de modification`,async()=>{
  const store=await makeStore(),sid=randomUUID(),owner={uid:randomUUID(),email:`${randomUUID()}@example.invalid`,provider:'google.com',emailVerified:true};
  await store.runTransaction(async tx=>tx.set(`sessions/${sid}`,{id:sid,ownerUid:owner.uid,title:'Essai terminé',stage:'FINISHED',revision:1}));
  const w=createWorkflow({store,ownerEmail:owner.email});await w.dispatch('trashRecord',owner,{kind:'session',id:sid,revision:1});
  await assert.rejects(w.dispatch('publicSession',null,{sessionId:sid}),{code:'NOT_FOUND'});
  await assert.rejects(w.dispatch('setStage',owner,{sessionId:sid,requestId:randomUUID(),revision:1,stage:'ARCHIVED'}),{code:'FORBIDDEN'});
  assert.equal((await store.get(`sessions/${sid}`)).stage,'FINISHED');await w.dispatch('restoreRecord',owner,{kind:'session',id:sid});assert.equal((await w.dispatch('publicSession',null,{sessionId:sid})).stage,'FINISHED');
 });
}
