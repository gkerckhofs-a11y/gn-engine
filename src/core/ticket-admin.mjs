import {admissionKeys,admissionText} from './admission-state.mjs';
import {documentId,requireThat} from './validation.mjs';
import {currentOrder,recordOrder,ticketUserKey} from './ticket-orders.mjs';

export const acquired=o=>o?.participation==='CONFIRMED'&&['PAID','COMPED'].includes(o.payment);
function arrival(o,roles,at){
 return {key:ticketUserKey(o.uid),name:o.name,payment:currentOrder(o,at).payment,participation:o.participation,character:roles.find(r=>r.id===o.roleId)?.name??'',read:!!o.readAt,exposed:!!o.exposedAt,revision:o.revision};
}
export function ticketReport({orders,roles,stock,at,e,s}){
 const rows=orders.map(o=>arrival(o,roles,at));
 return {rows,available:e?stock.free(Math.min(e.capacity,s.capacity)):0,stats:{
  holds:rows.filter(r=>r.payment==='CHECKOUT_PENDING').length,paid:rows.filter(r=>r.payment==='PAID').length,
  gifts:rows.filter(r=>r.payment==='COMPED').length,waiting:rows.filter(r=>r.participation==='WAITLISTED').length,
  unselected:orders.filter(o=>acquired(o)&&!o.roleId).length,assigned:roles.filter(r=>r.holder).length,
  blocked:roles.filter(r=>!r.enabled).length,availableRoles:roles.filter(r=>r.enabled&&!r.holder).length}};
}
const csvCell=v=>{let s=String(v??'');if(/^\s*[=+@-]|^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
export const welcomeExport=rows=>[['Nom','Participation','Personnage','Briefing lu'],...rows.map(r=>[r.name,r.participation,r.character,r.read?'Oui':'Non'])].map(row=>row.map(csvCell).join(';')).join('\r\n');

export async function correctTicket({tx,base,e,s,actor,input,roles,orders,stock,at}){
 admissionKeys(input,['sessionId','key','requestId','operation','orderRevision','reason','confirm','acknowledgeExposure','roleId','exceptionId']);
 requireThat(e&&['PREPARATION','BRIEFING'].includes(s.stage),'TICKET_CLOSED');
 const key=documentId(input.key),id=documentId(input.requestId),op=input.operation;
 const reason=admissionText(input.reason,360,true);requireThat(input.confirm===true,'TICKET_CONSENT');
 const path=base+'/corrections/'+id,prior=await tx.get(path);
 const signature=ticketUserKey(JSON.stringify([actor.uid,key,op,reason,input.orderRevision,input.roleId??'',input.exceptionId??'',!!input.acknowledgeExposure]));
 if(prior){requireThat(prior.signature===signature,'REQUEST_ID_REUSED');return prior.result;}
 const o=orders.find(o=>ticketUserKey(o.uid)===key);requireThat(o&&o.revision===input.orderRevision,'STALE_REVISION');
 const oldRole=roles.find(r=>r.id===o.roleId),held=o.payment==='CHECKOUT_PENDING'&&o.expiresAt>at;
 const free=stock.free(Math.min(s.capacity,e.capacity))>0||held;
 const queue=(kind,ref)=>tx.set(base+'/outbox/'+ref,{kind,uid:o.uid,attempt:o.attempt,at,state:'QUEUED'});
 let next={...o,revision:o.revision+1};
 if(op==='REMIND'){
  requireThat(acquired(o)&&!o.roleId,'TICKET_UNAVAILABLE');queue('ROLE_REMINDER','remind_'+key+'_'+o.attempt);
 }else if(op==='GIFT'){
  requireThat(s.stage==='PREPARATION'&&free&&['DRAFT','CHECKOUT_PENDING','EXPIRED','FAILED'].includes(currentOrder(o,at).payment),'TICKET_CAPACITY');
  next={...next,payment:'COMPED',participation:'CONFIRMED',attempt:null,expiresAt:null};queue('TICKET_GIFT','gift_'+id);
 }else if(op==='REASSIGN'){
  requireThat(acquired(o)&&o.access!=='LIVE','TICKET_CLOSED');
  requireThat(!o.exposedAt||input.acknowledgeExposure===true,'TICKET_EXPOSURE');
  const role=roles.find(r=>r.id===documentId(input.roleId));
  requireThat(role?.enabled&&!role.holder&&!await tx.get('sessions/'+s.id+'/characters/'+role.id),'TICKET_TAKEN');
  if(oldRole){requireThat(oldRole.holder===key,'FORBIDDEN');tx.set(base+'/roles/'+oldRole.id,{...oldRole,holder:null});}
  tx.set(base+'/roles/'+role.id,{...role,holder:key});
  next={...next,roleId:role.id,access:'PRE_GAME_READ_ONLY',versionId:e.versionId,readAt:null,exposedAt:null};
 }else if(op==='REFUND_EXCEPTION'||op==='ACCEPT_EXCEPTION'){
  const aid=documentId(input.exceptionId),exception=await tx.get(base+'/exceptions/'+aid);
  requireThat(exception?.uid===o.uid&&exception.status==='OPEN','TICKET_UNAVAILABLE');
  if(op==='ACCEPT_EXCEPTION'){
   requireThat(free&&s.stage==='PREPARATION'&&o.attempt===aid&&o.payment==='PAID_NEEDS_RECONCILIATION'&&exception.currency==='EUR'&&exception.amount===o.price,'TICKET_CAPACITY');
   next={...next,payment:'PAID',participation:'CONFIRMED'};queue('TICKET_CONFIRMED',aid);
  }else{
   tx.set(base+'/testRefunds/'+aid,{attempt:aid,amount:exception.amount,currency:exception.currency,at});
   if(o.attempt===aid)next={...next,payment:'REFUNDED',participation:'CANCELLED',access:'NONE'};
  }
  tx.set(base+'/exceptions/'+aid,{...exception,status:'RESOLVED',resolution:op,at});
 }else{
  requireThat((op==='REFUND'&&o.payment==='PAID')||(op==='CANCEL'&&['COMPED','DRAFT','CHECKOUT_PENDING','EXPIRED','FAILED'].includes(currentOrder(o,at).payment)),'TICKET_UNAVAILABLE');
  requireThat(!o.exposedAt||input.acknowledgeExposure===true,'TICKET_EXPOSURE');
  if(o.access==='LIVE'){
   const rp='sessions/'+s.id+'/registrations/'+key,r=await tx.get(rp);requireThat(r?.characterId===o.roleId,'FORBIDDEN');
   tx.set(rp,{...r,accessActive:false,accessVersion:r.accessVersion+1,minAuthTime:Math.floor(at/1000)+1});
  }else if(oldRole){
   requireThat(oldRole.holder===key,'FORBIDDEN');tx.set(base+'/roles/'+oldRole.id,{...oldRole,holder:null});
  }
  if(op==='REFUND')tx.set(base+'/testRefunds/'+o.attempt,{attempt:o.attempt,amount:o.price,currency:o.currency,at});
  next={...next,payment:op==='REFUND'?'REFUNDED':'CANCELLED',participation:'CANCELLED',roleId:null,access:'NONE',expiresAt:null,readAt:null,exposedAt:null};
 }
 recordOrder(tx,base,e,next);
 const result={revision:next.revision};tx.set(path,{signature,result});
 tx.set(base+'/history/'+id,{id,kind:op,actor:actor.uid,subject:key,reason,from:o.roleId,to:next.roleId,at});return result;
}
