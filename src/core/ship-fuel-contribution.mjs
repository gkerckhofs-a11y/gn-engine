import {requireThat,documentId} from './validation.mjs';
import {inventoryParty} from './inventory-transfers.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {hasItemCircuits} from './item-circuits.mjs';
import {personalTransferAllowed} from './personal-transfer-policy.mjs';
import {shipCrewAccess,shipPilot,requireCrewPilot,nativeShipReader,alive} from './ship-crew-state.mjs';
// A contribution is an ordinary, voluntary native handover to the pilot's bag.
// Only the subsequent native refueling operation reserves and consumes fuel.
export async function shipFuelContribution(tx,s,source,lot,recipientId,shipId,at){
 requireThat(s.spaceOutlaws?.navigationVersion===1,'SO_GAMEPLAY_NOT_OPEN');
 const ship=await tx.get(`sessions/${s.id}/ships/${documentId(shipId)}`);requireThat(ship?.soProfile,'NOT_FOUND');
 const access=await shipCrewAccess(tx,s,ship,source,at);requireThat((access.own||access.active)&&access.permissions.fuelContribution,'FORBIDDEN');
 requireThat(personalTransferAllowed(s,lot,source.id)&&lot.item.id===ship.navigation.fuelItemId&&(!hasItemCircuits(s)||lot.item.usage==='FUEL'),'INVALID_FUEL');
 requireThat(shipPilot(ship)===recipientId,'SHIP_PILOT_CHANGED');const pilot=await inventoryParty(tx,s.id,recipientId);requireThat(pilot.active&&alive(pilot.c),'INVALID_RECIPIENT');await requireCrewPilot(tx,s,ship,pilot.c,'prepareRefuel',at);requireThat((await nativeShipReader(tx,s,ship,pilot.c,at)).pilot,'SHIP_PILOT_CHANGED');
 return {shipId:ship.id,shipName:ship.name,pilotName:pilot.c.public.displayName,guard:hash(JSON.stringify([ship.id,ship.revision,access.root?.authorityRevision??0,access.member?.revision??0,access.party.version,pilot.version]))};
}
export const publicContribution=c=>c?{shipId:c.shipId,shipName:c.shipName,pilotName:c.pilotName}:undefined;
