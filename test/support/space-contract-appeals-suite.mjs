import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {spaceMissionsFixture} from './space-missions-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {shopAccountId} from '../../src/core/space-outlaws-shop-state.mjs';

export async function contractAppealsFixture(makeStore,{paid=100}={}){
 const f=await spaceMissionsFixture(makeStore),{c}=await f.validated();
 if(paid===100){f.advance(600000);await f.settle(c);}else{await f.dispute(c,100);f.advance(1200000);await f.arbitrate(c,paid);}
 const file=()=>f.confirm('prepareContractAppeal','appealContract',{contractId:c.id,reason:'Erreur matérielle du règlement',newEvidence:'Preuve retrouvée après clôture'},f.player);
 const adjustment=(adjustedAmount=40,patch={})=>({contractId:c.id,basis:'MATERIAL_ERROR',adjustedAmount,reason:'Rémunération corrigée sur pièces',...patch});
 const adjust=(amount=40,patch={})=>f.confirm('prepareContractAppealAdjustment','adjustContractAppeal',adjustment(amount,patch));
 const payment=(amount,admin=false,patch={})=>({contractId:c.id,amount,reason:'Règlement de la créance',...(!admin?{consent:true}:{}),...patch});
 const pay=(amount,admin=false,patch={})=>f.confirm(admin?'prepareContractAppealPaymentAdmin':'prepareContractAppealPayment',admin?'payContractAppealAdmin':'payContractAppeal',payment(amount,admin,patch),admin?f.owner:f.player);
 return {...f,c,file,adjustment,adjust,payment,pay,stored:()=>f.get(`contracts/${c.id}`),detail:(actor=f.player)=>f.contract(c,actor)};
}
export function spaceContractAppealsSuite(makeStore,prefix='Recours financiers SO'){
 test(`${prefix} : décision motivée inscrit une créance sans débit ni nouvelle réserve`,async()=>{
  const f=await contractAppealsFixture(makeStore),before=[await f.wallet(),await f.till()];await f.file();await f.adjust(40);const c=await f.stored();assert.equal(c.appealBalance.remaining,60);assert.equal(c.appealBalance.direction,'TO_SPONSOR');assert.equal(c.appeal.status,'FINANCIAL_DECISION');assert.equal(c.paidAmount,100);assert.equal(c.appealNetPaid,100);assert.deepEqual([await f.wallet(),await f.till()],before);assert.equal((await f.detail()).appealFinance.canPay,true);assert.equal((await f.detail(f.owner)).appealFinance.canPay,false);assert.equal((await f.points()).available,5);
 });
 test(`${prefix} : restitution personnelle partielle puis complète, sans crédits protégés dépensés`,async()=>{
  const f=await contractAppealsFixture(makeStore);await f.file();await f.adjust(40);await f.pay(25);assert.equal((await f.wallet()).balance,75);assert.equal((await f.till()).balance,75);assert.equal((await f.stored()).appealBalance.remaining,35);await f.pay(35);const c=await f.stored();assert.equal(c.appealBalance.status,'SETTLED');assert.equal(c.appealNetPaid,40);assert.equal(c.paidAmount,100);assert.equal((await f.wallet()).protectedCredits,50);assert.equal((await f.wallet()).balance,40);assert.equal((await f.till()).balance,110);assert.equal((await f.detail()).appealFinance.canPay,false);
  const ledgers=(await f.store.list(`sessions/${f.sid}/ledger`)).filter(l=>l.appealBalanceId);assert.equal(ledgers.length,2);for(const l of ledgers){assert.equal(l.createdCurrency,0);assert.equal(l.removedCurrency,0);assert.equal(l.entries.reduce((s,e)=>s+e.delta,0),0);assert.equal(l.source.name,(await f.stored()).terms.applicant.name);}
 });
 test(`${prefix} : complément PNJ après règlement partiel, paiement sur sa caisse réelle`,async()=>{
  const f=await contractAppealsFixture(makeStore,{paid:40});await f.file();await f.adjust(100);assert.equal((await f.stored()).appealBalance.direction,'TO_CHARACTER');assert.equal((await f.detail(f.owner)).appealFinance.canPay,true);assert.equal((await f.detail()).appealFinance.canPay,false);await f.pay(30,true);await f.pay(30,true);assert.equal((await f.wallet()).balance,100);assert.equal((await f.till()).balance,50);assert.equal((await f.stored()).appealNetPaid,100);assert.equal((await f.stored()).paidAmount,40);
 });
 test(`${prefix} : fonds ordinaires insuffisants et réserves intactes, reliquat conservé`,async()=>{
  const f=await contractAppealsFixture(makeStore);await f.file();await f.adjust(40);await f.edit(`accounts/${accountId(f.cid)}`,a=>({...a,balance:20,reserved:15,revision:a.revision+1}));await assert.rejects(f.pay(6),{code:'INSUFFICIENT_FUNDS'});assert.equal((await f.stored()).appealBalance.remaining,60);await f.pay(5);assert.equal((await f.wallet()).balance,15);assert.equal((await f.wallet()).reserved,15);assert.equal((await f.wallet()).protectedCredits,50);assert.equal((await f.stored()).appealBalance.remaining,55);
 });
 test(`${prefix} : caisse PNJ non provisionnée ne crée aucun crédit, dette enregistrable`,async()=>{
  const f=await contractAppealsFixture(makeStore,{paid:40});await f.edit(`accounts/${shopAccountId('counter')}`,a=>({...a,balance:0,revision:a.revision+1}));await f.file();await f.adjust(100);await assert.rejects(f.pay(1,true),{code:'INSUFFICIENT_FUNDS'});assert.equal((await f.stored()).appealBalance.remaining,60);assert.equal((await f.wallet()).balance,40);
 });
 test(`${prefix} : aucun prélèvement MJ du joueur, consentement obligatoire et tiers exclus`,async()=>{
  const f=await contractAppealsFixture(makeStore);await f.file();await assert.rejects(f.read('prepareContractAppealAdjustment',f.adjustment()),{code:'FORBIDDEN'});await f.adjust();await assert.rejects(f.pay(10,true),{code:'FORBIDDEN'});await assert.rejects(f.pay(10,false,{consent:false}),{code:'SO_APPEAL_CONSENT_REQUIRED'});await assert.rejects(f.read('prepareContractAppealPayment',f.payment(10),f.other),{code:'FORBIDDEN'});await assert.rejects(f.detail(f.other),{code:'FORBIDDEN'});assert.equal((await f.wallet()).balance,100);
 });
 test(`${prefix} : motifs autorisés, bornes du salaire et champs injectés refusés`,async()=>{
  const f=await contractAppealsFixture(makeStore);await assert.rejects(f.adjust(),{code:'SO_APPEAL_PENDING_REQUIRED'});await f.file();for(const adjustedAmount of [-1,1.5,'40'])await assert.rejects(f.adjust(adjustedAmount),{code:'INVALID_AMOUNT'});await assert.rejects(f.adjust(101),{code:'SO_APPEAL_OBLIGATION_LIMIT'});await assert.rejects(f.adjust(40,{basis:'AUTRE'}),{code:'SO_APPEAL_BASIS_REQUIRED'});await assert.rejects(f.adjust(40,{sourceAccountId:'foreign'}),{code:'INVALID_ADMISSION'});await f.adjust(40);for(const amount of [0,-1,61,1.5])await assert.rejects(f.pay(amount),{code:'INVALID_AMOUNT'});await assert.rejects(f.pay(10,false,{createdCurrency:10}),{code:'INVALID_ADMISSION'});assert.equal((await f.wallet()).balance,100);
 });
 test(`${prefix} : décision sans écart ne crée pas de dette, nouveau recours toujours motivé`,async()=>{
  const f=await contractAppealsFixture(makeStore);await f.file();await f.adjust(100,{basis:'NEW_EVIDENCE'});assert.equal((await f.stored()).appealBalance.total,0);assert.equal((await f.stored()).appealBalance.status,'SETTLED');await assert.rejects(f.pay(1),{code:'SO_APPEAL_FINANCE_UNAVAILABLE'});await f.file();await f.adjust(0,{basis:'FRAUD'});assert.equal((await f.stored()).appealBalance.remaining,100);
 });
 test(`${prefix} : une créance ouverte ne peut être effacée par un nouveau recours`,async()=>{
  const f=await contractAppealsFixture(makeStore);await f.file();await f.adjust();await assert.rejects(f.file(),{code:'SO_APPEAL_DEBT_OPEN'});await assert.rejects(f.adjust(100),{code:'SO_APPEAL_PENDING_REQUIRED'});assert.equal((await f.detail()).canAppeal,false);assert.equal((await f.stored()).appealBalance.remaining,60);
 });
 test(`${prefix} : correction suivante calculée sur les mouvements réels, sans doubler le remboursement`,async()=>{
  const f=await contractAppealsFixture(makeStore);await f.file();await f.adjust(40);await f.pay(60);await f.file();await f.adjust(90);assert.equal((await f.stored()).appealBalance.total,50);assert.equal((await f.stored()).appealBalance.direction,'TO_CHARACTER');await f.pay(50,true);assert.equal((await f.wallet()).balance,90);assert.equal((await f.till()).balance,60);assert.equal((await f.stored()).paidAmount,100);assert.equal((await f.stored()).appealNetPaid,90);
 });
 test(`${prefix} : confirmation périmée par une dépense ou une autre décision`,async()=>{
  const f=await contractAppealsFixture(makeStore);await f.file();const p=f.adjustment(),q=await f.read('prepareContractAppealAdjustment',p,f.owner);await f.confirm('prepareContractAppealDecision','decideContractAppeal',{contractId:f.c.id,reason:'Complément à examiner',outcome:'FOLLOW_UP'});await assert.rejects(f.cmd('adjustContractAppeal',{...p,confirmation:q.confirmation},f.owner),{code:'STALE_REVISION'});await f.edit('',s=>({...s,campaignEpisode:3}));assert.equal((await f.detail(f.owner)).appealFinance.canAdjust,true);await f.adjust();const input=f.payment(10),preview=await f.read('prepareContractAppealPayment',input);await f.edit(`accounts/${accountId(f.cid)}`,a=>({...a,balance:a.balance-1,revision:a.revision+1}));await assert.rejects(f.cmd('payContractAppeal',{...input,confirmation:preview.confirmation}),{code:'STALE_REVISION'});assert.equal((await f.stored()).appealBalance.remaining,60);
 });
 test(`${prefix} : double clic et concurrence ne paient jamais deux fois`,async()=>{
  const f=await contractAppealsFixture(makeStore);await f.file();await f.adjust();const p=f.payment(60),q=await f.read('prepareContractAppealPayment',p),input={...p,confirmation:q.confirmation,requestId:randomUUID()};const result=await f.cmd('payContractAppeal',input);assert.deepEqual(await f.cmd('payContractAppeal',input),result);await assert.rejects(f.pay(1),{code:'SO_APPEAL_FINANCE_UNAVAILABLE'});assert.equal((await f.wallet()).balance,40);
  const g=await contractAppealsFixture(makeStore);await g.file();await g.adjust();const x=g.payment(40),y=await g.read('prepareContractAppealPayment',x),r=await Promise.allSettled([g.cmd('payContractAppeal',{...x,confirmation:y.confirmation}),g.cmd('payContractAppeal',{...x,confirmation:y.confirmation})]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await g.wallet()).balance,60);assert.equal((await g.stored()).appealBalance.remaining,20);
 });
 test(`${prefix} : révocation avant reçu, créance et comptes conservés`,async()=>{
  const f=await contractAppealsFixture(makeStore);await f.file();await f.adjust();const p=f.payment(10),q=await f.read('prepareContractAppealPayment',p),input={...p,confirmation:q.confirmation,requestId:randomUUID()};await f.cmd('payContractAppeal',input);await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.cmd('payContractAppeal',input),{code:'FORBIDDEN'});assert.equal((await f.wallet()).balance,90);assert.equal((await f.stored()).appealBalance.remaining,50);
 });
 test(`${prefix} : décès ou remplacement ne transmet ni créance ni accès au successeur`,async()=>{
  const f=await contractAppealsFixture(makeStore,{paid:40});await f.file();await f.adjust(100);await f.edit(`characters/${f.cid}`,c=>({...c,survival:{...c.survival,dead:true}}));await assert.rejects(f.pay(10,true),{code:'STALE_CONTRACT'});await f.edit(`characters/${f.cid}`,c=>({...c,assignedUid:null}));await assert.rejects(f.pay(10,true),{code:'STALE_CONTRACT'});assert.equal((await f.stored()).characterId,f.cid);assert.equal((await f.stored()).appealBalance.remaining,60);assert.equal((await f.wallet()).balance,40);
 });
 test(`${prefix} : décision en pause, paiement en jeu seulement et STOP sans effet`,async()=>{
  const f=await contractAppealsFixture(makeStore);await f.file();await f.stage('PAUSE');await f.adjust();await assert.rejects(f.pay(10),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await f.cmd('stopSafety',{reason:'Sécurité'});await assert.rejects(f.pay(10),{code:'SO_SAFETY_STOP'});assert.equal((await f.wallet()).balance,100);assert.equal((await f.stored()).appealBalance.remaining,60);
 });
 test(`${prefix} : données privées du payeur et historique des obligations uniquement au titulaire`,async()=>{
  const f=await contractAppealsFixture(makeStore,{paid:40});await f.file();await f.adjust(100);const d=await f.detail();assert.equal(d.appealFinance.balance.remaining,60);assert.doesNotMatch(JSON.stringify(d.appealFinance),/sourceAccountId|decidedBy|available|protectedCredits|actorUid/);await assert.rejects(f.read('prepareContractAppealPayment',f.payment(10)),{code:'FORBIDDEN'});assert.equal((await f.detail(f.owner)).appealFinance.canPay,true);
 });
 test(`${prefix} : interruption atomique conserve dette, comptes et reçus`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:fn=>raw.runTransaction(async tx=>{const r=await fn(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await contractAppealsFixture(()=>store);await f.file();await f.adjust();const p=f.payment(30),q=await f.read('prepareContractAppealPayment',p),input={...p,confirmation:q.confirmation,requestId:randomUUID()},before=[await f.wallet(),await f.till(),await f.stored()];fail=true;await assert.rejects(f.cmd('payContractAppeal',input),/INTERRUPTION/);fail=false;assert.deepEqual([await f.wallet(),await f.till(),await f.stored()],before);await f.cmd('payContractAppeal',input);assert.equal((await f.stored()).appealBalance.remaining,30);
 });
 test(`${prefix} : dette persistante au-delà du délai de nouveau recours et règlement sans réécrire le passé`,async()=>{
  const f=await contractAppealsFixture(makeStore);await f.file();await f.adjust();await f.pay(20);const before=await f.stored(),e=await episodeHarness(f);await e.close();await e.resume(await e.begin());assert.deepEqual((await e.get(`contracts/${f.c.id}`)).appealBalance,before.appealBalance);await e.stage('EN_JEU');await e.close();await e.resume(await e.begin());await e.stage('EN_JEU');const p={contractId:f.c.id,amount:40,consent:true,reason:'Règlement du reliquat conservé'},q=await e.read('prepareContractAppealPayment',p,f.player);await e.cmd('payContractAppeal',{...p,confirmation:q.confirmation},f.player);assert.equal((await e.get(`contracts/${f.c.id}`)).appealBalance.remaining,0);assert.equal((await e.get(`contracts/${f.c.id}`)).settledEpisode,1);await assert.rejects(e.read('prepareContractAppeal',{contractId:f.c.id,reason:'Tardif',newEvidence:'Document'},f.player),{code:'SO_APPEAL_CLOSED'});assert.deepEqual((await f.stored()).appealBalance,before.appealBalance);
 });
 test(`${prefix} : ancien manifeste conserve le recours narratif sans ouvrir les finances`,async()=>{
  const f=await spaceMissionsFixture(makeStore,{release:false}),r=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${r.versionId}`,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await f.store.runTransaction(async tx=>{const {appealFinanceVersion,bountyVersion,manifestDigest,...old}=await tx.get(path);tx.set(path,{...old,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(old))).digest('hex')});});await f.birth(await f.birthPreview());assert.equal((await f.get('')).spaceOutlaws.appealFinanceVersion,undefined);await assert.rejects(f.read('prepareContractAppealAdjustment',{contractId:'unknown',basis:'MATERIAL_ERROR',adjustedAmount:0,reason:'Tentative'},f.owner),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });

 test(`${prefix} : obligations de recours suivent le reliquat sans le compter comme réserve`,async()=>{
  for(const paid of [100,40]){
   const f=await contractAppealsFixture(makeStore,{paid}),row=async()=>(await f.read('sessionContracts',{},f.owner)).contracts.find(c=>c.id===f.c.id).obligations;await f.file();assert.deepEqual((await row()).tasks,[{kind:'APPEAL'}]);await f.adjust(paid===100?40:100);let o=await row();assert.equal(o.reserved,0);assert.equal(o.appealBalance.remaining,60);assert.equal(o.appealBalance.direction,paid===100?'TO_SPONSOR':'TO_CHARACTER');assert.deepEqual(o.tasks,[{kind:'APPEAL_PAYMENT'}]);await f.pay(20,paid!==100);o=await row();assert.equal(o.appealBalance.remaining,40);assert.equal(o.salaryPaid,paid);await f.pay(40,paid!==100);assert.equal((await row()).pending,false);assert.equal((await row()).appealBalance,null);
  }
 });
 test(`${prefix} : obligations maintiennent le suivi narratif après clôture et délai de recours`,async()=>{
  const f=await contractAppealsFixture(makeStore);await f.file();await f.confirm('prepareContractAppealDecision','decideContractAppeal',{contractId:f.c.id,reason:'Pièce à examiner plus tard',outcome:'FOLLOW_UP'});await f.edit('',s=>({...s,campaignEpisode:4}));const before=[await f.wallet(),await f.till()],o=(await f.read('sessionContracts',{},f.owner)).contracts[0].obligations;assert.deepEqual(o.tasks,[{kind:'APPEAL'}]);assert.equal(o.appealStatus,'FOLLOW_UP');assert.equal(o.appealBalance,null);assert.equal(o.reserved,0);assert.deepEqual([await f.wallet(),await f.till()],before);
 });

}
