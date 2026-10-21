import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryHash as hash,publicItem} from './inventory-state.mjs';
import {effectiveFieldState} from './field-state.mjs';

const text=(v,max,required=false)=>{requireThat(typeof v==='string'&&v.length<=max&&(!required||v.trim()),'INVALID_PRICE');return v.trim();};
export function priceInput(v,item,old={}){
 requireThat(typeof v.enabled==='boolean'&&(item?.publicationState==='PUBLISHED'||!v.enabled&&old.id),'INVALID_PRICE');
 const baseUnitPrice=whole(v.baseUnitPrice,'INVALID_PRICE');requireThat(baseUnitPrice>0,'INVALID_PRICE');
 return {id:item?.id??old.id,item:publicItem(item??old.item),baseUnitPrice,enabled:v.enabled,revision:(old.revision??0)+1};
}
export function priceEventInput(v,id,old={}){
 const targetKind=v.targetKind??'COMMODITY',percent=v.percent??0,fuelPercent=v.fuelPercent??0,durationPercent=v.durationPercent??0,tradeBlocked=v.tradeBlocked??false,departureBlocked=v.departureBlocked??false;
 requireThat(['COMMODITY','ROUTE'].includes(targetKind)&&typeof v.enabled==='boolean'&&[percent,fuelPercent,durationPercent].every(n=>Number.isSafeInteger(n)&&n>=-100&&n<=1000)&&[tradeBlocked,departureBlocked].every(b=>typeof b==='boolean'),'INVALID_PRICE_EVENT');
 requireThat(targetKind==='COMMODITY'?!v.routeId&&!departureBlocked&&!fuelPercent&&!durationPercent:!v.itemId&&!tradeBlocked&&!percent,'INVALID_PRICE_EVENT');
 requireThat(['MANUAL','INSTALLATION_OFFLINE'].includes(v.trigger),'INVALID_PRICE_EVENT');
 return {id,targetKind,itemId:targetKind==='COMMODITY'?documentId(v.itemId):null,routeId:targetKind==='ROUTE'?documentId(v.routeId):null,title:text(v.title,150,true),description:text(v.description??'',2000),percent,tradeBlocked,departureBlocked,fuelPercent,durationPercent,enabled:v.enabled,trigger:v.trigger,targetId:v.trigger==='INSTALLATION_OFFLINE'?documentId(v.targetId):null,revision:(old.revision??0)+1};
}
export function validateEconomicReferences({commodityPrices=[],priceEvents=[],items=[],fieldTargets=[],routes=[]}){
 for(const p of commodityPrices){const i=items.find(i=>i.id===p.id);requireThat(i&&(!p.enabled||i.publicationState==='PUBLISHED'&&i.unit===p.item.unit&&i.kind===p.item.kind),'INVALID_PRICE');}
 for(const e of priceEvents){
  if(e.targetKind==='ROUTE')requireThat(routes.some(r=>r.id===e.routeId),'INVALID_PRICE_EVENT');
  else requireThat(items.some(i=>i.id===e.itemId&&(!e.enabled||i.publicationState==='PUBLISHED')),'INVALID_PRICE_EVENT');
  if(e.trigger==='INSTALLATION_OFFLINE')requireThat(fieldTargets.some(t=>t.id===e.targetId&&t.kind==='INSTALLATION'&&(!e.enabled||t.publicationState==='PUBLISHED')),'INVALID_PRICE_EVENT');
 }
}
export async function readPriceBook(tx,s,at){
 const base=`sessions/${s.id}`;
 const [prices,events,items,targets,states]=await Promise.all(['commodityPrices','priceEvents','items','fieldTargets','fieldStates'].map(k=>tx.list(`${base}/${k}`)));
 return {prices,items,events:events.map(e=>{
  const target=targets.find(t=>t.id===e.targetId),state=states.find(t=>t.id===e.targetId);
  const active=e.enabled&&(e.trigger==='MANUAL'||target?.kind==='INSTALLATION'&&target.publicationState==='PUBLISHED'&&state&&effectiveFieldState(s,state,at).status==='OFFLINE');
  return {...e,active:!!active};
 })};
}
export function commodityQuote(book,item){
 const price=book.prices.find(p=>p.id===item.id),model=book.items.find(i=>i.id===item.id);
 if(!price?.enabled||model?.publicationState!=='PUBLISHED'||price.item.unit!==item.unit||price.item.kind!==item.kind||model.unit!==price.item.unit||model.kind!==price.item.kind)return null;
 const related=book.events.filter(e=>e.itemId===item.id).sort((a,b)=>a.id.localeCompare(b.id));
 const effects=related.filter(e=>e.active).map(e=>({id:e.id,title:e.title,description:e.description,percent:e.percent}));
 const sum=effects.reduce((n,e)=>n+BigInt(e.percent),0n),factor=100n+sum;
 // Integer arithmetic, nearest whole credit (half rounds up), minimum one credit.
 const raw=(BigInt(price.baseUnitPrice)*(factor>0n?factor:0n)+50n)/100n,rounded=raw>0n?raw:1n;
 if(rounded>BigInt(Number.MAX_SAFE_INTEGER)||sum>BigInt(Number.MAX_SAFE_INTEGER)||sum<BigInt(Number.MIN_SAFE_INTEGER))return null;
 return {itemId:item.id,unit:item.unit,baseUnitPrice:price.baseUnitPrice,unitPrice:Number(rounded),percent:Number(sum),effects,guard:hash(JSON.stringify([price,related.map(e=>[e.id,e.revision,e.active])]))};
}
// Public projections never include the installation that triggers an effect.
const publicEffect=e=>({id:e.id,title:e.title,description:e.description});
export function commodityTrade(book,item){
 const related=(book?.events??[]).filter(e=>e.targetKind!=='ROUTE'&&e.itemId===item.id&&e.tradeBlocked).sort((a,b)=>a.id.localeCompare(b.id));
 const effects=related.filter(e=>e.active).map(publicEffect);
 return {blocked:effects.length>0,effects,guard:hash(JSON.stringify(related.map(e=>[e.id,e.revision,e.active])))};
}
export function tradeBoard(book){return book.items.filter(i=>i.publicationState==='PUBLISHED').flatMap(i=>{const trade=commodityTrade(book,i);return trade.blocked?[{item:publicItem(i),...trade}]:[];});}
export function routeQuote(book,route){
 const related=book.events.filter(e=>e.targetKind==='ROUTE'&&e.routeId===route.id).sort((a,b)=>a.id.localeCompare(b.id));
 const active=related.filter(e=>e.active),effects=active.map(e=>({...publicEffect(e),fuelPercent:e.fuelPercent,durationPercent:e.durationPercent,departureBlocked:e.departureBlocked}));
 const amount=(base,key,min)=>{const factor=100n+active.reduce((n,e)=>n+BigInt(e[key]??0),0n),raw=(BigInt(base)*(factor>0n?factor:0n)+99n)/100n,n=raw<BigInt(min)?BigInt(min):raw;return n<=BigInt(Number.MAX_SAFE_INTEGER)?Number(n):null;};
 const fuelCost=amount(route.fuelCost,'fuelPercent',0),durationSeconds=amount(route.durationSeconds,'durationPercent',1),blocked=active.some(e=>e.departureBlocked);
 return {...route,baseFuelCost:route.fuelCost,baseDurationSeconds:route.durationSeconds,fuelCost,durationSeconds,blocked,available:!blocked&&fuelCost!==null&&durationSeconds!==null,effects,guard:hash(JSON.stringify([route,related.map(e=>[e.id,e.revision,e.active])]))};
}
export function priceBoard(book){return book.prices.filter(p=>p.enabled).flatMap(p=>{const quote=commodityQuote(book,p.item);return quote?[{item:publicItem(book.items.find(i=>i.id===p.id)),...quote}]:[];});}
export function indexedListing(p,book){
 const trade=p.status==='ACTIVE'?commodityTrade(book,p.item):{blocked:false,effects:[]};
 if(p.pricing!=='INDEXED'||p.status!=='ACTIVE')return {...p,trade,pricing:p.pricing??'FIXED',priceAvailable:true};
 const quote=commodityQuote(book,p.item),total=quote?BigInt(quote.unitPrice)*BigInt(p.quantity):null;
 const available=total!==null&&total<=BigInt(Number.MAX_SAFE_INTEGER);
 return {...p,trade,amount:available?Number(total):null,priceQuote:available?quote:null,priceAvailable:available};
}
