import {randomUUID} from 'node:crypto';
import {shopStockId,shopAccountId} from '../../src/core/space-outlaws-shop-state.mjs';

// Native-only, opt-in fixture for the integrated Space Outlaws pilot.
export async function preparePilotMaster(central,revision){
 const save=async(action,input)=>central(action,{draftRevision:revision++,...input,reason:'Master fictif du pilote'});
 await save('saveCentralItem',{itemId:'propellant',itemRevision:0,item:{
  name:'Carburant fictif',description:'Carburant de recette',category:'Navigation',unit:'unité',
  kind:'STACKABLE',consumable:true,unitVolume:1,legality:'UNSPECIFIED',pillable:true,gmNotes:'SECRET_PILOT_FUEL'}});
 await save('saveCentralKnowledge',{knowledgeId:'clue',knowledgeRevision:0,knowledge:{
  kind:'DOCUMENT',title:'Indice de la balise',body:'Le convoi est passé par le relais extérieur.',
  origin:'Pilote fictif',shareMode:'SHOW',gmTruth:'SECRET_PILOT_CLUE',gmNotes:'SECRET_PILOT_MJ',
  initialCharacterIds:[],qrEnabled:false,qrAudience:'SELECTED',qrCharacterIds:[],qrSkillId:null,qrSkillLevel:null}});
 await save('saveCentralFieldTarget',{fieldTargetId:'pilot-cache',fieldTargetRevision:0,fieldTarget:{
  kind:'SEARCH',searchVersion:1,title:'Balise abandonnée',description:'Lieu fictif à fouiller.',gmNotes:'SECRET_PILOT_CACHE',
  search:{active:true,difficulty:6,showDifficulty:false,maxAttempts:null,bonuses:[]},
  finds:[
   {id:'view',kind:'INDICE_A_VOIR',title:'Trace visible',active:true,knowledgeId:'notice'},
   {id:'take',kind:'INDICE_A_PRENDRE',title:'Datapad récupérable',active:true,knowledgeId:'clue'},
   {id:'item',kind:'OBJET_A_TROUVER',title:'Trousse physique',active:true,itemId:'kit_medical-supplies',quantity:1},
   {id:'cash',kind:'CREDITS_A_TROUVER',title:'Crédits cachés',active:true,quantity:20}]}});
 await save('saveCentralShipModel',{shipModelId:'pilot-model',shipModelRevision:0,shipModel:{
  name:'Cargo pilote',description:'Cargo fictif',gmNotes:'SECRET_PILOT_MODEL',profileId:'CARGO'}});
 for(const [id,name,code] of [['home','Port initial','PILOT-HOME-CODE'],['away','Relais extérieur','PILOT-AWAY-CODE']])
  await save('saveCentralPort',{portId:id,portRevision:0,port:{
   name,description:'Port de recette',gmNotes:'SECRET_PILOT_PORT',navigationCode:code,locationTargetId:null}});
 for(const [id,fromPort,toPort,code] of [
  ['out','home','away','PILOT-OUT-SECRET'],['back','away','home','PILOT-BACK-SECRET']])
  await save('saveCentralRoute',{routeId:id,routeRevision:0,route:{
   name:id==='out'?'Liaison aller':'Liaison retour',description:'Liaison sécurisée',
   gmNotes:'SECRET_PILOT_ROUTE',fromPort,toPort,navigationCode:code,distanceId:'SHORT',riskId:'SECURED'}});
 await save('saveCentralOffer',{offerId:'loot',offerRevision:0,offer:{
  name:'Réserve physique de fouille',shopId:'counter',itemId:'kit_medical-supplies',
  unitPrice:30,buybackPrice:null,conditions:'Stock transférable pour fouille',gmNotes:'SECRET_PILOT_LOOT'}});
 await save('saveCentralOffer',{offerId:'fuel',offerRevision:0,offer:{
  name:'Carburant de recette',shopId:'counter',itemId:'propellant',unitPrice:25,buybackPrice:null,
  conditions:'Remise physique fictive',gmNotes:'SECRET_PILOT_OFFER'}});
 return revision;
}
export async function provisionPilotShip(read,cmd,confirm){
 const owner=(await read('mySession',{},'other')).character;
 if(!owner?.id)throw Error('Pilote de test non né');
 const input={shipId:'pilot-cargo',modelId:'pilot-model',name:'Cargo du pilote',
  ownerId:owner.id,pilotId:owner.id,homePort:'home',fuelItemId:'propellant',
  source:'Cargo fictif initial pour la recette',reason:'Attribution MJ documentée'};
 const preview=await read('prepareSoShip',input,'owner');
 await cmd('provisionSoShip',{...input,confirmation:preview.confirmation},'owner');
 await confirm('prepareShopProvision','provisionShop',{shopId:'counter',offerId:'fuel',
  provisionId:randomUUID(),quantity:8,restricted:true,
  source:'Huit unités fictives de carburant apportées au comptoir',reason:'Stock initial de recette'});
 await confirm('prepareShopProvision','provisionShop',{shopId:'counter',offerId:'loot',
  provisionId:randomUUID(),quantity:2,restricted:false,
  source:'Deux trousses physiques fictives distinctes du stock de missions protégées',
  reason:'Stock transférable réservé aux trouvailles de la recette'});
}
export async function fundPilotFinds(read,cmd){
 const revision=async()=>{
  const admin=await read('fieldAdmin',{},'owner'),state=admin.states.find(x=>x.id==='pilot-cache');
  if(!state)throw Error('État de la balise de test absent');
  return state.revision;
 };
 await cmd('provisionFieldFind',{targetId:'pilot-cache',findId:'item',revision:await revision(),
  sourceLotId:shopStockId('loot'),reason:'Affectation d’une trousse issue du stock du comptoir'},'owner');
 await cmd('provisionFieldFind',{targetId:'pilot-cache',findId:'cash',revision:await revision(),
  sourceAccountId:shopAccountId('counter'),reason:'Réservation de vingt crédits de la caisse existante'},'owner');
}
