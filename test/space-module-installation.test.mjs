import test from 'node:test';
import assert from 'node:assert/strict';
import {moduleInstallationSuite} from './support/space-module-installation-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
import {installedShipProfile} from '../src/shared/space-ship-modules.mjs';
import {spaceShipProfiles} from '../src/shared/space-outlaws-navigation.mjs';
test('Modules montés : calcul depuis la base canonique, sans cumul, gabarits et doublons fermés',()=>{
 const base=spaceShipProfiles[0],m={code:'MOD-03',size:1,status:'OPERATIONAL'},p=installedShipProfile(base,[m]);assert.equal(p.maneuverability,3);assert.deepEqual(installedShipProfile(p,[m]),p);for(const modules of [[m,m],[{...m,size:2}],[{...m,code:'MOD-04'}],[{...m,status:'DAMAGED'}]])assert.equal(installedShipProfile(base,modules),null);
});
moduleInstallationSuite(()=>new MemoryStore());
