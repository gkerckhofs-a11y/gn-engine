import {randomInt} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {moneyText} from './economy-state.mjs';
import {gameTime} from './clock.mjs';
import {navigationSkill} from './space-outlaws-navigation-state.mjs';
import {actionPointPath,actionPointState,reserveActionPoints,resolveActionPoints,releaseActionPoints,spendActionPoints,actionPointMaximum} from './action-point-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {hasSoCombat,spaceOrderInput,spaceSpecialLevel,pauseSpaceJourney,resumeSpaceJourney,resolveSpaceDuel} from './space-combat-state.mjs';

const fields={spaceCombats:[],spaceCombatAdmin:[],spaceCombat:['combatId'],prepareSpaceAmbush:['shipId','navigationCode'],armSpaceAmbush:['shipId','navigationCode','confirmation','present'],cancelSpaceAmbush:['shipId','confirmation'],prepareSpaceInterception:['shipId'],triggerSpaceInterception:['shipId','confirmation','reason'],startSpaceCombat:['combatId','confirmation','reason','briefed'],spaceBreakaway:['combatId','shipId','confirmation'],consentSpacePeace:['combatId','shipId','confirmation','agree'],submitSpaceOrder:['combatId','shipId','confirmation','order'],resolveSpaceRound:['combatId','shipId','confirmation'],resolveSpaceRoundAdmin:['combatId','confirmation']};
export const spaceCombatActions=Object.keys(fields);
const admins=new Set(['spaceCombatAdmin','prepareSpaceInterception','triggerSpaceInterception','startSpaceCombat','resolveSpaceRoundAdmin']);
const reads=new Set(['spaceCombats','spaceCombatAdmin','spaceCombat','prepareSpaceAmbush','prepareSpaceInterception']);
const active=s=>{requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');};
const fit=(c,time)=>c?.hp>0&&!c.outOfCombat&&!c.survival?.dead&&!c.activeAidId&&!c.activeFieldActionId&&!c.activePersonActionId&&!c.activeNavigationId&&!(c.convalescentUntilGameMs>time);
const inTransit=(ship,time)=>!!ship?.journey&&!ship.docked&&!ship.operation&&!ship.combatId&&!ship.rescueId&&ship.hull>0&&(ship.journey.suspended||time<ship.journey.arrivesAtGameMs);
const normal=o=>({kind:'PASSIVE',fallback:'PASSIVE',acceptSurrender:false,ceasefire:false,...o});
const visible=(e,ships,c)=>e.participants.includes(c.id)||ships.some(s=>s.ownerId===c.id||s.pilotId===c.id);
const ownShip=(ships,c)=>ships.find(s=>s.pilotId===c?.id);
const publicRound=r=>r?{...r,after:r.after.map(({id,hull,shield,revisionRequired})=>({id,hull,shield,revisionRequired}))}:null;
const proof=(e,ships,s,ctx)=>ctx.c?hash(JSON.stringify([s.id,s.revision,e.id,e.status,e.round,e.deadline,ownShip(ships,ctx.c),e.orders[ownShip(ships,ctx.c)?.id]??null,e.peace[ownShip(ships,ctx.c)?.id]??false,ctx.version])):hash(JSON.stringify([s.id,s.revision,e,ships]));
function projection(e,ships,s,ctx,time){
 const mine=ownShip(ships,ctx.c),o=mine?e.orders[mine.id]:null;
 return {id:e.id,status:e.status,round:e.round,quietRounds:e.quietRounds,remainingSeconds:e.status==='ROUND'?Math.max(0,Math.ceil((e.deadline-time)/1000)):null,reason:e.status==='CLOSED'?e.reason:null,ships:ships.map(x=>({id:x.id,name:x.name,hull:x.hull,shield:x.shield,...(x.id===mine?.id?{maneuverability:x.soProfile.maneuverability,fuel:x.fuel,pil03Used:!!x.journey?.pil03Used}:{} )})),ownShipId:mine?.id??null,canOrder:!!mine&&fit(ctx.c,time)&&s.stage==='EN_JEU'&&!s.safetyStop?.active,skillLevel:mine?navigationSkill(ctx.c,'PIL-03'):0,ownOrder:o?{kind:o.kind,fallback:o.fallback,acceptSurrender:o.acceptSurrender,ceasefire:o.ceasefire}:null,surrenderOffers:e.shipIds.filter(id=>e.orders[id]?.kind==='SURRENDER'),peaceAccepted:mine?!!e.peace[mine.id]:false,breakaway:e.breakaway??null,victimId:e.shipIds[0],lastRound:publicRound(e.lastRound),confirmation:proof(e,ships,s,ctx)};
}
export function createSpaceCombatService({store,signed,checkSession,now,uuid,rollD6=()=>randomInt(1,7)}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);const at=now(),id=uuid(),dice=['resolveSpaceRound','resolveSpaceRoundAdmin'].includes(action)?Array.from({length:8},()=>rollD6()):action==='spaceBreakaway'?[rollD6()]:[],choices=new Map();
  return store.runTransaction(async tx=>{
   const admin=admins.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`,time=gameTime(s.clock,at);requireThat(hasSoCombat(s),'SO_GAMEPLAY_NOT_OPEN');
   const loadShips=async e=>{const out=[];for(const sid of e.shipIds){const ship=await tx.get(`${base}/ships/${sid}`);requireThat(ship?.soProfile,'CARGO_UNAVAILABLE');out.push(ship);}return out;};
   if(action==='spaceCombats'||action==='spaceCombatAdmin'){
    const combats=[];for(const e of await tx.list(`${base}/spaceCombats`)){const ships=await loadShips(e);if(admin||visible(e,ships,c))combats.push(projection(e,ships,s,ctx,time));}
    const fleet=await tx.list(`${base}/ships`),ambushes=[];for(const a of await tx.list(`${base}/spaceAmbushes`)){const ship=fleet.find(x=>x.id===a.shipId);if(a.status==='ACTIVE'&&ship?.journey?.id===a.journeyId&&(admin||ship.pilotId===c.id))ambushes.push({id:a.id,shipId:a.shipId,name:ship.name,confirmation:hash(JSON.stringify([s.revision,ship,a,version??null]))});}
    return {session:{id:s.id,stage:s.stage},admin,combats,ambushes,...(admin?{ships:fleet.filter(x=>inTransit(x,time)&&!x.journey.intercepted).map(x=>({id:x.id,name:x.name}))}:{})};
   }
   let e,ships;
   if(input.combatId){e=await tx.get(`${base}/spaceCombats/${documentId(input.combatId)}`);requireThat(e,'SPACE_COMBAT_CLOSED');ships=await loadShips(e);requireThat(admin||visible(e,ships,c),'FORBIDDEN');if(action==='spaceCombat')return {session:{id:s.id,stage:s.stage},admin:false,combat:projection(e,ships,s,ctx,time)};}
   let ship=input.shipId?await tx.get(`${base}/ships/${documentId(input.shipId)}`):null;
   if(!admin&&action!=='spaceCombat'){requireThat(ship?.pilotId===c.id&&(!e||e.shipIds.includes(ship.id)),'FORBIDDEN');}
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input]));
   if(op){const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===version,'FORBIDDEN');return old.result;}}
   active(s);
   const audit=(result,before,after,extra={})=>{authorizeSpaceOutlaws(tx,s,'SPACE_COMBAT');tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,before,after,...extra});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});tx.set(op,{fingerprint,guard:version??null,result,at});return result;};
   const saveShip=x=>{tx.set(`${base}/ships/${x.id}`,x);if(x.journey)tx.set(`${base}/voyages/${x.journey.id}`,{...x.journey,shipId:x.id,status:x.journey.suspended?'SUSPENDED':'IN_TRANSIT'});};
   const close=(record,current,reason)=>{const next={...record,status:'CLOSED',reason,closedAt:at,revision:record.revision+1};for(const x of current)saveShip(resumeSpaceJourney({...x,combatId:null,combatFuelReserved:0,revision:x.revision+1},time));tx.set(`${base}/spaceCombats/${record.id}`,next);return next;};
   if(['prepareSpaceAmbush','armSpaceAmbush','cancelSpaceAmbush'].includes(action)){
    requireThat(fit(c,time),'OUT_OF_COMBAT');const existing=ship?.ambushId?await tx.get(`${base}/spaceAmbushes/${ship.ambushId}`):null;
    if(action==='cancelSpaceAmbush'){requireThat(existing?.status==='ACTIVE','SPACE_AMBUSH_CLOSED');requireThat(input.confirmation===hash(JSON.stringify([s.revision,ship,existing,version])),'STALE_REVISION');tx.set(`${base}/spaceAmbushes/${existing.id}`,{...existing,status:'CANCELLED',closedAt:at});tx.set(`${base}/ships/${ship.id}`,{...ship,ambushId:null,revision:ship.revision+1});return audit({id:existing.id,status:'CANCELLED'},existing,null);}
    requireThat(inTransit(ship,time)&&!ship.journey.suspended&&!ship.journey.intercepted&&!ship.ambushId,'SPACE_SHIP_BUSY');requireThat(navigationSkill(c,'PIL-02')>=1,'FIELD_SKILL_REQUIRED');
    const code=admissionText(input.navigationCode,80,true),route=await tx.get(`${base}/routes/${documentId(ship.journey.routeId)}`),port=await tx.get(`${base}/ports/${ship.journey.toPort}`);requireThat(route&&(route.navigationCode===code||port?.navigationCode===code),'ROUTE_UNAVAILABLE');
    const confirmation=hash(JSON.stringify([s.revision,ship,route,version])),result={shipId:ship.id,name:ship.name,routeName:route.name,confirmation};if(action==='prepareSpaceAmbush')return result;
    requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');const a={id,shipId:ship.id,journeyId:ship.journey.id,routeId:route.id,kind:'OPPORTUNISTIC',status:'ACTIVE',pilotId:c.id,pilotVersion:version,createdAt:at};tx.set(`${base}/spaceAmbushes/${id}`,a);tx.set(`${base}/ships/${ship.id}`,{...ship,ambushId:id,revision:ship.revision+1});return audit({id,status:'ACTIVE'},null,a);
   }
   if(['prepareSpaceInterception','triggerSpaceInterception'].includes(action)){
    requireThat(inTransit(ship,time)&&!ship.journey.intercepted,'SPACE_INTERCEPTION_USED');const victim=await inventoryParty(tx,s.id,ship.pilotId);requireThat(victim.active,'INVALID_RECIPIENT');
    const fleet=await tx.list(`${base}/ships`),pool=[];for(const a of await tx.list(`${base}/spaceAmbushes`)){const p=fleet.find(x=>x.id===a.shipId);if(a.status!=='ACTIVE'||a.kind!=='OPPORTUNISTIC'||p?.id===ship.id||p?.journey?.id!==a.journeyId||p?.journey?.routeId!==ship.journey.routeId||!inTransit(p,time)||p.journey.suspended||p.journey.intercepted)continue;const actor=await inventoryParty(tx,s.id,p.pilotId);if(actor.active&&actor.version===a.pilotVersion&&fit(actor.c,time))pool.push({a,ship:p});}
    pool.sort((a,b)=>a.a.id.localeCompare(b.a.id));requireThat(pool.length,'SPACE_NO_AMBUSH');const confirmation=hash(JSON.stringify([s.revision,ship,pool]));if(action==='prepareSpaceInterception')return {shipId:ship.id,name:ship.name,candidates:pool.map(x=>({id:x.ship.id,name:x.ship.name})),confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');const reason=moneyText(input.reason),key=pool.map(x=>x.a.id).join(':');if(!choices.has(key))choices.set(key,randomInt(pool.length));const index=choices.get(key),chosen=pool[index],both=[ship,chosen.ship];
    const priorVictimAmbush=ship.ambushId?await tx.get(`${base}/spaceAmbushes/${ship.ambushId}`):null;
    const combat={id,status:'ENCOUNTER',shipIds:both.map(x=>x.id),participants:[...new Set(both.flatMap(x=>x.journey.manifest.map(m=>m.id)))],round:0,quietRounds:0,orders:{},peace:{},revision:1,createdAt:at,selection:{kind:'OPPORTUNISTIC',candidateIds:pool.map(x=>x.a.id),selectedIndex:index,ambushId:chosen.a.id},reason};
    for(const x of both)saveShip({...pauseSpaceJourney(x,time),combatId:id,ambushId:null,revision:x.revision+1,journey:{...pauseSpaceJourney(x,time).journey,intercepted:true}});
    tx.set(`${base}/spaceAmbushes/${chosen.a.id}`,{...chosen.a,status:'CONSUMED',combatId:id,closedAt:at});if(priorVictimAmbush?.status==='ACTIVE')tx.set(`${base}/spaceAmbushes/${priorVictimAmbush.id}`,{...priorVictimAmbush,status:'INTERCEPTED',closedAt:at});tx.set(`${base}/spaceCombats/${id}`,combat);return audit({id,status:'ENCOUNTER'},null,combat,{reason});
   }
   requireThat(e&&e.status!=='CLOSED'&&ships.every(x=>x.combatId===e.id),'SPACE_COMBAT_CLOSED');requireThat(input.confirmation===proof(e,ships,s,ctx),'STALE_REVISION');
   if(action==='startSpaceCombat'){
    requireThat(e.status==='ENCOUNTER','SPACE_COMBAT_PHASE');requireThat(input.briefed===true,'FIELD_PRESENCE_REQUIRED');const reason=moneyText(input.reason),next={...e,status:'ROUND',round:1,deadline:time+90000,revision:e.revision+1};tx.set(`${base}/spaceCombats/${e.id}`,next);return audit({id:e.id,status:'ROUND'},e,next,{reason});
   }
   if(action==='consentSpacePeace'){
    requireThat(e.status==='ENCOUNTER'&&typeof input.agree==='boolean','SPACE_COMBAT_PHASE');const next={...e,peace:{...e.peace,[ship.id]:input.agree},revision:e.revision+1};const done=e.shipIds.every(id=>next.peace[id]);if(done)close(next,ships,'CEASEFIRE');else tx.set(`${base}/spaceCombats/${e.id}`,next);return audit({id:e.id,status:done?'CLOSED':'ENCOUNTER'},e,next);
   }
   if(action==='spaceBreakaway'){
    requireThat(e.status==='ENCOUNTER'&&ship.id===e.shipIds[0]&&!e.breakaway,'SPACE_COMBAT_PHASE');requireThat(fit(c,time),'OUT_OF_COMBAT');requireThat(navigationSkill(c,'PIL-03')>=1&&navigationSkill(c,'PIL-02')>=1,'FIELD_SKILL_REQUIRED');requireThat(!ship.journey.pil03Used,'SPACE_SPECIAL_USED');const points=actionPointState(s,c,await tx.get(actionPointPath(s.id,c.id)),at);const paid=spendActionPoints(points,1),roll=dice[0];requireThat(Number.isInteger(roll)&&roll>=1&&roll<=6,'INVALID_DIE');const total=roll+ship.soProfile.maneuverability,success=total>=6,nextShip={...ship,journey:{...ship.journey,pil03Used:true},revision:ship.revision+1},next={...e,breakaway:{shipId:ship.id,roll,total,success},revision:e.revision+1};tx.set(actionPointPath(s.id,c.id),paid);if(success)close(next,ships.map(x=>x.id===ship.id?nextShip:x),'BREAKAWAY');else {saveShip(nextShip);tx.set(`${base}/spaceCombats/${e.id}`,next);}return audit({id:e.id,roll,total,success},e,next);
   }
   if(action==='submitSpaceOrder'){
    requireThat(e.status==='ROUND'&&time<e.deadline,'SPACE_ROUND_LOCKED');requireThat(fit(c,time)&&ship.hull>0,'OUT_OF_COMBAT');const order=spaceOrderInput(input.order),level=spaceSpecialLevel(order),old=e.orders[ship.id];
    let points=actionPointState(s,c,await tx.get(actionPointPath(s.id,c.id)),at);if(old?.specialReserved)points=releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,c));
    if(level){requireThat(navigationSkill(c,'PIL-03')>=level&&navigationSkill(c,'PIL-02')>=1,'FIELD_SKILL_REQUIRED');requireThat(!ship.journey.pil03Used,'SPACE_SPECIAL_USED');if(level===4)requireThat(ship.fuel>=1,'INSUFFICIENT_FUEL');points=reserveActionPoints(points,1);}
    const next={...e,orders:{...e.orders,[ship.id]:{...order,actorId:c.id,actorVersion:version,specialReserved:!!level,level,revision:(old?.revision??0)+1}},revision:e.revision+1};if(level||old?.specialReserved)tx.set(actionPointPath(s.id,c.id),points);saveShip({...ship,combatFuelReserved:level===4?1:0,revision:ship.revision+1});tx.set(`${base}/spaceCombats/${e.id}`,next);return audit({id:e.id,round:e.round},null,null);
   }
   requireThat(['resolveSpaceRound','resolveSpaceRoundAdmin'].includes(action)&&e.status==='ROUND','SPACE_COMBAT_PHASE');requireThat(time>=e.deadline,'SPACE_ROUND_PENDING');
   const actors=[],orders=[],points=[];for(const x of ships){const p=await inventoryParty(tx,s.id,x.pilotId),o=e.orders[x.id];actors.push(p);const valid=p.active&&(!o||p.version===o.actorVersion)&&fit(p.c,time)&&(!o?.level||navigationSkill(p.c,'PIL-03')>=o.level&&navigationSkill(p.c,'PIL-02')>=1);orders.push(valid?normal(o):normal());points.push(o?.specialReserved?actionPointState(s,p.c,await tx.get(actionPointPath(s.id,p.c.id)),at):null);}
   const result=resolveSpaceDuel(ships.map(x=>({id:x.id,hull:x.hull,shield:x.shield,fuel:x.fuel,maneuverability:x.soProfile.maneuverability,weapon:'STANDARD',revisionRequired:x.revisionRequired})),orders,dice,e.quietRounds),after=ships.map((x,i)=>({...x,hull:result.after[i].hull,shield:result.after[i].shield,fuel:result.after[i].fuel,revisionRequired:result.after[i].revisionRequired,combatFuelReserved:0,journey:{...x.journey,pil03Used:!!x.journey.pil03Used||result.used[i]},revision:x.revision+1}));
   for(let i=0;i<2;i++)if(points[i])tx.set(actionPointPath(s.id,actors[i].c.id),result.used[i]?resolveActionPoints(points[i],1):releaseActionPoints(points[i],1,actionPointMaximum(s.actionPointRules,actors[i].c)));
   const round={id:String(e.round),round:e.round,at,orders:orders.map((o,i)=>({shipId:ships[i].id,kind:o.kind,fallback:o.fallback})),shots:result.shots,rolls:result.rolls,hostile:result.hostile,quietRounds:result.quietRounds,escaped:result.escaped,after:result.after,reason:result.reason};tx.set(`${base}/spaceCombats/${e.id}/rounds/${e.round}`,round);
   let next={...e,quietRounds:result.quietRounds,lastRound:round,orders:{},revision:e.revision+1};if(result.closed)next=close(next,after,result.reason);else {next={...next,round:e.round+1,deadline:time+90000};for(const x of after)saveShip(x);tx.set(`${base}/spaceCombats/${e.id}`,next);}return audit({id:e.id,status:next.status,round:e.round,result:publicRound(round)},null,null);
  });
 };
}
