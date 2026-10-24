import {masterDependencies} from '../src/shared/master-dependencies.mjs';
import {workshopModule} from '../src/shared/workshop-modules.mjs';
import {escapeHtml as esc} from './groups.mjs';
const presence={PRESENT:'Présente',ARCHIVED:'Archivée',MISSING:'Absente',UNKNOWN:'Non vérifiée'};
const included={ROW:'Ligne incluse',ARCHIVE:'Archivage inclus',NONE:'Hors classeur'};
export function dependenciesHtml(sheets,index){
 const refs=masterDependencies(sheets,index),external=refs.filter(r=>r.scope==='EXTERNAL'),internal=refs.filter(r=>r.scope==='INTERNAL');
 const list=(rows,title)=>`<details><summary>${title} : ${rows.length} références</summary>${rows.length?`<div class="table-scroll"><table><thead><tr><th>Source</th><th>Référence</th><th>Module</th><th>Destination</th><th>Classeur</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.sheet)} · ${esc(r.sourceId)} · ligne ${r.row}<br>${esc(r.column)}</td><td>${esc(r.targetSheet)} · ${esc(r.targetId)}</td><td>${esc(workshopModule(r.module)?.label??r.module??'—')}</td><td>${presence[r.presence]}</td><td>${included[r.included]}</td></tr>`).join('')}</tbody></table></div>`:'<p>Aucune référence de catalogue relevée dans les champs analysés.</p>'}</details>`;
 return `<section><h3>Références du classeur</h3><p>Présence constatée au chargement dans cette destination. Une référence présente peut encore être refusée à l’import selon sa publication, son type ou les règles de jeu. Les médias, codes de ports, paramètres et dépendances indirectes ne sont pas analysés ici. L’aperçu d’import reste obligatoire.</p>${list(external,'Vers les autres modules')}${list(internal,'Dans ce module')}</section>`;
}
