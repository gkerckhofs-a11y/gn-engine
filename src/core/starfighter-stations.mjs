import {requireThat} from './validation.mjs';

// The transaction also reserves the chosen station and the native flight operation.
export async function availableStation(tx,base,ship,count) {
  const stations=await tx.list(base+'/cockpitStations');
  const ids=Array.from({length:count},(_,i)=>'cockpit-'+(i+1));
  const previous=ship.cockpit?.stationId;
  if(ids.includes(previous) && stations.some(s=>s.id===previous&&s.shipId===ship.id&&s.operationId===ship.cockpit.operationId))return previous;
  for(const id of ids){
    const old=stations.find(s=>s.id===id);
    if(!old && stations.length>=20)continue;
    if(!old?.shipId || old.shipId===ship.id)return id;
    const occupant=await tx.get(base+'/ships/'+old.shipId);
    if(occupant?.cockpit?.stationId!==id || occupant.cockpit.operationId!==old.operationId || (!occupant.operation && !occupant.journey))return id;
  }
  requireThat(false,'COCKPIT_OCCUPIED');
}
