import {accountId,groupAccountId} from './economy-state.mjs';
import {cargoTariffInput} from './customs-state.mjs';

export function importCustoms({rows,m,stamp,checkOperation,summary,mark,addError,issue,num,empty,patch}){
 for(const r of rows.Tarifs??[]){try{
  if(!stamp('Tarifs',r))continue;const old=m.cargoTariffs.get(r.id);checkOperation(r,old);
  let d=patch(r,{enabled:false,itemId:null,description:'',...old},{titre:'title',description:'description',nature:'kind',mouvement:'direction',objet_id:'itemId'});
  if(r.operation==='ARCHIVER'){
   if(Object.entries(r).some(([k,v])=>!['_row','id','operation','version'].includes(k)&&v))issue('operation','ARCHIVER ne contient que id, operation et version.');d.enabled=false;
  }else{
   for(const [column,field] of [['montant_fixe','flatAmount'],['montant_unitaire','unitAmount']])if(!empty(r[column]))d[field]=num(r[column],column);else if(!old)issue(column,'Montant entier obligatoire à la création, y compris pour zéro.');
   if(!empty(r.actif)){if(!['OUI','NON'].includes(r.actif))issue('actif','Utiliser OUI ou NON.');d.enabled=r.actif==='OUI';}
   const currentType=old?.recipientAccountId?([...m.characters.keys()].some(id=>accountId(id)===old.recipientAccountId)?'CHARACTER':'GROUP'):'SINK';
   const type=empty(r.beneficiaire_type)?(old?currentType:null):r.beneficiaire_type;
   if(!['CHARACTER','GROUP','SINK'].includes(type))issue('beneficiaire_type','Choisir CHARACTER, GROUP ou SINK (retrait de circulation).');
   if(type==='SINK'){
    if(!empty(r.beneficiaire_id)&&r.beneficiaire_id!=='!EFFACER')issue('beneficiaire_id','SINK ne reçoit pas d’identifiant.');d.recipientAccountId=null;
   }else if(!empty(r.beneficiaire_id)){
    const target=m[type==='GROUP'?'groups':'characters'].get(r.beneficiaire_id);
    if(!target)issue('beneficiaire_id','Bénéficiaire absent de cette destination et de cet import.');
    if(type==='GROUP'&&!target.walletConfig)issue('beneficiaire_id','Configurer la caisse de cette bande avant de la choisir comme bénéficiaire.');
    d.recipientAccountId=(type==='GROUP'?groupAccountId:accountId)(target.id);
   }else if(!old||type!==currentType)issue('beneficiaire_id','Renseigner le bénéficiaire à la création ou au changement de type.');
  }
  if(!['CUSTOMS','CORRUPTION'].includes(d.kind))issue('nature','Choisir CUSTOMS ou CORRUPTION.');
  if(!['LOAD','UNLOAD','TRANSSHIP'].includes(d.direction))issue('mouvement','Choisir LOAD, UNLOAD ou TRANSSHIP.');
  if(d.itemId&&!m.items.has(d.itemId))issue('objet_id','Modèle absent de cette destination et de cet import. Utiliser !EFFACER pour tous les objets.');
  d={...cargoTariffInput(d,r.id,old??{}),masterArchived:r.operation==='ARCHIVER'};m.cargoTariffs.set(r.id,d);mark('cargoTariffs',r.id);summary('Tarifs',r,old,d);
 }catch(e){addError('Tarifs',r,e);}}
}
