import test from 'node:test';
import assert from 'node:assert/strict';
import {missionExecutionEditor,missionExecutionPayload,rewardTermsHtml,evidenceHtml,rewardResolutionPayload,rewardPickupsHtml} from '../web/mission-execution.mjs';
import {soContractSteps,soSettlementPanel,soResolutionPayload,soResolutionConfirmation} from '../web/space-missions.mjs';
const item={id:'supplies',name:'<img onerror=evil>',unit:'dose'},reward={item,quantity:3,remaining:2,disputed:1},contract={id:'c',terms:{amount:100,currency:{unit:'Cr'}}};
test('Exécution missions UI : choix MJ des preuves et sources, payload sans quantité inventée',()=>{
 const d={missionExecution:{steps:[{id:'step',title:'Étape'}],rewards:[{itemId:'supplies',quantity:3}],targets:[{id:'target',name:'<script>target</script>'}],routes:[{id:'route',name:'Trajet'}],offers:[{id:'offer',itemId:'supplies',name:'Stock',shopName:'PNJ'},{id:'wrong',itemId:'other',name:'Autre'}]}};
 const html=missionExecutionEditor(d);assert.match(html,/stepEvidence:step/);assert.match(html,/rewardSource:supplies/);assert.doesNotMatch(html,/<script>|value="wrong"/);
 assert.deepEqual(missionExecutionPayload({'stepEvidence:step':JSON.stringify({kind:'FIELD',id:'target'}),'rewardSource:supplies':'offer'}),{stepEvidence:[{stepId:'step',kind:'FIELD',targetId:'target'}],rewardSources:[{itemId:'supplies',offerId:'offer'}]});assert.deepEqual(missionExecutionPayload({'stepEvidence:step':''}),{});
});
test('Exécution missions UI : preuve native visible et lien vers l’analyse existante',()=>{
 const html=soContractSteps({steps:[{id:'s',title:'Étape',description:'Privée',evidence:{kind:'FIELD',id:'target',name:'Lieu'}}]},true,'session');assert.match(html,/#\/field\/session\/target/);assert.match(html,/après acceptation/);
 assert.match(evidenceHtml([{name:'Trajet',verified:false}]),/encore manquant/);assert.doesNotMatch(evidenceHtml([{name:'<script>',verified:true,completedAt:1000}]),/<script>/);
 assert.match(rewardTermsHtml([{...reward,shopName:'PNJ',transferable:false}]),/non transférable/);
});
test('Exécution missions UI : litige matériel sans crédits et arbitrage de chaque quantité',()=>{
 const d={session:{id:'s'},contract,rewards:[reward],settlement:{paid:0,disputed:0,contestRemainingMs:600000,mediationRemainingMs:null},canDispute:true,canArbitrate:true};
 const html=soSettlementPanel(d);assert.match(html,/name="amount" type="number" min="0"/);assert.match(html,/rewardDispute:supplies/);assert.match(html,/rewardAward:supplies/);assert.doesNotMatch(html,/<img/);
 const p=soResolutionPayload('DISPUTE',{amount:'0',reason:'Pièce manquante','rewardDispute:supplies':'2'},'s','c');assert.deepEqual(p.input.rewardDisputes,[{itemId:'supplies',quantity:2}]);assert.deepEqual(rewardResolutionPayload('ARBITRATE',{'rewardAward:supplies':'0'}),{rewardAwards:[{itemId:'supplies',quantity:0}]});
 assert.match(soResolutionConfirmation({contract:{title:'Mission'},currency:{unit:'Cr'},pay:0,release:0,remainingDisputed:0,rewardChanges:[{item,pay:1,release:1,disputed:0}],reason:'Médiation'},p.input,'settleContract'),/1 attribué\(s\), 1 libéré\(s\)/);
});
test('Exécution missions UI : remise physique, confirmation et échappement',()=>{
 const p={id:'lot',quantity:2,item,shopName:'PNJ',pickupStatus:'WAITING',canOffer:true,confirmation:'q'},d={session:{id:'s'},contract,rewardPickups:[p]};let html=rewardPickupsHtml(d);assert.match(html,/offerContractRewardPickup/);assert.match(html,/présents au comptoir/);assert.doesNotMatch(html,/<img/);
 html=rewardPickupsHtml({...d,rewardPickups:[{...p,canOffer:false,canReceive:true}]});assert.match(html,/confirmContractRewardPickup/);assert.match(html,/physiquement reçu/);
});
