import {escapeHtml as esc} from './groups.mjs';
export const centralSnapshotErrors={
 CENTRAL_RESUME_UNAVAILABLE:'Ouvrez l’instantané de la dernière révision du brouillon suspendu.',
 CENTRAL_RESUME_INVALID_CHOICES:'Indiquez un choix pour chaque définition en conflit dans le dernier aperçu.',
 CENTRAL_RESUME_BLOCKED:'La reprise est bloquée. Ouvrez un nouvel aperçu et vérifiez les conflits ou les limites.',
 CENTRAL_RESUME_INVALID:'Les définitions ne peuvent pas être réunies dans un même brouillon. Vérifiez les limites des ateliers.',
 INVALID_CENTRAL_SNAPSHOT:'Vérifiez le motif et ouvrez un nouvel aperçu de l’instantané.',
 CENTRAL_SNAPSHOT_STALE:'La préparation ou les droits ont changé. Ouvrez un nouvel aperçu.',
 CENTRAL_SNAPSHOT_LIMIT:'L’instantané dépasse la limite de cette tranche (6 Mio ou 100 pages internes). Rien n’a été conservé partiellement.',
 CENTRAL_SNAPSHOT_INVALID_SOURCE:'Des définitions ou provenances sont incohérentes. Corrigez-les dans le contrôle central avant de conserver un instantané.',
 CENTRAL_SNAPSHOT_INVALID:'L’intégrité de cet instantané ne peut pas être confirmée. Son contenu n’est pas restitué.',
 CENTRAL_SNAPSHOT_NOT_FOUND:'Cet instantané n’est pas disponible dans cette campagne.',
};
export const centralSnapshotFile=d=>JSON.stringify({format:'gn-engine-central-snapshot',formatVersion:1,manifest:d.header,changes:d.changes,report:d.report},null,2);
export function createCentralSnapshotUi({button,link}){
 const preview=d=>`<h2>Conserver un instantané du brouillon</h2><p>Révision ${d.draftRevision} · ${d.records} définitions · ${d.report.totals.diagnostics} diagnostics conservés.</p><p>Les contenus privés des sept ateliers et le rapport seront conservés ensemble. Les références encore à corriger restent signalées. Le brouillon demeure modifiable.</p><p>Cet instantané ne publie rien, n’active aucune session et ne remplace pas une sauvegarde complète des dossiers, droits et données de jeu.</p><form data-form="centralSnapshotCapture" data-cid="${esc(d.campaignId)}" data-draft="${d.draftRevision}"${d.draftId?` data-draft-id="${esc(d.draftId)}"`:""} data-confirmation="${esc(d.confirmation)}"><label>Motif<input name="reason" maxlength="500" required></label><label class="check"><input type="checkbox" name="confirmed" required>Je confirme la conservation de cette révision privée.</label><button class="primary">Conserver l’instantané</button></form>`;
 const list=d=>`<h1>Instantanés du brouillon central</h1>${link('Retour aux ateliers',`central/${d.campaignId}`,'button quiet')}<p>Copies privées de préparation, distinctes des versions publiées. Le rapport d’un instantané décrit l’état au moment de sa capture.</p>${d.snapshots.map(s=>`<section class="panel"><h2>Brouillon ${s.draftRevision} · ${esc(new Date(s.createdAt).toLocaleString('fr-FR'))}</h2><p>${s.records} définitions · ${s.diagnostics} diagnostics.</p><p>${esc(s.reason)}</p>${link('Relire cet instantané',`central-snapshot/${d.campaignId}/${s.id}${d.draftId?`/${d.draftId}`:""}`,'button primary')}</section>`).join('')||'<p>Aucun instantané conservé.</p>'}${d.hasMore?'<p>Seuls les vingt instantanés les plus récents sont affichés. Les précédents restent accessibles par leur lien conservé.</p>':''}`;
 const conflictLabel=c=>`${esc(c.workshop)} · ${esc(c.type)} · ${esc(c.entityId)}`;
 const resumeChoices=d=>{
  const heading='<p>Ces définitions diffèrent. Choisissez laquelle garder pour chaque ligne. Le choix porte sur la définition entière.</p>';
  if(!d.review||d.conflicts.length>200)return heading+`<ul>${d.conflicts.map(c=>`<li>${conflictLabel(c)}</li>`).join('')}</ul><p>La reprise ne peut pas être confirmée dans cet aperçu.</p>`;
  const payload={campaignId:d.campaignId,draftId:d.draftId,snapshotId:d.snapshotId,review:d.review,conflicts:d.conflicts};
  return `${heading}<form data-form="centralResumeChoices" data-payload="${esc(JSON.stringify(payload))}">
   ${d.conflicts.map((c,i)=>`<label>${conflictLabel(c)}<select name="choice_${i}" required>
   <option value="">Choisir</option><option value="KEEP_CURRENT">Garder la définition courante</option>
   <option value="USE_SUSPENDED">Utiliser la définition de l’instantané</option></select></label>`).join('')}
   <button class="primary">Vérifier les choix</button>
  </form>`;
 };
 const resumePreview=d=>{
  const title=`<h2>Reprendre le brouillon suspendu sur le Master V${esc(d.activeVersionNumber)}</h2><p>${d.restored} modification(s) à reprendre · ${d.unchanged} déjà présente(s)${d.kept?` · ${d.kept} définition(s) courante(s) conservée(s)`:''}.</p>`;
  if(!d.canResume){
   const detail=d.blocked==='CONFLICT'?resumeChoices(d):
    d.blocked==='LIMIT'?'<p>La reprise dépasse la capacité de cette opération.</p>':'<p>Aucune modification à reprendre.</p>';
   return title+detail;
  }
  const choices=d.resolutions?`<ul>${d.resolutions.map(c=>`<li>${esc(c.type)} · ${esc(c.entityId)} · ${c.choice==='KEEP_CURRENT'?'Définition courante conservée':'Définition de l’instantané reprise'}</li>`).join('')}</ul>`:'';
  const selected=d.resolutions?{review:d.review,resolutions:d.resolutions}:{};
  return `${title}<p>Les choix affichés et les modifications compatibles seront appliqués au brouillon courant. Les versions publiées restent en vigueur.</p>${choices}
  ${d.diagnostics?`<p>${d.diagnostics} diagnostic(s) à consulter dans le contrôle du brouillon après la reprise.</p>`:''}
  <form data-form="centralResume" data-cid="${esc(d.campaignId)}" data-id="${esc(d.snapshotId)}" data-draft-id="${esc(d.draftId)}" data-confirmation="${esc(d.confirmation)}" data-selections="${esc(JSON.stringify(selected))}">
   <label>Motif de la reprise<input name="reason" maxlength="500" required></label>
   <label class="check"><input type="checkbox" name="confirmed" required> Je confirme la reprise de ces modifications.</label>
   <button class="primary">Reprendre l’édition</button>
  </form>`;
 };
 const detail=d=>{const draftId=d.header.source.baseVersionId?d.header.source.draftId:null;return `<section class="panel gold"><h1>Instantané conservé · brouillon ${d.snapshot.draftRevision}</h1><p>${esc(d.snapshot.reason)} · ${esc(new Date(d.snapshot.createdAt).toLocaleString('fr-FR'))}</p><p>${d.draftSuspended?'Le brouillon a été suspendu après un retour de version. Cette copie reste disponible en lecture seule.':d.sourceIsCurrentRevision?'La révision du brouillon est encore identique. Cela ne certifie pas les droits, dossiers ou conditions actuels.':`Le brouillon est maintenant à la révision ${d.currentDraftRevision}. Cette copie conserve l’ancienne révision.`}</p><p>Le rapport ci-dessous est historique. Les définitions et le rapport ont été relus et leurs empreintes vérifiées. Aucune publication ni restauration n’est exécutée. Les liens vers les ateliers ouvrent le brouillon courant ; le téléchargement conserve les textes exacts de cette copie.</p>${button('Télécharger la copie privée','centralSnapshotDownload',`data-cid="${esc(d.snapshot.campaignId)}" data-id="${esc(d.snapshot.id)}"${draftId?` data-draft-id="${esc(draftId)}"`:""}`,'primary')}${d.canResumeDraft?button('Préparer la reprise d’édition','centralResumePreview',`data-cid="${esc(d.snapshot.campaignId)}" data-id="${esc(d.snapshot.id)}" data-draft-id="${esc(draftId)}"`,'quiet'):''}${link('Tous les instantanés',`central-snapshots/${d.snapshot.campaignId}${draftId?`/${draftId}`:""}`,'button quiet')}<p>Le fichier JSON contient les récits et secrets des ateliers. Il sert à la consultation technique. La reprise d’édition depuis cet écran utilise la copie conservée dans la campagne.</p><details><summary>Empreinte de l’instantané</summary><p>${esc(d.snapshot.manifestDigest)}</p></details></section>`;};
 return {preview,list,detail,resumePreview};
}
