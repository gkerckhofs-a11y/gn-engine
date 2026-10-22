import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {masterExample} from '../../src/shared/master-examples.mjs';
import {moduleDraft,moduleFormSheets,moduleMasterSheets} from '../../web/master-editor.mjs';
import {writeMasterXlsx} from '../../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
const view=f=>f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages',sheet:'Attributions'});
const edit=(w,id,values={},mode='edit')=>{const d=moduleDraft(w,id,mode);return moduleFormSheets(w,d,{...d.row,...values});};
export function masterAttributionEditorsSuite(fixture,prefix){
 test(`${prefix} : attributions du scénario éditables et exportables avec leurs identités, sans changer une session`,async()=>{
  const f=await fixture();await f.apply(masterExample());const s=await f.session(),before=await f.store.get(`sessions/${s.id}/characters/pilote`);let w=await view(f);
  assert.equal(w.rows[0].row.id,'profil-pilote');assert.equal(w.rows[0].row.version,'2');const sheets=edit(w,'profil-pilote',{competences:'savoir:4',publication:'NON'}),p=await f.prepare(sheets);assert.deepEqual(p.errors,[]);assert.equal((await f.store.get(`scenarios/${f.scenarioId}/characters/pilote`)).abilityProfile.skills.find(s=>s.id==='savoir').level,2);
  await f.apply(sheets);assert.equal((await f.apply(sheets)).unchanged,true);assert.deepEqual(await f.store.get(`sessions/${s.id}/characters/pilote`),before);
  w=await view(f);const file=readMasterXlsx(writeMasterXlsx(moduleMasterSheets(w)));assert.deepEqual(Object.keys(file),['Meta','Attributions']);assert.equal(file.Attributions[0].personnage_id,'pilote');await f.apply(file);
  w=await view(f);await f.apply(edit(w,'profil-pilote',{},'archive'));w=await view(f);assert.equal(w.rows[0].row.publication,'NON');await f.apply(edit(w,'profil-pilote',{publication:'OUI'}));
  await assert.rejects(f.read('masterWorkspace',{sessionId:s.id,module:'personnages',sheet:'Attributions'}),{code:'INVALID_MASTER_SHEET'});
  await assert.rejects(f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages',sheet:'Attributions'},f.player),{code:'FORBIDDEN'});
 });
 test(`${prefix} : création de profil sur une fiche sans attribution et refus atomiques`,async()=>{
  const f=await fixture();const example=masterExample();delete example.Attributions;await f.apply(example);let w=await view(f);assert.equal(w.rows.length,0);assert.equal(w.references.unprofiledCharacters[0].id,'pilote');
  const sheets=edit(w,'',{personnage_id:'pilote',classe_id:'medic',competences:'savoir:3',publication:'NON'});await f.apply(sheets);w=await view(f);assert.equal(w.rows[0].row.id,sheets.Attributions[0].id);assert.equal(w.references.unprofiledCharacters.length,0);
  const path=`scenarios/${f.scenarioId}/characters/pilote`,before=await f.store.get(path);
  for(const patch of [{classe_id:'absente'},{competences:'savoir:0'},{competences:'absente:2'}]){const bad=edit(w,w.rows[0].row.id,patch);assert.equal((await f.prepare(bad)).canApply,false);await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,sheets:bad,reason:'Test',confirmation:'fausse'}),{code:'INVALID_MASTER'});assert.deepEqual(await f.store.get(path),before);}
  assert.throws(()=>moduleDraft(w,w.rows[0].row.id,'duplicate'));
 });
 test(`${prefix} : profils historiques sans reçu identifiés sans migration, ambiguïtés et retraits non représentables bloqués`,async()=>{
  const f=await fixture();await f.apply(masterExample());let w=await view(f),stamps=(await f.store.list(`scenarios/${f.scenarioId}/masterRows`)).filter(s=>s.sheet==='Attributions');
  await f.store.runTransaction(async tx=>tx.set(`scenarios/${f.scenarioId}/masterRows/${stamps[0].id}`,{...stamps[0],sheet:'FixtureIgnored'}));w=await view(f);assert.match(w.rows[0].row.id,/^profil-[a-f0-9]{64}$/);await f.apply(moduleMasterSheets(w));const stable=w.rows[0].row.id;w=await view(f);assert.equal(w.rows[0].row.id,stable);assert.equal(w.rows[0].row.version,'2');
  const receipt=(await f.store.list(`scenarios/${f.scenarioId}/masterRows`)).find(s=>s.sheet==='Attributions');await f.store.runTransaction(async tx=>tx.set(`scenarios/${f.scenarioId}/masterRows/ambiguous`,{...receipt,id:'ambiguous',rowId:'autre-identifiant'}));w=await view(f);assert.ok(w.errors.some(e=>e.includes('Plusieurs')));assert.throws(()=>moduleMasterSheets(w));
  await f.store.runTransaction(async tx=>{const path=`scenarios/${f.scenarioId}/characters/pilote`,c=await tx.get(path);tx.set(`scenarios/${f.scenarioId}/masterRows/ambiguous`,{...receipt,id:'ambiguous',sheet:'FixtureIgnored'});tx.set(path,{...c,abilityProfile:{...c.abilityProfile,choices:{classId:'medic',overrides:[{skillId:'savoir',level:0}]}}});});w=await view(f);assert.ok(w.errors.some(e=>e.includes('non représentables')));assert.throws(()=>moduleMasterSheets(w));
 });
 test(`${prefix} : concurrence des attributions et réessai idempotent`,async()=>{
  const f=await fixture();await f.apply(masterExample());const w=await view(f),inputs=await Promise.all(['3','4'].map(async level=>{const sheets=edit(w,'profil-pilote',{competences:`savoir:${level}`}),p=await f.prepare(sheets);return {scenarioId:f.scenarioId,sheets,reason:'Import de test',confirmation:p.confirmation,requestId:randomUUID()};}));
  const results=await Promise.allSettled(inputs.map(i=>f.cmd('applyMasterImport',i)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.ok(['INVALID_MASTER','STALE_REVISION'].includes(results.find(r=>r.status==='rejected').reason.code));const winner=results.findIndex(r=>r.status==='fulfilled');assert.deepEqual(await f.cmd('applyMasterImport',inputs[winner]),results[winner].value);
 });
}
