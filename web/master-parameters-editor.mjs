import {parameterEditors,parameterFields,parameterRows} from '../src/shared/master-parameters-editor.mjs';
import {masterFieldsHtml} from './master-fields.mjs';
import {escapeHtml as esc} from './groups.mjs';
const button=(label,action)=>`<button type="button" class="quiet" data-master-action="${action}">${label}</button>`;
export function parameterSheets(w,values=w.values,editing=false){
 if(w.session&&parameterEditors[w.module].scenarioOnly)throw new Error('Ces paramètres sont réservés au scénario.');
 if(editing&&!w.editable)throw new Error('Ce Master ne peut pas être modifié.');
 const rows=parameterRows(w.module,w.session,values);
 if(editing){
  for(const [group,keys] of [['pa',['pa_actifs','pa_niveau_1','pa_niveau_2','pa_renouvellement_minutes','pa_cout','pa_recuperation_secondes','pa_recuperation_patient_secondes']],['health',['sante_active','pv_max_defaut']],['money',['economie_active','monnaie_nom','monnaie_unite']]]){
   if(!w.configured[group]&&rows.some(r=>keys.includes(r.cle))&&keys.some(k=>!rows.some(r=>r.cle===k)))throw new Error('Première configuration : renseignez tous les champs du groupe de paramètres, y compris les valeurs nulles autorisées.');
  }
  if(!rows.length)throw new Error('Renseignez au moins un paramètre.');
 }
 return {Meta:w.meta,Parametres:rows};
}
export function parameterListHtml(w,navigation){
 const def=parameterEditors[w.module];
 return `${navigation}<h2>${esc(def.title)}</h2><p>${esc(def.note)}</p><p>Export limité aux paramètres renseignés de ce module et de cette destination.</p>${w.editable?button('Modifier les paramètres','moduleEdit'):'<p>Lecture et export uniquement : la session a quitté la préparation initiale.</p>'}${button('Exporter les paramètres (.xlsx)','moduleExport')}<dl>${parameterFields(w.module,w.session).map(f=>`<dt>${esc(f.label)}</dt><dd>${esc(w.values[f.name]||'Non renseigné')}</dd>`).join('')}</dl><p data-master-status role="status" aria-live="polite"></p>`;
}
export function parameterEditorHtml(w,draft,readOnly){
 const def=parameterEditors[w.module];
 return `<h2>${esc(def.title)}</h2><p>${esc(def.note)}</p>${button('Retour à la liste','moduleList')}<${readOnly?'div':'form data-master-form="moduleRow"'}>${masterFieldsHtml(w,draft,parameterFields(w.module,w.session),readOnly)}${readOnly?'':`<label>Motif réservé aux organisateurs<textarea name="reason" maxlength="500" required>${esc(draft.reason??'')}</textarea></label><button class="primary">Vérifier les changements</button>`}</${readOnly?'div':'form'}><p data-master-status role="status" aria-live="polite"></p>`;
}
