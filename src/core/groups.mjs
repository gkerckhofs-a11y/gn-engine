import {documentId,requireThat} from './validation.mjs';
import {isDeepStrictEqual} from 'node:util';

export const groupPermissions=['readBriefing','readMembers','readUpdates','publishUpdates','readWallet','payWallet','representMissions','readStock','depositStock','withdrawStock','manageStorage','pilotShip'];
const text=(v,max,required=false)=>{
  requireThat(typeof v==='string' && v.length<=max && (!required||v.trim()),'INVALID_TEXT');return v.trim();
};
export function groupInput(input,id,old={}) {
  requireThat(['PUBLIC','SECRET'].includes(input.visibility),'INVALID_GROUP');
  requireThat(['DRAFT','READY','PUBLISHED'].includes(input.publicationState),'INVALID_STATUS');
  requireThat(Array.isArray(input.members),'INVALID_GROUP');
  const members=input.members.map(m=>{
    requireThat(m && typeof m==='object' && !Array.isArray(m),'INVALID_GROUP');
    const permissions=Object.fromEntries(groupPermissions.map(k=>[k,m.permissions?.[k]===true]));
    const member={characterId:documentId(m.characterId),role:text(m.role??'',150),active:m.active===true,
      revealed:m.revealed===true,visibleToMembers:m.visibleToMembers===true,
      publicAffiliation:m.publicAffiliation===true,permissions};
    requireThat(!member.publicAffiliation || (input.visibility==='PUBLIC' && member.revealed),'INVALID_PUBLIC_AFFILIATION');
    return member;
  });
  requireThat(new Set(members.map(m=>m.characterId)).size===members.length,'DUPLICATE_MEMBER');
  // Once explicitly managed, membership changes must use the atomic session command.
  const sorted=rows=>[...rows].sort((a,b)=>a.characterId.localeCompare(b.characterId));
  if(old.roster)requireThat(isDeepStrictEqual(sorted(members),sorted(old.members)),'GROUP_ROSTER_MANAGED');
  return {id,...(old.roster?{roster:old.roster}:{}),...(old.walletConfig?{walletConfig:old.walletConfig}:{}),name:text(input.name,150,true),description:text(input.description??'',4000),
    briefing:text(input.briefing??'',20000),gmNotes:text(input.gmNotes??'',20000),
    visibility:input.visibility,publicationState:input.publicationState,members,revision:(old.revision??0)+1};
}
export async function validateGroupMembers(tx,base,group) {
  for(const m of group.members) requireThat(await tx.get(`${base}/characters/${m.characterId}`),'INVALID_MEMBER');
}
export const memberFor=(g,cid)=>g?.roster?.archived?undefined:g?.members.find(m=>m.characterId===cid && m.active && m.revealed);
export const groupVisible=(g,cid)=>g?.publicationState==='PUBLISHED' && !!memberFor(g,cid);
export function groupSummary(g,cid) {
  const m=memberFor(g,cid);requireThat(groupVisible(g,cid),'FORBIDDEN');
  return {id:g.id,name:g.name,visibility:g.visibility,role:m.role,
    permissions:Object.fromEntries(groupPermissions.map(k=>[k,m.permissions[k]===true]))};
}
export function publicAffiliations(groups,cid) {
  return groups.filter(g=>g.visibility==='PUBLIC' && groupVisible(g,cid) && memberFor(g,cid).publicAffiliation)
    .map(g=>({name:g.name,description:g.description,role:memberFor(g,cid).role}));
}
export async function groupDetail(tx,base,g,cid) {
  const result={...groupSummary(g,cid),description:g.description};
  if(result.permissions.readBriefing) result.briefing=g.briefing;
  if(result.permissions.readMembers) {
    const members=g.members.filter(m=>m.active && m.revealed && m.visibleToMembers);
    const characters=await Promise.all(members.map(m=>tx.get(`${base}/characters/${m.characterId}`)));
    result.members=characters.flatMap((c,i)=>c?.publicationState==='PUBLISHED' && c.public.publicationState==='PUBLISHED'
      ? [{displayName:c.public.displayName,profession:c.public.profession??'',role:members[i].role}] : []);
  }
  if(result.permissions.readUpdates) {
    const updates=await tx.list(`${base}/groups/${g.id}/inboxes/${cid}/updates`,null,{orderBy:'at',direction:'desc',limit:30});
    // No UID, real participant identity, membership, truth label or MJ notes.
    result.updates=updates.map(u=>({id:u.id,title:u.title,body:u.body,authorName:u.authorName,at:u.at}));
  }
  return result;
}

