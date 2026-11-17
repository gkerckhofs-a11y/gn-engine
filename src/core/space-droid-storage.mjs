import {requireThat,documentId} from './validation.mjs';
import {personalLot,lotState,inventoryHash as hash} from './inventory-state.mjs';
import {activeCharacter} from './aid-state.mjs';
import {installedDroidModule} from './space-droid-work.mjs';
import {gameTime} from './clock.mjs';
import {requireGameAction} from './health-state.mjs';
const path=(s,id)=>`sessions/${s.id}/inventory/${id}`;
export async function droidStorageModule(tx,s,c,id,{write=false}={}){
 requireThat(s.spaceOutlaws?.droidModulesVersion===1&&c.nature==='DROID','SO_DROID_STORAGE');
 const lot=await tx.get(path(s,documentId(id))),module=c.droidModules?.find(m=>m.lotId===id);
 requireThat(installedDroidModule(c,lot)&&['DR-05','DR-06'].includes(module.code),'SO_DROID_STORAGE');
 if(write)requireThat(!lot.memoryActionId&&!c.activeFieldActionId&&!c.activePersonActionId,'FIELD_TARGET_BUSY');
 return {lot,module};
}
export async function droidStorageView(tx,s,c,at){
 if(s.spaceOutlaws?.droidModulesVersion!==1||c.nature!=='DROID')return null;
 const modules=[];
 for(const m of c.droidModules??[]){if(!['DR-05','DR-06'].includes(m.code))continue;
  const l=await tx.get(path(s,m.lotId));if(!installedDroidModule(c,l))continue;
  const content=m.contentLotId?await tx.get(path(s,m.contentLotId)):null;
  modules.push({disabled:m.status!=='OPERATIONAL'||(m.neutralizedUntilGameMs??0)>gameTime(s.clock,at),id:l.id,code:m.code,name:l.item.name,revision:l.revision,busy:!!l.memoryActionId,content:content?.location?.kind==='DROID_CONTENT'&&content.location.id===l.id?{id:content.id,name:content.item.name,knowledgeId:content.item.knowledgeId??null}:null});
 }
 const lots=(await tx.list(`sessions/${s.id}/inventory`,['holderId',c.id])).filter(l=>personalLot(l,c.id)&&l.status==='AVAILABLE'&&l.quantity>0&&!l.item.shipModule&&!l.item.droidModule&&!l.boardingCustody);
 return {modules,lots:lots.filter(l=>l.item.knowledgeId||l.item.concealable).map(l=>({id:l.id,name:l.item.name,document:!!l.item.knowledgeId,concealable:l.item.concealable===true}))};
}
export async function moveDroidContent(tx,s,c,input,at,id){
 requireThat(s.stage==='EN_JEU'&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');requireGameAction(s,c,'discover',at);
 requireThat(c.hp>0&&!c.outOfCombat&&!c.survival?.dead,'OUT_OF_COMBAT');
 const {lot:moduleLot,module}=await droidStorageModule(tx,s,c,input.moduleLotId,{write:true});requireThat(moduleLot.revision===input.revision,'STALE_REVISION');
 requireThat(['STORE','TAKE'].includes(input.operation),'SO_DROID_STORAGE');const storing=input.operation==='STORE';
 const l=await tx.get(path(s,storing?documentId(input.lotId):documentId(module.contentLotId)));
 if(storing){
  requireThat(module.status==='OPERATIONAL'&&(module.neutralizedUntilGameMs??0)<=gameTime(s.clock,at)&&!module.contentLotId,'SO_DROID_STORAGE');
  requireThat(l&&personalLot(l,c.id)&&l.status==='AVAILABLE'&&l.quantity>0&&!l.item.shipModule&&!l.item.droidModule&&!l.boardingCustody,'SO_DROID_STORAGE');
  if(module.code==='DR-05'){
   const k=l.item.knowledgeId?await tx.get(`sessions/${s.id}/knowledge/${l.item.knowledgeId}`):null;
   requireThat(l.quantity===1&&l.item.kind==='INDIVIDUAL'&&k?.kind==='DOCUMENT'&&k.publicationState==='PUBLISHED','SO_DROID_STORAGE');
  }else requireThat(l.item.concealable===true,'SO_DROID_STORAGE');
 }else requireThat(l&&l.quantity===1&&l.ownerId===c.id&&l.holderId===c.id&&l.location?.kind==='DROID_CONTENT'&&l.location.id===moduleLot.id&&l.status==='AVAILABLE','SO_DROID_STORAGE');
 const split=storing&&l.quantity>1,lotId=split?id:l.id,next={...l,id:lotId,quantity:1,revision:split?1:l.revision+1,location:{kind:storing?'DROID_CONTENT':'CHARACTER',id:storing?moduleLot.id:c.id},...(split?{origin:{kind:'DROID_STORAGE_SPLIT',parentLotId:l.id}}:{})};
 if(split)tx.set(path(s,l.id),{...l,quantity:l.quantity-1,revision:l.revision+1});tx.set(path(s,lotId),next);
 tx.set(`${path(s,l.id)}/history/${id}`,{id,at,kind:storing?'DROID_STORE':'DROID_TAKE',before:lotState(l),after:lotState(split?{...l,quantity:l.quantity-1,revision:l.revision+1}:next),moduleLotId:moduleLot.id,destinationLotId:lotId});
 if(split)tx.set(`${path(s,lotId)}/history/${id}`,{id,at,kind:'DROID_STORAGE_SPLIT',parentLotId:l.id,before:null,after:lotState(next)});
 const modules=c.droidModules.map(m=>m.lotId===moduleLot.id?{...m,contentLotId:storing?lotId:null}:m);
 tx.set(path(s,moduleLot.id),{...moduleLot,revision:moduleLot.revision+1});tx.set(`sessions/${s.id}/characters/${c.id}`,{...c,droidModules:modules});
 return {lotId,moduleLotId:moduleLot.id,operation:input.operation};
}
export async function revealDroidCompartments(tx,s,t,at,id){
 if(s.spaceOutlaws?.droidModulesVersion!==1)return {target:t,revealedLots:[]};let modules=t.droidModules??[],changed=false;const revealedLots=[];
 for(const m of modules.filter(m=>m.code==='DR-06'&&m.contentLotId)){
  const module=await tx.get(path(s,m.lotId)),l=await tx.get(path(s,m.contentLotId));
  if(!installedDroidModule(t,module)||!l||l.ownerId!==t.id||l.holderId!==t.id||l.status!=='AVAILABLE'||l.quantity!==1||l.location?.kind!=='DROID_CONTENT'||l.location.id!==m.lotId)continue;
  const next={...l,location:{kind:'CHARACTER',id:t.id},revision:l.revision+1};revealedLots.push(next);tx.set(path(s,l.id),next);tx.set(`${path(s,l.id)}/history/${id}`,{id,at,kind:'DROID_COMPARTMENT_REVEALED',before:lotState(l),after:lotState(next),moduleLotId:m.lotId});
  tx.set(path(s,module.id),{...module,revision:module.revision+1});modules=modules.map(x=>x.lotId===m.lotId?{...x,contentLotId:null}:x);changed=true;
 }
 const target=changed?{...t,droidModules:modules}:t;if(changed)tx.set(`sessions/${s.id}/characters/${t.id}`,target);return {target,revealedLots};
}
// INF-02 opens the memory, not any independent cipher inside the document.
export async function droidMemorySource(tx,s,c,moduleId,at,action=null){
 requireThat(s.spaceOutlaws?.droidModulesVersion===1,'SO_DROID_STORAGE');
 const moduleLot=await tx.get(path(s,documentId(moduleId))),owner=moduleLot?await tx.get(`sessions/${s.id}/characters/${moduleLot.ownerId}`):null;
 requireThat(owner&&installedDroidModule(owner,moduleLot)&&owner.nature==='DROID'&&!owner.survival?.dead,'SO_DROID_STORAGE');
 const {r:ownerAccess}=await activeCharacter(tx,s.id,owner.id);
 requireThat(!owner.activePersonActionId&&(!owner.activeFieldActionId||action&&owner.id===c.id&&owner.activeFieldActionId===action.id),'FIELD_TARGET_BUSY');
 requireThat(!owner.activeVoyageId&&!owner.activeNavigationId&&(!owner.spacePortId||owner.spacePortId===s.transportRules?.homePort),'FIELD_UNAVAILABLE');
 const module=owner.droidModules.find(m=>m.lotId===moduleLot.id);
 requireThat(module.code==='DR-05'&&module.status==='OPERATIONAL'&&(module.neutralizedUntilGameMs??0)<=gameTime(s.clock,at)&&module.contentLotId,'SO_DROID_STORAGE');
 requireThat(action?moduleLot.memoryActionId===action.id:!moduleLot.memoryActionId,'FIELD_TARGET_BUSY');
 const l=await tx.get(path(s,module.contentLotId));requireThat(l?.status==='AVAILABLE'&&l.quantity===1&&l.ownerId===owner.id&&l.holderId===owner.id&&l.location?.kind==='DROID_CONTENT'&&l.location.id===moduleLot.id,'SO_DROID_STORAGE');
 const k=await tx.get(`sessions/${s.id}/knowledge/${l.item.knowledgeId}`);requireThat(k?.kind==='DOCUMENT'&&k.publicationState==='PUBLISHED','SO_INF02_DOCUMENT');
 const version=hash(JSON.stringify([moduleLot.id,moduleLot.revision-(action?1:0),owner.id,owner.assignedUid,ownerAccess.accessVersion,module,l.id,l.revision,k.id,k.revision]));
 if(action)requireThat(version===action.memory.version,'SO_INF02_STALE');
 return {k:{...k,cipher:{plaintext:k.body,minLevel:2,threshold:6}},r:{snapshot:{id:k.id,title:k.title,body:k.body}},memory:{lotId:moduleLot.id,version,attemptKey:hash(`DR05:${moduleLot.id}:${l.id}:${l.revision}:${k.revision}`)},moduleLot};
}
export function reserveDroidMemory(tx,s,source,id){tx.set(path(s,source.moduleLot.id),{...source.moduleLot,memoryActionId:id,revision:source.moduleLot.revision+1});}
export async function releaseDroidMemory(tx,s,a){if(!a.memory)return;const l=await tx.get(path(s,a.memory.lotId));requireThat(l?.memoryActionId===a.id,'SO_INF02_STALE');tx.set(path(s,l.id),{...l,memoryActionId:null,revision:l.revision+1});}

// A disabled DR-06 keeps its content identity and location, but no longer grants
// concealment. Expiry restores that benefit only if the unit was not taken.
export async function exposedDroidContent(tx,s,c,l,at){
 if(s.spaceOutlaws?.nativeSabotageVersion!==1||!l||l.quantity!==1||(l.ownerType??'CHARACTER')!=='CHARACTER'||l.ownerId!==c.id||l.holderId!==c.id||l.location?.kind!=='DROID_CONTENT')return false;
 const module=c.droidModules?.find(m=>m.lotId===l.location.id&&m.code==='DR-06'&&m.contentLotId===l.id);if(!module||module.status==='OPERATIONAL'&&(module.neutralizedUntilGameMs??0)<=gameTime(s.clock,at))return false;
 return installedDroidModule(c,await tx.get(path(s,module.lotId)));
}
export async function detachDroidContent(tx,s,c,l,at,id){
 if(l.location?.kind!=='DROID_CONTENT')return c;
 const lot=await tx.get(path(s,l.location.id)),m=c.droidModules?.find(m=>m.lotId===lot?.id&&m.code==='DR-06'&&m.contentLotId===l.id);requireThat(m&&installedDroidModule(c,lot),'SO_DROID_STORAGE');
 const next={...c,droidModules:c.droidModules.map(x=>x.lotId===lot.id?{...x,contentLotId:null}:x)};
 tx.set(path(s,lot.id),{...lot,revision:lot.revision+1});tx.set(`sessions/${s.id}/characters/${c.id}`,next);tx.set(`${path(s,lot.id)}/history/${id}`,{id,at,kind:'DROID_EXPOSED_CONTENT_TAKEN',contentLotId:l.id});return next;
}
