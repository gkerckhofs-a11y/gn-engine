import test from 'node:test';
import assert from 'node:assert/strict';
import {moduleWorkSuite} from './support/space-module-work-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
import {guardSpaceOutlawsEntry} from '../src/core/space-outlaws-entry-guard.mjs';
test('Travaux modules : capacité de réservation sans accès aux comptes ou au ledger',()=>{
 const s={id:'s',spaceOutlaws:{actionsVersion:1,moduleWorkVersion:1}},scopes=new Set(['MODULE_WORK']);
 for(const path of ['ships/id','inventory/id','inventory/id/history/event','characters/id','characters/id/resources/actionPoints','shipMaintenance/id','logisticsHistory/id'])assert.doesNotThrow(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/s/${path}`,{}]]),false,scopes));
 for(const path of ['accounts/id','ledger/id','contracts/id','characters/id/knowledge/secret'])assert.throws(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/s/${path}`,{}]]),false,scopes),{code:'SO_GAMEPLAY_NOT_OPEN'});
});
moduleWorkSuite(()=>new MemoryStore());
