import {escapeHtml as esc} from './groups.mjs';
import {archiveFileLimit,readScenarioArchive,packScenarioArchive,archiveBase64,archiveBytes} from './scenario-archive-format.mjs';
export const archiveErrors={INVALID_SCENARIO_PACKAGE:'Ce fichier de scénario est invalide ou contient des références manquantes. Utilisez un export GN Engine.',SCENARIO_PACKAGE_TOO_LARGE:'Ce scénario dépasse les limites du transfert : 128 Mo, 500 fiches et 250 images, avec 2 Mo de texte et de paramètres.',SCENARIO_FILE_MISMATCH:'Une image ou le fichier sélectionné ne correspond pas à cet export. L’import est arrêté.',SCENARIO_IMPORT_INCOMPLETE:'Certaines images restent à importer. Relancez les fichiers en échec.',SCENARIO_IMPORT_CLOSED:'Cet import est déjà terminé ou annulé. Actualisez la liste.'};
const button=(label,action,extra='',kind='quiet')=>`<button type="button" class="${kind}" data-archive-action="${action}" ${extra}>${label}</button>`;
export const archiveImportButton=()=>button('Importer un scénario','openImport');
export const archiveExportButton=()=>button('Exporter le scénario','openExport');
const counts=s=>`<div class="stats">${Object.entries(s.counts).map(([k,n])=>`<div class="stat"><strong>${n}</strong><span>${{characters:'Personnages',groups:'Groupes',knowledge:'Informations',skills:'Compétences',classes:'Classes',items:'Objets',personProfiles:'Soins et fouilles de personnages',fieldTargets:'Lieux et installations',warehouses:'Entrepôts',ships:'Vaisseaux',routes:'Routes',commodityPrices:'Cours',priceEvents:'Événements économiques'}[k]}</span></div>`).join('')}<div class="stat"><strong>${s.images}</strong><span>Images · ${(s.bytes/1048576).toFixed(1)} Mo</span></div></div>`;
export function createArchiveController({api,mutate,notice,getScenario,go,document:doc=document}){
  let generation=0,state=null,downloadUrl=null;const dialog=doc.createElement('dialog');dialog.className='archive-dialog';doc.body.append(dialog);
  const message=e=>archiveErrors[e.code]??e.message;
  function clear(){generation++;state=null;if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=null;dialog.close();dialog.innerHTML='';}
  const current=(n,s)=>generation===n&&(!s||state===s);
  function show(html){dialog.innerHTML=button('Fermer','close','','quiet small close')+html;if(!dialog.open)dialog.showModal();}
  const progress=text=>{const el=dialog.querySelector('[data-archive-progress]');if(el)el.textContent=text;};
  async function openImport(){clear();const n=generation;show('<h2>Importer un scénario</h2><p>Chargement…</p>');
    const d=await api('listScenarioImports');if(!current(n))return;
    show(`<h2>Importer un scénario</h2><p>Choisissez un fichier <strong>.gnscenario.zip</strong> exporté depuis GN Engine (128 Mo maximum).</p><p>Vous pourrez vérifier son contenu avant de créer un nouveau scénario.</p><label>Nouvel import ou reprise<select data-archive-resume><option value="">Créer un nouvel import</option>${d.imports.map(p=>`<option value="${esc(p.id)}">Reprendre : ${esc(p.title)}</option>`).join('')}</select></label>${button('Annuler cet import','cancelImport','disabled data-archive-cancel')}<label>Fichier de scénario<input type="file" accept=".zip" data-archive-file></label><p data-archive-progress role="status" aria-live="polite"></p><div data-archive-preview></div>`);
  }
  function openExport(){const s=getScenario();if(!s)return;clear();state={scenario:s};show(`<h2>Exporter « ${esc(s.title)} »</h2><form data-archive-form="export"><label>Contenu à conserver<select name="version"><option value="">État actuel · révision ${s.revision}</option>${s.versions.map(v=>`<option value="${esc(v.id)}">Version du ${new Date(v.createdAt).toLocaleString('fr-FR')} · révision ${v.sourceRevision}</option>`).join('')}</select></label><p>Le fichier comprend les fiches, droits de fiction, dotations et images de cet état. Les sessions, inscriptions, comptes réels et historiques de modifications sont exclus.</p><label class="check"><input type="checkbox" required>Je comprends que ce fichier contient aussi les secrets et notes MJ ; je le conserverai dans un endroit privé.</label><button class="primary" type="submit">Préparer le fichier</button></form><p data-archive-progress role="status" aria-live="polite"></p><div data-archive-result></div>`);}
  async function selectFile(file,resumeId){
    state=null;const n=++generation;requireFile(file);progress('Vérification du fichier et de ses images…');
    const bytes=new Uint8Array(await file.arrayBuffer());if(!current(n))return;const bundle=await readScenarioArchive(bytes);if(!current(n))return;
    const prior=resumeId?await api('scenarioImportStatus',{importId:resumeId}):null;if(!current(n))return;
    const title=prior?.title??`${bundle.manifest.scenario?.title??'Scénario'} — copie`.slice(0,150);
    const preview=await api('prepareScenarioImport',{manifest:bundle.manifest,title});if(!current(n))return;
    if(prior&&(prior.digest!==preview.digest||prior.status!=='OPEN'))throw Object.assign(new Error(archiveErrors.SCENARIO_FILE_MISMATCH),{code:'SCENARIO_FILE_MISMATCH'});
    state={bundle,preview,title,importId:prior?.id??null,completed:new Set(prior?.completed??[]),running:false};progress('Fichier vérifié. Vérifiez le récapitulatif.');
    dialog.querySelector('[data-archive-preview]').innerHTML=`${counts(preview.summary)}<form data-archive-form="import"><label>Titre du nouveau scénario<input name="title" maxlength="150" value="${esc(title)}" ${prior?'readonly':''} required></label><p>Les niveaux de publication, secrets, destinataires et permissions des groupes sont conservés. Une nouvelle session devra ensuite être créée pour ouvrir le jeu.</p><p>Les images sont copiées dans votre médiathèque. En cas d’interruption, choisissez cet import dans la liste et sélectionnez à nouveau le même fichier.</p><label class="check"><input type="checkbox" required>Je confirme la création de ce nouveau scénario avec ses images et informations privées.</label><button type="submit" class="primary">${prior?'Reprendre l’import':'Importer le scénario'}</button></form><div data-archive-rows></div>`;
    paintRows();
  }
  function requireFile(file){if(!file||file.size>archiveFileLimit)throw Object.assign(new Error(archiveErrors.SCENARIO_PACKAGE_TOO_LARGE),{code:'SCENARIO_PACKAGE_TOO_LARGE'});}
  function paintRows(){const root=dialog.querySelector('[data-archive-rows]');if(!root||!state?.bundle)return;root.innerHTML=`<ul>${state.bundle.manifest.images.map(i=>`<li>${esc(i.name)} — ${state.completed.has(i.id)?'importée':esc(state.errors?.[i.id]??'à importer')}</li>`).join('')}</ul>`;}
  async function runImport(title){const s=state,n=generation;if(!s||s.running)return;s.running=true;s.errors={};
    try{
      if(!s.importId){const p=await api('prepareScenarioImport',{manifest:s.bundle.manifest,title});if(!current(n,s))return;s.preview=p;s.title=title;
        const r=await mutate('beginScenarioImport',{manifest:s.bundle.manifest,title,confirmation:p.confirmation});if(!current(n,s))return;s.importId=r.id;}
      const status=await api('scenarioImportStatus',{importId:s.importId});if(!current(n,s))return;
      if(status.status==='COMMITTED'){notice('Scénario importé.');go(status.scenarioId);return;}
      s.completed=new Set(status.completed);
      for(const img of s.bundle.manifest.images){if(!current(n,s))return;if(s.completed.has(img.id))continue;
        progress(`Import des images : ${s.completed.size} / ${s.bundle.manifest.images.length} — ${img.name}`);
        try{await api('scenarioImportImage',{importId:s.importId,mediaId:img.id,data:archiveBase64(s.bundle.files[img.source.path])});if(!current(n,s))return;s.completed.add(img.id);}catch(e){if(!current(n,s))return;s.errors[img.id]=message(e);}paintRows();
      }
      if(s.completed.size!==s.bundle.manifest.images.length){progress('Import interrompu pour certains fichiers. Les réussites sont conservées ; relancez pour reprendre.');return;}
      progress('Vérification des références et création du scénario…');const result=await api('commitScenarioImport',{importId:s.importId});if(!current(n,s))return;notice('Scénario et images importés.');go(result.id);
    }finally{if(current(n,s)){s.running=false;const b=dialog.querySelector('[data-archive-form="import"] button[type="submit"]');if(b){b.disabled=false;b.textContent='Reprendre / terminer l’import';}}}
  }
  async function runExport(versionId){const s=state,n=generation;if(!s||s.running)return;s.running=true;
    try{progress('Préparation du scénario…');const d=await api('prepareScenarioExport',{scenarioId:s.scenario.id,...(versionId?{versionId}:{revision:s.scenario.revision})});if(!current(n,s))return;
      const files=Object.create(null);for(const [index,img] of d.manifest.images.entries()){
        progress(`Récupération des images : ${index+1} / ${d.manifest.images.length}`);const r=await api('mediaRead',{context:{mode:'library'},mediaId:img.id,variant:'original'});if(!current(n,s))return;
        const bytes=archiveBytes(r.data);if(r.mime!==img.source.mime||bytes.length!==img.source.bytes)throw Object.assign(new Error(archiveErrors.SCENARIO_FILE_MISMATCH),{code:'SCENARIO_FILE_MISMATCH'});files[img.source.path]=bytes;
      }
      const bytes=await packScenarioArchive(d.manifest,files);if(!current(n,s))return;
      if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));const name=(d.manifest.scenario.title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,60)||'scenario')+'.gnscenario.zip';
      progress('Fichier prêt. Téléchargez-le avant de fermer cette fenêtre.');dialog.querySelector('[data-archive-result]').innerHTML=`${counts(d.summary)}<a class="button primary" href="${downloadUrl}" download="${name}">Télécharger le scénario</a><p>Les images originales normalisées sont conservées ; les vignettes seront recréées lors de l’import.</p>`;
    }finally{if(current(n,s))s.running=false;}
  }
  doc.addEventListener('click',async e=>{const b=e.target.closest('[data-archive-action]');if(!b)return;try{if(b.dataset.archiveAction==='close')clear();else if(b.dataset.archiveAction==='cancelImport'){const id=dialog.querySelector('[data-archive-resume]').value;if(id&&confirm('Annuler cet import ? Les images déjà copiées resteront dans la médiathèque et pourront être mises en corbeille si elles sont inutilisées.')){const n=generation;await api('cancelScenarioImport',{importId:id});if(current(n))await openImport();}}else if(b.dataset.archiveAction==='openImport')await openImport();else if(b.dataset.archiveAction==='openExport')openExport();}catch(error){notice(message(error),true);}});
  dialog.addEventListener('change',async e=>{if(e.target.matches('[data-archive-resume]')){generation++;state=null;dialog.querySelector('[data-archive-cancel]').disabled=!e.target.value;dialog.querySelector('[data-archive-file]').value='';dialog.querySelector('[data-archive-preview]').innerHTML='';progress('Sélectionnez le fichier correspondant à cet import.');return;}if(!e.target.matches('[data-archive-file]'))return;try{dialog.querySelector('[data-archive-preview]').innerHTML='';await selectFile(e.target.files[0],dialog.querySelector('[data-archive-resume]').value);}catch(error){progress(message(error));}});
  dialog.addEventListener('submit',async e=>{const form=e.target.closest('[data-archive-form]');if(!form)return;e.preventDefault();const n=generation,b=form.querySelector('button[type="submit"]');b.disabled=true;try{const values=new FormData(form);if(form.dataset.archiveForm==='import')await runImport(String(values.get('title')));else await runExport(String(values.get('version')));}catch(error){if(current(n)){progress(message(error));notice(message(error),true);}}finally{if(current(n))b.disabled=false;}});
  dialog.addEventListener('cancel',e=>{e.preventDefault();clear();});
  return {clear,openImport,openExport};
}
