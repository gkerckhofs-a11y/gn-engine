import {fieldImportColumn} from './central-field-import.mjs';
import {centralFieldTargetInput,centralFieldTargetEditable,centralFieldTargetProjection,centralFieldTargetReferences} from './central-field-targets.mjs';
import {centralGroupInput,centralGroupEditable,centralGroupProjection} from './central-groups.mjs';
import {spaceImportColumn} from './central-space-import.mjs';
import {shopImportColumn} from './central-shop-import.mjs';
import {storyImportColumn} from './central-story-import.mjs';
import {centralSpaceInput,centralSpaceEditable,centralSpaceProjection,centralSpaceReferences,centralSpaceTypes} from './central-space.mjs';
import {centralMissionInput,centralMissionProjection,centralMissionReferences} from './central-missions.mjs';
import {centralKnowledgeInput,centralKnowledgeProjection} from './central-knowledge.mjs';
import {centralClassKitInput,centralClassKitProjection} from './central-class-kits.mjs';
import {centralInitialCoherence} from './central-initial-coherence.mjs';
import {centralShopInput,centralOfferInput,centralShopProjection} from './central-shops.mjs';
import {createHash} from 'node:crypto';
import {documentId,DomainError,requireThat} from './validation.mjs';
import {itemInput} from './inventory-state.mjs';
import {recipeInput} from './recipe-state.mjs';
import {centralCharacterInput,centralCharacterEditable,centralCharacterProjection} from './central-characters.mjs';
import {characterImportColumn} from './central-character-import.mjs';
import {centralRecipeProjection} from './central-recipes.mjs';
import {admissionSettings,emptyAdmissionCounts} from './admission-state.mjs';
import {centralWorkshops} from '../shared/central-workshops.mjs';
import {centralImportContracts} from '../shared/central-import-schema.mjs';
import {soReleaseDefinitionChecks,soReleaseManifest} from './space-outlaws-release-check.mjs';

// This report is read-only and cannot authorize publication.
export const centralCheckLimits={records:1809,inputBytes:16*1024*1024,reportBytes:4*1024*1024};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const json=v=>JSON.stringify(canonical(v));
const hash=v=>createHash('sha256').update(json(v)).digest('hex');
const same=(a,b)=>json(a)===json(b);
const owners={shipModel:'M3',port:'M3',route:'M3',classKit:'M1',item:'M1',character:'M2',group:'M2',speciesCatalogue:'M2',recipe:'M4',shop:'M5',offer:'M5',knowledge:'M6',fieldTarget:'M6',mission:'M7'};
const limits={shipModel:100,port:100,route:200,classKit:8,item:250,character:100,group:50,speciesCatalogue:1,recipe:250,shop:50,offer:250,knowledge:250,fieldTarget:100,mission:100};
const revisionKey=type=>type==='character'?'contentRevision':'revision';
const safe=v=>typeof v==='string'?v.slice(0,200):'';
const check=v=>requireThat(v,'INVALID_CENTRAL_RECORD');
const location=(c,field='')=>({workshop:safe(c?.workshop),entityId:safe(c?.entityId),field,source:safe(c?.source),
 fileName:safe(c?.provenance?.fileName),sheet:safe(c?.provenance?.sheet),row:Number.isSafeInteger(c?.provenance?.row)?c.provenance.row:null,column:c?.type==='fieldTarget'&&c?.source==='XLSX'?fieldImportColumn(field):c?.type==='character'&&c?.source==='XLSX'?characterImportColumn(field):['knowledge','mission'].includes(c?.type)&&c?.source==='XLSX'?storyImportColumn(c.type,field):['shop','offer'].includes(c?.type)&&c?.source==='XLSX'?shopImportColumn(c.type,field):centralSpaceTypes.includes(c?.type)&&c?.source==='XLSX'?spaceImportColumn(c.type,field):field,
 batchId:safe(c?.provenance?.batchId),draftRevision:Number.isSafeInteger(c?.revision)?c.revision:null});
export function validateCentralChange(c,revision){
 check(c&&typeof c==='object'&&!Array.isArray(c));
 check(Object.keys(c).every(k=>['id','type','entityId','workshop','operation','data','revision','source','actorUid','at','requestId','provenance'].includes(k)));
 check(Object.hasOwn(owners,c.type)&&c.workshop===owners[c.type]);documentId(c.entityId);
 check(c.id===`${c.type}_${c.entityId}`&&['UPSERT','ARCHIVE'].includes(c.operation));
 check(Number.isSafeInteger(c.revision)&&c.revision>0&&c.revision<=revision);
 check(typeof c.actorUid==='string'&&c.actorUid.length>0&&Number.isSafeInteger(c.at)&&['WEB','XLSX','ADMISSION_SETTINGS','ADMISSION'].includes(c.source));
 if(c.requestId!==undefined)documentId(c.requestId);
 if(c.source==='ADMISSION')check(c.type==='character'&&c.provenance?.schemaVersion===1&&['APPROVED_SNAPSHOT','RECONCILED_SNAPSHOT'].includes(c.provenance.kind)&&Object.keys(c.provenance).length===2&&typeof c.requestId==='string');
 else if(c.provenance!==undefined){const p=c.provenance;check(c.source==='XLSX'&&p&&Object.keys(p).every(k=>['schemaVersion','batchId','fileName','sheet','row'].includes(k))&&Number.isSafeInteger(p.schemaVersion)&&centralImportContracts(c.workshop,p.schemaVersion).length>0&&typeof p.fileName==='string'&&p.fileName.length<=200&&typeof p.sheet==='string'&&p.sheet.length<=100&&Number.isSafeInteger(p.row)&&p.row>=2);documentId(p.batchId);}
 if(c.source==='XLSX')check(!!c.provenance&&centralImportContracts(c.workshop,c.provenance.schemaVersion).some(t=>t.type===c.type&&t.sheet===c.provenance.sheet));
 const d=c.data;let normalized;
 if(c.type==='speciesCatalogue'){
  check(c.entityId==='player'&&c.operation==='UPSERT'&&c.source==='ADMISSION_SETTINGS');
  normalized=admissionSettings({open:false,instructions:'',quotas:emptyAdmissionCounts(),species:d}).species;
 }else{
  check(c.source!=='ADMISSION_SETTINGS'&&d&&typeof d==='object'&&!Array.isArray(d)&&d.id===c.entityId&&d.publicationState==='DRAFT');
  const key=revisionKey(c.type);check(Number.isSafeInteger(d[key])&&d[key]>0);
  if(centralSpaceTypes.includes(c.type))normalized={...centralSpaceInput(c.type,centralSpaceEditable(c.type,d),c.entityId),revision:d.revision,masterArchived:c.operation==='ARCHIVE'};
  if(c.type==='classKit')normalized={...centralClassKitInput({bindings:d.bindings,gmNotes:d.gmNotes},c.entityId),revision:d.revision,masterArchived:c.operation==='ARCHIVE'};
  if(c.type==='item')normalized={...itemInput(d,c.entityId),revision:d.revision};
  if(c.type==='recipe')normalized={...recipeInput(d,c.entityId),revision:d.revision,masterArchived:c.operation==='ARCHIVE'};
  if(c.type==='mission'){
   const {id,schemaVersion,revision,masterArchived,publicationState,...input}=d;
   normalized={...centralMissionInput({...input,steps:input.steps.map(({published,...s})=>s)},c.entityId),revision:d.revision,masterArchived:c.operation==='ARCHIVE'};
  }
  if(c.type==='knowledge'){
   const {id,revision,masterArchived,publicationState,...input}=d;normalized={...centralKnowledgeInput(input,c.entityId),revision:d.revision,masterArchived:c.operation==='ARCHIVE'};
  }
  if(c.type==='shop')normalized={...centralShopInput({name:d.name,description:d.description,sellerCharacterId:d.sellerCharacterId,locationTargetId:d.locationTargetId,gmNotes:d.gmNotes},c.entityId),revision:d.revision,masterArchived:c.operation==='ARCHIVE'};
  if(c.type==='offer')normalized={...centralOfferInput({name:d.name,shopId:d.shopId,itemId:d.itemId,unitPrice:d.unitPrice,buybackPrice:d.buybackPrice,conditions:d.conditions,gmNotes:d.gmNotes},c.entityId),revision:d.revision,masterArchived:c.operation==='ARCHIVE'};
  if(c.type==='fieldTarget')normalized={...centralFieldTargetInput(centralFieldTargetEditable(d),c.entityId),revision:d.revision,masterArchived:c.operation==='ARCHIVE'};
  if(c.type==='group')normalized={...centralGroupInput(centralGroupEditable(d),c.entityId),revision:d.revision,masterArchived:c.operation==='ARCHIVE'};
  if(c.type==='character')normalized={...centralCharacterInput(centralCharacterEditable(d),c.entityId),contentRevision:d.contentRevision,masterArchived:c.operation==='ARCHIVE'};
 }
 check(same(normalized,d));
}
function centralEdges(records,invalid){
 const edges=[],byId=new Map(records.map(c=>[c.id,c]));
 const species=new Set(byId.get('speciesCatalogue_player')?.data.map(s=>s.id));
 const edge=(c,field,type,id)=>{
  if(type==='species'){
   const exists=species.has(id);
   edges.push({from:{workshop:c.workshop,type:c.type,id:c.entityId},field,to:{type,id,workshop:'M2'},status:invalid.has('speciesCatalogue_player')?'INVALID':exists?'RESOLVED':'MISSING'});return;
  }
  if(!id)return;const target=byId.get(`${type}_${id}`),supported=Object.hasOwn(owners,type);
  edges.push({from:{workshop:c.workshop,type:c.type,id:c.entityId},field,to:{type,id,workshop:owners[type]??null},status:!supported?'NOT_CHECKED':invalid.has(`${type}_${id}`)?'INVALID':!target?'MISSING':target.operation==='ARCHIVE'?'ARCHIVED':'RESOLVED'});
 };
 for(const c of records.filter(c=>c.operation==='UPSERT')){
  if(centralSpaceTypes.includes(c.type))for(const ref of centralSpaceReferences(c))edge(c,ref.field,ref.type,ref.id);
  if(c.type==='mission')for(const ref of centralMissionReferences(c.data))edge(c,ref.field,ref.type,ref.id);
  if(c.type==='knowledge'){for(const key of ['initialCharacterIds','qrCharacterIds'])c.data[key].forEach((id,i)=>edge(c,`${key}.${i}`,'character',id));edge(c,'qrSkillId','skill',c.data.qrSkillId);}
  if(c.type==='shop'){edge(c,'sellerCharacterId','character',c.data.sellerCharacterId);edge(c,'locationTargetId','fieldTarget',c.data.locationTargetId);}
  if(c.type==='offer'){edge(c,'shopId','shop',c.data.shopId);edge(c,'itemId','item',c.data.itemId);}
  if(c.type==='classKit')for(const b of c.data.bindings)edge(c,`bindings.${b.slotId}.itemId`,'item',b.itemId);
  if(c.type==='fieldTarget')for(const ref of centralFieldTargetReferences(c.data))edge(c,ref.field,ref.type,ref.id);
  if(c.type==='group')c.data.members.forEach((m,i)=>edge(c,`members.${i}.characterId`,'character',m.characterId));
  if(c.type==='character'){
   for(const r of c.data.relations)edge(c,`relations.${r.id}.targetId`,'character',r.targetId);
   if(c.data.creationPlan){edge(c,'creationPlan.speciesId','species',c.data.creationPlan.speciesId);edge(c,'creationPlan.classId','classKit',c.data.creationPlan.classId);}
  }
  if(c.type==='recipe'){
   edge(c,'productItemId','item',c.data.productItemId);c.data.components.forEach((x,i)=>edge(c,`components.${i}.itemId`,'item',x.itemId));
   for(const [field,type] of [['skillId','skill'],['effectId','effect'],['laboratoryTargetId','fieldTarget'],['unlockKnowledgeId','knowledge']])edge(c,field,type,c.data[field]);
  }
 }
 return edges;
}
function compareEdges(before,after){
 const key=e=>JSON.stringify([e.from.type,e.from.id,e.field,e.to.type,e.to.id]);
 const pending=new Map(before.map(e=>[key(e),e])),changes=[];
 for(const edge of after){
  const id=key(edge),old=pending.get(id);
  if(old?.status!==edge.status)changes.push({...edge,previousStatus:old?.status??null});
  pending.delete(id);
 }
 for(const edge of pending.values())changes.push({...edge,previousStatus:edge.status,status:null});
 return changes;
}
function describe(c,operation,fields){
 return {id:c.entityId,type:c.type,workshop:c.workshop,name:c.type==='character'?c.data.public.displayName:c.type==='speciesCatalogue'?'Catalogue narratif des espèces':['knowledge','mission','fieldTarget'].includes(c.type)?c.data.title:c.data.name,
  operation,contentRevision:c.data[revisionKey(c.type)]??null,location:location(c),
  fields,
  privateFields:c.type==='fieldTarget'?['description','gmNotes','profiles','rewards']:c.type==='group'?['briefing','gmNotes','members']:centralSpaceTypes.includes(c.type)?['description','gmNotes',...(c.type==='shipModel'?[]:['navigationCode'])]:c.type==='mission'?['description','gmNotes','steps','conditions','proofExpected']:c.type==='knowledge'?['body','gmTruth','gmNotes','initialCharacterIds','qrCharacterIds']:c.type==='character'?['biography','roleplay','playerSecrets','gmNotes','objectives','relations',...(c.data.creationPlan?['creationPlan']:[])]:c.type==='speciesCatalogue'?[]:['gmNotes'],
  publicAccessCreated:false,resourcesCreated:false};
}
export function centralDraftCheck({campaign,session,draft,changes,actorUid,authority=null,at,base=null}){
 const inherited=base?.changes??[],baseRevision=base?.header.definitionRevision??base?.header.draftRevision;
 requireThat(changes.length<=centralCheckLimits.records&&inherited.length<=centralCheckLimits.records
  &&Buffer.byteLength(JSON.stringify(changes))+(base?Buffer.byteLength(JSON.stringify(inherited)):0)<=centralCheckLimits.inputBytes,'CENTRAL_CHECK_LIMIT');
 const editIds=new Set(changes.map(c=>c?.id)),effective=base?[...inherited.filter(c=>!editIds.has(c?.id)),...changes]:changes;
 requireThat(effective.length<=centralCheckLimits.records,'CENTRAL_CHECK_LIMIT');
 const revision=draft?.revision??0,ordered=[...effective].sort((a,b)=>safe(a?.id).localeCompare(safe(b?.id),'en')),valid=[],diagnostics=[],invalid=new Set(),seen=new Set(),counts={};
 const add=(c,code,message,field='')=>diagnostics.push({...location(c,field),code,message,reference:null});
 for(const c of ordered){
  try{validateCentralChange(c,base&&!editIds.has(c?.id)?baseRevision:revision);check(!seen.has(c.id));seen.add(c.id);counts[c.type]=(counts[c.type]??0)+1;check(counts[c.type]<=limits[c.type]);valid.push(c);}
  catch(e){invalid.add(safe(c?.id));add(c,'INVALID_RECORD',`Définition ou provenance incohérente (${safe(e.code)||'structure'}). Corriger la source avant de poursuivre.`);}
 }
 // A duplicated ID cannot serve as a valid target, even if its first row passed.
 const records=valid.filter(c=>!invalid.has(c.id)),items=records.filter(c=>c.type==='item');
 const kitDiagnostics=centralClassKitProjection(records).diagnostics;
 const initial=centralInitialCoherence(records,invalid,kitDiagnostics);
 const referenceDiagnostics=[...centralFieldTargetProjection(records,items).diagnostics,...centralGroupProjection(records).diagnostics,...centralSpaceProjection(records,records).diagnostics,...centralMissionProjection(records,records,records,records).diagnostics,...kitDiagnostics,...centralCharacterProjection(records).diagnostics,...centralRecipeProjection(records,items,records).diagnostics,...centralKnowledgeProjection(records,records).diagnostics,...centralShopProjection(records,items,records.filter(c=>c.type==='character'),records).diagnostics,...initial.diagnostics];
 for(const d of referenceDiagnostics){
   const c=records.find(c=>c.entityId===d.entityId&&c.workshop===d.workshop&&(!d.entityType||c.type===d.entityType)),target=d.field==='creationPlan.speciesId'?'speciesCatalogue_player':`${d.referenceType??(d.workshop==='M2'?'character':'item')}_${d.reference}`;
  diagnostics.push({...location(c,d.field),...d,...(d.code==='REFERENCE_MISSING'&&invalid.has(target)?{code:'REFERENCE_INVALID',message:'Corriger la définition cible incohérente dans son atelier.'}:{})});
 }
 let releaseChecks=null;
 if(base){
  const {groupAndShop,definitions}=soReleaseDefinitionChecks(records);
  const blockers=[...groupAndShop,...definitions];
  const byId=new Map(records.map(c=>[c.id,c]));
  for(const {changeId,code,entityId,message,field,detailField} of blockers){
   const record=byId.get(changeId);
   diagnostics.push({...location(record??{workshop:entityId},field??detailField),code,entityId,message,reference:null});
  }
  let manifestChecked=false;
  if(records.length===effective.length){
   try{soReleaseManifest(records);manifestChecked=true;}
   catch(e){
    if(!(e instanceof DomainError)||!['SO_RELEASE_LIMIT','CAMPAIGN_RECORD_TOO_LARGE'].includes(e.code))throw e;
    const message=e.code==='CAMPAIGN_RECORD_TOO_LARGE'?'Une définition dépasse la taille autorisée par page. Réduire sa taille.':'La version doit tenir dans un manifeste non vide de 6 Mio et 100 pages maximum. Réduire le contenu à publier.';
    diagnostics.push({...location(null),code:e.code,message,reference:null});
   }
  }
  releaseChecks={definitionBlockers:blockers.length,manifestChecked};
 }
 const edges=centralEdges(records,invalid);
 const baseline=new Map(),invalidBase=new Set();
 for(const c of inherited){
  try{validateCentralChange(c,baseRevision);check(!baseline.has(c.id));baseline.set(c.id,c);}
  catch{invalidBase.add(safe(c?.id));}
 }
 const diff=records.flatMap(c=>{
  const previous=baseline.get(c.id);
  const fields=c.type==='speciesCatalogue'?['species']:[...new Set([...Object.keys(c.data),...Object.keys(previous?.data??{})])].filter(k=>!['id','revision','contentRevision'].includes(k)&&(!base||k!=='masterArchived')).sort();
  if(!base)return [describe(c,c.operation==='ARCHIVE'?'EXCLUDED':'ADD',fields)];
  if(!editIds.has(c.id))return [];
  const changed=previous?fields.filter(k=>!same(c.type==='speciesCatalogue'?c.data:c.data[k],c.type==='speciesCatalogue'?previous.data:previous.data[k])):fields;
  if(previous?.operation===c.operation&&!changed.length)return [];
  const operation=c.operation==='ARCHIVE'?(previous?.operation==='UPSERT'?'ARCHIVE':'EXCLUDED'):previous?.operation==='ARCHIVE'?'RESTORE':previous||invalidBase.has(c.id)?'UPDATE':'ADD';
  const row=describe(c,operation,changed);
  const visibilityFields=changed.filter(k=>['visibility','public','shareMode','initialCharacterIds','members','relations','objectives'].includes(k));
  return [{...row,privateFields:row.privateFields.filter(k=>changed.includes(k)),visibilityFields,qrFields:changed.filter(k=>k.startsWith('qr'))}];
 });
 const referenceChanges=base?compareEdges(centralEdges([...baseline.values()].filter(c=>!invalidBase.has(c.id)),invalidBase),edges):[];
 const remainingChecks=base?[
  {code:'RUNTIME_IMPACTS_PENDING',message:'Les compétences et effets signalés comme non vérifiés restent à contrôler. L’impact d’une migration sur les QR actifs, les droits, les budgets, les caisses, les stocks et les instances de jeu relève d’un contrôle de session distinct.'},
  {code:'SESSION_ACTIVATION_PENDING',message:'L’adoption par les nouveaux épisodes est soumise au contrôle de reprise. Le rattachement d’une nouvelle session hors reprise reste à raccorder.'},
 ]:[
  {code:'RULE_PROFILE_PENDING',message:'Raccordement complet du profil canonique V0.7, des classes, compétences, effets, dotations et liens courants entre admissions et incarnations à terminer.'},
  {code:'OTHER_DOMAINS_PENDING',message:'Autres contenus M1/M2/M3/M5/M6/M7, instances spatiales, rencontres, événements, médias, conformité des lieux/actions, QR, habilitations des vendeurs, caisses, stocks, tarifs de jeu et impacts à compléter.'},
  {code:'PUBLICATION_PENDING',message:'Version immuable, reprise de construction, contrôle du parent et activation globale à développer. Ce rapport ne vaut pas autorisation de publier.'},
 ];
 const report={schemaVersion:1,scope:base?'REVISION_DRAFT_PREPARATION':'INITIAL_DRAFT_PREPARATION',campaign:{id:campaign.id,title:campaign.title},draft:{id:draft?.id??'initial',revision,baseVersionId:draft?.baseVersionId??null,basePointerRevision:draft?.basePointerRevision??0},checkedAt:at,
  ...(base&&(base.header.pointerRevision??1)!==draft?.basePointerRevision?{baseVersionNumber:base.header.pointerRevision??1}:{}),
  authority:authority?{kind:authority.kind,revision:authority.revision}:null,
  fingerprint:hash({schema:base?17:15,actorUid,authority,campaign:{id:campaign.id,revision:campaign.revision,master:campaign.master??null,ruleProfile:campaign.ruleProfile,ownerUid:campaign.ownerUid},...(base?{base:base.header.manifestDigest}:{session:{id:session.id,revision:session.revision}}),draft:draft??null,changes:ordered,...(base?{edits:changes.map(c=>safe(c?.id)).sort()}:{})}),
  status:diagnostics.length?'CORRECTIONS_REQUIRED':'NO_DETECTED_ERROR',publicationAvailable:false,remainingChecks,
  workshops:centralWorkshops.map(w=>({id:w.id,label:w.label,coverage:'PARTIAL',active:records.filter(c=>c.workshop===w.id&&c.operation==='UPSERT').length,archived:records.filter(c=>c.workshop===w.id&&c.operation==='ARCHIVE').length,...(base?{changes:diff.filter(c=>c.workshop===w.id).length,referenceChanges:referenceChanges.filter(e=>e.from.workshop===w.id).length}:{})})),
  totals:{records:effective.length,valid:records.length,invalid:effective.length-records.length,diagnostics:diagnostics.length,references:edges.length},initialPreparation:initial.summary,diff,edges,diagnostics,...(base?{referenceChanges,releaseChecks}:{})};
 requireThat(Buffer.byteLength(JSON.stringify(report))<=centralCheckLimits.reportBytes,'CENTRAL_CHECK_LIMIT');return report;
}
