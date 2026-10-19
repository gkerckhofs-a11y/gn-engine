import {inventoryHash as hash} from './inventory-state.mjs';
import {requireThat,whole} from './validation.mjs';
export const currencyView=r=>({name:r.name,unit:r.unit});
export const accountId=cid=>hash(`character:${cid}`);
export const moneyText=(v,max=500)=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=max,'INVALID_ECONOMY');return v.trim();};
export function economyRulesInput(v){
  requireThat(v&&typeof v.enabled==='boolean','INVALID_ECONOMY');
  return {enabled:v.enabled,name:moneyText(v.name,100),unit:moneyText(v.unit,50)};
}
export function moneyState(a){
  requireThat(a&&a.status==='ACTIVE','ACCOUNT_UNAVAILABLE');
  const balance=whole(a.balance,'INVALID_ACCOUNT'),reserved=whole(a.reserved,'INVALID_ACCOUNT');
  requireThat(reserved<=balance&&Number.isSafeInteger(a.revision)&&a.revision>0,'INVALID_ACCOUNT');
  return {balance,reserved,available:balance-reserved,revision:a.revision};
}
export function amountInput(v){const n=whole(v,'INVALID_AMOUNT');requireThat(n>0,'INVALID_AMOUNT');return n;}
export const partyName=c=>({id:c.id,name:c.public.displayName});
export const projectEntry=e=>({id:e.id,at:e.at,kind:e.kind,memo:e.memo,delta:e.delta,before:e.before,after:e.after,counterparty:e.counterparty});
export function writeLedger(tx,sid,event){
  tx.set(`sessions/${sid}/ledger/${event.id}`,event);
  for(const entry of event.entries){
    const counterparty=event.kind==='TRANSFER'?(entry.delta<0?event.recipient:event.source):null;
    tx.set(`sessions/${sid}/accounts/${entry.accountId}/history/${event.id}`,{id:event.id,at:event.at,kind:event.kind,memo:event.memo,
      delta:entry.delta,before:entry.before,after:entry.after,counterparty,actorUid:event.actorUid,reason:event.reason??''});
  }
}
export function openWallet(tx,sid,c,amount,at,actorUid,kind='INITIAL'){
  whole(amount,'INVALID_AMOUNT');const id=accountId(c.id),a={id,sessionId:sid,ownerType:'CHARACTER',characterId:c.id,balance:amount,reserved:0,status:'ACTIVE',revision:1,createdAt:at};
  tx.set(`sessions/${sid}/accounts/${id}`,a);
  writeLedger(tx,sid,{id:hash(`initial:${c.id}`),at,kind,actorUid,memo:kind==='INITIAL'?'Dotation de la version de scénario':'Ouverture du portefeuille sans crédits',reason:'Initialisation du compte',createdCurrency:amount,removedCurrency:0,
    entries:[{accountId:id,characterId:c.id,delta:amount,before:{balance:0,reserved:0,available:0,revision:0},after:moneyState(a)}]});
  return a;
}
export function seedWallets(tx,s,chars,at,actorUid){
  if(!s.economyRules)return;
  for(const c of chars)openWallet(tx,s.id,c,c.startingCredits?.amount??0,at,actorUid);
}
