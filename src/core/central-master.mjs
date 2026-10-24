import {createHash} from 'node:crypto';
import {documentId,requireThat,whole} from './validation.mjs';
import {staffEmail} from './staff.mjs';
import {isPreparation,spaceOutlawsProfile} from './preparation-state.mjs';
import {itemInput} from './inventory-state.mjs';
import {centralWorkshops} from '../shared/central-workshops.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>hash(JSON.stringify(canonical(v)));
export const centralStaffPath=(cid,email)=>`campaignStaff/${hash(`${cid}:${staffEmail(email)}`)}`;
const root=cid=>`campaigns/${cid}`;
const draftPath=cid=>`${root(cid)}/masterDrafts/initial`;
const ids=centralWorkshops.map(w=>w.id);
const keys=(v,allowed)=>requireThat(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k)),'INVALID_CENTRAL_MASTER');
const reasonText=v=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=500,'INVALID_CENTRAL_MASTER');return v.trim();};
const workshopList=v=>{requireThat(Array.isArray(v)&&v.length<=7&&new Set(v).size===v.length&&v.every(id=>ids.includes(id)),'INVALID_CENTRAL_GRANT');return [...v].sort();};
const ownerRights={readWorkshops:ids,editWorkshops:['M1'],manageStaff:true};
export const centralMasterCommands=['centralMaster','setCentralStaff','saveCentralItem','archiveCentralItem'];
export const centralMasterAction=a=>centralMasterCommands.includes(a);
export const centralLimits={items:250,staff:50};

// C1b only opens NEW, empty-based preparations. Historical campaigns and a future
// publication/rebase cycle are deliberately not adopted by this entry point.
export function centralPreparation(c,s){
 return c?.ruleProfile===spaceOutlawsProfile&&isPreparation(s)&&c.preparationSessionId===s.id&&s.campaignId===c.id&&s.ownerUid===c.ownerUid
  &&c.scenarioId===null&&c.versionId===null&&c.activeSessionId===null&&c.activeBuildId===null&&c.latestSessionId===null&&c.episodeCount===0;
}
const validGrant=(g,c)=>g?.active===true&&g.ownerUid===c.ownerUid&&g.campaignId===c.id
 &&Array.isArray(g.readWorkshops)&&g.readWorkshops.length>0&&g.readWorkshops.every(x=>ids.includes(x))
 &&Array.isArray(g.editWorkshops)&&g.editWorkshops.every(x=>x==='M1'&&g.readWorkshops.includes(x));
export async function centralDashboard(tx,actor,isAdmin){
 const own=isAdmin?await tx.list('campaigns',['ownerUid',actor.uid]):[];
 const grants=await tx.list('campaignStaff',['email',actor.email.toLowerCase()]),result=[];
 for(const c of own){const s=await tx.get(`sessions/${c.preparationSessionId??'none'}`);if(centralPreparation(c,s))result.push({id:c.id,title:c.title,role:'OWNER'});}
 for(const g of grants.filter(g=>g.active)){
  const c=await tx.get(root(g.campaignId));if(!c||!validGrant(g,c)||result.some(x=>x.id===c.id))continue;
  const s=await tx.get(`sessions/${c.preparationSessionId??'none'}`);if(centralPreparation(c,s))result.push({id:c.id,title:c.title,role:'WORKSHOP'});
 }
 return result;
}
export function createCentralMasterService({store,signed,isAdmin,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);const cid=documentId(input.campaignId),at=now();
  return store.runTransaction(async tx=>{
   const c=await tx.get(root(cid));requireThat(c,'FORBIDDEN');
   const owner=isAdmin(actor)&&c.ownerUid===actor.uid;
   const grant=owner?null:await tx.get(centralStaffPath(cid,actor.email));
   requireThat(owner||validGrant(grant,c),'FORBIDDEN');
   const rights=owner?ownerRights:{readWorkshops:grant.readWorkshops,editWorkshops:grant.editWorkshops,manageStaff:false};
   const s=await tx.get(`sessions/${c.preparationSessionId??'none'}`);requireThat(centralPreparation(c,s),'CENTRAL_PREPARATION_REQUIRED');
   const draft=await tx.get(draftPath(cid));
   requireThat(!c.master||c.master.schemaVersion===1&&c.master.openDraftId==='initial'&&c.master.activeVersionId===null&&c.master.pointerRevision===0,'CENTRAL_DRAFT_UNAVAILABLE');
   requireThat(!draft?!c.master:!!c.master&&draft.id==='initial'&&draft.status==='DRAFT'&&draft.baseVersionId===null&&draft.basePointerRevision===0&&draft.ruleProfile===spaceOutlawsProfile&&Number.isSafeInteger(draft.revision)&&draft.revision>=0,'CENTRAL_DRAFT_UNAVAILABLE');
   const revision=draft?.revision??0;
   if(action==='centralMaster'){
    keys(input,['campaignId','workshop']);const workshop=input.workshop??rights.readWorkshops[0];
    requireThat(ids.includes(workshop),'INVALID_CENTRAL_MASTER');requireThat(rights.readWorkshops.includes(workshop),'FORBIDDEN');
    // Filter on the server. Do not expose other workshop contents, admission
    // histories/policies, real identities, invitations or group permissions.
    const changes=await tx.list(`${draftPath(cid)}/changes`,['workshop',workshop]);
    const history=workshop==='M1'?(await tx.list(`${draftPath(cid)}/history`,null,{orderBy:'revision',direction:'desc',limit:30})).filter(h=>h.workshop==='M1'):[];
    const staff=owner?await tx.list('campaignStaff',['campaignId',cid]):[];
    return {campaign:{id:cid,title:c.title},draft:{id:'initial',revision,status:'DRAFT',baseVersionId:null,pointerRevision:0},rights,workshop,
     workshops:centralWorkshops.map(w=>({...w,canRead:rights.readWorkshops.includes(w.id),canEdit:rights.editWorkshops.includes(w.id)})),
     changes:changes.sort((a,b)=>a.id.localeCompare(b.id)),history:history.sort((a,b)=>b.revision-a.revision).slice(0,30),
     staff:staff.map(g=>({email:g.email,active:g.active,readWorkshops:g.readWorkshops,editWorkshops:g.editWorkshops,revision:g.revision}))};
   }
   if(action==='setCentralStaff')requireThat(rights.manageStaff,'FORBIDDEN');
   else requireThat(rights.editWorkshops.includes('M1'),'FORBIDDEN');
   const requestId=documentId(input.requestId),op=`operations/${hash(`${actor.uid}:${requestId}`)}`,fingerprint=digest([action,input]);
   const receipt=await tx.get(op);if(receipt){requireThat(receipt.fingerprint===fingerprint,'REQUEST_ID_REUSED');return receipt.result;}
   let result;
   if(action==='setCentralStaff'){
    keys(input,['campaignId','requestId','email','active','readWorkshops','editWorkshops','revision','reason']);
    const email=staffEmail(input.email),readWorkshops=workshopList(input.readWorkshops),editWorkshops=workshopList(input.editWorkshops),reason=reasonText(input.reason);
    requireThat(email!==actor.email.toLowerCase()&&typeof input.active==='boolean'&&(!input.active||readWorkshops.length>0)&&editWorkshops.every(x=>x==='M1'&&readWorkshops.includes(x)),'INVALID_CENTRAL_GRANT');
    const path=centralStaffPath(cid,email),old=await tx.get(path);requireThat(whole(input.revision)===(old?.revision??0),'STALE_REVISION');
    if(!old)requireThat((await tx.list('campaignStaff',['campaignId',cid],{limit:centralLimits.staff})).length<centralLimits.staff,'CENTRAL_LIMIT');
    const next={campaignId:cid,ownerUid:c.ownerUid,email,active:input.active,readWorkshops,editWorkshops,revision:(old?.revision??0)+1,updatedAt:at};
    tx.set(path,next);const eventId=uuid();tx.set(`${root(cid)}/history/${eventId}`,{id:eventId,action,actorUid:actor.uid,at,reason,before:old,after:next});
    result={revision:next.revision};
   }else{
    keys(input,['campaignId','requestId','itemId','draftRevision','itemRevision','reason',...(action==='saveCentralItem'?['item']:[])]);
    requireThat(whole(input.draftRevision)===revision,'STALE_REVISION');const id=documentId(input.itemId),reason=reasonText(input.reason);
    const path=`${draftPath(cid)}/changes/item_${id}`,old=await tx.get(path);
    if(!old)requireThat((await tx.list(`${draftPath(cid)}/changes`,['type','item'],{limit:centralLimits.items})).length<centralLimits.items,'CENTRAL_LIMIT');
    requireThat(!old||old.type==='item'&&old.entityId===id&&old.workshop==='M1','CENTRAL_DRAFT_UNAVAILABLE');
    requireThat(whole(input.itemRevision)===(old?.data.revision??0),'STALE_REVISION');
    let data;
    if(action==='saveCentralItem'){
     keys(input.item,['name','description','category','unit','kind','consumable','unitVolume','legality','pillable','gmNotes','laserRecharge']);
     if(input.item.laserRecharge!=null)keys(input.item.laserRecharge,['pelletsPerUnit']);
     data=itemInput({...input.item,publicationState:'DRAFT'},id,old?.data);
    }else{requireThat(old?.operation==='UPSERT','CENTRAL_ITEM_UNAVAILABLE');data={...old.data,revision:old.data.revision+1};}
    const nextRevision=revision+1,change={id:`item_${id}`,type:'item',entityId:id,workshop:'M1',operation:action==='saveCentralItem'?'UPSERT':'ARCHIVE',data,revision:nextRevision,source:'WEB',actorUid:actor.uid,at};
    const d={...(draft??{id:'initial',baseVersionId:null,basePointerRevision:0,ruleProfile:spaceOutlawsProfile,status:'DRAFT',createdAt:at}),revision:nextRevision,updatedAt:at};
    if(!c.master)tx.set(root(cid),{...c,revision:c.revision+1,master:{schemaVersion:1,activeVersionId:null,pointerRevision:0,openDraftId:'initial'}});
    tx.set(draftPath(cid),d);tx.set(path,change);
    tx.set(`${draftPath(cid)}/history/${nextRevision}`,{id:String(nextRevision),revision:nextRevision,workshop:'M1',action,actorUid:actor.uid,at,reason,before:old,change});
    result={itemId:id,itemRevision:data.revision,draftRevision:nextRevision};
   }
   tx.set(op,{fingerprint,result,at});return result;
  });
 };
}
