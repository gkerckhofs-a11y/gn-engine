// Optional on historical snapshots. Never infer a circuit from names, volume or category.
export const itemUsages=['PERSONAL','COMMERCIAL','FUEL'];
export const hasItemCircuits=s=>s.spaceOutlaws?.itemCircuitsVersion===1;
export const personalItem=i=>['PERSONAL','FUEL'].includes(i?.usage);
export const commercialLot=(l,cid)=>!!l&&(l.ownerType??'CHARACTER')==='CHARACTER'&&l.ownerId===cid&&l.holderId===cid&&l.location?.kind==='COMMERCIAL'&&l.location.id===cid&&l.item.usage==='COMMERCIAL';
export const receivedItemLocation=(item,cid,portId=null)=>item?.usage==='COMMERCIAL'?{kind:'COMMERCIAL',id:cid,portId}:{kind:'CHARACTER',id:cid};
export const transferableItem=l=>l?.transferable!==false&&l?.item?.transferable!==false;
export const resellableItem=l=>transferableItem(l)&&l?.resellable!==false&&l?.item?.resellable!==false;
export const commercialTradeAllowed=(l,cid)=>commercialLot(l,cid)&&resellableItem(l)&&!l.transportContractId&&!l.boardingCustody&&l.origin?.kind!=='SO_BIRTH';
export const classificationFields=d=>Object.fromEntries(['usage','transferable','resellable'].filter(k=>d[k]!==undefined).map(k=>[k,d[k]]));
