import {commerceCounters,commerceDocks,commerceFuel} from '../src/shared/commerce-solo.mjs';
import {admissionClasses} from '../src/shared/admission-rules.mjs';
import {prepareSoloAdmissions,soloSessionCommands} from './solo-demo-setup.mjs';

const reason='Données fictives du Master de recette commerce';
const shipId='rec-cargo';
const dockCode='RECETTE-QUAI';
const setupReason={reason};

export async function seedCommerceSolo(call,sessionId){
  const created=await call('prepareCommerceSolo',{sessionId});
  const {campaignId,profiles}=created;
  const {command,read,cmd,confirm}=soloSessionCommands(call,sessionId);
  const draft=async()=>(await call('centralMaster',{campaignId,workshop:'M2'})).draft.revision;
  const admission=await read('admissionAdmin');
  const species=admission.settings.species.find(s=>s.available);
  const settings={
    open:true,instructions:'Essai solo de commerce galactique.',
    quotas:Object.fromEntries(admissionClasses.map(c=>[c.id,1])),
    species:species?admission.settings.species:[{id:'human-test',label:'Humanoïde fictif',description:'Sans bonus',nature:'HUMANOID',available:true}],
  };
  await cmd('saveAdmissionSettings',{settings,policyRevision:admission.policyRevision,draftRevision:admission.draftRevision,...setupReason});
  await prepareSoloAdmissions({
    created,read,cmd,confirm,draft,policyRevision:admission.policyRevision+1,speciesId:species?.id??'human-test',
    background:(name,label)=>`${name} est ${label.toLowerCase()} à Breach Port. L’équipage prépare une traversée commerciale vers Kessel et Ord Mantell. Vous pouvez examiner les cours, tester le fret ou aider au départ selon vos compétences. Ce personnage est fictif.`,
  });
  await confirm('previewSpaceOutlawsRelease','releaseSpaceOutlaws',setupReason);

  const characters={};
  for(const profile of profiles){
    const {id:role,uid}=profile;
    await confirm('previewSpaceOutlawsBirth','birthSpaceOutlaws',{uid,options:{
      weaponApplicable:true,startingInformation:'Codes de destination de recette · Breach Port REC-BREACH · Kessel REC-KESSEL · Ord Mantell REC-ORD. Code des cellules de recette : '+dockCode+'.',
    },...setupReason});
    await cmd('confirmBriefing',{},role);
    characters[role]=(await read('mySession',{},role)).character.id;
    await confirm('prepareCreditAdjustment','applyCreditAdjustment',{
      revision:(await read('session')).revision,characterId:characters[role],amount:500,mode:'CREDIT',memo:'Budget fictif du personnage',...setupReason,
    });
  }
  const stock=(shopId,offerId,quantity,restricted=false)=>confirm('prepareShopProvision','provisionShop',{
    shopId,offerId,provisionId:`stock-${offerId}`,quantity,restricted,source:'Stock fictif initial de recette',...setupReason,
  });
  for(const {portId,shopId,markets} of commerceCounters){
    for(const {quantity,...market} of markets){
      await confirm('preparePlanetMarket','savePlanetMarket',{portId,shopId,...market,enabled:true,recordRevision:0,...setupReason});
      await stock(shopId,market.offerId,quantity);
    }
    await confirm('prepareCreditAdjustment','applyCreditAdjustment',{
      revision:(await read('session')).revision,shopId,amount:400,mode:'CREDIT',memo:'Caisse fictive de rachat',...setupReason,
    });
  }
  await stock(commerceFuel.shopId,commerceFuel.offerId,12,true);
  await confirm('prepareSoShip','provisionSoShip',{
    shipId,modelId:shipId,name:'Cargo de la Route des Confins',ownerId:characters.PIL,pilotId:characters.PIL,
    homePort:'home',fuelItemId:commerceFuel.itemId,source:'Cargo fictif de recette',...setupReason,
  });
  for(const [portId,name,capacity,rent,periodMinutes,securityTier] of commerceDocks){
    await cmd('saveCommercialStorage',{
      revision:(await read('session')).revision,portId,name,description:'Cellule de stockage de recette',
      capacity,rent,periodMinutes,enabled:true,dock:{mode:'RENT',securityTier,intrusionTargetId:null,
        revealFields:['name','quantity'],theftEnabled:false,physical:false,alarm:null},...setupReason,
    });
  }
  await prepareCommerceTerminals(read,cmd);
  await cmd('setStage',{stage:'EN_JEU',revision:(await read('session')).revision});
  await addCommerceCrew({read,cmd,confirm,characters,profiles});
  const casino=await call('sabaccAdmin',{});
  if(!casino.enabled)await command('sabaccSettings',{settingsRevision:casino.settings.revision,enabled:true,adminEmails:casino.settings.adminEmails});
  const table=await command('sabaccCreate',{sessionId,name:'Cantina de Breach Port · Essai commerce',location:'Breach Port',tier:1,mode:'GN',seatCount:8});
  await command('sabaccStatus',{tableId:table.id,revision:1,status:'OPEN'});
  await cmd('completeSoloDemo',{tableId:table.id});
  return {sessionId,campaignId,profiles,tableId:table.id};
}

async function prepareCommerceTerminals(read,cmd){
  const local=await read('localAccessAdmin');
  const {shops}=await read('shopAdmin');
  const shopPlaces=new Map(shops.map(s=>[s.id,s.locationTargetId]));
  const counters=new Map(commerceCounters.map(c=>[c.shopId,c.portId]));
  const defaultPlace=shopPlaces.get(commerceFuel.shopId);
  const rowsByResource=new Map();
  for(const row of local.readiness.missing){
    const key=`${row.kind.toLowerCase()}-${row.kind==='SESSION'?'bourse':row.resourceId}`;
    if(!rowsByResource.has(key))rowsByResource.set(key,[]);
    rowsByResource.get(key).push(row);
  }
  for(const [id,rows] of rowsByResource){
    const {kind,resourceId,resourceName,portId}=rows[0];
    const terminal={
      id,name:kind==='SESSION'?'Bourse galactique · Recette':resourceName,
      placeId:kind==='TARGET'?resourceId:shopPlaces.get(resourceId)??defaultPlace,
      portId:portId??counters.get(resourceId)??null,active:true,durationSeconds:1800,
      operations:rows.map(r=>({action:r.operation,resourceId:r.resourceId,characterIds:[],skillId:null,minLevel:0})),
    };
    await cmd('saveLocalTerminal',{terminal,revision:0});
    if(kind==='DOCK'){
      const credentialId=`code-${id}`;
      await cmd('saveLocalCredential',{terminalId:id,revision:0,credential:{id:credentialId,kind:'CODE',name:'Code de cellule de recette',active:true,code:dockCode}});
      const operations=terminal.operations.map(o=>({...o,credentialIds:[credentialId]}));
      await cmd('saveLocalTerminal',{terminal:{...terminal,operations},revision:1});
    }
  }
  if(!(await read('localAccessAdmin')).readiness.ready)throw Error('Certains services locaux restent à raccorder.');
  await cmd('setTerminalQrMode',{version:1,revision:(await read('session')).revision});
}

async function addCommerceCrew({read,cmd,confirm,characters,profiles}){
  const groupId='equipage-commerce';
  await cmd('saveGroupRoster',{groupId,groupRevision:0,name:'Équipage de la Route des Confins',
    description:'Huit spécialistes en recette à Breach Port.',briefing:'Achetez à Breach Port, stockez et revendez à Kessel.',
    gmNotes:'Équipage fictif',visibility:'PUBLIC',publicationState:'PUBLISHED',kind:'TEAM',capacity:8,leaderId:null,...setupReason,
  });
  for(const profile of profiles){
    const characterId=characters[profile.id];
    await confirm('prepareGroupMembership','applyGroupMembership',{characterId,sourceGroupId:null,targetGroupId:groupId,
      membership:{role:profile.label,revealed:true,visibleToMembers:true,publicAffiliation:true,
        permissions:Object.fromEntries(['readBriefing','readMembers','readUpdates','publishUpdates','readWallet','payWallet','representMissions','readStock','depositStock','withdrawStock','manageStorage','pilotShip'].map(k=>[k,['readBriefing','readMembers'].includes(k)]))},
      authorizePermissions:true,...setupReason,
    });
    if(profile.id==='PIL')continue;
    const invite=await confirm('prepareShipRecruitment','inviteShipMember',{
      shipId,targetId:characterId,role:profile.id==='COU'?'FREIGHT':profile.id==='MEC'?'MECHANIC':'MEMBER',
      permissions:{journal:true,fuelContribution:true,logistics:profile.id==='COU',ownerFreight:false,maintenance:profile.id==='MEC'},...setupReason,
    },'PIL');
    const acceptance=await read('shipInvitation',{invitationId:invite.id},profile.id);
    await cmd('respondShipInvitation',{invitationId:invite.id,accept:true,confirmation:acceptance.confirmation},profile.id);
  }
}
