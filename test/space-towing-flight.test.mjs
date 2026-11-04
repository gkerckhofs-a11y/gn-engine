import {playableShipModuleQuote,installedShipProfile} from '../src/shared/space-ship-modules.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {guardSpaceOutlawsEntry} from '../src/core/space-outlaws-entry-guard.mjs';
import {towingFlightSuite} from './support/space-towing-flight-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
towingFlightSuite(()=>new MemoryStore());

test('Trajet remorqué : capacité supplémentaire sans accès aux comptes, stock ou personnages',()=>{const s={id:'s',spaceOutlaws:{towingFlightVersion:1,towingAttachmentVersion:1,towingWorkVersion:1}},scopes=new Set(['TOWING_FLIGHT']);for(const p of ['ships/wreck','shipMaintenance/job','logisticsHistory/event'])assert.doesNotThrow(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/s/${p}`,{}]]),false,scopes));for(const p of ['accounts/a','ledger/l','inventory/i','characters/c','voyages/v'])assert.throws(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/s/${p}`,{}]]),false,scopes),{code:'SO_GAMEPLAY_NOT_OPEN'});});

test('Profil MOD-05 fermé par défaut et toujours interdit au commerce malgré le profil de composant',()=>{const m={code:'MOD-05',size:2,status:'OPERATIONAL'};assert.equal(playableShipModuleQuote(m,{towingProfile:true}),null);assert.equal(installedShipProfile({id:'CARGO'},[m]),null);assert.equal(installedShipProfile({id:'CARGO'},[m],{towingProfile:true}).maneuverability,1);});
