import {isDeepStrictEqual} from 'node:util';
import {groupInput} from './groups.mjs';
import {DomainError,requireThat} from './validation.mjs';
import {soGroupPermissions,soGroupLimit} from '../shared/space-outlaws-groups.mjs';
const definitions=changes=>changes.filter(c=>c.type==='group'&&c.operation==='UPSERT');
export function soGroupDefinitionBlockers(changes){
 const groups=definitions(changes),characters=new Set(changes.filter(c=>c.type==='character'&&c.operation==='UPSERT').map(c=>c.entityId)),out=[];
 const add=(g,code,field,message)=>out.push({entityId:g?.entityId??'M2',code,field,message});
 if(groups.length>soGroupLimit)add(null,'SO_GROUP_DEFINITION_LIMIT','groups',`La session prend en charge ${soGroupLimit} groupes maximum. Exclure les définitions supplémentaires.`);
 for(const g of groups){
  const d=g.data;
  try{requireThat(Number.isSafeInteger(d?.revision)&&d.revision>=1&&d.masterArchived===false&&d.members?.length<=100,'SO_GROUP_DEFINITION_INVALID');const native={...groupInput({...d,publicationState:'DRAFT'},g.entityId,{revision:d.revision-1}),masterArchived:false};requireThat(isDeepStrictEqual(native,d),'SO_GROUP_DEFINITION_INVALID');}
  catch(e){if(!(e instanceof DomainError))throw e;add(g,'SO_GROUP_DEFINITION_INVALID','group','Reprendre cette définition de groupe dans M2.');continue;}
  for(const [i,m] of d.members.entries()){
   if(!characters.has(m.characterId))add(g,'REFERENCE_MISSING',`members.${i}.characterId`,'Préparer ou restaurer la fiche M2 référencée, même pour une appartenance inactive.');
   for(const [p,enabled] of Object.entries(m.permissions))if(enabled&&!soGroupPermissions.includes(p))add(g,'SO_GROUP_PERMISSION_NOT_OPEN',`members.${i}.permissions.${p}`,`Le droit ${p} n’est pas raccordé dans cette version Space Outlaws. Le retirer de cette proposition M2.`);
  }
 }
 return out;
}
export function seedSoGroupDefinitions(tx,sid,changes,versionId){
 for(const g of definitions(changes)){
  const {masterArchived,...data}=g.data;
  tx.set(`sessions/${sid}/groups/${g.entityId}`,{...data,publicationState:'PUBLISHED',members:[],revision:1,soDefinition:{versionId,groupId:g.entityId}});
 }
}
export function soPreparedMemberships(s,groups,characters,version){
 const defs=definitions(version.changes),names=new Map(version.changes.filter(c=>c.type==='character'&&c.operation==='UPSERT').map(c=>[c.entityId,c.data.public.displayName])),rows=[];
 for(const g of groups.filter(g=>g.soDefinition)){
  requireThat(g.soDefinition.versionId===s.versionId&&g.soDefinition.groupId===g.id,'SO_VERSION_INVALID');const def=defs.find(d=>d.entityId===g.id);requireThat(def,'SO_VERSION_INVALID');
  for(const m of def.data.members){
   const c=characters.find(c=>c.id===m.characterId),born=!!c?.birth,dead=c?.survival?.dead===true,alreadyMember=g.members.some(x=>x.characterId===m.characterId&&x.active);
   rows.push({groupId:g.id,groupName:g.name,characterId:m.characterId,name:c?.public.displayName??names.get(m.characterId),membership:{role:m.role,revealed:m.revealed,visibleToMembers:m.visibleToMembers,publicAffiliation:m.publicAffiliation,permissions:m.permissions},active:m.active,born,dead,alreadyMember,configured:!!g.roster,
    canPrepare:m.active&&born&&!dead&&!!g.roster&&!g.roster.archived&&!alreadyMember&&!s.campaignSealed&&!s.safetyStop?.active&&['BRIEFING','EN_JEU','PAUSE'].includes(s.stage)});
  }
 }
 return rows.sort((a,b)=>a.groupId.localeCompare(b.groupId)||a.characterId.localeCompare(b.characterId));
}
