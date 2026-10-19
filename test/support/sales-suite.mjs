import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {inventoryFixture} from './inventory-suite.mjs';
import {accountId,groupAccountId} from '../../src/core/economy-state.mjs';
export function salesSuite(makeStore,prefix='Ventes'){
  async function fixture(quantity=3){
    const f=await inventoryFixture(makeStore,quantity),currency={enabled:true,name:'Monnaie fictive de test',unit:'crédit'};
    const rules=async patch=>f.cmd('saveSessionEconomy',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,rules:{...currency,...patch},reason:'Test'});await rules({});
    const adjust=async(patch={})=>{const input={sessionId:f.sessionId,revision:(await f.session()).revision,characterId:f.characters[1],amount:100,mode:'CREDIT',memo:'Dotation fictive',reason:'SECRET_FINANCE_MJ',...patch},p=await f.read('prepareCreditAdjustment',f.owner,input);return f.cmd('applyCreditAdjustment',f.owner,{...input,confirmation:p.confirmation});};
    await adjust();await adjust({characterId:f.characters[2]});
    const wallet=(who=f.bob)=>f.read('myWallet',who,{sessionId:f.sessionId});
    const prepare=async(patch={},who=f.alice)=>{const input={sessionId:f.sessionId,lotId:(await f.lot()).id,buyerId:f.characters[1],quantity:1,amount:40,minutes:60,pickupPlace:'Quai fictif',conditions:'Remise en main propre',...patch};return {input,result:await f.read('prepareLotSale',who,input)};};
    const propose=(p,who=f.alice,patch={})=>f.cmd('proposeLotSale',who,{...p.input,confirmation:p.result.confirmation,...patch});
    const detail=(id,who=f.bob)=>f.read('lotSaleDetail',who,{sessionId:f.sessionId,saleId:id});
    const purchase=async(id,who=f.bob,patch={})=>{const input={sessionId:f.sessionId,saleId:id,fromAccountId:accountId((await f.bag(who)).character.id),...patch};return {input,result:await f.read('prepareLotPurchase',who,input)};};
    const buy=(p,who=f.bob,patch={})=>f.cmd('buyLot',who,{...p.input,confirmation:p.result.confirmation,...patch});
    const act=async(action,id,who=f.bob,patch={})=>{const d=await detail(id,who);return f.cmd(action,who,{sessionId:f.sessionId,saleId:id,confirmation:action.includes('Pickup')?d.pickupConfirmation:d.confirmation,received:true,...patch});};
    const ledger=()=>f.store.list(`sessions/${f.sessionId}/ledger`);
    const total=async()=>(await f.session()).inventory.filter(l=>l.item.id===f.items[0]).reduce((n,l)=>n+l.quantity,0);
    const group=async(permissions={payWallet:true})=>{
      const member={characterId:f.characters[1],role:'Caissier',active:true,revealed:true,visibleToMembers:false,publicAffiliation:false,permissions};
      const {id}=await f.cmd('saveSessionGroup',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,name:'GROUPE_SECRET',visibility:'SECRET',publicationState:'PUBLISHED',members:[member],reason:'Test'});
      await f.cmd('setGroupModule',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,enabled:true,reason:'Test'});
      const input={sessionId:f.sessionId,groupId:id,revision:(await f.session()).revision,label:'Comptoir neutre',reason:'Test'},p=await f.read('prepareGroupWallet',f.owner,input);await f.cmd('setGroupWallet',f.owner,{...input,confirmation:p.confirmation});await adjust({groupId:id});
      return {id,accountId:groupAccountId(id),edit:async perms=>{const s=await f.session(),g=s.groups.find(g=>g.id===id);return f.cmd('saveSessionGroup',f.owner,{...g,sessionId:f.sessionId,groupId:id,revision:s.revision,members:[{...member,permissions:perms}],reason:'Droits modifiés'});}};
    };
    return {...f,rules,adjust,wallet,prepareSale:prepare,propose,detail,purchase,buy,act,ledger,total,group};
  }
  test(`${prefix} : proposition privée confirmée sans réserver fonds ou stock`,async()=>{
    const f=await fixture(),p=await f.prepareSale(),requestId=randomUUID(),r=await f.propose(p,f.alice,{requestId});assert.deepEqual(await f.propose(p,f.alice,{requestId}),r);
    const d=await f.detail(r.id);assert.equal(d.amount,40);assert.equal(d.canBuy,true);assert.equal((await f.lot()).quantity,3);assert.equal((await f.wallet()).account.reserved,0);assert.equal((await f.wallet()).account.balance,100);
    assert.equal((await f.bag(f.eve)).sales.length,0);for(const who of [f.eve,f.owner])await assert.rejects(f.detail(r.id,who),{code:'FORBIDDEN'});
    for(const hidden of ['SECRET_FINANCE_MJ','ORIGINE_SECRETE_MJ','sellerVersion','buyerVersion','assignedUid','origin','balance'])assert.equal(JSON.stringify(d).includes(hidden),false,hidden);
  });
  test(`${prefix} : achat partiel atomique, propriété distincte du détenteur et provenance conservée`,async()=>{
    const f=await fixture(),l=await f.lot(),{id}=await f.propose(await f.prepareSale({quantity:2})),p=await f.purchase(id);assert.equal(p.result.total,40);assert.equal(p.result.fees,0);assert.equal(p.result.before.balance,100);
    const r=await f.buy(p),s=await f.session(),acquired=s.inventory.find(l=>l.id===r.purchasedLotId);assert.equal(acquired.ownerId,f.characters[1]);assert.equal(acquired.holderId,f.characters[0]);assert.deepEqual(acquired.location,l.location);assert.equal(acquired.quantity,2);assert.equal(acquired.origin.parentLotId,l.id);assert.equal(acquired.origin.rootLotId,l.id);assert.equal(acquired.origin.saleId,id);
    assert.equal((await f.lot()).quantity,1);assert.equal(await f.total(),6);assert.equal((await f.bag()).heldForOthers[0].id,acquired.id);assert.equal((await f.bag(f.bob)).ownedElsewhere[0].id,acquired.id);assert.equal((await f.bag(f.bob)).lots.length,0);
    assert.equal((await f.wallet()).account.balance,60);assert.equal((await f.wallet(f.alice)).account.balance,40);const event=(await f.ledger()).find(e=>e.id===r.paymentId);assert.equal(event.entries.reduce((n,e)=>n+e.delta,0),0);assert.equal(event.saleId,id);assert.equal(event.createdCurrency,0);
    const receipt=(await f.wallet()).entries.find(e=>e.id===r.paymentId);assert.equal(receipt.saleId,id);assert.equal(receipt.counterparty.name,'Soignant');
  });
  test(`${prefix} : exemplaire entier conservé, prix forgé ignoré et achat rejoué une seule fois`,async()=>{
    const f=await fixture(),l=(await f.bag()).lots.find(l=>l.item.kind==='INDIVIDUAL'),{id}=await f.propose(await f.prepareSale({lotId:l.id})),p=await f.purchase(id),requestId=randomUUID();
    const r=await f.buy(p,f.bob,{requestId,amount:1,quantity:999,ownerId:f.characters[2]});assert.equal(r.purchasedLotId,l.id);assert.equal(r.amount,40);assert.deepEqual(await f.buy(p,f.bob,{requestId,amount:1,quantity:999,ownerId:f.characters[2]}),r);assert.equal((await f.wallet()).account.balance,60);
    await assert.rejects(f.buy(p,f.bob,{requestId,amount:2}),{code:'REQUEST_ID_REUSED'});await assert.rejects(f.buy(p),{code:'SALE_CLOSED'});assert.equal((await f.session()).inventory.filter(x=>x.id===l.id).length,1);
  });
  test(`${prefix} : retrait après accord du vendeur et réception physique sans second paiement`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareSale()),r=await f.buy(await f.purchase(id)),before=await f.ledger();
    await assert.rejects(f.act('confirmSalePickup',id),{code:'STALE_PICKUP'});assert.equal((await f.detail(id,f.alice)).canOfferPickup,true);await f.act('offerSalePickup',id,f.alice);assert.equal((await f.detail(id)).canPickup,true);
    await assert.rejects(f.act('confirmSalePickup',id,f.bob,{received:false}),{code:'HANDOVER_REQUIRED'});const d=await f.detail(id),input={sessionId:f.sessionId,saleId:id,confirmation:d.pickupConfirmation,received:true,requestId:randomUUID()},out=await f.cmd('confirmSalePickup',f.bob,input);assert.deepEqual(await f.cmd('confirmSalePickup',f.bob,input),out);
    const b=await f.bag(f.bob);assert.equal(b.ownedElsewhere.length,0);assert.equal(b.lots[0].id,r.purchasedLotId);assert.equal(b.lots[0].holderId,f.characters[1]);assert.equal(b.lots[0].ownerId,f.characters[1]);assert.equal((await f.bag()).heldForOthers.length,0);assert.deepEqual(await f.ledger(),before);assert.equal((await f.wallet()).account.balance,60);
    await assert.rejects(f.act('offerSalePickup',id,f.alice),{code:'SALE_CLOSED'});
  });
  test(`${prefix} : objet payé inutilisable et invendable avant retrait par les deux parties`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareSale()),r=await f.buy(await f.purchase(id));await f.damage();
    for(const who of [f.alice,f.bob]){
      await assert.rejects(f.read('prepareLotTransfer',who,{sessionId:f.sessionId,lotId:r.purchasedLotId,recipientId:f.characters[2],quantity:1}),{code:'FORBIDDEN'});
      await assert.rejects(f.prepareSale({lotId:r.purchasedLotId,buyerId:f.characters[2]},who),{code:'FORBIDDEN'});
    }
    await assert.rejects(f.prepare(f.alice,f.characters[1],f.skills[0],{lotId:r.purchasedLotId}),{code:'INVALID_CONSUMABLE'});assert.equal((await f.wallet()).account.balance,60);
  });
  test(`${prefix} : deux acheteurs sur le dernier lot donnent un paiement et un seul propriétaire`,async()=>{
    const f=await fixture(1),a=await f.propose(await f.prepareSale()),b=await f.propose(await f.prepareSale({buyerId:f.characters[2]})),p=await f.purchase(a.id),q=await f.purchase(b.id,f.eve);
    const rs=await Promise.allSettled([f.buy(p),f.buy(q,f.eve)]);assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);assert.equal(rs.find(x=>x.status==='rejected').reason.code,'STALE_SALE');assert.equal((await f.wallet(f.alice)).account.balance,40);assert.equal((await f.wallet()).account.balance+(await f.wallet(f.eve)).account.balance,160);assert.equal(await f.total(),2);
  });
  test(`${prefix} : vente et consommation concurrentes ne dupliquent ni objet ni paiement`,async()=>{
    const f=await fixture(1);await f.damage();const treatment=await f.prepare(),{id}=await f.propose(await f.prepareSale()),p=await f.purchase(id),rs=await Promise.allSettled([f.treat(treatment),f.buy(p)]);assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);
    const sold=(await f.detail(id)).status==='SOLD';assert.equal((await f.wallet()).account.balance,sold?60:100);assert.equal(await f.total(),sold?2:1);
  });
  test(`${prefix} : deux achats concurrents ne dépensent pas deux fois le même solde`,async()=>{
    const f=await fixture(),lot=(await f.bag()).lots.find(l=>l.item.kind==='INDIVIDUAL'),a=await f.propose(await f.prepareSale({amount:80})),b=await f.propose(await f.prepareSale({lotId:lot.id,amount:80})),p=await f.purchase(a.id),q=await f.purchase(b.id),rs=await Promise.allSettled([f.buy(p),f.buy(q)]);
    assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);assert.equal(rs.find(x=>x.status==='rejected').reason.code,'INSUFFICIENT_FUNDS');assert.equal((await f.wallet()).account.balance,20);assert.equal((await f.bag(f.bob)).ownedElsewhere.length,1);
  });
  test(`${prefix} : échéance, annulation et refus ne débitent pas, même en pause`,async()=>{
    const f=await fixture(),a=await f.propose(await f.prepareSale({minutes:1})),p=await f.purchase(a.id);f.advance(60000);assert.equal((await f.detail(a.id)).status,'EXPIRED');await assert.rejects(f.buy(p),{code:'SALE_EXPIRED'});
    const b=await f.propose(await f.prepareSale());await f.stage('PAUSE');await f.act('cancelLotSale',a.id,f.alice);await f.act('declineLotSale',b.id);assert.equal((await f.lot()).quantity,3);assert.equal((await f.wallet()).account.balance,100);assert.equal((await f.wallet()).account.reserved,0);
  });
  test(`${prefix} : annulation et achat concurrents ont une seule issue`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareSale()),p=await f.purchase(id),rs=await Promise.allSettled([f.buy(p),f.act('cancelLotSale',id,f.alice)]);assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);assert.equal(rs.find(x=>x.status==='rejected').reason.code,'SALE_CLOSED');const d=await f.detail(id);assert.equal((await f.wallet()).account.balance,d.status==='SOLD'?60:100);
  });
  test(`${prefix} : stock corrigé, saisi ou identité réattribuée invalide le consentement`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareSale()),p=await f.purchase(id);await f.correct((await f.lot()).id,{status:'SEIZED'});await assert.rejects(f.buy(p),{code:'STALE_SALE'});await f.correct((await f.lot()).id,{status:'AVAILABLE'});await assert.rejects(f.buy(p),{code:'STALE_SALE'});
    const b=await f.propose(await f.prepareSale());await f.cmd('assign',f.owner,{sessionId:f.sessionId,uid:f.eve.uid,characterId:f.characters[1],replace:true});await f.activate(f.eve);await assert.rejects(f.detail(b.id),{code:'FORBIDDEN'});assert.equal((await f.detail(b.id,f.eve)).status,'STALE');await assert.rejects(f.purchase(b.id,f.eve),{code:'STALE_SALE'});
  });
  test(`${prefix} : compte collectif payeur sans lecture, alias et retrait du droit de dépense`,async()=>{
    const f=await fixture(),g=await f.group(),{id}=await f.propose(await f.prepareSale()),p=await f.purchase(id,f.bob,{fromAccountId:g.accountId});assert.equal('before' in p.result,false);assert.equal('after' in p.result,false);assert.equal(p.result.source.name,'Comptoir neutre');
    const requestId=randomUUID(),r=await f.buy(p,f.bob,{requestId});assert.equal('account' in r,false);assert.equal((await f.wallet()).account.balance,100);assert.equal((await f.bag(f.bob)).ownedElsewhere[0].ownerId,f.characters[1]);
    const seller=await f.wallet(f.alice);assert.equal(seller.entries.find(e=>e.id===r.paymentId).counterparty.name,'Comptoir neutre');for(const hidden of ['GROUPE_SECRET','operatorCharacterId',f.bob.uid])assert.equal(JSON.stringify(seller).includes(hidden),false);
    await g.edit({readWallet:true});await assert.rejects(f.buy(p,f.bob,{requestId}),{code:'FORBIDDEN'});
  });
  test(`${prefix} : lecture seule et portefeuille d’un autre joueur ne financent pas un achat`,async()=>{
    const f=await fixture(),g=await f.group({readWallet:true}),{id}=await f.propose(await f.prepareSale());for(const fromAccountId of [g.accountId,accountId(f.characters[0]),accountId(f.characters[2]),randomUUID()])await assert.rejects(f.purchase(id,f.bob,{fromAccountId}),{code:'FORBIDDEN'});
    await assert.rejects(f.purchase(id,f.alice),{code:'FORBIDDEN'});await assert.rejects(f.act('offerSalePickup',id),{code:'FORBIDDEN'});assert.equal((await f.wallet()).account.balance,100);
  });
  test(`${prefix} : révision du compte, fonds réservés et dépassement numérique empêchent le débit`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareSale()),p=await f.purchase(id);await f.adjust({amount:1});await assert.rejects(f.buy(p),{code:'STALE_REVISION'});
    const patch=async(cid,change)=>f.store.runTransaction(async tx=>{const path=`sessions/${f.sessionId}/accounts/${accountId(cid)}`,a=await tx.get(path);tx.set(path,{...a,...change});});await patch(f.characters[1],{reserved:90});await assert.rejects(f.purchase(id),{code:'INSUFFICIENT_FUNDS'});await patch(f.characters[1],{reserved:0});await patch(f.characters[0],{balance:Number.MAX_SAFE_INTEGER});await assert.rejects(f.purchase(id),{code:'BALANCE_OVERFLOW'});assert.equal((await f.lot()).quantity,3);
  });
  test(`${prefix} : retrait périmé après correction ou révocation, nouveau consentement requis`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareSale()),r=await f.buy(await f.purchase(id));await f.act('offerSalePickup',id,f.alice);await f.correct(r.purchasedLotId,{status:'SEIZED'});assert.equal((await f.detail(id)).canPickup,false);await assert.rejects(f.act('confirmSalePickup',id),{code:'STALE_PICKUP'});await f.correct(r.purchasedLotId,{status:'AVAILABLE'});await assert.rejects(f.act('confirmSalePickup',id),{code:'STALE_PICKUP'});
    await f.act('offerSalePickup',id,f.alice);await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.bob.uid});f.advance(2000);f.bob.authTime=102;await f.activate(f.bob);await assert.rejects(f.act('confirmSalePickup',id),{code:'STALE_PICKUP'});await f.act('offerSalePickup',id,f.alice);await f.act('confirmSalePickup',id);assert.equal((await f.wallet()).account.balance,60);
  });
  test(`${prefix} : réessai d’achat conservé après retrait et don ultérieur, accès révoqué prioritaire`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareSale()),p=await f.purchase(id),requestId=randomUUID(),r=await f.buy(p,f.bob,{requestId});await f.act('offerSalePickup',id,f.alice);await f.act('confirmSalePickup',id);
    const input={sessionId:f.sessionId,lotId:r.purchasedLotId,recipientId:f.characters[2],quantity:1},prep=await f.read('prepareLotTransfer',f.bob,input),tr=await f.cmd('proposeLotTransfer',f.bob,{...input,confirmation:prep.confirmation}),d=await f.read('lotTransferDetail',f.eve,{sessionId:f.sessionId,transferId:tr.id});await f.cmd('acceptLotTransfer',f.eve,{sessionId:f.sessionId,transferId:tr.id,confirmation:d.confirmation,received:true});assert.deepEqual(await f.buy(p,f.bob,{requestId}),r);
    await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.bob.uid});await assert.rejects(f.buy(p,f.bob,{requestId}),{code:'FORBIDDEN'});
  });
  test(`${prefix} : champs invalides et préparation altérée ne créent aucune vente`,async()=>{
    const f=await fixture();for(const patch of [{quantity:0},{quantity:4},{amount:0},{amount:1.5},{amount:Number.MAX_SAFE_INTEGER+1},{minutes:0},{minutes:10081},{conditions:''},{pickupPlace:''},{buyerId:f.characters[0]},{buyerId:randomUUID()}])await assert.rejects(f.prepareSale(patch));
    const p=await f.prepareSale();await assert.rejects(f.propose(p,f.alice,{amount:1}),{code:'STALE_REVISION'});assert.equal((await f.bag()).sales.length,0);
  });
  test(`${prefix} : hors combat, pause et module économie contrôlés, retrait possible sans économie`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareSale());await f.damage(f.alice,10);await assert.rejects(f.purchase(id),{code:'OUT_OF_COMBAT'});let s=await f.session();await f.cmd('saveSessionHealth',f.owner,{sessionId:f.sessionId,revision:s.revision,rules:{...s.healthRules,allowed:{transfer:true,pay:true}},reason:'Autorisation'});await f.damage(f.bob,10);const p=await f.purchase(id);await f.stage('PAUSE');await assert.rejects(f.buy(p),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await f.rules({enabled:false});await assert.rejects(f.buy(p),{code:'ECONOMY_DISABLED'});await f.rules({});await f.buy(p);await f.rules({enabled:false});await f.act('offerSalePickup',id,f.alice);await f.act('confirmSalePickup',id);assert.equal((await f.bag(f.bob)).lots.length,1);
  });
  test(`${prefix} : panne avant commit conserve paiement, stock, vente et journaux`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareSale()),p=await f.purchase(id),before=await f.ledger(),run=f.store.runTransaction.bind(f.store);let abort=true;f.store.runTransaction=cb=>run(async tx=>{const r=await cb(tx);if(abort){abort=false;throw new Error('Panne synthétique vente');}return r;});await assert.rejects(f.buy(p),/Panne synthétique/);assert.deepEqual(await f.ledger(),before);assert.equal((await f.lot()).quantity,3);assert.equal((await f.wallet()).account.balance,100);assert.equal((await f.detail(id)).status,'PENDING');await f.buy(p);assert.equal((await f.wallet()).account.balance,60);
  });
  test(`${prefix} : aperçu MJ sans action, Accueil et badge sans ventes, archive et anonymes fermés`,async()=>{
    const f=await fixture(),{id}=await f.propose(await f.prepareSale());await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Test'});await assert.rejects(f.detail(id,f.staff),{code:'FORBIDDEN'});await assert.rejects(f.read('previewInventory',f.staff,{sessionId:f.sessionId,characterId:f.characters[1]}),{code:'FORBIDDEN'});
    const d=await f.read('previewInventory',f.owner,{sessionId:f.sessionId,characterId:f.characters[1]});for(const flag of ['canBuy','canClose','canOfferPickup','canPickup'])assert.equal(d.sales[0][flag],false);assert.equal(JSON.stringify(await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[1]})).includes('Quai fictif'),false);
    for(const action of ['prepareLotSale','proposeLotSale','lotSaleDetail','prepareLotPurchase','buyLot','declineLotSale','cancelLotSale','offerSalePickup','confirmSalePickup'])await assert.rejects(f.cmd(action,null,{sessionId:f.sessionId}),{code:'LOGIN_REQUIRED'});
    await assert.rejects(f.read('lotSaleDetail',f.bob,{sessionId:randomUUID(),saleId:id}),{code:'FORBIDDEN'});await f.stage('FINISHED');await assert.rejects(f.purchase(id),{code:'SESSION_NOT_RUNNING'});await f.stage('ARCHIVED');await assert.rejects(f.detail(id),{code:'FORBIDDEN'});
  });
}
