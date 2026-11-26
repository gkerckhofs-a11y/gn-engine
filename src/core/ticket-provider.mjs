import {admissionKeys} from './admission-state.mjs';
import {documentId,requireThat} from './validation.mjs';
import {ticketUserKey,recordOrder,myOrder} from './ticket-orders.mjs';

// The emulator owns this ledger. A return page can only request a lookup.
// No provider credentials or real payment rail are used by this adapter.
export async function testCheckout({action,actor,input,tx,base,e,s,at,stock}){
 const mock=action==='ticketMockCheckout';
 admissionKeys(input,['sessionId','attempt',...(mock?['outcome']:[])]);
 const id=documentId(input.attempt),path=base+'/attempts/'+id,attempt=await tx.get(path);
 requireThat(attempt?.uid===actor.uid,'FORBIDDEN');
 const owner=ticketUserKey(actor.uid),o=await tx.get(base+'/orders/'+owner);
 requireThat(o&&e,'TICKET_UNAVAILABLE');
 const ledger='ticketProviderTest/'+id,previous=await tx.get(ledger);
 const applied=await tx.get(base+'/paymentReceipts/'+id);
 if(applied)return myOrder(o,at);
 let charge=previous;
 if(mock){
  requireThat(['SUCCESS','FAILURE','CANCEL'].includes(input.outcome),'TICKET_VALUE');
  charge??={id,sessionId:e.id,amount:attempt.price,currency:attempt.currency,outcome:input.outcome,at};
 }
 if(!charge)return myOrder(o,at);
 requireThat(charge.id===id&&charge.sessionId===e.id,'TICKET_PROVIDER');
 const matches=charge.amount===attempt.price&&charge.currency==='EUR'&&attempt.currency==='EUR';
 const same=o.attempt===id,paid=charge.outcome==='SUCCESS',held=same&&o.payment==='CHECKOUT_PENDING'&&o.expiresAt>at;
 const limit=Math.min(e.capacity,s.capacity,stock.usable.length);
 const ownGuard=stock.occupied.some(row=>row.uid===o.uid)&&stock.occupied.length<=limit;
 const capacity=held||ownGuard||stock.free(limit)>0;
 const allowed=s.stage==='PREPARATION'&&!s.campaignSealed&&!s.safetyStop?.active;
 const confirmed=paid&&same&&matches&&capacity&&allowed&&o.participation!=='CANCELLED';
 const status=!paid?(charge.outcome==='CANCEL'?'CANCELLED':'FAILED'):confirmed?'PAID':'PAID_NEEDS_RECONCILIATION';
 if(mock&&!previous)tx.set(ledger,charge);
 tx.set(path,{...attempt,status});
 tx.set(base+'/paymentReceipts/'+id,{id,uid:actor.uid,status,amount:charge.amount,currency:charge.currency,at});
 if(status==='PAID_NEEDS_RECONCILIATION')tx.set(base+'/exceptions/'+id,{id,uid:actor.uid,status:'OPEN',amount:charge.amount,currency:charge.currency,reason:!matches?'AMOUNT':!same?'SUPERSEDED':!capacity?'CAPACITY':'CLOSED'});
 if(!same)return myOrder(o,at);
 const next={...o,payment:status,participation:confirmed?'CONFIRMED':o.participation,revision:o.revision+1};
 recordOrder(tx,base,e,next);
 if(confirmed)tx.set(base+'/outbox/'+id,{kind:'TICKET_CONFIRMED',uid:o.uid,attempt:id,at,state:'QUEUED'});
 return myOrder(next,at);
}
