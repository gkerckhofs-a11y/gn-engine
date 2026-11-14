import {planetCommerceSession} from './planet-market-state.mjs';
import {receivedItemLocation} from './item-circuits.mjs';
import {canGameAction} from './health-state.mjs';

// Both paid purchases and contract rewards use the same native custody rules.
export function shopCustody(s,p,buyer,lot,at){
 const custody=(p.item.usage!=='COMMERCIAL'||p.stockPortId!=null&&(buyer.c?.spacePortId??s.transportRules?.homePort)===p.stockPortId)&&buyer.active&&!!lot&&lot.ownerType==='CHARACTER'&&lot.ownerId===p.buyerId&&lot.holderId===p.shopId&&lot.location.kind==='SHOP'&&lot.location.id===p.shopId&&lot.status==='AVAILABLE'&&lot.quantity===p.quantity;
 const ready=custody&&p.pickupStatus==='READY'&&p.pickupLotRevision===lot.revision&&p.pickupBuyerVersion===buyer.version;
 return {custody,ready,allowed:custody&&s.stage==='EN_JEU'&&!s.safetyStop?.active&&canGameAction(p.planetMarketId?planetCommerceSession(s,p.stockPortId):s,buyer.c,'transfer',at)};
}
export function receivedShopLot(lot,buyerId,portId=null){return {...lot,holderId:buyerId,location:receivedItemLocation(lot.item,buyerId,portId),revision:lot.revision+1};}
