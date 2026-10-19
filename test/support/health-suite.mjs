import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createWorkflow,hash} from '../../src/core/workflow.mjs';
export function healthSuite(makeStore,prefix='PV et soins'){
  const err=code=>({code});
  async function fixture(enabled=true){
    const store=await makeStore(),suffix=randomUUID();let time=100000;
    const actor=n=>({uid:`${n}-${suffix}`,email:`${n}-${suffix}@example.invalid`,emailVerified:true,provider:'google.com',authTime:100});
    const owner=actor('owner'),alice=actor('alice'),bob=actor('bob'),eve=actor('eve'),staff=actor('staff');
    const workflow=createWorkflow({store,ownerEmail:owner.email,now:()=>time});
    const read=(a,who=owner,i={})=>workflow.dispatch(a,who,i),cmd=(a,who=owner,i={})=>read(a,who,{requestId:randomUUID(),...i});
    const {id:scenarioId}=await cmd('createScenario',owner,{title:'Santé de jeu synthétique'}),scenario=()=>read('scenario',owner,{scenarioId}),characters=[];
    for(const name of ['Soignant','Patient','Secours'])characters.push((await cmd('saveCharacter',owner,{scenarioId,revision:(await scenario()).revision,displayName:name,biography:'BIO_CONSERVEE',publicationState:'PUBLISHED'})).id);
    const skills=[];
    for(const [kind,uses,cooldownSeconds] of [['ACTIVE_TARGET',2,60],['ACTIVE_SELF',1,0]])skills.push((await cmd('saveSkill',owner,{scenarioId,revision:(await scenario()).revision,name:kind==='ACTIVE_SELF'?'Auto-soin':'Traitement',kind,publicationState:'PUBLISHED',healing:{effect:'HEAL_HP',amount:3,uses,cooldownSeconds},gmNotes:'SECRET_SOINS_MJ'})).id);
    for(const characterId of [characters[0],characters[2]]){
      const input={scenarioId,revision:(await scenario()).revision,characterId,classId:null,overrides:skills.map(skillId=>({skillId,level:1})),published:true};
      const p=await read('prepareAbilityProfile',owner,input);await cmd('setAbilityProfile',owner,{...input,confirmation:p.confirmation});
    }
    const rules={enabled,defaultMaxHp:10,returnMode:'MJ',allowed:{discover:false,share:false,publish:false,heal:false}};
    await cmd('saveScenarioHealth',owner,{scenarioId,revision:(await scenario()).revision,rules});
    const {id:versionId}=await cmd('publishScenario',owner,{scenarioId,revision:(await scenario()).revision}),sessionInput={scenarioId,versionId,title:'Soins de test',capacity:3,privacy:'Fictif'};
    const {id:sessionId}=await cmd('createSession',owner,sessionInput),session=()=>read('session',owner,{sessionId});
    const stage=async value=>cmd('setStage',owner,{sessionId,revision:(await session()).revision,stage:value});
    const activate=async(who,sid=sessionId)=>{const token=randomBytes(32).toString('base64url');await cmd('issueInvitation',owner,{sessionId:sid,uid:who.uid,tokenHash:hash(token),hours:1});await read('redeem',who,{sessionId:sid,token});};
    await cmd('setRegistrationOpen',owner,{sessionId,revision:1,open:true});
    for(const [i,who] of [alice,bob,eve].entries()){await cmd('register',who,{sessionId,name:'Test'});await cmd('assign',owner,{sessionId,uid:who.uid,characterId:characters[i]});await activate(who);}
    await stage('BRIEFING');await stage('EN_JEU');
    const view=(who=alice,patch={})=>read('myHealth',who,{sessionId,...patch});
    const prepareDamage=async(who=alice,amount=2)=>{const input={sessionId,amount};return {input,result:await read('prepareDamage',who,input)};};
    const applyDamage=(p,who=alice,patch={})=>cmd('applyDamage',who,{...p.input,confirmation:p.result.confirmation,...patch});
    const damage=async(who=alice,amount=2)=>applyDamage(await prepareDamage(who,amount),who);
    const prepare=async(who=alice,targetId=characters[1],skillId=skills[0],patch={})=>{const input={sessionId,targetId,skillId,...patch};return {input,result:await read('prepareTreatment',who,input)};};
    const treat=(p,who=alice,patch={})=>cmd('applyTreatment',who,{...p.input,confirmation:p.result.confirmation,...patch});
    const setRules=async patch=>cmd('saveSessionHealth',owner,{sessionId,revision:(await session()).revision,rules:{...(await session()).healthRules,...patch},reason:'Règle de test'});
    const correct=async(characterId,patch={})=>{const s=await session(),c=s.characters.find(c=>c.id===characterId);return cmd('correctHealth',owner,{sessionId,revision:s.revision,characterId,healthRevision:c.healthRevision,hp:c.hp,maxHp:c.maxHp,outOfCombat:c.outOfCombat,reason:'MOTIF_PRIVE_MJ',...patch});};
    const republish=async characterId=>{const input={sessionId,revision:(await session()).revision,characterId,classId:null,overrides:skills.map(skillId=>({skillId,level:1})),published:true,reason:'Réattribuer'};const p=await read('prepareAbilityProfile',owner,input);return cmd('setAbilityProfile',owner,{...input,confirmation:p.confirmation});};
    return {store,read,cmd,owner,alice,bob,eve,staff,scenarioId,sessionId,scenario,session,sessionInput,characters,skills,stage,activate,view,prepareDamage,applyDamage,damage,prepare,treat,setRules,correct,republish,advance:ms=>time+=ms};
  }
  test(`${prefix} : activation facultative, valeurs initiales figées et réactivation sans soin gratuit`,async()=>{
    const f=await fixture(false);await assert.rejects(f.view(),err('HEALTH_DISABLED'));
    await f.setRules({enabled:true,defaultMaxHp:12});assert.equal((await f.view()).health.hp,12);await f.damage();
    await f.setRules({enabled:false});await assert.rejects(f.view(),err('HEALTH_DISABLED'));await f.setRules({enabled:true,defaultMaxHp:20});assert.equal((await f.view()).health.hp,10);assert.equal((await f.view()).health.maxHp,12);
    const {id:sid}=await f.cmd('createSession',f.owner,f.sessionInput),s=await f.read('session',f.owner,{sessionId:sid});assert.equal(s.healthRules.enabled,false);assert.equal(s.characters.find(c=>c.id===f.characters[0]).maxHp,null);
  });
  test(`${prefix} : dégâts préparés sans effet, plancher zéro et double envoi unique`,async()=>{
    const f=await fixture(),p=await f.prepareDamage(f.alice,99);assert.equal((await f.view()).health.hp,10);assert.equal(p.result.after.hp,0);
    const requestId=randomUUID(),result=await f.applyDamage(p,f.alice,{requestId});assert.deepEqual(await f.applyDamage(p,f.alice,{requestId}),result);
    const d=await f.view();assert.equal(d.health.outOfCombat,true);assert.equal(d.events.length,1);
    const c=(await f.session()).characters.find(c=>c.id===f.characters[0]);assert.equal(c.biography,'BIO_CONSERVEE');assert.equal(c.contentRevision,1);
  });
  test(`${prefix} : deux déclarations concurrentes n’appliquent pas deux fois le même état confirmé`,async()=>{
    const f=await fixture(),p=await f.prepareDamage(),results=await Promise.allSettled([f.applyDamage(p),f.applyDamage(p)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'STALE_REVISION');assert.equal((await f.view()).health.hp,8);
  });
  test(`${prefix} : soin confirmé, plafond respecté et une seule consommation même après réponse perdue`,async()=>{
    const f=await fixture();await f.damage(f.bob,1);const p=await f.prepare();assert.equal(p.result.restored,1);assert.equal((await f.view()).skills.find(k=>k.id===f.skills[0]).remaining,2);
    const requestId=randomUUID(),r=await f.treat(p,f.alice,{requestId});assert.deepEqual(await f.treat(p,f.alice,{requestId}),r);
    assert.equal((await f.view(f.bob)).health.hp,10);assert.equal((await f.view()).skills.find(k=>k.id===f.skills[0]).remaining,1);assert.equal((await f.view(f.bob)).events.filter(e=>e.kind==='HEAL').length,1);
  });
  test(`${prefix} : dernier usage concurrent réservé à un seul soin`,async()=>{
    const f=await fixture();await f.damage(f.bob,8);await f.damage(f.eve,8);await f.treat(await f.prepare());f.advance(60000);
    const a=await f.prepare(),b=await f.prepare(f.alice,f.characters[2]);const r=await Promise.allSettled([f.treat(a),f.treat(b)]);
    assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'NO_USES_LEFT');assert.equal((await f.view()).skills.find(k=>k.id===f.skills[0]).remaining,0);
  });
  test(`${prefix} : délai en temps de jeu suspendu pendant la pause, horloge client ignorée`,async()=>{
    const f=await fixture();await f.damage(f.bob,8);await f.treat(await f.prepare());f.advance(20000);await f.stage('PAUSE');f.advance(300000);
    assert.equal((await f.view()).skills.find(k=>k.id===f.skills[0]).waitMs,40000);await f.stage('EN_JEU');
    await assert.rejects(f.prepare(f.alice,f.characters[1],f.skills[0],{now:99999999,used:0}),err('COOLDOWN_ACTIVE'));
    f.advance(40000);await f.treat(await f.prepare());assert.equal((await f.view(f.bob)).health.hp,8);
  });
  test(`${prefix} : aucun usage pour un soin inutile, une cible changée ou une phase bloquée`,async()=>{
    const f=await fixture();await assert.rejects(f.prepare(),err('NO_HEAL_NEEDED'));await f.damage(f.bob,5);const p=await f.prepare();await f.damage(f.bob,1);
    await assert.rejects(f.treat(p),err('STALE_REVISION'));assert.equal((await f.view()).skills.find(k=>k.id===f.skills[0]).remaining,2);
    const next=await f.prepare();await f.stage('PAUSE');await assert.rejects(f.treat(next),err('SESSION_NOT_RUNNING'));assert.equal((await f.view()).skills.find(k=>k.id===f.skills[0]).remaining,2);
  });
  test(`${prefix} : deux soignants concurrents ne valident pas des conséquences devenues différentes`,async()=>{
    const f=await fixture();await f.damage(f.bob,8);const a=await f.prepare(),b=await f.prepare(f.eve);
    const r=await Promise.allSettled([f.treat(a),f.treat(b,f.eve)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');assert.equal((await f.view(f.bob)).health.hp,5);
    const uses=(await f.view()).skills.find(k=>k.id===f.skills[0]).used+(await f.view(f.eve)).skills.find(k=>k.id===f.skills[0]).used;assert.equal(uses,1);
  });
  test(`${prefix} : hors combat soumis aux règles du scénario, consultation et carnet personnel conservés`,async()=>{
    const f=await fixture();
    const {id:kid}=await f.cmd('saveSessionKnowledge',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,title:'Indice',body:'Connu',kind:'CLUE',publicationState:'PUBLISHED',shareMode:'COPY',qrEnabled:true,qrAudience:'ALL_PLAYERS',reason:'Test'});
    await f.cmd('discoverKnowledge',f.alice,{sessionId:f.sessionId,knowledgeId:kid});
    const {id:gid}=await f.cmd('saveSessionGroup',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,name:'Équipe',visibility:'PUBLIC',publicationState:'PUBLISHED',members:[{characterId:f.characters[0],active:true,revealed:true,permissions:{readUpdates:true,publishUpdates:true}}],reason:'Test'});
    await f.cmd('setGroupModule',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,enabled:true,reason:'Test'});
    await f.damage(f.alice,10);await f.damage(f.bob,5);
    const n=await f.cmd('saveNote',f.alice,{sessionId:f.sessionId,revision:0,title:'Carnet',body:'Texte privé'});
    for(const [action,input] of [
      ['discoverKnowledge',{knowledgeId:kid}],['shareKnowledge',{knowledgeId:kid,recipientId:f.characters[1],receiptRevision:1}],
      ['publishGroupUpdate',{groupId:gid,title:'Titre',body:'Texte'}],['prepareNoteShare',{noteId:n.id,revision:1,authorCharacterId:f.characters[0],authorName:'Soignant',recipientId:f.characters[1],shareMode:'SHOW'}]
    ])await assert.rejects(f.cmd(action,f.alice,{sessionId:f.sessionId,...input}),err('OUT_OF_COMBAT'));
    await assert.rejects(f.prepare(),err('OUT_OF_COMBAT'));
    assert.equal((await f.read('knowledgeDetail',f.alice,{sessionId:f.sessionId,knowledgeId:kid})).knowledge.body,'Connu');
    assert.equal((await f.read('myGroup',f.alice,{sessionId:f.sessionId,groupId:gid})).group.permissions.publishUpdates,false);
    await f.setRules({allowed:{discover:true,share:true,publish:true,heal:true}});
    await f.cmd('publishGroupUpdate',f.alice,{sessionId:f.sessionId,groupId:gid,title:'Autorisé',body:'Selon la règle'});await f.treat(await f.prepare());
  });
  test(`${prefix} : retour en jeu configuré, correction MJ tracée et motif absent de la projection joueur`,async()=>{
    const f=await fixture();await f.damage(f.bob,10);await f.treat(await f.prepare());assert.equal((await f.view(f.bob)).health.outOfCombat,true);
    await f.correct(f.characters[1],{outOfCombat:false});const own=await f.view(f.bob);assert.equal(own.health.outOfCombat,false);assert.equal(JSON.stringify(own).includes('MOTIF_PRIVE_MJ'),false);
    const h=await f.read('healthHistory',f.owner,{sessionId:f.sessionId,characterId:f.characters[1]});assert.ok(h.events.some(e=>e.reason==='MOTIF_PRIVE_MJ'));
    await f.setRules({returnMode:'HP_POSITIVE'});await f.damage(f.eve,10);await assert.rejects(f.prepare(f.eve,f.characters[2],f.skills[1]),err('OUT_OF_COMBAT'));
    // A separate authorized healer restores the patient; a disabled self-action cannot bypass the rule.
    f.advance(60000);await f.treat(await f.prepare(f.alice,f.characters[2]));assert.equal((await f.view(f.eve)).health.outOfCombat,false);
  });
  test(`${prefix} : accès personnel, rôle Accueil et badge ne donnent pas les PV d’un autre personnage`,async()=>{
    const f=await fixture();await f.damage(f.bob,4);
    assert.equal((await f.view(f.bob,{characterId:f.characters[0],uid:f.alice.uid})).health.hp,6);
    await assert.rejects(f.prepare(f.bob),err('FORBIDDEN'));const badge=await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[1]});assert.equal('hp' in badge,false);
    await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Test'});
    const reception=await f.read('session',f.staff,{sessionId:f.sessionId});assert.equal('healthRules' in reception,false);assert.equal('hp' in reception.characters[0],false);
    for(const action of ['previewHealth','healthHistory','correctHealth','saveSessionHealth'])await assert.rejects(f.cmd(action,f.staff,{sessionId:f.sessionId,characterId:f.characters[0]}),err('FORBIDDEN'));
    const preview=await f.read('previewHealth',f.owner,{sessionId:f.sessionId,characterId:f.characters[0]});assert.deepEqual(preview.health,(await f.view()).health);assert.equal(JSON.stringify(preview).includes('SECRET_SOINS_MJ'),false);
  });
  test(`${prefix} : compétence retirée et accès révoqué refusent aussi le résultat mémorisé`,async()=>{
    const f=await fixture();await f.damage(f.bob,6);const p=await f.prepare(),requestId=randomUUID();await f.treat(p,f.alice,{requestId});
    const input={sessionId:f.sessionId,revision:(await f.session()).revision,characterId:f.characters[0],classId:null,overrides:[],published:true,reason:'Retrait'};
    const prepared=await f.read('prepareAbilityProfile',f.owner,input);await f.cmd('setAbilityProfile',f.owner,{...input,confirmation:prepared.confirmation});
    await assert.rejects(f.treat(p,f.alice,{requestId}),err('FORBIDDEN'));await f.republish(f.characters[0]);
    await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.alice.uid});await assert.rejects(f.treat(p,f.alice,{requestId}),err('FORBIDDEN'));
  });
  test(`${prefix} : réattribution du destinataire invalide la confirmation et les lectures de résultat précédentes`,async()=>{
    const f=await fixture();await f.damage(f.bob,6);const old=await f.prepare(),requestId=randomUUID();await f.treat(old,f.alice,{requestId});f.advance(60000);const next=await f.prepare();
    await f.cmd('assign',f.owner,{sessionId:f.sessionId,uid:f.eve.uid,characterId:f.characters[1],replace:true});await f.activate(f.eve);
    await assert.rejects(f.treat(next),err('STALE_REVISION'));await assert.rejects(f.treat(old,f.alice,{requestId}),err('FORBIDDEN'));
  });
  test(`${prefix} : remplacer le profil ne réinitialise ni les usages ni le délai, les modèles restent figés`,async()=>{
    const f=await fixture();await f.damage(f.bob,8);await f.treat(await f.prepare());
    const s=await f.session(),skill=s.skills.find(k=>k.id===f.skills[0]);await f.cmd('saveSessionSkill',f.owner,{...skill,sessionId:f.sessionId,revision:s.revision,healing:{...skill.healing,amount:1},reason:'Nouvelle règle'});
    assert.equal((await f.view()).skills.find(k=>k.id===f.skills[0]).healing.amount,3);await f.republish(f.characters[0]);const after=(await f.view()).skills.find(k=>k.id===f.skills[0]);assert.equal(after.used,1);assert.equal(after.waitMs,60000);assert.equal(after.healing.amount,1);
  });
  test(`${prefix} : une nouvelle session ne reprend ni les dégâts ni les usages consommés`,async()=>{
    const f=await fixture();await f.damage(f.bob,8);await f.treat(await f.prepare());
    const {id:sid}=await f.cmd('createSession',f.owner,f.sessionInput),s=await f.read('session',f.owner,{sessionId:sid});assert.equal(s.characters.find(c=>c.id===f.characters[1]).hp,10);
    assert.deepEqual(await f.store.list(`sessions/${sid}/characters/${f.characters[0]}/skillUses`),[]);
    assert.equal((await f.scenario()).characters.find(c=>c.id===f.characters[1]).hp,null);
  });
  test(`${prefix} : corrections concurrentes et états périmés refusés sans réinitialiser le personnage`,async()=>{
    const f=await fixture(),s=await f.session(),c=s.characters.find(c=>c.id===f.characters[1]);const input={sessionId:f.sessionId,revision:s.revision,characterId:c.id,healthRevision:c.healthRevision,hp:8,maxHp:12,outOfCombat:false,reason:'Correction'};
    await f.damage(f.bob,2);await assert.rejects(f.cmd('correctHealth',f.owner,input),err('STALE_REVISION'));
    const fresh={...input,healthRevision:(await f.view(f.bob)).health.revision};const r=await Promise.allSettled([f.cmd('correctHealth',f.owner,fresh),f.cmd('correctHealth',f.owner,{...fresh,hp:9})]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);
    assert.equal((await f.session()).characters.find(x=>x.id===c.id).biography,c.biography);
  });
  test(`${prefix} : formes de soin, invalidités, usurpations et commandes anonymes refusées`,async()=>{
    const f=await fixture();await f.damage(f.alice,5);
    await assert.rejects(f.prepare(f.alice,f.characters[0],f.skills[0]),err('INVALID_RECIPIENT'));await assert.rejects(f.prepare(f.alice,f.characters[1],f.skills[1]),err('INVALID_RECIPIENT'));
    await f.treat(await f.prepare(f.alice,f.characters[0],f.skills[1]));assert.equal((await f.view()).health.hp,8);
    await assert.rejects(f.prepare(f.alice,randomUUID()),err('INVALID_RECIPIENT'));
    for(const patch of [{amount:0},{uses:0},{cooldownSeconds:-1},{cooldownSeconds:Number.MAX_SAFE_INTEGER}])await assert.rejects(f.cmd('saveSessionSkill',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,name:'Invalide',kind:'ACTIVE_TARGET',publicationState:'PUBLISHED',healing:{effect:'HEAL_HP',amount:3,uses:1,cooldownSeconds:0,...patch},reason:'Test'}),err('INVALID_HEALING'));
    for(const hp of [-1,1.5,11])await assert.rejects(f.correct(f.characters[0],{hp}),err('INVALID_HEALTH'));
    await assert.rejects(f.correct(f.characters[0],{hp:0,outOfCombat:false}),err('INVALID_HEALTH'));
    for(const action of ['myHealth','prepareDamage','applyDamage','prepareTreatment','applyTreatment','correctHealth','healthHistory'])await assert.rejects(f.cmd(action,null,{sessionId:f.sessionId}),err('LOGIN_REQUIRED'));
    await assert.rejects(f.view({...f.alice,emailVerified:false}),err('LOGIN_REQUIRED'));
  });
  test(`${prefix} : fin de jeu et module fermé bloquent les nouveaux soins ; résultat déjà acquis consultable en pause`,async()=>{
    const f=await fixture(),p=await f.prepareDamage(),requestId=randomUUID();const result=await f.applyDamage(p,f.alice,{requestId});await f.stage('PAUSE');assert.deepEqual(await f.applyDamage(p,f.alice,{requestId}),result);
    await assert.rejects(f.prepareDamage(),err('SESSION_NOT_RUNNING'));await f.stage('FINISHED');await assert.rejects(f.prepareDamage(),err('SESSION_NOT_RUNNING'));
    await f.setRules({enabled:false});await assert.rejects(f.applyDamage(p,f.alice,{requestId}),err('HEALTH_DISABLED'));await f.stage('ARCHIVED');await assert.rejects(f.view(),err('FORBIDDEN'));
  });
}
