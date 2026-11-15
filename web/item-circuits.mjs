// Read-only native previews determine the available fuel actions; no client-side grant.
export async function fuelUseOptions(api,sessionId,lots){
 const fuel=lots.filter(l=>l.item.usage==='FUEL'&&l.status==='AVAILABLE'&&l.quantity>0);
 if(!fuel.length)return {};
 const {ships}=await api('mySpaceport',{sessionId}),result={};
 for(const ship of ships){
  if(!ship.docked||ship.operation||ship.journey||ship.fuel>=ship.tankCapacity)continue;
  for(const lot of fuel){
   try{const p=await api('prepareRefuel',{sessionId,shipId:ship.shipId,lotId:lot.id,quantity:1});(result[lot.id]??=[]).push({shipId:ship.shipId,name:p.shipName,maximum:Math.min(lot.quantity,p.capacity-p.before)});}
   catch(e){if(!e.code)throw e;}
  }
 }
 return result;
}
