import {inventoryHash as hash} from './inventory-state.mjs';
import {requireThat,whole,documentId} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';
import {gameTime} from './clock.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
export const dockAlarmEvents=['INTRUSION_SUCCESS','INTRUSION_FAILED','THEFT_STARTED','THEFT_SUCCESS','THEFT_FAILED'];
export function dockAlarmInput(v){
 if(v==null)return null;admissionKeys(v,['enabled','events','recipientIds','delaySeconds']);
 requireThat(typeof v.enabled==='boolean'&&Array.isArray(v.events)&&v.events.length<=dockAlarmEvents.length&&v.events.every(x=>dockAlarmEvents.includes(x))&&new Set(v.events).size===v.events.length,'INVALID_DOCK_ALARM');
 requireThat(Array.isArray(v.recipientIds)&&v.recipientIds.length<=100,'INVALID_DOCK_ALARM');const recipientIds=v.recipientIds.map(documentId);requireThat(new Set(recipientIds).size===recipientIds.length,'INVALID_DOCK_ALARM');
 const delaySeconds=whole(v.delaySeconds,'INVALID_DOCK_ALARM');requireThat(delaySeconds<=86400&&(!v.enabled||v.events.length>0&&recipientIds.length>0),'INVALID_DOCK_ALARM');
 return {enabled:v.enabled,events:v.events,recipientIds,delaySeconds};
}
// A fictional in-app alert, never a stock mandate or an identity disclosure.
export function recordDockAlarm(tx,s,w,event,actionId,at){
 const a=w?.dock?.alarm;if(!a?.enabled||!a.events.includes(event))return;
 authorizeSpaceOutlaws(tx,s,'DOCK_ALARM');const id=hash(JSON.stringify([w.id,event,actionId]));
 const message={id,warehouseId:w.id,warehouseName:w.name,event,createdGameMs:gameTime(s.clock,at),availableGameMs:gameTime(s.clock,at)+a.delaySeconds*1000,at};tx.set(`sessions/${s.id}/dockAlerts/${id}`,{...message,recipientIds:a.recipientIds});for(const cid of a.recipientIds)tx.set(`sessions/${s.id}/characters/${cid}/dockAlerts/${id}`,message);
}
export async function dockAlerts(tx,s,c,at){
 const rows=await tx.list(`sessions/${s.id}/characters/${c.id}/dockAlerts`,null,{orderBy:'availableGameMs',direction:'desc',limit:10001}),out=[];requireThat(rows.length<=10000,'SO_RELEASE_LIMIT');
 for(const a of rows){if(a.availableGameMs>gameTime(s.clock,at))continue;const w=await tx.get(`sessions/${s.id}/warehouses/${a.warehouseId}`);if(!w?.dock?.alarm?.enabled||!w.dock.alarm.recipientIds.includes(c.id))continue;out.push({id:a.id,warehouseId:a.warehouseId,name:a.warehouseName,event:a.event,atGameMs:a.availableGameMs});}
 return out.slice(0,100);
}
