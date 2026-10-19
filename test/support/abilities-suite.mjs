import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createWorkflow,hash} from '../../src/core/workflow.mjs';

export function abilitiesSuite(makeStore,prefix='compétences'){
  const err=code=>({code});
  async function fixture(){
    const store=await makeStore(),suffix=randomUUID();let time=100000;
    const actor=name=>({uid:`${name}-${suffix}`,email:`${name}-${suffix}@example.invalid`,emailVerified:true,provider:'google.com',authTime:100});
    const owner=actor('owner'),alice=actor('alice'),bob=actor('bob'),staff=actor('staff');
    const workflow=createWorkflow({store,ownerEmail:owner.email,now:()=>time});
    const read=(action,who=owner,input={})=>workflow.dispatch(action,who,input);
    const cmd=(action,who=owner,input={})=>read(action,who,{requestId:randomUUID(),...input});
    const {id:scenarioId}=await cmd('createScenario',owner,{title:'Expertises isolées'});
    const scenario=()=>read('scenario',owner,{scenarioId});
    const characters=[];
    for(const name of ['Archiviste','Pilote'])characters.push((await cmd('saveCharacter',owner,{scenarioId,revision:(await scenario()).revision,displayName:name,profession:'Couverture',publicationState:'PUBLISHED'})).id);
    const skills=[];
    for(const name of ['Déchiffrement','Langue ancienne'])skills.push((await cmd('saveSkill',owner,{scenarioId,revision:(await scenario()).revision,name,description:'Texte joueur',instructions:'Lire les signes',category:'Savoirs',kind:'PASSIVE',publicationState:'PUBLISHED',gmNotes:'SECRET_MODELE_MJ'})).id);
    const {id:classId}=await cmd('saveClass',owner,{scenarioId,revision:(await scenario()).revision,name:'Scribe',description:'Profil de scribe',gmNotes:'SECRET_CLASSE_MJ',publicationState:'PUBLISHED',skills:[{skillId:skills[0],level:2}]});
    let sessionId;
    const session=()=>read('session',owner,{sessionId});
    const prepare=async(patch={},scope='session',who=owner)=>{
      const context=scope==='session'?await session():await scenario();
      const input={[scope==='session'?'sessionId':'scenarioId']:context.id,revision:context.revision,characterId:characters[0],classId,overrides:[],published:true,reason:'Profil de test',...patch};
      return {input,result:await read('prepareAbilityProfile',who,input)};
    };
    const confirm=(p,who=owner,patch={})=>cmd('setAbilityProfile',who,{...p.input,confirmation:p.result.confirmation,...patch});
    const apply=async(patch={},scope='session',who=owner)=>confirm(await prepare(patch,scope,who),who);
    await apply({},'scenario');
    const {id:versionId}=await cmd('publishScenario',owner,{scenarioId,revision:(await scenario()).revision});
    const sessionInput={scenarioId,versionId,title:'Session expertises',capacity:2,privacy:'Test isolé'};
    ({id:sessionId}=await cmd('createSession',owner,sessionInput));
    const stage=async value=>cmd('setStage',owner,{sessionId,revision:(await session()).revision,stage:value});
    const activate=async who=>{const token=randomBytes(32).toString('base64url');await cmd('issueInvitation',owner,{sessionId,uid:who.uid,tokenHash:hash(token),hours:1});await read('redeem',who,{sessionId,token});};
    await cmd('setRegistrationOpen',owner,{sessionId,revision:1,open:true});
    for(const [i,who] of [alice,bob].entries()){
      await cmd('register',who,{sessionId,name:'Participant fictif'});await cmd('assign',owner,{sessionId,uid:who.uid,characterId:characters[i]});await activate(who);
    }
    await stage('BRIEFING');
    const view=(who=alice)=>read('mySession',who,{sessionId});
    const saveSkill=async(patch={},scope='session',who=owner)=>{
      const context=scope==='session'?await session():await scenario(),old=context.skills.find(s=>s.id===(patch.id??skills[0]));
      return cmd(scope==='session'?'saveSessionSkill':'saveSkill',who,{...old,...patch,[scope==='session'?'sessionId':'scenarioId']:context.id,revision:context.revision,reason:'Correction du catalogue'});
    };
    const knowledge=async(patch={})=>cmd('saveSessionKnowledge',owner,{sessionId,revision:(await session()).revision,title:'CIBLE_SECRETE',body:'TEXTE_DECOUVERT',kind:'CLUE',publicationState:'PUBLISHED',shareMode:'COPY',qrEnabled:true,qrAudience:'ALL_PLAYERS',qrSkillId:skills[0],qrSkillLevel:2,reason:'Découverte de test',...patch});
    const discover=(id,who=alice,patch={})=>cmd('discoverKnowledge',who,{sessionId,knowledgeId:id,...patch});
    return {store,read,cmd,owner,alice,bob,staff,scenarioId,sessionId,characters,skills,classId,versionId,sessionInput,scenario,session,prepare,confirm,apply,stage,activate,view,saveSkill,knowledge,discover,setTime:v=>time=v};
  }
  test(`${prefix} : préparation sans effet, classe et exceptions individuelles après confirmation`,async()=>{
    const f=await fixture(),before=await f.view();
    const p=await f.prepare({overrides:[{skillId:f.skills[0],level:0},{skillId:f.skills[1],level:3}]});
    assert.deepEqual(await f.view(),before);assert.equal(p.result.after.skills.length,1);assert.equal(p.result.after.skills[0].name,'Langue ancienne');
    await f.confirm(p);const c=(await f.view()).character;
    assert.equal(c.abilities.skills[0].level,3);assert.equal(c.abilities.className,'Scribe');assert.equal(c.profession,'Couverture');
    assert.equal(c.contentRevision,before.character.contentRevision+1);
  });
  test(`${prefix} : catalogues, versions et sessions indépendants des profils déjà attribués`,async()=>{
    const f=await fixture();await f.saveSkill({name:'MODIF_MODELE'},'scenario');
    assert.equal((await f.scenario()).characters.find(c=>c.id===f.characters[0]).abilityProfile.skills[0].name,'Déchiffrement');
    await f.saveSkill({name:'MODIF_SESSION'});assert.equal((await f.view()).character.abilities.skills[0].name,'Déchiffrement');
    const {id:sid}=await f.cmd('createSession',f.owner,f.sessionInput),other=await f.read('session',f.owner,{sessionId:sid});
    assert.equal(other.skills.find(s=>s.id===f.skills[0]).name,'Déchiffrement');
    await f.apply();assert.equal((await f.view()).character.abilities.skills[0].name,'MODIF_SESSION');
    assert.equal(other.characters.find(c=>c.id===f.characters[0]).abilityProfile.skills[0].name,'Déchiffrement');
  });
  test(`${prefix} : duplication d’une classe sans liaison aux futures modifications de l’original`,async()=>{
    const f=await fixture(),s=await f.scenario(),original=s.classes.find(c=>c.id===f.classId);
    const copy=await f.cmd('saveClass',f.owner,{...original,id:undefined,scenarioId:f.scenarioId,revision:s.revision,name:'Copie indépendante'});
    await f.cmd('saveClass',f.owner,{...original,scenarioId:f.scenarioId,revision:(await f.scenario()).revision,skills:[{skillId:f.skills[0],level:4}]});
    const copied=(await f.scenario()).classes.find(c=>c.id===copy.id);assert.equal(copied.skills[0].level,2);assert.notEqual(copy.id,f.classId);
  });
  test(`${prefix} : publication contrôlée, projections joueur et aperçu sans notes MJ ni choix internes`,async()=>{
    const f=await fixture();const own=await f.view(),preview=await f.read('preview',f.owner,{sessionId:f.sessionId,characterId:f.characters[0]});
    assert.deepEqual(own.character.abilities,preview.character.abilities);
    for(const key of ['SECRET_MODELE_MJ','SECRET_CLASSE_MJ','overrides','choices'])assert.equal(JSON.stringify(own).includes(key),false);
    assert.equal((await f.view(f.bob)).character.abilities,null);
    const badge=await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[0]});assert.equal(JSON.stringify(badge).includes('Scribe'),false);assert.equal('abilities' in badge,false);
    await f.apply({published:false});assert.equal((await f.view()).character.abilities,null);
    const k=await f.knowledge();await f.stage('EN_JEU');await assert.rejects(f.discover(k.id),err('FORBIDDEN'));
  });
  test(`${prefix} : rôle Accueil, joueurs et autres sessions refusés ; révocation avant résultat mémorisé`,async()=>{
    const f=await fixture();
    await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Test'});
    const reception=await f.read('session',f.staff,{sessionId:f.sessionId});
    for(const key of ['skills','classes'])assert.equal(key in reception,false);assert.equal(JSON.stringify(reception).includes('Scribe'),false);
    for(const who of [f.alice,f.staff]){
      await assert.rejects(f.prepare({},'session',who),err('FORBIDDEN'));
      await assert.rejects(f.saveSkill({},'session',who),err('FORBIDDEN'));
      await assert.rejects(f.read('abilityHistory',who,{sessionId:f.sessionId,kind:'characters',id:f.characters[0]}),err('FORBIDDEN'));
    }
    await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:true,reason:'Test MJ'});
    const p=await f.prepare({},'session',f.staff),requestId=randomUUID();await f.confirm(p,f.staff,{requestId});
    await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:false,reason:'Révoquer'});
    await assert.rejects(f.confirm(p,f.staff,{requestId}),err('FORBIDDEN'));
    await assert.rejects(f.prepare({},'scenario',f.staff),err('FORBIDDEN'));
    for(const action of ['saveSkill','saveClass','prepareAbilityProfile','setAbilityProfile','abilityHistory'])await assert.rejects(f.cmd(action,null,{}),err('LOGIN_REQUIRED'));
  });
  test(`${prefix} : double confirmation unique, révisions concurrentes et texte changé imposant une nouvelle préparation`,async()=>{
    const f=await fixture(),p=await f.prepare(),requestId=randomUUID();
    const pair=await Promise.all([f.confirm(p,f.owner,{requestId}),f.confirm(p,f.owner,{requestId})]);assert.deepEqual(pair[0],pair[1]);
    const history=await f.read('abilityHistory',f.owner,{sessionId:f.sessionId,kind:'characters',id:f.characters[0]});assert.equal(history.versions.length,1);
    await assert.rejects(f.confirm(p,f.owner,{requestId,published:false}),err('REQUEST_ID_REUSED'));
    const first=await f.prepare(),second=await f.prepare({overrides:[{skillId:f.skills[0],level:4}]});
    const races=await Promise.allSettled([f.confirm(first),f.confirm(second)]);assert.equal(races.filter(x=>x.status==='fulfilled').length,1);assert.equal(races.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');
    const stale=await f.prepare();await f.saveSkill({instructions:'AUTRES_CONSIGNES'});
    await assert.rejects(f.confirm(stale),err('STALE_REVISION'));
    await assert.rejects(f.confirm(stale,f.owner,{revision:(await f.session()).revision}),err('STALE_REVISION'));
  });
  test(`${prefix} : rejeter règles actives, niveaux invalides, doublons et références étrangères sans écriture`,async()=>{
    const f=await fixture(),s=await f.session();
    await assert.rejects(f.saveSkill({kind:'ACTIVE_TARGET'}),err('UNSUPPORTED_ABILITY'));
    for(const level of [-1,1.5,Number.MAX_SAFE_INTEGER+1,'2'])await assert.rejects(f.prepare({overrides:[{skillId:f.skills[0],level}]}),err('INVALID_ABILITY'));
    await assert.rejects(f.prepare({overrides:[{skillId:f.skills[0],level:1},{skillId:f.skills[0],level:2}]}),err('DUPLICATE_ABILITY'));
    await assert.rejects(f.prepare({overrides:[{skillId:'foreign',level:1}]}),err('INVALID_ABILITY_REFERENCE'));
    await assert.rejects(f.knowledge({qrSkillId:'foreign'}),err('INVALID_ABILITY_REFERENCE'));
    assert.equal((await f.session()).revision,s.revision);
    await f.saveSkill({publicationState:'DRAFT'});await assert.rejects(f.prepare(),err('ABILITY_UNPUBLISHED'));
    assert.equal((await f.view()).character.abilities.skills[0].name,'Déchiffrement');
  });
  test(`${prefix} : seuil QR, refus sans fuite et impossibilité de forger son niveau ou son personnage`,async()=>{
    const f=await fixture(),k=await f.knowledge();await f.stage('EN_JEU');
    await assert.rejects(f.discover(k.id,f.bob,{characterId:f.characters[0],uid:f.alice.uid,abilities:{skills:[{id:f.skills[0],level:99}]}}),err('FORBIDDEN'));
    assert.deepEqual((await f.read('myKnowledge',f.bob,{sessionId:f.sessionId})).items,[]);
    await f.apply({overrides:[{skillId:f.skills[0],level:1}]});await assert.rejects(f.discover(k.id),err('FORBIDDEN'));
    await f.apply({overrides:[{skillId:f.skills[0],level:2}]});await f.discover(k.id);
    const detail=await f.read('knowledgeDetail',f.alice,{sessionId:f.sessionId,knowledgeId:k.id});assert.equal(detail.knowledge.body,'TEXTE_DECOUVERT');
    assert.equal('qrSkillId' in detail.knowledge,false);
  });
  test(`${prefix} : retrait du savoir ferme les découvertes et leurs réessais, sans effacer le texte acquis ni empêcher une copie autorisée`,async()=>{
    const f=await fixture(),k=await f.knowledge();await f.stage('EN_JEU');const requestId=randomUUID();await f.discover(k.id,f.alice,{requestId});
    await f.apply({classId:null,overrides:[]});await assert.rejects(f.discover(k.id,f.alice,{requestId}),err('FORBIDDEN'));
    const acquired=await f.read('knowledgeDetail',f.alice,{sessionId:f.sessionId,knowledgeId:k.id});assert.equal(acquired.knowledge.body,'TEXTE_DECOUVERT');
    await f.cmd('shareKnowledge',f.alice,{sessionId:f.sessionId,knowledgeId:k.id,recipientId:f.characters[1],receiptRevision:acquired.knowledge.receiptRevision});
    assert.equal((await f.read('knowledgeDetail',f.bob,{sessionId:f.sessionId,knowledgeId:k.id})).knowledge.body,'TEXTE_DECOUVERT');
  });
  test(`${prefix} : condition de compétence ajoutée aux destinataires, aux phases et à la publication de la fiche`,async()=>{
    const f=await fixture(),k=await f.knowledge({qrAudience:'SELECTED',qrCharacterIds:[f.characters[1]]});await f.stage('EN_JEU');await assert.rejects(f.discover(k.id),err('FORBIDDEN'));
    const open=await f.knowledge();await f.stage('PAUSE');await assert.rejects(f.discover(open.id),err('SESSION_NOT_RUNNING'));await f.stage('EN_JEU');
    const s=await f.session(),c=s.characters.find(c=>c.id===f.characters[0]);
    await f.cmd('saveSessionCharacter',f.owner,{sessionId:f.sessionId,characterId:c.id,revision:s.revision,displayName:c.public.displayName,publicationState:'DRAFT',reason:'Masquer'});
    await assert.rejects(f.discover(open.id),err('CONTENT_UNPUBLISHED'));
    await f.stage('FINISHED');await f.stage('ARCHIVED');await assert.rejects(f.prepare(),err('SESSION_CLOSED'));await assert.rejects(f.saveSkill(),err('SESSION_CLOSED'));
  });
  test(`${prefix} : compétences rattachées au personnage lors d’une réattribution et corrections absentes de la prochaine session`,async()=>{
    const f=await fixture();await f.apply({overrides:[{skillId:f.skills[0],level:7}]});
    await f.cmd('assign',f.owner,{sessionId:f.sessionId,uid:f.bob.uid,characterId:f.characters[0],replace:true});await f.activate(f.bob);
    assert.equal((await f.view()).character,null);assert.equal((await f.view(f.bob)).character.abilities.skills[0].level,7);
    const {id:sid}=await f.cmd('createSession',f.owner,f.sessionInput),s=await f.read('session',f.owner,{sessionId:sid});assert.equal(s.characters.find(c=>c.id===f.characters[0]).abilityProfile.skills[0].level,2);
  });
  test(`${prefix} : historique de profil, versions publiées et lecture du briefing à reconfirmer`,async()=>{
    const f=await fixture();await f.cmd('confirmBriefing',f.alice,{sessionId:f.sessionId});const old=await f.view();
    await f.apply({overrides:[{skillId:f.skills[0],level:5}],reason:'Expertise augmentée'});const next=await f.view();
    assert.equal(next.registration.briefingReadRevision,old.character.contentRevision);assert.notEqual(next.registration.briefingReadRevision,next.character.contentRevision);
    const h=await f.read('abilityHistory',f.owner,{sessionId:f.sessionId,kind:'characters',id:f.characters[0]});assert.equal(h.versions[0].before.skills[0].level,2);assert.equal(h.versions[0].after.skills[0].level,5);assert.equal(h.versions[0].reason,'Expertise augmentée');
    const published=await f.read('characterHistory',f.owner,{sessionId:f.sessionId,characterId:f.characters[0]});assert.equal(published.versions.find(v=>v.revision===next.character.contentRevision).character.abilities.skills[0].level,5);
  });
  test(`${prefix} : anciennes cibles sans expertise compatibles et sauvegarde sans nouveau champ préservant une restriction`,async()=>{
    const f=await fixture(),open=await f.knowledge({qrSkillId:null});await f.stage('EN_JEU');await f.discover(open.id,f.bob);
    const locked=await f.knowledge(),s=await f.session(),k=s.knowledge.find(k=>k.id===locked.id);delete k.qrSkillId;delete k.qrSkillLevel;
    await f.cmd('saveSessionKnowledge',f.owner,{...k,sessionId:f.sessionId,knowledgeId:k.id,revision:s.revision,reason:'Ancien formulaire'});
    await assert.rejects(f.discover(k.id,f.bob),err('FORBIDDEN'));
  });
}
