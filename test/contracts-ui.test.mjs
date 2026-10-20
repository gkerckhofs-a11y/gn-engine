import test from 'node:test';
import assert from 'node:assert/strict';
import {createContractUi} from '../web/contracts.mjs';
const ui=createContractUi({button:(l,a,x='')=>`<button data-action="${a}" ${x}>${l}</button>`,link:(l,u)=>`<a href="#/${u}">${l}</a>`}),evil='<img src=x onerror="bad()">';
const terms={title:evil,description:evil,sponsor:{name:evil},applicant:{id:'c',name:evil},amount:37,currency:{unit:'cr'},funding:'ACCOUNT',durationMinutes:10,conditions:evil,proofExpected:evil,confidentiality:evil,failureTerms:evil};
const contract={id:'k',title:evil,revision:1,status:'PROPOSED',terms,applicant:terms.applicant,sponsor:terms.sponsor,amount:37,currency:terms.currency,briefing:null,unread:true};
test('contrats UI : propositions, missions attribuées et historique séparés',()=>{
  const html=ui.list({session:{id:'s'},contracts:[contract,{...contract,id:'a',status:'ACTIVE'},{...contract,id:'p',status:'PAID'}]});for(const label of ['Propositions à confirmer','Missions attribuées','Contrats terminés'])assert.match(html,new RegExp(label));assert.match(html,/#\/contract\/s\/k/);assert.doesNotMatch(html,/<img/);assert.match(ui.inbox('s',[contract]),/1 contrat/);
});
test('contrats UI : rémunération, durée et financement explicitement saisis sans valeur inventée',()=>{
  const s={id:'s',economyRules:{unit:'cr'},accounts:[{id:'a',ownerType:'GROUP',label:evil,balance:100,reserved:37}],characters:[]},d={application:{id:'t',applicant:{id:'c',name:evil}},announcement:{revision:2,title:evil,rewardText:evil,conditions:evil,proofExpected:evil}};const html=ui.offer(s,d);for(const name of ['amount','durationMinutes','fundingAccount','conditions','proofExpected','confidentiality','failureTerms','reason'])assert.match(html,new RegExp(`name="${name}"`));assert.match(html,/GM_EXTERNAL/);assert.match(html,/63/);assert.match(html,/Sans acompte ni garantie/);assert.doesNotMatch(html,/<img|name="amount"[^>]*value=/);
});
test('contrats UI : consentement sur les conditions sans briefing avant acceptation',()=>{
  const html=ui.acceptance({sessionId:'s',contract,confirmation:'preuve'});assert.match(html,/acceptContract/);assert.match(html,/type="checkbox" required/);assert.match(html,/37 cr/);assert.match(html,/10 minutes de jeu/);assert.match(html,/Le délai s’arrête pendant une pause/);assert.doesNotMatch(html,/<img|SECRET/);
  const page=ui.detail({session:{id:'s'},contract,canAccept:true,canDecline:true,history:[]});assert.match(page,/briefing réservé sera ouvert après acceptation/i);assert.match(page,/declineContract/);assert.match(page,/markContractRead/);assert.doesNotMatch(page,/contractReview|contractClosure|<img/);
});
test('contrats UI : preuve confirmée, briefing débloqué et échéance explicite',()=>{
  const html=ui.detail({session:{id:'s'},contract:{...contract,status:'ACTIVE',briefing:evil,acceptedAt:100000,remainingGameMs:60000},canSubmit:true,history:[{id:'e',at:100000,action:'reviewContract',reason:evil}]});assert.match(html,/Déposer ma preuve/);assert.match(html,/Briefing réservé/);assert.doesNotMatch(html,/<img/);const proof=ui.proofConfirm({contract,body:evil,proofExpected:evil,confirmation:'p'},{sessionId:'s',contractId:'k'});assert.match(proof,/submitContractProof/);assert.doesNotMatch(proof,/<img/);const overdue=ui.detail({session:{id:'s'},contract:{...contract,status:'OVERDUE'},history:[]});assert.match(overdue,/confirmer l’expiration ou l’annulation pour libérer les fonds/);
});
test('contrats UI : revue et clôture montrent le paiement ou la libération avant confirmation',()=>{
  const d={contract,proof:{body:evil},decision:'PAY',reason:evil,amount:37,currency:{unit:'cr'},createdCurrency:37,confirmation:'p'};const pay=ui.reviewConfirm(d,{sessionId:'s',contractId:'k'});assert.match(pay,/37 cr seront versés/);assert.match(pay,/crée des crédits/);assert.match(pay,/reviewContract/);assert.doesNotMatch(pay,/<img/);const close=ui.closeConfirm({...d,decision:'EXPIRE',released:37},{sessionId:'s',contractId:'k'});assert.match(close,/Fonds libérés : 37 cr/);assert.match(close,/Aucun paiement/);assert.match(close,/closeContract/);assert.doesNotMatch(close,/<img/);
});
