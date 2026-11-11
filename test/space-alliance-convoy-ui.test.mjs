import test from 'node:test';
import assert from 'node:assert/strict';
import {pirateAlliancesHtml} from '../web/space-pirate-alliances.mjs';
import {spaceCombatsHtml} from '../web/space-encounters.mjs';
import {allianceConvoyFixture} from './support/space-alliance-convoy-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
test('Alliance/convoi UI : périmètre gardé et rôle initial explicite avant accord',()=>{
 const h=pirateAlliancesHtml({ready:true,convoyReady:true,ships:[]},'s');assert.match(h,/cargo escorté/);assert.match(h,/meneur conduit la poursuite initiale/);assert.doesNotMatch(h,/convois escortés restent hors/);assert.match(pirateAlliancesHtml({ready:true,convoyReady:false,ships:[]},'s'),/convois escortés restent hors/);
});
test('Alliance/convoi UI : quatre appareils, deux cibles et défenses désignées sans secrets',async()=>{
 const f=await allianceConvoyFixture(()=>new MemoryStore());await f.begin();const h=spaceCombatsHtml({session:{id:f.sid},combat:await f.detail()});assert.match(h,/data-convoy="true"/);assert.match(h,/name="defense_pirate"/);assert.match(h,/name="defense_pirate_second"/);assert.doesNotMatch(h,/initialPursuerId|pirateAlliance|missionManifest|actorVersion|OUT-SECRET/);assert.match(h,/Second pirate/);
});
test('Alliance/convoi UI : N4 disponible pour l’escorte puis aucun second décrochage',async()=>{
 const f=await allianceConvoyFixture(()=>new MemoryStore(),{level:4});f.setDie(1);await f.command('spaceBreakaway');const render=async actor=>spaceCombatsHtml({session:{id:f.sid},combat:await f.detail(actor)});assert.match(await render(f.other),/data-command="spaceEscortInterpose"/);assert.doesNotMatch(await render(f.pirate),/data-command="spaceEscortInterpose"/);f.setDice([6,1]);await f.command('spaceEscortInterpose',{},f.other);assert.doesNotMatch(await render(f.other),/data-command="spaceBreakaway"/);
});
