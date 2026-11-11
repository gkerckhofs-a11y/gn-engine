// The same private provenance is checked by transfers, Rogue theft and the
// organizer's inspection. No game authorization is granted by this module.
export const isForgedLot=lot=>lot?.origin?.kind==='SO_FORGERY';

// Only organizer inspection can read an archived (quantity-zero) document.
// It must be explicitly marked destroyed/consumed; an inconsistent active
// quantity-zero item is never treated as a valid individual document.
export function validForgeryEvidence(lot,record,{allowArchived=false}={}){
 if(!isForgedLot(lot)||!record)return false;
 const archived=allowArchived&&lot.quantity===0&&['DESTROYED','CONSUMED'].includes(lot.status);
 const live=lot.quantity===1&&!['DESTROYED','CONSUMED'].includes(lot.status);
 return (live||archived)&&lot.item?.kind==='INDIVIDUAL'&&lot.transferable===true
  &&record.id===lot.id&&record.actionId===lot.origin.actionId
  &&record.templateId===lot.origin.templateId
  &&record.templateRevision===lot.origin.templateRevision;
}
export async function forgedLotIntegrity(tx,sid,lot,{allowArchived=false}={}){
 if(!isForgedLot(lot))return true;
 const evidence=await tx.get('sessions/'+sid+'/forgeryRecords/'+lot.id);
 return validForgeryEvidence(lot,evidence,{allowArchived});
}
