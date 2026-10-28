// Helpers of the native field service: definitions, fieldStates, inventory,
// knowledge receipts and ledger. No second inventory or currency engine.
import {requireThat,documentId,whole} from './validation.mjs';
import {inventoryHash as hash,lotState,publicItem} from './inventory-state.mjs';
import {accountId,moneyState,writeLedger} from './economy-state.mjs';
import {knowledgeSnapshot} from './knowledge.mjs';
import {requireGameAction} from './health-state.mjs';
import {isPlaceSearch} from './space-outlaws-search-state.mjs';
const base=s=>`sessions/${s.id}`;
const available=(f,st)=>f.active&&st?.status==='AVAILABLE';
const movement=l=>({...lotState(l),ownerType:l.ownerType,ownerId:l.ownerId,holderId:l.holderId,location:l.location});
function writeLot(tx,s,before,after,event){
 tx.set(`${base(s)}/inventory/${after.id}`,after);
 tx.set(`${base(s)}/inventory/${after.id}/history/${event.id}`,{...event,before:before?movement(before):null,after:movement(after)});
}
export async function discoverPlace(tx,s,c,t,state,a,total,at){
 const finds={...state.finds},discoveries=[];
 for(const f of t.finds){
  const st=finds[f.id];
  if(!available(f,st)||total<(f.difficulty??t.search.difficulty)||f.characterIds.length&&!f.characterIds.includes(c.id))continue;
  let knowledge=null,item=null;
  if(f.knowledgeId){const k=await tx.get(`${base(s)}/knowledge/${f.knowledgeId}`);if(k?.publicationState!=='PUBLISHED')continue;knowledge=knowledgeSnapshot(k);}
  if(f.itemId){const lot=await tx.get(`${base(s)}/inventory/${st.lotId}`);requireThat(lot?.status==='FIELD_STOCK'&&lot.quantity===f.quantity,'FIELD_SOURCE_CHANGED');item=publicItem(lot.item);}
  if(f.kind==='INDICE_A_VOIR'){
   const path=`${base(s)}/characters/${c.id}/knowledge/${f.knowledgeId}`,old=await tx.get(path);
   requireThat(!old||old.active,'FIELD_UNAVAILABLE');
   if(!old)tx.set(path,{id:f.knowledgeId,active:true,snapshot:knowledge,receivedAt:at,source:'FIELD',sourceName:t.title,readAt:null,grantRevision:1});
  }
  // Stored only after an authorized successful discovery. No undiscovered
  // find, source account or remaining quantity enters a player projection.
  discoveries.push({id:f.id,generation:st.generation,kind:f.kind,title:f.title,knowledgeId:f.knowledgeId,body:knowledge?.body??'',item,quantity:f.quantity,status:f.kind==='INDICE_A_VOIR'?'SEEN':'DISCOVERED'});
  finds[f.id]={...st,discoveredBy:[...new Set([...st.discoveredBy,c.id])],lastDiscoveredAt:at};
 }
 return {discoveries,state:{...state,finds,attempts:{...state.attempts,[c.id]:(state.attempts[c.id]??0)+1}}};
}
export async function provisionPlaceFind(tx,s,t,state,input,actor,id,at){
 requireThat(isPlaceSearch(t)&&s.spaceOutlaws?.searchVersion===1,'SO_GAMEPLAY_NOT_OPEN');
 requireThat(['BRIEFING','PAUSE'].includes(s.stage)&&!state.activeActionId,'FIELD_PREPARATION_REQUIRED');
 requireThat(state.revision===input.revision,'STALE_REVISION');
 const fid=documentId(input.findId),f=t.finds.find(f=>f.id===fid),st=state.finds[fid];requireThat(f&&st,'FIELD_UNAVAILABLE');
 requireThat(typeof input.reason==='string'&&input.reason.trim()&&input.reason.length<=500,'REASON_REQUIRED');
 const event={id,at,actorUid:actor.uid,kind:'FIELD_PROVISION',targetId:t.id,findId:fid,reason:input.reason.trim()};
 let next={...st};
 if(input.reset===true){
  // Reset is a separate owner permission and only at a later episode's
  // preparation. Resources must be allocated anew; old receipts remain.
  requireThat(actor.uid===s.ownerUid&&s.stage==='BRIEFING'&&st.status==='TAKEN'&&st.takenSessionId!==s.id,'FIELD_RESET_FORBIDDEN');
  next={status:f.kind.startsWith('INDICE_')?'AVAILABLE':'UNFUNDED',generation:st.generation+1,discoveredBy:[],takenBy:null,takenAt:null};
 }else{
  requireThat(st.status==='UNFUNDED','FIELD_ALREADY_PROVISIONED');
  if(f.kind==='OBJET_A_TROUVER'){
   const lot=await tx.get(`${base(s)}/inventory/${documentId(input.sourceLotId)}`);
   requireThat(lot?.ownerType==='SHOP'&&lot.location?.kind==='SHOP'&&lot.ownerId===lot.holderId&&lot.ownerId===lot.location.id&&lot.status==='AVAILABLE'&&lot.item.id===f.itemId&&lot.quantity>=f.quantity&&lot.transferable!==false,'FIELD_SOURCE_CHANGED');
   const reservedId=lot.item.kind==='INDIVIDUAL'&&lot.id!==hash(`shop-stock:${lot.origin?.offerId}`)?lot.id:hash(`field:${id}`),reserved={...lot,id:reservedId,quantity:f.quantity,status:'FIELD_STOCK',location:{kind:'FIELD',id:t.id},revision:reservedId===lot.id?lot.revision+1:1,fieldTargetId:t.id,fieldFindId:fid,origin:{...lot.origin,parentLotId:lot.id,kind:'FIELD_PROVISION'}};
   if(reservedId!==lot.id)writeLot(tx,s,lot,{...lot,quantity:lot.quantity-f.quantity,revision:lot.revision+1},event);
   writeLot(tx,s,reservedId===lot.id?lot:null,reserved,event);next={...st,status:'AVAILABLE',lotId:reservedId};
  }else if(f.kind==='CREDITS_A_TROUVER'){
   const wallet=await tx.get(`${base(s)}/accounts/${documentId(input.sourceAccountId)}`),before=moneyState(wallet);
   requireThat(wallet.ownerType==='SHOP'&&before.available>=f.quantity,'INSUFFICIENT_FUNDS');
   const after={...wallet,reserved:whole(wallet.reserved+f.quantity,'INVALID_AMOUNT'),revision:wallet.revision+1};
   tx.set(`${base(s)}/accounts/${wallet.id}`,after);
   writeLedger(tx,s.id,{...event,memo:`Réserve de fouille : ${t.title}`,createdCurrency:0,removedCurrency:0,entries:[{accountId:wallet.id,characterId:null,delta:0,before,after:moneyState(after)}]});
   next={...st,status:'AVAILABLE',accountId:wallet.id};
  }else requireThat(false,'INVALID_PLACE_SEARCH');
 }
 tx.set(`${base(s)}/fieldStates/${t.id}`,{...state,finds:{...state.finds,[fid]:next},revision:state.revision+1});
 tx.set(`${base(s)}/audit/${id}`,{...event,action:input.reset?'RESET_FIELD_FIND':'PROVISION_FIELD_FIND',before:st,after:next});
 return {id:fid,status:next.status};
}
export async function takePlaceFind(tx,s,c,t,state,a,input,actor,id,at){
 requireThat(s.spaceOutlaws?.searchVersion===1&&isPlaceSearch(t)&&a.searchVersion===1&&a.targetId===t.id,'FIELD_UNAVAILABLE');
 requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'discover',at);
 requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
 const fid=documentId(input.findId),f=t.finds.find(f=>f.id===fid),st=state.finds[fid],discovery=a.result?.discoveries?.find(d=>d.id===fid);
 requireThat(discovery&&f&&st&&discovery.generation===st.generation&&a.searchEpoch===state.epoch&&f.kind!=='INDICE_A_VOIR','FIELD_UNAVAILABLE');
 if(st.status==='TAKEN'&&st.takenBy===c.id&&st.takenActionId===a.id)return st.receipt;
 requireThat(t.search.active&&available(f,st)&&(!f.characterIds.length||f.characterIds.includes(c.id)),'FIELD_FIND_UNAVAILABLE');
 const event={id,at,actorUid:actor.uid,kind:'FIELD_TAKE',targetId:t.id,findId:fid,actionId:a.id,characterId:c.id,reason:'Prise confirmée sur place'};
 let receipt={id:fid,kind:f.kind,status:'TAKEN',title:discovery.title};
 if(f.kind==='OBJET_A_TROUVER'){
  const lot=await tx.get(`${base(s)}/inventory/${st.lotId}`);
  requireThat(lot?.status==='FIELD_STOCK'&&lot.fieldTargetId===t.id&&lot.fieldFindId===fid&&lot.item.id===f.itemId&&lot.quantity===f.quantity,'FIELD_SOURCE_CHANGED');
  const next={...lot,status:'AVAILABLE',ownerType:'CHARACTER',ownerId:c.id,holderId:c.id,location:{kind:'CHARACTER',id:c.id},fieldTargetId:null,fieldFindId:null,revision:lot.revision+1};
  writeLot(tx,s,lot,next,event);receipt={...receipt,lotId:lot.id,quantity:lot.quantity};
 }else if(f.kind==='CREDITS_A_TROUVER'){
  const source=await tx.get(`${base(s)}/accounts/${st.accountId}`),wallet=await tx.get(`${base(s)}/accounts/${accountId(c.id)}`),before=moneyState(source),recipientBefore=moneyState(wallet);
  requireThat(source.ownerType==='SHOP'&&source.reserved>=f.quantity&&source.balance>=f.quantity,'INSUFFICIENT_FUNDS');
  const debited={...source,balance:source.balance-f.quantity,reserved:source.reserved-f.quantity,revision:source.revision+1},credited={...wallet,balance:whole(wallet.balance+f.quantity,'BALANCE_OVERFLOW'),revision:wallet.revision+1};
  tx.set(`${base(s)}/accounts/${source.id}`,debited);tx.set(`${base(s)}/accounts/${wallet.id}`,credited);
  writeLedger(tx,s.id,{...event,memo:`Trouvaille : ${t.title}`,createdCurrency:0,removedCurrency:0,entries:[{accountId:source.id,characterId:null,delta:-f.quantity,before,after:moneyState(debited)},{accountId:wallet.id,characterId:c.id,delta:f.quantity,before:recipientBefore,after:moneyState(credited)}]});
  receipt={...receipt,amount:f.quantity,balance:credited.balance};
 }else{
  const k=await tx.get(`${base(s)}/knowledge/${f.knowledgeId}`),path=`${base(s)}/characters/${c.id}/knowledge/${f.knowledgeId}`,old=await tx.get(path);
  requireThat(k?.publicationState==='PUBLISHED'&&(!old||old.active),'FIELD_UNAVAILABLE');
  if(!old)tx.set(path,{id:f.knowledgeId,active:true,snapshot:knowledgeSnapshot(k),receivedAt:at,source:'FIELD',sourceName:t.title,readAt:null,grantRevision:1});
  receipt={...receipt,knowledgeId:f.knowledgeId};
 }
 const next={...st,status:'TAKEN',takenBy:c.id,takenAt:at,takenSessionId:s.id,takenActionId:a.id,receipt};
 tx.set(`${base(s)}/fieldStates/${t.id}`,{...state,finds:{...state.finds,[fid]:next},revision:state.revision+1});
 tx.set(`${base(s)}/audit/${id}`,{...event,receipt});return receipt;
}
