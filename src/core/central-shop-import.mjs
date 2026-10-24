import {centralShopInput,centralOfferInput} from './central-shops.mjs';

const fields={
 shop:{nom:['name'],description:['description','text',''],vendeur_personnage_id:['sellerCharacterId','text',null],lieu_id:['locationTargetId','text',null],notes_mj:['gmNotes','text','']},
 offer:{nom:['name'],boutique_id:['shopId','text',null],objet_id:['itemId','text',null],prix_vente_cr:['unitPrice','number',null],prix_rachat_cr:['buybackPrice','number',null],conditions:['conditions','text',''],notes_mj:['gmNotes','text','']},
};
const validate=(type,v,id,old)=>type==='shop'?centralShopInput(v,id,old):centralOfferInput(v,id,old);
const editable=(type,data)=>Object.fromEntries(Object.values(fields[type]).filter(([key])=>Object.hasOwn(data,key)).map(([key])=>[key,data[key]]));
export function importedShop(type,row,old){
 const data=old?editable(type,old.data):{};
 for(const [column,[key,kind='text',cleared]] of Object.entries(fields[type])){
  let value=row[column];if(value===undefined||value==='')continue;
  try{
   if(value==='!EFFACER'){if(cleared===undefined)throw new Error('Ce champ obligatoire ne peut pas être effacé.');value=cleared;}
   else if(kind==='number'){if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value)))throw new Error('Crédits entiers strictement positifs attendus.');value=Number(value);}
   else if(value.startsWith('!!'))value=value.slice(1);
   validate(type,{name:'Validation',[key]:value},row.id);data[key]=value;
  }catch(e){e.column=column;throw e;}
 }
 return validate(type,data,row.id,old?.data);
}
export function exportedShop(c){
 const row={id:c.entityId,operation:c.operation==='ARCHIVE'?'ARCHIVER':'MODIFIER',revision:c.data.revision};if(c.operation==='ARCHIVE')return row;
 for(const [column,[key]] of Object.entries(fields[c.type])){const v=c.data[key];row[column]=v==null?'':typeof v==='string'&&v.startsWith('!')?`!${v}`:v;}return row;
}
export const shopImportColumn=(type,field)=>Object.entries(fields[type]).find(([, [key]])=>field===key)?.[0]??field;
