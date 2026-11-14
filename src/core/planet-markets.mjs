// Extension of native prices, shops, sales and stock. No independent inventory or wallet.
import {spaceCommodities,planetMarketStates} from '../shared/space-outlaws-commodities.mjs';
import {isBroker} from '../shared/player-access.mjs';
import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryHash as hash,publicItem,readLot,itemQuantity,lotState} from './inventory-state.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
import {hasItemCircuits,commercialTradeAllowed} from './item-circuits.mjs';
import {hasSoShops,shopStockId,shopAccountId} from './space-outlaws-shop-state.mjs';
import {planetMarketId,planetMarketQuote,planetLotOriginPort,ordinaryPlanetCommodity,ordinaryPlanetTrade,planetCommerceSession} from './planet-market-state.mjs';
import {readPriceBook,commodityTrade} from './price-state.mjs';
import {accountId,currencyView,moneyState,moneyText,writeLedger} from './economy-state.mjs';
import {accountEntry,accountParty} from './collective-accounts.mjs';
import {personalTransferActorReady} from './personal-transfer-policy.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {admissionKeys} from './admission-state.mjs';

const writes=new Set(['savePlanetMarket','sellToPlanetMarket']);
export const planetMarketCommands=['galacticMarkets','galacticEconomyAdmin','preparePlanetMarket','savePlanetMarket','preparePlanetSale','sellToPlanetMarket'];
const config=['portId','itemId','commodityCode','marketState','shopId','offerId','demand','enabled','recordRevision','reason'];
const fields={galacticMarkets:[],galacticEconomyAdmin:[],preparePlanetMarket:config,savePlanetMarket:[...config,'confirmation'],preparePlanetSale:['marketId','lotId','quantity'],sellToPlanetMarket:['marketId','lotId','quantity','confirmation']};
const active=s=>{requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');};
export function createPlanetMarketService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(writes.has(action)?['requestId']:[])]);
  const at=now(),eventId=uuid(),admin=['galacticEconomyAdmin','preparePlanetMarket','savePlanetMarket'].includes(action);
  return store.runTransaction(async tx=>{
   const ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`;
   requireThat(hasItemCircuits(s)&&hasSoShops(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(s.stage!=='ARCHIVED'&&!s.campaignSealed,'SESSION_CLOSED');
   if(!admin)requireThat(isBroker(c),'FORBIDDEN');
   const markets=await tx.list(`${base}/planetMarkets`),ports=await tx.list(`${base}/ports`),items=await tx.list(`${base}/items`),book=await readPriceBook(tx,s,at);
   const history=await tx.list(`${base}/planetPriceHistory`);
   const op=writes.has(action)?`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`:null,fingerprint=hash(JSON.stringify([action,input]));
   if(op){const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===version,'FORBIDDEN');return old.result;}}
   if(action==='galacticMarkets'||action==='galacticEconomyAdmin'){
    const rows=[];for(const m of markets){
     if(!admin&&!m.enabled)continue;
     const item=items.find(i=>i.id===m.itemId),port=ports.find(p=>p.id===m.portId);if(!item||!port)continue;
     const offer=await tx.get(`${base}/shops/${m.shopId}/offers/${m.offerId}`),stock=await tx.get(`${base}/inventory/${shopStockId(m.offerId)}`),account=await tx.get(`${base}/accounts/${shopAccountId(m.shopId)}`);
     const valid=offer?.versionId===s.versionId&&offer.item.id===m.itemId&&offer.shopId===m.shopId&&stock?.ownerType==='SHOP'&&stock.ownerId===m.shopId&&stock.holderId===m.shopId&&stock.location?.kind==='SHOP'&&stock.location.id===m.shopId&&stock.status==='AVAILABLE'&&stock.item.id===m.itemId&&stock.item.revision===offer.item.revision;
     const quote=planetMarketQuote(m,item),trade=commodityTrade(book,item),available=account?.ownerType==='SHOP'&&account.shopId===m.shopId&&account.sessionId===s.id?moneyState(account).available:0;
     const prices=history.filter(h=>h.marketId===m.id&&h.public===true).sort((a,b)=>a.at-b.at||a.revision-b.revision).slice(-30).map(h=>({at:h.at,unitPrice:h.unitPrice,state:h.marketState,revision:h.revision}));
     const local=!admin&&(c.spacePortId??s.transportRules?.homePort)===m.portId;
     const ready=!admin&&s.economyRules?.enabled===true&&s.stage==='EN_JEU'&&!s.safetyStop?.active&&await personalTransferActorReady(tx,planetCommerceSession(s,c.spacePortId??s.transportRules?.homePort),c);
     rows.push({...m,item:publicItem(item),port:{id:port.id,name:port.name},quote,history:prices,previousPrice:prices.length>1?prices.at(-2).unitPrice:null,stock:valid?stock.quantity:0,buybackBudget:available,trade,canBuy:ready&&m.enabled&&valid&&stock.quantity>0&&!trade.blocked&&ordinaryPlanetTrade(m,item,port,s),canSell:ready&&local&&m.enabled&&m.demand>0&&available>0&&!trade.blocked&&ordinaryPlanetTrade(m,item,port,s),...(admin?{stockValid:!!valid}:{})});
    }
    // Project public fields explicitly; configuration reasons and future changes are never returned.
    return {session:{id:s.id,stage:s.stage},admin,currency:currencyView(s.economyRules),markets:rows,stock:admin?[]:(await tx.list(`${base}/inventory`,['ownerId',c.id])).filter(l=>commercialTradeAllowed(l,c.id)&&l.quantity>0).map(l=>({id:l.id,item:publicItem(l.item),quantity:l.quantity,status:l.status,location:l.location})),...(admin?{catalogue:spaceCommodities,ports:ports.map(p=>({id:p.id,name:p.name})),offers:(await Promise.all((await tx.list(`${base}/shops`)).map(async sh=>(await tx.list(`${base}/shops/${sh.id}/offers`)).filter(o=>o.item.usage==='COMMERCIAL').map(o=>({id:o.id,shopId:sh.id,shopName:sh.name,itemId:o.item.id,item:o.item,name:o.name}))))).flat()}:{}),loadedAt:at};
   }
   if(action==='preparePlanetMarket'||action==='savePlanetMarket'){
    requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_CLOSED');requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
    const portId=documentId(input.portId),itemId=documentId(input.itemId),id=planetMarketId(portId,itemId),old=markets.find(m=>m.id===id),port=ports.find(p=>p.id===portId),item=items.find(i=>i.id===itemId);
    requireThat(port?.versionId===s.versionId&&item?.usage==='COMMERCIAL'&&item.kind==='STACKABLE'&&item.versionId===s.versionId&&item.unitVolume===1,'PLANET_MARKET_INVALID');
    const reference=spaceCommodities.find(x=>x.id===input.commodityCode);requireThat(reference&&(reference.legality==='ILLEGAL'?item.legality==='ILLEGAL':item.legality==='LEGAL')&&planetMarketStates[input.marketState]&&typeof input.enabled==='boolean','PLANET_MARKET_INVALID');
    requireThat((old?.revision??0)===input.recordRevision,'STALE_REVISION');
    const shopId=documentId(input.shopId),offerId=documentId(input.offerId),offer=await tx.get(`${base}/shops/${shopId}/offers/${offerId}`),shop=await tx.get(`${base}/shops/${shopId}`);
    requireThat(shop?.versionId===s.versionId&&offer?.versionId===s.versionId&&offer.item.id===itemId&&offer.item.kind===item.kind&&offer.item.legality===item.legality&&offer.item.usage==='COMMERCIAL','PLANET_MARKET_INVALID');
    requireThat(!markets.some(m=>m.id!==id&&(m.offerId===offerId||m.portId===portId&&m.commodityCode===input.commodityCode||m.itemId===itemId&&m.commodityCode!==input.commodityCode)),'PLANET_MARKET_CONFLICT');
    // Do not reinterpret physical stock or paid orders by rebinding a counter to another port.
    requireThat(!old||old.offerId===offerId&&old.shopId===shopId&&old.commodityCode===input.commodityCode,'PLANET_MARKET_CONFLICT');
    const sales=await tx.list(`${base}/lotSales`);requireThat(!sales.some(p=>p.shopId===shopId&&p.item.id===itemId&&p.stockPortId!==portId),'PLANET_MARKET_CONFLICT');
    const after={id,portId,itemId,commodityCode:reference.id,marketState:input.marketState,shopId,offerId,demand:whole(input.demand,'INVALID_QUANTITY'),enabled:input.enabled,revision:(old?.revision??0)+1},reason=moneyText(input.reason),quote=planetMarketQuote({...after,enabled:true},item);
    const result={before:old??null,after,portName:port.name,itemName:item.name,quote,reason,confirmation:hash(JSON.stringify([s.id,s.revision,actor.uid,old??null,after,reason,offer.revision]))};
    if(action==='preparePlanetMarket')return result;requireThat(result.confirmation===input.confirmation,'STALE_REVISION');
    authorizeSpaceOutlaws(tx,s,'PLANET_MARKET');tx.set(`${base}/planetMarkets/${id}`,after);tx.set(`${base}/planetPriceHistory/${eventId}`,{id:eventId,marketId:id,at,revision:after.revision,unitPrice:quote.unitPrice,marketState:after.marketState,public:after.enabled});tx.set(`${base}/audit/${eventId}`,{id:eventId,at,action,actorUid:actor.uid,reason,before:old??null,after});
    const saved={id,revision:after.revision};tx.set(op,{fingerprint,result:saved,at});return saved;
   }
   // Ordinary, local PNJ buyback only. Special salvage tariffs, licences and hidden cargo stay closed.
   active(s);requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');requireThat(await personalTransferActorReady(tx,planetCommerceSession(s,c.spacePortId??s.transportRules?.homePort),c),'OUT_OF_COMBAT');
   const market=markets.find(m=>m.id===documentId(input.marketId));requireThat(market?.enabled,'TRADE_SUSPENDED');
   requireThat((c.spacePortId??s.transportRules?.homePort)===market.portId,'SHIP_NOT_LOCAL');
   const lot=await readLot(tx,s.id,documentId(input.lotId),at),item=items.find(i=>i.id===market.itemId);
   requireThat(ordinaryPlanetTrade(market,item,ports.find(p=>p.id===market.portId),s),'PLANET_TRADE_RESTRICTED');
   requireThat(commercialTradeAllowed(lot,c.id)&&lot.item.id===market.itemId&&ordinaryPlanetCommodity(market,lot.item)&&lot.location.portId===market.portId&&!lot.hiddenCargo?.concealed,'FORBIDDEN');
   requireThat(await planetLotOriginPort(tx,s,lot)===market.portId,'PLANET_IMPORT_REQUIRED');
   requireThat(lot.origin?.kind!=='SALVAGE'&&!lot.salvageId&&!lot.salvageWreckId,'PLANET_SPECIAL_TARIFF');
   requireThat(!commodityTrade(book,item).blocked,'TRADE_SUSPENDED');const quantity=itemQuantity(lot.item,input.quantity);requireThat(lot.status==='AVAILABLE'&&lot.quantity>=quantity,'INSUFFICIENT_STOCK');requireThat(market.demand>=quantity,'PLANET_DEMAND_EXCEEDED');
   const stock=await tx.get(`${base}/inventory/${shopStockId(market.offerId)}`),a=await tx.get(`${base}/accounts/${shopAccountId(market.shopId)}`),b=await tx.get(`${base}/accounts/${accountId(c.id)}`);
   requireThat(stock?.ownerType==='SHOP'&&stock.ownerId===market.shopId&&stock.holderId===market.shopId&&stock.location.kind==='SHOP'&&stock.location.id===market.shopId&&stock.item.id===item.id&&stock.item.revision===lot.item.revision&&stock.status==='AVAILABLE','PLANET_MARKET_INVALID');
   requireThat(a?.ownerType==='SHOP'&&a.shopId===market.shopId&&a.sessionId===s.id&&b?.ownerType==='CHARACTER'&&b.characterId===c.id&&b.sessionId===s.id,'ACCOUNT_UNAVAILABLE');
   const quote=planetMarketQuote(market,item),amount=whole(Number((BigInt(quote.unitPrice)*BigInt(quantity)*85n+50n)/100n),'BALANCE_OVERFLOW');requireThat(amount>0&&moneyState(a).available>=amount,'INSUFFICIENT_FUNDS');moneyState(b);whole(b.balance+amount,'BALANCE_OVERFLOW');whole(stock.quantity+quantity,'INVALID_QUANTITY');
   const result={marketId:market.id,portId:market.portId,item:publicItem(item),quantity,amount,quote,before:lot.quantity,remaining:lot.quantity-quantity,currency:currencyView(s.economyRules),confirmation:hash(JSON.stringify([version,s.revision,market,lot.revision,stock.revision,a.revision,b.revision,quantity,amount]))};
   if(action==='preparePlanetSale')return result;requireThat(input.confirmation===result.confirmation,'STALE_REVISION');
   const an={...a,balance:a.balance-amount,revision:a.revision+1},bn={...b,balance:b.balance+amount,revision:b.revision+1},next={...lot,quantity:lot.quantity-quantity,revision:lot.revision+1},sn={...stock,quantity:stock.quantity+quantity,revision:stock.revision+1};
   authorizeSpaceOutlaws(tx,s,'PLANET_MARKET');tx.set(`${base}/accounts/${a.id}`,an);tx.set(`${base}/accounts/${b.id}`,bn);tx.set(`${base}/inventory/${lot.id}`,next);tx.set(`${base}/inventory/${stock.id}`,sn);tx.set(`${base}/planetMarkets/${market.id}`,{...market,demand:market.demand-quantity,revision:market.revision+1});
   const source={a,name:'Marché planétaire'},recipient={a:b,name:c.public.displayName};writeLedger(tx,s.id,{id:eventId,kind:'SALE',at,actorUid:actor.uid,memo:`Rachat local : ${item.name}`,reason:'Rachat ordinaire à 85 % du cours local',source:accountParty(source),recipient:accountParty(recipient),createdCurrency:0,removedCurrency:0,entries:[accountEntry(a,-amount,an),accountEntry(b,amount,bn)]});
   for(const [before,after] of [[lot,next],[stock,sn]])tx.set(`${base}/inventory/${before.id}/history/${eventId}`,{id:eventId,kind:'PLANET_BUYBACK',at,actorUid:actor.uid,marketId:market.id,sourceLotId:lot.id,destinationLotId:stock.id,quantity,before:lotState(before),after:lotState(after)});
   const saved={id:eventId,amount,quantity,remaining:next.quantity};tx.set(`${base}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,marketId:market.id,result:saved});tx.set(op,{fingerprint,guard:version,result:saved,at});return saved;
  });
 };
}
