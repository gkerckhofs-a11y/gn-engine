import test from 'node:test';
import assert from 'node:assert/strict';
import {pirateAlliancesHtml,pirateAllianceConfirmHtml} from '../web/space-pirate-alliances.mjs';
import {spaceCombatsHtml} from '../web/space-encounters.mjs';
import {allianceDuelFixture} from './support/space-alliance-duels-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
test('Duels d’alliances UI : portée de l’accord affichée sous capacité, anciens parcours conservés',()=>{
 const h=pirateAlliancesHtml({ready:true,duelReady:true,convoyReady:true,ships:[]},'s');assert.match(h,/ses deux appareils participent ensemble/);assert.match(h,/choix de fuite ou de reddition/);assert.doesNotMatch(pirateAlliancesHtml({ready:true,duelReady:false,ships:[]},'s'),/ses deux appareils participent ensemble/);assert.match(pirateAllianceConfirmHtml({leaderName:'<A>',supportName:'<B>',confirmation:'proof',duelReady:true},{sessionId:'s'}),/Cet accord couvre aussi/);
});
test('Duels d’alliances UI : deux ennemis identifiés et aucune option d’escorte marchande',async()=>{
 const f=await allianceDuelFixture(()=>new MemoryStore());await f.begin();const h=spaceCombatsHtml({session:{id:f.sid},combat:await f.detail(f.other)});assert.match(h,/name="defense_pirate"/);assert.match(h,/name="defense_pirate_second"/);assert.doesNotMatch(h,/value="ESC01"|spaceEscortInterpose|victimAlliance|duelVersion|missionManifest/);
});
test('Duels d’alliances UI : après décrochage ciblé, aucun second décrochage pour l’allié',async()=>{
 const f=await allianceDuelFixture(()=>new MemoryStore());f.setDie(6);await f.command('spaceBreakaway');const d=await f.detail(f.other),h=spaceCombatsHtml({session:{id:f.sid},combat:d});assert.equal(d.activeShipIds.length,3);assert.doesNotMatch(h,/data-command="spaceBreakaway"|data-command="spaceEscortInterpose"/);assert.match(h,/consentSpacePeace/);
});
