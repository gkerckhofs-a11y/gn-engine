import {masterEditor,masterEditorsFor,editorFields,editorFieldVisible} from '../src/shared/master-editors.mjs';
import {escapeHtml as esc} from './groups.mjs';
const button=(label,action,attrs='')=>`<button type="button" class="quiet" data-master-action="${action}" ${attrs}>${label}</button>`;
export function filteredMasterRows(w,query='',state='all'){
 const q=query.trim().toLocaleLowerCase('fr');
 return w.rows.filter(r=>(state==='all'||r.state===state)&&`${r.title} ${r.ownerLabel} ${r.row.id}`.toLocaleLowerCase('fr').includes(q));
}
export function moduleMasterSheets(w,rows=w.rows){
 if(w.errors.length)throw new Error(w.errors.join(' '));
 return {Meta:w.meta,[w.sheet]:rows.map(({row,archived})=>archived?{id:row.id,operation:'ARCHIVER',version:row.version,...(row.personnage_id?{personnage_id:row.personnage_id}:{})}:row)};
}
export function moduleListHtml(w,query='',state='all'){
 const def=masterEditor(w.module,w.sheet),rows=filteredMasterRows(w,query,state),usable=!w.errors.length;
 const editors=masterEditorsFor(w.module),navigation=editors.length>1?`<nav class="row" aria-label="Feuilles Master">${editors.map(e=>button(esc(e.title),'moduleSheet',`data-sheet="${e.sheet}" ${e.sheet===w.sheet?'aria-current="page" disabled':''}`)).join('')}</nav>`:'';
 return `${navigation}<h2>Master · ${def.title}</h2><p>${def.note}</p><p>${w.editable?'Créez, modifiez ou dupliquez une fiche, puis relisez l’aperçu avant confirmation.':'Lecture et export uniquement : la session a quitté la préparation initiale.'}</p><p>Export limité à <strong>${def.sheet}</strong>. Les autres contenus du module conservent leurs outils actuels.</p>${w.errors.length?`<p class="error-panel">${w.errors.map(esc).join('<br>')}</p>`:''}<form data-master-form="moduleFilter"><label>Rechercher un nom, un personnage ou un identifiant<input name="query" value="${esc(query)}"></label><label>État<select name="state">${[['all','Tous'],['active','Publiés ou ouverts'],['draft','Brouillons ou fermés'],['archived','Archivés']].map(([v,l])=>`<option value="${v}" ${v===state?'selected':''}>${l}</option>`).join('')}</select></label><button class="quiet">Filtrer</button></form><p>${rows.length} / ${w.rows.length} fiches affichées.</p><div class="row">${w.editable&&usable?button('Créer une fiche','moduleEdit'):''}${usable?button('Exporter les fiches affichées (.xlsx)','moduleExport'):''}</div><div class="stack">${rows.map(r=>`<article class="panel"><h3>${esc(r.title)}</h3><p>${esc(r.ownerLabel)} · ${esc(r.row.id)} · ${r.state==='archived'?'Archivé':r.state==='active'?'Publié / ouvert':'Brouillon / fermé'}</p>${button('Consulter','moduleView',`data-id="${esc(r.row.id)}"`)}${w.editable&&usable?button(r.archived?'Modifier / réactiver':'Modifier','moduleEdit',`data-id="${esc(r.row.id)}"`)+button('Dupliquer en brouillon','moduleDuplicate',`data-id="${esc(r.row.id)}"`)+(r.archived?'':button(def.archiveLabel??'Archiver','moduleArchive',`data-id="${esc(r.row.id)}"`)):''}</article>`).join('')||'<p>Aucune fiche ne correspond à ce filtre.</p>'}</div><p data-master-status role="status" aria-live="polite"></p>`;
}
export function moduleDraft(w,id='',mode='edit'){
 if(id&&w.rows.filter(e=>e.row.id===id).length>1)throw new Error('Identifiant ambigu. Consultez les objectifs depuis leur fiche personnage.');
 if(id&&!w.rows.some(e=>e.row.id===id))throw new Error('Fiche indisponible. Actualisez le Master.');
 const source=id?w.rows.find(e=>e.row.id===id).row:null,copy=mode==='duplicate',row=source?{...source}:{...w.newRow};
 if(!source||copy){
  if(copy)Object.assign(row,w.newRow);
  for(const f of editorFields(w.module,w.session,false,w.sheet))if(f.initial!==undefined&&(!source||['publication','publication_publique','ouvert','qr_actif','visibilite'].includes(f.name)))row[f.name]=f.initial;
  if(copy&&w.sheet==='Connaissances'){row.personnages_initiaux='!EFFACER';row.qr_personnages='!EFFACER';}
 }
 return {row,existing:!!source&&!copy,mode:mode==='archive'?'archive':'edit'};
}
// Guided controls serialize into the existing spreadsheet cells, never a second domain format.
export function moduleFormValues(w,values){
 const result={...values};
 for(const f of masterEditor(w.module,w.sheet).fields.filter(f=>f.type==='levels')){
  if(values[`${f.name}__levels`]!=='1')continue;
  const prefix=`${f.name}__skill__`;
  const selected=Object.entries(values).filter(([key,v])=>key.startsWith(prefix)&&v==='OUI').map(([key])=>key.slice(prefix.length));
  result[f.name]=selected.map(id=>`${id}:${values[`${f.name}__level__${id}`]??''}`).join(';');
 }
 return result;
}
export function moduleRefreshDraft(w,draft,values){
 const v=moduleFormValues(w,values);
 const row={...draft.row};
 for(const f of masterEditor(w.module,w.sheet).fields)if(Object.hasOwn(v,f.name))row[f.name]=v[f.name];
 return {...draft,row,reason:v.reason??draft.reason};
}
export function moduleFormRow(w,draft,values){
 if(!w.editable||w.errors.length)throw new Error('Ce Master ne peut pas être modifié. Actualisez la destination.');
 values=moduleFormValues(w,values);
 const row={id:draft.row.id,operation:draft.mode==='archive'?'ARCHIVER':draft.existing?'MODIFIER':'CREER',version:draft.row.version};
 if(draft.mode==='archive'){if(draft.row.personnage_id)row.personnage_id=draft.row.personnage_id;return row;}
 for(const f of editorFields(w.module,w.session,draft.existing,w.sheet)){
  if(!editorFieldVisible(f,{...draft.row,...values}))continue;
  const v=f.immutable&&draft.existing?draft.row[f.name]:(values[f.name]??'');
  if(f.required&&!v.trim())throw new Error(`${f.label} : valeur obligatoire.`);
  if(v!==''||f.clear)row[f.name]=v===''?'!EFFACER':v;
 }
 return row;
}
export function moduleEditorHtml(w,draft,readOnly=false){
 const def=masterEditor(w.module,w.sheet),r=draft.row,archive=draft.mode==='archive',fields=editorFields(w.module,w.session,draft.existing,w.sheet);
 const render=f=>{
  if(!editorFieldVisible(f,r))return '';
  const v=r[f.name]==='!EFFACER'?'':r[f.name]??'',disabled=readOnly||f.immutable&&draft.existing,attrs=`name="${f.name}" ${disabled?'disabled':''} ${f.required?'required':''} ${f.max?`maxlength="${f.max}"`:''} ${f.refresh?'data-master-refresh="fields"':''}`;
  let control;
  if(f.type==='levels'){
   const selected=new Map(v?v.split(';').map(s=>s.trim().split(':')):[]),choices=[...(w.references[f.ref]??[])];
   for(const id of selected.keys())if(!choices.some(x=>x.id===id))choices.push({id,name:'Référence indisponible'});
   return `<fieldset ${readOnly?'disabled':''}><legend>${esc(f.label)}</legend><p>${esc(f.help)}</p><input type="hidden" name="${f.name}__levels" value="1">${choices.map(x=>{
    const included=selected.has(x.id),label=`${x.name} (${x.id})${x.publication?` — ${x.publication==='PUBLISHED'?'Publiée':x.publication==='READY'?'Prête':'Brouillon'}`:''}`;
    return `<div class="two"><label class="check"><input type="checkbox" name="${f.name}__skill__${esc(x.id)}" value="OUI" data-master-refresh="levels" ${included?'checked':''}>${esc(label)}</label><label>Niveau<input aria-label="${esc(`Niveau de ${x.name}`)}" name="${f.name}__level__${esc(x.id)}" type="number" min="1" step="1" value="${esc(selected.get(x.id)??'')}" ${included?'required':'disabled'}></label></div>`;
   }).join('')||'<p>Aucune compétence disponible. Créez les compétences dans leur feuille avant de les sélectionner ici.</p>'}</fieldset>`;
  }else if(f.choices||f.ref){
   const choices=f.choices??[...(!f.required?[['',f.emptyLabel??'Aucun']]:[['','Choisir…']]),...(w.references[f.ref]??[]).map(x=>[x.id,`${x.name} (${x.id})`])];
   if(v&&!choices.some(([id])=>id===v))choices.push([v,`${v} — référence indisponible`]);
   control=`<select ${attrs}>${choices.map(([id,label])=>`<option value="${esc(id)}" ${id===v?'selected':''}>${esc(label)}</option>`).join('')}</select>`;
  }else if(f.type==='textarea')control=`<textarea ${attrs} rows="5">${esc(v)}</textarea>`;
  else control=`<input ${attrs} type="${f.type??'text'}" ${f.type==='number'?`min="${f.min??0}" step="1"`:''} value="${esc(v)}">`;
  return `<label>${esc(f.label)}${control}${f.help?`<small>${esc(f.help)}</small>`:''}</label>`;
 };
 return `<h2>${readOnly?'Consulter':archive?(def.archiveLabel??'Archiver'):draft.existing?'Modifier':'Créer'} · ${def.title}</h2><p>${def.note}</p><p>Identifiant : ${esc(r.id)} · version ${esc(r.version)}.</p>${button('Retour à la liste','moduleList')}<${readOnly?'div':'form data-master-form="moduleRow"'}>${archive?'<p>Le contenu sera fermé ou dépublié. Aucune donnée détenue ni aucun historique ne sera supprimé.</p>':fields.map(render).join('')}${readOnly?'':`<label>Motif réservé aux organisateurs<textarea name="reason" maxlength="500" required>${esc(draft.reason??'')}</textarea></label><button class="primary">Vérifier les changements</button>`}</${readOnly?'div':'form'}><p data-master-status role="status" aria-live="polite"></p>`;
}
