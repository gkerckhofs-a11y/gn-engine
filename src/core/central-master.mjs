import {centralFieldTargetInput,centralFieldTargetProjection} from './central-field-targets.mjs';
import {centralGroupInput,centralGroupProjection} from './central-groups.mjs';
import {centralSnapshots,centralSnapshotActions} from './central-snapshots.mjs';
import {centralSpaceInput,centralSpaceProjection,centralSpaceTypes} from './central-space.mjs';
import {centralMissionInput,centralMissionProjection} from './central-missions.mjs';
import {centralKnowledgeInput,centralKnowledgeProjection} from './central-knowledge.mjs';
import {centralClassKitInput,centralClassKitProjection} from './central-class-kits.mjs';
import {centralShopInput,centralOfferInput,centralShopProjection} from './central-shops.mjs';
import {centralDraftCheck,centralCheckLimits} from './central-check.mjs';
import {centralCharacterInput,centralCharacterProjection} from './central-characters.mjs';
import {centralImport,centralImportCommands} from './central-import.mjs';
import {createHash} from 'node:crypto';
import {documentId,requireThat,whole} from './validation.mjs';
import {staffEmail} from './staff.mjs';
import {isPreparation,spaceOutlawsProfile} from './preparation-state.mjs';
import {itemInput} from './inventory-state.mjs';
import {recipeInput} from './recipe-state.mjs';
import {centralRecipeProjection} from './central-recipes.mjs';
import {readSoEntryVersion,writeSoReleaseVersion} from './space-outlaws-entry.mjs';
import {soReleaseManifest} from './space-outlaws-release-check.mjs';
import {centralWorkshops} from '../shared/central-workshops.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>hash(JSON.stringify(canonical(v)));
export const centralStaffPath=(cid,email)=>`campaignStaff/${hash(`${cid}:${staffEmail(email)}`)}`;
const root=cid=>`campaigns/${cid}`;
const draftPath=(cid,id='initial')=>`${root(cid)}/masterDrafts/${id}`;
const hasPublishedMaster=c=>c?.ruleProfile===spaceOutlawsProfile&&c.master?.schemaVersion===1
 &&typeof c.master.activeVersionId==='string'&&Number.isSafeInteger(c.master.pointerRevision)&&c.master.pointerRevision>0;
// A draft is addressed by the current pointer epoch, so opening it never
// changes the campaign document used by existing session confirmations.
const revisionDraftId=c=>`revision-${c.master.pointerRevision}`;
const ids=centralWorkshops.map(w=>w.id);
const keys=(v,allowed)=>requireThat(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k)),'INVALID_CENTRAL_MASTER');
const reasonText=v=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=500,'INVALID_CENTRAL_MASTER');return v.trim();};
const workshopList=v=>{requireThat(Array.isArray(v)&&v.length<=7&&new Set(v).size===v.length&&v.every(id=>ids.includes(id)),'INVALID_CENTRAL_GRANT');return [...v].sort();};
const editableIds=centralWorkshops.filter(w=>w.editable).map(w=>w.id);
const ownerRights={readWorkshops:ids,editWorkshops:editableIds,manageStaff:true,checkCentral:true};
export const centralMasterCommands=[...centralSnapshotActions,'saveCentralFieldTarget','archiveCentralFieldTarget','saveCentralGroup','archiveCentralGroup',...centralImportCommands,'centralMaster','openCentralRevision','previewCentralRelease','publishCentralRevision','checkCentralDraft','setCentralStaff','saveCentralItem','archiveCentralItem','saveCentralRecipe','archiveCentralRecipe','saveCentralCharacter','archiveCentralCharacter','saveCentralClassKit','archiveCentralClassKit','saveCentralShipModel','archiveCentralShipModel','saveCentralPort','archiveCentralPort','saveCentralRoute','archiveCentralRoute','saveCentralMission','archiveCentralMission','saveCentralKnowledge','archiveCentralKnowledge','saveCentralShop','archiveCentralShop','saveCentralOffer','archiveCentralOffer'];
export const centralMasterAction=a=>centralMasterCommands.includes(a);
export const centralLimits={items:250,recipes:250,characters:100,groups:50,fieldTargets:100,classKits:8,shops:50,offers:250,knowledge:250,missions:100,shipModels:100,ports:100,routes:200,staff:50};
const actionType=action=>action.endsWith('FieldTarget')?'fieldTarget':action.endsWith('Group')?'group':action.endsWith('ShipModel')?'shipModel':action.endsWith('Port')?'port':action.endsWith('Route')?'route':action.endsWith('Mission')?'mission':action.endsWith('Knowledge')?'knowledge':action.endsWith('Shop')?'shop':action.endsWith('Offer')?'offer':action.endsWith('ClassKit')?'classKit':action.endsWith('Character')?'character':action.endsWith('Recipe')?'recipe':'item';
const typeWorkshop=type=>centralSpaceTypes.includes(type)?'M3':type==='mission'?'M7':['knowledge','fieldTarget'].includes(type)?'M6':['shop','offer'].includes(type)?'M5':['character','group'].includes(type)?'M2':type==='recipe'?'M4':'M1';

// C1b only opens NEW, empty-based preparations. Historical campaigns and a future
// publication/rebase cycle are deliberately not adopted by this entry point.
export function centralPreparation(c,s){
 return c?.ruleProfile===spaceOutlawsProfile&&isPreparation(s)&&c.preparationSessionId===s.id&&s.campaignId===c.id&&s.ownerUid===c.ownerUid
  &&c.scenarioId===null&&c.versionId===null&&c.activeSessionId===null&&c.activeBuildId===null&&c.latestSessionId===null&&c.episodeCount===0;
}
const validGrant=(g,c)=>g?.active===true&&g.ownerUid===c.ownerUid&&g.campaignId===c.id
 &&Array.isArray(g.readWorkshops)&&g.readWorkshops.length>0&&g.readWorkshops.every(x=>ids.includes(x))
 &&Array.isArray(g.editWorkshops)&&g.editWorkshops.every(x=>editableIds.includes(x)&&g.readWorkshops.includes(x))
 &&(g.checkCentral===undefined||typeof g.checkCentral==='boolean')
 &&(!g.checkCentral||ids.every(id=>g.readWorkshops.includes(id))&&Number.isSafeInteger(g.revision)&&g.revision>0);
// Shared authority/cycle boundary for central commands and admission-to-M2 preparation.
export async function centralAuthority(tx,actor,c,isAdmin){
 const owner=isAdmin(actor)&&c.ownerUid===actor.uid,grant=owner?null:await tx.get(centralStaffPath(c.id,actor.email));
 return {owner,grant,rights:owner?ownerRights:validGrant(grant,c)?{readWorkshops:grant.readWorkshops,editWorkshops:grant.editWorkshops,manageStaff:false,checkCentral:grant.checkCentral===true}:null};
}
export function requireCentralPreparation(c,s,draft){
 requireThat(centralPreparation(c,s),'CENTRAL_PREPARATION_REQUIRED');
 requireThat(!c.master||c.master.schemaVersion===1&&c.master.openDraftId==='initial'&&c.master.activeVersionId===null&&c.master.pointerRevision===0,'CENTRAL_DRAFT_UNAVAILABLE');
 requireThat(!draft?!c.master:!!c.master&&draft.id==='initial'&&draft.status==='DRAFT'&&draft.baseVersionId===null&&draft.basePointerRevision===0&&draft.ruleProfile===spaceOutlawsProfile&&Number.isSafeInteger(draft.revision)&&draft.revision>=0,'CENTRAL_DRAFT_UNAVAILABLE');
}
export async function centralDashboard(tx,actor,isAdmin){
 const own=isAdmin?await tx.list('campaigns',['ownerUid',actor.uid]):[];
 const grants=await tx.list('campaignStaff',['email',actor.email.toLowerCase()]),result=[];
 for(const c of own){if(hasPublishedMaster(c)){result.push({id:c.id,title:c.title,role:'OWNER'});continue;}const s=await tx.get(`sessions/${c.preparationSessionId??'none'}`);if(centralPreparation(c,s)&&!c.master?.activeVersionId)result.push({id:c.id,title:c.title,role:'OWNER'});}
 for(const g of grants.filter(g=>g.active)){
  const c=await tx.get(root(g.campaignId));if(!c||!validGrant(g,c)||result.some(x=>x.id===c.id))continue;
  if(hasPublishedMaster(c)){
   if(await tx.get(draftPath(c.id,revisionDraftId(c))))result.push({id:c.id,title:c.title,role:'WORKSHOP'});
   continue;
  }
  const s=await tx.get(`sessions/${c.preparationSessionId??'none'}`);if(centralPreparation(c,s)&&!c.master?.activeVersionId)result.push({id:c.id,title:c.title,role:'WORKSHOP'});
 }
 return result;
}
async function releaseRevision(tx,{c,actor,input,at,uuid,published,preview}){
 const cid=c.id;
 requireThat(published,'SO_RELEASE_REQUIRED');
 keys(input,['campaignId','draftId','draftRevision',...(preview?[]:['confirmation','reason','requestId'])]);
 const id=documentId(input.draftId),revision=whole(input.draftRevision);
 const path=draftPath(cid,id),draft=await tx.get(path);
 requireThat(draft?.id===id&&draft.ruleProfile===spaceOutlawsProfile&&draft.revision===revision,'STALE_REVISION');
 const op=preview?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`;
 const fingerprint=preview?null:digest(['publishCentralRevision',input]);
 const receipt=op?await tx.get(op):null;
 if(receipt){requireThat(receipt.fingerprint===fingerprint,'REQUEST_ID_REUSED');return receipt.result;}
 const reason=preview?null:reasonText(input.reason);
 if(!preview&&draft.status==='SEALED'&&draft.publishedVersionId){
  const {header}=await readSoEntryVersion(tx,c,draft.publishedVersionId);
  requireThat(header.draftId===id&&header.actorUid===actor.uid&&header.confirmation===input.confirmation,'SO_ENTRY_STALE');
  return {versionId:header.id,pointerRevision:header.pointerRevision};
 }
 requireThat(id===revisionDraftId(c)&&draft.status==='DRAFT'&&draft.baseVersionId===c.master.activeVersionId
  &&draft.basePointerRevision===c.master.pointerRevision,'STALE_REVISION');
 const base=await readSoEntryVersion(tx,c);
 const changes=await tx.list(`${path}/changes`,null,{limit:centralCheckLimits.records+1});
 const report=centralDraftCheck({campaign:c,session:null,draft,changes,actorUid:actor.uid,authority:{kind:'OWNER',revision:null},at,base});
 const canRelease=report.diff.length>0&&report.releaseChecks.manifestChecked
  &&report.diagnostics.every(d=>d.code==='REWARD_SOURCE_PENDING');
 const confirmation=canRelease?digest(['CENTRAL_REVISION_RELEASE',report.fingerprint]):null;
 const pointerRevision=c.master.pointerRevision+1;
 if(preview)return {campaignId:cid,draftId:id,draftRevision:revision,pointerRevision,canRelease,confirmation};
 requireThat(canRelease,'SO_RELEASE_BLOCKED');
 requireThat(confirmation===input.confirmation,'SO_ENTRY_STALE');
 const effective=new Map(base.changes.map(change=>[change.id,change]));
 for(const change of changes)effective.set(change.id,change);
 const {entries,pages}=soReleaseManifest([...effective.values()]);
 const parentVersionId=base.header.id,parentManifestDigest=base.header.manifestDigest;
 const definitionRevision=Math.max(revision,base.header.definitionRevision??base.header.draftRevision);
 const versionId=writeSoReleaseVersion(tx,{campaignId:cid,draftId:id,draftRevision:revision,definitionRevision,
  pointerRevision,parentVersionId,parentManifestDigest,confirmation,createdAt:at,actorUid:actor.uid,reason,entries,pages});
 tx.set(path,{...draft,status:'SEALED',publishedVersionId:versionId,updatedAt:at});
 tx.set(root(cid),{...c,revision:c.revision+1,master:{...c.master,activeVersionId:versionId,pointerRevision}});
 const eventId=uuid();
 tx.set(`${root(cid)}/history/${eventId}`,{id:eventId,action:'publishCentralRevision',actorUid:actor.uid,at,reason,versionId,parentVersionId,
  parentManifestDigest,draftId:id,draftRevision:revision,pointerRevision,reportFingerprint:report.fingerprint});
 const result={versionId,pointerRevision};
 tx.set(op,{fingerprint,result,at});
 return result;
}

export function createCentralMasterService({store,signed,isAdmin,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);const cid=documentId(input.campaignId),at=now();
  return store.runTransaction(async tx=>{
   const c=await tx.get(root(cid));requireThat(c,'FORBIDDEN');
   const {owner,grant,rights}=await centralAuthority(tx,actor,c,isAdmin);requireThat(rights,'FORBIDDEN');
   const published=hasPublishedMaster(c),opening=action==='openCentralRevision',importing=centralImportCommands.includes(action);
   const snapshotting=centralSnapshotActions.includes(action),capturing=action==='previewCentralSnapshot'||action==='captureCentralSnapshot';
   if(action==='previewCentralRelease'||action==='publishCentralRevision'){
    requireThat(owner,'FORBIDDEN');
    return releaseRevision(tx,{c,actor,input,at,uuid,published,preview:action==='previewCentralRelease'});
   }
   if(opening||capturing)requireThat(owner,'FORBIDDEN');
   if(action==='checkCentralDraft'||snapshotting)requireThat(rights.checkCentral,'FORBIDDEN');
   if(published&&snapshotting&&!capturing&&input.draftId!==revisionDraftId(c)){
    requireThat(typeof input.draftId==='string','STALE_REVISION');
    const historicalId=documentId(input.draftId),path=draftPath(cid,historicalId),draft=await tx.get(path);
    requireThat(draft?.id===historicalId&&typeof draft.baseVersionId==='string'&&draft.status==='SEALED'&&draft.ruleProfile===spaceOutlawsProfile,'STALE_REVISION');
    return centralSnapshots(tx,action,actor,input,{c,draft,path,owner:false});
   }
   const path=draftPath(cid,published?revisionDraftId(c):'initial'),draft=await tx.get(path);
   const s=published?null:await tx.get(`sessions/${c.preparationSessionId??'none'}`);
   let baseVersionId=null,pointerRevision=0;
   if(published){
    ({activeVersionId:baseVersionId,pointerRevision}=c.master);
    requireThat(!draft||draft.id===revisionDraftId(c)&&draft.status==='DRAFT'&&draft.ruleProfile===spaceOutlawsProfile
     &&draft.baseVersionId===baseVersionId&&draft.basePointerRevision===pointerRevision
     &&Number.isSafeInteger(draft.revision)&&draft.revision>=0,'CENTRAL_DRAFT_UNAVAILABLE');
    if(opening){
     keys(input,['campaignId','baseVersionId','pointerRevision','requestId','reason']);
     requireThat(input.baseVersionId===baseVersionId&&whole(input.pointerRevision)===pointerRevision,'STALE_REVISION');
    }else{
     if(importing)requireThat(rights.readWorkshops.includes(input.workshop)&&(action==='exportCentralDraft'||rights.editWorkshops.includes(input.workshop)),'FORBIDDEN');
     if(!draft){
      requireThat(owner&&action==='centralMaster','CENTRAL_DRAFT_UNAVAILABLE');
      keys(input,['campaignId','workshop']);
      requireThat(input.workshop===undefined||ids.includes(input.workshop),'INVALID_CENTRAL_MASTER');
      const {header}=await readSoEntryVersion(tx,c);
      return {campaign:{id:cid,title:c.title},draft:{status:'PUBLISHED',baseVersionId,pointerRevision},
       ...(header.draftId?{publishedDraftId:header.draftId}:{})};
     }
    }
   }else{
    requireThat(!opening,'SO_RELEASE_REQUIRED');
    requireCentralPreparation(c,s,draft);
   }
   const revision=draft?.revision??0;
   if(action==='checkCentralDraft'){
    keys(input,['campaignId','draftRevision',...(published?['draftId']:[])]);
    requireThat((!published||input.draftId===draft.id)&&whole(input.draftRevision)===revision,'STALE_REVISION');
    const base=published?await readSoEntryVersion(tx,c):null;
    const changes=await tx.list(`${path}/changes`,null,{limit:centralCheckLimits.records+1});
    const authority=owner?{kind:'OWNER',revision:null}:{kind:'DELEGATED',revision:grant.revision,readWorkshops:grant.readWorkshops,editWorkshops:grant.editWorkshops};
    return centralDraftCheck({campaign:c,session:s,draft,changes,actorUid:actor.uid,authority,at,base});
   }
   if(snapshotting){
    if(published)requireThat(input.draftId===draft.id,'STALE_REVISION');
    const version=published&&capturing?await readSoEntryVersion(tx,c):null;
    return centralSnapshots(tx,action,actor,input,{c,s,draft,path,version,owner,rights,at,uuid});
   }
   const version=published&&action!=='setCentralStaff'?await readSoEntryVersion(tx,c):null;
   const baseChanges=version?.changes??[];
   const listChanges=async(field,value,options)=>{
    const edits=await tx.list(`${path}/changes`,[field,value],options);
    if(!published)return edits;
    const merged=new Map(baseChanges.filter(change=>change[field]===value).map(change=>[change.id,change]));
    for(const change of edits)merged.set(change.id,change);
    return [...merged.values()];
   };
   if(importing)return centralImport(tx,action,actor,input,{c,s,draft,rights,grant,at,uuid,path,version,listChanges});
   if(action==='centralMaster'){
    keys(input,['campaignId','workshop']);const workshop=input.workshop??rights.readWorkshops[0];
    requireThat(ids.includes(workshop),'INVALID_CENTRAL_MASTER');requireThat(rights.readWorkshops.includes(workshop),'FORBIDDEN');
    // Filter on the server. Do not expose other workshop contents, admission
    // histories/policies, real identities, invitations or live session grants.
    const changes=await listChanges('workshop',workshop);
    const historyType={M1:'item',M2:'character',M3:'shipModel',M4:'recipe',M5:'shop',M6:'knowledge',M7:'mission'}[workshop];
    const history=historyType?(await tx.list(`${path}/history`,null,{orderBy:'revision',direction:'desc',limit:30}))
     .filter(h=>h.workshop===workshop&&h.change?.workshop===workshop&&(h.change.type===historyType||workshop==='M6'&&h.change.type==='fieldTarget'||workshop==='M2'&&h.change.type==='group'||workshop==='M3'&&centralSpaceTypes.includes(h.change.type)||workshop==='M1'&&h.change.type==='classKit'||workshop==='M5'&&h.change.type==='offer'))
     .map(h=>Object.fromEntries(['id','revision','workshop','action','actorUid','at','reason','before','change'].map(k=>[k,h[k]??null]))):[];
    const staff=owner?await tx.list('campaignStaff',['campaignId',cid]):[];
    const recipeProjection=workshop==='M3'?centralSpaceProjection(changes,rights.readWorkshops.includes('M6')?await listChanges('workshop','M6'):null):workshop==='M7'?centralMissionProjection(changes,
     rights.readWorkshops.includes('M1')?await listChanges('workshop','M1'):null,
     rights.readWorkshops.includes('M2')?await listChanges('workshop','M2'):null,
     rights.readWorkshops.includes('M6')?await listChanges('workshop','M6'):null):workshop==='M1'?centralClassKitProjection(changes):workshop==='M2'?(()=>{const chars=centralCharacterProjection(changes),groups=centralGroupProjection(changes);return {...chars,references:{...chars.references,groups:groups.groups},diagnostics:[...chars.diagnostics,...groups.diagnostics]};})():workshop==='M4'?centralRecipeProjection(changes,rights.readWorkshops.includes('M1')?await listChanges('workshop','M1'):null,rights.readWorkshops.includes('M6')?await listChanges('workshop','M6'):null):workshop==='M5'?centralShopProjection(changes,
     rights.readWorkshops.includes('M1')?await listChanges('workshop','M1'):null,
     rights.readWorkshops.includes('M2')?await listChanges('workshop','M2'):null,
     rights.readWorkshops.includes('M6')?await listChanges('workshop','M6'):null):workshop==='M6'?await (async()=>{const information=centralKnowledgeProjection(changes,rights.readWorkshops.includes('M2')?await listChanges('workshop','M2'):null),terrain=centralFieldTargetProjection(changes,rights.readWorkshops.includes('M1')?await listChanges('workshop','M1'):null);return {...information,references:{...information.references,...terrain.references},diagnostics:[...information.diagnostics,...terrain.diagnostics]};})():{};
    return {campaign:{id:cid,title:c.title},draft:{id:draft?.id??'initial',revision,status:'DRAFT',baseVersionId,pointerRevision},rights,workshop,
     workshops:centralWorkshops.map(w=>({...w,canRead:rights.readWorkshops.includes(w.id),canEdit:rights.editWorkshops.includes(w.id)})),
     changes:changes.sort((a,b)=>a.id.localeCompare(b.id)),history:history.sort((a,b)=>b.revision-a.revision).slice(0,30),
     staff:staff.map(g=>({email:g.email,active:g.active,readWorkshops:g.readWorkshops,editWorkshops:g.editWorkshops,checkCentral:g.checkCentral===true,revision:g.revision})),...recipeProjection};
   }
   if(opening||action==='setCentralStaff')requireThat(rights.manageStaff,'FORBIDDEN');
   else{
    requireThat(rights.editWorkshops.includes(typeWorkshop(actionType(action))),'FORBIDDEN');
    requireThat((input.draftId??(published?null:'initial'))===(draft?.id??'initial'),'STALE_REVISION');
   }
   const requestId=documentId(input.requestId),op=`operations/${hash(`${actor.uid}:${requestId}`)}`,fingerprint=digest([action,input]);
   const receipt=await tx.get(op);if(receipt){requireThat(receipt.fingerprint===fingerprint,'REQUEST_ID_REUSED');return receipt.result;}
   let result;
   if(opening){
    const reason=reasonText(input.reason),id=revisionDraftId(c);
    if(!draft)tx.set(path,{id,baseVersionId,basePointerRevision:pointerRevision,ruleProfile:spaceOutlawsProfile,
     status:'DRAFT',revision:0,createdAt:at,updatedAt:at,actorUid:actor.uid,requestId,reason});
    result={id,baseVersionId,pointerRevision};
   }else if(action==='setCentralStaff'){
    keys(input,['campaignId','requestId','email','active','readWorkshops','editWorkshops','checkCentral','revision','reason']);
    const email=staffEmail(input.email),readWorkshops=workshopList(input.readWorkshops),editWorkshops=workshopList(input.editWorkshops),reason=reasonText(input.reason);
    requireThat(email!==actor.email.toLowerCase()&&typeof input.active==='boolean'&&(!input.active||readWorkshops.length>0)&&editWorkshops.every(x=>editableIds.includes(x)&&readWorkshops.includes(x)),'INVALID_CENTRAL_GRANT');
    const path=centralStaffPath(cid,email),old=await tx.get(path);requireThat(whole(input.revision)===(old?.revision??0),'STALE_REVISION');
    requireThat(input.checkCentral===undefined||typeof input.checkCentral==='boolean','INVALID_CENTRAL_GRANT');
    // Old clients retain their existing workshop contract. They cannot silently
    // preserve or restore this new sensitive right when editing an active grant.
    requireThat(!(input.active&&old?.checkCentral&&input.checkCentral===undefined),'CENTRAL_CHECK_CHOICE_REQUIRED');
    const checkCentral=input.checkCentral===true;
    requireThat(!checkCentral||input.active&&ids.every(id=>readWorkshops.includes(id)),'CENTRAL_CHECK_ACCESS_REQUIRED');
    if(!old)requireThat((await tx.list('campaignStaff',['campaignId',cid],{limit:centralLimits.staff})).length<centralLimits.staff,'CENTRAL_LIMIT');
    const next={campaignId:cid,ownerUid:c.ownerUid,email,active:input.active,readWorkshops,editWorkshops,checkCentral,revision:(old?.revision??0)+1,updatedAt:at};
    tx.set(path,next);const eventId=uuid();tx.set(`${root(cid)}/history/${eventId}`,{id:eventId,action,actorUid:actor.uid,at,reason,before:old,after:next});
    result={revision:next.revision};
   }else{
    const type=actionType(action),workshop=typeWorkshop(type),saving=action.startsWith('save'),limit=centralLimits[type==='knowledge'?type:`${type}s`],revisionField=type==='character'?'contentRevision':'revision';
    keys(input,['campaignId','requestId',`${type}Id`,'draftRevision','draftId',`${type}Revision`,'reason',...(saving?[type]:[])]);
    requireThat(whole(input.draftRevision)===revision,'STALE_REVISION');const id=documentId(input[`${type}Id`]),reason=reasonText(input.reason);
    const changeId=`${type}_${id}`,changePath=`${path}/changes/${changeId}`;
    const old=await tx.get(changePath)??baseChanges.find(change=>change.id===changeId)??null;
    if(!old)requireThat((await listChanges('type',type,{limit})).length<limit,'CENTRAL_LIMIT');
    requireThat(!old||old.type===type&&old.entityId===id&&old.workshop===workshop,'CENTRAL_DRAFT_UNAVAILABLE');
    requireThat(whole(input[`${type}Revision`])===(old?.data[revisionField]??0),'STALE_REVISION');
    let data;
    if(saving&&centralSpaceTypes.includes(type)){
     data=centralSpaceInput(type,input[type],id,old?.data);
    }else if(action==='saveCentralMission'){
     data=centralMissionInput(input.mission,id,old?.data);
    }else if(action==='saveCentralKnowledge'){
     data=centralKnowledgeInput(input.knowledge,id,old?.data);
    }else if(action==='saveCentralShop'){
     data=centralShopInput(input.shop,id,old?.data);
    }else if(action==='saveCentralOffer'){
     data=centralOfferInput(input.offer,id,old?.data);
    }else if(action==='saveCentralClassKit'){
     data=centralClassKitInput(input.classKit,id,old?.data);
    }else if(action==='saveCentralFieldTarget'){
     data=centralFieldTargetInput(input.fieldTarget,id,old?.data);
    }else if(action==='saveCentralGroup'){
     data=centralGroupInput(input.group,id,old?.data);
    }else if(action==='saveCentralCharacter'){
     data=centralCharacterInput(input.character,id,old?.data);
    }else if(action==='saveCentralItem'){
     keys(input.item,['name','description','category','unit','kind','consumable','unitVolume','legality','pillable','gmNotes','laserRecharge','shipModule']);
     if(input.item.laserRecharge!=null)keys(input.item.laserRecharge,['pelletsPerUnit']);
     data=itemInput({...input.item,publicationState:'DRAFT'},id,old?.data);
    }else if(action==='saveCentralRecipe'){
     keys(input.recipe,['name','description','kind','minLevel','skillId','productItemId','effectId','laboratoryTargetId','unlockKnowledgeId','components','indicativePrice','gmNotes']);
     requireThat(Array.isArray(input.recipe.components),'INVALID_RECIPE');
     for(const component of input.recipe.components)keys(component,['itemId','quantity']);
     data=recipeInput({...input.recipe,publicationState:'DRAFT',masterArchived:false},id,old?.data);
    }else{requireThat(old?.operation==='UPSERT',centralSpaceTypes.includes(type)?'CENTRAL_SPACE_UNAVAILABLE':type==='mission'?'CENTRAL_MISSION_UNAVAILABLE':type==='knowledge'?'CENTRAL_KNOWLEDGE_UNAVAILABLE':type==='shop'?'CENTRAL_SHOP_UNAVAILABLE':type==='offer'?'CENTRAL_OFFER_UNAVAILABLE':type==='classKit'?'CENTRAL_KIT_UNAVAILABLE':type==='fieldTarget'?'CENTRAL_FIELD_TARGET_UNAVAILABLE':type==='group'?'CENTRAL_GROUP_UNAVAILABLE':type==='character'?'CENTRAL_CHARACTER_UNAVAILABLE':type==='recipe'?'CENTRAL_RECIPE_UNAVAILABLE':'CENTRAL_ITEM_UNAVAILABLE');data={...old.data,...(['recipe','character','group','fieldTarget','classKit','shop','offer','knowledge','mission',...centralSpaceTypes].includes(type)?{masterArchived:true}:{}),[revisionField]:old.data[revisionField]+1};}
    const nextRevision=revision+1,change={id:`${type}_${id}`,type,entityId:id,workshop,operation:saving?'UPSERT':'ARCHIVE',data,revision:nextRevision,source:'WEB',actorUid:actor.uid,requestId,at};
    const d={...(draft??{id:'initial',baseVersionId:null,basePointerRevision:0,ruleProfile:spaceOutlawsProfile,status:'DRAFT',createdAt:at}),revision:nextRevision,updatedAt:at};
    if(!c.master)tx.set(root(cid),{...c,revision:c.revision+1,master:{schemaVersion:1,activeVersionId:null,pointerRevision:0,openDraftId:'initial'}});
    tx.set(path,d);tx.set(changePath,change);
    tx.set(`${path}/history/${nextRevision}`,{id:String(nextRevision),revision:nextRevision,workshop,action,actorUid:actor.uid,at,reason,before:old,change});
    result={[`${type}Id`]:id,[`${type}Revision`]:data[revisionField],draftRevision:nextRevision};
   }
   tx.set(op,{fingerprint,result,at});return result;
  });
 };
}
