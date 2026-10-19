import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createWorkflow,hash} from '../../src/core/workflow.mjs';
export function workflowSuite(makeStore,prefix='métier') {
  const err=code=>({code});
  async function fixture(capacity=2,publicationState='PUBLISHED'){
    const store=await makeStore();let clock=100000;
    const suffix=randomUUID(),ownerEmail=`owner-${suffix}@example.invalid`;
    const actor=(name)=>({uid:`${name}-${suffix}`,email:`${name}-${suffix}@example.invalid`,emailVerified:true,provider:'google.com',authTime:100});
    const owner=actor('owner'),alice=actor('alice'),bob=actor('bob');
    const w=createWorkflow({store,ownerEmail,now:()=>clock});
    const read=(action,who=owner,data={})=>w.dispatch(action,who,data);
    const command=(action,who=owner,data={})=>read(action,who,{requestId:randomUUID(),...data});
    const {id:scenarioId}=await command('createScenario',owner,{title:'Essai sans données réelles',summary:'Public'});
    const {id:characterId}=await command('saveCharacter',owner,{scenarioId,revision:1,displayName:'Alias',profession:'Pilote',description:'Public',publicationState,
      biography:'Histoire privée',playerSecrets:'SECRET_JOUEUR',gmNotes:'SECRET_MJ',roleplay:'Costume'});
    const {id:versionId}=await command('publishScenario',owner,{scenarioId,revision:2});
    const {id:sessionId}=await command('createSession',owner,{scenarioId,versionId,title:'Test',capacity,privacy:'Données fictives de test',fields:[{id:'wish',label:'Souhait',required:false}]});
    await command('setRegistrationOpen',owner,{sessionId,revision:1,open:true});
    const reg=(who)=>command('register',who,{sessionId,name:who.uid,answers:{wish:'PRIVE_INSCRIPTION'}});
    const assign=(who,replace=false)=>command('assign',owner,{sessionId,uid:who.uid,characterId,replace});
    async function invite(who){const token=randomBytes(32).toString('base64url');await command('issueInvitation',owner,{sessionId,uid:who.uid,tokenHash:hash(token),hours:1});return token;}
    const redeem=(who,token)=>read('redeem',who,{sessionId,token});
    const view=who=>read('mySession',who,{sessionId});
    async function stage(value){const s=await read('session',owner,{sessionId});return command('setStage',owner,{sessionId,revision:s.revision,stage:value});}
    return {store,read,command,owner,alice,bob,scenarioId,versionId,sessionId,characterId,reg,assign,invite,redeem,view,stage,setTime:n=>clock=n};
  }
  test(`${prefix} : dernière place concurrente et réessai sans double inscription`,async()=>{
    const f=await fixture(1);const results=await Promise.all([f.reg(f.alice),f.reg(f.bob)]);
    assert.deepEqual(results.map(r=>r.status).sort(),['ACCEPTED','WAITLISTED']);
    const s=await f.read('session',f.owner,{sessionId:f.sessionId});assert.equal(s.accepted,1);
    await assert.rejects(f.reg(f.alice),err('ALREADY_REGISTERED'));
  });
  test(`${prefix} : REC-01 inscription, invitation, briefing et badge sans fuite`,async()=>{
    const f=await fixture();await f.reg(f.alice);await f.assign(f.alice);
    assert.equal((await f.view(f.alice)).character,null);
    const token=await f.invite(f.alice);await f.redeem(f.alice,token);
    assert.equal((await f.view(f.alice)).reason,'BRIEFING_CLOSED');
    await f.stage('BRIEFING');const view=await f.view(f.alice);
    assert.equal(view.character.secrets,'SECRET_JOUEUR');assert.equal(JSON.stringify(view.character).includes('SECRET_MJ'),false);
    assert.equal(JSON.stringify(view.character).includes('PRIVE_INSCRIPTION'),false);
    const badge=await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characterId});
    assert.equal(JSON.stringify(badge).includes('SECRET'),false);assert.equal(JSON.stringify(badge).includes('email'),false);
    assert.equal((await f.view(f.bob)).character,null);
    const preview=await f.read('preview',f.owner,{sessionId:f.sessionId,characterId:f.characterId});assert.deepEqual(preview.character,view.character);
  });
  test(`${prefix} : invitation nominative, usage unique et double consommation concurrente`,async()=>{
    const f=await fixture();await f.reg(f.alice);await f.assign(f.alice);const token=await f.invite(f.alice);
    await assert.rejects(f.redeem(f.bob,token),err('INVALID_INVITATION'));
    const results=await Promise.allSettled([f.redeem(f.alice,token),f.redeem(f.alice,token)]);
    assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
    assert.equal(results.find(x=>x.status==='rejected').reason.code,'INVITATION_EXPIRED_OR_USED');
    const stored=JSON.stringify(await f.store.get(`invitations/${hash(token)}`));assert.equal(stored.includes(token),false);
  });
  test(`${prefix} : expiration en temps réel et renouvellement invalide l’ancienne invitation`,async()=>{
    const f=await fixture();await f.reg(f.alice);await f.assign(f.alice);const old=await f.invite(f.alice);const recent=await f.invite(f.alice);
    await assert.rejects(f.redeem(f.alice,old),err('ACCESS_INACTIVE'));
    f.setTime(3700000);await assert.rejects(f.redeem(f.alice,recent),err('INVITATION_EXPIRED_OR_USED'));
  });
  test(`${prefix} : une réattribution ferme immédiatement l’ancien accès`,async()=>{
    const f=await fixture();await f.reg(f.alice);await f.reg(f.bob);await f.assign(f.alice);await f.redeem(f.alice,await f.invite(f.alice));await f.stage('BRIEFING');
    await assert.rejects(f.assign(f.bob),err('CHARACTER_TAKEN'));await f.assign(f.bob,true);
    assert.equal((await f.view(f.alice)).character,null);assert.equal((await f.view(f.bob)).character,null);
    await f.redeem(f.bob,await f.invite(f.bob));assert.equal((await f.view(f.bob)).character.secrets,'SECRET_JOUEUR');
  });
  test(`${prefix} : téléphone perdu, les anciens jetons restent refusés après nouvelle invitation`,async()=>{
    const f=await fixture();await f.reg(f.alice);await f.assign(f.alice);await f.redeem(f.alice,await f.invite(f.alice));await f.stage('BRIEFING');
    await f.command('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.alice.uid});const token=await f.invite(f.alice);
    await assert.rejects(f.redeem(f.alice,token),err('REAUTH_REQUIRED'));
    const fresh={...f.alice,authTime:101};await f.redeem(fresh,token);
    assert.equal((await f.view(f.alice)).character,null);assert.equal((await f.view(fresh)).character.secrets,'SECRET_JOUEUR');
  });
  test(`${prefix} : versions et copies de session restent immuables`,async()=>{
    const f=await fixture();await f.command('saveCharacter',f.owner,{scenarioId:f.scenarioId,characterId:f.characterId,revision:2,displayName:'Modifié',publicationState:'DRAFT'});
    const s=await f.read('session',f.owner,{sessionId:f.sessionId});assert.equal(s.characters[0].public.displayName,'Alias');
    assert.equal((await f.store.get(`scenarios/${f.scenarioId}/versions/${f.versionId}/characters/${f.characterId}`)).playerSecrets,'SECRET_JOUEUR');
    await assert.rejects(f.command('saveCharacter',f.owner,{scenarioId:f.scenarioId,revision:2,displayName:'Conflit',publicationState:'DRAFT'}),err('STALE_REVISION'));
  });
  test(`${prefix} : un brouillon reste inaccessible même avec une attribution active`,async()=>{
    const f=await fixture(1,'DRAFT');await f.reg(f.alice);await f.assign(f.alice);await f.redeem(f.alice,await f.invite(f.alice));await f.stage('BRIEFING');
    assert.equal((await f.view(f.alice)).reason,'CONTENT_UNPUBLISHED');
    await assert.rejects(f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characterId}),err('PUBLIC_IDENTITY_MISSING'));
  });
  test(`${prefix} : publier une fiche de session conserve le modèle et les droits du titulaire`,async()=>{
    const f=await fixture(1,'DRAFT');await f.reg(f.alice);await f.assign(f.alice);await f.redeem(f.alice,await f.invite(f.alice));await f.stage('BRIEFING');
    const s=await f.read('session',f.owner,{sessionId:f.sessionId});
    await f.command('saveSessionCharacter',f.owner,{sessionId:f.sessionId,characterId:f.characterId,revision:s.revision,
      displayName:'Alias publié',publicationState:'PUBLISHED',playerSecrets:'Secret révélé',gmNotes:'Toujours MJ'});
    assert.equal((await f.view(f.alice)).character.secrets,'Secret révélé');
    assert.equal((await f.store.get(`scenarios/${f.scenarioId}/characters/${f.characterId}`)).publicationState,'DRAFT');
    await f.command('confirmBriefing',f.alice,{sessionId:f.sessionId});assert.equal((await f.view(f.alice)).registration.briefingReadAt,100000);
  });
  test(`${prefix} : réouverture de l’accueil ne redémarre pas une horloge en pause`,async()=>{
    const f=await fixture();await f.stage('BRIEFING');await f.stage('EN_JEU');f.setTime(105000);await f.stage('PAUSE');
    const s=await f.read('session',f.owner,{sessionId:f.sessionId});await f.command('setRegistrationOpen',f.owner,{sessionId:f.sessionId,revision:s.revision,open:true});
    f.setTime(200000);const d=await f.view(f.alice);assert.equal(d.session.stage,'PAUSE');assert.equal(d.gameTimeMs,5000);
  });
  test(`${prefix} : annulation libère la place et l’attribution sans supprimer le personnage`,async()=>{
    const f=await fixture(1);await f.reg(f.alice);await f.reg(f.bob);await f.assign(f.alice);
    await f.command('cancelRegistration',f.alice,{sessionId:f.sessionId});
    await f.command('setRegistrationStatus',f.owner,{sessionId:f.sessionId,uid:f.bob.uid,status:'ACCEPTED'});await f.assign(f.bob);
    const s=await f.read('session',f.owner,{sessionId:f.sessionId});assert.equal(s.accepted,1);assert.equal(s.characters.length,1);assert.equal(s.characters[0].assignedUid,f.bob.uid);
  });
  test(`${prefix} : identités non vérifiées, faux rôle et autre session sont refusés`,async()=>{
    const f=await fixture();for(const actor of [null,f.alice,{...f.owner,emailVerified:false},{...f.owner,provider:'password'}])
      await assert.rejects(f.read('dashboard',actor),e=>['FORBIDDEN','LOGIN_REQUIRED'].includes(e.code));
    await assert.rejects(f.read('session',f.alice,{sessionId:f.sessionId,admin:true}),err('FORBIDDEN'));
    await assert.rejects(f.read('session',f.owner,{sessionId:'unrelated'}),err('FORBIDDEN'));
    const p=await f.read('publicSession',null,{sessionId:f.sessionId});assert.equal('ownerUid' in p,false);assert.equal('registrations' in p,false);
  });
}
