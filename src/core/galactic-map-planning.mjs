// Route comparison only. No movement, reservations, new routes or fuel stock.
export function shortestMapPath(routes,fromPort,toPort,mode='TIME',tankCapacity=Infinity){
 if(fromPort===toPort)return [];
 const queue=[{port:fromPort,routes:[],duration:0,fuel:0,key:''}],best=new Map();
 const score=p=>mode==='FUEL'?[p.fuel,p.duration]:[p.duration,p.fuel];
 const compare=(a,b)=>score(a)[0]-score(b)[0]||score(a)[1]-score(b)[1]||a.key.localeCompare(b.key);
 while(queue.length){
  queue.sort(compare);const p=queue.shift(),old=best.get(p.port);if(old&&compare(old,p)<=0)continue;best.set(p.port,p);
  if(p.port===toPort)return p.routes;
  for(const r of routes.filter(r=>r.fromPort===p.port&&r.available&&(r.minimumDepartureFuel??r.fuelCost)<=tankCapacity).sort((a,b)=>a.id.localeCompare(b.id))){
   if(p.routes.some(x=>x.fromPort===r.toPort))continue;
   queue.push({port:r.toPort,routes:[...p.routes,r],duration:p.duration+r.durationSeconds,fuel:p.fuel+r.fuelCost,key:p.key+'/'+r.id});
  }
 }
 return null;
}
export function mapItineraries(routes,fromPort,toPort,ship){
 if(!ship||!fromPort||!toPort||fromPort===toPort)return [];
 const seen=new Set(),plans=[];
 for(const mode of ['TIME','FUEL']){
  const legs=shortestMapPath(routes,fromPort,toPort,mode,ship.tankCapacity);if(!legs)continue;
  const key=legs.map(r=>r.id).join('/');if(seen.has(key)){plans.find(p=>p.key===key).modes.push(mode);continue;}seen.add(key);
  let fuel=ship.fuel;const refuels=[];
  for(const r of legs){const required=r.minimumDepartureFuel??r.fuelCost;if(fuel<required){refuels.push({portId:r.fromPort,minimumUnits:required-fuel,availabilityConfirmed:false});fuel=required;}fuel-=r.fuelCost;}
  plans.push({key,modes:[mode],legs:legs.map(r=>r.id),durationSeconds:legs.reduce((n,r)=>n+r.durationSeconds,0),fuelCost:legs.reduce((n,r)=>n+r.fuelCost,0),refuels,remainingFuelWithoutExtraStock:refuels.length?null:fuel});
 }
 return plans;
}
