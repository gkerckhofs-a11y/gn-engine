import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {marketFixture} from './market-suite.mjs';
import {negotiationCommands} from '../../src/core/market-negotiations.mjs';

export function negotiationsSuite(makeStore,prefix='Négociation'){
  async function fixture(){
    const f=await marketFixture(makeStore);
    const read=(a,i={},who=f.bob)=>f.read(a,who,{sessionId:f.sessionId,...i});
    const cmd=(a,i={},who=f.bob)=>f.cmd(a,who,{sessionId:f.sessionId,...i});
    const detail=(id,who=f.bob)=>read('marketNegotiation',{negotiationId:id},who);
    const prepare=async(listingId,patch={},who=f.bob)=>{const input={listingId,amount:25,minutes:10,message:'MESSAGE_PRIVE',...patch};return {...input,confirmation:(await read('prepareMarketOffer',input,who)).confirmation};};
    const send=(input,who=f.bob)=>cmd('sendMarketOffer',input,who);
    const reply=async(id,action='acceptMarketOffer',who=f.alice,patch={})=>cmd(action,{negotiationId:id,confirmation:(await detail(id,who)).confirmation,...patch},who);
    const offer=async(patch={},who=f.bob,listing=null)=>{const p=listing??await f.publish(await f.prepareListing());return {listing:p,...await send(await prepare(p.id,patch,who),who)};};
    const purchase=(o,who=f.bob,patch={})=>f.purchase(o.listing.id,who,{negotiationId:o.id,...patch});
    const config=async(kind,patch={})=>{
      const d=await read('priceAdmin',{},f.owner),old=kind==='CommodityPrice'?d.prices.find(p=>p.id===f.items[0]):d.events.find(p=>p.id===patch.eventId);
      const input={itemId:f.items[0],enabled:true,...(kind==='CommodityPrice'?{baseUnitPrice:20}:{title:'Contrôle fictif',description:'Commerce suspendu',percent:0,trigger:'MANUAL',tradeBlocked:true}),...old,...patch,recordRevision:old?.revision??0,revision:d.session.revision,reason:'SECRET_PRIX_MJ'};
      return cmd(`save${kind}`,{...input,confirmation:(await read(`prepare${kind}`,input,f.owner)).confirmation},f.owner);
    };
    return {...f,readN:read,cmdN:cmd,detail,prepareN:prepare,send,reply,offer,purchaseN:purchase,config};
  }
  test(`${prefix} : offre, contre-offre, acceptation, prix confirmé et retrait sans second débit`,async()=>{
    const f=await fixture(),o=await f.offer();assert.equal((await f.wallet()).account.balance,100);assert.equal((await f.lot()).status,'RESERVED');
    await assert.rejects(f.reply(o.id,'acceptMarketOffer',f.bob),{code:'NEGOTIATION_TURN'});
    const counter=await f.prepareN(o.listing.id,{negotiationId:o.id,amount:30,message:'À trente crédits'},f.alice);await f.send(counter,f.alice);
    assert.equal((await f.detail(o.id)).canReply,true);await f.reply(o.id,'acceptMarketOffer',f.bob);assert.equal((await f.wallet()).account.balance,100);
    const buy=await f.purchaseN(o);assert.equal(buy.result.total,30);assert.equal(buy.result.sale.negotiationId,o.id);assert.equal(buy.result.sale.quantity,3);
    const requestId=randomUUID(),r=await f.buy(buy,f.bob,{requestId,amount:1,quantity:999});assert.deepEqual(await f.buy(buy,f.bob,{requestId,amount:1,quantity:999}),r);
    assert.equal((await f.wallet()).account.balance,70);assert.equal((await f.wallet(f.alice)).account.balance,30);assert.equal((await f.detail(o.id)).status,'PAID');
    assert.deepEqual((await f.detail(o.id)).history.map(e=>e.kind),['OFFER','COUNTER','ACCEPT','PAY']);
    await f.pickup('offerSalePickup',r.id,f.alice);await f.pickup('confirmSalePickup',r.id,f.bob);assert.equal((await f.wallet()).account.balance,70);assert.equal((await f.bag(f.bob)).lots[0].quantity,3);
  });
  test(`${prefix} : confidentialité, accès tiers et commandes anonymes`,async()=>{
    const f=await fixture(),o=await f.offer();const m=await f.market(f.eve),list=await f.readN('myMarketNegotiations',{},f.eve);assert.deepEqual(list.negotiations,[]);assert.equal(JSON.stringify(m).includes('MESSAGE_PRIVE'),false);
    const d=await f.detail(o.id);for(const text of [f.alice.uid,f.bob.uid,'buyerVersion','sellerVersion','SECRET_FINANCE_MJ','assignedUid','lotRevision','ORIGINE_SECRETE_MJ'])assert.equal(JSON.stringify(d).includes(text),false,text);
    for(const a of ['marketNegotiation','acceptMarketOffer','closeMarketNegotiation'])await assert.rejects(f.cmdN(a,{negotiationId:o.id,confirmation:d.confirmation},f.eve),{code:'FORBIDDEN'});
    await assert.rejects(f.prepareN(o.listing.id,{negotiationId:o.id},f.eve),{code:'FORBIDDEN'});
    await assert.rejects(f.purchaseN(o,f.eve),{code:'FORBIDDEN'});
    for(const a of negotiationCommands)await assert.rejects(f.cmdN(a,{},null),{code:'LOGIN_REQUIRED'});
    await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Test'});
    await assert.rejects(f.readN('marketNegotiation',{negotiationId:o.id,admin:true},f.staff),{code:'FORBIDDEN'});
    await assert.rejects(f.readN('marketNegotiation',{sessionId:randomUUID(),negotiationId:o.id}),{code:'FORBIDDEN'});
  });
  test(`${prefix} : confirmation altérée, offre unique et réessais idempotents`,async()=>{
    const f=await fixture(),l=await f.publish(await f.prepareListing()),p=await f.prepareN(l.id),requestId=randomUUID();
    await assert.rejects(f.send({...p,amount:1}),{code:'STALE_REVISION'});await assert.rejects(f.send({...p,message:'Autre'}),{code:'STALE_REVISION'});
    const o=await f.send({...p,requestId});assert.deepEqual(await f.send({...p,requestId}),o);await assert.rejects(f.send({...p,requestId,amount:1}),{code:'REQUEST_ID_REUSED'});
    await assert.rejects(f.prepareN(l.id),{code:'NEGOTIATION_EXISTS'});const d=await f.detail(o.id,f.alice),accept={negotiationId:o.id,confirmation:d.confirmation,requestId:randomUUID()};
    const r=await f.cmdN('acceptMarketOffer',accept,f.alice);assert.deepEqual(await f.cmdN('acceptMarketOffer',accept,f.alice),r);
    await assert.rejects(f.purchaseN({id:o.id,listing:{id:'absent'}}),{code:'NOT_FOUND'});
    assert.equal((await f.detail(o.id)).history.length,2);
  });
  test(`${prefix} : contre-offre concurrente à une acceptation, une seule version retenue`,async()=>{
    const f=await fixture(),o=await f.offer(),d=await f.detail(o.id,f.alice),counter=await f.prepareN(o.listing.id,{negotiationId:o.id,amount:35},f.alice);
    const results=await Promise.allSettled([f.send(counter,f.alice),f.cmdN('acceptMarketOffer',{negotiationId:o.id,confirmation:d.confirmation},f.alice)]);
    assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.detail(o.id)).revision,2);assert.equal((await f.wallet()).account.balance,100);
    await assert.rejects(f.send(counter,f.alice));
  });
  test(`${prefix} : achat immédiat concurrent à un paiement négocié, une seule vente`,async()=>{
    const f=await fixture(),o=await f.offer();await f.reply(o.id);const negotiated=await f.purchaseN(o),direct=await f.purchase(o.listing.id,f.eve);
    assert.equal((await f.listing(o.listing.id,f.eve)).canBuy,true);
    const results=await Promise.allSettled([f.buy(negotiated),f.buy(direct,f.eve)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
    const paid=results.find(x=>x.status==='fulfilled').value;assert.equal((await f.wallet()).account.balance+(await f.wallet(f.eve)).account.balance,200-paid.amount);
    assert.equal((await f.ledger()).filter(e=>e.kind==='SALE').length,1);assert.equal((await f.detail(o.id)).status,paid.amount===25?'PAID':'UNAVAILABLE');
  });
  test(`${prefix} : deux accords non exclusifs, puis clôture concurrente au paiement`,async()=>{
    const f=await fixture(),o=await f.offer(),other=await f.offer({amount:28},f.eve,o.listing);await f.reply(o.id);await f.reply(other.id);
    const p=await f.purchaseN(o);assert.equal((await f.detail(other.id,f.eve)).canBuy,true);
    const results=await Promise.allSettled([f.buy(p),f.reply(o.id,'closeMarketNegotiation')]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
    const d=await f.detail(o.id);assert.equal((await f.wallet()).account.balance,d.status==='PAID'?75:100);
    if(d.status==='CLOSED'){await f.buy(await f.purchaseN(other,f.eve),f.eve);assert.equal((await f.wallet(f.eve)).account.balance,72);}else assert.equal((await f.detail(other.id,f.eve)).status,'UNAVAILABLE');
    // Each buyer sees only their own negotiated price, never the competitor's payment.
    assert.equal((await f.detail(other.id,f.eve)).listing.amount,40);assert.equal((await f.detail(o.id)).listing.amount,40);
  });
  test(`${prefix} : échéance en temps réel, plafonnée par annonce et non prolongée par contre-offre`,async()=>{
    const f=await fixture(),l=await f.publish(await f.prepareListing({minutes:2})),o=await f.offer({minutes:10},f.bob,l),old=await f.detail(o.id);
    assert.equal(old.expiresAt,(await f.listing(l.id)).expiresAt);f.advance(60000);await f.send(await f.prepareN(l.id,{negotiationId:o.id,amount:29},f.alice),f.alice);
    assert.equal((await f.detail(o.id)).expiresAt,old.expiresAt);await f.stage('PAUSE');f.advance(60000);assert.equal((await f.detail(o.id)).status,'EXPIRED');await f.stage('EN_JEU');
    await assert.rejects(f.reply(o.id,'acceptMarketOffer',f.bob),{code:'NEGOTIATION_CLOSED'});assert.equal((await f.lot()).status,'AVAILABLE');
  });
  test(`${prefix} : refus sans paiement, nouvelle offre et anciennes confirmations invalidées`,async()=>{
    const f=await fixture(),o=await f.offer(),old=await f.detail(o.id,f.alice);await f.reply(o.id,'closeMarketNegotiation');assert.equal((await f.wallet()).account.balance,100);
    const reopened=await f.send(await f.prepareN(o.listing.id,{amount:20}));assert.equal(reopened.id,o.id);assert.equal((await f.detail(o.id)).revision,3);
    await assert.rejects(f.cmdN('acceptMarketOffer',{negotiationId:o.id,confirmation:old.confirmation},f.alice),{code:'STALE_REVISION'});
    await f.reply(o.id);const p=await f.purchaseN(o);await f.reply(o.id,'closeMarketNegotiation',f.bob);await assert.rejects(f.buy(p),{code:'NEGOTIATION_CLOSED'});
    await f.withdraw(o.listing.id);assert.equal((await f.lot()).status,'AVAILABLE');
  });
  test(`${prefix} : prix accepté fixe malgré cours modifié ou fermé, suspension commerciale prioritaire`,async()=>{
    const f=await fixture();await f.config('CommodityPrice');const l=await f.publish(await f.prepareListing({pricing:'INDEXED'})),o=await f.offer({},f.bob,l);await f.reply(o.id);
    await f.config('CommodityPrice',{baseUnitPrice:30});assert.equal((await f.listing(l.id,f.bob)).amount,90);assert.equal((await f.purchaseN(o)).result.total,25);
    await f.config('CommodityPrice',{enabled:false});assert.equal((await f.listing(l.id,f.bob)).canBuy,false);assert.equal((await f.purchaseN(o)).result.total,25);
    const p=await f.purchaseN(o),event=await f.config('PriceEvent');assert.equal((await f.detail(o.id)).canBuy,false);await assert.rejects(f.buy(p),{code:'TRADE_SUSPENDED'});
    await assert.rejects(f.prepareN(l.id,{},f.eve),{code:'TRADE_SUSPENDED'});await f.config('PriceEvent',{eventId:event.id,enabled:false});await assert.rejects(f.buy(p),{code:'STALE_REVISION'});
    const r=await f.buy(await f.purchaseN(o));assert.equal(r.amount,25);const sale=await f.read('lotSaleDetail',f.bob,{sessionId:f.sessionId,saleId:r.id});assert.equal(sale.pricing,'FIXED');assert.equal(sale.priceQuote,null);
  });
  test(`${prefix} : suspension empêche contre-offre et acceptation mais permet clôture`,async()=>{
    const f=await fixture(),o=await f.offer(),p=await f.prepareN(o.listing.id,{negotiationId:o.id},f.alice);await f.config('PriceEvent');
    assert.equal((await f.detail(o.id,f.alice)).canReply,false);await assert.rejects(f.send(p,f.alice),{code:'TRADE_SUSPENDED'});await assert.rejects(f.reply(o.id),{code:'TRADE_SUSPENDED'});
    await f.reply(o.id,'closeMarketNegotiation');assert.equal((await f.detail(o.id)).status,'CLOSED');
  });
  test(`${prefix} : caisse sans lecture, fonds insuffisants et révocation avant réessai`,async()=>{
    const f=await fixture(),g=await f.group(),o=await f.offer({amount:101});await f.reply(o.id);await assert.rejects(f.purchaseN(o),{code:'INSUFFICIENT_FUNDS'});await f.reply(o.id,'closeMarketNegotiation');
    await f.send(await f.prepareN(o.listing.id));await f.reply(o.id);const p=await f.purchaseN(o,f.bob,{fromAccountId:g.accountId});assert.equal('before' in p.result,false);assert.equal('after' in p.result,false);
    const requestId=randomUUID(),r=await f.buy(p,f.bob,{requestId});assert.equal((await f.wallet()).account.balance,100);assert.equal(JSON.stringify(await f.wallet(f.alice)).includes('GROUPE_SECRET'),false);await g.revoke();await assert.rejects(f.buy(p,f.bob,{requestId}),{code:'FORBIDDEN'});assert.equal(r.amount,25);
  });
  test(`${prefix} : identité réactivée ne réutilise pas l’accord ou la confirmation d’envoi`,async()=>{
    const f=await fixture(),o=await f.offer();await f.reply(o.id);const p=await f.purchaseN(o);await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.bob.uid});
    assert.equal((await f.detail(o.id,f.alice)).status,'STALE');await assert.rejects(f.buy(p),{code:'FORBIDDEN'});f.advance(2000);f.bob.authTime=102;await f.activate(f.bob);
    await assert.rejects(f.purchaseN(o),{code:'NEGOTIATION_CLOSED'});await f.send(await f.prepareN(o.listing.id));assert.equal((await f.detail(o.id)).status,'OPEN');
    await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.alice.uid});assert.equal((await f.detail(o.id)).status,'UNAVAILABLE');
  });
  test(`${prefix} : phases, santé, économie et campagne scellée`,async()=>{
    const f=await fixture(),o=await f.offer(),other=await f.offer({},f.eve,o.listing);await f.stage('PAUSE');await assert.rejects(f.reply(o.id),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await f.damage(f.bob,10);
    await assert.rejects(f.reply(o.id),{code:'OUT_OF_COMBAT'});await f.rules({enabled:false});await assert.rejects(f.prepareN(o.listing.id,{negotiationId:other.id},f.alice),{code:'ECONOMY_DISABLED'});await f.reply(o.id,'closeMarketNegotiation');
    await f.store.runTransaction(async tx=>{const path=`sessions/${f.sessionId}`,s=await tx.get(path);tx.set(path,{...s,campaignSealed:true});});
    await assert.rejects(f.reply(other.id,'closeMarketNegotiation',f.eve),{code:'CAMPAIGN_SESSION_SEALED'});
    await f.store.runTransaction(async tx=>{const path=`sessions/${f.sessionId}`,s=await tx.get(path);tx.set(path,{...s,campaignSealed:false});});
    await f.stage('FINISHED');await f.stage('ARCHIVED');await assert.rejects(f.readN('myMarketNegotiations'),{code:'FORBIDDEN'});
  });
  test(`${prefix} : panne transactionnelle ne laisse ni offre partielle ni débit partiel`,async()=>{
    const f=await fixture(),l=await f.publish(await f.prepareListing()),p=await f.prepareN(l.id),run=f.store.runTransaction.bind(f.store);let abort=false;
    f.store.runTransaction=cb=>run(async tx=>{const r=await cb(tx);if(abort){abort=false;throw new Error('Panne synthétique négociation');}return r;});
    abort=true;await assert.rejects(f.send(p),/Panne synthétique/);assert.equal((await f.readN('myMarketNegotiations')).negotiations.length,0);
    const n=await f.send(p),o={...n,listing:l};await f.reply(n.id);const b=await f.purchaseN(o);abort=true;await assert.rejects(f.buy(b),/Panne synthétique/);
    assert.equal((await f.wallet()).account.balance,100);assert.equal((await f.detail(n.id)).status,'ACCEPTED');assert.equal((await f.listing(l.id)).status,'ACTIVE');assert.equal((await f.ledger()).filter(e=>e.kind==='SALE').length,0);
    await f.buy(b);assert.equal((await f.wallet()).account.balance,75);
  });
  test(`${prefix} : données invalides refusées et paiement interdit avant acceptation`,async()=>{
    const f=await fixture(),l=await f.publish(await f.prepareListing());
    for(const patch of [{amount:0},{amount:-1},{amount:1.5},{amount:Number.MAX_SAFE_INTEGER+1},{minutes:0},{minutes:10081},{message:'x'.repeat(2001)},{message:{}}])await assert.rejects(f.prepareN(l.id,patch));
    await assert.rejects(f.prepareN(l.id,{},f.alice),{code:'FORBIDDEN'});const o=await f.offer({},f.bob,l);await assert.rejects(f.purchaseN(o),{code:'NEGOTIATION_CLOSED'});
    const other=await f.publish(await f.prepareListing({lotId:(await f.bag(f.eve)).lots[0].id},f.eve),f.eve);await assert.rejects(f.purchase(other.id,f.bob,{negotiationId:o.id}),{code:'FORBIDDEN'});
    await f.withdraw(l.id);assert.equal((await f.detail(o.id)).status,'UNAVAILABLE');await assert.rejects(f.reply(o.id),{code:'NEGOTIATION_CLOSED'});
  });
  test(`${prefix} : accord expiré avant annonce, sans débit et sans empêcher une nouvelle offre`,async()=>{
    const f=await fixture(),o=await f.offer({minutes:1});await f.reply(o.id);const p=await f.purchaseN(o);f.advance(60000);
    assert.equal((await f.detail(o.id)).status,'EXPIRED');assert.equal((await f.listing(o.listing.id)).status,'ACTIVE');await assert.rejects(f.buy(p),{code:'NEGOTIATION_CLOSED'});
    await f.send(await f.prepareN(o.listing.id,{amount:22}));assert.equal((await f.detail(o.id)).amount,22);assert.equal((await f.wallet()).account.balance,100);
  });
}
