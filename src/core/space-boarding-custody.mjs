import {stockVolume} from './storage-state.mjs';

const enabled=s=>s.spaceOutlaws?.boardingCargoVersion===1;
const safeId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id);
const tracked=l=>l.boardingCustody&&l.quantity>0&&!['CONSUMED','DESTROYED'].includes(l.status);
// Read-only projection shared by cargo administration and the native episode
// balance. It reports existing custody; no row grants permission to move a lot.
export function boardingCustodyReport(s,data,time){
 if(!enabled(s))return undefined;
 const ships=new Map(data.ships.map(x=>[x.id,x])),characters=new Map(data.characters.map(x=>[x.id,x])),registrations=new Map(data.registrations.map(x=>[x.uid,x])),ports=new Map(data.ports.map(x=>[x.id,x])),transfers=new Map(data.cargoTransfers.map(x=>[x.id,x])),entries=new Map(data.entries.map(x=>[x.path,x.data]));
 const shops=new Map(data.shops.map(x=>[x.id,x])),contracts=new Map(data.contracts.map(x=>[x.id,x]));
 const lots=data.inventory.filter(tracked).map(l=>{
  const custody=l.boardingCustody,ship=ships.get(l.location?.kind==='HOLD'?l.location.id:null),owner=characters.get(l.ownerId),isFreight=!!l.transportContractId,freight=isFreight&&contracts.get(l.transportContractId)?.terms?.transport?contracts.get(l.transportContractId):null,party=isFreight?characters.get(freight?.characterId):owner,shop=l.ownerType==='SHOP'?shops.get(l.ownerId):null,holder=characters.get(l.holderId),registration=registrations.get(party?.assignedUid),port=ports.get(ship?.portId),combat=entries.get(`spaceCombats/${custody.combatId}`),boarding=entries.get(`spaceCombats/${custody.combatId}/boardings/${custody.boardingId}`),transfer=transfers.get(l.cargoTransferId),alerts=[];
  if(!combat||!boarding||boarding.cargoVersion!==1||boarding.attackerShipId!==custody.receiverShipId||boarding.targetShipId!==custody.sourceShipId)alerts.push('DOSSIER_UNAVAILABLE');
  if(!ship)alerts.push('SHIP_UNAVAILABLE');
  if(l.location?.kind!=='HOLD'||l.location.id!==custody.receiverShipId)alerts.push('LOCATION_CHANGED');
  const active=party?.publicationState==='PUBLISHED'&&party.public?.publicationState==='PUBLISHED'&&registration?.status==='ACCEPTED'&&registration.accessActive&&registration.characterId===party.id;
  if(!active)alerts.push('OWNER_ACCESS_CHANGED');
  if(party?.survival?.dead)alerts.push('OWNER_DEAD');else if(party&&!(party.hp>0))alerts.push('OWNER_NO_HP');
  if(ship&&(ship.journey||!ship.docked||ship.operation||ship.combatId||ship.rescueId||ship.maintenanceId))alerts.push('SHIP_NOT_LOCAL');
  if(!port||port.versionId!==s.spaceOutlaws.versionId)alerts.push('PORT_UNAVAILABLE');
  if(party&&(party.activeVoyageId||(party.spacePortId??s.transportRules.homePort)!==ship?.portId))alerts.push('OWNER_NOT_LOCAL');
  const loading=l.status==='CARGO_RESERVED'&&transfer?.status==='LOADING'&&transfer.lotId===l.id&&transfer.quantity===l.quantity&&transfer.source?.kind===l.location?.kind&&transfer.source.id===l.location?.id&&transfer.boardingContext?.direction&&['RETURN','RETURN_SHOP'].includes(transfer.boardingContext.direction)&&transfer.boardingContext?.combatId===custody.combatId&&transfer.boardingContext.boardingId===custody.boardingId;
  if(l.status!=='AVAILABLE'&&!loading)alerts.push('LOT_UNAVAILABLE');
  if(isFreight){if(!freight)alerts.push('FREIGHT_CONTRACT_UNAVAILABLE');for(let i=0;i<alerts.length;i++)alerts[i]=alerts[i].replace('OWNER_','CARRIER_');const original=ships.get(freight?.terms?.transport?.shipId);if(!original||!original.docked||original.journey||original.portId!==ship?.portId)alerts.push('CARRIER_SHIP_NOT_LOCAL');}
  return {lotId:l.id,name:l.item.name,quantity:l.quantity,unit:l.item.unit,volume:stockVolume([l]),status:l.status,owner:{id:l.ownerId,name:shop?.name??owner?.public?.displayName??null},...(isFreight?{shopReturnReady:s.spaceOutlaws.boardingShopReturnVersion===1&&s.spaceOutlaws.boardingFreightVersion===1&&boarding?.shopReturnVersion===1&&boarding.freightVersion===1&&!!freight,carrier:{id:party?.id??null,name:party?.public?.displayName??null}}:{}),holder:{id:l.holderId??null,name:holder?.public?.displayName??null},ship:{id:ship?.id??null,name:ship?.name??null},port:{id:port?.id??null,name:port?.name??null},combatId:safeId(custody.combatId)?custody.combatId:null,boardingId:safeId(custody.boardingId)?custody.boardingId:null,alerts,loading:loading?{id:transfer.id,direction:transfer.boardingContext.direction,remainingSeconds:Math.max(0,Math.ceil((transfer.readyAtGameMs-time)/1000))}:null};
 }).sort((a,b)=>a.lotId.localeCompare(b.lotId));
 return {sessionId:s.id,lots,totalVolume:stockVolume(data.inventory.filter(tracked)),loading:lots.filter(l=>l.loading).length};
}
export async function readBoardingCustody(tx,s,time,{characters,ships,cargoTransfers}){
 if(!enabled(s))return undefined;
 const [inventory,registrations,ports,shops,contracts]=await Promise.all(['inventory','registrations','ports','shops','contracts'].map(k=>tx.list(`sessions/${s.id}/${k}`)));
 const paths=new Set();for(const l of inventory.filter(tracked)){const c=l.boardingCustody;if(safeId(c.combatId)&&safeId(c.boardingId)){paths.add(`spaceCombats/${c.combatId}`);paths.add(`spaceCombats/${c.combatId}/boardings/${c.boardingId}`);}}
 const entries=await Promise.all([...paths].map(async path=>({path,data:await tx.get(`sessions/${s.id}/${path}`)})));
 return boardingCustodyReport(s,{inventory,registrations,ports,shops,contracts,entries,characters,ships,cargoTransfers},time);
}
