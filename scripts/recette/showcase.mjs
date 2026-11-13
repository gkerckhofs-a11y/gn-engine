import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {admissionClasses} from '../../src/shared/admission-rules.mjs';
import {initialClassKit} from '../../src/shared/initial-class-kit.mjs';
import {analysisProfile} from '../../src/shared/space-outlaws-analysis.mjs';
import {preparePilotMaster,provisionPilotShip} from './pilot.mjs';

// All changes go through native commands. No database writes, clock overrides,
// canned confirmations, free wallet credits or authentication bypass here.
export async function seedShowcase(call,uids,{classId,label,name,pilot=true}={}){
  const command=(action,input={},role='owner')=>call(action,{requestId:randomUUID(),...input},role);
  const created=await command('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:`DÉCOUVERTE · ${label}`,title:`Essai ${label} · Port-Brèche`,capacity:4,privacy:'Démonstration privée de Guillaume. Personnages et données fictifs.'});
  const {id:sessionId,campaignId}=created;
  const read=(action,input={},role='owner')=>call(action,{sessionId,...input},role);
  const cmd=(action,input={},role='owner')=>command(action,{sessionId,...input},role);
  const confirm=async(prep,action,input={},role='owner')=>{const {reason,...previewInput}=input,p=await read(prep,prep.startsWith('preview')?previewInput:input,role);return cmd(action,{...input,confirmation:p.confirmation},role);};
  const draft=async()=>(await call('centralMaster',{campaignId,workshop:'M2'},'owner')).draft.revision;
  const central=(action,input)=>command(action,{campaignId,...input});
  await cmd('saveAdmissionSettings',{policyRevision:0,draftRevision:0,settings:{open:true,instructions:'Session de découverte de Space Outlaws.',quotas:Object.fromEntries(admissionClasses.map(c=>[c.id,2])),species:[{id:'human-test',label:'Humanoïde fictif',description:'Sans bonus',nature:'HUMANOID',available:true}]},reason:'Préparation de recette'});
  const token=randomBytes(32).toString('base64url');
  await cmd('issueAdmissionInvitation',{tokenHash:createHash('sha256').update(token).digest('hex'),hours:1,maxUses:2,label:'Recette locale'});
  const participants=[['player',name]];
  for(const [role,name] of participants){
    const revision=(await read('session')).revision,draftRevision=await draft();
    await cmd('beginAdmission',{token,sessionRevision:revision,policyRevision:1,draftRevision,consent:true},role);
    await cmd('saveAdmissionProposal',{revision:1,sessionRevision:revision,policyRevision:1,draftRevision,proposal:{firstName:name,lastName:'Recette',speciesId:'human-test',classId,secondaryId:classId==='COM'?'MED-02':'COM-03',background:`${name} est ${label.toLowerCase()} à Port-Brèche. Vous êtes venu au Comptoir des Confins pour enquêter sur la disparition d’un convoi. Votre objectif : examiner la balise abandonnée, rencontrer le marchand et préparer une expédition. Personnage fictif pour découvrir les écrans du jeu.`,friends:''},submit:true,consent:true},role);
    await cmd('reviewAdmission',{uid:uids[role],revision:2,policyRevision:1,draftRevision,decision:'APPROVE',reason:'Personnage fictif de recette'});
    await confirm('previewAdmissionM2','prepareAdmissionM2',{uid:uids[role],reason:'Fiction approuvée de recette'});
  }
  let revision=await draft();const createdItems=new Set();
  for(const classId of [...new Set(['MED','PIL',arguments[2].classId])]){
   const bindings=[];
   for(const slot of initialClassKit(classId).slots){
    const itemId=`kit_${slot.id}`;bindings.push({slotId:slot.id,itemId});
    if(createdItems.has(itemId))continue;
    createdItems.add(itemId);
    await central('saveCentralItem',{itemId,itemRevision:0,draftRevision:revision++,item:{name:slot.label,description:'Objet fictif de recette',category:'Recette',unit:'unité',kind:slot.requiresConsumable?'STACKABLE':'INDIVIDUAL',consumable:slot.requiresConsumable,unitVolume:1,legality:'UNSPECIFIED',pillable:true,gmNotes:'SECRET_RECETTE_M1'},reason:'Kit natif de recette'});
   }
   await central('saveCentralClassKit',{classKitId:classId,classKitRevision:0,draftRevision:revision++,classKit:{bindings,gmNotes:'Kit synthétique'},reason:'Kit de classe natif'});
  }
  const character={displayName:'Nara Voss',profession:'Médecin du dispensaire',description:'Dispensaire synthétique',nature:'HUMANOID',biography:'Fiction de recette',roleplay:'Remettre physiquement les lots',playerSecrets:'SECRET_RECETTE_PNJ',gmNotes:'SECRET_RECETTE_MJ',objectives:[],relations:[]};
  await central('saveCentralCharacter',{characterId:'merchant',characterRevision:0,draftRevision:revision++,character,reason:'Commanditaire fictif'});
  await central('saveCentralKnowledge',{knowledgeId:'notice',knowledgeRevision:0,draftRevision:revision++,knowledge:{kind:'DOCUMENT',title:'Information de recette',body:'Information privée obtenue par analyse.',origin:'Fiction locale',shareMode:'SHOW',gmTruth:'SECRET_RECETTE_M6',gmNotes:'Test uniquement',initialCharacterIds:[],qrEnabled:false,qrAudience:'SELECTED',qrCharacterIds:[],qrSkillId:null,qrSkillLevel:null},reason:'Information de scène'});
  await central('saveCentralFieldTarget',{fieldTargetId:'counter-place',fieldTargetRevision:0,draftRevision:revision++,fieldTarget:{kind:'ANALYSIS',title:'Comptoir balisé de recette',description:'Lieu fictif',gmNotes:'SECRET_RECETTE_LIEU',dependencyId:null,offlineSeconds:0,failureLockSeconds:0,repairProtectionSeconds:0,profiles:{ANALYZE:analysisProfile('COM-03')},rewards:[{id:'notice',kind:'KNOWLEDGE',knowledgeId:'notice',quantity:1,stock:1,perCharacter:1,minLevel:1,bonus:false}]},reason:'Lieu du comptoir'});
  await central('saveCentralShop',{shopId:'counter',shopRevision:0,draftRevision:revision++,shop:{name:'Comptoir des Confins',description:'Comptoir fictif',sellerCharacterId:'merchant',locationTargetId:'counter-place',gmNotes:'SECRET_RECETTE_M5'},reason:'Comptoir fictif'});
  await central('saveCentralOffer',{offerId:'supply',offerRevision:0,draftRevision:revision++,offer:{name:'Trousse de soins',shopId:'counter',itemId:'kit_medical-supplies',unitPrice:30,buybackPrice:null,conditions:'Retrait physique',gmNotes:'Prix de fixture, pas un barème général'},reason:'Offre fictive'});
  if(pilot)revision=await preparePilotMaster(central,revision);
  if(classId==='PIL')await central('saveCentralShipModel',{shipModelId:'demo-fighter',shipModelRevision:0,draftRevision:revision++,shipModel:{name:'Chasseur des Confins',description:'Chasseur léger de démonstration',gmNotes:'Démonstration',profileId:'FIGHTER'},reason:'Second profil de démonstration'});
  const mission={title:'Le convoi disparu',description:'Rencontrer le comptoir puis remettre le rapport.',gmNotes:'SECRET_RECETTE_M7',steps:[{id:'meet',title:'Rencontrer le contact',description:'SECRET_RECETTE_ETAPE : code ORION'},{id:'report',title:'Remettre le rapport',description:'Présenter le résultat au MJ'}],giverCharacterId:'merchant',requiredKnowledgeIds:[],rewardItems:[],conditions:'Présence et rapport',proofExpected:'Rapport examiné par le MJ'};
  await central('saveCentralMission',{missionId:'courier',missionRevision:0,draftRevision:revision++,mission,reason:'Mission fictive'});
  await confirm('previewSpaceOutlawsRelease','releaseSpaceOutlaws',{reason:'Version fictive pour les émulateurs'});
  for(const role of ['player']){
    await confirm('previewSpaceOutlawsBirth','birthSpaceOutlaws',{uid:uids[role],options:{weaponApplicable:true,startingInformation:'Le convoi disparu a été aperçu près du Relais extérieur. Code de destination : PILOT-AWAY-CODE. Indice fictif de démonstration.'},reason:'Naissance de recette'});
    await cmd('confirmBriefing',{},role);
  }
  if(classId==='PIL'){await provisionPilotShip((action,input,role)=>read(action,input,role==='other'?'player':role),cmd,confirm);const owner=(await read('mySession',{},'player')).character;await confirm('prepareSoShip','provisionSoShip',{shipId:'demo-fighter',modelId:'demo-fighter',name:'Épervier des Confins',ownerId:owner.id,pilotId:owner.id,homePort:'home',fuelItemId:'propellant',source:'Vaisseau fictif de démonstration',reason:'Comparer cargo et chasseur'});}
  else {
   for(const [offerId,quantity,restricted] of [['fuel',8,true],['loot',2,false]])
    await confirm('prepareShopProvision','provisionShop',{shopId:'counter',offerId,provisionId:randomUUID(),quantity,restricted,source:'Matériel fictif de démonstration',reason:'Stock de découverte'});
  }
  await confirm('prepareShopProvision','provisionShop',{shopId:'counter',offerId:'supply',provisionId:randomUUID(),quantity:10,restricted:true,source:'Dix fournitures physiques fictives autorisées pour la recette',reason:'Stock de recette'});
  await cmd('setStage',{stage:'EN_JEU',revision:(await read('session')).revision});
  // No automatic purchases: class kits come from canonical birth assets.
  // The counter remains stocked for an explicit player purchase.
  const announcement=await confirm('prepareAnnouncement','saveAnnouncement',{missionId:'courier',revision:0,title:mission.title,description:mission.description,category:'INFORMATION',mode:'ASSIGNMENT',participation:'PERSONAL',sponsorKind:'NPC',sponsorName:'Comptoir des Confins',rewardType:'FIXED',rewardText:'Mission de découverte sans rémunération ni dotation automatique',places:1,conditions:mission.conditions,proofExpected:mission.proofExpected,briefing:'SECRET_RECETTE_BRIEFING',gmNotes:'SECRET_RECETTE_REGIE',publication:'PUBLISHED',opensAt:0,deadline:8640000000000000,audience:{kind:'ALL',characterIds:[],groupIds:[]},reason:'Annonce fictive'});
  const application=await confirm('prepareAnnouncementResponse','respondAnnouncement',{announcementId:announcement.id,intent:'APPLICATION',body:'Candidature de recette'},'player');
  // Leave the application for organizer review: a paid contract needs an explicitly funded account.

  await cmd('setStage',{stage:'PAUSE',revision:(await read('session')).revision});
  // No fictional cash funding from forced player purchases. Finds remain unprovisioned.

  await cmd('setStage',{stage:'EN_JEU',revision:(await read('session')).revision});
  return {sessionId,campaignId,contractId:null,applicationId:application.id,classId,label,name,stage:'EN_JEU',source:'NATIVE_COMMANDS',humanAcceptance:'NOT_EXECUTED',...(pilot?{pilot:true,pilotScope:{fieldTargetId:'pilot-cache',shipId:'pilot-cargo',fromPort:'home',toPort:'away',routeId:'out',fundedFindIds:[]}}:{})};
}
