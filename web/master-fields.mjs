import {editorFieldVisible} from '../src/shared/master-editors.mjs';
import {escapeHtml as esc,permissionLabels} from './groups.mjs';
const referenceName=(f,row)=>typeof f.ref==='string'?f.ref:f.ref?.values[row[f.ref.field]];
export function masterFieldsHtml(w,draft,fields,readOnly=false,prefix=''){
 const r=draft.row;
 const render=f=>{
  if(!editorFieldVisible(f,r))return '';
  const v=r[f.name]==='!EFFACER'?'':r[f.name]??'',disabled=readOnly||f.immutable&&draft.existing,attrs=`name="${prefix}${f.name}" ${disabled?'disabled':''} ${f.required?'required':''} ${f.max?`${f.type==='number'?'max':'maxlength'}="${f.max}"`:''} ${f.refresh?'data-master-refresh="fields"':''}`;
  let control;
  if(f.type==='checks'){
   const selected=new Set(v?v.split(';'):[]),choices=[...(w.references[f.ref]??[])];
   for(const id of selected)if(!choices.some(x=>x.id===id))choices.push({id,name:'Droit indisponible'});
   return `<fieldset ${readOnly?'disabled':''}><legend>${esc(f.label)}</legend><p>${esc(f.help)}</p><input type="hidden" name="${prefix}${f.name}__checks" value="1">${choices.map(x=>`<label class="check"><input type="checkbox" name="${prefix}${f.name}__choice__${esc(x.id)}" value="OUI" ${selected.has(x.id)?'checked':''}>${esc(permissionLabels[x.id]??x.name)}</label>`).join('')}</fieldset>`;
  }else if(f.type==='levels'){
   const selected=new Map(v?v.split(';').map(s=>s.trim().split(':')):[]),choices=[...(w.references[f.ref]??[])];
   for(const id of selected.keys())if(!choices.some(x=>x.id===id))choices.push({id,name:'Référence indisponible'});
   return `<fieldset ${readOnly?'disabled':''}><legend>${esc(f.label)}</legend><p>${esc(f.help)}</p><input type="hidden" name="${prefix}${f.name}__levels" value="1">${choices.map(x=>{
    const included=selected.has(x.id),label=`${x.name} (${x.id})${x.publication?` — ${x.publication==='PUBLISHED'?'Publiée':x.publication==='READY'?'Prête':'Brouillon'}`:''}`;
    return `<div class="two"><label class="check"><input type="checkbox" name="${prefix}${f.name}__skill__${esc(x.id)}" value="OUI" data-master-refresh="levels" ${included?'checked':''}>${esc(label)}</label><label>${esc(f.valueLabel??'Niveau')}<input aria-label="${esc(`${f.valueLabel??'Niveau'} de ${x.name}`)}" name="${prefix}${f.name}__level__${esc(x.id)}" type="number" min="${f.min??1}" step="1" value="${esc(selected.get(x.id)??'')}" ${included?'required':'disabled'}></label></div>`;
   }).join('')||`<p>${esc(f.emptyLabel??'Aucune compétence disponible. Créez les compétences dans leur feuille avant de les sélectionner ici.')}</p>`}</fieldset>`;
  }else if(f.choices||f.ref){
   const ref=!draft.existing&&f.createRef?f.createRef:referenceName(f,r);
   const choices=f.choices??[...(!f.required?[['',f.emptyLabel??'Aucun']]:[['','Choisir…']]),...(w.references[ref]??[]).map(x=>[x.id,`${x.name} (${x.id})`])];
   if(v&&!choices.some(([id])=>id===v))choices.push([v,`${v} — référence indisponible`]);
   control=`<select ${attrs}>${choices.map(([id,label])=>`<option value="${esc(id)}" ${id===v?'selected':''}>${esc(label)}</option>`).join('')}</select>`;
  }else if(f.type==='textarea')control=`<textarea ${attrs} rows="5">${esc(v)}</textarea>`;
  else control=`<input ${attrs} type="${f.type??'text'}" ${f.type==='number'?`min="${f.min??0}" step="1"`:''} value="${esc(v)}">`;
  return `<label>${esc(f.label)}${control}${f.help?`<small>${esc(f.help)}</small>`:''}</label>`;
 };
 return fields.map(render).join('');
}
