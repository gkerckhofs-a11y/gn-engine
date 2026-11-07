import {moduleMandatesSuite} from './support/space-module-mandates-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {guardSpaceOutlawsEntry} from '../src/core/space-outlaws-entry-guard.mjs';
test('Mandats modules : capacité limitée aux demandes et à leur historique, sans mutation de ressources',()=>{
 const s={id:'s',spaceOutlaws:{actionsVersion:1,moduleMandatesVersion:1}},scopes=new Set(['MODULE_MANDATES']);
 for(const path of ['shipMaintenance/id','logisticsHistory/id'])assert.doesNotThrow(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/s/${path}`,{}]]),false,scopes));
 for(const path of ['inventory/id','ships/id','accounts/id','ledger/id','characters/id','characters/id/resources/actionPoints'])assert.throws(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/s/${path}`,{}]]),false,scopes),{code:'SO_GAMEPLAY_NOT_OPEN'});
 assert.throws(()=>guardSpaceOutlawsEntry({...s,spaceOutlaws:{actionsVersion:1}},new Map([['sessions/s/shipMaintenance/id',{}]]),false,scopes),{code:'SO_GAMEPLAY_NOT_OPEN'});
});
moduleMandatesSuite(()=>new MemoryStore());
