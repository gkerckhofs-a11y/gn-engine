import {unzipSync} from 'fflate';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {masterSheets,masterIgnoredSheets,masterLimits} from '../src/shared/master-schema.mjs';

const fail=(message,sheet='',row=1,column='')=>{throw Object.assign(new Error(message),{code:'INVALID_MASTER_FILE',sheet,row,column});};
const list=v=>v===undefined?[]:Array.isArray(v)?v:[v];
const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@',parseTagValue:false,parseAttributeValue:false,trimValues:false,processEntities:true,htmlEntities:false,removeNSPrefix:true});
const xml=bytes=>{if(!bytes)fail('Un fichier XML requis est absent du classeur.');const s=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(/<!DOCTYPE|<!ENTITY/i.test(s)||XMLValidator.validate(s)!==true)fail('XML invalide ou déclaration externe interdite.');return parser.parse(s);};
const text=v=>v==null?'':typeof v==='object'?text(v['#text']):String(v);
const rich=v=>v?.r?list(v.r).map(r=>text(r.t)).join(''):text(v?.t);
function path(target){
 if(typeof target!=='string'||target.includes('\\')||target.includes('://'))fail('Relation de classeur invalide.');
 const result=[];for(const p of (target.startsWith('/')?target.slice(1):`xl/${target}`).split('/')){if(!p||p==='.')continue;if(p==='..'){if(!result.length)fail('Chemin invalide.');result.pop();}else result.push(p);}
 const value=result.join('/');if(!/^xl\/worksheets\/[^/]+\.xml$/.test(value))fail('La relation doit désigner une feuille du classeur.');return value;
}
function cellColumn(ref){
 const match=/^([A-Z]{1,3})([1-9]\d*)$/.exec(ref??'');if(!match)fail('Coordonnée de cellule invalide.');let n=0;for(const c of match[1])n=n*26+c.charCodeAt(0)-64;if(n>100||Number(match[2])>10000)fail('La feuille dépasse les limites de lecture.');return [n-1,Number(match[2])];
}
export function readMasterXlsx(bytes){return readWorkbookXlsx(bytes,masterSheets,masterIgnoredSheets);}
export function readWorkbookXlsx(bytes,schema,ignoredSheets=[],requiredHeaders={Meta:['format','version','type'],default:['id','operation','version']}){
 if(!(bytes instanceof Uint8Array)||bytes.length>masterLimits.fileBytes)fail('Le fichier XLSX dépasse 8 Mio.');
 let files,total=0,count=0;const names=new Set();
 try{files=unzipSync(bytes,{filter:f=>{
  if(names.has(f.name)||++count>250||f.originalSize>masterLimits.expandedBytes)fail('Archive XLSX invalide ou trop volumineuse.');names.add(f.name);total+=f.originalSize;
  if(total>masterLimits.expandedBytes||f.name.includes('..')||f.name.includes('\\'))fail('Archive XLSX invalide ou trop volumineuse.');
  if(/vbaProject|externalLinks\//i.test(f.name))fail('Les macros et liens externes ne sont pas acceptés.');return /\.xml$|\.rels$/.test(f.name);
 }});}catch(e){if(e.code==='INVALID_MASTER_FILE')throw e;fail('Impossible de lire ce fichier. Exporter un classeur au format .xlsx.');}
 const wb=xml(files['xl/workbook.xml']).workbook,rels=list(xml(files['xl/_rels/workbook.xml.rels']).Relationships?.Relationship),relationships=new Map();
 for(const r of rels){if(relationships.has(r['@Id']))fail('Relation répétée.');relationships.set(r['@Id'],r);}
 const shared=files['xl/sharedStrings.xml']?list(xml(files['xl/sharedStrings.xml']).sst?.si).map(rich):[],sheets={},seen=new Set();
 for(const s of list(wb?.sheets?.sheet)){
  const name=s['@name'];if(seen.has(name))fail('Nom de feuille répété.',name);seen.add(name);
  if(ignoredSheets.includes(name))continue;
  if(!Object.hasOwn(schema,name))fail('Onglet non pris en charge par GN Engine.',name);
  const relation=relationships.get(s['@id']);if(!relation||relation['@TargetMode']==='External')fail('Feuille externe ou introuvable.',name);
  const doc=xml(files[path(relation['@Target'])]).worksheet;if(!doc)fail('Feuille invalide.',name);
  const rows=new Map();
  for(const r of list(doc.sheetData?.row))for(const c of list(r.c)){
   const [col,row]=cellColumn(c['@r']);if(c.f!==undefined)fail('Remplacer la formule par sa valeur avant import.',name,row,schema[name][col]??c['@r']);
   if(c['@t']==='e')fail('La cellule contient une erreur Excel.',name,row,c['@r']);
   let value;if(c['@t']==='s'){const i=Number(c.v);if(!/^\d+$/.test(c.v)||!Number.isSafeInteger(i)||i>=shared.length)fail('Chaîne partagée introuvable.',name,row,c['@r']);value=shared[i];}
   else if(c['@t']==='inlineStr')value=rich(c.is);
   else if(c['@t']==='b')value=c.v==='1'?'OUI':c.v==='0'?'NON':fail('Booléen Excel invalide.',name,row,c['@r']);
   else value=text(c.v);
   if(!rows.has(row))rows.set(row,new Map());if(rows.get(row).has(col))fail('Cellule répétée.',name,row,c['@r']);rows.get(row).set(col,value);
  }
  const header=rows.get(1)??new Map(),columns=new Map(),headerNames=new Set();
  for(const [col,value] of header){const key=value.trim();if(!key)continue;if(!schema[name].includes(key)||headerNames.has(key))fail('Colonne inconnue ou répétée.',name,1,key);headerNames.add(key);columns.set(col,key);}
  const required=requiredHeaders[name]??(name==='Parametres'?['cle','valeur']:requiredHeaders.default);
  if(required.some(k=>!headerNames.has(k)))fail('En-têtes obligatoires absents en ligne 1.',name);
  sheets[name]=[];for(const [row,values] of [...rows].sort(([a],[b])=>a-b)){
   if(row===1||[...values.values()].every(v=>!v.trim()))continue;const item={_row:row};
   for(const [col,value] of values){if(!columns.has(col)&&value.trim())fail('Valeur sous une colonne sans en-tête.',name,row,String(col+1));if(columns.has(col))item[columns.get(col)]=value;}
   sheets[name].push(item);
  }
 }
 if(!sheets.Meta)fail('Onglet Meta absent. Utiliser un modèle GN Engine.');
 if(Object.values(sheets).reduce((n,r)=>n+r.length,0)>masterLimits.rows||new TextEncoder().encode(JSON.stringify(sheets)).length>masterLimits.payloadBytes)fail('Maximum 250 lignes et 1 Mio de contenu par import.');
 return sheets;
}
