import {inventoryHash as hash} from './inventory-state.mjs';
import {documentId,requireThat} from './validation.mjs';
import {groupInput,groupPermissions,validateGroupMembers} from './groups.mjs';
import {rosterKeys,rosterInput,validateRosters} from './group-roster.mjs';

const digest=v=>hash(JSON.stringify(v));
const text=(v,max=1000)=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=max,'INVALID_GROUP_ROSTER');return v.trim();};
const reads=['groupManagement','prepareGroupMembership'];
export const groupManagementCommands=[...reads,'saveGroupRoster','setGroupArchived','applyGroupMembership'];
export const groupManagementAction=a=>groupManagementCommands.includes(a);
const revoked=m=>({...m,active:false,revealed:false,visibleToMembers:false,publicAffiliation:false,permissions:Object.fromEntries(groupPermissions.map(p=>[p,false]))});
const sameNullable=(value)=>value===null?null:documentId(value);

export function createGroupManagementService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);const sid=documentId(input.sessionId),read=reads.includes(action),eventId=uuid();
  const op=read?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=read?null:digest([action,input]);
  return store.runTransaction(async tx=>{
   const s=await checkSession(tx,actor,sid),base=`sessions/${sid}`,at=now();
   if(action!=='groupManagement')requireThat(!['ARCHIVED','FINISHED'].includes(s.stage)&&!s.campaignSealed,'SESSION_CLOSED');
   if(!read){const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');return old.result;}}
   const groups=await tx.list(`${base}/groups`),characters=await tx.list(`${base}/characters`);
   if(action==='groupManagement')return {sessionId:sid,revision:s.revision,closed:['ARCHIVED','FINISHED'].includes(s.stage)||!!s.campaignSealed,groupsEnabled:s.modules?.groups===true,groups,
    characters:characters.map(c=>({id:c.id,name:c.public.displayName,assigned:!!c.assignedUid,outOfCombat:c.outOfCombat===true||c.hp===0,publicationState:c.publicationState})),
    events:(await tx.list(`${base}/audit`,null,{orderBy:'at',direction:'desc',limit:100})).filter(e=>groupManagementCommands.includes(e.action))};
   const changed=new Map();let details={},result;
   const find=id=>{const g=groups.find(x=>x.id===id);requireThat(g,'NOT_FOUND');return g;};
   const save=g=>{requireThat(Buffer.byteLength(JSON.stringify(g))<750000,'GROUP_TOO_LARGE');changed.set(g.id,g);};
   if(action==='saveGroupRoster'){
    rosterKeys(input,['sessionId','requestId','groupId','groupRevision','name','description','briefing','gmNotes','visibility','publicationState','kind','capacity','leaderId','reason']);
    const gid=documentId(input.groupId),old=groups.find(x=>x.id===gid),reason=text(input.reason);
    requireThat(input.groupRevision===(old?.revision??0),'STALE_REVISION');
    requireThat(!old?.roster?.archived,'GROUP_ARCHIVED');
    const roster=rosterInput({kind:input.kind,capacity:input.capacity,leaderId:input.leaderId,archived:false});
    const next={...old,...groupInput({...input,members:old?.members??[]},gid,old??{}),roster};
    await validateGroupMembers(tx,base,next);save(next);details={groupId:gid,reason};result={id:gid,revision:next.revision};
   }else if(action==='setGroupArchived'){
    rosterKeys(input,['sessionId','requestId','groupId','groupRevision','archived','reason']);
    const gid=documentId(input.groupId),old=find(gid);requireThat(old.roster,'GROUP_ROSTER_REQUIRED');
    requireThat(old.revision===input.groupRevision,'STALE_REVISION');requireThat(typeof input.archived==='boolean','INVALID_GROUP_ROSTER');
    const reason=text(input.reason),next={...old,revision:old.revision+1,roster:{...old.roster,archived:input.archived,leaderId:input.archived?null:old.roster.leaderId},members:input.archived?old.members.map(revoked):old.members};
    save(next);details={groupId:gid,reason,archived:input.archived,revokedCharacterIds:input.archived?old.members.filter(m=>m.active).map(m=>m.characterId):[]};result={id:gid,revision:next.revision,archived:input.archived};
   }else{
    rosterKeys(input,['sessionId',...(read?[]:['requestId','confirmation']),'characterId','sourceGroupId','targetGroupId','membership','authorizePermissions','reason','reversesEventId']);
    const cid=documentId(input.characterId),c=characters.find(x=>x.id===cid);requireThat(c,'INVALID_MEMBER');
    const from=sameNullable(input.sourceGroupId),to=sameNullable(input.targetGroupId);requireThat(from||to,'INVALID_GROUP_ROSTER');
    const source=from?find(from):null,target=to?find(to):null;
    for(const g of [source,target].filter(Boolean))requireThat(g.roster&&!g.roster.archived,'GROUP_ROSTER_REQUIRED');
    const oldMember=source?.members.find(m=>m.characterId===cid&&m.active);
    if(source)requireThat(oldMember,'GROUP_MEMBER_CHANGED');
    if(target&&from!==to)requireThat(!target.members.some(m=>m.characterId===cid&&m.active),'GROUP_MEMBER_CHANGED');
    const reason=text(input.reason),reversesEventId=input.reversesEventId==null?null:documentId(input.reversesEventId);
    if(reversesEventId){const event=await tx.get(`${base}/audit/${reversesEventId}`);requireThat(event?.action==='applyGroupMembership'&&event.characterId===cid&&event.fromGroupId===to&&event.toGroupId===from,'INVALID_GROUP_REVERSAL');}
    let member=null;
    if(target){
     rosterKeys(input.membership,['role','revealed','visibleToMembers','publicAffiliation','permissions']);
     rosterKeys(input.membership.permissions,groupPermissions);
     requireThat(groupPermissions.every(p=>typeof input.membership.permissions[p]==='boolean')&&['revealed','visibleToMembers','publicAffiliation'].every(p=>typeof input.membership[p]==='boolean'),'INVALID_GROUP_ROSTER');
     requireThat(typeof input.authorizePermissions==='boolean','INVALID_GROUP_ROSTER');
     requireThat(!Object.values(input.membership.permissions).some(Boolean)||input.authorizePermissions,'GROUP_GRANT_CONFIRMATION_REQUIRED');
     member=groupInput({...target,members:[{...input.membership,characterId:cid,active:true}]},target.id).members[0];
    }else requireThat(input.membership===null&&input.authorizePermissions===false,'INVALID_GROUP_ROSTER');
    if(source)save({...source,revision:source.revision+1,members:source.members.map(m=>m.characterId===cid?revoked(m):m),roster:{...source.roster,leaderId:source.roster.leaderId===cid&&from!==to?null:source.roster.leaderId}});
    if(target){const next=changed.get(to)??target;save({...next,revision:target.revision+1,members:[...next.members.filter(m=>m.characterId!==cid),member]});}
    validateRosters(groups.map(g=>changed.get(g.id)??g));
    const confirmation=digest([sid,s.revision,c,groups.map(g=>[g.id,g.revision]).sort(([a],[b])=>a.localeCompare(b)),from,to,member,reason,reversesEventId]);
    const preview={character:{id:cid,name:c.public.displayName},source:source?{id:from,name:source.name,member:oldMember}:null,target:target?{id:to,name:target.name,member,capacity:target.roster.capacity,activeCount:target.members.filter(m=>m.active).length}:null,clearsLeader:source?.roster.leaderId===cid&&from!==to,reason,reversesEventId,confirmation};
    if(read)return preview;
    requireThat(input.confirmation===confirmation,'STALE_REVISION');
    details={characterId:cid,fromGroupId:from,toGroupId:to,reason,reversesEventId,revokedPermissions:oldMember?.permissions??null,grantedPermissions:member?.permissions??null};
    result={id:eventId,characterId:cid,fromGroupId:from,toGroupId:to};
   }
   validateRosters([...groups.filter(g=>!changed.has(g.id)),...changed.values()]);
   for(const [gid,next] of changed){const before=groups.find(g=>g.id===gid)??null;
    tx.set(`${base}/groups/${gid}`,next);tx.set(`${base}/groups/${gid}/history/${eventId}`,{id:eventId,at,actorUid:actor.uid,actorEmail:actor.email,action,reason:details.reason,before,after:next,...details});
   }
   tx.set(base,{...s,revision:s.revision+1});tx.set(`${base}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,...details});tx.set(op,{fingerprint,result,at});return result;
  });
 };
}
