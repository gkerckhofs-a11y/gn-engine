import {spaceShipProfiles,spaceDistances,spaceRisks} from '../shared/space-outlaws-navigation.mjs';
import {requireThat} from './validation.mjs';

export const hasSoNavigation=s=>s.spaceOutlaws?.navigationVersion===1;
export const navigationSkill=(c,id)=>c.abilityProfile?.published?c.abilityProfile.skills.find(k=>k.id===id)?.level??0:0;
export function soRoute(route,ship){
 const distance=spaceDistances.find(d=>d.id===route.distanceId),risk=spaceRisks.find(r=>r.id===route.riskId);
 requireThat(distance&&risk&&ship.soProfile,'INVALID_NAVIGATION');
 return {id:route.id,name:route.name,fromPort:route.fromPort,toPort:route.toPort,distanceId:distance.id,riskId:risk.id,durationSeconds:distance.durationSeconds,fuelCost:distance.distanceFactor*ship.soProfile.size,eventFaces:risk.eventFaces};
}
export function seedSoNavigation(tx,sid,changes,versionId){
 for(const c of changes.filter(c=>c.operation==='UPSERT')){
  const collection={shipModel:'shipModels',port:'ports',route:'routes',item:'items'}[c.type];if(!collection)continue;
  // Private codes stay on server. No ship, stock, cash or fuel is created here.
  const {gmNotes,masterArchived,publicationState,...data}=c.data;
  tx.set(`sessions/${sid}/${collection}/${c.entityId}`,{...data,versionId,revision:1});
 }
}
export function soShipProfile(model){
 const profile=spaceShipProfiles.find(p=>p.id===model?.profileId);requireThat(profile,'INVALID_SHIP');return {...profile};
}
const labels={SECURED:['Rencontre commerciale','Patrouille officielle','Appel de détresse','Retard de trois minutes','Surcharge de carburant','Alerte pirate sans interception'],DANGEROUS:['Renseignement commercial','Contrôle documentaire','Appel de détresse','Retard de cinq minutes','Module neutralisé','Menace pirate à préparer'],HOSTILE:['Balise abandonnée','Patrouille suspecte','Détresse potentiellement piégée','Retard de cinq minutes','Module neutralisé','Menace pirate à préparer']};
export function soVoyageEvent(route,roll,tableRoll,fuel){
 requireThat([roll,tableRoll].every(n=>Number.isInteger(n)&&n>=1&&n<=6),'INVALID_ROLL');
 if(roll>route.eventFaces)return {roll,tableRoll:null,label:'Aucun événement',delaySeconds:0,fuelCost:0,fuelDebt:0,needsMJ:false};
 const delaySeconds=tableRoll===4?(route.riskId==='SECURED'?180:300):tableRoll===5&&route.riskId!=='SECURED'?300:0;
 // This release provisions bare ships only: no eligible module => +5 min.
 const cost=tableRoll===5&&route.riskId==='SECURED'?1:0;
 return {roll,tableRoll,label:labels[route.riskId][tableRoll-1]+(tableRoll===5&&route.riskId!=='SECURED'?' : aucun module admissible, retard de cinq minutes':''),delaySeconds,fuelCost:Math.min(fuel,cost),fuelDebt:Math.max(0,cost-fuel),needsMJ:tableRoll<=3||tableRoll===6&&route.riskId!=='SECURED'};
}
