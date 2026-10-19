import {createTransferUi} from './transfers.mjs';
import {initializeApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,reauthenticateWithPopup,onAuthStateChanged,signOut,browserSessionPersistence,setPersistence} from 'firebase/auth';
import QRCode from 'qrcode';
import config from './firebase-config.mjs';
import {createKnowledgeUi,badgeRecipient} from './knowledge.mjs';
import {createInventoryUi,lotMatches} from './inventory.mjs';
import {createHealthUi} from './health.mjs';
import {createAbilityUi,abilityPlayerSection} from './abilities.mjs';
import {createNotebookUi,noteMatches} from './notebook.mjs';
import {createGroupsUi,escapeHtml as esc,permissionLabels} from './groups.mjs';

const auth=getAuth(initializeApp(config));
await setPersistence(auth,browserSessionPersistence);
const app=document.querySelector('#app'), account=document.querySelector('#account'), dialog=document.querySelector('#dialog');
const labels={PREPARATION:'Préparation',BRIEFING:'Briefing accessible',EN_JEU:'En jeu',PAUSE:'En pause',FINISHED:'Terminée',ARCHIVED:'Archivée',
  ACCEPTED:'Acceptée',WAITLISTED:'Liste d’attente',RECEIVED:'Reçue',INCOMPLETE:'À compléter',REFUSED:'Refusée',CANCELLED:'Annulée',DRAFT:'Brouillon',READY:'Prêt à publier',PUBLISHED:'Publié',OWNER:'Propriétaire',MJ:'MJ',RECEPTION:'Accueil'};
const errors={STALE_TRANSFER:'Cette proposition ne correspond plus au lot ou aux accès actuels. Annulez-la et préparez une nouvelle remise.',TRANSFER_CLOSED:'Cette proposition est déjà terminée. Actualisez votre sac.',HANDOVER_REQUIRED:'Confirmez la remise et la réception matérielle prévue par les règles.',INVALID_ITEM:'Vérifiez le modèle, la publication, la quantité et la disponibilité du lot.',INVALID_QUANTITY:'La quantité doit être un entier positif ; un exemplaire individuel ne peut dépasser 1.',DUPLICATE_ITEM:'Un modèle apparaît plusieurs fois dans le matériel de départ.',ITEM_UNPUBLISHED:'Publiez le modèle avant de préparer le matériel ou d’attribuer un lot.',INVALID_CONSUMABLE:'Le lot ou le consommable ne convient pas à ce soin, ou vous n’y avez plus accès.',INSUFFICIENT_STOCK:'Ce lot est indisponible ou sa quantité est insuffisante. Actualisez et choisissez un autre lot.',LOT_CLOSED:'Un lot consommé ou détruit ne peut pas être réapprovisionné. Créez un nouveau lot.',INVALID_HEALTH:"Vérifiez les PV, le maximum et la règle de retour en jeu.",HEALTH_NOT_CONFIGURED:"Les PV de ce personnage ne sont pas encore configurés.",HEALTH_DISABLED:"Le suivi des PV est désactivé pour cette session.",INVALID_HEALING:"Vérifiez le montant du soin, les usages et le délai.",OUT_OF_COMBAT:"Les règles de cette session n’autorisent pas cette action hors combat.",NO_USES_LEFT:"Cette compétence n’a plus d’usage disponible pour cette session.",COOLDOWN_ACTIVE:"Cette compétence récupère encore. Actualisez après le délai de jeu.",NO_HEAL_NEEDED:"Ce personnage n’a aucun PV à récupérer. Aucun usage n’est consommé.",NO_DAMAGE_POSSIBLE:"Il faut des PV restants et une quantité de dégâts positive.",INVALID_ABILITY:"Vérifiez les noms, les niveaux et la publication du profil.",DUPLICATE_ABILITY:"Une compétence apparaît plusieurs fois.",UNSUPPORTED_ABILITY:"Ce type de compétence n’est pas pris en charge.",INVALID_ABILITY_REFERENCE:"Une compétence référencée est absente de ce scénario ou de cette session.",ABILITY_UNPUBLISHED:"Publiez la classe et ses compétences avant de les attribuer ou de les utiliser comme condition.",INVALID_NOTE:"Vérifiez le titre, le texte et le mode de partage de votre note.",NOTE_ARCHIVED:"Restaurez cette note avant de la modifier ou de la partager.",STALE_RECIPIENT:"L’identité ou l’accès du destinataire a changé. Vérifiez à nouveau son badge avant de transmettre.",INVALID_KNOWLEDGE:"Vérifiez le titre, le texte et les règles d’accès de cette information.",INVALID_RECIPIENT:"Ce badge ne correspond pas à un autre personnage actif de cette session.",SHARING_DISABLED:"La copie de cette information n’est pas autorisée.",MODULE_DISABLED:'Les espaces de groupe sont désactivés pour cette session.',SESSION_NOT_RUNNING:'Cette action est disponible uniquement pendant le jeu, hors pause.',INVALID_GROUP:'Vérifiez les paramètres du groupe.',INVALID_MEMBER:'Un personnage référencé n’appartient pas à ce scénario ou cette session.',DUPLICATE_MEMBER:'Un personnage figure deux fois dans ce groupe.',INVALID_PUBLIC_AFFILIATION:'Une affiliation publique exige un groupe public et une appartenance révélée au personnage.',INVALID_EMAIL:'Saisissez une adresse Google valide.',INVALID_STAFF:'Le compte propriétaire conserve ses droits.',INVALID_RELATION:'La relation doit viser un autre personnage de cette même session ou de ce même scénario.',INVALID_NARRATIVE:'Vérifiez les relations et objectifs.',DUPLICATE_NARRATIVE:'Deux éléments utilisent le même identifiant.',LOGIN_REQUIRED:'Connectez-vous pour continuer.',FORBIDDEN:'Votre compte n’a pas accès à cet espace.',NOT_FOUND:'Ce contenu n’est pas disponible.',
  STALE_REVISION:'Le contenu a changé. Actualisez la page avant de recommencer.',REGISTRATION_CLOSED:'Les inscriptions sont fermées.',ALREADY_REGISTERED:'Vous êtes déjà inscrit à cette session.',
  CAPACITY_REACHED:'La dernière place vient d’être prise.',CHARACTER_TAKEN:'Ce personnage est déjà attribué.',INVALID_ASSIGNMENT:'Sélectionnez une inscription acceptée et un personnage.',
  INVITATION_EXPIRED_OR_USED:'Cette invitation est expirée ou déjà utilisée. Si votre accès est activé, ouvrez votre espace joueur.',INVALID_INVITATION:'Cette invitation ne correspond pas à votre compte ou n’est plus valide.',
  ACCESS_INACTIVE:'Votre accès privé doit être activé avec une invitation de l’organisateur.',REAUTH_REQUIRED:'Reconnectez-vous avec Google pour activer ce nouvel accès.',
  CONTENT_UNPUBLISHED:'Votre fiche n’est pas encore publiée.',BRIEFING_CLOSED:'Le briefing sera disponible lorsque l’organisateur l’ouvrira.',EMPTY_SCENARIO:'Ajoutez au moins un personnage avant de figer une version.',
  INVALID_TRANSITION:'Ce changement d’état n’est pas possible.',SESSION_CLOSED:'Cette session est terminée ou archivée.',SERVER_ERROR:'Le serveur ne peut pas traiter la demande. Réessayez dans un instant.',
  'auth/popup-closed-by-user':'La connexion a été fermée.', 'auth/popup-blocked':'Autorisez la fenêtre de connexion Google dans votre navigateur.',
  'auth/operation-not-allowed':'La connexion Google doit être activée dans Firebase.', 'auth/unauthorized-domain':'Ce domaine doit être autorisé dans Firebase Authentication.'};
let identity=null, routeVersion=0, noticeTimer, busy=false;
const pendingCommands=new Map();
function pageRenderer(){const expected=routeVersion;const render=html=>{if(expected===routeVersion)app.innerHTML=html;};render.current=()=>expected===routeVersion;return render;}
function notice(message,error=false){const n=document.querySelector('#notice');n.textContent=message;n.className=error?'error':'';n.style.display='block';clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.style.display='none',6500);}
async function api(action,input={}) {
  const token=auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const response=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({action,input}),cache:'no-store'});
  let body; try{body=await response.json();}catch{throw new Error('Le service Firebase n’est pas encore disponible sur cette adresse.');}
  if(!response.ok || body.error) {const e=new Error(errors[body.error] ?? 'La demande n’a pas pu être traitée. Vérifiez les champs.');e.code=body.error;throw e;}
  return body.result;
}
async function mutate(action,input={}){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([action,input])));
  const key=Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('');
  const requestId=pendingCommands.get(key)??crypto.randomUUID();pendingCommands.set(key,requestId);
  const result=await api(action,{...input,requestId});pendingCommands.delete(key);return result;
}
function button(label,action,extra='',kind=''){return `<button class="${kind}" data-action="${action}" ${extra}>${label}</button>`;}
function link(label,path,kind='button'){return `<a class="${kind}" href="#/${path}">${label}</a>`;}
function pill(value){return `<span class="pill ${['ACCEPTED','PUBLISHED','EN_JEU'].includes(value)?'green':''}">${esc(labels[value]??value)}</span>`;}
function input(label,name,value='',type='text',required=false){return `<label>${label}<input name="${name}" type="${type}" ${type==='number'?'min="1" step="1"':''} value="${esc(value)}" ${required?'required':''}></label>`;}
function textarea(label,name,value='',hint=''){return `<label>${label}<textarea name="${name}" maxlength="20000" ${name==='privacy'?'required':''}>${esc(value)}</textarea>${hint?`<small>${hint}</small>`:''}</label>`;}
function breadcrumbs(label){return `<nav class="breadcrumb">${link('Tableau de bord','','')}<span>/</span><span>${esc(label)}</span></nav>`;}
function loginPanel(){return `<section class="panel"><h2>Un accès personnel</h2><p class="muted">Connectez-vous avec votre compte Google pour retrouver votre inscription et votre personnage. Utilisez ce même compte pour ouvrir votre invitation.</p>${button('Continuer avec Google','login','','primary')}</section>`;}
function modal(html,expected=routeVersion){if(expected!==routeVersion)return;dialog.innerHTML=button('Fermer','close','','quiet small close')+html;dialog.showModal();}
function formValues(form){return Object.fromEntries(new FormData(form));}
function url(path){return `${location.origin}/#/${path}`;}
function characterView(c){return `<div class="eyebrow">Votre personnage · fiche ${c.contentRevision??1}</div><h1>${esc(c.displayName)}</h1><p class="lead">${esc(c.profession)}</p><div class="stack"><section class="panel"><h2>Identité publique</h2><div class="prose">${esc(c.description||'Aucune description publique.')}</div></section><section class="panel"><h2>Votre histoire</h2><div class="prose">${esc(c.biography||'Votre histoire sera complétée par l’organisateur.')}</div></section><section class="panel gold"><h2>Ce que vous seul savez</h2><div class="prose secret">${esc(c.secrets||'Aucun secret communiqué.')}</div></section>${c.relations?.length?`<section class="panel"><h2>Vos relations</h2><p class="muted">Ce que vous savez de vos contacts. Ils ne connaissent pas nécessairement votre point de vue.</p>${c.relations.map(r=>`<h3>${esc(r.title)}</h3><p class="prose">${esc(r.description)}</p>`).join('')}</section>`:''}${c.objectives?.length?`<section class="panel gold"><h2>Vos objectifs</h2>${c.objectives.map(o=>`<h3>${esc(o.title)}</h3><p class="prose">${esc(o.description)}</p>${o.steps?.length?`<ol>${o.steps.map(step=>`<li><strong>${esc(step.title)}</strong><p class="prose">${esc(step.description)}</p></li>`).join('')}</ol>`:''}`).join('')}</section>`:''}${abilityPlayerSection(c.abilities)}<section class="panel"><h2>Consignes de jeu & costume</h2><div class="prose">${esc(c.roleplay||'Aucune consigne supplémentaire.')}</div></section></div>`;}
function updateAccount(){account.innerHTML=auth.currentUser?`<span>${esc(auth.currentUser.email)}</span>${button('Déconnexion','logout','','quiet small')}`:button('Connexion','login','','quiet small');}
const groupUi=createGroupsUi({button,link,pill,input,textarea});
const knowledgeUi=createKnowledgeUi({button,link,pill,input,textarea});
const notebookUi=createNotebookUi({button,link});
const abilityUi=createAbilityUi({button,pill,input,textarea});
const inventoryUi=createInventoryUi({button,link});
const transferUi=createTransferUi({button});
const healthUi=createHealthUi({button,link});
async function dashboard(){const render=pageRenderer();
  if(!auth.currentUser){render(`<div class="hero"><div><p class="eyebrow">Préparez l’aventure</p><h1>Vos histoires.<br>Leur prochaine vie.</h1><p class="lead">Écrivez vos scénarios, accueillez les participants et confiez à chacun les secrets de son personnage.</p></div><div class="symbol">✧</div></div><div class="columns">${loginPanel()}<section class="panel"><p class="eyebrow">Vous êtes joueur ?</p><h2>L’aventure commence par un lien.</h2><p class="muted">Ouvrez le lien d’inscription ou l’invitation personnelle reçu de votre organisateur. Les badges publics ne donnent pas accès aux fiches privées.</p></section></div>`);return;}
  if(!identity?.organizer){render(`<section class="narrow"><p class="eyebrow">Bienvenue</p><h1>Prêt à entrer en jeu ?</h1><p class="lead">Ouvrez le lien de votre session pour retrouver votre inscription et votre personnage.</p><div class="panel"><p>Vous êtes connecté avec <strong>${esc(auth.currentUser.email)}</strong>.</p><p class="muted">Le même compte vous accompagne de l’inscription au briefing.</p></div></section>`);return;}
  const d=await api('dashboard');render(`<div class="hero"><div><p class="eyebrow">Espace organisateur</p><h1>À vous de donner vie<br>à la prochaine histoire.</h1><p class="lead">Des scénarios réutilisables. Des sessions indépendantes.<br>Un rôle et les bonnes informations pour chaque joueur.</p></div>${identity.admin?button('+ Nouveau scénario','newScenario','','primary'):''}</div><div class="stats"><div class="stat"><strong>${d.scenarios.length}</strong><span>Scénarios</span></div><div class="stat"><strong>${d.sessions.length}</strong><span>Sessions</span></div><div class="stat"><strong>${d.sessions.reduce((n,s)=>n+s.accepted,0)}</strong><span>Inscriptions acceptées</span></div></div><div class="section-head"><h2>Vos sessions</h2><span class="muted">L’aventure en préparation</span></div><div class="grid">${d.sessions.map(s=>`<article class="card"><div class="row spread">${pill(s.stage)}<span class="pill ${s.registrationOpen?'green':''}">${s.registrationOpen?'Inscriptions ouvertes':'Accueil fermé'}</span></div><h3>${esc(s.title)}</h3>${pill(s.role)}<p class="muted">${esc(s.date||'Date à définir')} · ${esc(s.place||'Lieu à définir')}<br>${s.accepted} / ${s.capacity} participants</p>${link('Gérer la session →',`session/${s.id}`,'button quiet')}</article>`).join('')||'<div class="empty">Votre première session apparaîtra ici.<br>Commencez par créer un scénario.</div>'}</div>${identity.admin?`<div class="section-head"><h2>Bibliothèque de scénarios</h2></div><div class="grid">${d.scenarios.map(s=>`<article class="card"><p class="eyebrow">Scénario</p><h3>${esc(s.title)}</h3><p class="muted">${esc(s.summary||'Une nouvelle histoire à écrire.')}</p>${link('Écrire & préparer →',`scenario/${s.id}`,'button quiet')}</article>`).join('')||'<div class="empty">Aucun scénario pour le moment.</div>'}</div>`:''}`);
}
let currentScenario,currentSession,editingCharacter;
const readCurrent=(r,c)=>!!r?.briefingReadAt && r.briefingReadRevision===(c?.contentRevision??1);
async function scenarioPage(id){const render=pageRenderer();
  const s=await api('scenario',{scenarioId:id});if(!render.current())return; currentScenario=s;
  render(`${breadcrumbs(s.title)}<div class="hero"><div><p class="eyebrow">Atelier de scénario</p><h1>${esc(s.title)}</h1><p class="lead">${esc(s.summary)}</p></div>${button('+ Ajouter un personnage','editCharacter','','primary')}</div><div class="columns"><section class="panel"><div class="section-head"><h2>Personnages</h2><span class="muted">${s.characters.length} fiches</span></div>${s.characters.length?`<div class="table-scroll"><table><thead><tr><th>Identité publique</th><th>Publication</th><th></th></tr></thead><tbody>${s.characters.map(c=>`<tr><td><strong>${esc(c.public.displayName)}</strong><br><small>${esc(c.public.profession)}</small></td><td>${pill(c.publicationState)}</td><td>${button('Modifier','editCharacter',`data-id="${c.id}"`,'small quiet')}${button('Compétences','assignAbilities',`data-id="${c.id}" data-scope="scenario"`,'small quiet')}${button('Matériel de départ','inventorySeedForm',`data-id="${c.id}"`,'small quiet')}${button('Versions','characterHistory',`data-id="${c.id}" data-scope="scenario"`,'small quiet')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">Ajoutez les premières identités et leurs informations privées.</p>'}</section><section class="stack"><div class="panel gold"><p class="eyebrow">Figer une version</p><h2>Une base stable pour chaque session.</h2><p class="muted">La version conserve l’état actuel de vos fiches, y compris leur niveau de publication. Les modifications suivantes du scénario ne changent pas les sessions déjà créées.</p>${button('Créer une version','publishScenario',s.characters.length?'':'disabled','primary')}</div><div class="panel"><h2>Versions disponibles</h2>${s.versions.sort((a,b)=>b.createdAt-a.createdAt).map((v,i)=>`<div class="row spread"><p><strong>Version du ${new Date(v.createdAt).toLocaleString('fr-FR')}</strong><br><small>${v.characterCount} personnages · révision ${v.sourceRevision}</small></p>${button('Créer une session','newSession',`data-id="${v.id}"`,'small')}</div>`).join('')||'<p class="muted">Aucune version figée.</p>'}</div></section></div>${groupUi.adminPanel(s,'scenario')}${knowledgeUi.adminPanel(s,'scenario')}${abilityUi.adminPanel(s,'scenario')}${healthUi.admin(s,'scenario')}${inventoryUi.admin(s,'scenario')}`);
}
function narrativeRow(kind,item={},scope='scenario') {
  const id=item.id??crypto.randomUUID(),isRelation=kind==='relations';
  const characters=(scope==='session'?currentSession:currentScenario).characters;
  return `<fieldset class="narrative-item" data-kind="${kind}" data-id="${esc(id)}"><legend>${isRelation?'Relation orientée':'Objectif narratif'}</legend><label>${isRelation?'Nom du contact tel que le joueur le connaît':'Titre'}<input data-field="title" value="${esc(item.title)}" maxlength="200" required></label><label>Texte destiné à ce joueur<textarea data-field="description" maxlength="10000">${esc(item.description)}</textarea></label>${isRelation?`<label>Personnage lié · référence réservée au MJ<select data-field="targetId"><option value="">Contact libre, sans lien technique</option>${characters.filter(c=>c.id!==editingCharacter?.id).map(c=>`<option value="${c.id}" ${c.id===item.targetId?'selected':''}>${esc(c.public.displayName)}</option>`).join('')}</select></label>`:''}<label>Notes MJ<textarea data-field="gmNotes" maxlength="4000">${esc(item.gmNotes)}</textarea></label><label class="check"><input type="checkbox" data-field="published" ${item.published?'checked':''}>Publier cet élément avec la fiche</label><button type="button" class="quiet small danger" data-action="removeNarrative">Retirer cet élément</button></fieldset>`;
}
function characterForm(id,scope='scenario'){
  const c=(scope==='session'?currentSession:currentScenario).characters.find(c=>c.id===id);editingCharacter=c;
  modal(`<p class="eyebrow">${scope==='session'?'Fiche de session':'Atelier de scénario'}</p><h2>${c?'Modifier':'Créer'} un personnage</h2><form data-form="character" data-scope="${scope}" data-id="${esc(id||'')}"><div class="two">${input('Nom public','displayName',c?.public.displayName,'text',true)}${input('Profession / couverture','profession',c?.public.profession)}<div class="full">${textarea('Description publique','description',c?.public.description,'Visible depuis le badge, sans coordonnées du participant.')}</div><div class="full">${textarea('Histoire personnelle','biography',c?.biography)}${textarea('Secrets du joueur','playerSecrets',c?.playerSecrets)}${textarea('Consignes de jeu et de costume','roleplay',c?.roleplay)}${textarea('Notes réservées au MJ','gmNotes',c?.gmNotes,'Ces notes ne sont jamais transmises au joueur, même dans l’aperçu.')}
  <h3>Relations privées</h3><p class="muted">Chaque relation appartient uniquement à cette fiche. Le personnage lié ne reçoit rien. Utilisez un alias dans le titre si sa véritable identité doit rester secrète.</p><div data-list="relations">${(c?.relations??[]).map(x=>narrativeRow('relations',x,scope)).join('')}</div><button type="button" class="quiet" data-action="addNarrative" data-kind="relations">+ Ajouter une relation</button>
  <h3>Objectifs narratifs</h3><p class="muted">Consignes personnelles, sans validation automatique ni récompense. Chaque élément peut rester non publié.</p><div data-list="objectives">${(c?.objectives??[]).map(x=>narrativeRow('objectives',x,scope)).join('')}</div><button type="button" class="quiet" data-action="addNarrative" data-kind="objectives">+ Ajouter un objectif</button>
  <label>État de publication<select name="publicationState">${['DRAFT','READY','PUBLISHED'].map(s=>`<option value="${s}" ${c?.publicationState===s?'selected':''}>${labels[s]}</option>`).join('')}</select><small>Les éléments cochés deviennent visibles lorsque la fiche est publiée et le briefing ouvert.</small></label>${scope==='session'?input('Motif de cette modification','reason','','text',true):''}</div></div><button class="primary" type="submit">Enregistrer la fiche</button></form>`);
}
function abilityRows(form){return [...form.querySelectorAll('[data-ability-row]')].filter(row=>row.querySelector('[data-ability-selected]').checked).map(row=>({skillId:row.dataset.abilityRow,level:Number(row.querySelector('[data-ability-level]').value)}));}
function collectNarrative(form,kind){return [...form.querySelectorAll(`[data-list="${kind}"] fieldset`)].map(row=>{
  const item={id:row.dataset.id};
  for(const field of row.querySelectorAll('[data-field]'))item[field.dataset.field]=field.type==='checkbox'?field.checked:field.value;
  if(kind==='objectives')item.steps=editingCharacter?.objectives?.find(x=>x.id===item.id)?.steps??[];
  return item;
});}
function staffForm(email){const g=currentSession.staff.find(x=>x.email===email);
  modal(`<p class="eyebrow">Équipe · cette session uniquement</p><h2>${g?'Modifier une délégation':'Ajouter une personne'}</h2><form data-form="staff">${g?`<label>Compte Google<input name="email" type="email" value="${esc(g.email)}" readonly></label>`:input('Adresse du compte Google','email','','email',true)}<label>Rôle<select name="role"><option value="RECEPTION" ${g?.role==='RECEPTION'?'selected':''}>Accueil</option><option value="MJ" ${g?.role==='MJ'?'selected':''}>MJ</option></select></label><p class="muted"><strong>Accueil :</strong> inscriptions, réponses privées, attributions et invitations. Aucun secret de personnage.<br><strong>MJ :</strong> mêmes droits, plus les fiches complètes, leurs historiques et le pilotage du jeu.</p><label class="check"><input name="active" type="checkbox" ${!g||g.active?'checked':''}>Délégation active</label>${input('Motif','reason','','text',true)}<p class="muted">Cette autorisation prend effet dès l’enregistrement. Aucun courriel n’est envoyé. Seul le propriétaire peut gérer l’équipe.</p><button class="primary" type="submit">Enregistrer les droits</button></form>`);
}
function sessionForm(versionId){modal(`<p class="eyebrow">Nouvelle session</p><h2>Les informations de votre événement</h2><form data-form="session" data-version="${versionId}"><div class="two">${input('Titre','title',currentScenario.title,'text',true)}${input('Capacité','capacity','','number',true)}${input('Date','date','','date')}${input('Horaires','time')}${input('Lieu','place')}<div class="full">${textarea('Conditions pratiques','practical')}${textarea('Information sur les données personnelles','privacy','','Précisez l’usage, les organisateurs destinataires, la durée de conservation et le contact pour correction ou suppression. Ce texte sera visible avant l’inscription.')}<label>Questions supplémentaires, une par ligne<textarea name="fields" placeholder="Préférences de jeu&#10;Disponibilités"></textarea><small>Facultatives. Ne demandez que les informations utiles à votre accueil.</small></label></div></div><button class="primary">Créer la session</button></form>`);}
async function sessionPage(id){const render=pageRenderer();
  const s=await api('session',{sessionId:id});if(!render.current())return;currentSession=s;
  const p=s.permissions;
  const transitions={PREPARATION:[['BRIEFING','Ouvrir le briefing']],BRIEFING:[['EN_JEU','Démarrer le jeu']],EN_JEU:[['PAUSE','Mettre en pause'],['FINISHED','Terminer le jeu']],PAUSE:[['EN_JEU','Reprendre le jeu'],['FINISHED','Terminer le jeu']],FINISHED:[['ARCHIVED','Archiver']],ARCHIVED:[]};
  render(`${breadcrumbs(s.title)}<div class="hero"><div><p class="eyebrow">Régie de session · ${esc(labels[s.role])}</p><h1>${esc(s.title)}</h1><div class="row">${pill(s.stage)}<span class="pill ${s.registrationOpen?'green':''}">${s.registrationOpen?'Inscriptions ouvertes':'Inscriptions fermées'}</span></div></div>${button('Partager l’inscription','shareSession','','primary')}</div>
  <div class="stats"><div class="stat"><strong>${s.accepted}<small> / ${s.capacity}</small></strong><span>Places acceptées</span></div><div class="stat"><strong>${s.registrations.filter(r=>r.status==='WAITLISTED').length}</strong><span>En attente</span></div><div class="stat"><strong>${s.characters.filter(c=>c.assignedUid).length}<small> / ${s.characters.length}</small></strong><span>Personnages attribués</span></div></div>
  <section class="panel row spread"><div><strong>Accueil & rythme de jeu</strong><p class="muted">Les inscriptions et l’horloge de jeu se pilotent séparément.</p></div><div class="row">${!['FINISHED','ARCHIVED'].includes(s.stage)?button(s.registrationOpen?'Fermer les inscriptions':'Ouvrir les inscriptions','toggleRegistration','','quiet'):''}${p.rhythm?transitions[s.stage].map(([st,label])=>button(label,'setStage',`data-stage="${st}"`,st==='FINISHED'?'danger':'')).join(''):''}</div></section>
  ${p.staff?`<section class="panel"><div class="section-head"><div><p class="eyebrow">Délégations par session</p><h2>Votre équipe</h2></div>${button('+ Ajouter une personne','editStaff','','quiet')}</div><p class="muted">Le rôle Accueil gère les participants. Le rôle MJ accède aussi aux secrets et au pilotage du jeu.</p>${s.staff.length?s.staff.map(g=>`<div class="row spread team-row"><div><strong>${esc(g.email)}</strong><br>${pill(g.role)} <span class="muted">${g.active?'Active':'Révoquée'}</span></div>${button('Modifier les droits','editStaff',`data-email="${esc(g.email)}"`,'small quiet')}</div>`).join(''):'<p class="empty">Vous gérez cette session seul pour le moment.</p>'}</section>`:''}
  <div class="section-head"><h2>Participants & attributions</h2>${button('Actualiser','refresh','','quiet small')}</div><label class="search-label">Rechercher un participant ou un personnage<input type="search" data-filter="session" placeholder="Nom, adresse ou identité de jeu"></label>
  <section class="panel"><div class="table-scroll"><table><thead><tr><th>Participant</th><th>Inscription</th><th>Personnage</th><th>Accès & préparation</th></tr></thead><tbody>${s.registrations.map(r=>{const c=s.characters.find(c=>c.id===r.characterId);return `<tr data-search="${esc(`${r.name} ${r.email} ${c?.public.displayName??''}`.toLowerCase())}"><td><strong>${esc(r.name)}</strong><br><small>${esc(r.email)}</small><br>${button('Réponses privées','answers',`data-uid="${esc(r.uid)}"`,'quiet small')}</td><td>${pill(r.status)}<br>${button('Changer le statut','changeStatus',`data-uid="${esc(r.uid)}"`,'quiet small')}</td><td>${esc(c?.public.displayName||'Non attribué')}<br>${r.status==='ACCEPTED'?button('Attribuer / remplacer','assign',`data-uid="${esc(r.uid)}"`,'quiet small'):''}</td><td><span class="pill ${r.accessActive?'green':''}">${r.accessActive?'Accès activé':'Accès inactif'}</span><p><small>${readCurrent(r,c)?'Fiche actuelle lue':r.briefingReadAt?'Fiche modifiée · lecture à confirmer':'Lecture non confirmée'}</small></p>${r.characterId?`<div class="row">${button('Invitation','invite',`data-uid="${esc(r.uid)}"`,'small')}${button('Révoquer','revoke',`data-uid="${esc(r.uid)}"`,'small danger')}</div>`:''}</td></tr>`;}).join('')||'<tr><td colspan="4"><p class="empty">Ouvrez les inscriptions et partagez le lien de cette session.</p></td></tr>'}</tbody></table></div></section>
  ${p.content?groupUi.adminPanel(s,'session')+knowledgeUi.adminPanel(s,'session')+abilityUi.adminPanel(s,'session')+healthUi.admin(s,'session')+inventoryUi.admin(s,'session'):''}
  ${p.content?`<div class="section-head"><h2>Fiches de la session</h2><span class="muted">Copie indépendante du scénario</span></div><div class="grid">${s.characters.map(c=>`<article class="card" data-search="${esc(`${c.public.displayName} ${c.public.profession}`.toLowerCase())}">${pill(c.publicationState)}<h3>${esc(c.public.displayName)}</h3><p class="muted">${esc(c.public.profession)}</p><div class="row">${button('Modifier la fiche','editCharacter',`data-id="${c.id}" data-scope="session"`,'small')}${button('Compétences','assignAbilities',`data-id="${c.id}" data-scope="session"`,'small')}${button('Attribuer un objet','grantItemForm',`data-id="${c.id}"`,'small')}${button('Aperçu du sac','previewInventory',`data-id="${c.id}"`,'quiet small')}${s.healthRules?.enabled?button('PV / correction','healthCorrection',`data-id="${c.id}"`,'small'):''}${button('Voir comme le joueur','preview',`data-id="${c.id}"`,'small')}${button('Versions publiées','characterHistory',`data-id="${c.id}" data-scope="session"`,'quiet small')}${button('Badge public','badge',`data-id="${c.id}"`,'quiet small')}</div></article>`).join('')}</div><details class="panel"><summary>Journal des dernières opérations</summary>${s.audit.map(a=>`<p class="muted">${new Date(a.at).toLocaleString('fr-FR')} — ${esc(a.action)}${a.reason?` · ${esc(a.reason)}`:''}<br><small>Auteur : ${esc(a.actorUid)}${a.characterId?` · Personnage : ${esc(a.characterId)}`:''}${a.beforeRevision?` · Fiche ${a.beforeRevision} → ${a.afterRevision}`:''}</small></p>`).join('')}</details>`:'<p class="muted">Votre rôle Accueil donne accès aux inscriptions et aux attributions. Les fiches privées sont réservées aux MJ.</p>'}`);
}
async function joinPage(id){const render=pageRenderer();
  const s=await api('publicSession',{sessionId:id}); let own=null;
  if(auth.currentUser) own=await api('mySession',{sessionId:id});
  render(`<div class="narrow"><p class="eyebrow">Votre prochaine aventure</p><h1>${esc(s.title)}</h1><p class="lead">${esc(s.summary)}</p><div class="steps"><span class="active">01 · Inscription</span><span>02 · Attribution</span><span>03 · Briefing</span></div><section class="panel"><div class="row spread"><h2>Informations pratiques</h2><span class="pill ${s.registrationOpen?'green':''}">${s.registrationOpen?'Inscriptions ouvertes':'Inscriptions fermées'}</span></div><p>${esc(s.date||'Date à préciser')} · ${esc(s.time)}<br>${esc(s.place||'Lieu à préciser')}</p><div class="prose">${esc(s.practical)}</div><p class="muted">${s.available} place(s) disponible(s) sur ${s.capacity}. ${s.available===0?'Les nouvelles demandes rejoignent la liste d’attente.':''}</p></section><div class="section-head"><h2>Votre inscription</h2></div>${own?.registration?`<section class="panel gold">${pill(own.registration.status)}<h2>Bienvenue, ${esc(own.registration.name)}.</h2><p>Votre inscription est enregistrée. ${own.registration.status==='ACCEPTED'?'L’organisateur prépare votre attribution.':'Retrouvez ici son statut à tout moment.'}</p><div class="row">${link('Ouvrir mon espace joueur',`play/${id}`,'button primary')}${button('Annuler mon inscription','cancel',`data-id="${id}"`,'quiet')}</div></section>`:!auth.currentUser?loginPanel():s.registrationOpen?`<form class="panel" data-form="register" data-id="${id}">${input('Nom ou nom d’usage','name',auth.currentUser.displayName,'text',true)}<p class="muted">Votre compte ${esc(auth.currentUser.email)} permet de retrouver cette inscription.</p>${s.fields.map(f=>`<label>${esc(f.label)}<textarea name="field_${f.id}" maxlength="2000" ${f.required?'required':''}></textarea></label>`).join('')}<h3>Vos données</h3><p class="prose muted">${esc(s.privacy)}</p><button class="primary">${s.available?'Confirmer mon inscription':'Rejoindre la liste d’attente'}</button></form>`:'<p class="empty">Les inscriptions sont actuellement fermées.</p>'}<details><summary>Utilisation de vos données</summary><p class="prose muted">${esc(s.privacy)}</p></details></div>`);
}
async function playerPage(id){const render=pageRenderer();
  if(!auth.currentUser){render(`<div class="narrow"><p class="eyebrow">Espace joueur</p><h1>Retrouvez votre personnage.</h1>${loginPanel()}</div>`);return;}
  const d=await api('mySession',{sessionId:id});
  render(`<div class="narrow"><nav class="breadcrumb">${link(esc(d.session.title),`join/${id}`,'')}<span>/</span><span>Mon personnage</span></nav>${d.character?healthUi.quick(d.health,id)+link('Mon sac',`bag/${id}`,'button quiet')+characterView(d.character):`<section class="panel"><p class="eyebrow">Espace joueur</p><h1>${esc(d.session.title)}</h1><p>${esc(errors[d.reason]||'Votre organisateur prépare votre personnage. Vous retrouverez votre fiche ici après attribution et activation de votre invitation.')}</p>${d.registration?pill(d.registration.status):link('M’inscrire',`join/${id}`,'button primary')}</section>`}${d.character?`<div class="section-head"><div>${readCurrent(d.registration,d.character)?'<span class="pill green">Fiche actuelle lue</span>':button('J’ai lu mon briefing','readBriefing',`data-id="${id}"`,'primary')}</div>${button('Mon badge public','playerBadge',`data-sid="${id}" data-id="${d.character.id}"`,'quiet')}</div>`:''}${d.character?`<section class="panel gold"><h2>Mes informations</h2><p>Retrouvez les connaissances, indices et documents reçus par votre personnage.</p>${link('Ouvrir mes informations →',`infos/${id}`,'button primary')}${link('Mon carnet privé',`notes/${id}`,'button quiet')}</section>`:''}${groupUi.cards(d.groups,id)}<p class="muted">${esc(labels[d.session.stage])} · ${esc(d.session.date)} · ${esc(d.session.place)}</p>${button('Actualiser mon espace','refresh','','quiet small')}</div>`);
}
async function knowledgePage(sid,kid){const render=pageRenderer();
  if(!auth.currentUser){render(`<div class="narrow"><h1>Vos informations privées</h1>${loginPanel()}</div>`);return;}
  const d=await api(kid?'knowledgeDetail':'myKnowledge',{sessionId:sid,...(kid?{knowledgeId:kid}:{})});
  render(`<div class="narrow"><nav class="breadcrumb">${link('Mon personnage',`play/${sid}`,'')}${kid?link('Mes informations',`infos/${sid}`,''):''}${link('Mon carnet privé',`notes/${sid}`,'')}</nav>${kid?knowledgeUi.detail(d):knowledgeUi.list(d)}${button('Actualiser','refresh','','quiet small')}</div>`);
}
async function inventoryPage(sid){const render=pageRenderer();if(!auth.currentUser){render(`<div class="narrow"><h1>Mon sac</h1>${loginPanel()}</div>`);return;}const d=await api('myInventory',{sessionId:sid});render(`<div class="narrow" data-inventory-root><nav class="breadcrumb">${link('Mon personnage',`play/${sid}`,'')}</nav>${inventoryUi.page(d)}</div>`);}
function filterInventory(root){const term=root.querySelector('[data-inventory-search]').value,status=root.querySelector('[data-inventory-status]').value,category=root.querySelector('[data-inventory-category]').value;let count=0;for(const row of root.querySelectorAll('[data-inventory-lot]')){row.hidden=!lotMatches(JSON.parse(row.dataset.inventoryValue),term,status,category);if(!row.hidden)count++;}root.querySelector('[data-inventory-empty]').hidden=count>0;}
async function healthPage(sid){const render=pageRenderer();
  if(!auth.currentUser){render(`<div class="narrow"><p class="eyebrow">État de jeu</p><h1>PV et soins</h1>${loginPanel()}</div>`);return;}
  const d=await api('myHealth',{sessionId:sid});render(`<div class="narrow"><nav class="breadcrumb">${link('Mon personnage',`play/${sid}`,'')}</nav>${healthUi.page(d)}</div>`);
}
async function notebookPage(sid,nid){const render=pageRenderer();
  if(!auth.currentUser){render(`<div class="narrow"><p class="eyebrow">Carnet personnel</p><h1>Vos notes privées</h1>${loginPanel()}</div>`);return;}
  const d=await api(nid?'noteDetail':'myNotes',{sessionId:sid,...(nid?{noteId:nid}:{})});
  render(`<div class="narrow"><nav class="breadcrumb">${link('Mon personnage',`play/${sid}`,'')}${link('Mes informations',`infos/${sid}`,'')}${nid?link('Mon carnet',`notes/${sid}`,''):''}</nav>${nid?notebookUi.detail(d):notebookUi.list(d)}${button('Actualiser','refresh','','quiet small')}</div>`);
}
function dirtyNote(){return !!document.querySelector('[data-form="noteEditor"][data-dirty="true"]');}
function filterNotes(){const root=document.querySelector('[data-note-search]')?.closest('.narrow');if(!root)return;
  const query=root.querySelector('[data-note-search]').value,state=root.querySelector('[data-note-state]').value;let visible=0;
  for(const item of root.querySelectorAll('[data-note-title]')){item.hidden=!noteMatches({title:item.dataset.noteTitle,archived:item.dataset.noteArchived==='true'},query,state);if(!item.hidden)visible++;}
  root.querySelector('[data-note-empty]').hidden=visible>0;
}
async function discoveryPage(sid,kid){const render=pageRenderer();const own=auth.currentUser?await api('mySession',{sessionId:sid}):null;const canDiscover=!own?.health?.outOfCombat||own.health.allowed.discover;render(`<div class="narrow"><p class="eyebrow">Cible de découverte</p><h1>Un indice à découvrir.</h1><p class="lead">Votre accès et les conditions de découverte seront vérifiés avant de révéler le contenu.</p><p class="muted">Ce QR identifie une cible. Une photographie peut être réutilisée : ce n’est pas une preuve de présence sur place.</p>${!auth.currentUser?loginPanel():`<section class="panel">${canDiscover?button('Découvrir avec mon personnage','knowledgeDiscover',`data-sid="${esc(sid)}" data-id="${esc(kid)}"`,'primary'):'<p>La découverte est indisponible hors combat selon les règles de cette session.</p>'}${link('Mon espace',`play/${sid}`,'button quiet')}</section>`}</div>`);}
async function playerGroupPage(sid,gid){const render=pageRenderer();
  if(!auth.currentUser){render(`<div class="narrow"><h1>Votre espace de groupe</h1>${loginPanel()}</div>`);return;}
  const d=await api('myGroup',{sessionId:sid,groupId:gid});
  render(`<div class="narrow"><nav class="breadcrumb">${link('Mon personnage',`play/${sid}`,'')}<span>/</span><span>${esc(d.group.name)}</span></nav>${groupUi.detail(d)}${button('Actualiser','refresh','','quiet small')}</div>`);
}
function groupForm(id,scope){const context=scope==='session'?currentSession:currentScenario;modal(groupUi.editor(context.groups.find(g=>g.id===id),context.characters,scope));}
function groupMembers(form){return [...form.querySelectorAll('[data-members] fieldset')].map(row=>{
  const member={characterId:row.dataset.character,permissions:{}};
  for(const field of row.querySelectorAll('[data-member-field]')){
    const key=field.dataset.memberField,value=field.type==='checkbox'?field.checked:field.value;
    if(Object.hasOwn(permissionLabels,key))member.permissions[key]=value;else member[key]=value;
  }
  return member;
});}
async function invitationPage(id,token){const render=pageRenderer();
  render(`<div class="narrow"><p class="eyebrow">Invitation personnelle</p><h1>Un personnage vous attend.</h1><p class="lead">Ouvrez cette invitation avec le compte Google utilisé pour votre inscription.</p>${!auth.currentUser?loginPanel():`<section class="panel gold"><h2>Activer mon accès</h2><p>Compte connecté : ${esc(auth.currentUser.email)}</p><p class="muted">Ce lien s’utilise une seule fois. Vous retrouverez ensuite votre personnage avec ce compte.</p>${button('Activer mon personnage','redeem',`data-sid="${esc(id)}"`,'primary')}<hr class="divider">${button('Me reconnecter avec Google','reauth','','quiet')}${link('Mon espace déjà activé',`play/${id}`,'button quiet')}</section>`}</div>`);
}
async function route(){const version=++routeVersion;dialog.close();app.innerHTML='<p class="loading">Chargement de votre espace…</p>';try{identity=auth.currentUser?await api('identity'):null;if(version!==routeVersion)return;const [page,id,token]=(location.hash.slice(2)||'').split('/');if(page==='scenario')await scenarioPage(id);else if(page==='session')await sessionPage(id);else if(page==='join')await joinPage(id);else if(page==='play')await playerPage(id);else if(page==='bag')await inventoryPage(id);else if(page==='health')await healthPage(id);else if(page==='notes')await notebookPage(id);else if(page==='note')await notebookPage(id,token);else if(page==='infos')await knowledgePage(id);else if(page==='knowledge')await knowledgePage(id,token);else if(page==='discover')await discoveryPage(id,token);else if(page==='group')await playerGroupPage(id,token);else if(page==='invite')await invitationPage(id,token);else if(page==='badge'){const c=await api('publicBadge',{sessionId:id,characterId:token});if(version!==routeVersion)return;app.innerHTML=`<div class="narrow"><p class="eyebrow">Identité publique</p><h1>${esc(c.displayName)}</h1><p class="lead">${esc(c.profession)}</p><div class="panel prose">${esc(c.description)}</div>${c.affiliations?.length?`<section class="panel"><h2>Affiliations publiques</h2>${c.affiliations.map(g=>`<h3>${esc(g.name)}</h3><p>${esc(g.role)}</p><p class="prose">${esc(g.description)}</p>`).join('')}</section>`:''}<p class="muted">Ce badge identifie le personnage. Il n’ouvre pas son accès privé.</p></div>`;}else await dashboard();}catch(e){if(version!==routeVersion)return;app.innerHTML=`<div class="panel error-panel narrow"><h2>Nous ne pouvons pas ouvrir cet espace.</h2><p>${esc(e.message)}</p>${button('Réessayer','refresh','','quiet')}${link('Accueil','','button quiet')}</div>`;}}
async function share(title,path){modal(`<p class="eyebrow">Lien public</p><h2>${esc(title)}</h2><div class="row"><img class="qr" alt="QR du lien public" src="${await QRCode.toDataURL(url(path),{margin:2,width:360})}"><div><p class="invite">${esc(url(path))}</p>${button('Copier le lien','copy',`data-value="${esc(url(path))}"`,'primary')}<p class="muted">Ce lien ne contient aucun accès privé.</p></div></div>`);}
document.addEventListener('click',async event=>{
  const b=event.target.closest('[data-action]');if(!b || busy)return;const a=b.dataset.action;const actionVersion=routeVersion;
  try{
    if(['close','logout','refresh'].includes(a)&&dirtyNote()&&!confirm('Quitter sans enregistrer les modifications de votre note ?'))return;
    if(a==='close'){dialog.close();dialog.innerHTML='';return;}
    if(a==='login'||a==='reauth'){const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});if(a==='reauth')await reauthenticateWithPopup(auth.currentUser,provider);else await signInWithPopup(auth,provider);await route();return;}
    if(a==='logout'){await signOut(auth);pendingCommands.clear();identity=null;await route();return;}
    if(a==='refresh'){await route();return;}
    if(a==='copy'){await navigator.clipboard.writeText(b.dataset.value);notice('Lien copié.');return;}
    if(a==='newScenario'){modal(`<p class="eyebrow">Votre bibliothèque</p><h2>Commencer une nouvelle histoire</h2><form data-form="scenario">${input('Titre du scénario','title','','text',true)}${textarea('Présentation publique','summary')}<button class="primary">Créer le scénario</button></form>`);return;}
    if(a==='editCharacter'){characterForm(b.dataset.id,b.dataset.scope||'scenario');return;}
    if(a==='addNarrative'){const form=b.closest('form');form.querySelector(`[data-list="${b.dataset.kind}"]`).insertAdjacentHTML('beforeend',narrativeRow(b.dataset.kind,{},form.dataset.scope));return;}
    if(a==='removeNarrative'){b.closest('fieldset').remove();return;}
    if(a==='editStaff'){staffForm(b.dataset.email);return;}
    if(a==='characterHistory'){
      const scope=b.dataset.scope,context=scope==='session'?{sessionId:currentSession.id}:{scenarioId:currentScenario.id};
      const d=await api('characterHistory',{...context,characterId:b.dataset.id});if(actionVersion!==routeVersion)return;
      modal(`<p class="eyebrow">Historique des publications</p><h2>Les fiches destinées au joueur</h2><p class="muted">Une publication est disponible seulement lorsque le briefing est ouvert. Cet historique ne prouve pas une lecture.</p>${d.versions.map(v=>`<details class="panel"><summary>Fiche ${v.revision} · ${new Date(v.at).toLocaleString('fr-FR')}</summary><p class="muted">${esc(v.reason)}${v.source==='LEGACY_CAPTURE'?' · Date de capture, date de publication d’origine inconnue.':''}<br>Auteur : ${esc(v.actorUid)}</p>${characterView(v.character)}</details>`).join('')||'<p class="empty">Aucune publication suivie pour cette fiche. Les fiches anciennes seront conservées lors de leur prochaine modification.</p>'}`);return;
    }
    if(a==='transferForm'){const d=await api('myInventory',{sessionId:b.dataset.sid});if(actionVersion!==routeVersion)return;const lot=d.lots.find(l=>l.id===b.dataset.lot);if(!d.canTransfer||!lot||lot.status!=='AVAILABLE')throw new Error('Cette remise est indisponible. Actualisez votre sac.');modal(transferUi.form(b.dataset.sid,lot));return;}
    if(a==='transferDetail'){const d=await api('lotTransferDetail',{sessionId:b.dataset.sid,transferId:b.dataset.id});if(actionVersion!==routeVersion)return;modal(transferUi.detail(b.dataset.sid,d));return;}
    if(a==='editItem'){const scope=b.dataset.scope,c=scope==='session'?currentSession:currentScenario;modal(inventoryUi.editor(c,scope,c.items.find(x=>x.id===b.dataset.id),b.dataset.copy==='true'));return;}
    if(a==='inventorySeedForm'){const c=currentScenario.characters.find(c=>c.id===b.dataset.id);modal(inventoryUi.seed(currentScenario,c)+button('Historique du matériel de départ','itemHistory',`data-scope="scenario" data-kind="characters" data-id="${c.id}"`,'quiet'));return;}
    if(a==='grantItemForm'){modal(inventoryUi.grant(currentSession,b.dataset.id));return;}
    if(a==='correctLotForm'){modal(inventoryUi.correction(currentSession,currentSession.inventory.find(l=>l.id===b.dataset.id)));return;}
    if(a==='itemHistory'){const scope=b.dataset.scope,c=scope==='session'?currentSession:currentScenario;const d=await api('itemHistory',{[scope==='session'?'sessionId':'scenarioId']:c.id,kind:b.dataset.kind,id:b.dataset.id});if(actionVersion!==routeVersion)return;modal(inventoryUi.history(d));return;}
    if(a==='previewInventory'){const d=await api('previewInventory',{sessionId:currentSession.id,characterId:b.dataset.id});if(actionVersion!==routeVersion)return;modal(`<div data-inventory-root>${inventoryUi.page(d)}</div>`);return;}
    if(a==='healthRules'){const scope=b.dataset.scope;modal(healthUi.rules(scope==='session'?currentSession:currentScenario,scope));return;}
    if(a==='healthCorrection'){const c=currentSession.characters.find(c=>c.id===b.dataset.id);modal(healthUi.correction(currentSession,c)+button('Historique MJ','healthHistory',`data-id="${c.id}"`,'quiet'));return;}
    if(a==='healthHistory'){const d=await api('healthHistory',{sessionId:currentSession.id,characterId:b.dataset.id});if(actionVersion!==routeVersion)return;modal(healthUi.history(d.events,true));return;}
    if(a==='previewHealth'){const d=await api('previewHealth',{sessionId:currentSession.id,characterId:b.dataset.id});if(actionVersion!==routeVersion)return;modal(healthUi.page(d));return;}
    if(a==='damageForm'){modal(healthUi.damageForm(b.dataset.sid));return;}
    if(a==='treatmentForm'){
      const view=await api('myHealth',{sessionId:b.dataset.sid});if(actionVersion!==routeVersion)return;const skill=view.skills.find(k=>k.id===b.dataset.skill);if(!skill)throw new Error('Cette compétence n’est plus disponible. Actualisez.');
      if(skill.kind==='ACTIVE_TARGET'||skill.healing.consumable){modal(healthUi.treatmentForm(b.dataset.sid,skill,view.character.id));return;}
      const payload={sessionId:b.dataset.sid,skillId:b.dataset.skill,targetId:b.dataset.character};const d=await api('prepareTreatment',payload);if(actionVersion!==routeVersion)return;modal(healthUi.confirm('applyTreatment',d,payload));return;
    }
    if(a==='editAbility'){
      const context=b.dataset.scope==='session'?currentSession:currentScenario;
      modal(abilityUi.editor(context,b.dataset.scope,b.dataset.kind,context[b.dataset.kind].find(x=>x.id===b.dataset.id),b.dataset.copy==='true'));return;
    }
    if(a==='assignAbilities'){
      const context=b.dataset.scope==='session'?currentSession:currentScenario;
      modal(abilityUi.assignment(context,b.dataset.scope,context.characters.find(c=>c.id===b.dataset.id))+button('Historique des profils','abilityHistory',`data-scope="${b.dataset.scope}" data-kind="characters" data-id="${b.dataset.id}"`,'quiet'));return;
    }
    if(a==='abilityHistory'){
      const scope=b.dataset.scope,context=scope==='session'?currentSession:currentScenario;
      const d=await api('abilityHistory',{[scope==='session'?'sessionId':'scenarioId']:context.id,kind:b.dataset.kind,id:b.dataset.id});
      if(actionVersion!==routeVersion)return;modal(abilityUi.history(d,context));return;
    }
    if(a==='editNote'){
      let note;if(b.dataset.id){const d=await api('noteDetail',{sessionId:b.dataset.sid,noteId:b.dataset.id});if(actionVersion!==routeVersion)return;note=d.note;}
      modal(notebookUi.editor(b.dataset.sid,note));return;
    }
    if(a==='prepareNoteShare'){modal(notebookUi.prepare(b.dataset.sid,b.dataset.id,Number(b.dataset.revision),b.dataset.author,b.dataset.authorName));return;}
    if(a==='archiveNote'){await mutate('setNoteArchived',{sessionId:b.dataset.sid,noteId:b.dataset.id,revision:Number(b.dataset.revision),archived:b.dataset.archived==='true'});if(actionVersion===routeVersion)await route();return;}
    if(a==='editKnowledge'){const scope=b.dataset.scope,context=scope==='session'?currentSession:currentScenario;modal(knowledgeUi.editor(context.knowledge.find(k=>k.id===b.dataset.id),context.characters,scope,context.skills??[]));return;}
    if(a==='knowledgeQr'){await share('QR de découverte',`discover/${currentSession.id}/${b.dataset.id}`);return;}
    if(a==='knowledgeHistory'){
      const context=b.dataset.scope==='session'?{sessionId:currentSession.id}:{scenarioId:currentScenario.id};
      const d=await api('knowledgeHistory',{...context,knowledgeId:b.dataset.id});if(actionVersion!==routeVersion)return;
      modal(`<p class="eyebrow">Historique réservé aux MJ</p><h2>Modifications et attributions</h2>${d.versions.map(v=>`<details class="panel"><summary>${new Date(v.at).toLocaleString('fr-FR')} · ${v.type==='grant'?'Attribution':'Édition'}</summary><p>${esc(v.reason)}<br>Auteur : ${esc(v.actorEmail??v.actorUid)}</p>${v.type==='grant'?`<p>Personnage : ${esc(currentSession.characters.find(c=>c.id===v.characterId)?.public.displayName??v.characterId)}</p><p>Avant : ${v.before?.active?'accès actif':'aucun accès actif'} · après : ${v.after.active?'accès actif':'accès retiré'}</p><h3>Texte après intervention</h3><p class="prose">${esc(v.after.snapshot.body)}</p>`:`<h3>Avant</h3>${knowledgeUi.state(v.before,(b.dataset.scope==='session'?currentSession:currentScenario).characters)}<h3>Après</h3>${knowledgeUi.state(v.after,(b.dataset.scope==='session'?currentSession:currentScenario).characters)}`}</details>`).join('')||'<p>Aucune modification suivie depuis la création de cette session.</p>'}`);return;
    }
    if(a==='knowledgeGrant'){
      const k=currentSession.knowledge.find(k=>k.id===b.dataset.id),d=await api('knowledgeRecipients',{sessionId:currentSession.id,knowledgeId:k.id});if(actionVersion!==routeVersion)return;
      modal(`<p class="eyebrow">Intervention MJ · ${esc(k.title)}</p><h2>Attribuer ou retirer un accès</h2><form data-form="knowledgeGrant" data-id="${esc(k.id)}" data-revision="${k.revision}"><label>Personnage destinataire<select name="characterId" required><option value="">Choisir explicitement un personnage</option>${currentSession.characters.map(c=>{const r=d.receipts.find(r=>r.characterId===c.id);return `<option value="${esc(c.id)}" data-grant-revision="${r?.grantRevision??0}">${esc(c.public.displayName)} — ${r?.active?`accès actif, texte ${r.revision}`:r?'accès retiré':'non attribué'}</option>`;}).join('')}</select></label><label>Intervention<select name="enabled"><option value="true">Attribuer la version actuelle (${k.revision})</option><option value="false">Retirer l’accès</option></select></label><p class="muted">Attribuer remplace le texte reçu par ce personnage par la version actuelle et remet sa lecture à confirmer. Retirer empêche la lecture, la redécouverte et la réception d’une nouvelle copie jusqu’à une réattribution MJ. Cela ne peut effacer ce qui a déjà été lu ou copié chez d’autres personnages.</p>${input('Motif','reason','','text',true)}<button type="submit" class="primary">Appliquer à ce personnage</button></form>`);return;
    }
    if(a==='previewKnowledge'){const d=await api('previewKnowledge',{sessionId:currentSession.id,characterId:b.dataset.character});if(actionVersion!==routeVersion)return;modal(`<p class="eyebrow">Aperçu sans effet sur le jeu</p>${knowledgeUi.list({...d,characterId:b.dataset.character})}`);return;}
    if(a==='previewKnowledgeDetail'){const d=await api('previewKnowledgeDetail',{sessionId:currentSession.id,characterId:b.dataset.character,knowledgeId:b.dataset.id});if(actionVersion!==routeVersion)return;modal(knowledgeUi.detail(d));return;}
    if(a==='knowledgeShare'){modal(`<h2>Choisir le destinataire</h2><form data-form="knowledgeSharePrepare" data-id="${esc(b.dataset.id)}" data-sid="${esc(b.dataset.sid)}" data-receipt="${b.dataset.receipt}">${input('Lien du badge public de ce personnage','badgeUrl','','url',true)}<p class="muted">Demandez son badge au personnage rencontré, puis collez son lien ici. Vous pourrez vérifier le nom avant de transmettre. Aucun annuaire privé n’est proposé.</p><button type="submit" class="primary">Vérifier le destinataire</button></form>`);return;}
    if(a==='editGroup'){groupForm(b.dataset.id,b.dataset.scope);return;}
    if(a==='addGroupMembers'){
      const form=b.closest('form'),context=form.dataset.scope==='session'?currentSession:currentScenario;
      for(const option of form.querySelector('[data-member-choice]').selectedOptions){
        if([...form.querySelectorAll('[data-members] fieldset')].some(row=>row.dataset.character===option.value))continue;
        const c=context.characters.find(c=>c.id===option.value);
        form.querySelector('[data-members]').insertAdjacentHTML('beforeend',groupUi.memberRow({active:true},c,form.elements.visibility.value));
      }return;
    }
    if(a==='removeGroupMember'){b.closest('fieldset').remove();return;}
    if(a==='groupModule'){modal(`<h2>${currentSession.groupsEnabled?'Désactiver':'Activer'} les espaces de groupe</h2><form data-form="groupModule"><p>Les groupes et leurs contenus sont conservés. Désactiver ce module ferme les accès joueurs et retire les affiliations des badges publics.</p>${input('Motif','reason','','text',true)}<button type="submit" class="primary">Confirmer</button></form>`);return;}
    if(a==='groupHistory'){
      const scope=b.dataset.scope,context=scope==='session'?{sessionId:currentSession.id}:{scenarioId:currentScenario.id};
      const d=await api('groupHistory',{...context,groupId:b.dataset.id});if(actionVersion!==routeVersion)return;
      modal(`<p class="eyebrow">Historique réservé aux MJ</p><h2>Modifications du groupe</h2>${d.versions.map(v=>`<details class="panel"><summary>${new Date(v.at).toLocaleString('fr-FR')} · version ${v.after.revision}</summary><p>${esc(v.reason)}<br><small>Auteur : ${esc(v.actorEmail??v.actorUid)}</small></p><h3>Avant</h3>${groupUi.historyState(v.before,(scope==='session'?currentSession:currentScenario).characters)}<h3>Après</h3>${groupUi.historyState(v.after,(scope==='session'?currentSession:currentScenario).characters)}</details>`).join('')}`);return;
    }
    if(a==='previewGroup'){const d=await api('previewGroup',{sessionId:currentSession.id,groupId:b.dataset.id,characterId:b.dataset.character});if(actionVersion!==routeVersion)return;modal(`<p class="eyebrow">Aperçu sans effet sur le jeu</p>${groupUi.detail(d)}`);return;}
    if(a==='newSession'){sessionForm(b.dataset.id);return;}
    if(a==='answers'){const r=currentSession.registrations.find(r=>r.uid===b.dataset.uid);modal(`<p class="eyebrow">Réponses privées · Organisateur</p><h2>${esc(r.name)}</h2><p>${esc(r.email)}</p>${currentSession.fields.map(f=>`<h3>${esc(f.label)}</h3><p class="prose">${esc(r.answers[f.id]||'Aucune réponse')}</p>`).join('')||'<p class="muted">Aucune question supplémentaire.</p>'}`);return;}
    if(a==='changeStatus'){const r=currentSession.registrations.find(r=>r.uid===b.dataset.uid);modal(`<h2>Inscription de ${esc(r.name)}</h2><form data-form="status" data-uid="${esc(r.uid)}"><label>Statut<select name="status">${['RECEIVED','INCOMPLETE','ACCEPTED','WAITLISTED','REFUSED','CANCELLED'].map(s=>`<option value="${s}" ${s===r.status?'selected':''}>${labels[s]}</option>`).join('')}</select></label><p class="muted">Retirer l’acceptation libère la place et révoque l’attribution.</p><button class="primary">Enregistrer le statut</button></form>`);return;}
    if(a==='assign'){const r=currentSession.registrations.find(r=>r.uid===b.dataset.uid);modal(`<h2>Personnage de ${esc(r.name)}</h2><form data-form="assign" data-uid="${esc(r.uid)}"><label>Personnage<select name="characterId" required><option value="">Choisir un personnage</option>${currentSession.characters.map(c=>`<option value="${c.id}">${esc(c.public.displayName)}${c.assignedUid?' — déjà attribué':''}</option>`).join('')}</select></label><label class="check"><input type="checkbox" name="replace">Autoriser le remplacement du titulaire actuel</label><p class="muted">Une nouvelle attribution désactive les anciens accès. Créez ensuite une invitation pour le nouveau joueur.</p><button class="primary">Confirmer l’attribution</button></form>`);return;}
    if(a==='shareSession'){await share(currentSession.title,`join/${currentSession.id}`);return;}
    if(a==='badge'||a==='playerBadge'){await share('Badge public',`badge/${b.dataset.sid||currentSession.id}/${b.dataset.id}`);return;}
    if(a==='preview'){const d=await api('preview',{sessionId:currentSession.id,characterId:b.dataset.id});if(actionVersion!==routeVersion)return;modal(`<p class="eyebrow">Aperçu sans effet sur le jeu</p>${d.character?healthUi.quick(d.health,currentSession.id,true)+characterView(d.character)+(d.health?button('Aperçu des soins','previewHealth',`data-id="${b.dataset.id}"`,'quiet'):'')+button('Voir ses informations','previewKnowledge',`data-character="${esc(b.dataset.id)}"`,'quiet')+groupUi.cards(d.groups,currentSession.id,b.dataset.id):`<p>${esc(errors[d.reason])}</p>`}`);return;}
    busy=true;b.disabled=true;
    if(a==='knowledgeDiscover'){await mutate('discoverKnowledge',{sessionId:b.dataset.sid,knowledgeId:b.dataset.id});location.hash=`#/knowledge/${b.dataset.sid}/${b.dataset.id}`;return;}
    else if(a==='knowledgeRead'){await mutate('markKnowledgeRead',{sessionId:b.dataset.sid,knowledgeId:b.dataset.id,receiptRevision:Number(b.dataset.receipt)});}
    else if(a==='publishScenario'){await mutate('publishScenario',{scenarioId:currentScenario.id,revision:currentScenario.revision});notice('Version figée. Vous pouvez créer une session.');}
    else if(a==='toggleRegistration')await mutate('setRegistrationOpen',{sessionId:currentSession.id,revision:currentSession.revision,open:!currentSession.registrationOpen});
    else if(a==='setStage'){if(['FINISHED','ARCHIVED'].includes(b.dataset.stage)&&!confirm('Confirmer cette étape ? La session ne pourra pas revenir à l’état précédent.'))return;await mutate('setStage',{sessionId:currentSession.id,revision:currentSession.revision,stage:b.dataset.stage});}
    else if(a==='invite'){
      const bytes=crypto.getRandomValues(new Uint8Array(32)),token=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));const tokenHash=Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('');
      const d=await mutate('issueInvitation',{sessionId:currentSession.id,uid:b.dataset.uid,tokenHash,hours:72});if(actionVersion!==routeVersion)return;
      const invitation=url(`invite/${currentSession.id}/${token}`);modal(`<p class="eyebrow">Invitation personnelle · Usage unique</p><h2>À transmettre au joueur concerné</h2><p>Valable jusqu’au ${new Date(d.expiresAt).toLocaleString('fr-FR')}. Le joueur doit utiliser son compte d’inscription.</p><p class="invite">${esc(invitation)}</p>${button('Copier l’invitation','copy',`data-value="${esc(invitation)}"`,'primary')}<p class="muted">Le serveur conserve uniquement l’empreinte du lien. Une nouvelle invitation invalide la précédente.</p>`);return;
    } else if(a==='revoke'){if(!confirm('Révoquer l’accès privé ? Le joueur devra se reconnecter et recevoir une nouvelle invitation.'))return;await mutate('revokeAccess',{sessionId:currentSession.id,uid:b.dataset.uid});notice('Accès privé révoqué.');}
    else if(a==='redeem'){await api('redeem',{sessionId:b.dataset.sid,token:location.hash.split('/')[3]});location.replace(`#/play/${b.dataset.sid}`);return;}
    else if(a==='readBriefing'){await mutate('confirmBriefing',{sessionId:b.dataset.id});notice('Lecture du briefing confirmée.');}
    else if(a==='cancel'){if(!confirm('Annuler votre inscription et libérer votre place ?'))return;await mutate('cancelRegistration',{sessionId:b.dataset.id});}
    await route();
  }catch(e){notice(errors[e.code]||e.message,true);}finally{busy=false;b.disabled=false;}
});
document.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-form]');if(!form)return;event.preventDefault();if(busy)return;
  busy=true;const b=form.querySelector('button[type="submit"],button:not([type])');if(b)b.disabled=true;
  try{const v=formValues(form),kind=form.dataset.form;let destination;const submitVersion=routeVersion;
    if(kind==='scenario'){const d=await mutate('createScenario',v);destination=`scenario/${d.id}`;}
    else if(kind==='character'){v.relations=collectNarrative(form,'relations');v.objectives=collectNarrative(form,'objectives');if(form.dataset.scope==='session')await mutate('saveSessionCharacter',{...v,sessionId:currentSession.id,characterId:form.dataset.id,revision:currentSession.revision});else await mutate('saveCharacter',{...v,scenarioId:currentScenario.id,characterId:form.dataset.id||undefined,revision:currentScenario.revision});}
    else if(kind==='item')await mutate(form.dataset.scope==='session'?'saveSessionItem':'saveItem',{...v,consumable:v.consumable==='on',unitVolume:v.unitVolume?Number(v.unitVolume):null,id:form.dataset.id||undefined,revision:Number(form.dataset.revision),[form.dataset.scope==='session'?'sessionId':'scenarioId']:form.dataset.parent});
    else if(kind==='inventorySeed'){
      const items=Array.from(form.querySelectorAll('[data-seed-row]')).filter(row=>row.querySelector('[data-seed-picked]').checked).map(row=>({itemId:row.dataset.seedRow,quantity:Number(row.querySelector('[data-seed-quantity]').value)}));
      const payload={scenarioId:form.dataset.parent,revision:Number(form.dataset.revision),characterId:form.dataset.character,items},d=await api('prepareStartingInventory',payload);if(submitVersion!==routeVersion)return;modal(inventoryUi.seedConfirm(d,payload));return;
    }
    else if(kind==='inventoryGrant'){
      const payload={...v,quantity:Number(v.quantity),sessionId:form.dataset.parent,revision:Number(form.dataset.revision)},d=await api('prepareGrantItem',payload);if(submitVersion!==routeVersion)return;modal(inventoryUi.grantConfirm(d,payload));return;
    }
    else if(kind==='transferPrepare'){
      const payload={sessionId:form.dataset.sid,lotId:form.dataset.lot,quantity:Number(v.quantity),recipientId:badgeRecipient(v.badgeUrl,location.origin,form.dataset.sid)};
      const d=await api('prepareLotTransfer',payload);if(submitVersion!==routeVersion)return;modal(transferUi.confirm(d,payload));return;
    }
    else if(kind==='transferCommand')await mutate(form.dataset.command,{...JSON.parse(form.dataset.payload),...(form.dataset.command==='acceptLotTransfer'?{received:v.received==='on'}:{})});
    else if(kind==='inventoryConfirm')await mutate(form.dataset.command,JSON.parse(form.dataset.payload));
    else if(kind==='lotCorrection')await mutate('correctLot',{...v,sessionId:form.dataset.parent,revision:Number(form.dataset.revision),lotId:form.dataset.lot,lotRevision:Number(form.dataset.lotRevision),quantity:Number(v.quantity)});
    else if(kind==='healthRules'){
      const rules={enabled:v.enabled==='on',defaultMaxHp:v.defaultMaxHp?Number(v.defaultMaxHp):null,returnMode:v.returnMode,allowed:Object.fromEntries(['discover','share','publish','heal','transfer'].map(k=>[k,v[k]==='on']))};
      await mutate(form.dataset.scope==='session'?'saveSessionHealth':'saveScenarioHealth',{rules,reason:v.reason,revision:Number(form.dataset.revision),[form.dataset.scope==='session'?'sessionId':'scenarioId']:form.dataset.parent});
    }
    else if(kind==='healthCorrection')await mutate('correctHealth',{sessionId:form.dataset.sid,characterId:form.dataset.character,revision:Number(form.dataset.revision),healthRevision:Number(form.dataset.healthRevision),hp:Number(v.hp),maxHp:Number(v.maxHp),outOfCombat:v.outOfCombat==='on',reason:v.reason});
    else if(kind==='damagePrepare'){
      const payload={sessionId:form.dataset.sid,amount:Number(v.amount)},d=await api('prepareDamage',payload);if(submitVersion!==routeVersion)return;modal(healthUi.confirm('applyDamage',d,payload));return;
    }
    else if(kind==='treatmentPrepare'){
      const payload={sessionId:form.dataset.sid,skillId:form.dataset.skill,targetId:form.dataset.target||badgeRecipient(v.badgeUrl,location.origin,form.dataset.sid),...(v.lotId?{lotId:v.lotId}:{})},d=await api('prepareTreatment',payload);if(submitVersion!==routeVersion)return;modal(healthUi.confirm('applyTreatment',d,payload));return;
    }
    else if(kind==='healthConfirm'){
      const payload=JSON.parse(form.dataset.payload);await mutate(form.dataset.command,payload);destination=`health/${payload.sessionId}`;
    }
    else if(kind==='ability'){
      const scope=form.dataset.scope,skills=abilityRows(form);
      await mutate(form.dataset.kind==='skills'?(scope==='session'?'saveSessionSkill':'saveSkill'):(scope==='session'?'saveSessionClass':'saveClass'),{...v,healing:v.kind&&v.kind!=='PASSIVE'?{effect:'HEAL_HP',amount:Number(v.healAmount),uses:v.healUses?Number(v.healUses):null,cooldownSeconds:Number(v.healCooldown),consumable:v.healItemId?{itemId:v.healItemId,quantity:Number(v.healItemQuantity)}:null}:null,skills,id:form.dataset.id||undefined,revision:Number(form.dataset.revision),[scope==='session'?'sessionId':'scenarioId']:form.dataset.parent});
    }
    else if(kind==='abilityPrepare'){
      const payload={...v,classId:v.classId||null,overrides:abilityRows(form),published:v.published==='on',characterId:form.dataset.character,revision:Number(form.dataset.revision),[form.dataset.scope==='session'?'sessionId':'scenarioId']:form.dataset.parent};
      const d=await api('prepareAbilityProfile',payload);if(submitVersion!==routeVersion)return;modal(abilityUi.confirm(d,payload));return;
    }
    else if(kind==='abilityConfirm')await mutate('setAbilityProfile',JSON.parse(form.dataset.payload));
    else if(kind==='noteEditor'){
      const d=await mutate('saveNote',{sessionId:form.dataset.sid,noteId:form.dataset.id||undefined,revision:Number(form.dataset.revision),title:v.title,body:v.body});
      form.dataset.dirty='false';destination=`note/${form.dataset.sid}/${d.id}`;
    }
    else if(kind==='noteSharePrepare'){
      const recipientId=badgeRecipient(v.badgeUrl,location.origin,form.dataset.sid);
      const d=await api('prepareNoteShare',{sessionId:form.dataset.sid,noteId:form.dataset.id,revision:Number(form.dataset.revision),authorCharacterId:form.dataset.author,authorName:form.dataset.authorName,recipientId,shareMode:v.shareMode});
      if(submitVersion!==routeVersion)return;modal(notebookUi.confirm(form.dataset.sid,d));return;
    }
    else if(kind==='noteShareConfirm')await mutate('shareNote',{sessionId:form.dataset.sid,noteId:form.dataset.id,revision:Number(form.dataset.revision),authorCharacterId:form.dataset.author,authorName:form.dataset.authorName,recipientId:form.dataset.recipient,recipientVersion:form.dataset.recipientVersion,shareMode:form.dataset.shareMode});
    else if(kind==='knowledge'){
      const scope=form.dataset.scope,context=scope==='session'?currentSession:currentScenario;
      await mutate(scope==='session'?'saveSessionKnowledge':'saveKnowledge',{...v,qrSkillId:v.qrSkillId||null,qrSkillLevel:v.qrSkillId?Number(v.qrSkillLevel):null,qrEnabled:v.qrEnabled==='on',initialCharacterIds:new FormData(form).getAll('initialCharacterIds'),qrCharacterIds:new FormData(form).getAll('qrCharacterIds'),revision:context.revision,knowledgeId:form.dataset.id||undefined,...(scope==='session'?{sessionId:context.id}:{scenarioId:context.id})});
    }
    else if(kind==='knowledgeGrant')await mutate('grantKnowledge',{sessionId:currentSession.id,knowledgeId:form.dataset.id,knowledgeRevision:Number(form.dataset.revision),grantRevision:Number(form.elements.characterId.selectedOptions[0].dataset.grantRevision),characterId:v.characterId,enabled:v.enabled==='true',reason:v.reason});
    else if(kind==='knowledgeSharePrepare'){
      const recipientId=badgeRecipient(v.badgeUrl,location.origin,form.dataset.sid),d=await api('prepareKnowledgeShare',{sessionId:form.dataset.sid,knowledgeId:form.dataset.id,recipientId,receiptRevision:Number(form.dataset.receipt)});
      if(submitVersion!==routeVersion)return;
      modal(`<p class="eyebrow">Confirmer le partage</p><h2>Transmettre à ${esc(d.recipient.displayName)}</h2><p>Vous transmettez une copie de <strong>${esc(d.knowledge.title)}</strong>. Le destinataire verra votre nom de personnage : <strong>${esc(d.authorName)}</strong>. Votre propre accès est conservé.</p><form data-form="knowledgeShareConfirm" data-sid="${esc(form.dataset.sid)}" data-id="${esc(d.knowledge.id)}" data-recipient="${esc(d.recipient.id)}" data-receipt="${d.receiptRevision}"><button class="primary" type="submit">Transmettre cette copie</button></form>`);return;
    }
    else if(kind==='knowledgeShareConfirm')await mutate('shareKnowledge',{sessionId:form.dataset.sid,knowledgeId:form.dataset.id,recipientId:form.dataset.recipient,receiptRevision:Number(form.dataset.receipt)});
    else if(kind==='group'){
      const scope=form.dataset.scope,context=scope==='session'?currentSession:currentScenario;
      await mutate(scope==='session'?'saveSessionGroup':'saveGroup',{...v,members:groupMembers(form),revision:context.revision,groupId:form.dataset.id||undefined,...(scope==='session'?{sessionId:context.id}:{scenarioId:context.id})});
    }
    else if(kind==='groupModule')await mutate('setGroupModule',{sessionId:currentSession.id,revision:currentSession.revision,enabled:!currentSession.groupsEnabled,reason:v.reason});
    else if(kind==='groupUpdate')await mutate('publishGroupUpdate',{sessionId:form.dataset.sid,groupId:form.dataset.id,title:v.title,body:v.body});
    else if(kind==='staff')await mutate('setStaff',{...v,active:v.active==='on',sessionId:currentSession.id,revision:currentSession.revision});
    else if(kind==='session'){const fields=v.fields.split('\n').map(s=>s.trim()).filter(Boolean).map((label,i)=>({id:`question_${i+1}`,label,required:false}));const d=await mutate('createSession',{...v,scenarioId:currentScenario.id,versionId:form.dataset.version,capacity:Number(v.capacity),fields});destination=`session/${d.id}`;}
    else if(kind==='register'){const answers=Object.fromEntries(Object.entries(v).filter(([k])=>k.startsWith('field_')).map(([k,x])=>[k.slice(6),x]));await mutate('register',{sessionId:form.dataset.id,name:v.name,answers});}
    else if(kind==='status')await mutate('setRegistrationStatus',{sessionId:currentSession.id,uid:form.dataset.uid,status:v.status});
    else if(kind==='assign')await mutate('assign',{sessionId:currentSession.id,uid:form.dataset.uid,characterId:v.characterId,replace:v.replace==='on'});
    if(submitVersion!==routeVersion)return;
    dialog.close();notice('Enregistré.');if(destination&&location.hash!==`#/${destination}`)location.hash=`#/${destination}`;else await route();
  }catch(e){notice(errors[e.code]||e.message,true);}finally{busy=false;if(b)b.disabled=false;}
});
document.addEventListener('input',event=>{
  if(event.target.closest('[data-form="noteEditor"]'))event.target.closest('form').dataset.dirty='true';
  if(event.target.matches('[data-inventory-search]'))filterInventory(event.target.closest('[data-inventory-root]'));
  if(event.target.matches('[data-note-search]'))filterNotes();
  if(event.target.matches('[data-filter]')){
  const term=event.target.value.toLowerCase().trim();
  for(const row of app.querySelectorAll('[data-search]'))row.hidden=!row.dataset.search.includes(term);
}});
document.addEventListener('change',event=>{
  if(event.target.matches('[data-form="ability"] select[name="kind"]')){const fields=event.target.form.querySelector('[data-healing-fields]');fields.hidden=event.target.value==='PASSIVE';fields.disabled=fields.hidden;}
  if(event.target.matches('[data-form="healthCorrection"] input[name="hp"]')&&Number(event.target.value)===0)event.target.form.elements.outOfCombat.checked=true;
  if(event.target.matches('[data-seed-picked]'))event.target.closest('[data-seed-row]').querySelector('[data-seed-quantity]').disabled=!event.target.checked;
  if(event.target.matches('[data-inventory-status],[data-inventory-category]'))filterInventory(event.target.closest('[data-inventory-root]'));
  if(event.target.matches('[data-form="lotCorrection"] input[name="quantity"]')&&Number(event.target.value)===0)event.target.form.elements.status.value='DESTROYED';
  if(event.target.matches('[data-note-state]'))filterNotes();
  if(event.target.matches('[data-knowledge-filter]')){
    const root=event.target.closest('.narrow')??event.target.closest('dialog');
    const kind=root.querySelector('[data-knowledge-filter="kind"]').value,read=root.querySelector('[data-knowledge-filter="read"]').value;
    let visible=0;for(const item of root.querySelectorAll('[data-knowledge-kind]')){item.hidden=!(kind==='ALL'||item.dataset.knowledgeKind===kind)||!(read==='ALL'||item.dataset.knowledgeRead===read);if(!item.hidden)visible++;}
    root.querySelector('[data-knowledge-empty]').hidden=visible>0;
  }

  if(event.target.matches('[data-form="group"] select[name="visibility"]')){
    for(const field of event.target.form.querySelectorAll('[data-member-field="publicAffiliation"]')){field.disabled=event.target.value==='SECRET';if(field.disabled)field.checked=false;}
  }
});
document.addEventListener('click',event=>{if(event.target.closest('a[href]')&&dirtyNote()&&!confirm('Quitter sans enregistrer les modifications de votre note ?'))event.preventDefault();},true);
dialog.addEventListener('cancel',event=>{if(dirtyNote()&&!confirm('Quitter sans enregistrer les modifications de votre note ?'))event.preventDefault();});
dialog.addEventListener('close',()=>{dialog.innerHTML='';});
window.addEventListener('beforeunload',event=>{if(dirtyNote()){event.preventDefault();event.returnValue='';}});
window.addEventListener('hashchange',route);
// Clear private DOM immediately when leaving the page or signing out. No offline private cache.
window.addEventListener('pagehide',()=>{app.innerHTML='';dialog.innerHTML='';currentSession=null;currentScenario=null;editingCharacter=null;});
window.addEventListener('pageshow',e=>{if(e.persisted)route();});
onAuthStateChanged(auth,()=>{updateAccount();route();});
