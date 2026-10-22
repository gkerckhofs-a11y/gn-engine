import {moduleMasterSheets} from './master-editor.mjs';
import {tariffSheets} from './workshop.mjs';
import {workshopModule} from '../src/shared/workshop-modules.mjs';
import {escapeHtml as esc} from './groups.mjs';
export function moduleBundleSheets(w){
 if(w.bundle!==true||!workshopModule(w.module))throw new Error('Export groupé indisponible.');
 const sheets={Meta:w.meta};
 for(const part of w.workspaces){
  if(JSON.stringify(part.meta)!==JSON.stringify(w.meta)||part.module!==w.module)throw new Error('Les feuilles ne correspondent pas à la même destination et révision.');
  for(const [sheet,rows] of Object.entries(moduleMasterSheets(part)))if(sheet!=='Meta'){
   if(Object.hasOwn(sheets,sheet))throw new Error('Feuille répétée dans cet export.');sheets[sheet]=rows;
  }
 }
 if(w.module==='economie')sheets.Tarifs=tariffSheets(w).Tarifs;
 return sheets;
}
export function moduleBundleHtml(w){
 let sheets,error;try{sheets=moduleBundleSheets(w);}catch(e){error=e.message;}
 const excluded=w.module==='personnages'?`<p>Dotations exclues : leur relevé reste disponible séparément. ${w.session?'Attributions acquises et paramètres de santé exclus en session.':''}</p>`:w.module==='economie'&&w.session?'<p>Paramètres de monnaie exclus en session ; utiliser les outils dédiés.</p>':'';
 return `<h2>Export groupé · ${esc(workshopModule(w.module).label)}</h2><p>Toutes les fiches du module sont incluses, y compris les archives, indépendamment du filtre de la liste. Destination : ${esc(w.meta[0].destination_id)} · révision ${esc(w.meta[0].base_revision)}.</p><p>Définitions pour cette destination ; aucun solde, stock acquis ou accès joueur. Les références des autres modules doivent déjà exister. Ce classeur ne crée pas une copie autonome du scénario.</p>${excluded}<p>Après modification du classeur, l’import exige un aperçu et une confirmation. ${w.editable?'':'Cette session a quitté la préparation initiale : son import Master est fermé.'}</p>${error?`<p class="error-panel">${esc(error)}</p>`:`<ul>${Object.entries(sheets).filter(([name])=>name!=='Meta').map(([name,rows])=>`<li>${esc(name)} : ${rows.length} lignes</li>`).join('')}</ul><button type="button" class="quiet" data-master-action="moduleDownloadAll">Télécharger le classeur groupé (.xlsx)</button>`}<button type="button" class="quiet" data-master-action="moduleList">Retour à la liste</button><p>Limite : 250 lignes au total. Pour un module plus grand, utiliser les exports filtrés de chaque feuille.</p><p data-master-status role="status" aria-live="polite"></p>`;
}
