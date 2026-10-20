import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
import {inventoryHash as hash,readLot,publicLot,personalLot,itemQuantity,lotState,effectiveLot} from './inventory-state.mjs';
import {warehouseStock,storedIn,stockVolume} from './storage-state.mjs';
import {gameTime} from './clock.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';
import {accessAccount,accountEntry,accountParty} from './collective-accounts.mjs';
import {currencyView,moneyState,moneyText,writeLedger} from './economy-state.mjs';

const writes=['saveWarehouse','rentWarehouse','moveWarehouseStock','releaseWarehouse','openLaserRecharge'];
export const logisticsCommands=[...writes,'warehouseAdmin','warehouses','warehouseDetail','prepareWarehouseRent','prepareWarehouseMove','prepareWarehouseRelease','prepareLaserRecharge'];
export const logisticsAction=a=>logisticsCommands.includes(a);
const positive=(v,code)=>{whole(v,code);requireThat(v>0,code);return v;};
const movement=l=>({...lotState(l),location:l.location,ownerId:l.ownerId,holderId:l.holderId});
const publicWarehouse=(w,cid,time)=>({id:w.id,name:w.name,description:w.description,capacity:w.capacity,rent:w.rent,periodMinutes:w.periodMinutes,enabled:w.enabled,revision:w.revision,
  rented:!!w.tenantId,mine:w.tenantId===cid,remainingMs:w.tenantId===cid?Math.max(0,w.expiresAtGameMs-time):null,
  expired:w.tenantId===cid&&time>=w.expiresAtGameMs,receivesRent:!!w.rentAccountId});

export function createLogisticsService({store,signed,checkSession,now,uuid}){
  return async(action,actor,input)=>{
    signed(actor);const at=now(),eventId=uuid(),sid=documentId(input.sessionId),base=`sessions/${sid}`;
    return store.runTransaction(async tx=>{
      const admin=['warehouseAdmin','saveWarehouse'].includes(action),ctx=admin?{s:await checkSession(tx,actor,sid)}:await inventoryPlayer(tx,actor,{sessionId:sid});
      const {s,c}=ctx;requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
      let op,fingerprint;
      if(writes.includes(action)){
        op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`;fingerprint=hash(JSON.stringify([action,input]));const old=await tx.get(op);
        if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===ctx.version,'FORBIDDEN');return old.result;}
      }
      const audit=(result,extra={})=>{
        tx.set(`${base}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,...extra});
        tx.set(op,{fingerprint,result,guard:ctx.version??null,at});return result;
      };
      if(action==='warehouseAdmin'){
        const [warehouses,inventory,characters,accounts,events]=await Promise.all([tx.list(`${base}/warehouses`),tx.list(`${base}/inventory`),tx.list(`${base}/characters`),tx.list(`${base}/accounts`),tx.list(`${base}/logisticsHistory`,null,{orderBy:'at',direction:'desc',limit:50})]);
        const time=gameTime(s.clock,at);
        return {session:{id:sid,stage:s.stage,revision:s.revision},currency:s.economyRules?currencyView(s.economyRules):null,
          warehouses:warehouses.map(w=>({...w,used:stockVolume(inventory.filter(l=>storedIn(l,w.id)&&l.quantity>0&&!['CONSUMED','DESTROYED'].includes(l.status))),tenantName:characters.find(c=>c.id===w.tenantId)?.public.displayName??null,remainingMs:w.tenantId?Math.max(0,w.expiresAtGameMs-time):null})),
          accounts:accounts.filter(a=>a.ownerType==='GROUP'&&a.status==='ACTIVE').map(a=>({id:a.id,name:a.label})),events};
      }
      if(action==='saveWarehouse'){
        requireThat(s.revision===input.revision,'STALE_REVISION');
        const id=input.warehouseId?documentId(input.warehouseId):eventId,old=await tx.get(`${base}/warehouses/${id}`);
        if(input.warehouseId)requireThat(old&&old.revision===input.warehouseRevision,'STALE_REVISION');
        requireThat(typeof input.enabled==='boolean','INVALID_WAREHOUSE');
        const capacity=positive(input.capacity,'INVALID_WAREHOUSE'),rent=whole(input.rent,'INVALID_WAREHOUSE'),periodMinutes=positive(input.periodMinutes,'INVALID_WAREHOUSE');whole(periodMinutes*60000,'INVALID_WAREHOUSE');
        const rentAccountId=input.rentAccountId?documentId(input.rentAccountId):null;
        if(rentAccountId){const a=await tx.get(`${base}/accounts/${rentAccountId}`);requireThat(a?.sessionId===sid&&a.ownerType==='GROUP','INVALID_ACCOUNT');moneyState(a);}
        requireThat(stockVolume(await warehouseStock(tx,sid,id))<=capacity,'WAREHOUSE_FULL');
        const description=input.description??'';requireThat(typeof description==='string'&&description.length<=4000,'INVALID_WAREHOUSE');
        const next={id,name:moneyText(input.name,150),description:description.trim(),capacity,rent,periodMinutes,rentAccountId,enabled:input.enabled,tenantId:old?.tenantId??null,expiresAtGameMs:old?.expiresAtGameMs??null,revision:(old?.revision??0)+1};
        const reason=moneyText(input.reason);tx.set(`${base}/warehouses/${id}`,next);tx.set(base,{...s,revision:s.revision+1});
        tx.set(`${base}/logisticsHistory/${eventId}`,{id:eventId,at,kind:'CONFIGURE',warehouseId:id,name:next.name,actorUid:actor.uid,reason,before:old,after:next});
        return audit({id,revision:next.revision},{warehouseId:id,reason});
      }
      const time=gameTime(s.clock,at),canMove=s.stage==='EN_JEU'&&canGameAction(s,c,'transfer');
      if(action==='warehouses')return {session:{id:sid,stage:s.stage},character:{id:c.id,name:c.public.displayName},currency:s.economyRules?currencyView(s.economyRules):null,
        canRent:canMove&&canGameAction(s,c,'pay')&&s.economyRules?.enabled===true,warehouses:(await tx.list(`${base}/warehouses`)).filter(w=>w.enabled||w.tenantId===c.id).map(w=>publicWarehouse(w,c.id,time))};

      if(['prepareLaserRecharge','openLaserRecharge'].includes(action)){
        requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'transfer');
        const lot=await readLot(tx,sid,documentId(input.lotId),at);
        requireThat(lot&&personalLot(lot,c.id)&&lot.item.consumable&&lot.item.laserRecharge,'INVALID_RECHARGE');
        const quantity=itemQuantity(lot.item,input.quantity);requireThat(lot.status==='AVAILABLE'&&lot.quantity>=quantity,'INSUFFICIENT_STOCK');
        const pellets=whole(quantity*positive(lot.item.laserRecharge.pelletsPerUnit,'INVALID_RECHARGE'),'INVALID_RECHARGE');
        const view={lotId:lot.id,name:lot.item.name,quantity,pellets,remaining:lot.quantity-quantity};
        const confirmation=hash(JSON.stringify([sid,ctx.version,lot,view,s.healthRules]));
        if(action==='prepareLaserRecharge')return {...view,confirmation};
        requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.opened===true,'RECHARGE_CONFIRMATION_REQUIRED');
        const next={...lot,quantity:view.remaining,status:view.remaining===0?'CONSUMED':'AVAILABLE',revision:lot.revision+1};
        const event={id:eventId,at,kind:'LASER_RECHARGE',actorUid:actor.uid,characterId:c.id,characterName:c.public.displayName,lotId:lot.id,name:lot.item.name,quantity,pellets,before:movement(lot),after:movement(next),reason:'Ouverture physique de recharges confirmée par le joueur'};
        tx.set(`${base}/inventory/${lot.id}`,next);tx.set(`${base}/inventory/${lot.id}/history/${eventId}`,event);tx.set(`${base}/logisticsHistory/${eventId}`,event);
        return audit({id:eventId,lotId:lot.id,quantity,pellets},{lotId:lot.id,quantity,pellets});
      }

      const wid=documentId(input.warehouseId),w=await tx.get(`${base}/warehouses/${wid}`);requireThat(w,'WAREHOUSE_UNAVAILABLE');
      if(action==='warehouseDetail'){
        requireThat(w.enabled||w.tenantId===c.id,'WAREHOUSE_UNAVAILABLE');
        const mine=w.tenantId===c.id,stock=mine?await warehouseStock(tx,sid,wid):[];
        const bag=mine?(await tx.list(`${base}/inventory`,['ownerId',c.id])).map(l=>publicLot(effectiveLot(l,at))).filter(l=>personalLot(l,c.id)&&l.status==='AVAILABLE'&&l.quantity>0):[];
        return {session:{id:sid,stage:s.stage},currency:s.economyRules?currencyView(s.economyRules):null,warehouse:publicWarehouse(w,c.id,time),used:mine?stockVolume(stock):null,stock:stock.map(publicLot),bag,
          canMove:mine&&canMove,canDeposit:mine&&canMove&&w.enabled&&time<w.expiresAtGameMs,canRent:canMove&&canGameAction(s,c,'pay')&&s.economyRules?.enabled===true&&w.enabled&&(!w.tenantId||mine)};
      }
      requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'transfer');
      if(['prepareWarehouseRent','rentWarehouse'].includes(action)){
        requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');requireGameAction(s,c,'pay');requireThat(w.enabled&&(!w.tenantId||w.tenantId===c.id),'WAREHOUSE_UNAVAILABLE');
        const from=await accessAccount(tx,{...ctx,guard:ctx.version},input.fromAccountId);requireThat(from.spend,'FORBIDDEN');
        const recipient=w.rentAccountId?await tx.get(`${base}/accounts/${w.rentAccountId}`):null;
        if(w.rentAccountId){requireThat(recipient?.sessionId===sid&&recipient.ownerType==='GROUP','ACCOUNT_UNAVAILABLE');moneyState(recipient);requireThat(recipient.id!==from.a.id,'INVALID_RECIPIENT');whole(recipient.balance+w.rent,'BALANCE_OVERFLOW');}
        requireThat(moneyState(from.a).available>=w.rent,'INSUFFICIENT_FUNDS');
        const view={warehouse:publicWarehouse(w,c.id,time),amount:w.rent,periodMinutes:w.periodMinutes,source:accountParty(from),currency:currencyView(s.economyRules),renewal:!!w.tenantId};
        // Time is deliberately excluded: consent binds the tariff and paid duration, not a moving countdown.
        const confirmation=hash(JSON.stringify([sid,ctx.version,w,from.guard,from.a.revision,recipient?.revision??null,s.healthRules,s.economyRules]));
        if(action==='prepareWarehouseRent')return {...view,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');
        const expiresAtGameMs=whole(Math.max(time,w.expiresAtGameMs??time)+w.periodMinutes*60000,'STORAGE_OVERFLOW');
        const next={...w,tenantId:c.id,expiresAtGameMs,revision:w.revision+1};
        if(w.rent>0){
          const paid={...from.a,balance:from.a.balance-w.rent,revision:from.a.revision+1},entries=[accountEntry(from.a,-w.rent,paid)];
          tx.set(`${base}/accounts/${paid.id}`,paid);
          if(recipient){const credited={...recipient,balance:recipient.balance+w.rent,revision:recipient.revision+1};entries.push(accountEntry(recipient,w.rent,credited));tx.set(`${base}/accounts/${credited.id}`,credited);}
          writeLedger(tx,sid,{id:eventId,at,kind:'WAREHOUSE_RENT',actorUid:actor.uid,memo:`Location · ${w.name}`,createdCurrency:0,removedCurrency:recipient?0:w.rent,source:accountParty(from),recipient:recipient?{id:recipient.id,kind:'GROUP',name:'Exploitant de l’entrepôt'}:null,warehouseId:wid,entries});
        }
        tx.set(`${base}/warehouses/${wid}`,next);tx.set(`${base}/logisticsHistory/${eventId}`,{id:eventId,at,kind:'RENT',warehouseId:wid,name:w.name,characterId:c.id,characterName:c.public.displayName,amount:w.rent,periodMinutes:w.periodMinutes,expiresAtGameMs,actorUid:actor.uid});
        return audit({id:wid,expiresAtGameMs},{warehouseId:wid,characterId:c.id,amount:w.rent});
      }
      requireThat(w.tenantId===c.id,'FORBIDDEN');
      const stock=await warehouseStock(tx,sid,wid);
      if(['prepareWarehouseRelease','releaseWarehouse'].includes(action)){
        requireThat(stock.length===0,'WAREHOUSE_NOT_EMPTY');const confirmation=hash(JSON.stringify([sid,ctx.version,w]));
        if(action==='prepareWarehouseRelease')return {name:w.name,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');
        tx.set(`${base}/warehouses/${wid}`,{...w,tenantId:null,expiresAtGameMs:null,revision:w.revision+1});
        tx.set(`${base}/logisticsHistory/${eventId}`,{id:eventId,at,kind:'RELEASE',warehouseId:wid,name:w.name,characterId:c.id,characterName:c.public.displayName,actorUid:actor.uid});
        return audit({id:wid},{warehouseId:wid,characterId:c.id});
      }
      requireThat(['DEPOSIT','WITHDRAW'].includes(input.direction),'INVALID_WAREHOUSE');
      const deposit=input.direction==='DEPOSIT',lot=await readLot(tx,sid,documentId(input.lotId),at);
      requireThat(lot&&lot.ownerId===c.id&&lot.holderId===c.id&&(deposit?personalLot(lot,c.id):storedIn(lot,wid)),'FORBIDDEN');
      requireThat(lot.status==='AVAILABLE','INSUFFICIENT_STOCK');const quantity=itemQuantity(lot.item,input.quantity);requireThat(lot.quantity>=quantity,'INSUFFICIENT_STOCK');
      const volume=stockVolume([{...lot,quantity}]),used=stockVolume(stock),afterVolume=deposit?whole(used+volume,'STORAGE_OVERFLOW'):used-volume;
      if(deposit){requireThat(w.enabled,'WAREHOUSE_UNAVAILABLE');requireThat(time<w.expiresAtGameMs,'WAREHOUSE_EXPIRED');requireThat(afterVolume<=w.capacity,'WAREHOUSE_FULL');}
      const view={warehouseName:w.name,lotId:lot.id,name:lot.item.name,quantity,direction:input.direction,volume,used,afterVolume,capacity:w.capacity};
      const confirmation=hash(JSON.stringify([sid,ctx.version,w,lot,view,s.healthRules]));
      if(action==='prepareWarehouseMove')return {...view,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');
      const entire=quantity===lot.quantity,movedId=entire?lot.id:eventId,location={kind:deposit?'WAREHOUSE':'CHARACTER',id:deposit?wid:c.id};
      const moved={...lot,id:movedId,quantity,location,revision:entire?lot.revision+1:1,...(!entire?{createdAt:at,origin:{kind:'STORAGE_SPLIT',parentLotId:lot.id,rootLotId:lot.origin?.rootLotId??lot.id}}:{})};
      const remaining=entire?moved:{...lot,quantity:lot.quantity-quantity,revision:lot.revision+1};
      const event={id:eventId,at,kind:input.direction,warehouseId:wid,warehouseName:w.name,actorUid:actor.uid,characterId:c.id,characterName:c.public.displayName,name:lot.item.name,quantity,volume,before:movement(lot),after:movement(remaining),movedLotId:movedId};
      tx.set(`${base}/inventory/${lot.id}`,remaining);tx.set(`${base}/inventory/${lot.id}/history/${eventId}`,event);
      if(!entire){tx.set(`${base}/inventory/${movedId}`,moved);tx.set(`${base}/inventory/${movedId}/history/${eventId}`,{...event,before:null,after:movement(moved),sourceLotId:lot.id});}
      tx.set(`${base}/warehouses/${wid}`,{...w,revision:w.revision+1});tx.set(`${base}/logisticsHistory/${eventId}`,event);
      return audit({id:movedId,warehouseId:wid,quantity,direction:input.direction},{warehouseId:wid,lotId:lot.id,quantity,direction:input.direction});
    });
  };
}
