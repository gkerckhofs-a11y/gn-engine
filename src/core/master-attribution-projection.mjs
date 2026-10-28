import {createHash} from 'node:crypto';
// Resolve historical receipt identities without copying profiles into another collection.
export function attributionMasterRows(characters,stamps){
 const receipts=[...new Map(stamps.filter(s=>s.sheet==='Attributions').map(s=>[s.id,s])).values()],errors=[];
 if(receipts.some(s=>!s.identity))errors.push('Un reçu Attributions sans identité doit être clarifié avant cet export. Aucun identifiant n’a été remplacé.');
 const rows=characters.filter(c=>c.abilityProfile).map(c=>{
  const identity=createHash('sha256').update(JSON.stringify([c.id,null])).digest('hex'),matches=receipts.filter(s=>s.identity===identity),p=c.abilityProfile,id=matches[0]?.rowId??`profil-${identity}`;
  if(matches.length>1)errors.push(`Plusieurs identifiants Master pour le profil de ${c.id}. Clarifier cet historique avant édition ou export.`);
  if(receipts.some(s=>s.rowId===id&&s.identity!==identity))errors.push(`Identifiant de profil déjà lié à un autre personnage : ${id}.`);
  if(!Array.isArray(p.choices?.overrides)||p.choices.overrides.some(s=>s.level<1))errors.push(`Le profil de ${c.id} contient des choix non représentables dans le Master actuel. Utiliser l’outil d’attribution dédié.`);
  return {id,characterId:c.id,characterName:c.public.displayName,profile:p};
 });
 return {rows,errors};
}
