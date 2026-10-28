import {terrainEditor,terrainActionFields,terrainRewardFields,terrainKinds,terrainActionLabels} from '../src/shared/master-terrain-editor.mjs';
import {editorFieldVisible} from '../src/shared/master-editors.mjs';
import {masterFieldsHtml} from './master-fields.mjs';
import {escapeHtml as esc} from './groups.mjs';
const button=(label,action,attrs='')=>`<button type="button" class="quiet" data-master-action="${action}" ${attrs}>${label}</button>`;
const defaults=fields=>Object.fromEntries(fields.filter(f=>f.initial!==undefined).map(f=>[f.name,f.initial]));
const newRow=id=>({id,operation:'CREER',version:'1'});
const actionPrefix=kind=>`action_${kind}__`;
const rewardPrefix=id=>`reward_${id}__`;
export function terrainDraft(w,id='',mode='edit'){
 const source=id?w.rows.find(x=>x.row.id===id):null;if(id&&!source)throw new Error('Lieu indisponible. Actualisez le Master.');
 const copy=mode==='duplicate',existing=!!source&&!copy,row=source?{...source.row}:{...w.newRow,...defaults(terrainEditor.fields)};
 if(copy)Object.assign(row,w.newRow,{publication:'DRAFT'});
 const actions=Object.fromEntries(['SEARCH','SABOTAGE','REPAIR'].map(kind=>{
  const previous=source?.actions.find(a=>a.type===kind);
  return [kind,{...defaults(terrainActionFields),...previous,...(!existing?newRow(`${kind.toLowerCase()}-${row.id}`):{}),lieu_id:row.id,type:kind}];
 }));
 const rewards=(source?.rewards??[]).map((r,i)=>({row:{...r,...(copy?newRow(`reward-${row.id}-${i}`):{}),lieu_id:row.id},existing,removed:false}));
 const d={row,actions,rewards,existing,mode:mode==='archive'?'archive':'edit',rewardSeed:w.newRow.id,nextReward:rewards.length};
 if(!source)appendReward(d);return d;
}
function appendReward(d){d.rewards.push({row:{...newRow(`reward-${d.rewardSeed}-${d.nextReward++}`),lieu_id:d.row.id,...defaults(terrainRewardFields)},existing:false,removed:false});}
function refreshRow(row,fields,values,prefix='',existing=false){
 const next={...row};for(const f of fields)if(!(f.immutable&&existing)&&Object.hasOwn(values,prefix+f.name))next[f.name]=values[prefix+f.name];return next;
}
export function terrainRefreshDraft(w,d,values){
 return {...d,row:refreshRow(d.row,terrainEditor.fields,values,'',d.existing),reason:values.reason??d.reason,
  actions:Object.fromEntries(Object.entries(d.actions).map(([kind,r])=>[kind,refreshRow(r,terrainActionFields,values,actionPrefix(kind))])),
  rewards:d.rewards.map(r=>({...r,row:w.session&&d.existing?r.row:refreshRow(r.row,terrainRewardFields,values,rewardPrefix(r.row.id))}))};
}
export function terrainRewardAction(w,d,action,id,values){
 if(!w.editable||w.errors.length||d.mode==='archive'||w.session&&d.existing)throw new Error('Les récompenses de ce lieu ne peuvent pas être modifiées ici.');
 const next=terrainRefreshDraft(w,d,values);
 if(action==='terrainAddReward'){
  if(next.rewards.filter(r=>!r.removed).length>=20)throw new Error('Maximum 20 récompenses par lieu.');appendReward(next);
 }else{
  const reward=next.rewards.find(r=>r.row.id===id);if(!reward)throw new Error('Récompense indisponible.');
  if(action==='terrainRestoreReward'&&next.rewards.filter(r=>!r.removed).length>=20)throw new Error('Maximum 20 récompenses par lieu.');
  reward.removed=action==='terrainRemoveReward';
 }
 return next;
}
function formRow(row,fields,existing){
 const result={id:row.id,operation:existing?'MODIFIER':'CREER',version:row.version};
 for(const f of fields){
  if(!editorFieldVisible(f,row)){if(f.inactiveValue!==undefined)result[f.name]=f.inactiveValue;continue;}
  const value=row[f.name]==='!EFFACER'?'':row[f.name]??'';
  if(f.required&&!value.trim())throw new Error(`${f.label} : valeur obligatoire.`);
  if(value!==''||f.clear)result[f.name]=value===''?'!EFFACER':value;
 }
 return result;
}
export function terrainFormSheets(w,d,values){
 if(!w.editable||w.errors.length)throw new Error('Ce Master ne peut pas être modifié. Actualisez la destination.');
 const next=terrainRefreshDraft(w,d,values),id=next.row.id;
 if(d.mode==='archive')return {Meta:w.meta,Lieux:[{id,operation:'ARCHIVER',version:d.row.version}]};
 const Lieux=[formRow(next.row,terrainEditor.fields,d.existing)],ActionsTerrain=terrainKinds(next.row.type).map(kind=>({
  ...formRow(next.actions[kind],terrainActionFields,d.existing),lieu_id:id,type:kind
 }));
 const Recompenses=next.row.type==='SEARCH'&&!(w.session&&d.existing)?next.rewards.flatMap(r=>{
  if(r.removed)return r.existing?[{id:r.row.id,operation:'ARCHIVER',version:r.row.version,lieu_id:id}]:[];
  return [{...formRow(r.row,terrainRewardFields,r.existing),lieu_id:id}];
 }):[];
 if(next.row.type==='SEARCH'&&next.rewards.every(r=>r.removed))throw new Error('Une fouille exige au moins une récompense.');
 return {Meta:w.meta,Lieux,ActionsTerrain,Recompenses};
}
export function terrainMasterSheets(w,rows=w.rows){
 if(w.errors.length)throw new Error(w.errors.join(' '));
 return {Meta:w.meta,Lieux:rows.map(r=>r.archived?{id:r.row.id,operation:'ARCHIVER',version:r.row.version}:r.row),ActionsTerrain:rows.flatMap(r=>r.actions),Recompenses:rows.flatMap(r=>r.rewards)};
}
export function terrainEditorHtml(w,d,readOnly=false){
 const archive=d.mode==='archive',locked=w.session&&d.existing;
 const sections=archive?'<p>Le lieu sera dépublié. Ses actions, récompenses et états de jeu restent conservés.</p>':
  masterFieldsHtml(w,d,terrainEditor.fields,readOnly)+terrainKinds(d.row.type).map(kind=>`<fieldset><legend>Action · ${terrainActionLabels[kind]}</legend><p>Identifiant : ${esc(d.actions[kind].id)}</p>${masterFieldsHtml(w,{row:d.actions[kind],existing:d.existing},terrainActionFields,readOnly,actionPrefix(kind))}</fieldset>`).join('')+
  (d.row.type==='SEARCH'?`<h3>Récompenses de la fouille</h3>${locked?'<p>Définitions initiales en lecture seule. Le stock restant n’est pas affiché ici et ne sera pas recréé. Utilisez le réapprovisionnement MJ pour ajouter du stock.</p>':''}${d.rewards.map(r=>`<fieldset><legend>Récompense · ${esc(r.row.id)}</legend>${r.removed?'<p>Retrait prévu à la confirmation.</p>':masterFieldsHtml(w,{row:r.row,existing:r.existing},terrainRewardFields,readOnly||locked,rewardPrefix(r.row.id))}${readOnly||locked?'':button(r.removed?'Annuler le retrait':'Retirer cette récompense',r.removed?'terrainRestoreReward':'terrainRemoveReward',`data-id="${esc(r.row.id)}"`)}</fieldset>`).join('')}${readOnly||locked?'':button('Ajouter une récompense','terrainAddReward')}`:'');
 return `<h2>${readOnly?'Consulter':archive?'Archiver':d.existing?'Modifier':'Créer'} · Lieu, actions et récompenses</h2><p>${terrainEditor.note}</p><p>Identifiant du lieu : ${esc(d.row.id)} · version ${esc(d.row.version)}.</p>${button('Retour à la liste','moduleList')}<${readOnly?'div':'form data-master-form="moduleRow"'}>${sections}${readOnly?'':`<label>Motif réservé aux organisateurs<textarea name="reason" maxlength="500" required>${esc(d.reason??'')}</textarea></label><button class="primary">Vérifier les changements</button>`}</${readOnly?'div':'form'}><p data-master-status role="status" aria-live="polite"></p>`;
}
