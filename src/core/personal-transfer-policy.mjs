import {canGameAction} from './health-state.mjs';
import {personalLot} from './inventory-state.mjs';
// Explicit restrictions survive transfers and partial splits. A volume is not a freight designation.
export const personalTransferAllowed=(s,l,cid)=>!!l&&personalLot(l,cid)&&l.status==='AVAILABLE'&&l.quantity>0
  &&(!s.spaceOutlaws||(s.spaceOutlaws.actionsVersion===1&&l.transferable!==false
    &&l.origin?.kind!=='SO_BIRTH'&&!l.transportContractId&&!l.boardingCustody
    &&(l.origin?.kind!=='SO_FORGERY'||s.spaceOutlaws.inf03Version===1)));
export const personalTransferActorAllowed=(s,c)=>!!c&&canGameAction(s,c,'transfer')
  &&(!s.spaceOutlaws||(!s.safetyStop?.active&&!c.survival?.dead));
