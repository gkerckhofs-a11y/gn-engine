import {heldDocument,documentReceiptAvailable} from './document-access.mjs';
import {readLot} from './inventory-state.mjs';
import {codeChallengeInput} from './field-state.mjs';
import {createKnowledgeSalesService,knowledgeSaleActions} from './knowledge-sales.mjs';
import {requireGameAction,canGameAction} from './health-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {abilityLevel} from './abilities.mjs';
import {createHash} from 'node:crypto';
import {requireThat,documentId} from './validation.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const text=(value,max,required=false)=>{
  requireThat(typeof value==='string' && value.length<=max && (!required||value.trim()),'INVALID_KNOWLEDGE');
  return value.trim();
};
const ids=value=>{
  requireThat(Array.isArray(value),'INVALID_KNOWLEDGE');const result=value.map(documentId);
  requireThat(new Set(result).size===result.length,'DUPLICATE_MEMBER');return result;
};
export function knowledgeInput(input,id,old={}) {
  requireThat(['KNOWLEDGE','CLUE','DOCUMENT'].includes(input.kind),'INVALID_KNOWLEDGE');
  requireThat(['DRAFT','READY','PUBLISHED'].includes(input.publicationState),'INVALID_KNOWLEDGE');
  requireThat(['SHOW','COPY'].includes(input.shareMode),'INVALID_KNOWLEDGE');
  requireThat(['ALL_PLAYERS','SELECTED'].includes(input.qrAudience),'INVALID_KNOWLEDGE');
  const skillId=input.qrSkillId===undefined?(old.qrSkillId??null):(input.qrSkillId?documentId(input.qrSkillId):null);
  const skillLevel=skillId?(input.qrSkillLevel??old.qrSkillLevel??1):null;
  requireThat(!skillId||(Number.isSafeInteger(skillLevel)&&skillLevel>0),'INVALID_KNOWLEDGE');
  const sourceCipher=input.cipher===undefined?(old.cipher??null):input.cipher;
  requireThat(sourceCipher===null||sourceCipher&&typeof sourceCipher==='object'&&!Array.isArray(sourceCipher),'INVALID_KNOWLEDGE');
  const cipher=sourceCipher===null?null:(()=>{
   requireThat(input.kind==='DOCUMENT'&&Number.isSafeInteger(sourceCipher.minLevel)&&sourceCipher.minLevel>=1&&sourceCipher.minLevel<=5
    &&Number.isSafeInteger(sourceCipher.threshold)&&sourceCipher.threshold>=2&&sourceCipher.threshold<=12,'INVALID_KNOWLEDGE');
   const plaintext=text(sourceCipher.plaintext,20000,true);
   requireThat(input.body!==plaintext,'INVALID_KNOWLEDGE');
   const bonusItemIds=sourceCipher.bonusItemIds===undefined?undefined:ids(sourceCipher.bonusItemIds);
   requireThat(!bonusItemIds||bonusItemIds.length<=20,'INVALID_KNOWLEDGE');
   let challenge;try{challenge=codeChallengeInput(sourceCipher.challenge,old.cipher?.challenge);}catch{requireThat(false,'INVALID_KNOWLEDGE');}
   requireThat(!challenge||!bonusItemIds?.length,'INVALID_KNOWLEDGE');
   return {minLevel:sourceCipher.minLevel,threshold:sourceCipher.threshold,plaintext,...(bonusItemIds!==undefined?{bonusItemIds}:{}),...(challenge?{challenge}:{})};
  })();
  return {id,...(cipher?{cipher}:{}),qrSkillId:skillId,qrSkillLevel:skillLevel,title:text(input.title,150,true),body:text(input.body,20000,true),origin:text(input.origin??'',300),
    kind:input.kind,publicationState:input.publicationState,shareMode:input.shareMode,
    gmTruth:text(input.gmTruth??'',10000),gmNotes:text(input.gmNotes??'',10000),
    initialCharacterIds:ids(input.initialCharacterIds??[]),qrEnabled:input.qrEnabled===true,
    qrAudience:input.qrAudience,qrCharacterIds:ids(input.qrCharacterIds??[]),revision:(old.revision??0)+1};
}
// Explicit allowlist: fictional truth, access rules and recipient identities never enter a receipt.
export const knowledgeSnapshot=k=>({title:k.title,body:k.body,origin:k.origin,kind:k.kind,shareMode:k.shareMode,revision:k.revision});
const receiptPath=(sid,cid,kid)=>`sessions/${sid}/characters/${cid}/knowledge/${kid}`;
export const initialReceipt=(k,at)=>({id:k.id,active:true,snapshot:knowledgeSnapshot(k),receivedAt:at,source:'INITIAL',sourceName:'Connaissance de départ',readAt:null});
export function seedKnowledge(tx,sid,knowledge,at){
  for(const k of knowledge){
    const next={...k,revision:1};tx.set(`sessions/${sid}/knowledge/${k.id}`,next);
    if(next.publicationState==='PUBLISHED')for(const cid of k.initialCharacterIds)tx.set(receiptPath(sid,cid,k.id),initialReceipt(next,at));
  }
}
const reads=new Set(['myKnowledge','previewKnowledge','knowledgeDetail','previewKnowledgeDetail','prepareKnowledgeShare','knowledgeHistory','knowledgeRecipients']);
const mutations=new Set(['openInventoryDocument','saveKnowledge','saveSessionKnowledge','grantKnowledge','discoverKnowledge','shareKnowledge','markKnowledgeRead']);
export const knowledgeAction=action=>reads.has(action)||mutations.has(action)||knowledgeSaleActions.includes(action);

export function createKnowledgeService({store,signed,checkSession,checkScenario,now,uuid}) {
  const sales=createKnowledgeSalesService({store,signed,checkSession,now,uuid,knowledgeSnapshot});
  const context=async(tx,actor,input,preview=false)=>{
    signed(actor);const sid=documentId(input.sessionId);
    const s=preview?await checkSession(tx,actor,sid):await tx.get(`sessions/${sid}`);
    requireThat(s && s.stage!=='ARCHIVED','FORBIDDEN');
    let cid,accessVersion=null;
    if(preview)cid=documentId(input.characterId);
    else {
      const r=await tx.get(`sessions/${sid}/registrations/${hash(actor.uid)}`);
      requireThat(r?.status==='ACCEPTED' && r.accessActive && r.characterId && actor.authTime>=r.minAuthTime,'FORBIDDEN');cid=r.characterId;accessVersion=r.accessVersion;
    }
    const c=await tx.get(`sessions/${sid}/characters/${cid}`);
    requireThat(c && (preview||c.assignedUid===actor.uid),'FORBIDDEN');
    requireThat(['BRIEFING','EN_JEU','PAUSE','FINISHED'].includes(s.stage),'BRIEFING_CLOSED');
    requireThat(c.publicationState==='PUBLISHED' && c.public?.publicationState==='PUBLISHED','CONTENT_UNPUBLISHED');
    return {s,c,accessVersion};
  };
  const known=async(tx,sid,cid,kid,at)=>{
    const k=await tx.get(`sessions/${sid}/knowledge/${kid}`),r=await tx.get(receiptPath(sid,cid,kid));
    requireThat(k?.publicationState==='PUBLISHED' && await documentReceiptAvailable(tx,sid,cid,r,at),'FORBIDDEN');return {k,r};
  };
  const view=(k,r,body=false)=>({id:k.id,title:r.snapshot.title,kind:r.snapshot.kind,origin:r.snapshot.origin,
    receivedAt:r.receivedAt,source:r.source,sourceName:r.sourceName,readAt:r.readAt??null,revision:r.snapshot.revision,
    receiptRevision:r.grantRevision??0,canCopy:k.shareMode==='COPY' && r.snapshot.shareMode==='COPY',...(body?{body:r.snapshot.body}:{})});
  const target=async(tx,sid,cid,ownId)=>{
    requireThat(cid!==ownId,'INVALID_RECIPIENT');const c=await tx.get(`sessions/${sid}/characters/${cid}`);
    requireThat(c?.publicationState==='PUBLISHED' && c.public?.publicationState==='PUBLISHED' && c.assignedUid,'INVALID_RECIPIENT');
    const r=await tx.get(`sessions/${sid}/registrations/${hash(c.assignedUid)}`);
    requireThat(r?.status==='ACCEPTED' && r.accessActive && r.characterId===cid,'INVALID_RECIPIENT');return c;
  };
  const parentContext=async(tx,actor,input,scenario=false)=>{
    const id=documentId(scenario?input.scenarioId:input.sessionId);
    const parent=scenario?await checkScenario(tx,actor,id):await checkSession(tx,actor,id);
    return {parent,base:`${scenario?'scenarios':'sessions'}/${id}`};
  };
  return async function dispatch(action,actor,input){
    if(knowledgeSaleActions.includes(action))return sales(action,actor,input);
    signed(actor);const at=now();
    if(action==='openInventoryDocument')return store.runTransaction(async tx=>{
      const {s,c,accessVersion}=await context(tx,actor,input),lotId=documentId(input.lotId),lot=await readLot(tx,s.id,lotId,at),kid=lot?.item.knowledgeId;
      requireThat(s.spaceOutlaws?.inf02Version===1&&kid&&await heldDocument(tx,s.id,c.id,kid,lotId,at),'FORBIDDEN');
      const k=await tx.get(`sessions/${s.id}/knowledge/${kid}`),path=receiptPath(s.id,c.id,kid),old=await tx.get(path);
      requireThat(k?.publicationState==='PUBLISHED'&&k.kind==='DOCUMENT'&&(!old||old.active),'FORBIDDEN');
      const op='operations/'+hash(actor.uid+':'+documentId(input.requestId)),fingerprint=hash(JSON.stringify([action,input])),previous=await tx.get(op);
      if(previous){requireThat(previous.fingerprint===fingerprint&&previous.characterId===c.id&&previous.accessVersion===accessVersion,'FORBIDDEN');return previous.result;}
      authorizeSpaceOutlaws(tx,s,'KNOWLEDGE');
      if(!old||old.source==='INVENTORY'&&old.documentLotId!==lotId)tx.set(path,{...(old??{id:kid,active:true,snapshot:knowledgeSnapshot(k),receivedAt:at,readAt:null}),source:'INVENTORY',sourceName:lot.item.name,documentLotId:lotId,inventoryCopy:old?.inventoryCopy===true||k.shareMode==='COPY',grantRevision:(old?.grantRevision??0)+1});
      const id=uuid(),result={id:kid};tx.set(`sessions/${s.id}/audit/${id}`,{id,at,action,actorUid:actor.uid,characterId:c.id,knowledgeId:kid,lotId});
      tx.set(op,{fingerprint,result,at,characterId:c.id,accessVersion});return result;
    });
    if(reads.has(action))return store.runTransaction(async tx=>{
      if(action==='knowledgeHistory'||action==='knowledgeRecipients'){
        const {base}=await parentContext(tx,actor,input,!input.sessionId),kid=documentId(input.knowledgeId);
        requireThat(await tx.get(`${base}/knowledge/${kid}`),'NOT_FOUND');
        if(action==='knowledgeHistory')return {versions:await tx.list(`${base}/knowledge/${kid}/history`,null,{orderBy:'at',direction:'desc',limit:30})};
        requireThat(input.sessionId,'INVALID_ID');const characters=await tx.list(`${base}/characters`),receipts=[];
        for(const c of characters){const r=await tx.get(receiptPath(input.sessionId,c.id,kid));if(r)receipts.push({characterId:c.id,displayName:c.public.displayName,active:r.active,receivedAt:r.receivedAt,sourceName:r.sourceName,revision:r.snapshot.revision,grantRevision:r.grantRevision??0});}
        return {receipts};
      }
      const preview=action.startsWith('preview'),{s,c}=await context(tx,actor,input,preview);
      if(action==='myKnowledge'||action==='previewKnowledge'){
        const receipts=await tx.list(`sessions/${s.id}/characters/${c.id}/knowledge`),items=[];
        for(const r of receipts){if(!r.active)continue;const k=await tx.get(`sessions/${s.id}/knowledge/${r.id}`);if(k?.publicationState==='PUBLISHED'&&await documentReceiptAvailable(tx,s.id,c.id,r,at))items.push(view(k,r));}
        return {session:{id:s.id,stage:s.stage},preview,items:items.sort((a,b)=>b.receivedAt-a.receivedAt||a.id.localeCompare(b.id))};
      }
      const {k,r}=await known(tx,s.id,c.id,documentId(input.knowledgeId),at);
      if(action==='prepareKnowledgeShare'){
        requireThat((r.grantRevision??0)===input.receiptRevision,'STALE_REVISION');
        requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'share');requireThat(view(k,r).canCopy,'SHARING_DISABLED');
        const recipient=await target(tx,s.id,documentId(input.recipientId),c.id);
        const recipientReceipt=await tx.get(receiptPath(s.id,recipient.id,k.id));requireThat(!recipientReceipt||recipientReceipt.active,'FORBIDDEN');
        return {recipient:{id:recipient.id,displayName:recipient.public.displayName},knowledge:{id:k.id,title:r.snapshot.title},authorName:c.public.displayName,receiptRevision:r.grantRevision??0};
      }
      return {session:{id:s.id,stage:s.stage},preview,canShare:canGameAction(s,c,'share'),knowledge:view(k,r,true)};
    });
    const requestId=documentId(input.requestId),operationPath=`operations/${hash(`${actor.uid}:${requestId}`)}`;
    const fingerprint=hash(JSON.stringify([action,input])),newId=uuid();
    return store.runTransaction(async tx=>{
      let parent,base,s,c,k,r,recipient,recipientReceipt;
      // Current authorization always precedes the idempotence cache, including revoked grants and QR access.
      if(['saveKnowledge','saveSessionKnowledge','grantKnowledge'].includes(action)){
        ({parent,base}=await parentContext(tx,actor,input,action==='saveKnowledge'));
        requireThat(parent.stage!=='ARCHIVED','SESSION_CLOSED');
      } else {
        ({s,c}=await context(tx,actor,input));const kid=documentId(input.knowledgeId);
        if(action==='discoverKnowledge'){
          requireGameAction(s,c,'discover',at);
          k=await tx.get(`sessions/${s.id}/knowledge/${kid}`);
          requireThat(k?.publicationState==='PUBLISHED' && k.qrEnabled && (k.qrAudience==='ALL_PLAYERS'||k.qrCharacterIds.includes(c.id)),'FORBIDDEN');
          requireThat(!k.qrSkillId||abilityLevel(c,k.qrSkillId)>=k.qrSkillLevel,'FORBIDDEN');
          r=await tx.get(receiptPath(s.id,c.id,kid));requireThat(!r||r.active,'FORBIDDEN');
        }else ({k,r}=await known(tx,s.id,c.id,kid,at));
        if(action==='markKnowledgeRead'||action==='shareKnowledge')requireThat((r.grantRevision??0)===input.receiptRevision,'STALE_REVISION');
        if(action==='shareKnowledge'){
          requireGameAction(s,c,'share');
          requireThat(view(k,r).canCopy,'SHARING_DISABLED');recipient=await target(tx,s.id,documentId(input.recipientId),c.id);
          recipientReceipt=await tx.get(receiptPath(s.id,recipient.id,k.id));requireThat(!recipientReceipt||recipientReceipt.active,'FORBIDDEN');
        }
      }
      const previous=await tx.get(operationPath);
      if(s?.spaceOutlaws)authorizeSpaceOutlaws(tx,s,'KNOWLEDGE');
      if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
      let result,audit={id:newId,action,at,actorUid:actor.uid};
      if(action==='saveKnowledge'||action==='saveSessionKnowledge'){
        requireThat(parent.revision===input.revision,'STALE_REVISION');
        const kid=input.knowledgeId?documentId(input.knowledgeId):newId,old=input.knowledgeId?await tx.get(`${base}/knowledge/${kid}`):null;
        if(input.knowledgeId)requireThat(old,'NOT_FOUND');
        const next=knowledgeInput({...input,...(action==='saveSessionKnowledge'?{initialCharacterIds:old?.initialCharacterIds??[]}:{})},kid,old??{});
        for(const cid of new Set([...next.initialCharacterIds,...next.qrCharacterIds]))requireThat(await tx.get(`${base}/characters/${cid}`),'INVALID_MEMBER');
        if(next.qrSkillId){const skill=await tx.get(`${base}/skills/${next.qrSkillId}`);requireThat(skill && skill.kind==='PASSIVE','INVALID_ABILITY_REFERENCE');requireThat(next.publicationState!=='PUBLISHED'||skill.publicationState==='PUBLISHED','ABILITY_UNPUBLISHED');}
        const reason=action==='saveSessionKnowledge'?text(input.reason,500,true):'Édition du scénario';
        tx.set(`${base}/knowledge/${kid}`,next);tx.set(base,{...parent,revision:parent.revision+1});
        tx.set(`${base}/knowledge/${kid}/history/${newId}`,{id:newId,at,actorUid:actor.uid,actorEmail:actor.email,reason,before:old,after:next});
        Object.assign(audit,{knowledgeId:kid,reason,beforeRevision:old?.revision??0,afterRevision:next.revision});result={id:kid};
      }else if(action==='grantKnowledge'){
        const sid=input.sessionId,kid=documentId(input.knowledgeId),cid=documentId(input.characterId),reason=text(input.reason,500,true);
        requireThat(typeof input.enabled==='boolean','INVALID_KNOWLEDGE');
        k=await tx.get(`${base}/knowledge/${kid}`);requireThat(k && await tx.get(`${base}/characters/${cid}`),'NOT_FOUND');
        // Revisions protect both the text being granted and the receipt being changed.
        requireThat(k.revision===input.knowledgeRevision,'STALE_REVISION');
        r=await tx.get(receiptPath(sid,cid,kid));requireThat((r?.grantRevision??0)===input.grantRevision,'STALE_REVISION');
        requireThat(!input.enabled||k.publicationState==='PUBLISHED','CONTENT_UNPUBLISHED');
        requireThat(input.enabled||r,'NOT_FOUND');
        const next=input.enabled?{id:kid,active:true,snapshot:knowledgeSnapshot(k),receivedAt:at,source:'GM',sourceName:'Révélation MJ',readAt:null,grantRevision:(r?.grantRevision??0)+1}:
          {...r,active:false,grantRevision:(r.grantRevision??0)+1};
        tx.set(receiptPath(sid,cid,kid),next);
        tx.set(`${base}/knowledge/${kid}/history/${newId}`,{id:newId,type:'grant',at,actorUid:actor.uid,actorEmail:actor.email,reason,characterId:cid,before:r??null,after:next});
        Object.assign(audit,{knowledgeId:kid,characterId:cid,reason,before:r??null,after:next});result={id:kid,active:next.active};
      }else if(action==='markKnowledgeRead'){
        tx.set(receiptPath(s.id,c.id,k.id),{...r,readAt:r.readAt??at});result={read:true};
      }else {
        requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');
        const cid=recipient?.id??c.id,old=recipient?recipientReceipt:r;
        // Revoked receipts cannot be reacquired through another QR or another character; only a MJ can restore them.
        requireThat(!old||old.active,'FORBIDDEN');
        if(!old||old.source==='INVENTORY'){
          const shared=action==='shareKnowledge',decoded=shared?r.decodedRevision:old?.decodedRevision===k.revision?old.decodedRevision:null;
          tx.set(receiptPath(s.id,cid,k.id),{id:k.id,active:true,snapshot:shared?r.snapshot:decoded?old.snapshot:knowledgeSnapshot(k),receivedAt:at,
            ...(shared&&r.documentLotId&&r.inventoryCopy===true?{documentLotId:r.documentLotId,inventoryCopy:true}:{}),source:shared?'SHARED':'QR',sourceName:shared?c.public.displayName:'Découverte par QR',readAt:null,grantRevision:(old?.grantRevision??0)+1,...(decoded?{decodedRevision:decoded}:{})});
        }
        Object.assign(audit,{knowledgeId:k.id,characterId:c.id,recipientId:cid,created:!old});result={id:k.id};
      }
      if(input.sessionId && action!=='markKnowledgeRead')tx.set(`sessions/${input.sessionId}/audit/${newId}`,audit);
      tx.set(operationPath,{fingerprint,result,at});return result;
    });
  };
}
