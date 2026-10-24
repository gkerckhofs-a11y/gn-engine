import {centralClassKitInput,centralClassKitProjection} from './central-class-kits.mjs';
import {centralInitialCoherence} from './central-initial-coherence.mjs';
import {createHash} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
import {itemInput} from './inventory-state.mjs';
import {recipeInput} from './recipe-state.mjs';
import {centralCharacterInput,centralCharacterProjection} from './central-characters.mjs';
import {characterImportColumn} from './central-character-import.mjs';
import {storedCharacterPlan} from './central-character-plan.mjs';
import {centralRecipeProjection} from './central-recipes.mjs';
import {admissionSettings,emptyAdmissionCounts} from './admission-state.mjs';
import {centralWorkshops} from '../shared/central-workshops.mjs';
import {centralImportTypes} from '../shared/central-import-schema.mjs';

// Initial, empty-base drafts only. This report is not a publication consent.
export const centralCheckLimits={records:609,inputBytes:16*1024*1024,reportBytes:4*1024*1024};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const json=v=>JSON.stringify(canonical(v));
const hash=v=>createHash('sha256').update(json(v)).digest('hex');
const same=(a,b)=>json(a)===json(b);
const owners={classKit:'M1',item:'M1',character:'M2',speciesCatalogue:'M2',recipe:'M4'};
const limits={classKit:8,item:250,character:100,speciesCatalogue:1,recipe:250};
const revisionKey=type=>type==='character'?'contentRevision':'revision';
const safe=v=>typeof v==='string'?v.slice(0,200):'';
const check=v=>requireThat(v,'INVALID_CENTRAL_RECORD');
const location=(c,field='')=>({workshop:safe(c?.workshop),entityId:safe(c?.entityId),field,source:safe(c?.source),
 fileName:safe(c?.provenance?.fileName),sheet:safe(c?.provenance?.sheet),row:Number.isSafeInteger(c?.provenance?.row)?c.provenance.row:null,column:c?.type==='character'&&c?.source==='XLSX'?characterImportColumn(field):field,
 batchId:safe(c?.provenance?.batchId),draftRevision:Number.isSafeInteger(c?.revision)?c.revision:null});
function validate(c,revision){
 check(c&&typeof c==='object'&&!Array.isArray(c));
 check(Object.keys(c).every(k=>['id','type','entityId','workshop','operation','data','revision','source','actorUid','at','requestId','provenance'].includes(k)));
 check(Object.hasOwn(owners,c.type)&&c.workshop===owners[c.type]);documentId(c.entityId);
 check(c.id===`${c.type}_${c.entityId}`&&['UPSERT','ARCHIVE'].includes(c.operation));
 check(Number.isSafeInteger(c.revision)&&c.revision>0&&c.revision<=revision);
 check(typeof c.actorUid==='string'&&c.actorUid.length>0&&Number.isSafeInteger(c.at)&&['WEB','XLSX','ADMISSION_SETTINGS'].includes(c.source));
 if(c.requestId!==undefined)documentId(c.requestId);
 if(c.provenance!==undefined){const p=c.provenance;check(c.source==='XLSX'&&p&&Object.keys(p).every(k=>['schemaVersion','batchId','fileName','sheet','row'].includes(k))&&p.schemaVersion===1&&typeof p.fileName==='string'&&p.fileName.length<=200&&typeof p.sheet==='string'&&p.sheet.length<=100&&Number.isSafeInteger(p.row)&&p.row>=2);documentId(p.batchId);}
 if(c.source==='XLSX')check(!!c.provenance&&centralImportTypes[c.workshop]?.type===c.type&&centralImportTypes[c.workshop]?.sheet===c.provenance.sheet);
 const d=c.data;let normalized;
 if(c.type==='speciesCatalogue'){
  check(c.entityId==='player'&&c.operation==='UPSERT'&&c.source==='ADMISSION_SETTINGS');
  normalized=admissionSettings({open:false,instructions:'',quotas:emptyAdmissionCounts(),species:d}).species;
 }else{
  check(c.source!=='ADMISSION_SETTINGS'&&d&&typeof d==='object'&&!Array.isArray(d)&&d.id===c.entityId&&d.publicationState==='DRAFT');
  const key=revisionKey(c.type);check(Number.isSafeInteger(d[key])&&d[key]>0);
  if(c.type==='classKit')normalized={...centralClassKitInput({bindings:d.bindings,gmNotes:d.gmNotes},c.entityId),revision:d.revision,masterArchived:c.operation==='ARCHIVE'};
  if(c.type==='item')normalized={...itemInput(d,c.entityId),revision:d.revision};
  if(c.type==='recipe')normalized={...recipeInput(d,c.entityId),revision:d.revision,masterArchived:c.operation==='ARCHIVE'};
  if(c.type==='character'){
   const strip=rows=>rows?.map(({published,...row})=>({...row,...(row.steps?{steps:row.steps.map(({published,...s})=>s)}:{})}));
   const plan=Object.hasOwn(d,'creationPlan')?storedCharacterPlan(d.creationPlan):undefined;
   normalized={...centralCharacterInput({displayName:d.public?.displayName,profession:d.public?.profession,description:d.public?.description,nature:d.nature,biography:d.biography,roleplay:d.roleplay,playerSecrets:d.playerSecrets,gmNotes:d.gmNotes,objectives:strip(d.objectives),relations:strip(d.relations),
    ...(plan!==undefined?{creationPlan:plan===null?null:{classId:plan.classId,speciesId:plan.speciesId,secondaryId:plan.secondaryId}}:{})},c.entityId),contentRevision:d.contentRevision,masterArchived:c.operation==='ARCHIVE'};
  }
 }
 check(same(normalized,d));
}
export function centralDraftCheck({campaign,session,draft,changes,actorUid,authority=null,at}){
 requireThat(changes.length<=centralCheckLimits.records&&Buffer.byteLength(JSON.stringify(changes))<=centralCheckLimits.inputBytes,'CENTRAL_CHECK_LIMIT');
 const revision=draft?.revision??0,ordered=[...changes].sort((a,b)=>safe(a?.id).localeCompare(safe(b?.id),'en')),valid=[],diagnostics=[],invalid=new Set(),seen=new Set(),counts={};
 const add=(c,code,message,field='')=>diagnostics.push({...location(c,field),code,message,reference:null});
 for(const c of ordered){
  try{validate(c,revision);check(!seen.has(c.id));seen.add(c.id);counts[c.type]=(counts[c.type]??0)+1;check(counts[c.type]<=limits[c.type]);valid.push(c);}
  catch(e){invalid.add(safe(c?.id));add(c,'INVALID_RECORD',`Définition ou provenance incohérente (${safe(e.code)||'structure'}). Corriger la source avant de poursuivre.`);}
 }
 // A duplicated ID cannot serve as a valid target, even if its first row passed.
 const records=valid.filter(c=>!invalid.has(c.id)),items=records.filter(c=>c.type==='item');
 const kitDiagnostics=centralClassKitProjection(records).diagnostics;
 const initial=centralInitialCoherence(records,invalid,kitDiagnostics);
 const referenceDiagnostics=[...kitDiagnostics,...centralCharacterProjection(records).diagnostics,...centralRecipeProjection(records,items).diagnostics,...initial.diagnostics];
 for(const d of referenceDiagnostics){
   const c=records.find(c=>c.entityId===d.entityId&&c.workshop===d.workshop&&(!d.entityType||c.type===d.entityType)),target=d.field==='creationPlan.speciesId'?'speciesCatalogue_player':`${d.referenceType??(d.workshop==='M2'?'character':'item')}_${d.reference}`;
  diagnostics.push({...location(c,d.field),...d,...(d.code==='REFERENCE_MISSING'&&invalid.has(target)?{code:'REFERENCE_INVALID',message:'Corriger la définition cible incohérente dans son atelier.'}:{})});
 }
 const edges=[];
 const edge=(c,field,type,id)=>{
  if(type==='species'){
   const catalogue=records.find(t=>t.id==='speciesCatalogue_player'),exists=catalogue?.data.some(s=>s.id===id);
   edges.push({from:{workshop:c.workshop,type:c.type,id:c.entityId},field,to:{type,id,workshop:'M2'},status:invalid.has('speciesCatalogue_player')?'INVALID':exists?'RESOLVED':'MISSING'});return;
  }
  if(!id)return;const target=records.find(t=>t.type===type&&t.entityId===id),supported=Object.hasOwn(owners,type);
  edges.push({from:{workshop:c.workshop,type:c.type,id:c.entityId},field,to:{type,id,workshop:owners[type]??null},status:!supported?'NOT_CHECKED':invalid.has(`${type}_${id}`)?'INVALID':!target?'MISSING':target.operation==='ARCHIVE'?'ARCHIVED':'RESOLVED'});
 };
 for(const c of records.filter(c=>c.operation==='UPSERT')){
  if(c.type==='classKit')for(const b of c.data.bindings)edge(c,`bindings.${b.slotId}.itemId`,'item',b.itemId);
  if(c.type==='character'){
   for(const r of c.data.relations)edge(c,`relations.${r.id}.targetId`,'character',r.targetId);
   if(c.data.creationPlan){edge(c,'creationPlan.speciesId','species',c.data.creationPlan.speciesId);edge(c,'creationPlan.classId','classKit',c.data.creationPlan.classId);}
  }
  if(c.type==='recipe'){
   edge(c,'productItemId','item',c.data.productItemId);c.data.components.forEach((x,i)=>edge(c,`components.${i}.itemId`,'item',x.itemId));
   for(const [field,type] of [['skillId','skill'],['effectId','effect'],['laboratoryTargetId','fieldTarget'],['unlockKnowledgeId','knowledge']])edge(c,field,type,c.data[field]);
  }
 }
 const diff=records.map(c=>({id:c.entityId,type:c.type,workshop:c.workshop,name:c.type==='character'?c.data.public.displayName:c.type==='speciesCatalogue'?'Catalogue narratif des espèces':c.data.name,
  operation:c.operation==='ARCHIVE'?'EXCLUDED':'ADD',contentRevision:c.data[revisionKey(c.type)]??null,location:location(c),
  fields:c.type==='speciesCatalogue'?['species']:Object.keys(c.data).filter(k=>!['id','revision','contentRevision'].includes(k)).sort(),
  privateFields:c.type==='character'?['biography','roleplay','playerSecrets','gmNotes','objectives','relations',...(c.data.creationPlan?['creationPlan']:[])]:c.type==='speciesCatalogue'?[]:['gmNotes'],
  publicAccessCreated:false,resourcesCreated:false}));
 const remainingChecks=[
  {code:'RULE_PROFILE_PENDING',message:'Raccordement complet du profil canonique V0.7, des classes, compétences, effets et dotations à terminer.'},
  {code:'OTHER_DOMAINS_PENDING',message:'Validateurs des autres contenus M1/M2 et des ateliers M3/M5/M6/M7, médias, QR et impacts à compléter.'},
  {code:'PUBLICATION_PENDING',message:'Version immuable, reprise de construction, contrôle du parent et activation globale à développer. Ce rapport ne vaut pas autorisation de publier.'},
 ];
 const report={schemaVersion:1,scope:'INITIAL_DRAFT_PREPARATION',campaign:{id:campaign.id,title:campaign.title},draft:{id:'initial',revision,baseVersionId:null,basePointerRevision:0},checkedAt:at,
  authority:authority?{kind:authority.kind,revision:authority.revision}:null,
  fingerprint:hash({schema:3,actorUid,authority,campaign:{id:campaign.id,revision:campaign.revision,master:campaign.master??null,ruleProfile:campaign.ruleProfile,ownerUid:campaign.ownerUid},session:{id:session.id,revision:session.revision},draft:draft??null,changes:ordered}),
  status:diagnostics.length?'CORRECTIONS_REQUIRED':'NO_DETECTED_ERROR',publicationAvailable:false,remainingChecks,
  workshops:centralWorkshops.map(w=>({id:w.id,label:w.label,coverage:['M1','M2','M4'].includes(w.id)?'PARTIAL':'NOT_IMPLEMENTED',active:records.filter(c=>c.workshop===w.id&&c.operation==='UPSERT').length,archived:records.filter(c=>c.workshop===w.id&&c.operation==='ARCHIVE').length})),
  totals:{records:changes.length,valid:records.length,invalid:changes.length-records.length,diagnostics:diagnostics.length,references:edges.length},initialPreparation:initial.summary,diff,edges,diagnostics};
 requireThat(Buffer.byteLength(JSON.stringify(report))<=centralCheckLimits.reportBytes,'CENTRAL_CHECK_LIMIT');return report;
}
