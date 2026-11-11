// Port-specific customs policies. An unlisted item is not automatically FREE.
export const portCustomsStatuses=['FREE','REGULATED','PROHIBITED'];
export const portCustomsText=rules=>(rules??[]).map(r=>r.itemId+':'+r.status).join(';');
export function parsePortCustomsText(input){
 if(typeof input!=='string')throw Error('Texte des statuts douaniers requis.');
 if(!input.trim())return [];
 return input.split(/[;\n]+/).map(x=>x.trim()).filter(Boolean).map(entry=>{
  const parts=entry.split(':');
  if(parts.length!==2)throw Error('Format requis : objet_id:FREE; autre_id:REGULATED.');
  const [itemId,status]=parts.map(x=>x.trim());
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(itemId)||!portCustomsStatuses.includes(status))
   throw Error('Marchandise ou statut douanier invalide (FREE, REGULATED, PROHIBITED).');
  return {itemId,status};
 });
}
