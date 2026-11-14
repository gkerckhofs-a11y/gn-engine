import {documentId,requireThat} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {gameTime} from './clock.mjs';
import {crewRoles,crewPermissionKeys,captainAuthorityKeys,shipCrewAccess,shipCrewBase,crewOwnerBinding,roleQualified,alive,aboard,publicCrewPerson} from './ship-crew-state.mjs';

const offer=['shipId','targetId','authority','reason'];
const recruit=['shipId','targetId','role','permissions','minutes','reason'];
const change=['shipId','targetId','change','role','permissions','reason'];
const fields={shipCrew:['shipId'],shipCrewAdmin:['shipId'],myShipInvitations:[],shipInvitation:['invitationId'],prepareShipCaptainOffer:offer,prepareShipCaptainOfferAdmin:offer,offerShipCaptain:[...offer,'confirmation'],offerShipCaptainAdmin:[...offer,'confirmation'],prepareShipRecruitment:recruit,prepareShipRecruitmentAdmin:recruit,inviteShipMember:[...recruit,'confirmation'],inviteShipMemberAdmin:[...recruit,'confirmation'],respondShipInvitation:['invitationId','accept','confirmation'],prepareShipCrewChange:change,prepareShipCrewChangeAdmin:change,removeShipMember:[...change,'confirmation'],removeShipMemberAdmin:[...change,'confirmation'],changeShipMember:[...change,'confirmation'],changeShipMemberAdmin:[...change,'confirmation'],revokeShipCaptain:[...change,'confirmation'],revokeShipCaptainAdmin:[...change,'confirmation'],leaveShipCrew:[...change,'confirmation'],requestShipWork:['shipId','kind','reason']};
export const shipCrewActions=Object.keys(fields);
const read=a=>a.startsWith('prepare')||['shipCrew','shipCrewAdmin','myShipInvitations','shipInvitation'].includes(a);
const permissions=(v,keys)=>{requireThat(v&&typeof v==='object'&&!Array.isArray(v),'INVALID_SHIP_CREW');admissionKeys(v,keys);requireThat(Object.values(v).every(x=>typeof x==='boolean'),'INVALID_SHIP_CREW');return Object.fromEntries(keys.map(k=>[k,v[k]===true]));};
const proof=v=>hash(JSON.stringify(v));
const invitationId=(shipId,targetId)=>hash(`${shipId}:${targetId}`);
const base=s=>`sessions/${s.id}`;
const invitationPath=(s,id)=>`${base(s)}/shipCrewInvitations/${id}`;
const mutable=s=>{requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_CLOSED');};
const neutralPermissions=()=>Object.fromEntries(crewPermissionKeys.map(k=>[k,false]));

export function createShipCrewService({store,signed,checkSession,now,uuid}){
 async function currentInvitation(tx,s,p){
  const ship=await tx.get(`${base(s)}/ships/${p.shipId}`);if(!ship||p.ownerBinding!==crewOwnerBinding(ship))return false;
  const target=await inventoryParty(tx,s.id,p.targetId);if(!target.active||!alive(target.c)||target.version!==p.targetVersion)return false;
  const root=await tx.get(shipCrewBase(s,ship));
  if(p.role==='CAPTAIN'&&(root?.authorityRevision??0)!==p.authorityRevision)return false;
  if(p.issuerKind==='MJ'){
   try{await checkSession(tx,{...p.issuer,emailVerified:true,provider:'google.com'},s.id);return true;}catch{return false;}
  }
  const issuer=await inventoryParty(tx,s.id,p.issuerId);if(!issuer.active||issuer.version!==p.issuerVersion||!alive(issuer.c))return false;
  const access=await shipCrewAccess(tx,s,ship,issuer.c,now());
  return access.own||access.captain&&access.authority.recruit&&root.authorityRevision===p.authorityRevision;
 }
 async function invitationView(tx,s,p){
  const valid=await currentInvitation(tx,s,p),target=await inventoryParty(tx,s.id,p.targetId);
  const value={id:p.id,shipId:p.shipId,shipName:p.shipName,target:target.c?publicCrewPerson(target.c):{id:p.targetId,name:'Personnage indisponible'},role:p.role,permissions:p.permissions,authority:p.role==='CAPTAIN'?p.authority:undefined,minutes:p.minutes??null,status:p.status==='PENDING'&&!valid?'STALE':p.status,revision:p.revision};
  return {...value,canRespond:p.status==='PENDING'&&valid&&!s.safetyStop?.active&&['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),confirmation:proof(value)};
 }
 async function recruitment(tx,ctx,input,captain,actor){
  const {s,c,admin}=ctx,ship=await tx.get(`${base(s)}/ships/${documentId(input.shipId)}`);requireThat(ship?.soProfile,'NOT_FOUND');
  const access=admin?null:await shipCrewAccess(tx,s,ship,c,now());requireThat(admin||(captain?access.own:access.authority.recruit),'FORBIDDEN');mutable(s);
  const target=await inventoryParty(tx,s.id,documentId(input.targetId));requireThat(target.active&&alive(target.c),'INVALID_RECIPIENT');
  const role=captain?'CAPTAIN':input.role;requireThat(captain||crewRoles.includes(role),'INVALID_SHIP_CREW');requireThat(roleQualified(target.c,role),'FIELD_SKILL_REQUIRED');
  const root=await tx.get(shipCrewBase(s,ship)),member=await shipCrewAccess(tx,s,ship,target.c,now()),prior=await tx.get(invitationPath(s,invitationId(ship.id,target.c.id)));
  requireThat(captain?root?.captainId!==target.c.id:!member.active&&!member.departing,'SHIP_ALREADY_CREW');requireThat(prior?.status!=='PENDING'||!await currentInvitation(tx,s,prior),'SHIP_INVITATION_PENDING');
  const authority=captain?permissions(input.authority,captainAuthorityKeys):null;
  const p=captain?{journal:true,fuelContribution:true,logistics:authority.logistics,ownerFreight:authority.logistics,maintenance:authority.workRequests}:permissions(input.permissions,crewPermissionKeys);
  if(!captain){requireThat(!p.ownerFreight||p.logistics,'INVALID_SHIP_CREW');requireThat(admin||!p.logistics||access.authority.logistics,'FORBIDDEN');if(role==='PASSENGER')requireThat(!p.logistics&&!p.ownerFreight&&!p.maintenance&&!p.fuelContribution,'INVALID_SHIP_CREW');}
  const minutes=role==='PASSENGER'?Number(input.minutes):null;requireThat(minutes===null||Number.isSafeInteger(minutes)&&minutes>=1&&minutes<=1440,'INVALID_SHIP_CREW');
  const reason=admissionText(input.reason,500,true),value={shipId:ship.id,shipName:ship.name,target:publicCrewPerson(target.c),role,permissions:p,...(authority?{authority}:{}),minutes,reason};
  return {ship,root,prior,target,value,confirmation:proof([s.id,s.revision,ship.revision,root?.revision??0,ctx.version??actor.uid,target.version,value])};
 }
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(read(action)?[]:['requestId'])]);const at=now(),eventId=uuid();
  return store.runTransaction(async tx=>{
   const admin=action.endsWith('Admin'),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId)),admin:true,version:actor.uid}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx;
   requireThat(s.spaceOutlaws?.navigationVersion===1,'SO_GAMEPLAY_NOT_OPEN');requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
   if(action==='myShipInvitations'){
    const rows=await tx.list(`${base(s)}/shipCrewInvitations`,['targetId',c.id]),invitations=[];for(const p of rows.sort((a,b)=>b.at-a.at).slice(0,50))invitations.push(await invitationView(tx,s,p));return {session:{id:s.id},invitations};
   }
   if(action==='shipInvitation'){
    const p=await tx.get(invitationPath(s,documentId(input.invitationId)));requireThat(p?.targetId===c.id,'FORBIDDEN');return invitationView(tx,s,p);
   }
   let ship,access,p;
   if(action==='respondShipInvitation'){
    p=await tx.get(invitationPath(s,documentId(input.invitationId)));requireThat(p?.targetId===c.id&&p.targetVersion===version,'FORBIDDEN');ship=await tx.get(`${base(s)}/ships/${p.shipId}`);requireThat(ship?.soProfile,'NOT_FOUND');access=await shipCrewAccess(tx,s,ship,c,at);
    requireThat(p.status==='PENDING'?await currentInvitation(tx,s,p):p.status==='DECLINED'||access.active,'FORBIDDEN');
   }else{ship=await tx.get(`${base(s)}/ships/${documentId(input.shipId)}`);requireThat(ship?.soProfile,'NOT_FOUND');access=admin?null:await shipCrewAccess(tx,s,ship,c,at);}
   const root=await tx.get(shipCrewBase(s,ship)),newRoot=root?.ownerBinding===crewOwnerBinding(ship)?root:{id:ship.id,ownerBinding:crewOwnerBinding(ship),captainId:null,captainVersion:null,authority:Object.fromEntries(captainAuthorityKeys.map(k=>[k,false])),authorityRevision:0,revision:0};
   if(action==='shipCrew'||action==='shipCrewAdmin'){
    requireThat(admin||access.own||access.active||access.departing,'FORBIDDEN');const members=[];
    for(const m of await tx.list(`${shipCrewBase(s,ship)}/members`)){const party=await inventoryParty(tx,s.id,m.id);if(!party.active)continue;const live=await shipCrewAccess(tx,s,ship,party.c,at);if(live.active||live.departing)members.push({...publicCrewPerson(party.c),role:live.captain?'CAPTAIN':m.role,status:live.departing?'DISEMBARK_PENDING':'ACTIVE',permissions:m.permissions??{},canRemove:(admin||access.authority.roles)&&m.id!==c?.id&&!(ship.ownerType==='CHARACTER'&&ship.ownerId===m.id)&&m.role!=='CAPTAIN'});}
    const manager=admin||Object.values(access.authority).some(Boolean),invitations=[];
    if(manager)for(const inv of await tx.list(`${base(s)}/shipCrewInvitations`,['shipId',ship.id]))if(inv.status==='PENDING')invitations.push(await invitationView(tx,s,inv));
    const requests=manager?await tx.list(`${shipCrewBase(s,ship)}/requests`):[];
    return {session:{id:s.id},shipId:ship.id,admin,members,invitations,requests:requests.map(r=>({id:r.id,at:r.at,kind:r.kind,requester:r.requester,reason:r.reason})),authority:admin?Object.fromEntries(captainAuthorityKeys.map(k=>[k,true])):access.authority,canAppoint:admin||access.own,canLeave:!!access.active&&!access.own&&!access.captain,captainId:newRoot.captainId};
   }
   mutable(s);if(!admin)requireThat(alive(c),'FORBIDDEN');
   // Authorization is checked before returning an existing operation receipt.
   const changeAction=action.includes('CrewChange')||['removeShipMember','removeShipMemberAdmin','changeShipMember','changeShipMemberAdmin','revokeShipCaptain','revokeShipCaptainAdmin','leaveShipCrew'].includes(action);
   const revoke=action.startsWith('revokeShipCaptain')||input.change==='REVOKE_CAPTAIN',leave=action==='leaveShipCrew'||input.change==='LEAVE';
   if(changeAction&&leave)requireThat(!admin,'FORBIDDEN');
   if(changeAction)requireThat(admin||(revoke?access.own:leave?access.active:access.authority.roles),'FORBIDDEN');
   if(action==='requestShipWork')requireThat(!admin&&access.authority.workRequests,'FORBIDDEN');
   const captainOffer=action.includes('ShipCaptainOffer')||action.startsWith('offerShipCaptain');
   if(captainOffer)requireThat(admin||access.own,'FORBIDDEN');
   if(action.startsWith('prepareShipRecruitment')||action.startsWith('inviteShipMember'))requireThat(admin||access.authority.recruit,'FORBIDDEN');
   const op=read(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=proof([action,input]);
   if(op){const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(old.guard===version,'FORBIDDEN');return old.result;}}
   let result,kind,label;
   if(captainOffer||action.startsWith('prepareShipRecruitment')||action.startsWith('inviteShipMember')){
    const q=await recruitment(tx,ctx,input,captainOffer,actor);if(read(action))return {...q.value,confirmation:q.confirmation};requireThat(input.confirmation===q.confirmation,'STALE_REVISION');
    const id=invitationId(ship.id,q.target.c.id),inv={id,shipId:ship.id,shipName:ship.name,targetId:q.target.c.id,targetVersion:q.target.version,ownerBinding:crewOwnerBinding(ship),role:q.value.role,permissions:q.value.permissions,...(q.value.authority?{authority:q.value.authority}:{}),minutes:q.value.minutes,status:'PENDING',revision:(q.prior?.revision??0)+1,at,authorityRevision:newRoot.authorityRevision,issuerKind:admin?'MJ':access.own?'OWNER':'CAPTAIN',...(admin?{issuer:{uid:actor.uid,email:actor.email}}:{issuerId:c.id,issuerVersion:version})};
    if(!root||root.ownerBinding!==crewOwnerBinding(ship))tx.set(shipCrewBase(s,ship),{...newRoot,revision:1});tx.set(invitationPath(s,id),inv);result={id,status:'PENDING'};kind='CREW_INVITED';label=`Invitation : ${q.value.target.name} · ${q.value.role}`;
   }else if(action==='respondShipInvitation'){
    requireThat(typeof input.accept==='boolean','INVALID_SHIP_CREW');const v=await invitationView(tx,s,p);requireThat(p.status==='PENDING'&&v.confirmation===input.confirmation,'STALE_REVISION');requireThat(roleQualified(c,p.role),'FIELD_SKILL_REQUIRED');
    const status=input.accept?'ACCEPTED':'DECLINED';
    if(input.accept){
     const member={...(c.activeCargoId&&access.member?.lockedOperationId===c.activeCargoId?{lockedOperationId:access.member.lockedOperationId,lockedPermissions:access.member.lockedPermissions}:{}),id:c.id,memberVersion:version,role:p.role,permissions:p.permissions,status:'ACTIVE',revision:(access.member?.revision??0)+1,joinedAt:at,...(p.minutes?{expiresAtGameMs:gameTime(s.clock,at)+p.minutes*60000}:{})};
     if(p.role==='CAPTAIN'){
      const priorCaptain=newRoot.captainId?await tx.get(`${shipCrewBase(s,ship)}/members/${newRoot.captainId}`):null;
      const priorParty=priorCaptain?await inventoryParty(tx,s.id,priorCaptain.id):null;
      if(priorCaptain&&priorCaptain.id!==c.id)tx.set(`${shipCrewBase(s,ship)}/members/${priorCaptain.id}`,{...priorCaptain,...(priorParty?.c.activeCargoId&&priorCaptain.memberVersion===priorParty.version?{lockedOperationId:priorParty.c.activeCargoId,lockedPermissions:priorCaptain.lockedOperationId===priorParty.c.activeCargoId?priorCaptain.lockedPermissions:priorCaptain.permissions}:{}),role:'MEMBER',permissions:neutralPermissions(),revision:priorCaptain.revision+1});
      tx.set(shipCrewBase(s,ship),{...newRoot,captainId:c.id,captainVersion:version,authority:p.authority,authorityRevision:newRoot.authorityRevision+1,revision:newRoot.revision+1});
     }
     tx.set(`${shipCrewBase(s,ship)}/members/${c.id}`,member);
    }
    tx.set(invitationPath(s,p.id),{...p,status,revision:p.revision+1,respondedAt:at});result={id:p.id,shipId:ship.id,status};kind=`CREW_${status}`;label=`${c.public.displayName} · ${input.accept?'invitation acceptée':'invitation refusée'}`;
   }else if(changeAction){
    const requested=input.change;requireThat(['REMOVE','ROLE','REVOKE_CAPTAIN','LEAVE'].includes(requested),'INVALID_SHIP_CREW');
    requireThat(read(action)||({REMOVE:['removeShipMember','removeShipMemberAdmin'],ROLE:['changeShipMember','changeShipMemberAdmin'],REVOKE_CAPTAIN:['revokeShipCaptain','revokeShipCaptainAdmin'],LEAVE:['leaveShipCrew']}[requested]).includes(action),'INVALID_SHIP_CREW');
    const targetId=revoke?newRoot.captainId:leave?c.id:documentId(input.targetId);requireThat(targetId,'INVALID_RECIPIENT');const target=await inventoryParty(tx,s.id,targetId),member=await tx.get(`${shipCrewBase(s,ship)}/members/${targetId}`);requireThat(member&&target.c,'INVALID_RECIPIENT');
    requireThat(revoke||!(ship.ownerType==='CHARACTER'&&ship.ownerId===targetId),'SHIP_OWNER_PROTECTED');requireThat(revoke||targetId!==newRoot.captainId,'SHIP_CAPTAIN_PROTECTED');requireThat(revoke||leave||targetId!==c?.id,'SHIP_CAPTAIN_PROTECTED');
    const reason=admissionText(input.reason,500,true),departing=aboard(ship,targetId),role=requested==='ROLE'?input.role:member.role,newPermissions=requested==='ROLE'?permissions(input.permissions,crewPermissionKeys):neutralPermissions();
    if(requested==='ROLE'){requireThat(target.active&&alive(target.c),'INVALID_RECIPIENT');requireThat(crewRoles.includes(role)&&roleQualified(target.c,role),'FIELD_SKILL_REQUIRED');requireThat(role!=='PASSENGER','SHIP_PASSENGER_INVITATION_REQUIRED');requireThat(!newPermissions.ownerFreight||newPermissions.logistics,'INVALID_SHIP_CREW');requireThat(admin||!newPermissions.logistics||access.authority.logistics,'FORBIDDEN');}
    const confirmation=proof([s.id,ship.revision,newRoot,member,version,requested,role,newPermissions,reason]),preview={shipId:ship.id,target:publicCrewPerson(target.c),change:requested,role,permissions:newPermissions,departing,activePilot:shipPilotId(ship)===targetId,responsibilities:member.role,contractsPreserved:true,propertyPreserved:true,operations:[...(target.c.activeCargoId?['Manutention réservée']:[]),...(target.c.activeMaintenanceId?['Travaux engagés']:[]),...(departing?['Présence au manifeste actuel']:[])],reason,confirmation};
    if(read(action))return preview;requireThat(input.confirmation===confirmation,'STALE_REVISION');
    const status=requested==='ROLE'?'ACTIVE':departing?'DISEMBARK_PENDING':target.c.activeCargoId||target.c.activeMaintenanceId?'OPERATIONS_PENDING':'RETIRED';
    if(revoke){tx.set(shipCrewBase(s,ship),{...newRoot,captainId:null,captainVersion:null,authority:Object.fromEntries(captainAuthorityKeys.map(k=>[k,false])),authorityRevision:newRoot.authorityRevision+1,revision:newRoot.revision+1});}
    tx.set(`${shipCrewBase(s,ship)}/members/${targetId}`,{...member,...(target.c.activeCargoId?{lockedOperationId:target.c.activeCargoId,lockedPermissions:member.lockedOperationId===target.c.activeCargoId?member.lockedPermissions:member.permissions}:{}),role:revoke?'MEMBER':role,permissions:newPermissions,status,revision:member.revision+1,changedAt:at});result={id:targetId,status,shipId:ship.id};kind=`CREW_${requested}`;label=`${target.c.public.displayName} · ${requested==='ROLE'?'mandat modifié':departing?'retrait prévu à l’escale':'mandat retiré'}`;
   }else{
    requireThat(action==='requestShipWork'&&['REVISION','HULL','SHIELD','MODULE'].includes(input.kind),'INVALID_SHIP_CREW');const reason=admissionText(input.reason,500,true);tx.set(`${shipCrewBase(s,ship)}/requests/${eventId}`,{id:eventId,at,kind:input.kind,reason,requester:publicCrewPerson(c)});result={id:eventId,status:'REQUESTED'};kind='WORK_REQUESTED';label=`Demande de travaux : ${input.kind}`;
   }
   authorizeSpaceOutlaws(tx,s,'SHIP_CREW');tx.set(`${shipCrewBase(s,ship)}/history/${eventId}`,{id:eventId,at,kind,label,actorUid:actor.uid});tx.set(`${base(s)}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,shipId:ship.id});tx.set(op,{fingerprint,guard:version,result,at});return result;
  });
 };
}
const shipPilotId=s=>s.ownerType==='GROUP'?s.groupPilotId:s.pilotId;
