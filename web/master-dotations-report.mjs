import {escapeHtml as esc} from './groups.mjs';
export const dotationsReportColumns={
 Notice:['format','version','destination_type','destination_id','campaign_id','revision','lecture_seule','description'],
 Releve:['personnage_id','nom','archive','credits_configures','credits_depart','revision_credits','inventaire_configure','revision_inventaire'],
 ObjetsDepart:['personnage_id','objet_id','objet_nom','unite','quantite_depart'],
};
export const dotationsNotice='Réglages de départ enregistrés, agrégés par personnage et objet. Aucun solde ou stock actuel. Ce relevé ne reconstitue pas les lignes des imports historiques et ne peut pas être réimporté comme Master.';
export function dotationsReportSheets(w,rows=w.rows){
 if(w.sheet!=='Dotations'||w.errors.length)throw new Error('Relevé des dotations indisponible.');
 const m=w.meta[0];
 return {Notice:[{format:'gn-engine-dotations-report',version:'1',destination_type:m.type,destination_id:m.destination_id,campaign_id:m.campaign_id,revision:m.base_revision,lecture_seule:'OUI',description:dotationsNotice}],Releve:rows.map(r=>{
  const base={personnage_id:r.row.id,nom:r.title,archive:r.state==='archived'?'OUI':'NON',credits_configures:r.credits?'OUI':'NON',credits_depart:r.credits?.amount??'',revision_credits:r.credits?.revision??'',inventaire_configure:r.inventory?'OUI':'NON',revision_inventaire:r.inventory?.revision??''};
  return base;
 }),ObjetsDepart:rows.flatMap(r=>(r.inventory?.items??[]).map(i=>({personnage_id:r.row.id,objet_id:i.id,objet_nom:i.name,unite:i.unit,quantite_depart:i.quantity})))};
}
export function dotationsListHtml(w,rows,navigation,query,state){
 return `${navigation}<h2>Dotations de départ · relevé</h2><p>${dotationsNotice}</p><p>${w.session?'Les définitions conservées dans cet épisode sont affichées, y compris pour les personnages de retour. Elles ne sont pas redistribuées.':'Les réglages peuvent évoluer via les outils de dotation du scénario. Les sessions déjà créées conservent leurs propres données.'}</p><form data-master-form="moduleFilter"><label>Rechercher un personnage ou un objet<input name="query" value="${esc(query)}"></label><label>Personnages<select name="state">${[['all','Tous'],['active','Non archivés'],['archived','Archivés']].map(([v,l])=>`<option value="${v}" ${v===state?'selected':''}>${l}</option>`).join('')}</select></label><button class="quiet">Filtrer</button></form><p>${rows.length} / ${w.rows.length} personnages affichés.</p><button type="button" class="quiet" data-master-action="moduleExport">Exporter le relevé affiché (.xlsx, lecture seule)</button><div class="stack">${rows.map(r=>`<article class="panel"><h3>${esc(r.title)}</h3><p>${esc(r.row.id)}${r.state==='archived'?' · Archivé':''}</p><p>Crédits de départ : ${r.credits?`${esc(r.credits.amount)} · réglage révision ${esc(r.credits.revision)}`:'non renseignés'}.</p><p>Inventaire de départ : ${r.inventory?`réglage révision ${esc(r.inventory.revision)}`:'non renseigné'}.</p>${r.inventory?.items.length?`<ul>${r.inventory.items.map(i=>`<li>${esc(i.name)} (${esc(i.id)}) : ${esc(i.quantity)} ${esc(i.unit)}</li>`).join('')}</ul>`:r.inventory?'<p>Aucun objet configuré.</p>':''}</article>`).join('')||'<p>Aucun personnage ne correspond à ce filtre.</p>'}</div><p data-master-status role="status" aria-live="polite"></p>`;
}
