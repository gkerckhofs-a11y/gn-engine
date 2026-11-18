import {localServiceCatalog} from '../shared/local-service-catalog.mjs';
import {localCodeDigest} from './contextual-credentials.mjs';
import {requireThat} from './validation.mjs';
import {gameTime} from './clock.mjs';
const previews={buyShopOffer:'prepareShopPurchase',sellToPlanetMarket:'preparePlanetSale',refuelShip:'prepareRefuel',departShip:'prepareVoyage',startCargoTransfer:'prepareCargoTransfer',acceptSpaceMaintenance:'prepareSpaceMaintenance',startSpaceMaintenance:'prepareSpaceMaintenance',startModuleWork:'prepareModuleWorkStart',buyIntelligence:'prepareIntelligencePurchase',startCustomsInspection:'prepareCustomsInspection',merchantService:'prepareFieldAction',clinicCare:'preparePersonAction'};
export async function localNativePreview({tx,ctx,t,input,actor,at,nativePreview}){
 const action=previews[input.operation]??input.operation,meta=localServiceCatalog[input.operation],sid=ctx.s.id;
 const args=input.nativeInput??{};requireThat(args&&typeof args==='object'&&!Array.isArray(args)&&JSON.stringify(args).length<=10000,'INVALID_LOCAL_POLICY');
 const payload={...args,sessionId:sid};
 if(meta.kind==='SHOP'&&['shop','prepareShopPurchase'].includes(action))Object.assign(payload,{shopId:input.resourceId,...(action==='prepareShopPurchase'?{offerId:args.offerId??input.offerId,quantity:args.quantity??input.quantity??1,useProtected:args.useProtected??input.useProtected===true}:{})});
 if(input.operation==='dockEntry')payload.warehouseId=input.resourceId;
 if(input.operation==='merchantService')Object.assign(payload,{targetId:input.resourceId,kind:'ANALYZE'});
 if(meta.kind==='PORT'){
  const jobId=payload.mandateId??payload.maintenanceId,job=jobId?await tx.get(`sessions/${sid}/shipMaintenance/${jobId}`):null,shipId=payload.shipId??job?.shipId;
  const ship=shipId?await tx.get(`sessions/${sid}/ships/${shipId}`):null;requireThat(ship?.portId===input.resourceId,'SHIP_NOT_LOCAL');
 }
 if(input.operation==='clinicCare'){const p=payload.profileId?await tx.get(`sessions/${sid}/personProfiles/${payload.profileId}`):null;requireThat(p?.clinicTargetId===input.resourceId,'PERSON_PROFILE_UNAVAILABLE');}
 if(action==='prepareIntelligencePurchase'){const offer=payload.offerId?await tx.get(`sessions/${sid}/knowledgeDeals/${payload.offerId}`):null;requireThat(offer?.shopId===input.resourceId,'INTELLIGENCE_UNAVAILABLE');}
 const path=`localAccess/${sid}/presence/${ctx.c.id}`,old=await tx.get(path),codeProofs={...(old?.terminalId===t.id?old.codeProofs:{})};
 if(input.code)for(const g of await tx.list(`localAccess/${sid}/credentials`))if(g.terminalId===t.id&&g.kind==='CODE'&&g.active&&g.codeDigest===localCodeDigest(t.id,input.code))codeProofs[g.id]=g.revision;
 // A hypothetical presence is scoped to this read-only preview. No native right,
 // balance, stock, character or actual presence is manufactured or persisted.
 const presence={terminalId:t.id,terminalRevision:t.revision,characterVersion:ctx.version,expiresGameMs:gameTime(ctx.s.clock,at)+1000,codeProofs};
 const readOnly={...tx,get:p=>p===path&&input.assumePresent?Promise.resolve(presence):tx.get(p),set:p=>requireThat(p.startsWith(`localAccess/${sid}/journal/`),'SIMULATION_READ_ONLY'),delete:()=>requireThat(false,'SIMULATION_READ_ONLY')};
 const simulated={...actor,uid:ctx.c.assignedUid,email:'native-preview@example.invalid',authTime:Math.max(actor.authTime??0,ctx.r.minAuthTime??0)};
 const result=await nativePreview(readOnly,simulated,action,payload);requireThat(result?.allowed!==false,result?.reason??'FORBIDDEN');
 return {localAllowed:true,nativeAllowed:true,...(result?.amount?{amount:result.amount}:{})};
}
