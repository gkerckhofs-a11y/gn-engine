import {documentId,requireThat} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryParty} from './inventory-transfers.mjs';

export const hasPirateAlliances=s=>s.spaceOutlaws?.pirateAllianceVersion===1;
export const hasAllianceDuels=s=>hasPirateAlliances(s)&&s.spaceOutlaws?.allianceConvoyVersion===1&&s.spaceOutlaws?.allianceDuelVersion===1;
export const pirateAllianceFields={preparePirateAlliance:['shipId','supportShipId'],proposePirateAlliance:['shipId','supportShipId','confirmation'],acceptPirateAlliance:['shipId','leaderShipId','confirmation'],leavePirateAlliance:['shipId','confirmation','reason'],leavePirateAllianceAdmin:['shipId','confirmation','reason']};
const proof=(s,a,b)=>hash(JSON.stringify([s.revision,a,b??null]));
const publicOffer=(o,confirmation)=>({leaderShipId:o.leaderShipId,supportShipId:o.supportShipId,leaderName:o.leaderName,supportName:o.supportName,confirmation});
async function position(tx,s,x,time,inTransit,fit){
 if(!x?.ambushId||x.convoy||!inTransit(x,time)||x.journey.suspended||x.journey.intercepted||x.journey.interceptionCovered)return null;
 const a=await tx.get(`sessions/${s.id}/spaceAmbushes/${x.ambushId}`),p=await inventoryParty(tx,s.id,x.pilotId);
 return a?.status==='ACTIVE'&&a.shipId===x.id&&a.journeyId===x.journey.id&&a.routeId===x.journey.routeId&&p.active&&p.version===a.pilotVersion&&fit(p.c,time)?{ship:x,a,p}:null;
}
export function pirateAllianceView(s,fleet,c,admin){
 if(!hasPirateAlliances(s))return {ready:false,ships:[]};
 const own=fleet.filter(x=>admin||x.pilotId===c.id),ships=[];
 for(const x of own){const incoming=fleet.filter(l=>l.pirateOffer?.supportShipId===x.id).map(l=>publicOffer(l.pirateOffer,proof(s,l,x))),g=x.pirateAlliance;
  if(!x.ambushId&&!x.pirateOffer&&!g&&!incoming.length)continue;
  const partner=g?fleet.find(p=>p.id===g.shipIds.find(id=>id!==x.id)):null;
  ships.push({id:x.id,name:x.name,canPropose:!admin&&!!x.ambushId&&!g&&!x.pirateOffer,incoming:admin?[]:incoming,offer:x.pirateOffer?publicOffer(x.pirateOffer,null):null,alliance:g?{leaderName:g.leaderName,supportName:g.supportName}:null,confirmation:proof(s,x,partner)});
 }
 return {ready:true,duelReady:hasAllianceDuels(s),convoyReady:s.spaceOutlaws?.allianceConvoyVersion===1,ships};
}
export async function pirateAllianceCommand(tx,s,ship,c,input,action,id,at,time,inTransit,fit){
 requireThat(hasPirateAlliances(s),'SO_GAMEPLAY_NOT_OPEN');const base=`sessions/${s.id}`;
 if(action.startsWith('leavePirateAlliance')){
  const g=ship.pirateAlliance,partner=g?await tx.get(`${base}/ships/${g.shipIds.find(x=>x!==ship.id)}`):null;
  requireThat(g||ship.pirateOffer,'SPACE_ALLIANCE_CLOSED');requireThat(input.confirmation===proof(s,ship,partner),'STALE_REVISION');
  const rows=g?[ship,partner]:[ship];requireThat(rows.every(x=>x&&(!g||x.pirateAlliance?.id===g.id)&&!x.combatId),'SPACE_ALLIANCE_CLOSED');
  for(const x of rows)tx.set(`${base}/ships/${x.id}`,{...x,pirateAlliance:null,pirateOffer:null,revision:x.revision+1});return {result:{id:g?.id??ship.pirateOffer.id,status:'CANCELLED'},before:g??ship.pirateOffer,after:null};
 }
 const leader=action==='acceptPirateAlliance'?await tx.get(`${base}/ships/${documentId(input.leaderShipId)}`):ship,support=action==='acceptPirateAlliance'?ship:await tx.get(`${base}/ships/${documentId(input.supportShipId)}`),a=await position(tx,s,leader,time,inTransit,fit),b=await position(tx,s,support,time,inTransit,fit);
 requireThat(a&&b&&leader.id!==support.id&&leader.pilotId!==support.pilotId&&a.a.routeId===b.a.routeId&&!leader.pirateAlliance&&!support.pirateAlliance&&!support.pirateOffer,'SPACE_ALLIANCE_UNAVAILABLE');
 const o=leader.pirateOffer;
 if(action==='acceptPirateAlliance'){
  requireThat(o&&o.supportShipId===ship.id&&o.leaderPilotVersion===a.p.version&&o.supportPilotVersion===b.p.version&&o.leaderAmbushId===a.a.id&&o.supportAmbushId===b.a.id,'SPACE_ALLIANCE_CLOSED');requireThat(input.confirmation===proof(s,leader,support),'STALE_REVISION');
  const g={...o,shipIds:[leader.id,support.id],declaredAt:at};for(const x of [leader,support])tx.set(`${base}/ships/${x.id}`,{...x,pirateAlliance:g,pirateOffer:null,revision:x.revision+1});return {result:{id:g.id,status:'DECLARED'},before:o,after:g};
 }
 requireThat(!o,'SPACE_ALLIANCE_UNAVAILABLE');const confirmation=hash(JSON.stringify([s.revision,leader,support,a.a,b.a,a.p.version,b.p.version])),offer={id,...(hasAllianceDuels(s)?{duelVersion:1}:{}),leaderShipId:leader.id,supportShipId:support.id,leaderName:leader.name,supportName:support.name,leaderPilotVersion:a.p.version,supportPilotVersion:b.p.version,leaderAmbushId:a.a.id,supportAmbushId:b.a.id,createdAt:at};
 if(action==='preparePirateAlliance')return {...publicOffer(offer,confirmation),duelReady:hasAllianceDuels(s)};requireThat(input.confirmation===confirmation,'STALE_REVISION');tx.set(`${base}/ships/${leader.id}`,{...leader,pirateOffer:offer,revision:leader.revision+1});return {result:{id,status:'INVITED'},before:null,after:offer};
}
export async function pirateAllianceCandidate(tx,s,ship,time,inTransit,fit,fleet){
 if(!ship)return null;const g=ship.pirateAlliance;if(!g)return {members:[{ship,a:null}],declaration:null};
 if(!hasPirateAlliances(s)||g.leaderShipId!==ship.id)return null;
 const support=fleet.find(x=>x.id===g.supportShipId);if(support?.pirateAlliance?.id!==g.id)return null;
 const a=await position(tx,s,ship,time,inTransit,fit),b=await position(tx,s,support,time,inTransit,fit);
 if(!a||!b||a.a.id!==g.leaderAmbushId||b.a.id!==g.supportAmbushId||a.p.version!==g.leaderPilotVersion||b.p.version!==g.supportPilotVersion||a.a.routeId!==b.a.routeId)return null;
 return {members:[a,b],declaration:g};
}
