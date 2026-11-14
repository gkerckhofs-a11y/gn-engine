import {escapeHtml as esc} from './groups.mjs';
export const demoAdministrationPath=sid=>`#/session/${encodeURIComponent(sid)}`;
export const demoPlayerPath=(sid,role)=>`#/play/${encodeURIComponent(sid)}${role?`?${new URLSearchParams({demoRole:role})}`:''}`;
export function selectDemoRole(context,query,storage,sid){
 const requested=new URLSearchParams(query).get('demoRole');
 if(requested!==null&&(!context||!context.profiles.some(p=>p.id===requested)))throw Error('Ce profil de test est indisponible ou non autorisé pour ce compte.');
 if(!context)return null;
 const saved=storage.getItem(`demo-role:${sid}`);
 return requested??(context.profiles.some(p=>p.id===saved)?saved:context.profiles.some(p=>p.id==='PIL')?'PIL':context.profiles[0]?.id);
}
export function demoRolePath(hash,role){const [path,query='']=hash.split('?'),params=new URLSearchParams(query);params.set('demoRole',role);return `${path}?${params}`;}
export async function dashboardDemoContexts(api,sessions){
 const contexts=new Map();await Promise.all(sessions.filter(s=>s.role==='OWNER'&&s.stage!=='ARCHIVED').map(async s=>{try{const d=await api('soloDemoContext',{sessionId:s.id},true);if(d?.table)contexts.set(s.id,d);}catch{/* A failed read must never suggest test access. */}}));return contexts;
}
export async function loadDemoCharacters(api,s,context){
 if(!context?.table||s.role!=='OWNER'||!s.permissions?.content||s.stage==='ARCHIVED')return null;
 const results=await Promise.allSettled(context.profiles.map(p=>api('mySession',{sessionId:s.id,demoRole:p.id},true)));
 return {...context,characters:context.profiles.map((profile,i)=>({profile,own:results[i].status==='fulfilled'?results[i].value:null}))};
}
export function sessionActionsHtml(s,demo){
 const manage=['OWNER','MJ'].includes(s.role);
 return `<div class="row">${manage||s.role==='RECEPTION'?`<a class="button ${manage?'primary':'quiet'}" href="${esc(demoAdministrationPath(s.id))}">${manage?'Administrer la session':'Gérer l’accueil'}</a>`:''}${demo?.table&&s.role==='OWNER'&&s.stage!=='ARCHIVED'?`<a class="button quiet" href="${esc(demoPlayerPath(s.id))}">Tester comme joueur</a>`:''}</div>`;
}
export function demoCharactersHtml(d,origin=''){
 if(!d?.characters)return '';
 const states={ACTIVE:'Actif',STABILIZED:'Stabilisé à 0 PV',URGENT:'Secours urgent',EXPIRED:'Délai de secours écoulé',DEAD:'Décédé'};
 return `<section class="panel demo-characters"><h2>Mes personnages de test</h2><p>Les huit identités fictives partagent cette session. Changer d’espace ou de personnage conserve les actions en cours et leurs réservations. Les liens de test exigent votre compte propriétaire habilité.</p><div class="demo-character-grid">${d.characters.map(({profile:p,own})=>{
 const c=own?.character,h=own?.health,skills=c?.abilities?.skills??[],url=demoPlayerPath(d.sessionId,p.id);
 return `<article class="panel"><h3>${esc(c?.displayName??p.name)}</h3><p>${esc(p.label)}</p>${c?`<p>Identifiant public : <strong>${esc(c.shortCode??'Non renseigné')}</strong></p><p>État : ${esc(states[h?.status]??(h?.outOfCombat?'Hors combat':h?.hp>0?'Actif':'À consulter'))}${h?` · ${esc(h.hp)} / ${esc(h.maxHp)} PV`:''}${own.actionPoints?.reserved?` · ${esc(own.actionPoints.reserved)} PA engagé(s)`:''}</p><ul>${skills.map(k=>`<li>${esc(k.name??k.id)} · niveau ${esc(k.level)}</li>`).join('')}</ul><div class="row"><a class="button primary" href="${esc(url)}">Tester ce personnage<span class="sr-only"> : ${esc(p.label)}</span></a><button type="button" class="quiet" data-action="copy" data-value="${esc(origin+'/'+url)}">Copier le lien<span class="sr-only"> : ${esc(p.label)}</span></button></div>`:'<p role="status">Personnage non accessible avec les droits actuels. Actualisez ou vérifiez son affectation.</p>'}</article>`;
 }).join('')}</div></section>`;
}
export function preparationSteps(c){
 const s=c.session,e=c.entry,version=e?.versionId??s.versionId,regs=e?.registrations,chars=s.characters??[],assigned=chars.filter(x=>x.assignedUid&&x.birth).length;
 const route=`session/${s.id}/prepare`,master=s.campaignId&&s.role==='OWNER'?`central/${s.campaignId}/M2?session=${s.id}`:route;
 const prepared=regs?regs.filter(r=>r.characterId||r.m2Prepared).length:null,total=regs?.length??null;
 const blockers=c.releasePreview?.blockers??[];
 return [
  {title:'Choisir ou créer un scénario',state:s.scenarioId||s.campaignId?'Terminé':'À préparer',detail:s.scenarioId?'Scénario associé à cette session.':s.campaignId?'Campagne associée à cette session.':'Choisissez un scénario depuis l’accueil organisateur.',path:s.scenarioId?`scenario/${s.scenarioId}?session=${s.id}`:master},
  {title:'Vérifier les paramètres de session et le Master',state:version?'Version publiée':s.capacity>0?'À vérifier':'À compléter',detail:version?'La session conserve sa version publiée.':s.capacity>0?`Capacité configurée : ${s.capacity}. Le contrôle du Master reste nécessaire.`:'La capacité et le Master doivent être vérifiés.',path:route},
  {title:'Préparer les joueurs et leurs personnages',state:total!==null?total>0&&prepared===total?'Terminé':'À compléter':assigned>0?'Personnages attribués':'À vérifier',detail:total!==null?`${prepared} dossier(s) préparé(s) sur ${total} approuvé(s) ; ${assigned} personnage(s) attribué(s).`:`${assigned} personnage(s) attribué(s). Vérifiez les admissions et affectations.`,path:s.spaceOutlaws||s.preparationKind?`admissions-admin/${s.id}`:route},
  {title:'Contrôler et publier la version',state:version?'Terminé':c.unavailable?.includes('publication')?'Contrôle indisponible':blockers.length?'Bloqué':c.releasePreview?'Contrôle réussi · publication à confirmer':'Contrôle à lancer',detail:version?'Version déjà publiée ; ne recommencez pas cette étape.':c.unavailable?.includes('publication')?'Impossible de charger le contrôle. Actualisez ou ouvrez la vérification de publication existante.':blockers.length?blockers.map(b=>`${b.entityId??''} ${b.message??b.code}`).join(' · '):c.releasePreview?'Utilisez la confirmation de publication existante.':'Ouvrez les contrôles de publication dans la préparation.',path:route},
  {title:'Ouvrir le briefing et lancer le jeu',state:['EN_JEU','PAUSE','FINISHED','ARCHIVED'].includes(s.stage)?'Terminé':s.stage==='BRIEFING'?'Briefing ouvert':'À ouvrir',detail:s.stage==='PAUSE'?'La session est en pause ; utilisez la reprise existante.':s.stage==='EN_JEU'?'Le jeu est déjà lancé.':['FINISHED','ARCHIVED'].includes(s.stage)?'La session est terminée.':!version?'Publiez une version avant de poursuivre.':'Utilisez les commandes de briefing et de rythme de jeu.',path:`session/${s.id}/animate`},
 ];
}
export function preparationGuideHtml(c){
 if(!c.session.permissions?.content)return '';
 return `<section class="panel preparation-guide"><h2>Préparer votre session</h2><p>Suivez les étapes dans l’ordre. Les contrôles et confirmations du Master restent obligatoires.</p><ol>${preparationSteps(c).map(s=>`<li><div><strong>${esc(s.title)}</strong> <span class="pill">${esc(s.state)}</span><p>${esc(s.detail)}</p><a class="button quiet small" href="#/${esc(s.path)}">Ouvrir l’outil<span class="sr-only"> : ${esc(s.title)}</span></a></div></li>`).join('')}</ol></section>`;
}
export async function loadPreparationStatus(api,c,entry){
 if(!c)return;c.entry=entry;c.publication=entry.versionId?'published':'draft';
 if(c.view==='prepare'&&!entry.versionId&&entry.canRelease){try{c.releasePreview=await api('previewSpaceOutlawsRelease',{sessionId:c.session.id},true);}catch{c.unavailable.push('publication');}}
}
