import {admissionKind,admissionText} from './admission-state.mjs';
// Private coordination text stays in the current admission record. Never parse it
// into people, group IDs or grants, and never copy it into game content/history.
export function soFriendRequests(s,registrations,characters){
 const mutable=!s.campaignSealed&&!s.safetyStop?.active&&['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),rows=[];
 for(const r of registrations){
  if(r.admission?.kind!==admissionKind||r.admission.status!=='APPROVED'||!['RECEIVED','ACCEPTED'].includes(r.status))continue;
  const p=r.admission.proposal,wish=admissionText(p?.friends??'',1000);if(!wish)continue;
  const c=characters.find(c=>c.id===r.characterId),current=r.status==='ACCEPTED'&&!!c?.birth&&c.assignedUid===r.uid&&c.publicationState==='PUBLISHED',dead=current&&c.survival?.dead===true;
  const name=current?c.public.displayName:[admissionText(p?.firstName??'',80),admissionText(p?.lastName??'',80)].filter(Boolean).join(' ');
  rows.push({name,wish,characterId:current?c.id:null,state:current?(dead?'DEAD':'CURRENT'):r.characterId?'UNAVAILABLE':'UNBORN',outOfCombat:current&&(c.outOfCombat===true||c.hp===0),canManage:mutable&&current&&!dead});
 }
 return rows.sort((a,b)=>a.name.localeCompare(b.name,'fr')||a.wish.localeCompare(b.wish,'fr'));
}
