import {analysisProfile} from '../../src/shared/space-outlaws-analysis.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {healthFixture} from './space-outlaws-health-suite.mjs';
import {droidModules,droidModuleWork} from '../../src/shared/space-droid-modules.mjs';
import {personAdminHtml,personTargetHtml} from '../../web/person-actions.mjs';

export async function droidWorkFixture(makeStore,{level=2,code='DR-03',self=false,damaged=false}={}){
 const f=await healthFixture(makeStore,{classId:'MEC',nature:'DROID'}),base=`sessions/${f.sid}`,targetId=self?f.cid:f.tid;
 const edit=(path,fn)=>f.store.runTransaction(async tx=>{const key=path?`${base}/${path}`:base;tx.set(key,fn(await tx.get(key)));});
 await f.store.runTransaction(async tx=>{
  const s=await tx.get(base),c=await tx.get(`${base}/characters/${f.cid}`),lots=await tx.list(`${base}/inventory`),sample=lots.find(l=>l.holderId===f.cid);
  const module={id:'module',name:'Module de recette',description:'Matériel fictif',kind:'INDIVIDUAL',consumable:false,droidModule:{code},usage:'PERSONAL',versionId:s.versionId,publicationState:'PUBLISHED',revision:1,unit:'unité',unitVolume:1};
  const parts={id:'parts25',name:'Pièces de 25 Cr',kind:'STACKABLE',consumable:true,referenceUnitValueCr:25,usage:'PERSONAL',versionId:s.versionId,publicationState:'PUBLISHED',revision:1,unit:'lot',unitVolume:1};
  for(const item of [module,parts])tx.set(`${base}/items/${item.id}`,item);
  tx.set(`${base}/inventory/module`,{...sample,id:'module',item:module,quantity:1,status:'AVAILABLE',revision:1,transferable:true,resellable:true,origin:{kind:'TEST_PREPARED_STOCK'},...(damaged?{moduleState:{status:'DAMAGED'}}:{})});
  tx.set(`${base}/inventory/parts`,{...sample,id:'parts',item:parts,quantity:20,status:'AVAILABLE',revision:1,transferable:true,origin:{kind:'TEST_PREPARED_STOCK'}});
  tx.set(`${base}/characters/${c.id}`,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>['MEC-02','MEC-03'].includes(k.id)?{...k,level}:k)}});
 });
 const profiles={};for(const operation of ['INSTALL','REMOVE','REPAIR'])profiles[operation]=(await f.actionCmd('savePersonProfile',{profile:{kind:'DROID_MODULE',moduleOperation:operation,clinicTargetId:'scene',partsItemId:'parts25',publicationState:'PUBLISHED'},reason:'Atelier préparé de recette'},f.owner)).id;
 const input=(operation='INSTALL',moduleLotId='module')=>({targetId,profileId:profiles[operation],moduleLotId,supplyLots:{parts25:'parts'}});
 const consent=async(operation='INSTALL',moduleLotId='module')=>{if(self)return;const i={technicianId:f.cid,profileId:profiles[operation],moduleLotId},p=await f.actionRead('prepareDroidConsent',i,f.other);return f.actionCmd('consentDroidWork',{...i,grant:true,present:true,confirmation:p.confirmation},f.other);};
 const prepare=(operation='INSTALL',moduleLotId='module')=>f.actionRead('preparePersonAction',input(operation,moduleLotId));
 const start=async(operation='INSTALL',moduleLotId='module')=>{const i=input(operation,moduleLotId),p=await prepare(operation,moduleLotId);return f.actionCmd('startPersonAction',{...i,confirmation:p.confirmation,present:true});};
 const finish=async(a)=>{f.advance(a.remainingMs);return f.finishCare(a);};
 return {...f,base,targetId,profiles,edit,input,consent,prepare,startModule:start,finishModule:finish,get:p=>f.store.get(`${base}/${p}`)};
}
export function droidWorkSuite(makeStore,prefix='Atelier des droïdes'){
 test(`${prefix} : six modules, consentement, pose et retrait du même bien sans protection ni PV créés`,async()=>{
  for(const m of droidModules){
   const f=await droidWorkFixture(makeStore,{code:m.code}),before=await f.get(`characters/${f.targetId}`);
   await assert.rejects(f.prepare(),{code:'SO_DROID_CONSENT'});await f.consent();const p=await f.prepare();assert.equal(p.durationSeconds,m.level===1?300:600);assert.equal(p.cost,1);
   const a=await f.startModule();await assert.rejects(f.finishCare(a),{code:'FIELD_TOO_EARLY'});await f.finishModule(a);
   const lot=await f.get('inventory/module'),owner=await f.get(`characters/${f.targetId}`);assert.equal(lot.status,'INSTALLED');assert.equal(lot.ownerId,f.targetId);assert.equal(owner.droidModules.length,1);assert.equal(owner.hp,before.hp);assert.equal(owner.protection,before.protection);
   f.advance(600000);await f.consent('REMOVE');const b=await f.startModule('REMOVE');assert.equal(b.remainingMs,300000);await f.finishModule(b);
   assert.equal((await f.get('inventory/module')).status,'AVAILABLE');assert.equal((await f.get('inventory/module')).ownerId,f.targetId);assert.equal((await f.get(`characters/${f.targetId}`)).droidModules.length,0);assert.equal((await f.points()).available,3);assert.equal(f.rollCount(),0);
  }
 });
 test(`${prefix} : réparation durable à 25 % arrondis, réservations, reçu unique et aucun soin de PV`,async()=>{
  for(const m of droidModules){
   const f=await droidWorkFixture(makeStore,{code:m.code,damaged:true});await f.consent();await f.finishModule(await f.startModule());
   await f.edit(`characters/${f.targetId}`,c=>({...c,hp:2,protection:0}));await f.consent('REPAIR');const p=await f.prepare('REPAIR');assert.equal(p.supplies[0].quantity,droidModuleWork(m.code,'REPAIR').partsValue/25);
   const a=await f.startModule('REPAIR');assert.equal((await f.get('inventory/parts')).quantity,20);f.advance(a.remainingMs);const requestId=randomUUID(),r=await f.finishCare(a,f.player,{requestId});assert.deepEqual(await f.finishCare(a,f.player,{requestId}),r);
   const owner=await f.get(`characters/${f.targetId}`);assert.equal(owner.droidModules[0].status,'OPERATIONAL');assert.equal(owner.hp,2);assert.equal(owner.protection,0);assert.equal((await f.get('inventory/parts')).quantity,20-p.supplies[0].quantity);assert.equal((await f.points()).available,3);
  }
 });
 test(`${prefix} : révocation en cours libère module, PA et pièces sans réparation partielle`,async()=>{
  const f=await droidWorkFixture(makeStore,{damaged:true});await f.consent();await f.finishModule(await f.startModule());await f.consent('REPAIR');const a=await f.startModule('REPAIR');
  await f.actionCmd('consentDroidWork',{grant:false},f.other);f.advance(a.remainingMs);await assert.rejects(f.finishCare(a),{code:'SO_DROID_CONSENT'});await f.cancelCare(a);
  assert.equal((await f.get('inventory/module')).status,'INSTALLED');assert.equal((await f.get('inventory/parts')).quantity,20);assert.equal((await f.get(`characters/${f.targetId}`)).droidModules[0].status,'DAMAGED');assert.equal((await f.points()).available,4);
 });
 test(`${prefix} : niveaux, deux emplacements, atelier indisponible et ancien manifeste contrôlés`,async()=>{
  const f=await droidWorkFixture(makeStore,{level:1,code:'DR-03'});await assert.rejects(f.consent(),{code:'FIELD_SKILL_REQUIRED'});
  const g=await droidWorkFixture(makeStore,{self:true});await g.edit(`characters/${g.targetId}`,c=>({...c,droidModules:[{lotId:'first',code:'DR-01'},{lotId:'second',code:'DR-02'}]}));await assert.rejects(g.prepare(),{code:'SO_DROID_SLOTS'});
  await g.edit(`characters/${g.targetId}`,c=>({...c,droidModules:[]}));await g.edit('fieldStates/scene',s=>({...s,status:'OFFLINE',offlineUntilGameMs:null}));await assert.rejects(g.prepare(),{code:'FIELD_UNAVAILABLE'});
  await g.edit('',s=>{const {droidModulesVersion,...spaceOutlaws}=s.spaceOutlaws;return {...s,spaceOutlaws};});await assert.rejects(g.prepare(),{code:'SO_GAMEPLAY_NOT_OPEN'});assert.equal((await g.points()).available,5);
 });
 test(`${prefix} : préparation périmée, double démarrage, pause et arrêt sans effet`,async()=>{
  const f=await droidWorkFixture(makeStore,{self:true}),p=await f.prepare();await f.edit('inventory/module',l=>({...l,revision:l.revision+1}));await assert.rejects(f.actionCmd('startPersonAction',{...f.input(),confirmation:p.confirmation,present:true}),{code:'STALE_REVISION'});
  const q=await f.prepare(),r=await Promise.allSettled([f.actionCmd('startPersonAction',{...f.input(),confirmation:q.confirmation,present:true}),f.actionCmd('startPersonAction',{...f.input(),confirmation:q.confirmation,present:true})]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);const a=r.find(x=>x.status==='fulfilled').value;
  await f.stage('PAUSE');f.advance(600000);await f.stage('EN_JEU');await assert.rejects(f.finishCare(a),{code:'FIELD_TOO_EARLY'});await f.cancelCare(a);assert.equal((await f.points()).available,5);assert.equal((await f.get('inventory/module')).status,'AVAILABLE');
 });
 test(`${prefix} : scanner choisi avant le jet, un seul bonus, neutralisation contrôlée à la résolution`,async()=>{
  const f=await droidWorkFixture(makeStore,{self:true});await f.finishModule(await f.startModule());
  await f.edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills,{id:'TRA-01',name:'Traces',kind:'PASSIVE',level:1}]}}));
  await f.edit('fieldTargets/scene',t=>({...t,profiles:{ANALYZE:{kind:'ANALYZE',...analysisProfile('TRA-01',{bonusItems:[{itemId:'module',bonus:2}]})}},rewards:t.rewards.map(r=>r.id==='higher'?{...r,bonus:true,minLevel:1}:r)}));
  const d=await f.actionRead('fieldTarget',{targetId:'scene'});assert.equal(d.profiles[0].bonusLots.find(l=>l.id==='module').bonus,1);
  const a=await f.start({bonusLotId:'module'});assert.equal(a.bonus,1);
  await f.edit(`characters/${f.cid}`,c=>({...c,droidModules:c.droidModules.map(m=>({...m,neutralizedUntilGameMs:999999999}))}));f.advance(120000);await assert.rejects(f.finish(a),{code:'FIELD_EQUIPMENT_UNAVAILABLE'});
  await f.actionCmd('cancelFieldAction',{actionId:a.id,reason:'Scanner neutralisé'});assert.equal((await f.get('inventory/module')).status,'INSTALLED');
  await f.edit(`characters/${f.cid}`,c=>({...c,droidModules:c.droidModules.map(m=>({...m,neutralizedUntilGameMs:0}))}));const b=await f.start({bonusLotId:'module'});f.advance(120000);f.setDie(4);const r=await f.finish(b);assert.equal(r.result.total,6);assert.equal(r.result.bonus,1);assert.equal((await f.get('inventory/module')).status,'INSTALLED');
  f.advance(600000);await f.finishModule(await f.startModule('REMOVE'));await f.edit('fieldTargets/scene',t=>({...t,revision:t.revision+1}));await assert.rejects(f.start({bonusLotId:'module'}),{code:'FIELD_EQUIPMENT_UNAVAILABLE'});
 });
 test(`${prefix} : interface DR-04 sur terminal compatible uniquement, sans retirer le module installé`,async()=>{
  const f=await droidWorkFixture(makeStore,{self:true,code:'DR-04'});await f.finishModule(await f.startModule());
  await f.edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills,{id:'INF-01',name:'Intrusion',kind:'PASSIVE',level:1}]}}));
  await f.edit('fieldTargets/scene',t=>({...t,kind:'INTRUSION',profiles:{},rewards:[],intrusion:{category:'LOCK',minLevel:1,threshold:6,bonusItemIds:['module'],successText:'Accès fictif',failureText:'Échec'}}));
  const input={targetId:'scene',bonusLotId:'module',present:true};await assert.rejects(f.actionCmd('startSoIntrusion',input),{code:'FIELD_EQUIPMENT_UNAVAILABLE'});
  await f.edit('fieldTargets/scene',t=>({...t,revision:t.revision+1,intrusion:{...t.intrusion,category:'TERMINAL'}}));assert.ok((await f.actionRead('mySoIntrusion',{targetId:'scene'})).bonusLots.some(l=>l.id==='module'));
  const a=await f.actionCmd('startSoIntrusion',input);f.advance(180000);f.setDie(4);const r=await f.actionCmd('finishSoIntrusion',{targetId:'scene',actionId:a.id,present:true});assert.equal(r.total,6);assert.equal(r.success,true);assert.equal((await f.get('inventory/module')).status,'INSTALLED');
 });
 test(`${prefix} : données privées, interface propriétaire et préparation MJ`,async()=>{
  const f=await droidWorkFixture(makeStore);const d=await f.actionRead('personTarget',{targetId:f.targetId});assert.ok(d.moduleLots.every(l=>l.id==='module'));assert.equal(d.droidWorkshop,undefined);
  const own=await f.actionRead('personTarget',{targetId:f.targetId},f.other);assert.match(personTargetHtml(own),/Autoriser un technicien/);assert.match(personAdminHtml(await f.actionRead('personAdmin',{},f.owner)),/Modules de droïdes/);
  await assert.rejects(f.actionCmd('savePersonProfile',{profile:{kind:'DROID_MODULE'},reason:'Non autorisé'}),{code:'FORBIDDEN'});
 });
 test(`${prefix} : panne MJ auditée, droits et réparation native sans recréer la protection`,async()=>{
  const f=await droidWorkFixture(makeStore,{code:'DR-01',self:true});
  await f.edit('inventory/module',l=>({...l,moduleState:{status:'OPERATIONAL',protectionCharge:1}}));await f.edit(`characters/${f.cid}`,c=>({...c,protection:0}));await f.finishModule(await f.startModule());assert.equal((await f.get(`characters/${f.cid}`)).protection,1);
  const input={moduleLotId:'module',revision:(await f.get('inventory/module')).revision,reason:'Incident préparé en scène'};
  await assert.rejects(f.actionCmd('damageDroidModule',input),{code:'FORBIDDEN'});
  const requestId=randomUUID(),r=await f.actionCmd('damageDroidModule',{...input,requestId},f.owner);assert.deepEqual(await f.actionCmd('damageDroidModule',{...input,requestId},f.owner),r);
  assert.equal((await f.get(`characters/${f.cid}`)).droidModules[0].status,'DAMAGED');assert.equal((await f.get(`characters/${f.cid}`)).protection,1);
  const admin=await f.actionRead('personAdmin',{},f.owner);assert.equal(admin.droidModules.find(m=>m.id==='module').status,'DAMAGED');assert.match(personAdminHtml(admin),/État matériel/);
  const a=await f.startModule('REPAIR');await f.finishModule(a);assert.equal((await f.get(`characters/${f.cid}`)).droidModules[0].status,'OPERATIONAL');
 });
 test(`${prefix} : modèles M1 importés et exportés sans stock, aucun module gratuit dans les kits`,async()=>{
  const {importFixture,centralItemRow}=await import('./central-import-suite.mjs'),{readCentralXlsx,writeCentralXlsx}=await import('../../web/central-xlsx.mjs'),{centralClassKitProjection}=await import('../../src/core/central-class-kits.mjs'),{newLot}=await import('../../src/core/inventory-state.mjs');
  const f=await importFixture(makeStore),rows=droidModules.map((m,i)=>({...centralItemRow,id:'module'+i,type:'INDIVIDUAL',consommable:'NON',module_droide:m.code})),input=await f.file('M1',rows),q=await f.prepare(input);assert.deepEqual(q.errors,[]);await f.apply(input,q);
  const exported=await f.exportFile('M1',rows.map(r=>r.id)),roundtrip=readCentralXlsx(writeCentralXlsx(exported.sheets));assert.deepEqual(roundtrip.Objets.map(r=>r.module_droide).sort(),droidModules.map(m=>m.code).sort());
  const changes=(await f.view()).changes,armor=changes.find(c=>c.data.droidModule.code==='DR-01');assert.equal(newLot('fresh',armor.data,1,'owner',0,{kind:'TEST'}).moduleState.protectionCharge,1);
  const projection=centralClassKitProjection([...changes,{type:'classKit',entityId:'MED',operation:'UPSERT',data:{bindings:[{slotId:'communicator',itemId:armor.entityId}]}}]);assert.ok(projection.diagnostics.some(d=>d.code==='KIT_MODULE_FORBIDDEN'));
  assert.deepEqual(await f.store.list(`sessions/${f.sid}/inventory`),[]);
 });

}
