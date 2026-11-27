import {replayFlight} from '../shared/starfighter-asteroids.mjs';
import {requireThat} from './validation.mjs';
import {soVoyageEvent} from './space-outlaws-navigation-state.mjs';
import {spaceDistances} from '../shared/space-outlaws-navigation.mjs';

export const riskFaces=route=>route.eventFaces+spaceDistances.find(d=>d.id===route.distanceId).distanceFactor-1;
export const flightHazardFields={rollFlightRisk:['shipId','confirmation'],steerFlightHazard:['shipId','confirmation','wave','choice','trace']};

export function voyageEvent(route,dice,fuel,module,enabled){
 if(!enabled)return soVoyageEvent(route,dice[0],dice[1],fuel,module);
 const faces=riskFaces(route);
 const event=soVoyageEvent({...route,eventFaces:faces},dice[0],dice[1],fuel,module);
 event.riskFaces=faces;
 if(event.tableRoll!==4&&event.tableRoll!==6)return event;
 const asteroids=event.tableRoll===4;
 return {...event,label:asteroids?'Pluie d’astéroïdes au radar':'Signal d’un patrouilleur pirate PNJ',needsMJ:false,
  hazard:{kind:asteroids?'ASTEROIDS':'PIRATES',pattern:dice[3],wave:-1,savedSeconds:0,lastResult:null}};
}

export function hazardRadar(ship,time){
 const j=ship.journey,h=j?.event.hazard;
 if(!h)return null;
 if(j.intercepted||j.interceptionCovered||ship.combatId)return {phase:'OVERRIDDEN',kind:h.kind};
 const elapsed=(time-j.departedAtGameMs)/1000-30;
 const wave=Math.floor(elapsed/20),count=h.kind==='ASTEROIDS'?3:1;
 const phase=elapsed<0?'APPROACH':wave>=count||h.wave===count-1?'DONE':h.wave===wave?'WAIT':'ACTIVE';
 return {kind:h.kind,phase,wave,count,lastResult:h.lastResult,savedSeconds:h.savedSeconds,
  delaySeconds:j.event.delaySeconds,seconds:Math.max(0,Math.ceil(elapsed<0?-elapsed:(wave+1)*20-elapsed)),
  ...(phase==='ACTIVE'&&h.kind==='ASTEROIDS'?{seed:h.pattern*997+wave*313}:{})};
}

export function wavePenalty(j){
 const h=j.event.hazard;
 return (j.event.delaySeconds+h.savedSeconds+(h.recoveredSeconds??0))/3;
}

export function steerHazard(ship,time,input){
 const radar=hazardRadar(ship,time),j=ship.journey;
 requireThat(!j?.suspended&&radar?.phase==='ACTIVE'&&radar.wave===input.wave,'FLIGHT_WINDOW_CLOSED');
 const rocks=radar.kind==='ASTEROIDS';
 let cleared=false;
 if(rocks){
  requireThat(radar.seconds<=5,'FLIGHT_WINDOW_CLOSED');
  const flight=replayFlight(radar.seed,input.trace);
  requireThat(flight&&input.choice===undefined,'INVALID_INPUT');
  cleared=!flight.hit;
 }else requireThat(['HAIL','EVADE'].includes(input.choice)&&input.trace===undefined,'INVALID_INPUT');
 const saved=cleared?wavePenalty(j):0;
 const result=rocks?(cleared?'Champ franchi sans impact':'Collision · manœuvre de dégagement'):input.choice==='HAIL'?'Transpondeur reconnu. Le capitaine pirate vous laisse passer.':'Silence radio. Le patrouilleur perd votre trace.';
 const hazard={...j.event.hazard,...(rocks?{outcomes:{...j.event.hazard.outcomes,[input.wave]:cleared?'CLEAR':'HIT'}}:{}),wave:radar.wave,savedSeconds:j.event.hazard.savedSeconds+saved,lastResult:result};
 return {...j,arrivesAtGameMs:j.arrivesAtGameMs-saved*1000,event:{...j.event,delaySeconds:j.event.delaySeconds-saved,hazard}};
}
