import test from 'node:test';
import assert from 'node:assert/strict';
import {towingCombatSuite} from './support/space-towing-combat-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
import {guardSpaceOutlawsEntry} from '../src/core/space-outlaws-entry-guard.mjs';
towingCombatSuite(()=>new MemoryStore());
test('Largage : capacité additionnelle limitée aux liens, dossier et historique',()=>{const s={id:'s',spaceOutlaws:{towingCombatVersion:1,towingFlightVersion:1}},scopes=new Set(['TOWING_COMBAT']);for(const p of ['ships/wreck','shipMaintenance/work','logisticsHistory/event'])assert.doesNotThrow(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/s/${p}`,{}]]),false,scopes));for(const p of ['inventory/lot','accounts/a','ledger/l','characters/c/resources/actionPoints','voyages/v','spaceCombats/e'])assert.throws(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/s/${p}`,{}]]),false,scopes),{code:'SO_GAMEPLAY_NOT_OPEN'});});
