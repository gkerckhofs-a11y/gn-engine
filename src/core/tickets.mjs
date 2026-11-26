import {testCheckout} from './ticket-provider.mjs';
import {ticketUserKey,myOrder,reserveTicket} from './ticket-orders.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {documentId,requireThat} from './validation.mjs';
import {isPreparation} from './preparation-state.mjs';
import {readSoEntryVersion,planSoBirthAssets,soBirthOptions} from './space-outlaws-entry.mjs';

export const ticketActions=new Set(['ticketMockCheckout','ticketSync','ticketMine','ticketReserve','ticketAccount','ticketCatalogue','ticketPage','ticketDesk','ticketPublish','ticketRole']);

const text=(v,max=1000,required=true)=>admissionText(v??'',max,required);
const integer=(v,min,max)=>{requireThat(Number.isSafeInteger(v)&&v>=min&&v<=max,'TICKET_VALUE');return v;};
const active=s=>!!s&&!s.campaignSealed&&!['ARCHIVED','FINISHED'].includes(s.stage);
const editable=s=>requireThat(active(s)&&!s.safetyStop?.active,'TICKET_CLOSED');
const saleStage=s=>s.stage==='PREPARATION'&&!s.safetyStop?.active;
export async function ticketVersion(tx,s,e){
 const campaign=await tx.get('campaigns/'+s.campaignId),draft=await tx.get('campaigns/'+s.campaignId+'/masterDrafts/initial');
 requireThat(campaign?.preparationSessionId===s.id&&draft?.status==='SEALED'&&draft.publishedVersionId&&(!e||e.versionId===draft.publishedVersionId)&&(!s.versionId||s.versionId===draft.publishedVersionId),'TICKET_MASTER');
 const version=await readSoEntryVersion(tx,campaign,draft.publishedVersionId);
 requireThat(version.header.sessionId===s.id,'TICKET_MASTER');return version;
}
const characters=v=>v.changes.filter(x=>x.type==='character'&&x.operation==='UPSERT'&&x.data.creationPlan&&x.source!=='ADMISSION'&&!x.entityId.startsWith('admission_'));
const fields=['title','story','date','time','place','duration','practical','guidance','terms','privacy','cancellation','contact','seller','faq'];
function metadata(v){
 admissionKeys(v,[...fields,'price','capacity','holdMinutes','policyVersion','sale','published']);
 const m=Object.fromEntries(fields.map(k=>[k,text(v[k],k==='title'?150:3000,!['faq'].includes(k))]));
 requireThat(/^\d{4}-\d{2}-\d{2}$/.test(m.date)&&Number.isFinite(Date.parse(m.date)),'TICKET_VALUE');
 requireThat(['OPEN','WAITLIST','CLOSED'].includes(v.sale)&&typeof v.published==='boolean','TICKET_VALUE');
 return {...m,sale:v.sale,published:v.published,price:integer(v.price,1,10000000),capacity:integer(v.capacity,1,100),holdMinutes:integer(v.holdMinutes,1,1440),policyVersion:text(v.policyVersion,90),currency:'EUR'};
}
function inventory(roles,orders,time){
 const usable=roles.filter(r=>r.enabled),occupied=orders.filter(o=>o.participation==='CONFIRMED'||o.payment==='CHECKOUT_PENDING'&&o.expiresAt>time);
 return {usable,occupied,free:capacity=>Math.max(0,Math.min(capacity,usable.length)-occupied.length)};
}
function publicEvent(e,s,stock){
 const {id,title,story,date,time,place,duration,price,currency,capacity,practical,guidance,terms,privacy,cancellation,contact,seller,faq,policyVersion,revision}=e;
 const remaining=stock.free(Math.min(capacity,s.capacity));
 return {id,title,story,date,time,place,duration,price,currency,capacity,remaining,practical,guidance,terms,privacy,cancellation,contact,seller,faq,policyVersion,revision,
 status:!saleStage(s)||e.sale==='CLOSED'?'CLOSED':e.sale==='WAITLIST'?'WAITLIST':remaining?'OPEN':'FULL'};
}
export function createTicketService({store,signed,checkSession,now,uuid,ticketSandbox=false}){
 return async(action,actor,input)=>{
  if(action==='ticketCatalogue'){
   admissionKeys(input,[]);
   if(!ticketSandbox)return [];
   return store.runTransaction(async tx=>{
    const rows=[];for(const e of await tx.list('ticketEvents',['published',true])){
     const s=await tx.get('sessions/'+e.id);if(!active(s))continue;
     const base='ticketEvents/'+e.id,stock=inventory(await tx.list(base+'/roles'),await tx.list(base+'/orders'),now());
     rows.push(publicEvent(e,s,stock));
    }return rows.sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title));
   });
  }
  requireThat(ticketSandbox,'TICKET_SANDBOX_ONLY');
  if(action==='ticketAccount'){
   signed(actor);admissionKeys(input,[]);const key=ticketUserKey(actor.uid);
   return store.runTransaction(async tx=>{const out=[];for(const entry of await tx.list('ticketAccounts/'+key+'/sessions')){
    const o=await tx.get('ticketEvents/'+entry.id+'/orders/'+key);if(o?.uid===actor.uid)out.push(myOrder(o,now()));
   }return out;});
  }
  const sid=documentId(input.sessionId),base='ticketEvents/'+sid;
  return store.runTransaction(async tx=>{
   const at=now(),s=await tx.get('sessions/'+sid),e=await tx.get(base);
   if(action==='ticketPage'){
    admissionKeys(input,['sessionId']);requireThat(e?.published&&active(s),'TICKET_UNAVAILABLE');
    return publicEvent(e,s,inventory(await tx.list(base+'/roles'),await tx.list(base+'/orders'),at));
   }
   if(['ticketMockCheckout','ticketSync'].includes(action)){
    signed(actor);requireThat(e&&s,'TICKET_UNAVAILABLE');const stock=inventory(await tx.list(base+'/roles'),await tx.list(base+'/orders'),at);
    return testCheckout({action,actor,input,tx,base,e,s,at,stock});
   }
   if(['ticketMine','ticketReserve'].includes(action)){
    signed(actor);requireThat(e&&active(s),'TICKET_UNAVAILABLE');const order=await tx.get(base+'/orders/'+ticketUserKey(actor.uid));
    if(action==='ticketMine'){admissionKeys(input,['sessionId']);return myOrder(order,at);}
    const stock=inventory(await tx.list(base+'/roles'),await tx.list(base+'/orders'),at);
    return reserveTicket({tx,base,e,s,actor,at,input,stock,uuid,order});
   }
   await checkSession(tx,actor,sid,'content',true);editable(s);
   const v=await ticketVersion(tx,s,e);
   const roles=await tx.list(base+'/roles'),orders=await tx.list(base+'/orders'),stock=inventory(roles,orders,at);
   if(action==='ticketDesk')return {event:e,session:{id:sid,title:s.title,stage:s.stage,capacity:s.capacity},roles,definitions:characters(v).map(x=>({id:x.entityId,name:x.data.public.displayName})),available:e?stock.free(Math.min(e.capacity,s.capacity)):0};
   requireThat(saleStage(s)&&isPreparation(s),'TICKET_CLOSED');
   requireThat(input.revision===(e?.revision??0),'STALE_REVISION');
   const audit=(kind,detail)=>{const id=uuid();tx.set(base+'/history/'+id,{id,kind,at,actor:actor.uid,...detail});};
   if(action==='ticketPublish'){
    admissionKeys(input,['sessionId','revision','settings','requestId']);
    const m=metadata(input.settings);
    if(!e)requireThat(!s.accepted&&!(await tx.list('sessions/'+sid+'/registrations',null,{limit:1})).length,'TICKET_LEGACY');
    requireThat(m.capacity<=s.capacity&&m.capacity>=stock.occupied.length,'TICKET_CAPACITY');
    requireThat(!m.published||m.sale!=='OPEN'||stock.usable.length>=m.capacity,'TICKET_ROLES');
    if(e&&['terms','privacy','guidance','cancellation','seller'].some(k=>e[k]!==m[k]))requireThat(e.policyVersion!==m.policyVersion,'TICKET_POLICY');
    const next={...m,id:sid,mode:'PREMADE_PAID',versionId:v.header.id,revision:(e?.revision??0)+1};
    tx.set(base,next);audit(action,{revision:next.revision});return {revision:next.revision};
   }
   if(action==='ticketRole'){
    admissionKeys(input,['sessionId','revision','roleId','teaser','early','style','enabled','options','requestId']);
    requireThat(e,'TICKET_UNAVAILABLE');const id=documentId(input.roleId),d=characters(v).find(x=>x.entityId===id)?.data;
    requireThat(d&&typeof input.enabled==='boolean','TICKET_MASTER');
    const opts=soBirthOptions(input.options);
    await planSoBirthAssets(tx,s,v,id,d.creationPlan.classId,d.creationPlan.secondaryId,opts);
    const old=roles.find(x=>x.id===id);requireThat(!old?.holder,'TICKET_TAKEN');
    const role={id,name:d.public.displayName,profession:d.public.profession,teaser:text(input.teaser),early:text(input.early,4000,false),style:text(input.style,120,false),options:opts,enabled:input.enabled};
    const count=stock.usable.length-Number(!!old?.enabled)+Number(role.enabled);
    requireThat(count>=stock.occupied.length,'TICKET_CAPACITY');
    tx.set(base+'/roles/'+id,role);tx.set(base,{...e,revision:e.revision+1});audit(action,{roleId:id,enabled:role.enabled});return {revision:e.revision+1};
   }
   requireThat(false,'INVALID_ACTION');
  });
 };
}
