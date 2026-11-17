import {documentId,requireThat} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
import {inventoryHash as hash,publicLot,lotState} from './inventory-state.mjs';
import {warehouseStock} from './storage-state.mjs';
import {activeModuleOutages} from './space-module-flight.mjs';
import {installedModuleLot} from './space-module-mandates.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {gameTime} from './clock.mjs';

export const vaultCargoActions=['vaultCargo','prepareVaultCargo','setVaultCargo'];
export const lockedInVault=(lot,shipId)=>lot.vaultCargo?.shipId===shipId&&lot.location?.kind==='HOLD'&&lot.location.id===shipId;
const free=ship=>ship?.enabled&&ship.docked&&!ship.journey&&!ship.operation&&!ship.combatId&&!ship.rescueId&&!ship.maintenanceId;
export function createVaultCargoService({store,signed,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId','shipId',...(['prepareVaultCargo','setVaultCargo'].includes(action)?['lotId','secure']:[]),...(action==='setVaultCargo'?['confirmation','present','requestId']:[])]);
  const at=now(),id=uuid();
  return store.runTransaction(async tx=>{
   const {s,c,version}=await inventoryPlayer(tx,actor,input),base=`sessions/${s.id}`,time=gameTime(s.clock,at);
   requireThat(s.spaceOutlaws?.secureVaultVersion===1&&s.spaceOutlaws.moduleFlightVersion===1,'SO_GAMEPLAY_NOT_OPEN');
   const ship=await tx.get(`${base}/ships/${documentId(input.shipId)}`);
   requireThat((ship?.ownerType??'CHARACTER')==='CHARACTER'&&ship?.ownerId===c.id,'FORBIDDEN');
   const module=ship.modules?.find(m=>m.code==='R04-02'&&['OPERATIONAL','DAMAGED'].includes(m.status));
   requireThat(module&&ship.moduleInstallationVersion===1,'VAULT_UNAVAILABLE');
   const moduleLot=await tx.get(`${base}/inventory/${module.lotId}`);
   requireThat(installedModuleLot(ship,moduleLot,{durableModules:s.spaceOutlaws.moduleRepairVersion===1})&&moduleLot.origin?.kind==='SHIP_RARE_FABRICATION','VAULT_UNAVAILABLE');
   const stock=await warehouseStock(tx,s.id,ship.id,'HOLD');
   const secured=stock.filter(l=>lockedInVault(l,ship.id)),used=secured.reduce((n,l)=>n+l.quantity,0);
   requireThat(used<=5,'VAULT_CAPACITY');
   if(action==='vaultCargo')return {session:{id:s.id,stage:s.stage},ship:{id:ship.id,name:ship.name},capacity:5,used,lots:stock.filter(l=>l.ownerId===c.id&&(l.ownerType??'CHARACTER')==='CHARACTER').map(l=>({...publicLot(l),secured:lockedInVault(l,ship.id)}))};
   const op=action==='setVaultCargo'?`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`:null,fingerprint=hash(JSON.stringify([action,input]));
   if(op){const prior=await tx.get(op);if(prior){requireThat(prior.fingerprint===fingerprint&&prior.guard===version,'FORBIDDEN');return prior.result;}}
   const lot=stock.find(l=>l.id===documentId(input.lotId));
   requireThat(lot&&lot.ownerId===c.id&&(lot.ownerType??'CHARACTER')==='CHARACTER'&&lot.status==='AVAILABLE'&&!lot.cargoTransferId&&!lot.fieldActionId&&!lot.sabotageActionId&&!lot.boardingCustody&&!lot.transportContractId,'VAULT_CARGO_UNAVAILABLE');
   requireThat(typeof input.secure==='boolean'&&input.secure!==lockedInVault(lot,ship.id),'VAULT_CARGO_UNAVAILABLE');
   if(input.secure)requireThat(lot.quantity>0&&lot.quantity<=5-used&&module.status==='OPERATIONAL'&&!activeModuleOutages(ship,time).some(n=>n.lotId===module.lotId),'VAULT_CAPACITY');
   const confirmation=hash(JSON.stringify([s.id,s.revision,ship.id,ship.revision,module.lotId,lot.id,lot.revision,used,input.secure,version]));
   if(action==='prepareVaultCargo')return {lotId:lot.id,name:lot.item.name,quantity:lot.quantity,secure:input.secure,used,remaining:5-used,confirmation};
   requireThat(s.stage==='EN_JEU'&&!s.safetyStop?.active&&free(ship)&&(c.spacePortId??s.transportRules?.homePort)===ship.portId&&c.hp>0&&!c.outOfCombat&&!c.survival?.dead,'VAULT_UNAVAILABLE');
   requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
   const next={...lot,vaultCargo:input.secure?{shipId:ship.id,moduleLotId:module.lotId}:null,revision:lot.revision+1};
   authorizeSpaceOutlaws(tx,s,'VAULT_CARGO');tx.set(`${base}/inventory/${lot.id}`,next);tx.set(`${base}/inventory/${lot.id}/history/${id}`,{id,kind:action,at,actorUid:actor.uid,before:lotState(lot),after:lotState(next),secured:input.secure});tx.set(`${base}/ships/${ship.id}`,{...ship,revision:ship.revision+1});tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,shipId:ship.id,lotId:lot.id,secured:input.secure});const result={id:lot.id,secured:input.secure};tx.set(op,{fingerprint,guard:version,result,at});return result;
  });
 };
}
