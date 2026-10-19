import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {hash} from '../../src/core/workflow.mjs';
import express from 'express';
if(!process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Auth emulator required');
process.env.OWNER_EMAIL='gkerckhofs@gmail.com';
const {api}=await import('../../src/server/index.mjs');
// The actual exported HTTP handler is mounted in Express; Firebase Auth and
// Firestore use their emulators. No Functions runtime socket needed locally.
const app=express();app.use(express.json());app.post('/api',api);
const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
after(()=>new Promise(resolve=>server.close(resolve)));
const endpoint=`http://127.0.0.1:${server.address().port}/api`;
const request=async(action,input={},token)=>{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({action,input})});
  return {status:response.status,...await response.json()};
};
async function googleTestAccount(email){
  // Only Auth Emulator accepts these unsigned synthetic Google assertions.
  const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const jwt=`${enc({alg:'none',typ:'JWT'})}.${enc({sub:randomUUID(),email,email_verified:true,name:'Test isolé'})}.`;
  const response=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake-key`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestUri:'http://localhost',postBody:`id_token=${jwt}&providerId=google.com`,returnSecureToken:true})});
  const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data.idToken;
}
test('HTTP + Auth : le jeton vérifié détermine le rôle, jamais le JSON ou un en-tête Sites',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),player=await googleTestAccount(`${randomUUID()}@example.invalid`);
  assert.equal((await request('identity',{},owner)).result.admin,true);
  assert.equal((await request('identity',{email:'gkerckhofs@gmail.com',admin:true},player)).result.admin,false);
  assert.equal((await request('dashboard',{},player)).status,403);
  assert.equal((await request('dashboard')).status,401);
  assert.equal((await request('dashboard',{},'forged')).status,401);
  const spoof=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'owner'},body:JSON.stringify({action:'dashboard'})});
  assert.equal(spoof.status,401);
  const created=await request('createScenario',{requestId:randomUUID(),title:'API intégrée'},owner);assert.equal(created.status,200);assert.ok(created.result.id);
});
test('HTTP + Auth : délégation enregistrée, projection accueil et révocation immédiate',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`staff-${randomUUID()}@example.invalid`,staff=await googleTestAccount(email);
  const command=(action,input={},token=owner)=>request(action,{requestId:randomUUID(),...input},token);
  const scenario=await command('createScenario',{title:'Test équipe HTTP'}),scenarioId=scenario.result.id;
  const character=await command('saveCharacter',{scenarioId,revision:1,displayName:'Contact',publicationState:'PUBLISHED',playerSecrets:'SECRET_HTTP',gmNotes:'MJ_HTTP'});
  const group=await command('saveGroup',{scenarioId,revision:2,name:'GROUPE_SECRET_HTTP',visibility:'SECRET',publicationState:'PUBLISHED',briefing:'BRIEFING_HTTP',gmNotes:'VERITE_HTTP',members:[]});
  assert.equal(group.status,200);
  const knowledge=await command('saveKnowledge',{scenarioId,revision:3,title:'CONNAISSANCE_HTTP',body:'TEXTE_PRIVE_HTTP',gmTruth:'VERITE_CONNAISSANCE_HTTP',kind:'CLUE',publicationState:'PUBLISHED',shareMode:'COPY',qrAudience:'SELECTED',initialCharacterIds:[character.result.id]});
  assert.equal(knowledge.status,200);
  const version=await command('publishScenario',{scenarioId,revision:4});
  const created=await command('createSession',{scenarioId,versionId:version.result.id,title:'Session HTTP',capacity:2,privacy:'Données fictives'}),sessionId=created.result.id;
  assert.equal((await request('session',{sessionId,role:'OWNER'},staff)).status,403);
  assert.equal((await command('setStaff',{sessionId,revision:1,email,role:'RECEPTION',active:true,reason:'Accueil de test'})).status,200);
  const view=await request('session',{sessionId},staff);assert.equal(view.status,200);assert.equal(view.result.role,'RECEPTION');
  assert.equal('groups' in view.result,false);
  assert.equal('knowledge' in view.result,false);assert.equal(JSON.stringify(view.result).includes('CONNAISSANCE_HTTP'),false);
  for(const action of ['knowledgeHistory','knowledgeRecipients','previewKnowledge','previewKnowledgeDetail'])assert.equal((await request(action,{sessionId,knowledgeId:knowledge.result.id,characterId:character.result.id},staff)).status,403);
  for(const action of ['myKnowledge','knowledgeDetail','discoverKnowledge','shareKnowledge'])assert.equal((await request(action,{sessionId,knowledgeId:knowledge.result.id,requestId:randomUUID()})).status,401);
  assert.equal((await request('knowledgeHistory',{sessionId,knowledgeId:knowledge.result.id},owner)).status,200);
  assert.equal(JSON.stringify(view.result).includes('GROUPE_SECRET_HTTP'),false);
  assert.equal((await request('groupHistory',{sessionId,groupId:group.result.id},staff)).status,403);
  assert.equal((await request('myGroup',{sessionId,groupId:group.result.id})).status,401);
  assert.equal((await request('previewGroup',{sessionId,groupId:group.result.id,characterId:character.result.id},staff)).status,403);
  assert.equal(JSON.stringify(view.result).includes('SECRET_HTTP'),false);assert.equal(JSON.stringify(view.result).includes('MJ_HTTP'),false);
  assert.equal((await request('preview',{sessionId,characterId:character.result.id},staff)).status,403);
  assert.equal((await request('dashboard',{},staff)).result.sessions.length,1);
  assert.equal((await command('setStaff',{sessionId,revision:2,email,role:'RECEPTION',active:false,reason:'Fin de test'})).status,200);
  assert.equal((await request('session',{sessionId},staff)).status,403);
});

test('HTTP + Auth : carnet privé absent des accès MJ et copie uniquement après confirmation explicite',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),alice=await googleTestAccount(`notes-a-${randomUUID()}@example.invalid`),bob=await googleTestAccount(`notes-b-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Carnet HTTP'}),characters=[];
  for(const [i,name] of ['Auteur','Contact'].entries())characters.push((await command('saveCharacter',{scenarioId,revision:i+1,displayName:name,publicationState:'PUBLISHED'})).id);
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:3});
  const {id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Notes HTTP',capacity:2,privacy:'Fictif'});
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});
  for(const [i,token] of [alice,bob].entries()){
    const uid=(await request('identity',{},token)).result.uid;await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});
    const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);
  }
  const stage=async value=>command('setStage',{sessionId,revision:(await request('session',{sessionId},owner)).result.revision,stage:value});
  await stage('BRIEFING');const note=await command('saveNote',{sessionId,revision:0,title:'PRIVE_HTTP_CARNET',body:'TEXTE_HTTP_CARNET'},alice);
  const detail=await request('noteDetail',{sessionId,noteId:note.id},alice);assert.equal(detail.status,200);assert.equal(detail.result.note.body,'TEXTE_HTTP_CARNET');
  for(const token of [owner,bob])assert.equal((await request('noteDetail',{sessionId,noteId:note.id,uid:(await request('identity',{},alice)).result.uid,admin:true},token)).status,403);
  assert.equal(JSON.stringify(await request('session',{sessionId},owner)).includes('PRIVE_HTTP_CARNET'),false);
  for(const action of ['myNotes','noteDetail','saveNote','prepareNoteShare','shareNote'])assert.equal((await request(action,{sessionId,noteId:note.id,requestId:randomUUID()})).status,401);
  await stage('EN_JEU');const input={sessionId,noteId:note.id,revision:1,authorCharacterId:characters[0],authorName:'Auteur',recipientId:characters[1],shareMode:'SHOW'};
  const preview=await request('prepareNoteShare',input,alice);assert.equal(preview.status,200);
  assert.deepEqual((await request('myKnowledge',{sessionId},bob)).result.items,[]);
  const shared=await command('shareNote',{...input,recipientVersion:preview.result.recipientVersion},alice);
  assert.equal((await request('knowledgeDetail',{sessionId,knowledgeId:shared.id},bob)).result.knowledge.body,'TEXTE_HTTP_CARNET');
  assert.equal((await request('noteDetail',{sessionId,noteId:note.id},owner)).status,403);
});

test('HTTP + Auth : profil confirmé par MJ, compétence publiée et découverte conditionnelle sans usurpation',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),player=await googleTestAccount(`skills-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Compétences HTTP'});
  const {id:characterId}=await command('saveCharacter',{scenarioId,revision:1,displayName:'Lecteur',publicationState:'PUBLISHED'});
  const {id:skillId}=await command('saveSkill',{scenarioId,revision:2,name:'Écriture ancienne',kind:'PASSIVE',publicationState:'PUBLISHED',gmNotes:'SECRET_EXPERTISE_HTTP'});
  const {id:classId}=await command('saveClass',{scenarioId,revision:3,name:'Lettré',skills:[{skillId,level:2}],publicationState:'PUBLISHED'});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:4});
  const {id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Expertise HTTP',capacity:1,privacy:'Synthétique'});
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});await command('register',{sessionId,name:'Test'},player);
  const uid=(await request('identity',{},player)).result.uid;await command('assign',{sessionId,characterId,uid});
  const token=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(token),hours:1});assert.equal((await request('redeem',{sessionId,token},player)).status,200);
  const current=async()=>(await request('session',{sessionId},owner)).result;
  await command('setStage',{sessionId,revision:(await current()).revision,stage:'BRIEFING'});
  const {id:knowledgeId}=await command('saveSessionKnowledge',{sessionId,revision:(await current()).revision,title:'SECRET_CIBLE_HTTP',body:'Texte ancien',kind:'CLUE',publicationState:'PUBLISHED',shareMode:'SHOW',qrEnabled:true,qrAudience:'ALL_PLAYERS',qrSkillId:skillId,qrSkillLevel:2,reason:'Épreuve'});
  await command('setStage',{sessionId,revision:(await current()).revision,stage:'EN_JEU'});
  const payload={sessionId,revision:(await current()).revision,characterId,classId,overrides:[],published:true,reason:'Attribution'};
  for(const action of ['prepareAbilityProfile','setAbilityProfile','saveSessionSkill','abilityHistory']){
    assert.equal((await request(action,{...payload,requestId:randomUUID(),kind:'characters',id:characterId})).status,401);
    assert.equal((await request(action,{...payload,requestId:randomUUID(),kind:'characters',id:characterId,admin:true},player)).status,403);
  }
  const prepared=await request('prepareAbilityProfile',payload,owner);assert.equal(prepared.status,200);
  assert.equal((await request('discoverKnowledge',{sessionId,knowledgeId,requestId:randomUUID(),level:99,characterId},player)).status,403);
  await command('setAbilityProfile',{...payload,confirmation:prepared.result.confirmation});
  const own=await request('mySession',{sessionId},player);assert.equal(own.result.character.abilities.skills[0].level,2);assert.equal(JSON.stringify(own).includes('SECRET_EXPERTISE_HTTP'),false);
  await command('discoverKnowledge',{sessionId,knowledgeId},player);
  assert.equal((await request('knowledgeDetail',{sessionId,knowledgeId},player)).result.knowledge.body,'Texte ancien');
});
