import {escapeHtml as esc} from '../groups.mjs';
const a=(hash,label,primary=false)=>`<a ${primary?'class="cta"':''} href="#/${hash}">${esc(label)}</a>`;
const eur=n=>new Intl.NumberFormat('fr-BE',{style:'currency',currency:'EUR'}).format(n/100);
const payments={DRAFT:'En liste d’attente',CHECKOUT_PENDING:'En attente du paiement',EXPIRED:'Garde expirée',FAILED:'Paiement refusé',CANCELLED:'Annulé',PAID:'Billet confirmé',REFUNDED:'Remboursé',PAID_NEEDS_RECONCILIATION:'Paiement reçu · contacter la régie'};
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
    const e=await api('ticketPage',{sessionId:sid});html=wrap(`${a('sessions','Toutes les aventures')}<h1>${esc(e.title)}</h1><p>${meta(e)}</p><p>${esc(e.story)}</p><h2>Votre billet</h2><p>${eur(e.price)} TTC · ${stat[e.status]} · ${e.remaining} place(s) disponibles.</p>${['OPEN','WAITLIST'].includes(e.status)?a('reserver/'+routeId(sid),e.status==='WAITLIST'?'Rejoindre la liste d’attente':'Réserver ma place',true):''}<h2>Préparer sa venue</h2><p>${esc(e.practical)}</p><p>${esc(e.guidance)}</p>${e.faq?`<details><summary>Questions pratiques</summary><p>${esc(e.faq)}</p></details>`:''}<details><summary>Conditions et confidentialité</summary><p>${esc(e.terms)}</p><p>${esc(e.cancellation)}</p><p>${esc(e.privacy)}</p></details><p>${esc(e.seller)} · ${esc(e.contact)}</p>`);
   }else if(!logged())html=loginBox();
   else if(page==='reserver'){
    const e=await api('ticketPage',{sessionId:sid}),o=await api('ticketMine',{sessionId:sid});
    html=wrap(`<h1>${esc(e.title)}</h1>${o?.participation==='CONFIRMED'||o?.payment==='CHECKOUT_PENDING'?orderCard(o):`<form data-form="reserve" data-rev="${e.revision}" data-policy="${esc(e.policyVersion)}" data-price="${e.price}"><p>${meta(e)} · ${eur(e.price)} TTC</p>${field('name','Votre nom civil ou usuel')}<details open><summary>Conditions · ${esc(e.policyVersion)}</summary><p>${esc(e.terms)}</p><p>${esc(e.privacy)}</p><p>${esc(e.guidance)}</p><p>${esc(e.cancellation)}</p></details><label><input type="checkbox" name="consent" required> J’accepte les consignes, les conditions et la notice de confidentialité indiquées.</label><button>${e.status==='WAITLIST'?'M’inscrire en liste d’attente':'Réserver et continuer vers le paiement'}</button></form>`}`);
   }else if(['galerie','role'].includes(page)){
    const g=await api('ticketGallery',{sessionId:sid}),selected=g.roles.find(r=>r.id===ref);
    if(page==='role'&&!selected)throw Error('TICKET_UNAVAILABLE');
    const cards=g.roles.map(r=>roleCard(sid,r)).join('');
    html=page==='galerie'?wrap(`<h1>Choisissez votre destinée</h1><label>Style de jeu<select id="style"><option value="">Tous les styles</option>${[...new Set(g.roles.map(r=>r.style).filter(Boolean))].map(s=>`<option>${esc(s)}</option>`).join('')}</select></label><div class="grid">${cards}</div>`):wrap(a('galerie/'+routeId(sid),'Retour aux personnages')+roleCard(sid,selected,false)+(selected.status==='AVAILABLE'&&!g.selected?`<form data-form="select" data-role="${esc(selected.id)}" data-rev="${g.revision}" data-order="${g.orderRevision}"><p>Vous incarnez ce personnage pour cette session. Une modification ultérieure passe par la régie.</p><label><input type="checkbox" required name="confirm"> Je confirme mon choix.</label><button>Choisir ce personnage</button></form>`:''));
   }else if(page==='payer'){
    const o=await api('ticketMine',{sessionId:sid});if(!o)throw Error('TICKET_UNAVAILABLE');
    html=wrap(`<h1>Paiement de test</h1><p>${esc(o.title)} · ${eur(o.price)} TTC</p>${o.payment==='CHECKOUT_PENDING'?`<p>Votre place est gardée jusqu’à ${esc(new Date(o.expiresAt).toLocaleTimeString('fr-BE'))}. Choisissez le résultat du paiement simulé.</p><form data-form="checkout" data-attempt="${esc(o.attempt)}"><button name="outcome" value="SUCCESS">Simuler le paiement accepté</button> <button name="outcome" value="FAILURE">Simuler un refus</button> <button name="outcome" value="CANCEL">Annuler</button></form>`:orderCard(o)}`);
   }else if(page==='retour'){
    const o=await api('ticketSync',{sessionId:sid,attempt:ref});html=wrap('<h1>Suivi du paiement</h1>'+orderCard(o)+a('moi','Mes inscriptions'));
   }else if(page==='moi'){
    const orders=await api('ticketAccount',{});html=wrap('<h1>Mes inscriptions</h1>'+ (orders.map(orderCard).join('')||'<p>Vous n’avez pas encore de billet.</p>')+a('sessions','Voir les aventures'));
   }else if(page==='regie'){
    const d=await api('ticketDesk',{sessionId:sid}),e=d.event??{};
    const labels={title:'Titre public',story:'Résumé narratif',date:'Date locale',time:'Horaire local',place:'Lieu',duration:'Durée',practical:'Programme et matériel',guidance:'Consignes de participation',terms:'Conditions applicables',privacy:'Notice de confidentialité',cancellation:'Conditions d’annulation',contact:'Contact',seller:'Organisateur',faq:'FAQ (facultative)',policyVersion:'Version des conditions'};
    html=wrap(`<h1>Billetterie · ${esc(d.session.title)}</h1><p>Environnement de test · ${d.available} place(s) disponibles.</p><form class="card" data-form="settings" data-rev="${e.revision??0}"><h2>Fiche publique</h2><div class="grid">${Object.entries(labels).map(([k,l])=>['story','practical','guidance','terms','privacy','cancellation','faq'].includes(k)?area(k,l,e[k],k!=='faq'):field(k,l,e[k],k==='date'?'date':'text')).join('')}${field('price','Prix TTC en centimes EUR',e.price,'number')}${field('capacity','Places proposées',e.capacity,'number')}${field('holdMinutes','Garde de paiement (minutes)',e.holdMinutes,'number')}</div><label>Vente<select name="sale">${['CLOSED','OPEN','WAITLIST'].map(k=>`<option value="${k}" ${e.sale===k?'selected':''}>${stat[k]}</option>`).join('')}</select></label>${check('published','Publier dans le catalogue',e.published)}<button>Enregistrer la fiche</button></form>${e.id?roleForms(d):''}`);
   }else html=wrap('<h1>Mes inscriptions</h1>');
   if(ticket===generation){root.innerHTML=html;root.focus({preventScroll:true});}
  }catch(e){if(ticket===generation)root.innerHTML=wrap('<h1>Accès indisponible</h1><p>'+esc(message(e))+'</p>'+a('sessions','Revenir aux aventures'));}
 }
 function roleCard(sid,r,link=true){return `<article class="card" data-style="${esc(r.style)}">${r.portrait!=null?`<div class="portrait face-${Number(r.portrait)}" aria-hidden="true"></div>`:''}<p class="meta">${esc(r.profession)} · ${esc(r.style)}</p><h3>${esc(r.name)}</h3><p>${esc(r.teaser)}</p><p>${({AVAILABLE:'Disponible',RESERVED:'Réservé',BLOCKED:'Indisponible'})[r.status]}</p>${link&&r.status==='AVAILABLE'?a('role/'+routeId(sid)+'/'+routeId(r.id),'Découvrir ce personnage'):''}</article>`;}
 root.addEventListener('change',ev=>{if(ev.target.id==='style')for(const card of root.querySelectorAll('[data-style]'))card.hidden=!!ev.target.value&&card.dataset.style!==ev.target.value;});
 function orderCard(o){return `<article class="card"><h3>${esc(o.title)}</h3><p>${esc(payments[o.payment]??o.payment)} · ${eur(o.price)} TTC</p>${o.payment==='PAID'?a((o.roleId?'preparation/':'galerie/')+routeId(o.sessionId),o.roleId?'Mon personnage':'Choisir mon personnage',true):o.payment==='CHECKOUT_PENDING'?a('payer/'+routeId(o.sessionId),'Payer mon inscription',true):['EXPIRED','FAILED','CANCELLED'].includes(o.payment)?a('reserver/'+routeId(o.sessionId),'Reprendre mon inscription'):''}</article>`;}
 function roleForms(d){return '<h2>Personnages du Master</h2>'+d.definitions.map(def=>{
  const r=d.roles.find(x=>x.id===def.id)??{};
  return `<details><summary>${esc(def.name)}</summary><form data-form="role" data-role="${esc(def.id)}" data-rev="${d.event.revision}">${area('teaser','Teaser avant le choix',r.teaser)}${field('style','Style de jeu',r.style,'text',false)}${area('early','Informations libérées au titulaire avant le jeu',r.early,false)}${area('startingInformation','Informations initiales du kit',r.options?.startingInformation,false)}${check('weaponApplicable','Dotation d’arme applicable',r.options?.weaponApplicable)}<label>Portrait<select name="portrait"><option value="">Sans portrait</option>${['Vigie','Guide','Courrier'].map((l,i)=>`<option value="${i}" ${r.portrait===i?'selected':''}>${l}</option>`).join('')}</select></label>${check('enabled','Proposer ce rôle',r.enabled)}<button>Enregistrer le personnage</button></form></details>`;
 }).join('');}
 function message(e){return ({TICKET_TAKEN:'Ce personnage vient d’être attribué. Revenez à la galerie pour en choisir un autre.',TICKET_UNPAID:'Un billet confirmé est nécessaire pour choisir un personnage.',TICKET_MASTER:'Publiez la version initiale du Master et vérifiez le profil des rôles.',TICKET_SANDBOX_ONLY:'La billetterie est disponible dans la démonstration de test.',TICKET_ROLES:'Préparez assez de rôles disponibles avant d’ouvrir la vente.',TICKET_LEGACY:'Cette préparation utilise déjà les candidatures.',STALE_REVISION:'Les données ont changé. Actualisez la page.',FORBIDDEN:'Ce compte ne dispose pas de cet accès.',TICKET_UNAVAILABLE:'Cette session est indisponible.'})[e.message]??'Opération indisponible. Rechargez la page pour retrouver votre dossier.';}
 root.addEventListener('click',async ev=>{if(ev.target.closest('[data-do="login"]')){try{await login();await render();}catch(e){notice.textContent=message(e);}}});
 root.addEventListener('submit',async ev=>{
  ev.preventDefault();if(busy)return;busy=true;const f=ev.target,v=Object.fromEntries(new FormData(f)),sid=decodeURIComponent(location.hash.split('/')[2]);
  try{const p={sessionId:sid,revision:Number(f.dataset.rev),requestId:crypto.randomUUID()};
   if(f.dataset.form==='select'){await api('ticketSelect',{...p,roleId:f.dataset.role,orderRevision:Number(f.dataset.order),confirm:!!v.confirm});location.hash='/preparation/'+routeId(sid);}
   if(f.dataset.form==='checkout'){await api('ticketMockCheckout',{sessionId:sid,attempt:f.dataset.attempt,outcome:ev.submitter.value});location.hash='/retour/'+routeId(sid)+'/'+routeId(f.dataset.attempt);}
   if(f.dataset.form==='reserve'){await api('ticketReserve',{...p,name:v.name,consent:!!v.consent,price:Number(f.dataset.price),policyVersion:f.dataset.policy});location.hash='/moi';}
   if(f.dataset.form==='settings'){const settings={...v,price:Number(v.price),capacity:Number(v.capacity),holdMinutes:Number(v.holdMinutes),published:!!v.published};await api('ticketPublish',{...p,settings});}
   if(f.dataset.form==='role')await api('ticketRole',{...p,roleId:f.dataset.role,teaser:v.teaser,early:v.early,style:v.style,portrait:v.portrait===''?null:Number(v.portrait),enabled:!!v.enabled,options:{weaponApplicable:!!v.weaponApplicable,startingInformation:v.startingInformation}});
   notice.textContent='Enregistré.';await render();
  }catch(e){notice.textContent=message(e);}finally{busy=false;}
 });
 window.addEventListener('hashchange',()=>{notice.textContent='';render();});return render;
}
