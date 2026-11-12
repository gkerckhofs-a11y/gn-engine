import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mediaFixture,sampleImage} from './media-suite.mjs';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
import {createWorkflow} from '../../src/core/workflow.mjs';
import {processImage} from '../../src/adapters/media-images.mjs';
import {MemoryImages} from './media-suite.mjs';
export function playerIdentitySuite(makeStore){
const fixture=()=>mediaFixture(makeStore);
test('player portrait: own public identity, crop, revision, retry and removal',async()=>{
 const f=await fixture(),sid=f.sessionId;
 const own=await f.read('mySession',f.alice,{sessionId:sid});assert.equal(own.portraitEditable,true);
 const upload={sessionId:sid,data:await sampleImage(),requestId:randomUUID()};
 const a=await f.read('playerPortraitUpload',f.alice,upload);assert.equal(a.status,'READY');
 assert.deepEqual(await f.read('playerPortraitUpload',f.alice,upload),a);
 const asset=await f.store.get(`media/${a.id}`);assert.equal(asset.width/asset.height,.75);
 const input={sessionId:sid,mediaId:a.id,revision:own.character.contentRevision,requestId:randomUUID()};
 await f.read('setPlayerPortrait',f.alice,input);await f.read('setPlayerPortrait',f.alice,input);
 const badge=await f.read('publicBadge',null,{sessionId:sid,characterId:own.character.id});assert.equal(badge.mediaImages.portrait.id,a.id);
 await assert.rejects(f.cmd('setPlayerPortrait',f.alice,{...input,requestId:randomUUID()}),{code:'STALE_REVISION'});
 await f.cmd('setPlayerPortrait',f.alice,{sessionId:sid,revision:input.revision+1,mediaId:null});
 const after=await f.read('mySession',f.alice,{sessionId:sid});assert.equal(after.character.mediaImages?.portrait,undefined);
});
test('player portrait: cannot use another uploader asset or bypass revoked access',async()=>{
 const f=await fixture(),sid=f.sessionId,a=await f.upload();
 const own=await f.read('mySession',f.alice,{sessionId:sid});
 await assert.rejects(f.cmd('setPlayerPortrait',f.alice,{sessionId:sid,revision:own.character.contentRevision,mediaId:a.id}),{code:'FORBIDDEN'});
 await assert.rejects(f.cmd('playerPortraitUpload',null,{sessionId:sid,data:await sampleImage()}),{code:'LOGIN_REQUIRED'});
 const input={sessionId:sid,data:await sampleImage(),requestId:randomUUID()};await f.read('playerPortraitUpload',f.alice,input);
 await f.cmd('revokeAccess',f.owner,{sessionId:sid,uid:f.alice.uid});
 await assert.rejects(f.read('playerPortraitUpload',f.alice,input),{code:'FORBIDDEN'});
});
test('directory: default deny, MJ class selection, public whitelist, immediate revocation',async()=>{
 const f=await fixture(),sid=f.sessionId;
 const path=`sessions/${sid}/characters/${f.characters[0]}`;
 await f.store.runTransaction(async tx=>{const c=await tx.get(path);tx.set(path,{...c,abilityProfile:{published:true,class:{id:'MED',name:'Médecin'},skills:[]},secrets:'NEVER_EXPOSE'});});
 assert.equal((await f.read('mySession',f.alice,{sessionId:sid})).directoryAllowed,false);
 await assert.rejects(f.read('playerDirectory',f.alice,{sessionId:sid}),{code:'DIRECTORY_FORBIDDEN'});
 await assert.rejects(f.cmd('savePlayerDirectorySettings',f.alice,{sessionId:sid,revision:0,classIds:['MED']}),{code:'FORBIDDEN'});
 const input={sessionId:sid,revision:0,classIds:['MED'],requestId:randomUUID()};await f.read('savePlayerDirectorySettings',f.owner,input);await f.read('savePlayerDirectorySettings',f.owner,input);
 const d=await f.read('playerDirectory',f.alice,{sessionId:sid});assert.ok(d.characters.length>0);assert.equal(JSON.stringify(d).includes('NEVER_EXPOSE'),false);assert.equal(JSON.stringify(d).includes(f.alice.email),false);
 assert.equal((await f.read('mySession',f.alice,{sessionId:sid})).directoryAllowed,true);
 await assert.rejects(f.cmd('savePlayerDirectorySettings',f.owner,{sessionId:sid,revision:0,classIds:[]}),{code:'STALE_REVISION'});
 await f.cmd('savePlayerDirectorySettings',f.owner,{sessionId:sid,revision:1,classIds:[]});
 await assert.rejects(f.read('playerDirectory',f.alice,{sessionId:sid}),{code:'DIRECTORY_FORBIDDEN'});
});

test('SO portrait: public upload in running canonical session preserves skills, PV and private content',async()=>{
 const f=await actionsFixture(makeStore,{classId:'MED'});await f.stage('EN_JEU');
 const images=new MemoryImages(),w=createWorkflow({store:f.store,ownerEmail:f.owner.email,now:()=>1000000,images,processImage});
 const own=await w.dispatch('mySession',f.player,{sessionId:f.sid});
 const before=await f.store.get(`sessions/${f.sid}/characters/${own.character.id}`);
 const uploaded=await w.dispatch('playerPortraitUpload',f.player,{sessionId:f.sid,data:await sampleImage(),requestId:randomUUID()});
 await w.dispatch('setPlayerPortrait',f.player,{sessionId:f.sid,revision:own.character.contentRevision,mediaId:uploaded.id,requestId:randomUUID()});
 const after=await f.store.get(`sessions/${f.sid}/characters/${own.character.id}`);
 assert.deepEqual(after.abilityProfile,before.abilityProfile);assert.equal(after.hp,before.hp);assert.equal(after.secrets,before.secrets);assert.equal(after.mediaImages.portrait.id,uploaded.id);
 await w.dispatch('savePlayerDirectorySettings',f.owner,{sessionId:f.sid,revision:0,classIds:['MED'],requestId:randomUUID()});
 assert.equal((await w.dispatch('playerDirectory',f.player,{sessionId:f.sid})).characters.length,1);
});
test('directory: MJ and reception permissions and invalid classes',async()=>{
 const f=await fixture(),sessionId=f.sessionId;
 await f.cmd('setStaff',f.owner,{sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:true,reason:'Recette'});
 assert.equal((await f.read('playerDirectorySettings',f.staff,{sessionId})).revision,0);
 await f.cmd('savePlayerDirectorySettings',f.staff,{sessionId,revision:0,classIds:['COM']});
 await assert.rejects(f.cmd('savePlayerDirectorySettings',f.staff,{sessionId,revision:1,classIds:['FOR']}),{code:'INVALID_DIRECTORY_CLASSES'});
 await f.cmd('setStaff',f.owner,{sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Recette'});
 await assert.rejects(f.read('playerDirectorySettings',f.staff,{sessionId}),{code:'FORBIDDEN'});
});
}
