import test from 'node:test';
import assert from 'node:assert/strict';
import {boardingHtml,boardingConfirmHtml,boardingFormInput} from '../web/space-boarding.mjs';
import {ransomSponsorFixture,sponsorDeclineInput} from './support/space-boarding-ransom-sponsor-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
test('UI soutien rançon : demande MJ sans montant, paiement personnel et vue sans scène',async()=>{
 const f=await ransomSponsorFixture(()=>new MemoryStore(),{assigned:false}),admin=boardingHtml(await f.board());assert.match(admin,/prepareBoardingRansomSponsor/);assert.match(admin,/name="payerId"/);assert.doesNotMatch(admin,/name="amount"/);assert.doesNotMatch(boardingHtml(await f.donorView()),/boardingRansomPrepare/);await f.assign();const donor=boardingHtml(await f.donorView());assert.match(donor,/Soutien volontaire à une rançon/);assert.match(donor,/name="amount"/);assert.match(donor,/boardingRansomPrepare/);assert.doesNotMatch(donor,/Équipages embarqués|Zone :|releaseSpaceBoarding|resolveSpaceBoarding|boardingCargoPrepare/);assert.match(boardingHtml(await f.board()),/clearBoardingRansomSponsor/);const q=await f.prepareDonor(),dialog=boardingConfirmHtml('prepareBoardingRansom',q,f.input);assert.match(dialog,/Confirmer mon paiement/);await f.payDonor();const paid=boardingHtml(await f.donorView());assert.match(paid,/Votre paiement est enregistré/);assert.match(paid,/Consulter mon portefeuille/);assert.doesNotMatch(paid,/boardingRansomPrepare/);
});
test('UI soutien rançon : noms échappés, confirmation de demande séparée et saisie stricte',()=>{
 const h=boardingConfirmHtml('prepareBoardingRansomSponsor',{payerName:'<script>payeur</script>',recipientName:'<img src=x>',confirmation:'preuve'},{sessionId:'s',combatId:'c',boardingId:'b',payerId:'p',reason:'Demande'});assert.doesNotMatch(h,/<script>|<img|name="amount"|payBoardingRansom/);assert.match(h,/&lt;script&gt;/);assert.match(h,/assignBoardingRansomSponsor/);assert.match(h,/aucune réservation/);const f={dataset:{payload:JSON.stringify({sessionId:'s',combatId:'c',boardingId:'b'})},querySelector:()=>null};assert.deepEqual(boardingFormInput(f,{payerId:'p',reason:'Demande',amount:'100',sourceAccountId:'autre'}),{sessionId:'s',combatId:'c',boardingId:'b',payerId:'p',reason:'Demande'});
});

test('UI soutien rançon : refus personnel et accusé privé sans formulaire ou scène',async()=>{
 const f=await ransomSponsorFixture(()=>new MemoryStore()),h=boardingHtml(await f.donorView());assert.match(h,/declineBoardingRansomSponsor/);assert.match(h,/Refuser le soutien/);assert.match(h,/confirmation/);await f.cmd('declineBoardingRansomSponsor',await sponsorDeclineInput(f),f.other);const ack=boardingHtml(await f.donorView());assert.match(ack,/Soutien refusé/);assert.match(ack,/sans prélèvement/);assert.doesNotMatch(ack,/name="amount"|boardingRansomPrepare|declineBoardingRansomSponsor|Équipages embarqués|Zone :|releaseSpaceBoarding/);assert.match(boardingHtml(await f.board()),/a refusé/);await f.assign();assert.match(boardingHtml(await f.donorView()),/Refuser le soutien/);
});
test('UI soutien rançon : identité du refus échappée et retrait sans montant injectable',()=>{
 const h=boardingHtml({session:{id:'s',stage:'EN_JEU'},admin:true,combatId:'c',choices:[],boardings:[{id:'b',status:'CONTROLLED',crew:[],ransomSponsorChoices:[],ransomSponsorDecision:{name:'<script>intrus</script>',status:'DECLINED'}}]});assert.match(h,/&lt;script&gt;/);assert.doesNotMatch(h,/<script>/);
});
