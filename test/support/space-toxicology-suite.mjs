import {episodeHarness} from './space-episodes-suite.mjs';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
import {installationTarget} from './space-installation-suite.mjs';
import {newLot} from '../../src/core/inventory-state.mjs';
export async function toxicologyFixture(makeStore,{nature='HUMANOID',level=3}={}){
 const f=await actionsFixture(makeStore,{classId:'MED',nature,helper:true,release:false});
 const cc=(a,input)=>f.cc(a,{draftRevision:0,...input});
 for(const id of ['ingredient','malaise-dose','antidote-dose'])await cc('saveCentralItem',{draftRevision:(await f.view()).draft.revision,itemId:id,itemRevision:0,item:{name:id,kind:id==='ingredient'?'STACKABLE':'INDIVIDUAL',consumable:true},reason:'Consommable fictif préparé'});
 const lab={...installationTarget(),laboratory:true};lab.profiles.SABOTAGE.consumable.itemId='ingredient';
 await cc('saveCentralFieldTarget',{draftRevision:(await f.view()).draft.revision,fieldTargetId:'lab',fieldTargetRevision:0,fieldTarget:lab,reason:'Laboratoire préparé'});
 for(const [id,kind,minLevel,productItemId] of [['malaise','MALAISE',2,'malaise-dose'],['antidote','ANTIDOTE',1,'antidote-dose']])await cc('saveCentralRecipe',{draftRevision:(await f.view()).draft.revision,recipeId:id,recipeRevision:0,recipe:{name:id,kind,minLevel,productItemId,skillId:'TOXI-01',effectId:'STAT-MALAISE-01',laboratoryTargetId:'lab',unlockKnowledgeId:'ordinary',components:[{itemId:'ingredient',quantity:2}],...(kind==='ANTIDOTE'?{compatibleRecipeIds:['malaise']}:{})},reason:'Recette canonique fictive'});
 const preview=await f.releasePreview();assert.deepEqual(preview.blockers,[]);await f.release(preview);await f.birth(await f.birthPreview());await f.birth(await f.birthPreview(f.owner,{uid:f.other.uid}),{uid:f.other.uid});await f.stage('EN_JEU');
 const cid=(await f.actionRead('mySession')).character.id,otherId=(await f.actionRead('mySession',{},f.other)).character.id,base=`sessions/${f.sid}`;
 await f.store.runTransaction(async tx=>{const c=await tx.get(base+'/characters/'+cid),item=await tx.get(base+'/items/ingredient');tx.set(base+'/characters/'+cid,{...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills,{id:'TOXI-01',kind:'PASSIVE',name:'Toxicologie',level}]}});assert.ok(item);tx.set(base+'/inventory/components',newLot('components',item,40,cid,1000000,{kind:'SCENARIO_VERSION'}));});
 const k=await f.store.get(base+'/knowledge/ordinary');await f.actionCmd('grantKnowledge',{characterId:cid,knowledgeId:'ordinary',knowledgeRevision:k.revision,grantRevision:0,enabled:true,reason:'Recettes apprises'},f.owner);
 const profiles=targetId=>f.actionRead('personTarget',{targetId});
 const start=async(kind='TOXI_CRAFT',recipe='malaise',extra={})=>{const targetId=kind==='TOXI_CRAFT'?cid:otherId,d=await profiles(targetId),p=d.profiles.find(p=>p.kind===kind&&p.name.endsWith(recipe));assert.ok(p);const input={targetId,profileId:p.id,laboratoryId:'lab',supplyLots:{ingredient:'components'},...extra},q=await f.actionRead('preparePersonAction',input);return f.actionCmd('startPersonAction',{...input,confirmation:q.confirmation,present:true});};
 const finish=a=>f.actionCmd('finishPersonAction',{actionId:a.id,present:true});
 const craft=async(recipe='malaise')=>{const a=await start('TOXI_CRAFT',recipe);f.advance(300000);return (await finish(a)).result.doseId;};
 return {...f,cid,otherId,base,profiles,start,finish,craft};
}
export function spaceToxicologySuite(makeStore,prefix='Toxicologie V0.7'){
 test(prefix+' : laboratoire, recette connue et composants produisent une dose suivie sans dé',async()=>{
  const f=await toxicologyFixture(makeStore),id=await f.craft();assert.ok(id);assert.equal(f.rollCount(),0);assert.equal((await f.points()).available,4);
  const dose=await f.store.get(f.base+'/toxicDoses/'+id),lot=await f.store.get(f.base+'/inventory/'+id);assert.equal(dose.status,'FABRICATED');assert.equal(lot.quantity,1);assert.equal((await f.store.get(f.base+'/inventory/components')).quantity,38);
  await assert.rejects(f.start(),{code:'COOLDOWN_ACTIVE'});
 });
}
export function toxicologyLifecycleSuite(makeStore,prefix='Toxicologie — cycle'){
 const place=(f,id)=>f.actionCmd('placeToxicDose',{doseId:id,present:true});
 const activate=(f,id,extra={})=>f.actionCmd('activateToxicDose',{doseId:id,present:true,voluntary:true,...extra},f.other);
 test(prefix+' : activation volontaire uniquement par la cible, un seul effet et aucun PV perdu',async()=>{
  const f=await toxicologyFixture(makeStore),id=await f.craft();await place(f,id);
  const d=await f.actionRead('toxicDose',{doseId:id},f.other);assert.equal(d.available,true);assert.equal(d.recipe,undefined);
  await assert.rejects(activate(f,id,{voluntary:false}),{code:'SO_TOXI_VOLUNTARY'});
  const before=await f.store.get(f.base+'/characters/'+f.otherId),result=await activate(f,id,{targetId:f.cid});assert.equal(result.effect.remainingMs,900000);
  const after=await f.store.get(f.base+'/characters/'+f.otherId);assert.equal(after.hp,before.hp);assert.equal((await f.store.get(f.base+'/characters/'+f.cid)).toxicology,undefined);
  await assert.rejects(activate(f,id),{code:'SO_TOXI_DOSE'});assert.equal((await f.store.get(f.base+'/toxicDoses/'+id)).targetId,f.otherId);
 });
 test(prefix+' : droïde immunisé et dose consommée sans effet biologique',async()=>{
  const f=await toxicologyFixture(makeStore,{nature:'DROID'}),id=await f.craft();await place(f,id);const r=await activate(f,id);assert.equal(r.immune,true);assert.equal(r.effect,null);assert.equal((await f.store.get(f.base+'/inventory/'+id)).quantity,0);
 });
 test(prefix+' : seconde dose sans prolongation, pause et expiration en temps de jeu',async()=>{
  const f=await toxicologyFixture(makeStore),id=await f.craft();f.advance(600000);const id2=await f.craft();await place(f,id);await place(f,id2);await activate(f,id);f.advance(60000);const r=await activate(f,id2);assert.equal(r.effect.remainingMs,840000);
  await f.stage('PAUSE');f.advance(999000);assert.equal((await f.actionRead('myToxicology',{},f.other)).effect.remainingMs,840000);await f.stage('EN_JEU');f.advance(840000);assert.equal((await f.actionRead('myToxicology',{},f.other)).effect.status,'EXPIRED');
 });
 test(prefix+' : retrait sans remboursement et placement réservé au détenteur',async()=>{
  const f=await toxicologyFixture(makeStore),id=await f.craft();await assert.rejects(f.actionCmd('placeToxicDose',{doseId:id,present:true},f.other),{code:'FORBIDDEN'});await place(f,id);await f.actionCmd('retireToxicDose',{doseId:id,present:true});assert.equal((await f.store.get(f.base+'/toxicDoses/'+id)).status,'RETIRED');await assert.rejects(activate(f,id),{code:'SO_TOXI_DOSE'});assert.equal((await f.store.get(f.base+'/inventory/components')).quantity,38);
 });
 test(prefix+' : antidote identifié, durée N3, aucun PV et pas de récupération de traitement',async()=>{
  const f=await toxicologyFixture(makeStore),poison=await f.craft();f.advance(600000);const antidote=await f.craft('antidote');await place(f,poison);await activate(f,poison);
  const supplyLots={'antidote-dose':antidote};await assert.rejects(f.start('TOXI_TREAT','antidote',{supplyLots,substanceId:'inconnu'}),{code:'SO_TOXI_IDENTIFICATION'});
  const a=await f.start('TOXI_TREAT','antidote',{supplyLots,substanceId:'malaise'});f.advance(89000);await assert.rejects(f.finish(a),{code:'FIELD_TOO_EARLY'});f.advance(1000);const r=await f.finish(a);assert.equal(r.result.restored,0);assert.equal((await f.store.get(f.base+'/characters/'+f.otherId)).toxicology.status,'TREATED');assert.equal((await f.store.get(f.base+'/toxicDoses/'+antidote)).status,'CONSUMED');assert.equal(f.rollCount(),0);
 });
 test(prefix+' : labo erroné et recette inconnue refusés sans dépense',async()=>{
  const f=await toxicologyFixture(makeStore);await assert.rejects(f.start('TOXI_CRAFT','malaise',{laboratoryId:'elsewhere'}),{code:'SO_TOXI_LAB'});
  const receipt=await f.store.get(f.base+'/characters/'+f.cid+'/knowledge/ordinary'),k=await f.store.get(f.base+'/knowledge/ordinary');
  await f.actionCmd('grantKnowledge',{characterId:f.cid,knowledgeId:'ordinary',knowledgeRevision:k.revision,grantRevision:receipt.grantRevision,enabled:false,reason:'Connaissance retirée'},f.owner);
  assert.equal((await f.profiles(f.cid)).profiles.filter(p=>p.kind==='TOXI_CRAFT').length,0);assert.equal((await f.points()).available,5);
 });
 test(prefix+' : interruption libère les composants sans produire de dose',async()=>{
  const f=await toxicologyFixture(makeStore),a=await f.start();await f.actionCmd('cancelPersonAction',{actionId:a.id,reason:'Interruption de scène'});assert.equal((await f.store.get(f.base+'/inventory/components')).status,'AVAILABLE');assert.equal((await f.points()).available,5);assert.equal((await f.finish(a)).status,'CANCELLED');
 });
 test(prefix+' : N1 ne peut pas fabriquer une substance courante',async()=>{
  const f=await toxicologyFixture(makeStore,{level:1}),profiles=(await f.profiles(f.cid)).profiles.filter(p=>p.kind==='TOXI_CRAFT');assert.equal(profiles.length,1);assert.match(profiles[0].name,/antidote/);
 });
 test(prefix+' : un malaise bloque une compétence active mais permet de lire son état',async()=>{
  const f=await toxicologyFixture(makeStore),id=await f.craft();await place(f,id);await f.actionCmd('activateToxicDose',{doseId:id,present:true,voluntary:true});f.advance(600000);await assert.rejects(f.start(),{code:'OUT_OF_COMBAT'});assert.equal((await f.actionRead('myToxicology')).effect.status,'ACTIVE');
 });
 test(prefix+' : doubles clics concurrents et réessai ne dupliquent pas dose ou consommation',async()=>{
  const f=await toxicologyFixture(makeStore),a=await f.start();f.advance(300000);const results=await Promise.all([f.finish(a),f.finish(a)]);assert.equal(results[0].result.doseId,results[1].result.doseId);
  const id=results[0].result.doseId;await place(f,id);const requestId=randomUUID(),uses=await Promise.all([activate(f,id,{requestId}),activate(f,id,{requestId})]);assert.deepEqual(uses[0],uses[1]);assert.equal((await f.store.list(f.base+'/characters/'+f.otherId+'/healthHistory')).filter(x=>x.kind==='TOXI_ACTIVATED').length,1);
 });
 test(prefix+' : fin de session expire le malaise et conserve les doses et historiques',async()=>{
  const f=await toxicologyFixture(makeStore),id=await f.craft();await place(f,id);await activate(f,id);const old=await f.store.get(f.base+'/characters/'+f.otherId),dose=await f.store.get(f.base+'/toxicDoses/'+id),e=await episodeHarness(f);await e.close();await e.resume(await e.begin());assert.equal((await e.get('characters/'+f.otherId)).toxicology.status,'EXPIRED');assert.equal((await f.store.get(f.base+'/characters/'+f.otherId)).toxicology.status,'ACTIVE');assert.deepEqual(await e.get('toxicDoses/'+id),dose);assert.equal((await e.get('characters/'+f.otherId)).hp,old.hp);
 });
 test(prefix+' : MED-01 N3 révèle la substance automatiquement et le MJ peut encore éditer le dossier',async()=>{
  const f=await toxicologyFixture(makeStore),id=await f.craft();await place(f,id);await activate(f,id);
  await f.store.runTransaction(async tx=>{const path=f.base+'/characters/'+f.cid,c=await tx.get(path);tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='MED-01'?{...k,level:3}:k)}});});
  await f.actionCmd('saveMedicalDossier',{characterId:f.otherId,revision:0,dossier:{information:[],reason:'Diagnostic fictif'}},f.owner);
  const input={profileId:'SO-MED-01',targetId:f.otherId},q=await f.actionRead('preparePersonAction',input);assert.equal(q.test,'AUTO');const a=await f.actionCmd('startPersonAction',{...input,confirmation:q.confirmation,present:true});f.advance(60000);const result=await f.finish(a);assert.ok(result.result.information.some(x=>x.includes('code malaise')));assert.equal(f.rollCount(),0);
  await f.actionCmd('saveMedicalDossier',{characterId:f.otherId,revision:1,dossier:{information:[],reason:'Dossier corrigé'}},f.owner);
 });
 test(prefix+' : la révocation de recette pendant fabrication interdit la dose puis permet l’annulation',async()=>{
  const f=await toxicologyFixture(makeStore),a=await f.start(),k=await f.store.get(f.base+'/knowledge/ordinary');await f.actionCmd('grantKnowledge',{characterId:f.cid,knowledgeId:'ordinary',knowledgeRevision:k.revision,grantRevision:1,enabled:false,reason:'Recette retirée'},f.owner);f.advance(300000);await assert.rejects(f.finish(a),{code:'SO_TOXI_RECIPE'});await f.actionCmd('cancelPersonAction',{actionId:a.id,reason:'Recette retirée'});assert.equal((await f.points()).available,5);assert.equal((await f.store.get(f.base+'/inventory/components')).quantity,40);
 });

 test(prefix+' : une dose placée reste utilisable à l’épisode suivant sans recréer son stock',async()=>{
  const f=await toxicologyFixture(makeStore),id=await f.craft();await place(f,id);const e=await episodeHarness(f);await e.close();await e.resume(await e.begin());await e.stage('EN_JEU');const result=await e.cmd('activateToxicDose',{doseId:id,present:true,voluntary:true},f.other);assert.equal(result.effect.status,'ACTIVE');assert.equal((await e.get('inventory/'+id)).quantity,0);assert.equal((await f.store.get(f.base+'/inventory/'+id)).quantity,1);
 });

 test(prefix+' : durées de traitement aux cinq niveaux sans délai entre patients',async()=>{
  for(const [level,seconds] of [[1,120],[2,105],[3,90],[4,75],[5,60]]){
   const f=await toxicologyFixture(makeStore),poison=await f.craft();f.advance(600000);const antidote=await f.craft('antidote');await place(f,poison);await activate(f,poison);
   await f.store.runTransaction(async tx=>{const path=f.base+'/characters/'+f.cid,c=await tx.get(path);tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='TOXI-01'?{...k,level}:k)}});});
   const a=await f.start('TOXI_TREAT','antidote',{supplyLots:{'antidote-dose':antidote},substanceId:'malaise'});assert.equal(a.remainingMs,seconds*1000);f.advance(seconds*1000);await f.finish(a);assert.equal((await f.store.get(f.base+'/characters/'+f.otherId)).toxicology.status,'TREATED');
  }
 });

}
