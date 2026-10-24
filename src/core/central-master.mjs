import {centralClassKitInput,centralClassKitProjection} from './central-class-kits.mjs';
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
const editableIds=centralWorkshops.filter(w=>w.editable).map(w=>w.id);
const ownerRights={readWorkshops:ids,editWorkshops:editableIds,manageStaff:true,checkCentral:true};
export const centralMasterCommands=[...centralImportCommands,'centralMaster','checkCentralDraft','setCentralStaff','saveCentralItem','archiveCentralItem','saveCentralRecipe','archiveCentralRecipe','saveCentralCharacter','archiveCentralCharacter','saveCentralClassKit','archiveCentralClassKit'];
export const centralMasterAction=a=>centralMasterCommands.includes(a);
export const centralLimits={items:250,recipes:250,characters:100,classKits:8,staff:50};

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
   const rights=owner?ownerRights:{readWorkshops:grant.readWorkshops,editWorkshops:grant.editWorkshops,manageStaff:false,checkCentral:grant.checkCentral===true};
   const s=await tx.get(`sessions/${c.preparationSessionId??'none'}`);requireThat(centralPreparation(c,s),'CENTRAL_PREPARATION_REQUIRED');
   const draft=await tx.get(draftPath(cid));
   requireThat(!c.master||c.master.schemaVersion===1&&c.master.openDraftId==='initial'&&c.master.activeVersionId===null&&c.master.pointerRevision===0,'CENTRAL_DRAFT_UNAVAILABLE');
   requireThat(!draft?!c.master:!!c.master&&draft.id==='initial'&&draft.status==='DRAFT'&&draft.baseVersionId===null&&draft.basePointerRevision===0&&draft.ruleProfile===spaceOutlawsProfile&&Number.isSafeInteger(draft.revision)&&draft.revision>=0,'CENTRAL_DRAFT_UNAVAILABLE');
   const revision=draft?.revision??0;
   if(action==='checkCentralDraft'){
    requireThat(rights.checkCentral,'FORBIDDEN');keys(input,['campaignId','draftRevision']);
    requireThat(whole(input.draftRevision)===revision,'STALE_REVISION');
    const changes=await tx.list(`${draftPath(cid)}/changes`,null,{limit:centralCheckLimits.records+1});
    const authority=owner?{kind:'OWNER',revision:null}:{kind:'DELEGATED',revision:grant.revision,readWorkshops:grant.readWorkshops,editWorkshops:grant.editWorkshops};
    return centralDraftCheck({campaign:c,session:s,draft,changes,actorUid:actor.uid,authority,at});
   }
   if(centralImportCommands.includes(action))return centralImport(tx,action,actor,input,{c,s,draft,rights,grant,at,uuid});
   if(action==='centralMaster'){
    keys(input,['campaignId','workshop']);const workshop=input.workshop??rights.readWorkshops[0];
    requireThat(ids.includes(workshop),'INVALID_CENTRAL_MASTER');requireThat(rights.readWorkshops.includes(workshop),'FORBIDDEN');
    // Filter on the server. Do not expose other workshop contents, admission
    // histories/policies, real identities, invitations or group permissions.
    const changes=await tx.list(`${draftPath(cid)}/changes`,['workshop',workshop]);
    const historyType={M1:'item',M2:'character',M4:'recipe'}[workshop];
    const history=historyType?(await tx.list(`${draftPath(cid)}/history`,null,{orderBy:'revision',direction:'desc',limit:30}))
     .filter(h=>h.workshop===workshop&&h.change?.workshop===workshop&&(h.change.type===historyType||workshop==='M1'&&h.change.type==='classKit'))
     .map(h=>Object.fromEntries(['id','revision','workshop','action','actorUid','at','reason','before','change'].map(k=>[k,h[k]??null]))):[];
    const staff=owner?await tx.list('campaignStaff',['campaignId',cid]):[];
    const recipeProjection=workshop==='M1'?centralClassKitProjection(changes):workshop==='M2'?centralCharacterProjection(changes):workshop==='M4'?centralRecipeProjection(changes,rights.readWorkshops.includes('M1')?await tx.list(`${draftPath(cid)}/changes`,['workshop','M1']):null):{};
    return {campaign:{id:cid,title:c.title},draft:{id:'initial',revision,status:'DRAFT',baseVersionId:null,pointerRevision:0},rights,workshop,
     workshops:centralWorkshops.map(w=>({...w,canRead:rights.readWorkshops.includes(w.id),canEdit:rights.editWorkshops.includes(w.id)})),
     changes:changes.sort((a,b)=>a.id.localeCompare(b.id)),history:history.sort((a,b)=>b.revision-a.revision).slice(0,30),
     staff:staff.map(g=>({email:g.email,active:g.active,readWorkshops:g.readWorkshops,editWorkshops:g.editWorkshops,checkCentral:g.checkCentral===true,revision:g.revision})),...recipeProjection};
   }
   if(action==='setCentralStaff')requireThat(rights.manageStaff,'FORBIDDEN');
   else requireThat(rights.editWorkshops.includes(action.endsWith('Character')?'M2':action.endsWith('Recipe')?'M4':'M1'),'FORBIDDEN');
   const requestId=documentId(input.requestId),op=`operations/${hash(`${actor.uid}:${requestId}`)}`,fingerprint=digest([action,input]);
   const receipt=await tx.get(op);if(receipt){requireThat(receipt.fingerprint===fingerprint,'REQUEST_ID_REUSED');return receipt.result;}
   let result;
   if(action==='setCentralStaff'){
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
    const type=action.endsWith('ClassKit')?'classKit':action.endsWith('Character')?'character':action.endsWith('Recipe')?'recipe':'item',workshop=type==='character'?'M2':type==='recipe'?'M4':'M1',saving=action.startsWith('save'),limit=centralLimits[`${type}s`],revisionField=type==='character'?'contentRevision':'revision';
    keys(input,['campaignId','requestId',`${type}Id`,'draftRevision',`${type}Revision`,'reason',...(saving?[type]:[])]);
    requireThat(whole(input.draftRevision)===revision,'STALE_REVISION');const id=documentId(input[`${type}Id`]),reason=reasonText(input.reason);
    const path=`${draftPath(cid)}/changes/${type}_${id}`,old=await tx.get(path);
    if(!old)requireThat((await tx.list(`${draftPath(cid)}/changes`,['type',type],{limit})).length<limit,'CENTRAL_LIMIT');
    requireThat(!old||old.type===type&&old.entityId===id&&old.workshop===workshop,'CENTRAL_DRAFT_UNAVAILABLE');
    requireThat(whole(input[`${type}Revision`])===(old?.data[revisionField]??0),'STALE_REVISION');
    let data;
    if(action==='saveCentralClassKit'){
     data=centralClassKitInput(input.classKit,id,old?.data);
    }else if(action==='saveCentralCharacter'){
     data=centralCharacterInput(input.character,id,old?.data);
    }else if(action==='saveCentralItem'){
     keys(input.item,['name','description','category','unit','kind','consumable','unitVolume','legality','pillable','gmNotes','laserRecharge']);
     if(input.item.laserRecharge!=null)keys(input.item.laserRecharge,['pelletsPerUnit']);
     data=itemInput({...input.item,publicationState:'DRAFT'},id,old?.data);
    }else if(action==='saveCentralRecipe'){
     keys(input.recipe,['name','description','kind','minLevel','skillId','productItemId','effectId','laboratoryTargetId','unlockKnowledgeId','components','indicativePrice','gmNotes']);
     requireThat(Array.isArray(input.recipe.components),'INVALID_RECIPE');
     for(const component of input.recipe.components)keys(component,['itemId','quantity']);
     data=recipeInput({...input.recipe,publicationState:'DRAFT',masterArchived:false},id,old?.data);
    }else{requireThat(old?.operation==='UPSERT',type==='classKit'?'CENTRAL_KIT_UNAVAILABLE':type==='character'?'CENTRAL_CHARACTER_UNAVAILABLE':type==='recipe'?'CENTRAL_RECIPE_UNAVAILABLE':'CENTRAL_ITEM_UNAVAILABLE');data={...old.data,...(['recipe','character','classKit'].includes(type)?{masterArchived:true}:{}),[revisionField]:old.data[revisionField]+1};}
    const nextRevision=revision+1,change={id:`${type}_${id}`,type,entityId:id,workshop,operation:saving?'UPSERT':'ARCHIVE',data,revision:nextRevision,source:'WEB',actorUid:actor.uid,requestId,at};
    const d={...(draft??{id:'initial',baseVersionId:null,basePointerRevision:0,ruleProfile:spaceOutlawsProfile,status:'DRAFT',createdAt:at}),revision:nextRevision,updatedAt:at};
    if(!c.master)tx.set(root(cid),{...c,revision:c.revision+1,master:{schemaVersion:1,activeVersionId:null,pointerRevision:0,openDraftId:'initial'}});
    tx.set(draftPath(cid),d);tx.set(path,change);
    tx.set(`${draftPath(cid)}/history/${nextRevision}`,{id:String(nextRevision),revision:nextRevision,workshop,action,actorUid:actor.uid,at,reason,before:old,change});
    result={[`${type}Id`]:id,[`${type}Revision`]:data[revisionField],draftRevision:nextRevision};
   }
   tx.set(op,{fingerprint,result,at});return result;
  });
 };
}
