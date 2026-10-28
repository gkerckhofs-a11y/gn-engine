import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {spaceBountiesFixture} from './support/space-bounties-suite.mjs';
import {createBountyUi,soBountyErrors} from '../web/bounties.mjs';
import {createAnnouncementUi} from '../web/announcements.mjs';
import {createContractUi} from '../web/contracts.mjs';
import {terminalHtml} from '../web/player-spaces.mjs';
import {createEntryUi} from '../web/space-outlaws-entry.mjs';
import {episodeContinuity} from '../web/space-outlaws-episodes.mjs';
const helpers={button:(l,a)=>`<button data-action="${a}">${l}</button>`,link:(l,p)=>`<a href="#/${p}">${l}</a>`},ui=createBountyUi(helpers),ann=createAnnouncementUi(helpers),contracts=createContractUi(helpers);
test('Primes SO UI : accès marqué, annonce ouverte et financement limité aux caisses PNJ',async()=>{
 const s={id:'s',spaceOutlaws:{missionsVersion:1,bountyVersion:1},economyRules:{unit:'Cr'},characters:[],groups:[],missions:[],accounts:[{id:'shop',ownerType:'SHOP',label:'Comptoir',balance:150,reserved:0},{id:'person',ownerType:'CHARACTER',balance:900,reserved:0}]};assert.match(ann.editor(s),/value="OPEN_BOUNTY"/);assert.doesNotMatch(ann.editor({...s,spaceOutlaws:{missionsVersion:1}}),/value="OPEN_BOUNTY"/);assert.match(terminalHtml({session:s}),/#\/bounties\/s/);assert.doesNotMatch(terminalHtml({session:{id:'s',spaceOutlaws:{missionsVersion:1}}}),/#\/bounties/);const h=ui.setup(s,{id:'a',title:'Prime',places:2,deadline:1000000});assert.match(h,/value="shop"/);assert.doesNotMatch(h,/GM_EXTERNAL|value="person"/);assert.match(h,/briefing réservé de l’annonce n’est pas communiqué/);
});
test('Primes SO UI : preuve consentie, consignes publiques et absence de briefing M7 privé',async()=>{
 const f=await spaceBountiesFixture(()=>new MemoryStore());await f.start();const entry=await f.read('spaceOutlawsEntry',{},f.owner);assert.equal(entry.bountiesReady,true);assert.match(createEntryUi(helpers).page(entry),new RegExp(`bounties-admin/${f.sid}`));const d=await f.detail(),h=ui.detail(d);assert.match(h,/data-form="bountyProof" data-so="true"/);assert.match(h,/name="consent" required/);assert.match(h,/dix minutes de jeu pour contester/);assert.match(h,/Le dépôt ne garantit pas de récompense/);assert.doesNotMatch(h,/SECRET_|data-form="bountyReview"/);for(const message of Object.values(soBountyErrors))assert.ok(message.length>30);
});
test('Primes SO UI : attribution distincte du paiement, contrat lié et fermeture sans libération abusive',async()=>{
 const f=await spaceBountiesFixture(()=>new MemoryStore());await f.start();await f.submit();const p=await f.reviewInput(),d=await f.read('prepareBountyReview',p,f.owner),h=ui.reviewConfirm(d,p);assert.match(h,/aucun versement immédiat/);assert.match(h,/Paiement : <strong>0 Cr/);await f.review();const c=await f.awarded(),detail=ui.detail(await f.detail());assert.match(detail,new RegExp(`contract/${f.sid}/${c.id}`));assert.match(detail,/1\/2 récompense\(s\) attribuée/);const ch=contracts.detail(await f.contract(c));assert.match(ch,/cagnotte PNJ déjà réservée/);assert.doesNotMatch(ch,/0 minutes de jeu|temps de jeu restant|SECRET_/);const q=await f.read('prepareBountyClosure',{bountyId:f.bountyId,reason:'Fermeture'},f.owner),close=ui.closeConfirm(q,{});assert.match(close,/50 Cr/);assert.match(close,/réserves déjà affectées à un contrat sont conservées/);await f.close();assert.match(ui.detail(await f.detail()),/contrats déjà attribués restent ouverts/);
});
test('Primes SO UI : bilan d’épisode distingue cagnotte restante et contrats, textes échappés',()=>{
 const h=episodeContinuity({participants:[],contracts:[],voyages:[],pickups:0,bounties:[{title:'<script>Prime</script>',awardedCount:1,pending:2,reserved:50}]});assert.match(h,/Primes conservées/);assert.match(h,/1 attribution\(s\) · 2 preuve\(s\) à examiner · 50 Cr réservés hors contrats attribués/);assert.doesNotMatch(h,/<script>/);
});
