import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createWorkflow} from '../src/core/workflow.mjs';
import {commerceCounters,commerceFuel} from '../src/shared/commerce-solo.mjs';
import {initialClassKit} from '../src/shared/initial-class-kit.mjs';
import {analysisProfile} from '../src/shared/space-outlaws-analysis.mjs';
import {runSoloDemo} from '../web/solo-demo-run.mjs';
import {seedCommerceSolo} from '../web/commerce-solo-setup.mjs';
import {MemoryStore} from './support/memory.mjs';

const owner={uid:'rec-owner',email:'owner@example.invalid',emailVerified:true,provider:'google.com',authTime:100};
test('Recette commerce solo : Master existant, reprise, huit rôles, marchés, stockage et QR',async()=>{
  const store=new MemoryStore();
  const workflow=createWorkflow({store,ownerEmail:owner.email,now:()=>100000});
  const dispatch=(action,input={})=>workflow.dispatch(action,owner,input);
  const {id:sessionId,campaignId}=await dispatch('createSpaceOutlawsPreparation',{
    requestId:randomUUID(),creationId:randomUUID(),title:'Recette commerce',campaignTitle:'Commerce',capacity:8,privacy:'Privé',
  });
  const read=(action,input={},demoRole)=>dispatch(action,{sessionId,...input,...(demoRole?{demoRole}:{})});
  const cmd=(action,input={},role)=>read(action,{requestId:randomUUID(),...input},role);
  await assert.rejects(workflow.dispatch('prepareCommerceSolo',{...owner,uid:'other'},{sessionId}),{code:'FORBIDDEN'});
  await assert.rejects(read('prepareCommerceSolo'),{code:'COMMERCE_SOLO_MASTER_REQUIRED'});

  let draftRevision=0;
  const central=(action,input)=>dispatch(action,{campaignId,requestId:randomUUID(),draftRevision:draftRevision++,...input,reason:'Données de test'});
  const item=(itemId,name,usage,unitVolume,kind,consumable,referenceUnitValueCr=null)=>central('saveCentralItem',{itemId,itemRevision:0,item:{
    usage,name,description:'Objet de test',category:'Recette',unit:'unité',kind,consumable,unitVolume,legality:'LEGAL',pillable:true,gmNotes:'Recette',...(referenceUnitValueCr?{referenceUnitValueCr}:{}),
  }});
  const created=new Set();
  for(const classId of ['COM','ROG','TRA','MED','MEC','PIL','COU','INF']){
    const bindings=[];
    for(const slot of initialClassKit(classId).slots){
      const itemId=`kit-${slot.id}`;
      bindings.push({slotId:slot.id,itemId});
      if(!created.has(itemId)){
        created.add(itemId);
        await item(itemId,slot.label,'PERSONAL',1,slot.requiresConsumable?'STACKABLE':'INDIVIDUAL',slot.requiresConsumable);
      }
    }
    await central('saveCentralClassKit',{classKitId:classId,classKitRevision:0,classKit:{bindings,gmNotes:'Recette'}});
  }
  await item(commerceFuel.itemId,'Carburant fictif','FUEL',1,'STACKABLE',true);
  const materials=commerceCounters[0].markets;
  for(const [i,m] of materials.entries())await item(m.itemId,m.commodityCode,'COMMERCIAL',m.commodityCode==='ORE'?2:1,'STACKABLE',false,[40,60,100,50][i]);
  await central('saveCentralCharacter',{characterId:'merchant',characterRevision:0,character:{displayName:'Nara Voss',profession:'Commerce',description:'PNJ',nature:'HUMANOID',biography:'Recette',roleplay:'Comptoir',playerSecrets:'Secret',gmNotes:'Recette',objectives:[],relations:[]}});
  await central('saveCentralKnowledge',{knowledgeId:'notice',knowledgeRevision:0,knowledge:{kind:'DOCUMENT',title:'Recette',body:'Information fictive.',origin:'Recette',shareMode:'SHOW',gmTruth:'Recette',gmNotes:'Recette',initialCharacterIds:[],qrEnabled:false,qrAudience:'SELECTED',qrCharacterIds:[],qrSkillId:null,qrSkillLevel:null}});
  await central('saveCentralFieldTarget',{fieldTargetId:'counter-place',fieldTargetRevision:0,fieldTarget:{kind:'ANALYSIS',title:'Comptoir',description:'Lieu de recette',gmNotes:'Recette',dependencyId:null,offlineSeconds:0,failureLockSeconds:0,repairProtectionSeconds:0,profiles:{ANALYZE:analysisProfile('COM-03')},rewards:[{id:'notice',kind:'KNOWLEDGE',knowledgeId:'notice',quantity:1,stock:1,perCharacter:1,minLevel:1,bonus:false}]}});
  await central('saveCentralShipModel',{shipModelId:'rec-cargo',shipModelRevision:0,shipModel:{name:'Cargo',description:'Cargo fictif',gmNotes:'Recette',profileId:'CARGO'}});
  for(const {portId,shopId,markets} of commerceCounters){
    await central('saveCentralPort',{portId,portRevision:0,port:{name:portId,description:'Port de recette',gmNotes:'Recette',navigationCode:`REC-${portId}`,locationTargetId:null,customsRules:materials.map(m=>({itemId:m.itemId,status:'FREE'}))}});
    await central('saveCentralShop',{shopId,shopRevision:0,shop:{name:shopId,description:'Comptoir',sellerCharacterId:'merchant',locationTargetId:'counter-place',gmNotes:'Recette'}});
    for(const [i,m] of markets.entries())await central('saveCentralOffer',{offerId:m.offerId,offerRevision:0,offer:{name:m.commodityCode,shopId,itemId:m.itemId,unitPrice:[40,60,100,50][i],buybackPrice:null,conditions:'Retrait',gmNotes:'Recette',deliveryMode:'PHYSICAL'}});
  }
  const {offerId,...fuel}=commerceFuel;
  await central('saveCentralOffer',{offerId,offerRevision:0,offer:{...fuel,name:'Carburant fictif',unitPrice:25,buybackPrice:null,conditions:'Retrait',gmNotes:'Recette',deliveryMode:'PHYSICAL'}});
  await central('saveCentralRoute',{routeId:'bk',routeRevision:0,route:{name:'Breach Port → Kessel',description:'Recette',gmNotes:'Recette',fromPort:'home',toPort:'away',navigationCode:'REC-BK',distanceId:'SHORT',riskId:'SECURED'}});
  const original=await dispatch('centralMaster',{campaignId,workshop:'M5'});

  const cache=new Map();
  const storage={getItem:key=>cache.get(key),setItem:(key,value)=>cache.set(key,value),removeItem:key=>cache.delete(key)};
  let lose=true;
  const api=async(action,input)=>{
    try{
      const result=await dispatch(action,input);
      if(action==='provisionShop'&&lose){lose=false;throw Error('Réponse perdue');}
      return result;
    }catch(e){e.message=`${action}: ${e.message}`;throw e;}
  };
  const run=()=>runSoloDemo(api,storage,sessionId,()=>{},call=>seedCommerceSolo(call,sessionId));
  await assert.rejects(run(),/Réponse perdue/);
  const result=await run();
  assert.equal(cache.size,0);
  assert.equal(result.sessionId,sessionId);
  assert.equal((await store.list('sessions')).length,1);
  assert.equal((await read('soloDemoContext')).profiles.length,8);
  const session=await read('session');
  assert.equal(session.stage,'EN_JEU');
  assert.equal(session.characters.filter(c=>c.birth).length,8);
  assert.equal(session.groups[0].members.length,8);
  assert.equal((await dispatch('sabaccAdmin')).tables.find(t=>t.id===result.tableId).status,'OPEN');
  const markets=(await read('galacticEconomyAdmin')).markets;
  assert.equal(markets.length,12);
  assert.ok(markets.every(m=>m.stockValid&&m.buybackBudget===400));
  const ore=markets.find(m=>m.itemId==='rec-minerai'&&m.portId==='home');
  assert.equal(ore.item.unitVolume,2);
  assert.equal(ore.stock,8);
  const local=await read('localAccessAdmin');
  assert.equal(local.terminalQrVersion,1);
  assert.equal(local.docks.length,4);
  assert.equal(local.readiness.ready,true);
  await assert.rejects(read('galacticMarkets',{},'COU'),{code:'LOCAL_SCAN_REQUIRED'});
  await cmd('scanLocalTerminal',{terminalId:'session-bourse'},'COU');
  await cmd('scanLocalTerminal',{terminalId:'session-bourse'},'PIL');
  assert.equal((await read('galacticMarkets',{},'COU')).markets.length,12);
  await assert.rejects(read('galacticMarkets',{},'PIL'),{code:'FORBIDDEN'});
  const oreOrder={shopId:ore.shopId,offerId:ore.offerId,quantity:4,useProtected:false};
  await assert.rejects(read('prepareShopPurchase',oreOrder,'COU'),{code:'LOCAL_SCAN_REQUIRED'});
  await cmd('scanLocalTerminal',{terminalId:'shop-rec-comptoir-breach'},'COU');
  const quote=await read('prepareShopPurchase',oreOrder,'COU');
  assert.equal(quote.amount,460);
  const sale=await cmd('buyShopOffer',{...oreOrder,confirmation:quote.confirmation,quoteAt:quote.quoteAt},'COU');
  const offer=(await read('shopAdmin')).orders.find(order=>order.id===sale.id);
  await cmd('offerShopPickup',{saleId:sale.id,confirmation:offer.confirmation});
  const pickup=(await read('shops',{},'COU')).orders.find(order=>order.id===sale.id);
  await cmd('confirmShopPickup',{saleId:sale.id,confirmation:pickup.confirmation,received:true},'COU');

  const rent=async name=>{
    const dock=local.docks.find(w=>w.name===name);
    const input={warehouseId:dock.id,tenantType:'CHARACTER',fromAccountId:(await read('myWallet',{},'COU')).account.id};
    const prepared=await read('prepareCommercialStorageRent',input,'COU');
    await cmd('rentCommercialStorage',{...input,confirmation:prepared.confirmation},'COU');
    const terminalId=`dock-${dock.id}`;
    await cmd('scanLocalTerminal',{terminalId},'COU');
    await cmd('unlockLocalCode',{terminalId,code:'RECETTE-QUAI'},'COU');
    return dock.id;
  };
  const lotId=sale.purchasedLotId,small=await rent('Petite consigne');
  await assert.rejects(read('prepareCommercialStorageMove',{warehouseId:small,lotId,direction:'DEPOSIT',quantity:4},'COU'),{code:'WAREHOUSE_FULL'});
  const large=await rent('Réserve du quai');
  const move=async(input)=>{
    const prepared=await read('prepareCommercialStorageMove',input,'COU');
    return cmd('moveCommercialStorage',{...input,confirmation:prepared.confirmation},'COU');
  };
  const parked=await move({warehouseId:large,lotId,direction:'DEPOSIT',quantity:4});
  const retrieved=await move({warehouseId:large,lotId:parked.id,direction:'WITHDRAW',quantity:4});
  await cmd('scanLocalTerminal',{terminalId:'session-bourse'},'COU');
  const saleInput={marketId:ore.id,lotId:retrieved.id,quantity:4};
  const offerToBuy=await read('preparePlanetSale',saleInput,'COU');
  assert.equal(offerToBuy.amount,391);
  assert.equal((await cmd('sellToPlanetMarket',{...saleInput,confirmation:offerToBuy.confirmation},'COU')).amount,391);
  assert.equal((await read('shipWorkspace',{shipId:'rec-cargo'},'COU')).ship.permissions.logistics,true);
  assert.equal((await read('shipWorkspace',{shipId:'rec-cargo'},'MEC')).ship.role,'MECHANIC');
  await assert.rejects(read('prepareCreditAdjustment',{revision:session.revision,shopId:'rec-comptoir-kessel',amount:400,mode:'CREDIT',memo:'Test',reason:'Test'}),{code:'FORBIDDEN'});
  const saved=await store.list(`campaigns/${campaignId}/masterDrafts/initial/changes`);
  assert.equal(saved.filter(o=>o.type==='offer').length,original.changes.filter(o=>o.type==='offer').length);
});
