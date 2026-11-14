import {standardShipModules} from '../shared/space-ship-modules.mjs';
import {flightShip} from './space-module-flight.mjs';
import {personalTransferAllowed,personalTransferActorReady} from './personal-transfer-policy.mjs';
import {publicLot,effectiveLot} from './inventory-state.mjs';
import {documentId,requireThat} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {mediaFields} from './media-state.mjs';
import {shipCrewAccess,nativeShipReader,shipCrewBase,shipPilot,aboard,publicCrewPerson,alive} from './ship-crew-state.mjs';
import {navigationSkill} from './space-outlaws-navigation-state.mjs';
import {gameTime} from './clock.mjs';

export const shipWorkspaceActions=['myShips','shipWorkspace','shipWorkspaceAdmin'];
export function createShipWorkspaceService({store,signed,checkSession,now}){
 return async(action,actor,input)=>{
  signed(actor);const admin=action==='shipWorkspaceAdmin';admissionKeys(input,['sessionId',...(action==='myShips'?[]:['shipId'])]);
  return store.runTransaction(async tx=>{
   const ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c}=ctx,at=now();
   requireThat(s.spaceOutlaws?.navigationVersion===1,'SO_GAMEPLAY_NOT_OPEN');requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
   const all=action==='myShips'?await tx.list(`sessions/${s.id}/ships`):[await tx.get(`sessions/${s.id}/ships/${documentId(input.shipId)}`)],ships=[];
   for(let ship of all){
    if(!ship?.soProfile){if(action==='myShips')continue;requireThat(false,'NOT_FOUND');}
    const crew=admin?null:await shipCrewAccess(tx,s,ship,c,at),native=admin?{}:await nativeShipReader(tx,s,ship,c,at);
    if(!admin&&!crew.active&&!crew.departing&&!native.read){if(action==='myShips')continue;requireThat(false,'FORBIDDEN');}
    ship=flightShip(s,ship,gameTime(s.clock,at));
    const role=admin?'MJ':crew.own?'OWNER':crew.captain?'CAPTAIN':crew.active?crew.member.role:native.pilot?'PILOT':native.technician?'MECHANIC':'PASSENGER';
    const limited=!admin&&!crew.own&&!crew.active&&!native.pilot&&!native.technician;
    const port=ship.portId?await tx.get(`sessions/${s.id}/ports/${ship.portId}`):null;
    const captainRoot=crew?.root??await tx.get(shipCrewBase(s,ship));
    const captainId=captainRoot?.ownerBinding===`${ship.ownerType}:${ship.ownerId}`?captainRoot.captainId:null,captain=captainId?await inventoryParty(tx,s.id,captainId):null;
    const owner=ship.ownerType==='CHARACTER'?await tx.get(`sessions/${s.id}/characters/${ship.ownerId}`):null;
    const status=ship.journey?'IN_FLIGHT':ship.operation?'PREPARING':ship.hull===0?'IMMOBILIZED':ship.maintenanceId?'MAINTENANCE':ship.docked?'DOCKED':'UNAVAILABLE';
    const view={id:ship.id,name:ship.name,...mediaFields(ship,['illustration']),profile:{id:ship.soProfile.id,label:ship.soProfile.label,hullMax:ship.soProfile.hullMax,shieldMax:ship.soProfile.shieldMax},role,status,
     owner:{name:owner?.public?.displayName??'Propriété collective',...(admin||crew?.own?{id:ship.ownerId}:{}),collective:ship.ownerType==='GROUP'},captain:captain?.active&&alive(captain.c)&&captain.version===captainRoot?.captainVersion?publicCrewPerson(captain.c):null,
     port:port?{id:port.id,name:port.name}:null,hull:ship.hull,shield:ship.shield,fuel:ship.fuel,tankCapacity:ship.navigation?.tankCapacity,capacity:ship.capacity,revisionRequired:ship.revisionRequired,
     operation:ship.operation?{kind:ship.operation.kind,remainingSeconds:Math.max(0,Math.ceil((ship.operation.readyAtGameMs-gameTime(s.clock,at))/1000))}:null,
     journey:ship.journey?{id:ship.journey.id,name:ship.journey.name??ship.journey.routeName??'Voyage',suspended:!!ship.journey.suspended,remainingSeconds:Math.max(0,Math.ceil(((ship.journey.suspended?gameTime(s.clock,at)+(ship.journey.remainingMs??0):ship.journey.arrivesAtGameMs)-gameTime(s.clock,at))/1000))}:null,
     modules:limited?[]:(ship.modules??[]).filter(m=>m.code!=='MOD-04'||admin||crew?.own||native.pilot).map(m=>({code:m.code,label:standardShipModules.find(v=>v.code===m.code)?.label??m.code,size:m.size,status:m.status})),departing:!!crew?.departing,
     permissions:{navigation:!!native.read&&(native.pilot||crew?.own||aboard(ship,c?.id)),fuel:!!native.pilot,fuelContribution:!!crew?.permissions.fuelContribution,journal:admin||!!crew?.permissions.journal,crew:admin||!limited,logistics:admin||!!crew?.permissions.logistics,maintenance:admin||native.technician||!!crew?.permissions.maintenance,manage:admin||Object.values(crew?.authority??{}).some(Boolean),captain:admin||!!crew?.own,assignPilot:admin||!!(crew?.bound&&crew.authority.pilot),analyzeRoute:!admin&&navigationSkill(c,'PIL-01')>0},
     blocked:s.safetyStop?.active?'STOP SÉCURITÉ':s.stage!=='EN_JEU'?'Les opérations de jeu sont suspendues pendant cette phase.':null};
    if(action!=='myShips'){
     view.fuelContribution=null;
     if(!admin&&view.permissions.fuelContribution&&shipPilot(ship)!==c.id){const pilot=await inventoryParty(tx,s.id,shipPilot(ship));if(pilot.active&&alive(pilot.c)&&(await nativeShipReader(tx,s,ship,pilot.c,at)).pilot){const lots=(await tx.list(`sessions/${s.id}/inventory`,['holderId',c.id])).map(l=>effectiveLot(l,at)).filter(l=>l.item.id===ship.navigation.fuelItemId&&personalTransferAllowed(s,l,c.id));view.fuelContribution={pilot:publicCrewPerson(pilot.c),lots:lots.map(publicLot),canPropose:s.stage==='EN_JEU'&&await personalTransferActorReady(tx,s,c)};}}
     view.members=[];if(view.permissions.crew)for(const member of await tx.list(`${shipCrewBase(s,ship)}/members`)){
      const party=await inventoryParty(tx,s.id,member.id);if(!party.active)continue;const access=await shipCrewAccess(tx,s,ship,party.c,at);
      if(access.active||access.departing)view.members.push({...publicCrewPerson(party.c),role:access.captain?'CAPTAIN':member.role,status:access.departing?'DISEMBARK_PENDING':'ACTIVE',permissions:member.permissions??{}});
     }
     view.journal=[];if(view.permissions.journal){
      const history=await tx.list(`${shipCrewBase(s,ship)}/history`,null,{orderBy:'at',direction:'desc',limit:50});
      const nativeHistory=await tx.list(`sessions/${s.id}/logisticsHistory`,null,{orderBy:'at',direction:'desc',limit:200});
      const jobs=await tx.list(`sessions/${s.id}/shipMaintenance`,['shipId',ship.id]),jobIds=new Set(jobs.filter(j=>j.module?.code!=='MOD-04'||admin||crew?.own||native.pilot).map(j=>j.id));
      const belongs=e=>e.shipId===ship.id||e.before?.shipId===ship.id||e.after?.shipId===ship.id||e.before?.id===ship.id||e.after?.id===ship.id||e.ship?.id===ship.id||jobIds.has(e.mandateId)||[e.source,e.destination,e.before?.location,e.after?.location,e.before?.source,e.after?.source,e.before?.destination,e.after?.destination].some(l=>l?.kind==='HOLD'&&l.id===ship.id);
      const labels={refuelShip:'Ravitaillement engagé',finishSoRefuel:'Ravitaillement terminé',departShip:'Préparation de vol engagée',finishSoPreparation:'Vol lancé',arriveShip:'Arrivée au port',arriveSoShipAdmin:'Arrivée confirmée par la régie',cancelSoNavigation:'Opération de navigation interrompue',cancelSoNavigationAdmin:'Opération de navigation interrompue',continueSoVoyage:'Voyage repris',changeSoPilot:'Pilote désigné',requestSoLaunch:'Décollage demandé',assignSoCockpit:'Poste cockpit affecté',offerSpaceMaintenance:'Devis de maintenance proposé',acceptSpaceMaintenance:'Devis accepté',startSpaceMaintenance:'Maintenance commencée',finishSpaceMaintenancePoint:'Point de maintenance achevé',cancelSpaceMaintenance:'Intervention interrompue',offerModuleMandate:'Accord de module proposé',approveModuleMandate:'Accord de module validé',startModuleWork:'Travaux de module commencés',finishModuleWork:'Travaux de module achevés',CARGO_LOADING:'Manutention engagée',CARGO_RECEIVED:'Manutention achevée',CARGO_CANCELLED:'Manutention interrompue'};
      const nativeEvents=nativeHistory.filter(e=>belongs(e)&&labels[e.kind??e.action]).map(e=>({at:e.at,kind:e.kind??e.action,label:labels[e.kind??e.action]}));
      view.journal=[...history,...nativeEvents].sort((a,b)=>b.at-a.at).slice(0,50).map(e=>({at:e.at,kind:e.kind??e.action,label:e.label??'Opération du vaisseau'}));
     }
    }
    ships.push(view);
   }
   return {session:{id:s.id,stage:s.stage,moduleMandatesReady:s.spaceOutlaws.moduleMandatesVersion===1},admin,ships,...(action==='myShips'?{}:{ship:ships[0]})};
  });
 };
}
