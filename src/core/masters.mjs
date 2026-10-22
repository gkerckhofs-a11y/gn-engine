import {masterModuleErrors} from '../shared/workshop-modules.mjs';
import {masterWorkspace,masterEditable} from './master-workspace.mjs';
import {createHash} from 'node:crypto';
import {documentId,requireThat,whole} from './validation.mjs';
import {masterSheets,masterCollections,masterParameters,masterLimits} from '../shared/master-schema.mjs';
import {skillInput,classInput} from './abilities.mjs';
import {groupInput,groupPermissions} from './groups.mjs';
import {knowledgeInput,initialReceipt} from './knowledge.mjs';
import {itemInput,publicItem,itemQuantity,seedInventory} from './inventory-state.mjs';
import {seedWallets,economyRulesInput,accountId,groupAccountId,moneyState} from './economy-state.mjs';
import {warehouseInput,stockVolume,storedIn} from './storage-state.mjs';
import {healthRulesInput,initialHealth} from './health-state.mjs';
import {actionPointRulesInput,actionPointMaximum,actionPointPath} from './action-point-state.mjs';
import {cleanScenarioSnapshot} from './scenario-package.mjs';
import {recordPublication} from './narrative.mjs';
import {imageReferences} from './media-state.mjs';
import {importNavigation} from './master-navigation.mjs';
import {importCustoms} from './master-customs.mjs';
import {importEconomics} from './master-economics.mjs';
import {transportRulesInput} from './navigation-state.mjs';
import {importTerrain} from './master-terrain.mjs';

export const masterCommands=['prepareMasterImport','applyMasterImport','masterImportHistory','masterWorkspace'];
export const masterAction=a=>masterCommands.includes(a);
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const kinds=Object.values(masterCollections);
const empty=v=>v===undefined||v==='';
const issue=(column,message)=>{throw Object.assign(new Error(message),{column,masterMessage:message});};
const str=(v,max=20000)=>{if(typeof v!=='string'||v.length>max)issue('','Texte absent ou trop long.');return v.trim();};
const num=(v,column,positive=false)=>{if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v))||(positive&&Number(v)<1))issue(column,'Un entier '+(positive?'positif':'positif ou nul')+' est attendu.');return Number(v);};
const bool=(v,column)=>{if(!['OUI','NON'].includes(v))issue(column,'Utiliser OUI ou NON.');return v==='OUI';};
const ids=v=>v?str(v).split(';').map(x=>documentId(x.trim())):[];
const levels=v=>v?str(v).split(';').map(x=>{const [skillId,level,...extra]=x.trim().split(':');if(extra.length)issue('competences','Utiliser competence_id:1 ; autre_id:2.');return {skillId:documentId(skillId),level:num(level,'competences',true)};}):[];
const ref=(map,id,column)=>{if(!id||!map.has(id))issue(column,`Référence absente : ${id||'(vide)'}.`);return map.get(id);};
const changed=(before,after)=>{
 const out=[];const walk=(a,b,p)=>{if(digest(a??null)===digest(b??null))return;if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))if(!['revision','contentRevision','historyStarted'].includes(k))walk(a[k],b[k],p?`${p}.${k}`:k);}else out.push({field:p,before:a??null,after:b??null});};walk(before??{},after??{},'');return out;
};
const mapsFor=records=>Object.fromEntries(kinds.map(k=>[k,new Map(records[k].map(r=>[r.id,structuredClone(r)]))]));
const rowsRecord=m=>Object.fromEntries(kinds.map(k=>[k,[...m[k].values()]]));
function patch(r,base,fields){
 const d={...base};for(const [col,key] of Object.entries(fields))if(!empty(r[col]))d[key]=r[col]==='!EFFACER'?'':r[col];return d;
}
function imagePatch(r,d,columns){
 for(const [col,slot] of Object.entries(columns))if(!empty(r[col])){d.mediaImages={...d.mediaImages,[slot]:r[col]==='!EFFACER'?null:{id:documentId(r[col]),version:1}};}return d;
}
function cleanRows(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Buffer.byteLength(JSON.stringify(input))>masterLimits.payloadBytes)issue('','Classeur trop volumineux ou invalide.');
 const rows={},errors=[];let count=0;
 for(const [sheet,values] of Object.entries(input)){
  if(!Object.hasOwn(masterSheets,sheet)){errors.push({sheet,row:1,column:'',message:'Onglet non pris en charge.'});continue;}
  if(!Array.isArray(values)){errors.push({sheet,row:1,column:'',message:'Tableau de lignes attendu.'});continue;}
  rows[sheet]=[];
  for(const [i,raw] of values.entries()){
   const row=Number.isSafeInteger(raw?._row)&&raw._row>=2?raw._row:i+2;
   try{
    if(!raw||typeof raw!=='object'||Array.isArray(raw))issue('','Ligne invalide.');
    const r={_row:row};for(const [col,v] of Object.entries(raw)){if(col==='_row')continue;if(!masterSheets[sheet].includes(col))issue(col,'Colonne inconnue.');if(!['string','number','boolean'].includes(typeof v))issue(col,'Une valeur simple est attendue.');r[col]=str(String(v));}
    if(Object.entries(r).every(([k,v])=>k==='_row'||v===''))continue;
    count++;rows[sheet].push(r);
   }catch(e){errors.push({sheet,row,column:e.column??'',message:e.masterMessage??e.code??'Ligne invalide.'});}
  }
 }
 if(count>masterLimits.rows)errors.push({sheet:'Meta',row:1,column:'',message:`Maximum ${masterLimits.rows} lignes par import.`});
 return {rows,errors};
}
function parameters(parent,rows,session){
 const next=structuredClone(parent),seen=new Set();
 for(const r of rows){if(!masterParameters.includes(r.cle)||seen.has(r.cle))issue('cle',`Paramètre inconnu ou répété : ${r.cle}.`);seen.add(r.cle);}
 const p=Object.fromEntries(rows.filter(r=>!empty(r.valeur)).map(r=>[r.cle,r.valeur]));
 const texts={titre:['title',150],resume:['summary',4000],date:['date',40],horaires:['time',80],lieu:['place',500],infos_pratiques:['practical',4000],confidentialite:['privacy',4000]};
 for(const [key,[field,max]] of Object.entries(texts))if(p[key]!==undefined){if(!session&&!['titre','resume'].includes(key))issue(key,'Paramètre réservé au master SESSION.');next[field]=p[key]==='!EFFACER'?'':str(p[key],max);if(['title','privacy'].includes(field)&&!next[field])issue(key,'Ce texte est obligatoire.');}
 if(p.capacite!==undefined){if(!session)issue('capacite','Paramètre réservé au master SESSION.');next.capacity=num(p.capacite,'capacite',true);if(next.capacity<parent.accepted)issue('capacite','La capacité doit couvrir les inscriptions acceptées.');}
 if(p.groupes_actifs!==undefined){if(!session)issue('groupes_actifs','Paramètre réservé au master SESSION.');next.modules={...next.modules,groups:bool(p.groupes_actifs,'groupes_actifs')};}
 if(Object.keys(p).some(k=>k.startsWith('pa_'))){
  const r=structuredClone(next.actionPointRules??{enabled:false,maxByLevel:{},renewalMinutes:300,cost:1,cooldownSeconds:600,patientCooldownSeconds:600});
  if(p.pa_actifs!==undefined)r.enabled=bool(p.pa_actifs,'pa_actifs');
  for(const level of [1,2])if(p[`pa_niveau_${level}`]!==undefined)r.maxByLevel[level]=num(p[`pa_niveau_${level}`],`pa_niveau_${level}`,true);
  for(const [key,field] of Object.entries({pa_renouvellement_minutes:'renewalMinutes',pa_cout:'cost',pa_recuperation_secondes:'cooldownSeconds',pa_recuperation_patient_secondes:'patientCooldownSeconds'}))if(p[key]!==undefined)r[field]=num(p[key],key,key==='pa_renouvellement_minutes');
  next.actionPointRules=actionPointRulesInput(r);
 }
 if(p.astroport_id!==undefined)next.transportRules=transportRulesInput({homePort:p.astroport_id});
 const moneyKeys=['economie_active','monnaie_nom','monnaie_unite'],healthKeys=['sante_active','pv_max_defaut'];
 if(session&&[...moneyKeys,...healthKeys].some(k=>p[k]!==undefined))issue('cle','La santé et la monnaie de session se modifient avec leurs outils MJ dédiés.');
 if(moneyKeys.some(k=>p[k]!==undefined))next.economyRules=economyRulesInput({...next.economyRules,...(p.economie_active!==undefined?{enabled:bool(p.economie_active,'economie_active')}:{}),...(p.monnaie_nom!==undefined?{name:p.monnaie_nom}:{}),...(p.monnaie_unite!==undefined?{unit:p.monnaie_unite}:{})});
 if(healthKeys.some(k=>p[k]!==undefined))next.healthRules=healthRulesInput({returnMode:'HP_POSITIVE',...next.healthRules,...(p.sante_active!==undefined?{enabled:bool(p.sante_active,'sante_active')}:{}),...(p.pv_max_defaut!==undefined?{defaultMaxHp:num(p.pv_max_defaut,'pv_max_defaut',true)}:{})});
 return next;
}

export function createMasterService({store,admin,checkScenario,checkSession,now,uuid}){
 const context=async(tx,actor,input)=>{
  admin(actor);requireThat(!!input.sessionId!==!!input.scenarioId,'INVALID_MASTER');const session=!!input.sessionId,id=documentId(session?input.sessionId:input.scenarioId);
  const parent=session?await checkSession(tx,actor,id):await checkScenario(tx,actor,id);requireThat(parent.ownerUid===actor.uid,'FORBIDDEN');
  return {session,id,parent,base:`${session?'sessions':'scenarios'}/${id}`};
 };
 async function plan(tx,actor,input,ctx,at,eventId){
  const {session,id,parent,base}=ctx;requireThat(masterEditable(ctx,at),'MASTER_PREPARATION_REQUIRED');
  const {rows,errors}=cleanRows(input.sheets),changes=[],stamps=[],writes=new Map(),put=(path,value)=>writes.set(path,value),sink={set:put};
  const records=Object.fromEntries(await Promise.all(kinds.map(async k=>[k,(await tx.list(`${base}/${k}`)).sort((a,b)=>a.id.localeCompare(b.id))]))),m=mapsFor(records);
  const fieldStates=session?(await tx.list(`${base}/fieldStates`)).sort((a,b)=>a.id.localeCompare(b.id)):[];
  const storedInventory=session?(await tx.list(`${base}/inventory`)).filter(l=>['WAREHOUSE','HOLD'].includes(l.location?.kind)&&l.quantity>0&&!['CONSUMED','DESTROYED'].includes(l.status)).sort((a,b)=>a.id.localeCompare(b.id)):[];
  const rentAccounts=[],tariffAccounts=[];
  const prior=new Map([...(parent.masterRowBaseline??[]),...await tx.list(`${base}/masterRows`)].map(x=>[x.id,x])),receipts=[...prior.values()];
  let nextParent=parent,baseRevisionMismatch=false;errors.push(...masterModuleErrors(rows,input.module));const created=new Set(),newKnowledge=new Set(),changedRecords=new Set(),seen=new Set(),targetSeen=new Set(),archives=[];
  const addError=(sheet,r,e)=>errors.push({sheet,row:r?._row??1,column:e.column??'',message:e.masterMessage??e.code??'Valeur ou référence invalide.'});
  try{
   const meta=rows.Meta?.[0];if(rows.Meta?.length!==1||meta.format!=='gn-engine-master'||meta.version!=='1'||meta.type!==(session?'SESSION':'CAMPAGNE'))issue('type','Meta doit annoncer le format gn-engine-master, version 1 et le type de la destination.');
   if(meta.destination_id&&meta.destination_id!==id)issue('destination_id','La destination ne correspond pas à cet écran.');
   if(session&&(meta.campaign_id||parent.campaignId)&&(meta.campaign_id??'')!==(parent.campaignId??''))issue('campaign_id','Renseigner l’identifiant de la campagne de cet épisode.');
   baseRevisionMismatch=!!meta.base_revision&&num(meta.base_revision,'base_revision',true)!==parent.revision;
  }catch(e){addError('Meta',rows.Meta?.[0],e);}
  try{nextParent=parameters(parent,rows.Parametres??[],session);}catch(e){addError('Parametres',(rows.Parametres??[]).find(r=>r.cle===e.column),e);}
  const stamp=(sheet,r)=>{
   // The new optional blank column must not change fingerprints of pre-0.29 rows.
   const rid=documentId(r.id),key=digest([sheet,rid]),version=num(r.version,'version',true),body=Object.fromEntries(Object.entries(r).filter(([k,v])=>k!=='_row'&&!(sheet==='Objets'&&k==='billes_par_recharge'&&empty(v)))),hash=digest(body);
   if(seen.has(key))issue('id','Identifiant répété dans cet onglet.');seen.add(key);
   if(!['CREER','MODIFIER','ARCHIVER'].includes(r.operation))issue('operation','Utiliser CREER, MODIFIER ou ARCHIVER.');
   const identity=digest(['ActionsTerrain','Recompenses'].includes(sheet)?[r.lieu_id??null,...(sheet==='ActionsTerrain'?[r.type??null]:[])]:[r.personnage_id??null,r.groupe_id??null]);
   const old=prior.get(key);if(old){if(version<old.version)issue('version','Version plus ancienne que celle déjà importée.');if(version===old.version){if(old.digest!==hash)issue('version','Même version avec un contenu différent. Augmenter la version.');changes.push({sheet,row:r._row,id:rid,status:'UNCHANGED',fields:[]});return false;}if(sheet==='Dotations')issue('id','Cet identifiant de dotation a déjà été utilisé. Une dotation est immuable.');if(old.identity&&old.identity!==identity)issue('id','Un identifiant existant ne peut pas changer de personnage, de groupe, de lieu ou de type de profil.');}
   stamps.push({id:key,sheet,rowId:rid,version,digest:hash,identity,at,importId:eventId});return true;
  };
  const mark=(kind,id)=>changedRecords.add(`${kind}/${id}`);
  const checkOperation=(r,old)=>{if(r.operation==='CREER'&&old)issue('id','Cet identifiant existe déjà. Utiliser MODIFIER avec une nouvelle version.');if(r.operation!=='CREER'&&!old)issue('id','Cet identifiant n’existe pas. Utiliser CREER.');};
  const tariffBeneficiary=t=>{if(!t?.recipientAccountId)return 'Retrait de la circulation';const c=[...m.characters.values()].find(c=>accountId(c.id)===t.recipientAccountId),g=[...m.groups.values()].find(g=>groupAccountId(g.id)===t.recipientAccountId);return c?`Personnage : ${c.public.displayName} (${c.id})`:g?`Caisse : ${g.walletConfig?.label??g.name} (${g.id})`:'Bénéficiaire indisponible';};
  const summary=(sheet,r,before,after)=>changes.push({sheet,row:r._row,id:r.id,status:r.operation==='CREER'?'CREATE':r.operation==='ARCHIVER'?'ARCHIVE':'UPDATE',fields:changed(before,after),...(sheet==='Tarifs'?{beneficiary:{before:before?tariffBeneficiary(before):null,after:tariffBeneficiary(after)}}:{})});
  const order=['Objets','Competences','Classes','Personnages','Groupes','Connaissances'];
  for(const sheet of order)for(const r of rows[sheet]??[]){try{
   if(!stamp(sheet,r))continue;const kind=masterCollections[sheet],old=m[kind].get(r.id);checkOperation(r,old);let d;
   if(r.operation==='ARCHIVER'){
    if(Object.entries(r).some(([k,v])=>!['_row','id','operation','version'].includes(k)&&v))issue('operation','Une ligne ARCHIVER ne contient que id, operation et version.');
    if(old.assignedUid)issue('id','Un personnage attribué ne peut pas être archivé.');
    d={...old,publicationState:'DRAFT',masterArchived:true,...(kind==='characters'?{public:{...old.public,publicationState:'DRAFT'},contentRevision:(old.contentRevision??1)+1}:{revision:old.revision+1})};archives.push({sheet,r,kind,id:r.id});
   }else if(sheet==='Personnages'){
    if(session&&old&&['niveau_global','pv_max_initiaux'].some(k=>!empty(r[k])))issue('niveau_global','Les niveaux et PV des personnages existants sont protégés. Utiliser une correction MJ.');
    d=patch(r,{id:r.id,public:{displayName:'',profession:'',description:'',publicationState:'DRAFT'},publicationState:'DRAFT',biography:'',roleplay:'',playerSecrets:'',gmNotes:'',objectives:[],relations:[],hp:null,maxHp:null,...old},{publication:'publicationState',histoire:'biography',interpretation:'roleplay',secrets_joueur:'playerSecrets',notes_mj:'gmNotes'});
    d.public=patch(r,d.public,{nom:'displayName',metier:'profession',description_publique:'description',publication_publique:'publicationState'});
    if(!d.public.displayName||d.public.displayName.length>150)issue('nom','Le nom est obligatoire (150 caractères maximum).');
    if(!empty(r.niveau_global))d.globalLevel=num(r.niveau_global,'niveau_global',true);
    if(!empty(r.pv_max_initiaux))d.initialMaxHp=num(r.pv_max_initiaux,'pv_max_initiaux',true);
    d.contentRevision=(old?.contentRevision??0)+1;d.historyStarted=true;imagePatch(r,d,{portrait_media_id:'portrait',image_privee_media_id:'private'});
    if(!old){created.add(r.id);if(session)Object.assign(d,initialHealth(nextParent.healthRules,d),{sessionId:id,publicCode:r.id,assignedUid:null,...(parent.campaignId?{campaignId:parent.campaignId,campaignCharacterId:r.id}:{})});}
   }else if(sheet==='Objets'){
    d=patch(r,{kind:'STACKABLE',consumable:false,publicationState:'DRAFT',...old},{nom:'name',description:'description',categorie:'category',unite:'unit',type:'kind',legalite:'legality',publication:'publicationState',notes_mj:'gmNotes'});
    if(!empty(r.consommable))d.consumable=bool(r.consommable,'consommable');if(!empty(r.pillable))d.pillable=bool(r.pillable,'pillable');if(!empty(r.volume_unitaire))d.unitVolume=r.volume_unitaire==='!EFFACER'?null:num(r.volume_unitaire,'volume_unitaire');
    if(!empty(r.billes_par_recharge))d.laserRecharge=r.billes_par_recharge==='!EFFACER'?null:{pelletsPerUnit:num(r.billes_par_recharge,'billes_par_recharge',true)};
    const removeRecharge=d.laserRecharge===null;
    d={...old,...itemInput(d,r.id,old)};imagePatch(r,d,{image_media_id:'illustration'});
    if(removeRecharge)delete d.laserRecharge;
   }else if(sheet==='Competences'){
    d=patch(r,{kind:'PASSIVE',publicationState:'DRAFT',...old},{nom:'name',description:'description',instructions:'instructions',categorie:'category',type:'kind',publication:'publicationState',notes_mj:'gmNotes'});
    if(d.kind!=='PASSIVE'){
     d.healing={effect:'HEAL_HP',cooldownSeconds:600,...old?.healing};for(const [key,field] of Object.entries({soin_pv:'amount',usages:'uses',recuperation_secondes:'cooldownSeconds'}))if(!empty(r[key]))d.healing[field]=r[key]==='!EFFACER'&&key==='usages'?null:num(r[key],key,key!=='recuperation_secondes');
     if(!empty(r.portee_recuperation))d.healing.cooldownScope=r.portee_recuperation;
     if(!empty(r.consommable_id)){if(r.consommable_id==='!EFFACER')d.healing.consumable=null;else{const item=ref(m.items,r.consommable_id,'consommable_id');if(!item.consumable||item.publicationState!=='PUBLISHED')issue('consommable_id','Un consommable publié est requis.');d.healing.consumable={itemId:item.id,quantity:itemQuantity(item,num(r.consommable_quantite,'consommable_quantite',true)),name:item.name,unit:item.unit,itemRevision:item.revision};}}
     if(empty(r.consommable_id)&&!empty(r.consommable_quantite)){if(!d.healing.consumable)issue('consommable_id','Renseigner le consommable avant sa quantité.');const item=ref(m.items,d.healing.consumable.itemId,'consommable_id');d.healing.consumable={...d.healing.consumable,quantity:itemQuantity(item,num(r.consommable_quantite,'consommable_quantite',true))};}
    }else if(['soin_pv','usages','recuperation_secondes','portee_recuperation','consommable_id','consommable_quantite'].some(k=>!empty(r[k])))issue('type','Une compétence PASSIVE ne reçoit pas de paramètres de soin.');
    const cost=d.healing?.consumable;d={...old,...skillInput(d,r.id,old)};if(cost&&d.healing)d.healing.consumable=cost;
   }else if(sheet==='Classes'){
    d=patch(r,{publicationState:'DRAFT',skills:[],...old},{nom:'name',description:'description',publication:'publicationState',notes_mj:'gmNotes'});if(!empty(r.competences))d.skills=levels(r.competences==='!EFFACER'?'':r.competences);d={...old,...classInput(d,r.id,old)};for(const sk of d.skills)ref(m.skills,sk.skillId,'competences');
   }else if(sheet==='Groupes'){
    d=patch(r,{publicationState:'DRAFT',visibility:'SECRET',members:[],...old},{nom:'name',description:'description',briefing:'briefing',visibilite:'visibility',publication:'publicationState',notes_mj:'gmNotes'});d={...old,...groupInput(d,r.id,old)};
   }else{
    d=patch(r,{publicationState:'DRAFT',kind:'KNOWLEDGE',shareMode:'SHOW',qrAudience:'ALL_PLAYERS',...old},{titre:'title',texte:'body',origine:'origin',type:'kind',publication:'publicationState',partage:'shareMode',verite_mj:'gmTruth',notes_mj:'gmNotes',qr_audience:'qrAudience'});
    for(const [key,field] of [['personnages_initiaux','initialCharacterIds'],['qr_personnages','qrCharacterIds']])if(!empty(r[key])){if(session&&old&&key==='personnages_initiaux')issue(key,'Les accès déjà distribués se gèrent dans l’outil de connaissances.');d[field]=ids(r[key]==='!EFFACER'?'':r[key]);}
    if(!empty(r.qr_actif))d.qrEnabled=bool(r.qr_actif,'qr_actif');if(!empty(r.qr_competence_id))d.qrSkillId=r.qr_competence_id==='!EFFACER'?null:r.qr_competence_id;if(!empty(r.qr_niveau))d.qrSkillLevel=num(r.qr_niveau,'qr_niveau',true);
    d={...old,...knowledgeInput(d,r.id,old)};for(const cid of d.initialCharacterIds)ref(m.characters,cid,'personnages_initiaux');for(const cid of d.qrCharacterIds)ref(m.characters,cid,'qr_personnages');if(d.qrSkillId)ref(m.skills,d.qrSkillId,'qr_competence_id');if(!old)newKnowledge.add(r.id);
   }
   if(r.operation!=='ARCHIVER')d.masterArchived=false;m[kind].set(r.id,d);mark(kind,r.id);summary(sheet,r,old,d);
  }catch(e){addError(sheet,r,e);}}
  // Dependent rows are evaluated only after every primary record exists in the projected state.
  for(const sheet of ['Attributions','Membres','Objectifs','Relations','Dotations'])for(const r of rows[sheet]??[]){try{
   if(!stamp(sheet,r))continue;const cid=documentId(r.personnage_id),c=ref(m.characters,cid,'personnage_id');
   const collision=digest([sheet,cid,sheet==='Attributions'?'profile':sheet==='Membres'?r.groupe_id:r.id]);if(targetSeen.has(collision))issue('id','Deux lignes ciblent le même élément.');targetSeen.add(collision);
   if(sheet==='Dotations'){
    if(r.operation!=='CREER'||!created.has(cid))issue('personnage_id','Une dotation est immuable et réservée à un personnage créé dans le même import.');
    const amount=num(r.quantite,'quantite',true);
    if(r.type==='CREDIT'){if(!nextParent.economyRules)issue('type','Configurer la monnaie avant une dotation de crédits.');if(r.objet_id)issue('objet_id','Laisser vide pour CREDIT.');c.startingCredits={revision:1,amount:whole((c.startingCredits?.amount??0)+amount)};}
    else if(r.type==='OBJET'){const item=ref(m.items,r.objet_id,'objet_id');if(item.publicationState!=='PUBLISHED')issue('objet_id','Publier le modèle avant la dotation.');c.startingInventory??={revision:1,items:[]};const entry=c.startingInventory.items.find(x=>x.item.id===item.id);if(entry)entry.quantity=itemQuantity(item,entry.quantity+amount);else c.startingInventory.items.push({item:publicItem(item),quantity:itemQuantity(item,amount)});}
    else issue('type','Utiliser CREDIT ou OBJET.');mark('characters',cid);summary(sheet,r,null,{type:r.type,characterId:cid,itemId:r.objet_id??null,quantity:amount});continue;
   }
   if(sheet==='Attributions'){
    if(session&&!created.has(cid))issue('personnage_id','Les compétences déjà acquises sont protégées. Utiliser l’outil d’attribution MJ.');
    const old=c.abilityProfile;checkOperation(r,old);const classId=empty(r.classe_id)?old?.choices?.classId:r.classe_id==='!EFFACER'?null:r.classe_id,model=classId?ref(m.classes,classId,'classe_id'):null;
    const overrides=empty(r.competences)?old?.choices?.overrides??[]:levels(r.competences==='!EFFACER'?'':r.competences),picked=new Map((model?.skills??[]).map(s=>[s.skillId,s.level]));for(const s of overrides)if(s.level>0)picked.set(s.skillId,s.level);else picked.delete(s.skillId);
    if(model&&model.publicationState!=='PUBLISHED')issue('classe_id','La classe doit être publiée.');
    const skills=[...picked].sort(([a],[b])=>a.localeCompare(b)).map(([id,level])=>{const s=ref(m.skills,id,'competences');if(s.publicationState!=='PUBLISHED')issue('competences','Toutes les compétences attribuées doivent être publiées.');return {id,name:s.name,description:s.description,instructions:s.instructions,category:s.category,kind:s.kind,healing:s.healing??null,revision:s.revision,level};});
    c.abilityProfile={revision:(old?.revision??0)+1,published:r.operation==='ARCHIVER'?false:empty(r.publication)?old?.published??true:bool(r.publication,'publication'),class:model?{id:model.id,name:model.name,description:model.description,revision:model.revision}:null,skills,choices:{classId:model?.id??null,overrides}};mark('characters',cid);summary(sheet,r,old,c.abilityProfile);
   }else if(sheet==='Membres'){
    const g=ref(m.groups,r.groupe_id,'groupe_id'),old=g.members.find(x=>x.characterId===cid);checkOperation(r,old);let member={characterId:cid,role:'',active:false,revealed:false,visibleToMembers:false,publicAffiliation:false,permissions:{},...old};
    member=patch(r,member,{role:'role'});for(const [key,field] of Object.entries({actif:'active',revele:'revealed',visible_membres:'visibleToMembers',affiliation_publique:'publicAffiliation'}))if(!empty(r[key]))member[field]=bool(r[key],key);
    if(!empty(r.droits)){const list=r.droits==='!EFFACER'?[]:r.droits.split(';').map(s=>s.trim());if(list.some(x=>!groupPermissions.includes(x)))issue('droits','Droit de groupe inconnu.');member.permissions=Object.fromEntries(groupPermissions.map(k=>[k,list.includes(k)]));}
    if(r.operation==='ARCHIVER')member.active=false;const next={...g,...groupInput({...g,members:[...g.members.filter(x=>x.characterId!==cid),member]},g.id,g)};m.groups.set(g.id,next);mark('groups',g.id);summary(sheet,r,old,member);
   }else{
    const field=sheet==='Objectifs'?'objectives':'relations',old=c[field].find(x=>x.id===r.id);checkOperation(r,old);
    let next=patch(r,{id:r.id,title:'',description:'',published:false,gmNotes:'',...(sheet==='Objectifs'?{steps:[]}:{targetId:null}),...old},{titre:'title',description:'description',notes_mj:'gmNotes'});
    if(!empty(r.publication))next.published=bool(r.publication,'publication');if(!empty(r.cible_id))next.targetId=r.cible_id==='!EFFACER'?null:r.cible_id;if(r.operation==='ARCHIVER')next.published=false;
    if(next.targetId){ref(m.characters,next.targetId,'cible_id');if(next.targetId===cid)issue('cible_id','La relation doit viser un autre personnage.');}
    c[field]=[...c[field].filter(x=>x.id!==r.id),next];mark('characters',cid);summary(sheet,r,old,next);
   }
  }catch(e){addError(sheet,r,e);}}
  importTerrain({rows,m,records,session,fieldStates,parent:nextParent,stamp,checkOperation,summary,mark,addError,issue,num,empty,patch,base,put});
  for(const r of rows.Entrepots??[]){try{
   if(!stamp('Entrepots',r))continue;const old=m.warehouses.get(r.id);checkOperation(r,old);
   let d=patch(r,{enabled:false,rentAccountId:null,...old},{nom:'name',description:'description'});
   if(r.operation==='ARCHIVER'){
    if(Object.entries(r).some(([k,v])=>!['_row','id','operation','version'].includes(k)&&v))issue('operation','ARCHIVER ne contient que id, operation et version.');
    d.enabled=false;
   }else{
    for(const [key,field] of Object.entries({capacite_volume:'capacity',loyer:'rent',periode_minutes:'periodMinutes'}))if(!empty(r[key]))d[field]=num(r[key],key,key!=='loyer');
    if(!empty(r.ouvert))d.enabled=bool(r.ouvert,'ouvert');
    if(!empty(r.loyer_groupe_id)){if(r.loyer_groupe_id==='!EFFACER')d.rentAccountId=null;else{const g=ref(m.groups,r.loyer_groupe_id,'loyer_groupe_id');if(!g.walletConfig)issue('loyer_groupe_id','Configurer la caisse du groupe avant de lui verser un loyer.');d.rentAccountId=groupAccountId(g.id);}}
   }
   d={...old,...warehouseInput(d,r.id,old),masterArchived:r.operation==='ARCHIVER'};
   if(session){
    Object.assign(d,{tenantType:old?.tenantType??'CHARACTER',tenantId:old?.tenantId??null,expiresAtGameMs:old?.expiresAtGameMs??null});
    if(stockVolume(storedInventory.filter(l=>storedIn(l,r.id)))>d.capacity)issue('capacite_volume','La capacité doit couvrir le volume déjà stocké.');
    if(d.rentAccountId){const a=await tx.get(`${base}/accounts/${d.rentAccountId}`);rentAccounts.push(a);if(a?.sessionId!==id||a?.ownerType!=='GROUP')issue('loyer_groupe_id','Caisse de session indisponible.');moneyState(a);}
   }
   m.warehouses.set(r.id,d);mark('warehouses',r.id);summary('Entrepots',r,old,d);
  }catch(e){addError('Entrepots',r,e);}}
  importNavigation({rows,m,session,storedInventory,stamp,checkOperation,summary,mark,addError,issue,num,empty,patch});
  importEconomics({rows,m,stamp,checkOperation,summary,mark,addError,issue,num,empty,patch});
  importCustoms({rows,m,stamp,checkOperation,summary,mark,addError,issue,num,empty,patch});
  // Validate the combined graph; a broken reference cannot leave half an import behind.
  try{
   cleanScenarioSnapshot({scenario:nextParent,records:rowsRecord(m)});
   if(session)for(const t of m.cargoTariffs.values())if(t.enabled&&t.recipientAccountId){
    const a=await tx.get(`${base}/accounts/${t.recipientAccountId}`);tariffAccounts.push(a);
    if(!a&&[...created].some(cid=>accountId(cid)===t.recipientAccountId)&&nextParent.economyRules)continue;
    if(a?.sessionId!==id)issue('beneficiaire_id','Compte bénéficiaire indisponible dans cette session.');moneyState(a);
    const c=[...m.characters.values()].find(c=>accountId(c.id)===a.id);
    if(c&&(a.ownerType!=='CHARACTER'||a.characterId!==c.id))issue('beneficiaire_id','Le compte bénéficiaire ne correspond plus à son personnage.');
    const g=[...m.groups.values()].find(g=>groupAccountId(g.id)===a.id);
    if(g&&(a.ownerType!=='GROUP'||a.groupId!==g.id||a.label!==g.walletConfig?.label))issue('beneficiaire_id','La caisse bénéficiaire ne correspond plus à son groupe.');
   }
   for(const s of m.skills.values())if(s.healing?.consumable){const item=ref(m.items,s.healing.consumable.itemId,'consommable_id');if(s.publicationState==='PUBLISHED'&&(item.publicationState!=='PUBLISHED'||!item.consumable))issue('consommable_id','Un soin publié doit référencer un consommable publié.');}
   for(const cl of m.classes.values())for(const x of cl.skills)if(cl.publicationState==='PUBLISHED'&&ref(m.skills,x.skillId,'competences').publicationState!=='PUBLISHED')issue('competences','Une classe publiée dépend d’une compétence non publiée.');
   for(const k of m.knowledge.values())if(k.qrSkillId&&k.qrEnabled){const s=ref(m.skills,k.qrSkillId,'qr_competence_id');if(s.kind!=='PASSIVE'||s.publicationState!=='PUBLISHED')issue('qr_competence_id','La condition QR exige une compétence passive publiée.');}
  }catch(e){addError('References',null,e);}
  for(const a of archives){try{
   const {kind,id:rid}=a;let used=false;
   if(kind==='characters')used=[...m.groups.values()].some(g=>g.members.some(x=>x.characterId===rid&&x.active))||[...m.characters.values()].some(c=>c.relations.some(x=>x.targetId===rid&&x.published))||[...m.knowledge.values()].some(k=>[...k.initialCharacterIds,...k.qrCharacterIds].includes(rid));
   if(kind==='items')used=[...m.skills.values()].some(s=>s.healing?.consumable?.itemId===rid)||[...m.characters.values()].some(c=>(c.startingInventory?.items??[]).some(x=>x.item.id===rid));
   if(kind==='skills')used=[...m.classes.values()].some(c=>c.skills.some(x=>x.skillId===rid))||[...m.characters.values()].some(c=>c.abilityProfile?.skills.some(s=>s.id===rid))||[...m.knowledge.values()].some(k=>k.qrSkillId===rid);
   if(kind==='classes')used=[...m.characters.values()].some(c=>c.abilityProfile?.class?.id===rid);
   if(kind==='groups')used=m.groups.get(rid).members.some(x=>x.active);
   if(kind==='items')used=used||[...m.ships.values()].some(s=>s.navigation?.fuelItemId===rid);
   if(['characters','groups'].includes(kind))used=used||[...m.ships.values()].some(s=>s.ownerId===rid&&s.ownerType===(kind==='groups'?'GROUP':'CHARACTER'));
   if(session&&kind==='knowledge')for(const c of records.characters){const receipt=await tx.get(`${base}/characters/${c.id}/knowledge/${rid}`);if(receipt?.active)used=true;}
   if(used)issue('id','Ce contenu est encore référencé. Retirer ses dépendances avec les outils adaptés avant de l’archiver.');
  }catch(e){addError(a.sheet,a.r,e);}}
  // Ownership and readiness are checked before the preview, and again on confirmation.
  const mediaState=[];for(const mid of imageReferences(rowsRecord(m)).keys()){
   const asset=await tx.get(`media/${mid}`);mediaState.push([mid,asset?.status,asset?.ownerUid,asset?.refsRevision]);if(asset?.ownerUid!==actor.uid||asset?.status!=='READY')errors.push({sheet:'Medias',row:1,column:'media_id',message:`Média indisponible ou non autorisé : ${mid}.`});
  }
  const apChanged=digest(parent.actionPointRules??null)!==digest(nextParent.actionPointRules??null),resources=[];
  if(session&&apChanged){for(const c of records.characters)resources.push(await tx.get(actionPointPath(id,c.id)));if(resources.some(Boolean))errors.push({sheet:'Parametres',row:1,column:'pa_actifs',message:'Des réserves de PA existent déjà. Utiliser le réglage PA dédié pour les conserver.'});else Object.assign(nextParent,{actionPointRulesRevision:(parent.actionPointRulesRevision??0)+1,actionPointSchedule:{nextAtGameMs:nextParent.actionPointRules.renewalMinutes*60000}});}
  if(baseRevisionMismatch&&(changes.some(c=>c.status!=='UNCHANGED')||changed(parent,nextParent).length))errors.push({sheet:'Meta',row:2,column:'base_revision',message:'La révision de destination a changé. Exporter ou préparer à nouveau le master.'});
  if(errors.length)return {errors,changes,canApply:false};
  const reason=str(input.reason??'',500);if(!reason)issue('reason','Un motif privé est requis.');
  for(const key of changedRecords){const [kind,cid]=key.split('/'),next=m[kind].get(cid),old=records[kind].find(r=>r.id===cid);
   if(kind==='characters'){next.contentRevision=(old?.contentRevision??0)+1;recordPublication(sink,`${base}/characters`,old,next,{id:eventId,at,actorUid:actor.uid,reason,stage:parent.stage??null});}
   put(`${base}/${key}`,next);put(`${base}/${key}/masterHistory/${eventId}`,{id:eventId,at,actorUid:actor.uid,reason,before:old??null,after:next});
  }
  if(session){
   const newChars=[...created].map(cid=>m.characters.get(cid));seedWallets(sink,nextParent,newChars,at,actor.uid);seedInventory(sink,id,newChars,at,actor.uid);
   for(const k of m.knowledge.values())if(k.publicationState==='PUBLISHED')for(const cid of k.initialCharacterIds)if(newKnowledge.has(k.id)||created.has(cid)){
    const existing=await tx.get(`${base}/characters/${cid}/knowledge/${k.id}`);if(!existing)put(`${base}/characters/${cid}/knowledge/${k.id}`,initialReceipt(k,at));
   }
  }
  for(const r of stamps)put(`${base}/masterRows/${r.id}`,r);
  const parentChanges=changed(parent,nextParent);if(parentChanges.length)changes.unshift({sheet:'Parametres',row:2,id:parent.id,status:'UPDATE',fields:parentChanges});
  const applied=changes.filter(c=>c.status!=='UNCHANGED');
  const receipt={id:eventId,at,actorUid:actor.uid,reason,filename:str(input.filename??'',200),type:session?'SESSION':'CAMPAGNE',module:input.module||rows.Meta?.[0]?.module||null,digest:digest(rows),counts:Object.fromEntries(['CREATE','UPDATE','ARCHIVE','UNCHANGED'].map(k=>[k,changes.filter(c=>c.status===k).length])),rows:changes.map(({fields,...r})=>r)};
  if(applied.length){put(base,{...nextParent,revision:parent.revision+1});put(`${base}/masterImports/${eventId}`,receipt);put(`${base}/audit/${eventId}`,{id:eventId,at,actorUid:actor.uid,action:'applyMasterImport',reason,importId:eventId,counts:receipt.counts});}
  let indexWrites=0;const changedMedia=new Set();
  for(const [path,data] of writes){const after=imageReferences(data);if(!JSON.stringify(data).includes('\"mediaImages\"'))continue;const before=imageReferences(await tx.get(path));for(const mid of new Set([...before.keys(),...after.keys()]))if(before.has(mid)!==after.has(mid)){indexWrites++;changedMedia.add(mid);}}
  if(writes.size>masterLimits.writes||writes.size+indexWrites+changedMedia.size+1>480||[...writes.values()].some(v=>Buffer.byteLength(JSON.stringify(v))>800000)||Buffer.byteLength(JSON.stringify([...writes.values()]))>3*1024*1024)errors.push({sheet:'Meta',row:1,column:'',message:'Trop de changements ou de publications dans une transaction. Fractionner le classeur.'});
  const confirmation=digest({actor:actor.uid,base,parent,records,fieldStates,storedInventory,rentAccounts,tariffAccounts,prior:receipts.sort((a,b)=>a.id.localeCompare(b.id)),rows,module:input.module||rows.Meta?.[0]?.module||null,reason,mediaState,resources});
  return {errors,changes,canApply:!errors.length,confirmation,receipt,writes,applied:applied.length,newCharacters:[...created],destination:{id,title:parent.title,type:session?'SESSION':'CAMPAGNE',campaignId:parent.campaignId??null}};
 }
 return async(action,actor,input)=>{
  admin(actor);const at=now(),eventId=uuid();return store.runTransaction(async tx=>{
   const ctx=await context(tx,actor,input);
   if(action==='masterWorkspace')return masterWorkspace(tx,ctx,at,eventId,input.module,input.sheet,input.bundle);
   if(action==='masterImportHistory')return {imports:await tx.list(`${ctx.base}/masterImports`,null,{orderBy:'at',direction:'desc',limit:30})};
   let op,fingerprint;if(action==='applyMasterImport'){op=`operations/${digest([actor.uid,documentId(input.requestId)])}`;fingerprint=digest([action,input]);const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');return old.result;}}
   let p;try{p=await plan(tx,actor,input,ctx,at,eventId);}catch(e){if(!e.masterMessage)throw e;p={errors:[{sheet:'Meta',row:1,column:e.column??'',message:e.masterMessage}],changes:[],canApply:false};}
   if(action==='prepareMasterImport'){const {writes,receipt,...view}=p;return {...view,...(receipt?{counts:receipt.counts}:{} )};}
   requireThat(p.canApply,'INVALID_MASTER');requireThat(input.confirmation===p.confirmation,'STALE_REVISION');
   for(const [path,data] of p.writes)tx.set(path,data);
   const result={id:ctx.id,importId:p.applied?eventId:null,counts:p.receipt.counts,newCharacters:p.newCharacters,unchanged:p.applied===0};tx.set(op,{at,fingerprint,result});return result;
  });
 };
}
