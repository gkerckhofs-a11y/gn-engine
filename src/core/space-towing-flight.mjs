import {isDeepStrictEqual} from 'node:util';
import {requireThat} from './validation.mjs';
import {hasTowingFlights,activeModuleOutages} from './space-module-flight.mjs';
import {inventoryParty} from './inventory-transfers.mjs';
import {stockVolume,warehouseStock} from './storage-state.mjs';
import {spaceShipProfiles} from '../shared/space-outlaws-navigation.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';

const allowed=new Set(['shipNavigation','prepareVoyage','departShip','finishSoPreparation','cancelSoNavigation','cancelSoNavigationAdmin','continueSoVoyage','arriveShip','arriveSoShipAdmin']);
// One native voyage, one unmanned wreck; no parallel movement/event engine.
export async function towingFlightContext(tx,s,ship,action,time){
 if(!ship?.towingAttachment)return null;
 requireThat(hasTowingFlights(s),'TOWING_FLIGHT_NOT_OPEN');requireThat(allowed.has(action),'TOWING_ACTION_NOT_OPEN');
 const a=ship.towingAttachment;if(a.role==='WRECK'&&action==='shipNavigation')return null;requireThat(a.version===1&&a.role==='TUG','TOWING_WRECK_NOT_PILOTABLE');
 const base=`sessions/${s.id}`,wreck=await tx.get(`${base}/ships/${a.otherShipId}`),r=await tx.get(`${base}/shipMaintenance/${a.workId}`),b=r?.binding;
 requireThat(r?.towingAttachmentVersion===1&&['TOWING_ATTACHED','TOWING_ARRIVED'].includes(r.status)&&b?.shipId===ship.id&&b.wreckId===wreck?.id&&a.lotId===b.lotId,'TOWING_RESERVATION');
 requireThat(isDeepStrictEqual(a,{version:1,workId:r.id,role:'TUG',otherShipId:wreck.id,lotId:b.lotId})&&isDeepStrictEqual(wreck.towingAttachment,{version:1,workId:r.id,role:'WRECK',otherShipId:ship.id,lotId:b.lotId})&&ship.maintenanceId===r.id&&wreck.maintenanceId===r.id,'TOWING_RESERVATION');
 requireThat(ship.ownerId===b.shipOwnerId&&wreck.ownerId===b.wreckOwnerId&&ship.ownerType==='CHARACTER'&&wreck.ownerType==='CHARACTER','TOWING_WORK_STALE');
 requireThat(wreck.enabled&&wreck.hull===0&&!wreck.journey&&!wreck.operation&&!wreck.combatId&&!wreck.rescueId&&!wreck.convoy&&!wreck.convoyOffer&&!wreck.ambushId,'TOWING_SHIPS_BUSY');
 requireThat(spaceShipProfiles.some(p=>p.id===wreck.soProfile?.id&&p.size===wreck.soProfile.size)&&ship.soProfile.size>=wreck.soProfile.size&&ship.soProfile.size>=2&&wreck.portId===ship.portId,'TOWING_INCOMPATIBLE');
 const transit=ship.journey?.towing;
 if(transit)requireThat(transit.workId===r.id&&transit.wreckId===wreck.id&&transit.lotId===b.lotId&&wreck.towingTransit?.journeyId===ship.journey.id&&!wreck.docked,'TOWING_RESERVATION');
 else requireThat(!wreck.towingTransit&&wreck.docked&&ship.docked,'TOWING_RESERVATION');
 const owners=[];for(const o of b.owners)owners.push({...o,current:await inventoryParty(tx,s.id,o.id)});
 const lot=await tx.get(`${base}/inventory/${b.lotId}`),transfers=await tx.list(`${base}/cargoTransfers`),stock=await warehouseStock(tx,s.id,wreck.id,'HOLD');
 const confirmationState={record:r,wreck,lot,owners:owners.map(o=>({id:o.id,active:o.current.active,version:o.current.version})),transfers:transfers.filter(t=>t.status==='LOADING'&&[t.source,t.destination].some(p=>p.kind==='HOLD'&&[ship.id,wreck.id].includes(p.id))),stock};
 return {r,b,wreck,lot,owners,confirmationState,time};
}
export function validateTowingConsent(x){if(x)requireThat(x.owners.every(o=>o.current.active&&o.current.version===o.version)&&x.b.owners.every(o=>x.r.approvals.includes(o.id)),'TOWING_WORK_STALE');}
export function validateTowingDeparture(s,ship,x){
 if(!x)return;
 const {r,b,wreck,lot,owners,time,confirmationState}=x;
 requireThat(r.status==='TOWING_ATTACHED'&&!r.towingJourneyId,'TOWING_WORK_CLOSED');
 validateTowingConsent(x);
 const m=ship.modules?.find(m=>m.lotId===b.lotId&&m.code==='MOD-05'&&m.size===ship.soProfile.size&&m.status==='OPERATIONAL');
 requireThat(m&&!activeModuleOutages(ship,time).some(n=>n.lotId===m.lotId),'TOWING_MODULE_UNAVAILABLE');
 requireThat(lot?.status==='INSTALLED'&&!lot.fieldActionId&&!lot.cargoTransferId&&!lot.transportContractId&&lot.quantity===1&&(lot.ownerType??'CHARACTER')==='CHARACTER'&&lot.ownerId===ship.ownerId&&lot.holderId===ship.id&&lot.location?.kind==='SHIP_MODULE'&&lot.location.id===ship.id&&lot.item?.shipModule?.code==='MOD-05'&&lot.item.shipModule.size===m.size,'MODULE_LOT_UNAVAILABLE');
 requireThat(!ship.convoy&&!ship.convoyOffer&&!ship.ambushId&&!ship.pirateAlliance&&!wreck.pirateAlliance,'TOWING_ACTION_NOT_OPEN');
 requireThat(!confirmationState.transfers.length&&confirmationState.stock.every(l=>['AVAILABLE','SEIZED'].includes(l.status))&&stockVolume(confirmationState.stock)<=wreck.capacity,'CARGO_TRANSFERS_OPEN');
}
export function towingRoute(route,x){if(!x)return route;requireThat(route.riskId==='SECURED','TOWING_ROUTE_NOT_OPEN');return {...route,fuelCost:route.fuelCost*2};}
export function towingEvent(event,x,fuel){if(!x)return event;const required=2*(event.fuelCost+event.fuelDebt);return {...event,fuelCost:Math.min(fuel,required),fuelDebt:Math.max(0,required-fuel)};}
export function departTowedWreck(tx,s,x,journey,at){
 if(!x)return;authorizeSpaceOutlaws(tx,s,'TOWING_FLIGHT');const base=`sessions/${s.id}`,{wreck,r}=x;
 tx.set(`${base}/ships/${wreck.id}`,{...wreck,docked:false,towingTransit:{journeyId:journey.id,fromPort:journey.fromPort,toPort:journey.toPort},revision:wreck.revision+1});
 tx.set(`${base}/shipMaintenance/${r.id}`,{...r,towingJourneyId:journey.id,revision:r.revision+1});
 tx.set(`${base}/logisticsHistory/${journey.id}-tow`,{id:`${journey.id}-tow`,kind:'TOWING_DEPARTURE',workId:r.id,journeyId:journey.id,shipId:r.binding.shipId,wreckId:wreck.id,at});
}
export function arriveTowedWreck(tx,s,x,journey,at){
 if(!x)return;requireThat(journey.towing&&x.r.towingJourneyId===journey.id,'TOWING_RESERVATION');authorizeSpaceOutlaws(tx,s,'TOWING_FLIGHT');const base=`sessions/${s.id}`,{towingTransit,...wreck}=x.wreck;
 tx.set(`${base}/ships/${wreck.id}`,{...wreck,docked:true,portId:journey.toPort,revision:wreck.revision+1});
 tx.set(`${base}/shipMaintenance/${x.r.id}`,{...x.r,status:'TOWING_ARRIVED',currentPortId:journey.toPort,arrivedAt:at,revision:x.r.revision+1});
 tx.set(`${base}/logisticsHistory/${journey.id}-tow-arrival`,{id:`${journey.id}-tow-arrival`,kind:'TOWING_ARRIVAL',workId:x.r.id,journeyId:journey.id,shipId:x.b.shipId,wreckId:wreck.id,at});
}
