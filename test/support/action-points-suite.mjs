import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {healthFixture} from './health-suite.mjs';
import {portBrecheActionPoints,actionPointPath} from '../../src/core/action-point-state.mjs';

export function actionPointsSuite(makeStore,prefix='PA intégrés'){
  const fixture=async()=>{
    const f=await healthFixture(makeStore),sid=f.sessionId;
    f.ruleChange=async(patch={},extra={})=>{
      const current=await f.session(),input={sessionId:sid,revision:current.revision,reason:'Règles PA de test',rules:{...(current.actionPointRules??portBrecheActionPoints),...patch},...extra};
      const p=await f.read('prepareActionPointRules',f.owner,input);return f.cmd('saveActionPointRules',f.owner,{...input,confirmation:p.confirmation});
    };
    f.adjust=async(amount,mode='SET')=>{const input={sessionId:sid,revision:(await f.session()).revision,characterId:f.characters[0],reason:'Motif privé PA',mode,amount};const p=await f.read('prepareAdjustActionPoints',f.owner,input);return f.cmd('adjustActionPoints',f.owner,{...input,confirmation:p.confirmation});};
    f.level=async(level,scenario=false)=>{const input={...(scenario?{scenarioId:f.scenarioId,revision:(await f.scenario()).revision}:{sessionId:sid,revision:(await f.session()).revision}),characterId:f.characters[0],level,reason:'Progression globale'};const p=await f.read('prepareGlobalLevel',f.owner,input);return f.cmd('setGlobalLevel',f.owner,{...input,confirmation:p.confirmation});};
    f.ap=async who=>(await f.view(who)).actionPoints;
    await f.ruleChange();return f;
  };
  test(`${prefix} : soin payé une seule fois, confirmation périmée et manque de PA`,async()=>{
    const f=await fixture();await f.damage(f.bob,8);const p=await f.prepare(),requestId=randomUUID();
    assert.equal(p.result.actionPoints.cost,1);await f.treat(p,f.alice,{requestId});await f.treat(p,f.alice,{requestId});assert.equal((await f.ap()).available,4);
    f.advance(600000);const old=await f.prepare();await f.adjust(1);await assert.rejects(f.treat(old),{code:'STALE_REVISION'});
    const fresh=await f.prepare();await f.treat(fresh);assert.equal((await f.ap()).available,0);
    f.advance(600000);await f.damage(f.alice,1);await assert.rejects(f.prepare(f.alice,f.characters[0],f.skills[1]),{code:'NOT_ENOUGH_ACTION_POINTS'});
    assert.equal((await f.view(f.bob)).health.hp,8);
  });
  test(`${prefix} : nouvelle période à 4h40 conserve 5h puis 7h, sans distribution`,async()=>{
    const f=await fixture();await f.adjust(1);f.advance(280*60000);await f.ruleChange({renewalMinutes:120});
    assert.equal((await f.ap()).available,1);assert.equal((await f.ap()).nextRefillInMs,20*60000);
    f.advance(20*60000);assert.equal((await f.ap()).available,5);assert.equal((await f.ap()).nextRefillInMs,120*60000);
    await f.adjust(2);f.advance(119*60000);assert.equal((await f.ap()).available,2);f.advance(60000);assert.equal((await f.ap()).available,5);
  });
  test(`${prefix} : pause, reconnexion, changement de plafond et réactivation sans remise`,async()=>{
    const f=await fixture();await f.adjust(2);f.advance(100*60000);await f.stage('PAUSE');f.advance(700*60000);
    assert.equal((await f.ap()).available,2);assert.equal((await f.ap()).nextRefillInMs,200*60000);
    await f.level(2);assert.equal((await f.ap()).maximum,8);assert.equal((await f.ap()).available,2);
    await f.ruleChange({enabled:false});assert.equal(await f.ap(),null);await f.ruleChange({enabled:true});assert.equal((await f.ap()).available,2);
    await f.ruleChange({maxByLevel:{1:5,2:1}});assert.equal((await f.ap()).available,1);
    await f.stage('EN_JEU');f.advance(200*60000);assert.equal((await f.ap()).available,1);
  });
  test(`${prefix} : réglage après échéance non consultée ne perd pas le renouvellement`,async()=>{
    const f=await fixture();await f.adjust(0);f.advance(310*60000);await f.ruleChange({renewalMinutes:120});
    assert.equal((await f.ap()).available,5);assert.equal((await f.ap()).nextRefillInMs,290*60000);
    await f.adjust(1);assert.equal((await f.ap()).available,1);
  });
  test(`${prefix} : remise MJ distincte, répétition unique et échéance conservée`,async()=>{
    const f=await fixture();await f.adjust(0);const input={sessionId:f.sessionId,revision:(await f.session()).revision,characterId:f.characters[0],reason:'Recharge ponctuelle',mode:'REFILL'};
    const p=await f.read('prepareAdjustActionPoints',f.owner,input),requestId=randomUUID();
    await f.cmd('adjustActionPoints',f.owner,{...input,confirmation:p.confirmation,requestId});
    await f.adjust(2);await f.cmd('adjustActionPoints',f.owner,{...input,confirmation:p.confirmation,requestId});
    assert.equal((await f.ap()).available,2);assert.equal((await f.ap()).nextRefillInMs,300*60000);
  });
  test(`${prefix} : dépense concurrente du dernier PA sur deux compétences`,async()=>{
    const f=await fixture();await f.damage(f.bob,8);await f.damage(f.alice,5);await f.adjust(1);
    const a=await f.prepare(),b=await f.prepare(f.alice,f.characters[0],f.skills[1]);
    const results=await Promise.allSettled([f.treat(a),f.treat(b)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.ap()).available,0);
  });
  test(`${prefix} : soins de terrain par patient, tous soignants, avec clinique distincte`,async()=>{
    const f=await fixture();const setScope=async(id,cooldownScope)=>{const s=await f.session(),skill=s.skills.find(k=>k.id===id);await f.cmd('saveSessionSkill',f.owner,{...skill,sessionId:s.id,revision:s.revision,healing:{...skill.healing,uses:null,cooldownScope},reason:'Profil médical'});};
    await setScope(f.skills[0],'PATIENT');await setScope(f.skills[1],'NONE');await f.republish(f.characters[0]);await f.republish(f.characters[2]);
    await f.damage(f.bob,8);await f.damage(f.eve,8);await f.damage(f.alice,5);
    await f.treat(await f.prepare());await f.treat(await f.prepare(f.alice,f.characters[2]));assert.equal((await f.ap()).available,3);
    await assert.rejects(f.prepare(f.eve,f.characters[1]),{code:'PATIENT_COOLDOWN_ACTIVE'});
    await f.treat(await f.prepare(f.alice,f.characters[0],f.skills[1]));assert.equal((await f.ap()).available,2);
    await f.ruleChange({patientCooldownSeconds:0});await assert.rejects(f.prepare(f.eve,f.characters[1]),{code:'PATIENT_COOLDOWN_ACTIVE'});
    f.advance(600000);await f.treat(await f.prepare(f.eve,f.characters[1]),f.eve);
  });
  test(`${prefix} : récupération engagée conservée après changement de règle ou de profil`,async()=>{
    const f=await fixture();await f.damage(f.bob,8);await f.treat(await f.prepare());await f.ruleChange({cooldownSeconds:0});
    await assert.rejects(f.prepare(),{code:'COOLDOWN_ACTIVE'});f.advance(600000);await f.treat(await f.prepare());
    assert.equal((await f.view()).skills.find(k=>k.id===f.skills[0]).waitMs,0);
  });
  test(`${prefix} : PA privés, Accueil et joueurs ne peuvent modifier les réserves`,async()=>{
    const f=await fixture();await f.adjust(3);
    const own=await f.read('mySession',f.alice,{sessionId:f.sessionId,characterId:f.characters[1]});assert.equal(own.actionPoints.available,3);assert.equal(JSON.stringify(own).includes('Motif privé PA'),false);
    const badge=await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[0]});assert.equal('actionPoints' in badge,false);
    await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Accueil'});
    const reception=await f.read('session',f.staff,{sessionId:f.sessionId});assert.equal('actionPointRules' in reception,false);assert.equal('actionPoints' in reception.characters[0],false);
    for(const actor of [f.alice,f.staff])for(const action of ['prepareActionPointRules','saveActionPointRules','prepareGlobalLevel','setGlobalLevel','prepareAdjustActionPoints','adjustActionPoints'])await assert.rejects(f.cmd(action,actor,{sessionId:f.sessionId}),{code:'FORBIDDEN'});
  });
  test(`${prefix} : réservations conservées à l’échéance et baisse de plafond bloquée`,async()=>{
    const f=await fixture();const path=actionPointPath(f.sessionId,f.characters[0]);
    await f.store.runTransaction(async tx=>{const old=await tx.get(path);tx.set(path,{...old,available:0,reserved:2});});
    await assert.rejects(f.ruleChange({maxByLevel:{1:1,2:8}}),{code:'ACTION_POINTS_RESERVED'});
    f.advance(300*60000);assert.equal((await f.ap()).available,3);assert.equal((await f.ap()).reserved,2);
  });
  test(`${prefix} : scénario, version et archive gardent les règles et le niveau global`,async()=>{
    const f=await fixture(),input={scenarioId:f.scenarioId,revision:(await f.scenario()).revision,rules:portBrecheActionPoints};
    const p=await f.read('prepareActionPointRules',f.owner,input);await f.cmd('saveActionPointRules',f.owner,{...input,confirmation:p.confirmation});await f.level(2,true);
    await assert.rejects(f.level(3),{code:'ACTION_POINT_LEVEL_UNCONFIGURED'});
    const {id:versionId}=await f.cmd('publishScenario',f.owner,{scenarioId:f.scenarioId,revision:(await f.scenario()).revision});
    const {id}=await f.cmd('createSession',f.owner,{...f.sessionInput,versionId});const session=await f.read('session',f.owner,{sessionId:id});
    assert.equal(session.actionPointRules.renewalMinutes,300);assert.equal(session.characters.find(c=>c.id===f.characters[0]).actionPoints.maximum,8);
    const {cleanScenarioSnapshot}=await import('../../src/core/scenario-package.mjs'),sc=await f.scenario();
    const clean=cleanScenarioSnapshot({scenario:sc,records:Object.fromEntries(['characters','groups','knowledge','skills','classes','items'].map(k=>[k,sc[k]]))});
    assert.equal(clean.scenario.actionPointRules.renewalMinutes,300);assert.equal(clean.records.characters.find(c=>c.id===f.characters[0]).globalLevel,2);
  });
}
