import {randomUUID} from 'node:crypto';
import {shopAccountId} from '../../src/core/space-outlaws-shop-state.mjs';
// Native finite stock, explicitly priced at one credit in this isolated test kit.
// No direct database writes, wallet top-up or clock override.
export async function prepareDockMaster(central,revision){
 await central('saveCentralFieldTarget',{fieldTargetId:'dock-cash',fieldTargetRevision:0,draftRevision:revision++,fieldTarget:{kind:'SEARCH',searchVersion:1,title:'Caisse oubliée de recette',description:'Fouille fictive financée par le comptoir',gmNotes:'Six crédits existants, aucune création monétaire',search:{active:true,difficulty:1,showDifficulty:true,maxAttempts:1,bonuses:[]},finds:[{id:'cash',kind:'CREDITS_A_TROUVER',title:'Six crédits de recette',active:true,quantity:6}]},reason:'Fouille native de recette'});
 await central('saveCentralOffer',{offerId:'dock-water',offerRevision:0,draftRevision:revision++,offer:{name:'Caisses de recette',shopId:'trade-home',itemId:'trade-water',unitPrice:1,buybackPrice:null,conditions:'Stock fictif limité à un crédit par caisse pour la recette des docks',gmNotes:'Tarif de test uniquement, payé par une trouvaille native financée par la caisse du comptoir ; aucun prix canonique'},reason:'Préparer six caisses de recette sans créer de monnaie'});return revision;
}
export async function openDockScenario(read,cmd,confirm){
 await cmd('setStage',{stage:'PAUSE',revision:(await read('session')).revision});
 const state=(await read('fieldAdmin')).states.find(x=>x.id==='dock-cash');
 await cmd('provisionFieldFind',{targetId:'dock-cash',findId:'cash',revision:state.revision,sourceAccountId:shopAccountId('counter'),reason:'Réserver six crédits réellement disponibles de la caisse'});
 await cmd('setStage',{stage:'EN_JEU',revision:(await read('session')).revision});
 const search=await confirm('prepareFieldAction','startFieldAction',{targetId:'dock-cash',kind:'SEARCH',present:true},'player');
 // Wait the real native minute; no clock injection or forced die. Difficulty one
 // makes every canonical D12 outcome discover this explicitly funded test find.
 for(;;){try{await cmd('finishFieldAction',{actionId:search.id,present:true},'player');break;}catch(e){if(!e.message.includes('FIELD_TOO_EARLY'))throw e;await new Promise(resolve=>setTimeout(resolve,1000));}}
 await cmd('takeFieldFind',{actionId:search.id,findId:'cash',present:true},'player');
 await confirm('prepareShopProvision','provisionShop',{shopId:'trade-home',offerId:'dock-water',provisionId:randomUUID(),quantity:6,restricted:false,source:'Six caisses fictives pour la recette isolée des docks',reason:'Stock fini de recette'});
 const p={shopId:'trade-home',offerId:'dock-water',quantity:6,useProtected:false},q=await read('prepareShopPurchase',p,'player'),sale=await cmd('buyShopOffer',{...p,quoteAt:q.quoteAt,confirmation:q.confirmation},'player'),offer=(await read('shopAdmin')).orders.find(x=>x.id===sale.id);await cmd('offerShopPickup',{saleId:sale.id,confirmation:offer.confirmation});const pick=(await read('shops',{},'player')).orders.find(x=>x.id===sale.id);await cmd('confirmShopPickup',{saleId:sale.id,confirmation:pick.confirmation,received:true},'player');
 const dock={mode:'RENT',securityTier:2,intrusionTargetId:null,revealFields:['name','quantity'],theftEnabled:true,physical:false,alarm:null};
 const make=async(name,theftEnabled)=>cmd('saveCommercialStorage',{revision:(await read('session')).revision,name,description:'Cellule fictive de recette',capacity:10,rent:0,periodMinutes:60,enabled:true,portId:'home',reason:'Loyer nul explicitement choisi pour la recette',dock:{...dock,theftEnabled}});
 const source=await make('Cellule source de recette',true),dest=await make('Cellule de réception de recette',false);
 for(const [role,w] of [['player',source],['other',dest]])await confirm('prepareCommercialStorageRent','rentCommercialStorage',{warehouseId:w.id,tenantType:'CHARACTER',fromAccountId:(await read('myWallet',{},role)).account.id},role);
 const terminal={id:'recette-dock',name:'Terminal de recette des docks',placeId:'counter-place',portId:'home',active:true,durationSeconds:3600,operations:[{action:'dockEntry',resourceId:source.id,characterIds:[],skillId:null,minLevel:0}]};await cmd('saveLocalTerminal',{terminal,revision:0});await cmd('saveLocalCredential',{terminalId:terminal.id,revision:0,credential:{id:'recette-dock-code',kind:'CODE',name:'Code fictif du dock',active:true,code:'RECETTE-DOCK'}});terminal.operations[0].credentialIds=['recette-dock-code'];await cmd('saveLocalTerminal',{terminal,revision:1});
 await cmd('scanLocalTerminal',{terminalId:terminal.id},'player');await cmd('unlockLocalCode',{terminalId:terminal.id,code:'RECETTE-DOCK'},'player');const moved=await confirm('prepareCommercialStorageMove','moveCommercialStorage',{warehouseId:source.id,lotId:sale.purchasedLotId,direction:'DEPOSIT',quantity:6},'player');
 return {sourceId:source.id,destinationId:dest.id,lotId:moved.id,terminalId:terminal.id};
}
