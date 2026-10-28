// Disposable diagnostic probes, not V3.5 acceptance tests. No Firebase/network.
// Run: node docs/verification/so35-audit.mjs
import assert from 'node:assert/strict';
import {createWorkflow,hash} from '../../src/core/workflow.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {MemoryStore} from '../../test/support/memory.mjs';

const store=new MemoryStore();let sequence=0;
const actor=name=>({uid:name,email:`${name}@example.invalid`,emailVerified:true,provider:'google.com',authTime:100});
const owner=actor('audit-owner'),alice=actor('audit-alice'),bob=actor('audit-bob');
const workflow=createWorkflow({store,ownerEmail:owner.email,now:()=>100000,uuid:()=>`audit-${++sequence}`});
const read=(action,who,input={})=>workflow.dispatch(action,who,input);
const command=(action,who,input={})=>read(action,who,{requestId:`command-${++sequence}`,...input});
const {id:scenarioId}=await command('createScenario',owner,{title:'V3.5 diagnostic — synthetic'});
const scenario=()=>read('scenario',owner,{scenarioId});
const characters=[];
for(let i=0;i<2;i++)characters.push((await command('saveCharacter',owner,{scenarioId,revision:(await scenario()).revision,
  displayName:'Même identité fictive',publicationState:'PUBLISHED',biography:'PRIVATE_BACKGROUND',gmNotes:'PRIVATE_MJ'})).id);
assert.equal((await scenario()).characters.filter(c=>c.public.displayName==='Même identité fictive').length,2);
await command('saveScenarioEconomy',owner,{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Audit credits',unit:'Cr'}});
const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[0],amount:200};
const preview=await read('prepareStartingCredits',owner,seed);
await command('setStartingCredits',owner,{...seed,confirmation:preview.confirmation});
const {id:versionId}=await command('publishScenario',owner,{scenarioId,revision:(await scenario()).revision});
const {id:sessionId}=await command('createSession',owner,{scenarioId,versionId,title:'Synthetic session',capacity:2,privacy:'Fiction only',
  fields:[{id:'class-wish',label:'Free text legacy field',required:false}]});
const session=()=>read('session',owner,{sessionId});
assert.ok((await session()).characters.every(c=>c.assignedUid===null));
const wallet=await store.get(`sessions/${sessionId}/accounts/${accountId(characters[0])}`);
assert.equal(wallet.balance,200);
assert.equal('protectedBalance' in wallet,false);
const badge=await read('publicBadge',null,{sessionId,characterId:characters[0]});
assert.equal(badge.displayName,'Même identité fictive');
assert.equal(JSON.stringify(badge).includes('PRIVATE'),false);
await command('setRegistrationOpen',owner,{sessionId,revision:(await session()).revision,open:true});
const registrations=await Promise.all([alice,bob].map(who=>command('register',who,{sessionId,name:'Participant fictif',
  answers:{'class-wish':'PNJ_FORCE_SENSITIVE'},classId:'PNJ_FORCE_SENSITIVE',secondarySkillId:'FOR-01'})));
assert.deepEqual(registrations.map(r=>r.status),['ACCEPTED','ACCEPTED']);
assert.ok(registrations.every(r=>r.characterId===null&&r.accessActive===false));
assert.equal((await store.list('invitations')).length,0);
assert.ok((await session()).characters.every(c=>!c.abilityProfile));
await assert.rejects(command('issueInvitation',owner,{sessionId,uid:alice.uid,tokenHash:hash('unused'),hours:1}),{code:'INVALID_ASSIGNMENT'});
await command('assign',owner,{sessionId,uid:alice.uid,characterId:characters[0]});
const token='a'.repeat(43);
await command('issueInvitation',owner,{sessionId,uid:alice.uid,tokenHash:hash(token),hours:1});
await read('redeem',alice,{sessionId,token});
await command('setStage',owner,{sessionId,revision:(await session()).revision,stage:'BRIEFING'});
assert.equal((await read('mySession',alice,{sessionId})).character.biography,'PRIVATE_BACKGROUND');
await command('assign',owner,{sessionId,uid:bob.uid,characterId:characters[0],replace:true});
assert.equal((await read('mySession',alice,{sessionId})).character,null);
assert.equal((await store.get(`sessions/${sessionId}/characters/${characters[0]}`)).assignedUid,bob.uid);
assert.equal((await store.get(`sessions/${sessionId}/accounts/${wallet.id}`)).balance,200);

console.log(JSON.stringify({environment:'MemoryStore; synthetic data; no network',observations:[
  {id:'AUD-INS-01',observed:'Two identical public display names accepted in scenario',gap:'No distinct first/last name collision reservation'},
  {id:'AUD-INS-02',observed:'200 ordinary credits seeded when session is created, before assignment',gap:'Birth-only protected funds not implemented'},
  {id:'AUD-INS-03',observed:'Published public badge readable before assignment; private background and MJ notes excluded',gap:'V3.5 public badge activation gate needed'},
  {id:'AUD-INS-04',observed:'Two authenticated registrations accepted without invitation, limited only by total capacity',gap:'Admission invitation and per-class atomic quota absent'},
  {id:'AUD-INS-05',observed:'Force-related free text stored as a legacy answer; extra selection fields ignored; no ability granted',gap:'No canonical character proposal validator; this is not a Force privilege escalation'},
  {id:'AUD-INS-06',observed:'Private invitation issuance before assignment refused: INVALID_ASSIGNMENT',gap:'Existing private invitation is not an admission invitation'},
  {id:'AUD-INS-07',observed:'Character already privately activated can be reassigned with replace=true; former private access revoked; balance preserved',gap:'Assignment is not virgin reserve eligibility or A09 succession'}
],limits:'Observed legacy contracts, not seven V3.5 test successes. No death/succession, M2 publication, protected money, emulator, smartphone or complete backup test.'},null,2));
