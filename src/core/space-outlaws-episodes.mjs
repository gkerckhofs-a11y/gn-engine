import {createHash} from 'node:crypto';
import {requireThat,documentId,whole} from './validation.mjs';
import {preparationInput} from './preparation-state.mjs';
import {gameTime} from './clock.mjs';
import {survival} from './space-outlaws-health-state.mjs';
import {personOpen} from './person-state.mjs';
import {actionPointMaximum,actionPointState} from './action-point-state.mjs';
import {moneyState,writeLedger} from './economy-state.mjs';

export const hasSoEpisodes=s=>s?.spaceOutlaws?.episodesVersion===1;
const hash=v=>createHash('sha256').update(v).digest('hex');
// Runtime collections of the connected SO services. Global request receipts and
// invitations stay attached to their original session; histories retain IDs.
const roots=['characters','registrations','groups','knowledge','skills','classes','items','accounts','inventory','masterRows','fieldTargets','fieldStates','personProfiles','warehouses','ships','routes','commodityPrices','priceEvents','cargoTariffs','recipes','shops','shopProvisions','shipModels','ports','missions','announcements','applications','contracts','lotSales','lotTransfers','marketListings','bounties','fieldActions','personActions','aidOffers','cargoTransfers','voyages','spaceAmbushes','spaceCombats','spaceRescues','shipMaintenance','ledger','logisticsHistory','audit'];
const children={registrations:['successionHistory'],characters:['history','knowledge','healthHistory','mediaHistory'],items:['mediaHistory'],ships:['mediaHistory'],fieldTargets:['history'],inventory:['history','mediaHistory'],accounts:['history'],shops:['offers'],announcements:['history','mediaHistory'],applications:['messages'],contracts:['history'],bounties:['history','claims'],spaceCombats:['rounds'],groups:['updates','history']};
const limits={records:5000,bytes:6*1024*1024};
export async function readSoEpisode(tx,s){
 const base=`sessions/${s.id}`,entries=[],data={};
 const put=(path,value)=>{entries.push({path,data:value});requireThat(entries.length<=limits.records,'CAMPAIGN_TOO_LARGE');};
 const list=async path=>{
  const rows=await tx.list(`${base}/${path}`,null,{limit:limits.records+1});
  requireThat(rows.length<=limits.records,'CAMPAIGN_TOO_LARGE');
  rows.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  for(const row of rows)put(`${path}/${documentId(row.id)}`,row);
  return rows;
 };
 // Bounded batches keep the Firestore snapshot within the native
 // campaign limit rather than silently truncating financial or proof history.
 await Promise.all(roots.map(async key=>{data[key]=await list(key);}));
 const paths=[];for(const [key,subcollections] of Object.entries(children))for(const row of data[key])for(const sub of subcollections)paths.push(`${key}/${row.id}/${sub}`);
 for(let i=0;i<paths.length;i+=30)await Promise.all(paths.slice(i,i+30).map(list));
 const claimPaths=entries.filter(e=>/^bounties\/[^/]+\/claims\/[^/]+$/.test(e.path)).map(e=>`${e.path}/history`);
 for(let i=0;i<claimPaths.length;i+=30)await Promise.all(claimPaths.slice(i,i+30).map(list));
 for(const c of data.characters){
  const path=`characters/${c.id}/resources/actionPoints`,v=await tx.get(`${base}/${path}`);if(v)put(path,v);
 }
 for(const r of data.registrations){const key=r.admission?.confirmation?.identityKey;if(key){const path=`admissionIdentities/${documentId(key)}`,v=await tx.get(`${base}/${path}`);if(v)put(path,v);}}
 for(const r of data.registrations){const path=`notebooks/${hash(r.uid)}/notes`;for(const n of await list(path))await list(`${path}/${n.id}/shares`);}
 for(const id of ['settings','occupancy']){const path=`admission/${id}`,v=await tx.get(`${base}/${path}`);if(v)put(path,v);}
 for(const g of data.groups)for(const u of entries.filter(e=>e.path.startsWith(`groups/${g.id}/updates/`)))for(const cid of u.data.recipientIds??[]){const path=`groups/${g.id}/inboxes/${cid}/updates/${u.data.id}`,v=await tx.get(`${base}/${path}`);if(v)put(path,v);}
 entries.sort((a,b)=>a.path.localeCompare(b.path));
 requireThat(Buffer.byteLength(JSON.stringify(entries))<=limits.bytes,'CAMPAIGN_TOO_LARGE');
 return {...data,entries,receipts:Object.fromEntries(data.characters.map(c=>[c.id,entries.filter(e=>e.path.startsWith(`characters/${c.id}/knowledge/`)).map(e=>e.data)]))};
}
export function soClosure(s,data,input,at){
 requireThat(hasSoEpisodes(s),'SO_GAMEPLAY_NOT_OPEN');
 requireThat(['PAUSE','FINISHED'].includes(s.stage)&&s.clock.runningSince===null,'CAMPAIGN_PAUSE_REQUIRED');
 requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
 requireThat(Array.isArray(input.participantUids)&&new Set(input.participantUids).size===input.participantUids.length,'SO_PARTICIPANTS_REQUIRED');
 const eligible=data.registrations.filter(r=>r.admission?.status==='APPROVED');
 requireThat(input.participantUids.every(uid=>eligible.some(r=>r.uid===uid)),'SO_PARTICIPANTS_REQUIRED');
 const blocks=[],changes=[],block=(kind,rows)=>rows.forEach(r=>blocks.push({kind,id:r.id,title:r.public?.displayName??r.name??r.terms?.title??r.id}));
 block('SURVIVAL',data.characters.filter(c=>['URGENT','EXPIRED'].includes(survival(s,c,at).status)));
 block('PERSON_ACTION',data.personActions.filter(personOpen));
 block('FIELD_ACTION',data.fieldActions.filter(a=>a.status==='ACTIVE'));
 block('CARGO_TRANSFER',data.cargoTransfers.filter(t=>t.status==='LOADING'));
 block('SHIP_OPERATION',data.ships.filter(sh=>sh.operation||sh.rescueId||sh.maintenanceId));
 block('CHARACTER_OPERATION',data.characters.filter(c=>c.activeFieldActionId||c.activePersonActionId||c.activeAidId||c.activeNavigationId||c.activeMaintenanceId||c.activeCargoId));
 block('RESERVED_STOCK',data.inventory.filter(l=>['FIELD_RESERVED','CARGO_RESERVED','RESERVED'].includes(l.status)));
 // PIL-03 / ESC-01 orders may reserve PA across the frozen round. Every other action
 // must be completed/cancelled through its own service before closure.
 for(const c of data.characters){
  const points=data.entries.find(e=>e.path===`characters/${c.id}/resources/actionPoints`)?.data;
  const orders=data.spaceCombats.filter(e=>e.status==='ROUND').flatMap(e=>Object.values(e.orders)).filter(o=>o.actorId===c.id&&o.specialReserved);
  if((points?.reserved??0)!==orders.length)block('RESERVED_AP',[c]);
 }
 const participants=eligible.map(r=>{
  const played=input.participantUids.includes(r.uid),c=data.characters.find(c=>c.id===r.characterId&&c.assignedUid===r.uid&&!c.survival?.dead);
  const prior=r.progression??{completedSessions:0,pendingXp:0};whole(prior.completedSessions);whole(prior.pendingXp);
  if(played){
   changes.push({path:`registrations/${r.id}`,data:{...r,progression:{...prior,completedSessions:whole(prior.completedSessions+1),pendingXp:whole(prior.pendingXp+(c?0:3)),lastCompletedSessionId:s.id}}});
   if(c)changes.push({path:`characters/${c.id}`,data:{...c,xp:whole((c.xp??0)+3),earnedXp:whole((c.earnedXp??0)+3)}});
  }
  return {uid:r.uid,name:c?.public.displayName??`${r.admission.proposal.firstName} ${r.admission.proposal.lastName}`,played,xp:played?3:0,characterId:c?.id??null,completedSessions:prior.completedSessions+(played?1:0),pendingXp:prior.pendingXp+(played&&!c?3:0)};
 });
 if(changes.length>200)block('TOO_MANY_PARTICIPANTS',[{id:s.id}]);
 const time=gameTime(s.clock,at);
 const continuity={participants,bounties:data.bounties.filter(b=>b.terms.spaceOutlaws).map(b=>({id:b.id,title:b.terms.title,status:b.status,reserved:b.status==='OPEN'?(b.terms.quota-b.awardedCount)*b.terms.amount:0,awardedCount:b.awardedCount,pending:data.entries.filter(e=>e.path.startsWith(`bounties/${b.id}/claims/`)&&/^bounties\/[^/]+\/claims\/[^/]+$/.test(e.path)&&e.data.status==='SUBMITTED').length})),contracts:data.contracts.filter(c=>!['CANCELLED','DECLINED'].includes(c.status)).map(c=>({id:c.id,title:c.terms.title,status:c.status,reserved:['ACTIVE','SUBMITTED','REVIEWED','DISPUTED'].includes(c.status)?Math.max(0,c.terms.amount-(c.paidAmount??0)):0,deadlineMs:c.deadlineGameMs==null?null:Math.max(0,c.deadlineGameMs-time),appeal:c.appeal?.status??null})),
  voyages:data.ships.filter(sh=>sh.journey).map(sh=>({id:sh.id,name:sh.name,hull:sh.hull,shield:sh.shield,fuel:sh.fuel,remainingMs:sh.journey.suspended?sh.journey.remainingMs:Math.max(0,sh.journey.arrivesAtGameMs-time),combatId:sh.combatId??null})),
  pickups:data.lotSales.filter(x=>x.status==='SOLD'&&x.pickupStatus!=='RECEIVED').length+data.contracts.reduce((n,c)=>n+(c.rewardPickups??[]).filter(x=>x.pickupStatus!=='RECEIVED').length,0),gameTimeMs:time};
 return {changes,blocks,continuity,cancelled:{market:0,sales:0,transfers:0},canClose:blocks.length===0};
}
export function soEpisodeHeader(input,source,c,id,at){
 requireThat(hasSoEpisodes(source),'SO_GAMEPLAY_NOT_OPEN');
 requireThat(input.healthPolicy==='PRESERVE'&&!(input.fields?.length),'SO_EPISODE_PRESERVE_REQUIRED');
 const metadata=preparationInput(Object.fromEntries(['title','summary','date','time','place','practical','privacy','capacity'].map(k=>[k,input[k]??(['title','privacy','capacity'].includes(k)?source[k]:'')])));
 requireThat(metadata.capacity>=source.accepted,'INVALID_CAPACITY');
 const {campaignClosedAt,...prior}=source;
 return {...prior,...metadata,id,previousSessionId:source.id,campaignEpisode:c.episodeCount+1,campaignSealed:false,campaignHealthPolicy:'PRESERVE',stage:'BRIEFING',registrationOpen:false,revision:1,createdAt:at,
  actionPointSchedule:{nextAtGameMs:whole(source.clock.elapsedMs+source.actionPointRules.renewalMinutes*60000,'CLOCK_OVERFLOW')}};
}
export function soEpisodeEntries(data,source,s,actor,at){
 const entries=new Map(data.entries.map(e=>[e.path,structuredClone(e.data)])),put=(path,value)=>entries.set(path,value);
 for(const c of data.characters){
  const r=data.registrations.find(r=>r.uid===c.assignedUid),level=r?(r.progression?.completedSessions>=4?2:1):c.globalLevel;
  const next={...c,sessionId:s.id,globalLevel:level,convalescentUntilGameMs:0,...(c.lootEncounter?{lootEncounter:null}:{})};put(`characters/${c.id}`,next);
  const path=`characters/${c.id}/resources/actionPoints`,old=actionPointState(source,c,entries.get(path),source.campaignClosedAt),max=actionPointMaximum(s.actionPointRules,next);
  put(path,{...old,available:max-old.reserved,lastRefillGameMs:s.clock.elapsedMs,revision:old.revision+1});
 }
 for(const a of data.accounts){
  let next={...a,sessionId:s.id};
  if(a.protectedCredits>0){
   const character=data.characters.find(c=>c.id===a.characterId),amount=a.protectedCredits,dead=!!character?.survival?.dead;
   next={...next,balance:whole(a.balance+(dead?0:amount),'BALANCE_OVERFLOW'),protectedCredits:0,revision:a.revision+1};
   const event={id:hash(`so-episode:${source.id}:${a.id}`),at,kind:'SO_PROTECTION_EXPIRED',actorUid:actor.uid,memo:dead?'Solde de création éteint au décès':'Solde de création devenu ordinaire',reason:`Reprise de l’épisode ${source.campaignEpisode}`,sourceSessionId:source.id,createdCurrency:0,removedCurrency:dead?amount:0,
    entries:[{accountId:a.id,characterId:a.characterId,delta:dead?0:amount,protectedDelta:-amount,before:moneyState(a),after:moneyState(next)}]};
   writeLedger({set:(path,value)=>put(path.slice(`sessions/${s.id}/`.length),value)},s.id,event);
  }
  put(`accounts/${a.id}`,next);
 }
 // These personal recovery caches intentionally expire. No PV, protection,
 // stock, ship damage, event, contract or journey timestamp is regenerated.
 for(const a of data.aidOffers)if(a.status==='OFFERED')put(`aidOffers/${a.id}`,{...a,status:'EXPIRED'});
 const result=[...entries].map(([path,data])=>({path,data}));
 requireThat(result.length<=limits.records&&Buffer.byteLength(JSON.stringify(result))<=limits.bytes,'CAMPAIGN_TOO_LARGE');
 return result;
}
