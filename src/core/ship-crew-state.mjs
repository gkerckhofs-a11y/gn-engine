import {inventoryParty} from './inventory-transfers.mjs';
import {navigationSkill} from './space-outlaws-navigation-state.mjs';
import {groupVisible,memberFor} from './groups.mjs';
import {gameTime} from './clock.mjs';
import {requireThat} from './validation.mjs';

export const crewRoles=['PILOT','MECHANIC','FREIGHT','MEMBER','PASSENGER'];
export const crewPermissionKeys=['journal','fuelContribution','logistics','ownerFreight','maintenance'];
export const captainAuthorityKeys=['recruit','roles','pilot','logistics','workRequests'];
export const shipCrewBase=(s,ship)=>`sessions/${s.id}/shipCrews/${ship.id}`;
export const shipPilot=sh=>sh.ownerType==='GROUP'?sh.groupPilotId:sh.pilotId;
export const aboard=(sh,cid)=>[...(sh.journey?.manifest??[]),...(sh.operation?.manifest??[])].some(m=>m.id===cid);
export const crewOwnerBinding=sh=>`${sh.ownerType}:${sh.ownerId}`;
export const roleQualified=(c,role)=>role==='PILOT'?navigationSkill(c,'PIL-02')>=1:role==='MECHANIC'?Math.max(navigationSkill(c,'MEC-02'),navigationSkill(c,'MEC-03'))>=1:true;
export const alive=c=>!!c&&!c.survival?.dead&&!c.successorId;
export const publicCrewPerson=c=>({id:c.id,name:c.public.displayName,code:c.publicCode??null});

export async function shipCrewAccess(tx,s,ship,c,at){
 const base=shipCrewBase(s,ship),root=await tx.get(base),member=await tx.get(`${base}/members/${c.id}`),party=await inventoryParty(tx,s.id,c.id);
 const bound=root?.ownerBinding===crewOwnerBinding(ship),own=ship.ownerType==='CHARACTER'&&ship.ownerId===c.id;
 const current=bound&&party.active&&alive(c)&&member?.memberVersion===party.version;
 const active=current&&member.status==='ACTIVE'&&(member.expiresAtGameMs==null||gameTime(s.clock,at)<member.expiresAtGameMs);
 const captain=bound&&alive(c)&&party.active&&root.captainId===c.id&&root.captainVersion===party.version&&active&&member.role==='CAPTAIN';
 const permissions=Object.fromEntries(crewPermissionKeys.map(k=>[k,!!(alive(c)&&(own||active&&member.permissions?.[k]))]));
 const authority=Object.fromEntries(captainAuthorityKeys.map(k=>[k,alive(c)&&!!(own||captain&&root.authority?.[k])]));
 return {root,member,party,bound,own,active,captain,permissions,authority,departing:current&&member.status==='DISEMBARK_PENDING'&&aboard(ship,c.id)};
}
export async function nativeShipReader(tx,s,ship,c,at){
 if(ship.ownerType==='CHARACTER'&&ship.ownerId===c.id)return {read:true,pilot:shipPilot(ship)===c.id,owner:true};
 if(shipPilot(ship)===c.id){
  let pilot=alive(c);
  if(ship.ownerType==='GROUP'){
   const g=await tx.get(`sessions/${s.id}/groups/${ship.ownerId}`);
   pilot=pilot&&s.spaceOutlaws?.groupPilotVersion===1&&g?.roster&&groupVisible(g,c.id)&&memberFor(g,c.id).permissions.pilotShip===true&&navigationSkill(c,'PIL-02')>=1;
  }
  const member=await tx.get(`${shipCrewBase(s,ship)}/members/${c.id}`);let continuation=false;
  if(member){const access=await shipCrewAccess(tx,s,ship,c,at),current=access.active&&['PILOT','CAPTAIN'].includes(member.role),committed=ship.operation?.pilotId===c.id||ship.journey?.pilotId===c.id;continuation=pilot&&!current&&committed;pilot=pilot&&(current||committed);}
  if(pilot)return {read:true,pilot:true,continuation};
 }
 if(aboard(ship,c.id))return {read:true,passenger:true};
 const jobs=await tx.list(`sessions/${s.id}/shipMaintenance`,['shipId',ship.id]);
 const technician=jobs.some(j=>j.technicianId===c.id&&['OFFERED','AWAITING_TECH','ACTIVE','MODULE_OFFERED','MODULE_APPROVED','MODULE_ACTIVE','APPROVED','ATTACHED'].includes(j.status));
 return {read:technician,technician};
}
// Crew dismissal never edits a manifest or a native reservation. A bound pilot
// may finish the already committed maneuver/voyage, but cannot start another.
export async function requireCrewPilot(tx,s,ship,c,action,at){
 if(!ship||shipPilot(ship)!==c.id||ship.ownerType==='CHARACTER'&&ship.ownerId===c.id)return;
 const access=await shipCrewAccess(tx,s,ship,c,at);if(!access.member)return;
 if(access.active&&['PILOT','CAPTAIN'].includes(access.member.role))return;
 const continuation=new Set(['shipNavigation','cockpitStation','requestSoLaunch','finishSoPreparation','finishSoRefuel','cancelSoNavigation','arriveShip','submitSpaceOrder','resolveSpaceRound','spaceBreakaway','spaceEscortInterpose','consentSpacePeace','dropTowedWreck','prepareSpaceRescue','startSpaceRescue','finishSpaceRescue','cancelSpaceRescue']);
 const committed=ship.journey?.pilotId===c.id||ship.operation?.pilotId===c.id;
 requireThat(committed&&continuation.has(action),'SHIP_CREW_REVOKED');
}

export async function crewCargoGrant(tx,s,ship,c,at,transferId=null){
 const a=await shipCrewAccess(tx,s,ship,c,at);
 if((a.active||a.own)&&a.permissions.logistics)return {logistics:a.permissions.logistics,ownerFreight:a.permissions.ownerFreight};
 if(!a.bound||!a.party.active||a.member?.memberVersion!==a.party.version||!transferId||c.activeCargoId!==transferId||a.member?.lockedOperationId!==transferId)return {logistics:false,ownerFreight:false};
 const t=await tx.get(`sessions/${s.id}/cargoTransfers/${transferId}`);
 const locked=t?.status==='LOADING'&&t.characterId===c.id&&t.actorVersion===a.party.version&&[t.source,t.destination].some(l=>l.kind==='HOLD'&&l.id===ship.id);
 return locked?{logistics:a.member.lockedPermissions?.logistics===true,ownerFreight:a.member.lockedPermissions?.ownerFreight===true}:{logistics:false,ownerFreight:false};
}
