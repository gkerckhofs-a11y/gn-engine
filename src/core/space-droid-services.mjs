import {requireThat,whole,documentId} from './validation.mjs';
import {accountId,moneyState,writeLedger} from './economy-state.mjs';
import {accountEntry,accountParty} from './collective-accounts.mjs';
import {shopAccountId} from './space-outlaws-shop-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';

export const isDroidPnj=p=>p?.kind==='DROID_MODULE'&&!!p.pnj;
const base=s=>`sessions/${s.id}`;
async function provider(tx,s,p){
 requireThat(s.spaceOutlaws?.droidServicesVersion===1&&s.economyRules?.enabled,'SO_GAMEPLAY_NOT_OPEN');
 const shop=await tx.get(`${base(s)}/shops/${documentId(p.pnj.shopId)}`),till=await tx.get(`${base(s)}/accounts/${shopAccountId(p.pnj.shopId)}`);
 requireThat(shop?.versionId===s.versionId&&shop.locationTargetId===p.clinicTargetId,'SO_DROID_PROVIDER');
 requireThat(till?.ownerType==='SHOP'&&till.shopId===shop.id&&till.sessionId===s.id,'ACCOUNT_UNAVAILABLE');moneyState(till);
 return {shop,till};
}
export async function droidServiceProfile(tx,s,p,input,old){
 requireThat(!old?.serviceStock?.reserved,'FIELD_TARGET_BUSY');
 if(input.pnj==null)return p;
 requireThat(input.pnj&&Object.keys(input.pnj).every(k=>['shopId','capacity','allowProtected'].includes(k))&&typeof input.pnj.allowProtected==='boolean','SO_DROID_PROVIDER');
 const remaining=whole(input.pnj.capacity,'SO_DROID_SERVICE_STOCK');requireThat(remaining>=0&&remaining<=10000,'SO_DROID_SERVICE_STOCK');
 const {shop}=await provider(tx,s,{...p,pnj:input.pnj});
 return {...p,name:`${p.name} — prestation PNJ`,skillId:null,minLevel:0,cost:0,cooldownSeconds:0,
  pnj:{shopId:shop.id,shopName:shop.name,allowProtected:input.pnj.allowProtected},serviceStock:{remaining,reserved:0,revision:(old?.serviceStock?.revision??0)+1},
  instructions:`Prestation de ${shop.name} dans l’atelier ${p.clinicTitle}, hors combat. Apportez votre module et, pour une réparation, les pièces nécessaires. Le tarif de main-d’œuvre et la durée sont affichés avant votre accord. Aucun PA ni compétence ne sont demandés au client du PNJ. L’achat du module est séparé ; aucun PV ni recharge de protection ne sont inclus.`};
}
export async function requireDroidProvider(tx,s,c,t,p){
 if(!isDroidPnj(p))return;
 requireThat(c.id===t.id,'SO_DROID_CONSENT');await provider(tx,s,p);
}
export async function droidServicePayment(tx,s,c,p,input){
 if(!isDroidPnj(p))return null;
 const {shop,till}=await provider(tx,s,p),a=await tx.get(`${base(s)}/accounts/${accountId(c.id)}`),state=moneyState(a);
 requireThat(a.ownerType==='CHARACTER'&&a.characterId===c.id&&a.sessionId===s.id,'ACCOUNT_UNAVAILABLE');
 requireThat(input.useProtected===undefined||typeof input.useProtected==='boolean','SO_PROTECTED_PURCHASE');
 requireThat(!input.useProtected||p.pnj.allowProtected&&a.protectedOrigin?.kind==='SO_BIRTH'&&a.protectedOrigin.characterId===c.id&&a.protectedOrigin.sessionId===s.id,'SO_PROTECTED_PURCHASE');
 const amount=p.modulePlan.pnjFee,protectedAmount=input.useProtected?Math.min(amount,state.protectedCredits??0):0,ordinaryAmount=amount-protectedAmount;
 requireThat(state.available>=ordinaryAmount,'INSUFFICIENT_FUNDS');whole(till.balance+amount,'BALANCE_OVERFLOW');
 requireThat(p.serviceStock&&Number.isSafeInteger(p.serviceStock.remaining)&&Number.isSafeInteger(p.serviceStock.reserved)&&p.serviceStock.remaining>p.serviceStock.reserved,'SO_DROID_SERVICE_STOCK');
 return {a,till,shop,amount,protectedAmount,ordinaryAmount};
}
export const droidPaymentView=p=>p?{provider:p.shop.name,amount:p.amount,ordinaryAmount:p.ordinaryAmount,protectedAmount:p.protectedAmount}:null;
function journal(tx,s,c,p,a,b,an,bn,kind,at,id,actor,actionId,sign){
 const ae={...accountEntry(a,sign*p.ordinaryAmount,an),protectedDelta:sign*p.protectedAmount};
 const customer=accountParty({a,name:c.public.displayName}),shop=accountParty({a:b,name:p.shopName});
 writeLedger(tx,s.id,{id,kind,at,actorUid:actor.uid,actionId,memo:`${kind==='DROID_SERVICE_RESERVE'?'Réservation':kind==='DROID_SERVICE_REFUND'?'Restitution':'Règlement'} · atelier droïde · ${p.shopName}`,source:sign===1?shop:customer,recipient:sign===1?customer:shop,createdCurrency:0,removedCurrency:0,entries:sign===0?[accountEntry(b,0,bn)]:[ae,accountEntry(b,-sign*p.amount,bn)]});
}
export function reserveDroidService(tx,s,c,p,payment,at,id,actor){
 if(!payment)return null;
 authorizeSpaceOutlaws(tx,s,'DROID_SERVICE');
 const {a,till:b,amount,protectedAmount,ordinaryAmount}=payment;
 // Money is held in the provider's existing reserved balance. It cannot be spent
 // before completion, and cancellation restores the original credit categories.
 const an={...a,balance:a.balance-ordinaryAmount,...(a.protectedCredits!==undefined?{protectedCredits:a.protectedCredits-protectedAmount}:{}),revision:a.revision+1},bn={...b,balance:b.balance+amount,reserved:b.reserved+amount,revision:b.revision+1};moneyState(an);moneyState(bn);
 tx.set(`${base(s)}/accounts/${a.id}`,an);tx.set(`${base(s)}/accounts/${b.id}`,bn);
 // Persist the published definition, never the per-module execution profile.
 const current=payment.profile;
 tx.set(`${base(s)}/personProfiles/${p.id}`,{...current,serviceStock:{...current.serviceStock,reserved:current.serviceStock.reserved+1,revision:current.serviceStock.revision+1}});
 const held={shopId:payment.shop.id,shopName:payment.shop.name,payerAccountId:a.id,tillAccountId:b.id,amount,protectedAmount,ordinaryAmount,status:'HELD'};
 journal(tx,s,c,held,a,b,an,bn,'DROID_SERVICE_RESERVE',at,id,actor,id,-1);return held;
}
export async function settleDroidService(tx,s,c,action,at,id,actor,cancel){
 const p=action.droidPayment;if(!p)return;
 requireThat(s.spaceOutlaws?.droidServicesVersion===1&&p.status==='HELD','SO_GAMEPLAY_NOT_OPEN');authorizeSpaceOutlaws(tx,s,'DROID_SERVICE');
 const profile=await tx.get(`${base(s)}/personProfiles/${action.profile.id}`),a=await tx.get(`${base(s)}/accounts/${p.payerAccountId}`),b=await tx.get(`${base(s)}/accounts/${p.tillAccountId}`);
 moneyState(a);moneyState(b);requireThat(a.characterId===c.id&&b.ownerType==='SHOP'&&b.shopId===p.shopId&&b.reserved>=p.amount,'ACCOUNT_UNAVAILABLE');
 requireThat(profile?.revision===action.profile.revision&&profile.serviceStock?.reserved>=1&&profile.serviceStock.remaining>=1,'SO_DROID_SERVICE_STOCK');
 const an=cancel?{...a,balance:whole(a.balance+p.ordinaryAmount,'BALANCE_OVERFLOW'),...(a.protectedCredits!==undefined?{protectedCredits:whole(a.protectedCredits+p.protectedAmount,'BALANCE_OVERFLOW')}:{ }),revision:a.revision+1}:a;
 const bn={...b,balance:b.balance-(cancel?p.amount:0),reserved:b.reserved-p.amount,revision:b.revision+1};moneyState(an);moneyState(bn);
 if(cancel)tx.set(`${base(s)}/accounts/${a.id}`,an);tx.set(`${base(s)}/accounts/${b.id}`,bn);
 tx.set(`${base(s)}/personProfiles/${profile.id}`,{...profile,serviceStock:{remaining:profile.serviceStock.remaining-(cancel?0:1),reserved:profile.serviceStock.reserved-1,revision:profile.serviceStock.revision+1}});
 journal(tx,s,c,p,a,b,an,bn,cancel?'DROID_SERVICE_REFUND':'DROID_SERVICE_SETTLE',at,id,actor,action.id,cancel?1:0);
}
