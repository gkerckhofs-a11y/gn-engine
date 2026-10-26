import test from 'node:test';
import assert from 'node:assert/strict';
import {createContractUi} from '../web/contracts.mjs';
import {createAnnouncementUi} from '../web/announcements.mjs';
import {createEntryUi} from '../web/space-outlaws-entry.mjs';
import {soSettlementPanel,soResolutionPayload,soResolutionConfirmation} from '../web/space-missions.mjs';
import {terminalHtml} from '../web/player-spaces.mjs';
const helpers={button:(l,a)=>`<button data-action="${a}">${l}</button>`,link:(l,p)=>`<a href="#/${p}">${l}</a>`},ui=createContractUi(helpers),ann=createAnnouncementUi(helpers),bad='<script>secret</script>';
const s={id:'s',spaceOutlaws:{missionsVersion:1},economyRules:{unit:'Cr'},characters:[],groups:[],missions:[{id:'m',title:bad,description:'Dossier',conditions:'Sur place',proofExpected:'Rapport'}],accounts:[{id:'shop',ownerType:'SHOP',label:'Comptoir',balance:150,reserved:20},{id:'person',ownerType:'CHARACTER',balance:900,reserved:0}]};
const terms={spaceOutlaws:true,title:'Mission',description:'Texte',sponsor:{name:'PNJ'},applicant:{kind:'CHARACTER',id:'c',name:'Joueur'},amount:100,currency:{unit:'Cr'},funding:'ACCOUNT',durationMinutes:60,conditions:'Sur place',proofExpected:'Rapport',confidentiality:'Privé',failureTerms:'Arbitrage'};
const c={id:'c',title:'Mission',revision:2,status:'ACTIVE',terms,steps:[{id:'step',title:bad,description:'Étape privée'}],briefing:'Briefing',applicant:terms.applicant,sponsor:terms.sponsor,amount:100,currency:terms.currency};
test('Missions SO UI : M7 sélectionné, financement réel et parcours joueur/régie',()=>{
 const html=ann.editor(s);assert.match(html,/name="missionId"/);assert.doesNotMatch(html,/<script>|value="GROUP"|value="TRANSPORT"|value="ESCORT"|value="OPEN_BOUNTY"/);
 const offer=ui.offer(s,{application:{id:'a',applicant:terms.applicant},announcement:{...terms,revision:1,rewardText:'100 Cr'}});assert.match(offer,/value="shop"/);assert.doesNotMatch(offer,/GM_EXTERNAL|value="person"/);
 assert.match(terminalHtml({session:s}),/missions\/s/);assert.match(createEntryUi(helpers).page({session:s,versionId:'v',actionsReady:true,missionsReady:true,stage:'EN_JEU',registrations:[]}),/announcements-admin\/s/);
});
test('Missions SO UI : étapes déclarées et validation sans paiement immédiat',()=>{
 const page=ui.detail({session:s,contract:c,canSubmit:true,history:[]});assert.match(page,/name="completedStep" value="step" required/);assert.doesNotMatch(page,/<script>/);
 const review=ui.reviewConfirm({contract:c,proof:{body:'Preuve'},decision:'PAY',amount:100,currency:terms.currency,deferred:true,confirmation:'q',reason:'Validé'},{sessionId:'s',contractId:'c'});assert.match(review,/Aucun versement immédiat/);assert.match(review,/ouvrir les dix minutes/);assert.doesNotMatch(review,/100 Cr seront versés/);
});
test('Missions SO UI : contestation, règlement partiel et recours explicites',()=>{
 const panel=soSettlementPanel({session:s,contract:c,admin:true,settlement:{paid:60,disputed:40,contestRemainingMs:0,mediationRemainingMs:0},canArbitrate:true});assert.match(panel,/name="payAmount"/);assert.match(panel,/max="40"/);assert.doesNotMatch(panel,/data-kind="SETTLE"/);
 const x=soResolutionPayload('ARBITRATE',{payAmount:'20',reason:'Preuves'},'s','c');assert.deepEqual(x.input,{sessionId:'s',contractId:'c',reason:'Preuves',payAmount:20});const html=soResolutionConfirmation({contract:c,currency:terms.currency,pay:20,release:20,remainingDisputed:0,reason:bad,confirmation:'p'},x.input,x.command);assert.match(html,/arbitrateContract/);assert.doesNotMatch(html,/<script>/);
 const appeal=soSettlementPanel({session:s,contract:{...c,status:'PAID'},settlement:{paid:100,disputed:0,contestRemainingMs:0,mediationRemainingMs:null},canAppeal:true});assert.match(appeal,/name="newEvidence"/);assert.match(appeal,/ne reprend pas automatiquement/);
});
