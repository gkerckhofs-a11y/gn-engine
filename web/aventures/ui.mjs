import {escapeHtml as esc} from '../groups.mjs';
const a=(hash,label,primary=false)=>`<a ${primary?'class="cta"':''} href="#/${hash}">${esc(label)}</a>`;
const eur=n=>new Intl.NumberFormat('fr-BE',{style:'currency',currency:'EUR'}).format(n/100);
const stat={OPEN:'Ouvert',FULL:'Complet',WAITLIST:'Liste d’attente',CLOSED:'Fermé'};
const meta=e=>`${esc(e.date)} · ${esc(e.time)} · ${esc(e.place)} · ${esc(e.duration)}`;
const routeId=s=>encodeURIComponent(s);
const field=(key,label,value='',type='text',required=true)=>`<label>${label}<input type="${type}" name="${key}" value="${esc(value)}" ${required?'required':''}></label>`;
const area=(key,label,value='',required=true)=>`<label>${label}<textarea name="${key}" ${required?'required':''}>${esc(value)}</textarea></label>`;
const check=(key,label,value=false)=>`<label><input type="checkbox" name="${key}" ${value?'checked':''}> ${label}</label>`;
const card=e=>`<article class="card"><p class="meta">${meta(e)}</p><h3>${esc(e.title)}</h3><p>${esc(e.story)}</p><p>${eur(e.price)} TTC · ${stat[e.status]} · ${e.remaining} place(s) sur ${e.capacity}</p>${a('session/'+routeId(e.id),'Voir la session',true)}</article>`;
export function mountTickets({api,login,logged,logout}){
 const root=document.querySelector('#view'),notice=document.querySelector('#notice');let generation=0,busy=false;
 const wrap=html=>`<section class="wrap">${html}</section>`;
 const loginBox=()=>wrap('<h1>Votre espace joueur</h1><p>Connectez votre compte pour retrouver votre inscription et votre personnage.</p><button data-do="login">Continuer avec Google</button>');
 async function render(){
  const ticket=++generation,[page='',sid='',ref='']=location.hash.slice(2).split('/').map(decodeURIComponent);let html;
  try{
   if(page===''||page==='sessions'){
    const events=await api('ticketCatalogue',{}),catalogue=`<h2>Les prochaines sessions</h2>${events.length?`<div class="grid">${events.map(card).join('')}</div>`:'<p>Aucune session ouverte à la réservation pour le moment. Retrouvez les prochaines dates sur cette page.</p>'}`;
    html=page==='sessions'?wrap(catalogue):`<section class="hero"><h1>Aux confins de la galaxie</h1><p>À Port-Brèche, un équipage cherche un pilote et une cargaison change de mains. Quel rôle jouerez-vous dans l’histoire ?</p>${a('sessions','S’inscrire à une aventure',true)}</section>`+wrap('<h2>Un jeu de rôle grandeur nature</h2><p>Incarnez un personnage avec d’autres joueurs sur place. Négociez un passage, enquêtez sur une disparition ou pilotez pour votre équipage. Vos décisions changent le cours de l’aventure.</p><ol class="steps"><li>Réservez votre place</li><li>Choisissez votre rôle</li><li>Retrouvez votre équipage</li></ol>'+catalogue);
   }else if(page==='session'){
    const e=await api('ticketPage',{sessionId:sid});html=wrap(`${a('sessions','Toutes les aventures')}<h1>${esc(e.title)}</h1><p>${meta(e)}</p><p>${esc(e.story)}</p><h2>Votre billet</h2><p>${eur(e.price)} TTC · ${stat[e.status]} · ${e.remaining} place(s) disponibles.</p>${e.status==='OPEN'?a('reserver/'+routeId(sid),'Réserver ma place',true):''}<h2>Préparer sa venue</h2><p>${esc(e.practical)}</p><p>${esc(e.guidance)}</p>${e.faq?`<details><summary>Questions pratiques</summary><p>${esc(e.faq)}</p></details>`:''}<details><summary>Conditions et confidentialité</summary><p>${esc(e.terms)}</p><p>${esc(e.cancellation)}</p><p>${esc(e.privacy)}</p></details><p>${esc(e.seller)} · ${esc(e.contact)}</p>`);
   }else if(!logged())html=loginBox();
   else if(page==='regie'){
    const d=await api('ticketDesk',{sessionId:sid}),e=d.event??{};
    const labels={title:'Titre public',story:'Résumé narratif',date:'Date locale',time:'Horaire local',place:'Lieu',duration:'Durée',practical:'Programme et matériel',guidance:'Consignes de participation',terms:'Conditions applicables',privacy:'Notice de confidentialité',cancellation:'Conditions d’annulation',contact:'Contact',seller:'Organisateur',faq:'FAQ (facultative)',policyVersion:'Version des conditions'};
    html=wrap(`<h1>Billetterie · ${esc(d.session.title)}</h1><p>Environnement de test · ${d.available} place(s) disponibles.</p><form class="card" data-form="settings" data-rev="${e.revision??0}"><h2>Fiche publique</h2><div class="grid">${Object.entries(labels).map(([k,l])=>['story','practical','guidance','terms','privacy','cancellation','faq'].includes(k)?area(k,l,e[k],k!=='faq'):field(k,l,e[k],k==='date'?'date':'text')).join('')}${field('price','Prix TTC en centimes EUR',e.price,'number')}${field('capacity','Places proposées',e.capacity,'number')}${field('holdMinutes','Garde de paiement (minutes)',e.holdMinutes,'number')}</div><label>Vente<select name="sale">${['CLOSED','OPEN','WAITLIST'].map(k=>`<option value="${k}" ${e.sale===k?'selected':''}>${stat[k]}</option>`).join('')}</select></label>${check('published','Publier dans le catalogue',e.published)}<button>Enregistrer la fiche</button></form>${e.id?roleForms(d):''}`);
   }else html=wrap('<h1>Mes inscriptions</h1>');
   if(ticket===generation){root.innerHTML=html;root.focus({preventScroll:true});}
  }catch(e){if(ticket===generation)root.innerHTML=wrap('<h1>Accès indisponible</h1><p>'+esc(message(e))+'</p>'+a('sessions','Revenir aux aventures'));}
 }
 function roleForms(d){return '<h2>Personnages du Master</h2>'+d.definitions.map(def=>{
  const r=d.roles.find(x=>x.id===def.id)??{};
  return `<details><summary>${esc(def.name)}</summary><form data-form="role" data-role="${esc(def.id)}" data-rev="${d.event.revision}">${area('teaser','Teaser avant le choix',r.teaser)}${field('style','Style de jeu',r.style,'text',false)}${area('early','Informations libérées au titulaire avant le jeu',r.early,false)}${area('startingInformation','Informations initiales du kit',r.options?.startingInformation,false)}${check('weaponApplicable','Dotation d’arme applicable',r.options?.weaponApplicable)}${check('enabled','Proposer ce rôle',r.enabled)}<button>Enregistrer le personnage</button></form></details>`;
 }).join('');}
 function message(e){return ({TICKET_MASTER:'Publiez la version initiale du Master et vérifiez le profil des rôles.',TICKET_SANDBOX_ONLY:'La billetterie est disponible dans la démonstration de test.',TICKET_ROLES:'Préparez assez de rôles disponibles avant d’ouvrir la vente.',TICKET_LEGACY:'Cette préparation utilise déjà les candidatures.',STALE_REVISION:'Les données ont changé. Actualisez la page.',FORBIDDEN:'Ce compte ne dispose pas de cet accès.',TICKET_UNAVAILABLE:'Cette session est indisponible.'})[e.message]??'Opération indisponible. Rechargez la page pour retrouver votre dossier.';}
 root.addEventListener('click',async ev=>{if(ev.target.closest('[data-do="login"]')){try{await login();await render();}catch(e){notice.textContent=message(e);}}});
 root.addEventListener('submit',async ev=>{
  ev.preventDefault();if(busy)return;busy=true;const f=ev.target,v=Object.fromEntries(new FormData(f)),sid=decodeURIComponent(location.hash.split('/')[2]);
  try{const p={sessionId:sid,revision:Number(f.dataset.rev),requestId:crypto.randomUUID()};
   if(f.dataset.form==='settings'){const settings={...v,price:Number(v.price),capacity:Number(v.capacity),holdMinutes:Number(v.holdMinutes),published:!!v.published};await api('ticketPublish',{...p,settings});}
   if(f.dataset.form==='role')await api('ticketRole',{...p,roleId:f.dataset.role,teaser:v.teaser,early:v.early,style:v.style,enabled:!!v.enabled,options:{weaponApplicable:!!v.weaponApplicable,startingInformation:v.startingInformation}});
   notice.textContent='Enregistré.';await render();
  }catch(e){notice.textContent=message(e);}finally{busy=false;}
 });
 window.addEventListener('hashchange',()=>{notice.textContent='';render();});return render;
}
