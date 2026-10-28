import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {admissionClasses} from '../../src/shared/admission-rules.mjs';
import {initialClassKit} from '../../src/shared/initial-class-kit.mjs';
import {analysisProfile} from '../../src/shared/space-outlaws-analysis.mjs';

// All changes go through native commands. No database writes, clock overrides,
// canned confirmations, free wallet credits or authentication bypass here.
export async function seedMissionScenario(call,uids){
  const command=(action,input={},role='owner')=>call(action,{requestId:randomUUID(),...input},role);
  const created=await command('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'RECETTE LOCALE · obligations de mission',title:'Épisode fictif',capacity:4,privacy:'Identités et fiction synthétiques, émulateurs locaux uniquement.'});
  const {id:sessionId,campaignId}=created;
  const read=(action,input={},role='owner')=>call(action,{sessionId,...input},role);
  const cmd=(action,input={},role='owner')=>command(action,{sessionId,...input},role);
  const confirm=async(prep,action,input={},role='owner')=>{const {reason,...previewInput}=input,p=await read(prep,prep.startsWith('preview')?previewInput:input,role);return cmd(action,{...input,confirmation:p.confirmation},role);};
  const draft=async()=>(await call('centralMaster',{campaignId,workshop:'M2'},'owner')).draft.revision;
  const central=(action,input)=>command(action,{campaignId,...input});
  await cmd('saveAdmissionSettings',{policyRevision:0,draftRevision:0,settings:{open:true,instructions:'Essai local avec données fictives.',quotas:Object.fromEntries(admissionClasses.map(c=>[c.id,2])),species:[{id:'human-test',label:'Humanoïde fictif',description:'Sans bonus',nature:'HUMANOID',available:true}]},reason:'Préparation de recette'});
  const token=randomBytes(32).toString('base64url');
  await cmd('issueAdmissionInvitation',{tokenHash:createHash('sha256').update(token).digest('hex'),hours:1,maxUses:2,label:'Recette locale'});
  for(const [role,name] of [['player','Ari'],['other','Bela']]){
    const revision=(await read('session')).revision,draftRevision=await draft();
    await cmd('beginAdmission',{token,sessionRevision:revision,policyRevision:1,draftRevision,consent:true},role);
    await cmd('saveAdmissionProposal',{revision:1,sessionRevision:revision,policyRevision:1,draftRevision,proposal:{firstName:name,lastName:'Recette',speciesId:'human-test',classId:'MED',secondaryId:'COM-03',background:`Fiction privée de ${name}.`,friends:''},submit:true,consent:true},role);
    await cmd('reviewAdmission',{uid:uids[role],revision:2,policyRevision:1,draftRevision,decision:'APPROVE',reason:'Personnage fictif de recette'});
    await confirm('previewAdmissionM2','prepareAdmissionM2',{uid:uids[role],reason:'Fiction approuvée de recette'});
  }
  let revision=await draft();const bindings=[];
  for(const slot of initialClassKit('MED').slots){
    const itemId=`kit_${slot.id}`;bindings.push({slotId:slot.id,itemId});
    await central('saveCentralItem',{itemId,itemRevision:0,draftRevision:revision++,item:{name:slot.label,description:'Objet fictif de recette',category:'Recette',unit:'unité',kind:slot.requiresConsumable?'STACKABLE':'INDIVIDUAL',consumable:slot.requiresConsumable,unitVolume:1,legality:'UNSPECIFIED',pillable:true,gmNotes:'SECRET_RECETTE_M1'},reason:'Kit natif de recette'});
  }
  await central('saveCentralClassKit',{classKitId:'MED',classKitRevision:0,draftRevision:revision++,classKit:{bindings,gmNotes:'Kit synthétique'},reason:'Kit de classe natif'});
  const character={displayName:'Comptoir de recette',profession:'PNJ fictif',description:'Dispensaire synthétique',nature:'HUMANOID',biography:'Fiction de recette',roleplay:'Remettre physiquement les lots',playerSecrets:'SECRET_RECETTE_PNJ',gmNotes:'SECRET_RECETTE_MJ',objectives:[],relations:[]};
  await central('saveCentralCharacter',{characterId:'merchant',characterRevision:0,draftRevision:revision++,character,reason:'Commanditaire fictif'});
  await central('saveCentralKnowledge',{knowledgeId:'notice',knowledgeRevision:0,draftRevision:revision++,knowledge:{kind:'DOCUMENT',title:'Information de recette',body:'Information privée obtenue par analyse.',origin:'Fiction locale',shareMode:'SHOW',gmTruth:'SECRET_RECETTE_M6',gmNotes:'Test uniquement',initialCharacterIds:[],qrEnabled:false,qrAudience:'SELECTED',qrCharacterIds:[],qrSkillId:null,qrSkillLevel:null},reason:'Information de scène'});
  await central('saveCentralFieldTarget',{fieldTargetId:'counter-place',fieldTargetRevision:0,draftRevision:revision++,fieldTarget:{kind:'ANALYSIS',title:'Comptoir balisé de recette',description:'Lieu fictif',gmNotes:'SECRET_RECETTE_LIEU',dependencyId:null,offlineSeconds:0,failureLockSeconds:0,repairProtectionSeconds:0,profiles:{ANALYZE:analysisProfile('COM-03')},rewards:[{id:'notice',kind:'KNOWLEDGE',knowledgeId:'notice',quantity:1,stock:1,perCharacter:1,minLevel:1,bonus:false}]},reason:'Lieu du comptoir'});
  await central('saveCentralShop',{shopId:'counter',shopRevision:0,draftRevision:revision++,shop:{name:'Dispensaire de recette',description:'Comptoir fictif',sellerCharacterId:'merchant',locationTargetId:'counter-place',gmNotes:'SECRET_RECETTE_M5'},reason:'Comptoir fictif'});
  await central('saveCentralOffer',{offerId:'supply',offerRevision:0,draftRevision:revision++,offer:{name:'Trousse de soin de recette',shopId:'counter',itemId:'kit_medical-supplies',unitPrice:30,buybackPrice:null,conditions:'Retrait physique',gmNotes:'Prix de fixture, pas un barème général'},reason:'Offre fictive'});
  const mission={title:'Mission de recette',description:'Rencontrer le comptoir puis remettre le rapport.',gmNotes:'SECRET_RECETTE_M7',steps:[{id:'meet',title:'Rencontrer le contact',description:'SECRET_RECETTE_ETAPE : code ORION'},{id:'report',title:'Remettre le rapport',description:'Présenter le résultat au MJ'}],giverCharacterId:'merchant',requiredKnowledgeIds:[],rewardItems:[{itemId:'kit_medical-supplies',quantity:3}],conditions:'Présence et rapport',proofExpected:'Rapport examiné par le MJ'};
  await central('saveCentralMission',{missionId:'courier',missionRevision:0,draftRevision:revision++,mission,reason:'Mission fictive'});
  await confirm('previewSpaceOutlawsRelease','releaseSpaceOutlaws',{reason:'Version fictive pour les émulateurs'});
  for(const role of ['player','other']){
    await confirm('previewSpaceOutlawsBirth','birthSpaceOutlaws',{uid:uids[role],options:{weaponApplicable:true,startingInformation:''},reason:'Naissance de recette'});
    await cmd('confirmBriefing',{},role);
  }
  // Session staff are distinct from campaign workshop delegations.
  for(const [role,email] of [['MJ','mj@recette.example.invalid'],['RECEPTION','accueil@recette.example.invalid']])
    await cmd('setStaff',{revision:(await read('session')).revision,email,role,active:true,reason:'Équipe fictive de recette'});
  await confirm('prepareShopProvision','provisionShop',{shopId:'counter',offerId:'supply',provisionId:randomUUID(),quantity:10,restricted:true,source:'Dix fournitures physiques fictives autorisées pour la recette',reason:'Stock de recette'});
  await cmd('setStage',{stage:'EN_JEU',revision:(await read('session')).revision});
  const purchase={shopId:'counter',offerId:'supply',quantity:5,useProtected:true},quote=await read('prepareShopPurchase',purchase,'player');
  const sale=await cmd('buyShopOffer',{...purchase,quoteAt:quote.quoteAt,confirmation:quote.confirmation},'player');
  const offered=(await read('shopAdmin')).orders.find(x=>x.id===sale.id);
  await cmd('offerShopPickup',{saleId:sale.id,confirmation:offered.confirmation});
  const pickup=(await read('shops',{},'player')).orders.find(x=>x.id===sale.id);
  await cmd('confirmShopPickup',{saleId:sale.id,confirmation:pickup.confirmation,received:true},'player');
  const announcement=await confirm('prepareAnnouncement','saveAnnouncement',{missionId:'courier',revision:0,title:mission.title,description:mission.description,category:'INFORMATION',mode:'ASSIGNMENT',participation:'PERSONAL',sponsorKind:'NPC',sponsorName:'Dispensaire de recette',rewardType:'FIXED',rewardText:'100 Cr et trois fournitures après validation',places:1,conditions:mission.conditions,proofExpected:mission.proofExpected,briefing:'SECRET_RECETTE_BRIEFING',gmNotes:'SECRET_RECETTE_REGIE',publication:'PUBLISHED',opensAt:0,deadline:8640000000000000,audience:{kind:'ALL',characterIds:[],groupIds:[]},reason:'Annonce fictive'});
  const application=await confirm('prepareAnnouncementResponse','respondAnnouncement',{announcementId:announcement.id,intent:'APPLICATION',body:'Candidature de recette'},'player');
  const source=(await read('session')).accounts.find(a=>a.ownerType==='SHOP'&&a.shopId==='counter');
  const contract=await confirm('prepareMissionContract','proposeMissionContract',{applicationId:application.id,amount:100,durationMinutes:60,funding:'ACCOUNT',sourceAccountId:source.id,advance:0,guarantee:0,conditions:mission.conditions,proofExpected:mission.proofExpected,confidentiality:'Réservé au titulaire',failureTerms:'Examen contradictoire MJ',rewardSources:[{itemId:'kit_medical-supplies',offerId:'supply'}],reason:'Budget sur caisse réelle du comptoir'});
  await confirm('prepareContractAcceptance','acceptContract',{contractId:contract.id},'player');
  await cmd('setStage',{stage:'PAUSE',revision:(await read('session')).revision});
  const other=await command('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'RECETTE LOCALE · autre session',title:'Isolation sans participant',capacity:2,privacy:'Aucune identité réelle.'});
  return {sessionId,campaignId,contractId:contract.id,otherSessionId:other.id,stage:'PAUSE',source:'NATIVE_COMMANDS',humanAcceptance:'NOT_EXECUTED'};
}
