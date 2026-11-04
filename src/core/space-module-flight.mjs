import {requireThat} from './validation.mjs';
import {installedShipProfile} from '../shared/space-ship-modules.mjs';

// V0.7 chapters 17/19. Functional outage only; the installed lot stays intact.
export const hasModuleFlights=s=>['moduleFlight','moduleRemoval','moduleInstallation','moduleWork','moduleMandates','modulePurchases','navigation','logistics','combat','convoy'].every(k=>s.spaceOutlaws?.[`${k}Version`]===1);
export const hasTowingFlights=s=>['towingFlight','towingAttachment','towingWork'].every(k=>s.spaceOutlaws?.[`${k}Version`]===1)&&hasModuleFlights(s);
export const hasTowingCombat=s=>s.spaceOutlaws?.towingCombatVersion===1&&hasTowingFlights(s);
export const hasHiddenCargo=s=>s.spaceOutlaws?.hiddenCargoVersion===1&&hasModuleFlights(s);
export const activeModuleOutages=(ship,time)=>(ship.moduleNeutralizations??[]).filter(n=>n.untilGameMs>time&&ship.modules?.some(m=>m.lotId===n.lotId));
export function flightShip(s,ship,time){
 if(ship?.wreckSpacePosition||ship?.journey?.releasedTowing)requireThat(hasTowingCombat(s),'TOWING_COMBAT_NOT_OPEN');
 if(ship?.moduleNeutralizations?.length)requireThat(hasModuleFlights(s),'MODULE_FLIGHT_NOT_OPEN');
 if(!ship?.modules?.length||!hasModuleFlights(s))return ship;
 requireThat(installedShipProfile(ship.soProfile,ship.modules,{hiddenCargo:hasHiddenCargo(s),towingProfile:hasTowingFlights(s)}),'INVALID_MODULE_CALIBRATION');
 const off=new Set(activeModuleOutages(ship,time).map(n=>n.lotId)),profile=installedShipProfile(ship.soProfile,ship.modules.filter(m=>!off.has(m.lotId)),{hiddenCargo:hasHiddenCargo(s),towingProfile:hasTowingFlights(s)});
 // Rebuild from the canonical base on every use, including after expiry. Never heal.
 return {...ship,soProfile:profile,hull:Math.min(ship.hull,profile.hullMax),shield:Math.min(ship.shield,profile.shieldMax),...(ship.journey?.towing?{soProfile:{...profile,maneuverability:Math.max(0,profile.maneuverability-1)}}:{})};
}
export const eligibleFlightModules=(s,ship,time)=>hasModuleFlights(s)?(ship.modules??[]).filter(m=>m.status==='OPERATIONAL'&&!activeModuleOutages(ship,time).some(n=>n.lotId===m.lotId)):[];
export async function validateModuleFlight(tx,s,ship){
 if(!ship.modules?.length)return;
 requireThat(hasModuleFlights(s),'MODULE_FLIGHT_NOT_OPEN');
 requireThat(ship.moduleInstallationVersion===1&&installedShipProfile(ship.soProfile,ship.modules,{hiddenCargo:hasHiddenCargo(s),towingProfile:hasTowingFlights(s)}),'INVALID_MODULE_CALIBRATION');
 requireThat(new Set(ship.modules.map(m=>m.lotId)).size===ship.modules.length,'INVALID_MODULE_CALIBRATION');
 for(const m of ship.modules){
  const lot=await tx.get(`sessions/${s.id}/inventory/${m.lotId}`);
  requireThat(lot?.status==='INSTALLED'&&!lot.fieldActionId&&lot.item?.kind==='INDIVIDUAL'&&!lot.item.consumable&&lot.transferable===true&&lot.resellable===true&&lot.quantity===1&&(lot.ownerType??'CHARACTER')==='CHARACTER'&&lot.ownerId===ship.ownerId&&lot.holderId===ship.id&&lot.location?.kind==='SHIP_MODULE'&&lot.location.id===ship.id&&lot.item?.shipModule?.code===m.code&&lot.item.shipModule.size===m.size,'MODULE_LOT_UNAVAILABLE');
 }
}
export function neutralizeVoyageModule(s,ship,event,time,journeyId){
 if(!event.neutralizedModule)return ship;
 const m=event.neutralizedModule;
 requireThat(eligibleFlightModules(s,ship,time).some(x=>x.lotId===m.lotId&&x.code===m.code),'INVALID_MODULE_CALIBRATION');
 const next={...ship,moduleNeutralizations:[...activeModuleOutages(ship,time),{lotId:m.lotId,code:m.code,journeyId,startedAtGameMs:time,untilGameMs:time+900000}]};
 return flightShip(s,next,time);
}
