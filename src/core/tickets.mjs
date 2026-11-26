import {selection,ticketPreparation} from './ticket-selection.mjs';
import {testCheckout} from './ticket-provider.mjs';
import {ticketUserKey,myOrder,reserveTicket} from './ticket-orders.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {documentId,requireThat} from './validation.mjs';
import {isPreparation} from './preparation-state.mjs';
import {readSoEntryVersion,planSoBirthAssets,soBirthOptions,finishSoBirth} from './space-outlaws-entry.mjs';

export const ticketActions=new Set(['ticketPreparation','ticketReadBrief','ticketActivate','ticketBriefing','ticketGallery','ticketSelect','ticketMockCheckout','ticketSync','ticketMine','ticketReserve','ticketAccount','ticketCatalogue','ticketPage','ticketDesk','ticketPublish','ticketRole']);

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
  if(action==='ticketBriefing'){
   admissionKeys(input,['sessionId','requestId','confirm']);requireThat(input.confirm===true,'TICKET_CONSENT');
   const uids=await store.runTransaction(async tx=>{const s=await checkSession(tx,actor,sid,'content',true);editable(s);
    requireThat(['PREPARATION','BRIEFING'].includes(s.stage)&&await tx.get(base),'TICKET_CLOSED');
    return (await tx.list(base+'/orders')).filter(o=>o.participation==='CONFIRMED'&&o.roleId&&o.access!=='LIVE').map(o=>o.uid);
   });
   for(const uid of uids)await store.runTransaction(async tx=>{const s=await checkSession(tx,actor,sid,'content',true);editable(s);
    const e=await tx.get(base);await activate({tx,base,e,s,actor,uid,at:now(),uuid,input});});
   return {activated:uids.length};
  }
  return store.runTransaction(async tx=>{
   const at=now(),s=await tx.get('sessions/'+sid),e=await tx.get(base);
   if(action==='ticketPage'){
    admissionKeys(input,['sessionId']);requireThat(e?.published&&active(s),'TICKET_UNAVAILABLE');
    return publicEvent(e,s,inventory(await tx.list(base+'/roles'),await tx.list(base+'/orders'),at));
   }
   if(['ticketPreparation','ticketReadBrief','ticketActivate'].includes(action)){
    signed(actor);requireThat(e&&active(s),'TICKET_UNAVAILABLE');
    if(action==='ticketActivate'){
     admissionKeys(input,['sessionId','requestId']);requireThat(s.stage==='BRIEFING'&&!s.safetyStop?.active,'TICKET_CLOSED');
     return activate({tx,base,e,s,actor,uid:actor.uid,at,uuid,input});
    }return ticketPreparation({tx,base,e,s,at,actor,input,action});
   }
   if(['ticketGallery','ticketSelect'].includes(action)){
    signed(actor);requireThat(e&&active(s),'TICKET_UNAVAILABLE');
    return selection({tx,base,e,s,at,actor,input,action,version:()=>ticketVersion(tx,s,e),uuid});
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
    admissionKeys(input,['sessionId','revision','roleId','teaser','early','style','portrait','enabled','options','requestId']);
    requireThat(e,'TICKET_UNAVAILABLE');const id=documentId(input.roleId),d=characters(v).find(x=>x.entityId===id)?.data;
    requireThat(d&&typeof input.enabled==='boolean','TICKET_MASTER');
    const opts=soBirthOptions(input.options);
    await planSoBirthAssets(tx,s,v,id,d.creationPlan.classId,d.creationPlan.secondaryId,opts);
    const old=roles.find(x=>x.id===id);requireThat(!old?.holder,'TICKET_TAKEN');
    const portrait=input.portrait??null;requireThat(portrait===null||[0,1,2].includes(portrait),'TICKET_VALUE');
    const role={id,portrait,name:d.public.displayName,profession:d.public.profession,teaser:text(input.teaser),early:text(input.early,4000,false),style:text(input.style,120,false),options:opts,enabled:input.enabled};
    const count=stock.usable.length-Number(!!old?.enabled)+Number(role.enabled);
    requireThat(count>=stock.occupied.length,'TICKET_CAPACITY');
    tx.set(base+'/roles/'+id,role);tx.set(base,{...e,revision:e.revision+1});audit(action,{roleId:id,enabled:role.enabled});return {revision:e.revision+1};
   }
   requireThat(false,'INVALID_ACTION');
  });
 };
}

async function activate({tx,base,e,s,actor,uid,at,uuid,input}){
 const key=ticketUserKey(uid),o=await tx.get(base+'/orders/'+key);
 requireThat(o?.uid===uid&&o.payment==='PAID'&&o.participation==='CONFIRMED'&&o.roleId,'TICKET_UNPAID');
 const r=await tx.get(base+'/roles/'+o.roleId),reg=await tx.get('sessions/'+s.id+'/registrations/'+key);
 requireThat(r?.enabled&&r.holder===key&&o.versionId===e.versionId,'FORBIDDEN');
 const prior=await tx.get('sessions/'+s.id+'/characters/'+o.roleId);
 if(o.access==='LIVE'){
  requireThat(reg?.accessActive&&prior?.assignedUid===uid&&reg.characterId===o.roleId,'FORBIDDEN');
  return {characterId:o.roleId,alreadyBorn:true};
 }
 requireThat(['PREPARATION','BRIEFING'].includes(s.stage)&&!s.safetyStop?.active&&!reg&&!prior&&s.accepted<s.capacity,'TICKET_CLOSED');
 requireThat(!(await tx.list('sessions/'+s.id+'/characters',['assignedUid',uid],{limit:1})).length,'SO_BIRTH_CONFLICT');
 const version=await ticketVersion(tx,s,e),def=characters(version).find(x=>x.entityId===o.roleId)?.data;
 requireThat(def?.creationPlan,'TICKET_MASTER');
 const c=await tx.get('campaigns/'+s.campaignId),options=soBirthOptions(r.options);
 const {profile,lots}=await planSoBirthAssets(tx,s,version,o.roleId,def.creationPlan.classId,def.creationPlan.secondaryId,options);
 const registration={id:key,uid,sessionId:s.id,name:o.name,email:o.email,answers:{},createdAt:o.consentedAt,ticketAttempt:o.attempt};
 const plan={profile,lots,definition:def,characterId:o.roleId,r:registration};
 const op=base+'/activations/'+key;
 tx.set(base+'/orders/'+key,{...o,access:'LIVE',revision:o.revision+1});
 return finishSoBirth({tx,sid:s.id,c,s:{...s,accepted:s.accepted+1},version,plan,options,actor,at,uuid,reason:'Activation du billet au briefing',action:'ticketActivate',op,fingerprint:e.versionId+'/'+o.roleId,uid});
}
