import {createHash} from 'node:crypto';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {documentId,requireThat} from './validation.mjs';
export const ticketUserKey=uid=>createHash('sha256').update(uid).digest('hex');
export const currentOrder=(o,at)=>o?.payment==='CHECKOUT_PENDING'&&o.expiresAt<=at?{...o,payment:'EXPIRED'}:o;
export function myOrder(o,at){
 if(!o)return null;
 const {sessionId,title,price,currency,payment,participation,expiresAt,roleId,attempt,access,readAt,revision}=currentOrder(o,at);
 return {sessionId,title,price,currency,payment,participation,expiresAt,roleId,attempt,access,readAt:readAt??null,revision};
}
export function recordOrder(tx,base,e,o){
 const key=ticketUserKey(o.uid);
 tx.set(base+'/orders/'+key,o);tx.set('ticketAccounts/'+key+'/sessions/'+e.id,{id:e.id});
 tx.set(base,{...e,stockRevision:(e.stockRevision??0)+1});
}
export async function reserveTicket({tx,base,e,s,actor,at,input,stock,uuid,order}){
 admissionKeys(input,['sessionId','requestId','revision','policyVersion','price','name','consent']);
 const key=ticketUserKey(actor.uid),requestId=documentId(input.requestId),receipt=base+'/orders/'+key+'/requests/'+requestId;
 const prior=await tx.get(receipt),signature=ticketUserKey(JSON.stringify([input.name,input.policyVersion,input.price,input.revision,input.consent]));
 requireThat(e.published&&s.stage==='PREPARATION'&&!s.safetyStop?.active,'TICKET_CLOSED');
 if(prior){requireThat(prior.signature===signature,'REQUEST_ID_REUSED');return myOrder(order,at);}
 if(order?.participation==='CONFIRMED')return myOrder(order,at);
 requireThat(e.revision===input.revision&&e.policyVersion===input.policyVersion&&e.price===input.price,'TICKET_QUOTE');
 requireThat(e.sale!=='CLOSED'&&input.consent===true,'TICKET_CONSENT');
 const name=admissionText(input.name,120,true);
 if(order?.payment==='CHECKOUT_PENDING'&&order.expiresAt>at)return myOrder(order,at);
 requireThat(order?.payment!=='PAID_NEEDS_RECONCILIATION','TICKET_RECONCILE');
 const wait=e.sale==='WAITLIST';requireThat(wait||stock.free(Math.min(e.capacity,s.capacity))>0,'TICKET_CAPACITY');
 const attempt=wait?null:uuid(),o={sessionId:e.id,title:e.title,uid:actor.uid,email:actor.email,name,price:e.price,currency:'EUR',policyVersion:e.policyVersion,consentedAt:at,
 policy:{terms:e.terms,privacy:e.privacy,guidance:e.guidance,cancellation:e.cancellation,seller:e.seller},revision:(order?.revision??0)+1,
 payment:wait?'DRAFT':'CHECKOUT_PENDING',participation:wait?'WAITLISTED':'PENDING',expiresAt:wait?null:at+e.holdMinutes*60000,attempt,roleId:null,access:'NONE'};
 if(attempt)tx.set(base+'/attempts/'+attempt,{id:attempt,uid:actor.uid,price:e.price,currency:'EUR',status:'PENDING',expiresAt:o.expiresAt});
 tx.set(receipt,{signature,at,attempt});recordOrder(tx,base,e,o);return myOrder(o,at);
}
