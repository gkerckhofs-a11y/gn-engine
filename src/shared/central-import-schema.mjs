import {masterSheets} from './master-schema.mjs';

// A separate, campaign-bound contract. Historical CAMPAGNE/SESSION and the
// documentary SO_Masters V0.1 are not converted implicitly.
export const centralImportFormat='gn-engine-central-draft';
export const centralImportRows=100;
export const centralImportTypes={M1:{type:'item',sheet:'Objets'},M2:{type:'character',sheet:'Personnages'},M4:{type:'recipe',sheet:'Recettes'},M6:{type:'knowledge',sheet:'Informations'},M7:{type:'mission',sheet:'Missions'}};
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
 Personnages:['id','operation','revision',...centralCharacterColumns],
 Informations:['id','operation','revision',...centralStoryColumns.knowledge],
 Missions:['id','operation','revision',...centralStoryColumns.mission],
};
for(const sheet of ['Objets','Recettes'])centralImportSheets[sheet].splice(2,0,'revision');
export const centralImportRequired={Meta:['format','version','type'],default:['id','operation','revision']};
