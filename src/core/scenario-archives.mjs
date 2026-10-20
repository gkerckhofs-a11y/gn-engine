import {requireThat,documentId,DomainError} from './validation.mjs';
import {imageReferences,mediaHash} from './media-state.mjs';
import {cleanScenarioPackage,cleanScenarioSnapshot,packageImage,packageDigest,packageSummary,remapPackageImages,scenarioCollections,packageLimits} from './scenario-package.mjs';

export const archiveCommands=['prepareScenarioExport','prepareScenarioImport','beginScenarioImport','scenarioImportImage','scenarioImportStatus','listScenarioImports','commitScenarioImport','cancelScenarioImport'];
export const archiveAction=a=>archiveCommands.includes(a);
const titleInput=v=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=150,'INVALID_SCENARIO_PACKAGE');return v.trim();};
const planPath=id=>`scenarioImports/${documentId(id)}`;
const requireOpen=p=>requireThat(p.status==='OPEN','SCENARIO_IMPORT_CLOSED');
const split=s=>{const out=[];for(let i=0;i<s.length;){let end=Math.min(i+100000,s.length);if(end<s.length&&s.charCodeAt(end-1)>=0xD800&&s.charCodeAt(end-1)<=0xDBFF)end--;out.push(s.slice(i,end));i=end;}return out;};
export function createScenarioArchiveService({store,admin,checkScenario,now,uuid,images,archiveUpload}){
  async function plan(tx,actor,id){admin(actor);const p=await tx.get(planPath(id));requireThat(p&&p.ownerUid===actor.uid,'FORBIDDEN');return p;}
  const consent=(actor,m,title)=>mediaHash(JSON.stringify([actor.uid,packageDigest(m),title]));
  async function status(tx,actor,id){
    const p=await plan(tx,actor,id),done=await tx.list(`${planPath(id)}/images`);
    return {id:p.id,status:p.status,title:p.title,summary:p.summary,digest:p.digest,createdAt:p.createdAt,completed:done.map(x=>x.sourceId),scenarioId:p.status==='COMMITTED'?p.scenarioId:null};
  }
  async function prepareExport(actor,input){
    return store.runTransaction(async tx=>{
      const scenarioId=documentId(input.scenarioId),s=await checkScenario(tx,actor,scenarioId),versionId=input.versionId?documentId(input.versionId):null;
      const base=`scenarios/${scenarioId}${versionId?`/versions/${versionId}`:''}`,source=versionId?await tx.get(base):s;requireThat(source,'NOT_FOUND');
      if(!versionId&&input.revision!==undefined)requireThat(s.revision===input.revision,'STALE_REVISION');
      const records={};for(const kind of scenarioCollections)records[kind]=await tx.list(`${base}/${kind}`);
      const snapshot=cleanScenarioSnapshot({scenario:source,records}),assets=[];
      for(const id of imageReferences(snapshot.records).keys()){
        const a=await tx.get(`media/${id}`);requireThat(a?.ownerUid===actor.uid&&a.status==='READY','MEDIA_UNAVAILABLE');
        assets.push(packageImage({...a,version:1},a.variants.original));
      }
      const manifest=cleanScenarioPackage({format:'gn-engine-scenario',version:1,source:{kind:versionId?'VERSION':'CURRENT',revision:versionId?source.sourceRevision:source.revision},...snapshot,images:assets},{requireHashes:false});
      const event=uuid();tx.set(`scenarioTransferAudit/${event}`,{id:event,action:'PREPARE_EXPORT',actorUid:actor.uid,at:now(),scenarioId,versionId,sourceRevision:manifest.source.revision});
      return {manifest,summary:packageSummary(manifest)};
    });
  }
  async function importImage(actor,input){
    const id=documentId(input.importId),sourceId=documentId(input.mediaId),p=await store.runTransaction(tx=>plan(tx,actor,id));requireOpen(p);
    const source=p.images.find(x=>x.id===sourceId);requireThat(source,'INVALID_SCENARIO_PACKAGE');
    requireThat(typeof input.data==='string'&&input.data.length===Math.ceil(source.source.bytes/3)*4&&/^[A-Za-z0-9+/]*={0,2}$/.test(input.data),'SCENARIO_FILE_MISMATCH');
    const bytes=Buffer.from(input.data,'base64');requireThat(bytes.length===source.source.bytes&&mediaHash(bytes)===source.source.sha256,'SCENARIO_FILE_MISMATCH');
    const mime=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'image/webp':null;
    requireThat(mime===source.source.mime,'SCENARIO_FILE_MISMATCH');
    const result=await archiveUpload(actor,{requestId:mediaHash(`scenario-import:${id}:${sourceId}`),name:source.name,category:source.category,universe:source.universe,credit:source.credit,tags:source.tags.join(','),data:input.data,allowDuplicate:true});
    requireThat(result.status==='READY','MEDIA_UNAVAILABLE');
    return store.runTransaction(async tx=>{
      const current=await plan(tx,actor,id);requireOpen(current);const a=await tx.get(`media/${result.id}`);
      requireThat(a?.ownerUid===actor.uid&&a.status==='READY'&&a.digest===source.source.sha256&&a.variants.original.mime===source.source.mime,'SCENARIO_FILE_MISMATCH');
      tx.set(`${planPath(id)}/images/${sourceId}`,{sourceId,mediaId:a.id});return {sourceId,mediaId:a.id};
    });
  }
  async function commit(actor,input){
    const id=documentId(input.importId),initial=await store.runTransaction(async tx=>{
      const p=await plan(tx,actor,id);if(p.status==='COMMITTED')return {done:true,id:p.scenarioId};requireOpen(p);
      const mapped=await tx.list(`${planPath(id)}/images`);requireThat(mapped.length===p.images.length,'SCENARIO_IMPORT_INCOMPLETE');
      const assets=[];for(const x of mapped){const a=await tx.get(`media/${x.mediaId}`);requireThat(a?.status==='READY'&&a.ownerUid===actor.uid,'MEDIA_UNAVAILABLE');assets.push(a);}
      return {done:false,assets};
    });
    if(initial.done)return {id:initial.id};
    for(const a of initial.assets)for(const v of Object.values(a.variants)){
      let exists=false;try{exists=!!images?.exists&&await images.exists(v.path);}catch{}requireThat(exists,'MEDIA_MISSING');
    }
    return store.runTransaction(async tx=>{
      const p=await plan(tx,actor,id);if(p.status==='COMMITTED')return {id:p.scenarioId};requireOpen(p);
      const chunks=[];for(let i=0;i<p.chunks;i++){const c=await tx.get(`${planPath(id)}/chunks/${i}`);requireThat(typeof c?.text==='string','INVALID_SCENARIO_PACKAGE');chunks.push(c.text);}
      let raw;try{raw=JSON.parse(chunks.join(''));}catch{throw new DomainError('INVALID_SCENARIO_PACKAGE');}
      const m=cleanScenarioPackage(raw);requireThat(packageDigest(m)===p.digest,'SCENARIO_FILE_MISMATCH');
      const map=new Map();for(const img of m.images){const x=await tx.get(`${planPath(id)}/images/${img.id}`);requireThat(x,'SCENARIO_IMPORT_INCOMPLETE');const a=await tx.get(`media/${x.mediaId}`);requireThat(a?.ownerUid===actor.uid&&a.status==='READY'&&a.digest===img.source.sha256,'MEDIA_UNAVAILABLE');map.set(img.id,a.id);}
      requireThat(!await tx.get(`scenarios/${p.scenarioId}`),'SCENARIO_IMPORT_CLOSED');
      const records=remapPackageImages(m.records,map),at=now();
      tx.set(`scenarios/${p.scenarioId}`,{...m.scenario,id:p.scenarioId,ownerUid:actor.uid,title:p.title,revision:1,createdAt:at,importSource:{kind:m.source.kind,revision:m.source.revision,digest:p.digest}});
      for(const kind of scenarioCollections)for(const record of records[kind])tx.set(`scenarios/${p.scenarioId}/${kind}/${record.id}`,record);
      tx.set(planPath(id),{...p,status:'COMMITTED',completedAt:at});
      // Payload is now represented by the imported scenario; keep only the audit and receipt.
      for(let i=0;i<p.chunks;i++)tx.set(`${planPath(id)}/chunks/${i}`,{finalized:true});
      tx.set(`scenarioTransferAudit/${id}`,{id,action:'IMPORT',actorUid:actor.uid,at,scenarioId:p.scenarioId,digest:p.digest,summary:p.summary});
      return {id:p.scenarioId};
    });
  }
  return async(action,actor,input)=>{
    admin(actor);
    if(action==='prepareScenarioExport')return prepareExport(actor,input);
    if(action==='scenarioImportImage')return importImage(actor,input);
    if(action==='commitScenarioImport')return commit(actor,input);
    if(action==='listScenarioImports')return store.runTransaction(async tx=>{
      admin(actor);const rows=(await tx.list('scenarioImports',['ownerUid',actor.uid])).filter(p=>p.status==='OPEN').sort((a,b)=>b.createdAt-a.createdAt).slice(0,20);
      return {imports:rows.map(p=>({id:p.id,title:p.title,summary:p.summary,digest:p.digest,createdAt:p.createdAt}))};
    });
    if(action==='scenarioImportStatus')return store.runTransaction(tx=>status(tx,actor,documentId(input.importId)));
    if(action==='cancelScenarioImport')return store.runTransaction(async tx=>{
      const id=documentId(input.importId),p=await plan(tx,actor,id);requireThat(p.status!=='COMMITTED','SCENARIO_IMPORT_CLOSED');
      tx.set(planPath(id),{...p,status:'CANCELLED',cancelledAt:now()});for(let i=0;i<p.chunks;i++)tx.set(`${planPath(id)}/chunks/${i}`,{cancelled:true});
      return {cancelled:true};
    });
    requireThat(['prepareScenarioImport','beginScenarioImport'].includes(action),'INVALID_SCENARIO_PACKAGE');
    const m=cleanScenarioPackage(input.manifest),title=titleInput(input.title),confirmation=consent(actor,m,title),summary=packageSummary(m);
    if(action==='prepareScenarioImport')return {summary,confirmation,digest:packageDigest(m),title,limits:packageLimits};
    requireThat(input.confirmation===confirmation,'STALE_REVISION');const id=mediaHash(`${actor.uid}:${documentId(input.requestId)}`),path=planPath(id),chunks=split(JSON.stringify(m));
    return store.runTransaction(async tx=>{
      admin(actor);const old=await tx.get(path);if(old){requireThat(old.fingerprint===confirmation,'REQUEST_ID_REUSED');return {id:old.id,status:old.status};}
      const scenarioId=uuid();tx.set(path,{id,ownerUid:actor.uid,status:'OPEN',title,summary,images:m.images,digest:packageDigest(m),fingerprint:confirmation,scenarioId,chunks:chunks.length,createdAt:now()});
      chunks.forEach((text,i)=>tx.set(`${path}/chunks/${i}`,{text}));return {id,status:'OPEN'};
    });
  };
}
