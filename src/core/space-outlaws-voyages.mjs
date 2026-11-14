import {shipCrewAccess,requireCrewPilot,shipPilot,shipCrewBase} from './ship-crew-state.mjs';
import {recordShipDeparture,myTraceAlerts} from './space-fictional-traces.mjs';
import {malaiseAt} from './space-toxicology-state.mjs';
import {startTowingOutage,waitingTowingOutage} from './space-towing-outage.mjs';
import {towingFlightContext,validateTowingDeparture,validateTowingConsent,validateTowingRoute,towingRoute,towingEvent,departTowedWreck,arriveTowedWreck} from './space-towing-flight.mjs';
import {hasHiddenCargo} from './space-hidden-cargo.mjs';
import {hasModuleFlights,hasTowingFlights,hasTowingOutages,flightShip,eligibleFlightModules,validateModuleFlight,neutralizeVoyageModule,activeModuleOutages} from './space-module-flight.mjs';
import {hasTargetedAmbushes,ambushKnowledgeOptions} from './space-targeted-ambushes.mjs';
import {detourFields,detourView,detourCommand} from './space-detours.mjs';
import {finishEscortRefuel} from './space-escort.mjs';
import {hasSoConvoy,convoyFields,convoyInvitations,convoyCommand,convoyFleet,finishConvoy} from './space-convoy.mjs';
import {transportDeparture} from './space-transport.mjs';
import {mediaFields} from './media-state.mjs';
import {publicJourney} from './navigation-state.mjs';
import {randomInt} from 'node:crypto';
import {documentId,requireThat,whole} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {inventoryHash as hash,personalLot,publicLot,itemQuantity,lotState} from './inventory-state.mjs';
import {hasSoGroupPilot} from '../shared/space-outlaws-groups.mjs';
import {groupVisible,memberFor} from './groups.mjs';
import {shipInput,seedShip,shipAccess,navigationView} from './navigation-state.mjs';
import {warehouseStock,stockVolume} from './storage-state.mjs';
import {gameTime} from './clock.mjs';
import {moneyText} from './economy-state.mjs';
import {actionPointPath,actionPointState,reserveActionPoints,resolveActionPoints,releaseActionPoints,actionPointMaximum} from './action-point-state.mjs';
import {hasItemCircuits,transferableItem} from './item-circuits.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {hasSoNavigation,navigationSkill,soRoute,soShipProfile,soVoyageEvent} from './space-outlaws-navigation-state.mjs';

const admins=new Set(['enableSoCockpits','assignSoCockpit','revokeSoCockpit','prepareSoPilot','changeSoPilot','leaveSoConvoyAdmin','spaceportAdmin','prepareSoShip','provisionSoShip','cancelSoNavigationAdmin','continueSoVoyage','arriveSoShipAdmin']);
const reads=new Set(['cockpitStation','prepareSoShipName','prepareSoPilot','prepareSoDetour','prepareSoConvoy','spaceportAdmin','mySpaceport','prepareSoShip','shipNavigation','prepareRefuel','prepareVoyage']);
const provisionFields=['shipId','modelId','name','ownerId','groupId','pilotId','homePort','fuelItemId','source','reason'];
const flightFields=['shipId','navigationCode','passengerCodes'];
const fields={enableSoCockpits:[],cockpitStation:['stationId'],requestSoLaunch:['shipId','confirmation','present'],assignSoCockpit:['shipId','confirmation','stationId'],revokeSoCockpit:['shipId','confirmation'],prepareSoShipName:['shipId','name'],renameSoShip:['shipId','name','confirmation','present'],prepareSoPilot:['shipId','pilotId','reason'],changeSoPilot:['shipId','pilotId','reason','confirmation','present'],...detourFields,...convoyFields,spaceportAdmin:[],mySpaceport:[],prepareSoShip:provisionFields,provisionSoShip:[...provisionFields,'confirmation'],shipNavigation:['shipId'],prepareRefuel:['shipId','lotId','quantity'],refuelShip:['shipId','lotId','quantity','confirmation','present'],finishSoRefuel:['shipId','confirmation','present'],prepareVoyage:[...flightFields,'cockpit'],departShip:[...flightFields,'confirmation','present','cockpit'],finishSoPreparation:['shipId','confirmation','present','stationId'],cancelSoNavigation:['shipId','confirmation','reason'],cancelSoNavigationAdmin:['shipId','confirmation','reason'],arriveShip:['shipId','confirmation'],arriveSoShipAdmin:['shipId','confirmation','reason'],continueSoVoyage:['shipId','confirmation','reason']};
export const soVoyageCommands=Object.keys(fields);
const active=s=>{requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');};
const available=(s,c,time)=>c.hp>0&&!c.outOfCombat&&!c.survival?.dead&&!c.activeMaintenanceId&&!c.activeCargoId&&!c.activeAidId&&!c.activeFieldActionId&&!c.activePersonActionId&&!(c.convalescentUntilGameMs>time)&&!malaiseAt(c,time);
const characterPort=(s,c)=>c.spacePortId??s.transportRules?.homePort;
const receipt=(s,ship,version)=>hash(JSON.stringify([s.id,s.revision,ship,version??null]));
const groupActions=new Set(['requestSoLaunch','assignSoCockpit','revokeSoCockpit','shipNavigation','prepareSoPilot','changeSoPilot','prepareRefuel','refuelShip',
 'finishSoRefuel','prepareVoyage','departShip','finishSoPreparation','cancelSoNavigation',
 'cancelSoNavigationAdmin','arriveShip','arriveSoShipAdmin','continueSoVoyage']);
const designatedPilot=ship=>ship.ownerType==='GROUP'?ship.groupPilotId:ship.pilotId;
function groupPilotGrant(s,g,c){
 return hasSoGroupPilot(s)&&!!c?.birth&&c.birth.versionId===s.versionId&&!c.survival?.dead&&!c.successorId&&
  !!g?.roster&&groupVisible(g,c.id)&&memberFor(g,c.id).permissions.pilotShip===true&&navigationSkill(c,'PIL-02')>=1;
}
const groupPilotRevision=(g,c)=>hash(JSON.stringify([g.id,g.revision,c.id]));
const routeFuelRequired=(ship,route)=>route.fuelCost+(ship.ownerType==='GROUP'?1:0);
const nameActions=new Set(['prepareSoShipName','renameSoShip']);
const nameIdle=ship=>ship.enabled&&ship.docked&&!ship.journey&&!ship.operation&&!ship.combatId&&!ship.rescueId&&!ship.maintenanceId&&!ship.ambushId&&!ship.convoy&&!ship.convoyOffer;
const publicModuleJourney=(j,time)=>{const {towingOutage,...raw}=publicJourney(j),p={...raw,...(towingOutage?{towingWait:{waiting:waitingTowingOutage(j,time),remainingSeconds:Math.max(0,Math.ceil((towingOutage.untilGameMs-time)/1000))}}:{})};if(!p.event?.neutralizedModule)return p;const {lotId,...effect}=p.event.neutralizedModule;return {...p,event:{...p.event,neutralizedModule:effect}};};
export const safeSoShip=(s,ship,time)=>({...((ship.wreckSpacePosition)?{wreckSpacePosition:{...ship.wreckSpacePosition}}:{}),...(s.spaceOutlaws.shipNamingVersion===1?{identity:{transponder:ship.transponder,previousNames:ship.previousNames??[]}}:{}),...mediaFields(ship,['illustration']),...navigationView(s,ship,time),...(ship.journey?{journey:{...publicModuleJourney(ship.journey,time),remainingSeconds:ship.journey.suspended?Math.ceil(ship.journey.remainingMs/1000):Math.max(0,Math.ceil((ship.journey.arrivesAtGameMs-time)/1000))}}:{}),towingAttached:!!(hasTowingFlights(s)&&ship.towingAttachment?.role==='TUG'&&ship.maintenanceId===ship.towingAttachment.workId),towingWreck:!!ship.towingAttachment&&ship.towingAttachment.role==='WRECK',maintenanceId:ship.maintenanceId??null,combatId:ship.combatId??null,rescueId:ship.rescueId??null,ambushId:ship.ambushId??null,convoy:ship.convoy?{id:ship.convoy.id,shipIds:ship.convoy.shipIds,shipNames:ship.convoy.shipNames,leaderShipId:ship.convoy.leaderShipId,routeName:ship.convoy.routeName,toPort:ship.convoy.toPort}:null,convoyOffer:ship.convoyOffer?{escortName:ship.convoyOffer.escortName,toPort:ship.convoyOffer.toPort}:null,cockpit:ship.cockpit?{status:ship.cockpit.status,stationId:ship.cockpit.stationId??null}:null,revision:ship.revision,profile:ship.soProfile,modules:(ship.modules??[]).map(({lotId,code,size,status})=>({lotId,code,size,status})),moduleFlightBlocked:!!ship.modules?.length&&!hasModuleFlights(s),moduleNeutralizations:activeModuleOutages(ship,time).map(n=>({lotId:n.lotId,code:n.code,remainingSeconds:Math.ceil((n.untilGameMs-time)/1000)})),...(ship.ownerType==='GROUP'?{groupShip:true}:{ownerId:ship.ownerId}),pilotId:designatedPilot(ship)??null,hull:ship.hull,shield:ship.shield,revisionRequired:ship.revisionRequired,operation:ship.operation?{id:ship.operation.id,kind:ship.operation.kind,cockpit:ship.operation.cockpit===true,convoyReady:ship.operation.convoyReady===true,remainingSeconds:Math.max(0,Math.ceil((ship.operation.readyAtGameMs-time)/1000)),manifest:ship.operation.manifest?.map(m=>({id:m.id,name:m.name}))??[],route:ship.operation.route??null}:null});

// Canonical constraints on the native ships, voyages, inventory, PA and clocks.
// No second fleet, wallet, cargo engine or arbitrary route generator.
export function createSoVoyageService({store,signed,checkSession,now,uuid,rollD6=()=>randomInt(1,7)}){
 return async(action,actor,input)=>{
  const stationRead=action==='cockpitStation';
  signed(actor);requireThat(fields[action],'SO_GAMEPLAY_NOT_OPEN');admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);
  const at=now(),id=uuid(),dice=action==='finishSoPreparation'?[rollD6(),rollD6(),rollD6(),rollD6()]:action==='attemptSoDetour'?[rollD6()]:null;
  return store.runTransaction(async tx=>{
   if(stationRead)action='cockpitStation';
   let admin=admins.has(action),ctx;const pilotChange=['prepareSoPilot','changeSoPilot'].includes(action);
   if(admin){try{ctx={s:await checkSession(tx,actor,documentId(input.sessionId))};}catch(e){if(!pilotChange||e.code!=='FORBIDDEN')throw e;admin=false;ctx=await inventoryPlayer(tx,actor,input);}}else ctx=await inventoryPlayer(tx,actor,input);
   const {s,c,version}=ctx,base=`sessions/${s.id}`,time=gameTime(s.clock,at);
   requireThat(hasSoNavigation(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
   const cockpitSettings=await tx.get(`${base}/cockpitSettings/main`);
   if(action==='enableSoCockpits'){
    documentId(input.requestId);requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_NOT_RUNNING');
    if(cockpitSettings?.enabled)return {enabled:true};
    authorizeSpaceOutlaws(tx,s,'COCKPIT');tx.set(`${base}/cockpitSettings/main`,{id:'main',enabled:true});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});return {enabled:true};
   }
   if(action==='spaceportAdmin'||action==='mySpaceport'){
    const groups=hasSoGroupPilot(s)?await tx.list(`${base}/groups`):[];
    let ships=(await tx.list(`${base}/ships`)).map(x=>flightShip(s,x,time)).filter(x=>{
     if(!x.soProfile)return false;
     if(admin)return true;
     const onBoard=(x.journey?.manifest??[]).some(m=>m.id===c.id);
     if(x.ownerType==='GROUP'){
      const group=groups.find(g=>g.id===x.ownerId);
      return hasSoGroupPilot(s)&&(onBoard||designatedPilot(x)===c.id&&groupPilotGrant(s,group,c));
     }
     return shipAccess(x,c.id,[]).access||onBoard||(x.operation?.manifest??[]).some(m=>m.id===c.id);
    });
    if(!admin){const visible=[];for(const sh of ships){try{await requireCrewPilot(tx,s,sh,c,'shipNavigation',at);visible.push(sh);}catch(e){if(e.code!=='SHIP_CREW_REVOKED')throw e;}}ships=visible;}
    const confirmations=new Map();
    for(const sh of ships){
     const tow=sh.towingAttachment?.role==='TUG'?await towingFlightContext(tx,s,sh,'shipNavigation',time):null;
     confirmations.set(sh.id,tow?hash(JSON.stringify([receipt(s,sh,version),tow.confirmationState])):receipt(s,sh,version));
    }
    return {
     alerts:admin?[]:await myTraceAlerts(tx,s,c),invitations:await convoyInvitations(tx,s,c,time),
     session:{id:s.id,stage:s.stage,cockpitEnabled:cockpitSettings?.enabled===true,towingReady:s.spaceOutlaws.towingWorkVersion===1&&hasModuleFlights(s),routeAnalysisReady:s.spaceOutlaws.routeAnalysisVersion===1,convoyReady:hasSoConvoy(s),logisticsReady:s.spaceOutlaws.logisticsVersion===1,combatReady:s.spaceOutlaws.combatVersion===1},
     admin,ships:ships.map(x=>({...safeSoShip(s,x,time),...(admin&&x.ownerType==='GROUP'?{ownerId:x.ownerId}:{}),confirmation:confirmations.get(x.id)})),
     ...(admin?{groups:groups.filter(g=>g.roster&&!g.roster.archived&&g.publicationState==='PUBLISHED').map(g=>({id:g.id,name:g.name})),
       models:await tx.list(`${base}/shipModels`),ports:await tx.list(`${base}/ports`),
       items:(await tx.list(`${base}/items`)).filter(i=>i.consumable&&i.kind==='STACKABLE'&&!i.laserRecharge),
       characters:(await tx.list(`${base}/characters`)).filter(c=>c.birth).map(c=>({id:c.id,name:c.public.displayName})),
       homePort:s.transportRules?.homePort??null}:{} )
    };
   }
   let station=null;
   if(stationRead){
    station=await tx.get(`${base}/cockpitStations/${documentId(input.stationId)}`);
    requireThat(station?.shipId,'COCKPIT_UNAVAILABLE');
    input={...input,shipId:station.shipId};action='shipNavigation';
   }
   let ship=input.shipId?flightShip(s,await tx.get(`${base}/ships/${documentId(input.shipId)}`),time):null;
   const provisioning=['prepareSoShip','provisionSoShip'].includes(action),groupShip=ship?.ownerType==='GROUP';
   let group,grant=null;
   if(groupShip&&!provisioning){
    requireThat(hasSoGroupPilot(s)&&groupActions.has(action),'SO_GAMEPLAY_NOT_OPEN');
    group=await tx.get(`${base}/groups/${ship.ownerId}`);
    if(!admin&&designatedPilot(ship)===c.id&&groupPilotGrant(s,group,c))grant=groupPilotRevision(group,c);
   }
   const crew=ship&&!admin?await shipCrewAccess(tx,s,ship,c,at):null;
   if(pilotChange&&!admin)requireThat(crew?.bound&&crew.authority.pilot,'FORBIDDEN');
   if(!admin&&!pilotChange)await requireCrewPilot(tx,s,ship,c,action,at);
   if(!provisioning){
    requireThat(ship?.soProfile,'CARGO_UNAVAILABLE');
    if(!admin){
     const manifest=ship.journey?.manifest??(groupShip?[]:ship.operation?.manifest??[]);
     const passenger=action==='shipNavigation'&&manifest.some(m=>m.id===c.id);
     requireThat(pilotChange&&crew.authority.pilot||(groupShip?!!grant:shipAccess(ship,c.id,[]).access)||passenger,'FORBIDDEN');
    }
   }
   if(groupShip&&!provisioning&&action!=='shipNavigation')requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
   const towing=await towingFlightContext(tx,s,ship,action,time);
   if(nameActions.has(action)){requireThat(s.spaceOutlaws.shipNamingVersion===1,'SO_GAMEPLAY_NOT_OPEN');requireThat(ship.ownerType==='CHARACTER'&&ship.ownerId===c?.id&&!c.survival?.dead,'FORBIDDEN');}
   if(['departShip','finishSoPreparation'].includes(action)){validateTowingConsent(towing);if(ship?.modules?.length)await validateModuleFlight(tx,s,ship);}
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input]));
   if(op){const old=await tx.get(op);if(old){requireThat(old.towingOutageVersion!==1||hasTowingOutages(s),'TOWING_OUTAGE_NOT_OPEN');requireThat(old.towingFlightVersion!==1||hasTowingFlights(s),'TOWING_FLIGHT_NOT_OPEN');requireThat(old.moduleFlightVersion!==1||hasModuleFlights(s),'MODULE_FLIGHT_NOT_OPEN');requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===version&&(!groupShip||old.groupPilotGrant===grant)&&(nameActions.has(action)?ship.ownerId===c.id:designatedPilot(ship)===c.id),'FORBIDDEN');return old.result;}}
   const crewDepartures=[];
   if(['arriveShip','arriveSoShipAdmin','cancelSoNavigation','cancelSoNavigationAdmin'].includes(action))for(const shipId of ship?.convoy?.shipIds??[ship?.id])if(shipId)for(const m of await tx.list(`${shipCrewBase(s,{id:shipId})}/members`))if(m.status==='DISEMBARK_PENDING')crewDepartures.push({path:`${shipCrewBase(s,{id:shipId})}/members/${m.id}`,member:m});
   const audit=(result,before,after,extra={})=>{authorizeSpaceOutlaws(tx,s,'NAVIGATION');if(result.status==='ARRIVED'||['cancelSoNavigation','cancelSoNavigationAdmin'].includes(action)){for(const {path,member} of crewDepartures)tx.set(path,{...member,status:'RETIRED',revision:member.revision+1,disembarkedAt:at});for(const path of new Set(crewDepartures.map(x=>x.path.split('/members/')[0])))tx.set(`${path}/history/${id}`,{id,kind:'CREW_DISEMBARKED',at,label:result.status==='ARRIVED'?'Retraits d’équipage effectifs à l’escale':'Retraits d’équipage effectifs après annulation à quai'});}tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,before,after,...extra});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});tx.set(op,{...(towing&&hasTowingOutages(s)?{towingOutageVersion:1}:{}),...(towing?{towingFlightVersion:1}:{}),...(hasModuleFlights(s)&&['departShip','finishSoPreparation'].includes(action)?{moduleFlightVersion:1}:{}),...(grant?{groupPilotGrant:grant}:{}),fingerprint,guard:version??null,result,at});return result;};
   if(provisioning){
    requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_NOT_RUNNING');
    const source=moneyText(input.source),reason=moneyText(input.reason),model=await tx.get(`${base}/shipModels/${documentId(input.modelId)}`),port=await tx.get(`${base}/ports/${documentId(input.homePort)}`),fuel=await tx.get(`${base}/items/${documentId(input.fuelItemId)}`);
    requireThat(!!input.ownerId!==!!input.groupId,'INVALID_SHIP');
    const collective=!!input.groupId;
    if(collective)requireThat(hasSoGroupPilot(s),'SO_GAMEPLAY_NOT_OPEN');
    const pilot=await inventoryParty(tx,s.id,documentId(input.pilotId));
    requireThat(pilot.active,'INVALID_RECIPIENT');
    requireThat(navigationSkill(pilot.c,'PIL-02')>=1,'FIELD_SKILL_REQUIRED');
    const owningGroup=collective?await tx.get(`${base}/groups/${documentId(input.groupId)}`):null;
    const owner=collective?null:await inventoryParty(tx,s.id,documentId(input.ownerId));
    if(collective)requireThat(groupPilotGrant(s,owningGroup,pilot.c),'FORBIDDEN');
    else requireThat(owner.active,'INVALID_RECIPIENT');
    const ownerId=collective?owningGroup.id:owner.c.id,ownerType=collective?'GROUP':'CHARACTER';
    const ownerVersion=collective?groupPilotRevision(owningGroup,pilot.c):owner.version;
    requireThat(model?.versionId===s.versionId&&port?.versionId===s.versionId,'INVALID_SHIP');requireThat(fuel?.consumable&&fuel.kind==='STACKABLE'&&!fuel.laserRecharge,'INVALID_FUEL');
    requireThat(!s.transportRules||s.transportRules.homePort===port.id,'SHIP_NOT_LOCAL');
    const offers=[];for(const shop of await tx.list(`${base}/shops`))offers.push(...await tx.list(`${base}/shops/${shop.id}/offers`));requireThat(offers.some(o=>o.item.id===fuel.id&&o.unitPrice===25)&&offers.filter(o=>o.item.id===fuel.id).every(o=>o.unitPrice===25),'SO_FUEL_OFFER_REQUIRED');
    const profile=soShipProfile(model),intent=hash(JSON.stringify([input.shipId,model.id,input.name,ownerId,pilot.c.id,port.id,fuel.id,source,reason,...(collective?[ownerType]:[])]));
    if(ship){requireThat(ship.provisionIntent===intent,'SHIP_EXISTS');return action==='provisionSoShip'?audit({id:ship.id},null,null):{exists:true,ship:safeSoShip(s,ship,time),confirmation:ship.provisionIntent};}
    const config=shipInput({name:input.name,description:model.description,capacity:profile.cargoCapacity,ownerType,ownerId,docked:true,enabled:true,navigation:{fuelItemId:fuel.id,tankCapacity:profile.tankCapacity,initialFuel:0,initialPort:port.id}},documentId(input.shipId),{},true);
    const next={...seedShip(config),soProfile:profile,pilotId:collective?null:pilot.c.id,...(collective?{groupPilotId:pilot.c.id}:{}),hull:profile.hullMax,shield:profile.shieldMax,revisionRequired:false,operation:null,modules:[],transponder:config.id,provisionIntent:intent,versionId:s.versionId};
    const confirmation=hash(JSON.stringify([s.revision,next,ownerVersion,pilot.version,source,reason]));
    if(action==='prepareSoShip')return {ship:safeSoShip(s,next,time),ownerName:collective?owningGroup.name:owner.c.public.displayName,pilotName:pilot.c.public.displayName,fuelName:fuel.name,source,reason,confirmation};
    requireThat(input.confirmation===confirmation,'STALE_REVISION');if(!s.transportRules){authorizeSpaceOutlaws(tx,s,'NAVIGATION_CONFIG');tx.set(base,{...s,transportRules:{homePort:port.id},revision:s.revision+1});}
    tx.set(`${base}/ships/${next.id}`,next);return audit({id:next.id},null,next,{source,reason});
   }
   if(['prepareSoPilot','changeSoPilot'].includes(action)){
    requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_NOT_RUNNING');
    requireThat(ship.enabled&&ship.docked&&!ship.journey&&!ship.operation&&!ship.combatId&&!ship.rescueId&&!ship.maintenanceId&&!ship.ambushId&&!ship.convoy&&!ship.convoyOffer,'SPACE_SHIP_BUSY');
    const pilot=await inventoryParty(tx,s.id,documentId(input.pilotId)),reason=moneyText(input.reason);
    requireThat(pilot.active&&pilot.c.birth&&pilot.c.id!==designatedPilot(ship),'INVALID_RECIPIENT');
    requireThat(navigationSkill(pilot.c,'PIL-02')>=1,'FIELD_SKILL_REQUIRED');
    const pilotCrew=await shipCrewAccess(tx,s,ship,pilot.c,at);
    if(!admin||pilotCrew.member)requireThat(ship.ownerType==='CHARACTER'&&ship.ownerId===pilot.c.id||pilotCrew.active&&['PILOT','CAPTAIN'].includes(pilotCrew.member.role),'SHIP_CREW_REVOKED');
    if(groupShip)requireThat(groupPilotGrant(s,group,pilot.c),'FORBIDDEN');
    requireThat(available(s,pilot.c,time)&&!pilot.c.activeNavigationId&&!pilot.c.activeVoyageId,'OUT_OF_COMBAT');
    requireThat(characterPort(s,pilot.c)===ship.portId,'SHIP_NOT_LOCAL');
    requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(l=>l.kind==='HOLD'&&l.id===ship.id)),'CARGO_TRANSFERS_OPEN');
    // A mandate change must not strand an accepted freight/escort obligation.
    const contracts=await tx.list(`${base}/contracts`);
    requireThat(!contracts.some(x=>[x.terms?.transport?.shipId,x.terms?.escort?.shipId,x.terms?.escort?.cargoShipId].includes(ship.id)&&x.acceptedAt!=null&&(['ACTIVE','SUBMITTED','REVIEWED','DISPUTED'].includes(x.status)||(x.escortFuel?.remaining??0)>0)),'SO_PILOT_CONTRACT_OPEN');
    requireThat(!(await warehouseStock(tx,s.id,ship.id,'HOLD')).some(l=>l.transportContractId&&l.quantity>0),'SO_PILOT_CONTRACT_OPEN');
    const previousId=designatedPilot(ship),previous=previousId?await tx.get(`${base}/characters/${previousId}`):null,result={shipName:ship.name,portId:ship.portId,previousPilotName:previous?.public?.displayName??previousId??null,pilotName:pilot.c.public.displayName,reason};
    const confirmation=hash(JSON.stringify([receipt(s,ship),pilot.version,pilot.c,result,...(!admin?[crew.root?.authorityRevision??0,crew.member?.revision??0,version,pilotCrew.member?.revision??0]:[]),...(groupShip?[groupPilotRevision(group,pilot.c)]:[])]));
    if(action==='prepareSoPilot')return {...result,confirmation};
    requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
    const next={...ship,...(groupShip?{groupPilotId:pilot.c.id}:{pilotId:pilot.c.id}),revision:ship.revision+1};tx.set(`${base}/ships/${ship.id}`,next);
    return audit({id:ship.id,pilotId:pilot.c.id},ship,next,{reason});
   }
   if(nameActions.has(action)){
    active(s);requireThat(nameIdle(ship),'SPACE_SHIP_BUSY');requireThat(available(s,c,time)&&!c.activeNavigationId&&!c.activeVoyageId,'OUT_OF_COMBAT');requireThat(characterPort(s,c)===ship.portId,'SHIP_NOT_LOCAL');
    requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(l=>l.kind==='HOLD'&&l.id===ship.id)),'CARGO_TRANSFERS_OPEN');
    const name=admissionText(input.name,150,true);requireThat(!/[\u0000-\u001f\u007f-\u009f]/u.test(name),'INVALID_ADMISSION');requireThat(name!==ship.name,'SO_SHIP_NAME_UNCHANGED');requireThat((ship.previousNames??[]).length<100,'SO_SHIP_NAME_LIMIT');
    const result={shipId:ship.id,previousName:ship.name,name,transponder:ship.transponder,portId:ship.portId},confirmation=hash(JSON.stringify([receipt(s,ship,version),c,result]));
    if(action==='prepareSoShipName')return {...result,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
    const next={...ship,name,previousNames:[...(ship.previousNames??[]),ship.name],revision:ship.revision+1};tx.set(`${base}/ships/${ship.id}`,next);return audit({id:ship.id,name},ship,next);
   }
   const nativeConfirmation=receipt(s,ship,version);
   const confirmation=grant?hash(JSON.stringify([nativeConfirmation,grant])):
    towing?hash(JSON.stringify([nativeConfirmation,towing.confirmationState])):nativeConfirmation;
   const isPilot=!admin&&(groupShip?!!grant:ship.pilotId===c.id);
   const mandateChanged=groupShip&&isPilot&&!!ship.operation&&ship.operation.groupPilotGrant!==grant;
   const fuelAllowed=l=>!!l&&(!hasItemCircuits(s)||l.item.usage==='FUEL')&&personalLot(l,c?.id)&&l.status==='AVAILABLE'&&l.quantity>0&&l.item.id===ship.navigation.fuelItemId&&(transferableItem(l)||!groupShip&&ship.ownerId===c.id)&&(!groupShip||!l.transportContractId);
   if(stationRead){
    requireThat(isPilot&&ship.cockpit?.status==='ASSIGNED'&&ship.cockpit.stationId===station.id&&ship.cockpit.operationId===station.operationId&&ship.cockpit.pilotId===c.id,'COCKPIT_UNAVAILABLE');
    requireThat(!mandateChanged,'FORBIDDEN');
    return {session:{id:s.id,stage:s.stage,stopped:!!s.safetyStop?.active},ship:safeSoShip(s,ship,time),pilotName:c.public.displayName,confirmation,canAct:s.stage==='EN_JEU'&&!s.safetyStop?.active&&available(s,c,time),stationId:station.id};
   }
   if(action==='shipNavigation')return {canRename:s.spaceOutlaws.shipNamingVersion===1&&ship.ownerType==='CHARACTER'&&ship.ownerId===c.id&&nameIdle(ship)&&s.stage==='EN_JEU'&&!s.safetyStop?.active&&available(s,c,time)&&!c.activeNavigationId&&!c.activeVoyageId&&characterPort(s,c)===ship.portId,targetingReady:!groupShip&&hasTargetedAmbushes(s),targetKnowledge:isPilot?await ambushKnowledgeOptions(tx,s,c):[],detour:groupShip?null:detourView(s,ship,c,time),convoyReady:!groupShip&&hasSoConvoy(s),convoyCode:isPilot?ship.convoy?.navigationCode??null:null,invitations:(await convoyInvitations(tx,s,c,time)).filter(o=>o.escortShipId===ship.id),session:{id:s.id,stage:s.stage},spaceOutlaws:true,logisticsReady:!groupShip&&s.spaceOutlaws.logisticsVersion===1,combatReady:!groupShip&&s.spaceOutlaws.combatVersion===1,ship:safeSoShip(s,ship,time),canPilot:isPilot,...(mandateChanged?{mandateChanged:true}:{}),canAct:isPilot&&!mandateChanged&&s.stage==='EN_JEU'&&!s.safetyStop?.active&&available(s,c,time),confirmation,lots:isPilot?(await tx.list(`${base}/inventory`)).filter(fuelAllowed).map(publicLot):[]};
   if(!admin)requireThat(isPilot,'FORBIDDEN');
   if(!['revokeSoCockpit','assignSoCockpit'].includes(action))requireThat(!ship.combatId&&!ship.rescueId&&(!ship.maintenanceId||towing&&ship.maintenanceId===towing.r.id),'SPACE_SHIP_BUSY');
   const cancelling=['revokeSoCockpit','cancelSoNavigation','cancelSoNavigationAdmin','leaveSoConvoy','leaveSoConvoyAdmin'].includes(action);
   if(cancelling){requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_NOT_RUNNING');}else active(s);
   if(!admin&&!cancelling)requireThat(available(s,c,time),'OUT_OF_COMBAT');
   if(['requestSoLaunch','assignSoCockpit','revokeSoCockpit'].includes(action)){
    requireThat(input.confirmation===confirmation,'STALE_REVISION');
    const a=ship.operation;
    const reconnect=action==='assignSoCockpit'&&!a&&!!ship.journey;
    if(reconnect){const pilot=await inventoryParty(tx,s.id,designatedPilot(ship));requireThat(pilot.active&&ship.cockpit?.pilotId===pilot.c.id,'INVALID_RECIPIENT');if(groupShip)requireThat(groupPilotGrant(s,group,pilot.c),'FORBIDDEN');}
    if(action!=='revokeSoCockpit'&&!reconnect){
     requireThat(a?.kind==='PREPARE'&&a.cockpit===true&&!ship.convoy,'COCKPIT_UNAVAILABLE');
     requireThat(time>=a.readyAtGameMs,'VOYAGE_NOT_READY');
     const pilot=await inventoryParty(tx,s.id,a.pilotId);
     requireThat(designatedPilot(ship)===a.pilotId&&pilot.active&&pilot.version===a.pilotVersion&&pilot.c.activeNavigationId===a.id&&available(s,pilot.c,time),'INVALID_RECIPIENT');
     if(groupShip)requireThat(groupPilotGrant(s,group,pilot.c)&&a.groupPilotGrant===groupPilotRevision(group,pilot.c),'FORBIDDEN');
     for(const m of a.manifest){const member=await inventoryParty(tx,s.id,m.id);requireThat(member.active&&member.version===m.version&&member.c.activeNavigationId===a.id&&!member.c.activeVoyageId&&available(s,member.c,time),'INVALID_MANIFEST');}
     requireThat(ship.enabled&&ship.docked&&!ship.journey&&ship.hull>=1&&!ship.revisionRequired&&ship.fuel>=routeFuelRequired(ship,a.route),'SHIP_UNAVAILABLE');
     requireThat(navigationSkill(pilot.c,'PIL-02')>=a.level,'FIELD_SKILL_REQUIRED');
     validateTowingConsent(towing);validateTowingDeparture(s,ship,towing);validateTowingRoute(a.route,towing,s);await validateModuleFlight(tx,s,ship);
    }
    if(action==='requestSoLaunch'){
     requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');requireThat(!ship.cockpit,'COCKPIT_REQUEST_EXISTS');
     const next={...ship,cockpit:{status:'WAITING',operationId:a.id,pilotId:a.pilotId,requestedAt:at},revision:ship.revision+1};
     tx.set(`${base}/ships/${ship.id}`,next);return audit({id:ship.id,status:'WAITING'},ship,next);
    }
    if(action==='assignSoCockpit'){
     requireThat(ship.cockpit?.status==='WAITING'&&(reconnect||ship.cockpit.operationId===a.id),'COCKPIT_UNAVAILABLE');
     const stationId=documentId(input.stationId),path=`${base}/cockpitStations/${stationId}`,old=await tx.get(path);
     const previous=old?.shipId?await tx.get(`${base}/ships/${old.shipId}`):null;
     requireThat(!previous?.operation&&!previous?.journey||previous?.id===ship.id&&previous.cockpit?.status==='WAITING','COCKPIT_OCCUPIED');
     const stations=await tx.list(`${base}/cockpitStations`);requireThat(old||stations.length<20,'COCKPIT_LIMIT');
     const next={...ship,cockpit:{...ship.cockpit,status:'ASSIGNED',stationId},revision:ship.revision+1};
     authorizeSpaceOutlaws(tx,s,'COCKPIT');
     tx.set(path,{id:stationId,shipId:ship.id,operationId:ship.cockpit.operationId});tx.set(`${base}/ships/${ship.id}`,next);
     return audit({id:ship.id,stationId,status:'ASSIGNED'},ship,next);
    }
    requireThat(ship.cockpit,'COCKPIT_UNAVAILABLE');
    const path=ship.cockpit.stationId?`${base}/cockpitStations/${ship.cockpit.stationId}`:null,old=path?await tx.get(path):null;
    const next={...ship,cockpit:a||ship.journey?{...ship.cockpit,status:'WAITING',stationId:null}:null,revision:ship.revision+1};
    authorizeSpaceOutlaws(tx,s,'COCKPIT');if(old?.operationId===ship.cockpit.operationId)tx.set(path,{id:old.id,shipId:null,operationId:null});
    tx.set(`${base}/ships/${ship.id}`,next);return audit({id:ship.id,status:'REVOKED'},ship,next);
   }
   if(detourFields[action]){const result=await detourCommand(tx,s,ship,c,version,input,action,id,at,dice?.[0],available);if(reads.has(action))return result;return audit(result,ship,null);}
   if(convoyFields[action]){if(action.startsWith('leaveSoConvoy')){requireThat(input.confirmation===confirmation,'STALE_REVISION');moneyText(input.reason);}const result=await convoyCommand(tx,s,ship,c,version,input,action,id,at);if(reads.has(action))return result;return audit(result,ship,null,{reason:input.reason??null});}
   if(['finishSoRefuel','finishSoPreparation',...['cancelSoNavigation','cancelSoNavigationAdmin']].includes(action)){
    requireThat(input.confirmation===confirmation,'STALE_REVISION');const a=ship.operation;requireThat(a,'NAVIGATION_OPERATION_CLOSED');
    const pilot=await inventoryParty(tx,s.id,a.pilotId),members=[];for(const m of a.manifest??[])members.push(await inventoryParty(tx,s.id,m.id));
    const pilotCharacter=pilot.c;requireThat(pilotCharacter?.activeNavigationId===a.id,'NAVIGATION_OPERATION_CLOSED');
    if(!cancelling&&groupShip)requireThat(a.groupPilotGrant===grant,'FORBIDDEN');
    if(!cancelling){requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');requireThat(pilot.active&&pilot.version===a.pilotVersion,'INVALID_RECIPIENT');requireThat(time>=a.readyAtGameMs,'VOYAGE_NOT_READY');}
    if(!cancelling&&a.kind==='PREPARE'&&a.cockpit){
     requireThat(ship.cockpit?.status==='ASSIGNED'&&ship.cockpit.operationId===a.id&&ship.cockpit.pilotId===c.id&&input.stationId===ship.cockpit.stationId,'COCKPIT_REQUIRED');
     const post=await tx.get(`${base}/cockpitStations/${documentId(input.stationId)}`);
     requireThat(post?.shipId===ship.id&&post.operationId===a.id,'COCKPIT_REQUIRED');
    }
    if(!cancelling&&a.kind==='PREPARE'&&ship.convoy){const result=await finishConvoy(tx,s,ship,at,id,dice,available);return audit(result,ship,null);}
    const clear={...pilotCharacter,activeNavigationId:null};let next={...ship,...(cancelling?{cockpit:null}:{}),operation:null,revision:ship.revision+1};
    if(a.kind==='REFUEL'){
     requireThat(cancelling||action==='finishSoRefuel','NAVIGATION_OPERATION_CLOSED');const lot=await tx.get(`${base}/inventory/${a.lotId}`);requireThat(lot?.status==='FIELD_RESERVED'&&lot.fieldActionId===a.id,'INVALID_FUEL');
     const quantity=lot.quantity-(cancelling?0:a.quantity);requireThat(quantity>=0,'INSUFFICIENT_STOCK');const nextLot={...lot,quantity,status:quantity?'AVAILABLE':'CONSUMED',fieldActionId:null,revision:lot.revision+1};
     if(!cancelling){requireThat(!hasItemCircuits(s)||a.escortContractId||personalLot(lot,pilotCharacter.id)&&lot.item.usage==='FUEL'&&lot.item.id===ship.navigation.fuelItemId&&(transferableItem(lot)||!groupShip&&ship.ownerId===pilotCharacter.id),'INVALID_FUEL');requireThat(ship.docked&&!ship.journey&&characterPort(s,pilotCharacter)===ship.portId,'SHIP_NOT_LOCAL');next.fuel=whole(ship.fuel+a.quantity,'INVALID_FUEL');requireThat(next.fuel<=ship.navigation.tankCapacity,'TANK_FULL');}
     if(a.escortContractId)await finishEscortRefuel(tx,s,ship,lot,cancelling,at,id,actor.uid);else{tx.set(`${base}/inventory/${lot.id}`,nextLot);tx.set(`${base}/inventory/${lot.id}/history/${id}`,{id,at,kind:action,before:lotState(lot),after:lotState(nextLot)});}tx.set(`${base}/characters/${pilotCharacter.id}`,clear);
    }else{
     requireThat(a.kind==='PREPARE'&&(cancelling||action==='finishSoPreparation'),'NAVIGATION_OPERATION_CLOSED');
     const points=actionPointState(s,pilotCharacter,await tx.get(actionPointPath(s.id,pilotCharacter.id)),at);
     if(!cancelling){requireThat(members.every((m,i)=>m.active&&m.version===a.manifest[i].version&&m.c.activeNavigationId===a.id&&!m.c.activeVoyageId&&available(s,m.c,time)),'INVALID_MANIFEST');requireThat(ship.hull>=1&&!ship.revisionRequired&&ship.fuel>=routeFuelRequired(ship,a.route),'SHIP_UNAVAILABLE');requireThat(navigationSkill(pilotCharacter,'PIL-02')>=a.level,'FIELD_SKILL_REQUIRED');}
     let j=null;
     if(!cancelling){validateTowingDeparture(s,ship,towing);validateTowingRoute(a.route,towing,s);await validateModuleFlight(tx,s,ship);const modules=eligibleFlightModules(s,ship,time),event=towingEvent(soVoyageEvent(a.route,dice[0],dice[1],ship.fuel-a.route.fuelCost,modules.length?modules[(dice[2]-1)%modules.length]:null),towing,ship.fuel-a.route.fuelCost),duration=a.route.durationSeconds+event.delaySeconds,suspended=event.needsMJ||event.fuelDebt>0;
      const transportManifest=await transportDeparture(tx,s,ship,a.route,id,at);
      j={...(towing?{towing:{workId:towing.r.id,wreckId:towing.wreck.id,lotId:towing.b.lotId,...(hasTowingOutages(s)?{outageVersion:1}:{})}}:{}),...(transportManifest.length?{transportManifest}:{}),...a.route,routeId:a.route.id,id,manifest:a.manifest.map(m=>({id:m.id,name:m.name})),...(s.spaceOutlaws.missionExecutionVersion===1?{missionManifest:a.manifest.map(m=>({id:m.id,version:m.version}))}:{}),pilotId:a.pilotId,departedAt:at,departedAtGameMs:time,arrivesAtGameMs:time+duration*1000,event,suspended,remainingMs:suspended?duration*1000:null};
      j=startTowingOutage(j,event,time);departTowedWreck(tx,s,towing,j,at);next=flightShip(s,{...neutralizeVoyageModule(s,next,event,time,id),fuel:ship.fuel-a.route.fuelCost-event.fuelCost,docked:false,journey:j},time);tx.set(`${base}/voyages/${id}`,{...j,shipId:ship.id,status:j.suspended?'SUSPENDED':'IN_TRANSIT'});await recordShipDeparture(tx,s,ship,pilotCharacter,j,at);if(towing)await recordShipDeparture(tx,s,towing.wreck,pilotCharacter,j,at);
     }
     for(const m of members){requireThat(m.c&&m.c.activeNavigationId===a.id,'INVALID_MANIFEST');tx.set(`${base}/characters/${m.c.id}`,{...m.c,activeNavigationId:null,...(j?{activeVoyageId:j.id}:{} )});}
     tx.set(actionPointPath(s.id,pilotCharacter.id),cancelling?releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,pilotCharacter)):resolveActionPoints(points,1));
    }
    tx.set(`${base}/ships/${ship.id}`,next);return audit({id:ship.id,status:cancelling?'CANCELLED':next.journey?'DEPARTED':'REFUELED'},ship,next,cancelling?{reason:moneyText(input.reason)}:{});
   }
   if(['prepareRefuel','refuelShip'].includes(action)){
    requireThat(ship.docked&&!ship.journey&&!ship.operation&&characterPort(s,c)===ship.portId&&!c.activeNavigationId&&!c.activeVoyageId,'SHIP_NOT_LOCAL');
    const lot=await tx.get(`${base}/inventory/${documentId(input.lotId)}`);requireThat(lot&&fuelAllowed(lot),'INVALID_FUEL');const quantity=itemQuantity(lot.item,input.quantity);requireThat(quantity<=lot.quantity,'INSUFFICIENT_STOCK');requireThat(ship.fuel+quantity<=ship.navigation.tankCapacity,'TANK_FULL');
    const consent=hash(JSON.stringify([confirmation,lot,quantity])),result={shipName:ship.name,quantity,fuelName:lot.item.name,before:ship.fuel,after:ship.fuel+quantity,capacity:ship.navigation.tankCapacity,durationSeconds:120,confirmation:consent};
    if(action==='prepareRefuel')return result;requireThat(input.confirmation===consent,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
    const operation={id,kind:'REFUEL',...(grant?{groupPilotGrant:grant}:{}),pilotId:c.id,pilotVersion:version,lotId:lot.id,quantity,readyAtGameMs:time+120000},next={...ship,operation,revision:ship.revision+1};
    tx.set(`${base}/ships/${ship.id}`,next);tx.set(`${base}/inventory/${lot.id}`,{...lot,status:'FIELD_RESERVED',fieldActionId:id,revision:lot.revision+1});tx.set(`${base}/characters/${c.id}`,{...c,activeNavigationId:id});return audit({id:ship.id,status:'REFUELING'},ship,next);
   }
   if(['prepareVoyage','departShip'].includes(action)){
    if(action==='departShip'&&input.cockpit!==undefined)requireThat(typeof input.cockpit==='boolean','INVALID_INPUT');
    const cockpitRequired=cockpitSettings?.enabled===true||input.cockpit===true;
    if(cockpitRequired)requireThat(!ship.convoy&&!ship.convoyOffer,'COCKPIT_CONVOY_PENDING');
    validateTowingDeparture(s,ship,towing);await validateModuleFlight(tx,s,ship);
    requireThat(ship.docked&&ship.enabled&&!ship.journey&&!ship.operation&&ship.hull>=1&&!ship.revisionRequired,'SHIP_UNAVAILABLE');requireThat(characterPort(s,c)===ship.portId,'SHIP_NOT_LOCAL');
    const code=admissionText(input.navigationCode,80,true),routes=await tx.list(`${base}/routes`),ports=await tx.list(`${base}/ports`);
    const candidates=routes.filter(r=>r.fromPort===ship.portId&&(r.navigationCode===code||ports.find(p=>p.id===r.toPort)?.navigationCode===code));requireThat(candidates.length===1,'ROUTE_UNAVAILABLE');const route=towingRoute(soRoute(candidates[0],ship),towing,s);requireThat(!ship.convoyOffer,'SO_CONVOY_NOT_READY');if(ship.convoy){await convoyFleet(tx,s,ship,time);requireThat(route.id===ship.convoy.routeId,'SO_CONVOY_ROUTE');}
    if(groupShip)requireThat(route.riskId==='SECURED','SO_GROUP_ROUTE_REQUIRED');
    const level=navigationSkill(c,'PIL-02');requireThat(level>=1&&level<=5,'FIELD_SKILL_REQUIRED');
    requireThat(Array.isArray(input.passengerCodes)&&input.passengerCodes.length<ship.soProfile.seats&&input.passengerCodes.every(x=>typeof x==='string'&&x.length<=128),'INVALID_MANIFEST');
    const characters=await tx.list(`${base}/characters`),ids=[c.id,...input.passengerCodes.map(code=>characters.find(x=>x.publicCode===code||x.id===code)?.id)];requireThat(ids.every(Boolean)&&new Set(ids).size===ids.length,'INVALID_MANIFEST');
    const manifest=[];for(const cid of ids){const p=await inventoryParty(tx,s.id,cid);requireThat(p.active&&!p.c.activeVoyageId&&!p.c.activeNavigationId&&!p.c.activeFieldActionId&&!p.c.activePersonActionId&&!p.c.activeAidId&&available(s,p.c,time)&&characterPort(s,p.c)===ship.portId,'INVALID_MANIFEST');manifest.push({id:cid,name:p.c.public.displayName,version:p.version,character:p.c});}
    requireThat(ship.fuel>=routeFuelRequired(ship,route),'INSUFFICIENT_FUEL');await transportDeparture(tx,s,ship,route,null,at);const stock=await warehouseStock(tx,s.id,ship.id,'HOLD');requireThat(stockVolume(stock)<=ship.capacity&&stock.every(l=>l.status==='AVAILABLE'||l.status==='SEIZED'),'CARGO_TRANSFERS_OPEN');requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(l=>l.kind==='HOLD'&&l.id===ship.id)),'CARGO_TRANSFERS_OPEN');
    const points=actionPointState(s,c,await tx.get(actionPointPath(s.id,c.id)),at);requireThat(points.available>=1,'NOT_ENOUGH_ACTION_POINTS');
    const consent=hash(JSON.stringify([confirmation,manifest,route,stock,points,...(cockpitSettings?.enabled?[true]:[])])),durationSeconds=[0,180,150,120,90,60][level];
    if(action==='prepareVoyage')return {cockpitAvailable:!ship.convoy,shipName:ship.name,route,manifest:manifest.map(m=>({id:m.id,name:m.name})),remainingFuel:ship.fuel-route.fuelCost,durationSeconds,cost:1,confirmation:consent};
    requireThat(input.confirmation===consent,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
    const operation={id,kind:'PREPARE',...(cockpitRequired?{cockpit:true}:{}),...(grant?{groupPilotGrant:grant}:{}),...(ship.convoy?{convoyId:ship.convoy.id}:{}),pilotId:c.id,pilotVersion:version,level,route,manifest:manifest.map(({character,...m})=>m),readyAtGameMs:time+durationSeconds*1000},next={...ship,cockpit:null,operation,revision:ship.revision+1};
    for(const m of manifest)tx.set(`${base}/characters/${m.id}`,{...m.character,activeNavigationId:id});tx.set(actionPointPath(s.id,c.id),reserveActionPoints(points,1));tx.set(`${base}/ships/${ship.id}`,next);return audit({id:ship.id,status:'PREPARING'},ship,next);
   }
   requireThat(input.confirmation===confirmation,'STALE_REVISION');const j=ship.journey;requireThat(j,'VOYAGE_CLOSED');
   if(action==='continueSoVoyage'){
    requireThat(ship.hull>0&&j.suspended&&(j.event.needsMJ||ship.convoy)&&j.event.fuelDebt===0,'VOYAGE_SUSPENDED');const reason=moneyText(input.reason);if(ship.convoy){const rows=await convoyFleet(tx,s,ship,time);requireThat(rows.every(x=>x.journey?.convoyId===ship.convoy.id&&x.journey.suspended&&x.hull>0&&!x.combatId&&!x.rescueId&&!x.maintenanceId&&x.journey.event.fuelDebt===0),'VOYAGE_SUSPENDED');for(const x of rows){const nextJourney={...x.journey,suspended:false,remainingMs:null,arrivesAtGameMs:time+x.journey.remainingMs,event:{...x.journey.event,needsMJ:false,resolvedAt:at}};tx.set(`${base}/ships/${x.id}`,{...x,journey:nextJourney,revision:x.revision+1});tx.set(`${base}/voyages/${nextJourney.id}`,{...nextJourney,shipId:x.id,status:'IN_TRANSIT'});}return audit({id:ship.convoy.id},ship,null,{reason});}const waiting=waitingTowingOutage(j,time),nextJourney={...j,suspended:waiting,remainingMs:waiting?j.remainingMs:null,arrivesAtGameMs:waiting?j.arrivesAtGameMs:time+j.remainingMs,event:{...j.event,needsMJ:false,resolvedAt:at}};
    const next={...ship,journey:nextJourney,revision:ship.revision+1};tx.set(`${base}/ships/${ship.id}`,next);tx.set(`${base}/voyages/${j.id}`,{...nextJourney,shipId:ship.id,status:nextJourney.suspended?'SUSPENDED':'IN_TRANSIT'});return audit({id:ship.id},ship,next,{reason});
   }
   requireThat(['arriveShip','arriveSoShipAdmin'].includes(action)&&!j.suspended&&ship.hull>0,'VOYAGE_SUSPENDED');requireThat(time>=j.arrivesAtGameMs,'VOYAGE_NOT_READY');
   if(ship.convoy){const rows=await convoyFleet(tx,s,ship,time);requireThat(rows.every(x=>x.journey?.convoyId===ship.convoy.id&&!x.journey.suspended&&x.hull>0&&!x.combatId&&!x.rescueId&&!x.maintenanceId&&time>=x.journey.arrivesAtGameMs),'VOYAGE_NOT_READY');const all=[];for(const x of rows)for(const m of x.journey.manifest){const ch=await tx.get(`${base}/characters/${m.id}`);requireThat(ch?.activeVoyageId===x.journey.id,'INVALID_MANIFEST');all.push({ch,toPort:x.journey.toPort});}for(const {ch,toPort} of all)tx.set(`${base}/characters/${ch.id}`,{...ch,activeVoyageId:null,spacePortId:toPort});for(const x of rows){tx.set(`${base}/ships/${x.id}`,{...x,...(hasHiddenCargo(s)?{portVisitId:x.journey.id}:{}),docked:true,portId:x.journey.toPort,journey:null,convoy:null,revision:x.revision+1});tx.set(`${base}/voyages/${x.journey.id}`,{...x.journey,shipId:x.id,status:'ARRIVED',closedAt:at});}return audit({id:ship.convoy.id,status:'ARRIVED'},ship,null);}
   const members=[];for(const m of j.manifest){const ch=await tx.get(`${base}/characters/${m.id}`);requireThat(ch?.activeVoyageId===j.id,'INVALID_MANIFEST');members.push(ch);}
   if(ship.ambushId){const ambush=await tx.get(`${base}/spaceAmbushes/${ship.ambushId}`);requireThat(s.spaceOutlaws.combatVersion===1&&ambush?.journeyId===j.id,'SPACE_SHIP_BUSY');authorizeSpaceOutlaws(tx,s,'SPACE_COMBAT');tx.set(`${base}/spaceAmbushes/${ambush.id}`,{...ambush,status:'EXPIRED',closedAt:at});}
   arriveTowedWreck(tx,s,towing,j,at);for(const m of members)tx.set(`${base}/characters/${m.id}`,{...m,activeVoyageId:null,spacePortId:j.toPort});const next={...ship,...(j.towing?{soProfile:flightShip(s,{...ship,journey:null},time).soProfile}:{}),...(hasHiddenCargo(s)?{portVisitId:j.id}:{}),docked:true,portId:j.toPort,journey:null,ambushId:null,revision:ship.revision+1};
   tx.set(`${base}/ships/${ship.id}`,next);tx.set(`${base}/voyages/${j.id}`,{...j,shipId:ship.id,status:'ARRIVED',closedAt:at});return audit({id:j.id,status:'ARRIVED'},ship,next,admin?{reason:moneyText(input.reason)}:{});
  });
 };
}
