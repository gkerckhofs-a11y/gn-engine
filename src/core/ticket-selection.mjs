import {admissionKeys} from './admission-state.mjs';
import {documentId,requireThat} from './validation.mjs';
import {myOrder,recordOrder,ticketUserKey} from './ticket-orders.mjs';

export const teaser=r=>({id:r.id,name:r.name,profession:r.profession,teaser:r.teaser,style:r.style,portrait:r.portrait??null,
 status:r.holder?'RESERVED':r.enabled?'AVAILABLE':'BLOCKED'});
export async function selection({tx,base,e,s,at,actor,input,action,version,uuid}){
 const key=ticketUserKey(actor.uid),o=await tx.get(base+'/orders/'+key);
 requireThat(o?.uid===actor.uid&&o.payment==='PAID'&&o.participation==='CONFIRMED','TICKET_UNPAID');
 if(action==='ticketGallery'){
  admissionKeys(input,['sessionId']);const roles=await tx.list(base+'/roles');
  return {roles:roles.map(teaser),revision:e.revision,orderRevision:o.revision,selected:o.roleId};
 }
 admissionKeys(input,['sessionId','roleId','revision','orderRevision','requestId','confirm']);
 requireThat(!s.safetyStop?.active&&['PREPARATION','BRIEFING'].includes(s.stage),'TICKET_CLOSED');
 const id=documentId(input.roleId),r=await tx.get(base+'/roles/'+id),v=await version();
 const def=v.changes.find(ch=>ch.entityId===id&&ch.type==='character'&&ch.operation==='UPSERT');
 requireThat(def?.data.creationPlan&&r&&v.header.id===e.versionId,'TICKET_MASTER');
 if(o.roleId===id&&r.holder===key)return myOrder(o,at);
 requireThat(!o.roleId&&!r.holder&&r.enabled&&!await tx.get('sessions/'+s.id+'/characters/'+id),'TICKET_TAKEN');
 requireThat(input.revision===e.revision&&input.orderRevision===o.revision&&input.confirm===true,'STALE_REVISION');
 const next={...o,revision:o.revision+1,roleId:id,versionId:e.versionId,access:'PRE_GAME_READ_ONLY'};
 tx.set(base+'/roles/'+id,{...r,holder:key});
 recordOrder(tx,base,e,next);const log=uuid();tx.set(base+'/history/'+log,{id:log,kind:action,actor:actor.uid,roleId:id,at});
 return myOrder(next,at);
}
