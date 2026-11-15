import test from 'node:test';
import assert from 'node:assert/strict';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
export function shipWorkspaceSuite(makeStore,prefix='Module vaisseau'){
 test(`${prefix} : lecture du propriétaire sans effet sur les moteurs et projection minimale`,async()=>{
  const f=await soVoyagesFixture(makeStore),before=await f.ship(),bag=await f.read('myInventory'),wallet=await f.read('myWallet'),points=await f.points();
  const d=await f.read('shipWorkspace',{shipId:'ship'});assert.equal(d.ship.role,'OWNER');assert.equal(d.ship.hull,4);assert.equal(d.ship.fuel,0);assert.equal(d.ship.permissions.assignPilot,false);assert.doesNotMatch(JSON.stringify(d),/SECRET|assignedUid|gmNotes|fuelItemId|missionManifest|transportManifest/);
  assert.deepEqual(await f.ship(),before);assert.deepEqual(await f.read('myInventory'),bag);assert.deepEqual(await f.read('myWallet'),wallet);assert.deepEqual(await f.points(),points);assert.equal((await f.read('myShips')).ships.length,1);
 });
 test(`${prefix} : extérieur refusé, aucune découverte de flotte par URL`,async()=>{
  const f=await soVoyagesFixture(makeStore);await assert.rejects(f.read('shipWorkspace',{shipId:'ship'},f.other),{code:'FORBIDDEN'});assert.deepEqual((await f.read('myShips',{},f.other)).ships,[]);await assert.rejects(f.read('shipWorkspace',{shipId:'missing'}),{code:'NOT_FOUND'});await assert.rejects(f.read('shipWorkspaceAdmin',{shipId:'ship'}),{code:'FORBIDDEN'});assert.equal((await f.read('shipWorkspaceAdmin',{shipId:'ship'},f.owner)).ship.role,'MJ');
 });
 test(`${prefix} : propriétaire non pilote, pilote non propriétaire et révocation de connexion`,async()=>{
  const f=await soVoyagesFixture(makeStore);await f.provision({shipId:'delegated',ownerId:f.otherId,pilotId:f.cid});const pilot=await f.read('shipWorkspace',{shipId:'delegated'}),owner=await f.read('shipWorkspace',{shipId:'delegated'},f.other);assert.equal(pilot.ship.role,'PILOT');assert.equal(pilot.ship.permissions.assignPilot,false);assert.equal(owner.ship.role,'OWNER');assert.equal(owner.ship.permissions.fuel,false);assert.equal(owner.ship.permissions.assignPilot,false);
  await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.read('shipWorkspace',{shipId:'delegated'},f.other),{code:'FORBIDDEN'});
 });
 test(`${prefix} : passager du manifeste consulte le suivi sans fret ni journal privé`,async()=>{
  const f=await soVoyagesFixture(makeStore),c=await f.store.get(`sessions/${f.sid}/characters/${f.otherId}`);await f.refuel(2);await f.startFlight({passengerCodes:[c.publicCode]});f.advance(180000);await f.navCommand('finishSoPreparation');const d=await f.read('shipWorkspace',{shipId:'ship'},f.other);assert.equal(d.ship.role,'PASSENGER');assert.equal(d.ship.status,'IN_FLIGHT');assert.equal(d.ship.permissions.logistics,false);assert.equal(d.ship.permissions.journal,false);assert.deepEqual(d.ship.journal,[]);assert.deepEqual(d.ship.members,[]);assert.ok(!d.ship.owner.id);assert.ok(!('manifest' in d.ship.journey));
 });
 test(`${prefix} : profil équipé repris du moteur natif sans réappliquer ni réparer les modules`,async()=>{
  const {moduleFlightFixture}=await import('./space-module-flight-suite.mjs'),f=await moduleFlightFixture(makeStore),before=await f.ship(),nav=await f.navigation(),d=await f.read('shipWorkspace',{shipId:'ship'});assert.equal(d.ship.profile.hullMax,nav.ship.profile.hullMax);assert.equal(d.ship.profile.shieldMax,nav.ship.profile.shieldMax);assert.ok(d.ship.modules.every(m=>m.label));assert.deepEqual(await f.ship(),before);
 });

}
