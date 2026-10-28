import {requireThat,whole} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {accountId,moneyState,writeLedger} from './economy-state.mjs';
import {accountEntry} from './collective-accounts.mjs';
import {participantCurrent} from './mission-parties.mjs';
import {soMissionFunding} from './space-outlaws-mission-state.mjs';
import {requireGameAction} from './health-state.mjs';
import {admissionKeys} from './admission-state.mjs';

export const appealFinanceAdminActions=['prepareContractAppealAdjustment','adjustContractAppeal','prepareContractAppealPaymentAdmin','payContractAppealAdmin'];
export const appealFinanceActions=[...appealFinanceAdminActions,'prepareContractAppealPayment','payContractAppeal'];
export const hasAppealFinance=s=>s.spaceOutlaws?.appealFinanceVersion===1&&s.spaceOutlaws.missionsVersion===1;
export const requireAppealFinance=s=>requireThat(hasAppealFinance(s),'SO_GAMEPLAY_NOT_OPEN');
const currentNet=c=>c.appealNetPaid??c.paidAmount??0;
const unpaid=c=>(c.appealBalance?.remaining??0)>0;
const awaitingDecision=c=>['PENDING','FOLLOW_UP'].includes(c.appeal?.status);
const decisionStage=s=>['EN_JEU','PAUSE','FINISHED'].includes(s.stage)&&!s.safetyStop?.active;
const running=s=>s.stage==='EN_JEU'&&!s.safetyStop?.active;
const publicBalance=c=>c.appealBalance?{id:c.appealBalance.id,direction:c.appealBalance.direction,total:c.appealBalance.total,remaining:c.appealBalance.remaining,paid:c.appealBalance.paid,adjustedAmount:c.appealBalance.adjustedAmount,status:c.appealBalance.status,basis:c.appealBalance.basis,reason:c.appealBalance.reason,netPaid:currentNet(c)}:null;
const memo=v=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=2000,'INVALID_CONTRACT');return v.trim();};
async function accounts(tx,s,c){
 const base=`sessions/${s.id}/accounts`,shop=await tx.get(`${base}/${c.sourceAccountId}`),person=await tx.get(`${base}/${accountId(c.characterId)}`);
 requireThat(shop?.sessionId===s.id&&person?.sessionId===s.id&&person.ownerType==='CHARACTER'&&person.characterId===c.characterId,'ACCOUNT_UNAVAILABLE');moneyState(shop);moneyState(person);await soMissionFunding(tx,s,c,shop);return {shop,person};
}
export async function appealFinanceView(tx,s,c,admin){
 if(!hasAppealFinance(s)||!c.terms.spaceOutlaws)return {};
 const party=await participantCurrent(tx,s,c),current=party.current&&!party.c?.survival?.dead,b=publicBalance(c),payer=admin?b?.direction==='TO_CHARACTER':b?.direction==='TO_SPONSOR';
 return {appealFinance:{balance:b,netPaid:currentNet(c),canAdjust:admin&&decisionStage(s)&&awaitingDecision(c)&&!unpaid(c)&&['PAID','SETTLED'].includes(c.status),canPay:!!(b&&unpaid(c)&&payer&&running(s)&&current)}};
}
export async function appealFinanceCommand(tx,s,c,ctx,input,at,actor,id,action){
 requireAppealFinance(s);
 const adjust=['prepareContractAppealAdjustment','adjustContractAppeal'].includes(action),preview=action.startsWith('prepare'),admin=appealFinanceAdminActions.includes(action);
 admissionKeys(input,['sessionId','contractId','reason',...(adjust?['basis','adjustedAmount']:['amount',...(admin?[]:['consent'])]),...(preview?[]:['requestId','confirmation'])]);
 requireThat(c.terms.spaceOutlaws===true&&c.terms.funding==='ACCOUNT'&&c.terms.applicant.kind==='CHARACTER'&&['PAID','SETTLED'].includes(c.status),'SO_APPEAL_FINANCE_UNAVAILABLE');
 const reason=memo(input.reason),net=whole(currentNet(c),'INVALID_ACCOUNT');requireThat(net<=c.terms.amount,'INVALID_ACCOUNT');
 if(adjust){
  requireThat(decisionStage(s),'SESSION_NOT_RUNNING');requireThat(awaitingDecision(c),'SO_APPEAL_PENDING_REQUIRED');requireThat(!unpaid(c),'SO_APPEAL_DEBT_OPEN');
  requireThat(['MATERIAL_ERROR','NEW_EVIDENCE','FRAUD'].includes(input.basis),'SO_APPEAL_BASIS_REQUIRED');
  const adjustedAmount=whole(input.adjustedAmount,'INVALID_AMOUNT');requireThat(adjustedAmount<=c.terms.amount,'SO_APPEAL_OBLIGATION_LIMIT');
  // This records an obligation, not an escrow or a debit. Even an unfunded
  // debtor keeps the receivable on the original contract and incarnation.
  const {shop,person}=await accounts(tx,s,c),direction=adjustedAmount>=net?'TO_CHARACTER':'TO_SPONSOR',total=Math.abs(adjustedAmount-net),result={contract:{id:c.id,title:c.terms.title},kind:'APPEAL_ADJUSTMENT',reason,basis:input.basis,adjustedAmount,netPaid:net,direction,total,currency:c.terms.currency};
  result.confirmation=hash(JSON.stringify([c.id,c.revision,ctx.partyGuard??ctx.version,shop.id,person.id,result]));
  if(preview)return {result};requireThat(input.confirmation===result.confirmation,'STALE_REVISION');
  const balance={id,appealId:c.appeal.id,direction,total,remaining:total,paid:0,adjustedAmount,basis:input.basis,reason,status:total?'OPEN':'SETTLED',createdAt:at,decidedBy:actor.uid};
  return {result,next:{...c,appealNetPaid:net,appealBalance:balance,appeal:{...c.appeal,status:'FINANCIAL_DECISION',decision:reason,decidedAt:at,financialEffect:total?'RECEIVABLE':'NONE'}},event:{publicReason:reason,decision:'APPEAL_ADJUSTMENT',amount:total,adjustment:balance}};
 }
 requireThat(running(s),'SESSION_NOT_RUNNING');const b=c.appealBalance;requireThat(b&&unpaid(c)&&b.status==='OPEN','SO_APPEAL_FINANCE_UNAVAILABLE');
 requireThat(admin?b.direction==='TO_CHARACTER':b.direction==='TO_SPONSOR','FORBIDDEN');
 if(!admin){requireThat(input.consent===true,'SO_APPEAL_CONSENT_REQUIRED');requireGameAction(s,ctx.c,'pay',at);}
 const party=await participantCurrent(tx,s,c);requireThat(party.current&&!party.c?.survival?.dead,'STALE_CONTRACT');
 const amount=whole(input.amount,'INVALID_AMOUNT');requireThat(amount>0&&amount<=b.remaining,'INVALID_AMOUNT');
 const {shop,person}=await accounts(tx,s,c),source=b.direction==='TO_CHARACTER'?shop:person,to=b.direction==='TO_CHARACTER'?person:shop;
 requireThat(moneyState(source).available>=amount,'INSUFFICIENT_FUNDS');whole(to.balance+amount,'BALANCE_OVERFLOW');
 const result={contract:{id:c.id,title:c.terms.title},kind:'APPEAL_PAYMENT',reason,direction:b.direction,amount,remaining:b.remaining-amount,currency:c.terms.currency,source:{name:b.direction==='TO_CHARACTER'?c.sourceName:c.terms.applicant.name,available:moneyState(source).available},destination:b.direction==='TO_CHARACTER'?c.terms.applicant.name:c.sourceName};
 result.confirmation=hash(JSON.stringify([c.id,c.revision,ctx.partyGuard??ctx.version,party.c.assignedUid,party.version,source.id,source.revision,to.id,to.revision,result]));
 if(preview)return {result};requireThat(input.confirmation===result.confirmation,'STALE_REVISION');
 const sourceNext={...source,balance:source.balance-amount,revision:source.revision+1},toNext={...to,balance:to.balance+amount,revision:to.revision+1};
 tx.set(`sessions/${s.id}/accounts/${source.id}`,sourceNext);tx.set(`sessions/${s.id}/accounts/${to.id}`,toNext);
 writeLedger(tx,s.id,{id,kind:'CONTRACT_PAY',at,actorUid:actor.uid,memo:`Recours · ${c.terms.title}`,reason,contractId:c.id,appealId:b.appealId,appealBalanceId:b.id,source:{name:result.source.name},recipient:{name:result.destination},createdCurrency:0,removedCurrency:0,entries:[accountEntry(source,-amount,sourceNext),accountEntry(to,amount,toNext)]});
 const remaining=b.remaining-amount,netPaid=net+(b.direction==='TO_CHARACTER'?amount:-amount);requireThat(netPaid>=0&&netPaid<=c.terms.amount,'INVALID_ACCOUNT');
 return {result,next:{...c,appealNetPaid:netPaid,appealBalance:{...b,remaining,paid:b.paid+amount,status:remaining?'OPEN':'SETTLED',lastPaymentAt:at,lastPaymentId:id}},event:{publicReason:reason,decision:'APPEAL_PAYMENT',amount,direction:b.direction,remaining,appealBalanceId:b.id}};
}
