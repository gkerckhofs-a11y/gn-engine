import {masterWorkspaceSuite} from './master-workspace-suite.mjs';
import {masterCustomsSuite} from './master-customs-suite.mjs';
import {masterNavigationSuite} from './master-navigation-suite.mjs';
import {masterEconomicsSuite} from './master-economics-suite.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createWorkflow} from '../../src/core/workflow.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {masterLogisticsSuite} from './master-logistics-suite.mjs';

import {masterExample,terrainMasterExample,terrainSessionMasterExample} from '../../src/shared/master-examples.mjs';
export {masterExample};
export async function masterFixture(makeStore){
 const store=await makeStore(),uid=randomUUID(),owner={uid,email:`${uid}@test.invalid`,emailVerified:true,provider:'google.com',authTime:1},player={...owner,uid:randomUUID(),email:'player@test.invalid'};
 const workflow=createWorkflow({store,ownerEmail:owner.email}),read=(a,input={},actor=owner)=>workflow.dispatch(a,actor,input),cmd=(a,input={},actor=owner)=>read(a,{requestId:randomUUID(),...input},actor);
 const scenarioId=(await cmd('createScenario',{title:'Master test'})).id;
 const prepare=(sheets,extra={})=>read('prepareMasterImport',{scenarioId,sheets,reason:'Import de test',...extra});
 const apply=async(sheets,extra={})=>{const input={scenarioId,sheets,reason:'Import de test',...extra},p=await read('prepareMasterImport',input);assert.deepEqual(p.errors,[]);return cmd('applyMasterImport',{...input,confirmation:p.confirmation});};
 const session=async()=>{const s=await read('scenario',{scenarioId}),versionId=(await cmd('publishScenario',{scenarioId,revision:s.revision})).id;const input={scenarioId,versionId,title:'Épisode test',campaignTitle:'Campagne test',capacity:60,privacy:'Notice test'},p=await read('prepareCampaignStart',input);return cmd('startCampaign',{...input,confirmation:p.confirmation});};
 return {store,owner,player,read,cmd,scenarioId,prepare,apply,session};
}
export function mastersSuite(makeStore,prefix='Masters'){
 masterWorkspaceSuite(()=>masterFixture(makeStore),prefix);
 masterCustomsSuite(()=>masterFixture(makeStore),prefix);
 masterEconomicsSuite(()=>masterFixture(makeStore),prefix);
 masterNavigationSuite(()=>masterFixture(makeStore),prefix);
 masterLogisticsSuite(()=>masterFixture(makeStore),prefix);
 test(`${prefix} : terrain et interactions complets, aperçus sans écriture et états initiaux uniques`,async()=>{
  const f=await masterFixture(makeStore),sheets=terrainMasterExample(),p=await f.prepare(sheets);assert.deepEqual(p.errors,[]);assert.ok(p.changes.some(c=>c.sheet==='Recompenses'));assert.equal((await f.store.list(`scenarios/${f.scenarioId}/fieldTargets`)).length,0);
  await f.apply(sheets);const s=await f.session(),base=`sessions/${s.id}`;
  const target=await f.store.get(`${base}/fieldTargets/cache`),state=await f.store.get(`${base}/fieldStates/cache`),profiles=await f.store.list(`${base}/personProfiles`);
  assert.equal(target.dependencyId,'generateur');assert.deepEqual(target.profiles.SEARCH.durationByLevel,{'2':30});assert.deepEqual(state.stock,{'cache-kit':3,'cache-credits':2,'cache-indice':1});assert.equal(profiles.length,5);assert.equal(profiles.find(p=>p.id==='clinique-rapide').test,'D6');assert.deepEqual(profiles.find(p=>p.id==='clinique-sure').extraConsumables,[{itemId:'bacta',quantity:1}]);assert.equal((await f.store.get(`${base}/items/outil`)).pillable,true);
  const sessionSheets={...sheets,Meta:[{format:'gn-engine-master',version:'1',type:'SESSION',campaign_id:s.campaignId}]};delete sessionSheets.Parametres;assert.equal((await f.apply(sessionSheets,{scenarioId:undefined,sessionId:s.id})).unchanged,true);assert.deepEqual(await f.store.get(`${base}/fieldStates/cache`),state);
 });
 test(`${prefix} : ajout de cache en session, stock acquis conservé et règles modifiables`,async()=>{
  const f=await masterFixture(makeStore);await f.apply(terrainMasterExample());const s=await f.session(),base=`sessions/${s.id}`,extra={scenarioId:undefined,sessionId:s.id},sheets=terrainSessionMasterExample();sheets.Meta[0].campaign_id=s.campaignId;
  await f.apply(sheets,extra);assert.equal((await f.store.get(`${base}/fieldStates/cache-episode`)).stock['reserve-episode'],2);
  // A prior episode may have exhausted this stock before this preparation phase.
  const state={...await f.store.get(`${base}/fieldStates/cache`),stock:{'cache-kit':0,'cache-credits':1,'cache-indice':0},claims:{pilote:{'cache-kit':1}},status:'OFFLINE',offlineUntilGameMs:120000,revision:9};await f.store.runTransaction(async tx=>tx.set(`${base}/fieldStates/cache`,state));
  await f.apply({Meta:sheets.Meta,Lieux:[{id:'cache',operation:'MODIFIER',version:'2',titre:'Cache renommée',installation_id:'!EFFACER'}],ActionsTerrain:[{id:'fouille-cache',operation:'MODIFIER',version:'2',lieu_id:'cache',type:'SEARCH',duree_secondes:'90',bonus_objets:'!EFFACER'}]},extra);
  assert.deepEqual(await f.store.get(`${base}/fieldStates/cache`),state);assert.equal((await f.store.get(`${base}/fieldTargets/cache`)).profiles.SEARCH.durationSeconds,90);
  assert.equal((await f.apply(sheets,extra)).unchanged,true);assert.equal((await f.store.get(`${base}/fieldStates/cache-episode`)).stock['reserve-episode'],2);
 });
 test(`${prefix} : récompenses existantes protégées, aucune réinitialisation ni changement de type`,async()=>{
  const f=await masterFixture(makeStore);await f.apply(terrainMasterExample());const s=await f.session(),Meta=[{format:'gn-engine-master',version:'1',type:'SESSION',campaign_id:s.campaignId}],extra={scenarioId:undefined,sessionId:s.id};
  for(const patch of [{Recompenses:[{id:'cache-kit',operation:'MODIFIER',version:'2',lieu_id:'cache',stock_initial:'999'}]},{Recompenses:[{id:'cache-kit',operation:'ARCHIVER',version:'2',lieu_id:'cache'}]},{Recompenses:[{id:'extra-credit',operation:'CREER',version:'1',lieu_id:'cache',type:'CREDITS',quantite:'10',stock_initial:'1',limite_personnage:'1'}]},{Lieux:[{id:'cache',operation:'MODIFIER',version:'2',type:'INSTALLATION'}]}])assert.equal((await f.prepare({Meta,...patch},extra)).canApply,false);
  assert.equal((await f.store.get(`sessions/${s.id}/fieldStates/cache`)).stock['cache-kit'],3);
 });
 test(`${prefix} : références de terrain et interactions localisées, aucune publication partielle`,async()=>{
  const f=await masterFixture(makeStore);
  for(const mutate of [s=>s.ActionsTerrain[0].competence_id='absente',s=>s.Recompenses[0].objet_id='absent',s=>s.Lieux[1].installation_id='absente',s=>s.Interactions[0].competence_id='medecine',s=>s.Interactions[2].consommables_supplementaires='absent:1',s=>s.Objets[0].publication='DRAFT',s=>s.ActionsTerrain[0].bonus_objets='outil:3']){
   const sheets=terrainMasterExample();mutate(sheets);const p=await f.prepare(sheets);assert.equal(p.canApply,false);assert.ok(p.errors.some(e=>['Lieux','ActionsTerrain','Recompenses','Interactions'].includes(e.sheet)));await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,sheets,reason:'Test',confirmation:p.confirmation}),{code:'INVALID_MASTER'});
  }
  assert.equal((await f.store.list(`scenarios/${f.scenarioId}/items`)).length,0);
 });
 test(`${prefix} : identités des lignes filles, doublons, durées et consommables contrôlés`,async()=>{
  const f=await masterFixture(makeStore);
  for(const mutate of [s=>s.ActionsTerrain.push({...s.ActionsTerrain[0],id:'doublon'}),s=>s.ActionsTerrain[0].durees_niveaux='2:30;2:60',s=>s.Interactions[2].prerequis='secours:2;secours:1',s=>s.Interactions[2].consommables_supplementaires='bacta:1;kit:1',s=>s.Interactions[0].recuperation_secondes='600',s=>s.ActionsTerrain[0].duree_secondes='',s=>s.Recompenses[0].stock_initial='',s=>s.Recompenses[0].connaissance_id='secret',s=>s.ActionsTerrain[0].cout_pa='-1']){
   const sheets=terrainMasterExample();mutate(sheets);assert.equal((await f.prepare(sheets)).canApply,false);
  }
  await f.apply(terrainMasterExample());const Meta=masterExample().Meta;
  assert.equal((await f.prepare({Meta,ActionsTerrain:[{id:'fouille-cache',operation:'MODIFIER',version:'2',lieu_id:'generateur',type:'SEARCH',duree_secondes:'5'}]})).canApply,false);
  assert.equal((await f.prepare({Meta,Recompenses:[{id:'cache-kit',operation:'MODIFIER',version:'2',lieu_id:'generateur',quantite:'1'}]})).canApply,false);
 });
 test(`${prefix} : dépendance d’installation, archivage explicite et anciennes cellules préservées`,async()=>{
  const f=await masterFixture(makeStore);await f.apply(terrainMasterExample());const Meta=masterExample().Meta;
  assert.equal((await f.prepare({Meta,Lieux:[{id:'generateur',operation:'ARCHIVER',version:'2'}]})).canApply,false);
  assert.equal((await f.prepare({Meta,ActionsTerrain:[{id:'fouille-cache',operation:'ARCHIVER',version:'2',lieu_id:'cache',type:'SEARCH'}]})).canApply,false);
  await f.apply({Meta,Lieux:[{id:'cache',operation:'MODIFIER',version:'2',titre:'',installation_id:'!EFFACER'},{id:'generateur',operation:'ARCHIVER',version:'2'}],Recompenses:[{id:'cache-kit',operation:'MODIFIER',version:'2',lieu_id:'cache',quantite:'2'},{id:'cache-indice',operation:'ARCHIVER',version:'2',lieu_id:'cache'}],Interactions:[{id:'clinique-sure',operation:'MODIFIER',version:'2',prerequis:'!EFFACER',consommables_supplementaires:'!EFFACER'},{id:'pillage-ordinaire',operation:'ARCHIVER',version:'2'}]});
  const base=`scenarios/${f.scenarioId}`,target=await f.store.get(`${base}/fieldTargets/cache`);assert.equal(target.title,'Cache de démonstration');assert.equal(target.dependencyId,null);assert.deepEqual(target.rewards.map(x=>x.id),['cache-kit','cache-credits']);assert.equal(target.rewards[0].quantity,2);assert.equal((await f.store.get(`${base}/fieldTargets/generateur`)).publicationState,'DRAFT');assert.deepEqual((await f.store.get(`${base}/personProfiles/clinique-sure`)).prerequisites,[]);assert.equal((await f.store.get(`${base}/personProfiles/pillage-ordinaire`)).publicationState,'DRAFT');
 });
 test(`${prefix} : changement d’état après aperçu et transaction interrompue`,async()=>{
  const f=await masterFixture(makeStore);await f.apply(terrainMasterExample());const s=await f.session(),Meta=[{format:'gn-engine-master',version:'1',type:'SESSION',campaign_id:s.campaignId}],input={sessionId:s.id,sheets:{Meta,Lieux:[{id:'cache',operation:'MODIFIER',version:'2',titre:'Nouveau titre'}]},reason:'Test'},preview=await f.read('prepareMasterImport',input),path=`sessions/${s.id}/fieldStates/cache`;
  await f.store.runTransaction(async tx=>{const st=await tx.get(path);tx.set(path,{...st,stock:{...st.stock,'cache-kit':2},revision:st.revision+1});});await assert.rejects(f.cmd('applyMasterImport',{...input,confirmation:preview.confirmation}),{code:'STALE_REVISION'});
  const before=await f.store.get(`sessions/${s.id}/fieldTargets/cache`),fresh=await f.read('prepareMasterImport',input),run=f.store.runTransaction.bind(f.store);f.store.runTransaction=callback=>run(async tx=>{await callback(tx);throw new Error('Interruption import');});await assert.rejects(f.cmd('applyMasterImport',{...input,confirmation:fresh.confirmation}),/Interruption import/);f.store.runTransaction=run;assert.deepEqual(await f.store.get(`sessions/${s.id}/fieldTargets/cache`),before);await f.cmd('applyMasterImport',{...input,confirmation:fresh.confirmation});assert.equal((await f.store.get(path)).stock['cache-kit'],2);
 });
 test(`${prefix} : continuité de campagne conserve état, profils et empreintes de terrain`,async()=>{
  const f=await masterFixture(makeStore),sheets=terrainMasterExample();await f.apply(sheets);const s=await f.session(),path=`sessions/${s.id}/fieldStates/cache`,state={...await f.store.get(path),stock:{'cache-kit':0,'cache-credits':1,'cache-indice':0}};await f.store.runTransaction(async tx=>tx.set(path,state));
  const close={sessionId:s.id,reason:'Fin',cancelOffers:false},p=await f.read('prepareCampaignClosure',close);await f.cmd('closeCampaignSession',{...close,confirmation:p.confirmation});
  const input={campaignId:s.campaignId,title:'Suite terrain',capacity:60,privacy:'Notice',healthPolicy:'PRESERVE',reason:'Suite'},n=await f.read('prepareCampaignEpisode',input);let b=await f.cmd('beginCampaignEpisode',{...input,confirmation:n.confirmation});while(b.status!=='READY')b=await f.cmd('advanceCampaignEpisode',{campaignId:s.campaignId,buildId:b.buildId??(await f.read('campaign',{campaignId:s.campaignId})).activeBuildId});
  const copy={...sheets,Meta:[{format:'gn-engine-master',version:'1',type:'SESSION',campaign_id:s.campaignId}]};delete copy.Parametres;assert.equal((await f.apply(copy,{scenarioId:undefined,sessionId:b.id})).unchanged,true);assert.deepEqual((await f.store.get(`sessions/${b.id}/fieldStates/cache`)).stock,state.stock);assert.equal((await f.store.list(`sessions/${b.id}/personProfiles`)).length,5);
 });
 test(`${prefix} : crédits de lieu exigent économie active et limites de catalogues`,async()=>{
  const f=await masterFixture(makeStore),s=terrainMasterExample();s.Parametres.find(r=>r.cle==='economie_active').valeur='NON';assert.equal((await f.prepare(s)).canApply,false);
  const many={Meta:masterExample().Meta,Interactions:Array.from({length:101},(_,i)=>({id:`pillage-${i}`,operation:'CREER',version:'1',nom:'Fouille',type:'LOOT_COMMON',duree_secondes:'60'}))};const p=await f.prepare(many);assert.ok(p.errors.some(e=>e.sheet==='Interactions'&&e.message.includes('100')));
 });
 test(`${prefix} : exemple complet, aperçu sans écriture et dotations à la création`,async()=>{
  const f=await masterFixture(makeStore),sheets=masterExample();const p=await f.prepare(sheets);assert.deepEqual(p.errors,[]);assert.equal(p.newCharacters[0],'pilote');assert.equal((await f.read('scenario',{scenarioId:f.scenarioId})).characters.length,0);
  await f.apply(sheets);const start=await f.session(),s=await f.read('session',{sessionId:start.id});
  assert.equal(s.characters[0].hp,4);assert.equal(s.characters[0].globalLevel,2);assert.equal(s.characters[0].abilityProfile.skills.length,2);assert.equal(s.accounts[0].balance,100);assert.equal(s.inventory[0].quantity,3);assert.equal((await f.store.list(`sessions/${s.id}/characters/pilote/knowledge`)).length,1);assert.equal(s.groups[0].members.length,1);
 });
 test(`${prefix} : réimport identique, motif et idempotence sans seconde dotation`,async()=>{
  const f=await masterFixture(makeStore),sheets=masterExample(),input={scenarioId:f.scenarioId,sheets,reason:'Test'},p=await f.read('prepareMasterImport',input),requestId=randomUUID();
  const first=await f.cmd('applyMasterImport',{...input,requestId,confirmation:p.confirmation});assert.deepEqual(await f.cmd('applyMasterImport',{...input,requestId,confirmation:p.confirmation}),first);
  const revision=(await f.read('scenario',{scenarioId:f.scenarioId})).revision,r=await f.apply(sheets);assert.equal(r.unchanged,true);assert.equal((await f.read('scenario',{scenarioId:f.scenarioId})).revision,revision);assert.equal((await f.read('masterImportHistory',{scenarioId:f.scenarioId})).imports.length,1);
  const broken=structuredClone(sheets);broken.Personnages[0].nom='Autre';assert.equal((await f.prepare(broken)).canApply,false);
 });
 test(`${prefix} : ajouts en épisode, acquis protégés puis nouvel épisode sans redistribution`,async()=>{
  const f=await masterFixture(makeStore);await f.apply(masterExample());const started=await f.session(),sid=started.id;
  // A correction simulates an acquired balance, never the starting grant.
  await f.store.runTransaction(async tx=>{const a=await tx.get(`sessions/${sid}/accounts/${accountId('pilote')}`);tx.set(`sessions/${sid}/accounts/${a.id}`,{...a,balance:27,revision:a.revision+1});});
  const sheets={Meta:[{format:'gn-engine-master',version:'1',type:'SESSION',campaign_id:started.campaignId}],Personnages:[{id:'renfort',operation:'CREER',version:'1',nom:'Renfort',publication:'PUBLISHED',publication_publique:'PUBLISHED'}],Dotations:[{id:'credits-renfort',operation:'CREER',version:'1',personnage_id:'renfort',type:'CREDIT',quantite:'20'}],Attributions:[{id:'profil-renfort',operation:'CREER',version:'1',personnage_id:'renfort',classe_id:'medic',publication:'OUI'}]};
  const target={scenarioId:undefined,sessionId:sid};await f.apply(sheets,target);let s=await f.read('session',{sessionId:sid});assert.equal(s.characters.length,2);assert.equal(s.accounts.find(a=>a.characterId==='pilote').balance,27);assert.equal(s.accounts.find(a=>a.characterId==='renfort').balance,20);assert.equal(s.characters.find(c=>c.id==='renfort').assignedUid,null);
  const bad=structuredClone(sheets);bad.Personnages=[{id:'pilote',operation:'MODIFIER',version:'2',niveau_global:'1'}];delete bad.Dotations;delete bad.Attributions;assert.equal((await f.prepare(bad,target)).canApply,false);
  const closeInput={sessionId:sid,reason:'Clôture',cancelOffers:false},close=await f.read('prepareCampaignClosure',closeInput);await f.cmd('closeCampaignSession',{...closeInput,confirmation:close.confirmation});
  const nextInput={campaignId:started.campaignId,title:'Suite',capacity:60,privacy:'Notice',healthPolicy:'PRESERVE',reason:'Suite'},preview=await f.read('prepareCampaignEpisode',nextInput);let build=await f.cmd('beginCampaignEpisode',{...nextInput,confirmation:preview.confirmation});while(build.status!=='READY')build=await f.cmd('advanceCampaignEpisode',{campaignId:started.campaignId,buildId:build.buildId??(await f.read('campaign',{campaignId:started.campaignId})).activeBuildId});
  const re=await f.apply(sheets,{scenarioId:undefined,sessionId:build.id});assert.equal(re.unchanged,true);s=await f.read('session',{sessionId:build.id});assert.equal(s.accounts.find(a=>a.characterId==='renfort').balance,20);assert.equal(s.accounts.find(a=>a.characterId==='pilote').balance,27);
 });
 test(`${prefix} : cellules vides conservées, effacement explicite et absence sans suppression`,async()=>{
  const f=await masterFixture(makeStore);await f.apply(masterExample());const sheets={Meta:masterExample().Meta,Personnages:[{id:'pilote',operation:'MODIFIER',version:'2',nom:'',histoire:'!EFFACER'}]};await f.apply(sheets);const s=await f.read('scenario',{scenarioId:f.scenarioId});assert.equal(s.characters[0].public.displayName,'Pilote de démonstration');assert.equal(s.characters[0].biography,'');assert.equal(s.items.length,1);
 });
 test(`${prefix} : références, doublons, colonnes inconnues et ensembles atomiques`,async()=>{
  const f=await masterFixture(makeStore),broken=masterExample();broken.Relations=[{id:'r1',operation:'CREER',version:'1',personnage_id:'pilote',cible_id:'absent',titre:'Contact'}];let p=await f.prepare(broken);assert.equal(p.canApply,false);await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,sheets:broken,reason:'Test',confirmation:p.confirmation}),{code:'INVALID_MASTER'});assert.equal((await f.read('scenario',{scenarioId:f.scenarioId})).characters.length,0);
  for(const edit of [s=>s.Personnages.push({...s.Personnages[0]}),s=>s.Personnages[0].balance='999',s=>s.OngletInconnu=[]]){const sheets=masterExample();edit(sheets);assert.equal((await f.prepare(sheets)).canApply,false);}
 });
 test(`${prefix} : aperçu périmé, destination incorrecte, droits et phase de session`,async()=>{
  const f=await masterFixture(makeStore),sheets=masterExample(),p=await f.prepare(sheets);await f.cmd('saveCharacter',{scenarioId:f.scenarioId,revision:1,displayName:'Autre',publicationState:'DRAFT',publicState:'DRAFT'});
  await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,sheets,reason:'Import de test',confirmation:p.confirmation}),{code:'STALE_REVISION'});
  await assert.rejects(f.read('prepareMasterImport',{scenarioId:f.scenarioId,sheets},f.player),{code:'FORBIDDEN'});await assert.rejects(f.read('prepareMasterImport',{scenarioId:f.scenarioId,sheets},null),{code:'LOGIN_REQUIRED'});
  const wrong=structuredClone(sheets);wrong.Meta[0].destination_id='ailleurs';assert.equal((await f.prepare(wrong)).canApply,false);
  await f.apply(sheets);const start=await f.session(),s=await f.read('session',{sessionId:start.id});await f.cmd('setStage',{sessionId:s.id,revision:s.revision,stage:'BRIEFING'});
  await assert.rejects(f.prepare({Meta:[{format:'gn-engine-master',version:'1',type:'SESSION',campaign_id:start.campaignId}]},{scenarioId:undefined,sessionId:s.id}),{code:'MASTER_PREPARATION_REQUIRED'});
 });
 test(`${prefix} : archivage avec dépendances refusé, puis archivage sans suppression`,async()=>{
  const f=await masterFixture(makeStore);await f.apply(masterExample());assert.equal((await f.prepare({Meta:masterExample().Meta,Objets:[{id:'kit',operation:'ARCHIVER',version:'2'}]})).canApply,false);
  await f.apply({Meta:masterExample().Meta,Objets:[{id:'sans-lien',operation:'CREER',version:'1',nom:'Sans lien',publication:'PUBLISHED'}]});await f.apply({Meta:masterExample().Meta,Objets:[{id:'sans-lien',operation:'ARCHIVER',version:'2'}]});const s=await f.read('scenario',{scenarioId:f.scenarioId});assert.equal(s.items.find(i=>i.id==='sans-lien').publicationState,'DRAFT');
 });
 test(`${prefix} : concurrence et identifiant de dotation immuable`,async()=>{
  const f=await masterFixture(makeStore),sheets=masterExample(),input={scenarioId:f.scenarioId,sheets,reason:'Import de test'},p=await f.prepare(sheets);
  const results=await Promise.allSettled([f.cmd('applyMasterImport',{...input,confirmation:p.confirmation}),f.cmd('applyMasterImport',{...input,confirmation:p.confirmation})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const changed={Meta:sheets.Meta,Personnages:[{id:'autre',operation:'CREER',version:'1',nom:'Autre'}],Dotations:[{id:'credits-pilote',operation:'CREER',version:'2',personnage_id:'autre',type:'CREDIT',quantite:'200'}]};assert.equal((await f.prepare(changed)).canApply,false);
  const dup={Meta:sheets.Meta,Attributions:[{id:'profil-pilote',operation:'MODIFIER',version:'2',personnage_id:'pilote',publication:'NON'}]};await f.apply(dup);const c=(await f.read('scenario',{scenarioId:f.scenarioId})).characters[0];assert.equal(c.abilityProfile.class.id,'medic');assert.equal(c.abilityProfile.skills.length,2);assert.equal(c.abilityProfile.published,false);
 });
 test(`${prefix} : connaissances reçues conservées, archivage bloqué et média étranger refusé`,async()=>{
  const f=await masterFixture(makeStore);await f.apply(masterExample());const start=await f.session(),target={scenarioId:undefined,sessionId:start.id},Meta=[{format:'gn-engine-master',version:'1',type:'SESSION',campaign_id:start.campaignId}];
  const original=await f.store.get(`sessions/${start.id}/characters/pilote/knowledge/secret`);await f.apply({Meta,Connaissances:[{id:'secret',operation:'MODIFIER',version:'2',texte:'Texte du catalogue mis à jour.'}]},target);assert.deepEqual(await f.store.get(`sessions/${start.id}/characters/pilote/knowledge/secret`),original);
  assert.equal((await f.prepare({Meta,Connaissances:[{id:'secret',operation:'ARCHIVER',version:'3'}]},target)).canApply,false);
  const mid=randomUUID();await f.store.runTransaction(async tx=>tx.set(`media/${mid}`,{id:mid,status:'READY',ownerUid:f.player.uid}));
  const p=await f.prepare({Meta,Personnages:[{id:'portrait-test',operation:'CREER',version:'1',nom:'Portrait',portrait_media_id:mid}]},target);assert.equal(p.canApply,false);assert.ok(p.errors.some(e=>e.sheet==='Medias'));
 });
 test(`${prefix} : master de 60 personnages, 60 dotations et lancement de campagne`,async()=>{
  const f=await masterFixture(makeStore),sheets={Meta:masterExample().Meta,Parametres:masterExample().Parametres,Personnages:[],Dotations:[]};
  for(let i=0;i<60;i++){const id=`personnage-${i}`;sheets.Personnages.push({id,operation:'CREER',version:'1',nom:`Personnage ${i}`,publication:'PUBLISHED',publication_publique:'PUBLISHED'});sheets.Dotations.push({id:`dotation-${i}`,operation:'CREER',version:'1',personnage_id:id,type:'CREDIT',quantite:'10'});}
  await f.apply(sheets);const created=await f.session(),s=await f.read('session',{sessionId:created.id});assert.equal(s.characters.length,60);assert.equal(s.accounts.reduce((n,a)=>n+a.balance,0),600);
  const imported=structuredClone(sheets);imported.Meta=[{format:'gn-engine-master',version:'1',type:'SESSION',campaign_id:created.campaignId}];delete imported.Parametres;const again=await f.apply(imported,{scenarioId:undefined,sessionId:created.id});assert.equal(again.unchanged,true);
 });
}
