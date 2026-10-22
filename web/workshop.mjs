import {masterEditor} from '../src/shared/master-editors.mjs';
import {escapeHtml as esc} from './groups.mjs';
import {workshopModules,workshopModule} from '../src/shared/workshop-modules.mjs';
export function workshopDashboard(s,scope){
 if(scope==='session'&&!s.permissions?.content)return '';
 const w=s.masterWorkspace;
 return `<section class="panel workshop-context" tabindex="-1"><p class="eyebrow">Atelier · six modules</p><h2>Préparer votre jeu</h2><p><strong>${esc(s.title)}</strong> · ${scope==='session'?'Session':'Scénario'} · révision ${s.revision} · ${esc(s.role??'OWNER')}${s.campaignId?` · campagne ${esc(s.campaignId)} · épisode ${s.campaignEpisode??'—'}`:''}${s.versionId?` · version ${esc(s.versionId)}`:''}</p><p class="muted">${w?(w.editable?'Masters modifiables en préparation. Chaque import demande un aperçu et une confirmation.':'Masters en lecture seule. Les opérations de régie conservent leurs règles et autorisations.'):'Les Masters sont réservés au propriétaire. Vos outils de régie restent accessibles selon votre rôle.'}</p><div class="grid workshop-grid">${workshopModules.map(m=>{
  const counts=w?.modules.find(x=>x.id===m.id)?.counts;
  return `<article class="card"><h3>${m.label}</h3><p>${m.description}</p>${counts?`<p class="muted">${Object.entries(counts).filter(([,n])=>n!==null).map(([k,n])=>`${esc(k)} : ${n}`).join(' · ')||'Aucun catalogue compté dans cette tranche.'}</p>`:''}<button type="button" class="quiet" data-workshop-jump="${m.id}">Ouvrir les outils</button>${w?`<button type="button" class="quiet" data-master-action="moduleMaster" data-scope="${scope}" data-module="${m.id}">Master · ${masterEditor(m.id).title}</button>`:''}${w?.editable?`<button type="button" class="quiet" data-master-action="open" data-scope="${scope}" data-module="${m.id}">Importer ce module</button>`:''}</article>`;
 }).join('')}</div></section>`;
}
export function workshopSection(id,body,scope){
 const m=workshopModule(id);
 return `<section id="workshop-${id}" class="workshop-section" tabindex="-1" aria-label="${m.label}"><div class="section-head"><h2>${m.label}</h2><button type="button" class="quiet small" data-workshop-jump="top">Retour aux modules</button></div>${id==='economie'?`<p>${scope==='scenario'?'Configurez les définitions avant de figer une version.':'Les opérations de régie ci-dessous appliquent les règles de cette session.'}</p>`:''}${body}</section>`;
}
const b=(label,action,attrs='')=>`<button type="button" class="quiet" data-master-action="${action}" ${attrs}>${label}</button>`;
export function tariffMasterLink(s,scope){
 return s.masterWorkspace?b('Master des tarifs : consulter, éditer, exporter','tariffs',`data-scope="${scope}"`):'';
}
export function tariffSheets(w){
 return {Meta:w.meta,Tarifs:w.tariffs.map(t=>t.archived?{id:t.row.id,operation:'ARCHIVER',version:t.row.version}:t.row)};
}
export function tariffListHtml(w){
 return `<h2>Master des tarifs</h2><p>Définitions de douane et de corruption. Les opérations déjà réservées gardent leur devis. Aucun solde ni stock n’est exporté.</p><p>${w.editable?'Créez ou modifiez un tarif, puis vérifiez l’aperçu avant confirmation.':'Lecture seule : la modification par Master exige la préparation avant le premier lancement.'}</p><div class="row">${w.editable?b('Créer un tarif','tariffEdit'):''}${b('Exporter les tarifs (.xlsx)','tariffExport')}</div><div class="stack">${w.tariffs.map(t=>`<article class="panel"><h3>${esc(t.row.titre)}</h3><p>${t.archived?'Archivé':t.row.actif==='OUI'?'Actif':'Désactivé'} · fixe ${esc(t.row.montant_fixe)} + ${esc(t.row.montant_unitaire)} par unité</p>${w.editable?b(t.archived?'Modifier / réactiver':'Modifier','tariffEdit',`data-id="${esc(t.row.id)}"`)+(t.archived?'':b('Archiver','tariffArchive',`data-id="${esc(t.row.id)}"`)):''}</article>`).join('')||'<p>Aucun tarif configuré.</p>'}</div><p data-master-status role="status" aria-live="polite"></p>`;
}
export function tariffEditorHtml(w,id,archive=false){
 const t=id?w.tariffs.find(t=>t.row.id===id):null,r=t?.row??w.newTariff;
 const input=(name,label,type='text',required=false)=>`<label>${label}<input name="${name}" type="${type}" ${type==='number'?'min="0" step="1"':''} ${required?'required':''} value="${esc(r[name]==='!EFFACER'?'':r[name]??'')}"></label>`;
 const select=(name,label,choices)=>`<label>${label}<select name="${name}" required>${choices.map(([v,l])=>`<option value="${esc(v)}" ${r[name]===v?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
 return `<h2>${archive?'Archiver':id?'Modifier':'Créer'} un tarif</h2><p>Identifiant : ${esc(r.id)} · prochaine version ${esc(r.version)}. ${archive?'Le tarif sera désactivé ; son historique reste conservé.':''}</p><form data-master-form="tariff" data-id="${esc(id??'')}" data-archive="${archive}">${archive?'':input('titre','Titre','text',true)+input('description','Description')+select('nature','Nature',[['CUSTOMS','Douane'],['CORRUPTION','Corruption']])+select('mouvement','Mouvement',[['LOAD','Chargement'],['UNLOAD','Déchargement'],['TRANSSHIP','Transbordement']])+select('objet_id','Marchandise',[['!EFFACER','Tous les objets'],...w.items.map(i=>[i.id,i.name])])+input('montant_fixe','Montant fixe','number',true)+input('montant_unitaire','Montant par unité','number',true)+`<label>Bénéficiaire<select name="beneficiary" required><option value="SINK" ${r.beneficiaire_type==='SINK'?'selected':''}>Retrait de la circulation</option>${w.beneficiaries.map(c=>`<option value="${c.type}:${esc(c.id)}" ${r.beneficiaire_type===c.type&&r.beneficiaire_id===c.id?'selected':''}>${c.type==='GROUP'?'Caisse':'Personnage'} : ${esc(c.name)}</option>`).join('')}</select></label>`+select('actif','Activation',[['NON','Désactivé'],['OUI','Actif']])}<label>Motif réservé aux organisateurs<textarea name="reason" maxlength="500" required></textarea></label><button class="primary">Vérifier les changements</button></form><p data-master-status role="status" aria-live="polite"></p>`;
}
export function tariffFormRow(w,id,archive,values){
 const source=id?w.tariffs.find(t=>t.row.id===id)?.row:w.newTariff;
 if(!source||!w.editable)throw new Error('Actualisez le Master avant de modifier ce tarif.');
 const row={id:source.id,operation:archive?'ARCHIVER':id?'MODIFIER':'CREER',version:source.version};
 if(archive)return row;
 for(const k of ['titre','nature','mouvement','objet_id','montant_fixe','montant_unitaire','actif'])row[k]=values[k];
 row.description=values.description||'!EFFACER';
 const [type,bid]=values.beneficiary.split(':');row.beneficiaire_type=type;row.beneficiaire_id=bid||'!EFFACER';
 return row;
}
