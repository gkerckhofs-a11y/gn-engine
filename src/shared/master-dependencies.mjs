import {workshopModules} from './workshop-modules.mjs';
// Catalog references present in exported cells. This is not an import validator.
const scalar={
 Competences:{consommable_id:'Objets'},Attributions:{personnage_id:'Personnages',classe_id:'Classes'},
 Membres:{personnage_id:'Personnages',groupe_id:'Groupes'},Relations:{personnage_id:'Personnages',cible_id:'Personnages'},Objectifs:{personnage_id:'Personnages'},
 Vaisseaux:{carburant_objet_id:'Objets'},Cours:{id:'Objets'},Entrepots:{loyer_groupe_id:'Groupes'},
 Connaissances:{qr_competence_id:'Competences'},Lieux:{installation_id:'Lieux'},
 ActionsTerrain:{lieu_id:'Lieux',competence_id:'Competences',consommable_id:'Objets'},
 Recompenses:{lieu_id:'Lieux',objet_id:'Objets',connaissance_id:'Connaissances'},
 Interactions:{competence_id:'Competences',consommable_id:'Objets'},Tarifs:{objet_id:'Objets'},
};
const lists={Classes:{competences:['Competences',true]},Attributions:{competences:['Competences',true]},
 Connaissances:{personnages_initiaux:['Personnages',false],qr_personnages:['Personnages',false]},
 ActionsTerrain:{bonus_objets:['Objets',true]},Interactions:{prerequis:['Competences',true],bonus_objets:['Objets',true],consommables_supplementaires:['Objets',true]}};
const owner=sheet=>workshopModules.find(m=>m.sheets.includes(sheet))?.id??null;
const ids=(value,pairs=false)=>typeof value==='string'&&value&&value!=='!EFFACER'?value.split(';').map(s=>(pairs?s.split(':')[0]:s).trim()).filter(Boolean):[];
export function masterDependencies(sheets,index){
 const found=[];
 for(const [sheet,rows] of Object.entries(sheets))for(const [n,row] of rows.entries()){
  // Archive rows retain identity fields but do not express new dependencies.
  if(row.operation==='ARCHIVER')continue;
  const fields={...(scalar[sheet]??{})};
  if(sheet==='Vaisseaux'&&['CHARACTER','GROUP'].includes(row.proprietaire_type))fields.proprietaire_id=row.proprietaire_type==='GROUP'?'Groupes':'Personnages';
  if(sheet==='Tarifs'&&['CHARACTER','GROUP'].includes(row.beneficiaire_type))fields.beneficiaire_id=row.beneficiaire_type==='GROUP'?'Groupes':'Personnages';
  if(sheet==='EvenementsEco'){
   if(row.cible_type==='ROUTE')fields.route_id='Routes';else fields.objet_id='Objets';
   if(row.declenchement==='INSTALLATION_OFFLINE')fields.installation_id='Lieux';
  }
  const add=(column,targetSheet,id)=>{
   const target=index?.[targetSheet]?.find(x=>x.id===id),included=sheets[targetSheet]?.find(x=>x.id===id);
   found.push({sheet,row:n+2,sourceId:row.id??'',column,targetSheet,targetId:id,module:owner(targetSheet),
    scope:owner(sheet)===owner(targetSheet)?'INTERNAL':'EXTERNAL',
    presence:!index?.[targetSheet]?'UNKNOWN':target?(target.archived?'ARCHIVED':'PRESENT'):'MISSING',
    included:included?(included.operation==='ARCHIVER'?'ARCHIVE':'ROW'):'NONE'});
  };
  for(const [column,target] of Object.entries(fields))if(typeof row[column]==='string'&&row[column]&&row[column]!=='!EFFACER')add(column,target,row[column]);
  for(const [column,[target,pairs]] of Object.entries(lists[sheet]??{}))for(const id of new Set(ids(row[column],pairs)))add(column,target,id);
 }
 return found;
}
