import test from 'node:test';
import assert from 'node:assert/strict';
import {createBountyUi} from '../web/bounties.mjs';
import {createAnnouncementUi} from '../web/announcements.mjs';
const helpers={button:(l,a,x='')=>`<button data-action="${a}" ${x}>${l}</button>`,link:(l,u)=>`<a href="#/${u}">${l}</a>`},ui=createBountyUi(helpers),evil='<img src=x onerror="bad()">';
const terms={title:evil,description:evil,sponsor:{name:evil},conditions:evil,proofExpected:evil,amount:37,quota:2,currency:{unit:'cr'},deadline:1000000};
const bounty={id:'b',revision:1,status:'OPEN',terms,paidCount:0,remaining:2};
const claim={id:'c',revision:1,status:'SUBMITTED',applicant:{name:evil},body:evil,submittedAt:100000};
test('primes UI : parcours accessible, quota et conditions sans garantie explicites',()=>{
  const html=ui.detail({session:{id:'s'},bounty,claims:[claim],history:[],canClaim:false});assert.match(html,/heure réelle, y compris pendant les pauses/);assert.match(html,/Une récompense au maximum par personnage/);assert.match(html,/ne réserve aucune récompense/);assert.doesNotMatch(html,/<img|bountyReview|bountyClosure|FINANCE/);
  assert.match(ui.list({session:{id:'s'},bounties:[{...bounty,myClaim:claim}]}),/#\/bounty\/s\/b/);
  const proof=ui.proofConfirm({bounty,body:evil,confirmation:'p'},{sessionId:'s',bountyId:'b'});assert.match(proof,/type="checkbox" required/);assert.match(proof,/submitBountyClaim/);assert.doesNotMatch(proof,/<img/);
});
test('primes UI : réserve explicite, montant sans défaut inventé et crédits créés annoncés',()=>{
  const html=ui.setup({id:'s',accounts:[{id:'a',ownerType:'GROUP',label:evil,balance:100,reserved:26}]},{...terms,id:'b',places:2});assert.match(html,/name="amount"/);assert.match(html,/verrouillés/);assert.match(html,/74/);assert.doesNotMatch(html,/<img|name="amount"[^>]*value=/);
  const confirmed=ui.setupConfirm({terms,total:74,source:{name:evil,before:{available:100}},confirmation:'p'},{sessionId:'s'});assert.match(confirmed,/74 cr/);assert.match(confirmed,/réservée maintenant/);assert.doesNotMatch(confirmed,/<img/);
  assert.match(ui.setupConfirm({terms,total:74,source:null},{}),/créés uniquement lors de chaque paiement/);
});
test('primes UI : arbitrage et clôture montrent les conséquences avant confirmation',()=>{
  const pay=ui.reviewConfirm({bounty,claim,decision:'PAY',reason:evil,paid:37,createdCurrency:37},{});assert.match(pay,/37 cr/);assert.match(pay,/crédits seront créés/);assert.doesNotMatch(pay,/<img/);
  const close=ui.closeConfirm({bounty,released:74,pending:2,reason:evil},{});assert.match(close,/2 preuve\(s\) en attente ne seront pas rémunérées/);assert.match(close,/74 cr/);assert.match(close,/closeBounty/);assert.doesNotMatch(close,/<img/);
  const ended=ui.detail({session:{id:'s'},bounty:{...bounty,status:'EXHAUSTED'},claims:[claim],history:[],admin:true,finance:{reason:evil}});assert.match(ended,/Cette prime est terminée/);assert.doesNotMatch(ended,/data-form="bountyReview"|<img/);
});
test('primes UI : annonce financée ouvre sa gestion et masque la modification verrouillée',()=>{
  const a={id:'b',bountyId:'b',revision:1,status:'OPEN',title:evil,category:'BOUNTY',mode:'OPEN_BOUNTY',sponsorName:evil,deadline:1000000,rewardType:'FIXED'};
  const ann=createAnnouncementUi(helpers),html=ann.admin({session:{id:'s'},announcements:[a]});assert.match(html,/#\/bounty-admin\/s\/b/);assert.doesNotMatch(html,/Modifier \/ prévisualiser|<img/);
  assert.match(ann.admin({session:{id:'s'},announcements:[{...a,bountyId:null}]}),/data-action="fundBounty"/);
});
