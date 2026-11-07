import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spaceGroupsFixture} from './space-groups-suite.mjs';
import {rosterMembership} from './group-management-suite.mjs';
import {accountId,groupAccountId} from '../../src/core/economy-state.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';

export async function spaceGroupWalletFixture(makeStore,{fund=true}={}){
 const f=await spaceGroupsFixture(makeStore);
 const groupId='treasury',walletId=groupAccountId(groupId),personalId=accountId(f.cid),walletPath=`accounts/${walletId}`;
 await f.config(groupId,{name:'Faction secrète'});
 const configureInput=async()=>({groupId,revision:(await f.get('')).revision,label:'Comptoir des Dunes',reason:'Ouvrir la caisse à zéro'});
 const configure=async(p=undefined)=>{
  p??=await configureInput();
  const {confirmation}=await f.read('prepareGroupWallet',p);
  return f.cmd('setGroupWallet',{...p,confirmation});
 };
 const grant=(cid,from,permissions)=>f.applyGroup(cid,from,groupId,{membership:rosterMembership(permissions)});
 const deposit={fromAccountId:personalId,toAccountId:walletId,amount:40,memo:'Alimentation de la caisse'};
 const spend={fromAccountId:walletId,recipientId:f.cid,amount:10,memo:'Paiement du comptoir'};
 const prepare=(input,actor)=>f.read('prepareAccountPayment',input,actor);
 const confirm=(input,quote,actor,requestId=randomUUID())=>f.cmd('payFromAccount',{...input,confirmation:quote.confirmation,requestId},actor);
 if(fund){
  await configure();
  await grant(f.cid,null,['readWallet']);
  await grant(f.otherId,null,['payWallet']);
  // Give the fixture ordinary credits. Creation credits stay protected.
  await f.edit(`accounts/${personalId}`,a=>({...a,balance:50}));
  await confirm(deposit,await prepare(deposit,f.player),f.player);
 }
 return {...f,groupId,walletId,walletPath,personalId,configureInput,configure,grant,deposit,spend,prepare,confirm};
}

export function spaceGroupWalletsSuite(makeStore,prefix='Caisses SO'){
 test(`${prefix} : création et mandat ne créditent rien, ouverture explicite à zéro`,async()=>{
  const f=await spaceGroupWalletFixture(makeStore,{fund:false}),before=await f.assets(),p=await f.configureInput();
  await f.grant(f.cid,null,['readWallet']);
  assert.deepEqual(await f.assets(),before);
  assert.equal((await f.read('myAccounts',{},f.player)).accounts.length,1);
  await assert.rejects(f.read('prepareGroupWallet',p,f.player),{code:'FORBIDDEN'});
  await assert.rejects(f.read('prepareGroupWallet',{...p,revision:(await f.get('')).revision,amount:1}),{code:'INVALID_AMOUNT'});
  const out=await f.configure();
  assert.equal(out.accountId,f.walletId);
  assert.equal((await f.get(f.walletPath)).balance,0);
  assert.equal((await f.read('myGroup',{groupId:f.groupId},f.player)).walletAccountId,f.walletId);
  const {entries}=await f.read('readAccount',{accountId:f.walletId},f.player);
  assert.deepEqual(entries.map(e=>[e.kind,e.delta]),[['OPENING',0]]);
  assert.deepEqual((await f.assets()).inventory,before.inventory);
 });
 test(`${prefix} : lire et payer séparés, paiement unique et libellé de couverture`,async()=>{
  const f=await spaceGroupWalletFixture(makeStore),reader=await f.read('readAccount',{accountId:f.walletId},f.player),payer=await f.read('readAccount',{accountId:f.walletId},f.other);
  assert.equal(reader.balances.balance,40);assert.equal(reader.canPay,false);
  assert.equal(payer.canPay,true);assert.equal(payer.balances,undefined);assert.equal(payer.entries,undefined);
  await assert.rejects(f.prepare(f.spend,f.player),{code:'FORBIDDEN'});
  const q=await f.prepare(f.spend,f.other),requestId=randomUUID();
  assert.equal(q.before,undefined);assert.equal(q.after,undefined);
  const result=await f.confirm(f.spend,q,f.other,requestId);
  assert.deepEqual(await f.confirm(f.spend,q,f.other,requestId),result);
  assert.equal(result.account,undefined);
  const entry=(await f.read('readAccount',{accountId:f.personalId},f.player)).entries.find(e=>e.id===result.id);
  assert.equal(entry.counterparty.name,'Comptoir des Dunes');
  assert.doesNotMatch(JSON.stringify(entry),/Faction secrète|assignedUid/);
  assert.equal((await f.get(f.walletPath)).balance,30);
  assert.equal((await f.get(`ledger/${result.id}`)).createdCurrency,0);
 });
 test(`${prefix} : transfert de membre révoque aperçu et reçu, soldes conservés`,async()=>{
  const f=await spaceGroupWalletFixture(makeStore),requestId=randomUUID(),q=await f.prepare(f.spend,f.other);
  await f.confirm(f.spend,q,f.other,requestId);
  const stale=await f.prepare(f.spend,f.other),wallet=await f.get(f.walletPath);
  await f.config('next',{kind:'FACTION'});
  await f.applyGroup(f.otherId,f.groupId,'next');
  await assert.rejects(f.confirm(f.spend,q,f.other,requestId),{code:'FORBIDDEN'});
  await assert.rejects(f.confirm(f.spend,stale,f.other),{code:'FORBIDDEN'});
  assert.equal((await f.read('myAccounts',{},f.other)).accounts.length,1);
  assert.deepEqual(await f.get(f.walletPath),wallet);
 });
 test(`${prefix} : STOP et dernier solde concurrent`,async()=>{
  const f=await spaceGroupWalletFixture(makeStore),input={...f.spend,amount:30},quote=await f.prepare(input,f.other);
  await f.cmd('stopSafety',{reason:'Test STOP'},f.player);
  assert.equal((await f.read('readAccount',{accountId:f.walletId},f.other)).canPay,false);
  await assert.rejects(f.confirm(input,quote,f.other),{code:'SO_SAFETY_STOP'});
  await assert.rejects(f.read('prepareGroupWallet',await f.configureInput()),{code:'SO_SAFETY_STOP'});
  await f.cmd('resumeSafety',{revision:(await f.get('')).revision,reason:'Reprise'});
  const fresh=await f.prepare(input,f.other),results=await Promise.allSettled([f.confirm(input,fresh,f.other),f.confirm(input,fresh,f.other)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await f.get(f.walletPath)).balance,10);
 });
 test(`${prefix} : décès, relève et épisode conservent la caisse sans héritage de droits`,async()=>{
  const f=await spaceGroupWalletFixture(makeStore),wallet=await f.get(f.walletPath);
  await f.death();
  await assert.rejects(f.read('readAccount',{accountId:f.walletId},f.player),{code:'FORBIDDEN'});
  await f.succeed(await f.previewSuccession());
  assert.equal((await f.read('myAccounts',{},f.player)).accounts.length,1);
  const e=await episodeHarness(f);await e.close();await e.resume(await e.begin());
  assert.deepEqual(await e.get(f.walletPath),{...wallet,sessionId:e.sid});
  assert.equal((await e.read('readAccount',{accountId:f.walletId},f.other)).account.canSpend,true);
  await assert.rejects(e.read('readAccount',{accountId:f.walletId},f.player),{code:'FORBIDDEN'});
 });
 test(`${prefix} : version précédente conserve les groupes sans ouvrir la caisse`,async()=>{
  const f=await spaceGroupWalletFixture(makeStore,{fund:false});
  await f.edit('',s=>{const {groupWalletVersion,...spaceOutlaws}=s.spaceOutlaws;return {...s,spaceOutlaws};});
  await assert.rejects(f.read('prepareGroupWallet',await f.configureInput()),{code:'SO_GAMEPLAY_NOT_OPEN'});
  await assert.rejects(f.grant(f.cid,null,['readWallet']),{code:'SO_GROUP_PERMISSION_NOT_OPEN'});
  assert.equal(!!await f.get(f.walletPath),false);
 });
}
