import {requireThat as need} from '../core/validation.mjs';
import {deck,ruleset,compare,score,splitPot} from './rules.mjs';
import {shuffle} from './random.mjs';
const live=h=>h.players.filter(p=>!p.folded);
const ordered=h=>[...live(h)].sort((a,b)=>((a.seat-h.dealer-1+8)%8)-((b.seat-h.dealer-1+8)%8));
const log=(h,type,extra={})=>h.events.push({sequence:h.events.length+1,type,round:h.round,...extra});
function draw(h,rng){if(!h.deck.length){const top=h.discard.pop();h.deck=shuffle(h.discard,rng);h.discard=top?[top]:[];}need(h.deck.length,'SABACC_EMPTY_DECK');return h.deck.pop();}
function nextTurn(h,clock){h.activeSeat=h.pending[0]??null;h.deadline=clock+h.stakes.turnSeconds*1000;}
function finish(h,table,deltas,foldOnly=false){
 const contenders=live(h),ranked=[...contenders].sort((a,b)=>compare(a.cards,b.cards)),winners=foldOnly?contenders:ranked.filter(p=>compare(p.cards,ranked[0].cards)===0);
 const jackpot=!foldOnly&&score(winners[0].cards).total===0,amount=h.handPot+(jackpot?table.sabaccPot:0),awards=splitPot(amount,winners.map(p=>p.seat),h.dealer);
 for(const p of winners)deltas[p.id]=(deltas[p.id]??0)+awards[p.seat];
 h.result={reason:foldOnly?'LAST_PLAYER':'SHOWDOWN',amount,jackpot,winners:winners.map(p=>({seat:p.seat,name:p.name,amount:awards[p.seat]})),revealed:foldOnly?[]:contenders.map(p=>({seat:p.seat,name:p.name,cards:p.cards,score:score(p.cards)}))};
 if(jackpot){table.sabaccPot=0;table.contributors={};}
 h.handPot=0;h.phase='SETTLED';h.activeSeat=null;h.pending=[];h.deadline=null;table.status='BETWEEN_HANDS';log(h,'SETTLED',{result:h.result});
}
function advance(h,table,deltas,rng,clock){
 if(live(h).length===1){finish(h,table,deltas,true);return;}
 if(h.pending.length){nextTurn(h,clock);return;}
 if(h.phase==='CARDS'){h.phase='BETTING';h.currentBet=0;for(const p of h.players)p.wager=0;h.pending=ordered(h).map(p=>p.seat);nextTurn(h,clock);return;}
 h.dice=[rng(6)+1,rng(6)+1];log(h,'SPIKE',{dice:h.dice,shift:h.dice[0]===h.dice[1]});
 if(h.dice[0]===h.dice[1]){
  const sizes=new Map();for(const p of live(h)){sizes.set(p.id,p.cards.length);h.discard.push(...p.cards);p.cards=[];}
  for(const p of ordered(h))p.cards=Array.from({length:sizes.get(p.id)},()=>draw(h,rng));
 }
 if(h.round===ruleset.rounds){finish(h,table,deltas);return;}
 h.round++;h.currentBet=0;for(const p of h.players)p.wager=0;h.phase='CARDS';h.pending=ordered(h).map(p=>p.seat);nextTurn(h,clock);
}
export function startHand(table,participants,{id,rng,clock,balances}){
 need(participants.length>=2&&participants.length<=8,'SABACC_PLAYERS');need(Object.keys(table.contributors).length+participants.filter(p=>!table.contributors[p.id]).length<=200,'SABACC_POT_LIMIT');
 const h={id,number:table.handNo+1,rulesetId:ruleset.id,stakes:structuredClone(table.stakes),dealer:table.dealer,round:1,phase:'CARDS',players:participants.map(p=>({...p,cards:[],folded:false,wager:0,main:table.stakes.ante,sabacc:table.stakes.sabaccAnte})),deck:shuffle(deck(),rng),discard:[],handPot:0,currentBet:0,events:[],pending:[],result:null};
 const deltas={};for(const p of h.players){const amount=p.main+p.sabacc;need(balances[p.id]>=amount,'INSUFFICIENT_FUNDS');deltas[p.id]=-amount;h.handPot+=p.main;table.sabaccPot+=p.sabacc;const old=table.contributors[p.id];if(p.sabacc)table.contributors[p.id]={binding:p.binding,amount:(old?.amount??0)+p.sabacc};}
 for(let i=0;i<2;i++)for(const p of ordered(h))p.cards.push(draw(h,rng));h.discard.push(draw(h,rng));h.pending=ordered(h).map(p=>p.seat);nextTurn(h,clock);log(h,'START');table.status='ACTIVE';table.handNo=h.number;return {hand:h,deltas};
}
export function act(table,hand,seat,action,{rng,clock,balances,cardId,amount,timeout=false}){
 const h=hand,deltas={};need(h.phase==='CARDS'||h.phase==='BETTING','SABACC_PHASE');const p=h.players.find(p=>p.seat===seat);need(p&&!p.folded,'SABACC_PLAYER');
 if(action!=='EXPEL')need(h.activeSeat===seat,'SABACC_TURN');
 if(!timeout&&action!=='EXPEL')need(clock<h.deadline,'SABACC_EXPIRED');
 if(timeout){need(clock>=h.deadline,'SABACC_NOT_EXPIRED');action=h.phase==='CARDS'?'STAND':h.currentBet===p.wager?'CHECK':'FOLD';}
 if(action==='EXPEL'||action==='FOLD'){
  need(action==='EXPEL'||h.phase==='BETTING','SABACC_PHASE');p.folded=true;h.pending=h.pending.filter(s=>s!==seat);log(h,action,{seat});advance(h,table,deltas,rng,clock);return {hand:h,deltas};
 }
 if(h.phase==='CARDS'){
  need(['STAND','GAIN','REPLACE','SWAP'].includes(action),'SABACC_ACTION');
  if(action==='GAIN'){need(p.cards.length<ruleset.maxCards,'SABACC_HAND_LIMIT');p.cards.push(draw(h,rng));}
  if(action==='REPLACE'||action==='SWAP'){
   const i=p.cards.findIndex(c=>c.id===cardId);need(i>=0,'SABACC_CARD');const discarded=p.cards[i];
   if(action==='SWAP'){need(h.discard.length,'SABACC_CARD');p.cards[i]=h.discard.pop();h.discard.push(discarded);}
   else {h.discard.push(discarded);p.cards[i]=draw(h,rng);}
  }
 }else{
  need(['CHECK','BET','CALL','RAISE'].includes(action),'SABACC_ACTION');const due=h.currentBet-p.wager;
  if(action==='CHECK')need(due===0,'SABACC_MUST_CALL');
  else {
   if(action==='CALL'){need(due>0,'SABACC_NOTHING_TO_CALL');amount=due;}
   else{
    need(Number.isSafeInteger(amount)&&amount>=h.stakes.minBet&&amount<=h.stakes.maxBet,'SABACC_BET');
    if(action==='BET')need(h.currentBet===0,'SABACC_MUST_RAISE');
    else need(h.currentBet>0&&amount-due>=h.stakes.minRaise,'SABACC_RAISE');
   }
   need(amount<=h.stakes.maxBet&&balances[p.id]>=amount,'INSUFFICIENT_FUNDS');
   p.wager+=amount;p.main+=amount;h.handPot+=amount;deltas[p.id]=-amount;
   if(action!=='CALL'){
    h.currentBet=p.wager;h.pending=live(h).filter(x=>x.id!==p.id).sort((a,b)=>((a.seat-seat+8)%8)-((b.seat-seat+8)%8)).map(x=>x.seat);
   }
  }
 }
 log(h,action,{seat,...(amount?{amount}:{}),...(action==='REPLACE'||action==='SWAP'?{discard:h.discard.at(-1)}:{})});
 h.pending=h.pending.filter(s=>s!==seat);advance(h,table,deltas,rng,clock);return {hand:h,deltas};
}
export function cancelHand(table,h){
 need(h&&['CARDS','BETTING'].includes(h.phase),'SABACC_PHASE');const deltas={};
 for(const p of h.players){deltas[p.id]=p.main+p.sabacc;table.sabaccPot-=p.sabacc;const c=table.contributors[p.id];if(c){c.amount-=p.sabacc;if(!c.amount)delete table.contributors[p.id];}}
 h.handPot=0;h.phase='CANCELLED';h.activeSeat=null;h.pending=[];h.deadline=null;h.result={reason:'CANCELLED',winners:[],revealed:[]};table.status='BETWEEN_HANDS';log(h,'CANCELLED');return {hand:h,deltas};
}
