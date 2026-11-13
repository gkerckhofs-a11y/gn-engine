// Presentation only: historical character data and signed confirmations remain untouched.
export const characterLabel=value=>typeof value==='string'?value.replace(/\s+Recette\s*$/iu,''):value;
export function cleanCharacterNames(value,context=''){
 if(Array.isArray(value))return value.map(v=>cleanCharacterNames(v,context));
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,
  ['displayName','characterName','sourceName','targetName','carrierName','buyerName','sellerName','pilotName'].includes(k)||(k==='name'&&['character','characters','target','source','members','seats','players','profile'].includes(context))?characterLabel(v):cleanCharacterNames(v,k)]));
}
