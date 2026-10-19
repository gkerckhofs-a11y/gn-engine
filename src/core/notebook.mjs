import {createHash} from 'node:crypto';
import {requireThat,documentId} from './validation.mjs';
import {knowledgeSnapshot} from './knowledge.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const clean=(value,max,required=false)=>{
  requireThat(typeof value==='string' && value.length<=max && (!required||value.trim()),'INVALID_NOTE');return value.trim();
};
const view=n=>({id:n.id,title:n.title,body:n.body,revision:n.revision,createdAt:n.createdAt,updatedAt:n.updatedAt,archived:n.archived});
const actions=new Set(['myNotes','noteDetail','prepareNoteShare','saveNote','setNoteArchived','shareNote']);
export const notebookAction=action=>actions.has(action);

export function createNotebookService({store,signed,now,uuid}){
  async function context(tx,actor,input){
    signed(actor);const sid=documentId(input.sessionId),s=await tx.get(`sessions/${sid}`);
    requireThat(s && s.stage!=='ARCHIVED','FORBIDDEN');
    const r=await tx.get(`sessions/${sid}/registrations/${hash(actor.uid)}`);
    requireThat(r?.status==='ACCEPTED' && r.accessActive && r.characterId && actor.authTime>=r.minAuthTime,'FORBIDDEN');
    const c=await tx.get(`sessions/${sid}/characters/${r.characterId}`);
    requireThat(c?.assignedUid===actor.uid,'FORBIDDEN');
    requireThat(['BRIEFING','EN_JEU','PAUSE','FINISHED'].includes(s.stage),'BRIEFING_CLOSED');
    requireThat(c.publicationState==='PUBLISHED' && c.public?.publicationState==='PUBLISHED','CONTENT_UNPUBLISHED');
    // The account UID is always taken from verified authentication, never input or a character assignment.
    return {s,c,base:`sessions/${sid}/notebooks/${hash(actor.uid)}/notes`};
  }
  async function ownNote(tx,base,id){const note=await tx.get(`${base}/${documentId(id)}`);requireThat(note,'FORBIDDEN');return note;}
  async function shareContext(tx,actor,input,ctx){
    const {s,c,base}=ctx,note=await ownNote(tx,base,input.noteId);
    requireThat(!note.archived,'NOTE_ARCHIVED');requireThat(note.revision===input.revision,'STALE_REVISION');
    // Reassignment between preview and confirmation must not send under a different character identity.
    requireThat(input.authorCharacterId===c.id && input.authorName===c.public.displayName,'STALE_REVISION');
    requireThat(['SHOW','COPY'].includes(input.shareMode),'INVALID_NOTE');
    const recipientId=documentId(input.recipientId);requireThat(recipientId!==c.id,'INVALID_RECIPIENT');
    const recipient=await tx.get(`sessions/${s.id}/characters/${recipientId}`);
    requireThat(recipient?.publicationState==='PUBLISHED' && recipient.public?.publicationState==='PUBLISHED' && recipient.assignedUid,'INVALID_RECIPIENT');
    const registration=await tx.get(`sessions/${s.id}/registrations/${hash(recipient.assignedUid)}`);
    requireThat(registration?.status==='ACCEPTED' && registration.accessActive && registration.characterId===recipient.id,'INVALID_RECIPIENT');
    // A target reassigned after the confirmation screen must be reviewed again.
    const recipientVersion=hash(JSON.stringify([recipient.id,recipient.assignedUid,registration.accessVersion,recipient.public.displayName]));
    if(input.recipientVersion!==undefined)requireThat(input.recipientVersion===recipientVersion,'STALE_RECIPIENT');
    const kid=hash(JSON.stringify([s.id,actor.uid,note.id,note.revision,c.id,c.public.displayName,input.shareMode]));
    const knowledge=await tx.get(`sessions/${s.id}/knowledge/${kid}`);
    if(knowledge)requireThat(knowledge.publicationState==='PUBLISHED' && knowledge.shareMode===input.shareMode,'SHARING_DISABLED');
    const authorPath=`sessions/${s.id}/characters/${c.id}/knowledge/${kid}`,recipientPath=`sessions/${s.id}/characters/${recipient.id}/knowledge/${kid}`;
    const authorReceipt=await tx.get(authorPath),recipientReceipt=await tx.get(recipientPath);
    requireThat((!authorReceipt||authorReceipt.active) && (!recipientReceipt||recipientReceipt.active),'FORBIDDEN');
    return {note,recipient,recipientVersion,kid,knowledge,authorPath,recipientPath,authorReceipt,recipientReceipt};
  }
  return async function dispatch(action,actor,input){
    signed(actor);const at=now(),newId=uuid();
    return store.runTransaction(async tx=>{
      const ctx=await context(tx,actor,input),{s,c,base}=ctx;
      if(action==='myNotes'){
        const notes=await tx.list(base);
        return {session:{id:s.id,stage:s.stage},character:{id:c.id,displayName:c.public.displayName},
          notes:notes.sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id)).map(n=>({id:n.id,title:n.title,revision:n.revision,createdAt:n.createdAt,updatedAt:n.updatedAt,archived:n.archived}))};
      }
      if(action==='noteDetail'){
        const n=await ownNote(tx,base,input.noteId);
        const shares=await tx.list(`${base}/${n.id}/shares`,null,{orderBy:'at',direction:'desc',limit:30});
        return {session:{id:s.id,stage:s.stage},character:{id:c.id,displayName:c.public.displayName},note:view(n),
          shares:shares.map(x=>({id:x.id,at:x.at,knowledgeId:x.knowledgeId,revision:x.revision,recipientName:x.recipientName,authorName:x.authorName,shareMode:x.shareMode}))};
      }
      if(action==='prepareNoteShare'){
        requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');
        const x=await shareContext(tx,actor,input,ctx);
        return {note:{id:x.note.id,title:x.note.title,body:x.note.body,revision:x.note.revision},
          recipient:{id:x.recipient.id,displayName:x.recipient.public.displayName},recipientVersion:x.recipientVersion,
          author:{id:c.id,displayName:c.public.displayName},shareMode:input.shareMode};
      }
      const requestId=documentId(input.requestId),op=`operations/${hash(`${actor.uid}:${requestId}`)}`;
      const fingerprint=hash(JSON.stringify([action,input]));
      let n,sharing;
      if(action==='shareNote'){
        requireThat(typeof input.recipientVersion==='string','STALE_RECIPIENT');sharing=await shareContext(tx,actor,input,ctx);
      }else if(input.noteId)n=await ownNote(tx,base,input.noteId);
      if(action==='setNoteArchived')requireThat(n && typeof input.archived==='boolean','INVALID_NOTE');
      if(action==='saveNote' && n)requireThat(!n.archived,'NOTE_ARCHIVED');
      // Re-read access and share permissions before any cached result, including after revocation.
      const previous=await tx.get(op);
      if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
      let result;
      if(action==='saveNote'){
        requireThat((n?.revision??0)===input.revision,'STALE_REVISION');
        const id=n?.id??newId,next={id,title:clean(input.title,150,true),body:clean(input.body,20000),revision:(n?.revision??0)+1,
          createdAt:n?.createdAt??at,updatedAt:at,archived:false};
        tx.set(`${base}/${id}`,next);result={id,revision:next.revision};
      }else if(action==='setNoteArchived'){
        requireThat(n.revision===input.revision,'STALE_REVISION');
        const next={...n,archived:input.archived,revision:n.revision+1,updatedAt:at};tx.set(`${base}/${n.id}`,next);result={id:n.id,revision:next.revision};
      }else if(action==='shareNote'){
        requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');const x=sharing;
        requireThat(x.note.body.trim(),'INVALID_NOTE');
        const original={id:x.kid,title:x.note.title,body:x.note.body,origin:`Note rédigée par ${c.public.displayName}`,
          kind:'DOCUMENT',publicationState:'PUBLISHED',shareMode:input.shareMode,gmTruth:'',gmNotes:'',initialCharacterIds:[],
          qrEnabled:false,qrAudience:'SELECTED',qrCharacterIds:[],revision:1};
        if(!x.knowledge)tx.set(`sessions/${s.id}/knowledge/${x.kid}`,original);
        const receipt={id:x.kid,active:true,snapshot:knowledgeSnapshot(original),receivedAt:at,source:'PLAYER_NOTE',sourceName:c.public.displayName,readAt:null,grantRevision:1};
        if(!x.authorReceipt)tx.set(x.authorPath,receipt);
        if(!x.recipientReceipt)tx.set(x.recipientPath,receipt);
        if(!x.recipientReceipt){
          tx.set(`${base}/${x.note.id}/shares/${newId}`,{id:newId,at,knowledgeId:x.kid,revision:x.note.revision,recipientName:x.recipient.public.displayName,authorName:c.public.displayName,shareMode:input.shareMode});
          // Only the explicitly shared document enters the MJ audit. Private note IDs, edits and contents do not.
          tx.set(`sessions/${s.id}/audit/${newId}`,{id:newId,action,at,actorUid:actor.uid,characterId:c.id,recipientId:x.recipient.id,knowledgeId:x.kid});
        }
        result={id:x.kid};
      }else requireThat(false,'INVALID_ACTION');
      // Never put private prose in cached operation results or the session audit.
      tx.set(op,{fingerprint,result,at});return result;
    });
  };
}
