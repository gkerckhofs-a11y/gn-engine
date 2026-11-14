import {demoPlayerPath,loadDemoCharacters,demoCharactersHtml,preparationGuideHtml} from './solo-demo-navigation.mjs';
import {escapeHtml as esc} from './groups.mjs';
import {centralWorkshops} from '../src/shared/central-workshops.mjs';

const stages={PREPARATION:'Préparation',BRIEFING:'Briefing',EN_JEU:'En jeu',PAUSE:'En pause',FINISHED:'Terminée',ARCHIVED:'Archivée'};
const eventLabels={setStage:'Rythme de jeu modifié',releaseSpaceOutlaws:'Version publiée',birthSpaceOutlaws:'Personnage attribué',requestSoLaunch:'Décollage demandé',assignSoCockpit:'Poste cockpit attribué',stopSafetyMJ:'STOP SÉCURITÉ',resumeSafety:'Reprise après STOP',decideCustomsAppeal:'Décision sur un recours'};
const views={prepare:'Préparer',animate:'Animer',supervise:'Superviser'};
const direct=new Set(['session','so-entry','group-admin','admissions-admin','directory-admin','announcements-admin','contracts-admin','contract-admin','bounties-admin','bounty-admin','spaceport-admin','ship-admin','space-combats-admin','space-rescues-admin','boarding-admin','space-maintenance-admin','towing-admin','module-mandates-admin','cargo-admin','cargo-port-admin','warehouses-admin','prices-admin','shops-admin','customs-admin','customs-inspection-admin','customs-detention-admin','intrusion-admin','forgery-inspect-admin','escape-admin','intelligence-admin','learning-admin','succession-admin']);
const pathLink=(path,label,extra='')=>`<a href="${path.startsWith('/')?esc(path):`#/${esc(path)}`}" ${extra}>${esc(label)}</a>`;
const campaignPages=new Set(['central','central-check','central-snapshots','central-snapshot','campaign']);
export function organizerRoute(page,id,token,sessionHint){
 if(/^[A-Za-z0-9_-]{1,128}$/.test(sessionHint??'')&&(campaignPages.has(page)||page==='scenario'))return {page,sessionId:sessionHint,home:false,view:'prepare',...(page==='scenario'?{scenarioId:id}:{campaignId:id})};
 const sessionId=direct.has(page)?id:['field-admin','person-admin','media'].includes(page)&&id==='session'?token:null;
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId??''))return null;
 return {page,sessionId,home:page==='session'||page==='so-entry',view:views[token]?token:page==='so-entry'||['admissions-admin','group-admin'].includes(page)?'prepare':null};
}
export function organizerView(route,s){return route.view??(route.home&&(!s.permissions?.content||['PREPARATION','BRIEFING'].includes(s.stage))?'prepare':route.home&&['FINISHED','ARCHIVED'].includes(s.stage)?'supervise':'animate');}
export function organizerTools(s,sabacc){
 const sid=s.id,so=s.spaceOutlaws??(s.preparationKind?{}:null),p=s.permissions??{},items=[];
 const add=(view,label,path,help,advanced=false)=>items.push({view,label,path,help,advanced});
 add('prepare','Participants et attributions',`session/${sid}/prepare`,'Valider les accès et attribuer les personnages.');
 if(p.content){
  if(s.preparationKind||so)add('prepare','Candidatures et invitations',`admissions-admin/${sid}`,'Examiner les dossiers et préparer l’entrée des joueurs.');
  if(s.campaignId&&s.role==='OWNER')for(const w of centralWorkshops)add('prepare',w.label,`central/${s.campaignId}/${w.id}?session=${sid}`,`${w.id} · Éditer, importer, exporter et vérifier les définitions.`,true);
  if(!so&&s.scenarioId)add('prepare','Scénario et versions',`scenario/${s.scenarioId}?session=${sid}`,'Retrouver les définitions et les versions publiées.');
  if(so?.groupsVersion===1||!so&&s.groupsEnabled)add('prepare','Groupes et factions',`group-admin/${sid}`,'Définir les groupes, leurs membres et leurs accès.');
  if(!so||so.mediaVersion===1)add('prepare','Images et médias',`media/session/${sid}`,'Attribuer les images de cette session.');
  const live=[
   ['missionsVersion','Annonces et missions','announcements-admin','Publier une annonce et suivre les candidatures.'],
   ['missionsVersion','Contrats et arbitrages','contracts-admin','Examiner les preuves et régler les missions.'],
   ['bountyVersion','Primes et preuves','bounties-admin','Suivre les primes et leurs demandes de récompense.'],
   ['navigationVersion','Décollages et cockpits','spaceport-admin','Traiter les demandes, affecter un poste et suivre plusieurs vols.'],
   ['logisticsVersion','Entretien des vaisseaux','space-maintenance-admin','Suivre les réparations et les fournitures.'],
   ['logisticsVersion','Soutes et fret','cargo-admin','Suivre les cargaisons et les opérations de fret.'],
   ['combatVersion','Dépannage spatial','space-rescues-admin','Suivre les interventions et les vaisseaux immobilisés.'],
   ['moduleMandatesVersion','Mandats des modules','module-mandates-admin','Gérer les interventions autorisées sur les modules.'],
   ['combatVersion','Combats spatiaux','space-combats-admin','Suivre les rencontres et les interventions en combat.'],
   ['shopsVersion','Boutiques et caisses','shops-admin','Gérer les stocks et les retraits auprès des comptoirs.'],
   ['intelligenceVersion','Réseau d’informateurs','intelligence-admin','Consulter et suivre les demandes de renseignements.'],
   ['learningVersion','Apprentissages','learning-admin','Suivre les formations et les apprentissages.'],
   ['successionVersion','Relèves après décès','succession-admin','Préparer le retour en jeu avec une nouvelle identité.'],
   ['customsDetentionVersion','Incidents douaniers','customs-detention-admin','Examiner les retenues, saisies et recours.'],
   ['escapeVersion','Captivité et évasions','escape-admin','Suivre les captifs et leurs tentatives.'],
   ['inf01Version','Intrusions en cours','intrusion-admin','Interrompre une opération et libérer ses réservations.'],
   ['inf03Version','Contrôle des documents','forgery-inspect-admin','Vérifier un document présenté au MJ.'],
  ];
  for(const [flag,label,page,help]of live)if(so?.[flag]===1||!so&&['announcements-admin','contracts-admin','bounties-admin'].includes(page))add('animate',label,`${page}/${sid}`,help);
  if(so?.actionsVersion===1||!so)add('animate','QR et actions de terrain',`field-admin/session/${sid}`,'Retrouver les lieux, leurs QR et les actions enregistrées.');
  if(so?.healthVersion===1||!so)add('animate','Interactions et soins',`person-admin/session/${sid}`,'Suivre les soins et les interactions en cours.');
  if(so)add('animate','Répertoire des personnages',`directory-admin/${sid}`,'Gérer la visibilité des identités dans le répertoire.');
  if(!so){add('animate','Fret et cargaisons',`cargo-admin/${sid}`,'Suivre les vaisseaux et les cargaisons.');add('animate','Entrepôts',`warehouses-admin/${sid}`,'Suivre les stocks et recharges.');add('animate','Cours et prix',`prices-admin/${sid}`,'Gérer les cours et événements économiques.');}
  if(sabacc?.admin)add('animate','Régie Sabacc','/sabacc/?view=admin','Ouvrir les tables, gérer les places, les mises et les QR.');
 }
 add('supervise','Bilan et journal',`session/${sid}/supervise`,'Consulter les indicateurs et les dernières opérations disponibles.');
 return items;
}
export async function loadOrganizer(api,route){
 const s=await api('session',{sessionId:route.sessionId});
 if(route.campaignId&&s.campaignId!==route.campaignId||route.scenarioId&&s.scenarioId!==route.scenarioId)throw new Error('ORGANIZER_CONTEXT_MISMATCH');
 const context={session:s,route,view:organizerView(route,s),loadedAt:new Date(),unavailable:[]};
 // These are projections already protected by their respective services, never new permissions.
 const reads=[];
 if(s.role==='OWNER'&&s.permissions.content&&s.stage!=='ARCHIVED')reads.push(['demo',async()=>{const demo=await api('soloDemoContext',{sessionId:s.id},true);return route.home?loadDemoCharacters(api,s,demo):demo?.table?demo:null;}]);
 if(s.permissions.content)reads.push(['sabacc',()=>api('sabaccHome')]);
 if(route.home&&s.permissions.content){
  if(s.spaceOutlaws?.healthVersion===1)reads.push(['health',()=>api('survivalAdmin',{sessionId:s.id})]);
  if(s.spaceOutlaws?.navigationVersion===1)reads.push(['spaceport',()=>api('spaceportAdmin',{sessionId:s.id})]);
  if(s.spaceOutlaws?.customsDetentionVersion===1)reads.push(['appeals',()=>api('customsAppealsAdmin',{sessionId:s.id})]);
 }
 const results=await Promise.allSettled(reads.map(([,read])=>read()));
 results.forEach((result,i)=>{if(result.status==='fulfilled')context[reads[i][0]]=result.value;else context.unavailable.push(reads[i][0]);});
 return context;
}
export function organizerAlerts(c){
 const s=c.session,alerts=[];
 for(const ship of c.spaceport?.ships??[])if(ship.cockpit?.status==='WAITING')alerts.push({key:`ship:${ship.shipId}`,label:`Décollage demandé · ${ship.name}`,path:`spaceport-admin/${s.id}`});
 for(const a of c.appeals?.appeals??[])if(a.status==='PENDING')alerts.push({key:`appeal:${a.id}`,label:'Recours douanier à examiner',path:`customs-detention-admin/${s.id}`});
 for(const person of c.health?.characters??[])if(['URGENT','EXPIRED'].includes(person.status))alerts.unshift({key:`health:${person.id}`,label:`${person.status==='EXPIRED'?'Échéance vitale atteinte':'Secours urgent'} · ${person.name}`,path:`session/${s.id}/animate`});
 if(c.health?.session.safetyStopped)alerts.unshift({key:'safety',label:'STOP SÉCURITÉ actif',path:`session/${s.id}/animate`});
 return [...new Map(alerts.map(a=>[a.key,a])).values()];
}
export function organizerOverview(c){
 const s=c.session,regs=s.registrations??[],active=regs.filter(r=>r.accessActive).length,alerts=organizerAlerts(c);
 const stat=(value,label,path)=>pathLink(path,`${value} · ${label}`,'class="org-metric"');
 return `<section class="org-overview" aria-label="Suivi de la session"><div class="org-metrics">${stat(s.accepted??regs.length,'places acceptées',`session/${s.id}/prepare`)}${stat(active,'accès privés activés',`session/${s.id}/prepare`)}${stat(s.characters?.filter(x=>x.assignedUid).length??0,'personnages attribués',`session/${s.id}/prepare`)}${c.spaceport?stat(c.spaceport.ships.filter(x=>x.journey).length,'vaisseaux en voyage',`spaceport-admin/${s.id}`):''}</div>${alerts.length?`<section class="panel org-alerts"><h2>À traiter</h2><ul>${alerts.map(a=>`<li>${pathLink(a.path,a.label)}</li>`).join('')}</ul></section>`:''}${c.unavailable.length?'<p role="status">Certains suivis sont indisponibles. Actualisez ou ouvrez la régie concernée ; aucune absence d’incident ne peut être déduite.</p>':''}<p class="muted"><small>État au chargement · ${esc(c.loadedAt.toLocaleTimeString('fr-FR'))}. Les accès activés ne mesurent pas les joueurs actuellement connectés.</small></p></section>`;
}
export function organizerCharacters(s){
 if(!s.permissions.content)return '';
 return `<section class="panel org-character-search"><h2>Retrouver un personnage</h2><label>Nom, prénom ou métier<input type="search" data-org-character placeholder="Rechercher dans cette session"></label><div class="org-character-results">${(s.characters??[]).map(c=>`<article data-org-name="${esc(`${c.public.displayName} ${c.public.profession??''}`.toLocaleLowerCase('fr'))}"><strong>${esc(c.public.displayName)}</strong><small>${esc(c.public.profession??'')}</small><div class="row"><button data-action="preview" data-id="${esc(c.id)}">Consulter la fiche</button></div></article>`).join('')||'<p>Aucun personnage dans cette session.</p>'}</div><p data-org-no-match hidden>Aucun personnage ne correspond.</p></section>`;
}
export function organizerJournal(s){
 if(!s.permissions.content)return '';
 return `<section class="panel"><h2>Journal des dernières opérations</h2><p><em>Les 50 dernières opérations renvoyées par la session. Les régies conservent leurs historiques détaillés.</em></p>${(s.audit??[]).map(a=>`<article class="org-log"><time>${esc(new Date(a.at).toLocaleString('fr-FR'))}</time><strong>${esc(eventLabels[a.action]??'Opération enregistrée')}</strong><small>${esc(a.action)}</small>${a.reason?`<p>${esc(a.reason)}</p>`:''}<small>Auteur : ${esc(a.actorUid??'')}</small></article>`).join('')||'<p>Aucune opération dans ce journal.</p>'}</section>`;
}
export function organizerShell(c,content){
 if(!c)return content;
 const s=c.session,view=c.view,tools=organizerTools(s,c.sabacc),home=`session/${s.id}`;
 return `<div class="org-shell"><div class="org-navigation"><header class="org-context"><div><p class="eyebrow">Régie organisateur · ${esc({OWNER:'Propriétaire',MJ:'MJ',RECEPTION:'Accueil'}[s.role]??s.role)}</p><strong class="org-title">${esc(s.title)}</strong><div class="org-context-meta"><span>${s.campaignEpisode?`Épisode ${esc(s.campaignEpisode)} · `:''}${esc(stages[s.stage]??s.stage)}</span><span>Version : ${s.versionId||c.publication==='published'?'publiée':c.publication==='draft'?'non publiée':s.preparationKind?'à vérifier dans Préparer':'non renseignée'}</span><span>${s.registrationOpen?'Inscriptions ouvertes':'Inscriptions fermées'}</span></div></div><div class="row">${c.demo?.table?pathLink(demoPlayerPath(s.id).slice(2),'Tester la session','class="button primary"'):''}${pathLink('','Changer de session','class="button quiet"')}${pathLink('','Accueil orga','class="button quiet"')}<button data-action="refresh" class="quiet">Actualiser</button></div></header><nav class="org-tabs" aria-label="Organisation de la session">${Object.entries(views).map(([key,label])=>pathLink(`${home}/${key}`,label,view===key?'aria-current="page"':'')).join('')}</nav></div><div class="org-workspace"><aside class="org-sidebar"><label>Accès rapide<input type="search" data-org-tool placeholder="Cockpit, Sabacc, mission…"></label><details class="org-tool-list" open><summary>Outils de la session</summary><nav aria-label="Outils organisateur">${tools.filter(t=>!t.advanced).map(t=>pathLink(t.path,t.label,`data-org-tool-name="${esc(t.label.toLocaleLowerCase('fr'))}" data-org-tool-view="${t.view}" ${t.view===view?'':'hidden'}`)).join('')}</nav></details>${tools.some(t=>t.advanced)?`<details class="org-advanced-tools"><summary>Configuration avancée</summary><nav aria-label="Ateliers Master M1 à M7">${tools.filter(t=>t.advanced).map(t=>pathLink(t.path,t.label,`data-org-tool-name="${esc(t.label.toLocaleLowerCase('fr'))}" data-org-tool-view="advanced"`)).join('')}</nav></details>`:''}<p data-org-tools-empty hidden>Aucun outil accessible ne correspond.</p></aside><div class="org-main"><p class="org-breadcrumb">${pathLink(home,s.title)} <span aria-hidden="true">›</span> ${esc(views[view])}${!c.route.home?' › Régie':''}</p>${content}</div></div></div>`;
}
// Reparent existing controls rather than cloning them: one command, one handler.
export function organizeHome(root,c){
 if(!c)return;
 for(const link of root.querySelectorAll('a[href^="#/"]')){
  const path=link.getAttribute('href').slice(2),[page,id]=path.split('/');
  if(!path.includes('?')&&((campaignPages.has(page)&&id===c.session.campaignId)||(page==='scenario'&&id===c.session.scenarioId)))link.setAttribute('href',`#/${path}?session=${encodeURIComponent(c.session.id)}`);
 }
 const shortcuts=root.querySelector('.org-tool-list');if(shortcuts)shortcuts.open=!root.ownerDocument.defaultView.matchMedia('(max-width:800px)').matches;
 if(!c.route.home)return;
 const target=root.querySelector('.org-main');if(!target)return;
 const source=target.querySelector('[data-org-entry]');if(!source)return;
 const view=c.view;
 source.querySelectorAll('[data-org-section]').forEach(el=>{el.hidden=el.dataset.orgSection!==view;});
 target.querySelectorAll('[data-org-extra]').forEach(el=>{el.hidden=el.dataset.orgExtra!==view;});
 const top=root.ownerDocument.createElement('div');top.className='org-home';
 const allTools=organizerTools(c.session,c.sabacc),tools=allTools.filter(t=>!t.advanced&&t.view===view&&!t.path.startsWith(`session/${c.session.id}`)),advanced=allTools.filter(t=>t.advanced);
 const frequent=tools.filter(t=>['spaceport-admin','ship-admin','announcements-admin','field-admin'].includes(t.path.split('/')[0])||t.path.startsWith('/sabacc/'));
 top.innerHTML=`<h1>${esc(views[view])}</h1>${view==='prepare'?preparationGuideHtml(c):''}${demoCharactersHtml(c.demo,root.ownerDocument.defaultView.location.origin)}${view!=='prepare'?organizerOverview(c):''}${view==='animate'?`<nav class="org-frequent" aria-label="Actions fréquentes">${frequent.map(t=>pathLink(t.path,t.label,'class="button quiet"')).join('')}</nav><div class="org-operations"></div>`+organizerCharacters(c.session):''}<div class="org-cards">${tools.map(t=>`<a class="panel org-card" href="${t.path.startsWith('/')?esc(t.path):`#/${esc(t.path)}`}"><h2>${esc(t.label)} <span aria-hidden="true">↗</span></h2><p><em>${esc(t.help)}</em></p>${t.path.startsWith('/sabacc/')?`<span class="pill">${c.sabacc.enabled?'Module activé':'Module désactivé'}</span>`:''}</a>`).join('')}</div>${view==='prepare'&&advanced.length?`<details class="panel org-advanced"><summary>Configuration avancée — Master M1–M7</summary><p>Les sept ateliers restent disponibles pour modifier les définitions. Les contrôles de publication restent obligatoires.</p><div class="org-cards">${advanced.map(t=>`<a class="panel org-card" href="#/${esc(t.path)}"><h2>${esc(t.label)}</h2><p>${esc(t.help)}</p></a>`).join('')}</div></details>`:''}${view==='supervise'?organizerJournal(c.session):''}`;
 source.before(top);
 if(view==='animate'){
  const commands=source.querySelector('[data-org-section="animate"]');
  if(commands){commands.querySelectorAll('a').forEach(a=>a.remove());top.querySelector('.org-operations')?.append(commands);}
 }
 if(view==='animate'){
  const health=root.querySelector('[data-org-health]');
  if(health){
   const people=[...health.querySelectorAll('article')];
   if(people.length){const fold=root.ownerDocument.createElement('details');fold.innerHTML=`<summary>Suivi de ${people.length} personnage(s)</summary>`;fold.open=(c.health?.characters??[]).some(p=>['URGENT','EXPIRED'].includes(p.status));people[0].before(fold);people.forEach(person=>fold.append(person));}
   top.querySelector('.org-operations')?.append(health);
  }
 }
 const finish=root.querySelector('[data-org-section="animate"] [data-stage="FINISHED"]');
 if(finish){const advanced=root.ownerDocument.createElement('details');advanced.className='org-end-session';advanced.innerHTML='<summary>Clôture de la session</summary><p><em>La clôture reste soumise aux contrôles et à la confirmation existants.</em></p>';finish.before(advanced);advanced.append(finish);}

}
export function organizerInput(event,root){
 const input=event.target;
 if(input.matches('[data-org-character],[data-org-participant]')){
  const query=input.value.trim().toLocaleLowerCase('fr');let count=0;
  const participant=input.matches('[data-org-participant]');
  root.querySelectorAll(participant?'[data-org-participant-name]':'[data-org-name]').forEach(row=>{row.hidden=!(participant?row.dataset.orgParticipantName:row.dataset.orgName).includes(query);if(!row.hidden)count++;});
  const empty=root.querySelector(participant?'[data-org-no-participant]':'[data-org-no-match]');if(empty)empty.hidden=count>0;
 }
 if(input.matches('[data-org-tool]')){
  const details=root.querySelector('.org-tool-list');if(details)details.open=true;const advanced=root.querySelector('.org-advanced-tools');if(advanced)advanced.open=!!input.value.trim();
  const query=input.value.trim().toLocaleLowerCase('fr'),view=root.querySelector('.org-tabs [aria-current="page"]')?.getAttribute('href').split('/').at(-1);let count=0;
  root.querySelectorAll('[data-org-tool-name]').forEach(row=>{row.hidden=query?!row.dataset.orgToolName.includes(query):row.dataset.orgToolView!=='advanced'&&row.dataset.orgToolView!==view;if(!row.hidden)count++;});
  root.querySelector('[data-org-tools-empty]').hidden=count>0;
 }
}
