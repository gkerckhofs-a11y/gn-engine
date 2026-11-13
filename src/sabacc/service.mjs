import {requireThat as need,documentId,whole} from '../core/validation.mjs';
import {inventoryHash as hash} from '../core/inventory-state.mjs';
import {requireGameAction} from '../core/health-state.mjs';
import {ruleset,templates,sum} from './rules.mjs';
import {newSeed,randomSource} from './random.mjs';
import {startHand,act,cancelHand} from './engine.mjs';
import {identityProvider,playerKey,walletSnapshot,settleWallets} from './adapters.mjs';
const reads=new Set(['sabaccHome','sabaccTable','sabaccAdmin']);
export const sabaccActions=new Set([...reads,'sabaccSettings','sabaccProfile','sabaccCreate','sabaccConfigure','sabaccStatus','sabaccRotateQR','sabaccJoin','sabaccLeave','sabaccReady','sabaccPlay','sabaccTick','sabaccCancel','sabaccExpel','sabaccRefundPot','sabaccGrant']);
const txt=(v,max=100)=>{need(typeof v==='string'&&v.trim()&&v.length<=max,'INVALID_TEXT');return v.trim();};
const active=h=>h&&['CARDS','BETTING'].includes(h.phase);
const clock=(settings,at)=>(settings.enabled?at:settings.disabledAt??at)-(settings.pausedMs??0);
const number=(n,min,max)=>{need(Number.isSafeInteger(n)&&n>=min&&n<=max,'SABACC_CONFIG');return n;};
function stakesInput(x){return {ante:number(x.ante,0,1000000),sabaccAnte:number(x.sabaccAnte,0,1000000),minBet:number(x.minBet,1,1000000),maxBet:number(x.maxBet,x.minBet,1000000),minRaise:number(x.minRaise,1,x.maxBet),turnSeconds:number(x.turnSeconds,15,600),confirmAbove:number(x.confirmAbove,0,1000000)};}
const publicTable=t=>({id:t.id,name:t.name,location:t.location,tier:t.tier,seatCount:t.seatCount,stakes:t.stakes,status:t.status,mode:t.mode,sessionId:t.sessionId,revision:t.revision,sabaccPot:t.sabaccPot,handNo:t.handNo,policy:t.access.kind});
const canManage=(actor,settings,isAdmin)=>isAdmin(actor)||(settings.adminEmails??[]).includes(actor.email.toLowerCase());
export function createSabaccService({store,signed,isAdmin,checkSession,now,uuid}){
 return async(action,actor,input={})=>{
  signed(actor);const at=now(),id=uuid(),seed=newSeed();
  return store.runTransaction(async original=>{
   // Collect writes to keep all Firestore reads before the actual commit.
   const pending=new Map(),tx={...original,get:async p=>pending.has(p)?structuredClone(pending.get(p)):original.get(p),set:(p,v)=>pending.set(p,structuredClone(v))};
   const settings=await tx.get('sabacc/settings')??{enabled:false,revision:0,adminEmails:[],templates:structuredClone(templates),pausedMs:0,disabledAt:at};
   const admin=canManage(actor,settings,isAdmin),meKey=playerKey(actor),profile=await tx.get(`sabaccPlayers/${meKey}`),lock=await tx.get(`sabaccPresence/${meKey}`),time=clock(settings,at);
   const adminOnly=()=>need(admin,'FORBIDDEN');
   if(action==='sabaccHome'||action==='sabaccAdmin'){
    if(action==='sabaccAdmin')adminOnly();const rows=admin?await tx.list('sabaccTables'):[];
    const own=lock?.tableId?await tx.get(`sabaccTables/${lock.tableId}`):null;
    const local=profile?await walletSnapshot(tx,{mode:'LOCAL',accountId:meKey}):null;
    return {admin,enabled:settings.enabled,profile:profile?{id:profile.id,name:profile.name,balance:local.available}:null,ownTable:own?{...publicTable(own),qrToken:own.qrToken}:null,...(admin?{settings,tables:rows.map(t=>({...publicTable(t),qrToken:t.qrToken,seats:t.seats.map(s=>({seat:s.seat,name:s.name,ready:s.ready,playerId:s.id})),access:t.access.kind==='LIST'?{kind:'LIST',allowedIds:t.access.allowedIds}:{kind:t.access.kind}}))}:{} )};
   }
   if(['sabaccSettings','sabaccProfile','sabaccCreate'].includes(action))need(!input.tableId,'SABACC_CONFIG');
   let t=input.tableId?await tx.get(`sabaccTables/${documentId(input.tableId)}`):null;
   let h=t?await tx.get(`sabaccTables/${t.id}/state/current`):null;
   const wasActive=active(h);
   let who=null;
   const playerRead=async(spending=false)=>{need(t,'NOT_FOUND');who=await identityProvider(tx,actor,t,profile,{spending});return who;};
   const checkQR=()=>need(t&&input.qrToken===t.qrToken,'SABACC_QR');
   if(action==='sabaccTable'){
    need(t,'NOT_FOUND');if(!admin)checkQR();
    // Non-members can inspect stakes but cannot receive hidden state or history.
    try{await playerRead();}catch(e){if(!admin)throw e;}
    const seat=who?t.seats.find(s=>s.id===who.id&&s.actorId===meKey):null;
    const ownCards=seat&&h?await tx.get(`sabaccTables/${t.id}/hands/${h.id}/private/${seat.id}`):null;
    const wallet=who?await walletSnapshot(tx,who.binding):null;
    let allowed=true;try{await playerRead(true);}catch{allowed=false;}
    const past=seat||admin?await tx.list(`sabaccTables/${t.id}/hands`,null,{orderBy:'number',direction:'desc',limit:10}):[];
    return {admin,enabled:settings.enabled,table:publicTable(t),self:who?{id:who.id,name:who.name,seat:seat?.seat??null,ready:seat?.ready??false,balance:wallet.available}:null,
     seats:t.seats.map(s=>({seat:s.seat,name:s.name,ready:s.ready,folded:h?.players.find(p=>p.id===s.id)?.folded??false})),
     hand:h?{id:h.id,number:h.number,round:h.round,phase:h.phase,activeSeat:h.activeSeat,currentBet:h.currentBet,handPot:h.handPot,dice:h.dice??null,discard:h.discard.at(-1)??null,remainingMs:active(h)?Math.max(0,t.status==='PAUSED'?t.pauseRemaining??0:h.deadline-time):0,stakes:h.stakes,events:seat||admin?h.events:[],result:seat||admin?h.result:null,players:h.players.map(p=>({seat:p.seat,name:p.name,folded:p.folded,committed:p.main+p.sabacc,wager:p.wager}))}:null,
     ...(admin?{walletEvents:(await tx.list(`sabaccTables/${t.id}/walletEvents`,null,{orderBy:'at',direction:'desc',limit:30})).map(({actorUid,...e})=>e)}:{}),
     cards:ownCards?.cards??[],total:ownCards?sum(ownCards.cards):null,history:past,canAct:allowed&&settings.enabled&&t.status==='ACTIVE'&&!!seat&&h?.activeSeat===seat.seat&&!h.players.find(p=>p.id===seat.id)?.folded};
   }
   need(!reads.has(action),'SABACC_ACTION');
   const adminCommands=['sabaccSettings','sabaccCreate','sabaccConfigure','sabaccStatus','sabaccRotateQR','sabaccCancel','sabaccExpel','sabaccRefundPot','sabaccGrant'];
   if(adminCommands.includes(action)){adminOnly();if(t?.mode==='GN')await checkSession(tx,actor,t.sessionId);}
   if(['sabaccJoin','sabaccLeave','sabaccReady','sabaccPlay','sabaccTick'].includes(action)){
    checkQR();await playerRead(['sabaccJoin','sabaccReady','sabaccPlay','sabaccTick'].includes(action));
    need(settings.enabled&&t.status!=='PAUSED','SABACC_PAUSED');
    if(action!=='sabaccJoin')need(t.seats.some(s=>s.id===who.id&&s.actorId===meKey),'FORBIDDEN');
   }
   const receipt=`sabaccCommands/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),old=await tx.get(receipt);
   if(old){need(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');return old.result;}
   if(t)need(t.revision===input.revision,'STALE_REVISION');
   let result={id},deltas={},bindings={},previousPots=t?(t.sabaccPot+(h?.handPot??0)):0;
   const loadCards=async()=>{if(h)for(const p of h.players){const d=await tx.get(`sabaccTables/${t.id}/hands/${h.id}/private/${p.id}`);need(d,'SABACC_STATE');p.cards=d.cards;}};
   const balances=async players=>{const b={};for(const p of players){bindings[p.id]=p.binding;b[p.id]=(await walletSnapshot(tx,p.binding)).available;}return b;};
   if(action==='sabaccSettings'){
    need(isAdmin(actor),'FORBIDDEN');need(settings.revision===input.settingsRevision,'STALE_REVISION');need(typeof input.enabled==='boolean'&&Array.isArray(input.adminEmails)&&input.adminEmails.length<=30,'SABACC_CONFIG');
    const next={...settings,enabled:input.enabled,adminEmails:input.adminEmails.map(x=>txt(x,200).toLowerCase()),templates:input.templates?input.templates.map((x,i)=>({...stakesInput(x),tier:i+1,name:txt(x.name)})):settings.templates,revision:settings.revision+1};need(next.templates.length===3,'SABACC_CONFIG');
    if(settings.enabled&&!next.enabled)next.disabledAt=at;
    if(!settings.enabled&&next.enabled){next.pausedMs+=(at-(settings.disabledAt??at));next.disabledAt=null;}
    tx.set('sabacc/settings',next);
   }else if(action==='sabaccProfile'){
    need(!lock?.tableId,'SABACC_ALREADY_SEATED');const name=txt(input.name,60);tx.set(`sabaccPlayers/${meKey}`,{id:meKey,name});if(!profile)tx.set(`sabaccWallets/${meKey}`,{id:meKey,status:'ACTIVE',balance:0,reserved:0,revision:1});
   }else if(action==='sabaccCreate'){
    const source=input.sourceTableId?await tx.get(`sabaccTables/${documentId(input.sourceTableId)}`):null;if(input.sourceTableId)need(source,'NOT_FOUND');
    const createInput=source?{...input,tier:source.tier,mode:source.mode,sessionId:source.sessionId,seatCount:source.seatCount,stakes:source.stakes}:input;
    const tier=number(createInput.tier,1,3),template=settings.templates[tier-1];need(['LOCAL','GN'].includes(createInput.mode),'SABACC_CONFIG');
    const sessionId=createInput.mode==='GN'?documentId(createInput.sessionId):null;if(sessionId){const s=await checkSession(tx,actor,sessionId);need(s.economyRules?.enabled&&!s.campaignSealed&&s.stage!=='ARCHIVED','ECONOMY_DISABLED');}
    t={id,name:txt(createInput.name),location:txt(createInput.location),tier,seatCount:number(createInput.seatCount,2,8),mode:createInput.mode,sessionId,stakes:stakesInput(createInput.stakes??template),rulesetId:ruleset.id,revision:0,status:'CLOSED',seats:[],handNo:0,dealer:7,sabaccPot:0,contributors:{},access:source?structuredClone({...source.access,...(source.access.kind==='CODE'?{salt:source.access.salt??source.id}:{})}):{kind:'OPEN'},qrToken:uuid(),updatedAt:at};result={id:t.id,qrToken:t.qrToken};
   }else if(action==='sabaccGrant'){
    need(t?.mode==='LOCAL','SABACC_LOCAL_ONLY');const pid=documentId(input.playerId);need(t.seats.some(s=>s.id===pid),'SABACC_PLAYER');const a=await tx.get(`sabaccWallets/${pid}`);need(a,'ACCOUNT_UNAVAILABLE');const amount=number(input.amount,1,1000000);whole(a.balance+amount);const reason=txt(input.reason,500);tx.set(`sabaccWallets/${pid}`,{...a,balance:a.balance+amount,revision:a.revision+1});tx.set(`sabaccTables/${t.id}/walletEvents/${id}`,{id,at,actorUid:actor.uid,reason,createdCurrency:amount,playerId:pid,before:a.balance,after:a.balance+amount});
   }else if(action==='sabaccConfigure'){
    need(t,'NOT_FOUND');t.name=txt(input.name);t.location=txt(input.location);t.stakes=stakesInput(input.stakes);for(const seat of t.seats)seat.ready=false;t.seatCount=number(input.seatCount,2,8);need(t.seats.every(s=>s.seat<t.seatCount),'SABACC_SEAT');
    need(['OPEN','CODE','LIST'].includes(input.access.kind),'SABACC_CONFIG');t.access=input.access.kind==='CODE'?{kind:'CODE',salt:t.access.salt??t.id,codeHash:input.access.code?hash(`${t.access.salt??t.id}:${txt(input.access.code,100)}`):t.access.codeHash}:input.access.kind==='LIST'?{kind:'LIST',allowedIds:input.access.allowedIds.map(x=>documentId(x))}:{kind:'OPEN'};need(t.access.kind!=='CODE'||t.access.codeHash,'SABACC_CONFIG');need((t.access.allowedIds?.length??0)<=200,'SABACC_CONFIG');
   }else if(action==='sabaccRotateQR'){need(t,'NOT_FOUND');t.qrToken=uuid();result={qrToken:t.qrToken};
   }else if(action==='sabaccStatus'){
    need(t,'NOT_FOUND');const to=input.status;need(['OPEN','CLOSED','PAUSED','RESUME','ARCHIVED'].includes(to),'SABACC_CONFIG');
    if(to==='PAUSED'){need(t.status!=='PAUSED','SABACC_PAUSED');t.previousStatus=t.status;t.pauseRemaining=active(h)?Math.max(0,h.deadline-time):0;t.status='PAUSED';}
    else if(to==='RESUME'){need(t.status==='PAUSED','SABACC_PHASE');t.status=t.previousStatus;if(active(h))h.deadline=time+t.pauseRemaining;delete t.pauseRemaining;}
    else {need(!active(h),'SABACC_HAND_ACTIVE');if(to==='ARCHIVED')need(t.sabaccPot===0,'SABACC_POT_NOT_EMPTY');t.status=to;if(to==='ARCHIVED'||to==='CLOSED'){for(const s of t.seats)tx.set(`sabaccPresence/${s.actorId}`,{tableId:null});t.seats=[];}}
   }else if(action==='sabaccJoin'){
    need(['OPEN','BETWEEN_HANDS'].includes(t.status),'SABACC_CLOSED');need(!lock?.tableId||lock.tableId===t.id,'SABACC_ALREADY_SEATED');
    if(t.access.kind==='CODE')need(typeof input.code==='string'&&hash(`${t.access.salt??t.id}:${input.code}`)===t.access.codeHash,'FORBIDDEN');
    if(t.access.kind==='LIST')need(t.access.allowedIds.includes(who.characterId??who.id),'FORBIDDEN');
    const existing=t.seats.find(s=>s.id===who.id);if(!existing){const seat=number(input.seat,0,t.seatCount-1);need(!t.seats.some(s=>s.seat===seat),'SABACC_SEAT');t.seats.push({...who,seat,ready:false});}tx.set(`sabaccPresence/${meKey}`,{tableId:t.id});
   }else if(action==='sabaccLeave'){
    need(!active(h),'SABACC_HAND_ACTIVE');t.seats=t.seats.filter(s=>s.id!==who.id);tx.set(`sabaccPresence/${meKey}`,{tableId:null});
   }else if(action==='sabaccReady'){
    need(!active(h)&&['OPEN','BETWEEN_HANDS'].includes(t.status),'SABACC_HAND_ACTIVE');need(typeof input.ready==='boolean','SABACC_CONFIG');const p=t.seats.find(s=>s.id===who.id);p.ready=input.ready;
    const players=t.seats.filter(s=>s.ready),b=await balances(players);if(input.ready)need(b[p.id]>=t.stakes.ante+t.stakes.sabaccAnte,'INSUFFICIENT_FUNDS');
    // Revalidate all participants immediately before the atomic antes.
    const eligible=players.filter(p=>b[p.id]>=t.stakes.ante+t.stakes.sabaccAnte);
    if(eligible.length>=2&&eligible.length===t.seats.length){for(const p of eligible){if(t.mode==='GN'){const c=await tx.get(`sessions/${t.sessionId}/characters/${p.binding.characterId}`),r=c?.assignedUid?await tx.get(`sessions/${t.sessionId}/registrations/${hash(c.assignedUid)}`):null;need(c&&!c.survival?.dead&&r?.accessActive&&r.status==='ACCEPTED'&&r.characterId===c.id&&p.authTime>=r.minAuthTime&&hash(c.assignedUid)===p.actorId,'FORBIDDEN');const session=await tx.get(`sessions/${t.sessionId}`);requireGameAction(session,c,'pay');}}t.dealer=eligible.map(p=>p.seat).sort((a,b)=>((a-t.dealer+t.seatCount)%t.seatCount||t.seatCount)-((b-t.dealer+t.seatCount)%t.seatCount||t.seatCount))[0];const out=startHand(t,eligible,{id,clock:time,rng:randomSource(seed),balances:b});h=out.hand;deltas=out.deltas;}
   }else if(action==='sabaccExpel'&&!active(h)){
    need(t,'NOT_FOUND');txt(input.reason,500);const p=t.seats.find(p=>p.seat===input.seat);need(p,'SABACC_PLAYER');t.seats=t.seats.filter(p=>p.seat!==input.seat);tx.set(`sabaccPresence/${p.actorId}`,{tableId:null});
   }else if(['sabaccPlay','sabaccTick','sabaccExpel'].includes(action)){
    need(t.status==='ACTIVE'&&settings.enabled,'SABACC_PAUSED');
    need(active(h),'SABACC_PHASE');await loadCards();const b=await balances(h.players);
    let seat=who?.seat??t.seats.find(s=>s.id===who?.id)?.seat;
    if(action==='sabaccTick'){need(t.status==='ACTIVE'&&settings.enabled,'SABACC_PAUSED');seat=h.activeSeat;}
    if(action==='sabaccExpel'){seat=number(input.seat,0,7);const p=t.seats.find(s=>s.seat===seat);need(p,'SABACC_PLAYER');p.kick=true;txt(input.reason,500);}
    const out=act(t,h,seat,action==='sabaccExpel'?'EXPEL':input.move,{rng:randomSource(seed),clock:time,balances:b,cardId:input.cardId,amount:input.amount,timeout:action==='sabaccTick'});h=out.hand;deltas=out.deltas;
   }else if(action==='sabaccCancel'){
    need(t&&active(h),'SABACC_PHASE');txt(input.reason,500);await loadCards();await balances(h.players);const out=cancelHand(t,h);h=out.hand;deltas=out.deltas;
   }else if(action==='sabaccRefundPot'){
    need(t&&!active(h),'SABACC_HAND_ACTIVE');need(input.confirm===true,'SABACC_CONFIRM');txt(input.reason,500);for(const [pid,c] of Object.entries(t.contributors)){bindings[pid]=c.binding;deltas[pid]=c.amount;}t.contributors={};t.sabaccPot=0;
   }else need(false,'SABACC_ACTION');
   if(t){
    const afterPots=t.sabaccPot+(h?.handPot??0);need(Object.values(deltas).reduce((a,b)=>a+b,0)+afterPots-previousPots===0,'SABACC_CONSERVATION');
    await settleWallets(tx,t,bindings,deltas,{id,actorUid:actor.uid,at,handId:h?.id??null,reason:input.reason??action});
    if(h){
     if(wasActive&&!active(h)){for(const s of t.seats)s.ready=false;for(const s of t.seats.filter(s=>s.kick))tx.set(`sabaccPresence/${s.actorId}`,{tableId:null});t.seats=t.seats.filter(s=>!s.kick);}
     for(const p of h.players)if(p.cards)tx.set(`sabaccTables/${t.id}/hands/${h.id}/private/${p.id}`,{cards:p.cards});
     const stored={...h,players:h.players.map(({cards,...p})=>p)};tx.set(`sabaccTables/${t.id}/state/current`,stored);
     if(wasActive&&!active(h))tx.set(`sabaccTables/${t.id}/hands/${h.id}`,{id:h.id,number:h.number,rulesetId:h.rulesetId,at,result:h.result,events:h.events});
    }
    t.revision++;t.updatedAt=at;tx.set(`sabaccTables/${t.id}`,t);result={...result,tableId:t.id,revision:t.revision};
   }
   tx.set(`sabaccAudit/${id}`,{id,at,action,tableId:t?.id??null,actorUid:actor.uid,reason:input.reason??'',revision:t?.revision??null});tx.set(receipt,{fingerprint,result});
   for(const [path,value] of pending)original.set(path,value);
   return result;
  });
 };
}
