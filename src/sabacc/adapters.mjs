import {requireThat as need} from '../core/validation.mjs';
import {inventoryHash as hash} from '../core/inventory-state.mjs';
import {inventoryPlayer} from '../core/inventory-transfers.mjs';
import {accountId,moneyState,writeLedger} from '../core/economy-state.mjs';
import {requireGameAction} from '../core/health-state.mjs';
import {authorizeSpaceOutlaws} from '../core/space-outlaws-entry-guard.mjs';
export const playerKey=actor=>hash(actor.uid);
export const escrowId=table=>hash(`sabacc:${table.id}`);
export const accountPath=b=>b.mode==='GN'?`sessions/${b.sessionId}/accounts/${b.accountId}`:`sabaccWallets/${b.accountId}`;
export async function identityProvider(tx,actor,table,profile,{spending=false}={}){
 if(table.mode==='LOCAL'){need(profile,'SABACC_PROFILE');return {id:profile.id,actorId:playerKey(actor),authTime:actor.authTime,name:profile.name,binding:{mode:'LOCAL',accountId:profile.id}};}
 const {s,c}=await inventoryPlayer(tx,actor,{sessionId:table.sessionId});
 need(s.economyRules?.enabled&&!s.campaignSealed&&!c.survival?.dead,'FORBIDDEN');
 if(spending){need(s.stage==='EN_JEU','SESSION_NOT_RUNNING');need(!s.safetyStop?.active,'SO_SAFETY_STOP');requireGameAction(s,c,'pay');}
 return {id:hash(`${s.id}:${c.id}`),actorId:playerKey(actor),authTime:actor.authTime,name:c.public.displayName,characterId:c.id,binding:{mode:'GN',sessionId:s.id,characterId:c.id,accountId:accountId(c.id)}};
}
export async function walletSnapshot(tx,binding){const a=await tx.get(accountPath(binding));need(a?.status==='ACTIVE','ACCOUNT_UNAVAILABLE');const m=moneyState(a);return {account:a,available:m.available};}
export async function settleWallets(tx,table,bindings,deltas,{id,actorUid,at,handId,reason}){
 const changed=Object.entries(deltas).filter(([,v])=>v!==0),loaded=[];
 for(const [pid,delta] of changed){need(Number.isSafeInteger(delta),'INVALID_AMOUNT');const binding=bindings[pid];need(binding,'SABACC_BINDING');const {account:a,available}=await walletSnapshot(tx,binding);need(delta>=0||available>=-delta,'INSUFFICIENT_FUNDS');need(Number.isSafeInteger(a.balance+delta)&&a.balance+delta>=0,'INVALID_AMOUNT');loaded.push({pid,binding,a,delta,next:{...a,balance:a.balance+delta,revision:a.revision+1}});}
 if(!loaded.length)return;
 const total=loaded.reduce((n,x)=>n+x.delta,0);let escrow,s;
 if(table.mode==='GN'){
  s=await tx.get(`sessions/${table.sessionId}`);need(s&&!s.campaignSealed&&s.stage!=='ARCHIVED','SESSION_CLOSED');
  const path=`sessions/${s.id}/accounts/${escrowId(table)}`;
  escrow=await tx.get(path)??{id:escrowId(table),sessionId:s.id,ownerType:'SABACC',tableId:table.id,label:`Sabacc · ${table.name}`,status:'ACTIVE',balance:0,reserved:0,revision:1};
  need(escrow.ownerType==='SABACC'&&escrow.tableId===table.id&&escrow.balance-total>=0&&Number.isSafeInteger(escrow.balance-total),'SABACC_ESCROW');
  authorizeSpaceOutlaws(tx,s,'SABACC_WALLET');
 }
 for(const x of loaded)tx.set(accountPath(x.binding),x.next);
 const entries=loaded.map(x=>({accountId:x.a.id,characterId:x.binding.characterId??null,delta:x.delta,before:moneyState(x.a),after:moneyState(x.next)}));
 if(escrow){const next={...escrow,balance:escrow.balance-total,revision:escrow.revision+1};tx.set(`sessions/${s.id}/accounts/${escrow.id}`,next);entries.push({accountId:escrow.id,characterId:null,delta:-total,before:moneyState(escrow),after:moneyState(next)});writeLedger(tx,s.id,{id,kind:'SABACC',at,actorUid,memo:`Sabacc · ${table.name}`,reason,tableId:table.id,handId,createdCurrency:0,removedCurrency:0,entries});}
 tx.set(`sabaccTables/${table.id}/walletEvents/${id}`,{id,at,handId,reason,entries:loaded.map(x=>({playerId:x.pid,delta:x.delta,before:x.a.balance,after:x.next.balance})),potDelta:-total,actorUid});
}
