import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {circuitsFixture} from './item-circuits-suite.mjs';
export async function localFixture(makeStore,options={}){
 const f=await circuitsFixture(makeStore,options),admin=(action,input={})=>f.cmd(action,input,f.owner),terminal={id:'desk',name:'Comptoir',placeId:'scene',portId:null,active:true,durationSeconds:60,operations:['shop','prepareShopPurchase','buyShopOffer'].map(action=>({action,resourceId:'counter',characterIds:[],skillId:null,minLevel:0}))};
 const save=(t=terminal,revision=0)=>admin('saveLocalTerminal',{terminal:t,revision});
 await save();const scan=(who=f.player,id='desk',requestId=randomUUID())=>f.cmd('scanLocalTerminal',{terminalId:id,requestId},who);
 return {...f,admin,terminal,save,scan,wallet:async()=>(await f.read('myWallet')).account};
}
export function contextualAccessSuite(makeStore,prefix='Accès contextuels'){
 test(`${prefix} ACT-01/17 : scan explicite et refus API direct dans la transaction native`,async()=>{
  const f=await localFixture(makeStore),before=await f.remaining();await assert.rejects(f.read('prepareShopPurchase',f.purchaseInput({useProtected:false})),{code:'LOCAL_SCAN_REQUIRED'});assert.deepEqual(await f.remaining(),before);
  const p=await f.scan();assert.equal(p.terminal.id,'desk');assert.doesNotMatch(JSON.stringify(p),/actorUid|characterVersion|codeHash|assignedUid/);await f.buy(1);assert.equal((await f.remaining()).quantity,7);
  await assert.rejects(f.read('localAccessAdmin',{},f.player),{code:'FORBIDDEN'});
 });
 test(`${prefix} ACT-02 : expiration, fermeture et révocation avant confirmation et réessai`,async()=>{
  const f=await localFixture(makeStore);await f.scan();const input=f.purchaseInput({useProtected:false}),q=await f.read('prepareShopPurchase',input),pay={...input,quoteAt:q.quoteAt,confirmation:q.confirmation,requestId:randomUUID()};
  await f.admin('revokeLocalPresence',{characterId:f.cid});await assert.rejects(f.cmd('buyShopOffer',pay),{code:'LOCAL_SCAN_REQUIRED'});assert.equal((await f.remaining()).quantity,8);
  await f.scan();f.advance(61000);await assert.rejects(f.read('prepareShopPurchase',input),{code:'LOCAL_SCAN_REQUIRED'});
  await f.scan();await f.save({...f.terminal,active:false},1);await assert.rejects(f.read('prepareShopPurchase',input),{code:'LOCAL_TERMINAL_CLOSED'});
 });
 test(`${prefix} ACT-06 : politique nominative et compétence ne remplacent aucun mandat`,async()=>{
  const f=await localFixture(makeStore);await f.save({...f.terminal,operations:f.terminal.operations.map(o=>({...o,characterIds:[f.otherId]}))},1);await f.scan();await assert.rejects(f.read('prepareShopPurchase',f.purchaseInput({useProtected:false})),{code:'FORBIDDEN'});
  await f.save({...f.terminal,operations:f.terminal.operations.map(o=>({...o,skillId:'INF-01',minLevel:5}))},2);await f.scan();await assert.rejects(f.read('prepareShopPurchase',f.purchaseInput({useProtected:false})),{code:'LOCAL_SKILL_REQUIRED'});
 });
 test(`${prefix} : liaison unique, révision périmée et nouveau scan remplace l’ancien`,async()=>{
  const f=await localFixture(makeStore);await assert.rejects(f.save({...f.terminal,id:'other'}),{code:'LOCAL_BINDING_CONFLICT'});await assert.rejects(f.save(),{code:'STALE_REVISION'});
  const same={requestId:randomUUID(),terminalId:'desk'};assert.deepEqual(await f.cmd('scanLocalTerminal',same),await f.cmd('scanLocalTerminal',same));
  await f.save(f.terminal,1);await assert.rejects(f.cmd('scanLocalTerminal',same),{code:'LOCAL_SCAN_REQUIRED'});
  await assert.rejects(f.read('localTerminal',{terminalId:'desk'},f.other).then(d=>{assert.equal(d.operations.some(o=>o.allowed),false);throw Object.assign(Error(),{code:'OK'});}),{code:'OK'});
 });
}

export function contextualCredentialsSuite(makeStore,prefix='Autorisations locales'){
 const grant=(f,credential,revision=0)=>f.admin('saveLocalCredential',{terminalId:'desk',credential,revision});
 const policy=async(f,ids,mode='ALL',extra={})=>f.save({...f.terminal,operations:f.terminal.operations.map(o=>({...o,credentialIds:ids,credentialMode:mode,...extra}))},(await f.read('localAccessAdmin',{},f.owner)).terminals[0].revision);
 const allowed=async(f,who=f.player)=>(await f.read('localTerminal',{terminalId:'desk'},who)).operations.every(o=>o.allowed);
 const unlock=(f,who=f.player,code='port-secret')=>f.cmd('unlockLocalCode',{terminalId:'desk',code},who);
 test(`${prefix} ACT-04/06 : code partageable, portée et compétence indépendante`,async()=>{
  const f=await localFixture(makeStore);await grant(f,{id:'code',kind:'CODE',name:'Code local',active:true,code:'port-secret'});await policy(f,['code']);await f.scan();await f.scan(f.other);
  assert.equal(await allowed(f),false);await assert.rejects(unlock(f,f.player,'incorrect'),{code:'LOCAL_CREDENTIAL_REQUIRED'});await unlock(f);await unlock(f,f.other);assert.equal(await allowed(f),true);assert.equal(await allowed(f,f.other),true);
  const d=await f.read('localAccessAdmin',{},f.owner);assert.doesNotMatch(JSON.stringify(d),/port-secret|codeDigest/);assert.doesNotMatch(JSON.stringify(await f.read('localTerminal',{terminalId:'desk'})),/Code local|codeDigest/);
  await policy(f,['code'],'ALL',{skillId:'INF-01',minLevel:5});await f.scan();await unlock(f);assert.equal(await allowed(f),false);
 });
 test(`${prefix} : licence nominative et combinaisons ET/OU explicites`,async()=>{
  const f=await localFixture(makeStore);await grant(f,{id:'license',kind:'LICENSE',name:'Licence personnelle',active:true,characterId:f.cid});await grant(f,{id:'code',kind:'CODE',name:'Code',active:true,code:'port-secret'});
  await policy(f,['license','code'],'ANY');await f.scan();await f.scan(f.other);assert.equal(await allowed(f),true);assert.equal(await allowed(f,f.other),false);await unlock(f,f.other);assert.equal(await allowed(f,f.other),true);
  await policy(f,['license','code'],'ALL');await f.scan();await f.scan(f.other);await unlock(f);await unlock(f,f.other);assert.equal(await allowed(f),true);assert.equal(await allowed(f,f.other),false);
 });
 test(`${prefix} ACT-05 : clé unique suit le don et la réception natifs sans dupliquer l’actif`,async()=>{
  const f=await localFixture(makeStore,{classId:'COM',kind:'INDIVIDUAL',consumable:false});await f.scan();const lot=await f.acquire(1);await grant(f,{id:'key',kind:'KEY',name:'Clé individuelle',active:true,lotId:lot.id});await policy(f,['key']);await f.scan();await f.scan(f.other);assert.equal(await allowed(f),true);assert.equal(await allowed(f,f.other),false);
  const input={lotId:lot.id,recipientId:f.otherId,quantity:1},p=await f.read('prepareLotTransfer',input),proposal=await f.cmd('proposeLotTransfer',{...input,confirmation:p.confirmation}),q=await f.read('lotTransferDetail',{transferId:proposal.id},f.other);await f.cmd('acceptLotTransfer',{transferId:proposal.id,confirmation:q.confirmation,received:true},f.other);
  assert.equal(await allowed(f),false);assert.equal(await allowed(f,f.other),true);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).quantity,1);
 });
 test(`${prefix} : révocation de code et de licence contrôle les droits actuels`,async()=>{
  const f=await localFixture(makeStore),g={id:'code',kind:'CODE',name:'Code',active:true,code:'port-secret'};await grant(f,g);await policy(f,['code']);await f.scan();await unlock(f);assert.equal(await allowed(f),true);
  await grant(f,{...g,code:'',active:false},1);assert.equal(await allowed(f),false);await assert.rejects(f.read('prepareShopPurchase',f.purchaseInput({useProtected:false})),{code:'LOCAL_CREDENTIAL_REQUIRED'});
  const input={terminalId:'desk',credential:{...g,code:'new-code'},revision:2,requestId:randomUUID()};const r=await f.cmd('saveLocalCredential',input,f.owner);assert.deepEqual(await f.cmd('saveLocalCredential',input,f.owner),r);assert.equal(r.revision,3);await assert.rejects(unlock(f),{code:'LOCAL_CREDENTIAL_REQUIRED'});await unlock(f,f.player,'new-code');assert.equal(await allowed(f),true);
 });
 test(`${prefix} : simulateur natif sans écritures, présence créée ni achat`,async()=>{
  const f=await localFixture(makeStore),before=await f.wallet(),stock=await f.remaining(),input={terminalId:'desk',characterId:f.cid,operation:'prepareShopPurchase',resourceId:'counter',offerId:'supply',quantity:1,useProtected:false,assumePresent:true};
  assert.deepEqual(await f.read('simulateLocalAccess',input,f.owner),{localAllowed:true,nativeAllowed:true,amount:30});assert.deepEqual(await f.wallet(),before);assert.deepEqual(await f.remaining(),stock);assert.equal(await f.store.get(`localAccess/${f.sid}/presence/${f.cid}`),null);
  assert.equal((await f.read('simulateLocalAccess',{...input,assumePresent:false},f.owner)).reason,'LOCAL_SCAN_REQUIRED');await assert.rejects(f.read('simulateLocalAccess',input,f.player),{code:'FORBIDDEN'});
  await grant(f,{id:'code',kind:'CODE',name:'Code',active:true,code:'port-secret'});await policy(f,['code']);assert.equal((await f.read('simulateLocalAccess',{...input,code:'port-secret'},f.owner)).nativeAllowed,true);assert.equal(await f.store.get(`localAccess/${f.sid}/presence/${f.cid}`),null);
 });
 test(`${prefix} : révocation idempotente ne révoque pas une nouvelle présence`,async()=>{
  const f=await localFixture(makeStore);await f.scan();const input={characterId:f.cid,requestId:randomUUID()};await f.cmd('revokeLocalPresence',input,f.owner);await f.scan();await f.cmd('revokeLocalPresence',input,f.owner);assert.equal(await allowed(f),true);
  await assert.rejects(f.admin('saveLocalCredential',{terminalId:'desk',credential:{id:'bad',name:'Clé',kind:'KEY',active:true,lotId:'absent'},revision:0}),{code:'LOCAL_KEY_REQUIRED'});
 });
 test(`${prefix} : code d’un autre terminal et références étrangères refusés`,async()=>{
  const f=await localFixture(makeStore);await grant(f,{id:'code',kind:'CODE',name:'Code du comptoir',active:true,code:'port-secret'});
  await f.store.runTransaction(async tx=>{const shop=await tx.get(`sessions/${f.sid}/shops/counter`);tx.set(`sessions/${f.sid}/shops/second`,{...shop,id:'second'});});
  const terminal={...f.terminal,id:'second',operations:f.terminal.operations.map(o=>({...o,resourceId:'second'}))};await f.save(terminal,0);await f.scan(f.player,'second');
  await assert.rejects(f.cmd('unlockLocalCode',{terminalId:'second',code:'port-secret'}),{code:'LOCAL_CREDENTIAL_REQUIRED'});
  await assert.rejects(f.save({...terminal,operations:terminal.operations.map(o=>({...o,credentialIds:['code'],credentialMode:'ANY'}))},1),{code:'INVALID_LOCAL_CREDENTIAL'});
 });
 test(`${prefix} : accueil exclu, MJ révoqué avant reçu et interruption atomique`,async()=>{
  const f=await localFixture(makeStore),role=async(role,active=true)=>f.cmd('setStaff',{email:f.mj.email,role,active,revision:(await f.read('session',{},f.owner)).revision,reason:'Test des habilitations'},f.owner);
  await role('RECEPTION');await assert.rejects(f.read('localAccessAdmin',{},f.mj),{code:'FORBIDDEN'});await role('MJ');
  const input={terminalId:'desk',revision:0,requestId:randomUUID(),credential:{id:'license',kind:'LICENSE',name:'Licence',active:true,characterId:f.cid}},run=f.store.runTransaction.bind(f.store);
  f.store.runTransaction=cb=>run(async tx=>{await cb(tx);throw Error('INTERRUPTION');});await assert.rejects(f.cmd('saveLocalCredential',input,f.mj),/INTERRUPTION/);f.store.runTransaction=run;
  assert.equal(await f.store.get(`localAccess/${f.sid}/credentials/license`),null);await f.cmd('saveLocalCredential',input,f.mj);await role('MJ',false);await assert.rejects(f.cmd('saveLocalCredential',input,f.mj),{code:'FORBIDDEN'});
 });

}
