import test from 'node:test';
import assert from 'node:assert/strict';
import {healthFixture} from './space-outlaws-health-suite.mjs';
import {actionMenuItems} from '../../web/player-action-menu.mjs';
import {personResultHtml,personAdminHtml} from '../../web/person-actions.mjs';
export function medicalDiagnosisSuite(makeStore){
async function fixture(level=2,options={}){
 const f=await healthFixture(makeStore,options),path=`sessions/${f.sid}/characters/${f.cid}`;
 await f.store.runTransaction(async tx=>{const c=await tx.get(path);tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(s=>s.id==='MED-01'?{...s,level}:s)}});});
 const information=[{level:2,bonus:false,text:'GRAVITE'},{level:3,bonus:false,text:'SUBSTANCE_FICTIVE'},{level:4,bonus:false,text:'BIOLOGIE_RARE'},{level:5,bonus:false,text:'INTERACTIONS'},{level:1,bonus:true,text:'DETAIL_APPROFONDI'}];
 const save=(revision=0,info=information)=>f.actionCmd('saveMedicalDossier',{characterId:f.tid,revision,dossier:{information:info,reason:'État fictif de recette'}},f.owner);
 await save();
 const start=async()=>{const i={profileId:'SO-MED-01',targetId:f.tid},p=await f.actionRead('preparePersonAction',i);return f.actionCmd('startPersonAction',{...i,confirmation:p.confirmation,present:true});};
 return {...f,startDiagnosis:start,save};
}
test('MED-01 : niveaux 1 à 5, informations garanties malgré échec D6, substances automatiques N3, aucune guérison',async()=>{
 for(let level=1;level<=5;level++){
  const f=await fixture(level);await f.damage();const before=await f.health(),p=await f.actionRead('personTarget',{targetId:f.tid});assert.doesNotMatch(JSON.stringify(p),/GRAVITE|SUBSTANCE_FICTIVE|BIOLOGIE_RARE|INTERACTIONS|DETAIL_APPROFONDI/);assert.ok(actionMenuItems(await f.actionRead('mySession')).some(i=>i.id==='MED-01'));assert.match(personAdminHtml(await f.actionRead('personAdmin',{},f.owner)),/Dossiers médicaux fictifs/);
  const a=await f.startDiagnosis();assert.equal(a.remainingMs,60000);f.advance(59999);await assert.rejects(f.finishCare(a),{code:'FIELD_TOO_EARLY'});f.advance(1);const r=await f.finishCare(a);assert.equal((await f.points()).available,4);assert.deepEqual(r.result.information,['GRAVITE','SUBSTANCE_FICTIVE','BIOLOGIE_RARE','INTERACTIONS'].slice(0,level-1).concat(level===5?['DETAIL_APPROFONDI']:[]));assert.equal((await f.health()).hp,before.hp);assert.equal((await f.health()).protection,before.protection);assert.match(personResultHtml(r),/Diagnostic fictif/);
 }
});
test('MED-01 : patient valide sans blessure, aucune dépense de consommable, récupération et version uniques',async()=>{
 const f=await fixture();const inventory=await f.store.list(`sessions/${f.sid}/inventory`);const a=await f.startDiagnosis();f.advance(60000);await f.finishCare(a);assert.deepEqual(await f.store.list(`sessions/${f.sid}/inventory`),inventory);await assert.rejects(f.startDiagnosis(),{code:'FIELD_ANALYSIS_DONE'});await f.save(1,[{level:2,bonus:false,text:'NOUVEL_ETAT'}]);await assert.rejects(f.startDiagnosis(),{code:'COOLDOWN_ACTIVE'});f.advance(600000);const b=await f.startDiagnosis();f.advance(60000);const r=await f.finishCare(b);assert.equal(r.result.roll,null);assert.deepEqual(r.result.information,['NOUVEL_ETAT']);
});
test('MED-01 : changement de dossier pendant la durée bloque la révélation, annulation libère le PA',async()=>{
 const f=await fixture();const a=await f.startDiagnosis();await f.save(1);f.advance(60000);await assert.rejects(f.finishCare(a),{code:'FIELD_STATE_CHANGED'});await f.cancelCare(a);assert.equal((await f.points()).available,5);
});
test('MED-01 : contrôle métier et aucune stabilisation implicite par le diagnostic',async()=>{
 const f=await fixture();await f.damage(3);const a=await f.startDiagnosis();f.advance(60000);await f.finishCare(a);assert.equal((await f.health()).status,'URGENT');assert.equal((await f.health()).hp,0);
 const g=await fixture(2,{nature:'DROID'});await assert.rejects(g.startDiagnosis(),{code:'PATIENT_NATURE_MISMATCH'});await assert.rejects(g.actionCmd('saveMedicalDossier',{characterId:g.tid,revision:1,dossier:{information:[],reason:'Injection'}}),{code:'FORBIDDEN'});
});

}
