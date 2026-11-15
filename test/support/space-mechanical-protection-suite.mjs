import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {healthFixture} from './space-outlaws-health-suite.mjs';
import {actionMenuItems} from '../../web/player-action-menu.mjs';
import {personAdminHtml,personTargetHtml} from '../../web/person-actions.mjs';

export async function mechanicalProtectionFixture(makeStore,{level=1,type='PERSONAL_SHIELD',self=false}={}){
 const f=await healthFixture(makeStore,{classId:'MEC',nature:type==='DROID_ARMOR'?'DROID':'HUMANOID'}),base=`sessions/${f.sid}`,targetId=self?f.cid:f.tid;
 const edit=(path,fn)=>f.store.runTransaction(async tx=>{const key=path?`${base}/${path}`:base;tx.set(key,fn(await tx.get(key)));});
 await f.store.runTransaction(async tx=>{
  const s=await tx.get(base),c=await tx.get(`${base}/characters/${f.cid}`),t=await tx.get(`${base}/characters/${targetId}`),lots=await tx.list(`${base}/inventory`),ex=lots.find(l=>l.holderId===f.cid);
  for(const [id,consumable] of [['shield',false],['cell',true]])tx.set(`${base}/items/${id}`,{id,name:id,consumable,versionId:s.versionId,kind:consumable?'STACKABLE':'INDIVIDUAL',unit:'unité'});
  tx.set(`${base}/inventory/cell`,{...ex,id:'cell',quantity:3,status:'AVAILABLE',revision:1,item:{id:'cell',name:'Cellule compatible',consumable:true,kind:'STACKABLE',unit:'cellule'}});
  tx.set(`${base}/inventory/shield`,{...ex,id:'shield',ownerId:targetId,holderId:targetId,quantity:1,status:type==='DROID_ARMOR'?'INSTALLED':'AVAILABLE',revision:1,location:{kind:type==='DROID_ARMOR'?'DROID_MODULE':'CHARACTER',id:targetId},item:{id:'shield',name:'Protection de recette',consumable:false,kind:'INDIVIDUAL'}});
  const target={...t,protection:0,...(type==='DROID_ARMOR'?{droidModules:[{lotId:'shield',code:'DR-01',status:'OPERATIONAL'}]}:{})};
  const skills=c.abilityProfile.skills.map(k=>k.id==='MEC-02'?{...k,level}:k);
  tx.set(`${base}/characters/${targetId}`,self?{...target,abilityProfile:{...c.abilityProfile,skills}}:target);
  if(!self)tx.set(`${base}/characters/${f.cid}`,{...c,abilityProfile:{...c.abilityProfile,skills}});
 });
 const profile={kind:'PROTECTION',protectionType:type,protectedItemId:'shield',consumable:{itemId:'cell'},publicationState:'PUBLISHED'};
 const saved=await f.actionCmd('savePersonProfile',{profile,reason:'Protection et fourniture compatibles'},f.owner),input={targetId,profileId:saved.id,supplyLots:{cell:'cell'}};
 const prepare=()=>f.actionRead('preparePersonAction',input),start=async(patch={})=>f.actionCmd('startPersonAction',{...input,confirmation:(await prepare()).confirmation,present:true,...patch});
 return {...f,base,edit,profile,input,targetId,prepare,startProtection:start,get:p=>f.store.get(`${base}/${p}`)};
}
export function mechanicalProtectionSuite(makeStore,prefix='Recharge mécanique SO'){
 test(`${prefix} : cinq niveaux, deux fournitures, un point sans PV ni dé et reçu unique`,async()=>{
  for(const type of ['PERSONAL_SHIELD','DROID_ARMOR'])for(let level=1;level<=5;level++){
   const f=await mechanicalProtectionFixture(makeStore,{level,type}),hp=(await f.get(`characters/${f.targetId}`)).hp;
   const q=await f.prepare();assert.equal(q.durationSeconds,[120,105,90,75,60][level-1]);assert.equal(q.cost,1);
   const a=await f.startProtection();await assert.rejects(f.finishCare(a),{code:'FIELD_TOO_EARLY'});f.advance(q.durationSeconds*1000);
   const requestId=randomUUID(),r=await f.finishCare(a,f.player,{requestId});assert.equal(r.result.protection,1);assert.equal(r.result.hp,hp);assert.equal(f.rollCount(),0);
   assert.deepEqual(await f.finishCare(a,f.player,{requestId}),r);assert.equal((await f.points()).available,4);assert.equal((await f.get('inventory/cell')).quantity,2);
   await assert.rejects(f.prepare(),{code:'NO_PROTECTION_NEEDED'});
  }
 });
 test(`${prefix} : recharge sur soi, interruption, pause et récupération propre sans bloquer le soin`,async()=>{
  const f=await mechanicalProtectionFixture(makeStore,{self:true});const a=await f.startProtection();await f.cancelCare(a);assert.equal((await f.points()).reserved,0);assert.equal((await f.get('inventory/cell')).quantity,3);
  const b=await f.startProtection();await f.stage('PAUSE');f.advance(120000);await f.stage('EN_JEU');await assert.rejects(f.finishCare(b),{code:'FIELD_TOO_EARLY'});f.advance(120000);await f.finishCare(b);
  await f.edit(`characters/${f.cid}`,c=>({...c,protection:0}));await assert.rejects(f.prepare(),{code:'COOLDOWN_ACTIVE'});
  const uses=await f.store.list(`${f.base}/characters/${f.cid}/fieldCooldowns`);assert.equal(uses.length,1);assert.ok(uses[0].readyAtGameMs>0);
  f.advance(600000);assert.equal((await f.prepare()).cost,1);
 });
 test(`${prefix} : panne, neutralisation et module non installé refusés sans coût`,async()=>{
  const f=await mechanicalProtectionFixture(makeStore,{type:'DROID_ARMOR'});
  for(const patch of [{status:'DAMAGED'},{status:'OPERATIONAL',neutralizedUntilGameMs:999999999}]){
   await f.edit(`characters/${f.tid}`,c=>({...c,droidModules:[{lotId:'shield',code:'DR-01',...patch}]}));await assert.rejects(f.prepare(),{code:'SO_PROTECTION_DISABLED'});
  }
  await f.edit(`characters/${f.tid}`,c=>({...c,droidModules:[]}));await assert.rejects(f.prepare(),{code:'PROTECTION_EQUIPMENT_REQUIRED'});assert.equal((await f.points()).available,5);
 });
 test(`${prefix} : version et équipement changés en cours, annulation possible`,async()=>{
  const f=await mechanicalProtectionFixture(makeStore),a=await f.startProtection();f.advance(120000);
  await f.edit(`personProfiles/${f.input.profileId}`,p=>({...p,revision:p.revision+1}));await assert.rejects(f.finishCare(a),{code:'FIELD_STATE_CHANGED'});
  await f.cancelCare(a);assert.equal((await f.points()).available,5);assert.equal((await f.get('inventory/cell')).quantity,3);
 });
 test(`${prefix} : remplacement de l’équipement invalide la préparation et la résolution`,async()=>{
  const f=await mechanicalProtectionFixture(makeStore),q=await f.prepare();
  await f.edit('inventory/shield',l=>({...l,revision:l.revision+1}));
  await assert.rejects(f.actionCmd('startPersonAction',{...f.input,confirmation:q.confirmation,present:true}),{code:'STALE_REVISION'});
  const a=await f.startProtection();f.advance(120000);
  await f.edit('inventory/shield',l=>({...l,revision:l.revision+1}));
  await assert.rejects(f.finishCare(a),{code:'FIELD_STATE_CHANGED'});await f.cancelCare(a);
  assert.equal((await f.points()).available,5);assert.equal((await f.get('inventory/cell')).quantity,3);
 });
 test(`${prefix} : droits, niveau, fourniture et ancien manifeste restent fermés`,async()=>{
  const f=await mechanicalProtectionFixture(makeStore);
  await assert.rejects(f.actionCmd('savePersonProfile',{profile:f.profile,reason:'Interdit'},f.player),{code:'FORBIDDEN'});
  await f.edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[]}}));await assert.rejects(f.prepare(),{code:'FIELD_SKILL_REQUIRED'});
  await f.edit('',s=>{const {mechanicalProtectionVersion,...flags}=s.spaceOutlaws;return {...s,spaceOutlaws:flags};});
  await assert.rejects(f.actionCmd('savePersonProfile',{profile:f.profile,reason:'Ancien manifeste'},f.owner),{code:'SO_GAMEPLAY_NOT_OPEN'});
  assert.equal((await f.actionRead('personTarget',{targetId:f.tid})).profiles.some(p=>p.id===f.input.profileId),false);
 });
 test(`${prefix} : menu, préparation et concurrence utilisent le parcours natif`,async()=>{
  const f=await mechanicalProtectionFixture(makeStore),own=await f.actionRead('mySession');assert.ok(actionMenuItems(own).some(x=>x.id==='MEC-02-protection'));
  assert.match(personAdminHtml(await f.actionRead('personAdmin',{},f.owner)),/Recharger un bouclier/);
  assert.match(personTargetHtml(await f.actionRead('personTarget',{targetId:f.tid})),/Cellule compatible/);
  const q=await f.prepare(),input={...f.input,confirmation:q.confirmation,present:true},r=await Promise.allSettled([f.actionCmd('startPersonAction',input),f.actionCmd('startPersonAction',input)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.points()).reserved,1);
 });
}
