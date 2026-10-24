// UI-only choices serialized into the three existing Master sheets.
const creation=field=>({...field,creationOnly:true,virtual:true});
export const characterCreationFields=[
 creation({name:'initial_profile',label:'Attribuer un profil de compétences initial',choices:[['NON','Non'],['OUI','Oui']],initial:'NON',refresh:true}),
 creation({name:'initial_class',label:'Classe publiée de départ',ref:'publishedClasses',when:{initial_profile:['OUI']}}),
 creation({name:'initial_skills',label:'Ajustements des compétences initiales',type:'levels',ref:'publishedSkills',min:1,when:{initial_profile:['OUI']},help:'Cochez les compétences à ajuster et renseignez leur niveau. Les autres compétences de la classe sont conservées. Pour composer un profil sans elles, choisissez « Aucun » comme classe.'}),
 creation({name:'initial_profile_publication',label:'Profil visible au joueur',choices:[['NON','Non'],['OUI','Oui']],initial:'NON',when:{initial_profile:['OUI']}}),
 creation({name:'initial_credits',label:'Crédits de jeu initiaux',type:'number',min:0,help:'Facultatif : vide ou zéro signifie aucune dotation. La monnaie doit être configurée dans la destination.'}),
 creation({name:'initial_items',label:'Objets initiaux',type:'levels',ref:'publishedItems',valueLabel:'Quantité',emptyLabel:'Aucun objet publié disponible.',help:'Cochez les objets et renseignez leur quantité. La validation applique les règles du conditionnement existant. Aucune dotation n’est copiée automatiquement.'})
];
export function characterCreationSheets(row,values){
 if(row.operation!=='CREER')return {};
 const base={operation:'CREER',version:'1',personnage_id:row.id},out={};
 if(values.initial_profile==='OUI')out.Attributions=[{...base,id:`${row.id}-profile`,classe_id:values.initial_class||'!EFFACER',competences:values.initial_skills||'!EFFACER',publication:values.initial_profile_publication||'NON'}];
 const grants=[];
 const credits=values.initial_credits?.trim();
 if(credits&&credits!=='0')grants.push({...base,id:`${row.id}-credits`,type:'CREDIT',quantite:credits});
 if(values.initial_items)for(const [i,pair] of values.initial_items.split(';').entries()){
  const parts=pair.split(':');
  if(parts.length!==2||!parts[0]||!parts[1])throw new Error('Objets initiaux : choisissez un objet et sa quantité.');
  grants.push({...base,id:`${row.id}-item-${i+1}`,type:'OBJET',objet_id:parts[0],quantite:parts[1]});
 }
 if(grants.length)out.Dotations=grants;
 return out;
}
