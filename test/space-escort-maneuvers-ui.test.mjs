import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {escortManeuversFixture} from './support/space-escort-maneuvers-suite.mjs';
import {spaceCombatsHtml,spaceFormInput} from '../web/space-encounters.mjs';
const page=async(f)=>spaceCombatsHtml({session:{id:f.sid},combat:await f.detail(f.other)});
test('ESC-01 UI : N4 apparaît après décrochage raté et expose les conséquences avant confirmation',async()=>{
 const f=await escortManeuversFixture(()=>new MemoryStore(),{level:4});assert.doesNotMatch(await page(f),/data-command="spaceEscortInterpose"/);await f.breakaway();assert.match(await page(f),/data-command="spaceEscortInterpose"/);assert.match(await page(f),/aucun second décrochage initial/);assert.match(await page(f),/name="escortConfirmed" type="checkbox" required/);await f.precombat();assert.match(await page(f),/le cargo poursuit son voyage/);assert.doesNotMatch(await page(f),/data-command="spaceBreakaway"|data-command="spaceEscortInterpose"/);
});
test('ESC-01 UI : cible alliée distincte, observation bornée et aucun ordre adverse',async()=>{
 const f=await escortManeuversFixture(()=>new MemoryStore(),{level:3});await f.begin();await f.submit('ATTACK','ship',f.pirate);const h=await page(f);assert.match(h,/value="ESC01"/);assert.match(h,/name="escortTargetId"/);assert.match(h,/Surveillance tactique/);assert.match(h,/Cargo léger · manœuvrabilité 1/);assert.doesNotMatch(h,/actorVersion|missionManifest|SECRET_/);
 const form={dataset:{form:'spaceOrder',convoy:'true',payload:'{}'},elements:{namedItem:()=>({checked:false})}},p=spaceFormInput(form,{kind:'ESC01',targetId:'pirate',escortTargetId:'ship',defense_pirate:'on',fallback:'PASSIVE',roll:'6',escortLevel:'5'});assert.deepEqual(p.order,{kind:'ESC01',targetId:'ship',defenseIds:[],fallback:'PASSIVE',acceptSurrender:false,ceasefire:false});
 await f.turns();await f.round(f.dice(1,6,1));assert.doesNotMatch(await page(f),/value="ESC01"/);
});
