import {importedSpace,exportedSpace,spaceImportColumn} from './central-space-import.mjs';
import {centralSpaceProjection,centralSpaceTypes} from './central-space.mjs';
import {importedShop,exportedShop,shopImportColumn} from './central-shop-import.mjs';
import {centralShopProjection} from './central-shops.mjs';
import {importedStory,exportedStory,checkStoryCells,storyImportColumn} from './central-story-import.mjs';
import {centralKnowledgeProjection} from './central-knowledge.mjs';
import {centralMissionProjection} from './central-missions.mjs';
import {createHash} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
import {itemInput} from './inventory-state.mjs';
import {recipeInput} from './recipe-state.mjs';
import {importedCharacter,exportedCharacter,checkCharacterCells,characterImportColumn} from './central-character-import.mjs';
import {centralClassKitProjection} from './central-class-kits.mjs';
import {centralCharacterProjection} from './central-characters.mjs';
import {centralRecipeProjection} from './central-recipes.mjs';
import {centralImportFormat,centralImportRows,centralImportContracts,centralImportSelection,centralSpaceColumns,centralShopColumns,centralImportSheets,centralCharacterColumns,centralStoryColumns} from '../shared/central-import-schema.mjs';
import {masterLimits} from '../shared/master-schema.mjs';

const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const hash=v=>createHash('sha256').update(v).digest('hex');
const check=v=>requireThat(v,'INVALID_CENTRAL_IMPORT');
const keys=(v,allowed)=>check(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k)));
const fail=(column,message)=>{throw Object.assign(new Error(message),{column});};
const integer=(v,column)=>{if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v)))fail(column,'Entier positif ou nul attendu.');return Number(v);};
const revisionKey=type=>type==='character'?'contentRevision':'revision';
const columns=type=>type==='character'?centralCharacterColumns:centralStoryColumns[type]??centralShopColumns[type]??centralSpaceColumns[type]??Object.keys(fields[type]);
const fields={
 item:{nom:['name','text'],description:['description','text',''],categorie:['category','text',''],unite:['unit','text'],type:['kind','text'],consommable:['consumable','bool'],volume_unitaire:['unitVolume','number',null],legalite:['legality','text'],notes_mj:['gmNotes','text',''],pillable:['pillable','bool'],billes_par_recharge:['laserRecharge','laser',null]},
 recipe:{nom:['name','text'],description:['description','text',''],type:['kind','text'],niveau_minimum:['minLevel','number'],competence_id:['skillId','text',null],produit_id:['productItemId','text',null],composants:['components','components',[]],effet_id:['effectId','text',null],laboratoire_lieu_id:['laboratoryTargetId','text',null],connaissance_id:['unlockKnowledgeId','text',null],prix_indicatif:['indicativePrice','number',null],notes_mj:['gmNotes','text','']},
};
function cell(value,kind,column){
 if(kind==='bool'){if(!['OUI','NON'].includes(value))fail(column,'Utiliser OUI ou NON.');return value==='OUI';}
 if(kind==='number')return integer(value,column);
 if(kind==='laser')return {pelletsPerUnit:integer(value,column)};
 if(kind==='components')return value.split(';').map(part=>{const [id,quantity,...extra]=part.trim().split(':');if(extra.length)fail(column,'Utiliser identifiant:quantité ; autre:quantité.');return {itemId:documentId(id.trim()),quantity:integer(quantity?.trim(),column)};});
 return value;
}
function dataFor(type,row,old){
 if(centralSpaceTypes.includes(type))return importedSpace(type,row,old);
 if(centralShopColumns[type])return importedShop(type,row,old);
 if(type==='character')return importedCharacter(row,old);
 if(centralStoryColumns[type])return importedStory(type,row,old);
 const data={...(old?.data??{}),publicationState:'DRAFT',...(type==='recipe'?{masterArchived:false}:{})};
 for(const [column,[key,kind,cleared]] of Object.entries(fields[type])){
  const value=row[column];if(value===undefined||value==='')continue;
  if(value==='!EFFACER'){if(cleared===undefined)fail(column,'Ce champ obligatoire ne peut pas être effacé.');data[key]=structuredClone(cleared);}
  else data[key]=cell(kind==='text'&&value.startsWith('!!')?value.slice(1):value,kind,column);
 }
 return (type==='item'?itemInput:recipeInput)(data,row.id,old?.data);
}
function exportRow(c){
 if(centralSpaceTypes.includes(c.type))return exportedSpace(c);
 if(centralShopColumns[c.type])return exportedShop(c);
 if(centralStoryColumns[c.type]){const row=exportedStory(c);try{checkStoryCells(c.type,row);}catch{requireThat(false,'CENTRAL_STORY_EXPORT_LIMIT');}return row;}
 if(c.type==='character'){const row=exportedCharacter(c);try{checkCharacterCells(row);}catch{requireThat(false,'CENTRAL_CHARACTER_EXPORT_LIMIT');}return row;}
 const row={id:c.entityId,operation:c.operation==='ARCHIVE'?'ARCHIVER':'MODIFIER',revision:c.data.revision};
 if(c.operation==='ARCHIVE')return row;
 for(const [column,[key,kind]] of Object.entries(fields[c.type])){
  const v=c.data[key];row[column]=v==null?'':kind==='bool'?(v?'OUI':'NON'):kind==='laser'?v.pelletsPerUnit:kind==='components'?v.map(x=>`${x.itemId}:${x.quantity}`).join(';'):typeof v==='string'&&v.startsWith('!')?`!${v}`:v;
 }
 return row;
}
function cleanSheets(input,sheets){
 check(input&&typeof input==='object'&&!Array.isArray(input)&&Buffer.byteLength(JSON.stringify(input))<=masterLimits.payloadBytes);
 const rows={},errors=[];const error=(sheet,row,column,message)=>errors.push({sheet,row,column,message});
 for(const [name,values] of Object.entries(input)){
  if(!['Meta',...sheets].includes(name)){error(name,1,'','Onglet interdit pour cet atelier.');continue;}
  if(!Array.isArray(values)||values.length>centralImportRows+1){error(name,1,'',`Maximum ${centralImportRows} lignes métier.`);continue;}
  rows[name]=[];
  for(const [i,raw] of values.entries()){
   const row=Number.isSafeInteger(raw?._row)&&raw._row>=2?raw._row:i+2;
   try{check(raw&&typeof raw==='object'&&!Array.isArray(raw));for(const k of Object.keys(raw))if(k!=='_row'&&!centralImportSheets[name].includes(k))fail(k,'Colonne inconnue.');const r={_row:row};for(const [k,v] of Object.entries(raw)){if(k==='_row')continue;if(!['string','number','boolean'].includes(typeof v))fail(k,'Valeur simple attendue.');r[k]=String(v).trim();}if(Object.entries(r).some(([k,v])=>k!=='_row'&&v!==''))rows[name].push(r);}
   catch(e){error(name,row,e.column??'',e.message==='INVALID_CENTRAL_IMPORT'?'Ligne ou colonne inconnue.':e.message);}
  }
 }
 if(rows.Meta?.length!==1)error('Meta',2,'','Une seule ligne de métadonnées est requise.');
 for(const sheet of sheets){if(!rows[sheet])error(sheet,1,'','Onglet métier requis.');if(rows[sheet]?.length>centralImportRows)error(sheet,1,'',`Maximum ${centralImportRows} lignes métier.`);}
 if(sheets.length>1&&sheets.reduce((n,s)=>n+(rows[s]?.length??0),0)>centralImportRows)error('Meta',2,'',`Maximum ${centralImportRows} lignes métier au total, toutes feuilles réunies.`);
 return {rows,errors};
}
export const centralImportCommands=['exportCentralDraft','prepareCentralImport','applyCentralImport'];
// Called inside the common central transaction, AFTER current authority and cycle guards.
export async function centralImport(tx,action,actor,input,ctx){
 const {c,s,draft,rights,grant,at,uuid}=ctx,revision=draft?.revision??0,base=`campaigns/${c.id}/masterDrafts/initial`,workshop=input.workshop,contracts=centralImportContracts(workshop);
 check(contracts.length);const {type,sheet}=contracts[0],multiple=contracts.length>1,key=(type,id)=>multiple?`${type}_${id}`:id,exporting=action==='exportCentralDraft',applying=action==='applyCentralImport';
 requireThat(rights.readWorkshops.includes(workshop)&&(exporting||rights.editWorkshops.includes(workshop)),'FORBIDDEN');
 keys(input,exporting?['campaignId','workshop','ids']:['campaignId','workshop','sheets','fileName',...(applying?['confirmation','requestId','reason']:[])]);
 if(exporting){
  check(Array.isArray(input.ids)&&input.ids.length<=centralImportRows&&new Set(input.ids).size===input.ids.length);input.ids.forEach(id=>{if(!multiple){documentId(id);return;}check(typeof id==='string');const contract=contracts.find(c=>id.startsWith(`${c.type}_`));check(contract);documentId(id.slice(contract.type.length+1));});
  const changes=await tx.list(`${base}/changes`,['workshop',workshop]);
  const selected=input.ids.map(id=>{const c=changes.find(x=>centralImportSelection(workshop,x)===id&&contracts.some(c=>c.type===x.type));requireThat(c,'CENTRAL_EXPORT_STALE');return c;});
  const sheets={Meta:[{format:centralImportFormat,version:1,schema_version:1,type:'CENTRAL_DRAFT',campaign_id:c.id,scenario_id:'',rule_profile:c.ruleProfile,central_base_version:'',draft_id:'initial',draft_revision:revision,module_type:workshop,import_batch_id:uuid()}],...Object.fromEntries(contracts.map(({type,sheet})=>[sheet,selected.filter(c=>c.type===type).map(exportRow)]))};
  requireThat(Buffer.byteLength(JSON.stringify(sheets))<=masterLimits.payloadBytes,'CENTRAL_EXPORT_LIMIT');return {sheets};
 }
 check(typeof input.fileName==='string'&&input.fileName.length>0&&input.fileName.length<=200&&!/[\u0000-\u001f]/.test(input.fileName));
 const {rows,errors}=cleanSheets(input.sheets,contracts.map(c=>c.sheet)),meta=rows.Meta?.[0],content=digest([workshop,rows]);
 const error=(column,message,row=2,name='Meta',id='')=>errors.push({sheet:name,row,column,id,message});
 if(meta){
  for(const [key,value] of Object.entries({format:centralImportFormat,version:'1',schema_version:'1',type:'CENTRAL_DRAFT',campaign_id:c.id,scenario_id:'',rule_profile:c.ruleProfile,central_base_version:'',draft_id:'initial',module_type:workshop}))if(meta[key]!==value)error(key,'Métadonnée incompatible avec cette préparation.');
  try{documentId(meta.import_batch_id);integer(meta.draft_revision,'draft_revision');}catch(e){error(e.column??'import_batch_id',e.message);}
 }
 if(errors.length){if(applying)requireThat(false,'INVALID_CENTRAL_IMPORT');return {errors,changes:[],diagnostics:[],confirmation:null};}
 const batchPath=`${base}/imports/${hash(meta.import_batch_id)}`,batch=await tx.get(batchPath);
 let op,fingerprint,reason;
 if(applying){
  const requestId=documentId(input.requestId);check(typeof input.reason==='string'&&input.reason.trim()&&input.reason.length<=500);reason=input.reason.trim();
  op=`operations/${hash(`${actor.uid}:${requestId}`)}`;fingerprint=digest([action,input]);const receipt=await tx.get(op);
  if(receipt){requireThat(receipt.fingerprint===fingerprint,'REQUEST_ID_REUSED');return receipt.result;}
 }
 if(batch){requireThat(batch.fingerprint===content,'CENTRAL_BATCH_REUSED');if(applying)tx.set(op,{fingerprint,result:batch.result,at});return applying?batch.result:{errors:[],changes:[],diagnostics:[],confirmation:null,alreadyApplied:batch.result};}
 requireThat(Number(meta.draft_revision)===revision,'STALE_REVISION');
 const current=await tx.list(`${base}/changes`,['workshop',workshop]),byId=new Map(current.filter(x=>!(workshop==='M2'&&x.type==='speciesCatalogue'||workshop==='M1'&&x.type==='classKit')).map(x=>[key(x.type,x.entityId),x])),seen=new Set(),planned=[],preview=[];
 for(const {type,sheet} of contracts)for(const row of rows[sheet]){
  try{
   if(type==='character')checkCharacterCells(row);
   if(centralStoryColumns[type])checkStoryCells(type,row);
   const id=documentId(row.id),recordKey=key(type,id);if(seen.has(recordKey))fail('id','Identifiant répété dans cette feuille.');seen.add(recordKey);
   const old=byId.get(recordKey);if(old&&!(old.type===type&&old.id===`${type}_${id}`))fail('id','État du brouillon incohérent.');
   if(integer(row.revision,'revision')!==(old?.data[revisionKey(type)]??0))fail('revision','Révision périmée : exporter à nouveau.');
   if(!['CREER','MODIFIER','ARCHIVER','RESTAURER'].includes(row.operation))fail('operation','Utiliser CREER, MODIFIER, ARCHIVER ou RESTAURER.');
   if(row.operation==='CREER'?!!old:!old)fail('operation','Création/existence incompatible.');
   if(row.operation==='MODIFIER'&&old.operation!=='UPSERT'||row.operation==='RESTAURER'&&old.operation!=='ARCHIVE')fail('operation','Choisir explicitement la restauration ou la modification.');
   const archive=row.operation==='ARCHIVER';
   if(archive&&columns(type).some(k=>row[k]))fail('operation','Pour archiver, conserver uniquement id, operation et revision.');
   const operation=archive?'ARCHIVE':'UPSERT',data=archive?{...old.data,...(['recipe','character','knowledge','mission','shop','offer',...centralSpaceTypes].includes(type)?{masterArchived:true}:{}),[revisionKey(type)]:old.data[revisionKey(type)]+1}:dataFor(type,row,old);
   const changedFields=Object.keys(data).filter(k=>k!==revisionKey(type)&&digest(data[k]??null)!==digest(old?.data[k]??null)).map(field=>({field,before:old?.data[field]??null,after:data[field]}));
   if(old?.operation!==operation)changedFields.push({field:'operation',before:old?.operation??null,after:operation});
   preview.push({id,...(multiple?{type}:{}),row:row._row,sheet,operation:changedFields.length?row.operation:'INCHANGE',fields:changedFields});
   if(changedFields.length){const change={id:`${type}_${id}`,type,entityId:id,workshop,operation,data,revision:revision+1,source:'XLSX',provenance:{schemaVersion:1,batchId:meta.import_batch_id,fileName:input.fileName,sheet,row:row._row},actorUid:actor.uid,at};planned.push({old:old??null,change});byId.set(recordKey,change);}
  }catch(e){error(e.column??'',e.code??e.message,row._row,sheet,row.id??'');}
 }
 for(const {type,sheet} of contracts){const limit=type==='shop'?50:type==='route'?200:['character','mission','shipModel','port'].includes(type)?100:250,count=multiple?[...byId.values()].filter(c=>c.type===type).length:byId.size;if(count>limit)error('id',`Limite de ${limit} définitions pour cette feuille, archives comprises.`,1,sheet);}
 const items=['M4','M5','M7'].includes(workshop)&&rights.readWorkshops.includes('M1')?await tx.list(`${base}/changes`,['workshop','M1']):null;
 const knowledge=['M4','M7'].includes(workshop)&&rights.readWorkshops.includes('M6')?await tx.list(`${base}/changes`,['workshop','M6']):null;
 const characters=['M5','M6','M7'].includes(workshop)&&rights.readWorkshops.includes('M2')?await tx.list(`${base}/changes`,['workshop','M2']):null;
 const storyDiagnostics=['M6','M7'].includes(workshop)?(workshop==='M6'?centralKnowledgeProjection([...byId.values()],characters):centralMissionProjection([...byId.values()],items,characters,knowledge)).diagnostics.map(d=>{const change=byId.get(d.entityId),p=change?.provenance,row=rows[sheet].find(r=>r.id===d.entityId);return {...d,fileName:row?input.fileName:p?.fileName??'',sheet:row?sheet:p?.sheet??'',row:row?row._row:p?.row??null,column:storyImportColumn(type,d.field),batchId:row?meta.import_batch_id:p?.batchId??''};}):[];
 const typedDiagnostics=['M3','M5'].includes(workshop)?(workshop==='M3'?centralSpaceProjection([...byId.values()]):centralShopProjection([...byId.values()],items,characters)).diagnostics.map(d=>{const contract=contracts.find(c=>c.type===d.entityType),change=byId.get(key(d.entityType,d.entityId)),p=change?.provenance,row=rows[contract.sheet].find(r=>r.id===d.entityId);return {...d,fileName:row?input.fileName:p?.fileName??'',sheet:row?contract.sheet:p?.sheet??'',row:row?row._row:p?.row??null,column:(workshop==='M3'?spaceImportColumn:shopImportColumn)(d.entityType,d.field),batchId:row?meta.import_batch_id:p?.batchId??''};}):[];
 const diagnostics=['M3','M5'].includes(workshop)?typedDiagnostics:workshop==='M1'?centralClassKitProjection([...current.filter(x=>x.type==='classKit'),...byId.values()]).diagnostics:workshop==='M2'?centralCharacterProjection([...current.filter(x=>x.type!=='character'),...byId.values()]).diagnostics.map(d=>{const c=byId.get(d.entityId),p=c?.provenance,r=rows[sheet].find(r=>r.id===d.entityId);return {...d,fileName:r?input.fileName:p?.fileName??'',sheet:r?sheet:p?.sheet??'',row:r?r._row:p?.row??null,column:characterImportColumn(d.field),batchId:r?meta.import_batch_id:p?.batchId??''};}):workshop==='M4'?centralRecipeProjection([...byId.values()],items,knowledge).diagnostics:storyDiagnostics;
 const confirmation=errors.length?null:digest([actor.uid,c.revision,s.revision,grant?.revision??0,rights,revision,content,input.fileName,preview,diagnostics]);
 if(!applying)return {errors,changes:preview,diagnostics,confirmation,draftRevision:revision,batchId:meta.import_batch_id};
 requireThat(!errors.length,'INVALID_CENTRAL_IMPORT');requireThat(typeof input.confirmation==='string'&&input.confirmation===confirmation,'CENTRAL_IMPORT_STALE');
 const nextRevision=revision+(planned.length?1:0);
 // All reads finish above. A batch is committed atomically and shares one draft revision.
 if(planned.length){
  if(!c.master)tx.set(`campaigns/${c.id}`,{...c,revision:c.revision+1,master:{schemaVersion:1,activeVersionId:null,pointerRevision:0,openDraftId:'initial'}});
  tx.set(base,{...(draft??{id:'initial',baseVersionId:null,basePointerRevision:0,ruleProfile:c.ruleProfile,status:'DRAFT',createdAt:at}),revision:nextRevision,updatedAt:at});
  for(const {old,change} of planned){change.requestId=input.requestId;tx.set(`${base}/changes/${change.id}`,change);const id=`${nextRevision}_${change.id}`;tx.set(`${base}/history/${id}`,{id,revision:nextRevision,workshop,action,actorUid:actor.uid,at,reason,before:old,change});}
 }
 const result={draftRevision:nextRevision,changed:planned.length,unchanged:preview.length-planned.length,batchId:meta.import_batch_id};
 tx.set(batchPath,{schemaVersion:1,requestId:input.requestId,fingerprint:content,result,actorUid:actor.uid,at,reason,fileName:input.fileName});tx.set(op,{fingerprint,result,at});return result;
}
