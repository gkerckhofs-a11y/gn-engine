import {fieldTargetHtml} from '../../web/field-actions.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {droidWorkFixture} from './space-droid-work-suite.mjs';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {analysisTarget} from './space-outlaws-actions-suite.mjs';
import {analysisProfile} from '../../src/shared/space-outlaws-analysis.mjs';
import {initialFieldState} from '../../src/core/field-state.mjs';
import {installationProfiles} from '../../src/shared/space-installation.mjs';
import {fieldResultHtml,fieldAdminHtml} from '../../web/field-actions.mjs';
export async function nativeTechnicalFixture(makeStore,{kind='DROID',level=2,self=false}={}){
 const f=kind==='SHIP'?await soVoyagesFixture(makeStore):await droidWorkFixture(makeStore,{self,damaged:!self}),base=`sessions/${f.sid}`,edit=(p,fn)=>f.store.runTransaction(async tx=>{const k=p?`${base}/${p}`:base;tx.set(k,fn(await tx.get(k)));});
 if(kind==='DROID'){
  await f.consent();await f.finishModule(await f.startModule());
  await f.store.runTransaction(async tx=>{const sample=await tx.get(`${base}/inventory/module`);const item={...sample.item,id:'armor',droidModule:{code:'DR-01'},name:'Blindage intégré'};tx.set(`${base}/items/armor`,item);tx.set(`${base}/inventory/armor`,{...sample,id:'armor',item,ownerId:f.cid,holderId:f.cid,location:{kind:'CHARACTER',id:f.cid},status:'AVAILABLE',revision:1,moduleState:{status:'OPERATIONAL',protectionCharge:0}});});
  f.advance(600000);await f.consent('INSTALL','armor');await f.finishModule(await f.startModule('INSTALL','armor'));await edit(`characters/${f.targetId}`,c=>({...c,hp:2,protection:0}));
 }
 const targetId=kind==='DROID'?f.targetId:kind==='SHIP'?'ship':'switch';
 await f.store.runTransaction(async tx=>{
  const c=await tx.get(`${base}/characters/${f.cid}`),target={...analysisTarget('MEC-01'),id:'diagnostic',publicationState:'PUBLISHED',revision:1,profiles:{ANALYZE:{kind:'ANALYZE',...analysisProfile('MEC-01')}}};
  tx.set(`${base}/characters/${f.cid}`,{...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills.filter(k=>k.id!=='MEC-01'),{id:'MEC-01',name:'Diagnostic',kind:'PASSIVE',level}]}});
  tx.set(`${base}/fieldTargets/diagnostic`,target);tx.set(`${base}/fieldStates/diagnostic`,initialFieldState(target));
  if(kind==='INSTALLATION'){const t={...target,id:'switch',kind:'INSTALLATION',title:'Générateur',profiles:installationProfiles({kitId:'kit_communicator'}),rewards:[],offlineSeconds:900,failureLockSeconds:300,repairProtectionSeconds:900};tx.set(`${base}/fieldTargets/switch`,t);tx.set(`${base}/fieldStates/switch`,{...initialFieldState(t),status:'OFFLINE',offlineUntilGameMs:999999999});}
 });
 const bind={targetId:'diagnostic',entityKind:kind,entityId:targetId,active:true,revision:0,observations:[{level:2,hidden:false,text:'Observation N2 préparée'},{level:3,hidden:true,text:'SECRET_N3'},{level:5,hidden:false,text:'Observation N5 préparée'}],bonusItems:self?['module']:[],reason:'Liaison physique préparée'};
 await f.actionCmd('bindTechnicalTarget',bind,f.owner);
 const input={targetId:'diagnostic',kind:'ANALYZE'},prepare=(patch={})=>f.actionRead('prepareFieldAction',{...input,...patch}),start=async(patch={})=>f.actionCmd('startFieldAction',{...input,...patch,present:true,confirmation:(await prepare(patch)).confirmation}),finish=a=>f.actionCmd('finishFieldAction',{actionId:a.id,present:true});
 return {...f,initialAvailable:(await f.points()).available,base,edit,targetId,bind,prepareDiagnostic:prepare,startDiagnostic:start,finishDiagnostic:finish,get:p=>f.store.get(`${base}/${p}`)};
}
export function nativeTechnicalSuite(makeStore,prefix='Diagnostic natif MEC-01'){
 test(`${prefix} : N1, N2 et N5, états distincts, devis et aucun effet réparateur`,async()=>{
  for(const level of [1,2,5]){const f=await nativeTechnicalFixture(makeStore,{level}),before=await f.get(`characters/${f.targetId}`),scan=await f.actionRead('fieldTarget',{targetId:'diagnostic'});assert.doesNotMatch(JSON.stringify(scan),/SECRET_N3|Observation N/);assert.equal(scan.profiles[0].test,level===5?'D6':'AUTO');
   const a=await f.startDiagnostic();assert.equal(a.durationSeconds,60);assert.equal(a.cost,1);await assert.rejects(f.finishDiagnostic(a),{code:'FIELD_TOO_EARLY'});f.advance(60000);f.setDie(1);const r=await f.finishDiagnostic(a),report=r.result.technical;
   assert.match(JSON.stringify(report.rows),/2 \/ 3 PV/);assert.match(JSON.stringify(report.rows),/0 \/ 1/);assert.match(JSON.stringify(report.rows),/Panne durable/);assert.match(JSON.stringify(report.rows),/blindage 0\/1/);assert.equal(report.interventions.length>0,level>=2);assert.equal(report.information.includes('Observation N2 préparée'),level>=2);
   if(level>=2){const repair=report.interventions.find(i=>i.name.startsWith('Réparer'));assert.equal(repair.partsCr,100);assert.equal(repair.seconds,600);}
   assert.equal((await f.get(`characters/${f.targetId}`)).hp,before.hp);assert.equal((await f.get(`characters/${f.targetId}`)).protection,0);assert.equal((await f.get(`characters/${f.targetId}`)).droidModules[0].status,'DAMAGED');assert.match(fieldResultHtml(r),/Diagnostic de/);
   assert.equal((await f.points()).available,f.initialAvailable-1);assert.equal(f.rollCount(),level===5?1:0);
  }
 });
 test(`${prefix} : panne changée en cours, résolution périmée puis annulation sans coût`,async()=>{
  const f=await nativeTechnicalFixture(makeStore),a=await f.startDiagnostic();
  await f.store.runTransaction(async tx=>{const l=await tx.get(`${f.base}/inventory/parts`);tx.set(`${f.base}/inventory/parts_owner`,{...l,id:'parts_owner',ownerId:f.tid,holderId:f.tid,location:{kind:'CHARACTER',id:f.tid}});});
  const input={targetId:f.tid,profileId:f.profiles.REPAIR,moduleLotId:'module',supplyLots:{parts25:'parts_owner'}},q=await f.actionRead('preparePersonAction',input,f.other),repair=await f.actionCmd('startPersonAction',{...input,present:true,confirmation:q.confirmation},f.other);f.advance(repair.remainingMs);await f.finishCare(repair,f.other);

  await assert.rejects(f.finishDiagnostic(a),{code:'FIELD_STATE_CHANGED'});assert.equal((await f.points()).reserved,1);await f.actionCmd('cancelFieldAction',{actionId:a.id,reason:'État réparé pendant le diagnostic'});assert.equal((await f.points()).available,f.initialAvailable);assert.equal((await f.get('fieldStates/diagnostic')).technicalAnalyses,undefined);
 });
 test(`${prefix} : supplément échoué n’efface pas l’ordinaire, tentative unique et reçu rejoué`,async()=>{
  const f=await nativeTechnicalFixture(makeStore,{level:3}),a=await f.startDiagnostic();f.advance(60000);f.setDie(1);const requestId=randomUUID(),input={actionId:a.id,present:true,requestId},r=await f.actionCmd('finishFieldAction',input);assert.deepEqual(await f.actionCmd('finishFieldAction',input),r);assert.equal(r.result.technical.hiddenSuccess,false);assert.ok(r.result.technical.information.includes('Observation N2 préparée'));assert.doesNotMatch(JSON.stringify(r),/SECRET_N3/);
  f.advance(600000);await f.consent('REPAIR');const repair=await f.startModule('REPAIR');await f.cancelCare(repair);await assert.rejects(f.prepareDiagnostic(),{code:'FIELD_ANALYSIS_DONE'});assert.equal((await f.points()).available,f.initialAvailable-1);const saved=(await f.actionRead('myFieldActions')).actions.find(x=>x.id===a.id);assert.deepEqual(saved.result,r.result);
 });
 test(`${prefix} : scanner installé +1 seulement sur le complément préparé`,async()=>{
  const f=await nativeTechnicalFixture(makeStore,{level:3,self:true}),a=await f.startDiagnostic({bonusLotId:'module'});const ui=fieldTargetHtml(await f.actionRead('fieldTarget',{targetId:'diagnostic'}));assert.match(ui,/name="bonusLotId"/);assert.match(ui,/complément caché préparé demande/);assert.equal(a.bonus,1);f.advance(60000);f.setDie(2);const r=await f.finishDiagnostic(a);assert.equal(r.result.technical.hiddenSuccess,true);assert.ok(r.result.technical.information.includes('SECRET_N3'));assert.equal((await f.get('inventory/module')).status,'INSTALLED');
 });
 test(`${prefix} : installation neutralisée et vaisseau à réviser, devis du moteur natif`,async()=>{
  const f=await nativeTechnicalFixture(makeStore,{kind:'INSTALLATION'}),a=await f.startDiagnostic();f.advance(60000);const r=await f.finishDiagnostic(a);assert.match(JSON.stringify(r.result.technical.rows),/Neutralisation temporaire/);assert.equal(r.result.technical.interventions[0].seconds,180);assert.equal((await f.get('fieldStates/switch')).status,'OFFLINE');
  const g=await nativeTechnicalFixture(makeStore,{kind:'SHIP'});await g.edit('ships/ship',s=>({...s,hull:s.hull-1,revisionRequired:true}));const b=await g.startDiagnostic();g.advance(60000);const q=await g.finishDiagnostic(b),ship=await g.get('ships/ship');assert.equal(q.result.technical.interventions.find(i=>i.name==='Révision').partsCr,ship.soProfile.referencePrice*0.01);assert.equal(q.result.technical.interventions.find(i=>i.name==='Réparer la coque').partsCr,ship.soProfile.referencePrice*0.05);assert.equal(ship.revisionRequired,true);
 });
 test(`${prefix} : configuration MJ, cible inaccessible, ancien manifeste et absence de PA`,async()=>{
  const f=await nativeTechnicalFixture(makeStore);await assert.rejects(f.actionCmd('bindTechnicalTarget',{...f.bind,revision:1}),{code:'FORBIDDEN'});assert.match(fieldAdminHtml(await f.actionRead('fieldAdmin',{},f.owner)),/Diagnostics techniques reliés/);
  await f.edit(`characters/${f.cid}/resources/actionPoints`,p=>({...p,available:0}));await assert.rejects(f.prepareDiagnostic(),{code:'NOT_ENOUGH_ACTION_POINTS'});
  await f.edit('technicalBindings/diagnostic',b=>({...b,active:false}));await assert.rejects(f.actionRead('fieldTarget',{targetId:'diagnostic'}),{code:'FIELD_UNAVAILABLE'});
  await f.edit('technicalBindings/diagnostic',b=>({...b,active:true}));await f.edit('',s=>{const {nativeTechnicalAnalysisVersion,...flags}=s.spaceOutlaws;return {...s,spaceOutlaws:flags};});await assert.rejects(f.actionRead('fieldTarget',{targetId:'diagnostic'}),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : première observation automatique puis unique approfondissement après progression et épisode`,async()=>{
  const f=await nativeTechnicalFixture(makeStore,{level:1}),a=await f.startDiagnostic();f.advance(60000);await f.finishDiagnostic(a);f.advance(600000);
  await f.edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='MEC-01'?{...k,level:3}:k)}}));
  const b=await f.startDiagnostic();f.advance(60000);f.setDie(1);await f.finishDiagnostic(b);const old=await f.get('fieldStates/diagnostic'),{episodeHarness}=await import('./space-episodes-suite.mjs'),e=await episodeHarness(f);
  await e.close();await e.resume(await e.begin());assert.deepEqual(await e.get('technicalBindings/diagnostic'),await f.get('technicalBindings/diagnostic'));assert.deepEqual((await e.get('fieldStates/diagnostic')).technicalAnalyses,old.technicalAnalyses);await e.stage('EN_JEU');f.advance(600000);
  await assert.rejects(e.read('prepareFieldAction',{targetId:'diagnostic',kind:'ANALYZE'},f.player),{code:'FIELD_ANALYSIS_DONE'});
 });

 test(`${prefix} : aide compétente exigée pour le supplément, un seul bonus matériel et aucun PA supplémentaire`,async()=>{
  const f=await nativeTechnicalFixture(makeStore,{level:3,self:true}),offer=await f.actionCmd('offerAid',{targetId:f.cid,skillId:'MEC-01',present:true},f.other);
  await assert.rejects(f.prepareDiagnostic({aidOfferId:offer.id,bonusLotId:'module'}),{code:'FIELD_SKILL_REQUIRED'});
  await f.edit(`characters/${f.tid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='MEC-01'?{...k,level:3}:k)}}));
  const before=(await f.points(f.other)).available,a=await f.startDiagnostic({aidOfferId:offer.id,bonusLotId:'module'});f.advance(60000);f.setDie(1);const r=await f.finishDiagnostic(a);assert.equal(r.result.total,6);assert.equal(r.result.technical.hiddenSuccess,true);assert.equal((await f.points(f.other)).available,before);
 });

}
