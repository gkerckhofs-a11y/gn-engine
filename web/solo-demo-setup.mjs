const randomUUID=()=>crypto.randomUUID();
const tokenHash=async token=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),x=>x.toString(16).padStart(2,'0')).join('');
import {admissionClasses} from '../src/shared/admission-rules.mjs';
import {initialClassKit} from '../src/shared/initial-class-kit.mjs';
import {analysisProfile} from '../src/shared/space-outlaws-analysis.mjs';
import {preparePilotMaster,provisionPilotShip} from './solo-demo-pilot.mjs';

// All changes go through native commands. No database writes, clock overrides,
// canned confirmations, free wallet credits or authentication bypass here.
export async function seedSoloDemo(call){
  const classId='PIL',label='Essai commun',name='Bela Venn',pilot=true;
  const command=(action,input={},role='owner')=>call(action,{requestId:randomUUID(),...input},role);
  const created=await command('createSoloDemo',{creationId:randomUUID()});
  const uids=Object.fromEntries(created.profiles.map(p=>[p.id,p.uid]));
  const participants=created.profiles;
  const {id:sessionId,campaignId}=created;
  const read=(action,input={},role='owner')=>call(action,{sessionId,...input},role);
  const cmd=(action,input={},role='owner')=>command(action,{sessionId,...input},role);
  const confirm=async(prep,action,input={},role='owner')=>{const {reason,...previewInput}=input,p=await read(prep,prep.startsWith('preview')?previewInput:input,role);return cmd(action,{...input,confirmation:p.confirmation},role);};
  const draft=async()=>(await call('centralMaster',{campaignId,workshop:'M2'},'owner')).draft.revision;
  const central=(action,input)=>command(action,{campaignId,...input});
  await cmd('saveAdmissionSettings',{policyRevision:0,draftRevision:0,settings:{open:true,instructions:'Session de découverte de Space Outlaws.',quotas:Object.fromEntries(admissionClasses.map(c=>[c.id,2])),species:[{id:'human-test',label:'Humanoïde fictif',description:'Sans bonus',nature:'HUMANOID',available:true}]},reason:'Préparation de recette'});
  const token=created.profiles[0].uid.slice(5,48);
  await cmd('issueAdmissionInvitation',{tokenHash:await tokenHash(token),hours:1,maxUses:8,label:'Recette locale'});
  for(const profile of participants){
    const {id:role,firstName:name,lastName,label}=profile,classId=role;
    const revision=(await read('session')).revision,draftRevision=await draft();
    await cmd('beginAdmission',{token,sessionRevision:revision,policyRevision:1,draftRevision,consent:true},role);
    await cmd('saveAdmissionProposal',{revision:1,sessionRevision:revision,policyRevision:1,draftRevision,proposal:{firstName:name,lastName,speciesId:'human-test',classId,secondaryId:classId==='COM'?'MED-02':'COM-03',background:`${name} est ${label.toLowerCase()} à Port-Brèche. Vous êtes venu au Comptoir des Confins pour enquêter sur la disparition d’un convoi. Votre objectif : examiner la balise abandonnée, rencontrer le marchand et préparer une expédition. Personnage fictif pour découvrir les écrans du jeu.`,friends:''},submit:true,consent:true},role);
    await cmd('reviewAdmission',{uid:uids[role],revision:2,policyRevision:1,draftRevision,decision:'APPROVE',reason:'Personnage fictif de recette'});
    await confirm('previewAdmissionM2','prepareAdmissionM2',{uid:uids[role],reason:'Fiction approuvée de recette'});
  }
  let revision=await draft();const createdItems=new Set();
  for(const classId of participants.map(p=>p.id)){
   const bindings=[];
   for(const slot of initialClassKit(classId).slots){
    const itemId=`kit_${slot.id}`;bindings.push({slotId:slot.id,itemId});
    if(createdItems.has(itemId))continue;
    createdItems.add(itemId);
    await central('saveCentralItem',{itemId,itemRevision:0,draftRevision:revision++,item:{usage:'PERSONAL',name:slot.label,description:'Objet fictif de recette',category:'Recette',unit:'unité',kind:slot.requiresConsumable?'STACKABLE':'INDIVIDUAL',consumable:slot.requiresConsumable,unitVolume:1,legality:'UNSPECIFIED',pillable:true,gmNotes:'SECRET_RECETTE_M1'},reason:'Kit natif de recette'});
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
  for(const {id:role} of participants){
    await confirm('previewSpaceOutlawsBirth','birthSpaceOutlaws',{uid:uids[role],options:{weaponApplicable:true,startingInformation:'Le convoi disparu a été aperçu près du Relais extérieur. Code de destination : PILOT-AWAY-CODE. Indice fictif de démonstration.'},reason:'Naissance de recette'});
    await cmd('confirmBriefing',{},role);
  }
  if(classId==='PIL'){await provisionPilotShip((action,input,role)=>read(action,input,role==='other'?'PIL':role),cmd,confirm);const owner=(await read('mySession',{},'PIL')).character;await confirm('prepareSoShip','provisionSoShip',{shipId:'demo-fighter',modelId:'demo-fighter',name:'Épervier des Confins',ownerId:owner.id,pilotId:owner.id,homePort:'home',fuelItemId:'propellant',source:'Vaisseau fictif de démonstration',reason:'Comparer cargo et chasseur'});}
  else {
   for(const [offerId,quantity,restricted] of [['fuel',8,true],['loot',2,false]])
    await confirm('prepareShopProvision','provisionShop',{shopId:'counter',offerId,provisionId:randomUUID(),quantity,restricted,source:'Matériel fictif de démonstration',reason:'Stock de découverte'});
  }
  await confirm('prepareShopProvision','provisionShop',{shopId:'counter',offerId:'supply',provisionId:randomUUID(),quantity:10,restricted:true,source:'Dix fournitures physiques fictives autorisées pour la recette',reason:'Stock de recette'});
  await cmd('setStage',{stage:'EN_JEU',revision:(await read('session')).revision});
  await cmd('saveGroupRoster',{groupId:'equipage-confins',groupRevision:0,name:'Équipage des Confins',description:'Les huit spécialistes enquêtent ensemble sur le convoi disparu.',briefing:'Retrouvez la balise, partagez les indices et préparez le départ du cargo.',gmNotes:'Groupe fictif de test',visibility:'PUBLIC',publicationState:'PUBLISHED',kind:'TEAM',capacity:8,leaderId:null,reason:'Groupe commun de démonstration'});
  for(const p of participants){
    const c=(await read('mySession',{},p.id)).character;
    await confirm('prepareGroupMembership','applyGroupMembership',{characterId:c.id,sourceGroupId:null,targetGroupId:'equipage-confins',membership:{role:p.label,revealed:true,visibleToMembers:true,publicAffiliation:true,permissions:Object.fromEntries(['readBriefing','readMembers','readUpdates','publishUpdates','readWallet','payWallet','representMissions','readStock','depositStock','withdrawStock','manageStorage','pilotShip'].map(k=>[k,['readBriefing','readMembers'].includes(k)]))},authorizePermissions:true,reason:'Membre de l’équipage de démonstration'});
    await confirm('prepareCreditAdjustment','applyCreditAdjustment',{revision:(await read('session')).revision,characterId:c.id,amount:1000,mode:'CREDIT',memo:'Budget fictif de test',reason:'1000 crédits ordinaires pour tester les commerces et le casino, en plus du kit canonique'});
    await read('ensureCharacterCode',{characterId:c.id});
  }
  const casino=await call('sabaccAdmin',{},'owner');
  if(!casino.enabled)await command('sabaccSettings',{settingsRevision:casino.settings.revision,enabled:true,adminEmails:casino.settings.adminEmails});
  const table=await command('sabaccCreate',{sessionId,name:'Cantina des Confins · Essai',location:'Port-Brèche',tier:1,mode:'GN',seatCount:8});
  await command('sabaccStatus',{tableId:table.id,revision:1,status:'OPEN'});
  // No automatic purchases: class kits come from canonical birth assets.
  // The counter remains stocked for an explicit player purchase.
  const announcement=await confirm('prepareAnnouncement','saveAnnouncement',{missionId:'courier',revision:0,title:mission.title,description:mission.description,category:'INFORMATION',mode:'ASSIGNMENT',participation:'PERSONAL',sponsorKind:'NPC',sponsorName:'Comptoir des Confins',rewardType:'FIXED',rewardText:'Mission de découverte sans rémunération ni dotation automatique',places:8,conditions:mission.conditions,proofExpected:mission.proofExpected,briefing:'SECRET_RECETTE_BRIEFING',gmNotes:'SECRET_RECETTE_REGIE',publication:'PUBLISHED',opensAt:0,deadline:8640000000000000,audience:{kind:'ALL',characterIds:[],groupIds:[]},reason:'Annonce fictive'});
  const application=await confirm('prepareAnnouncementResponse','respondAnnouncement',{announcementId:announcement.id,intent:'APPLICATION',body:'Candidature de recette'},'PIL');
  // Leave the application for organizer review: a paid contract needs an explicitly funded account.

  await cmd('setStage',{stage:'PAUSE',revision:(await read('session')).revision});
  // No fictional cash funding from forced player purchases. Finds remain unprovisioned.

  await cmd('setStage',{stage:'EN_JEU',revision:(await read('session')).revision});
  await cmd('completeSoloDemo',{tableId:table.id});
  return {sessionId,campaignId,profiles:participants,tableId:table.id,contractId:null,applicationId:application.id,classId,label,name,stage:'EN_JEU',source:'NATIVE_COMMANDS',humanAcceptance:'NOT_EXECUTED',...(pilot?{pilot:true,pilotScope:{fieldTargetId:'pilot-cache',shipId:'pilot-cargo',fromPort:'home',toPort:'away',routeId:'out',fundedFindIds:[]}}:{})};
}
