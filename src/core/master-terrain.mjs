import {documentId} from './validation.mjs';
import {fieldTargetInput,fieldProfile,validateFieldReferences,initialFieldState} from './field-state.mjs';
import {personProfileInput,validatePersonReferences,isLoot} from './person-state.mjs';

// Rows remain simple values; nested profiles are assembled before graph validation.
export function importTerrain({rows,m,records,session,fieldStates,parent,stamp,checkOperation,summary,mark,addError,issue,num,empty,patch,base,put}){
 const sources=new Map(),touched=new Set(),childTargets=new Set();
 const pairs=(value,column,{numericKey=false,positive=true}={})=>{
  if(value==='!EFFACER')return [];
  const seen=new Set();return value.split(';').map(part=>{
   const [raw,n,...rest]=part.trim().split(':'),key=raw?.trim();
   if(rest.length||!key||n===undefined)issue(column,'Utiliser identifiant:valeur ; autre_identifiant:valeur.');
   if(numericKey){if(!/^[1-9]\d*$/.test(key))issue(column,'Le niveau doit être un entier positif.');}else documentId(key);
   if(seen.has(key))issue(column,'Un identifiant ou niveau ne peut figurer deux fois.');seen.add(key);
   return [key,num(n.trim(),column,positive)];
  });
 };
 const common=(r,old={})=>{
  const d=patch(r,structuredClone(old),{instructions:'instructions',texte_reussite:'successText',texte_echec:'failureText'});
  if(!empty(r.competence_id))d.skillId=r.competence_id==='!EFFACER'?null:documentId(r.competence_id);
  for(const [col,key] of Object.entries({niveau_minimum:'minLevel',duree_secondes:'durationSeconds',seuil:'threshold',cout_pa:'cost',recuperation_secondes:'cooldownSeconds'}))if(!empty(r[col])){
   d[key]=r[col]==='!EFFACER'&&['cost','cooldownSeconds'].includes(key)?null:num(r[col],col,col==='niveau_minimum');
  }
  if(d.durationSeconds===undefined)issue('duree_secondes','Renseigner la durée en secondes, y compris 0 pour une action immédiate.');
  if(!empty(r.durees_niveaux))d.durationByLevel=Object.fromEntries(pairs(r.durees_niveaux,'durees_niveaux',{numericKey:true,positive:false}));
  if(!empty(r.bonus_objets))d.bonusItems=pairs(r.bonus_objets,'bonus_objets',{positive:false}).map(([itemId,bonus])=>({itemId,bonus}));
  if(!empty(r.consommable_id)){
   if(r.consommable_id==='!EFFACER'){if(!empty(r.consommable_quantite))issue('consommable_quantite','Laisser vide lors du retrait du consommable.');d.consumable=null;}
   else d.consumable={itemId:documentId(r.consommable_id),quantity:empty(r.consommable_quantite)&&r.consommable_id===old.consumable?.itemId?old.consumable.quantity:num(r.consommable_quantite,'consommable_quantite',true)};
  }else if(!empty(r.consommable_quantite)){
   if(!d.consumable)issue('consommable_id','Renseigner le consommable avant sa quantité.');d.consumable.quantity=num(r.consommable_quantite,'consommable_quantite',true);
  }
  return d;
 };
 const archiveOnly=(r,identity=[])=>{if(Object.entries(r).some(([k,v])=>!['_row','id','operation','version',...identity].includes(k)&&v))issue('operation','Une ligne ARCHIVER contient seulement son identité, operation et version.');};
 const touch=(id,sheet,r)=>{touched.add(id);sources.set(id,{sheet,r});mark('fieldTargets',id);};
 for(const r of rows.Lieux??[])try{
  if(!stamp('Lieux',r))continue;const old=m.fieldTargets.get(r.id);checkOperation(r,old);
  let d;if(r.operation==='ARCHIVER'){archiveOnly(r);d={...old,publicationState:'DRAFT',masterArchived:true};}
  else{
   d=patch(r,{id:r.id,publicationState:'DRAFT',profiles:{},rewards:[],...structuredClone(old)},{titre:'title',type:'kind',publication:'publicationState',description:'description',notes_mj:'gmNotes'});
   if(!empty(r.installation_id))d.dependencyId=r.installation_id==='!EFFACER'?null:documentId(r.installation_id);
   for(const [col,key] of Object.entries({panne_secondes:'offlineSeconds',verrou_echec_secondes:'failureLockSeconds',protection_reparation_secondes:'repairProtectionSeconds'}))if(!empty(r[col]))d[key]=num(r[col],col);
   d.masterArchived=false;
  }
  m.fieldTargets.set(r.id,d);touch(r.id,'Lieux',r);summary('Lieux',r,old,d);
 }catch(e){addError('Lieux',r,e);}
 for(const sheet of ['ActionsTerrain','Recompenses'])for(const r of rows[sheet]??[])try{
  if(!stamp(sheet,r))continue;const tid=documentId(r.lieu_id),target=m.fieldTargets.get(tid);
  if(!target)issue('lieu_id','Créer ce lieu dans Lieux, ou utiliser un lieu existant.');
  const key=`${sheet}:${tid}:${sheet==='ActionsTerrain'?r.type:r.id}`;
  if(childTargets.has(key))issue('id','Deux lignes ciblent le même profil ou la même récompense.');childTargets.add(key);
  // Clone so an invalid child row never changes the projected parent.
  const d=structuredClone(target);let old,next;
  if(sheet==='ActionsTerrain'){
   if(!['SEARCH','SABOTAGE','REPAIR'].includes(r.type))issue('type','Utiliser SEARCH, SABOTAGE ou REPAIR.');
   old=d.profiles[r.type];checkOperation(r,old);
   if(r.operation==='ARCHIVER')issue('operation','Un profil de lieu est obligatoire. Modifier son contenu ou archiver le lieu.');
   const p=common(r,old);if(!empty(r.test))p.test=r.test;
   if(!['AUTO','D6'].includes(p.test))issue('test','Choisir AUTO ou D6.');
   next=fieldProfile(p,r.type);d.profiles[r.type]=next;
  }else{
   old=d.rewards.find(x=>x.id===r.id);checkOperation(r,old);
   if(r.operation==='ARCHIVER'){archiveOnly(r,['lieu_id']);next=null;d.rewards=d.rewards.filter(x=>x.id!==r.id);}
   else{
    next=patch(r,{id:r.id,...old},{type:'kind'});
    for(const [col,field] of Object.entries({quantite:'quantity',stock_initial:'stock',limite_personnage:'perCharacter'}))if(!empty(r[col]))next[field]=num(r[col],col,true);
    for(const [col,field] of Object.entries({objet_id:'itemId',connaissance_id:'knowledgeId'}))if(!empty(r[col]))next[field]=r[col]==='!EFFACER'?null:documentId(r[col]);
    if(!['CREDITS','ITEM','KNOWLEDGE'].includes(next.kind))issue('type','Utiliser CREDITS, ITEM ou KNOWLEDGE.');
    if(next.kind!=='ITEM'&&next.itemId)issue('objet_id','Réservé aux récompenses ITEM ; utiliser !EFFACER si le type change.');
    if(next.kind!=='KNOWLEDGE'&&next.knowledgeId)issue('connaissance_id','Réservé aux récompenses KNOWLEDGE ; utiliser !EFFACER si le type change.');
    for(const [col,field] of [['quantite','quantity'],['stock_initial','stock'],['limite_personnage','perCharacter']])if(next[field]===undefined)issue(col,'Renseigner un entier positif.');
    d.rewards=old?d.rewards.map(x=>x.id===r.id?next:x):[...d.rewards,next];
   }
  }
  m.fieldTargets.set(tid,d);touch(tid,sheet,r);summary(sheet,r,old,next);
 }catch(e){addError(sheet,r,e);}
 for(const r of rows.Interactions??[])try{
  if(!stamp('Interactions',r))continue;const old=m.personProfiles.get(r.id);checkOperation(r,old);let d;
  if(r.operation==='ARCHIVER'){archiveOnly(r);d={...old,publicationState:'DRAFT',masterArchived:true,revision:old.revision+1};}
  else{
   d=patch(r,common(r,old),{nom:'name',type:'kind',publication:'publicationState'});d.publicationState??='DRAFT';
   if(!empty(r.nature_patient))d.patientNature=r.nature_patient==='!EFFACER'?null:r.nature_patient;
   if(!empty(r.prerequis))d.prerequisites=pairs(r.prerequis,'prerequis').map(([skillId,minLevel])=>({skillId,minLevel}));
   if(!empty(r.consommables_supplementaires))d.extraConsumables=pairs(r.consommables_supplementaires,'consommables_supplementaires').map(([itemId,quantity])=>({itemId,quantity}));
   for(const [col,key] of Object.entries({complement_secondes:'continuationSeconds',soin_pv:'healAmount',niveau_reanimation:'reviveLevel',convalescence_secondes:'convalescenceSeconds',recuperation_patient_secondes:'patientCooldownSeconds'}))if(!empty(r[col]))d[key]=num(r[col],col,['soin_pv','niveau_reanimation'].includes(col));
   if(!isLoot(d)&&d.cooldownSeconds!=null&&d.cooldownSeconds!==0)issue('recuperation_secondes','Pour un soin, utiliser recuperation_patient_secondes. La récupération personnelle vaut 0.');
   d={...personProfileInput(d,r.id,old),masterArchived:false};
  }
  m.personProfiles.set(r.id,d);mark('personProfiles',r.id);summary('Interactions',r,old,d);
 }catch(e){addError('Interactions',r,e);}
 // Normalize all touched targets after their profiles and rewards have been assembled.
 for(const id of touched)try{
  const old=records.fieldTargets.find(x=>x.id===id),draft=m.fieldTargets.get(id),next={...fieldTargetInput(draft,id,old),masterArchived:draft.masterArchived??false};
  if(session&&old&&(old.kind!==next.kind||JSON.stringify(old.rewards)!==JSON.stringify(next.rewards)))issue('stock_initial','Les récompenses d’un lieu déjà créé en session sont protégées. Utiliser le réapprovisionnement MJ pour ajouter du stock.');
  const state=fieldStates.find(x=>x.id===id);
  if(session&&!old&&state)issue('id','Cet identifiant possède déjà un état de lieu. Utiliser un identifiant neuf.');
  if(state?.activeActionId)issue('id','Une action réserve ce lieu. La terminer ou l’annuler avant modification.');
  if(session&&old&&!state)issue('id','État de lieu absent. Une correction MJ est nécessaire ; le master ne recrée pas son stock.');
  m.fieldTargets.set(id,next);
  if(session&&!old)put(`${base}/fieldStates/${id}`,initialFieldState(next));
 }catch(e){const {sheet,r}=sources.get(id);addError(sheet,r,e);}
 const combined=Object.fromEntries(Object.entries(m).map(([k,v])=>[k,[...v.values()]]));
 for(const [kind,sheet,validate] of [['fieldTargets','Lieux',validateFieldReferences],['personProfiles','Interactions',validatePersonReferences]]){
  if(m[kind].size>100)addError(sheet,null,{column:'id',masterMessage:'Maximum 100 fiches de ce type dans la destination.'});
  for(const d of m[kind].values())try{
   validate(d,combined);
   if(kind==='fieldTargets'&&d.publicationState==='PUBLISHED'&&d.rewards.some(x=>x.kind==='CREDITS')&&!parent.economyRules?.enabled)issue('type','Activer l’économie avant de publier une récompense de crédits.');
  }catch(e){const source=kind==='fieldTargets'?sources.get(d.id):null;addError(source?.sheet??sheet,source?.r??rows[sheet]?.find(r=>r.id===d.id),e.code==='FIELD_REFERENCE'?{column:'id',masterMessage:`Référence invalide pour ${d.id} : vérifier les compétences PASSIVE, objets, connaissances et installations, ainsi que leur publication.`}:e);}
 }
}
