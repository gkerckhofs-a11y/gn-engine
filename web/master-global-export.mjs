import {moduleBundleSheets} from './master-module-export.mjs';
import {workshopModules} from '../src/shared/workshop-modules.mjs';
import {writeMasterXlsx} from './master-xlsx-write.mjs';
import {dependenciesHtml} from './master-dependencies.mjs';
import {escapeHtml as esc} from './groups.mjs';

export function globalMasterSheets(w){
 if(w.bundle!==true||w.scope!=='GLOBAL'||w.meta?.length!==1||w.meta[0].module||!Array.isArray(w.bundles))throw new Error('Export du Master indisponible.');
 const sheets={Meta:w.meta},seen=new Set(),parameters=new Set();
 const context=meta=>JSON.stringify(meta.map(({module,...fields})=>fields));
 for(const part of w.bundles){
  if(!workshopModules.some(m=>m.id===part.module)||seen.has(part.module)||context(part.meta)!==context(w.meta))throw new Error('Les six vues doivent correspondre à la même destination et révision.');
  seen.add(part.module);
  for(const [sheet,rows] of Object.entries(moduleBundleSheets(part))){
   if(sheet==='Meta')continue;
   if(sheet==='Parametres'){
    for(const row of rows){if(parameters.has(row.cle))throw new Error('Paramètre répété dans le Master.');parameters.add(row.cle);}
    sheets.Parametres=[...(sheets.Parametres??[]),...rows];
   }else{
    if(Object.hasOwn(sheets,sheet))throw new Error('Feuille répétée dans le Master.');
    sheets[sheet]=rows;
   }
  }
 }
 if(seen.size!==workshopModules.length)throw new Error('Une vue manque dans le Master.');
 return sheets;
}
export function globalMasterHtml(w){
 let sheets,error;
 try{sheets=globalMasterSheets(w);writeMasterXlsx(sheets);}catch(e){error=e.message;}
 return `<h2>Exporter le catalogue du Master</h2><p>Un classeur pour les six vues, lu à la même révision. Destination : ${esc(w.meta?.[0]?.destination_id??'')} · révision ${esc(w.meta?.[0]?.base_revision??'')}.</p><p>Définitions existantes et archives, sans soldes, stocks acquis, comptes joueurs ni historique des opérations. Les dotations de départ et les informations générales du scénario sont exclues. Ce fichier ne constitue ni une sauvegarde ni une copie autonome de la campagne.</p>${w.session?'<p>Les compétences acquises, paramètres de santé et de monnaie de la session sont également exclus.</p>':''}<p>Le réimport se fait dans le champ Master complet de cette destination, après aperçu et confirmation. ${w.editable?'':'Cette session a quitté la préparation initiale : son import Master est fermé.'}</p>${error?`<p class="error-panel">${esc(error)}</p>`:`<ul>${Object.entries(sheets).filter(([name])=>name!=='Meta').map(([name,rows])=>`<li>${esc(name)} : ${rows.length} lignes</li>`).join('')}</ul>${dependenciesHtml(sheets,w.referenceIndex)}<button type="button" class="quiet" data-master-action="globalDownload">Télécharger le catalogue (.xlsx)</button>`}<p>Limite : 250 lignes au total. Au-delà, utiliser les exports ciblés des vues.</p><p data-master-status role="status" aria-live="polite"></p>`;
}
