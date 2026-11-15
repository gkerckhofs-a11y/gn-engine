// Fictional catalogue for the isolated emulator kit. Native commands only.
export async function prepareGalacticMaster(central,revision){
 const save=async(action,input)=>central(action,{draftRevision:revision++,...input,reason:'Marchés fictifs de recette'});
 await save('saveCentralItem',{itemId:'trade-water',itemRevision:0,item:{name:'Eau purifiée',description:'Lot commercial fictif',category:'Marchandises',unit:'lot',kind:'STACKABLE',consumable:false,unitVolume:1,legality:'LEGAL',pillable:true,usage:'COMMERCIAL',referenceUnitValueCr:40,gmNotes:'SECRET_MARCHE'}});
 for(const [id,name] of [['home','Breach Port'],['away','Relais de Kessel']]){
  await save('saveCentralPort',{portId:id,portRevision:0,port:{name,description:'Port fictif',gmNotes:'SECRET_PORT',navigationCode:`SECRET-${id}`,locationTargetId:null,customsRules:[{itemId:'trade-water',status:'FREE'}]}});
  await save('saveCentralShop',{shopId:`trade-${id}`,shopRevision:0,shop:{name:`Comptoir ${name}`,description:'Fret commercial fictif',sellerCharacterId:'merchant',locationTargetId:'counter-place',gmNotes:'SECRET_COMPTOIR'}});
  await save('saveCentralOffer',{offerId:`water-${id}`,offerRevision:0,offer:{name:'Lots d’eau purifiée',shopId:`trade-${id}`,itemId:'trade-water',unitPrice:40,buybackPrice:null,conditions:'Retrait local, transport distinct',gmNotes:'SECRET_OFFRE'}});
 }
 await save('saveCentralItem',{itemId:'map-fuel',itemRevision:0,item:{name:'Carburant de recette',description:'Carburant fictif',category:'Navigation',unit:'unité',kind:'STACKABLE',consumable:true,unitVolume:1,legality:'LEGAL',pillable:true,usage:'FUEL',gmNotes:'SECRET_MAP_FUEL'}});
 await save('saveCentralShipModel',{shipModelId:'map-model',shipModelRevision:0,shipModel:{name:'Cargo de recette',description:'Cargo fictif',gmNotes:'SECRET_MAP_MODEL',profileId:'CARGO'}});
 await save('saveCentralOffer',{offerId:'map-fuel',offerRevision:0,offer:{name:'Carburant fictif',shopId:'counter',itemId:'map-fuel',unitPrice:25,buybackPrice:null,conditions:'Stock et retrait nécessaires',gmNotes:'SECRET_MAP_OFFER'}});
 for(const [id,fromPort,toPort,code] of [['map-out','home','away','MAP-OUT-CODE'],['map-back','away','home','MAP-BACK-CODE']])await save('saveCentralRoute',{routeId:id,routeRevision:0,route:{name:id==='map-out'?'Liaison vers Kessel':'Retour vers Breach Port',description:'Liaison fictive',gmNotes:'SECRET_MAP_ROUTE',fromPort,toPort,navigationCode:code,distanceId:'SHORT',riskId:'SECURED'}});
 return revision;
}
export async function openGalacticMarkets(read,cmd,confirm){
 for(const [portId,marketState] of [['home','SURPLUS'],['away','SHORTAGE']]){
  await confirm('prepareShopProvision','provisionShop',{shopId:`trade-${portId}`,offerId:`water-${portId}`,provisionId:`galactic-${portId}`,quantity:12,restricted:false,source:'Douze lots fictifs autorisés dans le kit local',reason:'Stock de recette'});
  await confirm('preparePlanetMarket','savePlanetMarket',{portId,itemId:'trade-water',commodityCode:'WATER',marketState,shopId:`trade-${portId}`,offerId:`water-${portId}`,demand:10,enabled:true,recordRevision:0,reason:'Publication du marché fictif'});
 }
}
