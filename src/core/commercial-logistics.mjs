import {documentId,requireThat,whole} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
import {inventoryHash as hash,publicLot} from './inventory-state.mjs';
import {commercialClient,commercialTransportEnabled} from './commercial-transport-state.mjs';
import {publishedCustomsCargoAssessment} from './space-hidden-cargo.mjs';
import {personalTransferActorReady} from './personal-transfer-policy.mjs';
import {planetCommerceSession} from './planet-market-state.mjs';
import {accessAccount} from './collective-accounts.mjs';
import {accountId,currencyView} from './economy-state.mjs';
import {prepareCargoFees,settleCargoFees} from './customs-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';

export const commercialLogisticsActions=['commercialReceipts','prepareCommercialReceipt','receiveCommercialReceipt'];
export function ordinaryImportFee(item,quantity){
 requireThat(Number.isSafeInteger(item?.referenceUnitValueCr)&&item.referenceUnitValueCr>0&&Number.isSafeInteger(quantity)&&quantity>0,'COMMERCIAL_VALUE_REQUIRED');
 const numerator=BigInt(item.referenceUnitValueCr)*BigInt(quantity)*5n;
 // Guillaume, 15 November 2026: nearest integer credit, half up.
 return whole(Number((numerator+50n)/100n),'BALANCE_OVERFLOW');
}
export function createCommercialLogisticsService({store,signed,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);const at=now(),id=uuid(),write=action==='receiveCommercialReceipt';admissionKeys(input,['sessionId',...(action==='commercialReceipts'?[]:['lotId']),...(write?['confirmation','received','requestId']:[])]);
  return store.runTransaction(async tx=>{
   const ctx=await inventoryPlayer(tx,actor,input),{s,c}=ctx,b=`sessions/${s.id}`;requireThat(commercialTransportEnabled(s)&&s.stage!=='ARCHIVED','SO_GAMEPLAY_NOT_OPEN');
   if(action==='commercialReceipts'){
    const rows=[];for(const l of await tx.list(`${b}/inventory`,['ownerId',c.id])){
     if(l.ownerType!=='CHARACTER'||l.location.kind!=='PORT'||!l.transportDelivered||!l.transportContractId||l.quantity<=0)continue;
     const contract=await tx.get(`${b}/contracts/${l.transportContractId}`);if(!commercialClient(contract,ctx,actor))continue;
     const p=await tx.get(`${b}/ports/${l.location.id}`);rows.push({lot:publicLot(l),contractId:contract.id,port:{id:l.location.id,name:p?.name??'Port de livraison'},local:(c.spacePortId??s.transportRules?.homePort)===l.location.id});
    }return {session:{id:s.id},receipts:rows};
   }
   const op=write?`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`:null,fingerprint=hash(JSON.stringify([action,input])),old=op?await tx.get(op):null;
   if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(old.guard===ctx.version,'FORBIDDEN');return old.result;}
   requireThat(s.stage==='EN_JEU'&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');requireThat(await personalTransferActorReady(tx,planetCommerceSession(s,c.spacePortId??s.transportRules?.homePort),c),'OUT_OF_COMBAT');
   const lot=await tx.get(`${b}/inventory/${documentId(input.lotId)}`),contract=lot?.transportContractId?await tx.get(`${b}/contracts/${lot.transportContractId}`):null,t=contract?.terms.transport;
   requireThat(contract&&commercialClient(contract,ctx,actor)&&t?.commercial&&contract.acceptedAt!=null,'FORBIDDEN');
   requireThat(lot.ownerType==='CHARACTER'&&lot.ownerId===c.id&&lot.status==='AVAILABLE'&&lot.quantity>0&&lot.location.kind==='PORT'&&lot.location.id===t.toPort&&lot.transportDelivered&&!lot.boardingCustody&&!lot.hiddenCargo?.concealed&&!lot.customsDetention&&!lot.cargoTransferId&&!lot.fieldActionId,'COMMERCIAL_RECEIPT_REQUIRED');
   requireThat(!(contract.commercialFreightReceipts??[]).some(r=>r.lotId===lot.id),'COMMERCIAL_RECEIPT_REQUIRED');
   const port=await tx.get(`${b}/ports/${t.toPort}`),voyage=await tx.get(`${b}/voyages/${lot.transportLastVoyageId??lot.transportVoyageId}`);
   requireThat(voyage?.status==='ARRIVED'&&voyage.shipId===t.shipId&&voyage.toPort===t.toPort&&voyage.departedAt>=contract.acceptedAt,'SO_TRANSPORT_DELIVERY');
   const assessment=publishedCustomsCargoAssessment({ship:{id:t.shipId,docked:true,portId:t.toPort},port,sessionVersionId:s.versionId,stock:[lot]});
   requireThat(assessment.portPolicy.status==='PUBLISHED'&&assessment.lots[0].customsStatus==='FREE'&&lot.item.legality==='LEGAL','PLANET_TRADE_RESTRICTED');
   const amount=ordinaryImportFee(lot.item,lot.quantity),quote={direction:'IMPORT',total:amount,currency:currencyView(s.economyRules),lines:[{tariffId:'V07-FREE-IMPORT',tariffRevision:1,kind:'CUSTOMS',title:'Importation de marchandises libres · 5 %',description:'Taxe calculée sur la valeur de référence réelle du lot.',flatAmount:amount,unitAmount:0,quantity:lot.quantity,amount,recipientAccountId:null,beneficiary:{kind:'PORT',name:port.name}}]},from=await accessAccount(tx,{...ctx,guard:ctx.version},accountId(c.id)),payment=await prepareCargoFees(tx,s,quote,from);
   const confirmation=hash(JSON.stringify([ctx.version,contract.id,contract.revision,lot,port,assessment,payment.result.confirmation]));
   const preview={lot:publicLot(lot),port:{id:port.id,name:port.name},...payment.result,confirmation};if(!write)return preview;
   requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.received===true,'CARGO_RECEIPT_REQUIRED');
   authorizeSpaceOutlaws(tx,s,'PAYMENT');authorizeSpaceOutlaws(tx,s,'TRANSPORT');authorizeSpaceOutlaws(tx,s,'MISSIONS');
   const feeReceipt=settleCargoFees(tx,s,{id,clearance:quote,receivedByCharacterId:c.id},payment,from,at,id,actor),receipt={id,lotId:lot.id,portId:port.id,quantity:lot.quantity,itemId:lot.item.id,itemRevision:lot.item.revision,referenceUnitValueCr:lot.item.referenceUnitValueCr,ratePercent:5,ownerId:c.id,deliveredGameMs:lot.transportDeliveredGameMs,at,feeReceipt};
   const next={...lot,location:{kind:'COMMERCIAL',id:c.id,portId:port.id},holderId:c.id,transportContractId:null,commercialReceipt:{contractId:contract.id,receiptId:id},revision:lot.revision+1};
   tx.set(`${b}/inventory/${lot.id}`,next);tx.set(`${b}/inventory/${lot.id}/history/${id}`,{id,at,kind:'COMMERCIAL_IMPORT_RECEIPT',actorUid:actor.uid,before:lot,after:next});
   tx.set(`${b}/contracts/${contract.id}`,{...contract,commercialFreightReceipts:[...(contract.commercialFreightReceipts??[]),receipt],revision:contract.revision+1,updatedAt:at});tx.set(`${b}/contracts/${contract.id}/history/${id}`,{...receipt,action:'COMMERCIAL_IMPORT_RECEIPT',actorUid:actor.uid});
   const result={id:lot.id,contractId:contract.id,portId:port.id,feeReceipt};tx.set(op,{fingerprint,guard:ctx.version,result,at});tx.set(`${b}/audit/${id}`,{id,at,action,actorUid:actor.uid,lotId:lot.id,contractId:contract.id});return result;
  });
 };
}
