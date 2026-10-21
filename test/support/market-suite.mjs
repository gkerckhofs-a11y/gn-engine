import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {inventoryFixture} from './inventory-suite.mjs';
import {accountId,groupAccountId} from '../../src/core/economy-state.mjs';
export async function marketFixture(makeStore,quantity=3){
    const f=await inventoryFixture(makeStore,quantity),currency={enabled:true,name:'Monnaie fictive de test',unit:'crédit'};
    const rules=async patch=>f.cmd('saveSessionEconomy',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,rules:{...currency,...patch},reason:'Test'});await rules({});
    const adjust=async(patch={})=>{const input={sessionId:f.sessionId,revision:(await f.session()).revision,characterId:f.characters[1],amount:100,mode:'CREDIT',memo:'Dotation fictive',reason:'SECRET_FINANCE_MJ',...patch},p=await f.read('prepareCreditAdjustment',f.owner,input);return f.cmd('applyCreditAdjustment',f.owner,{...input,confirmation:p.confirmation});};await adjust();await adjust({characterId:f.characters[2]});
    const wallet=(who=f.bob)=>f.read('myWallet',who,{sessionId:f.sessionId});
    const prepareListing=async(patch={},who=f.alice)=>{const input={sessionId:f.sessionId,lotId:(await f.lot()).id,quantity:3,amount:40,minutes:60,pickupPlace:'Quai fictif',conditions:'Remise en main propre',...patch};return {input,result:await f.read('prepareMarketListing',who,input)};};
    const publish=(p,who=f.alice,patch={})=>f.cmd('publishMarketListing',who,{...p.input,confirmation:p.result.confirmation,...patch});
    const listing=(id,who=f.alice)=>f.read('marketListing',who,{sessionId:f.sessionId,listingId:id}),market=(who=f.bob)=>f.read('market',who,{sessionId:f.sessionId});
    const purchase=async(id,who=f.bob,patch={})=>{const input={sessionId:f.sessionId,listingId:id,fromAccountId:accountId((await f.bag(who)).character.id),...patch};return {input,result:await f.read('prepareMarketPurchase',who,input)};};
    const buy=(p,who=f.bob,patch={})=>f.cmd('buyMarketListing',who,{...p.input,confirmation:p.result.confirmation,...patch});
    const withdraw=async(id,who=f.alice,patch={})=>{const d=await listing(id);return f.cmd('withdrawMarketListing',who,{sessionId:f.sessionId,listingId:id,confirmation:d.confirmation,...patch});};
    const pickup=async(action,id,who)=>{const d=await f.read('lotSaleDetail',who,{sessionId:f.sessionId,saleId:id});return f.cmd(action,who,{sessionId:f.sessionId,saleId:id,confirmation:d.pickupConfirmation,received:true});};
    const ledger=()=>f.store.list(`sessions/${f.sessionId}/ledger`);
    const group=async()=>{const member={characterId:f.characters[1],active:true,revealed:true,permissions:{payWallet:true}},r=()=>f.session();const {id}=await f.cmd('saveSessionGroup',f.owner,{sessionId:f.sessionId,revision:(await r()).revision,name:'GROUPE_SECRET',visibility:'SECRET',publicationState:'PUBLISHED',members:[member],reason:'Test'});await f.cmd('setGroupModule',f.owner,{sessionId:f.sessionId,revision:(await r()).revision,enabled:true,reason:'Test'});const input={sessionId:f.sessionId,groupId:id,revision:(await r()).revision,label:'Comptoir neutre',reason:'Test'},p=await f.read('prepareGroupWallet',f.owner,input);await f.cmd('setGroupWallet',f.owner,{...input,confirmation:p.confirmation});await adjust({groupId:id});return {accountId:groupAccountId(id),revoke:async()=>{const s=await r(),g=s.groups.find(g=>g.id===id);await f.cmd('saveSessionGroup',f.owner,{...g,sessionId:f.sessionId,groupId:id,revision:s.revision,members:[{...member,permissions:{readWallet:true}}],reason:'Retrait du droit de payer'});}};};
    return {...f,rules,adjust,wallet,prepareListing,publish,listing,market,purchase,buy,withdraw,pickup,ledger,group};
  }
export function marketSuite(makeStore,prefix='Marché'){
  const fixture=(quantity=3)=>marketFixture(makeStore,quantity);
  test(`${prefix} : publication confirmée, réservation entière et projection publique minimale`,async()=>{
    const f=await fixture(),p=await f.prepareListing();assert.equal((await f.lot()).status,'AVAILABLE');assert.equal((await f.market()).listings.length,0);
    const requestId=randomUUID(),r=await f.publish(p,f.alice,{requestId});assert.deepEqual(await f.publish(p,f.alice,{requestId}),r);assert.equal(r.lotId,p.input.lotId);assert.equal((await f.lot()).status,'RESERVED');assert.equal((await f.lot()).quantity,3);assert.equal((await f.wallet()).account.balance,100);
    const m=await f.market();assert.equal(m.listings.length,1);assert.equal(m.listings[0].amount,40);assert.equal(m.listings[0].canBuy,true);assert.equal((await f.listing(r.id)).canWithdraw,true);
    for(const hidden of ['ORIGINE_SECRETE_MJ','SECRET_FINANCE_MJ','sellerVersion','assignedUid','lotRevision','marketReservation','confirmation','lotId','balance',f.alice.uid])assert.equal(JSON.stringify(m).includes(hidden),false,hidden);
  });
  test(`${prefix} : fractionnement réserve seulement la quantité publiée et conserve la provenance`,async()=>{
    const f=await fixture(),old=await f.lot(),r=await f.publish(await f.prepareListing({quantity:2})),s=await f.session(),l=s.inventory.find(x=>x.id===r.lotId);assert.equal((await f.lot()).quantity,1);assert.equal((await f.lot()).status,'AVAILABLE');assert.equal(l.quantity,2);assert.equal(l.origin.parentLotId,old.id);assert.equal(l.origin.listingId,r.id);assert.equal(s.inventory.filter(x=>x.item.id===f.items[0]).reduce((n,x)=>n+x.quantity,0),6);
    await f.withdraw(r.id);assert.equal((await f.bag()).lots.find(l=>l.id===r.lotId).status,'AVAILABLE');
  });
  test(`${prefix} : exemplaire individuel entier, prix et quantité forgés ne modifient pas la vente`,async()=>{
    const f=await fixture(),lot=(await f.bag()).lots.find(l=>l.item.kind==='INDIVIDUAL'),r=await f.publish(await f.prepareListing({lotId:lot.id,quantity:1})),p=await f.purchase(r.id),out=await f.buy(p,f.bob,{quantity:999,amount:1,ownerId:f.characters[2]});assert.equal(out.purchasedLotId,lot.id);assert.equal(out.amount,40);assert.equal((await f.wallet()).account.balance,60);
  });
  test(`${prefix} : stock réservé bloque double annonce, don, vente privée, soin et correction MJ`,async()=>{
    const f=await fixture(),lot=await f.lot();await f.damage();await f.publish(await f.prepareListing());await assert.rejects(f.prepareListing(),{code:'INSUFFICIENT_STOCK'});
    await assert.rejects(f.read('prepareLotTransfer',f.alice,{sessionId:f.sessionId,lotId:lot.id,recipientId:f.characters[1],quantity:1}),{code:'INSUFFICIENT_STOCK'});
    await assert.rejects(f.read('prepareLotSale',f.alice,{sessionId:f.sessionId,lotId:lot.id,buyerId:f.characters[1],quantity:1}),{code:'INSUFFICIENT_STOCK'});await assert.rejects(f.prepare(),{code:'INSUFFICIENT_STOCK'});await assert.rejects(f.correct(lot.id,{status:'AVAILABLE'}),{code:'LOT_CLOSED'});assert.equal((await f.health()).skills.find(k=>k.id===f.skills[0]).lots.length,0);
  });
  test(`${prefix} : expiration libère les lecteurs et le soin sans commande de nettoyage`,async()=>{
    const f=await fixture();await f.damage();const r=await f.publish(await f.prepareListing({minutes:1})),revision=(await f.lot()).revision;f.advance(60000);assert.equal((await f.market()).listings.length,0);assert.equal((await f.listing(r.id)).status,'EXPIRED');assert.equal((await f.lot()).status,'AVAILABLE');assert.equal((await f.lot()).revision,revision+1);assert.equal((await f.health()).skills.find(k=>k.id===f.skills[0]).lots.length,1);assert.equal((await f.session()).inventory.find(l=>l.id===r.lotId).revision,revision+1);await f.treat(await f.prepare());assert.equal((await f.lot()).quantity,2);await assert.rejects(f.purchase(r.id),{code:'LISTING_EXPIRED'});
  });
  test(`${prefix} : expiration autorise une nouvelle vente privée, un don et une correction`,async()=>{
    const f=await fixture(),r=await f.publish(await f.prepareListing({minutes:1}));f.advance(60000);const input={sessionId:f.sessionId,lotId:r.lotId,buyerId:f.characters[1],recipientId:f.characters[1],quantity:1,amount:20,minutes:10,conditions:'Test',pickupPlace:'Test'};
    assert.equal((await f.read('prepareLotSale',f.alice,input)).quantity,1);assert.equal((await f.read('prepareLotTransfer',f.alice,input)).quantity,1);await f.correct(r.lotId,{quantity:2,status:'AVAILABLE'});assert.equal((await f.lot()).quantity,2);
  });
  test(`${prefix} : ancienne proposition privée ne renaît pas après réservation puis expiration`,async()=>{
    const f=await fixture(),input={sessionId:f.sessionId,lotId:(await f.lot()).id,buyerId:f.characters[1],quantity:1,amount:20,minutes:60,conditions:'Test',pickupPlace:'Test'},p=await f.read('prepareLotSale',f.alice,input),r=await f.cmd('proposeLotSale',f.alice,{...input,confirmation:p.confirmation});await f.publish(await f.prepareListing({minutes:1}));f.advance(60000);assert.equal((await f.read('lotSaleDetail',f.bob,{sessionId:f.sessionId,saleId:r.id})).status,'STALE');await assert.rejects(f.read('prepareLotPurchase',f.bob,{sessionId:f.sessionId,saleId:r.id,fromAccountId:accountId(f.characters[1])}),{code:'STALE_SALE'});
  });
  test(`${prefix} : retirer une ancienne annonce expirée ne libère jamais une nouvelle réservation`,async()=>{
    const f=await fixture(),a=await f.publish(await f.prepareListing({minutes:1}));f.advance(60000);const b=await f.publish(await f.prepareListing()),requestId=randomUUID();const input={sessionId:f.sessionId,listingId:a.id,confirmation:(await f.listing(a.id)).confirmation,requestId};await f.cmd('withdrawMarketListing',f.alice,input);await f.cmd('withdrawMarketListing',f.alice,input);assert.equal((await f.lot()).status,'RESERVED');assert.equal((await f.lot()).marketReservation.listingId,b.id);await f.withdraw(b.id);assert.equal((await f.lot()).status,'AVAILABLE');assert.equal((await f.market()).listings.length,0);
  });
  test(`${prefix} : deux publications concurrentes ne promettent pas deux fois le même stock`,async()=>{
    const f=await fixture(),p=await f.prepareListing(),r=await Promise.allSettled([f.publish(p),f.publish(p)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.market()).listings.length,1);
  });
  test(`${prefix} : deux acheteurs concurrents, un seul débit et une seule propriété`,async()=>{
    const f=await fixture(),{id}=await f.publish(await f.prepareListing()),b=await f.purchase(id),e=await f.purchase(id,f.eve),r=await Promise.allSettled([f.buy(b),f.buy(e,f.eve)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.ledger()).filter(e=>e.kind==='SALE').length,1);assert.equal((await f.wallet()).account.balance+(await f.wallet(f.eve)).account.balance,160);assert.equal((await f.wallet(f.alice)).account.balance,40);assert.equal((await f.market()).listings.length,0);assert.equal((await f.listing(id)).status,'SOLD');
  });
  test(`${prefix} : achat et retrait concurrents restent atomiques`,async()=>{
    const f=await fixture(),{id}=await f.publish(await f.prepareListing()),p=await f.purchase(id),r=await Promise.allSettled([f.buy(p),f.withdraw(id)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);const d=await f.listing(id),w=await f.wallet();assert.equal(w.account.balance,d.status==='SOLD'?60:100);assert.equal((await f.ledger()).filter(e=>e.kind==='SALE').length,d.status==='SOLD'?1:0);
  });
  test(`${prefix} : achat idempotent puis retrait physique sans second paiement`,async()=>{
    const f=await fixture(),{id}=await f.publish(await f.prepareListing()),p=await f.purchase(id),requestId=randomUUID(),r=await f.buy(p,f.bob,{requestId});assert.equal((await f.bag(f.bob)).lots.length,0);assert.equal((await f.bag(f.bob)).ownedElsewhere[0].quantity,3);assert.equal((await f.bag()).heldForOthers[0].status,'AVAILABLE');assert.deepEqual(await f.buy(p,f.bob,{requestId}),r);const before=await f.ledger();await f.pickup('offerSalePickup',r.id,f.alice);await f.pickup('confirmSalePickup',r.id,f.bob);assert.equal((await f.bag(f.bob)).lots[0].quantity,3);assert.deepEqual(await f.ledger(),before);assert.deepEqual(await f.buy(p,f.bob,{requestId}),r);await assert.rejects(f.listing(id,f.eve),{code:'NOT_FOUND'});
  });
  test(`${prefix} : caisse payeuse sans lecture, alias préservé et droits vérifiés avant réessai`,async()=>{
    const f=await fixture(),g=await f.group(),{id}=await f.publish(await f.prepareListing()),p=await f.purchase(id,f.bob,{fromAccountId:g.accountId});assert.equal('before' in p.result,false);assert.equal('after' in p.result,false);assert.equal(p.result.source.name,'Comptoir neutre');const requestId=randomUUID(),r=await f.buy(p,f.bob,{requestId}),w=await f.wallet(f.alice);assert.equal(w.entries.find(e=>e.id===r.paymentId).counterparty.name,'Comptoir neutre');for(const hidden of ['GROUPE_SECRET',f.bob.uid,'operatorCharacterId'])assert.equal(JSON.stringify(w).includes(hidden),false);assert.equal((await f.wallet()).account.balance,100);await g.revoke();await assert.rejects(f.buy(p,f.bob,{requestId}),{code:'FORBIDDEN'});
  });
  test(`${prefix} : compte tiers, propre annonce et retrait par un tiers sont refusés`,async()=>{
    const f=await fixture(),{id}=await f.publish(await f.prepareListing());await assert.rejects(f.purchase(id,f.alice),{code:'FORBIDDEN'});await assert.rejects(f.purchase(id,f.bob,{fromAccountId:accountId(f.characters[2])}),{code:'FORBIDDEN'});await assert.rejects(f.withdraw(id,f.bob),{code:'FORBIDDEN'});const g=await f.group();await g.revoke();await assert.rejects(f.purchase(id,f.bob,{fromAccountId:g.accountId}),{code:'FORBIDDEN'});
  });
  test(`${prefix} : fonds disponibles, révision du payeur et limite numérique contrôlés`,async()=>{
    const f=await fixture(),{id}=await f.publish(await f.prepareListing()),p=await f.purchase(id);await f.adjust({amount:1});await assert.rejects(f.buy(p),{code:'STALE_REVISION'});
    const patch=async(cid,x)=>f.store.runTransaction(async tx=>{const path=`sessions/${f.sessionId}/accounts/${accountId(cid)}`,a=await tx.get(path);tx.set(path,{...a,...x});});await patch(f.characters[1],{reserved:90});await assert.rejects(f.purchase(id),{code:'INSUFFICIENT_FUNDS'});await patch(f.characters[1],{reserved:0});await patch(f.characters[0],{balance:Number.MAX_SAFE_INTEGER});await assert.rejects(f.purchase(id),{code:'BALANCE_OVERFLOW'});assert.equal((await f.lot()).status,'RESERVED');
  });
  test(`${prefix} : publication altérée ou stock consommé invalide la confirmation`,async()=>{
    const f=await fixture(),p=await f.prepareListing();await assert.rejects(f.publish(p,f.alice,{amount:1}),{code:'STALE_REVISION'});await f.damage();await f.treat(await f.prepare());await assert.rejects(f.publish(p),{code:'INSUFFICIENT_STOCK'});assert.equal((await f.market()).listings.length,0);
    for(const patch of [{quantity:0},{quantity:1.5},{quantity:4},{amount:0},{amount:1.5},{minutes:0},{minutes:10081},{conditions:''},{pickupPlace:''}])await assert.rejects(f.prepareListing(patch));
  });
  test(`${prefix} : catalogue modifié sans réécrire le prix ni la description annoncés`,async()=>{
    const f=await fixture(),{id}=await f.publish(await f.prepareListing()),s=await f.session(),item=s.items.find(i=>i.id===f.items[0]);await f.cmd('saveSessionItem',f.owner,{...item,sessionId:f.sessionId,revision:s.revision,name:'Nouveau nom',reason:'Test'});const p=await f.purchase(id);assert.equal(p.result.sale.item.name,'Injecteur');assert.equal(p.result.total,40);await f.buy(p);assert.equal((await f.bag(f.bob)).ownedElsewhere[0].item.name,'Injecteur');
  });
  test(`${prefix} : accès vendeur révoqué masque l’annonce, MJ peut libérer le stock avec motif`,async()=>{
    const f=await fixture(),{id}=await f.publish(await f.prepareListing()),p=await f.purchase(id);await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.alice.uid});assert.equal((await f.market()).listings.length,0);await assert.rejects(f.listing(id,f.bob),{code:'NOT_FOUND'});await assert.rejects(f.buy(p),{code:'STALE_LISTING'});const d=(await f.read('sessionMarket',f.owner,{sessionId:f.sessionId})).listings[0],input={sessionId:f.sessionId,listingId:id,confirmation:d.confirmation};await assert.rejects(f.cmd('withdrawSessionListing',f.owner,{...input,reason:''}));await f.cmd('withdrawSessionListing',f.owner,{...input,reason:'Accès retiré'});assert.equal((await f.session()).inventory.find(l=>l.id===d.lotId).status,'AVAILABLE');
  });
  test(`${prefix} : nouvelle activation ne réutilise pas une publication ni un achat confirmés`,async()=>{
    const f=await fixture(),p=await f.prepareListing(),{id}=await f.publish(p),b=await f.purchase(id);await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.alice.uid});f.advance(2000);f.alice.authTime=102;await f.activate(f.alice);assert.equal((await f.listing(id)).status,'STALE');await assert.rejects(f.buy(b),{code:'STALE_LISTING'});await f.withdraw(id);await assert.rejects(f.publish(p),{code:'STALE_REVISION'});assert.equal((await f.lot()).status,'AVAILABLE');
  });
  test(`${prefix} : pause, hors combat, économie désactivée et expiration en temps réel`,async()=>{
    const f=await fixture(),{id}=await f.publish(await f.prepareListing({minutes:1})),p=await f.purchase(id);await f.damage(f.bob,10);await assert.rejects(f.buy(p),{code:'OUT_OF_COMBAT'});await f.stage('PAUSE');await assert.rejects(f.purchase(id),{code:'SESSION_NOT_RUNNING'});f.advance(60000);assert.equal((await f.lot()).status,'AVAILABLE');await f.rules({enabled:false});await f.withdraw(id);await f.stage('EN_JEU');await assert.rejects(f.prepareListing(),{code:'ECONOMY_DISABLED'});
  });
  test(`${prefix} : fin de partie ferme achats et publications mais permet le retrait`,async()=>{
    const f=await fixture(),{id}=await f.publish(await f.prepareListing());await f.stage('FINISHED');await assert.rejects(f.purchase(id),{code:'SESSION_NOT_RUNNING'});await f.withdraw(id);await f.stage('ARCHIVED');await assert.rejects(f.market(),{code:'FORBIDDEN'});await assert.rejects(f.read('sessionMarket',f.owner,{sessionId:f.sessionId}),{code:'SESSION_CLOSED'});
  });
  test(`${prefix} : panne avant commit annule publication et achat sans effet partiel`,async()=>{
    const f=await fixture(),run=f.store.runTransaction.bind(f.store);let abort=false;f.store.runTransaction=cb=>run(async tx=>{const r=await cb(tx);if(abort){abort=false;throw new Error('Panne synthétique marché');}return r;});const p=await f.prepareListing({quantity:2});abort=true;await assert.rejects(f.publish(p),/Panne synthétique/);assert.equal((await f.market()).listings.length,0);assert.equal((await f.lot()).quantity,3);const {id}=await f.publish(p),b=await f.purchase(id),before=await f.ledger();abort=true;await assert.rejects(f.buy(b),/Panne synthétique/);assert.deepEqual(await f.ledger(),before);assert.equal((await f.listing(id)).status,'ACTIVE');assert.equal((await f.wallet()).account.balance,100);await f.buy(b);assert.equal((await f.wallet()).account.balance,60);
  });
  test(`${prefix} : anonymes, Accueil, faux MJ et session étrangère exclus`,async()=>{
    const f=await fixture(),{id}=await f.publish(await f.prepareListing());await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Test'});for(const who of [f.staff,f.bob])for(const action of ['sessionMarket','withdrawSessionListing'])await assert.rejects(f.cmd(action,who,{sessionId:f.sessionId,listingId:id,admin:true}),{code:'FORBIDDEN'});
    for(const action of ['market','marketListing','prepareMarketListing','publishMarketListing','prepareMarketPurchase','buyMarketListing','withdrawMarketListing','sessionMarket','withdrawSessionListing'])await assert.rejects(f.cmd(action,null,{sessionId:f.sessionId}),{code:'LOGIN_REQUIRED'});await assert.rejects(f.read('marketListing',f.bob,{sessionId:randomUUID(),listingId:id}),{code:'FORBIDDEN'});assert.equal(JSON.stringify(await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[0]})).includes('Quai fictif'),false);
  });
}
