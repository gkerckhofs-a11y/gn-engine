import {gameTime} from './clock.mjs';
import {soResolutionView} from './space-outlaws-mission-state.mjs';
import {hasMissionExecution} from './space-outlaws-mission-evidence.mjs';
import {hasSoEscort,escortFuelRemaining} from './space-escort.mjs';
import {hasSoTransport,transportDeliveryState} from './space-transport.mjs';
import {hasAppealFinance} from './space-contract-appeals.mjs';

// Read-only follow-up, shared by the live registry and the episode closing
// report. A task is not permission to pay, move stock or close a contract.
export function missionObligations(s,c,at,data={},party=null){
 if(s.spaceOutlaws?.missionsVersion!==1||c.terms.spaceOutlaws!==true)return null;
 const time=gameTime(s.clock,at),open=['ACTIVE','SUBMITTED','REVIEWED','DISPUTED'].includes(c.status),reviewed=['REVIEWED','DISPUTED'].includes(c.status);
 const salaryReserved=open?Math.max(0,c.terms.amount-(c.paidAmount??0)):0,salaryDisputed=reviewed?c.disputedAmount??0:0;
 const fuelReserved=hasSoEscort(s)?escortFuelRemaining(c):0;
 const rewards=hasMissionExecution(s)?(c.rewardReservations??[]).filter(r=>r.remaining>0).map(r=>({itemId:r.item.id,name:r.item.name,unit:r.item.unit,remaining:r.remaining,disputed:r.disputed})):[];
 const pickups=hasMissionExecution(s)?(c.rewardPickups??[]).filter(p=>p.pickupStatus!=='RECEIVED').map(p=>({id:p.id,name:p.item.name,unit:p.item.unit,quantity:p.quantity,shopId:p.shopId,shopName:p.shopName})):[];
 const salaryFree=reviewed?Math.max(0,salaryReserved-salaryDisputed):0,resolution=soResolutionView(s,c,at,true),tasks=[];
 const add=(kind,extra={})=>tasks.push({kind,...extra});
 if(c.status==='PROPOSED')add('ACCEPTANCE');
 if(c.status==='ACTIVE')add('MISSION',{remainingMs:Math.max(0,(c.deadlineGameMs??time)-time)});
 if(c.status==='SUBMITTED')add('REVIEW');
 if(reviewed&&(salaryFree>0||rewards.some(r=>r.remaining>r.disputed)||c.status==='REVIEWED'))add('SETTLEMENT',{remainingMs:resolution.settlement.contestRemainingMs??0});
 if(reviewed&&(salaryDisputed>0||rewards.some(r=>r.disputed>0)))add('MEDIATION',{remainingMs:Math.max(resolution.settlement.contestRemainingMs??0,resolution.settlement.mediationRemainingMs??0)});
 if(pickups.length)add('MATERIALS');
 if(fuelReserved>0)add('FUEL');
 let freight=null;
 if(hasSoTransport(s)&&c.terms.transport&&c.acceptedAt!=null){
  const lots=(data.inventory??[]).filter(l=>l.transportContractId===c.id&&l.quantity>0),transfers=(data.cargoTransfers??[]).filter(t=>t.transportContractId===c.id&&t.status==='LOADING'),delivery=transportDeliveryState(c,lots,transfers);
  freight={portId:c.terms.transport.toPort,expected:c.terms.transport.quantity,delivered:delivery.delivered,inCustody:lots.reduce((n,l)=>n+l.quantity,0)-delivery.delivered,loading:transfers.length,complete:delivery.complete};
  if(freight.inCustody>0||freight.loading>0)add('FREIGHT');
 }
 const appealStatus=c.appeal?.status??null,appealBalance=hasAppealFinance(s)&&c.appealBalance?.remaining>0?{direction:c.appealBalance.direction,remaining:c.appealBalance.remaining}:null;
 if(['PENDING','FOLLOW_UP'].includes(appealStatus))add('APPEAL');
 if(appealBalance)add('APPEAL_PAYMENT');
 const alerts=party?[...(!party.current?['ACCESS_CHANGED']:[]),...(party.c?.survival?.dead?['CHARACTER_DEAD']:[])]:[];
 return {pending:tasks.length>0,tasks,alerts,salaryReserved,salaryPaid:c.paidAmount??0,salaryFree,salaryDisputed,fuelReserved,reserved:salaryReserved+fuelReserved,rewards,pickups,freight,appealStatus,appealBalance};
}
