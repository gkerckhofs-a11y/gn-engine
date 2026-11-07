import {MemoryStore} from './support/memory.mjs';
import {towingRecoverySuite} from './support/space-towing-recovery-suite.mjs';
towingRecoverySuite(()=>new MemoryStore());

import test from 'node:test';
import assert from 'node:assert/strict';
import {guardSpaceOutlawsEntry} from '../src/core/space-outlaws-entry-guard.mjs';
test('Récupération PNJ : capacité bornée, aucun droit sur inventaire, profils ou secrets',()=>{const s={id:'s',spaceOutlaws:{towingRecoveryVersion:1}},scopes=new Set(['TOWING_RECOVERY']);for(const p of ['ships/wreck','shipMaintenance/r','accounts/a','accounts/a/history/h','ledger/l','characters/c','voyages/v','logisticsHistory/e'])assert.doesNotThrow(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/s/${p}`,{}]]),false,scopes));for(const p of ['inventory/i','personProfiles/p','groups/g','knowledge/k','accounts/a/private/k','characters/c/resources/actionPoints'])assert.throws(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/s/${p}`,{}]]),false,scopes),{code:'SO_GAMEPLAY_NOT_OPEN'});});
