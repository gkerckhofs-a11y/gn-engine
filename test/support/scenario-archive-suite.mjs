import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createWorkflow} from '../../src/core/workflow.mjs';
import {mediaHash} from '../../src/core/media-state.mjs';
import {archiveCommands} from '../../src/core/scenario-archives.mjs';
import {processImage} from '../../src/adapters/media-images.mjs';
import {MemoryImages,sampleImage} from './media-suite.mjs';
export async function archiveFixture(makeStore){
  const store=makeStore(),owner={uid:randomUUID(),email:'owner@example.invalid',emailVerified:true,provider:'google.com'},player={...owner,uid:randomUUID(),email:'player@example.invalid'},images=new MemoryImages();
  const workflow=createWorkflow({store,ownerEmail:owner.email,images,processImage}),read=(a,i={},who=owner)=>workflow.dispatch(a,who,i),cmd=(a,i={},who=owner)=>read(a,{requestId:randomUUID(),...i},who);
  const {id:scenarioId}=await cmd('createScenario',{title:'Archive secrète',summary:'Récit exportable'}),scenario=()=>read('scenario',{scenarioId});
  const ids=[];for(const name of ['Ariane','Basile'])ids.push((await cmd('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName:name,publicationState:'PUBLISHED',playerSecrets:`Secret ${name}`,gmNotes:'NOTE_MJ',objectives:[{id:'mission',title:'Mission privée',description:'Retrouver le contact',published:false}],relations:ids.length?[{id:'relation',targetId:ids[0],title:'Contact',description:'À reconnaître',published:true}]:[]})).id);
  const mutateScenario=async(a,input)=>cmd(a,{scenarioId,revision:(await scenario()).revision,...input});
  const image=await cmd('mediaUpload',{name:'VISUEL_PRIVÉ',data:await sampleImage(),category:'Personnage',credit:'Crédit de recette'});
  const {id:itemId}=await mutateScenario('saveItem',{name:'Trousse',kind:'STACKABLE',consumable:true,publicationState:'PUBLISHED'});
  const targets=[{scope:'scenario',scopeId:scenarioId,kind:'character',id:ids[0],slot:'portrait',mediaId:image.id},{scope:'scenario',scopeId:scenarioId,kind:'character',id:ids[1],slot:'private',mediaId:image.id},{scope:'scenario',scopeId:scenarioId,kind:'item',id:itemId,slot:'illustration',mediaId:image.id}],prepared=await read('prepareMediaAssignments',{targets});await cmd('assignMedia',{targets,confirmation:prepared.confirmation});
  let input={scenarioId,revision:(await scenario()).revision,characterId:ids[0],items:[{itemId,quantity:2}]},p=await read('prepareStartingInventory',input);await cmd('setStartingInventory',{...input,confirmation:p.confirmation});
  const {id:skillId}=await mutateScenario('saveSkill',{name:'Soin',kind:'ACTIVE_TARGET',publicationState:'PUBLISHED',healing:{effect:'HEAL_HP',amount:2,uses:3,cooldownSeconds:10,consumable:{itemId,quantity:1}}});
  const {id:classId}=await mutateScenario('saveClass',{name:'Médecin',publicationState:'PUBLISHED',skills:[{skillId,level:2}]});
  input={scenarioId,revision:(await scenario()).revision,characterId:ids[0],classId,overrides:[],published:true};p=await read('prepareAbilityProfile',input);await cmd('setAbilityProfile',{...input,confirmation:p.confirmation});
  const {id:groupId}=await mutateScenario('saveGroup',{name:'Cercle secret',visibility:'SECRET',publicationState:'PUBLISHED',briefing:'SECRET_GROUPE',members:[{characterId:ids[0],active:true,revealed:true,visibleToMembers:false,publicAffiliation:false,permissions:{readBriefing:true,readMembers:false,readUpdates:true,publishUpdates:false,payWallet:false,representMissions:true}}]});
  await mutateScenario('saveKnowledge',{title:'Indice privé',body:'SECRET_INDICE',kind:'CLUE',publicationState:'PUBLISHED',shareMode:'SHOW',qrAudience:'SELECTED',qrEnabled:true,initialCharacterIds:[ids[1]],qrCharacterIds:[ids[0]],gmTruth:'Vérité MJ'});
  await mutateScenario('saveScenarioEconomy',{rules:{enabled:true,name:'Crédits',unit:'cr'}});
  input={scenarioId,revision:(await scenario()).revision,groupId,label:'Caisse',amount:12};p=await read('prepareGroupWallet',input);await cmd('setGroupWallet',{...input,confirmation:p.confirmation});
  input={scenarioId,revision:(await scenario()).revision,characterId:ids[0],amount:8};p=await read('prepareStartingCredits',input);await cmd('setStartingCredits',{...input,confirmation:p.confirmation});
  await mutateScenario('saveScenarioHealth',{rules:{enabled:true,defaultMaxHp:10,returnMode:'MJ',allowed:{}}});
  async function exportPackage(extra={}){const {manifest}=await read('prepareScenarioExport',{scenarioId,...extra}),files=new Map();for(const a of manifest.images){const r=await read('mediaRead',{context:{mode:'library'},mediaId:a.id,variant:'original'}),b=Buffer.from(r.data,'base64');a.source.sha256=mediaHash(b);files.set(a.id,b);}return {manifest,files};}
  async function begin(bundle,title='Copie'){const input={manifest:bundle.manifest,title},p=await read('prepareScenarioImport',input);return cmd('beginScenarioImport',{...input,confirmation:p.confirmation});}
  const upload=(id,bundle,mediaId=image.id)=>read('scenarioImportImage',{importId:id,mediaId,data:bundle.files.get(mediaId).toString('base64')});
  return {store,owner,player,images,read,cmd,scenarioId,scenario,ids,itemId,skillId,classId,groupId,image,mutateScenario,exportPackage,begin,upload};
}
export function archiveSuite(makeStore,prefix='Archives de scénario'){
  test(`${prefix} : textes Unicode volumineux conservés à travers le stockage temporaire`,async()=>{
    const f=await archiveFixture(makeStore);for(let i=0;i<6;i++)await f.mutateScenario('saveCharacter',{displayName:`Unicode ${i}`,publicationState:'DRAFT',biography:'🧭'.repeat(9500)});
    const b=await f.exportPackage(),job=await f.begin(b);await f.upload(job.id,b);const result=await f.read('commitScenarioImport',{importId:job.id}),copy=await f.read('scenario',{scenarioId:result.id});for(const c of copy.characters.filter(c=>c.public.displayName.startsWith('Unicode')))assert.equal(c.biography,'🧭'.repeat(9500));assert.equal(copy.characters.length,8);
  });
  test(`${prefix} : export et import autonome, droits privés et sources binaires conservés`,async()=>{
    const f=await archiveFixture(makeStore),b=await f.exportPackage(),before=await f.scenario();assert.equal(b.manifest.images.length,1);assert.equal(JSON.stringify(b.manifest).includes(f.owner.uid),false);
    const job=await f.begin(b),a=await f.upload(job.id,b);assert.deepEqual(await f.upload(job.id,b),a);
    const result=await f.read('commitScenarioImport',{importId:job.id});assert.notEqual(result.id,f.scenarioId);assert.deepEqual(await f.read('commitScenarioImport',{importId:job.id}),result);
    const copy=await f.read('scenario',{scenarioId:result.id});assert.equal(copy.groups[0].visibility,'SECRET');assert.deepEqual(copy.groups[0].members,before.groups[0].members);assert.deepEqual(copy.groups[0].walletConfig,before.groups[0].walletConfig);assert.equal(copy.knowledge[0].shareMode,'SHOW');assert.deepEqual(copy.knowledge[0].initialCharacterIds,[f.ids[1]]);
    for(const original of before.characters){const c=copy.characters.find(c=>c.id===original.id);assert.equal(c.playerSecrets,original.playerSecrets);assert.deepEqual(c.relations,original.relations);assert.deepEqual(c.abilityProfile,original.abilityProfile);assert.deepEqual(c.startingCredits,original.startingCredits);}
    const c=copy.characters.find(c=>c.id===f.ids[0]);assert.equal(c.mediaImages.portrait.id,a.mediaId);assert.equal(c.startingInventory.items[0].item.mediaImages.illustration.id,a.mediaId);assert.notEqual(a.mediaId,f.image.id);
    const read=await f.read('mediaRead',{context:{mode:'library'},mediaId:a.mediaId,variant:'original'});assert.equal(read.data,b.files.get(f.image.id).toString('base64'));
    assert.equal((await f.store.get(`media/${a.mediaId}`)).usageCount,3);assert.deepEqual(await f.scenario(),before);
    await assert.rejects(f.read('scenario',{scenarioId:copy.id},f.player),{code:'FORBIDDEN'});await assert.rejects(f.read('mediaRead',{context:{mode:'library'},mediaId:a.mediaId},f.player),{code:'FORBIDDEN'});
    const version=await f.cmd('publishScenario',{scenarioId:copy.id,revision:copy.revision}),session=await f.cmd('createSession',{scenarioId:copy.id,versionId:version.id,title:'Nouvelle partie',capacity:2,privacy:'Recette'}),s=await f.read('session',{sessionId:session.id});assert.equal(s.registrations.length,0);assert.equal(s.stage,'PREPARATION');assert.ok(s.inventory.some(l=>l.item.mediaImages.illustration.id===a.mediaId));
  });
  test(`${prefix} : version figée exportée malgré les modifications du brouillon`,async()=>{
    const f=await archiveFixture(makeStore),v=await f.cmd('publishScenario',{scenarioId:f.scenarioId,revision:(await f.scenario()).revision});await f.mutateScenario('saveCharacter',{characterId:f.ids[0],displayName:'Modifié',publicationState:'DRAFT'});
    const b=await f.exportPackage({versionId:v.id});assert.equal(b.manifest.source.kind,'VERSION');assert.equal(b.manifest.records.characters.find(c=>c.id===f.ids[0]).public.displayName,'Ariane');const job=await f.begin(b);await f.upload(job.id,b);const r=await f.read('commitScenarioImport',{importId:job.id});assert.equal((await f.read('scenario',{scenarioId:r.id})).characters.find(c=>c.id===f.ids[0]).publicationState,'PUBLISHED');
  });
  test(`${prefix} : reprise après panne, réessais uniques et aucune création partielle`,async()=>{
    const f=await archiveFixture(makeStore),b=await f.exportPackage(),job=await f.begin(b),before=(await f.read('dashboard')).scenarios.length;await assert.rejects(f.read('commitScenarioImport',{importId:job.id}),{code:'SCENARIO_IMPORT_INCOMPLETE'});assert.equal((await f.read('dashboard')).scenarios.length,before);
    f.images.failAt=f.images.writes+2;await assert.rejects(f.upload(job.id,b),{code:'MEDIA_STORAGE_UNAVAILABLE'});assert.deepEqual((await f.read('scenarioImportStatus',{importId:job.id})).completed,[]);assert.ok((await f.read('listScenarioImports')).imports.some(x=>x.id===job.id));await f.upload(job.id,b);
    const results=await Promise.all([f.read('commitScenarioImport',{importId:job.id}),f.read('commitScenarioImport',{importId:job.id})]);assert.deepEqual(results[0],results[1]);assert.equal((await f.read('dashboard')).scenarios.length,before+1);
  });
  test(`${prefix} : fichiers altérés, références absentes et consentement modifié refusés`,async()=>{
    const f=await archiveFixture(makeStore),b=await f.exportPackage(),bad=structuredClone(b.manifest);bad.records.groups[0].members[0].characterId='absent';await assert.rejects(f.read('prepareScenarioImport',{manifest:bad,title:'Copie'}),{code:'INVALID_SCENARIO_PACKAGE'});
    const missing=structuredClone(b.manifest);missing.images=[];await assert.rejects(f.read('prepareScenarioImport',{manifest:missing,title:'Copie'}),{code:'INVALID_SCENARIO_PACKAGE'});
    const input={manifest:b.manifest,title:'Copie'},p=await f.read('prepareScenarioImport',input);await assert.rejects(f.cmd('beginScenarioImport',{...input,title:'Autre',confirmation:p.confirmation}),{code:'STALE_REVISION'});
    const job=await f.begin(b),bytes=Buffer.from(b.files.get(f.image.id));bytes[bytes.length-1]^=1;await assert.rejects(f.read('scenarioImportImage',{importId:job.id,mediaId:f.image.id,data:bytes.toString('base64')}),{code:'SCENARIO_FILE_MISMATCH'});assert.deepEqual((await f.read('scenarioImportStatus',{importId:job.id})).completed,[]);
  });
  test(`${prefix} : accès propriétaire obligatoire, même sur les réessais et identifiants connus`,async()=>{
    const f=await archiveFixture(makeStore),b=await f.exportPackage(),job=await f.begin(b);for(const action of archiveCommands){await assert.rejects(f.read(action,{scenarioId:f.scenarioId,importId:job.id},f.player),{code:'FORBIDDEN'});await assert.rejects(f.read(action,{},null),{code:'LOGIN_REQUIRED'});}
    const alien={...f.owner,uid:randomUUID()};await assert.rejects(f.read('scenarioImportStatus',{importId:job.id},alien),{code:'FORBIDDEN'});await assert.rejects(f.read('prepareScenarioExport',{scenarioId:f.scenarioId},alien),{code:'FORBIDDEN'});
    await f.upload(job.id,b);await f.read('cancelScenarioImport',{importId:job.id});await assert.rejects(f.read('commitScenarioImport',{importId:job.id}),{code:'SCENARIO_IMPORT_CLOSED'});assert.equal((await f.read('mediaCatalog')).total,2);
  });
  test(`${prefix} : fichiers manquants et suppression concurrente ne créent aucun lien cassé`,async()=>{
    const f=await archiveFixture(makeStore),b=await f.exportPackage(),job=await f.begin(b),asset=await f.upload(job.id,b),a=await f.store.get(`media/${asset.mediaId}`),path=a.variants.thumb.path,bytes=f.images.data.get(path);f.images.data.delete(path);await assert.rejects(f.read('commitScenarioImport',{importId:job.id}),{code:'MEDIA_MISSING'});f.images.data.set(path,bytes);
    const removal=await f.read('prepareMediaRemoval',{ids:[asset.mediaId]}),results=await Promise.allSettled([f.read('commitScenarioImport',{importId:job.id}),f.cmd('trashMedia',{ids:[asset.mediaId],confirmation:removal.confirmation})]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
    const state=await f.store.get(`media/${asset.mediaId}`);if(results[0].status==='fulfilled')assert.equal(state.status,'READY');else assert.equal(state.status,'TRASHED');
  });
}
