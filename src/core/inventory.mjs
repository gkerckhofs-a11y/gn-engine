import {documentId,requireThat} from './validation.mjs';
import {inventoryHash as hash,itemInput,itemQuantity,publicItem,publicLot,lotState,newLot,personalLot} from './inventory-state.mjs';
const reason=v=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=500,'INVALID_ITEM');return v.trim();};
const writes=new Set(['saveItem','saveSessionItem','setStartingInventory','grantItem','correctLot']);
export const inventoryAction=a=>writes.has(a)||['prepareStartingInventory','prepareGrantItem','itemHistory','myInventory','previewInventory'].includes(a);
export function createInventoryService({store,signed,checkSession,checkScenario,now,uuid}){
  const context=async(tx,actor,input)=>{
    requireThat(!!input.sessionId!==!!input.scenarioId,'INVALID_ITEM');const session=!!input.sessionId,id=documentId(session?input.sessionId:input.scenarioId);
    const parent=session?await checkSession(tx,actor,id):await checkScenario(tx,actor,id);return {session,parent,base:`${session?'sessions':'scenarios'}/${id}`};
  };
  const prepareSeed=async(tx,base,parent,input)=>{
    const c=await tx.get(`${base}/characters/${documentId(input.characterId)}`);requireThat(c,'NOT_FOUND');
    requireThat(Array.isArray(input.items)&&input.items.length<=60,'INVALID_ITEM');const ids=new Set(),items=[];
    for(const x of input.items){requireThat(x&&typeof x==='object','INVALID_ITEM');const id=documentId(x.itemId);requireThat(!ids.has(id),'DUPLICATE_ITEM');ids.add(id);
      const d=await tx.get(`${base}/items/${id}`);requireThat(d?.publicationState==='PUBLISHED','ITEM_UNPUBLISHED');items.push({item:publicItem(d),quantity:itemQuantity(d,x.quantity)});
    }
    items.sort((a,b)=>a.item.id.localeCompare(b.item.id));const after={revision:(c.startingInventory?.revision??0)+1,items},before=c.startingInventory??null;
    return {c,before,after,characterName:c.public.displayName,confirmation:hash(JSON.stringify([parent.revision,c.id,before,after]))};
  };
  const prepareGrant=async(tx,base,parent,input)=>{
    const c=await tx.get(`${base}/characters/${documentId(input.characterId)}`);requireThat(c,'NOT_FOUND');
    const d=await tx.get(`${base}/items/${documentId(input.itemId)}`);requireThat(d?.publicationState==='PUBLISHED','ITEM_UNPUBLISHED');
    const quantity=itemQuantity(d,input.quantity),item=publicItem(d);
    return {c,item,quantity,characterName:c.public.displayName,confirmation:hash(JSON.stringify([parent.revision,c.id,c.public.displayName,item,quantity]))};
  };
  return async(action,actor,input)=>{
    signed(actor);const at=now(),newId=uuid();
    return store.runTransaction(async tx=>{
      if(action==='myInventory'||action==='previewInventory'){
        const preview=action==='previewInventory',sid=documentId(input.sessionId),s=preview?await checkSession(tx,actor,sid):await tx.get(`sessions/${sid}`);
        requireThat(s&&s.stage!=='ARCHIVED','FORBIDDEN');
        const r=preview?null:await tx.get(`sessions/${sid}/registrations/${hash(actor.uid)}`);
        if(!preview)requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&actor.authTime>=r.minAuthTime,'FORBIDDEN');
        const c=await tx.get(`sessions/${sid}/characters/${preview?documentId(input.characterId):r.characterId}`);
        requireThat(c&&(preview||c.assignedUid===actor.uid),'FORBIDDEN');
        requireThat(['BRIEFING','EN_JEU','PAUSE','FINISHED'].includes(s.stage),'BRIEFING_CLOSED');
        requireThat(c.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED','CONTENT_UNPUBLISHED');
        const lots=await tx.list(`sessions/${sid}/inventory`,['holderId',c.id]);
        return {session:{id:sid,stage:s.stage},healthEnabled:s.healthRules?.enabled===true,preview,character:{id:c.id,name:c.public.displayName},lots:lots.filter(l=>personalLot(l,c.id)).map(publicLot)};
      }
      const {session,parent,base}=await context(tx,actor,input);
      if(action==='itemHistory'){
        const kind=input.kind;requireThat(['items','characters','inventory'].includes(kind)&&(kind!=='inventory'||session),'INVALID_ITEM');
        const id=documentId(input.id);requireThat(await tx.get(`${base}/${kind}/${id}`),'NOT_FOUND');
        return {kind,events:await tx.list(`${base}/${kind}/${id}/${kind==='inventory'?'history':'inventoryHistory'}`,null,{orderBy:'at',direction:'desc',limit:30})};
      }
      requireThat(parent.stage!=='ARCHIVED','SESSION_CLOSED');
      requireThat(action==='saveItem'?!session:action==='saveSessionItem'||action==='grantItem'||action==='prepareGrantItem'||action==='correctLot'?session:!session,'INVALID_ITEM');
      let op,fingerprint;
      if(writes.has(action)){
        op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`;fingerprint=hash(JSON.stringify([action,input]));const previous=await tx.get(op);
        if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
      }
      requireThat(parent.revision===input.revision,'STALE_REVISION');
      const memo=session&&writes.has(action)?reason(input.reason):'Préparation du scénario';let before=null,after,id,kind,result;
      if(action==='prepareStartingInventory'||action==='setStartingInventory'){
        const p=await prepareSeed(tx,base,parent,input);if(action==='prepareStartingInventory')return {before:p.before,after:p.after,characterName:p.characterName,confirmation:p.confirmation};
        requireThat(p.confirmation===input.confirmation,'STALE_REVISION');id=p.c.id;kind='characters';before=p.before;after=p.after;
        tx.set(`${base}/characters/${id}`,{...p.c,startingInventory:after});result={id,revision:after.revision};
      }else if(action==='prepareGrantItem'||action==='grantItem'){
        const p=await prepareGrant(tx,base,parent,input);if(action==='prepareGrantItem')return {item:p.item,quantity:p.quantity,characterName:p.characterName,confirmation:p.confirmation};
        requireThat(p.confirmation===input.confirmation,'STALE_REVISION');id=newId;kind='inventory';
        const lot=newLot(id,p.item,p.quantity,p.c.id,at,{kind:'GM_GRANT',actorUid:actor.uid});after=lotState(lot);
        tx.set(`${base}/inventory/${id}`,lot);result={id};
      }else if(action==='correctLot'){
        id=documentId(input.lotId);kind='inventory';const lot=await tx.get(`${base}/inventory/${id}`);requireThat(lot,'NOT_FOUND');
        requireThat(lot.revision===input.lotRevision,'STALE_REVISION');requireThat(['AVAILABLE','SEIZED'].includes(lot.status),'LOT_CLOSED');
        const quantity=itemQuantity(lot.item,input.quantity,true);requireThat(['AVAILABLE','SEIZED','DESTROYED'].includes(input.status)&&(quantity===0?input.status==='DESTROYED':input.status!=='DESTROYED'),'INVALID_ITEM');
        before=lotState(lot);const next={...lot,quantity,status:input.status,revision:lot.revision+1};after=lotState(next);
        tx.set(`${base}/inventory/${id}`,next);result={id,revision:next.revision};
      }else{
        id=input.id?documentId(input.id):newId;kind='items';before=input.id?await tx.get(`${base}/items/${id}`):null;if(input.id)requireThat(before,'NOT_FOUND');
        after=itemInput(input,id,before??{});tx.set(`${base}/items/${id}`,after);result={id,revision:after.revision};
      }
      const event={id:newId,kind:action,at,actorUid:actor.uid,reason:memo,before,after};
      tx.set(`${base}/${kind}/${id}/${kind==='inventory'?'history':'inventoryHistory'}/${newId}`,event);
      tx.set(base,{...parent,revision:parent.revision+1});if(session)tx.set(`${base}/audit/${newId}`,{...event,action,targetId:id});
      tx.set(op,{fingerprint,result,at});return result;
    });
  };
}
