import {inventoryHash as hash} from './inventory-state.mjs';
import {requireThat,whole,documentId} from './validation.mjs';
export const currencyView=r=>({name:r.name,unit:r.unit});
export const accountId=cid=>hash(`character:${cid}`);
export const groupAccountId=gid=>hash(`group:${gid}`);
export const moneyText=(v,max=500)=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=max,'INVALID_ECONOMY');return v.trim();};
export function economyRulesInput(v){
  requireThat(v&&typeof v.enabled==='boolean','INVALID_ECONOMY');
  return {enabled:v.enabled,name:moneyText(v.name,100),unit:moneyText(v.unit,50)};
}
export function moneyState(a){
  requireThat(a&&a.status==='ACTIVE','ACCOUNT_UNAVAILABLE');
  const balance=whole(a.balance,'INVALID_ACCOUNT'),reserved=whole(a.reserved,'INVALID_ACCOUNT');
  requireThat(reserved<=balance&&Number.isSafeInteger(a.revision)&&a.revision>0,'INVALID_ACCOUNT');
  return {balance,reserved,available:balance-reserved,revision:a.revision,...(a.protectedCredits!==undefined?{protectedCredits:whole(a.protectedCredits,'INVALID_ACCOUNT')}:{})};
}
export function amountInput(v){const n=whole(v,'INVALID_AMOUNT');requireThat(n>0,'INVALID_AMOUNT');return n;}
export const partyName=c=>({id:c.id,name:c.public.displayName});
export const projectEntry=e=>({id:e.id,at:e.at,kind:e.kind,memo:e.memo,delta:e.delta,...(e.protectedDelta!==undefined?{protectedDelta:e.protectedDelta}:{}),before:e.before,after:e.after,counterparty:e.counterparty,...(e.saleId?{saleId:e.saleId,lotId:e.lotId}:{}),...(e.cargoTransferId?{cargoTransferId:e.cargoTransferId}:{}),...(e.bountyId?{bountyId:e.bountyId,claimId:e.claimId}:{}),...(e.contractId?{contractId:e.contractId}:{})});
export function writeLedger(tx,sid,event){
  tx.set(`sessions/${sid}/ledger/${event.id}`,event);
  for(const entry of event.entries){
    const counterparty=event.kind==='CARGO_FEES'?entry.counterparty:['INTELLIGENCE_PURCHASE','SPACE_RESCUE','SHIP_MAINTENANCE','TRANSFER','SALE','CONTRACT_PAY','GM_CONTRACT_PAY','BOUNTY_PAY','GM_BOUNTY_PAY','WAREHOUSE_RENT'].includes(event.kind)?(entry.delta+(entry.protectedDelta??0)<0?event.recipient:event.source):null;
    tx.set(`sessions/${sid}/accounts/${entry.accountId}/history/${event.id}`,{id:event.id,at:event.at,kind:event.kind,memo:event.memo,
      delta:entry.delta,...(entry.protectedDelta!==undefined?{protectedDelta:entry.protectedDelta}:{}),before:entry.before,after:entry.after,counterparty,actorUid:event.actorUid,reason:event.reason??'',...(event.saleId?{saleId:event.saleId,lotId:event.lotId}:{}),...(event.cargoTransferId?{cargoTransferId:event.cargoTransferId}:{}),...(event.bountyId?{bountyId:event.bountyId,claimId:event.claimId}:{}),...(event.contractId?{contractId:event.contractId}:{})});
  }
}
export function openWallet(tx,sid,c,amount,at,actorUid,kind='INITIAL'){
  whole(amount,'INVALID_AMOUNT');const id=accountId(c.id),a={id,sessionId:sid,ownerType:'CHARACTER',characterId:c.id,balance:amount,reserved:0,status:'ACTIVE',revision:1,createdAt:at};
  tx.set(`sessions/${sid}/accounts/${id}`,a);
  writeLedger(tx,sid,{id:hash(`initial:${c.id}`),at,kind,actorUid,memo:kind==='INITIAL'?'Dotation de la version de scénario':'Ouverture du portefeuille sans crédits',reason:'Initialisation du compte',createdCurrency:amount,removedCurrency:0,
    entries:[{accountId:id,characterId:c.id,delta:amount,before:{balance:0,reserved:0,available:0,revision:0},after:moneyState(a)}]});
  return a;
}
export function openGroupWallet(tx,sid,g,amount,at,actorUid,kind='INITIAL'){
  whole(amount,'INVALID_AMOUNT');const id=groupAccountId(g.id),a={id,sessionId:sid,ownerType:'GROUP',groupId:g.id,label:g.walletConfig.label,balance:amount,reserved:0,status:'ACTIVE',revision:1,createdAt:at};
  tx.set(`sessions/${sid}/accounts/${id}`,a);
  writeLedger(tx,sid,{id:hash(`initial:group:${g.id}`),at,kind,actorUid,memo:kind==='INITIAL'?'Dotation de la caisse depuis la version de scénario':'Ouverture de la caisse sans crédits',reason:'Initialisation du compte collectif',createdCurrency:amount,removedCurrency:0,
    entries:[{accountId:id,characterId:null,groupId:g.id,delta:amount,before:{balance:0,reserved:0,available:0,revision:0},after:moneyState(a)}]});return a;
}
export async function administrativeWallet(tx,sid,input){
  const collective=!!input.groupId,cid=collective?documentId(input.groupId):documentId(input.characterId),a=await tx.get(`sessions/${sid}/accounts/${collective?groupAccountId(cid):accountId(cid)}`);
  requireThat(a?.sessionId===sid&&(collective?a.ownerType==='GROUP'&&a.groupId===cid:a.ownerType==='CHARACTER'&&a.characterId===cid),'ACCOUNT_UNAVAILABLE');moneyState(a);return a;
}
export function seedWallets(tx,s,chars,at,actorUid,groups=[]){
  if(!s.economyRules)return;
  for(const c of chars)openWallet(tx,s.id,c,c.startingCredits?.amount??0,at,actorUid);
  for(const g of groups)if(g.walletConfig)openGroupWallet(tx,s.id,g,g.walletConfig.amount,at,actorUid);
}

