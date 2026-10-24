import {masterSheets} from './master-schema.mjs';

// A separate, campaign-bound contract. Historical CAMPAGNE/SESSION and the
// documentary SO_Masters V0.1 are not converted implicitly.
export const centralImportFormat='gn-engine-central-draft';
export const centralImportRows=100;
export const centralImportTypes={M1:{type:'item',sheet:'Objets'},M2:{type:'character',sheet:'Personnages'},M4:{type:'recipe',sheet:'Recettes'},M5:{sheets:[{type:'shop',sheet:'Boutiques'},{type:'offer',sheet:'Offres'}]},M6:{type:'knowledge',sheet:'Informations'},M7:{type:'mission',sheet:'Missions'}};
export const centralImportContracts=workshop=>{const c=Object.hasOwn(centralImportTypes,workshop)?centralImportTypes[workshop]:null;return c?.sheets??(c?[c]:[]);};
export const centralImportSelection=(workshop,c)=>centralImportContracts(workshop).length>1?`${c.type}_${c.entityId}`:c.entityId;
export const centralShopColumns={shop:['nom','description','vendeur_personnage_id','lieu_id','notes_mj'],offer:['nom','boutique_id','objet_id','prix_vente_cr','prix_rachat_cr','conditions','notes_mj']};
export const centralCharacterColumns=['nom','profession','description','nature','biographie','interpretation','secrets_joueur','notes_mj','objectifs_json','relations_json','profil_initial','classe_id','espece_id','initiation_id'];
export const centralCharacterCellLimit=32000;
export const centralStoryCellLimit=32000;
export const centralStoryColumns={
 knowledge:['type','titre','texte','origine','partage','verite_mj','notes_mj','destinataires_initiaux_json','qr_propose','audience_qr','destinataires_qr_json','competence_qr_id','niveau_competence_qr'],
 mission:['titre','description','notes_mj','etapes_json','donneur_personnage_id','prerequis_informations_json','recompenses_objets_json','conditions','preuves_attendues'],
};
export const centralImportSheets={
 Meta:['format','version','schema_version','type','campaign_id','scenario_id','rule_profile','central_base_version','draft_id','draft_revision','module_type','import_batch_id'],
 Objets:masterSheets.Objets.filter(x=>!['version','image_media_id','publication'].includes(x)),
 Recettes:masterSheets.Recettes.filter(x=>!['version','publication'].includes(x)),
 Boutiques:['id','operation','revision',...centralShopColumns.shop],
 Offres:['id','operation','revision',...centralShopColumns.offer],
 Personnages:['id','operation','revision',...centralCharacterColumns],
 Informations:['id','operation','revision',...centralStoryColumns.knowledge],
 Missions:['id','operation','revision',...centralStoryColumns.mission],
};
for(const sheet of ['Objets','Recettes'])centralImportSheets[sheet].splice(2,0,'revision');
export const centralImportRequired={Meta:['format','version','type'],default:['id','operation','revision']};
