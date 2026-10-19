import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createWorkflow,hash} from '../../src/core/workflow.mjs';
export function knowledgeSuite(makeStore,prefix='connaissances'){
  const err=code=>({code});
  async function fixture(){
    const store=await makeStore(),suffix=randomUUID();let time=100000;
    const actor=name=>({uid:`${name}-${suffix}`,email:`${name}-${suffix}@example.invalid`,emailVerified:true,provider:'google.com',authTime:100});
    const owner=actor('owner'),alice=actor('alice'),bob=actor('bob'),eve=actor('eve'),staff=actor('staff');
    const w=createWorkflow({store,ownerEmail:owner.email,now:()=>time});
    const read=(action,who=owner,input={})=>w.dispatch(action,who,input);
    const command=(action,who=owner,input={})=>read(action,who,{requestId:randomUUID(),...input});
    const {id:scenarioId}=await command('createScenario',owner,{title:'Fragments indépendants'});
    const characters=[];
    for(const [i,displayName] of ['Pilote','Mécano','Contact'].entries())characters.push((await command('saveCharacter',owner,{scenarioId,revision:i+1,displayName,publicationState:'PUBLISHED',gmNotes:'VERITE_PERSONNAGE'})).id);
    const definition={title:'FRAGMENT_A',body:'Rumeur non certifiée',origin:'Un témoin anonyme',kind:'CLUE',publicationState:'PUBLISHED',gmTruth:'VERITE_MJ_INVISIBLE',gmNotes:'NOTE_MJ_INVISIBLE',shareMode:'COPY',initialCharacterIds:[characters[0]],qrEnabled:false,qrAudience:'SELECTED',qrCharacterIds:[]};
    const {id:kid}=await command('saveKnowledge',owner,{scenarioId,revision:4,...definition});
    const {id:otherId}=await command('saveKnowledge',owner,{scenarioId,revision:5,...definition,title:'FRAGMENT_B_INCONNU',initialCharacterIds:[characters[1]]});
    const {id:qrId}=await command('saveKnowledge',owner,{scenarioId,revision:6,...definition,title:'INDICE_QR_CACHE',initialCharacterIds:[],qrEnabled:true,qrCharacterIds:[characters[1]]});
    const {id:versionId}=await command('publishScenario',owner,{scenarioId,revision:7});
    const sessionInput={scenarioId,versionId,title:'Session connaissances',capacity:4,privacy:'Synthétique'};
    const {id:sessionId}=await command('createSession',owner,sessionInput);
    const session=(who=owner)=>read('session',who,{sessionId});
    const stage=async value=>command('setStage',owner,{sessionId,revision:(await session()).revision,stage:value});
    await command('setRegistrationOpen',owner,{sessionId,revision:1,open:true});
    for(const [i,who] of [alice,bob,eve].entries()){
      await command('register',who,{sessionId,name:'Participant de test'});
      await command('assign',owner,{sessionId,characterId:characters[i],uid:who.uid});
      const token=randomBytes(32).toString('base64url');await command('issueInvitation',owner,{sessionId,uid:who.uid,tokenHash:hash(token),hours:1});await read('redeem',who,{sessionId,token});
    }
    await stage('BRIEFING');
    const list=(who=alice)=>read('myKnowledge',who,{sessionId});
    const detail=(who=alice,id=kid)=>read('knowledgeDetail',who,{sessionId,knowledgeId:id});
    const edit=async(patch={},id=kid)=>{const s=await session();return command('saveSessionKnowledge',owner,{...s.knowledge.find(k=>k.id===id),...patch,sessionId,knowledgeId:id,revision:s.revision,reason:'Correction de test'});};
    const grant=async(cid,enabled=true,id=kid,patch={})=>{const k=(await session()).knowledge.find(k=>k.id===id),r=await store.get(`sessions/${sessionId}/characters/${cid}/knowledge/${id}`);return command('grantKnowledge',owner,{sessionId,knowledgeId:id,characterId:cid,knowledgeRevision:k.revision,grantRevision:r?.grantRevision??0,enabled,reason:'Révélation ciblée',...patch});};
    const share=(who=alice,recipientId=characters[1],patch={})=>command('shareKnowledge',who,{sessionId,knowledgeId:kid,recipientId,...patch});
    const discover=(who=bob,patch={})=>command('discoverKnowledge',who,{sessionId,knowledgeId:qrId,...patch});
    return {store,owner,alice,bob,eve,staff,read,command,scenarioId,versionId,sessionId,kid,otherId,qrId,characters,definition,sessionInput,session,stage,list,detail,edit,grant,share,discover,setTime:t=>time=t};
  }
  test(`${prefix} : fragments distincts, vérité MJ absente et aperçu identique sans effet`,async()=>{
    const f=await fixture(),a=await f.list(),e=await f.list(f.eve),d=await f.detail();
    assert.deepEqual(a.items.map(k=>k.title),['FRAGMENT_A']);assert.deepEqual(e.items,[]);
    assert.equal(d.knowledge.body,'Rumeur non certifiée');
    const preview=await f.read('previewKnowledgeDetail',f.owner,{sessionId:f.sessionId,characterId:f.characters[0],knowledgeId:f.kid});assert.deepEqual(preview.knowledge,d.knowledge);
    assert.equal((await f.detail()).knowledge.readAt,null);
    for(const secret of ['VERITE_MJ','NOTE_MJ','FRAGMENT_B','INDICE_QR','qrCharacterIds','initialCharacterIds','gmTruth',f.bob.email,f.bob.uid])assert.equal(JSON.stringify([a,d]).includes(secret),false,secret);
    for(const kid of [f.kid,'unknown'])await assert.rejects(f.detail(f.eve,kid),err('FORBIDDEN'));
    for(const [action,input] of [['publicBadge',{characterId:f.characters[0]}],['publicSession',{}]]){
      const result=await f.read(action,null,{sessionId:f.sessionId,...input});assert.equal(JSON.stringify(result).includes('FRAGMENT'),false);
    }
  });
  test(`${prefix} : copie explicite, origine visible et absence de liste automatique de destinataires`,async()=>{
    const f=await fixture();await f.stage('EN_JEU');
    const preview=await f.read('prepareKnowledgeShare',f.alice,{sessionId:f.sessionId,knowledgeId:f.kid,recipientId:f.characters[2]});
    assert.deepEqual(preview,{recipient:{id:f.characters[2],displayName:'Contact'},knowledge:{id:f.kid,title:'FRAGMENT_A'},authorName:'Pilote'});
    await f.share(f.alice,f.characters[2]);assert.equal((await f.detail(f.eve)).knowledge.body,'Rumeur non certifiée');
    assert.equal((await f.detail(f.eve)).knowledge.sourceName,'Pilote');assert.equal((await f.detail(f.eve)).knowledge.source,'SHARED');
    assert.equal((await f.list()).items.length,1);assert.equal((await f.list(f.eve)).items.length,1);
    assert.equal((await f.list(f.bob)).items.length,1);assert.equal(JSON.stringify(await f.list(f.eve)).includes('FRAGMENT_B'),false);
    assert.equal(JSON.stringify(await f.detail(f.eve)).includes(f.alice.email),false);
  });
  test(`${prefix} : QR soumis à accès personnel, sélection explicite, session et phase`,async()=>{
    const f=await fixture();await assert.rejects(f.discover(),err('SESSION_NOT_RUNNING'));await f.stage('EN_JEU');
    await assert.rejects(f.discover(null),err('LOGIN_REQUIRED'));await assert.rejects(f.discover(f.alice,{characterId:f.characters[1]}),err('FORBIDDEN'));
    await assert.rejects(f.discover({...f.bob,provider:'password'}),err('LOGIN_REQUIRED'));
    await assert.rejects(f.discover(f.bob,{sessionId:'other-session'}),err('FORBIDDEN'));
    await f.discover();assert.equal((await f.detail(f.bob,f.qrId)).knowledge.source,'QR');
    await f.edit({qrAudience:'ALL_PLAYERS'},f.qrId);await f.discover(f.eve);assert.equal((await f.list(f.eve)).items.length,1);
    await f.edit({qrEnabled:false},f.qrId);await assert.rejects(f.discover(),err('FORBIDDEN'));
  });
  test(`${prefix} : doubles découvertes et copies atomiques, réessai stable sans remplacement`,async()=>{
    const f=await fixture();await f.stage('EN_JEU');const requestId=randomUUID();
    const a=await Promise.all([f.discover(f.bob,{requestId}),f.discover(f.bob,{requestId}),f.discover()]);assert.deepEqual(a[0],a[1]);
    assert.equal((await f.list(f.bob)).items.length,2);
    const shareId=randomUUID();await Promise.all([f.share(f.alice,f.characters[2],{requestId:shareId}),f.share(f.alice,f.characters[2],{requestId:shareId})]);
    assert.equal((await f.list(f.eve)).items.length,1);
    await assert.rejects(f.share(f.alice,f.characters[1],{requestId:shareId}),err('REQUEST_ID_REUSED'));
    const audit=await f.store.list(`sessions/${f.sessionId}/audit`);assert.equal(audit.filter(a=>a.action==='discoverKnowledge'&&a.created).length,1);assert.equal(audit.filter(a=>a.action==='shareKnowledge'&&a.created).length,1);
  });
  test(`${prefix} : copie interdite et retrait des permissions contrôlés avant le résultat mémorisé`,async()=>{
    const f=await fixture();await f.stage('EN_JEU');const requestId=randomUUID();await f.share(f.alice,f.characters[2],{requestId});
    await f.edit({shareMode:'SHOW'});await assert.rejects(f.share(f.alice,f.characters[2],{requestId}),err('SHARING_DISABLED'));
    await assert.rejects(f.read('prepareKnowledgeShare',f.alice,{sessionId:f.sessionId,knowledgeId:f.kid,recipientId:f.characters[1]}),err('SHARING_DISABLED'));
    assert.equal((await f.detail()).knowledge.canCopy,false);
    await f.edit({shareMode:'COPY'});await f.command('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.alice.uid});
    await assert.rejects(f.share(f.alice,f.characters[2],{requestId}),err('FORBIDDEN'));
  });
  test(`${prefix} : retrait ciblé bloque lecture, QR et nouvelles copies jusqu’à réattribution MJ`,async()=>{
    const f=await fixture();await f.stage('EN_JEU');const requestId=randomUUID();await f.discover(f.bob,{requestId});
    await f.grant(f.characters[1],false,f.qrId);
    await assert.rejects(f.discover(f.bob,{requestId}),err('FORBIDDEN'));await assert.rejects(f.discover(),err('FORBIDDEN'));
    await assert.rejects(f.detail(f.bob,f.qrId),err('FORBIDDEN'));await f.grant(f.characters[1],true,f.qrId);await f.detail(f.bob,f.qrId);
    await f.share();await f.grant(f.characters[1],false);await assert.rejects(f.share(),err('FORBIDDEN'));
    await f.grant(f.characters[1]);await f.detail(f.bob);
    const history=await f.read('knowledgeHistory',f.owner,{sessionId:f.sessionId,knowledgeId:f.kid});
    assert.equal(history.versions.filter(v=>v.type==='grant').length,2);assert.equal(history.versions[0].reason,'Révélation ciblée');
  });
  test(`${prefix} : édition sans réécriture rétroactive, copie fidèle au texte reçu et réattribution explicite`,async()=>{
    const f=await fixture();await f.stage('EN_JEU');await f.edit({body:'TEXTE_MODIFIE',gmTruth:'AUTRE_VERITE'});
    assert.equal((await f.detail()).knowledge.body,'Rumeur non certifiée');await f.share();assert.equal((await f.detail(f.bob)).knowledge.body,'Rumeur non certifiée');
    await f.grant(f.characters[1]);assert.equal((await f.detail(f.bob)).knowledge.body,'TEXTE_MODIFIE');
    await f.share();assert.equal((await f.detail(f.bob)).knowledge.body,'TEXTE_MODIFIE');
    await f.share(f.bob,f.characters[2]);assert.equal((await f.detail(f.eve)).knowledge.body,'TEXTE_MODIFIE');
    assert.equal(JSON.stringify(await f.detail(f.eve)).includes('AUTRE_VERITE'),false);
  });
  test(`${prefix} : dépublication masque même le titre sans altérer les reçus`,async()=>{
    const f=await fixture();await f.edit({publicationState:'DRAFT'});assert.deepEqual((await f.list()).items,[]);
    await assert.rejects(f.detail(),err('FORBIDDEN'));await f.edit({publicationState:'PUBLISHED'});assert.equal((await f.list()).items.length,1);
    await f.stage('EN_JEU');await f.edit({publicationState:'READY'},f.qrId);await assert.rejects(f.discover(),err('FORBIDDEN'));
  });
  test(`${prefix} : réception et comptes non délégués ne lisent aucun contenu ni historique`,async()=>{
    const f=await fixture();await f.command('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Accueil'});
    const reception=await f.session(f.staff);assert.equal('knowledge' in reception,false);assert.equal(JSON.stringify(reception).includes('FRAGMENT'),false);
    for(const action of ['knowledgeHistory','knowledgeRecipients','previewKnowledge','previewKnowledgeDetail'])await assert.rejects(f.read(action,f.staff,{sessionId:f.sessionId,characterId:f.characters[0],knowledgeId:f.kid}),err('FORBIDDEN'));
    await assert.rejects(f.command('saveSessionKnowledge',f.staff,{sessionId:f.sessionId}),err('FORBIDDEN'));
    await assert.rejects(f.command('grantKnowledge',f.eve,{sessionId:f.sessionId,characterId:f.characters[2],knowledgeId:f.kid,enabled:true,role:'MJ'}),err('FORBIDDEN'));
    await assert.rejects(f.read('previewKnowledge',f.eve,{sessionId:f.sessionId,characterId:f.characters[0]}),err('FORBIDDEN'));
  });
  test(`${prefix} : modèle figé et nouvelle session sans acquisitions de la partie précédente`,async()=>{
    const f=await fixture();await f.stage('EN_JEU');await f.share();await f.discover();await f.edit({body:'MODIF_SESSION'});
    await f.command('saveKnowledge',f.owner,{scenarioId:f.scenarioId,revision:7,knowledgeId:f.kid,...f.definition,body:'MODIF_MODELE'});
    const {id:sid}=await f.command('createSession',f.owner,f.sessionInput);
    const k=await f.store.get(`sessions/${sid}/knowledge/${f.kid}`);assert.equal(k.body,'Rumeur non certifiée');assert.equal(k.revision,1);
    assert.equal(await f.store.get(`sessions/${sid}/characters/${f.characters[1]}/knowledge/${f.kid}`),null);
    assert.equal(await f.store.get(`sessions/${sid}/characters/${f.characters[1]}/knowledge/${f.qrId}`),null);
    assert.equal((await f.store.get(`sessions/${sid}/characters/${f.characters[0]}/knowledge/${f.kid}`)).readAt,null);
  });
  test(`${prefix} : état de lecture personnel, aperçu neutre et lectures maintenues en pause puis fin`,async()=>{
    const f=await fixture();await f.stage('EN_JEU');await f.share();await f.command('markKnowledgeRead',f.alice,{sessionId:f.sessionId,knowledgeId:f.kid});
    assert.equal((await f.detail()).knowledge.readAt,100000);assert.equal((await f.detail(f.bob)).knowledge.readAt,null);
    await f.stage('PAUSE');await f.detail();await assert.rejects(f.share(f.alice,f.characters[2]),err('SESSION_NOT_RUNNING'));await assert.rejects(f.discover(),err('SESSION_NOT_RUNNING'));
    await f.stage('FINISHED');await f.detail();await f.command('markKnowledgeRead',f.bob,{sessionId:f.sessionId,knowledgeId:f.kid});
    await f.stage('ARCHIVED');await assert.rejects(f.detail(),err('FORBIDDEN'));await assert.rejects(f.list(),err('FORBIDDEN'));
  });
  test(`${prefix} : références invalides, modes non pris en charge et conflits ne produisent aucune écriture partielle`,async()=>{
    const f=await fixture(),before=await f.session();
    for(const patch of [{qrCharacterIds:['another-session-character']},{qrCharacterIds:[f.characters[0],f.characters[0]]},{shareMode:'UNIQUE'},{body:''}]){
      await assert.rejects(f.edit(patch));assert.equal((await f.session()).revision,before.revision);
    }
    const input={...before.knowledge.find(k=>k.id===f.kid),sessionId:f.sessionId,knowledgeId:f.kid,revision:before.revision,reason:'Concurrence'};
    const results=await Promise.allSettled([f.command('saveSessionKnowledge',f.owner,{...input,body:'A'}),f.command('saveSessionKnowledge',f.owner,{...input,body:'B'})]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'STALE_REVISION');
    const k=(await f.session()).knowledge.find(k=>k.id===f.kid);
    const grant={sessionId:f.sessionId,knowledgeId:f.kid,characterId:f.characters[2],knowledgeRevision:k.revision,grantRevision:0,enabled:true,reason:'Révélation concurrente'};
    const outcomes=await Promise.allSettled([f.command('grantKnowledge',f.owner,grant),f.command('grantKnowledge',f.owner,grant)]);
    assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.find(r=>r.status==='rejected').reason.code,'STALE_REVISION');
  });
  test(`${prefix} : destinataire actif de la même session, aucune auto-copie ni substitution par requête`,async()=>{
    const f=await fixture();await f.stage('EN_JEU');
    for(const cid of [f.characters[0],'unknown'])await assert.rejects(f.share(f.alice,cid),err('INVALID_RECIPIENT'));
    await f.command('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.bob.uid});await assert.rejects(f.share(),err('INVALID_RECIPIENT'));
    await assert.rejects(f.read('knowledgeDetail',f.eve,{sessionId:f.sessionId,knowledgeId:f.kid,characterId:f.characters[0],uid:f.alice.uid}),err('FORBIDDEN'));
    const path=`sessions/${f.sessionId}/registrations/${hash(f.alice.uid)}`;
    await f.store.runTransaction(async tx=>{const r=await tx.get(path);tx.set(path,{...r,minAuthTime:101});});
    await assert.rejects(f.detail(),err('FORBIDDEN'));
    await f.detail({...f.alice,authTime:101});
  });
  test(`${prefix} : MJ délégué autorisé, réessai interdit immédiatement après révocation`,async()=>{
    const f=await fixture();await f.command('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:true,reason:'Délégation MJ'});
    const k=(await f.session()).knowledge.find(k=>k.id===f.kid),input={sessionId:f.sessionId,knowledgeId:f.kid,characterId:f.characters[2],knowledgeRevision:k.revision,grantRevision:0,enabled:true,reason:'Révélation par MJ',requestId:randomUUID()};
    await f.read('grantKnowledge',f.staff,input);assert.equal((await f.list(f.eve)).items.length,1);
    await f.command('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:false,reason:'Fin de délégation'});
    await assert.rejects(f.read('grantKnowledge',f.staff,input),err('FORBIDDEN'));
  });
  test(`${prefix} : les brouillons ne donnent aucun reçu initial et une autorisation de copie ne réécrit pas un ancien reçu`,async()=>{
    const f=await fixture();
    const draft=await f.command('saveKnowledge',f.owner,{...f.definition,scenarioId:f.scenarioId,revision:7,title:'BROUILLON_INITIAL',publicationState:'DRAFT'});
    const version=await f.command('publishScenario',f.owner,{scenarioId:f.scenarioId,revision:8});
    const next=await f.command('createSession',f.owner,{...f.sessionInput,versionId:version.id});
    assert.equal(await f.store.get(`sessions/${next.id}/characters/${f.characters[0]}/knowledge/${draft.id}`),null);
    await f.edit({shareMode:'SHOW'});await f.grant(f.characters[1]);
    await f.edit({shareMode:'COPY'});assert.equal((await f.detail(f.bob)).knowledge.canCopy,false);
    await f.stage('EN_JEU');await assert.rejects(f.share(f.bob,f.characters[2]),err('SHARING_DISABLED'));
  });

}
