import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {inventoryFixture} from './inventory-suite.mjs';
export function transfersSuite(makeStore,prefix='Remises'){
  async function fixture(quantity=3){
    const f=await inventoryFixture(makeStore,quantity);
    const prepare=async(patch={},who=f.alice)=>{const input={sessionId:f.sessionId,lotId:(await f.lot()).id,recipientId:f.characters[1],quantity:1,...patch};return {input,result:await f.read('prepareLotTransfer',who,input)};};
    const propose=(p,who=f.alice,patch={})=>f.cmd('proposeLotTransfer',who,{...p.input,confirmation:p.result.confirmation,...patch});
    const detail=(id,who=f.bob)=>f.read('lotTransferDetail',who,{sessionId:f.sessionId,transferId:id});
    const act=async(action,id,who=f.bob,patch={})=>{const d=await detail(id,who);return f.cmd(action,who,{sessionId:f.sessionId,transferId:id,confirmation:d.confirmation,received:true,...patch});};
    const total=async()=>{const s=await f.session();return s.inventory.filter(l=>l.item.id===f.items[0]).reduce((n,l)=>n+l.quantity,0);};
    return {...f,prepareTransfer:prepare,propose,detail,act,total};
  }
  test(`${prefix} : proposition explicite sans retrait, projection privée et idempotence`,async()=>{
    const f=await fixture(),p=await f.prepareTransfer();assert.equal(p.result.before,3);assert.equal(p.result.remaining,2);assert.equal((await f.bag()).transfers.length,0);
    const requestId=randomUUID(),r=await f.propose(p,f.alice,{requestId});assert.deepEqual(await f.propose(p,f.alice,{requestId}),r);
    assert.equal((await f.lot()).quantity,3);assert.equal((await f.bag(f.bob)).lots.length,0);assert.equal((await f.bag()).transfers.length,1);
    const d=await f.detail(r.id);assert.equal(d.direction,'IN');assert.equal(d.quantity,1);assert.equal(d.canAccept,true);
    for(const hidden of ['ORIGINE_SECRETE_MJ','assignedUid','sourceVersion','recipientVersion','before','remaining','origin'])assert.equal(JSON.stringify(d).includes(hidden),false,hidden);
    assert.equal((await f.bag(f.eve)).transfers.length,0);await assert.rejects(f.detail(r.id,f.eve),{code:'FORBIDDEN'});
  });
  test(`${prefix} : remise partielle conserve les quantités et la provenance, sans fusion`,async()=>{
    const f=await fixture(),before=await f.total(),source=await f.lot(),{id}=await f.propose(await f.prepareTransfer({quantity:2}));
    await f.grant(f.characters[1],f.items[0],4);const r=await f.act('acceptLotTransfer',id),b=await f.bag(f.bob),received=b.lots.find(l=>l.id===r.receivedLotId);
    assert.equal((await f.lot()).quantity,1);assert.equal(received.quantity,2);assert.equal(b.lots.length,2);assert.equal(received.ownerId,f.characters[1]);assert.equal(received.holderId,f.characters[1]);assert.deepEqual(received.location,{kind:'CHARACTER',id:f.characters[1]});assert.equal(await f.total(),before+4);
    const s=await f.session(),raw=s.inventory.find(l=>l.id===received.id);assert.equal(raw.origin.parentLotId,source.id);assert.equal(raw.origin.rootLotId,source.id);assert.equal(raw.origin.transferId,id);assert.deepEqual(received.item,source.item);
    const h=await f.read('itemHistory',f.owner,{sessionId:f.sessionId,kind:'inventory',id:source.id});assert.ok(h.events.some(e=>e.transferId===id&&e.before.quantity===3&&e.after.quantity===1));
  });
  test(`${prefix} : remise complète déplace le même exemplaire, sans copier ni rouvrir le lot`,async()=>{
    const f=await fixture(),individual=(await f.bag()).lots.find(l=>l.item.kind==='INDIVIDUAL'),{id}=await f.propose(await f.prepareTransfer({lotId:individual.id}));
    const r=await f.act('acceptLotTransfer',id);assert.equal(r.receivedLotId,individual.id);assert.equal((await f.bag()).lots.some(l=>l.id===individual.id),false);assert.equal((await f.bag(f.bob)).lots[0].id,individual.id);
    assert.equal((await f.session()).inventory.filter(l=>l.id===individual.id).length,1);
    await assert.rejects(f.prepareTransfer({lotId:individual.id}),{code:'FORBIDDEN'});
    const h=await f.read('itemHistory',f.owner,{sessionId:f.sessionId,kind:'inventory',id:individual.id});assert.ok(h.events.some(e=>e.before?.ownerId===f.characters[0]&&e.after.ownerId===f.characters[1]));
  });
  test(`${prefix} : même acceptation renvoyée après transfert ultérieur, aucune double remise`,async()=>{
    const f=await fixture(1),{id}=await f.propose(await f.prepareTransfer()),d=await f.detail(id),input={sessionId:f.sessionId,transferId:id,confirmation:d.confirmation,received:true,requestId:randomUUID()};
    const r=await f.cmd('acceptLotTransfer',f.bob,input);assert.deepEqual(await f.cmd('acceptLotTransfer',f.bob,input),r);
    const nextInput={sessionId:f.sessionId,lotId:r.receivedLotId,recipientId:f.characters[2],quantity:1},p=await f.read('prepareLotTransfer',f.bob,nextInput),n=await f.cmd('proposeLotTransfer',f.bob,{...nextInput,confirmation:p.confirmation});await f.act('acceptLotTransfer',n.id,f.eve);
    assert.deepEqual(await f.cmd('acceptLotTransfer',f.bob,input),r);assert.equal((await f.bag(f.bob)).lots.length,0);assert.equal(await f.total(),2);
    await assert.rejects(f.cmd('acceptLotTransfer',f.bob,{...input,quantity:999}),{code:'REQUEST_ID_REUSED'});
  });
  test(`${prefix} : deux destinataires concurrents ne reçoivent pas le même dernier objet`,async()=>{
    const f=await fixture(1),a=await f.propose(await f.prepareTransfer()),b=await f.propose(await f.prepareTransfer({recipientId:f.characters[2]}));
    const rs=await Promise.allSettled([f.act('acceptLotTransfer',a.id),f.act('acceptLotTransfer',b.id,f.eve)]);
    assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);assert.equal(rs.find(x=>x.status==='rejected').reason.code,'STALE_TRANSFER');assert.equal(await f.total(),2);
  });
  test(`${prefix} : consommation médicale et remise concurrentes ne dupliquent pas le stock`,async()=>{
    const f=await fixture(1);await f.damage();const treatment=await f.prepare(),{id}=await f.propose(await f.prepareTransfer());
    const rs=await Promise.allSettled([f.treat(treatment),f.act('acceptLotTransfer',id)]);assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);
    const healed=(await f.health(f.bob)).health.hp===7,bag=await f.bag(f.bob);assert.equal(bag.lots.length,healed?0:1);assert.equal(await f.total(),healed?1:2);
  });
  test(`${prefix} : stock modifié, saisi ou corrigé invalide la proposition sans débit`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareTransfer());await f.correct((await f.lot()).id,{status:'SEIZED'});
    assert.equal((await f.detail(id)).status,'STALE');await assert.rejects(f.act('acceptLotTransfer',id),{code:'STALE_TRANSFER'});
    await f.correct((await f.lot()).id,{status:'AVAILABLE'});await assert.rejects(f.act('acceptLotTransfer',id),{code:'STALE_TRANSFER'});assert.equal((await f.lot()).quantity,3);
    assert.equal((await f.act('cancelLotTransfer',id,f.alice)).status,'CANCELLED');assert.equal((await f.bag(f.bob)).lots.length,0);
  });
  test(`${prefix} : refus et annulation possibles pendant une pause, sans coût`,async()=>{
    const f=await fixture(),a=await f.propose(await f.prepareTransfer()),b=await f.propose(await f.prepareTransfer());await f.stage('PAUSE');
    await assert.rejects(f.act('acceptLotTransfer',a.id),{code:'SESSION_NOT_RUNNING'});assert.equal((await f.bag()).canTransfer,false);
    assert.equal((await f.act('declineLotTransfer',a.id)).status,'DECLINED');assert.equal((await f.act('cancelLotTransfer',b.id,f.alice)).status,'CANCELLED');assert.equal((await f.lot()).quantity,3);
    await f.stage('EN_JEU');await assert.rejects(f.act('acceptLotTransfer',a.id),{code:'TRANSFER_CLOSED'});await assert.rejects(f.act('acceptLotTransfer',b.id),{code:'TRANSFER_CLOSED'});
  });
  test(`${prefix} : acceptation et annulation concurrentes ont une seule issue`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareTransfer());const rs=await Promise.allSettled([f.act('acceptLotTransfer',id),f.act('cancelLotTransfer',id,f.alice)]);
    assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);assert.equal(rs.find(x=>x.status==='rejected').reason.code,'TRANSFER_CLOSED');const d=await f.detail(id);assert.equal((await f.bag(f.bob)).lots.length,d.status==='ACCEPTED'?1:0);assert.equal(await f.total(),6);
  });
  test(`${prefix} : destinataire et consentement imposés par le serveur, aucun accès Accueil ou badge`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareTransfer());await assert.rejects(f.act('acceptLotTransfer',id,f.alice),{code:'FORBIDDEN'});await assert.rejects(f.act('cancelLotTransfer',id),{code:'FORBIDDEN'});
    await assert.rejects(f.act('acceptLotTransfer',id,f.bob,{received:false}),{code:'HANDOVER_REQUIRED'});await assert.rejects(f.act('acceptLotTransfer',id,f.bob,{confirmation:'forged'}),{code:'STALE_TRANSFER'});
    await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Test'});await assert.rejects(f.detail(id,f.staff),{code:'FORBIDDEN'});
    const pub=await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[1]});assert.equal(JSON.stringify(pub).includes('Injecteur'),false);
    const r=await f.act('acceptLotTransfer',id,f.bob,{quantity:999,recipientId:f.characters[2],ownerId:f.characters[2]});assert.equal((await f.bag(f.bob)).lots.find(l=>l.id===r.receivedLotId).quantity,1);
  });
  test(`${prefix} : révocation prioritaire au résultat mémorisé et retour d’accès ne ressuscitant pas une proposition`,async()=>{
    const f=await fixture(),p=await f.prepareTransfer(),requestId=randomUUID(),{id}=await f.propose(p,f.alice,{requestId});
    await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.alice.uid});await assert.rejects(f.propose(p,f.alice,{requestId}),{code:'FORBIDDEN'});await assert.rejects(f.act('acceptLotTransfer',id),{code:'STALE_TRANSFER'});
    f.alice.authTime=1000;await f.activate(f.alice);await assert.rejects(f.propose(p,f.alice,{requestId}),{code:'FORBIDDEN'});assert.equal((await f.detail(id)).status,'STALE');assert.equal(await f.total(),6);
  });
  test(`${prefix} : réattribution du destinataire ne transmet pas son ancien consentement`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareTransfer());await f.cmd('assign',f.owner,{sessionId:f.sessionId,uid:f.eve.uid,characterId:f.characters[1],replace:true});await f.activate(f.eve);
    await assert.rejects(f.detail(id),{code:'FORBIDDEN'});const d=await f.detail(id,f.eve);assert.equal(d.status,'STALE');assert.equal(d.canAccept,false);assert.equal(d.canClose,false);await assert.rejects(f.act('acceptLotTransfer',id,f.eve),{code:'STALE_TRANSFER'});assert.equal((await f.lot()).quantity,3);
  });
  test(`${prefix} : cible changée après préparation et quantité invalide refusées sans proposition`,async()=>{
    const f=await fixture(),p=await f.prepareTransfer();await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.bob.uid});await assert.rejects(f.propose(p),{code:'INVALID_RECIPIENT'});
    for(const quantity of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1])await assert.rejects(f.prepareTransfer({recipientId:f.characters[2],quantity}),{code:'INVALID_QUANTITY'});
    await assert.rejects(f.prepareTransfer({recipientId:f.characters[0]}),{code:'INVALID_RECIPIENT'});await assert.rejects(f.prepareTransfer({recipientId:randomUUID()}),{code:'INVALID_RECIPIENT'});
    await assert.rejects(f.prepareTransfer({recipientId:f.characters[2],quantity:4}),{code:'INSUFFICIENT_STOCK'});assert.equal((await f.bag()).transfers.length,0);
  });
  test(`${prefix} : hors combat bloqué par défaut et autorisation configurable pour les deux parties`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareTransfer());await f.damage(f.alice,10);await assert.rejects(f.prepareTransfer(),{code:'OUT_OF_COMBAT'});await assert.rejects(f.act('acceptLotTransfer',id),{code:'OUT_OF_COMBAT'});
    const s=await f.session();await f.cmd('saveSessionHealth',f.owner,{sessionId:f.sessionId,revision:s.revision,rules:{...s.healthRules,allowed:{...s.healthRules.allowed,transfer:true}},reason:'Remises autorisées'});
    await f.damage(f.bob,10);assert.equal((await f.act('acceptLotTransfer',id)).status,'ACCEPTED');assert.equal((await f.health()).health.hp,0);assert.equal((await f.health(f.bob)).health.hp,0);
  });
  test(`${prefix} : panne avant commit ne laisse ni fractionnement ni historique partiel`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareTransfer()),d=await f.detail(id),input={sessionId:f.sessionId,transferId:id,confirmation:d.confirmation,received:true,requestId:randomUUID()},run=f.store.runTransaction.bind(f.store);let abort=true;
    f.store.runTransaction=cb=>run(async tx=>{const r=await cb(tx);if(abort){abort=false;throw new Error('Panne synthétique remise');}return r;});await assert.rejects(f.cmd('acceptLotTransfer',f.bob,input),/Panne synthétique/);
    assert.equal((await f.lot()).quantity,3);assert.equal((await f.bag(f.bob)).lots.length,0);assert.equal((await f.detail(id)).status,'PENDING');const h=await f.read('itemHistory',f.owner,{sessionId:f.sessionId,kind:'inventory',id:(await f.lot()).id});assert.equal(h.events.length,1);
    await f.cmd('acceptLotTransfer',f.bob,input);assert.equal(await f.total(),6);assert.equal((await f.lot()).quantity,2);
  });
  test(`${prefix} : accès anonymes, session étrangère, fin de partie et aperçu sans action`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareTransfer());
    for(const a of ['prepareLotTransfer','proposeLotTransfer','lotTransferDetail','acceptLotTransfer','declineLotTransfer','cancelLotTransfer'])await assert.rejects(f.cmd(a,null,{sessionId:f.sessionId}),{code:'LOGIN_REQUIRED'});
    await assert.rejects(f.read('lotTransferDetail',f.bob,{sessionId:randomUUID(),transferId:id}),{code:'FORBIDDEN'});
    const preview=await f.read('previewInventory',f.owner,{sessionId:f.sessionId,characterId:f.characters[1]});assert.equal(preview.canTransfer,false);assert.equal(preview.transfers[0].canAccept,false);assert.equal(preview.transfers[0].canClose,false);
    await f.stage('PAUSE');await f.stage('FINISHED');await assert.rejects(f.prepareTransfer(),{code:'SESSION_NOT_RUNNING'});await assert.rejects(f.act('acceptLotTransfer',id),{code:'SESSION_NOT_RUNNING'});await f.act('declineLotTransfer',id);await f.stage('ARCHIVED');await assert.rejects(f.detail(id),{code:'FORBIDDEN'});
  });
}
