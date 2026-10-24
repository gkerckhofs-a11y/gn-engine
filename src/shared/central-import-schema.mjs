import {masterSheets} from './master-schema.mjs';

// A separate, campaign-bound contract. Historical CAMPAGNE/SESSION and the
// documentary SO_Masters V0.1 are not converted implicitly.
export const centralImportFormat='gn-engine-central-draft';
export const centralImportRows=100;
export const centralImportTypes={M1:{type:'item',sheet:'Objets'},M4:{type:'recipe',sheet:'Recettes'}};
export const centralImportSheets={
 Meta:['format','version','schema_version','type','campaign_id','scenario_id','rule_profile','central_base_version','draft_id','draft_revision','module_type','import_batch_id'],
 Objets:masterSheets.Objets.filter(x=>!['version','image_media_id','publication'].includes(x)),
 Recettes:masterSheets.Recettes.filter(x=>!['version','publication'].includes(x)),
};
for(const sheet of ['Objets','Recettes'])centralImportSheets[sheet].splice(2,0,'revision');
export const centralImportRequired={Meta:['format','version','type'],default:['id','operation','revision']};
