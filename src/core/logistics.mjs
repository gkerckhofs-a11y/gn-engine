import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
import {inventoryHash as hash,readLot,publicLot,personalLot,itemQuantity,lotState,effectiveLot} from './inventory-state.mjs';
import {warehouseStock,storedIn,stockVolume,warehouseInput,warehouseAccess,storageGroups,incomingVolume,incomingTransfers} from './storage-state.mjs';
import {gameTime} from './clock.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';
import {accessAccount,accountEntry,accountParty} from './collective-accounts.mjs';
import {currencyView,moneyState,moneyText,writeLedger} from './economy-state.mjs';

const writes=['saveWarehouse','rentWarehouse','moveWarehouseStock','releaseWarehouse','openLaserRecharge'];
export const logisticsCommands=[...writes,'warehouseAdmin','warehouses','warehouseDetail','prepareWarehouseRent','prepareWarehouseMove','prepareWarehouseRelease','prepareLaserRecharge'];
export const logisticsAction=a=>logisticsCommands.includes(a);
const positive=(v,code)=>{whole(v,code);requireThat(v>0,code);return v;};
const movement=l=>({...lotState(l),location:l.location,ownerType:l.ownerType??'CHARACTER',ownerId:l.ownerId,holderId:l.holderId});
const publicWarehouse=(w,access,time)=>({id:w.id,name:w.name,description:w.description,capacity:w.capacity,rent:w.rent,periodMinutes:w.periodMinutes,enabled:w.enabled,revision:w.revision,
  rented:!!w.tenantId,mine:access.access,remainingMs:access.access?Math.max(0,w.expiresAtGameMs-time):null,
  expired:access.access&&time>=w.expiresAtGameMs,receivesRent:!!w.rentAccountId,...(access.access?{tenantType:w.tenantType??'CHARACTER',group:access.group?{id:access.group.id,name:access.group.name}:null}:{})});

export function createLogisticsService({store,signed,checkSession,now,uuid}){
  return async(action,actor,input)=>{
    signed(actor);const at=now(),eventId=uuid(),sid=documentId(input.sessionId),base=`sessions/${sid}`;
    return store.runTransaction(async tx=>{
      const admin=['warehouseAdmin','saveWarehouse'].includes(action),ctx=admin?{s:await checkSession(tx,actor,sid)}:await inventoryPlayer(tx,actor,{sessionId:sid});
      const {s,c}=ctx;requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
      const groups=admin?[]:storageGroups(s,await tx.list(`${base}/groups`),c.id);
      if(!admin)ctx.version=hash(JSON.stringify([ctx.version,s.modules?.groups===true,groups]));
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
        const [warehouses,inventory,characters,accounts,events,allGroups]=await Promise.all([tx.list(`${base}/warehouses`),tx.list(`${base}/inventory`),tx.list(`${base}/characters`),tx.list(`${base}/accounts`),tx.list(`${base}/logisticsHistory`,null,{orderBy:'at',direction:'desc',limit:50}),tx.list(`${base}/groups`)]);
        const time=gameTime(s.clock,at);
        return {session:{id:sid,stage:s.stage,revision:s.revision},currency:s.economyRules?currencyView(s.economyRules):null,
          warehouses:warehouses.map(w=>({...w,used:stockVolume(inventory.filter(l=>storedIn(l,w.id)&&l.quantity>0&&!['CONSUMED','DESTROYED'].includes(l.status))),tenantName:(w.tenantType==='GROUP'?allGroups.find(g=>g.id===w.tenantId)?.name:characters.find(c=>c.id===w.tenantId)?.public.displayName)??null,remainingMs:w.tenantId?Math.max(0,w.expiresAtGameMs-time):null})),
          accounts:accounts.filter(a=>a.ownerType==='GROUP'&&a.status==='ACTIVE').map(a=>({id:a.id,name:a.label})),events};
      }
      if(action==='saveWarehouse'){
        requireThat(s.revision===input.revision,'STALE_REVISION');
        const id=input.warehouseId?documentId(input.warehouseId):eventId,old=await tx.get(`${base}/warehouses/${id}`);
        if(input.warehouseId)requireThat(old&&old.revision===input.warehouseRevision,'STALE_REVISION');
        const config=warehouseInput(input,id,old??{});
        const rentAccountId=input.rentAccountId?documentId(input.rentAccountId):null;
        if(rentAccountId){const a=await tx.get(`${base}/accounts/${rentAccountId}`);requireThat(a?.sessionId===sid&&a.ownerType==='GROUP','INVALID_ACCOUNT');moneyState(a);}
        requireThat(stockVolume(await warehouseStock(tx,sid,id))+await incomingVolume(tx,sid,id)<=config.capacity,'WAREHOUSE_FULL');
        const next={...config,rentAccountId,tenantType:old?.tenantType??'CHARACTER',tenantId:old?.tenantId??null,expiresAtGameMs:old?.expiresAtGameMs??null};
        const reason=moneyText(input.reason);tx.set(`${base}/warehouses/${id}`,next);tx.set(base,{...s,revision:s.revision+1});
        tx.set(`${base}/logisticsHistory/${eventId}`,{id:eventId,at,kind:'CONFIGURE',warehouseId:id,name:next.name,actorUid:actor.uid,reason,before:old,after:next});
        return audit({id,revision:next.revision},{warehouseId:id,reason});
      }
      const time=gameTime(s.clock,at),canMove=s.stage==='EN_JEU'&&canGameAction(s,c,'transfer');
      if(action==='warehouses')return {session:{id:sid,stage:s.stage},character:{id:c.id,name:c.public.displayName},currency:s.economyRules?currencyView(s.economyRules):null,
        canRent:canMove&&canGameAction(s,c,'pay')&&s.economyRules?.enabled===true,warehouses:(await tx.list(`${base}/warehouses`)).map(w=>({w,access:warehouseAccess(w,c.id,groups)})).filter(({w,access})=>w.enabled||access.access).map(({w,access})=>publicWarehouse(w,access,time))};

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
      const access=warehouseAccess(w,c.id,groups),viewWarehouse=publicWarehouse(w,access,time);
      if(action==='warehouseDetail'){
        requireThat(w.enabled||access.access,'WAREHOUSE_UNAVAILABLE');
        const stock=access.access?await warehouseStock(tx,sid,wid):[];
        const bag=access.deposit?(await tx.list(`${base}/inventory`,['ownerId',c.id])).map(l=>publicLot(effectiveLot(l,at))).filter(l=>personalLot(l,c.id)&&l.status==='AVAILABLE'&&l.quantity>0):[];
        const rentChoices=w.tenantId?(access.manage?[{type:w.tenantType??'CHARACTER',id:w.tenantId,name:access.group?.name??c.public.displayName}]:[]):[{type:'CHARACTER',id:c.id,name:c.public.displayName},...groups.filter(g=>g.permissions.manageStorage).map(g=>({type:'GROUP',id:g.id,name:g.name}))];
        return {session:{id:sid,stage:s.stage},currency:s.economyRules?currencyView(s.economyRules):null,warehouse:viewWarehouse,used:access.access?stockVolume(stock):null,incoming:access.access?await incomingVolume(tx,sid,wid):null,stock:access.read?stock.map(publicLot):[],bag,canReadStock:access.read,rentChoices,
          canMove:access.withdraw&&canMove,canDeposit:access.deposit&&canMove&&w.enabled&&time<w.expiresAtGameMs,canRelease:access.manage&&canMove&&stock.length===0&&(await incomingTransfers(tx,sid,wid)).length===0,canRent:canMove&&canGameAction(s,c,'pay')&&s.economyRules?.enabled===true&&w.enabled&&rentChoices.length>0};
      }
      requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'transfer');
      if(['prepareWarehouseRent','rentWarehouse'].includes(action)){
        requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');requireGameAction(s,c,'pay');
        const tenantType=input.tenantType??'CHARACTER';requireThat(['CHARACTER','GROUP'].includes(tenantType),'INVALID_WAREHOUSE');
        const tenantId=tenantType==='GROUP'?documentId(input.groupId):c.id,group=tenantType==='GROUP'?groups.find(g=>g.id===tenantId):null;
        if(tenantType==='GROUP')requireThat(group?.permissions.manageStorage,'FORBIDDEN');
        requireThat(w.enabled&&(!w.tenantId||(w.tenantId===tenantId&&(w.tenantType??'CHARACTER')===tenantType)),'WAREHOUSE_UNAVAILABLE');
        const from=await accessAccount(tx,{...ctx,guard:ctx.version},input.fromAccountId);requireThat(from.spend,'FORBIDDEN');
        const recipient=w.rentAccountId?await tx.get(`${base}/accounts/${w.rentAccountId}`):null;
        if(w.rentAccountId){requireThat(recipient?.sessionId===sid&&recipient.ownerType==='GROUP','ACCOUNT_UNAVAILABLE');moneyState(recipient);requireThat(recipient.id!==from.a.id,'INVALID_RECIPIENT');whole(recipient.balance+w.rent,'BALANCE_OVERFLOW');}
        requireThat(moneyState(from.a).available>=w.rent,'INSUFFICIENT_FUNDS');
        const tenant={type:tenantType,id:tenantId,name:group?.name??c.public.displayName};
        const view={warehouse:viewWarehouse,tenant,amount:w.rent,periodMinutes:w.periodMinutes,source:accountParty(from),currency:currencyView(s.economyRules),renewal:!!w.tenantId};
        // Time is deliberately excluded: consent binds the tariff and paid duration, not a moving countdown.
        const confirmation=hash(JSON.stringify([sid,ctx.version,w,tenant,from.guard,from.a.revision,recipient?.revision??null,s.healthRules,s.economyRules]));
        if(action==='prepareWarehouseRent')return {...view,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');
        const expiresAtGameMs=whole(Math.max(time,w.expiresAtGameMs??time)+w.periodMinutes*60000,'STORAGE_OVERFLOW');
        const next={...w,tenantType,tenantId,expiresAtGameMs,revision:w.revision+1};
        if(w.rent>0){
          const paid={...from.a,balance:from.a.balance-w.rent,revision:from.a.revision+1},entries=[accountEntry(from.a,-w.rent,paid)];
          tx.set(`${base}/accounts/${paid.id}`,paid);
          if(recipient){const credited={...recipient,balance:recipient.balance+w.rent,revision:recipient.revision+1};entries.push(accountEntry(recipient,w.rent,credited));tx.set(`${base}/accounts/${credited.id}`,credited);}
          writeLedger(tx,sid,{id:eventId,at,kind:'WAREHOUSE_RENT',actorUid:actor.uid,memo:`Location · ${w.name}`,createdCurrency:0,removedCurrency:recipient?0:w.rent,source:accountParty(from),recipient:recipient?{id:recipient.id,kind:'GROUP',name:'Exploitant de l’entrepôt'}:null,warehouseId:wid,entries});
        }
        tx.set(`${base}/warehouses/${wid}`,next);tx.set(`${base}/logisticsHistory/${eventId}`,{id:eventId,at,kind:'RENT',warehouseId:wid,name:w.name,tenant,characterId:c.id,characterName:c.public.displayName,amount:w.rent,periodMinutes:w.periodMinutes,expiresAtGameMs,actorUid:actor.uid});
        return audit({id:wid,expiresAtGameMs},{warehouseId:wid,characterId:c.id,amount:w.rent});
      }
      requireThat(access.access,'FORBIDDEN');
      const stock=await warehouseStock(tx,sid,wid);
      if(['prepareWarehouseRelease','releaseWarehouse'].includes(action)){
        requireThat(access.manage,'FORBIDDEN');
        requireThat(stock.length===0&&(await incomingTransfers(tx,sid,wid)).length===0,'WAREHOUSE_NOT_EMPTY');const confirmation=hash(JSON.stringify([sid,ctx.version,w]));
        if(action==='prepareWarehouseRelease')return {name:w.name,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');
        tx.set(`${base}/warehouses/${wid}`,{...w,tenantType:'CHARACTER',tenantId:null,expiresAtGameMs:null,revision:w.revision+1});
        tx.set(`${base}/logisticsHistory/${eventId}`,{id:eventId,at,kind:'RELEASE',warehouseId:wid,name:w.name,characterId:c.id,characterName:c.public.displayName,actorUid:actor.uid});
        return audit({id:wid},{warehouseId:wid,characterId:c.id});
      }
      requireThat(['DEPOSIT','WITHDRAW'].includes(input.direction),'INVALID_WAREHOUSE');
      const deposit=input.direction==='DEPOSIT',lot=await readLot(tx,sid,documentId(input.lotId),at);
      requireThat(deposit?access.deposit:access.withdraw,'FORBIDDEN');
      const collective=w.tenantType==='GROUP';
      requireThat(lot&&(deposit?personalLot(lot,c.id):storedIn(lot,wid)&&(collective?lot.ownerType==='GROUP'&&lot.ownerId===w.tenantId&&lot.holderId===null:lot.ownerType!=='GROUP'&&lot.ownerId===c.id&&lot.holderId===c.id)),'FORBIDDEN');
      requireThat(lot.status==='AVAILABLE','INSUFFICIENT_STOCK');const quantity=itemQuantity(lot.item,input.quantity);requireThat(lot.quantity>=quantity,'INSUFFICIENT_STOCK');
      const volume=stockVolume([{...lot,quantity}]),used=stockVolume(stock),afterVolume=deposit?whole(used+volume,'STORAGE_OVERFLOW'):used-volume;
      if(deposit){requireThat(w.enabled,'WAREHOUSE_UNAVAILABLE');requireThat(time<w.expiresAtGameMs,'WAREHOUSE_EXPIRED');requireThat(afterVolume+await incomingVolume(tx,sid,wid)<=w.capacity,'WAREHOUSE_FULL');}
      const view={warehouseName:w.name,lotId:lot.id,name:lot.item.name,quantity,direction:input.direction,volume,used,afterVolume,capacity:w.capacity,ownershipTransfer:collective?{from:deposit?c.public.displayName:access.group.name,to:deposit?access.group.name:c.public.displayName}:null};
      const confirmation=hash(JSON.stringify([sid,ctx.version,w,lot,view,s.healthRules]));
      if(action==='prepareWarehouseMove')return {...view,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');
      const entire=quantity===lot.quantity,movedId=entire?lot.id:eventId,location={kind:deposit?'WAREHOUSE':'CHARACTER',id:deposit?wid:c.id};
      const moved={...lot,id:movedId,quantity,location,ownerType:deposit&&collective?'GROUP':'CHARACTER',ownerId:deposit&&collective?w.tenantId:c.id,holderId:deposit&&collective?null:c.id,revision:entire?lot.revision+1:1,...(!entire?{createdAt:at,origin:{kind:'STORAGE_SPLIT',parentLotId:lot.id,rootLotId:lot.origin?.rootLotId??lot.id}}:{})};
      const remaining=entire?moved:{...lot,quantity:lot.quantity-quantity,revision:lot.revision+1};
      const event={id:eventId,at,kind:input.direction,warehouseId:wid,warehouseName:w.name,actorUid:actor.uid,characterId:c.id,characterName:c.public.displayName,name:lot.item.name,quantity,volume,before:movement(lot),after:movement(remaining),movedLotId:movedId,moved:movement(moved),ownershipTransfer:view.ownershipTransfer,reason:collective?`Transfert de propriété : ${view.ownershipTransfer.from} → ${view.ownershipTransfer.to}`:'Déplacement entre le sac et l’entrepôt personnel'};
      tx.set(`${base}/inventory/${lot.id}`,remaining);tx.set(`${base}/inventory/${lot.id}/history/${eventId}`,event);
      if(!entire){tx.set(`${base}/inventory/${movedId}`,moved);tx.set(`${base}/inventory/${movedId}/history/${eventId}`,{...event,before:null,after:movement(moved),sourceLotId:lot.id});}
      tx.set(`${base}/warehouses/${wid}`,{...w,revision:w.revision+1});tx.set(`${base}/logisticsHistory/${eventId}`,event);
      return audit({id:movedId,warehouseId:wid,quantity,direction:input.direction},{warehouseId:wid,lotId:lot.id,quantity,direction:input.direction});
    });
  };
}
