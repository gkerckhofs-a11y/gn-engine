import {escapeHtml as esc} from './groups.mjs';
import {admissionClasses} from '../src/shared/admission-rules.mjs';
const labels={
 INVALID_ADMISSION_RECORD:'Dossier incohérent : vérification technique requise, sans correction automatique.',
 INVALID_M2_DEFINITION:'Définition M2 invalide : vérifier son contenu et sa provenance.',
 ADMISSION_M2_LINK_BROKEN:'Le lien dossier/M2 est incohérent. Ne pas recréer une copie.',
 ADMISSION_M2_NOT_PREPARED:'Dossier approuvé sans fiche M2 : préparer la fiche depuis le dossier.',
 ADMISSION_M2_ARCHIVED:'Dossier approuvé lié à une fiche archivée : vérifier la décision avant restauration.',
 ADMISSION_M2_DIVERGED:'Identité ou choix différents : comparer le dossier et M2 avant rapprochement.',
 UNAPPROVED_M2_ACTIVE:'Dossier non approuvé encore lié à une fiche M2 non archivée : décision MJ requise.',
 ORPHAN_ADMISSION_M2:'Fiche issue d’une admission sans lien privé cohérent : vérification technique requise.',
 ADMISSION_NOT_APPROVED:'Le dossier n’est plus approuvé.',
 ADMISSION_CONSENT_STALE:'Le consentement doit être renouvelé après modification des consignes.',
 INVALID_ADMISSION:'Le dossier contient des champs invalides ou incomplets.',
 INVALID_ADMISSION_CHOICE:'Espèce, nature, classe ou initiation à vérifier dans les choix actuels.',
 ADMISSION_M2_NAME_TOO_LONG:'Le nom fictif dépasse la limite de la fiche M2.',
 ADMISSION_ACCOUNTING_CONFLICT:'Les confirmations, places ou verrous d’identité ne correspondent pas : vérification requise.',
 ADMISSION_IDENTITY_INDEX_CONFLICT:'Un verrou d’identité actif manque, est en double ou n’a plus de dossier approuvé.',
 ADMISSION_QUOTA_WITHOUT_EXCEPTION:'Un quota ou la capacité est dépassé sans exception explicite suffisante.',
};
const fieldLabels={displayName:'nom fictif',nature:'nature',classId:'classe',speciesId:'espèce',secondaryId:'initiation'};
const statusLabels={MATCHED:'Identité et choix concordants',BLOCKED:'À vérifier',EXCLUDED:'Fiche archivée, dossier non approuvé',NOT_REQUIRED:'Aucune préparation M2 attendue'};
const label=(map,key)=>Object.hasOwn(map,key)?map[key]:key;
export const createAdmissionM2CheckUi=({button,link})=>d=>`<h2>Contrôle des dossiers M2</h2>
 <p>${d.status==='NO_DETECTED_ERROR'?'Aucune incohérence détectée dans ce contrôle.':'Des corrections ou décisions sont nécessaires.'}</p>
 <p>${d.totals.approved} dossiers approuvés · ${d.totals.matched} concordants · ${d.totals.blocked} à vérifier · ${d.totals.excluded} archivés hors approbation · ${d.totals.exceptions} exceptions explicites.</p>
 <p>Contrôle du ${esc(new Date(d.checkedAt).toLocaleString('fr-FR'))}, brouillon ${d.snapshot.draftRevision}. Une modification ultérieure exige un nouveau contrôle.</p>
 <p>Ce rapport vérifie les dossiers, leurs liens M2, les choix et les places confirmées. Il n’autorise aucune publication ni naissance. Les kits, compétences actives et autres dépendances relèvent aussi du contrôle global de campagne.</p>
 ${button('Relancer le contrôle','checkAdmissionM2','','quiet')} ${link('Ouvrir M2',`central/${d.campaignId}/M2`,'button quiet')}
 <h3>Places par classe</h3><ul>${d.byClass.map(c=>`<li>${esc(admissionClasses.find(x=>x.id===c.classId)?.label??c.classId)} : ${c.observed} dossiers approuvés, ${c.confirmed} places comptées, quota ${c.quota}.</li>`).join('')}</ul>
 ${d.diagnostics.some(x=>!x.registrationId)?`<h3>Cohérence d’ensemble</h3><ul>${d.diagnostics.filter(x=>!x.registrationId).map(x=>`<li>${esc(label(labels,x.code))}${x.characterId?` (${esc(x.characterId)})`:''}</li>`).join('')}</ul>`:''}
 <h3>Dossiers</h3>${d.rows.map(r=>`<details${r.status==='BLOCKED'?' open':''}><summary>${esc(r.displayName)} · ${esc(label(statusLabels,r.status))}</summary>${r.blockers.length?`<ul>${r.blockers.map(code=>`<li>${esc(label(labels,code))}</li>`).join('')}</ul>`:''}${r.differences.length?`<p>Écarts : ${r.differences.map(x=>esc(label(fieldLabels,x))).join(', ')}.</p>`:''}${r.warnings.includes('BIOGRAPHY_DIFFERENT')?'<p>La biographie M2 diffère du background. Sa conservation est autorisée ; elle n’est pas remplacée par ce contrôle.</p>':''}${r.characterId?`<p>Fiche : ${esc(r.characterId)} · version ${r.characterRevision??'inconnue'}.</p>`:''}</details>`).join('')||'<p>Aucun dossier.</p>'}`;
