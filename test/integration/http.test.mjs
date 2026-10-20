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

test('HTTP + Auth : PV privés, dégât personnel et soin confirmé avec usage unique',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),healer=await googleTestAccount(`heal-${randomUUID()}@example.invalid`),patient=await googleTestAccount(`patient-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'PV HTTP'}),characters=[];
  const scenario=async()=>(await request('scenario',{scenarioId},owner)).result;
  for(const name of ['Soignant','Patient'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName:name,publicationState:'PUBLISHED'})).id);
  const {id:skillId}=await command('saveSkill',{scenarioId,revision:(await scenario()).revision,name:'Soin HTTP',kind:'ACTIVE_TARGET',publicationState:'PUBLISHED',healing:{effect:'HEAL_HP',amount:3,uses:1,cooldownSeconds:0},gmNotes:'SECRET_HTTP_SOIN'});
  const profile={scenarioId,revision:(await scenario()).revision,characterId:characters[0],classId:null,overrides:[{skillId,level:1}],published:true};
  const prepared=await request('prepareAbilityProfile',profile,owner);assert.equal(prepared.status,200);await command('setAbilityProfile',{...profile,confirmation:prepared.result.confirmation});
  await command('saveScenarioHealth',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,defaultMaxHp:10,returnMode:'MJ',allowed:{}}});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Soins HTTP',capacity:2,privacy:'Fictif'});
  const session=async()=>(await request('session',{sessionId},owner)).result;
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});
  for(const [i,token] of [healer,patient].entries()){
    const uid=(await request('identity',{},token)).result.uid;await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});
    const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);
  }
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  for(const action of ['myHealth','prepareDamage','applyDamage','prepareTreatment','applyTreatment','correctHealth','healthHistory'])assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  const damage={sessionId,amount:5,characterId:characters[0]},dp=await request('prepareDamage',damage,patient);assert.equal(dp.result.characterName,'Patient');await command('applyDamage',{...damage,confirmation:dp.result.confirmation},patient);
  assert.equal((await request('myHealth',{sessionId},healer)).result.health.hp,10);
  assert.equal((await request('myHealth',{sessionId,characterId:characters[0]},patient)).result.health.hp,5);
  assert.equal((await request('correctHealth',{sessionId,requestId:randomUUID(),admin:true},patient)).status,403);
  const input={sessionId,skillId,targetId:characters[1]},p=await request('prepareTreatment',input,healer);assert.equal(p.status,200);
  assert.equal((await request('prepareTreatment',{sessionId,skillId,targetId:characters[0]},patient)).status,403);
  const confirmed={...input,requestId:randomUUID(),confirmation:p.result.confirmation},a=await request('applyTreatment',confirmed,healer);assert.equal(a.status,200);assert.deepEqual(await request('applyTreatment',confirmed,healer),a);
  const own=await request('myHealth',{sessionId},healer);assert.equal(own.result.skills[0].remaining,0);assert.equal(JSON.stringify(own).includes('SECRET_HTTP_SOIN'),false);
  assert.equal((await request('myHealth',{sessionId},patient)).result.health.hp,8);
  const denied=await request('prepareTreatment',input,healer);assert.equal(denied.error,'NO_USES_LEFT');
});
async function googleTestAccount(email){
  // Only Auth Emulator accepts these unsigned synthetic Google assertions.
  const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const jwt=`${enc({alg:'none',typ:'JWT'})}.${enc({sub:randomUUID(),email,email_verified:true,name:'Test isolé'})}.`;
  const response=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake-key`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestUri:'http://localhost',postBody:`id_token=${jwt}&providerId=google.com`,returnSecureToken:true})});
  const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data.idToken;
}
test('HTTP + Auth : sac privé et consommable retiré une seule fois avec le soin confirmé',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),player=await googleTestAccount(`stock-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Inventaire HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result;
  const {id:characterId}=await command('saveCharacter',{scenarioId,revision:1,displayName:'Soignant HTTP',publicationState:'PUBLISHED'});
  const {id:itemId}=await command('saveItem',{scenarioId,revision:(await scenario()).revision,name:'Injecteur HTTP',kind:'STACKABLE',consumable:true,publicationState:'PUBLISHED',gmNotes:'SECRET_STOCK_HTTP'});
  const seed={scenarioId,revision:(await scenario()).revision,characterId,items:[{itemId,quantity:1}]},sp=await request('prepareStartingInventory',seed,owner);assert.equal(sp.status,200);await command('setStartingInventory',{...seed,confirmation:sp.result.confirmation});
  const {id:skillId}=await command('saveSkill',{scenarioId,revision:(await scenario()).revision,name:'Auto-soin HTTP',kind:'ACTIVE_SELF',publicationState:'PUBLISHED',healing:{effect:'HEAL_HP',amount:3,uses:1,cooldownSeconds:0,consumable:{itemId,quantity:1}}});
  const profile={scenarioId,revision:(await scenario()).revision,characterId,classId:null,overrides:[{skillId,level:1}],published:true},pp=await request('prepareAbilityProfile',profile,owner);assert.equal(pp.status,200);await command('setAbilityProfile',{...profile,confirmation:pp.result.confirmation});
  await command('saveScenarioHealth',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,defaultMaxHp:10,returnMode:'MJ',allowed:{}}});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Stock de test',capacity:1,privacy:'Fictif'});
  const session=async()=>(await request('session',{sessionId},owner)).result;await command('setRegistrationOpen',{sessionId,revision:1,open:true});await command('register',{sessionId,name:'Test'},player);
  const uid=(await request('identity',{},player)).result.uid;await command('assign',{sessionId,uid,characterId});const token=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(token),hours:1});assert.equal((await request('redeem',{sessionId,token},player)).status,200);
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  for(const action of ['myInventory','previewInventory','saveItem','saveSessionItem','prepareStartingInventory','setStartingInventory','prepareGrantItem','grantItem','correctLot','itemHistory'])assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  for(const action of ['previewInventory','grantItem','correctLot','itemHistory'])assert.equal((await request(action,{sessionId,requestId:randomUUID(),characterId,admin:true},player)).status,403);
  const bag=(await request('myInventory',{sessionId,characterId:'forged'},player)).result;assert.equal(bag.lots.length,1);assert.equal(bag.character.id,characterId);assert.equal(JSON.stringify(bag).includes('SECRET_STOCK_HTTP'),false);
  const damage={sessionId,amount:6},dp=await request('prepareDamage',damage,player);await command('applyDamage',{...damage,confirmation:dp.result.confirmation},player);
  const input={sessionId,skillId,targetId:characterId,lotId:bag.lots[0].id},prepared=await request('prepareTreatment',input,player);assert.equal(prepared.status,200);assert.equal(prepared.result.consumable.quantity,1);
  assert.equal((await request('myInventory',{sessionId},player)).result.lots[0].quantity,1);
  const confirmed={...input,requestId:randomUUID(),confirmation:prepared.result.confirmation},applied=await request('applyTreatment',confirmed,player);assert.equal(applied.status,200);assert.deepEqual(await request('applyTreatment',confirmed,player),applied);
  const after=(await request('myInventory',{sessionId},player)).result.lots[0];assert.equal(after.quantity,0);assert.equal(after.status,'CONSUMED');assert.equal((await request('myHealth',{sessionId},player)).result.health.hp,7);
  await command('revokeAccess',{sessionId,uid});assert.equal((await request('myInventory',{sessionId},player)).status,403);assert.equal((await request('applyTreatment',confirmed,player)).status,403);
});
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

test('HTTP + Auth : remise gratuite confirmée par le destinataire, 20 unités réparties en 12 et 8',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),alice=await googleTestAccount(`giver-${randomUUID()}@example.invalid`),bob=await googleTestAccount(`receiver-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Remises HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result,characters=[];
  for(const name of ['Expéditeur','Destinataire'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName:name,publicationState:'PUBLISHED'})).id);
  const {id:itemId}=await command('saveItem',{scenarioId,revision:(await scenario()).revision,name:'Lot HTTP',kind:'STACKABLE',consumable:false,publicationState:'PUBLISHED',gmNotes:'SECRET_REMISE_HTTP'});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[0],items:[{itemId,quantity:20}]},sp=await request('prepareStartingInventory',seed,owner);await command('setStartingInventory',{...seed,confirmation:sp.result.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Remises de test',capacity:2,privacy:'Fictif'});
  const session=async()=>(await request('session',{sessionId},owner)).result;await command('setRegistrationOpen',{sessionId,revision:1,open:true});const uids=[];
  for(const [i,token] of [alice,bob].entries()){
    const uid=(await request('identity',{},token)).result.uid;uids.push(uid);await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);
  }
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  const bag=(token)=>request('myInventory',{sessionId},token),lot=(await bag(alice)).result.lots[0],input={sessionId,lotId:lot.id,quantity:8,recipientId:characters[1]};
  for(const action of ['prepareLotTransfer','proposeLotTransfer','lotTransferDetail','acceptLotTransfer','declineLotTransfer','cancelLotTransfer'])assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  assert.equal((await request('prepareLotTransfer',{...input,recipientId:characters[0],characterId:characters[0],uid:uids[0]},bob)).status,403);
  const prep=await request('prepareLotTransfer',input,alice);assert.equal(prep.status,200);const proposal=await command('proposeLotTransfer',{...input,confirmation:prep.result.confirmation},alice);
  assert.equal((await bag(alice)).result.lots[0].quantity,20);const detail=await request('lotTransferDetail',{sessionId,transferId:proposal.id},bob);assert.equal(detail.status,200);assert.equal(JSON.stringify(detail).includes('SECRET_REMISE_HTTP'),false);
  const accept={sessionId,transferId:proposal.id,confirmation:detail.result.confirmation,received:true,requestId:randomUUID()};assert.equal((await request('acceptLotTransfer',accept,alice)).status,403);assert.equal((await request('lotTransferDetail',{sessionId,transferId:proposal.id},owner)).status,403);
  const result=await request('acceptLotTransfer',accept,bob);assert.equal(result.status,200);assert.deepEqual(await request('acceptLotTransfer',accept,bob),result);
  assert.equal((await bag(alice)).result.lots[0].quantity,12);assert.equal((await bag(bob)).result.lots[0].quantity,8);assert.notEqual((await bag(bob)).result.lots[0].id,lot.id);
  await command('revokeAccess',{sessionId,uid:uids[1]});assert.equal((await request('acceptLotTransfer',accept,bob)).status,403);
});

test('HTTP + Auth : portefeuille privé, paiement confirmé unique et révocation immédiate',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),alice=await googleTestAccount(`pay-${randomUUID()}@example.invalid`),bob=await googleTestAccount(`receive-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Crédits HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result,characters=[];
  for(const displayName of ['Payeur','Bénéficiaire'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'crédit'}});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[0],amount:100},sp=await request('prepareStartingCredits',seed,owner);assert.equal(sp.status,200);await command('setStartingCredits',{...seed,confirmation:sp.result.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Paiement HTTP',capacity:2,privacy:'Fictif'}),session=async()=>(await request('session',{sessionId},owner)).result;
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});const uids=[];
  for(const [i,token] of [alice,bob].entries()){const uid=(await request('identity',{},token)).result.uid;uids.push(uid);await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  for(const action of ['myWallet','previewWallet','preparePayment','payCredits','saveScenarioEconomy','saveSessionEconomy','prepareStartingCredits','setStartingCredits','prepareCreditAdjustment','applyCreditAdjustment','walletHistory'])assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  for(const action of ['previewWallet','prepareCreditAdjustment','applyCreditAdjustment','walletHistory'])assert.equal((await request(action,{sessionId,characterId:characters[0],requestId:randomUUID(),admin:true},bob)).status,403);
  assert.equal((await request('myWallet',{sessionId,characterId:characters[0]},bob)).result.account.balance,0);
  const input={sessionId,recipientId:characters[1],amount:80,memo:'Paiement de jeu',fromAccountId:'forged'},p=await request('preparePayment',input,alice);assert.equal(p.status,200);assert.equal(p.result.before.balance,100);assert.deepEqual(Object.keys(p.result.recipient).sort(),['id','name']);assert.equal((await request('myWallet',{sessionId},alice)).result.account.balance,100);
  const confirmed={...input,requestId:randomUUID(),confirmation:p.result.confirmation},r=await request('payCredits',confirmed,alice);assert.equal(r.status,200);assert.deepEqual(await request('payCredits',confirmed,alice),r);assert.equal((await request('myWallet',{sessionId},alice)).result.account.balance,20);
  const w=(await request('myWallet',{sessionId},bob)).result;assert.equal(w.account.balance,80);assert.equal(w.entries.length,2);assert.equal(JSON.stringify(w).includes('actorUid'),false);
  await command('revokeAccess',{sessionId,uid:uids[0]});assert.equal((await request('myWallet',{sessionId},alice)).status,403);assert.equal((await request('payCredits',confirmed,alice)).status,403);
});

test('HTTP + Auth : caisse collective, lecture seule et paiement sans divulguer le solde',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),reader=await googleTestAccount(`reader-${randomUUID()}@example.invalid`),spender=await googleTestAccount(`spender-${randomUUID()}@example.invalid`),recipient=await googleTestAccount(`other-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Caisses HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result,characters=[];
  for(const displayName of ['Lecteur','Caissier','Bénéficiaire'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'crédit'}});
  const {id:groupId}=await command('saveGroup',{scenarioId,revision:(await scenario()).revision,name:'SECRET_HTTP_CAISSE',visibility:'SECRET',publicationState:'PUBLISHED',members:[{characterId:characters[0],active:true,revealed:true,permissions:{readWallet:true}},{characterId:characters[1],active:true,revealed:true,permissions:{payWallet:true}}]});
  const configure={scenarioId,revision:(await scenario()).revision,groupId,label:'Comptoir HTTP',amount:100},cp=await request('prepareGroupWallet',configure,owner);assert.equal(cp.status,200);await command('setGroupWallet',{...configure,confirmation:cp.result.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Compte partagé HTTP',capacity:3,privacy:'Fictif'}),session=async()=>(await request('session',{sessionId},owner)).result;
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});for(const [i,token] of [reader,spender,recipient].entries()){const uid=(await request('identity',{},token)).result.uid;await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  const list=(await request('myAccounts',{sessionId},reader)).result,accountId=list.accounts.find(a=>a.kind==='GROUP').id,readInput={sessionId,accountId},payment={sessionId,fromAccountId:accountId,recipientId:characters[2],amount:80,memo:'Paiement HTTP collectif'};
  assert.equal((await request('readAccount',readInput,reader)).result.balances.balance,100);assert.equal((await request('prepareAccountPayment',payment,reader)).status,403);assert.equal((await request('readAccount',readInput,recipient)).status,403);
  const d=(await request('readAccount',readInput,spender)).result;assert.equal('balances' in d,false);assert.equal('entries' in d,false);const p=await request('prepareAccountPayment',payment,spender);assert.equal(p.status,200);assert.equal('before' in p.result,false);assert.equal('after' in p.result,false);
  const confirmed={...payment,confirmation:p.result.confirmation,requestId:randomUUID()},r=await request('payFromAccount',confirmed,spender);assert.equal(r.status,200);assert.deepEqual(await request('payFromAccount',confirmed,spender),r);assert.equal('account' in r.result,false);
  assert.equal((await request('readAccount',readInput,reader)).result.balances.balance,20);const w=(await request('myWallet',{sessionId},recipient)).result;assert.equal(w.account.balance,80);assert.equal(w.entries.find(e=>e.id===r.result.id).counterparty.name,'Comptoir HTTP');assert.equal(JSON.stringify(w).includes('SECRET_HTTP_CAISSE'),false);
  const s=await session(),g=s.groups.find(g=>g.id===groupId);await command('saveSessionGroup',{...g,sessionId,groupId,revision:s.revision,members:g.members.map(m=>({...m,permissions:{readWallet:true,payWallet:false}})),reason:'Retrait du droit de payer'});assert.equal((await request('payFromAccount',confirmed,spender)).status,403);
  for(const action of ['prepareGroupWallet','setGroupWallet','myAccounts','readAccount','previewAccount','prepareAccountPayment','payFromAccount'])assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
});


test('HTTP + Auth : vente privée payée une fois, propriété puis retrait physique distinct',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),seller=await googleTestAccount(`seller-${randomUUID()}@example.invalid`),buyer=await googleTestAccount(`buyer-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Ventes HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result,characters=[];
  for(const displayName of ['Vendeur','Acheteur'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'crédit'}});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[1],amount:100},cp=await request('prepareStartingCredits',seed,owner);await command('setStartingCredits',{...seed,confirmation:cp.result.confirmation});
  const {id:itemId}=await command('saveItem',{scenarioId,revision:(await scenario()).revision,name:'Caisses fictives',kind:'STACKABLE',consumable:false,publicationState:'PUBLISHED',gmNotes:'SECRET_VENTE_HTTP'});
  const inventory={scenarioId,revision:(await scenario()).revision,characterId:characters[0],items:[{itemId,quantity:20}]},ip=await request('prepareStartingInventory',inventory,owner);await command('setStartingInventory',{...inventory,confirmation:ip.result.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Ventes test',capacity:2,privacy:'Fictif'}),session=async()=>(await request('session',{sessionId},owner)).result;
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});const uids=[];
  for(const [i,token] of [seller,buyer].entries()){const uid=(await request('identity',{},token)).result.uid;uids.push(uid);await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  for(const action of ['prepareLotSale','proposeLotSale','lotSaleDetail','prepareLotPurchase','buyLot','declineLotSale','cancelLotSale','offerSalePickup','confirmSalePickup'])assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  const bag=async token=>(await request('myInventory',{sessionId},token)).result,wallet=async token=>(await request('myWallet',{sessionId},token)).result,lot=(await bag(seller)).lots[0];
  const proposal={sessionId,lotId:lot.id,buyerId:characters[1],quantity:8,amount:40,minutes:60,pickupPlace:'Quai fictif',conditions:'Remise physique'};
  assert.equal((await request('prepareLotSale',{...proposal,buyerId:characters[0],uid:uids[0]},buyer)).status,403);
  const p=await request('prepareLotSale',proposal,seller);assert.equal(p.status,200);const {id:saleId}=await command('proposeLotSale',{...proposal,confirmation:p.result.confirmation},seller);
  const detail=async token=>(await request('lotSaleDetail',{sessionId,saleId},token)).result;assert.equal(JSON.stringify(await detail(buyer)).includes('SECRET_VENTE_HTTP'),false);assert.equal((await request('lotSaleDetail',{sessionId,saleId},owner)).status,403);
  const input={sessionId,saleId,fromAccountId:(await request('myAccounts',{sessionId},buyer)).result.accounts[0].id},pp=await request('prepareLotPurchase',input,buyer);assert.equal(pp.status,200);
  const confirmed={...input,confirmation:pp.result.confirmation,requestId:randomUUID()};assert.equal((await request('buyLot',confirmed,seller)).status,403);const paid=await request('buyLot',confirmed,buyer);assert.equal(paid.status,200);assert.deepEqual(await request('buyLot',confirmed,buyer),paid);
  assert.equal((await wallet(buyer)).account.balance,60);assert.equal((await wallet(seller)).account.balance,40);const b=await bag(buyer);assert.equal(b.lots.length,0);assert.equal(b.ownedElsewhere[0].quantity,8);assert.equal(b.ownedElsewhere[0].holderId,characters[0]);assert.equal((await bag(seller)).lots[0].quantity,12);assert.equal((await bag(seller)).heldForOthers[0].quantity,8);
  await command('offerSalePickup',{sessionId,saleId,confirmation:(await detail(seller)).pickupConfirmation},seller);
  const pickup={sessionId,saleId,confirmation:(await detail(buyer)).pickupConfirmation,received:true,requestId:randomUUID()};assert.equal((await request('confirmSalePickup',{...pickup,received:false},buyer)).error,'HANDOVER_REQUIRED');const collected=await request('confirmSalePickup',pickup,buyer);assert.equal(collected.status,200);assert.deepEqual(await request('confirmSalePickup',pickup,buyer),collected);
  assert.equal((await bag(buyer)).lots[0].quantity,8);assert.equal((await bag(buyer)).ownedElsewhere.length,0);assert.equal((await wallet(buyer)).account.balance,60);assert.equal((await wallet(buyer)).entries.filter(e=>e.kind==='SALE').length,1);
  await command('revokeAccess',{sessionId,uid:uids[1]});assert.equal((await request('buyLot',confirmed,buyer)).status,403);assert.equal((await request('confirmSalePickup',pickup,buyer)).status,403);
});

test('HTTP + Auth : marché réservé, accès privés et achat à prix confirmé',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),seller=await googleTestAccount(`seller-${randomUUID()}@example.invalid`),buyer=await googleTestAccount(`buyer-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Marché HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result,characters=[];
  for(const displayName of ['Vendeur','Acheteur'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'crédit'}});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[1],amount:100},cp=await request('prepareStartingCredits',seed,owner);await command('setStartingCredits',{...seed,confirmation:cp.result.confirmation});
  const {id:itemId}=await command('saveItem',{scenarioId,revision:(await scenario()).revision,name:'Caisses fictives',kind:'STACKABLE',consumable:false,publicationState:'PUBLISHED',gmNotes:'SECRET_VENTE_HTTP'});
  const inventory={scenarioId,revision:(await scenario()).revision,characterId:characters[0],items:[{itemId,quantity:20}]},ip=await request('prepareStartingInventory',inventory,owner);await command('setStartingInventory',{...inventory,confirmation:ip.result.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Marché test',capacity:2,privacy:'Fictif'}),session=async()=>(await request('session',{sessionId},owner)).result;
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});const uids=[];
  for(const [i,token] of [seller,buyer].entries()){const uid=(await request('identity',{},token)).result.uid;uids.push(uid);await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  for(const action of ['market','marketListing','prepareMarketListing','publishMarketListing','prepareMarketPurchase','buyMarketListing','withdrawMarketListing','sessionMarket','withdrawSessionListing'])assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  const bag=async token=>(await request('myInventory',{sessionId},token)).result,lot=(await bag(seller)).lots[0];
  const input={sessionId,lotId:lot.id,quantity:8,amount:40,minutes:60,pickupPlace:'Quai fictif',conditions:'Retrait physique après achat'};
  assert.equal((await request('prepareMarketListing',input,buyer)).status,403);const p=await request('prepareMarketListing',input,seller);assert.equal(p.status,200);assert.equal((await request('publishMarketListing',{...input,amount:1,confirmation:p.result.confirmation,requestId:randomUUID()},seller)).error,'STALE_REVISION');
  const r=await command('publishMarketListing',{...input,confirmation:p.result.confirmation},seller),m=await request('market',{sessionId},buyer);assert.equal(m.status,200);assert.equal(m.result.listings.length,1);assert.equal(m.result.listings[0].amount,40);assert.equal(JSON.stringify(m).includes('SECRET_VENTE_HTTP'),false);assert.equal((await bag(seller)).lots.find(l=>l.id===r.lotId).status,'RESERVED');
  const d=(await request('marketListing',{sessionId,listingId:r.id},seller)).result;assert.equal((await request('withdrawMarketListing',{sessionId,listingId:r.id,confirmation:d.confirmation,requestId:randomUUID()},buyer)).status,403);assert.equal((await request('sessionMarket',{sessionId,admin:true},buyer)).status,403);
  const pay={sessionId,listingId:r.id,fromAccountId:(await request('myAccounts',{sessionId},buyer)).result.accounts[0].id},pp=await request('prepareMarketPurchase',pay,buyer);assert.equal(pp.status,200);const confirmed={...pay,confirmation:pp.result.confirmation,requestId:randomUUID()},paid=await request('buyMarketListing',confirmed,buyer);assert.equal(paid.status,200);assert.deepEqual(await request('buyMarketListing',confirmed,buyer),paid);assert.equal((await request('myWallet',{sessionId},buyer)).result.account.balance,60);assert.equal((await bag(buyer)).ownedElsewhere[0].quantity,8);assert.equal((await request('market',{sessionId},buyer)).result.listings.length,0);
  await command('revokeAccess',{sessionId,uid:uids[1]});assert.equal((await request('buyMarketListing',confirmed,buyer)).status,403);assert.equal((await request('market',{sessionId},buyer)).status,403);
});

test('HTTP + Auth : petites annonces, candidature privée et réponse organisateur',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),seller=await googleTestAccount(`seller-${randomUUID()}@example.invalid`),buyer=await googleTestAccount(`buyer-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Missions HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result,characters=[];
  for(const displayName of ['Vendeur','Acheteur'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'crédit'}});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[1],amount:100},cp=await request('prepareStartingCredits',seed,owner);await command('setStartingCredits',{...seed,confirmation:cp.result.confirmation});
  const {id:itemId}=await command('saveItem',{scenarioId,revision:(await scenario()).revision,name:'Caisses fictives',kind:'STACKABLE',consumable:false,publicationState:'PUBLISHED',gmNotes:'SECRET_VENTE_HTTP'});
  const inventory={scenarioId,revision:(await scenario()).revision,characterId:characters[0],items:[{itemId,quantity:20}]},ip=await request('prepareStartingInventory',inventory,owner);await command('setStartingInventory',{...inventory,confirmation:ip.result.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Missions test',capacity:2,privacy:'Fictif'}),session=async()=>(await request('session',{sessionId},owner)).result;
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});const uids=[];
  for(const [i,token] of [seller,buyer].entries()){const uid=(await request('identity',{},token)).result.uid;uids.push(uid);await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  const commands=['sessionAnnouncements','prepareAnnouncement','saveAnnouncement','announcementHistory','sessionApplications','sessionApplication','prepareApplicationReply','replyApplication','announcements','announcementDetail','myApplications','applicationDetail','prepareAnnouncementResponse','respondAnnouncement','withdrawApplication','markApplicationRead'];
  for(const action of commands)assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  const now=Date.now(),input={sessionId,revision:0,title:'Escorte synthétique',category:'ESCORT',mode:'ASSIGNMENT',sponsorKind:'NPC',sponsorName:'Comptoir anonyme',description:'Mission HTTP fictive',rewardType:'NEGOTIABLE',rewardText:'Crédits de jeu à discuter',places:1,conditions:'Conditions',proofExpected:'Validation MJ',briefing:'SECRET_BRIEFING_HTTP',gmNotes:'SECRET_ORGA_HTTP',publication:'PUBLISHED',opensAt:now-10000,deadline:now+3600000,audience:{kind:'TARGETED',characterIds:[characters[1]],groupIds:[]},reason:'Préparation'};
  assert.equal((await request('prepareAnnouncement',{...input,admin:true},buyer)).status,403);const p=await request('prepareAnnouncement',input,owner);assert.equal(p.status,200);const {id:announcementId}=await command('saveAnnouncement',{...input,confirmation:p.result.confirmation});
  assert.equal((await request('announcements',{sessionId},seller)).result.announcements.length,0);const board=(await request('announcements',{sessionId},buyer)).result;assert.equal(board.announcements.length,1);assert.equal(JSON.stringify(board).includes('SECRET_'),false);assert.equal((await request('announcementDetail',{sessionId,announcementId},seller)).status,403);
  const response={sessionId,announcementId,intent:'APPLICATION',body:'CANDIDATURE_HTTP_PRIVEE',proposedReward:'40 crédits fictifs'},rp=await request('prepareAnnouncementResponse',response,buyer);assert.equal(rp.status,200);const confirmed={...response,confirmation:rp.result.confirmation,requestId:randomUUID()},sent=await request('respondAnnouncement',confirmed,buyer);assert.equal(sent.status,200);assert.deepEqual(await request('respondAnnouncement',confirmed,buyer),sent);const applicationId=sent.result.id;
  assert.equal((await request('applicationDetail',{sessionId,applicationId},seller)).status,403);assert.equal((await request('sessionApplication',{sessionId,applicationId},buyer)).status,403);const reply={sessionId,applicationId,body:'REPONSE_ORGA_PRIVEE',status:'DISCUSSION'},pp=await request('prepareApplicationReply',reply,owner);await command('replyApplication',{...reply,confirmation:pp.result.confirmation});
  const d=(await request('applicationDetail',{sessionId,applicationId},buyer)).result;assert.equal(d.messages.length,2);assert.equal(d.messages[1].authorName,'Comptoir anonyme');assert.equal(d.application.unread,true);assert.equal(JSON.stringify(d).includes('SECRET_'),false);assert.equal(JSON.stringify(d).includes('authorUid'),false);
  await command('markApplicationRead',{sessionId,applicationId,revision:d.application.revision,announcementRevision:d.announcement.revision},buyer);assert.equal((await request('myApplications',{sessionId},buyer)).result.applications[0].unread,false);assert.equal((await request('myWallet',{sessionId},buyer)).result.account.balance,100);
  await command('revokeAccess',{sessionId,uid:uids[1]});assert.equal((await request('applicationDetail',{sessionId,applicationId},buyer)).status,403);assert.equal((await request('respondAnnouncement',confirmed,buyer)).status,403);
});

test('HTTP + Auth : contrat personnel, briefing réservé et paiement unique après preuve MJ',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),payer=await googleTestAccount(`payer-${randomUUID()}@example.invalid`),candidate=await googleTestAccount(`candidate-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const read=async(action,input,token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Contrats HTTP synthétiques'}),scenario=()=>read('scenario',{scenarioId}),characters=[];
  for(const displayName of ['Payeur','Candidat'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'crédit'}});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[0],amount:100},cp=await read('prepareStartingCredits',seed);await command('setStartingCredits',{...seed,confirmation:cp.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Contrats test',capacity:2,privacy:'Fictif'}),session=()=>read('session',{sessionId});
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});const uids=[];
  for(const [i,token] of [payer,candidate].entries()){const uid=(await read('identity',{},token)).uid;uids.push(uid);await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});await read('redeem',{sessionId,token:invitation},token);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  const {contractCommands}=await import('../support/contracts-suite.mjs');for(const action of contractCommands)assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  const now=Date.now(),input={sessionId,revision:0,title:'Mission HTTP',category:'ESCORT',mode:'ASSIGNMENT',sponsorKind:'NPC',sponsorName:'Alias commanditaire',description:'Mission fictive',rewardType:'FIXED',rewardText:'40 crédits fictifs',places:1,conditions:'Conditions',proofExpected:'Récit validé par le MJ',briefing:'BRIEFING_HTTP_CONTRAT',gmNotes:'SECRET_ORGA_CONTRAT',publication:'PUBLISHED',opensAt:now-10000,deadline:now+3600000,audience:{kind:'ALL',characterIds:[],groupIds:[]},reason:'Préparation'};
  const p=await read('prepareAnnouncement',input),{id:announcementId}=await command('saveAnnouncement',{...input,confirmation:p.confirmation});
  const response={sessionId,announcementId,intent:'APPLICATION',body:'Candidature privée',proposedReward:''},rp=await read('prepareAnnouncementResponse',response,candidate),{id:applicationId}=await command('respondAnnouncement',{...response,confirmation:rp.confirmation},candidate);
  const source=(await read('myWallet',{sessionId},payer)).account.id,offer={sessionId,applicationId,funding:'ACCOUNT',sourceAccountId:source,amount:40,durationMinutes:30,advance:0,guarantee:0,conditions:'Accompagner le convoi',proofExpected:'Récit au MJ',confidentiality:'Briefing privé',failureTerms:'Annulation sans paiement sur décision MJ',reason:'Autorisation synthétique'};
  assert.equal((await request('prepareMissionContract',offer,candidate)).status,403);const op=await read('prepareMissionContract',offer),{id:contractId}=await command('proposeMissionContract',{...offer,confirmation:op.confirmation});assert.equal((await read('myWallet',{sessionId},payer)).account.reserved,0);
  const pending=await read('contractDetail',{sessionId,contractId},candidate);assert.equal(JSON.stringify(pending).includes('BRIEFING_HTTP_CONTRAT'),false);assert.equal(JSON.stringify(pending).includes('SECRET_ORGA'),false);assert.equal(JSON.stringify(pending).includes(source),false);assert.equal((await request('contractDetail',{sessionId,contractId},payer)).status,403);
  const ap=await read('prepareContractAcceptance',{sessionId,contractId},candidate),accepted={sessionId,contractId,confirmation:ap.confirmation,requestId:randomUUID()},ar=await request('acceptContract',accepted,candidate);assert.equal(ar.status,200);assert.deepEqual(await request('acceptContract',accepted,candidate),ar);assert.equal((await read('myWallet',{sessionId},payer)).account.reserved,40);assert.equal((await read('contractDetail',{sessionId,contractId},candidate)).contract.briefing,'BRIEFING_HTTP_CONTRAT');
  const proof={sessionId,contractId,body:'Arrivée du convoi décrite'},pp=await read('prepareContractProof',proof,candidate);await command('submitContractProof',{...proof,confirmation:pp.confirmation},candidate);assert.equal((await read('myWallet',{sessionId},candidate)).account.balance,0);
  const review={sessionId,contractId,decision:'PAY',reason:'Le MJ confirme la prestation'},vp=await read('prepareContractReview',review),payment={...review,confirmation:vp.confirmation,requestId:randomUUID()};assert.equal((await request('reviewContract',payment,candidate)).status,403);const paid=await request('reviewContract',payment,owner);assert.equal(paid.status,200);assert.deepEqual(await request('reviewContract',payment,owner),paid);assert.equal((await read('myWallet',{sessionId},payer)).account.balance,60);assert.equal((await read('myWallet',{sessionId},payer)).account.reserved,0);assert.equal((await read('myWallet',{sessionId},candidate)).account.balance,40);assert.equal((await read('contractDetail',{sessionId,contractId},candidate)).contract.status,'PAID');
  await command('revokeAccess',{sessionId,uid:uids[1]});assert.equal((await request('contractDetail',{sessionId,contractId},candidate)).status,403);assert.equal((await request('acceptContract',accepted,candidate)).status,403);
});


test('HTTP + Auth : prime financée, preuve privée et paiement idempotent limité au quota',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),payer=await googleTestAccount(`payer-${randomUUID()}@example.invalid`),candidate=await googleTestAccount(`candidate-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const read=async(action,input,token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Primes HTTP synthétiques'}),scenario=()=>read('scenario',{scenarioId}),characters=[];
  for(const displayName of ['Payeur','Candidat'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'crédit'}});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[0],amount:100},cp=await read('prepareStartingCredits',seed);await command('setStartingCredits',{...seed,confirmation:cp.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Primes test',capacity:2,privacy:'Fictif'}),session=()=>read('session',{sessionId});
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});const uids=[];
  for(const [i,token] of [payer,candidate].entries()){const uid=(await read('identity',{},token)).uid;uids.push(uid);await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});await read('redeem',{sessionId,token:invitation},token);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  const {bountyCommands}=await import('../../src/core/bounties.mjs');for(const action of bountyCommands)assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  const now=Date.now(),input={sessionId,revision:0,title:'Prime HTTP',category:'BOUNTY',mode:'OPEN_BOUNTY',sponsorKind:'NPC',sponsorName:'Alias commanditaire',description:'Mission fictive',rewardType:'FIXED',rewardText:'40 crédits fictifs',places:1,conditions:'Conditions',proofExpected:'Récit validé par le MJ',briefing:'BRIEFING_HTTP_JAMAIS_PUBLIC',gmNotes:'SECRET_ORGA_PRIME',publication:'PUBLISHED',opensAt:now-10000,deadline:now+3600000,audience:{kind:'ALL',characterIds:[],groupIds:[]},reason:'Préparation'};
  const p=await read('prepareAnnouncement',input),{id:announcementId}=await command('saveAnnouncement',{...input,confirmation:p.confirmation});
  const source=(await read('myWallet',{sessionId},payer)).account.id,offer={sessionId,announcementId,funding:'ACCOUNT',sourceAccountId:source,amount:40,reason:'FINANCE_MJ_PRIVEE'};
  assert.equal((await request('prepareBounty',offer,candidate)).status,403);const op=await read('prepareBounty',offer),{id:bountyId}=await command('openBounty',{...offer,confirmation:op.confirmation});assert.equal((await read('myWallet',{sessionId},payer)).account.reserved,40);
  const visible=JSON.stringify(await read('bountyDetail',{sessionId,bountyId},candidate));for(const secret of ['BRIEFING_HTTP','SECRET_ORGA','FINANCE_MJ',source])assert.equal(visible.includes(secret),false);
  const proof={sessionId,bountyId,body:'PREUVE_HTTP_PRIVEE'},pp=await read('prepareBountyClaim',proof,candidate);await command('submitBountyClaim',{...proof,confirmation:pp.confirmation},candidate);
  assert.equal(JSON.stringify(await read('bountyDetail',{sessionId,bountyId},payer)).includes('PREUVE_HTTP_PRIVEE'),false);
  const claimId=(await read('bountyDetail',{sessionId,bountyId},candidate)).claims[0].id,review={sessionId,bountyId,claimId,decision:'PAY',reason:'Preuve vérifiée'},vp=await read('prepareBountyReview',review),payment={...review,confirmation:vp.confirmation,requestId:randomUUID()};
  assert.equal((await request('reviewBounty',payment,candidate)).status,403);const paid=await request('reviewBounty',payment,owner);assert.equal(paid.status,200);assert.deepEqual(await request('reviewBounty',payment,owner),paid);
  assert.equal((await read('myWallet',{sessionId},payer)).account.balance,60);assert.equal((await read('myWallet',{sessionId},payer)).account.reserved,0);assert.equal((await read('myWallet',{sessionId},candidate)).account.balance,40);assert.equal((await read('bountyDetail',{sessionId,bountyId},candidate)).bounty.status,'EXHAUSTED');
  await command('revokeAccess',{sessionId,uid:uids[1]});assert.equal((await request('bountyDetail',{sessionId,bountyId},candidate)).status,403);
});
