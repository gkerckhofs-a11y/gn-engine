// Read-only catalogue, scoped to the session and its immutable published version.
// Reserve eligibility mirrors the existing succession context: never instantiated
// and not allocated to any admission M2 definition, even an inactive dossier.
export function soRosterCharacters(s,characters,registrations,version){
 const actual=new Map(characters.map(c=>[c.id,c])),allocated=new Map();
 for(const r of registrations)if(r.admission?.m2Preparation?.characterId)allocated.set(r.admission.m2Preparation.characterId,r);
 const mutable=!s.campaignSealed&&!s.safetyStop?.active&&['BRIEFING','EN_JEU','PAUSE'].includes(s.stage);
 const rows=characters.map(c=>{
  const successor=actual.get(c.successorId),predecessor=actual.get(c.birth?.predecessorId),next=successor?.birth?.predecessorId===c.id?{id:successor.id,name:successor.public.displayName}:null,previous=predecessor?.successorId===c.id?{id:predecessor.id,name:predecessor.public.displayName}:null;
  const current=!!c.birth&&c.birth.versionId===s.versionId&&c.publicationState==='PUBLISHED'&&registrations.some(r=>r.status==='ACCEPTED'&&r.characterId===c.id&&r.uid===c.assignedUid),dead=c.survival?.dead===true;
  const rosterState=c.successorId?(next?'REPLACED':'UNAVAILABLE'):dead?'DEAD':current?'ACTIVE':'UNAVAILABLE';
  return {id:c.id,name:c.public.displayName,assigned:!!c.assignedUid,outOfCombat:c.outOfCombat===true||c.hp===0,publicationState:c.publicationState,dead,rosterState,definitionOnly:false,canManageMembership:mutable&&rosterState==='ACTIVE',predecessor:previous,successor:next};
 });
 for(const ch of version.changes.filter(ch=>ch.type==='character'&&ch.operation==='UPSERT'&&ch.data.creationPlan&&!actual.has(ch.entityId))){
  const r=allocated.get(ch.entityId),rosterState=!r?'RESERVE':r.admission?.status==='APPROVED'&&r.status==='RECEIVED'&&!r.characterId?'UNBORN':'UNAVAILABLE';
  rows.push({id:ch.entityId,name:ch.data.public.displayName,assigned:false,outOfCombat:false,publicationState:ch.data.publicationState,dead:false,rosterState,definitionOnly:true,canManageMembership:false,predecessor:null,successor:null});
 }
 return rows.sort((a,b)=>a.name.localeCompare(b.name,'fr')||a.id.localeCompare(b.id));
}
