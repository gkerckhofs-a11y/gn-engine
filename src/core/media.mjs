import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {requireThat,documentId,DomainError} from './validation.mjs';
import {mediaHash as hash,mediaLimits,mediaRef,imageReferences} from './media-state.mjs';
import {recordPublication} from './narrative.mjs';
export const mediaCommands=['mediaCatalog','mediaHealth','mediaCheckFiles','mediaUpload','mediaRead','mediaMetadata','mediaTargets','prepareMediaAssignments','assignMedia','prepareMediaRemoval','trashMedia','restoreMedia','purgeMedia','mediaCleanup'];
export const mediaAction=a=>mediaCommands.includes(a);
const digest=v=>hash(JSON.stringify(v));
const str=(v,max,required=false)=>{requireThat(typeof v==='string'&&v.length<=max&&(!required||v.trim()),'INVALID_MEDIA');return v.trim();};
const metadata=i=>({name:str(i.name,150,true),category:str(i.category??'',80),universe:str(i.universe??'',100),credit:str(i.credit??'',500),tags:str(i.tags??'',500).split(',').map(t=>t.trim()).filter(Boolean).slice(0,20)});
const view=a=>({id:a.id,version:1,name:a.name,category:a.category,universe:a.universe,credit:a.credit,tags:a.tags,status:a.status,bytes:a.bytes,width:a.width,height:a.height,revision:a.revision,usageCount:a.usageCount??0,createdAt:a.createdAt,trashedAt:a.trashedAt??null,purgeAfter:a.purgeAfter??null,scope:a.scope,scopeId:a.scopeId});
const slots={ship:['illustration'],character:['portrait','private'],item:['illustration'],announcement:['illustration','briefing'],inventory:['illustration'],contract:['illustration','briefing']};
const collections={ship:'ships',character:'characters',item:'items',announcement:'announcements',inventory:'inventory',contract:'contracts'};
const names={portrait:'Portrait public',private:'Fiche privée',illustration:'Illustration',briefing:'Briefing privé'};
const recordImages=(r,kind)=>kind==='inventory'?r.item:r;
export function createMediaService({store,signed,admin,isAdmin,checkSession,checkScenario,now,uuid,images,processImage,authorizeRead}){
  async function scope(tx,actor,input){
    signed(actor);
    if(input.sessionId){const s=await checkSession(tx,actor,documentId(input.sessionId));requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');return {ownerUid:s.ownerUid,scope:'session',scopeId:s.id,key:`session:${s.id}`};}
    admin(actor);return {ownerUid:actor.uid,scope:'owner',scopeId:actor.uid,key:`owner:${actor.uid}`};
  }
  function permitted(a,ctx,actor){requireThat(a&&a.ownerUid===ctx.ownerUid&&(isAdmin(actor)&&actor.uid===a.ownerUid||a.scope==='session'&&a.scopeId===ctx.scopeId),'FORBIDDEN');return a;}
  const quotaPath=uid=>`mediaQuotas/${hash(uid)}`;
  const quota=async(tx,uid)=>await tx.get(quotaPath(uid))??{bytes:0,pendingBytes:0,count:0,pendingCount:0};
  const audit=(tx,action,actor,ctx,ids,extra={})=>{const id=uuid();tx.set(`mediaAudit/${id}`,{id,action,actorUid:actor.uid,at:now(),ownerUid:ctx.ownerUid,scope:ctx.scope,scopeId:ctx.scopeId,ids,...extra});};
  function storage(){requireThat(images&&processImage,'MEDIA_STORAGE_UNAVAILABLE');}
  async function read(actor,input){
    if(input.context?.mode!=='public')signed(actor);
    storage();const variant=input.variant??'thumb';requireThat(['thumb','mobile','original'].includes(variant),'INVALID_MEDIA');
    let ref;
    if(input.context?.mode==='library'){
      signed(actor);ref=await store.runTransaction(async tx=>{const ctx=await scope(tx,actor,input),a=permitted(await tx.get(`media/${documentId(input.mediaId)}`),ctx,actor);requireThat(['READY','TRASHED'].includes(a.status),'MEDIA_UNAVAILABLE');return mediaRef(a.id);});
    }else ref=await authorizeRead(actor,input.context,input.slot);
    requireThat(ref?.version===1,'MEDIA_UNAVAILABLE');
    const a=await store.get(`media/${documentId(ref.id)}`);requireThat(a&&['READY','TRASHED'].includes(a.status),'MEDIA_UNAVAILABLE');
    try{return {mime:a.variants[variant].mime,data:(await images.read(a.variants[variant].path)).toString('base64')};}
    catch(e){if(e instanceof DomainError)throw e;throw new DomainError('MEDIA_STORAGE_UNAVAILABLE');}
  }
  async function upload(actor,input,archived=false){
    signed(actor);storage();const requestId=documentId(input.requestId),info=metadata(input);
    // Check organizer rights before decoding any untrusted image.
    const initial=await store.runTransaction(tx=>scope(tx,actor,input));
    const prepared=await processImage(input.data,archived?{fileBytes:mediaLimits.variantBytes,preserveSource:true}:undefined),id=hash(`${actor.uid}:${requestId}`),path=`media/${id}`,fingerprint=digest([prepared.digest,info,initial.key,input.allowDuplicate===true]);
    const attempt=uuid(),at=now(),variants=Object.fromEntries(Object.entries(prepared.variants).map(([k,v])=>[k,{path:`media/${id}/${attempt}/${k}`,mime:v.mime,bytes:v.data.length}]));
    const claim=await store.runTransaction(async tx=>{
      const ctx=await scope(tx,actor,input),old=await tx.get(path),q=await quota(tx,ctx.ownerUid),known=await tx.list('media',['ownerUid',ctx.ownerUid]),duplicate=known.find(a=>a.digest===prepared.digest&&a.id!==id&&['READY','TRASHED','UPLOADING'].includes(a.status)&&(isAdmin(actor)||a.key===ctx.key));
      if(old){permitted(old,ctx,actor);requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');if(['READY','TRASHED','PURGED'].includes(old.status))return {done:true,result:{id:old.id,status:old.status}};requireThat(old.status==='FAILED','MEDIA_IMPORT_RUNNING');}
      requireThat(input.allowDuplicate===true||!duplicate||!['READY','TRASHED','UPLOADING'].includes(duplicate.status)||duplicate.id===id,'MEDIA_DUPLICATE');
      requireThat(q.bytes+q.pendingBytes+prepared.bytes<=mediaLimits.storedBytes&&q.count+q.pendingCount<mediaLimits.images,'MEDIA_QUOTA');
      tx.set(path,{id,...info,...initial,createdAt:old?.createdAt??at,updatedAt:at,revision:1,refsRevision:0,usageCount:0,status:'UPLOADING',bytes:prepared.bytes,width:prepared.width,height:prepared.height,digest:prepared.digest,fingerprint,attempt,expiresAt:at+15*60*1000,variants});
      tx.set(quotaPath(ctx.ownerUid),{...q,pendingBytes:q.pendingBytes+prepared.bytes,pendingCount:q.pendingCount+1});return {done:false};
    });
    if(claim.done)return claim.result;
    try{
      for(const [key,v] of Object.entries(prepared.variants))await images.put(variants[key].path,v.data,v.mime);
      return await store.runTransaction(async tx=>{
        const ctx=await scope(tx,actor,input),a=await tx.get(path),q=await quota(tx,ctx.ownerUid);requireThat(a?.status==='UPLOADING'&&a.attempt===attempt,'MEDIA_IMPORT_RUNNING');
        tx.set(path,{...a,status:'READY',updatedAt:now()});tx.set(quotaPath(ctx.ownerUid),{...q,bytes:q.bytes+a.bytes,count:q.count+1,pendingBytes:q.pendingBytes-a.bytes,pendingCount:q.pendingCount-1});audit(tx,'IMPORT',actor,ctx,[id]);return {id,status:'READY'};
      });
    }catch(error){
      // Resolve an ambiguous commit before cleanup; never delete a committed image.
      const cleanup=await store.runTransaction(async tx=>{const a=await tx.get(path);if(a?.attempt!==attempt)return false;if(a.status==='READY')return 'READY';if(a.status!=='UPLOADING')return false;tx.set(path,{...a,status:'CLEANING'});return true;});
      if(cleanup==='READY')return {id,status:'READY'};
      if(!cleanup)throw new DomainError('MEDIA_IMPORT_RUNNING');
      let removed=true;for(const v of Object.values(variants))try{await images.remove(v.path);}catch{removed=false;}
      if(removed)await store.runTransaction(async tx=>{const a=await tx.get(path),q=await quota(tx,initial.ownerUid);if(a?.status!=='CLEANING'||a.attempt!==attempt)return;tx.set(path,{...a,status:'FAILED'});tx.set(quotaPath(initial.ownerUid),{...q,pendingBytes:q.pendingBytes-a.bytes,pendingCount:q.pendingCount-1});});
      if(error instanceof DomainError)throw error;throw new DomainError('MEDIA_STORAGE_UNAVAILABLE');
    }
  }
  async function target(tx,actor,t){
    requireThat(t&&['scenario','session'].includes(t.scope)&&slots[t.kind]?.includes(t.slot),'INVALID_MEDIA_TARGET');
    requireThat(t.scope==='session'||['character','item'].includes(t.kind),'INVALID_MEDIA_TARGET');
    const scopeId=documentId(t.scopeId),id=documentId(t.id),parent=t.scope==='session'?await checkSession(tx,actor,scopeId):await checkScenario(tx,actor,scopeId);
    requireThat(parent.stage!=='ARCHIVED','SESSION_CLOSED');
    if(parent.spaceOutlaws){requireThat(parent.spaceOutlaws.mediaVersion===1&&['character','item','inventory','announcement','ship'].includes(t.kind)&&t.slot===(t.kind==='character'?'portrait':'illustration'),'SO_GAMEPLAY_NOT_OPEN');authorizeSpaceOutlaws(tx,parent,'MEDIA');}
    const base=`${t.scope==='session'?'sessions':'scenarios'}/${scopeId}`,path=`${base}/${collections[t.kind]}/${id}`,r=await tx.get(path);requireThat(r,'NOT_FOUND');
    // A funded bounty retains its advertised images just like its other terms.
    requireThat(t.kind!=='announcement'||!r.bountyId,'BOUNTY_LOCKED');
    return {parent,base,path,r,t:{scope:t.scope,scopeId,kind:t.kind,id,slot:t.slot},name:r.public?.displayName??r.name??r.title??r.item?.name??r.terms?.title??id};
  }
  async function assignments(tx,actor,input){
    requireThat(Array.isArray(input.targets)&&input.targets.length>0&&input.targets.length<=50,'INVALID_MEDIA_TARGET');
    const rows=[],seen=new Set();for(const t of input.targets){const x=await target(tx,actor,t),key=`${x.path}:${t.slot}`;requireThat(!seen.has(key),'INVALID_MEDIA_TARGET');seen.add(key);
      const ctx={ownerUid:x.parent.ownerUid,scope:t.scope,scopeId:t.scopeId};let a=null;
      if(t.mediaId){a=await tx.get(`media/${documentId(t.mediaId)}`);permitted(a,ctx,actor);requireThat(a.status==='READY','MEDIA_UNAVAILABLE');}
      const before=recordImages(x.r,t.kind).mediaImages?.[t.slot]??null,after=a?mediaRef(a.id):null;
      rows.push({...x,before,after,afterName:a?.name??'Sans image',assetRevision:a?.revision??null});
    }
    const reason=str(input.reason??'Attribution de visuels',500,true),preview=rows.map(x=>({target:x.t,name:x.name,slot:names[x.t.slot],before:x.before,after:x.after,afterName:x.afterName,sessionStage:x.parent.stage??null}));
    return {rows,reason,preview,confirmation:digest([rows.map(x=>[x.path,x.r,x.parent.revision,x.after,x.assetRevision]),reason])};
  }
  async function removal(tx,actor,input){
    const ctx=await scope(tx,actor,input);requireThat(Array.isArray(input.ids)&&input.ids.length>0&&input.ids.length<=50,'INVALID_MEDIA');
    const assets=[],rows=[];for(const id of [...new Set(input.ids.map(documentId))]){
      const a=permitted(await tx.get(`media/${id}`),ctx,actor);assets.push(a);
      const refs=(await tx.list(`media/${id}/usages`,['active',true]));
      const visible=refs.filter(r=>isAdmin(actor)&&actor.uid===a.ownerUid||r.scope==='session'&&r.scopeId===ctx.scopeId);
      const usages=[];for(const r of visible){const parts=r.path.split('/'),frozen=parts[2]==='versions',index=frozen?4:2,parent=await tx.get(parts.slice(0,2).join('/')),entity=await tx.get(parts.slice(0,index+2).join('/'));const label=entity?.public?.displayName??entity?.name??entity?.title??entity?.item?.name??entity?.terms?.title??'Référence conservée';usages.push({scope:r.scope,scopeId:r.scopeId,path:r.path,scopeName:parent?.title??'Périmètre',label,kind:parts[index],immutable:/\/(versions|history|inventoryHistory|mediaHistory)\//.test(r.path)});}
      rows.push({...view(a),usages,otherUsages:refs.length-visible.length});
    }
    return {ctx,assets,rows,confirmation:digest(assets.map(a=>[a.id,a.revision,a.refsRevision,a.status,a.purgeAfter??null]))};
  }
  async function cleanup(actor,input){
    signed(actor);storage();const candidates=await store.runTransaction(async tx=>{const ctx=await scope(tx,actor,input);return (await tx.list('media',isAdmin(actor)?['ownerUid',ctx.ownerUid]:['key',ctx.key])).filter(a=>['UPLOADING','CLEANING'].includes(a.status)&&a.expiresAt<=now()).slice(0,10);});
    let cleaned=0;for(const candidate of candidates){
      const a=await store.runTransaction(async tx=>{const ctx=await scope(tx,actor,input),a=permitted(await tx.get(`media/${candidate.id}`),ctx,actor);if(!['UPLOADING','CLEANING'].includes(a.status)||a.expiresAt>now())return null;tx.set(`media/${a.id}`,{...a,status:'CLEANING'});return a;});if(!a)continue;
      try{for(const v of Object.values(a.variants))await images.remove(v.path);await store.runTransaction(async tx=>{const old=await tx.get(`media/${a.id}`),q=await quota(tx,a.ownerUid);if(old.status!=='CLEANING')return;tx.set(`media/${a.id}`,{...old,status:'FAILED'});tx.set(quotaPath(a.ownerUid),{...q,pendingBytes:q.pendingBytes-a.bytes,pendingCount:q.pendingCount-1});audit(tx,'CLEANUP',actor,a,[a.id]);});cleaned++;}
      catch{await store.runTransaction(async tx=>{const old=await tx.get(`media/${a.id}`);if(old.status==='CLEANING')tx.set(`media/${a.id}`,{...old,status:'UPLOADING'});});}
    }return {cleaned};
  }
  const dispatch=async(action,actor,input)=>{
    if(action==='mediaRead')return read(actor,input);
    signed(actor);
    if(action==='mediaUpload')return upload(actor,input);
    if(action==='mediaCleanup')return cleanup(actor,input);
    if(action==='mediaHealth'){
      const records=await store.runTransaction(async tx=>{
        const session=!!input.sessionId,id=documentId(input.sessionId??input.scenarioId),parent=session?await checkSession(tx,actor,id):await checkScenario(tx,actor,id),base=`${session?'sessions':'scenarios'}/${id}`,refs=new Map();
        for(const kind of session?Object.values(collections):['characters','items'])for(const r of await tx.list(`${base}/${kind}`))for(const ref of imageReferences(session&&kind==='characters'?{mediaImages:r.mediaImages??{}}:r).values())if(!refs.has(ref.id))refs.set(ref.id,{ref,label:r.public?.displayName??r.name??r.title??r.item?.name??r.terms?.title??'Contenu'});
        const results=[];for(const entry of refs.values())results.push({...entry,asset:await tx.get(`media/${entry.ref.id}`)});return results;
      });
      const issues=[];for(const r of records){let available=r.asset?.status==='READY';if(available)for(const v of Object.values(r.asset.variants))try{if(!images?.exists||!await images.exists(v.path))available=false;}catch{available=false;}
        if(!available)issues.push({id:r.ref.id,label:r.label});}
      return {checked:records.length,issues};
    }
    if(action==='purgeMedia'){
      storage();const op=`mediaOperations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=digest([action,input]);
      const batch=await store.runTransaction(async tx=>{
        const x=await removal(tx,actor,input),previous=await tx.get(op);
        if(previous)requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');else requireThat(input.confirmation===x.confirmation,'STALE_REVISION');
        for(const a of x.assets)requireThat(['TRASHED','PURGING','PURGED'].includes(a.status)&&a.usageCount===0&&a.purgeAfter<=now(),'MEDIA_PURGE_BLOCKED');
        for(const a of x.assets)if(a.status!=='PURGED')tx.set(`media/${a.id}`,{...a,status:'PURGING'});tx.set(op,{fingerprint});return x;
      });
      for(const a of batch.assets){if(a.status==='PURGED')continue;try{for(const v of Object.values(a.variants))await images.remove(v.path);}catch{throw new DomainError('MEDIA_STORAGE_UNAVAILABLE');}
        await store.runTransaction(async tx=>{const old=await tx.get(`media/${a.id}`),q=await quota(tx,a.ownerUid);if(old.status==='PURGED')return;requireThat(old.status==='PURGING'&&old.usageCount===0,'MEDIA_PURGE_BLOCKED');tx.set(`media/${a.id}`,{...old,status:'PURGED',revision:old.revision+1,purgedAt:now()});tx.set(quotaPath(a.ownerUid),{...q,bytes:q.bytes-old.bytes,count:q.count-1});audit(tx,'PURGE',actor,batch.ctx,[a.id]);});
      }return {purged:batch.assets.map(a=>a.id)};
    }
    let storageReady=!!images;if(action==='mediaCatalog'&&images?.ready)try{storageReady=await images.ready();}catch{storageReady=false;}
    return store.runTransaction(async tx=>{
      if(action==='mediaTargets'){
        const t={scope:input.sessionId?'session':'scenario',scopeId:documentId(input.sessionId??input.scenarioId)},p=t.scope==='session'?await checkSession(tx,actor,t.scopeId):await checkScenario(tx,actor,t.scopeId),base=`${t.scope==='session'?'sessions':'scenarios'}/${t.scopeId}`,targets=[];
        for(const kind of t.scope==='session'?Object.keys(slots):['character','item'])for(const r of await tx.list(`${base}/${collections[kind]}`)){
          if(kind==='announcement'&&r.bountyId)continue;
          for(const slot of slots[kind].filter(slot=>!p.spaceOutlaws||p.spaceOutlaws.mediaVersion===1&&['character','item','inventory','announcement','ship'].includes(kind)&&slot===(kind==='character'?'portrait':'illustration')))targets.push({...t,kind,id:r.id,slot,label:`${r.public?.displayName??r.name??r.title??r.item?.name??r.terms?.title??r.id} · ${names[slot]}${kind==='inventory'?' · lot attribué':kind==='contract'?' · contrat':''}`,mediaId:recordImages(r,kind).mediaImages?.[slot]?.id??null});
        }return {title:p.title,targets,stage:p.stage??null};
      }
      if(action==='prepareMediaAssignments')return (({preview,confirmation})=>({preview,confirmation}))(await assignments(tx,actor,input));
      if(action==='assignMedia'){
        const x=await assignments(tx,actor,input);const op=`mediaOperations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,previous=await tx.get(op),fingerprint=digest([action,input]);
        if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
        requireThat(input.confirmation===x.confirmation,'STALE_REVISION');
        const next=new Map(),parents=new Map(),at=now(),eventId=uuid();
        for(const row of x.rows){let r=next.get(row.path)??structuredClone(row.r),container=recordImages(r,row.t.kind);container.mediaImages={...(container.mediaImages??{})};if(row.after)container.mediaImages[row.t.slot]=row.after;else delete container.mediaImages[row.t.slot];next.set(row.path,r);parents.set(row.base,row.parent);}
        for(const [path,r] of next){const row=x.rows.find(x=>x.path===path);if(row.t.kind==='character'){r.contentRevision=(r.contentRevision??1)+1;recordPublication(tx,`${row.base}/characters`,row.r,r,{id:eventId,at,actorUid:actor.uid,reason:x.reason,stage:row.parent.stage});}else r.revision=(r.revision??1)+1;
          tx.set(path,r);tx.set(`${path}/mediaHistory/${eventId}`,{id:eventId,at,actorUid:actor.uid,reason:x.reason,before:{mediaImages:recordImages(row.r,row.t.kind).mediaImages??{}},after:{mediaImages:recordImages(r,row.t.kind).mediaImages??{}}});
        }
        for(const [base,p] of parents){tx.set(base,{...p,revision:p.revision+1});const row=x.rows.find(x=>x.base===base);audit(tx,'ASSIGN',actor,{ownerUid:p.ownerUid,scope:row.t.scope,scopeId:p.id},x.rows.filter(x=>x.base===base).map(x=>x.after?.id??x.before?.id).filter(Boolean),{reason:x.reason,targets:x.preview.filter(x=>x.target.scopeId===p.id)});}
        const result={updated:next.size};tx.set(op,{fingerprint,result});return result;
      }
      const ctx=await scope(tx,actor,input);
      if(action==='mediaCatalog'){
        let all=await tx.list('media',isAdmin(actor)?['ownerUid',ctx.ownerUid]:['key',ctx.key]);
        if(input.sessionId&&!isAdmin(actor))all=all.filter(a=>a.scope==='session'&&a.scopeId===input.sessionId);
        const q=await quota(tx,ctx.ownerUid),term=str(input.search??'',200).toLocaleLowerCase('fr'),state=input.status??'READY';requireThat(['READY','TRASHED','PURGING'].includes(state),'INVALID_MEDIA');
        all=all.filter(a=>a.status===state&&(!term||`${a.name} ${a.category} ${a.universe} ${(a.tags??[]).join(' ')}`.toLocaleLowerCase('fr').includes(term))&&(!input.category||a.category===input.category)&&(!input.universe||a.universe===input.universe)&&(input.usage==='used'?a.usageCount>0:input.usage==='unused'?a.usageCount===0:true));
        if(input.scenarioId||input.contentType){
          const scenario=input.scenarioId?await checkScenario(tx,actor,documentId(input.scenarioId)):null;
          if(input.contentType)requireThat(Object.keys(collections).includes(input.contentType),'INVALID_MEDIA');
          const filtered=[];for(const a of all){const refs=await tx.list(`media/${a.id}/usages`,['active',true]);if(refs.some(r=>(!scenario||r.scope==='scenario'&&r.scopeId===scenario.id)&&(!input.contentType||r.path.split('/').includes(collections[input.contentType]))))filtered.push(a);}all=filtered;
        }
        all.sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id));const offset=input.after?all.findIndex(a=>a.id===input.after)+1:0,page=all.slice(offset,offset+mediaLimits.page);
        return {images:page.map(view),next:all.length>offset+page.length?page.at(-1)?.id:null,total:all.length,quota:q,limits:mediaLimits,storageConfigured:storageReady};
      }
      if(action==='mediaCheckFiles'){
        requireThat(Array.isArray(input.digests)&&input.digests.length<=mediaLimits.batch,'INVALID_MEDIA');const duplicates=[];
        const known=await tx.list('media',isAdmin(actor)?['ownerUid',ctx.ownerUid]:['key',ctx.key]);for(const digest of input.digests){requireThat(typeof digest==='string'&&/^[a-f0-9]{64}$/.test(digest),'INVALID_MEDIA');const a=known.find(a=>a.digest===digest&&['READY','TRASHED','UPLOADING'].includes(a.status));if(a)duplicates.push({digest,id:a.id,name:a.name,status:a.status});}return {duplicates};
      }
      if(action==='prepareMediaRemoval')return (({rows,confirmation})=>({rows,confirmation}))(await removal(tx,actor,input));
      const op=`mediaOperations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=digest([action,input]),previous=await tx.get(op);
      // Authorization is rechecked even for a successful retry.
      if(action==='mediaMetadata'){
        const a=permitted(await tx.get(`media/${documentId(input.mediaId)}`),ctx,actor);requireThat(a.status==='READY','MEDIA_UNAVAILABLE');
        if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
        requireThat(a.revision===input.revision,'STALE_REVISION');const next={...a,...metadata(input),revision:a.revision+1,updatedAt:now()};tx.set(`media/${a.id}`,next);audit(tx,'METADATA',actor,ctx,[a.id]);const result=view(next);tx.set(op,{fingerprint,result});return result;
      }
      requireThat(['trashMedia','restoreMedia'].includes(action),'INVALID_MEDIA');const x=await removal(tx,actor,input);
      if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
      requireThat(input.confirmation===x.confirmation,'STALE_REVISION');
      for(const a of x.assets)requireThat(action==='trashMedia'?a.status==='READY'&&a.usageCount===0:a.status==='TRASHED','MEDIA_IN_USE');
      for(const a of x.assets)tx.set(`media/${a.id}`,{...a,status:action==='trashMedia'?'TRASHED':'READY',revision:a.revision+1,trashedAt:action==='trashMedia'?now():null,purgeAfter:action==='trashMedia'?now()+mediaLimits.trashDays*86400000:null});
      audit(tx,action==='trashMedia'?'TRASH':'RESTORE',actor,ctx,x.assets.map(a=>a.id));const result={updated:x.assets.length};tx.set(op,{fingerprint,result});return result;
    });
  };
  dispatch.archiveUpload=(actor,input)=>upload(actor,input,true);
  return dispatch;
}
