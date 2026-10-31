import test from 'node:test';
import assert from 'node:assert/strict';
import {pirateAlliancesHtml,pirateAllianceConfirmHtml} from '../web/space-pirate-alliances.mjs';
import {spaceFormInput,spaceConfirmHtml} from '../web/space-encounters.mjs';
test('Alliance pirate UI : aucune activation historique, invitation et accord personnel distincts',()=>{
 assert.equal(pirateAlliancesHtml({ready:false,ships:[]},'s'),'');const h=pirateAlliancesHtml({ready:true,ships:[{id:'ship',name:'<Pirate>',canPropose:true,incoming:[{leaderShipId:'other',leaderName:'<Meneur>',confirmation:'accept-proof'}]}]},'s');assert.match(h,/&lt;Pirate&gt;/);assert.match(h,/&lt;Meneur&gt;/);assert.match(h,/name="supportShipId"/);assert.match(h,/acceptPirateAlliance/);assert.match(h,/accept-proof/);assert.match(h,/convois escortés restent hors/);assert.doesNotMatch(h,/voyageId|knowledgeId|<Meneur>/);
});
test('Alliance pirate UI : déclaration et dissolution MJ, pas de nouvelle ressource ou droit implicite',()=>{
 const h=pirateAlliancesHtml({ready:true,ships:[{id:'ship',name:'Pirate',alliance:{leaderName:'Meneur',supportName:'Second'},incoming:[],confirmation:'leave-proof'}]},'s',true);assert.match(h,/leavePirateAllianceAdmin/);assert.match(h,/un seul poursuivant/);assert.doesNotMatch(h,/preparePirateAlliance|acceptPirateAlliance/);const q=pirateAllianceConfirmHtml({leaderName:'<m>',supportName:'<s>',confirmation:'offer-proof'},{sessionId:'s',shipId:'ship',supportShipId:'other'});assert.match(q,/&lt;m&gt;/);assert.match(q,/confirmer personnellement/);assert.match(q,/offer-proof/);
});
test('Alliance pirate UI : protocole de formulaire et aperçu MJ du second participant',()=>{
 const f={dataset:{form:'spacePrepare',payload:JSON.stringify({sessionId:'s',shipId:'ship'})},elements:{namedItem:()=>null}};assert.deepEqual(spaceFormInput(f,{supportShipId:'other'}),{sessionId:'s',shipId:'ship',supportShipId:'other'});assert.match(spaceConfirmHtml('preparePirateAlliance',{leaderName:'A',supportName:'B',confirmation:'p'},{sessionId:'s'}),/proposePirateAlliance/);const h=spaceConfirmHtml('prepareSpaceInterception',{name:'V',priority:'TARGETED',candidates:[{name:'Meneur',supportName:'<Second>'}],confirmation:'c'},{sessionId:'s'});assert.match(h,/Meneur avec &lt;Second&gt;/);
});
