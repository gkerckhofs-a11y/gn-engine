import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {createCharacterCodeService,codeCandidate} from '../src/core/character-codes.mjs';
import {resolveCharacterInputs} from '../web/character-codes.mjs';
import {hash} from '../src/core/workflow.mjs';
function fixture(){
 const store=new MemoryStore(),owner={uid:'owner'},player={uid:'player',authTime:10};
 store.data.set('sessions/s',{id:'s',ownerUid:'owner',stage:'EN_JEU'});
 store.data.set('sessions/s/characters/long-id',{id:'long-id',assignedUid:'player',publicationState:'PUBLISHED',public:{publicationState:'PUBLISHED',displayName:'Personnage'},playerSecrets:'secret'});
 store.data.set(`sessions/s/registrations/${hash('player')}`,{characterId:'long-id',status:'ACCEPTED',accessActive:true,minAuthTime:1});
 const service=createCharacterCodeService({store,signed:a=>{if(!a?.uid)throw Object.assign(Error(),{code:'LOGIN_REQUIRED'});},isAdmin:a=>a.uid==='owner',checkSession:async(tx,a)=>{if(a.uid!=='owner')throw Object.assign(Error(),{code:'FORBIDDEN'});}});
 const run=(action,input={},actor=owner)=>service(action,actor,{sessionId:'s',characterId:'long-id',...input});
 return {store,owner,player,run};
}
test('Code : trois lettres et trois chiffres, stable, collision évitée et identifiants conservés',async()=>{
 const f=fixture(),candidate=codeCandidate('s','long-id');f.store.data.set(`characterCodes/s/codes/${candidate}`,{characterId:'another'});
 const before=await f.store.get('sessions/s/characters/long-id');
 const [a,b]=await Promise.all([f.run('ensureCharacterCode'),f.run('ensureCharacterCode')]);
 assert.match(a.code,/^[A-Z]{3}\d{3}$/);assert.notEqual(a.code,candidate);assert.deepEqual(a,b);
 assert.deepEqual(await f.store.get('sessions/s/characters/long-id'),before);
 assert.deepEqual(await f.run('resolveCharacterCode',{code:a.code.toLowerCase()},f.player),{characterId:'long-id'});
});
test('Code : accès révoqué, autre personnage, autre session et anonyme refusés',async()=>{
 const f=fixture();await f.run('ensureCharacterCode',{},f.player);
 await assert.rejects(f.run('ensureCharacterCode',{characterId:'someone'},f.player),{code:'FORBIDDEN'});
 await assert.rejects(f.run('ensureCharacterCode',{},null),{code:'LOGIN_REQUIRED'});
 await assert.rejects(f.run('resolveCharacterCode',{sessionId:'other',code:'ABC123'},f.player),{code:'FORBIDDEN'});
 const path=`sessions/s/registrations/${hash('player')}`;f.store.data.set(path,{...await f.store.get(path),accessActive:false});
 await assert.rejects(f.run('ensureCharacterCode',{},f.player),{code:'FORBIDDEN'});
});
test('Code : les actions sur personnages résolvent les alias, pas les lieux ni les anciens ID',async()=>{
 const calls=[],api=async(a,i)=>{calls.push([a,i]);return {characterId:'long-id'};};
 assert.deepEqual(await resolveCharacterInputs(api,'prepareLotTransfer',{sessionId:'s',recipientId:'abc123',quantity:2}),{sessionId:'s',recipientId:'long-id',quantity:2});
 assert.equal((await resolveCharacterInputs(api,'personTarget',{sessionId:'s',targetId:'long-id'})).targetId,'long-id');
 assert.equal((await resolveCharacterInputs(api,'fieldTarget',{sessionId:'s',targetId:'ABC123'})).targetId,'ABC123');assert.equal(calls.length,1);
});
