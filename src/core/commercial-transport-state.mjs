// Player-owned freight binds to the native contract, cargo and voyage services.
import {requireThat,documentId,whole} from './validation.mjs';
import {inventoryHash as hash,publicLot,itemQuantity} from './inventory-state.mjs';
import {inventoryParty} from './inventory-transfers.mjs';
import {isBroker} from '../shared/player-access.mjs';
import {shipCrewAccess,nativeShipReader,shipPilot,crewOwnerBinding,crewCargoGrant} from './ship-crew-state.mjs';
import {navigationSkill,soRoute} from './space-outlaws-navigation-state.mjs';
import {flightShip} from './space-module-flight.mjs';
import {towingFlightContext,towingRoute} from './space-towing-flight.mjs';
import {warehouseStock,stockVolume} from './storage-state.mjs';
import {gameTime} from './clock.mjs';
export const commercialTransportEnabled=s=>s.spaceOutlaws?.transportVersion===1&&s.spaceOutlaws.itemCircuitsVersion===1&&s.spaceOutlaws.missionsVersion===1;
export const commercialSource=t=>t.commercial?{kind:'COMMERCIAL',id:t.commercial.clientId,portId:t.fromPort}:{kind:'SHOP',id:t.shopId};
export const sameTransportPlace=(a,b)=>a?.kind===b?.kind&&a?.id===b?.id&&(a?.kind!=='COMMERCIAL'||a.portId===b.portId);
export const commercialClient=(c,ctx,actor)=>!!(c?.commercialClient&&ctx.c?.id===c.commercialClient.id&&actor.uid===c.commercialClient.uid&&ctx.version===c.commercialClient.version);
export async function commercialStock(tx,s,request){
 requireThat(commercialTransportEnabled(s),'SO_GAMEPLAY_NOT_OPEN');
 const client=await inventoryParty(tx,s.id,request.client.id);requireThat(client.active&&client.version===request.client.version&&client.c.assignedUid===request.client.uid&&isBroker(client.c),'STALE_CONTRACT');
 const lot=await tx.get(`sessions/${s.id}/inventory/${documentId(request.lotId)}`);
 requireThat(lot?.ownerType==='CHARACTER'&&lot.ownerId===client.c.id&&lot.location?.kind==='COMMERCIAL'&&lot.location.id===client.c.id&&lot.location.portId===request.fromPort&&lot.item.usage==='COMMERCIAL'&&lot.transferable===true&&lot.resellable===true&&!lot.protectedOrigin&&!lot.transportContractId&&!lot.cargoTransferId&&!lot.hiddenCargo?.concealed&&!lot.boardingCustody&&lot.status==='AVAILABLE','COMMERCIAL_FREIGHT_UNAVAILABLE');
 requireThat(Number.isSafeInteger(lot.item.referenceUnitValueCr)&&lot.item.referenceUnitValueCr>0,'COMMERCIAL_VALUE_REQUIRED');
 const quantity=itemQuantity(lot.item,request.quantity);requireThat(quantity>0&&quantity<=lot.quantity,'INSUFFICIENT_STOCK');
 return {client,lot,quantity,volume:stockVolume([{...lot,quantity}])};
}
const idle=sh=>sh?.soProfile&&sh.enabled&&sh.docked&&!sh.journey&&!sh.operation&&!sh.combatId&&!sh.rescueId&&!sh.maintenanceId&&!sh.ambushId&&!sh.convoy&&!sh.convoyOffer&&sh.hull>0&&!sh.revisionRequired;
export async function commercialCarrier(tx,s,ship,c,at,{transferId=null,read=false}={}){
 const crew=await shipCrewAccess(tx,s,ship,c,at),native=await nativeShipReader(tx,s,ship,c,at);
 const permission=crew.own||crew.active&&crew.permissions.logistics&&(crew.captain&&crew.authority.logistics||native.pilot&&!native.continuation)||ship.ownerType==='GROUP'&&native.pilot&&!native.continuation&&crew.active&&crew.permissions.logistics;
 const continuation=transferId&&(await crewCargoGrant(tx,s,ship,c,at,transferId)).logistics;
 if(!read)requireThat(permission||continuation,'COMMERCIAL_CARRIER_REQUIRED');
 return {allowed:!!permission,continuation:!!continuation,crew,native};
}
export async function commercialQuote(tx,s,request,quote,carrier,at,{contractId=null}={}){
 const x=await commercialStock(tx,s,request),base=`sessions/${s.id}`,time=gameTime(s.clock,at),raw=await tx.get(`${base}/ships/${documentId(quote.shipId)}`);
 requireThat(raw&&idle(raw)&&raw.portId===request.fromPort&&raw.capacity>0,'SO_TRANSPORT_SHIP');
 requireThat(shipPilot(raw),'COMMERCIAL_PILOT_REQUIRED');const access=await commercialCarrier(tx,s,raw,carrier.c,at),operator=await inventoryParty(tx,s.id,shipPilot(raw));
 const pilot=await nativeShipReader(tx,s,raw,operator.c,at);requireThat(operator.active&&!operator.c.survival?.dead&&navigationSkill(operator.c,'PIL-02')>=1&&pilot.pilot&&!pilot.continuation,'FIELD_SKILL_REQUIRED');
 const ship=flightShip(s,raw,time),ports=await tx.list(`${base}/ports`),routes=await tx.list(`${base}/routes`),codes=quote.codes;
 requireThat(Array.isArray(codes)&&codes.length>=1&&codes.length<=12&&codes.every(c=>typeof c==='string'&&c.trim()&&c.length<=80),'COMMERCIAL_ROUTE_CODES_REQUIRED');
 requireThat(codes.length===1||s.spaceOutlaws.escortAmendmentVersion===1,'SO_GAMEPLAY_NOT_OPEN');
 const towing=await towingFlightContext(tx,s,ship,'shipNavigation',time),path=[];let from=request.fromPort;
 for(const code of codes){const found=routes.filter(r=>r.versionId===s.versionId&&r.fromPort===from&&(r.navigationCode===code.trim()||ports.some(p=>p.versionId===s.versionId&&p.id===r.toPort&&p.navigationCode===code.trim())));requireThat(found.length===1,'ROUTE_UNAVAILABLE');const r=found[0],q=towingRoute(soRoute(r,ship),towing,s);requireThat(q.fuelCost+(ship.ownerType==='GROUP'?1:0)<=ship.navigation.tankCapacity&&(ship.ownerType!=='GROUP'||r.riskId==='SECURED'),'ROUTE_UNAVAILABLE');path.push({id:r.id,name:r.name,revision:r.revision,fromPort:r.fromPort,toPort:r.toPort,durationSeconds:q.durationSeconds,fuelCost:q.fuelCost,minimumDepartureFuel:q.fuelCost+(ship.ownerType==='GROUP'?1:0)});from=r.toPort;}
 requireThat(from===request.toPort,'COMMERCIAL_DESTINATION_REQUIRED');
 requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(p=>p.kind==='HOLD'&&p.id===ship.id)),'CARGO_TRANSFERS_OPEN');
 const outstanding=(await tx.list(`${base}/contracts`)).filter(c=>c.id!==contractId&&['ACTIVE','SUBMITTED','REVIEWED','DISPUTED'].includes(c.status)&&c.terms?.transport?.shipId===ship.id),ids=new Set(outstanding.map(c=>c.id));
 const pending=(await tx.list(`${base}/inventory`)).filter(l=>ids.has(l.transportContractId)&&l.quantity>0&&!l.transportDelivered&&!(l.location.kind==='HOLD'&&l.location.id===ship.id));
 requireThat(x.volume+stockVolume(await warehouseStock(tx,s.id,ship.id,'HOLD'))+stockVolume(pending)<=ship.capacity,'WAREHOUSE_FULL');
 const item=publicLot(x.lot).item,value=whole((x.lot.item.referenceUnitValueCr??0)*x.quantity),terms={shipId:ship.id,shipName:ship.name,routeId:path[0].id,routeName:path.map(r=>r.name).join(' → '),fromPort:request.fromPort,toPort:request.toPort,item,quantity:x.quantity,unitValue:x.lot.item.referenceUnitValueCr??0,value,rate:quote.rate,referenceSalary:Math.max(100,value*(quote.rate==='RISK'?15:10)/100),recipient:x.client.c.public.displayName,expenses:quote.expenses,partialDelivery:false,commercial:{clientId:x.client.c.id,sourceLotId:x.lot.id,operatorId:operator.c.id,ownerBinding:hash(crewOwnerBinding(ship)),routeIds:path.map(r=>r.id),routeRevisions:path.map(r=>r.revision)}};
 requireThat(['ORDINARY','RISK'].includes(quote.rate),'SO_TRANSPORT_INVALID');
 return {...x,ship,operator,path,terms,guard:[x.client.version,x.lot.revision,carrier.version,operator.version,ship.revision,access.crew.root?.authorityRevision??0,access.crew.member?.revision??0,...path.map(r=>r.revision)]};
}
export async function commercialOfferAuthority(tx,s,c){
 const a=await tx.get(`sessions/${s.id}/announcements/${c.announcementId}`),t=await tx.get(`sessions/${s.id}/applications/${c.applicationId}`),client=c.commercialClient;
 requireThat(a?.commercialTransport&&client&&a.request.client.id===client.id&&a.request.client.version===client.version&&a.request.client.uid===client.uid&&a.selectedApplicationId===t?.id&&t.contractId===c.id&&t.commercialQuoteHash===c.commercialQuoteHash&&hash(JSON.stringify(t.quote))===c.commercialQuoteHash&&['SENT','DISCUSSION'].includes(t.status)&&a.publication==='PUBLISHED'&&(a.assignedCount??0)<a.places,'STALE_CONTRACT');
 const p=await inventoryParty(tx,s.id,client.id);requireThat(p.active&&p.version===client.version&&p.c.assignedUid===client.uid,'STALE_CONTRACT');return {a,t};
}
export async function commercialAcceptance(tx,s,c,at){
 const {a,t}=await commercialOfferAuthority(tx,s,c),carrier=await inventoryParty(tx,s.id,c.characterId);requireThat(carrier.active&&carrier.version===c.applicantVersion,'STALE_CONTRACT');
 const x=await commercialQuote(tx,s,a.request,t.quote,carrier,at,{contractId:c.id});requireThat(JSON.stringify(x.terms)===JSON.stringify(c.terms.transport),'STALE_CONTRACT');return x;
}
