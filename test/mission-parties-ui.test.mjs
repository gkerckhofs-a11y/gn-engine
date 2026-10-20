import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnnouncementUi} from '../web/announcements.mjs';
import {createContractUi} from '../web/contracts.mjs';
import {createBountyUi} from '../web/bounties.mjs';
import {participantSelect} from '../web/mission-parties.mjs';
import {permissionLabels} from '../web/groups.mjs';
const helpers={button:(l,a,x='')=>`<button data-action="${a}" ${x}>${l}</button>`,link:(l,u)=>`<a href="#/${u}">${l}</a>`};
const evil='<img src=x onerror="bad()">',group={kind:'GROUP',id:'g',name:evil,ready:true,groupId:'g'},person={kind:'CHARACTER',id:'c',name:'Chasseur',ready:true,groupId:null};
const a={id:'a',revision:1,status:'OPEN',title:'Mission',category:'BOUNTY',mode:'ASSIGNMENT',participation:'EITHER',description:'Mission',sponsor:{name:'PNJ'},rewardType:'FIXED',rewardText:'37 cr',places:1,conditions:'Conditions',proofExpected:'Preuve',opensAt:100000,deadline:1000000};
const terms={...a,applicant:group,amount:37,quota:1,currency:{unit:'cr'},funding:'ACCOUNT',durationMinutes:10,confidentiality:'Groupe',failureTerms:'Annulation MJ'};
test('participation UI : trois réglages et choix personnel ou bande sans sélection de caisse arbitraire',()=>{
  const ui=createAnnouncementUi(helpers),editor=ui.editor({id:'s',characters:[],groups:[]});assert.match(editor,/name="participation"/);for(const value of ['PERSONAL','GROUP','EITHER'])assert.match(editor,new RegExp(`value="${value}"`));
  const html=ui.detail({session:{id:'s'},announcement:a,applications:[],canRespond:true,participantOptions:[person,group]});assert.match(html,/name="participant"/);assert.match(html,/value="PERSONAL"/);assert.match(html,/value="g"/);assert.match(html,/une seule place/);assert.doesNotMatch(html,/<img|name="sourceAccountId"/);
  const only=participantSelect([group]);assert.doesNotMatch(only,/value="PERSONAL"/);assert.match(participantSelect([{...group,ready:false}]),/disabled/);
});
test('participation UI : échanges distincts et réponse de bande conservant son bénéficiaire',()=>{
  const ui=createAnnouncementUi(helpers),thread={id:'t',revision:1,title:'Mission',applicant:group,status:'DISCUSSION',intent:'APPLICATION',unread:true};
  const html=ui.detail({session:{id:'s'},announcement:a,applications:[{...thread,id:'solo',applicant:person},thread],canRespond:false});assert.match(html,/#\/application\/s\/solo/);assert.match(html,/#\/application\/s\/t/);assert.doesNotMatch(html,/<img/);
  const shared=ui.thread({session:{id:'s'},application:thread,announcement:a,terms:a,reviewedTerms:a,messages:[],messageCount:0,canRespond:true,canWithdraw:true,participantOptions:[group]});assert.match(shared,/value="g"/);assert.doesNotMatch(shared,/value="PERSONAL"|<img/);assert.match(shared,/retrait vaut pour tous ses représentants/);
});
test('participation UI : mandat distinct et destination collective affichée avant accord',()=>{
  assert.ok(permissionLabels.representMissions);const ui=createContractUi(helpers),contract={id:'k',terms,title:'Mission',applicant:group};const html=ui.acceptance({sessionId:'s',contract,confirmation:'p'});assert.match(html,/Caisse de la bande/);assert.match(html,/j’engage le personnage ou la bande/);assert.match(html,/type="checkbox" required/);assert.doesNotMatch(html,/<img/);
  const personal=ui.acceptance({sessionId:'s',contract:{...contract,terms:{...terms,applicant:person}}});assert.match(personal,/Portefeuille de Chasseur/);
});
test('participation UI : prime collective ne promet pas une récompense à chacun de ses membres',()=>{
  const ui=createBountyUi(helpers),bounty={id:'b',revision:1,status:'OPEN',terms:{...terms,participation:'GROUP'},paidCount:0,remaining:1};const proof=ui.proofConfirm({bounty,applicant:group,body:evil,confirmation:'p'},{groupId:'g'});assert.match(proof,/Une récompense au maximum par bande/);assert.match(proof,/Caisse de la bande/);assert.doesNotMatch(proof,/<img/);
  const detail=ui.detail({session:{id:'s'},bounty,claims:[],history:[],canClaim:true,participantOptions:[group]});assert.match(detail,/value="g"/);assert.doesNotMatch(detail,/value="PERSONAL"|<img/);
});
