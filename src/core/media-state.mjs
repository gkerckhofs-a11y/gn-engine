import {createHash} from 'node:crypto';
import {requireThat,documentId} from './validation.mjs';
export const mediaHash=v=>createHash('sha256').update(v).digest('hex');
export const mediaLimits=Object.freeze({fileBytes:5*1024*1024,pixels:16000000,dimension:8000,batch:50,page:24,storedBytes:512*1024*1024,images:1000,trashDays:30,variantBytes:16*1024*1024});
export const mediaRef=(id)=>({id:documentId(id),version:1});
export const mediaFields=(record,slots)=>{
  const values={};for(const slot of slots)if(record?.mediaImages?.[slot])values[slot]=record.mediaImages[slot];
  return Object.keys(values).length?{mediaImages:values}:{};
};
export function imageReferences(value,result=new Map()){
  if(!value||typeof value!=='object')return result;
  for(const [key,v] of Object.entries(value)){
    if(key==='mediaImages'&&v){for(const ref of Object.values(v)){if(!ref)continue;requireThat(ref.version===1,'INVALID_MEDIA');documentId(ref.id);result.set(ref.id,ref);}}
    else if(v&&typeof v==='object')imageReferences(v,result);
  }
  return result;
}
const hasImages=value=>!!value&&typeof value==='object'&&(Object.hasOwn(value,'mediaImages')||Object.values(value).some(v=>v&&typeof v==='object'&&hasImages(v)));
const wrapped=Symbol('media references');
// Buffer writes so reference validation/indexing joins the same Firestore transaction.
// This covers scenario copies, lots, accepted mission snapshots and immutable histories.
export function mediaTrackedStore(store){
  if(store[wrapped])return store;
  return {get:store.get.bind(store),list:store.list.bind(store),[wrapped]:true,runTransaction:callback=>store.runTransaction(async tx=>{
    const writes=new Map(),result=await callback({...tx,set:(path,data)=>writes.set(path,data)}),changes=new Map();
    for(const [path,data] of writes){
      if(!/^(scenarios|sessions)\//.test(path)||!hasImages(data))continue;
      const before=imageReferences(await tx.get(path)),after=imageReferences(data);
      for(const id of new Set([...before.keys(),...after.keys()])){
        if(before.has(id)===after.has(id))continue;
        if(!changes.has(id))changes.set(id,[]);
        changes.get(id).push({path,active:after.has(id)});
      }
    }
    const assets=new Map();for(const id of changes.keys())assets.set(id,await tx.get(`media/${id}`));
    for(const [id,usages] of changes){
      const asset=assets.get(id);requireThat(asset&&asset.status==='READY','MEDIA_UNAVAILABLE');
      let count=asset.usageCount??0;
      for(const u of usages){count+=u.active?1:-1;const [,scopeId]=u.path.split('/');
        writes.set(`media/${id}/usages/${mediaHash(u.path)}`,{...u,scope:u.path.startsWith('sessions/')?'session':'scenario',scopeId});}
      requireThat(count>=0,'INVALID_MEDIA');writes.set(`media/${id}`,{...asset,usageCount:count,refsRevision:(asset.refsRevision??0)+1});
    }
    for(const [path,data] of writes)tx.set(path,data);return result;
  })};
}
