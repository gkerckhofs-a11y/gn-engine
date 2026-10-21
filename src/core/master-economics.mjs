import {priceInput,priceEventInput} from './price-state.mjs';

export function importEconomics({rows,m,stamp,checkOperation,summary,mark,addError,issue,num,empty,patch}){
 const boolean=(v,key)=>{if(!['OUI','NON'].includes(v))issue(key,'Utiliser OUI ou NON.');return v==='OUI';};
 const percentage=(v,key)=>{if(!/^-?\d+$/.test(String(v))||!Number.isSafeInteger(Number(v))||Number(v)<-100||Number(v)>1000)issue(key,'Un entier de -100 à 1000 est attendu.');return Number(v);};
 for(const sheet of ['Cours','EvenementsEco'])for(const r of rows[sheet]??[]){try{
  if(!stamp(sheet,r))continue;const kind=sheet==='Cours'?'commodityPrices':'priceEvents',old=m[kind].get(r.id);checkOperation(r,old);
  let d=patch(r,{enabled:false,...(kind==='priceEvents'?{targetKind:'COMMODITY',percent:0,tradeBlocked:false,departureBlocked:false,fuelPercent:0,durationPercent:0}:{}),...old},{titre:'title',description:'description',cible_type:'targetKind',objet_id:'itemId',route_id:'routeId',declenchement:'trigger',installation_id:'targetId'});
  if(r.operation==='ARCHIVER'){
   if(Object.entries(r).some(([k,v])=>!['_row','id','operation','version'].includes(k)&&v))issue('operation','ARCHIVER ne contient que id, operation et version.');d.enabled=false;
  }else{
   for(const [key,field] of [['actif','enabled'],['commerce_suspendu','tradeBlocked'],['depart_suspendu','departureBlocked']])if(!empty(r[key]))d[field]=boolean(r[key],key);
   if(!empty(r.prix_base))d.baseUnitPrice=num(r.prix_base,'prix_base',true);
   for(const [key,field] of [['variation_prix_pct','percent'],['variation_carburant_pct','fuelPercent'],['variation_duree_pct','durationPercent']])if(!empty(r[key]))d[field]=percentage(r[key],key);
  }
  if(kind==='commodityPrices'){
   const item=m.items.get(r.id);if(!item)issue('id','Utiliser l’identifiant du modèle d’objet existant ou créé dans cet import.');d=priceInput(d,item,old??{});
  }else d=priceEventInput(d,r.id,old??{});
  d.masterArchived=r.operation==='ARCHIVER';m[kind].set(r.id,d);mark(kind,r.id);summary(sheet,r,old,d);
 }catch(e){addError(sheet,r,e);}}
}
