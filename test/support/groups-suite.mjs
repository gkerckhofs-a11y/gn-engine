import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createWorkflow,hash} from '../../src/core/workflow.mjs';
export function groupsSuite(makeStore,prefix='groupes') {
  const err=code=>({code});
  async function fixture(){
    const store=await makeStore(),suffix=randomUUID();let time=100000;
    const actor=name=>({uid:`${name}-${suffix}`,email:`${name}-${suffix}@example.invalid`,emailVerified:true,provider:'google.com',authTime:100});
    const owner=actor('owner'),alice=actor('alice'),bob=actor('bob'),eve=actor('eve'),reception=actor('reception');
    const w=createWorkflow({store,ownerEmail:owner.email,now:()=>time});
    const read=(action,who=owner,input={})=>w.dispatch(action,who,input);
    const command=(action,who=owner,input={})=>read(action,who,{requestId:randomUUID(),...input});
    const {id:scenarioId}=await command('createScenario',owner,{title:'Groupes isolés'});
    const characters=[];
    for(const [i,name] of ['Pilote','Mécano','Contact'].entries())characters.push((await command('saveCharacter',owner,{scenarioId,revision:i+1,displayName:name,publicationState:'PUBLISHED',playerSecrets:'PRIVE_PERSONNAGE',gmNotes:'VERITE_PERSONNAGE'})).id);
    const member=(i,permissions={},extra={})=>({characterId:characters[i],role:i===0?'Capitaine':'Membre',active:true,revealed:true,visibleToMembers:false,publicAffiliation:false,permissions,...extra});
    const baseGroup={name:'CELLULE_SECRETE',visibility:'SECRET',publicationState:'PUBLISHED',description:'Description discrète',briefing:'BRIEFING_PRIVE',gmNotes:'VERITE_GROUPE',
      members:[member(0,{readBriefing:true,readUpdates:true,publishUpdates:true}),member(1,{readBriefing:true,readUpdates:true}),member(2,{readUpdates:true},{revealed:false})]};
    const {id:groupId}=await command('saveGroup',owner,{scenarioId,revision:4,...baseGroup});
    const {id:versionId}=await command('publishScenario',owner,{scenarioId,revision:5});
    const {id:sessionId}=await command('createSession',owner,{scenarioId,versionId,title:'Session groupes',capacity:4,privacy:'Synthétique'});
    const session=(who=owner)=>read('session',who,{sessionId});
    const stage=async value=>command('setStage',owner,{sessionId,revision:(await session()).revision,stage:value});
    await command('setRegistrationOpen',owner,{sessionId,revision:1,open:true});
    for(const [i,who] of [alice,bob,eve].entries()){
      await command('register',who,{sessionId,name:'Participant de test'});
      await command('assign',owner,{sessionId,characterId:characters[i],uid:who.uid});
      const token=randomBytes(32).toString('base64url');await command('issueInvitation',owner,{sessionId,uid:who.uid,tokenHash:hash(token),hours:1});await read('redeem',who,{sessionId,token});
    }
    await stage('BRIEFING');
    const view=who=>read('mySession',who,{sessionId});
    const detail=(who=alice,extra={})=>read('myGroup',who,{sessionId,groupId,...extra});
    const edit=async patch=>{const s=await session();return command('saveSessionGroup',owner,{...s.groups.find(g=>g.id===groupId),sessionId,revision:s.revision,groupId,...patch,reason:'Ajustement de test'});};
    const post=(who=alice,extra={})=>command('publishGroupUpdate',who,{sessionId,groupId,title:'Signal',body:'Rumeur transmise',...extra});
    return {store,owner,alice,bob,eve,reception,read,command,scenarioId,versionId,sessionId,groupId,characters,member,baseGroup,session,stage,view,detail,edit,post,setTime:t=>time=t};
  }
  test(`${prefix} : affiliation secrète connue sans liste automatique ni fuite de vérité MJ`,async()=>{
    const f=await fixture(),a=await f.view(f.alice),e=await f.view(f.eve);
    assert.equal(a.groups.length,1);assert.equal(a.groups[0].name,'CELLULE_SECRETE');assert.deepEqual(e.groups,[]);
    const d=await f.detail();assert.equal(d.group.briefing,'BRIEFING_PRIVE');assert.equal('members' in d.group,false);
    for(const secret of ['VERITE_GROUPE','VERITE_PERSONNAGE',f.bob.email,f.eve.uid,'recipientIds','authorUid'])assert.equal(JSON.stringify(d).includes(secret),false,secret);
    await assert.rejects(f.detail(f.eve),err('FORBIDDEN'));await assert.rejects(f.detail(f.eve,{groupId:'unknown'}),err('FORBIDDEN'));
    const preview=await f.read('previewGroup',f.owner,{sessionId:f.sessionId,groupId:f.groupId,characterId:f.characters[0]});assert.deepEqual(preview.group,d.group);
    assert.deepEqual((await f.read('preview',f.owner,{sessionId:f.sessionId,characterId:f.characters[0]})).groups,a.groups);
  });
  test(`${prefix} : groupe public et secret coexistent, seule une affiliation explicitement publique figure au badge`,async()=>{
    const f=await fixture(),s=await f.session();
    const g=await f.command('saveSessionGroup',f.owner,{sessionId:f.sessionId,revision:s.revision,name:'Équipage visible',visibility:'PUBLIC',publicationState:'PUBLISHED',briefing:'AUTRE_SECRET',gmNotes:'AUTRE_VERITE',members:[f.member(0,{}, {publicAffiliation:true})],reason:'Créer équipage'});
    const badge=await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[0]});
    assert.deepEqual(badge.affiliations,[{name:'Équipage visible',description:'',role:'Capitaine'}]);
    assert.equal(JSON.stringify(badge).includes('SECRET'),false);assert.equal(JSON.stringify(badge).includes('VERITE'),false);
    assert.equal((await f.view(f.alice)).groups.length,2);
    const fresh=await f.session();await f.command('saveSessionGroup',f.owner,{...fresh.groups.find(x=>x.id===g.id),sessionId:f.sessionId,groupId:g.id,revision:fresh.revision,members:[f.member(0)],reason:'Cacher affiliation'});
    assert.deepEqual((await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[0]})).affiliations,[]);
  });
  test(`${prefix} : l’accueil ne reçoit aucune donnée de groupe et ne peut agir sur ses droits`,async()=>{
    const f=await fixture(),s=await f.session();await f.command('setStaff',f.owner,{sessionId:f.sessionId,revision:s.revision,email:f.reception.email,role:'RECEPTION',active:true,reason:'Accueil'});
    const r=await f.session(f.reception);for(const key of ['groups','groupsEnabled'])assert.equal(key in r,false);
    assert.equal(JSON.stringify(r).includes('CELLULE_SECRETE'),false);
    for(const action of ['groupHistory','previewGroup'])await assert.rejects(f.read(action,f.reception,{sessionId:f.sessionId,groupId:f.groupId,characterId:f.characters[0]}),err('FORBIDDEN'));
    for(const action of ['saveSessionGroup','setGroupModule'])await assert.rejects(f.command(action,f.reception,{sessionId:f.sessionId,revision:r.revision,groupId:f.groupId,enabled:false,...f.baseGroup,reason:'Escalade'}),err('FORBIDDEN'));
  });
  test(`${prefix} : versions et nouvelles sessions ne reprennent ni modifications ni messages d’une partie jouée`,async()=>{
    const f=await fixture();await f.stage('EN_JEU');await f.post();await f.edit({briefing:'MODIFICATION_SESSION'});
    await f.command('saveGroup',f.owner,{scenarioId:f.scenarioId,revision:5,groupId:f.groupId,...f.baseGroup,name:'MODIFICATION_MODELE'});
    const next=await f.command('createSession',f.owner,{scenarioId:f.scenarioId,versionId:f.versionId,title:'Nouvelle partie',capacity:4,privacy:'Test'});
    const s=await f.read('session',f.owner,{sessionId:next.id});assert.equal(s.groups[0].name,'CELLULE_SECRETE');assert.equal(s.groups[0].briefing,'BRIEFING_PRIVE');
    assert.equal((await f.store.list(`sessions/${next.id}/groups/${f.groupId}/updates`)).length,0);
    assert.equal((await f.store.list(`sessions/${next.id}/groups/${f.groupId}/inboxes/${f.characters[0]}/updates`)).length,0);
    assert.equal((await f.store.get(`scenarios/${f.scenarioId}/versions/${f.versionId}/groups/${f.groupId}`)).briefing,'BRIEFING_PRIVE');
  });
  test(`${prefix} : les quatre permissions sont indépendantes et ne viennent jamais du client`,async()=>{
    const f=await fixture();await f.edit({members:[f.member(0,{publishUpdates:true}),f.member(1,{readUpdates:true}),f.member(2,{readBriefing:true})]});await f.stage('EN_JEU');
    const a=(await f.detail()).group;for(const key of ['briefing','members','updates'])assert.equal(key in a,false);
    await f.post(f.alice,{authorName:'Identité falsifiée',authorUid:f.bob.uid});
    const b=(await f.detail(f.bob)).group;assert.equal(b.updates.length,1);assert.equal(b.updates[0].authorName,'Pilote');assert.equal('briefing' in b,false);
    await assert.rejects(f.post(f.bob,{permissions:{publishUpdates:true}}),err('FORBIDDEN'));
    const e=(await f.detail(f.eve)).group;assert.equal(e.briefing,'BRIEFING_PRIVE');assert.equal('updates' in e,false);
  });
  test(`${prefix} : la liste ne contient que les identités révélées, actives et publiées`,async()=>{
    const f=await fixture();await f.edit({members:[f.member(0,{readMembers:true}),f.member(1,{}, {visibleToMembers:true}),f.member(2,{}, {visibleToMembers:true,revealed:false})]});
    let d=await f.detail();assert.deepEqual(d.group.members,[{displayName:'Mécano',profession:'',role:'Membre'}]);
    assert.equal('memberCount' in d.group,false);assert.equal(JSON.stringify(d.group.members).includes(f.characters[1]),false);
    await f.edit({members:[f.member(0,{readMembers:true}),f.member(1,{}, {visibleToMembers:true,active:false}),f.member(2,{}, {visibleToMembers:true})]});
    const s=await f.session();await f.command('saveSessionCharacter',f.owner,{sessionId:f.sessionId,characterId:f.characters[2],revision:s.revision,displayName:'Contact',publicationState:'DRAFT',reason:'Masquer fiche'});
    assert.deepEqual((await f.detail()).group.members,[]);
  });
  test(`${prefix} : un nouveau membre reçoit les publications futures, sans récupérer automatiquement le passé`,async()=>{
    const f=await fixture();await f.stage('EN_JEU');await f.post(f.alice,{title:'Avant la rencontre'});
    await f.edit({members:[f.member(0,{readUpdates:true,publishUpdates:true}),f.member(1,{readUpdates:true}),f.member(2,{readUpdates:true})]});
    assert.deepEqual((await f.detail(f.eve)).group.updates,[]);
    f.setTime(101000);await f.post(f.alice,{title:'Après la rencontre'});
    assert.deepEqual((await f.detail(f.eve)).group.updates.map(x=>x.title),['Après la rencontre']);
    assert.deepEqual((await f.detail(f.bob)).group.updates.map(x=>x.title),['Après la rencontre','Avant la rencontre']);
  });
  test(`${prefix} : publication unique malgré un double envoi et ancienne référence non réutilisable`,async()=>{
    const f=await fixture();await f.stage('EN_JEU');const input={sessionId:f.sessionId,groupId:f.groupId,title:'Une fois',body:'Texte',requestId:randomUUID()};
    const [a,b]=await Promise.all([f.read('publishGroupUpdate',f.alice,input),f.read('publishGroupUpdate',f.alice,input)]);assert.deepEqual(a,b);
    assert.equal((await f.detail(f.bob)).group.updates.length,1);assert.equal((await f.store.list(`sessions/${f.sessionId}/groups/${f.groupId}/updates`)).length,1);
    await assert.rejects(f.read('publishGroupUpdate',f.alice,{...input,body:'Autre texte'}),err('REQUEST_ID_REUSED'));
    await f.stage('PAUSE');assert.deepEqual(await f.read('publishGroupUpdate',f.alice,input),a);await assert.rejects(f.post(),err('SESSION_NOT_RUNNING'));
  });
  test(`${prefix} : révocation de publication ou d’appartenance bloque même le réessai mémorisé`,async()=>{
    const f=await fixture();await f.stage('EN_JEU');const input={sessionId:f.sessionId,groupId:f.groupId,title:'Titre',body:'Texte',requestId:randomUUID()};await f.read('publishGroupUpdate',f.alice,input);
    await f.edit({members:[f.member(0,{readUpdates:true}),f.member(1,{readUpdates:true})]});
    await assert.rejects(f.read('publishGroupUpdate',f.alice,input),err('FORBIDDEN'));assert.equal((await f.detail()).group.updates.length,1);
    await f.edit({members:[f.member(0,{readUpdates:true,publishUpdates:true},{active:false}),f.member(1,{readUpdates:true})]});
    assert.deepEqual((await f.view(f.alice)).groups,[]);await assert.rejects(f.detail(),err('FORBIDDEN'));await assert.rejects(f.read('publishGroupUpdate',f.alice,input),err('FORBIDDEN'));
  });
  test(`${prefix} : module fermé, briefing et fin de jeu n’autorisent aucune nouvelle publication`,async()=>{
    const f=await fixture();await assert.rejects(f.post(),err('SESSION_NOT_RUNNING'));await f.stage('EN_JEU');await f.post();
    const s=await f.session();await f.command('setGroupModule',f.owner,{sessionId:f.sessionId,revision:s.revision,enabled:false,reason:'Fermer module'});
    assert.deepEqual((await f.view(f.alice)).groups,[]);await assert.rejects(f.detail(),err('MODULE_DISABLED'));await assert.rejects(f.post(),err('MODULE_DISABLED'));
    const next=await f.session();await f.command('setGroupModule',f.owner,{sessionId:f.sessionId,revision:next.revision,enabled:true,reason:'Rouvrir module'});
    assert.equal((await f.detail()).group.updates.length,1);await f.stage('FINISHED');await assert.rejects(f.post(),err('SESSION_NOT_RUNNING'));assert.equal((await f.detail()).group.updates.length,1);
    await f.stage('ARCHIVED');await assert.rejects(f.detail(),err('FORBIDDEN'));
  });
  test(`${prefix} : accès liés au personnage attribué, révocation joueur et session étrangère refusés`,async()=>{
    const f=await fixture();await assert.rejects(f.detail(f.eve,{characterId:f.characters[0]}),err('FORBIDDEN'));
    await f.command('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.alice.uid});await assert.rejects(f.detail(),err('FORBIDDEN'));
    const next=await f.command('createSession',f.owner,{scenarioId:f.scenarioId,versionId:f.versionId,title:'Autre session',capacity:4,privacy:'Test'});
    await assert.rejects(f.detail(f.bob,{sessionId:next.id}),err('FORBIDDEN'));
  });
  test(`${prefix} : références, doublons et affiliation secrète publique sont refusés sans modifier la session`,async()=>{
    const f=await fixture(),before=await f.session();
    await assert.rejects(f.edit({members:[f.member(0),f.member(0)]}),err('DUPLICATE_MEMBER'));
    await assert.rejects(f.edit({members:[f.member(0,{}, {characterId:'outside'})]}),err('INVALID_MEMBER'));
    await assert.rejects(f.edit({members:[f.member(0,{}, {publicAffiliation:true})]}),err('INVALID_PUBLIC_AFFILIATION'));
    await assert.rejects(f.edit({visibility:'PUBLIC',members:[f.member(0,{}, {publicAffiliation:true,revealed:false})]}),err('INVALID_PUBLIC_AFFILIATION'));
    assert.equal((await f.session()).revision,before.revision);
  });
  test(`${prefix} : modifications simultanées contrôlées et historique avant/après réservé aux MJ`,async()=>{
    const f=await fixture(),s=await f.session(),group=s.groups[0];
    const results=await Promise.allSettled(['A','B'].map(name=>f.command('saveSessionGroup',f.owner,{...group,sessionId:f.sessionId,revision:s.revision,groupId:f.groupId,name,reason:'Correction'})));
    assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');
    const history=await f.read('groupHistory',f.owner,{sessionId:f.sessionId,groupId:f.groupId});assert.equal(history.versions.length,2);
    assert.ok(history.versions.some(v=>v.before?.name==='CELLULE_SECRETE' && ['A','B'].includes(v.after.name) && v.actorEmail===f.owner.email));
    await assert.rejects(f.read('groupHistory',f.alice,{sessionId:f.sessionId,groupId:f.groupId}),err('FORBIDDEN'));
  });
  test(`${prefix} : groupe dépublié absent des lectures et identités non vérifiées refusées`,async()=>{
    const f=await fixture();await f.edit({publicationState:'DRAFT'});assert.deepEqual((await f.view(f.alice)).groups,[]);await assert.rejects(f.detail(),err('FORBIDDEN'));
    for(const who of [null,{...f.alice,emailVerified:false},{...f.alice,provider:'password'}])await assert.rejects(f.detail(who),err('LOGIN_REQUIRED'));
  });
  test(`${prefix} : fil borné aux 30 informations reçues les plus récentes`,async()=>{
    const f=await fixture();await f.store.runTransaction(async tx=>{for(let i=0;i<35;i++)tx.set(`sessions/${f.sessionId}/groups/${f.groupId}/inboxes/${f.characters[0]}/updates/u${i}`,{id:`u${i}`,at:i,title:`Titre ${i}`,body:'Texte',authorName:'Contact',gmNotes:'NE_PAS_TRANSMETTRE'});});
    const messages=(await f.detail()).group.updates;assert.equal(messages.length,30);assert.equal(messages[0].id,'u34');assert.equal(messages.at(-1).id,'u5');assert.equal(JSON.stringify(messages).includes('NE_PAS_TRANSMETTRE'),false);
  });
}
