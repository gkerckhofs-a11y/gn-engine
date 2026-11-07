import {escapeHtml as esc} from './groups.mjs';

export const towingCombatErrors={
 TOWING_COMBAT_NOT_OPEN:'Le largage n’est pas disponible pour cette rencontre. Actualisez.',
 TOWING_RESERVATION:'L’attelage ou sa position a changé. Actualisez avant de confirmer.',
 TOWING_MODULE_UNAVAILABLE:'Le module de remorquage n’est plus disponible. Contactez la régie.',
};

export function towingCombatHtml(e,p,admin=false){
 const releases=(e.towingReleases??[]).filter(r=>['TOWING_DROPPED','TOWING_INTERRUPTED_ZERO_HULL'].includes(r.reason));
 const results=releases.map(r=>`<section class="space-towing" aria-label="Résultat du remorquage"><h3>${r.reason==='TOWING_DROPPED'?'Épave larguée':'Remorquage interrompu : Coque à zéro'}</h3>${admin?`<p>Remorqueur : ${esc(e.ships.find(s=>s.id===r.shipId)?.name??'Vaisseau de la rencontre')}.</p>`:''}<p>L’épave reste dans la zone de la rencontre. Elle conserve son propriétaire, son fret et son état. Elle ne suit plus l’arrivée du remorqueur.</p><p>Impossible de la raccrocher pendant ce même affrontement.</p></section>`).join('');
 if(admin||!e.towing||!e.ownShipId||!['ENCOUNTER','ROUND'].includes(e.status))return results;
 const canDrop=e.towing.canDrop===true&&e.towing.cost===0&&e.canOrder===true;
 return `${results}<section class="space-towing" aria-label="Remorquage"><h3>Remorquage en cours</h3><p>Conserver l’attelage maintient la pénalité de manœuvrabilité : −1, minimum 0.</p><p>Larguer l’épave rétablit immédiatement votre manœuvrabilité normale, sans PA ni dé, avant la résolution du round. Un ordre déjà enregistré reste en place.</p><p>L’épave reste dans la zone de la rencontre, avec son propriétaire, son fret et son état. Impossible de la raccrocher pendant ce même affrontement.</p>${canDrop?`<form data-form="spaceCommand" data-command="dropTowedWreck" data-payload="${esc(JSON.stringify({sessionId:p.sessionId,combatId:e.id,shipId:e.ownShipId,confirmation:e.confirmation}))}"><label class="check"><input name="present" type="checkbox" required>Je suis présent et je confirme le largage de l’épave.</label><button class="primary">Larguer l’épave — 0 PA</button></form>`:'<p>Le largage est actuellement indisponible. Actualisez pour vérifier la situation.</p><button disabled>Largage indisponible</button>'}</section>`;
}
