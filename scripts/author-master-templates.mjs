// Run a copy of this builder in a temporary directory with the primary runtime.
// The repository path is the first argument; no authoring dependency is shipped to the app.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const root=path.resolve(process.argv[2]),out=path.resolve('outputs/gn-engine-masters');
const {masterSheets,masterHints,masterGuide,masterParameters}=await import(pathToFileURL(path.join(root,'src/shared/master-schema.mjs')));
const {masterExample,sessionMasterExample}=await import(pathToFileURL(path.join(root,'src/shared/master-examples.mjs')));
await fs.mkdir(out,{recursive:true});await fs.mkdir(path.join(root,'assets/masters'),{recursive:true});
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const numeric=new Set(['version','base_revision','niveau_global','pv_max_initiaux','volume_unitaire','soin_pv','usages','recuperation_secondes','consommable_quantite','qr_niveau','quantite']);
const boolean=new Set(['consommable','actif','revele','visible_membres','affiliation_publique','qr_actif']);
const options=(sheet,key)=>key==='operation'?['CREER','MODIFIER','ARCHIVER']:key==='publication_publique'||key==='publication'&&!['Attributions','Objectifs','Relations'].includes(sheet)?['DRAFT','READY','PUBLISHED']:key==='publication'||boolean.has(key)?['OUI','NON']:key==='visibilite'?['PUBLIC','SECRET']:key==='partage'?['SHOW','COPY']:key==='qr_audience'?['ALL_PLAYERS','SELECTED']:key==='portee_recuperation'?['ACTOR','PATIENT','NONE']:key==='legalite'?['UNSPECIFIED','LEGAL','ILLEGAL']:key==='type'?({Meta:['CAMPAGNE','SESSION'],Objets:['STACKABLE','INDIVIDUAL'],Competences:['PASSIVE','ACTIVE_SELF','ACTIVE_TARGET'],Connaissances:['KNOWLEDGE','CLUE','DOCUMENT'],Dotations:['CREDIT','OBJET']}[sheet]):null;
const workbooks=[['GN_Engine_Master_Campagne','CAMPAGNE',null],['GN_Engine_Master_Session','SESSION',null],['GN_Engine_Exemple_Campagne','CAMPAGNE',masterExample()],['GN_Engine_Exemple_Session','SESSION',sessionMasterExample()]];
for(const [filename,type,example] of workbooks){
 const wb=Workbook.create(),guide=wb.worksheets.add('Guide');guide.showGridLines=false;guide.tabColor='#5B4B7C';
 guide.getRange('A2').values=[['GN Engine 0.23']];guide.getRange('B2').values=[[`${example?'Exemple fictif':'Modèle vierge'} · ${type==='CAMPAGNE'?'campagne':'session'}`]];
 guide.getRange(`A4:B${masterGuide.length+3}`).values=masterGuide;
 guide.getRange(`A2:B${masterGuide.length+3}`).format={font:{name:'Arial',size:11,color:'#273246'},verticalAlignment:'center',wrapText:true};
 guide.getRange('A2:B2').format.font={name:'Arial',size:16,bold:true,color:'#273246'};
 guide.getRange('A:A').format.columnWidth=32;guide.getRange('B:B').format.columnWidth=110;guide.getRange(`A4:B${masterGuide.length+3}`).format.rowHeight=56;guide.getRange(`A4:A${masterGuide.length+3}`).format.font.bold=true;guide.getRange('A2:B2').format.rowHeight=38;
 if(type==='SESSION'){guide.getRange(`A${masterGuide.length+4}:B${masterGuide.length+4}`).values=[['Campagne ciblée','Renseigner Meta → campaign_id avec l’identifiant affiché dans l’écran d’import. L’exemple session complète l’exemple campagne fourni.']];guide.getRange(`A${masterGuide.length+4}:B${masterGuide.length+4}`).format={font:{name:'Arial',size:11},wrapText:true,rowHeight:60};}
 const tables={...example,Meta:example?.Meta??[{format:'gn-engine-master',version:1,type}],Parametres:example?.Parametres??masterParameters.filter(k=>type==='SESSION'?!['economie_active','monnaie_nom','monnaie_unite','sante_active','pv_max_defaut'].includes(k):!['date','horaires','lieu','infos_pratiques','confidentialite','capacite','groupes_actifs'].includes(k)).map(cle=>({cle,valeur:''}))};
 for(const [name,headers] of Object.entries(masterSheets)){
  const sh=wb.worksheets.add(name);sh.showGridLines=false;const last=col(headers.length-1),rows=tables[name]??[],values=[headers,...rows.map(r=>headers.map(k=>{const v=r[k]??null;return numeric.has(k)&&v!==null&&/^\d+$/.test(String(v))?Number(v):v;}))];
  sh.getRange(`A1:${last}${values.length}`).values=values;
  sh.getRange(`A1:${last}${Math.max(values.length,12)}`).format={font:{name:'Arial',size:11,color:'#273246'},verticalAlignment:'center',rowHeight:32,wrapText:true};
  sh.getRange(`A1:${last}1`).format={fill:'#343D50',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeight:52,wrapText:true,verticalAlignment:'center'};
  sh.getRange(`A2:${last}${Math.max(values.length,12)}`).format.fill='#FFF7E5';
  for(const [i,k] of headers.entries()){
   const c=col(i);sh.getRange(`${c}:${c}`).format.columnWidth=numeric.has(k)?16:['operation','publication','publication_publique','type'].includes(k)?22:/description|histoire|texte|briefing|notes|instructions|secrets|interpretation/.test(k)?48:k==='format'?28:28;
   sh.getRange(`${c}2:${c}251`).setNumberFormat(numeric.has(k)?'0':'@');const allowed=options(name,k);if(allowed)sh.getRange(`${c}2:${c}251`).dataValidation={rule:{type:'list',values:allowed}};
  }
  if(rows.length)sh.getRange(`A2:${last}${rows.length+1}`).format.rowHeight=62;
  sh.freezePanes.freezeRows(1);sh.freezePanes.freezeColumns(1);
 }
 const dict=wb.worksheets.add('Dictionnaire');dict.showGridLines=false;dict.tabColor='#A8A1B8';const data=[['Onglet','Colonne','Valeurs et utilisation']];
 for(const [sheet,columns] of Object.entries(masterSheets))for(const key of columns){const opts=options(sheet,key);data.push([sheet,key,sheet==='Meta'&&key==='version'?'1 — version du format, ne pas augmenter.':opts?opts.join(' ; '):masterHints[key]??(key==='id'?'Identifiant durable : lettres A–Z, chiffres, tiret ou soulignement. Maximum 128 caractères.':key.endsWith('_id')?'Identifiant existant ou créé dans ce même import.':key==='valeur'?'Cellule vide = aucune modification. Voir les paramètres dans le guide.':'Texte ou valeur du contenu. Vide = conserver ; !EFFACER = vider un champ facultatif.')]);}
 dict.getRange(`A1:C${data.length}`).values=data;dict.getRange(`A1:C${data.length}`).format={font:{name:'Arial',size:11,color:'#273246'},wrapText:true,rowHeight:44,verticalAlignment:'center'};dict.getRange('A:A').format.columnWidth=24;dict.getRange('B:B').format.columnWidth=34;dict.getRange('C:C').format.columnWidth=110;dict.getRange('A1:C1').format={fill:'#343D50',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'}};dict.freezePanes.freezeRows(1);
 wb.recalculate();
 const check=await wb.inspect({kind:'table',range:'Meta!A1:F2',include:'values,formulas',tableMaxRows:2,tableMaxCols:6,maxChars:1500});console.log(filename,check.ndjson);
 const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#NULL!',options:{useRegex:true,maxResults:10},maxChars:1000});console.log('formula-errors',errors.ndjson);
 const xlsx=await SpreadsheetFile.exportXlsx(wb);await xlsx.save(path.join(out,`${filename}.xlsx`));await fs.copyFile(path.join(out,`${filename}.xlsx`),path.join(root,'assets/masters',`${filename}.xlsx`));
 for(const name of (process.env.MASTER_RENDER_CHANGED==='1'?['Dictionnaire']:['Guide',...Object.keys(masterSheets),'Dictionnaire'])){
  const range=name==='Guide'?'A2:B10':name==='Dictionnaire'?'A1:C8':`A1:${col(masterSheets[name].length-1)}${Math.min((tables[name]?.length??0)+2,6)}`;
  const blob=await wb.render({sheetName:name,range,scale:1,format:'png'});await fs.writeFile(path.join(out,`${filename}-${name}.png`),new Uint8Array(await blob.arrayBuffer()));
 }
 console.log('SAVED',filename);
}
