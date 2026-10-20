import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {contractFixture} from './contracts-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {bountyCommands} from '../../src/core/bounties.mjs';
export async function bountyFixture(makeStore){
  const f=await contractFixture(makeStore),sessionId=f.sessionId,bountyId=f.aid;
  await f.edit({mode:'OPEN_BOUNTY',rewardType:'FIXED',rewardText:'Prime fixe synthétique',places:2});
  const prepare=async(action,input,who=f.owner)=>({input:{sessionId,bountyId,...input},result:await f.read(action,who,{sessionId,bountyId,...input})});
  const execute=(action,p,who=f.owner,extra={})=>f.cmd(action,who,{...p.input,confirmation:p.result.confirmation,...extra});
  const prepareOpen=(patch={},who=f.owner)=>prepare('prepareBounty',{announcementId:bountyId,amount:37,funding:'ACCOUNT',sourceAccountId:accountId(f.characters[0]),reason:'FINANCE_PRIVEE',...patch},who);
  const open=(p,who=f.owner,extra)=>execute('openBounty',p,who,extra);
  const start=async(patch={})=>open(await prepareOpen(patch));
  const prepareClaim=(body='PREUVE_PRIVEE_BOB',who=f.bob)=>prepare('prepareBountyClaim',{body},who);
  const claim=(p,who=f.bob,extra)=>execute('submitBountyClaim',p,who,extra);
  const submit=async(who=f.bob,body)=>claim(await prepareClaim(body,who),who);
  const detail=(who=f.bob)=>f.read('bountyDetail',who,{sessionId,bountyId});
  const admin=()=>f.read('sessionBounty',f.owner,{sessionId,bountyId});
  const preparePay=async(who=f.bob,patch={})=>prepare('prepareBountyReview',{claimId:(await detail(who)).claims[0].id,decision:'PAY',reason:'Validation synthétique',...patch});
  const pay=(p,who=f.owner,extra)=>execute('reviewBounty',p,who,extra);
  const prepareClose=()=>prepare('prepareBountyClosure',{reason:'Clôture expliquée'});
  const close=(p,extra)=>execute('closeBounty',p,f.owner,extra);
  return {...f,bountyId,prepareOpen,open,start,prepareClaim,claim,submit,detail,admin,preparePay,pay,prepareClose,close};
}
export function bountiesSuite(makeStore,prefix='Primes ouvertes'){
  const fixture=()=>bountyFixture(makeStore);
  test(`${prefix} : cagnotte réservée une seule fois, conditions figées et finance privée`,async()=>{
    const f=await fixture(),p=await f.prepareOpen(),requestId=randomUUID(),r=await f.open(p,f.owner,{requestId});assert.deepEqual(await f.open(p,f.owner,{requestId}),r);
    assert.equal((await f.account()).account.reserved,74);assert.equal((await f.account()).account.available,26);
    const d=await f.detail();assert.equal(d.bounty.terms.amount,37);assert.equal(d.bounty.remaining,2);assert.equal(d.canClaim,true);
    for(const secret of ['BRIEFING_CONTRAT_RESERVE','SECRET_MJ','FINANCE_PRIVEE',f.owner.uid,accountId(f.characters[0])])assert.equal(JSON.stringify(d).includes(secret),false,secret);
    await assert.rejects(f.edit({places:3}),{code:'BOUNTY_LOCKED'});await assert.rejects(f.prepareOpen(),{code:'BOUNTY_EXISTS'});
    await assert.rejects(f.read('preparePayment',f.alice,{sessionId:f.sessionId,recipientId:f.characters[1],amount:27,memo:'Trop'}),{code:'INSUFFICIENT_FUNDS'});
  });
  test(`${prefix} : plusieurs preuves privées ne réservent pas de récompense individuelle`,async()=>{
    const f=await fixture();await f.start();const p=await f.prepareClaim(),requestId=randomUUID(),r=await f.claim(p,f.bob,{requestId});assert.deepEqual(await f.claim(p,f.bob,{requestId}),r);await f.submit(f.eve,'PREUVE_PRIVEE_EVE');
    assert.equal((await f.admin()).claims.length,2);assert.equal((await f.detail()).bounty.paidCount,0);assert.equal((await f.account()).account.reserved,74);
    assert.equal((await f.detail()).claims.length,1);for(const secret of [f.eve.uid,'PREUVE_PRIVEE_EVE'])assert.equal(JSON.stringify(await f.detail()).includes(secret),false);
    await assert.rejects(f.prepareClaim(),{code:'BOUNTY_CLAIM_EXISTS'});await assert.rejects(f.prepareClaim('Auto',f.alice),{code:'INVALID_RECIPIENT'});
  });
  test(`${prefix} : dernière récompense concurrente et rejeu ne peuvent doubler le paiement`,async()=>{
    const f=await fixture();await f.edit({places:1});await f.start();await f.submit();await f.submit(f.eve,'Autre preuve');const a=await f.preparePay(),b=await f.preparePay(f.eve),requestId=randomUUID();
    const rs=await Promise.allSettled([f.pay(a,f.owner,{requestId}),f.pay(b)]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);if(rs[0].status==='fulfilled')assert.deepEqual(await f.pay(a,f.owner,{requestId}),rs[0].value);
    assert.equal((await f.account()).account.balance,63);assert.equal((await f.account()).account.reserved,0);assert.equal((await f.account(f.bob)).account.balance+(await f.account(f.eve)).account.balance,37);assert.equal((await f.admin()).bounty.status,'EXHAUSTED');assert.equal((await f.announcement()).status,'CLOSED');
    const events=(await f.store.list(`sessions/${f.sessionId}/ledger`)).filter(e=>e.kind==='BOUNTY_PAY');assert.equal(events.length,1);assert.equal(events[0].entries.reduce((n,e)=>n+e.delta,0),0);assert.equal(events[0].createdCurrency,0);
  });
  test(`${prefix} : deux lauréats distincts et rapprochement des portefeuilles`,async()=>{
    const f=await fixture();await f.start();await f.submit();await f.submit(f.eve);await f.pay(await f.preparePay());await f.pay(await f.preparePay(f.eve));
    assert.equal((await f.account()).account.balance,26);assert.equal((await f.account()).account.reserved,0);assert.equal((await f.account(f.bob)).account.balance,37);assert.equal((await f.account(f.eve)).account.balance,37);
    assert.ok((await f.account(f.bob)).entries.some(e=>e.bountyId===f.bountyId&&e.kind==='BOUNTY_PAY'));await assert.rejects(f.preparePay());
  });
  test(`${prefix} : complément conserve les récits, refus définitif sans débit ni quota consommé`,async()=>{
    const f=await fixture();await f.start();await f.submit();await f.pay(await f.preparePay(f.bob,{decision:'RETURN',reason:'Précisez le lieu'}));assert.equal((await f.detail()).canClaim,true);await f.submit(f.bob,'SECOND_RECIT');
    const d=await f.detail();assert.ok(d.history.some(e=>e.body==='PREUVE_PRIVEE_BOB'));assert.ok(d.history.some(e=>e.body==='SECOND_RECIT'));await f.pay(await f.preparePay(f.bob,{decision:'REJECT'}));assert.equal((await f.detail()).claims[0].status,'REJECTED');assert.equal((await f.admin()).bounty.paidCount,0);assert.equal((await f.account()).account.reserved,74);await assert.rejects(f.prepareClaim(),{code:'BOUNTY_CLAIM_EXISTS'});
  });
  test(`${prefix} : échéance réelle bloque le dépôt mais pas le paiement d’une preuve reçue à temps`,async()=>{
    const f=await fixture();await f.start();await f.submit();await f.stage('PAUSE');f.advance(900001);await f.stage('EN_JEU');assert.equal((await f.detail()).bounty.status,'OVERDUE');await assert.rejects(f.prepareClaim('Tardive',f.eve),{code:'BOUNTY_CLOSED'});await assert.rejects(f.preparePay(f.bob,{decision:'RETURN'}),{code:'BOUNTY_CLOSED'});await f.pay(await f.preparePay());assert.equal((await f.account()).account.reserved,37);await f.close(await f.prepareClose());assert.equal((await f.account()).account.reserved,0);assert.equal((await f.account()).account.balance,63);
  });
  test(`${prefix} : clôture avertit des preuves en attente et libère seulement le reliquat`,async()=>{
    const f=await fixture();await f.start();await f.submit();await f.submit(f.eve);await f.pay(await f.preparePay());const p=await f.prepareClose();assert.equal(p.result.pending,1);assert.equal(p.result.released,37);await f.close(p);assert.equal((await f.account()).account.reserved,0);assert.equal((await f.account()).account.balance,63);assert.equal((await f.detail(f.eve)).bounty.closeReason,'Clôture expliquée');await assert.rejects(f.preparePay(f.eve),{code:'BOUNTY_CLOSED'});
  });
  test(`${prefix} : validation concurrente avec clôture conserve la monnaie`,async()=>{
    const f=await fixture();await f.start();await f.submit();const p=await f.preparePay(),c=await f.prepareClose(),rs=await Promise.allSettled([f.pay(p),f.close(c)]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);if((await f.admin()).canClose)await f.close(await f.prepareClose());assert.equal((await f.account()).account.balance+(await f.account(f.bob)).account.balance,100);assert.equal((await f.account()).account.reserved,0);
  });
  test(`${prefix} : création externe limitée au paiement validé`,async()=>{
    const f=await fixture();await f.start({funding:'GM_EXTERNAL'});assert.equal((await f.account()).account.reserved,0);await f.submit();const p=await f.preparePay();assert.equal(p.result.createdCurrency,37);await f.pay(p);await f.close(await f.prepareClose());const es=(await f.store.list(`sessions/${f.sessionId}/ledger`)).filter(e=>e.kind==='GM_BOUNTY_PAY');assert.equal(es.length,1);assert.equal(es[0].createdCurrency,37);assert.equal((await f.account()).account.balance,100);
  });
  test(`${prefix} : mauvaise identité et réactivation n’héritent ni preuve ni résultat`,async()=>{
    const f=await fixture();await f.start();const p=await f.prepareClaim(),requestId=randomUUID();await f.claim(p,f.bob,{requestId});const pay=await f.preparePay();await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.bob.uid});f.advance(2000);f.bob.authTime=102;await f.activate(f.bob);
    assert.equal((await f.detail()).claims.length,0);assert.equal((await f.detail()).canClaim,false);await assert.rejects(f.claim(p,f.bob,{requestId}),{code:'FORBIDDEN'});await assert.rejects(f.pay(pay),{code:'STALE_BOUNTY_CLAIM'});await f.close(await f.prepareClose());
  });
  test(`${prefix} : réattribution ne rémunère jamais le successeur`,async()=>{
    const f=await fixture();await f.start();await f.submit();const p=await f.preparePay();await f.cmd('assign',f.owner,{sessionId:f.sessionId,uid:f.eve.uid,characterId:f.characters[1],replace:true});await f.activate(f.eve);assert.equal((await f.detail(f.eve)).claims.length,0);await assert.rejects(f.pay(p),{code:'STALE_BOUNTY_CLAIM'});
  });
  test(`${prefix} : audiences ciblées et refus des accès joueurs, accueil et anonymes`,async()=>{
    const f=await fixture();await f.edit({audience:{kind:'TARGETED',characterIds:[f.characters[1]],groupIds:[]}});await f.start();await assert.rejects(f.detail(f.eve),{code:'FORBIDDEN'});assert.equal((await f.read('bounties',f.eve,{sessionId:f.sessionId})).bounties.length,0);
    await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Test'});
    for(const who of [f.bob,f.staff])for(const action of ['sessionBounties','sessionBounty','prepareBounty','openBounty','prepareBountyReview','reviewBounty','prepareBountyClosure','closeBounty'])await assert.rejects(f.cmd(action,who,{sessionId:f.sessionId,bountyId:f.bountyId}),{code:'FORBIDDEN'});
    for(const action of bountyCommands)await assert.rejects(f.cmd(action,null,{sessionId:f.sessionId,bountyId:f.bountyId}),{code:'LOGIN_REQUIRED'});
  });
  test(`${prefix} : pause, hors combat, fin et archivage encadrent les mutations`,async()=>{
    const f=await fixture();await f.start();await f.stage('PAUSE');await assert.rejects(f.prepareClaim(),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await f.damage(f.bob,10);await assert.rejects(f.prepareClaim(),{code:'OUT_OF_COMBAT'});await f.stage('FINISHED');await assert.rejects(f.stage('ARCHIVED'),{code:'BOUNTIES_OPEN'});await f.close(await f.prepareClose());await f.stage('ARCHIVED');await assert.rejects(f.admin(),{code:'SESSION_CLOSED'});
  });
  test(`${prefix} : données invalides et fonds devenus insuffisants ne créent pas de cagnotte`,async()=>{
    const f=await fixture();for(const patch of [{amount:0},{amount:1.5},{amount:Number.MAX_SAFE_INTEGER},{funding:'FAUX'},{reason:''}])await assert.rejects(f.prepareOpen(patch));const p=await f.prepareOpen(),v={sessionId:f.sessionId,recipientId:f.characters[1],amount:90,memo:'Dépense'},d=await f.read('preparePayment',f.alice,v);await f.cmd('payCredits',f.alice,{...v,confirmation:d.confirmation});await assert.rejects(f.open(p),{code:'INSUFFICIENT_FUNDS'});assert.equal((await f.account()).account.reserved,0);
  });
  test(`${prefix} : arrêt économique bloque le paiement mais autorise la restitution`,async()=>{
    const f=await fixture();await f.start();await f.submit();const s=await f.session();await f.cmd('saveSessionEconomy',f.owner,{sessionId:f.sessionId,revision:s.revision,rules:{...s.economyRules,enabled:false},reason:'Test'});await assert.rejects(f.preparePay(),{code:'ECONOMY_DISABLED'});await f.close(await f.prepareClose());assert.equal((await f.store.get(`sessions/${f.sessionId}/accounts/${accountId(f.characters[0])}`)).reserved,0);
  });
  test(`${prefix} : panne de transaction ne laisse ni cagnotte ni paiement partiel`,async()=>{
    const f=await fixture(),run=f.store.runTransaction.bind(f.store);let abort=false;f.store.runTransaction=cb=>run(async tx=>{const x=await cb(tx);if(abort){abort=false;throw Error('Panne prime');}return x;});const p=await f.prepareOpen();abort=true;await assert.rejects(f.open(p),/Panne prime/);assert.equal((await f.account()).account.reserved,0);await f.open(p);await f.submit();const pay=await f.preparePay();abort=true;await assert.rejects(f.pay(pay),/Panne prime/);assert.equal((await f.account(f.bob)).account.balance,0);assert.equal((await f.account()).account.reserved,74);await f.pay(pay);assert.equal((await f.account(f.bob)).account.balance,37);
  });
}
