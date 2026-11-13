import {documentId,requireThat} from './validation.mjs';
const kinds={session:'sessions',scenario:'scenarios'};
const removalPath=(collection,id)=>`recycleBin/${collection}_${id}`;
function scope(path){const [collection,id]=path.split('/');return ['sessions','scenarios'].includes(collection)&&id?{collection,id}:null;}
// Retain complete histories and immutable snapshots. All normal reads/writes
// use this facade; only the owner lifecycle service sees removed records.
export function recycleBinStore(store){
 const wrap=tx=>({
  ...tx,
  async get(path){const s=scope(path);if(s&&(await tx.get(removalPath(s.collection,s.id)))?.active)return null;return tx.get(path);},
  async list(path,filter,options){
   const s=scope(path);if(s&&(await tx.get(removalPath(s.collection,s.id)))?.active)return [];
   const rows=await tx.list(path,filter,options);
   if(!['sessions','scenarios'].includes(path))return rows;
   const removed=await Promise.all(rows.map(r=>tx.get(removalPath(path,r.id))));return rows.filter((r,i)=>!removed[i]?.active);
  }
 });
 return {get:path=>wrap(store).get(path),list:(...args)=>wrap(store).list(...args),runTransaction:callback=>store.runTransaction(async tx=>{
  const writes=new Map(),view=wrap({...tx,set:(path,data)=>writes.set(path,data)}),result=await callback(view);
  for(const path of writes.keys()){const s=scope(path);if(s)requireThat(!(await tx.get(removalPath(s.collection,s.id)))?.active,'NOT_FOUND');}
  for(const [path,data] of writes)tx.set(path,data);return result;
 })};
}
export function createRecycleBinService({store,admin,now}){
 return async(action,actor,input)=>{
  admin(actor);
  return store.runTransaction(async tx=>{
   if(action==='recycleBin')return {items:(await tx.list('recycleBin',['ownerUid',actor.uid])).filter(r=>r.active).map(({kind,id,title,removedAt})=>({kind,id,title,removedAt}))};
   requireThat(Object.hasOwn(kinds,input.kind),'INVALID_ID');const collection=kinds[input.kind],id=documentId(input.id),path=`${collection}/${id}`;
   const record=await tx.get(path);requireThat(record?.ownerUid===actor.uid,'FORBIDDEN');
   const rp=removalPath(collection,id),old=await tx.get(rp);
   if(action==='restoreRecord'){
    requireThat(old?.ownerUid===actor.uid,'NOT_FOUND');
    if(input.kind==='session'&&record.scenarioId)requireThat(!(await tx.get(removalPath('scenarios',record.scenarioId)))?.active,'RESTORE_SCENARIO_FIRST');
    tx.set(rp,{...old,active:false,restoredAt:now()});return {restored:true};
   }
   requireThat(action==='trashRecord','UNKNOWN_ACTION');
   if(old?.active)return {removed:true};
   requireThat(record.revision===input.revision,'STALE_REVISION');
   if(input.kind==='session')requireThat(['ARCHIVED','FINISHED','PREPARATION'].includes(record.stage),'ARCHIVE_BEFORE_REMOVAL');
   else requireThat(!(await tx.list('sessions',['scenarioId',id])).some(s=>!['ARCHIVED','FINISHED'].includes(s.stage)),'SCENARIO_HAS_ACTIVE_SESSIONS');
   tx.set(rp,{kind:input.kind,id,title:record.title,ownerUid:actor.uid,active:true,removedAt:now(),sourceRevision:record.revision});return {removed:true};
  });
 };
}
