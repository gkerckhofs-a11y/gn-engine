import {documentId,requireThat} from './validation.mjs';
import {routeInput} from './navigation-state.mjs';
import {spaceShipProfiles,spaceDistances,spaceRisks} from '../shared/space-outlaws-navigation.mjs';

const code='INVALID_CENTRAL_SPACE';
const keys=(v,fields)=>requireThat(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>fields.includes(k)),code);
const text=(v,max,required=false)=>{requireThat(typeof v==='string'&&v.length<=max&&(!required||v.trim()),code);return v.trim();};
export const centralSpaceTypes=['shipModel','port','route'];
export function centralSpaceInput(type,v,id,old={}){
 requireThat(centralSpaceTypes.includes(type),code);
 keys(v,['name','description','gmNotes',...(type==='shipModel'?['profileId']:type==='port'?['navigationCode','locationTargetId']:['fromPort','toPort','distanceId','riskId','navigationCode'])]);
 const common={id,name:text(v.name,150,true),description:text(v.description??'',4000),gmNotes:text(v.gmNotes??'',4000)},revision=(old.revision??0)+1;
 let detail;
 if(type==='shipModel'){
  const profile=spaceShipProfiles.find(p=>p.id===v.profileId);requireThat(profile,code);
  const {id:profileId,label,...stats}=profile;detail={profileId,...stats};
 }else if(type==='port')detail={navigationCode:text(v.navigationCode,80,true),locationTargetId:v.locationTargetId==null||v.locationTargetId===''?null:documentId(v.locationTargetId)};
 else{
  const distance=spaceDistances.find(d=>d.id===v.distanceId),risk=spaceRisks.find(r=>r.id===v.riskId);requireThat(distance&&risk,code);
  // Reuse the native route's IDs, distinct endpoints and textual validation.
  // Its legacy fixed fuelCost/enabled fields are not part of this definition.
  const {fromPort,toPort,durationSeconds}=routeInput({...common,fromPort:v.fromPort,toPort:v.toPort,durationSeconds:distance.durationSeconds,fuelCost:0,enabled:false},id);
  detail={fromPort,toPort,distanceId:distance.id,riskId:risk.id,durationSeconds,distanceFactor:distance.distanceFactor,eventFaces:risk.eventFaces,navigationCode:text(v.navigationCode,80,true)};
 }
 return {...common,...detail,schemaVersion:1,publicationState:'DRAFT',masterArchived:false,revision};
}
// Keep the editable boundary identical for validation of persisted definitions.
export function centralSpaceEditable(type,d){
 const fields=['name','description','gmNotes',...(type==='shipModel'?['profileId']:type==='port'?['navigationCode','locationTargetId']:['fromPort','toPort','distanceId','riskId','navigationCode'])];
 return Object.fromEntries(fields.map(k=>[k,d[k]]));
}
export function centralSpaceReferences(c){
 return c.type==='route'?[{field:'fromPort',type:'port',id:c.data.fromPort},{field:'toPort',type:'port',id:c.data.toPort}]:c.type==='port'&&c.data.locationTargetId?[{field:'locationTargetId',type:'fieldTarget',id:c.data.locationTargetId}]:[];
}
export function centralSpaceProjection(changes){
 const active=changes.filter(c=>centralSpaceTypes.includes(c.type)&&c.operation==='UPSERT'),diagnostics=[];
 const add=(c,field,reference,referenceType,code,message)=>diagnostics.push({workshop:'M3',entityType:c.type,entityId:c.entityId,field,reference,referenceType,code,message,source:c.source,draftRevision:c.revision});
 for(const c of active){
  for(const ref of centralSpaceReferences(c)){
   if(ref.type==='fieldTarget'){add(c,ref.field,ref.id,ref.type,'REFERENCE_NOT_CHECKED','Le raccordement aux lieux et QR communs reste à contrôler ; aucun lieu ni QR créé.');continue;}
   const target=changes.find(t=>t.type===ref.type&&t.entityId===ref.id);
   if(!target)add(c,ref.field,ref.id,ref.type,'REFERENCE_MISSING','Préparer ce port dans M3 ou corriger son identifiant.');
   else if(target.operation!=='UPSERT')add(c,ref.field,ref.id,ref.type,'REFERENCE_ARCHIVED','Restaurer ce port ou modifier la route.');
  }
  // Codes are private preparation data. Diagnostics do not repeat their value.
  if(c.type!=='shipModel'&&active.some(t=>t.type===c.type&&t.entityId!==c.entityId&&t.data.navigationCode===c.data.navigationCode))add(c,'navigationCode',null,c.type,'NAVIGATION_CODE_DUPLICATE','Ce code est partagé par plusieurs définitions actives du même type ; attribuer un code distinct.');
 }
 return {references:{ports:changes.filter(c=>c.type==='port').map(c=>({id:c.entityId,name:c.data.name,archived:c.operation!=='UPSERT',revision:c.data.revision,source:c.source}))},diagnostics,publicationAvailable:false};
}
