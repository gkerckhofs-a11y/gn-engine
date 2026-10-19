import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createWorkflow,hash} from '../../src/core/workflow.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
export async function economyFixture(makeStore,configured=true){
  const store=await makeStore(),suffix=randomUUID();let time=100000;
  const actor=n=>({uid:`${n}-${suffix}`,email:`${n}-${suffix}@example.invalid`,emailVerified:true,provider:'google.com',authTime:100});
  const owner=actor('owner'),alice=actor('alice'),bob=actor('bob'),eve=actor('eve'),staff=actor('staff');
  const workflow=createWorkflow({store,ownerEmail:owner.email,now:()=>time});
  const read=(a,who=owner,i={})=>workflow.dispatch(a,who,i),cmd=(a,who=owner,i={})=>read(a,who,{requestId:randomUUID(),...i});
  const {id:scenarioId}=await cmd('createScenario',owner,{title:'Économie synthétique'}),scenario=()=>read('scenario',owner,{scenarioId}),characters=[];
  for(const name of ['Alice','Bob','Eve'])characters.push((await cmd('saveCharacter',owner,{scenarioId,revision:(await scenario()).revision,displayName:name,biography:'BIO_STABLE',gmNotes:'SECRET_FICHE',publicationState:'PUBLISHED'})).id);
  const currency={enabled:true,name:'Crédits de test',unit:'crédit'};
  const seed=async(cid,amount)=>{const input={scenarioId,revision:(await scenario()).revision,characterId:cid,amount},p=await read('prepareStartingCredits',owner,input);return cmd('setStartingCredits',owner,{...input,confirmation:p.confirmation});};
  if(configured){await cmd('saveScenarioEconomy',owner,{scenarioId,revision:(await scenario()).revision,rules:currency});await seed(characters[0],100);}
  await cmd('saveScenarioHealth',owner,{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,defaultMaxHp:10,returnMode:'MJ',allowed:{}}});
  const {id:versionId}=await cmd('publishScenario',owner,{scenarioId,revision:(await scenario()).revision}),sessionInput={scenarioId,versionId,title:'Crédits fictifs',capacity:3,privacy:'Fictif'};
  const {id:sessionId}=await cmd('createSession',owner,sessionInput),session=()=>read('session',owner,{sessionId});
  const stage=value=>session().then(s=>cmd('setStage',owner,{sessionId,revision:s.revision,stage:value}));
  const activate=async who=>{const token=randomBytes(32).toString('base64url');await cmd('issueInvitation',owner,{sessionId,uid:who.uid,tokenHash:hash(token),hours:1});await read('redeem',who,{sessionId,token});};
  await cmd('setRegistrationOpen',owner,{sessionId,revision:1,open:true});
  for(const [i,who] of [alice,bob,eve].entries()){await cmd('register',who,{sessionId,name:'Test'});await cmd('assign',owner,{sessionId,uid:who.uid,characterId:characters[i]});await activate(who);}
  await stage('BRIEFING');await stage('EN_JEU');
  const wallet=(who=alice,patch={})=>read('myWallet',who,{sessionId,...patch});
  const prepare=async(patch={},who=alice)=>{const input={sessionId,recipientId:characters[1],amount:80,memo:'Règlement de jeu',...patch};return {input,result:await read('preparePayment',who,input)};};
  const pay=(p,who=alice,patch={})=>cmd('payCredits',who,{...p.input,confirmation:p.result.confirmation,...patch});
  const prepareAdjustment=async(patch={},who=owner)=>{const input={sessionId,revision:(await session()).revision,characterId:characters[0],amount:10,mode:'CREDIT',memo:'Récompense publique',reason:'MOTIF_PRIVE_MJ',...patch};return {input,result:await read('prepareCreditAdjustment',who,input)};};
  const adjust=(p,who=owner,patch={})=>cmd('applyCreditAdjustment',who,{...p.input,confirmation:p.result.confirmation,...patch});
  const rules=async patch=>cmd('saveSessionEconomy',owner,{sessionId,revision:(await session()).revision,rules:{...currency,...patch},reason:'Configuration de test'});
  const damage=async(who=alice)=>{const input={sessionId,amount:10},p=await read('prepareDamage',who,input);return cmd('applyDamage',who,{...input,confirmation:p.confirmation});};
  const ledger=()=>store.list(`sessions/${sessionId}/ledger`);
  const injectAccount=async(cid,patch)=>store.runTransaction(async tx=>{const path=`sessions/${sessionId}/accounts/${accountId(cid)}`,a=await tx.get(path);tx.set(path,{...a,...patch});});
  return {store,read,cmd,owner,alice,bob,eve,staff,scenarioId,sessionId,scenario,session,sessionInput,characters,currency,seed,stage,activate,wallet,prepare,pay,prepareAdjustment,adjust,rules,damage,ledger,injectAccount,advance:ms=>time+=ms};
}
export function economySuite(makeStore,prefix='Crédits'){
  const fixture=configured=>economyFixture(makeStore,configured);
  test(`${prefix} : dotation confirmée, versions et sessions indépendantes`,async()=>{
    const f=await fixture(),input={scenarioId:f.scenarioId,revision:(await f.scenario()).revision,characterId:f.characters[0],amount:200},p=await f.read('prepareStartingCredits',f.owner,input);
    assert.equal((await f.scenario()).characters.find(c=>c.id===f.characters[0]).startingCredits?.amount??0,100);const requestId=randomUUID(),r=await f.cmd('setStartingCredits',f.owner,{...input,confirmation:p.confirmation,requestId});assert.deepEqual(await f.cmd('setStartingCredits',f.owner,{...input,confirmation:p.confirmation,requestId}),r);
    await f.pay(await f.prepare());const {id}=await f.cmd('createSession',f.owner,f.sessionInput),s=await f.read('session',f.owner,{sessionId:id});assert.equal(s.accounts.find(a=>a.characterId===f.characters[0]).balance,100);assert.equal((await f.wallet()).account.balance,20);
    await f.cmd('saveScenarioEconomy',f.owner,{scenarioId:f.scenarioId,revision:(await f.scenario()).revision,rules:{...f.currency,name:'Autre monnaie'}});assert.equal((await f.wallet()).currency.name,f.currency.name);
  });
  test(`${prefix} : ancien scénario ouvert à zéro, réactivation sans réinitialiser et unité figée`,async()=>{
    const f=await fixture(false);assert.equal((await f.session()).accounts.length,0);await assert.rejects(f.wallet(),{code:'ECONOMY_DISABLED'});await f.rules({});assert.equal((await f.wallet()).account.balance,0);
    await f.adjust(await f.prepareAdjustment());await f.rules({enabled:false});await assert.rejects(f.wallet(),{code:'ECONOMY_DISABLED'});await f.rules({});assert.equal((await f.wallet()).account.balance,10);assert.equal((await f.ledger()).length,4);
    await assert.rejects(f.rules({unit:'autre'}),{code:'CURRENCY_LOCKED'});await assert.rejects(f.rules({name:'Autre'}),{code:'CURRENCY_LOCKED'});
  });
  test(`${prefix} : récapitulatif sans effet et aucune divulgation du solde bénéficiaire`,async()=>{
    const f=await fixture(),p=await f.prepare();assert.equal(p.result.before.balance,100);assert.equal(p.result.after.balance,20);assert.deepEqual(p.result.recipient,{id:f.characters[1],name:'Bob'});assert.equal((await f.wallet()).account.balance,100);assert.equal((await f.ledger()).length,3);
    assert.equal(JSON.stringify(p).includes('assignedUid'),false);const r=await f.pay(p),bob=await f.wallet(f.bob);assert.equal(r.account.balance,20);assert.equal(bob.account.balance,80);assert.equal(bob.entries.find(e=>e.id===r.id).before.balance,0);
    for(const hidden of ['actorUid','reason','SECRET_FICHE','createdCurrency'])assert.equal(JSON.stringify(bob).includes(hidden),false,hidden);
  });
  test(`${prefix} : débit crédit atomiques, journal équilibré et répétition unique`,async()=>{
    const f=await fixture(),p=await f.prepare(),requestId=randomUUID(),r=await f.pay(p,f.alice,{requestId});assert.deepEqual(await f.pay(p,f.alice,{requestId}),r);
    const events=await f.ledger(),e=events.find(e=>e.id===r.id);assert.equal(events.length,4);assert.equal(e.entries.reduce((n,e)=>n+e.delta,0),0);assert.equal(e.createdCurrency,0);assert.equal(e.removedCurrency,0);
    for(const who of [f.alice,f.bob,f.eve]){const w=await f.wallet(who);assert.equal(w.entries.reduce((n,e)=>n+e.delta,0),w.account.balance);}
    await assert.rejects(f.pay(p,f.alice,{requestId,memo:'Autre motif'}),{code:'REQUEST_ID_REUSED'});assert.equal((await f.wallet()).account.balance,20);
  });
  test(`${prefix} : deux paiements concurrents de 80 sur 100 ont un seul gagnant`,async()=>{
    const f=await fixture(),p=await f.prepare(),q=await f.prepare({recipientId:f.characters[2]});const r=await Promise.allSettled([f.pay(p),f.pay(q)]);
    assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'INSUFFICIENT_FUNDS');assert.equal((await f.wallet()).account.balance,20);assert.equal((await f.wallet(f.bob)).account.balance+(await f.wallet(f.eve)).account.balance,80);assert.equal((await f.ledger()).length,4);
  });
  test(`${prefix} : crédits concurrents vers le même bénéficiaire conservés`,async()=>{
    const f=await fixture();await f.adjust(await f.prepareAdjustment({characterId:f.characters[2],amount:100}));const p=await f.prepare(),q=await f.prepare({},f.eve);await Promise.all([f.pay(p),f.pay(q,f.eve)]);assert.equal((await f.wallet(f.bob)).account.balance,160);assert.equal((await f.wallet(f.eve)).account.balance,20);
  });
  test(`${prefix} : confirmation périmée après changement de solde ou de destinataire`,async()=>{
    const f=await fixture(),p=await f.prepare({amount:10});await f.pay(await f.prepare({amount:1}));await assert.rejects(f.pay(p),{code:'STALE_REVISION'});
    const q=await f.prepare({amount:10});await assert.rejects(f.pay(q,f.alice,{recipientId:f.characters[2]}),{code:'STALE_REVISION'});await assert.rejects(f.pay(q,f.alice,{memo:'Autre motif'}),{code:'STALE_REVISION'});assert.equal((await f.wallet()).account.balance,99);
  });
  test(`${prefix} : identité serveur, compte d’autrui et destinataires invalides`,async()=>{
    const f=await fixture();assert.equal((await f.wallet(f.bob,{characterId:f.characters[0],fromAccountId:accountId(f.characters[0])})).account.balance,0);
    for(const recipientId of [f.characters[0],randomUUID()])await assert.rejects(f.prepare({recipientId}),{code:'INVALID_RECIPIENT'});
    await assert.rejects(f.prepare({fromAccountId:accountId(f.characters[0]),recipientId:f.characters[0]},f.bob),{code:'INSUFFICIENT_FUNDS'});
    const p=await f.prepare({fromAccountId:accountId(f.characters[2]),characterId:f.characters[2]});await f.pay(p);assert.equal((await f.wallet()).account.balance,20);assert.equal((await f.wallet(f.eve)).account.balance,0);
  });
  test(`${prefix} : révocation du destinataire et nouvelle attribution invalident la confirmation`,async()=>{
    const f=await fixture(),p=await f.prepare();await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.bob.uid});await assert.rejects(f.pay(p),{code:'INVALID_RECIPIENT'});f.advance(2000);f.bob.authTime=102;f.eve.authTime=102;await f.activate(f.bob);await assert.rejects(f.pay(p),{code:'STALE_REVISION'});
    const q=await f.prepare();await f.cmd('assign',f.owner,{sessionId:f.sessionId,uid:f.eve.uid,characterId:f.characters[1],replace:true});await f.activate(f.eve);await assert.rejects(f.pay(q),{code:'STALE_REVISION'});assert.equal((await f.wallet()).account.balance,100);
  });
  test(`${prefix} : révocation et authentification périmée priment sur le résultat mémorisé`,async()=>{
    const f=await fixture(),p=await f.prepare(),requestId=randomUUID();await f.pay(p,f.alice,{requestId});await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.alice.uid});await assert.rejects(f.pay(p,f.alice,{requestId}),{code:'FORBIDDEN'});await assert.rejects(f.wallet(),{code:'FORBIDDEN'});
    f.advance(2000);f.alice.authTime=102;await f.activate(f.alice);await assert.rejects(f.wallet({...f.alice,authTime:100}),{code:'FORBIDDEN'});await assert.rejects(f.pay(p,f.alice,{requestId}),{code:'FORBIDDEN'});assert.equal((await f.wallet()).account.balance,20);
  });
  test(`${prefix} : portefeuille attaché au personnage après réattribution`,async()=>{
    const f=await fixture();await f.pay(await f.prepare());await f.cmd('assign',f.owner,{sessionId:f.sessionId,uid:f.eve.uid,characterId:f.characters[0],replace:true});await f.activate(f.eve);await assert.rejects(f.wallet(),{code:'FORBIDDEN'});assert.equal((await f.wallet(f.eve)).account.balance,20);assert.equal((await f.wallet(f.eve)).character.id,f.characters[0]);
  });
  test(`${prefix} : hors combat bloque le payeur sauf permission, réception passive autorisée`,async()=>{
    const f=await fixture();await f.damage(f.bob);await f.pay(await f.prepare({amount:1}));await f.damage();assert.equal((await f.wallet()).canPay,false);await assert.rejects(f.prepare({amount:1}),{code:'OUT_OF_COMBAT'});
    const s=await f.session();await f.cmd('saveSessionHealth',f.owner,{sessionId:f.sessionId,revision:s.revision,rules:{...s.healthRules,allowed:{...s.healthRules.allowed,pay:true}},reason:'Autoriser les paiements'});assert.equal((await f.wallet()).canPay,true);await f.pay(await f.prepare({amount:1}));assert.equal((await f.wallet(f.bob)).account.balance,2);
  });
  test(`${prefix} : pause, fin, module désactivé et archive contrôlent lecture et paiement`,async()=>{
    const f=await fixture(),p=await f.prepare(),requestId=randomUUID(),r=await f.pay(p,f.alice,{requestId});await f.stage('PAUSE');assert.equal((await f.wallet()).canPay,false);assert.deepEqual(await f.pay(p,f.alice,{requestId}),r);await assert.rejects(f.prepare({amount:1}),{code:'SESSION_NOT_RUNNING'});
    await f.rules({enabled:false});await assert.rejects(f.pay(p,f.alice,{requestId}),{code:'ECONOMY_DISABLED'});await f.rules({});await f.stage('FINISHED');assert.equal((await f.wallet()).account.balance,20);await assert.rejects(f.prepare({amount:1}),{code:'SESSION_NOT_RUNNING'});await f.stage('ARCHIVED');await assert.rejects(f.wallet(),{code:'FORBIDDEN'});await assert.rejects(f.prepareAdjustment(),{code:'SESSION_CLOSED'});
  });
  test(`${prefix} : correction MJ confirmée avec motif privé et conservation des autres données`,async()=>{
    const f=await fixture(),before=await f.session(),p=await f.prepareAdjustment();assert.equal((await f.wallet()).account.balance,100);const requestId=randomUUID(),r=await f.adjust(p,f.owner,{requestId});assert.deepEqual(await f.adjust(p,f.owner,{requestId}),r);
    await f.adjust(await f.prepareAdjustment({amount:30,mode:'DEBIT'}));assert.equal((await f.wallet()).account.balance,80);assert.equal(JSON.stringify(await f.wallet()).includes('MOTIF_PRIVE_MJ'),false);
    const h=await f.read('walletHistory',f.owner,{sessionId:f.sessionId,characterId:f.characters[0]});assert.equal(h.events.find(e=>e.id===r.id).reason,'MOTIF_PRIVE_MJ');assert.deepEqual((await f.session()).characters,before.characters);assert.deepEqual((await f.session()).inventory,before.inventory);
    const e=(await f.ledger()).filter(e=>e.kind==='GM_ADJUSTMENT');assert.equal(e.reduce((n,e)=>n+e.createdCurrency-e.removedCurrency,0),-20);
  });
  test(`${prefix} : correction périmée après paiement et corrections concurrentes sans écrasement`,async()=>{
    const f=await fixture(),p=await f.prepareAdjustment();await f.pay(await f.prepare());await assert.rejects(f.adjust(p),{code:'STALE_REVISION'});assert.equal((await f.wallet()).account.balance,20);
    const q=await f.prepareAdjustment(),r=await Promise.allSettled([f.adjust(q),f.adjust(q)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');assert.equal((await f.wallet()).account.balance,30);
  });
  test(`${prefix} : entiers stricts, fonds insuffisants et dépassement numérique refusés`,async()=>{
    const f=await fixture();for(const amount of [0,-1,1.5,'1',NaN,Infinity,Number.MAX_SAFE_INTEGER+1])await assert.rejects(f.prepare({amount}),{code:'INVALID_AMOUNT'});await assert.rejects(f.prepare({amount:101}),{code:'INSUFFICIENT_FUNDS'});await assert.rejects(f.prepare({memo:' '}),{code:'INVALID_ECONOMY'});
    await f.injectAccount(f.characters[1],{balance:Number.MAX_SAFE_INTEGER});await assert.rejects(f.prepare({amount:1}),{code:'BALANCE_OVERFLOW'});await assert.rejects(f.prepareAdjustment({characterId:f.characters[1],amount:1}),{code:'BALANCE_OVERFLOW'});assert.equal((await f.wallet()).account.balance,100);
  });
  test(`${prefix} : réservations respectées par paiement et retrait MJ`,async()=>{
    const f=await fixture();await f.injectAccount(f.characters[0],{reserved:30});assert.equal((await f.wallet()).account.available,70);await assert.rejects(f.prepare(),{code:'INSUFFICIENT_FUNDS'});await assert.rejects(f.prepareAdjustment({mode:'DEBIT',amount:80}),{code:'INSUFFICIENT_FUNDS'});await f.pay(await f.prepare({amount:70}));assert.deepEqual((await f.wallet()).account,{id:accountId(f.characters[0]),balance:30,reserved:30,available:0,revision:2});
  });
  test(`${prefix} : échec avant commit ne laisse ni débit ni crédit ni écriture partielle`,async()=>{
    const f=await fixture(),p=await f.prepare(),run=f.store.runTransaction.bind(f.store);let abort=true;f.store.runTransaction=cb=>run(async tx=>{const r=await cb(tx);if(abort){abort=false;throw new Error('Panne synthétique avant commit');}return r;});
    await assert.rejects(f.pay(p),/Panne synthétique/);assert.equal((await f.wallet()).account.balance,100);assert.equal((await f.wallet(f.bob)).account.balance,0);assert.equal((await f.ledger()).length,3);assert.equal((await f.wallet()).entries.length,1);await f.pay(p);assert.equal((await f.wallet()).account.balance,20);
  });
  test(`${prefix} : Accueil, joueur, aperçu et badge ne donnent pas accès aux comptes d’autrui`,async()=>{
    const f=await fixture();await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Test'});const s=await f.read('session',f.staff,{sessionId:f.sessionId});assert.equal('accounts' in s,false);assert.equal('economyRules' in s,false);
    for(const who of [f.alice,f.staff])for(const action of ['saveSessionEconomy','prepareCreditAdjustment','applyCreditAdjustment','walletHistory','previewWallet'])await assert.rejects(f.cmd(action,who,{sessionId:f.sessionId,characterId:f.characters[0]}),{code:'FORBIDDEN'});
    const p=await f.read('previewWallet',f.owner,{sessionId:f.sessionId,characterId:f.characters[0]});assert.equal(p.canPay,false);assert.deepEqual(p.entries,(await f.wallet()).entries);assert.equal(JSON.stringify(await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[0]})).includes('balance'),false);
    for(const action of ['myWallet','previewWallet','preparePayment','payCredits','saveScenarioEconomy','saveSessionEconomy','prepareStartingCredits','setStartingCredits','prepareCreditAdjustment','applyCreditAdjustment','walletHistory'])await assert.rejects(f.cmd(action,null,{}),{code:'LOGIN_REQUIRED'});
  });
  test(`${prefix} : délégation MJ révoquée avant réessai et paiements sans mouvement d’objet`,async()=>{
    const f=await fixture();await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:true,reason:'Délégation'});const p=await f.prepareAdjustment({},f.staff),requestId=randomUUID();await f.adjust(p,f.staff,{requestId});await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:false,reason:'Fin'});await assert.rejects(f.adjust(p,f.staff,{requestId}),{code:'FORBIDDEN'});
    const before=(await f.session()).inventory;await f.pay(await f.prepare({itemId:'forged',quantity:8}));assert.deepEqual((await f.session()).inventory,before);
  });
}
