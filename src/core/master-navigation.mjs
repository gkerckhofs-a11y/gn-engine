import {shipInput,seedShip,routeInput,validateNavigationReferences} from './navigation-state.mjs';
import {storedIn,stockVolume} from './storage-state.mjs';

export function importNavigation({rows,m,session,storedInventory,stamp,checkOperation,summary,mark,addError,issue,num,empty,patch}){
 const boolean=(v,key)=>{if(!['OUI','NON'].includes(v))issue(key,'Utiliser OUI ou NON.');return v==='OUI';};
 for(const sheet of ['Vaisseaux','Routes'])for(const r of rows[sheet]??[]){try{
  if(!stamp(sheet,r))continue;const kind=sheet==='Vaisseaux'?'ships':'routes',old=m[kind].get(r.id);checkOperation(r,old);
  let d=patch(r,{enabled:false,...(kind==='ships'?{docked:true,navigation:null}:{}),...old},{nom:'name',description:'description',...(kind==='ships'?{proprietaire_type:'ownerType',proprietaire_id:'ownerId'}:{depart_port:'fromPort',arrivee_port:'toPort'})});
  if(r.operation==='ARCHIVER'){
   if(Object.entries(r).some(([k,v])=>!['_row','id','operation','version'].includes(k)&&v))issue('operation','ARCHIVER ne contient que id, operation et version.');d.enabled=false;
  }else{
   if(!empty(r.ouvert))d.enabled=boolean(r.ouvert,'ouvert');
   if(kind==='ships'){
    if(!empty(r.capacite_volume))d.capacity=num(r.capacite_volume,'capacite_volume',true);
    if(!empty(r.a_quai))d.docked=boolean(r.a_quai,'a_quai');
    if(['carburant_objet_id','capacite_reservoir','carburant_initial','port_initial'].some(k=>!empty(r[k]))){
     if(r.carburant_objet_id==='!EFFACER'){if(old?.navigation)issue('carburant_objet_id','La navigation déjà configurée ne peut pas être supprimée.');d.navigation=null;}
     else{d.navigation={...d.navigation};if(!empty(r.carburant_objet_id))d.navigation.fuelItemId=r.carburant_objet_id;if(!empty(r.port_initial))d.navigation.initialPort=r.port_initial;for(const [key,field] of [['capacite_reservoir','tankCapacity'],['carburant_initial','initialFuel']])if(!empty(r[key]))d.navigation[field]=num(r[key],key,key==='capacite_reservoir');}
    }
   }else for(const [key,field] of [['duree_secondes','durationSeconds'],['carburant_cout','fuelCost']])if(!empty(r[key]))d[field]=num(r[key],key,key==='duree_secondes');
  }
  if(kind==='ships'){
   d={...old,...shipInput(d,r.id,old??{})};validateNavigationReferences(d,{characters:[...m.characters.values()],groups:[...m.groups.values()],items:[...m.items.values()]});
   if(session){
    if(old?.journey)issue('id','Terminer le voyage avant cet import.');
    const stock=storedInventory.filter(l=>storedIn(l,r.id,'HOLD'));
    if(stockVolume(stock)>d.capacity)issue('capacite_volume','La capacité doit couvrir la cargaison déjà embarquée.');
    if(old&&(old.ownerType!==d.ownerType||old.ownerId!==d.ownerId)&&stock.length)issue('proprietaire_id','Vider la soute avant de changer son propriétaire.');
    if(old?.navigation){
     if(d.navigation.tankCapacity<old.fuel)issue('capacite_reservoir','La capacité doit couvrir le carburant restant.');
     if(d.navigation.fuelItemId!==old.navigation.fuelItemId&&old.fuel)issue('carburant_objet_id','Vider le réservoir avant de changer de carburant.');
     // Session masters configure definitions; they never replenish or teleport an existing ship.
     Object.assign(d,{fuel:old.fuel,portId:old.portId,journey:null});
    }else d={...d,...seedShip(d)};
   }
  }else d={...old,...routeInput(d,r.id,old??{})};
  d.masterArchived=r.operation==='ARCHIVER';m[kind].set(r.id,d);mark(kind,r.id);summary(sheet,r,old,d);
 }catch(e){addError(sheet,r,e);}}
}
