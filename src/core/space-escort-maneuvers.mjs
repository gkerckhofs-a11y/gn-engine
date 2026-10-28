import {navigationSkill} from './space-outlaws-navigation-state.mjs';

export const hasEscortManeuvers=s=>s.spaceOutlaws?.escortManeuverVersion===1&&s.spaceOutlaws?.convoyVersion===1;
export const escortOrder=o=>o?.kind==='ESC01';
export function escortRole(e,ship){
 return !!(e.convoyId&&ship&&ship.id!==e.shipIds[0]&&e.teams[ship.id]===e.teams[e.shipIds[0]]);
}
export function escortTargets(e,ships,ship){
 return escortRole(e,ship)?ships.filter(x=>x.id===e.shipIds[0]&&['CARGO','TRANSPORT'].includes(x.soProfile.id)&&(e.activeShipIds??e.shipIds).includes(x.id)&&x.hull>0):[];
}
export function escortManeuverView(e,ships,s,c,mine){
 if(!hasEscortManeuvers(s)||!escortRole(e,mine))return null;
 const level=navigationSkill(c,'ESC-01'),used=!!e.escortUses?.[mine.id],targets=escortTargets(e,ships,mine);
 return {level,used,targets:targets.map(x=>({id:x.id,name:x.name})),
  canInterpose:level>=1&&!used&&targets.length>0,
  canPrecombat:level>=4&&!used&&e.status==='ENCOUNTER'&&e.breakaway?.success===false&&targets.some(x=>x.id===e.breakaway.shipId),
  observations:level>=2?ships.filter(x=>e.teams[x.id]!==e.teams[mine.id]&&(e.activeShipIds??e.shipIds).includes(x.id)).map(x=>({id:x.id,name:x.name,category:x.soProfile.id,maneuverability:x.soProfile.maneuverability})):[]};
}
export function interposition(escort,level,roll,opposed){
 const bonus=level>=5?1:0,total=roll+escort.maneuverability+bonus;
 return {roll,bonus,total,opposed,success:total>opposed};
}
