import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {identities} from '../../scripts/recette/identities.mjs';
import {seedMissionScenario} from '../../scripts/recette/scenario.mjs';
import {createWorkflow} from '../../src/core/workflow.mjs';

// Run the same native-command journey with MemoryStore and Firestore Emulator.
// Unique actors and request IDs keep the integrated case independent of other suites.
export function spacePilotJourneySuite(makeStore,prefix='PIL-02 intégré'){
 test(`${prefix} : fouille D12, crédits, carburant, voyage, mission et épisode suivant`,async()=>{
  let clock=Date.now();
  const store=makeStore(),uidPrefix=randomUUID(),actors=Object.fromEntries(identities.map(p=>[p.id,{uid:uidPrefix+'-'+p.id,email:p.email,emailVerified:true,provider:'google.com',authTime:Math.floor(Date.now()/1000)}]));
  const workflow=createWorkflow({store,ownerEmail:actors.owner.email,now:()=>clock,rollD12:()=>12,rollD6:()=>6});
  const f={store,call:(action,input={},role='owner')=>workflow.dispatch(action,actors[role],input),uids:Object.fromEntries(identities.map(p=>[p.id,actors[p.id].uid])),advance:ms=>{clock+=ms;}};
  const requestPrefix=randomUUID(),reqId=suffix=>`pil-${requestPrefix}-${suffix}`;

 const s=await seedMissionScenario(f.call,f.uids,{pilot:true}),sid=s.sessionId,base=`sessions/${sid}`;
 const before=(await f.store.list(`${base}/accounts`)).find(a=>a.ownerType==='SHOP'&&a.shopId==='counter');
 assert.equal(before.balance,150);assert.equal(before.reserved,120);
 const session=await f.call('session',{sessionId:sid});
 await f.call('setStage',{sessionId:sid,stage:'EN_JEU',revision:session.revision,requestId:reqId('start')});
 const input={sessionId:sid,targetId:'pilot-cache',kind:'SEARCH'};
 const prepared=await f.call('prepareFieldAction',input,'player');
 const started=await f.call('startFieldAction',{...input,present:true,confirmation:prepared.confirmation,requestId:reqId('search')},'player');
 await assert.rejects(f.call('finishFieldAction',{sessionId:sid,actionId:started.id,present:true},'player'));
 f.advance(60000);
 const finished=await f.call('finishFieldAction',{sessionId:sid,actionId:started.id,present:true,requestId:reqId('finish')},'player');
 assert.equal(finished.result.roll,12);
 assert.ok(finished.result.discoveries.some(x=>x.id==='cash'));
 const take={sessionId:sid,actionId:started.id,findId:'cash',present:true,requestId:reqId('cash')};
 const received=await f.call('takeFieldFind',take,'player');
 assert.equal(received.amount,20);
 assert.deepEqual(await f.call('takeFieldFind',take,'player'),received);
 const state=await f.store.get(`${base}/fieldStates/pilot-cache`);
 assert.equal(state.finds.cash.status,'TAKEN');
 const after=(await f.store.list(`${base}/accounts`)).find(a=>a.ownerType==='SHOP'&&a.shopId==='counter');
 assert.equal(after.balance,130);assert.equal(after.reserved,100);
 assert.equal((await f.call('myWallet',{sessionId:sid},'player')).account.balance,20);
 // Même session et mêmes ressources : achat du carburant protégé par Bela.
 const saleInput={sessionId:sid,shopId:'counter',offerId:'fuel',quantity:4,useProtected:true};
 const quote=await f.call('prepareShopPurchase',saleInput,'other');
 const saleRequest={...saleInput,quoteAt:quote.quoteAt,confirmation:quote.confirmation,requestId:reqId('fuel-sale')};
 const sale=await f.call('buyShopOffer',saleRequest,'other');
 assert.deepEqual(await f.call('buyShopOffer',saleRequest,'other'),sale);
 const shop=(await f.call('shopAdmin',{sessionId:sid},'owner')).orders.find(o=>o.id===sale.id);
 await f.call('offerShopPickup',{sessionId:sid,saleId:sale.id,confirmation:shop.confirmation,requestId:reqId('fuel-offer')},'owner');
 const pickup=(await f.call('shops',{sessionId:sid},'other')).orders.find(o=>o.id===sale.id);
 const receiptInput={sessionId:sid,saleId:sale.id,confirmation:pickup.confirmation,received:true,requestId:reqId('fuel-received')};
 const receipt=await f.call('confirmShopPickup',receiptInput,'other');
 assert.deepEqual(await f.call('confirmShopPickup',receiptInput,'other'),receipt);
 const fuelLot=(await f.call('myInventory',{sessionId:sid},'other')).lots.find(l=>l.item.id==='propellant');
 assert.equal(fuelLot.quantity,4);
 assert.equal((await f.call('myWallet',{sessionId:sid},'other')).account.protectedCredits,100);
 assert.equal((await f.store.list(base+'/inventory')).filter(l=>l.id===sale.purchasedLotId).length,1);
 // Le stock acheté n'est pas injecté directement dans le vaisseau : plein natif 2 minutes.
 const shipId='pilot-cargo',fuelInput={sessionId:sid,shipId,lotId:fuelLot.id,quantity:4};
 const fuelPreview=await f.call('prepareRefuel',fuelInput,'other');
 await f.call('refuelShip',{...fuelInput,present:true,confirmation:fuelPreview.confirmation,requestId:reqId('refuel')},'other');
 assert.equal((await f.store.get(base+'/ships/'+shipId)).fuel,0);
 const waitingFuelNav=await f.call('shipNavigation',{sessionId:sid,shipId},'other');
 await assert.rejects(f.call('finishSoRefuel',{sessionId:sid,shipId,present:true,confirmation:waitingFuelNav.confirmation,requestId:reqId('refuel-early')},'other'),{code:'VOYAGE_NOT_READY'});
 f.advance(120000);
 const fuelNav=await f.call('shipNavigation',{sessionId:sid,shipId},'other');
 await f.call('finishSoRefuel',{sessionId:sid,shipId,present:true,confirmation:fuelNav.confirmation,requestId:reqId('refuel-finish')},'other');
 assert.equal((await f.store.get(base+'/ships/'+shipId)).fuel,4);
 // Préparation et voyage sur la route réellement publiée, avec jet D6 contrôlé en test.
 const voyageInput={sessionId:sid,shipId,navigationCode:'PILOT-AWAY-CODE',passengerCodes:[]};
 const voyagePreview=await f.call('prepareVoyage',voyageInput,'other');
 assert.equal(voyagePreview.route.fuelCost,2);
 await f.call('departShip',{...voyageInput,present:true,confirmation:voyagePreview.confirmation,requestId:reqId('depart')},'other');
 const waitingDepartureNav=await f.call('shipNavigation',{sessionId:sid,shipId},'other');
 await assert.rejects(f.call('finishSoPreparation',{sessionId:sid,shipId,present:true,confirmation:waitingDepartureNav.confirmation,requestId:reqId('preparation-early')},'other'),{code:'VOYAGE_NOT_READY'});
 f.advance(180000);
 const departNav=await f.call('shipNavigation',{sessionId:sid,shipId},'other');
 const departInput={sessionId:sid,shipId,present:true,confirmation:departNav.confirmation,requestId:reqId('finish-preparation')};
 const depart=await f.call('finishSoPreparation',departInput,'other');
 assert.deepEqual(await f.call('finishSoPreparation',departInput,'other'),depart);
 assert.equal((await f.store.get(base+'/ships/'+shipId)).fuel,2);
 f.advance(300000);
 const arrivalNav=await f.call('shipNavigation',{sessionId:sid,shipId},'other');
 await f.call('arriveShip',{sessionId:sid,shipId,confirmation:arrivalNav.confirmation,requestId:reqId('arrival')},'other');
 const arrived=await f.store.get(base+'/ships/'+shipId);
 assert.equal(arrived.portId,'away');
 assert.equal(arrived.fuel,2);
 assert.equal(arrived.revisionRequired,false);
 const belaId=(await f.call('mySession',{sessionId:sid},'other')).character.id;
 assert.equal((await f.store.get(base+'/characters/'+belaId)).activeVoyageId,null);
 const finalTill=(await f.store.list(base+'/accounts')).find(a=>a.ownerType==='SHOP'&&a.shopId==='counter');
 assert.equal(finalTill.balance,230);
 assert.equal(finalTill.reserved,100);
 // Mission M7 sur la même session : preuve, décision, 10 minutes de contestation et paiement réel.
 const contractId=s.contractId;
 let missionReceipt=0;
 const missionCommand=async(previewAction,commandAction,input,role='owner')=>{
  const args={sessionId:sid,...input},preview=await f.call(previewAction,args,role);
  return f.call(commandAction,{...args,confirmation:preview.confirmation,requestId:reqId('mission-'+(++missionReceipt))},role);
 };
 await missionCommand('prepareContractProof','submitContractProof',
  {contractId,body:'Contact fictif rencontré et compte rendu remis',completedStepIds:['meet','report']},'player');
 await missionCommand('prepareContractReview','reviewContract',{contractId,decision:'PAY',reason:'Preuve du pilote vérifiée'});
 assert.equal((await f.call('myWallet',{sessionId:sid},'player')).account.balance,20);
 await assert.rejects(missionCommand('prepareContractSettlement','settleContract',
  {contractId,reason:'Tentative de paiement avant échéance'}),{code:'SO_CONTEST_OPEN'});
 f.advance(600000);
 await missionCommand('prepareContractSettlement','settleContract',
  {contractId,reason:'Délai de contestation écoulé'});
 assert.equal((await f.call('myWallet',{sessionId:sid},'player')).account.balance,120);
 const settledTill=(await f.store.list(base+'/accounts')).find(a=>a.ownerType==='SHOP'&&a.shopId==='counter');
 assert.equal(settledTill.balance,130);
 assert.equal(settledTill.reserved,0);
 // Une rémunération payée ne vaut pas remise physique de la récompense matérielle.
 let reward=(await f.call('sessionContract',{sessionId:sid,contractId},'owner')).rewardPickups[0];
 assert.equal(reward.quantity,3);
 assert.equal(reward.pickupStatus,'WAITING');
 await f.call('offerContractRewardPickup',{sessionId:sid,contractId,pickupId:reward.id,
  confirmation:reward.confirmation,present:true,requestId:reqId('reward-offer')},'owner');
 reward=(await f.call('contractDetail',{sessionId:sid,contractId},'player')).rewardPickups[0];
 assert.equal(reward.pickupStatus,'READY');
 const rewardRequest={sessionId:sid,contractId,pickupId:reward.id,confirmation:reward.confirmation,
  received:true,requestId:reqId('reward-received')};
 const rewardReceived=await f.call('confirmContractRewardPickup',rewardRequest,'player');
 assert.deepEqual(await f.call('confirmContractRewardPickup',rewardRequest,'player'),rewardReceived);
 assert.equal((await f.store.get(base+'/inventory/'+reward.id)).quantity,3);
 assert.equal((await f.call('contractDetail',{sessionId:sid,contractId},'player')).rewardPickups[0].pickupStatus,'RECEIVED');
 // Après les opérations closes, PIL-02 vérifie la vraie clôture et la copie du prochain épisode.
 const oldWallet=(await f.call('myWallet',{sessionId:sid},'player')).account;
 const stop=(await f.call('session',{sessionId:sid})).revision;
 await f.call('setStage',{sessionId:sid,stage:'PAUSE',revision:stop,requestId:reqId('final-pause')},'owner');
 const closeInput={sessionId:sid,reason:'Fin du pilote intégré',participantUids:[f.uids.player,f.uids.other]};
 const closePreview=await f.call('prepareCampaignClosure',closeInput,'owner');
 assert.equal(closePreview.canClose,true,JSON.stringify(closePreview.blocks));
 await f.call('closeCampaignSession',{...closeInput,confirmation:closePreview.confirmation,
  requestId:reqId('close')},'owner');
 const nextInput={sessionId:sid,campaignId:s.campaignId,title:'Space Outlaws - episode pilote 2',
  capacity:4,privacy:'Suite fictive sans données réelles',healthPolicy:'PRESERVE',
  reason:'Conserver les acquis du pilote',fields:[]};
 const nextPreview=await f.call('prepareCampaignEpisode',nextInput,'owner');
 let next=await f.call('beginCampaignEpisode',{...nextInput,confirmation:nextPreview.confirmation,
  requestId:reqId('next-begin')},'owner'),step=0;
 const buildId=next.buildId;
 while(next.status!=='READY'&&step<40){
  step++;
  next=await f.call('advanceCampaignEpisode',{sessionId:sid,campaignId:s.campaignId,buildId,
   requestId:reqId('next-page-'+step)},'owner');
 }
 assert.equal(next.status,'READY');
 const successor=(await f.call('mySession',{sessionId:next.id},'other')).character;
 assert.equal(successor.id,belaId);
 const nextShip=await f.store.get('sessions/'+next.id+'/ships/pilot-cargo');
 assert.equal(nextShip.portId,'away');
 assert.equal(nextShip.fuel,2);
 const nextAri=(await f.call('mySession',{sessionId:next.id},'player')).character;
 assert.ok(nextAri.id);
 const nextWallet=(await f.call('myWallet',{sessionId:next.id},'player')).account;
 assert.equal(nextWallet.balance,oldWallet.balance+oldWallet.protectedCredits);
 assert.equal(nextWallet.protectedCredits,0);
 assert.equal((await f.call('session',{sessionId:sid})).stage,'ARCHIVED');

 });
}
