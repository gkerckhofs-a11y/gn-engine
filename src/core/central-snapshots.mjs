import {createHash} from 'node:crypto';
import {requireThat,documentId} from './validation.mjs';
import {centralDraftCheck,centralCheckLimits,validateCentralChange} from './central-check.mjs';
import {campaignPagesFor,campaignLimits} from './campaigns.mjs';

export const centralSnapshotActions=['previewCentralSnapshot','captureCentralSnapshot','listCentralSnapshots','centralSnapshot'];
export const centralSnapshotLimits={bytes:campaignLimits.bytes,pages:100,recent:20};
const kind='CENTRAL_DRAFT_SNAPSHOT',formatVersion=1;
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const json=v=>JSON.stringify(canonical(v)),digest=v=>createHash('sha256').update(json(v)).digest('hex');
const opHash=v=>createHash('sha256').update(v).digest('hex');
const bytes=v=>Buffer.byteLength(JSON.stringify(v));
const keys=(v,allowed)=>requireThat(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k)),'INVALID_CENTRAL_SNAPSHOT');
const check=v=>requireThat(v,'CENTRAL_SNAPSHOT_INVALID');
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const summary=h=>({id:h.id,campaignId:h.campaignId,status:h.status,createdAt:h.createdAt,actorUid:h.actorUid,reason:h.reason,draftRevision:h.source.draftRevision,records:h.records,bytes:h.bytes,pages:h.pages.length,manifestDigest:h.manifestDigest,reportStatus:h.reportStatus,diagnostics:h.diagnostics,publicationAvailable:false});
function validHeader(h,c,id){
 check(h?.kind===kind&&h.formatVersion===formatVersion&&h.id===id&&h.campaignId===c.id&&h.ownerUid===c.ownerUid&&h.status==='SEALED');
 check(/^snapshot_[a-f0-9]{64}$/.test(id)&&h.id===`snapshot_${digest([h.campaignId,h.actorUid,h.confirmation])}`&&hex(h.confirmation));
 check(h.source?.draftId==='initial'&&h.source.baseVersionId===null&&h.source.basePointerRevision===0&&Number.isSafeInteger(h.source.draftRevision)&&h.source.draftRevision>=0);
 check(Number.isSafeInteger(h.records)&&h.records>=0&&h.records<=centralCheckLimits.records&&Number.isSafeInteger(h.bytes)&&h.bytes>0&&h.bytes<=centralSnapshotLimits.bytes);
 check(Array.isArray(h.pages)&&h.pages.length>0&&h.pages.length<=centralSnapshotLimits.pages&&h.pages.every((p,i)=>p.id===String(i)&&hex(p.digest)&&Number.isSafeInteger(p.entries)&&p.entries>0&&p.entries<=campaignLimits.pageRecords&&Number.isSafeInteger(p.bytes)&&p.bytes>0));
 const {manifestDigest,...manifest}=h;check(hex(manifestDigest)&&manifestDigest===digest(manifest));
}
function reportParts(report){
 const s=json(report),parts=[];
 for(let i=0;i<s.length;){let end=Math.min(i+100000,s.length);if(end<s.length&&s.charCodeAt(end-1)>=0xD800&&s.charCodeAt(end-1)<=0xDBFF)end--;parts.push({path:`report/${parts.length}`,data:s.slice(i,end)});i=end;}
 return parts;
}
async function plan(tx,{c,s,draft,owner,grant,rights},actor,at,revision){
 requireThat(Number.isSafeInteger(revision)&&revision===(draft?.revision??0),'STALE_REVISION');
 const changes=(await tx.list(`campaigns/${c.id}/masterDrafts/initial/changes`,null,{limit:centralCheckLimits.records+1})).sort((a,b)=>String(a.id).localeCompare(String(b.id),'en'));
 const authority=owner?{kind:'OWNER',revision:null}:{kind:'DELEGATED',revision:grant.revision,readWorkshops:grant.readWorkshops,editWorkshops:grant.editWorkshops};
 const report=centralDraftCheck({campaign:c,session:s,draft,changes,actorUid:actor.uid,authority,at});
 requireThat(report.totals.invalid===0,'CENTRAL_SNAPSHOT_INVALID_SOURCE');
 const entries=[...changes.map(change=>({path:`changes/${change.id}`,data:change})),...reportParts(report)];
 requireThat(bytes(entries)<=centralSnapshotLimits.bytes,'CENTRAL_SNAPSHOT_LIMIT');
 const pages=campaignPagesFor(entries);requireThat(pages.length<=centralSnapshotLimits.pages,'CENTRAL_SNAPSHOT_LIMIT');
 const source={draftId:'initial',draftRevision:revision,baseVersionId:null,basePointerRevision:0,ruleProfile:c.ruleProfile,campaignRevision:c.revision,sessionId:s.id,sessionRevision:s.revision};
 // The actual capture time is recorded, but waiting alone does not invalidate consent.
 const confirmation=digest({formatVersion,actorUid:actor.uid,authority,rights,ownerUid:c.ownerUid,campaignId:c.id,source,changes,report:{...report,checkedAt:0}});
 return {changes,report,entries,pages,source,confirmation};
}
async function readSnapshot(tx,base,c,id){
 const h=await tx.get(`${base}/${id}`);requireThat(h,'CENTRAL_SNAPSHOT_NOT_FOUND');validHeader(h,c,id);
 const pages=await Promise.all(h.pages.map(p=>tx.get(`${base}/${id}/pages/${p.id}`))),entries=[];
 for(let i=0;i<pages.length;i++){
  const p=pages[i],expected=h.pages[i];check(p&&Object.keys(p).length===3&&p.id===expected.id&&p.snapshotId===id&&Array.isArray(p.entries));
  check(digest(p)===expected.digest&&p.entries.length===expected.entries&&bytes(p)===expected.bytes);entries.push(...p.entries);
 }
 check(bytes(entries)===h.bytes&&digest(entries)===h.contentDigest);
 const changes=entries.filter(e=>e.path.startsWith('changes/')).map(e=>{check(e.path===`changes/${e.data?.id}`);return e.data;});
 const parts=entries.filter(e=>e.path.startsWith('report/'));check(entries.length===changes.length+parts.length&&changes.length===h.records&&new Set(changes.map(c=>c.id)).size===changes.length&&parts.length>0);
 parts.forEach((e,i)=>check(e.path===`report/${i}`&&typeof e.data==='string'));
 let report;try{report=JSON.parse(parts.map(e=>e.data).join(''));}catch{check(false);}
 check(digest(report)===h.reportDigest&&report.fingerprint===h.reportFingerprint&&report.draft.revision===h.source.draftRevision&&report.campaign.id===c.id&&report.publicationAvailable===false);
 for(const change of changes){try{validateCentralChange(change,h.source.draftRevision);}catch{check(false);}}
 return {header:h,changes,report};
}
export async function centralSnapshots(tx,action,actor,input,ctx){
 const {c,draft,rights,owner,at,uuid}=ctx,base=`campaigns/${c.id}/masterDrafts/initial/checks`;
 requireThat(rights.checkCentral,'FORBIDDEN');
 if(action==='listCentralSnapshots'){
  keys(input,['campaignId']);const rows=await tx.list(base,null,{orderBy:'createdAt',direction:'desc',limit:centralSnapshotLimits.recent+1});
  return {campaignId:c.id,canCapture:owner,snapshots:rows.slice(0,centralSnapshotLimits.recent).map(h=>{validHeader(h,c,h.id);return summary(h);}),hasMore:rows.length>centralSnapshotLimits.recent};
 }
 if(action==='centralSnapshot'){
  keys(input,['campaignId','snapshotId']);const id=documentId(input.snapshotId),saved=await readSnapshot(tx,base,c,id);
  return {...saved,snapshot:summary(saved.header),currentDraftRevision:draft?.revision??0,sourceIsCurrentRevision:(draft?.revision??0)===saved.header.source.draftRevision,publicationAvailable:false};
 }
 // The existing delegated check right is read-only; capture is owner-only.
 requireThat(owner,'FORBIDDEN');
 if(action==='previewCentralSnapshot'){
  keys(input,['campaignId','draftRevision']);const p=await plan(tx,ctx,actor,at,input.draftRevision);
  return {campaignId:c.id,draftRevision:input.draftRevision,confirmation:p.confirmation,records:p.changes.length,bytes:bytes(p.entries),pages:p.pages.length,report:p.report,publicationAvailable:false};
 }
 keys(input,['campaignId','draftRevision','confirmation','reason','requestId']);
 requireThat(hex(input.confirmation)&&typeof input.reason==='string'&&input.reason.trim()&&input.reason.length<=500,'INVALID_CENTRAL_SNAPSHOT');
 const requestId=documentId(input.requestId),op=`operations/${opHash(`${actor.uid}:${requestId}`)}`,fingerprint=digest([action,input]);
 const receipt=await tx.get(op);if(receipt){requireThat(receipt.fingerprint===fingerprint,'REQUEST_ID_REUSED');return receipt.result;}
 const id=`snapshot_${digest([c.id,actor.uid,input.confirmation])}`,old=await tx.get(`${base}/${id}`);
 if(old){validHeader(old,c,id);const result=summary(old);tx.set(op,{fingerprint,result,at});return result;}
 const p=await plan(tx,ctx,actor,at,input.draftRevision);requireThat(p.confirmation===input.confirmation,'CENTRAL_SNAPSHOT_STALE');
 const pages=p.pages.map((entries,i)=>({id:String(i),snapshotId:id,entries}));
 const manifest={id,kind,formatVersion,status:'SEALED',campaignId:c.id,ownerUid:c.ownerUid,actorUid:actor.uid,createdAt:at,reason:input.reason.trim(),confirmation:p.confirmation,source:p.source,records:p.changes.length,bytes:bytes(p.entries),contentDigest:digest(p.entries),reportFingerprint:p.report.fingerprint,reportDigest:digest(p.report),reportStatus:p.report.status,diagnostics:p.report.totals.diagnostics,pages:pages.map(page=>({id:page.id,entries:page.entries.length,bytes:bytes(page),digest:digest(page)}))};
 const header={...manifest,manifestDigest:digest(manifest)},eventId=uuid();
 for(const page of pages)tx.set(`${base}/${id}/pages/${page.id}`,page);
 tx.set(`${base}/${id}`,header);const result=summary(header);
 tx.set(`campaigns/${c.id}/history/${eventId}`,{id:eventId,action,actorUid:actor.uid,at,reason:header.reason,snapshotId:id,draftRevision:p.source.draftRevision,manifestDigest:header.manifestDigest});
 tx.set(op,{fingerprint,result,at});return result;
}
