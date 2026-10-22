import {dotationsReportColumns,dotationsReportSheets} from './master-dotations-report.mjs';
import {zipSync,strToU8} from 'fflate';
import {masterSheets,masterLimits} from '../src/shared/master-schema.mjs';
const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const col=n=>n<26?String.fromCharCode(65+n):col(Math.floor(n/26)-1)+col(n%26);
// All cells are literal strings, including values beginning with =, +, - or @.
export function writeMasterXlsx(sheets){
 if(!sheets.Meta)throw new Error('Meta requis.');
 return writeWorkbook(sheets,masterSheets);
}
export function writeDotationsReportXlsx(workspace,rows){return writeWorkbook(dotationsReportSheets(workspace,rows),dotationsReportColumns);}
function writeWorkbook(sheets,schema){
 if(Object.values(sheets).reduce((n,rows)=>n+rows.length,0)>masterLimits.rows||strToU8(JSON.stringify(sheets)).length>masterLimits.payloadBytes)throw new Error('Le Master dépasse les limites d’export.');
 const files={},names=Object.keys(sheets),put=(path,body)=>{files[path]=strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+body);};
 names.forEach((name,i)=>{
  const columns=Object.hasOwn(schema,name)?schema[name]:null;if(!columns)throw new Error('Onglet inconnu.');
  for(const r of sheets[name])if(Object.keys(r).some(k=>k!=='_row'&&!columns.includes(k)))throw new Error('Colonne inconnue.');
  const rows=[columns,...sheets[name].map(r=>columns.map(c=>r[c]??''))];
  for(const row of rows)for(const v of row)if(!['string','number','boolean'].includes(typeof v)||/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(String(v)))throw new Error('Valeur non exportable en XLSX.');
  put(`xl/worksheets/sheet${i+1}.xml`,`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="${columns.length}" width="24" customWidth="1"/></cols><sheetData>${rows.map((r,y)=>`<row r="${y+1}">${r.map((v,x)=>`<c r="${col(x)}${y+1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`);
 });
 put('[Content_Types].xml',`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${names.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
 put('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 put('xl/workbook.xml',`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((name,i)=>`<sheet name="${xml(name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`);
 put('xl/_rels/workbook.xml.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`);
 const bytes=zipSync(files);if(bytes.length>masterLimits.fileBytes)throw new Error('Fichier trop volumineux.');return bytes;
}
