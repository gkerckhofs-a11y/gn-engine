// Fictional catalogue for the isolated emulator kit. Native commands only.
export async function prepareGalacticMaster(central,revision){
 const save=async(action,input)=>central(action,{draftRevision:revision++,...input,reason:'Marchés fictifs de recette'});
 await save('saveCentralItem',{itemId:'trade-water',itemRevision:0,item:{name:'Eau purifiée',description:'Lot commercial fictif',category:'Marchandises',unit:'lot',kind:'STACKABLE',consumable:false,unitVolume:1,legality:'LEGAL',pillable:true,usage:'COMMERCIAL',referenceUnitValueCr:40,gmNotes:'SECRET_MARCHE'}});
 for(const [id,name] of [['home','Breach Port'],['away','Relais de Kessel']]){
  await save('saveCentralPort',{portId:id,portRevision:0,port:{name,description:'Port fictif',gmNotes:'SECRET_PORT',navigationCode:`SECRET-${id}`,locationTargetId:null,customsRules:[{itemId:'trade-water',status:'FREE'}]}});
  await save('saveCentralShop',{shopId:`trade-${id}`,shopRevision:0,shop:{name:`Comptoir ${name}`,description:'Fret commercial fictif',sellerCharacterId:'merchant',locationTargetId:'counter-place',gmNotes:'SECRET_COMPTOIR'}});
  await save('saveCentralOffer',{offerId:`water-${id}`,offerRevision:0,offer:{name:'Lots d’eau purifiée',shopId:`trade-${id}`,itemId:'trade-water',unitPrice:40,buybackPrice:null,conditions:'Retrait local, transport distinct',gmNotes:'SECRET_OFFRE'}});
 }
 return revision;
}
export async function openGalacticMarkets(read,cmd,confirm){
 for(const [portId,marketState] of [['home','SURPLUS'],['away','SHORTAGE']]){
  await confirm('prepareShopProvision','provisionShop',{shopId:`trade-${portId}`,offerId:`water-${portId}`,provisionId:`galactic-${portId}`,quantity:12,restricted:false,source:'Douze lots fictifs autorisés dans le kit local',reason:'Stock de recette'});
  await confirm('preparePlanetMarket','savePlanetMarket',{portId,itemId:'trade-water',commodityCode:'WATER',marketState,shopId:`trade-${portId}`,offerId:`water-${portId}`,demand:10,enabled:true,recordRevision:0,reason:'Publication du marché fictif'});
 }
}
