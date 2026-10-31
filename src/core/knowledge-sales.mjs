import {documentId,requireThat,whole} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {accountId,moneyState,moneyText,writeLedger} from './economy-state.mjs';
import {accountEntry,accountParty} from './collective-accounts.mjs';
import {shopAccountId} from './space-outlaws-shop-state.mjs';
import {requireGameAction} from './health-state.mjs';
import {gameTime} from './clock.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';

const products={RUMOR:{label:'Rumeur commerciale',price:50},FLIGHT_PLAN:{label:'Plan de vol identifié',price:150},CONFIDENTIAL:{label:'Dossier confidentiel',price:300}};
const quoteFields=['characterId','knowledgeId','shopId','category','title','voyageId','source','reason','present'];
const fields={intelligenceAdmin:[],myIntelligence:[],prepareIntelligenceOffer:quoteFields,offerIntelligence:[...quoteFields,'confirmation'],prepareIntelligencePurchase:['offerId'],buyIntelligence:['offerId','confirmation','present'],cancelIntelligenceOffer:['offerId','confirmation','reason'],declineIntelligence:['offerId','confirmation','reason']};
export const knowledgeSaleActions=Object.keys(fields);
const admins=new Set(['intelligenceAdmin','prepareIntelligenceOffer','offerIntelligence','cancelIntelligenceOffer']);
const reads=new Set(['intelligenceAdmin','myIntelligence','prepareIntelligenceOffer','prepareIntelligencePurchase']);
const fit=(s,c,at)=>c?.birth&&c.hp>0&&!c.outOfCombat&&!c.survival?.dead&&!c.activeVoyageId&&!c.activeNavigationId&&!c.activeMaintenanceId&&!c.activeCargoId&&!c.activeFieldActionId&&!c.activePersonActionId&&!c.activeAidId&&!(c.convalescentUntilGameMs>gameTime(s.clock,at))&&(!s.transportRules?.homePort||(c.spacePortId??s.transportRules.homePort)===s.transportRules.homePort);
const receiptPath=(base,cid,kid)=>`${base}/characters/${cid}/knowledge/${kid}`;
const view=(r,confirmation,admin=false)=>({id:r.id,title:r.title,category:r.category,label:products[r.category].label,price:r.price,provider:r.provider,status:r.status,confirmation,...(r.status==='PURCHASED'?{knowledgeId:r.knowledgeId}:{}),...(admin?{characterId:r.characterId,characterName:r.characterName,knowledgeId:r.knowledgeId,knowledgeTitle:r.knowledgeTitle,voyageId:r.voyageId,source:r.source,reason:r.reason}:{})});

export function createKnowledgeSalesService({store,signed,checkSession,now,uuid,knowledgeSnapshot}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);const at=now(),id=uuid();
  return store.runTransaction(async tx=>{
   const admin=admins.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`;
   requireThat(s.spaceOutlaws?.intelligenceVersion===1&&s.spaceOutlaws.shopsVersion===1&&s.spaceOutlaws.navigationVersion===1,'SO_GAMEPLAY_NOT_OPEN');requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
   const proof=r=>hash(JSON.stringify([s.id,s.revision,r,version??null]));
   if(['intelligenceAdmin','myIntelligence'].includes(action)){
    const offers=await tx.list(`${base}/knowledgeDeals`,admin?null:['characterId',c.id]);
    return {session:{id:s.id,stage:s.stage},admin,offers:offers.map(r=>view(r,proof(r),admin)),...(admin?{products:Object.entries(products).map(([category,p])=>({category,...p})),knowledge:(await tx.list(`${base}/knowledge`)).filter(k=>k.publicationState==='PUBLISHED'&&!k.qrEnabled).map(k=>({id:k.id,title:k.title})),shops:(await tx.list(`${base}/shops`)).map(p=>({id:p.id,name:p.name})),characters:(await tx.list(`${base}/characters`)).filter(c=>c.birth).map(c=>({id:c.id,name:c.public.displayName})),voyages:(await tx.list(`${base}/voyages`)).map(v=>({id:v.id,name:v.name,shipId:v.shipId}))}:{} )};
   }
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input]));
   if(op){const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===version,'FORBIDDEN');return old.result;}}
   requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');const closing=['cancelIntelligenceOffer','declineIntelligence'].includes(action);requireThat(s.stage==='EN_JEU'||closing&&['BRIEFING','PAUSE'].includes(s.stage),'SESSION_NOT_RUNNING');
   const audit=(result,before,after)=>{authorizeSpaceOutlaws(tx,s,'INTELLIGENCE');tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,before,after});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});tx.set(op,{fingerprint,guard:version??null,result,at});return result;};
   if(['prepareIntelligenceOffer','offerIntelligence'].includes(action)){
    const category=input.category;requireThat(Object.hasOwn(products,category),'INVALID_INTELLIGENCE');const product=products[category],party=await inventoryParty(tx,s.id,documentId(input.characterId));requireThat(party.active&&fit(s,party.c,at),'INVALID_RECIPIENT');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
    const k=await tx.get(`${base}/knowledge/${documentId(input.knowledgeId)}`),shop=await tx.get(`${base}/shops/${documentId(input.shopId)}`);requireThat(k?.publicationState==='PUBLISHED'&&!k.qrEnabled&&shop?.versionId===s.versionId,'INTELLIGENCE_UNAVAILABLE');
    const path=receiptPath(base,party.c.id,k.id),receipt=await tx.get(path);requireThat(!receipt?.active,'INTELLIGENCE_ALREADY_KNOWN');requireThat(!receipt?.pendingOfferId,'INTELLIGENCE_ALREADY_OFFERED');
    const voyageId=input.voyageId?documentId(input.voyageId):null;if(category==='RUMOR')requireThat(!voyageId,'INVALID_INTELLIGENCE');else requireThat(voyageId&&await tx.get(`${base}/voyages/${voyageId}`),'INVALID_INTELLIGENCE');
    const title=admissionText(input.title,150,true),source=moneyText(input.source),reason=moneyText(input.reason),data={title,category,price:product.price,characterId:party.c.id,characterName:party.c.public.displayName,recipientVersion:party.version,knowledgeId:k.id,knowledgeTitle:k.title,knowledgeRevision:k.revision,shopId:shop.id,provider:shop.name,voyageId,source,reason};
    const confirmation=hash(JSON.stringify([s.revision,data,knowledgeSnapshot(k),receipt??null]));if(action==='prepareIntelligenceOffer')return {...data,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');
    const next={id,...data,status:'OFFERED',revision:1,createdAt:at};tx.set(`${base}/knowledgeDeals/${id}`,next);
    // An inactive native receipt holds the quote lock; no text is sent to the buyer.
    tx.set(path,{...(receipt??{id:k.id,active:false,snapshot:knowledgeSnapshot(k),receivedAt:at,source:'OFFERED',sourceName:shop.name,readAt:null,grantRevision:0}),pendingOfferId:id});return audit({id},null,next);
   }
   const r=await tx.get(`${base}/knowledgeDeals/${documentId(input.offerId)}`);requireThat(r&&(admin||r.characterId===c.id),'FORBIDDEN');requireThat(r.status==='OFFERED','INTELLIGENCE_CLOSED');const path=receiptPath(base,r.characterId,r.knowledgeId),receipt=await tx.get(path);
   if(closing){requireThat(input.confirmation===proof(r),'STALE_REVISION');const reason=moneyText(input.reason),next={...r,status:admin?'CANCELLED':'DECLINED',revision:r.revision+1,closedAt:at,closeReason:reason};tx.set(`${base}/knowledgeDeals/${r.id}`,next);if(receipt?.pendingOfferId===r.id)tx.set(path,{...receipt,pendingOfferId:null});return audit({id:r.id,status:next.status},r,next);}
   requireGameAction(s,c,'pay',at);requireThat(version===r.recipientVersion&&fit(s,c,at),'INTELLIGENCE_UNAVAILABLE');requireThat(!receipt?.active,'INTELLIGENCE_ALREADY_KNOWN');requireThat(receipt?.pendingOfferId===r.id,'INTELLIGENCE_UNAVAILABLE');
   const k=await tx.get(`${base}/knowledge/${r.knowledgeId}`),shop=await tx.get(`${base}/shops/${r.shopId}`),a=await tx.get(`${base}/accounts/${accountId(c.id)}`),b=await tx.get(`${base}/accounts/${shopAccountId(r.shopId)}`);
   requireThat(k?.publicationState==='PUBLISHED'&&k.revision===r.knowledgeRevision&&!k.qrEnabled&&shop?.versionId===s.versionId,'INTELLIGENCE_UNAVAILABLE');requireThat(a?.characterId===c.id&&b?.ownerType==='SHOP'&&b.shopId===r.shopId,'ACCOUNT_UNAVAILABLE');const before=moneyState(a);moneyState(b);requireThat(before.available>=r.price,'INSUFFICIENT_FUNDS');whole(b.balance+r.price,'BALANCE_OVERFLOW');
   const confirmation=hash(JSON.stringify([proof(r),receipt,knowledgeSnapshot(k),a,b]));if(action==='prepareIntelligencePurchase')return {offer:view(r,proof(r)),before,after:{available:before.available-r.price},confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
   const an={...a,balance:a.balance-r.price,revision:a.revision+1},bn={...b,balance:b.balance+r.price,revision:b.revision+1},next={...r,status:'PURCHASED',revision:r.revision+1,purchasedAt:at};
   tx.set(`${base}/accounts/${a.id}`,an);tx.set(`${base}/accounts/${b.id}`,bn);tx.set(`${base}/knowledgeDeals/${r.id}`,next);
   tx.set(path,{id:k.id,active:true,snapshot:knowledgeSnapshot(k),receivedAt:at,source:'PNJ',sourceName:r.provider,readAt:null,grantRevision:(receipt.grantRevision??0)+1,pendingOfferId:null,intelligence:{offerId:r.id,voyageId:r.voyageId,category:r.category}});
   writeLedger(tx,s.id,{id,kind:'INTELLIGENCE_PURCHASE',at,actorUid:actor.uid,memo:r.title,source:accountParty({a,name:c.public.displayName}),recipient:accountParty({a:b,name:r.provider}),createdCurrency:0,removedCurrency:0,entries:[accountEntry(a,-r.price,an),accountEntry(b,r.price,bn)]});return audit({id:r.id,knowledgeId:k.id},r,next);
  });
 };
}
