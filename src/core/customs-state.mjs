import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {accountId,groupAccountId,moneyState,currencyView,writeLedger} from './economy-state.mjs';
import {accountParty,accountEntry} from './collective-accounts.mjs';

const text=(v,max,required=false)=>{requireThat(typeof v==='string'&&v.length<=max&&(!required||v.trim()),'INVALID_CARGO_TARIFF');return v.trim();};
export function cargoTariffInput(v,id,old={}){
  requireThat(['CUSTOMS','CORRUPTION'].includes(v.kind)&&['LOAD','UNLOAD','TRANSSHIP'].includes(v.direction)&&typeof v.enabled==='boolean','INVALID_CARGO_TARIFF');
  return {id,kind:v.kind,direction:v.direction,itemId:v.itemId?documentId(v.itemId):null,title:text(v.title,150,true),description:text(v.description??'',2000),
    flatAmount:whole(v.flatAmount,'INVALID_CARGO_TARIFF'),unitAmount:whole(v.unitAmount,'INVALID_CARGO_TARIFF'),recipientAccountId:v.recipientAccountId?documentId(v.recipientAccountId):null,enabled:v.enabled,revision:(old.revision??0)+1};
}
export function validateCargoTariffReferences({cargoTariffs=[],characters=[],groups=[],items=[],economyRules=null}){
  requireThat(cargoTariffs.length<=50,'CARGO_TARIFF_LIMIT');
  for(const t of cargoTariffs){
    if(t.enabled)requireThat(economyRules,'ECONOMY_DISABLED');
    if(t.itemId){const i=items.find(i=>i.id===t.itemId);requireThat(i&&(!t.enabled||i.publicationState==='PUBLISHED'),'INVALID_CARGO_TARIFF');}
    if(t.recipientAccountId){
      const c=characters.find(c=>accountId(c.id)===t.recipientAccountId),g=groups.find(g=>groupAccountId(g.id)===t.recipientAccountId);
      requireThat(c?(!t.enabled||c.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED'):g?.walletConfig&&(!t.enabled||g.publicationState==='PUBLISHED'),'ACCOUNT_UNAVAILABLE');
    }
  }
}
export const cargoDirection=(source,destination)=>source.kind==='HOLD'?(destination.kind==='HOLD'?'TRANSSHIP':'UNLOAD'):destination.kind==='HOLD'?'LOAD':null;
export async function feeRecipient(tx,sid,id){
  if(!id)return {a:null,name:'Retrait de la circulation',party:{kind:'SINK',id:null,name:'Retrait de la circulation'}};
  const a=await tx.get(`sessions/${sid}/accounts/${id}`);requireThat(a?.sessionId===sid,'ACCOUNT_UNAVAILABLE');moneyState(a);
  let name;
  if(a.ownerType==='CHARACTER'){
    const c=await tx.get(`sessions/${sid}/characters/${a.characterId}`);requireThat(c&&c.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED'&&a.id===accountId(c.id),'ACCOUNT_UNAVAILABLE');name=c.public.displayName;
  }else{
    const g=await tx.get(`sessions/${sid}/groups/${a.groupId}`);requireThat(a.ownerType==='GROUP'&&a.id===groupAccountId(a.groupId)&&g?.publicationState==='PUBLISHED'&&g.walletConfig?.label===a.label,'ACCOUNT_UNAVAILABLE');name=a.label;
  }
  return {a,name,party:accountParty({a,name})};
}
export const publicClearance=q=>q?{direction:q.direction,total:q.total,currency:q.currency,lines:q.lines.map(l=>({kind:l.kind,title:l.title,description:l.description,flatAmount:l.flatAmount,unitAmount:l.unitAmount,quantity:l.quantity,amount:l.amount,beneficiary:{kind:l.beneficiary.kind,name:l.beneficiary.name}}))}:null;
export async function quoteCargoFees(tx,s,lot,quantity,source,destination){
  const direction=cargoDirection(source,destination),lines=[];
  const rules=direction?(await tx.list(`sessions/${s.id}/cargoTariffs`)).filter(r=>r.enabled&&r.direction===direction&&(!r.itemId||r.itemId===lot.item.id)).sort((a,b)=>a.id.localeCompare(b.id)):[];
  let total=0n;
  for(const r of rules){
    const raw=BigInt(r.flatAmount)+BigInt(r.unitAmount)*BigInt(quantity);total+=raw;requireThat(total<=BigInt(Number.MAX_SAFE_INTEGER),'BALANCE_OVERFLOW');
    const recipient=await feeRecipient(tx,s.id,r.recipientAccountId);
    lines.push({tariffId:r.id,tariffRevision:r.revision,kind:r.kind,title:r.title,description:r.description,flatAmount:r.flatAmount,unitAmount:r.unitAmount,quantity,amount:Number(raw),recipientAccountId:r.recipientAccountId,beneficiary:recipient.party});
  }
  if(total>0n)requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');
  return {direction,total:Number(total),currency:s.economyRules?currencyView(s.economyRules):null,lines};
}
export async function prepareCargoFees(tx,s,quote,from){
  requireThat(from?.spend,'CARGO_PAYER_REQUIRED');
  const before=moneyState(from.a);requireThat(before.available>=quote.total,'INSUFFICIENT_FUNDS');
  const accounts=new Map([[from.a.id,{a:from.a,delta:-quote.total}]]);let removed=0;
  for(const l of quote.lines){
    if(!l.amount)continue;
    if(!l.recipientAccountId){removed+=l.amount;continue;}
    const r=await feeRecipient(tx,s.id,l.recipientAccountId),entry=accounts.get(r.a.id)??{a:r.a,delta:0};entry.delta+=l.amount;accounts.set(r.a.id,entry);
  }
  const changes=[...accounts.values()].map(({a,delta})=>{const balance=BigInt(a.balance)+BigInt(delta);requireThat(balance>=0n&&balance<=BigInt(Number.MAX_SAFE_INTEGER),'BALANCE_OVERFLOW');const next={...a,balance:Number(balance),revision:a.revision+1};moneyState(next);return {a,next,delta};});
  const own=changes.find(x=>x.a.id===from.a.id),result={fees:publicClearance(quote),payer:accountParty(from),...(from.read?{before,after:moneyState(own.next)}:{})};
  return {changes,removed,result:{...result,confirmation:hash(JSON.stringify([quote,from.guard,changes.map(x=>[x.a.id,x.a.revision]),result]))}};
}
export function settleCargoFees(tx,s,transfer,prepared,from,at,id,actor){
  for(const x of prepared.changes)tx.set(`sessions/${s.id}/accounts/${x.a.id}`,x.next);
  const source=accountParty(from);
  writeLedger(tx,s.id,{id,kind:'CARGO_FEES',at,actorUid:actor.uid,operatorCharacterId:transfer.receivedByCharacterId,memo:'Frais de passage de cargaison',reason:'Réception et paiement confirmés',cargoTransferId:transfer.id,
    source,createdCurrency:0,removedCurrency:prepared.removed,fees:prepared.result.fees,
    entries:prepared.changes.map(x=>({...accountEntry(x.a,x.delta,x.next),counterparty:x.a.id===from.a.id?{kind:'PORT',id:null,name:'Droits de passage'}:source}))});
  return {id,at,total:transfer.clearance.total,currency:transfer.clearance.currency,payer:source,fees:prepared.result.fees};
}
