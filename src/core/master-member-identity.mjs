import {createHash} from 'node:crypto';

// Same ordered identity cells as the historical Master receipt, without a new record.
export const memberIdentity=(characterId,groupId)=>createHash('sha256').update(JSON.stringify([characterId,groupId])).digest('hex');
export function memberMasterRows(groups,characters,stamps){
 const receipts=[...new Map(stamps.filter(s=>s.sheet==='Membres').map(s=>[s.id,s])).values()],errors=[];
 if(receipts.some(s=>!s.identity))errors.push('Un ancien reçu Membres ne précise pas son appartenance. L’identité Master doit être clarifiée avant cet export ; les outils de groupe et imports historiques restent disponibles.');
 const rows=groups.flatMap(g=>g.members.map(m=>{
  const identity=memberIdentity(m.characterId,g.id),matches=receipts.filter(s=>s.identity===identity);
  if(matches.length>1)errors.push(`Plusieurs identifiants Master pour ${m.characterId} dans ${g.id}. Clarifier cet historique avant l’édition ou l’export ; aucun identifiant n’a été remplacé.`);
  const id=matches[0]?.rowId??`membre-${identity}`;
  if(receipts.some(s=>s.rowId===id&&s.identity!==identity))errors.push(`Identifiant Master déjà lié à une autre appartenance : ${id}.`);
  return {...m,id,groupId:g.id,groupName:g.name,characterName:characters.find(c=>c.id===m.characterId)?.public.displayName??m.characterId};
 }));
 return {rows,errors};
}
