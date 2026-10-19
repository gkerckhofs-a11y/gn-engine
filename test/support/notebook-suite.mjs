import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createWorkflow,hash} from '../../src/core/workflow.mjs';
export function notebookSuite(makeStore,prefix='carnet'){
  const err=code=>({code});
  async function fixture(){
    const store=await makeStore(),suffix=randomUUID();let time=100000;
    const actor=name=>({uid:`${name}-${suffix}`,email:`${name}-${suffix}@example.invalid`,emailVerified:true,provider:'google.com',authTime:100});
    const owner=actor('owner'),alice=actor('alice'),bob=actor('bob'),eve=actor('eve'),staff=actor('staff');
    const workflow=createWorkflow({store,ownerEmail:owner.email,now:()=>time});
    const read=(action,who=owner,input={})=>workflow.dispatch(action,who,input);
    const cmd=(action,who=owner,input={})=>read(action,who,{requestId:randomUUID(),...input});
    const {id:scenarioId}=await cmd('createScenario',owner,{title:'Carnets isolés'}),characters=[];
    for(const [i,name] of ['Pilote','Mécano','Contact'].entries())characters.push((await cmd('saveCharacter',owner,{scenarioId,revision:i+1,displayName:name,publicationState:'PUBLISHED'})).id);
    const {id:versionId}=await cmd('publishScenario',owner,{scenarioId,revision:4});
    const sessionInput={scenarioId,versionId,title:'Session carnet',capacity:4,privacy:'Test synthétique'};
    const {id:sessionId}=await cmd('createSession',owner,sessionInput);
    const session=()=>read('session',owner,{sessionId});
    const stage=async stage=>cmd('setStage',owner,{sessionId,revision:(await session()).revision,stage});
    const activate=async(who,sid=sessionId)=>{const token=randomBytes(32).toString('base64url');await cmd('issueInvitation',owner,{sessionId:sid,uid:who.uid,tokenHash:hash(token),hours:1});await read('redeem',who,{sessionId:sid,token});};
    await cmd('setRegistrationOpen',owner,{sessionId,revision:1,open:true});
    for(const [i,who] of [alice,bob,eve].entries()){
      await cmd('register',who,{sessionId,name:'Participant synthétique'});await cmd('assign',owner,{sessionId,characterId:characters[i],uid:who.uid});await activate(who);
    }
    await stage('BRIEFING');
    const save=(who=alice,patch={})=>cmd('saveNote',who,{sessionId,revision:0,title:'TITRE_PRIVE',body:'TEXTE_NON_PARTAGE',...patch});
    const list=(who=alice,patch={})=>read('myNotes',who,{sessionId,...patch});
    const detail=(id,who=alice,patch={})=>read('noteDetail',who,{sessionId,noteId:id,...patch});
    const prepare=async(id,who=alice,recipientId=characters[1],patch={})=>{const d=await detail(id,who);return read('prepareNoteShare',who,{sessionId,noteId:id,revision:d.note.revision,authorCharacterId:d.character.id,authorName:d.character.displayName,recipientId,shareMode:'SHOW',...patch});};
    const shareInput=d=>({sessionId,noteId:d.note.id,revision:d.note.revision,authorCharacterId:d.author.id,authorName:d.author.displayName,recipientId:d.recipient.id,recipientVersion:d.recipientVersion,shareMode:d.shareMode});
    const share=(d,who=alice,patch={})=>cmd('shareNote',who,{...shareInput(d),...patch});
    return {store,read,cmd,owner,alice,bob,eve,staff,scenarioId,versionId,sessionInput,sessionId,characters,session,stage,activate,save,list,detail,prepare,share,shareInput,setTime:t=>time=t};
  }
  test(`${prefix} : notes et métadonnées réservées à leur auteur, jamais dans les aperçus ou journaux MJ`,async()=>{
    const f=await fixture(),n=await f.save();assert.equal((await f.detail(n.id)).note.body,'TEXTE_NON_PARTAGE');
    assert.deepEqual((await f.list(f.bob)).notes,[]);
    for(const who of [f.bob,f.eve,f.owner])for(const id of [n.id,'unknown'])await assert.rejects(f.detail(id,who,{uid:f.alice.uid,characterId:f.characters[0]}),err('FORBIDDEN'));
    for(const action of ['myNotes','noteDetail','saveNote','setNoteArchived','prepareNoteShare','shareNote'])await assert.rejects(f.cmd(action,null,{sessionId:f.sessionId,noteId:n.id}),err('LOGIN_REQUIRED'));
    const visible=[await f.session(),await f.read('preview',f.owner,{sessionId:f.sessionId,characterId:f.characters[0]}),await f.read('previewKnowledge',f.owner,{sessionId:f.sessionId,characterId:f.characters[0]}),await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[0]})];
    for(const secret of ['TITRE_PRIVE','TEXTE_NON_PARTAGE',n.id])assert.equal(JSON.stringify(visible).includes(secret),false,secret);
    const ops=await f.store.list('operations');assert.equal(JSON.stringify(ops).includes('TEXTE_NON_PARTAGE'),false);assert.equal(JSON.stringify(ops).includes('TITRE_PRIVE'),false);
  });
  test(`${prefix} : ni délégation MJ ni rôle Accueil ne donnent accès au carnet d’un participant`,async()=>{
    const f=await fixture(),n=await f.save();
    for(const role of ['MJ','RECEPTION']){
      await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role,active:true,reason:'Test carnet'});
      for(const action of ['myNotes','noteDetail','saveNote','prepareNoteShare'])await assert.rejects(f.cmd(action,f.staff,{sessionId:f.sessionId,noteId:n.id,uid:f.alice.uid,role:'OWNER'}),err('FORBIDDEN'));
      const view=await f.read('session',f.staff,{sessionId:f.sessionId});assert.equal(JSON.stringify(view).includes('TITRE_PRIVE'),false);
    }
  });
  test(`${prefix} : modifications concurrentes et doubles enregistrements sans perte silencieuse`,async()=>{
    const f=await fixture(),requestId=randomUUID();const pair=await Promise.all([f.save(f.alice,{requestId}),f.save(f.alice,{requestId})]);assert.deepEqual(pair[0],pair[1]);
    assert.equal((await f.list()).notes.length,1);const id=pair[0].id;
    const outcomes=await Promise.allSettled([f.save(f.alice,{noteId:id,revision:1,body:'A'}),f.save(f.alice,{noteId:id,revision:1,body:'B'})]);
    assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');
    assert.equal((await f.detail(id)).note.revision,2);await assert.rejects(f.save(f.alice,{requestId,title:'Autre titre'}),err('REQUEST_ID_REUSED'));
  });
  test(`${prefix} : classement réversible, texte conservé et partage fermé tant que la note est classée`,async()=>{
    const f=await fixture(),n=await f.save();await f.stage('EN_JEU');const prepared=await f.prepare(n.id);await f.share(prepared);
    await f.cmd('setNoteArchived',f.alice,{sessionId:f.sessionId,noteId:n.id,revision:1,archived:true});
    assert.equal((await f.detail(n.id)).note.body,'TEXTE_NON_PARTAGE');assert.equal((await f.list()).notes[0].archived,true);
    await assert.rejects(f.save(f.alice,{noteId:n.id,revision:2}),err('NOTE_ARCHIVED'));await assert.rejects(f.share(prepared),err('NOTE_ARCHIVED'));
    await f.cmd('setNoteArchived',f.alice,{sessionId:f.sessionId,noteId:n.id,revision:2,archived:false});assert.equal((await f.detail(n.id)).note.archived,false);
  });
  test(`${prefix} : la réattribution du personnage ne transfère pas le carnet au nouveau joueur`,async()=>{
    const f=await fixture(),n=await f.save();
    await f.cmd('assign',f.owner,{sessionId:f.sessionId,uid:f.eve.uid,characterId:f.characters[0],replace:true});await f.activate(f.eve);
    assert.deepEqual((await f.list(f.eve)).notes,[]);await assert.rejects(f.detail(n.id,f.eve),err('FORBIDDEN'));await assert.rejects(f.list(),err('FORBIDDEN'));
    await f.cmd('assign',f.owner,{sessionId:f.sessionId,uid:f.alice.uid,characterId:f.characters[2]});await f.activate(f.alice);
    assert.equal((await f.detail(n.id)).note.body,'TEXTE_NON_PARTAGE');assert.equal((await f.detail(n.id)).character.id,f.characters[2]);
  });
  test(`${prefix} : même compte dans une nouvelle session sans carnet ni copie hérités`,async()=>{
    const f=await fixture(),n=await f.save();await f.stage('EN_JEU');await f.share(await f.prepare(n.id));
    const {id:sid}=await f.cmd('createSession',f.owner,f.sessionInput);await f.cmd('setRegistrationOpen',f.owner,{sessionId:sid,revision:1,open:true});
    await f.cmd('register',f.alice,{sessionId:sid,name:'Autre session'});await f.cmd('assign',f.owner,{sessionId:sid,uid:f.alice.uid,characterId:f.characters[0]});await f.activate(f.alice,sid);
    const s=await f.read('session',f.owner,{sessionId:sid});await f.cmd('setStage',f.owner,{sessionId:sid,revision:s.revision,stage:'BRIEFING'});
    assert.deepEqual((await f.list(f.alice,{sessionId:sid})).notes,[]);assert.deepEqual((await f.read('myKnowledge',f.alice,{sessionId:sid})).items,[]);
    await assert.rejects(f.detail(n.id,f.alice,{sessionId:sid}),err('FORBIDDEN'));
  });
  test(`${prefix} : préparation sans effet, copie précise et aucune révélation des autres notes`,async()=>{
    const f=await fixture(),n=await f.save(),other=await f.save(f.alice,{title:'AUTRE_NOTE_SECRETE',body:'AUTRE_CONTENU_PRIVE'});await f.stage('EN_JEU');
    const prepared=await f.prepare(n.id);assert.equal(prepared.note.body,'TEXTE_NON_PARTAGE');assert.equal(prepared.recipient.displayName,'Mécano');assert.deepEqual((await f.session()).knowledge,[]);
    const shared=await f.share(prepared),received=await f.read('knowledgeDetail',f.bob,{sessionId:f.sessionId,knowledgeId:shared.id});
    assert.equal(received.knowledge.body,'TEXTE_NON_PARTAGE');assert.equal(received.knowledge.sourceName,'Pilote');assert.equal(received.knowledge.canCopy,false);
    const mj=await f.session();assert.equal(mj.knowledge.length,1);assert.equal(mj.knowledge[0].body,'TEXTE_NON_PARTAGE');
    for(const secret of ['AUTRE_NOTE_SECRETE','AUTRE_CONTENU_PRIVE',other.id,n.id,f.alice.email])assert.equal(JSON.stringify([received,mj.knowledge]).includes(secret),false,secret);
    const author=await f.detail(n.id);assert.equal(author.shares.length,1);assert.equal(author.note.revision,1);assert.equal(author.shares[0].knowledgeId,shared.id);
    assert.equal((await f.read('myKnowledge',f.alice,{sessionId:f.sessionId})).items.length,1);
  });
  test(`${prefix} : copie figée malgré modification privée ou correction du catalogue MJ`,async()=>{
    const f=await fixture(),n=await f.save();await f.stage('EN_JEU');const p=await f.prepare(n.id),shared=await f.share(p);
    const s=await f.session(),k=s.knowledge[0];await f.cmd('saveSessionKnowledge',f.owner,{...k,sessionId:f.sessionId,knowledgeId:k.id,revision:s.revision,body:'CATALOGUE_MJ_MODIFIE',reason:'Correction'});
    await f.share(await f.prepare(n.id,f.alice,f.characters[2]));assert.equal((await f.read('knowledgeDetail',f.eve,{sessionId:f.sessionId,knowledgeId:shared.id})).knowledge.body,'TEXTE_NON_PARTAGE');
    await f.save(f.alice,{noteId:n.id,revision:1,body:'NOUVELLE_NOTE_PRIVEE'});assert.equal(JSON.stringify(await f.session()).includes('NOUVELLE_NOTE_PRIVEE'),false);
    assert.equal((await f.read('knowledgeDetail',f.bob,{sessionId:f.sessionId,knowledgeId:shared.id})).knowledge.body,'TEXTE_NON_PARTAGE');
    const newer=await f.share(await f.prepare(n.id));assert.notEqual(newer.id,shared.id);assert.equal((await f.read('knowledgeDetail',f.bob,{sessionId:f.sessionId,knowledgeId:newer.id})).knowledge.body,'NOUVELLE_NOTE_PRIVEE');
  });
  test(`${prefix} : doubles partages sans doublons ni remise à zéro de la lecture`,async()=>{
    const f=await fixture(),n=await f.save();await f.stage('EN_JEU');const p=await f.prepare(n.id),requestId=randomUUID();
    const shared=await Promise.all([f.share(p,f.alice,{requestId}),f.share(p,f.alice,{requestId}),f.share(p)]);assert.deepEqual(shared[0],shared[1]);assert.deepEqual(shared[0],shared[2]);
    assert.equal((await f.detail(n.id)).shares.length,1);assert.equal((await f.session()).knowledge.length,1);
    await f.cmd('markKnowledgeRead',f.bob,{sessionId:f.sessionId,knowledgeId:shared[0].id,receiptRevision:1});await f.share(p);
    assert.equal((await f.read('knowledgeDetail',f.bob,{sessionId:f.sessionId,knowledgeId:shared[0].id})).knowledge.readAt,100000);
    const other=await f.prepare(n.id,f.alice,f.characters[2]);await assert.rejects(f.share(other,f.alice,{requestId}),err('REQUEST_ID_REUSED'));
  });
  test(`${prefix} : version affichée et identité de l’auteur figées avant confirmation`,async()=>{
    const f=await fixture(),n=await f.save();await f.stage('EN_JEU');const p=await f.prepare(n.id);
    await f.save(f.alice,{noteId:n.id,revision:1,body:'VERSION_2'});await assert.rejects(f.share(p),err('STALE_REVISION'));assert.deepEqual((await f.session()).knowledge,[]);
    const p2=await f.prepare(n.id),s=await f.session(),c=s.characters[0];
    await f.cmd('saveSessionCharacter',f.owner,{sessionId:f.sessionId,characterId:c.id,revision:s.revision,displayName:'Nouvel alias',publicationState:'PUBLISHED',reason:'Alias changé'});
    await assert.rejects(f.share(p2),err('STALE_REVISION'));
  });
  test(`${prefix} : un destinataire réattribué doit être confirmé à nouveau`,async()=>{
    const f=await fixture(),n=await f.save();await f.stage('EN_JEU');const p=await f.prepare(n.id);
    await f.cmd('assign',f.owner,{sessionId:f.sessionId,uid:f.eve.uid,characterId:f.characters[1],replace:true});await f.activate(f.eve);
    await assert.rejects(f.share(p),err('STALE_RECIPIENT'));assert.deepEqual((await f.session()).knowledge,[]);
    await f.share(await f.prepare(n.id));assert.equal((await f.read('myKnowledge',f.eve,{sessionId:f.sessionId})).items.length,1);
  });
  test(`${prefix} : révocations contrôlées avant les réessais et absence de copie forcée`,async()=>{
    const f=await fixture(),n=await f.save();await f.stage('EN_JEU');const p=await f.prepare(n.id),requestId=randomUUID(),shared=await f.share(p,f.alice,{requestId});
    await f.cmd('grantKnowledge',f.owner,{sessionId:f.sessionId,knowledgeId:shared.id,knowledgeRevision:1,characterId:f.characters[1],grantRevision:1,enabled:false,reason:'Retirer la copie'});
    await assert.rejects(f.share(p,f.alice,{requestId}),err('FORBIDDEN'));
    await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.alice.uid});await assert.rejects(f.detail(n.id),err('FORBIDDEN'));await assert.rejects(f.share(p),err('FORBIDDEN'));
    f.alice.authTime=101;await f.activate(f.alice);await f.detail(n.id);await assert.rejects(f.detail(n.id,{...f.alice,authTime:100}),err('FORBIDDEN'));
  });
  test(`${prefix} : notes disponibles en pause et fin, nouvelles transmissions seulement en jeu`,async()=>{
    const f=await fixture(),n=await f.save();await assert.rejects(f.prepare(n.id),err('SESSION_NOT_RUNNING'));
    await f.stage('EN_JEU');const p=await f.prepare(n.id);await f.stage('PAUSE');await f.save(f.alice,{noteId:n.id,revision:1,body:'Notes en pause'});
    await assert.rejects(f.prepare(n.id),err('SESSION_NOT_RUNNING'));await f.stage('FINISHED');await f.save(f.alice,{noteId:n.id,revision:2,body:'Debrief personnel'});await f.detail(n.id);
    await f.stage('ARCHIVED');await assert.rejects(f.list(),err('FORBIDDEN'));await assert.rejects(f.share(p),err('FORBIDDEN'));
  });
  test(`${prefix} : transmission ultérieure uniquement si autorisée, entrée vierge et références invalides refusées`,async()=>{
    const f=await fixture();await assert.rejects(f.save(f.alice,{title:''}),err('INVALID_NOTE'));await assert.rejects(f.save(f.alice,{body:'x'.repeat(20001)}),err('INVALID_NOTE'));
    const n=await f.save();await f.stage('EN_JEU');await assert.rejects(f.prepare(n.id,f.alice,f.characters[0]),err('INVALID_RECIPIENT'));await assert.rejects(f.prepare(n.id,f.alice,'foreign-character'),err('INVALID_RECIPIENT'));
    const p=await f.prepare(n.id),shared=await f.share(p);await assert.rejects(f.cmd('shareKnowledge',f.bob,{sessionId:f.sessionId,knowledgeId:shared.id,recipientId:f.characters[2],receiptRevision:1}),err('SHARING_DISABLED'));
    const allowed=await f.share(await f.prepare(n.id,f.alice,f.characters[1],{shareMode:'COPY'}));
    await f.cmd('shareKnowledge',f.bob,{sessionId:f.sessionId,knowledgeId:allowed.id,recipientId:f.characters[2],receiptRevision:1});assert.equal((await f.read('myKnowledge',f.eve,{sessionId:f.sessionId})).items.length,1);
    await assert.rejects(f.detail(n.id,{...f.alice,provider:'password'}),err('LOGIN_REQUIRED'));
    const empty=await f.save(f.alice,{title:'Brouillon',body:''});const emptyPreview=await f.prepare(empty.id);await assert.rejects(f.share(emptyPreview),err('INVALID_NOTE'));
  });
}
