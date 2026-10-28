import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {analysisTarget} from './space-outlaws-actions-suite.mjs';
import {centralTestKnowledge} from './central-knowledge-suite.mjs';
import {analysisProfile} from '../../src/shared/space-outlaws-analysis.mjs';
import {centralSpaceEditable} from '../../src/core/central-space.mjs';
import {importedSpace} from '../../src/core/central-space-import.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';

export async function routeAnalysisFixture(makeStore,{release=true,material=false}={}){
 const f=await soVoyagesFixture(makeStore,{release,prepareExtra:async(f,revision)=>{
  const rewards=[];
  for(const [id,minLevel,bonus] of [...[1,2,3,4,5].map(n=>[`nav${n}`,n,false]),['navbonus',1,true]]){
   await f.cc('saveCentralKnowledge',{knowledgeId:id,knowledgeRevision:0,draftRevision:revision++,knowledge:{...centralTestKnowledge,title:`Renseignement ${id}`,body:`PREPARED_PRIVATE_${id}`,gmTruth:'SECRET_TRUTH',initialCharacterIds:[],qrEnabled:false,qrSkillId:null,qrSkillLevel:null,qrCharacterIds:[]},reason:'Dossier de route préparé'});
   rewards.push({id,kind:'KNOWLEDGE',knowledgeId:id,minLevel,bonus,quantity:1,stock:1,perCharacter:1});
  }
  await f.cc('saveCentralFieldTarget',{fieldTargetId:'nav',fieldTargetRevision:0,draftRevision:revision++,fieldTarget:analysisTarget('PIL-01',{title:'Dossier de navigation',profiles:{ANALYZE:analysisProfile('PIL-01',{bonusItems:material?[{itemId:'kit_communicator',bonus:2}]:[]})},rewards}),reason:'Navigation graduée'});
  const route=(await f.central('centralMaster',{workshop:'M3'})).changes.find(c=>c.type==='route'&&c.entityId==='out').data;
  await f.cc('saveCentralRoute',{routeId:'out',routeRevision:route.revision,draftRevision:revision++,route:{...centralSpaceEditable('route',route),analysisTargetId:'nav'},reason:'Dossier préparé lié à la liaison'});
 }});
 const base=`sessions/${f.sid}`;
 const edit=(path,fn)=>f.store.runTransaction(async tx=>tx.set(`${base}/${path}`,fn(await tx.get(`${base}/${path}`))));
 const level=(n,cid=f.cid)=>edit(`characters/${cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='PIL-01'?{...k,level:n}:k)}}));
 const payload={targetId:'nav',kind:'ANALYZE',navigationCode:'OUT-SECRET'};
 const open=(patch={},actor=f.player)=>f.read('fieldTarget',{navigationCode:'OUT-SECRET',...patch},actor);
 const prepare=(patch={},actor=f.player)=>f.read('prepareFieldAction',{...payload,...patch},actor);
 const start=async(patch={},actor=f.player)=>{const q=await prepare(patch,actor);return f.cmd('startFieldAction',{...payload,...patch,confirmation:q.confirmation,present:true},actor);};
 return {...f,base,edit,level,payload,open,prepareAnalysis:prepare,startAnalysis:start};
}
export function spaceRouteAnalysisSuite(makeStore,prefix='Analyses PIL-01'){
 test(`${prefix} : dossier publié M3/M6, code de route ou destination, sans vaisseau personnel`,async()=>{
  const f=await routeAnalysisFixture(makeStore);await f.edit('ships/ship',s=>({...s,ownerId:f.otherId,pilotId:f.otherId}));
  assert.deepEqual((await f.read('mySpaceport')).ships,[]);assert.equal((await f.read('mySpaceport')).session.routeAnalysisReady,true);
  const d=await f.open();assert.equal(d.target.id,'nav');assert.equal(d.navigation.name,'out');assert.equal((await f.open({navigationCode:'AWAY-CODE'})).target.id,'nav');assert.doesNotMatch(JSON.stringify(d),/PREPARED_PRIVATE|SECRET_|OUT-SECRET|AWAY-CODE|navbonus|gmTruth|manifest/);
  const q=await f.prepareAnalysis();assert.equal(q.durationSeconds,105);assert.equal(q.cost,1);assert.equal(q.test,'D6');assert.equal(q.threshold,6);assert.equal(q.cooldownSeconds,600);assert.equal((await f.points()).reserved,0);await f.startAnalysis();
 });
 test(`${prefix} : cinq niveaux, cinq durées, garanties cumulées malgré échec du supplément`,async()=>{
  for(const [n,seconds] of [[1,120],[2,105],[3,90],[4,75],[5,60]]){
   const f=await routeAnalysisFixture(makeStore);await f.level(n);f.setDie(1);const a=await f.startAnalysis();assert.equal(a.durationSeconds,seconds);await assert.rejects(f.finish(a),{code:'FIELD_TOO_EARLY'});f.advance(seconds*1000);const r=await f.finish(a,{die:6,level:5,bonus:100});assert.equal(r.result.roll,1);assert.equal(r.result.total,n+1);assert.equal(r.result.bonusSuccess,n===5);assert.equal(r.status,'SUCCEEDED');assert.deepEqual(r.result.information.filter(k=>!k.bonus).map(k=>k.id),Array.from({length:n},(_,i)=>`nav${i+1}`));assert.equal((await f.points()).available,4);assert.equal((await f.points()).reserved,0);
  }
 });
 test(`${prefix} : supplément serveur au seuil, reçu unique et lecture gratuite sans mise à jour vivante`,async()=>{
  const f=await routeAnalysisFixture(makeStore);f.setDie(4);const a=await f.startAnalysis();f.advance(105000);const p={requestId:randomUUID()},r=await f.finish(a,p);assert.equal(r.result.total,6);assert.equal(r.result.bonusSuccess,true);assert.deepEqual(r.result.information.map(k=>k.id),['nav1','nav2','navbonus']);f.setDie(1);assert.deepEqual(await f.finish(a,p),r);assert.deepEqual((await f.finish(a)).result,r.result);
  await f.edit('knowledge/nav1',k=>({...k,body:'NOUVEL_ETAT_ROUTE'}));const detail=await f.read('knowledgeDetail',{knowledgeId:'nav1'});assert.equal(detail.knowledge.body,'PREPARED_PRIVATE_nav1');assert.equal((await f.points()).available,4);await assert.rejects(f.read('knowledgeDetail',{knowledgeId:'nav3'}),{code:'FORBIDDEN'});f.advance(600000);await assert.rejects(f.startAnalysis(),{code:'FIELD_ANALYSIS_DONE'});assert.equal((await f.open()).analysisDone,true);
 });
 test(`${prefix} : code inconnu, QR direct, autre cible et ambiguïté ne révèlent pas le dossier`,async()=>{
  const f=await routeAnalysisFixture(makeStore);for(const navigationCode of ['INCONNU','BACK-SECRET','',null,123])await assert.rejects(f.open({navigationCode}),{code:'SO_ROUTE_DOSSIER_UNAVAILABLE'});
  await assert.rejects(f.read('fieldTarget',{targetId:'nav'}),{code:'SO_ROUTE_DOSSIER_UNAVAILABLE'});await assert.rejects(f.prepareAnalysis({navigationCode:undefined}),{code:'SO_ROUTE_DOSSIER_UNAVAILABLE'});
  await f.edit('routes/out',r=>({...r,analysisTargetId:'scene'}));await assert.rejects(f.open({targetId:'nav'}),{code:'SO_ROUTE_DOSSIER_UNAVAILABLE'});
  await f.edit('routes/back',r=>({...r,fromPort:'home',toPort:'away'}));await assert.rejects(f.open({navigationCode:'AWAY-CODE'}),{code:'SO_ROUTE_DOSSIER_UNAVAILABLE'});assert.equal((await f.points()).available,5);
 });
 test(`${prefix} : matériel +2, aide +1 et récupération commune sans PA ni secret au helper`,async()=>{
  const f=await routeAnalysisFixture(makeStore,{material:true}),lot=(await f.read('myInventory')).lots.find(l=>l.item.id==='kit_communicator');f.setDie(1);const o=await f.cmd('offerAid',{targetId:f.cid,skillId:'PIL-01',present:true},f.other),a=await f.startAnalysis({bonusLotId:lot.id,aidOfferId:o.id});assert.equal((await f.points(f.other)).available,5);await assert.rejects(f.startAnalysis({},f.other),{code:'OUT_OF_COMBAT'});f.advance(105000);const r=await f.finish(a);assert.equal(r.result.total,6);assert.equal(r.result.bonusSuccess,true);assert.deepEqual((await f.read('myKnowledge',{},f.other)).items,[]);assert.equal((await f.points(f.other)).available,5);await assert.rejects(f.startAnalysis({},f.other),{code:'COOLDOWN_ACTIVE'});assert.equal((await f.store.get(`${f.base}/inventory/${lot.id}`)).quantity,1);
 });
 test(`${prefix} : concurrence verrouille acteur, dossier et PA une seule fois`,async()=>{
  const f=await routeAnalysisFixture(makeStore),p=await f.prepareAnalysis(),q=await f.prepareAnalysis({},f.other),r=await Promise.allSettled([f.cmd('startFieldAction',{...f.payload,confirmation:p.confirmation,present:true}),f.cmd('startFieldAction',{...f.payload,confirmation:q.confirmation,present:true},f.other)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.points()).reserved+(await f.points(f.other)).reserved,1);assert.equal((await f.store.list(`${f.base}/fieldActions`)).length,1);
 });
 test(`${prefix} : pause suspend la durée, annulation libère sans cooldown et reprise complète`,async()=>{
  const f=await routeAnalysisFixture(makeStore),a=await f.startAnalysis();f.advance(30000);await f.stage('PAUSE');f.advance(3600000);assert.equal((await f.read('myFieldActions')).actions[0].remainingMs,75000);await assert.rejects(f.finish(a),{code:'SESSION_NOT_RUNNING'});await f.cmd('cancelFieldAction',{actionId:a.id,reason:'Scène interrompue'});assert.equal((await f.points()).available,5);assert.equal((await f.points()).reserved,0);await f.stage('EN_JEU');const next=await f.startAnalysis();assert.equal(next.remainingMs,105000);assert.deepEqual((await f.read('myKnowledge')).items,[]);
 });
 test(`${prefix} : départ et voyage excluent l’analyse, aucune consommation à distance`,async()=>{
  const f=await routeAnalysisFixture(makeStore);await f.refuel(2);await f.startFlight();await assert.rejects(f.startAnalysis(),{code:'OUT_OF_COMBAT'});f.advance(180000);await f.navCommand('finishSoPreparation');await assert.rejects(f.startAnalysis(),{code:'OUT_OF_COMBAT'});f.advance(300000);await f.cmd('arriveShip',{shipId:'ship',confirmation:(await f.navigation()).confirmation});await assert.rejects(f.open(),{code:'SO_ROUTE_DOSSIER_UNAVAILABLE'});
 });
 test(`${prefix} : analyse active interdit départ et clôture`,async()=>{
  const f=await routeAnalysisFixture(makeStore);await f.refuel(2);await f.startAnalysis();await assert.rejects(f.startFlight(),{code:'OUT_OF_COMBAT'});await assert.rejects(f.stage('FINISHED'),{code:'FIELD_ACTIONS_OPEN'});assert.equal((await f.ship()).fuel,2);
 });
 test(`${prefix} : présence, compétence et confirmation liée à la route sans débit`,async()=>{
  const f=await routeAnalysisFixture(makeStore),p=await f.prepareAnalysis();await assert.rejects(f.cmd('startFieldAction',{...f.payload,confirmation:p.confirmation}),{code:'FIELD_PRESENCE_REQUIRED'});await f.edit('routes/out',r=>({...r,revision:r.revision+1}));await assert.rejects(f.cmd('startFieldAction',{...f.payload,confirmation:p.confirmation,present:true}),{code:'STALE_REVISION'});await f.level(0);await assert.rejects(f.startAnalysis(),{code:'FIELD_SKILL_REQUIRED'});assert.equal((await f.points()).available,5);
 });
 test(`${prefix} : niveau retiré et dossier modifié bloquent la résolution puis libèrent par annulation`,async()=>{
  const f=await routeAnalysisFixture(makeStore);await f.level(5);const a=await f.startAnalysis();f.advance(60000);await f.level(1);await assert.rejects(f.finish(a),{code:'FIELD_SKILL_REQUIRED'});await f.level(5);await f.edit('routes/out',r=>({...r,revision:r.revision+1}));await assert.rejects(f.finish(a),{code:'FIELD_STATE_CHANGED'});await f.cmd('cancelFieldAction',{actionId:a.id,reason:'Dossier à reprendre'});assert.equal((await f.points()).available,5);assert.deepEqual((await f.read('myKnowledge')).items,[]);
 });
 test(`${prefix} : révocation avant reçu et annulation MJ sans transmettre les textes`,async()=>{
  const f=await routeAnalysisFixture(makeStore),p=await f.prepareAnalysis(),input={...f.payload,confirmation:p.confirmation,present:true,requestId:randomUUID()},a=await f.cmd('startFieldAction',input);await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.cmd('startFieldAction',input),{code:'FORBIDDEN'});await assert.rejects(f.open(),{code:'FORBIDDEN'});await f.cmd('cancelFieldActionMJ',{actionId:a.id,reason:'Accès retiré'},f.owner);assert.equal((await f.store.get(`${f.base}/fieldActions/${a.id}`)).status,'CANCELLED');assert.deepEqual(await f.store.list(`${f.base}/characters/${f.cid}/knowledge`),[]);
 });
 test(`${prefix} : STOP bloque le début et la résolution sans créer de résultat`,async()=>{
  const f=await routeAnalysisFixture(makeStore),a=await f.startAnalysis();f.advance(105000);await f.cmd('stopSafety',{reason:'Sécurité'});await assert.rejects(f.finish(a),{code:'SESSION_NOT_RUNNING'});await f.cmd('cancelFieldAction',{actionId:a.id,reason:'Arrêt sécurité'});await assert.rejects(f.startAnalysis(),{code:'SESSION_NOT_RUNNING'});assert.equal((await f.points()).available,5);
 });
 test(`${prefix} : publication refuse référence absente, archivée ou hors PIL-01`,async()=>{
  const f=await routeAnalysisFixture(makeStore,{release:false}),d=await f.central('centralMaster',{workshop:'M3'}),route=d.changes.find(c=>c.entityId==='out').data;let revision=d.draft.revision;
  for(const analysisTargetId of ['missing','scene']){await f.cc('saveCentralRoute',{routeId:'out',routeRevision:route.revision++,draftRevision:revision++,route:{...centralSpaceEditable('route',route),analysisTargetId},reason:'Vérifier la liaison'});const q=await f.releasePreview();assert.equal(q.canRelease,false);assert.ok(q.blockers.some(b=>b.entityId==='out'&&['REFERENCE_MISSING','REFERENCE_INVALID'].includes(b.code)));}
  await f.cc('saveCentralRoute',{routeId:'out',routeRevision:route.revision++,draftRevision:revision++,route:{...centralSpaceEditable('route',route),analysisTargetId:'nav'},reason:'Rétablir'});await f.cc('archiveCentralFieldTarget',{fieldTargetId:'nav',fieldTargetRevision:1,draftRevision:revision++,reason:'Retrait'});assert.equal((await f.releasePreview()).canRelease,false);
 });
 test(`${prefix} : ancien XLSX conserve le lien préparé et son export reste au contrat existant`,async()=>{
  const f=await routeAnalysisFixture(makeStore,{release:false}),c=(await f.central('centralMaster',{workshop:'M3'})).changes.find(c=>c.entityId==='out');const result=importedSpace('route',{id:'out',nom:'Nom corrigé'},c);assert.equal(result.analysisTargetId,'nav');assert.equal(result.name,'Nom corrigé');
 });
 test(`${prefix} : ancien manifeste jamais enrichi, QR et aide PIL-01 restent fermés`,async()=>{
  const f=await routeAnalysisFixture(makeStore,{release:false}),r=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${r.versionId}`,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await f.store.runTransaction(async tx=>{const {routeAnalysisVersion,manifestDigest,...old}=await tx.get(path);tx.set(path,{...old,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(old))).digest('hex')});});await f.birth(await f.birthPreview());await f.birth(await f.birthPreview(f.owner,{uid:f.other.uid}),{uid:f.other.uid});await f.stage('EN_JEU');assert.equal((await f.read('mySpaceport')).session.routeAnalysisReady,false);await assert.rejects(f.open(),{code:'SO_GAMEPLAY_NOT_OPEN'});await assert.rejects(f.read('fieldTarget',{targetId:'nav'}),{code:'SO_GAMEPLAY_NOT_OPEN'});const other=(await f.read('mySession',{},f.other)).character.id;await assert.rejects(f.cmd('offerAid',{targetId:other,skillId:'PIL-01',present:true}),{code:'SO_GAMEPLAY_NOT_OPEN'});assert.ok(!(await f.read('myPersonActions')).skills.some(k=>k.id==='PIL-01'));
 });
 test(`${prefix} : interruption transactionnelle sans PA, résultat ni information partiels`,async()=>{
  const base=makeStore();let fail=false;const store={get:base.get.bind(base),list:base.list.bind(base),runTransaction:fn=>base.runTransaction(async tx=>{const r=await fn(tx);if(fail)throw new Error('INTERRUPTION');return r;})},f=await routeAnalysisFixture(()=>store),a=await f.startAnalysis();f.advance(105000);fail=true;await assert.rejects(f.finish(a),/INTERRUPTION/);fail=false;assert.equal((await f.points()).reserved,1);assert.deepEqual((await f.read('myKnowledge')).items,[]);assert.equal((await store.get(`${f.base}/fieldActions/${a.id}`)).status,'ACTIVE');await f.finish(a);assert.equal((await f.points()).reserved,0);
 });
 test(`${prefix} : changement d’épisode garde textes, quota et récupération de la même version`,async()=>{
  const f=await routeAnalysisFixture(makeStore),a=await f.startAnalysis();f.advance(105000);await f.finish(a);const receipt=await f.store.get(`${f.base}/characters/${f.cid}/knowledge/nav1`),e=await episodeHarness(f);await e.close();await e.resume(await e.begin());assert.deepEqual(await e.get(`characters/${f.cid}/knowledge/nav1`),receipt);assert.equal((await e.get('')).spaceOutlaws.routeAnalysisVersion,1);await e.stage('EN_JEU');f.advance(600000);await assert.rejects(e.read('prepareFieldAction',f.payload,f.player),{code:'FIELD_ANALYSIS_DONE'});assert.equal((await e.read('fieldTarget',{navigationCode:'OUT-SECRET'},f.player)).analysisDone,true);
 });
}
