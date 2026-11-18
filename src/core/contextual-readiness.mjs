import {localServiceCatalog} from '../shared/local-service-catalog.mjs';
import {localBindingId} from './contextual-policy.mjs';
import {requireThat} from './validation.mjs';
const broker=new Set(['galacticMarkets','preparePlanetSale','sellToPlanetMarket']);
export async function localReadiness(tx,s){
 const b=`sessions/${s.id}`,f=s.spaceOutlaws??{};
 const [shops,ports,warehouses,targets,profiles,terminals]=await Promise.all(['shops','ports','warehouses','fieldTargets','personProfiles'].map(c=>tx.list(`${b}/${c}`)).concat([tx.list(`localAccess/${s.id}/terminals`)]));
 const byTerminal=new Map(terminals.map(t=>[t.id,t]));
 const rows=[];
 for(const [action,meta] of Object.entries(localServiceCatalog)){
  const enabled=action==='dockEntry'?f.dockStorageVersion===1:action==='merchantService'?f.merchantContactsVersion===1||f.merchantNegotiationVersion===1:action==='clinicCare'?f.healthVersion===1:action.includes('Intelligence')?f.intelligenceVersion===1:action.includes('Customs')?f.hiddenCargoVersion===1:action.includes('Module')?f.moduleWorkVersion===1:action.includes('Maintenance')?f.logisticsVersion===1:action.includes('Cargo')?f.logisticsVersion===1:meta.kind==='PORT'?f.navigationVersion===1:broker.has(action)?f.itemCircuitsVersion===1&&f.shopsVersion===1&&!!s.economyRules?.enabled:meta.kind==='SHOP'?f.shopsVersion===1&&!!s.economyRules?.enabled:!!s.economyRules?.enabled;
  const resources=meta.kind==='SESSION'?[{id:s.id,name:s.title}]:meta.kind==='SHOP'?shops.filter(v=>v.versionId===s.versionId):meta.kind==='PORT'?ports.filter(v=>v.versionId===s.versionId):meta.kind==='DOCK'?warehouses.filter(v=>v.dock?.schemaVersion===1):targets.filter(t=>t.publicationState==='PUBLISHED'&&(action==='clinicCare'?profiles.some(p=>p.publicationState==='PUBLISHED'&&p.clinicTargetId===t.id):t.negotiation||Object.values(t.profiles??{}).some(p=>['COU-02','COU-03'].includes(p.skillId))));
  for(const r of resources){
   const binding=await tx.get(`localAccess/${s.id}/bindings/${localBindingId(action,r.id)}`),terminal=binding?byTerminal.get(binding.terminalId):null,rule=terminal?.operations.find(o=>o.action===action&&o.resourceId===r.id);
   const connected=!!(binding?.active&&terminal?.active&&rule),status=!enabled?'DISABLED':connected?'ACTIVE':binding?'DISABLED':'UNCONNECTED';
   rows.push({operation:action,resourceId:r.id,resourceName:r.name??r.title??r.id,kind:meta.kind,type:['commodityMarket','galacticMarkets','shop'].includes(action)?'LIVE_READ':'LAUNCH',status,required:enabled,connected,terminalId:terminal?.id??null,terminalName:terminal?.name??null,placeId:terminal?.placeId??null,portId:meta.kind==='PORT'?r.id:meta.kind==='DOCK'?r.portId:terminal?.portId??null,nativeRule:broker.has(action)?'Courtier principal + commerce natif':action.includes('Customs')?'Habilitation et port natifs':action.includes('Module')?'Mécano, mandat, pièces et PA natifs':action.includes('Voyage')||action==='departShip'?'Pilote désigné, compétence et manifeste natifs':action==='clinicCare'?'Profil de soins, compétence, patient et fournitures natifs':'Droits, classe, compétence et ressources du service natif',...(rule?{policy:{skillId:rule.skillId,minLevel:rule.minLevel,nominative:rule.characterIds.length>0,credentials:(rule.credentialIds??[]).length}}:{})});
  }
 }
 requireThat(rows.length<=3000,'LOCAL_LIMIT');
 const missing=rows.filter(r=>r.required&&!r.connected);
 return {version:f.terminalQrVersion??0,ready:missing.length===0,rows,missing,exceptions:[{operation:'sabaccJoin',type:'NATIVE_QR',rule:'QR natif de la nouvelle table ; reprise du siège courant sans nouveau scan'},{operation:'dossiers',type:'DOSSIER',rule:'Reçus, informations acquises et opérations engagées selon droits natifs'},{operation:'urgence',type:'EXCEPTION',rule:'Soins de terrain et survie sans QR de centre'},{operation:'regie',type:'EXCEPTION',rule:'Administration native sans présence joueur'}]};
}
