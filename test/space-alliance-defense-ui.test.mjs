import test from 'node:test';
import assert from 'node:assert/strict';
import {pirateAlliancesHtml,pirateAllianceConfirmHtml} from '../web/space-pirate-alliances.mjs';
import {spaceCombatsHtml} from '../web/space-encounters.mjs';
import {allianceDefenseFixture} from './support/space-alliance-defense-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
test('Défense d’alliance UI : portée face à un indépendant explicitée avant accord',()=>{
 const h=pirateAlliancesHtml({ready:true,defenseReady:true,duelReady:true,ships:[]},'s');assert.match(h,/pirate indépendant ou une autre alliance/);assert.doesNotMatch(pirateAlliancesHtml({ready:true,defenseReady:false,duelReady:true,ships:[]},'s'),/pirate indépendant/);const q=pirateAllianceConfirmHtml({leaderName:'<A>',supportName:'<B>',confirmation:'p',defenseReady:true},{sessionId:'s'});assert.match(q,/&lt;A&gt;/);assert.match(q,/participation des deux appareils/);assert.match(q,/pirate indépendant/);
});
test('Défense d’alliance UI : le pirate voit deux cibles, les alliés un seul adversaire',async()=>{
 const f=await allianceDefenseFixture(()=>new MemoryStore());await f.begin();const pirate=spaceCombatsHtml({session:{id:f.sid},combat:await f.detail(f.pirate)}),ally=spaceCombatsHtml({session:{id:f.sid},combat:await f.detail(f.other)});assert.match(pirate,/name="defense_ship"/);assert.match(pirate,/name="defense_escort"/);assert.match(ally,/name="defense_pirate"/);assert.doesNotMatch(ally,/name="defense_ship"|value="ESC01"|spaceEscortInterpose|victimAlliance|defenseVersion/);
});
test('Défense d’alliance UI : après décrochage, l’allié conserve la rencontre sans seconde tentative initiale',async()=>{
 const f=await allianceDefenseFixture(()=>new MemoryStore());f.setDie(6);await f.command('spaceBreakaway');const d=await f.detail(f.other),h=spaceCombatsHtml({session:{id:f.sid},combat:d});assert.equal(d.activeShipIds.length,2);assert.match(h,/consentSpacePeace/);assert.doesNotMatch(h,/data-command="spaceBreakaway"|data-command="spaceEscortInterpose"/);
});
