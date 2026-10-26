import {requireThat} from './validation.mjs';
import {spaceSpecialLevel} from './space-combat-state.mjs';

// Native encounter extension: two allies and one intercepted opponent.
// Escaped/immobilized ships stay in the encounter record, outside later rounds.
export function resolveConvoyRound(ships,orders,dice,quietRounds=0,activeIds=ships.map(s=>s.id)){
 requireThat(ships.length===3&&orders.length===3&&dice.length>=13&&dice.every(n=>Number.isInteger(n)&&n>=1&&n<=6),'INVALID_SPACE_ROUND');
 const before=ships.map(s=>({...s})),after=ships.map(s=>({...s})),used=ships.map(()=>false),fuelSpent=ships.map(()=>0),shots=[],rolls=[],escaped=[];
 const withdrawn=[];
 const available=(i)=>!withdrawn.includes(ships[i].id)&&activeIds.includes(ships[i].id)&&before[i].hull>0;
 const enemy=(i,j)=>j>=0&&i!==j&&ships[i].team!==ships[j].team&&available(j);
 const target=(i,id)=>{const j=ships.findIndex(s=>s.id===id);return enemy(i,j)?j:-1;};
 const kinds=orders.map((o,i)=>available(i)?o.kind==='SURRENDER'?o.fallback:o.kind:'PASSIVE');
 const active=ships.map((s,i)=>i).filter(available);
 const end=(reason,hostile=false)=>({after,used,fuelSpent,shots,rolls,escaped,withdrawn,hostile,quietRounds:hostile?0:quietRounds+1,closed:true,reason});
 if(active.every(i=>orders[i].ceasefire))return end('CEASEFIRE');
 // Partial surrender never ends another allied captain's fight.
 const surrendered=active.filter(i=>orders[i].kind==='SURRENDER'&&active.filter(j=>enemy(i,j)).every(j=>orders[j].acceptSurrender));
 const survivingTeams=new Set(active.filter(i=>!surrendered.includes(i)).map(i=>ships[i].team));
 if(surrendered.length&&survivingTeams.size<=1)return end('SURRENDER');
 for(const i of surrendered){withdrawn.push(ships[i].id);kinds[i]='PASSIVE';}
 const shoot=k=>['ATTACK','PIL03_3','PIL03_5'].includes(k),defend=k=>['DEFEND','PIL03_2','PIL03_5'].includes(k),flee=k=>['FLEE','PIL03_4'].includes(k);
 let hostile=false;const incoming=ships.map(()=>0);
 for(const i of active){const j=target(i,orders[i].targetId);if(!shoot(kinds[i])||j<0)continue;
  const heavy=before[i].weapon==='HEAVY',threshold=heavy?5:4,bonus=kinds[i]==='PIL03_3'?1:0,hit=dice[i]+bonus>=threshold;hostile=true;used[i]=spaceSpecialLevel(orders[i])>0;after[i].revisionRequired=true;after[j].revisionRequired=true;
  let defended=false;
  if(defend(kinds[j])&&(orders[j].defenseIds??[]).includes(before[i].id)){const threshold=Math.max(kinds[j]==='DEFEND'?5:6,bonus?6:5),total=dice[3+j]+before[j].maneuverability;defended=total>=threshold;rolls.push({kind:'DEFENSE',shipId:before[j].id,targetId:before[i].id,roll:dice[3+j],total,threshold,success:defended});if(spaceSpecialLevel(orders[j]))used[j]=true;}
  const amount=hit&&!defended?(heavy?2:1):0;incoming[j]+=amount;shots.push({shipId:before[i].id,targetId:before[j].id,roll:dice[i],bonus,threshold,hit,defended,damage:amount});
 }
 const damage=(s,n)=>({...s,shield:Math.max(0,s.shield-n),hull:Math.max(0,s.hull-Math.max(0,n-s.shield))});
 for(let i=0;i<3;i++)after[i]=damage(after[i],incoming[i]);
 const eligible=active.filter(i=>kinds[i]==='PURSUE'&&target(i,orders[i].targetId)>=0&&flee(kinds[target(i,orders[i].targetId)]));
 const best=Math.max(...eligible.map(i=>before[i].maneuverability)),tied=eligible.filter(i=>before[i].maneuverability===best),pursuer=tied.length?tied[(dice[12]-1)%tied.length]:-1;
 if(tied.length>1)rolls.push({kind:'PURSUER_SELECTION',shipId:before[pursuer].id,roll:dice[12],total:best,candidates:tied.map(i=>before[i].id)});
 for(const i of active){if(!flee(kinds[i])||after[i].hull===0)continue;
  if(pursuer<0||orders[pursuer].targetId!==before[i].id||after[pursuer].hull===0){escaped.push(before[i].id);continue;}
  const special=kinds[i]==='PIL03_4';if(special&&before[i].fuel<1)continue;
  const total=dice[6+i]+before[i].maneuverability+(special?2:0),opposed=dice[9+pursuer]+before[pursuer].maneuverability,success=total>opposed;hostile=true;
  rolls.push({kind:'PURSUIT',shipId:before[pursuer].id,targetId:before[i].id,roll:dice[9+pursuer],total:opposed},{kind:'FLEE',shipId:before[i].id,roll:dice[6+i],total,opposed,success});
  if(special){used[i]=true;fuelSpent[i]=1;after[i].fuel--;if(!success){after[i]=damage(after[i],1);after[i].revisionRequired=true;}}
  if(success)escaped.push(before[i].id);
 }
 const remaining=active.filter(i=>available(i)&&after[i].hull>0&&!escaped.includes(before[i].id));
 if(new Set(remaining.map(i=>ships[i].team)).size<=1)return end(escaped.length?'FLED':'IMMOBILIZED',hostile);
 if(!hostile&&quietRounds+1>=2)return end('QUIET');
 return {after,used,fuelSpent,shots,rolls,escaped,withdrawn,hostile,quietRounds:hostile?0:quietRounds+1,closed:false,reason:null};
}
