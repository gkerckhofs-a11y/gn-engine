import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {circuitsFixture} from './item-circuits-suite.mjs';
export async function localFixture(makeStore){
 const f=await circuitsFixture(makeStore),admin=(action,input={})=>f.cmd(action,input,f.owner),terminal={id:'desk',name:'Comptoir',placeId:'scene',portId:null,active:true,durationSeconds:60,operations:['shop','prepareShopPurchase','buyShopOffer'].map(action=>({action,resourceId:'counter',characterIds:[],skillId:null,minLevel:0}))};
 const save=(t=terminal,revision=0)=>admin('saveLocalTerminal',{terminal:t,revision});
 await save();const scan=(who=f.player,id='desk',requestId=randomUUID())=>f.cmd('scanLocalTerminal',{terminalId:id,requestId},who);
 return {...f,admin,terminal,save,scan};
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
