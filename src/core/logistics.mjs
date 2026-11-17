import {dockInput,dockLeaseActive,dockEntry} from './dock-state.mjs';
import {hasItemCircuits} from './item-circuits.mjs';
import {planetLotOriginPort,planetCommerceSession} from './planet-market-state.mjs';
import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
import {inventoryHash as hash,readLot,publicLot,personalLot,itemQuantity,lotState,effectiveLot} from './inventory-state.mjs';
import {warehouseStock,storedIn,stockVolume,warehouseInput,warehouseAccess,storageGroups,incomingVolume,incomingTransfers} from './storage-state.mjs';
import {gameTime} from './clock.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';
import {accessAccount,accountEntry,accountParty} from './collective-accounts.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {hasSoGroupStock} from '../shared/space-outlaws-groups.mjs';
import {currencyView,moneyState,moneyText,writeLedger} from './economy-state.mjs';

const writes=['saveWarehouse','rentWarehouse','moveWarehouseStock','releaseWarehouse','openLaserRecharge'];
export const logisticsCommands=[...writes,'warehouseAdmin','warehouses','warehouseDetail','prepareWarehouseRent','prepareWarehouseMove','prepareWarehouseRelease','prepareLaserRecharge'];
export const logisticsAction=a=>logisticsCommands.includes(a);
const stockActions=new Set(['warehouseAdmin','saveWarehouse','warehouses','warehouseDetail','prepareWarehouseMove','moveWarehouseStock']);
const warehouseActions=new Set([...stockActions,'prepareWarehouseRent','rentWarehouse','prepareWarehouseRelease','releaseWarehouse']);
const stockLot=lot=>lot.transferable!==false&&!lot.boardingCustody;
const positive=(v,code)=>{whole(v,code);requireThat(v>0,code);return v;};
const movement=l=>({...lotState(l),location:l.location,ownerType:l.ownerType??'CHARACTER',ownerId:l.ownerId,holderId:l.holderId});
const publicWarehouse=(w,access,time)=>({...(w.commercialStorage?{commercialStorage:true,portId:w.portId}:{}),id:w.id,name:w.name,description:w.description,capacity:w.capacity,rent:w.rent,periodMinutes:w.periodMinutes,...(w.dock?{dock:{mode:w.dock.mode,securityTier:w.dock.securityTier},owned:w.dock.mode==='OWN'&&!!w.tenantId}:{}),enabled:w.enabled,revision:w.revision,
  rented:!!w.tenantId,mine:access.access,remainingMs:access.access&&w.dock?.mode!=='OWN'?Math.max(0,w.expiresAtGameMs-time):null,
  ...(w.groupStock?{groupStock:true,remainingMs:null}:{}),expired:!w.groupStock&&w.dock?.mode!=='OWN'&&access.access&&time>=w.expiresAtGameMs,receivesRent:!!w.rentAccountId,...(access.access?{tenantType:w.tenantType??'CHARACTER',group:access.group?{id:access.group.id,name:access.group.name}:null}:{})});

export function createLogisticsService({store,signed,checkSession,now,uuid,commercialStorage=false}){
  return async(action,actor,input)=>{
    signed(actor);const at=now(),eventId=uuid(),sid=documentId(input.sessionId),base=`sessions/${sid}`;
    return store.runTransaction(async tx=>{
      const admin=['warehouseAdmin','saveWarehouse'].includes(action),ctx=admin?{s:await checkSession(tx,actor,sid)}:await inventoryPlayer(tx,actor,{sessionId:sid});
      const {s:session,c}=ctx,s=commercialStorage&&!admin?planetCommerceSession(session,c.spacePortId??session.transportRules?.homePort):session;requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
      if(commercialStorage){requireThat(hasItemCircuits(s)&&s.spaceOutlaws.logisticsVersion===1&&warehouseActions.has(action),'SO_GAMEPLAY_NOT_OPEN');if(writes.includes(action)||action==='prepareWarehouseMove'){requireThat(!s.campaignSealed&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');requireThat(admin?['BRIEFING','EN_JEU','PAUSE'].includes(s.stage):s.stage==='EN_JEU','SESSION_NOT_RUNNING');}if(writes.includes(action))authorizeSpaceOutlaws(tx,s,'COMMERCIAL_STORAGE');}
      const factionStock=!!s.spaceOutlaws&&warehouseActions.has(action)&&!commercialStorage;
      if(factionStock){
        requireThat(hasSoGroupStock(s)&&stockActions.has(action),'SO_GAMEPLAY_NOT_OPEN');
        if(!admin)requireThat(c.birth?.versionId&&c.birth.versionId===s.versionId&&!c.survival?.dead&&!c.successorId,'FORBIDDEN');
        if(writes.includes(action)||action==='prepareWarehouseMove'){
          requireThat(!s.campaignSealed,'SESSION_CLOSED');
          requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
          requireThat(admin?['BRIEFING','EN_JEU','PAUSE'].includes(s.stage):s.stage==='EN_JEU','SESSION_NOT_RUNNING');
        }
      }
      const groups=admin?[]:storageGroups(s,await tx.list(`${base}/groups`),c.id,{factionStock:factionStock||commercialStorage});
      if(!admin)ctx.localVersion=ctx.version;
      if(!admin)ctx.version=hash(JSON.stringify([ctx.version,s.modules?.groups===true,groups]));
      if(commercialStorage&&['prepareWarehouseMove','moveWarehouseStock'].includes(action)){const local=await tx.get(`${base}/warehouses/${documentId(input.warehouseId)}`);if(local?.dock)await dockEntry(tx,{...ctx,version:ctx.localVersion},local,at);}
      let op,fingerprint;
      if(writes.includes(action)){
        op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`;fingerprint=hash(JSON.stringify([...(commercialStorage?['COMMERCIAL_STORAGE']:[]),action,input]));const old=await tx.get(op);
        if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===ctx.version,'FORBIDDEN');return old.result;}
      }
      const audit=(result,extra={})=>{
        tx.set(`${base}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,...extra});
        tx.set(op,{fingerprint,result,guard:ctx.version??null,at});return result;
      };
      if(action==='warehouseAdmin'){
        const [warehouses,inventory,characters,accounts,events,allGroups]=await Promise.all([tx.list(`${base}/warehouses`),tx.list(`${base}/inventory`),tx.list(`${base}/characters`),tx.list(`${base}/accounts`),tx.list(`${base}/logisticsHistory`,null,{orderBy:'at',direction:'desc',limit:50}),tx.list(`${base}/groups`)]);
        const time=gameTime(s.clock,at),awaitedMarkets=commercialStorage?(await tx.list(`${base}/planetMarkets`)).filter(m=>m.enabled):[];
        const visibleWarehouses=commercialStorage?warehouses.filter(w=>w.commercialStorage):factionStock?warehouses.filter(w=>w.groupStock):warehouses;
        const groupOptions=factionStock?allGroups.filter(g=>g.roster&&!g.roster.archived).map(g=>({id:g.id,name:g.name})):null;
        const ports=commercialStorage?(await tx.list(`${base}/ports`)).filter(p=>p.versionId===s.versionId&&(awaitedMarkets.some(m=>m.portId===p.id)||warehouses.some(w=>w.commercialStorage&&w.portId===p.id))):[];
        return {session:{id:sid,stage:s.stage,revision:s.revision},...(commercialStorage?{commercialStorage:true,canConfigure:!s.campaignSealed&&!s.safetyStop?.active&&['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),priceWarnings:visibleWarehouses.filter(w=>w.dock).flatMap(w=>visibleWarehouses.filter(other=>other.dock&&other.id!==w.id&&other.portId===w.portId&&other.capacity===w.capacity&&other.dock.mode===w.dock.mode&&other.periodMinutes===w.periodMinutes&&other.dock.securityTier<w.dock.securityTier&&other.rent>=w.rent).map(other=>`${w.name} (N${w.dock.securityTier}) doit être plus chère que ${other.name} (N${other.dock.securityTier}) à conditions comparables.`)),intrusionTargets:(await tx.list(`${base}/fieldTargets`)).filter(t=>t.kind==='INTRUSION'&&t.publicationState==='PUBLISHED').map(t=>({id:t.id,name:t.title,minLevel:t.intrusion.minLevel})),ports:ports.map(p=>({id:p.id,name:p.name}))}:{}),...(factionStock?{factionStock:true,groupOptions,canConfigure:!s.campaignSealed&&!s.safetyStop?.active&&['BRIEFING','EN_JEU','PAUSE'].includes(s.stage)}:{}),currency:s.economyRules?currencyView(s.economyRules):null,
          warehouses:visibleWarehouses.map(w=>({...w,used:stockVolume(inventory.filter(l=>storedIn(l,w.id)&&l.quantity>0&&!['CONSUMED','DESTROYED'].includes(l.status))),tenantName:(w.tenantType==='GROUP'?allGroups.find(g=>g.id===w.tenantId)?.name:characters.find(c=>c.id===w.tenantId)?.public.displayName)??null,remainingMs:w.tenantId&&!w.groupStock?Math.max(0,w.expiresAtGameMs-time):null})),
          accounts:accounts.filter(a=>a.ownerType==='GROUP'&&a.status==='ACTIVE').map(a=>({id:a.id,name:a.label})),events:factionStock?events.filter(e=>visibleWarehouses.some(w=>w.id===e.warehouseId)):events};
      }
      if(action==='saveWarehouse'){
        requireThat(s.revision===input.revision,'STALE_REVISION');
        const id=input.warehouseId?documentId(input.warehouseId):eventId,old=await tx.get(`${base}/warehouses/${id}`);
        if(input.warehouseId)requireThat(old&&old.revision===input.warehouseRevision,'STALE_REVISION');
        let groupId=null,portId=null;if(commercialStorage){portId=documentId(input.portId);const p=await tx.get(`${base}/ports/${portId}`);requireThat(p?.versionId===s.versionId&&(old?.commercialStorage===true||(await tx.list(`${base}/planetMarkets`)).some(m=>m.enabled&&m.portId===portId)),'MAP_DESTINATION_UNAVAILABLE');requireThat(!old||old.commercialStorage===true&&old.portId===portId,'INVALID_WAREHOUSE');}
        if(factionStock){
          requireThat(input.rent==null&&input.periodMinutes==null&&input.rentAccountId==null,'INVALID_WAREHOUSE');
          groupId=documentId(input.groupId);
          const group=await tx.get(`${base}/groups/${groupId}`);
          requireThat(group?.roster&&!group.roster.archived,'INVALID_GROUP_ROSTER');
          requireThat(!old||old.groupStock===true&&old.tenantId===groupId,'INVALID_WAREHOUSE');
        }
        const dock=commercialStorage?dockInput(input.dock,old?.dock):null;requireThat(!dock||old?.dock||!old?.tenantId,'DOCK_TITLE_LOCKED');
        if(dock?.intrusionTargetId){const target=await tx.get(`${base}/fieldTargets/${dock.intrusionTargetId}`);requireThat(target?.publicationState==='PUBLISHED'&&target.kind==='INTRUSION'&&target.intrusion?.minLevel===dock.securityTier,'INVALID_DOCK');const siblings=await tx.list(`${base}/warehouses`);requireThat(!siblings.some(w=>w.id!==id&&w.dock?.intrusionTargetId===dock.intrusionTargetId),'INVALID_DOCK');}
        const config=warehouseInput(dock?.mode==='OWN'?{...input,periodMinutes:1}:input,id,old??{},{assigned:factionStock});if(dock?.mode==='OWN')config.periodMinutes=null;
        const rentAccountId=input.rentAccountId?documentId(input.rentAccountId):null;
        if(rentAccountId){const a=await tx.get(`${base}/accounts/${rentAccountId}`);requireThat(a?.sessionId===sid&&a.ownerType==='GROUP','INVALID_ACCOUNT');moneyState(a);}
        requireThat(stockVolume(await warehouseStock(tx,sid,id))+await incomingVolume(tx,sid,id)<=config.capacity,'WAREHOUSE_FULL');
        const next=factionStock?{...config,groupStock:true,tenantType:'GROUP',tenantId:groupId,expiresAtGameMs:null}:
          {...config,...(commercialStorage?{commercialStorage:true,portId,...(dock?{dock}:{})}:{}),rentAccountId,tenantType:old?.tenantType??'CHARACTER',tenantId:old?.tenantId??null,expiresAtGameMs:old?.expiresAtGameMs??null};
        if(factionStock)authorizeSpaceOutlaws(tx,s,'GROUP_STOCK_CONFIG');
        const reason=moneyText(input.reason);tx.set(`${base}/warehouses/${id}`,next);if(dock&&s.spaceOutlaws)authorizeSpaceOutlaws(tx,s,'DOCK_CONFIG');tx.set(base,{...s,...(dock&&s.spaceOutlaws?{spaceOutlaws:{...s.spaceOutlaws,dockStorageVersion:1}}:{}),revision:s.revision+1});
        tx.set(`${base}/logisticsHistory/${eventId}`,{id:eventId,at,kind:'CONFIGURE',warehouseId:id,name:next.name,actorUid:actor.uid,reason,before:old,after:next});
        return audit({id,revision:next.revision},{warehouseId:id,reason});
      }
      const commercialPorts=commercialStorage?await tx.list(`${base}/ports`):[];
      const time=gameTime(s.clock,at),canMove=s.stage==='EN_JEU'&&(!(factionStock||commercialStorage)||!s.safetyStop?.active&&!s.campaignSealed)&&canGameAction(s,c,'transfer');
      if(action==='warehouses')return {session:{id:sid,stage:s.stage},...(commercialStorage?{commercialStorage:true}:{}),...(factionStock?{factionStock:true}:{}),character:{id:c.id,name:c.public.displayName},currency:s.economyRules?currencyView(s.economyRules):null,
        canRent:!factionStock&&canMove&&canGameAction(s,c,'pay')&&s.economyRules?.enabled===true,warehouses:(await tx.list(`${base}/warehouses`)).map(w=>({w,access:warehouseAccess(w,c.id,groups)})).filter(({w,access})=>commercialStorage?w.commercialStorage===true&&(w.enabled||access.access):factionStock?w.groupStock===true&&access.access:w.enabled||access.access).map(({w,access})=>({...publicWarehouse(w,access,time),...(commercialStorage?{portName:commercialPorts.find(p=>p.id===w.portId)?.name??w.name}:{})}))};

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

      const wid=documentId(input.warehouseId),w=await tx.get(`${base}/warehouses/${wid}`);
      requireThat(w,factionStock?'FORBIDDEN':'WAREHOUSE_UNAVAILABLE');if(commercialStorage)requireThat(w.commercialStorage===true&&(w.tenantType==='CHARACTER'||!!w.dock),'FORBIDDEN');
      const access=warehouseAccess(w,c.id,groups),viewWarehouse={...publicWarehouse(w,access,time),...(commercialStorage?{portName:commercialPorts.find(p=>p.id===w.portId)?.name??w.name}:{})};
      if(factionStock)requireThat(w.groupStock===true&&access.access,'FORBIDDEN');
      if(action==='warehouseDetail'){
        let entryOpen=true;if(w.dock){try{await dockEntry(tx,{...ctx,version:ctx.localVersion},w,at);}catch(e){if(!['LOCAL_CREDENTIAL_REQUIRED','LOCAL_SCAN_REQUIRED','LOCAL_TERMINAL_CLOSED','DOCK_NOT_LOCAL','LOCAL_SKILL_REQUIRED'].includes(e.code))throw e;entryOpen=false;}}
        requireThat(w.enabled||access.access,'WAREHOUSE_UNAVAILABLE');
        const stock=entryOpen&&(factionStock||w.dock?access.read:access.access)?await warehouseStock(tx,sid,wid):[];
        const bag=access.deposit?(await tx.list(`${base}/inventory`,['ownerId',c.id])).map(l=>effectiveLot(l,at)).filter(l=>(commercialStorage?l.ownerType==='CHARACTER'&&l.ownerId===c.id&&l.location.kind==='COMMERCIAL'&&l.location.id===c.id&&l.location.portId===w.portId&&l.item.usage==='COMMERCIAL'&&!l.transportContractId&&!l.cargoTransferId&&!l.boardingCustody&&!l.hiddenCargo?.concealed&&!l.customsDetention:personalLot(l,c.id))&&l.status==='AVAILABLE'&&l.quantity>0&&(!factionStock||stockLot(l))).map(publicLot):[];
        const rentChoices=factionStock?[]:w.tenantId?(access.manage?[{type:w.tenantType??'CHARACTER',id:w.tenantId,name:access.group?.name??c.public.displayName}]:[]):[{type:'CHARACTER',id:c.id,name:c.public.displayName},...groups.filter(g=>(!commercialStorage||w.dock)&&g.permissions.manageStorage).map(g=>({type:'GROUP',id:g.id,name:g.name}))];
        return {session:{id:sid,stage:s.stage},...(commercialStorage?{commercialStorage:true}:{}),currency:s.economyRules?currencyView(s.economyRules):null,warehouse:viewWarehouse,used:entryOpen&&(factionStock||w.dock?access.read:access.access)?stockVolume(stock):null,incoming:entryOpen&&(factionStock||w.dock?access.read:access.access)?await incomingVolume(tx,sid,wid):null,stock:access.read?stock.filter(l=>!w.dock||l.ownerType==='CHARACTER'&&l.ownerId===c.id).map(publicLot):[],bag,canReadStock:access.read&&entryOpen,...(w.dock?{entryOpen}:{}),rentChoices,
          canMove:entryOpen&&access.withdraw&&canMove,canDeposit:entryOpen&&access.deposit&&canMove&&w.enabled&&(factionStock||dockLeaseActive(w,time)),canRelease:w.dock?.mode!=='OWN'&&access.manage&&canMove&&stock.length===0&&(await incomingTransfers(tx,sid,wid)).length===0,canRent:!(w.dock?.mode==='OWN'&&w.tenantId)&&!factionStock&&canMove&&canGameAction(s,c,'pay')&&s.economyRules?.enabled===true&&w.enabled&&rentChoices.length>0};
      }
      requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'transfer');
      if(['prepareWarehouseRent','rentWarehouse'].includes(action)){
        requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');requireGameAction(s,c,'pay');
        const tenantType=input.tenantType??'CHARACTER';if(commercialStorage&&!w.dock)requireThat(tenantType==='CHARACTER','FORBIDDEN');requireThat(['CHARACTER','GROUP'].includes(tenantType),'INVALID_WAREHOUSE');
        const tenantId=tenantType==='GROUP'?documentId(input.groupId):c.id,group=tenantType==='GROUP'?groups.find(g=>g.id===tenantId):null;
        if(tenantType==='GROUP')requireThat(group?.permissions.manageStorage,'FORBIDDEN');
        requireThat(w.dock?.mode!=='OWN'||!w.tenantId,'DOCK_ALREADY_OWNED');
        requireThat(w.enabled&&(!w.tenantId||(w.tenantId===tenantId&&(w.tenantType??'CHARACTER')===tenantType)),'WAREHOUSE_UNAVAILABLE');
        const from=await accessAccount(tx,{...ctx,guard:ctx.version},input.fromAccountId,{allowSoGroup:commercialStorage});requireThat(from.spend,'FORBIDDEN');
        const recipient=w.rentAccountId?await tx.get(`${base}/accounts/${w.rentAccountId}`):null;
        if(w.rentAccountId){requireThat(recipient?.sessionId===sid&&recipient.ownerType==='GROUP','ACCOUNT_UNAVAILABLE');moneyState(recipient);requireThat(recipient.id!==from.a.id,'INVALID_RECIPIENT');whole(recipient.balance+w.rent,'BALANCE_OVERFLOW');}
        requireThat(moneyState(from.a).available>=w.rent,'INSUFFICIENT_FUNDS');
        const tenant={type:tenantType,id:tenantId,name:group?.name??c.public.displayName};
        const view={warehouse:viewWarehouse,tenant,amount:w.rent,periodMinutes:w.periodMinutes,source:accountParty(from),currency:currencyView(s.economyRules),renewal:!!w.tenantId};
        // Time is deliberately excluded: consent binds the tariff and paid duration, not a moving countdown.
        const confirmation=hash(JSON.stringify([sid,ctx.version,w,tenant,from.guard,from.a.revision,recipient?.revision??null,s.healthRules,s.economyRules]));
        if(action==='prepareWarehouseRent')return {...view,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');
        const expiresAtGameMs=w.dock?.mode==='OWN'?null:whole(Math.max(time,w.expiresAtGameMs??time)+w.periodMinutes*60000,'STORAGE_OVERFLOW');
        const next={...w,tenantType,tenantId,expiresAtGameMs,revision:w.revision+1};
        if(w.rent>0){
          const paid={...from.a,balance:from.a.balance-w.rent,revision:from.a.revision+1},entries=[accountEntry(from.a,-w.rent,paid)];
          tx.set(`${base}/accounts/${paid.id}`,paid);
          if(recipient){const credited={...recipient,balance:recipient.balance+w.rent,revision:recipient.revision+1};entries.push(accountEntry(recipient,w.rent,credited));tx.set(`${base}/accounts/${credited.id}`,credited);}
          writeLedger(tx,sid,{id:eventId,at,kind:w.dock?.mode==='OWN'?'DOCK_PURCHASE':'WAREHOUSE_RENT',actorUid:actor.uid,memo:`Location · ${w.name}`,createdCurrency:0,removedCurrency:recipient?0:w.rent,source:accountParty(from),recipient:recipient?{id:recipient.id,kind:'GROUP',name:'Exploitant de l’entrepôt'}:null,warehouseId:wid,entries});
        }
        tx.set(`${base}/warehouses/${wid}`,next);tx.set(`${base}/logisticsHistory/${eventId}`,{id:eventId,at,kind:w.dock?.mode==='OWN'?'PURCHASE':'RENT',warehouseId:wid,name:w.name,tenant,characterId:c.id,characterName:c.public.displayName,amount:w.rent,periodMinutes:w.periodMinutes,expiresAtGameMs,actorUid:actor.uid});
        return audit({id:wid,expiresAtGameMs},{warehouseId:wid,characterId:c.id,amount:w.rent});
      }
      requireThat(access.access,'FORBIDDEN');
      const stock=await warehouseStock(tx,sid,wid);
      if(['prepareWarehouseRelease','releaseWarehouse'].includes(action)){
        requireThat(access.manage,'FORBIDDEN');requireThat(w.dock?.mode!=='OWN','DOCK_TITLE_LOCKED');
        requireThat(stock.length===0&&(await incomingTransfers(tx,sid,wid)).length===0,'WAREHOUSE_NOT_EMPTY');const confirmation=hash(JSON.stringify([sid,ctx.version,w]));
        if(action==='prepareWarehouseRelease')return {name:w.name,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');
        tx.set(`${base}/warehouses/${wid}`,{...w,tenantType:'CHARACTER',tenantId:null,expiresAtGameMs:null,revision:w.revision+1});
        tx.set(`${base}/logisticsHistory/${eventId}`,{id:eventId,at,kind:'RELEASE',warehouseId:wid,name:w.name,characterId:c.id,characterName:c.public.displayName,actorUid:actor.uid});
        return audit({id:wid},{warehouseId:wid,characterId:c.id});
      }
      if(w.dock)await dockEntry(tx,{...ctx,version:ctx.localVersion},w,at);
      requireThat(['DEPOSIT','WITHDRAW'].includes(input.direction),'INVALID_WAREHOUSE');
      const deposit=input.direction==='DEPOSIT',lot=await readLot(tx,sid,documentId(input.lotId),at);
      requireThat(deposit?access.deposit:access.withdraw,'FORBIDDEN');
      const collective=w.tenantType==='GROUP'&&!w.dock;
      if(commercialStorage){requireThat(lot?.ownerType==='CHARACTER'&&lot.ownerId===c.id&&lot.item.usage==='COMMERCIAL'&&!lot.transportContractId&&!lot.cargoTransferId&&!lot.boardingCustody&&!lot.hiddenCargo?.concealed&&!lot.customsDetention&&!lot.fieldActionId,'FORBIDDEN');if(deposit)requireThat(lot.location.kind==='COMMERCIAL'&&lot.location.id===c.id&&lot.location.portId===w.portId&&await planetLotOriginPort(tx,s,lot)===w.portId,'PLANET_IMPORT_REQUIRED');}
      requireThat(lot&&(deposit?(commercialStorage?lot.location.kind==='COMMERCIAL'&&lot.location.portId===w.portId:personalLot(lot,c.id)):storedIn(lot,wid)&&(collective?lot.ownerType==='GROUP'&&lot.ownerId===w.tenantId&&lot.holderId===null:lot.ownerType!=='GROUP'&&lot.ownerId===c.id&&lot.holderId===c.id)),'FORBIDDEN');
      if(factionStock)requireThat(stockLot(lot),'FORBIDDEN');
      requireThat(lot.status==='AVAILABLE','INSUFFICIENT_STOCK');const quantity=itemQuantity(lot.item,input.quantity);requireThat(lot.quantity>=quantity,'INSUFFICIENT_STOCK');
      const volume=stockVolume([{...lot,quantity}]),used=stockVolume(stock),afterVolume=deposit?whole(used+volume,'STORAGE_OVERFLOW'):used-volume;
      if(deposit){requireThat(w.enabled,'WAREHOUSE_UNAVAILABLE');requireThat(factionStock||dockLeaseActive(w,time),'WAREHOUSE_EXPIRED');requireThat(afterVolume+await incomingVolume(tx,sid,wid)<=w.capacity,'WAREHOUSE_FULL');}
      const view={warehouseName:w.name,lotId:lot.id,name:lot.item.name,quantity,direction:input.direction,volume,...(factionStock&&!access.read?{}:{used,afterVolume}),capacity:w.capacity,ownershipTransfer:collective?{from:deposit?c.public.displayName:access.group.name,to:deposit?access.group.name:c.public.displayName}:null};
      const confirmation=hash(JSON.stringify([sid,ctx.version,w,lot,view,s.healthRules]));
      if(action==='prepareWarehouseMove')return {...view,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');
      if(factionStock)authorizeSpaceOutlaws(tx,s,'GROUP_STOCK_MOVE');
      const entire=quantity===lot.quantity,movedId=entire?lot.id:eventId,location={kind:deposit?'WAREHOUSE':commercialStorage?'COMMERCIAL':'CHARACTER',id:deposit?wid:c.id,...(!deposit&&commercialStorage?{portId:w.portId}:{})};
      const moved={...lot,id:movedId,quantity,location,ownerType:deposit&&collective?'GROUP':'CHARACTER',ownerId:deposit&&collective?w.tenantId:c.id,holderId:deposit&&collective?null:c.id,revision:entire?lot.revision+1:1,...(!entire?{createdAt:at,origin:{kind:'STORAGE_SPLIT',parentLotId:lot.id,rootLotId:lot.origin?.rootLotId??lot.id}}:{})};
      const remaining=entire?moved:{...lot,quantity:lot.quantity-quantity,revision:lot.revision+1};
      const event={id:eventId,at,kind:input.direction,warehouseId:wid,warehouseName:w.name,actorUid:actor.uid,characterId:c.id,characterName:c.public.displayName,name:lot.item.name,quantity,volume,before:movement(lot),after:movement(remaining),movedLotId:movedId,moved:movement(moved),ownershipTransfer:view.ownershipTransfer,reason:collective?`Transfert de propriété : ${view.ownershipTransfer.from} → ${view.ownershipTransfer.to}`:commercialStorage?'Déplacement entre le stock commercial et l’entrepôt du même port':'Déplacement entre le sac et l’entrepôt personnel'};
      tx.set(`${base}/inventory/${lot.id}`,remaining);tx.set(`${base}/inventory/${lot.id}/history/${eventId}`,event);
      if(!entire){tx.set(`${base}/inventory/${movedId}`,moved);tx.set(`${base}/inventory/${movedId}/history/${eventId}`,{...event,before:null,after:movement(moved),sourceLotId:lot.id});}
      tx.set(`${base}/warehouses/${wid}`,{...w,revision:w.revision+1});tx.set(`${base}/logisticsHistory/${eventId}`,event);
      return audit({id:movedId,warehouseId:wid,quantity,direction:input.direction},{warehouseId:wid,lotId:lot.id,quantity,direction:input.direction});
    });
  };
}
