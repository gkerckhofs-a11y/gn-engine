import test from 'node:test';
import assert from 'node:assert/strict';
import {towingWorkSuite} from './support/space-towing-work-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
import {guardSpaceOutlawsEntry} from '../src/core/space-outlaws-entry-guard.mjs';
test('Attelage préparatoire : capacité limitée aux dossiers, verrous et PA',()=>{
 const s={id:'s',spaceOutlaws:{actionsVersion:1,towingWorkVersion:1}},scopes=new Set(['TOWING_WORK']);
 for(const p of ['ships/ship','shipMaintenance/job','characters/tech','characters/tech/resources/actionPoints','logisticsHistory/event'])assert.doesNotThrow(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/s/${p}`,{}]]),false,scopes));
 for(const p of ['accounts/a','ledger/l','inventory/lot','contracts/c','voyages/v','characters/c/knowledge/k'])assert.throws(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/s/${p}`,{}]]),false,scopes),{code:'SO_GAMEPLAY_NOT_OPEN'});
});
towingWorkSuite(()=>new MemoryStore());
