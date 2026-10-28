import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {importFixture} from './central-import-suite.mjs';
import {centralTestCharacter} from './central-characters-suite.mjs';
import {readCentralXlsx,writeCentralXlsx} from '../../web/central-xlsx.mjs';

export const centralCharacterRow={id:'person',operation:'CREER',revision:0,nom:'Alias fictif',profession:'Courtière',description:'Fiction',nature:'HUMANOID',biographie:'Biographie privée',interpretation:'Jeu fictif',secrets_joueur:'Secret privé',notes_mj:'Notes privées',
 objectifs_json:JSON.stringify(centralTestCharacter.objectives),relations_json:JSON.stringify(centralTestCharacter.relations),profil_initial:'JOUEUR',classe_id:'COM',espece_id:'species-test',initiation_id:'MED-02'};
async function fixture(makeStore){
 const f=await importFixture(makeStore);
 const file=(rows=[centralCharacterRow],actor=f.owner)=>f.file('M2',rows,actor);
 const check=async()=>f.read('checkCentralDraft',f.owner,{campaignId:f.cid,draftRevision:(await f.view('M2')).draft.revision});
 const roundtrip=async(ids=['person'])=>({campaignId:f.cid,workshop:'M2',fileName:'Retour.xlsx',sheets:readCentralXlsx(writeCentralXlsx((await f.exportFile('M2',ids)).sheets))});
 const save=(extra={})=>f.cmd('saveCentralCharacter',{campaignId:f.cid,characterId:'person',draftRevision:0,characterRevision:0,reason:'Édition de fiction',character:centralTestCharacter,...extra});
 return {...f,file,check,roundtrip,saveCharacter:save};
}
export function centralCharacterImportSuite(makeStore,prefix='Excel personnages C2d'){
 test(`${prefix} : XLSX réel, aperçu privé et définition native sans naissance`,async()=>{
  const f=await fixture(makeStore),before=await f.store.get(`sessions/${f.sid}`),input=await f.file(),p=await f.prepare(input);
  assert.deepEqual(p.errors,[]);assert.ok(p.confirmation);assert.equal(await f.store.get(f.base),null);assert.equal(p.changes[0].sheet,'Personnages');
  await f.apply(input,p);const d=await f.view('M2'),c=d.changes[0];assert.equal(c.data.contentRevision,1);assert.equal(c.data.revision,undefined);assert.equal(c.source,'XLSX');assert.equal(c.provenance.row,2);assert.equal(c.data.public.displayName,'Alias fictif');assert.equal(c.data.creationPlan.classId,'COM');assert.equal(c.data.abilityProfile,undefined);assert.equal(c.data.hp,null);assert.equal(c.data.publicationState,'DRAFT');assert.equal(c.data.objectives[0].published,false);assert.equal(c.data.objectives[0].steps[0].published,false);assert.equal(c.data.relations[0].published,false);
  assert.deepEqual(await f.store.get(`sessions/${f.sid}`),before);for(const k of ['characters','registrations','accounts','inventory','ledger','actionPoints','updates'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${k}`),[]);
  assert.equal((await f.check()).totals.invalid,0);assert.equal((await f.check()).publicationAvailable,false);
 });
 test(`${prefix} : retour Excel conserve textes, identifiants imbriqués et plan sans révision`,async()=>{
  const f=await fixture(makeStore),input=await f.file();await f.apply(input,await f.prepare(input));const before=await f.view('M2'),e=await f.roundtrip(),p=await f.prepare(e);
  assert.deepEqual(p.errors,[]);assert.equal(p.changes[0].operation,'INCHANGE');assert.ok(p.diagnostics.every(d=>d.fileName==='Retour.xlsx'&&d.row===2));assert.equal((await f.apply(e,p)).changed,0);assert.deepEqual(await f.view('M2'),before);assert.doesNotMatch(JSON.stringify(e.sheets),/published|schemaVersion|abilityProfile/);
 });
 test(`${prefix} : références réciproques du même lot et espèce du catalogue unique`,async()=>{
  const f=await fixture(makeStore);await f.configure();const catalogue=await f.store.get(`${f.base}/changes/speciesCatalogue_player`),history=await f.store.get(`${f.base}/history/1`);
  const second={...centralCharacterRow,id:'target',relations_json:JSON.stringify([{...centralTestCharacter.relations[0],targetId:'person'}])},input=await f.file([centralCharacterRow,second]);const p=await f.prepare(input);assert.deepEqual(p.diagnostics,[]);await f.apply(input,p);
  assert.deepEqual(await f.store.get(`${f.base}/changes/speciesCatalogue_player`),catalogue);assert.deepEqual(await f.store.get(`${f.base}/history/1`),history);assert.equal((await f.view('M2')).changes.length,3);const report=await f.check();assert.equal(report.status,'CORRECTIONS_REQUIRED');assert.deepEqual(report.diagnostics.map(d=>d.code),['CLASS_KIT_MISSING','CLASS_KIT_MISSING']);
  const e=await f.exportFile('M2',['person','target']);assert.deepEqual(Object.keys(e.sheets),['Meta','Personnages']);assert.equal(e.sheets.Personnages.length,2);await assert.rejects(f.exportFile('M2',['player']),{code:'CENTRAL_EXPORT_STALE'});
 });
 test(`${prefix} : personnage player ne confond pas le catalogue player`,async()=>{
  const f=await fixture(makeStore);await f.configure();const before=await f.store.get(`${f.base}/changes/speciesCatalogue_player`),input=await f.file([{...centralCharacterRow,id:'player',relations_json:'[]'}]);await f.apply(input,await f.prepare(input));assert.equal((await f.exportFile('M2',['player'])).sheets.Personnages[0].nom,'Alias fictif');assert.deepEqual(await f.store.get(`${f.base}/changes/speciesCatalogue_player`),before);assert.equal((await f.check()).totals.invalid,0);
 });
 test(`${prefix} : diagnostics différés localisés puis résolution web sans réimport`,async()=>{
  const f=await fixture(makeStore),input=await f.file(),p=await f.prepare(input);assert.equal(p.diagnostics.find(d=>d.reference==='target').column,'relations_json');assert.equal(p.diagnostics.find(d=>d.reference==='species-test').column,'espece_id');assert.ok(p.diagnostics.every(d=>d.sheet==='Personnages'&&d.row===2));await f.apply(input,p);
  let r=await f.check();assert.ok(r.diagnostics.every(d=>d.fileName===input.fileName&&d.row===2));assert.equal(r.diagnostics.find(d=>d.reference==='species-test').column,'espece_id');
  const before=await f.store.get(`${f.base}/changes/character_person`);await f.configure(1);await f.saveCharacter({characterId:'target',draftRevision:2,character:{...centralTestCharacter,relations:[]}});r=await f.check();assert.deepEqual(r.diagnostics.map(d=>d.code),['CLASS_KIT_MISSING']);assert.deepEqual(await f.store.get(`${f.base}/changes/character_person`),before);
 });
 test(`${prefix} : blanc conserve ; retrait et remplacement explicites des tableaux et plan`,async()=>{
  const f=await fixture(makeStore),input=await f.file();await f.apply(input,await f.prepare(input));
  const edit=await f.file([{id:'person',operation:'MODIFIER',revision:1,nom:'Alias corrigé'}]);await f.apply(edit,await f.prepare(edit));let d=(await f.view('M2')).changes[0].data;assert.equal(d.creationPlan.classId,'COM');assert.equal(d.objectives[0].id,'goal');assert.equal(d.relations[0].id,'contact');
  const clear=await f.file([{id:'person',operation:'MODIFIER',revision:2,biographie:'!EFFACER',objectifs_json:'!EFFACER',relations_json:'[]',profil_initial:'SANS'}]);await f.apply(clear,await f.prepare(clear));d=(await f.view('M2')).changes[0].data;assert.equal(d.biography,'');assert.deepEqual(d.objectives,[]);assert.deepEqual(d.relations,[]);assert.equal(d.creationPlan,null);assert.equal((await f.prepare(await f.roundtrip())).changes[0].operation,'INCHANGE');
  const empty=await f.file([]);await f.apply(empty,await f.prepare(empty));assert.equal((await f.view('M2')).changes.length,1);assert.equal((await f.view('M2')).history.length,3);
 });
 test(`${prefix} : anciennes fiches sans plan gardent leur forme`,async()=>{
  const f=await fixture(makeStore);await f.saveCharacter();const e=await f.roundtrip(),p=await f.prepare(e);assert.equal(p.changes[0].operation,'INCHANGE');await f.apply(e,p);assert.equal(Object.hasOwn((await f.view('M2')).changes[0].data,'creationPlan'),false);
 });
 test(`${prefix} : JSON malformé, privilèges imbriqués et profils interdits refusent tout le lot`,async()=>{
  const f=await fixture(makeStore);
  const patches=[{objectifs_json:'{'},{relations_json:'null'},{objectifs_json:JSON.stringify([{...centralTestCharacter.objectives[0],published:true}])},{relations_json:JSON.stringify([{...centralTestCharacter.relations[0],targetId:'person'}])},{objectifs_json:JSON.stringify([{...centralTestCharacter.objectives[0],steps:[{id:'s',title:'s',published:true}]}])},{relations_json:JSON.stringify([...centralTestCharacter.relations,...centralTestCharacter.relations])},{nature:'FORCE'},{classe_id:'PNJ_FORCE_SENSITIVE'},{initiation_id:'FOR-01'},{initiation_id:'COM-03'},{profil_initial:'',classe_id:'COM'},{profil_initial:'SANS'},{classe_id:''},{nom:'!EFFACER'}];
  for(const patch of patches){const input=await f.file([{...centralCharacterRow,id:'valid'}, {...centralCharacterRow,...patch}]),p=await f.prepare(input);assert.ok(p.errors.some(e=>e.sheet==='Personnages'&&e.row===3),JSON.stringify(patch));assert.equal(p.confirmation,null);await assert.rejects(f.apply(input,p),{code:'INVALID_CENTRAL_IMPORT'});}
  assert.equal(await f.store.get(f.base),null);
 });
 test(`${prefix} : colonnes civiles, ressources et autres ateliers ne sont jamais importés`,async()=>{
  const f=await fixture(makeStore),input=await f.file();
  for(const key of ['email','assignedUid','publication','credits','kit','abilityProfile','speciesCatalogue']){const x=structuredClone(input);x.sheets.Personnages[0][key]='injection';const p=await f.prepare(x);assert.equal(p.errors[0].column,key);await assert.rejects(f.apply(x,p),{code:'INVALID_CENTRAL_IMPORT'});}
  const x=structuredClone(input);x.sheets.Objets=[];assert.ok((await f.prepare(x)).errors.length);assert.equal(await f.store.get(f.base),null);
 });
 test(`${prefix} : archivage et restauration audités avec contentRevision`,async()=>{
  const f=await fixture(makeStore),input=await f.file();await f.apply(input,await f.prepare(input));const a=await f.file([{id:'person',operation:'ARCHIVER',revision:1}]);await f.apply(a,await f.prepare(a));let d=(await f.view('M2')).changes[0];assert.equal(d.operation,'ARCHIVE');assert.equal(d.data.masterArchived,true);assert.equal(d.data.contentRevision,2);assert.equal(d.data.revision,undefined);assert.equal((await f.prepare(await f.roundtrip())).changes[0].operation,'INCHANGE');
  const bad=await f.file([{id:'person',operation:'MODIFIER',revision:2,nom:'Erreur'}]);assert.ok((await f.prepare(bad)).errors.length);const restore=await f.file([{id:'person',operation:'RESTAURER',revision:2}]);await f.apply(restore,await f.prepare(restore));d=(await f.view('M2')).changes[0];assert.equal(d.operation,'UPSERT');assert.equal(d.data.contentRevision,3);assert.equal(d.data.creationPlan.classId,'COM');assert.equal((await f.check()).totals.invalid,0);
 });
 test(`${prefix} : réessai après édition ne restaure pas l’ancien texte`,async()=>{
  const f=await fixture(makeStore),input=await f.file(),p=await f.prepare(input),extra={requestId:randomUUID()},r=await f.apply(input,p,extra);assert.deepEqual(await f.apply(input,p,extra),r);await f.saveCharacter({draftRevision:1,characterRevision:1});assert.deepEqual(await f.apply({...input,fileName:'Renommé.xlsx'},p),r);assert.equal((await f.view('M2')).changes[0].data.public.displayName,centralTestCharacter.displayName);assert.equal((await f.view('M2')).history.length,2);
 });
 test(`${prefix} : concurrence avec éditeur web et espèces, aucun mélange`,async()=>{
  for(const other of ['web','species']){const f=await fixture(makeStore),input=await f.file(),p=await f.prepare(input),r=await Promise.allSettled([f.apply(input,p),other==='web'?f.saveCharacter():f.configure()]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');assert.equal((await f.view('M2')).draft.revision,1);}
 });
 test(`${prefix} : délégation M2, export en lecture seule et révocation avant reçu`,async()=>{
  const f=await fixture(makeStore);await f.grant({readWorkshops:['M2'],editWorkshops:[]});await f.exportFile('M2',[],f.mj);const input=await f.file();await assert.rejects(f.prepare(input,f.mj),{code:'FORBIDDEN'});await assert.rejects(f.prepare(input,f.player),{code:'FORBIDDEN'});
  await f.grant({revision:1,readWorkshops:['M2'],editWorkshops:['M2']});const p=await f.prepare(input,f.mj),extra={requestId:randomUUID()};await f.apply(input,p,extra,f.mj);await assert.rejects(f.read('admissionAdmin',f.mj,{sessionId:f.sid}),{code:'FORBIDDEN'});await f.grant({revision:2,active:false});await assert.rejects(f.apply(input,p,extra,f.mj),{code:'FORBIDDEN'});await assert.rejects(f.exportFile('M2',['person'],f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : aucune consultation des dossiers, politiques ou instances`,async()=>{
  const base=makeStore();let guarded=false;const store={get:base.get.bind(base),list:base.list.bind(base),runTransaction:cb=>base.runTransaction(tx=>cb({...tx,get:async path=>{if(guarded)assert.doesNotMatch(path,/\/admission\/|\/registrations\/|\/characters\//);return tx.get(path);},list:async(path,...args)=>{if(guarded){assert.doesNotMatch(path,/\/admission|\/registrations|\/characters$/);if(path.endsWith('/changes'))assert.deepEqual(args[0],['workshop','M2']);}return tx.list(path,...args);}}))};
  const f=await fixture(()=>store);await f.configure();await f.grant({readWorkshops:['M2'],editWorkshops:['M2']});guarded=true;const input=await f.file(undefined,f.mj),p=await f.prepare(input,f.mj);await f.apply(input,p,{},f.mj);const e=await f.exportFile('M2',['person'],f.mj);assert.doesNotMatch(JSON.stringify(e),/quotas|Notice fictive|Règles fictives|invitationHash/);
 });
 test(`${prefix} : cent fiches maximum avec catalogue et archives conservés`,async()=>{
  const f=await fixture(makeStore);await f.configure();const input=await f.file(Array.from({length:100},(_,i)=>({...centralCharacterRow,id:`p${i}`,relations_json:'[]'})));await f.apply(input,await f.prepare(input));assert.equal((await f.view('M2')).changes.length,101);assert.equal((await f.check()).totals.invalid,0);
  const archive=await f.file([{id:'p0',operation:'ARCHIVER',revision:1}]);await f.apply(archive,await f.prepare(archive));const extra=await f.file([{...centralCharacterRow,id:'extra'}]),p=await f.prepare(extra);assert.ok(p.errors.some(e=>/100/.test(e.message)));await assert.rejects(f.apply(extra,p),{code:'INVALID_CENTRAL_IMPORT'});assert.equal((await f.view('M2')).changes.length,101);
 });
 test(`${prefix} : cellules narratives bornées sans troncature et taille native maintenue`,async()=>{
  const f=await fixture(makeStore),objectives=Array.from({length:4},(_,i)=>({id:`o${i}`,title:'Long',description:'x'.repeat(9000),gmNotes:'',steps:[]}));await f.saveCharacter({character:{...centralTestCharacter,objectives}});await assert.rejects(f.exportFile('M2',['person']),{code:'CENTRAL_CHARACTER_EXPORT_LIMIT'});
  const input=await f.file();input.sheets.Personnages[0].objectifs_json=JSON.stringify(objectives);const p=await f.prepare(input);assert.equal(p.errors[0].column,'objectifs_json');await assert.rejects(f.apply(input,p),{code:'INVALID_CENTRAL_IMPORT'});assert.equal((await f.view('M2')).changes[0].data.objectives.length,4);
  const large=await f.file([{...centralCharacterRow,id:'oversized',description:'x'.repeat(4000),biographie:'x'.repeat(20000),secrets_joueur:'x'.repeat(20000),notes_mj:'x'.repeat(20000),interpretation:'x'.repeat(10000),objectifs_json:JSON.stringify(objectives.slice(0,3))}]);const q=await f.prepare(large);assert.ok(q.errors.some(e=>e.message==='CENTRAL_CHARACTER_SIZE'));await assert.rejects(f.apply(large,q),{code:'INVALID_CENTRAL_IMPORT'});
 });
 test(`${prefix} : interruption atomique puis reprise sans historique partiel`,async()=>{
  const base=makeStore();let stop=false;const store={get:base.get.bind(base),list:base.list.bind(base),runTransaction:cb=>base.runTransaction(async tx=>{const r=await cb(tx);if(stop)throw new Error('INTERRUPTION');return r;})};const f=await fixture(()=>store),input=await f.file(),p=await f.prepare(input);stop=true;await assert.rejects(f.apply(input,p),/INTERRUPTION/);stop=false;assert.equal(await base.get(f.base),null);assert.deepEqual(await base.list(`${f.base}/history`),[]);await f.apply(input,p);assert.equal((await f.view('M2')).history.length,1);
 });
}
