import {characterCreationSheets} from '../src/shared/master-character-creation.mjs';
import {terrainDraft,terrainRefreshDraft,terrainFormSheets,terrainMasterSheets,terrainEditorHtml} from './master-terrain-editor.mjs';
import {masterFieldsHtml} from './master-fields.mjs';
import {masterEditor,masterEditorsFor,editorFields,editorFieldVisible} from '../src/shared/master-editors.mjs';
import {escapeHtml as esc} from './groups.mjs';
const button=(label,action,attrs='')=>`<button type="button" class="quiet" data-master-action="${action}" ${attrs}>${label}</button>`;
const draftFields=(w,d)=>editorFields(w.module,w.session,d.existing,w.sheet).filter(f=>!(f.navigationInitialOnly&&w.session&&d.existing&&d.navigationInitialized));
export function filteredMasterRows(w,query='',state='all'){
 const q=query.trim().toLocaleLowerCase('fr');
 return w.rows.filter(r=>(state==='all'||r.state===state)&&`${r.title} ${r.ownerLabel} ${r.row.id}`.toLocaleLowerCase('fr').includes(q));
}
export function moduleMasterSheets(w,rows=w.rows){
 if(w.sheet==='Lieux')return terrainMasterSheets(w,rows);
 if(w.errors.length)throw new Error(w.errors.join(' '));
 return {Meta:w.meta,[w.sheet]:rows.map(({row,archived})=>archived?{id:row.id,operation:'ARCHIVER',version:row.version,...(row.personnage_id?{personnage_id:row.personnage_id}:{}),...(row.groupe_id?{groupe_id:row.groupe_id}:{})}:row)};
}
export function moduleListHtml(w,query='',state='all'){
 const def=masterEditor(w.module,w.sheet),rows=filteredMasterRows(w,query,state),usable=!w.errors.length;
 const editors=masterEditorsFor(w.module),navigation=editors.length>1?`<nav class="row" aria-label="Feuilles Master">${editors.map(e=>button(esc(e.title),'moduleSheet',`data-sheet="${e.sheet}" ${e.sheet===w.sheet?'aria-current="page" disabled':''}`)).join('')}</nav>`:'';
 return `${navigation}<h2>Master · ${def.title}</h2><p>${def.note}</p><p>${w.editable?'Créez ou modifiez une fiche, puis relisez l’aperçu avant confirmation.':'Lecture et export uniquement : la session a quitté la préparation initiale.'}</p><p>Export limité à <strong>${def.groupedTerrain?'Lieux + ActionsTerrain + Recompenses des lieux affichés':def.sheet}</strong>. Les autres contenus du module conservent leurs outils actuels.</p>${w.errors.length?`<p class="error-panel">${w.errors.map(esc).join('<br>')}</p>`:''}<form data-master-form="moduleFilter"><label>Rechercher un nom, un personnage ou un identifiant<input name="query" value="${esc(query)}"></label><label>État<select name="state">${[['all','Tous'],['active',def.stateLabels?.active??'Publiés, ouverts ou activés'],['draft',def.stateLabels?.draft??'Brouillons, fermés ou désactivés'],['archived','Archivés']].map(([v,l])=>`<option value="${v}" ${v===state?'selected':''}>${l}</option>`).join('')}</select></label><button class="quiet">Filtrer</button></form><p>${rows.length} / ${w.rows.length} fiches affichées.</p><div class="row">${w.editable&&usable?button('Créer une fiche','moduleEdit'):''}${usable?button('Exporter les fiches affichées (.xlsx)','moduleExport'):''}</div><div class="stack">${rows.map(r=>`<article class="panel"><h3>${esc(r.title)}</h3><p>${esc(r.ownerLabel)} · ${esc(r.row.id)} · ${esc(def.stateLabels?.[r.state]??(r.state==='archived'?'Archivé':r.state==='active'?'Publié / ouvert / activé':'Brouillon / fermé / désactivé'))}</p>${button('Consulter','moduleView',`data-id="${esc(r.row.id)}"`)}${w.editable&&usable?button(r.archived?'Modifier / réactiver':'Modifier','moduleEdit',`data-id="${esc(r.row.id)}"`)+(def.duplicate===false?'':button('Dupliquer en brouillon','moduleDuplicate',`data-id="${esc(r.row.id)}"`))+(r.archived?'':button(def.archiveLabel??'Archiver','moduleArchive',`data-id="${esc(r.row.id)}"`)):''}</article>`).join('')||'<p>Aucune fiche ne correspond à ce filtre.</p>'}</div><p data-master-status role="status" aria-live="polite"></p>`;
}
export function moduleDraft(w,id='',mode='edit'){
 if(w.sheet==='Lieux')return terrainDraft(w,id,mode);
 if(mode==='duplicate'&&masterEditor(w.module,w.sheet).duplicate===false)throw new Error(masterEditor(w.module,w.sheet).duplicateMessage??'Un cours est unique par objet. Créez un cours pour un autre objet ou réactivez le cours existant.');
 if(id&&w.rows.filter(e=>e.row.id===id).length>1)throw new Error('Identifiant ambigu. Consultez les fiches concernées depuis leurs outils.');
 if(id&&!w.rows.some(e=>e.row.id===id))throw new Error('Fiche indisponible. Actualisez le Master.');
 const source=id?w.rows.find(e=>e.row.id===id).row:null,copy=mode==='duplicate',row=source?{...source}:{...w.newRow};
 if(!source||copy){
  if(copy)Object.assign(row,w.newRow);
  for(const f of editorFields(w.module,w.session,false,w.sheet))if(f.initial!==undefined&&(!source||['publication','publication_publique','ouvert','qr_actif','visibilite','actif','a_quai'].includes(f.name)))row[f.name]=f.initial;
  if(copy&&w.sheet==='Personnages')for(const f of masterEditor(w.module,w.sheet).fields.filter(f=>f.virtual))row[f.name]=f.initial??'';
  if(copy&&w.sheet==='Connaissances'){row.personnages_initiaux='!EFFACER';row.qr_personnages='!EFFACER';}
  if(copy&&w.sheet==='Vaisseaux'){delete row.carburant_initial;delete row.port_initial;}
 }
 return {row,existing:!!source&&!copy,navigationInitialized:!copy&&w.rows.find(e=>e.row.id===id)?.navigationInitialized===true,mode:mode==='archive'?'archive':'edit'};
}
// Guided controls serialize into the existing spreadsheet cells, never a second domain format.
export function moduleFormValues(w,values){
 const result={...values};
 for(const f of masterEditor(w.module,w.sheet).fields.filter(f=>f.type==='checks')){
  if(values[`${f.name}__checks`]!=='1')continue;
  const prefix=`${f.name}__choice__`;
  result[f.name]=Object.entries(values).filter(([key,v])=>key.startsWith(prefix)&&v==='OUI').map(([key])=>key.slice(prefix.length)).join(';');
 }
 for(const f of masterEditor(w.module,w.sheet).fields.filter(f=>f.type==='levels')){
  if(values[`${f.name}__levels`]!=='1')continue;
  const prefix=`${f.name}__skill__`;
  const selected=Object.entries(values).filter(([key,v])=>key.startsWith(prefix)&&v==='OUI').map(([key])=>key.slice(prefix.length));
  result[f.name]=selected.map(id=>`${id}:${values[`${f.name}__level__${id}`]??''}`).join(';');
 }
 return result;
}
export function moduleRefreshDraft(w,draft,values){
 if(w.sheet==='Lieux')return terrainRefreshDraft(w,draft,values);
 const v=moduleFormValues(w,values);
 const row={...draft.row};
 for(const f of masterEditor(w.module,w.sheet).fields)if(Object.hasOwn(v,f.name)&&!(f.immutable&&draft.existing))row[f.name]=v[f.name];
 for(const f of masterEditor(w.module,w.sheet).fields)if(f.dependsOn&&row[f.dependsOn]!==draft.row[f.dependsOn])row[f.name]='';
 return {...draft,row,reason:v.reason??draft.reason};
}
export function moduleFormRow(w,draft,values){
 if(!w.editable||w.errors.length)throw new Error('Ce Master ne peut pas être modifié. Actualisez la destination.');
 values=moduleFormValues(w,values);
 const row={id:draft.row.id,operation:draft.mode==='archive'?'ARCHIVER':draft.existing?'MODIFIER':'CREER',version:draft.row.version};
 if(draft.mode==='archive'){if(draft.row.personnage_id)row.personnage_id=draft.row.personnage_id;if(draft.row.groupe_id)row.groupe_id=draft.row.groupe_id;return row;}
 for(const f of draftFields(w,draft).filter(f=>!f.virtual)){
  if(!editorFieldVisible(f,{...draft.row,...values})){if(f.inactiveValue!==undefined)row[f.name]=f.inactiveValue;continue;}
  const v=f.immutable&&draft.existing?draft.row[f.name]:(values[f.name]??'');
  if(f.required&&!v.trim())throw new Error(`${f.label} : valeur obligatoire.`);
  if(v!==''||f.clear)row[f.name]=v===''?'!EFFACER':v;
 }
 if(masterEditor(w.module,w.sheet).identity&&!draft.existing&&!w.references.unpricedItems.some(i=>i.id===row.id))throw new Error('Choisissez un objet publié sans cours existant.');
 return row;
}
export function moduleEditorHtml(w,draft,readOnly=false){
 if(w.sheet==='Lieux')return terrainEditorHtml(w,draft,readOnly);
 const def=masterEditor(w.module,w.sheet),r=draft.row,archive=draft.mode==='archive',fields=draftFields(w,draft);

 return `<h2>${readOnly?'Consulter':archive?(def.archiveLabel??'Archiver'):draft.existing?'Modifier':'Créer'} · ${def.title}</h2><p>${def.note}</p><p>Identifiant : ${esc(r.id)} · version ${esc(r.version)}.</p>${button('Retour à la liste','moduleList')}<${readOnly?'div':'form data-master-form="moduleRow"'}>${archive?'<p>Le contenu sera fermé ou dépublié. Aucune donnée détenue ni aucun historique ne sera supprimé.</p>':masterFieldsHtml(w,draft,fields,readOnly)}${readOnly?'':`<label>Motif réservé aux organisateurs<textarea name="reason" maxlength="500" required>${esc(draft.reason??'')}</textarea></label><button class="primary">Vérifier les changements</button>`}</${readOnly?'div':'form'}><p data-master-status role="status" aria-live="polite"></p>`;
}

export function moduleFormSheets(w,draft,values){
 if(w.sheet==='Lieux')return terrainFormSheets(w,draft,values);
 const row=moduleFormRow(w,draft,values);
 return {Meta:w.meta,[w.sheet]:[row],...(w.sheet==='Personnages'?characterCreationSheets(row,moduleFormValues(w,values)):{})};
}
