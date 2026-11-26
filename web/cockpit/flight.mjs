// Isolated training fixture. Units and timings only apply inside this module.
export const ports = ['Sillage', 'Nacre', 'Balise Orme', 'Vesper'];
export const routes = [
  {from:0,to:3,cost:6,min:7,seconds:12},
  {from:0,to:1,cost:1,min:2,seconds:7},
  {from:1,to:2,cost:1,min:2,seconds:8},
  {from:2,to:3,cost:2,min:3,seconds:9}
];
export function itinerary(origin,destination,economy) {
  if(destination<=origin || !ports[destination]) return [];
  if(!economy && origin===0 && destination===3) return [routes[0]];
  return routes.slice(1).filter(r=>r.from>=origin && r.to<=destination);
}
export function training(fuel=8) {
  return {port:0,fuel,phase:'map',destination:3,economy:false,leg:null,stock:[4,2,2,0]};
}
export function advance(s) {
  const leg=itinerary(s.port,s.destination,s.economy)[0];
  switch(s.phase) {
    case 'map': return leg && s.fuel>=leg.min ? {...s,leg,phase:'ready'} : s;
    case 'ready': return {...s,fuel:s.fuel-s.leg.cost,phase:'launch'};
    case 'launch': return {...s,phase:'hyperspace'};
    case 'hyperspace': return {...s,phase:'contact'};
    case 'contact': return {...s,phase:'combat'};
    case 'combat': return {...s,phase:'approach'};
    case 'approach': return {...s,port:s.leg.to,leg:null,phase:'map'};
    default: return s;
  }
}
export function refuel(s) {
  if(s.phase!=='map' || s.stock[s.port]<=0 || s.fuel>=8) return s;
  const stock=[...s.stock]; stock[s.port]--;
  return {...s,fuel:s.fuel+1,stock};
}
