import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createWorkflow} from '../../src/core/workflow.mjs';
export async function sabaccFixture(makeStore){
 const store=await makeStore(),suffix=randomUUID();let at=100000;const actor=n=>({uid:`${n}-${suffix}`,email:`${n}-${suffix}@example.invalid`,emailVerified:true,provider:'google.com',authTime:1}),owner=actor('owner'),a=actor('a'),b=actor('b'),eve=actor('eve');
 const w=createWorkflow({store,ownerEmail:owner.email,now:()=>at}),read=(action,input={},who=owner)=>w.dispatch(action,who,input),cmd=(action,input={},who=owner)=>read(action,{requestId:randomUUID(),...input},who);
 const settings=(await read('sabaccAdmin')).settings;await cmd('sabaccSettings',{settingsRevision:settings.revision,enabled:true,adminEmails:[]});
 for(const who of [a,b,eve])await cmd('sabaccProfile',{name:who===a?'Alpha':who===b?'Bravo':'Spectateur'},who);
 const created=await cmd('sabaccCreate',{name:'Cantina',location:'Saloon',tier:1,seatCount:8,mode:'LOCAL'}),tableId=created.tableId,qrToken=created.qrToken;
 const table=()=>store.get(`sabaccTables/${tableId}`),send=async(action,input={},who=owner)=>cmd(action,{tableId,qrToken,revision:(await table()).revision,...input},who),view=(who=a,input={})=>read('sabaccTable',{tableId,qrToken,...input},who);
 await send('sabaccStatus',{status:'OPEN'});
 for(const [seat,who] of [[0,a],[1,b]]){await send('sabaccJoin',{seat},who);const d=await view(who);await send('sabaccGrant',{playerId:d.self.id,amount:1000,reason:'Jetons de test'});}
 const start=async()=>{await send('sabaccReady',{ready:true},a);await send('sabaccReady',{ready:true},b);};
 return {store,w,owner,a,b,eve,read,cmd,table,send,view,start,tableId,qrToken,advance:n=>{at+=n;}};
}
export function sabaccSuite(makeStore,prefix='Sabacc'){
 test(`${prefix} : autonome, main privée, régie sans cartes, annulation atomique`,async()=>{
  const f=await sabaccFixture(makeStore);await f.start();const a=await f.view(),b=await f.view(f.b),gm=await f.view(f.owner),spy=await f.view(f.eve);assert.equal(a.cards.length,2);assert.equal(b.cards.length,2);assert.deepEqual(gm.cards,[]);assert.deepEqual(spy.cards,[]);assert.equal(a.self.balance,990);for(const secret of [b.cards[0].id,'deck','binding','actorId'])assert.equal(JSON.stringify(a).includes(`"${secret}"`),false,secret);await f.send('sabaccCancel',{reason:'Interruption fictive'});assert.equal((await f.view()).self.balance,1000);assert.equal((await f.view()).table.sabaccPot,0);
 });
 test(`${prefix} : concurrence, idempotence, mauvais tour et modification client refusés`,async()=>{
  const f=await sabaccFixture(makeStore);await f.start();const d=await f.view(),who=d.hand.activeSeat===0?f.a:f.b,other=who===f.a?f.b:f.a;
  await assert.rejects(f.send('sabaccPlay',{move:'GAIN'},other),{code:'SABACC_TURN'});
  const input={requestId:randomUUID(),revision:d.table.revision,move:'GAIN'};const results=await Promise.all([f.send('sabaccPlay',input,who),f.send('sabaccPlay',input,who)]);assert.deepEqual(results[0],results[1]);assert.equal((await f.view(who)).cards.length,3);
  await assert.rejects(f.send('sabaccPlay',{...input,move:'STAND'},who),{code:'REQUEST_ID_REUSED'});await assert.rejects(f.send('sabaccGrant',{amount:100,playerId:d.self.id,reason:'Triche'},f.a),{code:'FORBIDDEN'});
 });
 test(`${prefix} : pause des délais, désactivation, QR révoqué et reconnexion`,async()=>{
  const f=await sabaccFixture(makeStore);await f.start();f.advance(15000);await f.send('sabaccStatus',{status:'PAUSED'});const before=(await f.view()).hand.remainingMs;f.advance(90000);assert.equal((await f.view()).hand.remainingMs,before);await assert.rejects(f.send('sabaccPlay',{move:'STAND'},f.a),{code:'SABACC_PAUSED'});await f.send('sabaccStatus',{status:'RESUME'});assert.equal((await f.view()).hand.remainingMs,before);
  const state=await f.view();const second=createWorkflow({store:f.store,ownerEmail:f.owner.email});assert.deepEqual((await second.dispatch('sabaccTable',f.a,{tableId:f.tableId,qrToken:f.qrToken})).cards,state.cards);
  await f.send('sabaccRotateQR');await assert.rejects(f.view(),{code:'SABACC_QR'});
 });
 test(`${prefix} : une partie entière, jackpot et fonds conservés après redémarrage`,async()=>{
  const f=await sabaccFixture(makeStore);await f.start();for(let i=0;i<30;i++){const d=await f.view();if(d.hand.phase==='SETTLED')break;const actor=d.hand.activeSeat===0?f.a:f.b;await f.send('sabaccPlay',{move:d.hand.phase==='CARDS'?'STAND':'CHECK'},actor);}
  const d=await f.view(),b=await f.view(f.b);assert.equal(d.hand.phase,'SETTLED');assert.equal(d.hand.result.revealed.length,2);assert.equal(d.self.balance+b.self.balance+d.table.sabaccPot,2000);assert.equal(d.history.length,1);await f.send('sabaccRefundPot',{confirm:true,reason:'Fermer et rendre les crédits'});assert.equal((await f.view()).self.balance+(await f.view(f.b)).self.balance,2000);await f.send('sabaccStatus',{status:'ARCHIVED'});await assert.rejects(f.send('sabaccJoin',{seat:2},f.eve),{code:'SABACC_CLOSED'});
 });
 test(`${prefix} : nouvelle main, historique stable et paramètres figés`,async()=>{
  const f=await sabaccFixture(makeStore);await f.start();const old=await f.view();await f.send('sabaccConfigure',{name:'Cantina',location:'Saloon',seatCount:8,stakes:{...old.table.stakes,ante:25},access:{kind:'OPEN'}});assert.equal((await f.view()).hand.stakes.ante,5);
  await f.send('sabaccCancel',{reason:'Recommencer'});const history=(await f.view()).history;f.advance(5000);await f.send('sabaccReady',{ready:true},f.a);assert.equal((await f.view()).self.ready,true);assert.deepEqual((await f.view()).history,history);await f.send('sabaccReady',{ready:true},f.b);assert.equal((await f.view()).hand.number,2);assert.equal((await f.view()).self.balance,970);
 });
 test(`${prefix} : huit places, consentement aux antes et isolement de dix tables`,async()=>{
  const f=await sabaccFixture(makeStore),tables=[],times=[];const total=10;
  for(let n=0;n<total;n++){
   const t=n===0?{tableId:f.tableId,qrToken:f.qrToken}:await f.cmd('sabaccCreate',{name:`Table ${n}`,location:'Cantina test',tier:(n%3)+1,seatCount:8,mode:'LOCAL'});
   const tid=t.tableId,send=async(a,i={},who=f.owner)=>{const start=performance.now();const r=await f.cmd(a,{tableId:tid,qrToken:t.qrToken,revision:(await f.store.get(`sabaccTables/${tid}`)).revision,...i},who);times.push(performance.now()-start);return r;};
   if(n)await send('sabaccStatus',{status:'OPEN'});const players=n===0?[f.a,f.b]:[];
   for(let seat=players.length;seat<8;seat++){const suffix=randomUUID(),who={...f.a,uid:suffix,email:`${suffix}@example.invalid`};await f.cmd('sabaccProfile',{name:`Joueur ${n}-${seat}`},who);await send('sabaccJoin',{seat},who);const v=await f.read('sabaccTable',{tableId:tid,qrToken:t.qrToken},who);await send('sabaccGrant',{playerId:v.self.id,amount:1000,reason:'Recette fictive'});players.push(who);}
   for(const who of players)await send('sabaccReady',{ready:true},who);tables.push({tid,qrToken:t.qrToken,send,players});
  }
  const snapshots=await Promise.all(tables.map(t=>f.read('sabaccTable',{tableId:t.tid,qrToken:t.qrToken},t.players[0])));assert.equal(new Set(snapshots.map(d=>d.hand.id)).size,10);for(const d of snapshots){assert.equal(d.hand.players.length,8);assert.equal(d.cards.length,2);assert.equal(d.hand.phase,'CARDS');}
  await Promise.all(tables.map((t,i)=>t.send('sabaccPlay',{move:'GAIN'},t.players[snapshots[i].hand.activeSeat])));
  for(const t of tables){await t.send('sabaccCancel',{reason:'Fin de charge fictive'});const balances=await Promise.all(t.players.map(w=>f.read('sabaccTable',{tableId:t.tid,qrToken:t.qrToken},w)));assert.equal(balances.reduce((n,d)=>n+d.self.balance,0),8000);}
  times.sort((a,b)=>a-b);const p95=times[Math.floor(times.length*.95)];console.log(`${prefix} charge 10×8 : ${times.length} commandes, p95 ${Math.round(p95)} ms (seuil recette locale 1500 ms)`);assert.ok(p95<1500);
 });
 test(`${prefix} : retirer un joueur déjà couché puis terminer sans bloquer la table`,async()=>{
  const f=await sabaccFixture(makeStore);await f.send('sabaccJoin',{seat:2},f.eve);await f.send('sabaccGrant',{playerId:(await f.view(f.eve)).self.id,amount:100,reason:'Test troisième joueur'});await f.start();await f.send('sabaccReady',{ready:true},f.eve);const actors=[f.a,f.b,f.eve];for(let i=0;i<3;i++){const d=await f.view();await f.send('sabaccPlay',{move:'STAND'},actors[d.hand.activeSeat]);}const d=await f.view(),seat=d.hand.activeSeat;await f.send('sabaccPlay',{move:'FOLD'},actors[seat]);await f.send('sabaccExpel',{seat,reason:'Départ après abandon'});await f.send('sabaccCancel',{reason:'Fin de test'});assert.equal((await f.view(actors[seat])).self.seat,null);
 });
 test(`${prefix} : siège unique, autres tables et expulsions entre deux mains`,async()=>{
  const f=await sabaccFixture(makeStore);await assert.rejects(f.send('sabaccJoin',{seat:0},f.eve),{code:'SABACC_SEAT'});
  const t=await f.cmd('sabaccCreate',{name:'Casino',location:'Annexe',tier:2,seatCount:4,mode:'LOCAL'});await f.cmd('sabaccStatus',{tableId:t.id,revision:1,status:'OPEN'});await assert.rejects(f.cmd('sabaccJoin',{tableId:t.id,qrToken:t.qrToken,revision:2,seat:0},f.a),{code:'SABACC_ALREADY_SEATED'});await f.send('sabaccExpel',{seat:0,reason:'Fin de présence'});assert.equal((await f.view()).self.seat,null);
 });
}

// Real GN identity and wallet adapter, using a published SO fixture.
import {spaceGroupsFixture} from './space-groups-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
export function sabaccGnSuite(makeStore,prefix='Sabacc GN'){
 test(`${prefix} : identité native, pot séquestre, crédits protégés et remboursement`,async()=>{
  const f=await spaceGroupsFixture(makeStore);for(const cid of [f.cid,f.otherId])await f.edit(`accounts/${accountId(cid)}`,a=>({...a,balance:1000,reserved:0}));
  const before=await f.get(`accounts/${accountId(f.cid)}`),w=createWorkflow({store:f.store,ownerEmail:f.owner.email}),read=(a,i={},actor=f.owner)=>w.dispatch(a,actor,i),cmd=(a,i={},actor=f.owner)=>read(a,{requestId:randomUUID(),...i},actor);
  const settings=(await read('sabaccAdmin')).settings;await cmd('sabaccSettings',{settingsRevision:settings.revision,enabled:true,adminEmails:[]});
  const t=await cmd('sabaccCreate',{name:'Table GN',location:'Cantina',tier:1,seatCount:8,mode:'GN',sessionId:f.sid}),get=()=>f.store.get(`sabaccTables/${t.id}`),send=async(a,i={},actor=f.owner)=>cmd(a,{tableId:t.id,qrToken:t.qrToken,revision:(await get()).revision,...i},actor);
  await send('sabaccStatus',{status:'OPEN'});await send('sabaccJoin',{seat:0},f.player);await send('sabaccJoin',{seat:1},f.other);await send('sabaccReady',{ready:true},f.player);await send('sabaccReady',{ready:true},f.other);
  const held=await f.get(`accounts/${accountId(f.cid)}`);assert.equal(held.balance,990);assert.equal(held.protectedCredits,before.protectedCredits);const escrow=(await f.store.list(`sessions/${f.sid}/accounts`)).find(a=>a.ownerType==='SABACC');assert.equal(escrow.balance,20);
  const events=(await f.store.list(`sessions/${f.sid}/ledger`)).filter(e=>e.kind==='SABACC');assert.equal(events.length,1);assert.equal(events[0].entries.reduce((n,e)=>n+e.delta,0),0);
  await cmd('setStage',{sessionId:f.sid,revision:(await f.get('')).revision,stage:'PAUSE'});const closing=await read('prepareCampaignClosure',{sessionId:f.sid,reason:'Fin test',participantUids:[f.player.uid,f.other.uid]});assert.equal(closing.canClose,false);assert.ok(closing.blocks.some(b=>b.kind==='SABACC_POT'));
  await f.cmd('revokeAccess',{uid:f.player.uid});await assert.rejects(read('sabaccTable',{tableId:t.id,qrToken:t.qrToken},f.player),{code:'FORBIDDEN'});
  await send('sabaccCancel',{reason:'Annulation après retrait accès'});assert.equal((await f.get(`accounts/${accountId(f.cid)}`)).balance,1000);assert.equal((await f.get(`accounts/${escrow.id}`)).balance,0);
 });
}
