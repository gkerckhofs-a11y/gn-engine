import {documentId,requireThat,whole} from './validation.mjs';
import {warehouseAccess} from './storage-state.mjs';

const text=(v,max=150)=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=max,'INVALID_NAVIGATION');return v.trim();};
export const transportRulesInput=v=>({homePort:documentId(v.homePort)});
export function navigationInput(v){
 if(v==null)return null;
 const tankCapacity=whole(v.tankCapacity,'INVALID_NAVIGATION'),initialFuel=whole(v.initialFuel,'INVALID_NAVIGATION');
 requireThat(tankCapacity>0&&initialFuel<=tankCapacity,'INVALID_NAVIGATION');
 return {fuelItemId:documentId(v.fuelItemId),tankCapacity,initialFuel,initialPort:documentId(v.initialPort)};
}
export function shipInput(v,id,old={},allowEmptyHold=false){
 requireThat(['CHARACTER','GROUP'].includes(v.ownerType)&&typeof v.docked==='boolean'&&typeof v.enabled==='boolean','INVALID_SHIP');
 const capacity=whole(v.capacity,'INVALID_SHIP');requireThat(capacity>0||allowEmptyHold&&capacity===0,'INVALID_SHIP');
 requireThat(typeof (v.description??'')==='string'&&(v.description??'').length<=4000,'INVALID_SHIP');
 return {id,name:text(v.name),description:(v.description??'').trim(),capacity,ownerType:v.ownerType,ownerId:documentId(v.ownerId),docked:v.docked,enabled:v.enabled,navigation:navigationInput(v.navigation),revision:(old.revision??0)+1};
}
export function routeInput(v,id,old={}){
 requireThat(typeof v.enabled==='boolean'&&typeof (v.description??'')==='string'&&(v.description??'').length<=4000,'INVALID_NAVIGATION');
 const fromPort=documentId(v.fromPort),toPort=documentId(v.toPort),durationSeconds=whole(v.durationSeconds,'INVALID_NAVIGATION');
 requireThat(fromPort!==toPort&&durationSeconds>0,'INVALID_NAVIGATION');whole(durationSeconds*1000,'INVALID_NAVIGATION');
 return {id,name:text(v.name),description:(v.description??'').trim(),fromPort,toPort,durationSeconds,fuelCost:whole(v.fuelCost,'INVALID_NAVIGATION'),enabled:v.enabled,revision:(old.revision??0)+1};
}
export function validateNavigationReferences(ship,{characters,groups,items}){
 requireThat((ship.ownerType==='GROUP'?groups:characters).some(o=>o.id===ship.ownerId),'INVALID_SHIP');
 if(ship.navigation){const item=items.find(i=>i.id===ship.navigation.fuelItemId);requireThat(item?.consumable===true&&item.kind==='STACKABLE'&&!item.laserRecharge,'INVALID_FUEL');}
}
export const seedShip=s=>({...s,fuel:s.navigation?.initialFuel??0,portId:s.navigation?.initialPort??null,journey:null});
export const localShip=(s,ship)=>ship.docked&&!ship.journey&&(!ship.navigation||!!s.transportRules?.homePort&&ship.portId===s.transportRules.homePort);
export function shipAccess(ship,cid,groups){
 const a=warehouseAccess({tenantType:ship.ownerType,tenantId:ship.ownerId},cid,groups);
 const pilot=ship.soProfile?ship.pilotId===cid:ship.ownerType==='CHARACTER'?ship.ownerId===cid:groups.find(g=>g.id===ship.ownerId)?.permissions.pilotShip===true;
 return {...a,pilot,access:a.access||pilot};
}
export const publicJourney=({transportManifest,missionManifest,...j})=>j;
export const navigationView=(s,ship,time)=>({shipId:ship.id,name:ship.name,docked:ship.docked,enabled:ship.enabled,configured:!!ship.navigation,local:localShip(s,ship),portId:ship.portId??null,fuel:ship.fuel??0,tankCapacity:ship.navigation?.tankCapacity??null,journey:ship.journey?{...publicJourney(ship.journey),remainingSeconds:Math.max(0,Math.ceil((ship.journey.arrivesAtGameMs-time)/1000))}:null});
