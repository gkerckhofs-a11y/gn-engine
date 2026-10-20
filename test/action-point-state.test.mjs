import test from 'node:test';
import assert from 'node:assert/strict';
import {portBrecheActionPoints,actionPointRulesInput,actionPointState,actionPointSummary,reserveActionPoints,resolveActionPoints,releaseActionPoints,spendActionPoints} from '../src/core/action-point-state.mjs';
const rules=actionPointRulesInput(portBrecheActionPoints),s={actionPointRules:rules,clock:{elapsedMs:0,runningSince:0},stage:'EN_JEU'};
test('PA : les niveaux globaux 1 et 2 sont distincts des compétences',()=>{
  assert.equal(actionPointSummary(s,{abilityProfile:{skills:[{level:5}]}},null,0).maximum,5);
  assert.equal(actionPointSummary(s,{globalLevel:2},null,0).maximum,8);
  assert.throws(()=>actionPointState(s,{globalLevel:3},null,0),{code:'ACTION_POINT_LEVEL_UNCONFIGURED'});
});
test('PA : 5 heures, aucun cumul de cycles, aucune remise à la reconnexion',()=>{
  const spent=spendActionPoints(actionPointState(s,{},null,0),4);
  assert.equal(actionPointState(s,{},spent,300*60000-1).available,1);
  const full=actionPointState(s,{},spent,300*60000);assert.equal(full.available,5);
  assert.equal(actionPointState(s,{},spendActionPoints(full,1),301*60000).available,4);
  assert.equal(actionPointState(s,{},spent,4000*60000).available,5);
});
test('PA : renouvellement avec réservation, résolution ou interruption',()=>{
  const held=reserveActionPoints(spendActionPoints(actionPointState(s,{},null,0),4),1);
  const renewed=actionPointState(s,{},held,300*60000);
  assert.equal(renewed.available,4);assert.equal(renewed.reserved,1);
  assert.equal(resolveActionPoints(renewed,1).available,4);
  const released=releaseActionPoints(renewed,1,5);assert.equal(released.available,5);assert.equal(released.reserved,0);
});
test('PA : la pause suspend le renouvellement, le plafond protège les réservations',()=>{
  const spent=spendActionPoints(actionPointState(s,{},null,0),5);
  const paused={...s,clock:{elapsedMs:299*60000,runningSince:null}};
  assert.equal(actionPointState(paused,{},spent,900*60000).available,0);
  assert.throws(()=>actionPointState({...s,actionPointRules:{...rules,maxByLevel:{1:1}}},{},reserveActionPoints(actionPointState(s,{},null,0),2),0),{code:'ACTION_POINTS_RESERVED'});
});
test('PA : les valeurs invalides, les décimales et les débordements sont refusés',()=>{
  for(const patch of [{renewalMinutes:0},{cost:-1},{maxByLevel:{}},{maxByLevel:{'01':5}},{renewalMinutes:Number.MAX_SAFE_INTEGER},{cooldownSeconds:0.5}])assert.throws(()=>actionPointRulesInput({...rules,...patch}));
  assert.throws(()=>spendActionPoints(actionPointState(s,{},null,0),6),{code:'NOT_ENOUGH_ACTION_POINTS'});
});
