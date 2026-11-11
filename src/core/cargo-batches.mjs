// Shared native cargo reservation/receipt writes. Authorization, capacity,
// elapsed time and presence are checked by each calling gameplay service.
export const cargoLotState=l=>({quantity:l.quantity,status:l.status,revision:l.revision,ownerType:l.ownerType??'CHARACTER',ownerId:l.ownerId,holderId:l.holderId,location:l.location});
export function reserveCargoBatch(tx,sid,{lot,quantity,transfer,id,at,actorUid}){
 const entire=quantity===lot.quantity,lotId=entire?lot.id:id,reserved={...lot,id:lotId,quantity,status:'CARGO_RESERVED',cargoTransferId:id,revision:entire?lot.revision+1:1,...(!entire?{createdAt:at,origin:{kind:'CARGO_SPLIT',parentLotId:lot.id,rootLotId:lot.origin?.rootLotId??lot.id}}:{})},remaining=entire?reserved:{...lot,quantity:lot.quantity-quantity,revision:lot.revision+1},record={...transfer,id,lotId,originalLotId:lot.id};
 const event={id,kind:'CARGO_LOADING',at,actorUid,name:lot.item.name,quantity,transferId:id,before:cargoLotState(lot),after:cargoLotState(remaining),movedLotId:lotId,reserved:cargoLotState(reserved)};
 tx.set(`sessions/${sid}/inventory/${lot.id}`,remaining);tx.set(`sessions/${sid}/inventory/${lot.id}/history/${id}`,event);
 if(!entire){tx.set(`sessions/${sid}/inventory/${lotId}`,reserved);tx.set(`sessions/${sid}/inventory/${lotId}/history/${id}`,{...event,before:null,after:cargoLotState(reserved)});}
 tx.set(`sessions/${sid}/cargoTransfers/${id}`,record);return {record,event,reserved,remaining,result:{id,lotId,status:'LOADING'}};
}
export function finishCargoBatch(tx,sid,{lot,transfer:t,receive,id,at,actorUid,reason,patch={},feeReceipt=null}){
 const next={...lot,status:'AVAILABLE',cargoTransferId:null,location:receive?t.destination:t.source,...(receive&&lot.hiddenCargo?.concealed?{hiddenCargo:{...lot.hiddenCargo,concealed:false}}:{}),revision:lot.revision+1,...patch},closed={...t,status:receive?'RECEIVED':'CANCELLED',closedAt:at,closedBy:actorUid,revision:t.revision+1,...(feeReceipt?{feeReceipt}:{})},event={id,kind:receive?'CARGO_RECEIVED':'CARGO_CANCELLED',at,actorUid,name:t.name,quantity:t.quantity,transferId:t.id,before:cargoLotState(lot),after:cargoLotState(next),reason};
 tx.set(`sessions/${sid}/inventory/${lot.id}`,next);tx.set(`sessions/${sid}/inventory/${lot.id}/history/${id}`,event);tx.set(`sessions/${sid}/cargoTransfers/${t.id}`,closed);return {next,closed,event,result:{id:t.id,lotId:lot.id,status:closed.status,...(feeReceipt?{feeReceipt}:{})}};
}
