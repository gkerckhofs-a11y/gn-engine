import {requireThat,whole,documentId} from './validation.mjs';
import {inventoryHash as hash,itemQuantity} from './inventory-state.mjs';
import {abilityLevel} from './abilities.mjs';
export const negotiationTargetId=id=>`neg_${hash(id)}`;
export const discountedTotal=total=>Math.max(1,Number((BigInt(total)*9n+9n)/10n));
export function negotiationTarget(shop,offer){
 return {id:negotiationTargetId(offer.id),kind:'ANALYSIS',publicationState:'PUBLISHED',revision:offer.revision??1,title:`Négocier : ${offer.name}`,description:offer.conditions??'',gmNotes:'',negotiation:{shopId:shop.id,offerId:offer.id},dependencyId:null,offlineSeconds:0,failureLockSeconds:0,repairProtectionSeconds:0,rewards:[],profiles:{ANALYZE:{kind:'ANALYZE',skillId:'COU-02',minLevel:offer.negotiationLevel,durationSeconds:120,durationByLevel:{},test:'D6',threshold:6,cost:1,cooldownSeconds:600,bonusItems:[],consumable:null,successText:'Remise obtenue pour ce lot.',failureText:'Aucune remise obtenue.',instructions:'Offre explicitement négociable du comptoir. Deux minutes, 1 PA, D6 + COU-02 ≥ 6. Remise unique de 10 %, arrondie au crédit supérieur, utilisable cinq minutes réelles. Une tentative par version d’offre ; les autorisations commerciales restent applicables.'}}};
}
export async function negotiableOffer(tx,s,c,target,quantity=1){
 requireThat(s.spaceOutlaws?.merchantNegotiationVersion===1&&target.negotiation,'SO_GAMEPLAY_NOT_OPEN');
 const {shopId,offerId}=target.negotiation,shop=await tx.get(`sessions/${s.id}/shops/${documentId(shopId)}`),offer=await tx.get(`sessions/${s.id}/shops/${shopId}/offers/${documentId(offerId)}`);
 requireThat(shop?.versionId===s.versionId&&offer?.versionId===s.versionId&&offer.negotiationLevel>=1&&offer.negotiationLevel<=5&&offer.revision===target.revision&&negotiationTargetId(offer.id)===target.id,'NEGOTIATION_UNAVAILABLE');
 requireThat(abilityLevel(c,'COU-02')>=offer.negotiationLevel,'FIELD_SKILL_REQUIRED');
 const lot=await tx.get(`sessions/${s.id}/inventory/${hash(`shop-stock:${offer.id}`)}`),count=itemQuantity(offer.item,quantity);
 requireThat(lot?.ownerType==='SHOP'&&lot.ownerId===shopId&&lot.status==='AVAILABLE'&&lot.item.id===offer.item.id&&lot.quantity>=count,'INSUFFICIENT_STOCK');
 return {shopId,offerId,offerRevision:offer.revision,lotId:lot.id,lotRevision:lot.revision,quantity:count,total:whole(offer.unitPrice*count,'BALANCE_OVERFLOW')};
}
export function discountResult(s,x,at){return {...x,sessionId:s.id,amount:discountedTotal(x.total),expiresAt:at+300000,usedAt:null};}
export function validDiscount(a,ctx,offer,lot,quantity,at){
 const d=a?.result?.discount;
 return !!(ctx.s.spaceOutlaws?.merchantNegotiationVersion===1&&a?.status==='SUCCEEDED'&&a.profile?.skillId==='COU-02'&&a.characterId===ctx.c.id&&a.actorUid===ctx.c.assignedUid&&a.accessVersion===ctx.r.accessVersion&&abilityLevel(ctx.c,'COU-02')>=offer.negotiationLevel&&d&&!d.usedAt&&at<d.expiresAt&&d.shopId===offer.shopId&&d.offerId===offer.id&&d.offerRevision===offer.revision&&d.lotId===lot?.id&&d.lotRevision===lot.revision&&d.quantity===quantity&&d.total===offer.unitPrice*quantity&&d.amount===discountedTotal(d.total));
}
