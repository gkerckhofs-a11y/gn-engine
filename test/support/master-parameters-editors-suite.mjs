import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {masterExample} from '../../src/shared/master-examples.mjs';
import {moduleDraft,moduleFormSheets,moduleMasterSheets} from '../../web/master-editor.mjs';
import {writeMasterXlsx} from '../../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
const view=(f,module,extra={})=>f.read('masterWorkspace',{scenarioId:f.scenarioId,module,sheet:'Parametres',...extra});
const edit=(w,v)=>moduleFormSheets(w,moduleDraft(w),v);
const pa={pa_actifs:'OUI',pa_niveau_1:'4',pa_niveau_2:'7',pa_renouvellement_minutes:'27',pa_cout:'0',pa_recuperation_secondes:'13',pa_recuperation_patient_secondes:'17'};
export function masterParametersEditorsSuite(fixture,prefix){
 test(`${prefix} : paramètres modulaires explicites, projection ciblée et aller-retour XLSX`,async()=>{
  const f=await fixture();let w=await view(f,'personnages');assert.ok(Object.values(w.values).every(v=>v===''));assert.throws(()=>edit(w,{pa_actifs:'OUI'}),/Première configuration/);
  const sheets=edit(w,{...pa,sante_active:'OUI',pv_max_defaut:'6'}),p=await f.prepare(sheets,{module:'personnages'});assert.deepEqual(p.errors,[]);assert.equal((await f.read('scenario',{scenarioId:f.scenarioId})).actionPointRules,undefined);await f.apply(sheets,{module:'personnages'});
  for(const [module,values] of [['economie',{economie_active:'OUI',monnaie_nom:'Jetons fictifs',monnaie_unite:'JF'}],['spatioport',{astroport_id:'port-fictif'}]]){w=await view(f,module);await f.apply(edit(w,values),{module});}
  for(const module of ['personnages','economie','spatioport']){w=await view(f,module);const file=readMasterXlsx(writeMasterXlsx(moduleMasterSheets(w)));assert.deepEqual(Object.keys(file),['Meta','Parametres']);assert.equal(file.Meta[0].module,module);await f.apply(file,{module});assert.equal((await f.apply(file,{module})).unchanged,true);}
  const s=await f.read('scenario',{scenarioId:f.scenarioId});assert.equal(s.actionPointRules.cooldownSeconds,13);assert.equal(s.healthRules.defaultMaxHp,6);assert.equal(s.economyRules.name,'Jetons fictifs');assert.equal(s.transportRules.homePort,'port-fictif');
 });
 test(`${prefix} : paramètres interdits et invalides refusés sans mutation, contrôle propriétaire`,async()=>{
  const f=await fixture();await f.apply(masterExample());let w=await view(f,'personnages');const before=await f.store.get(`scenarios/${f.scenarioId}`);
  await assert.rejects(f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages',sheet:'Parametres'},f.player),{code:'FORBIDDEN'});
  for(const module of ['communication','magasins','informations'])await assert.rejects(view(f,module),{code:'INVALID_MASTER_SHEET'});
  for(const values of [{pa_cout:'-1'},{pa_renouvellement_minutes:'0'},{pa_actifs:'PEUTETRE'},{pv_max_defaut:'0'}]){const sheets=edit(w,values);assert.equal((await f.prepare(sheets)).canApply,false);await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,sheets,reason:'Refus',confirmation:'fausse'}),{code:'INVALID_MASTER'});assert.deepEqual(await f.store.get(`scenarios/${f.scenarioId}`),before);}
  assert.equal((await f.prepare({Meta:w.meta,Parametres:[{cle:'monnaie_nom',valeur:'Autre'}]},{module:'personnages'})).canApply,false);
  const e=await fixture(),ew=await view(e,'economie');assert.throws(()=>edit(ew,{economie_active:'OUI'}),/Première configuration/);
 });
 test(`${prefix} : paramètres de session protègent santé, comptes et inventaires, restrictions après lancement`,async()=>{
  const f=await fixture();await f.apply(masterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id},base=`sessions/${s.id}`;
  const before=await Promise.all(['characters','accounts','inventory'].map(k=>f.store.list(`${base}/${k}`)));let w=await view(f,'personnages',extra);assert.ok(!Object.hasOwn(w.values,'sante_active'));assert.ok(Object.hasOwn(w.values,'groupes_actifs'));
  await f.apply(edit(w,{groupes_actifs:'OUI',pa_recuperation_secondes:'23'}),extra);assert.deepEqual(await Promise.all(['characters','accounts','inventory'].map(k=>f.store.list(`${base}/${k}`))),before);
  await assert.rejects(view(f,'economie',extra),{code:'INVALID_MASTER_SHEET'});w=await view(f,'spatioport',extra);await f.apply(edit(w,{astroport_id:'nouveau-port'}),extra);
  const session=await f.read('session',{sessionId:s.id});await f.cmd('setStage',{sessionId:s.id,revision:session.revision,stage:'BRIEFING'});w=await view(f,'personnages',extra);assert.equal(w.editable,false);assert.throws(()=>edit(w,{pa_cout:'1'}),/ne peut pas être modifié/);assert.ok(moduleMasterSheets(w).Parametres.length);await assert.rejects(f.prepare(moduleMasterSheets(w),extra),{code:'MASTER_PREPARATION_REQUIRED'});
 });
 test(`${prefix} : concurrence des paramètres, réessai et préservation des réglages hors contrat`,async()=>{
  const f=await fixture();await f.apply(masterExample());const path=`scenarios/${f.scenarioId}`,parent=await f.store.get(path);await f.store.runTransaction(async tx=>tx.set(path,{...parent,actionPointRules:{...parent.actionPointRules,maxByLevel:{...parent.actionPointRules.maxByLevel,3:12}},healthRules:{...parent.healthRules,returnMode:'MJ'}}));
  const w=await view(f,'personnages'),inputs=await Promise.all(['2','3'].map(async cost=>{const sheets=edit(w,{...w.values,pa_cout:cost}),p=await f.prepare(sheets);assert.deepEqual(p.errors,[]);return {scenarioId:f.scenarioId,sheets,reason:'Import de test',confirmation:p.confirmation,requestId:randomUUID()};}));
  const results=await Promise.allSettled(inputs.map(i=>f.cmd('applyMasterImport',i)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.ok(['INVALID_MASTER','STALE_REVISION'].includes(results.find(r=>r.status==='rejected').reason.code));const win=results.findIndex(r=>r.status==='fulfilled');assert.deepEqual(await f.cmd('applyMasterImport',inputs[win]),results[win].value);
  const after=await f.store.get(path);assert.equal(after.actionPointRules.maxByLevel[3],12);assert.equal(after.healthRules.returnMode,'MJ');
 });
}
