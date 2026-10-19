import {documentId,requireThat} from './validation.mjs';
import {inventoryHash as hash,itemQuantity,publicItem,personalLot} from './inventory-state.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';

const actions=new Set(['prepareLotTransfer','proposeLotTransfer','lotTransferDetail','acceptLotTransfer','declineLotTransfer','cancelLotTransfer']);
export const lotTransferAction=a=>actions.has(a);
const partyVersion=(c,r)=>hash(JSON.stringify([c.id,c.assignedUid,r.accessVersion,c.public.displayName]));
const published=c=>c?.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED';
async function party(tx,sid,cid){
  const c=await tx.get(`sessions/${sid}/characters/${cid}`);
  const r=c?.assignedUid?await tx.get(`sessions/${sid}/registrations/${hash(c.assignedUid)}`):null;
  const active=!!(published(c)&&r?.status==='ACCEPTED'&&r.accessActive&&r.characterId===cid);
  return {c,r,active,version:active?partyVersion(c,r):null};
}
async function player(tx,actor,input){
  const sid=documentId(input.sessionId),s=await tx.get(`sessions/${sid}`);
  requireThat(s&&s.stage!=='ARCHIVED','FORBIDDEN');
  const r=await tx.get(`sessions/${sid}/registrations/${hash(actor.uid)}`);
  requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&actor.authTime>=r.minAuthTime,'FORBIDDEN');
  const c=await tx.get(`sessions/${sid}/characters/${r.characterId}`);
  requireThat(c?.assignedUid===actor.uid,'FORBIDDEN');
  requireThat(['BRIEFING','EN_JEU','PAUSE','FINISHED'].includes(s.stage),'BRIEFING_CLOSED');
  requireThat(published(c),'CONTENT_UNPUBLISHED');return {s,c,r,version:partyVersion(c,r)};
}
const view=p=>({id:p.id,status:p.status,revision:p.revision,createdAt:p.createdAt,updatedAt:p.updatedAt,
  source:{id:p.sourceId,name:p.sourceName},recipient:{id:p.recipientId,name:p.recipientName},
  item:publicItem(p.item),quantity:p.quantity,lotId:p.lotId,receivedLotId:p.receivedLotId??null});
const confirmation=p=>hash(JSON.stringify(view(p)));
const movement=l=>({quantity:l.quantity,status:l.status,revision:l.revision,ownerId:l.ownerId,holderId:l.holderId,location:l.location});
async function current(tx,s,p){
  const source=await party(tx,s.id,p.sourceId),recipient=await party(tx,s.id,p.recipientId);
  const lot=await tx.get(`sessions/${s.id}/inventory/${p.lotId}`);
  const valid=source.active&&recipient.active&&source.version===p.sourceVersion&&recipient.version===p.recipientVersion&&
    !!lot&&personalLot(lot,p.sourceId)&&lot.status==='AVAILABLE'&&lot.revision===p.lotRevision&&lot.quantity>=p.quantity;
  return {source,recipient,lot,valid,canAccept:!!valid&&s.stage==='EN_JEU'&&canGameAction(s,source.c,'transfer')&&canGameAction(s,recipient.c,'transfer')};
}
async function projection(tx,s,c,p,preview=false){
  const sender=p.sourceId===c.id,x=p.status==='PENDING'?await current(tx,s,p):null;
  return {...view(p),direction:sender?'OUT':'IN',status:p.status==='PENDING'&&!x.valid?'STALE':p.status,
    canAccept:!preview&&!sender&&!!x?.canAccept,canClose:!preview&&p.status==='PENDING'&&(sender?x.source.version===p.sourceVersion:x.recipient.version===p.recipientVersion),confirmation:confirmation(p)};
}
export async function listLotTransfers(tx,s,c,preview=false){
  const base=`sessions/${s.id}/lotTransfers`,sent=await tx.list(base,['sourceId',c.id]),received=await tx.list(base,['recipientId',c.id]);
  const all=[...sent,...received].sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id));
  // Pending proposals remain visible; completed history is bounded for the player view.
  const selected=[...all.filter(p=>p.status==='PENDING'),...all.filter(p=>p.status!=='PENDING').slice(0,30)];
  return Promise.all(selected.map(p=>projection(tx,s,c,p,preview)));
}
export function createLotTransferService({store,signed,now,uuid}){
  async function prepare(tx,ctx,input){
    const {s,c,version}=ctx;requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'transfer');
    const recipientId=documentId(input.recipientId);requireThat(recipientId!==c.id,'INVALID_RECIPIENT');
    const recipient=await party(tx,s.id,recipientId);requireThat(recipient.active,'INVALID_RECIPIENT');
    const lot=await tx.get(`sessions/${s.id}/inventory/${documentId(input.lotId)}`);
    requireThat(lot&&personalLot(lot,c.id),'FORBIDDEN');
    const quantity=itemQuantity(lot.item,input.quantity);requireThat(lot.status==='AVAILABLE'&&lot.quantity>=quantity,'INSUFFICIENT_STOCK');
    const result={source:{id:c.id,name:c.public.displayName},recipient:{id:recipientId,name:recipient.c.public.displayName},
      item:publicItem(lot.item),lotId:lot.id,quantity,before:lot.quantity,remaining:lot.quantity-quantity};
    return {lot,recipient,result:{...result,confirmation:hash(JSON.stringify([s.id,version,recipient.version,lot.revision,result]))}};
  }
  return async(action,actor,input)=>{
    signed(actor);const at=now(),newId=uuid();
    return store.runTransaction(async tx=>{
      const ctx=await player(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`;
      if(action==='prepareLotTransfer')return (await prepare(tx,ctx,input)).result;
      let p,role;
      if(action!=='proposeLotTransfer'){
        p=await tx.get(`${base}/lotTransfers/${documentId(input.transferId)}`);
        requireThat(p&&(p.sourceId===c.id||p.recipientId===c.id),'FORBIDDEN');role=p.sourceId===c.id?'source':'recipient';
        if(action==='lotTransferDetail')return projection(tx,s,c,p);
        requireThat(action==='cancelLotTransfer'?role==='source':role==='recipient','FORBIDDEN');
        requireThat(version===p[`${role}Version`],'STALE_TRANSFER');
      }
      const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input]));
      const previous=await tx.get(op);
      if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(previous.partyVersion===version,'FORBIDDEN');return previous.result;}
      let result;
      if(action==='proposeLotTransfer'){
        const x=await prepare(tx,ctx,input);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');
        p={id:newId,status:'PENDING',revision:1,createdAt:at,updatedAt:at,sourceId:c.id,sourceName:c.public.displayName,sourceVersion:version,
          recipientId:x.recipient.c.id,recipientName:x.recipient.c.public.displayName,recipientVersion:x.recipient.version,
          lotId:x.lot.id,lotRevision:x.lot.revision,item:publicItem(x.lot.item),quantity:x.result.quantity};
        tx.set(`${base}/lotTransfers/${p.id}`,p);result={id:p.id,status:p.status};
      }else{
        requireThat(p.status==='PENDING','TRANSFER_CLOSED');
        requireThat(input.confirmation===confirmation(p),'STALE_TRANSFER');
        let next={...p,revision:p.revision+1,updatedAt:at};
        if(action==='acceptLotTransfer'){
          requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(input.received===true,'HANDOVER_REQUIRED');
          const x=await current(tx,s,p);requireThat(x.valid,'STALE_TRANSFER');
          requireGameAction(s,x.source.c,'transfer');requireGameAction(s,x.recipient.c,'transfer');
          const whole=x.lot.quantity===p.quantity,receivedId=whole?x.lot.id:newId;
          const received={...x.lot,id:receivedId,quantity:p.quantity,ownerId:p.recipientId,holderId:p.recipientId,
            location:{kind:'CHARACTER',id:p.recipientId},revision:whole?x.lot.revision+1:1,
            ...(!whole?{createdAt:at,origin:{kind:'TRANSFER_SPLIT',parentLotId:x.lot.id,rootLotId:x.lot.origin?.rootLotId??x.lot.id,transferId:p.id}}:{})};
          const remaining=whole?received:{...x.lot,quantity:x.lot.quantity-p.quantity,revision:x.lot.revision+1};
          const event={id:newId,kind:'TRANSFER',at,actorUid:actor.uid,reason:'Remise gratuite acceptée par le destinataire',transferId:p.id,
            sourceName:p.sourceName,recipientName:p.recipientName,quantity:p.quantity,before:movement(x.lot),after:movement(remaining),receivedLotId:receivedId};
          tx.set(`${base}/inventory/${x.lot.id}`,remaining);
          tx.set(`${base}/inventory/${x.lot.id}/history/${newId}`,event);
          if(!whole){tx.set(`${base}/inventory/${receivedId}`,received);tx.set(`${base}/inventory/${receivedId}/history/${newId}`,{...event,before:null,after:movement(received),sourceLotId:x.lot.id});}
          next={...next,status:'ACCEPTED',receivedLotId:receivedId};
        }else next.status=action==='cancelLotTransfer'?'CANCELLED':'DECLINED';
        tx.set(`${base}/lotTransfers/${p.id}`,next);result={id:p.id,status:next.status,...(next.receivedLotId?{receivedLotId:next.receivedLotId}:{})};
      }
      tx.set(`${base}/audit/${newId}`,{id:newId,action,at,actorUid:actor.uid,transferId:p.id,sourceId:p.sourceId,recipientId:p.recipientId,lotId:p.lotId,quantity:p.quantity,status:result.status});
      tx.set(op,{fingerprint,result,partyVersion:version,at});return result;
    });
  };
}
