import {escapeHtml as esc} from './groups.mjs';

export const preparationErrors={
 INVALID_PREPARATION:'Vérifiez les informations de préparation. Les règles et dotations ne se modifient pas dans ce formulaire.',
 PREPARATION_EXISTS:'Cette création a déjà été enregistrée avec d’autres informations. Retrouvez-la dans le tableau de bord avant de la modifier.',
 NOT_A_PREPARATION:'Cette session utilise son parcours historique ; elle ne peut pas être convertie ici.',
 PREPARATION_ONLY:'Cette campagne est en préparation. Les inscriptions, imports et actions de jeu ne sont pas encore disponibles dans ce parcours.',
};
const pending=new Map(),key=uid=>`gn-engine:so-preparation:${uid}`;
// Retain the creation intent across a lost response and a page reload. No personal
// answers or tokens go into browser storage. Storage-disabled browsers keep it in memory.
export function preparationDraftId(storage,uid,makeId){
 let saved;try{saved=storage?.getItem(key(uid));}catch{}
 const id=pending.get(uid)??(/^[A-Za-z0-9_-]{1,128}$/.test(saved??'')?saved:makeId());
 pending.set(uid,id);try{storage?.setItem(key(uid),id);}catch{}return id;
}
export function finishPreparationDraft(storage,uid,id){
 if(pending.get(uid)===id)pending.delete(uid);
 try{if(storage?.getItem(key(uid))===id)storage.removeItem(key(uid));}catch{}
}
export function createPreparationUi({button,link}){
 const field=(label,name,value='',max=150,type='text',required=false)=>`<label>${label}<input name="${name}" type="${type}" maxlength="${max}" value="${esc(value)}" ${required?'required':''}></label>`;
 const area=(label,name,value='',required=false)=>`<label>${label}<textarea name="${name}" maxlength="4000" ${required?'required':''}>${esc(value)}</textarea></label>`;
 const form=(s={},creationId='',ownerUid='')=>`<h2>${s.id?'Modifier la préparation':'Préparer une campagne SPACE OUTLAWS'}</h2><p>Règles de référence : SPACE OUTLAWS V0.7. La campagne reste privée à votre équipe de préparation.</p><form data-form="spaceOutlawsPreparation" data-id="${esc(s.id??'')}" data-revision="${s.revision??0}" data-creation="${esc(creationId)}" data-owner="${esc(ownerUid)}">
 ${!s.id?field('Nom de la campagne','campaignTitle','',150,'text',true):''}
 ${field('Titre de la session à préparer','title',s.title,150,'text',true)}
 <div class="two"><label>Capacité totale prévue<input name="capacity" type="number" min="1" step="1" value="${s.capacity??''}" required></label>${field('Date','date',s.date,40,'date')}${field('Horaires','time',s.time,80)}${field('Lieu','place',s.place,500)}</div>
 ${area('Présentation','summary',s.summary)}${area('Informations pratiques','practical',s.practical)}${area('Information sur les données personnelles','privacy',s.privacy,true)}
 <p>Les quotas par classe seront configurés avant l’ouverture des inscriptions. Cette étape ne crée aucun personnage, crédit, stock ou QR actif.</p>
 ${s.id?field('Motif de la modification','reason','',500,'text',true):''}<button class="primary">${s.id?'Enregistrer la préparation':'Créer la préparation'}</button></form>`;
 const page=(s,staffHtml='')=>`<p class="eyebrow">SPACE OUTLAWS · préparation privée</p><h1>${esc(s.title)}</h1>${link('Tableau de bord','','button quiet')}${s.role==='OWNER'?link('Master central',`central/${s.campaignId}`,'button quiet'):''}
 <section class="panel gold"><h2>Informations et équipe</h2><p>Règles de référence : V0.7 · aucune version Master publiée.</p><p>Les candidatures sont accessibles depuis cette préparation. Préparez les dossiers et les kits dans le Master central, puis ouvrez « Entrée des joueurs » pour contrôler la version de départ et attribuer les personnages.</p>${s.permissions.content?button('Modifier les informations','editSpaceOutlawsPreparation','','primary')+link('Candidatures et invitations',`admissions-admin/${s.id}`,'button quiet')+link('Entrée des joueurs',`so-entry/${s.id}`,'button primary'):''}</section>
 <section class="panel"><h2>Session prévue</h2><p>${s.capacity} participants au maximum · ${esc(s.date||'Date à définir')} · ${esc(s.time||'Horaires à définir')}</p><p>${esc(s.place||'Lieu à définir')}</p><div class="prose">${esc(s.summary)}</div><h3>Informations pratiques</h3><div class="prose">${esc(s.practical)}</div><h3>Données personnelles</h3><div class="prose">${esc(s.privacy)}</div></section>${staffHtml}`;
 return {form,page};
}
