import {worldEncyclopedia} from './world-encyclopedia-data.mjs';
import {escapeHtml as esc} from './groups.mjs';
import {wikiKeywords,wikiReferences,wikiTextHtml} from './world-encyclopedia-links.mjs';

// Public, read-only world information. Never import M6 secrets, player knowledge or GM records.
export const encyclopediaCategories=['Histoire','Breach Port','Lieux de Breach Port','Culture et galaxie','Planètes'];
const byId=new Map(worldEncyclopedia.map(article=>[article.id,article]));
const searchText=new Map(worldEncyclopedia.map(a=>[a.id,`${a.title} ${a.subtitle??''} ${a.paragraphs.join(' ')} ${wikiKeywords(a).join(' ')}`.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr')]));
const norm=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();
const href=(sessionId,id)=>`#/holopedia/${encodeURIComponent(sessionId)}${id?'/'+encodeURIComponent(id):''}`;
const short=a=>a.paragraphs.find(p=>p.length>80)?.slice(0,155)??'';
const posterSrc=a=>typeof a.poster==='string'&&/^posters\/[a-z0-9-]+\.(?:svg|webp)$/.test(a.poster)?'./'+a.poster:null;
const planetSrc=a=>typeof a.planetImage==='string'&&/^images\/planets\/[a-z0-9-]+\.webp$/.test(a.planetImage)?'./'+a.planetImage:null;
const placeSrc=a=>typeof a.placeImage==='string'&&/^images\/places\/breach-port-[a-z0-9-]+\.webp$/.test(a.placeImage)?'./'+a.placeImage:null;
const placeFocus=a=>['left','center','right'].includes(a.placeImageFocus)?a.placeImageFocus:'center';
const planetImg=(a,cls)=>planetSrc(a)?`<img class="${cls}" data-planet-image="true" src="${esc(planetSrc(a))}" alt="${esc(a.planetImageAlt??('Relevé orbital de '+a.title))}" width="900" height="900" loading="lazy" decoding="async"/>`:'';
const placeImg=(a,cls)=>placeSrc(a)?`<img class="${cls} place-focus-${placeFocus(a)}" data-place-image="true" src="${esc(placeSrc(a))}" alt="${esc(a.placeImageAlt??('Archives visuelles de '+a.title))}" width="1600" height="900" loading="lazy" decoding="async"/>`:'';
const posterImage=(a,cls)=>posterSrc(a)?`<img class="${cls}${a.poster.endsWith('.webp')?' poster-webp':''}" src="${esc(posterSrc(a))}" width="${a.poster.endsWith('.webp')?1024:760}" height="${a.poster.endsWith('.webp')?1536:1000}" loading="lazy" decoding="async" alt="${esc(a.posterAlt??'Affiche du Bureau impérial d’information')}" />`:'';
const card=(sid,a)=>`<article class="panel holopedia-card" data-holopedia-article="${esc(a.id)}" data-holopedia-category="${esc(a.category)}">${a.imperialArchive?posterImage(a,'history-poster-thumb'):''}${a.kind==='planète'?planetImg(a,'planet-card-image'):''}${a.kind==='lieu'?placeImg(a,'place-card-image'):''}<p class="eyebrow">${esc(a.category)}</p>${a.imperialRecord?`<p class="archive-card-label">✦ ${esc(a.archiveLabel??'Chronique impériale')}</p>`:''}<h3><a href="${esc(href(sid,a.id))}">${esc(a.title)}</a></h3>${a.subtitle?`<p class="holopedia-subtitle">${esc(a.subtitle)}</p>`:''}<p>${esc(short(a))}…</p></article>`;
export function holopediaIndexHtml(sessionId){
 const grouped=encyclopediaCategories.map(category=>`<section class="holopedia-section" data-holopedia-section="${esc(category)}"><h2>${esc(indexLabel(category))} <small>(${worldEncyclopedia.filter(a=>a.category===category).length})</small></h2>${category==='Histoire'?'<p class="history-archive-note">Archives homologuées par le Bureau impérial d’information. Diffusion civile autorisée dans le cadre des règlements en vigueur.</p>':''}<div class="holopedia-grid">${worldEncyclopedia.filter(a=>a.category===category).map(a=>card(sessionId,a)).join('')}</div></section>`).join('');
 return `<div class="holopedia narrow" data-holopedia-root><p class="eyebrow">Réseau holopédique impérial · Registres publics</p><h1>Holopédia</h1><p class="rp lead">Les mondes, les lieux et les récits de Breach Port, consignés par les chroniqueurs impériaux.</p><p><em>Archives civiles agréées par l’administration impériale. Les codes d’astrogation, les registres confidentiels et les renseignements de sécurité sont accessibles uniquement aux personnels habilités.</em></p><div class="panel holopedia-search"><label>Rechercher dans l’encyclopédie<input type="search" data-holopedia-search placeholder="Planète, lieu, famille, événement…" autocomplete="off"></label><label>Rubrique<select data-holopedia-filter><option value="">Toutes les rubriques</option>${encyclopediaCategories.map(c=>`<option value="${esc(c)}">${esc(indexLabel(c))}</option>`).join('')}</select></label></div><p class="muted" role="status" data-holopedia-count>${worldEncyclopedia.length} articles disponibles.</p><p class="panel" data-holopedia-empty hidden>Aucun article ne correspond à cette recherche.</p>${grouped}</div>`;
}

const categoryUrl=(sessionId,category)=>href(sessionId)+'?category='+encodeURIComponent(category);
const indexLabel=category=>category==='Lieux de Breach Port'?'Lieux':category==='Culture et galaxie'?'Culture':category;
export function holopediaSidebarHtml(sessionId,currentId=null,selectedCategory=''){
 const current=byId.get(currentId);
 const activeCategory=current?.category??selectedCategory;
 const groups=encyclopediaCategories.map(category=>{
  const pages=worldEncyclopedia.filter(a=>a.category===category);
  const expanded=activeCategory===category||(!current&&!selectedCategory&&category==='Histoire');
  return `<details class="wiki-side-group" ${expanded?'open':''}><summary>${esc(indexLabel(category))}<span class="wiki-side-count">${pages.length}</span></summary><div class="wiki-side-group-content"><a class="wiki-side-all" href="${esc(categoryUrl(sessionId,category))}" ${activeCategory===category&&!current?'aria-current="page"':''}>Tous les articles de cette rubrique</a><ul>${pages.map(a=>`<li><a href="${esc(href(sessionId,a.id))}" ${a.id===currentId?'aria-current="page"':''}>${esc(a.title)}</a></li>`).join('')}</ul></div></details>`;
 }).join('');
 return `<aside class="wiki-sidebar" data-wiki-sidebar><div class="wiki-side-heading"><strong>Sommaire des archives</strong><button class="wiki-nav-toggle" type="button" data-wiki-nav-toggle aria-controls="wiki-side-navigation" aria-expanded="false">Rubriques ▾</button></div><nav class="wiki-sidebar-nav" id="wiki-side-navigation" aria-label="Navigation de l’Holopédia"><a class="wiki-side-home" href="${esc(href(sessionId))}" ${!currentId&&!selectedCategory?'aria-current="page"':''}>Toutes les archives</a>${groups}</nav><p class="wiki-side-footnote">Réseau d’information civile · Autorisation impériale</p></aside>`;
}

const relatedArticles=(article)=>{
 const ids=wikiReferences(article);
 const direct=ids.map(id=>byId.get(id)).filter(Boolean).slice(0,6);
 return direct.length?direct:worldEncyclopedia.filter(a=>a.id!==article.id&&a.category===article.category).slice(0,4);
};
export function holopediaArticleHtml(sessionId,id){
 const a=byId.get(id);
 if(!a)return `<div class="narrow holopedia"><h1>Article introuvable</h1><p>Ce lien ne correspond à aucun article public.</p><a class="button" href="${esc(href(sessionId))}">Revenir à l’Holopédia</a></div>`;
 const related=relatedArticles(a),seen=new Set(),keywords=wikiKeywords(a);
 return `<article class="holopedia narrow"><nav class="holopedia-breadcrumb" aria-label="Fil d’Ariane"><a href="${esc(href(sessionId))}">Holopédia</a><span aria-hidden="true"> / </span>${esc(a.category)}</nav><p class="eyebrow">${esc(a.kind)} · ${esc(a.category)}</p>${a.imperialArchive?'<p class="history-stamp">⦿ Bureau impérial des archives · Version officielle</p>':a.imperialRecord?`<p class="archive-byline"><span aria-hidden="true">✦ </span>${esc(a.archivist??'Chroniques de l’Empire')}<span class="archive-edition"> · ${esc(a.archiveLabel??'Diffusion publique')}</span></p>`:''}<h1>${esc(a.title)}</h1>${a.subtitle?`<p class="lead">${esc(a.subtitle)}</p>`:''}${a.kind==='planète'&&planetSrc(a)?`<figure class="planet-hero"><div class="planet-photo-frame">${planetImg(a,'planet-hero-image')}</div><figcaption>Relevé orbital · Archives cartographiques impériales</figcaption></figure>`:''}${a.kind==='lieu'&&placeSrc(a)?`<figure class="place-hero"><div class="place-photo-frame">${placeImg(a,'place-hero-image')}</div><figcaption>Archives visuelles · Installations de Breach Port</figcaption></figure>`:''}${a.imperialArchive?`<div class="history-banner"><figure>${posterImage(a,'history-poster-hero')}<figcaption>Affiche officielle du Bureau impérial d’information.</figcaption></figure><div><p class="history-banner-label">MESSAGE AUX CITOYENS</p><p class="history-banner-quote">« ${esc(a.slogan??'Pour la paix et l’unité.')} »</p></div></div>`:''}<div class="holopedia-reading prose">${a.paragraphs.map(t=>`<p>${wikiTextHtml(t,a.id,sessionId,seen)}</p>`).join('')}</div>${keywords.length?`<section class="wiki-keywords" aria-label="Mots-clés"><h2>Mots-clés</h2><div class="wiki-keyword-list">${keywords.map(k=>`<a class="wiki-keyword" href="${esc(href(sessionId))}?keyword=${encodeURIComponent(k)}"># ${esc(k)}</a>`).join('')}</div></section>`:''}${related.length?`<section class="panel"><h2>À consulter aussi</h2><ul>${related.map(t=>`<li><a href="${esc(href(sessionId,t.id))}">${esc(t.title)}</a></li>`).join('')}</ul></section>`:''}<nav class="row" aria-label="Retour"><a class="button quiet" href="${esc(href(sessionId))}">Tous les articles</a><a class="button quiet" href="https://gn-engine.web.app/" data-return-terminal>Retour à votre terminal</a></nav></article>`;
}
export function filterHolopedia(root,term,category=''){
 if(!root)return 0;
 const q=norm(term);
 let shown=0;
 for(const el of root.querySelectorAll('[data-holopedia-article]')){
  const a=byId.get(el.dataset.holopediaArticle),ok=!!a&&(!category||a.category===category)&&(!q||searchText.get(a.id).includes(q));
  el.hidden=!ok;if(ok)shown++;
 }
 for(const section of root.querySelectorAll('[data-holopedia-section]'))section.hidden=![...section.querySelectorAll('[data-holopedia-article]')].some(el=>!el.hidden);
 const count=root.querySelector('[data-holopedia-count]');if(count)count.textContent=`${shown} article${shown>1?'s':''} trouvé${shown>1?'s':''}.`;
 const empty=root.querySelector('[data-holopedia-empty]');if(empty)empty.hidden=shown!==0;
 return shown;
}
if(typeof document!=='undefined')document.addEventListener('input',event=>{
 if(!event.target.matches('[data-holopedia-search],[data-holopedia-filter]'))return;
 const root=event.target.closest('[data-holopedia-root]');if(root)filterHolopedia(root,root.querySelector('[data-holopedia-search]')?.value,root.querySelector('[data-holopedia-filter]')?.value);
});
if(typeof document!=='undefined')document.addEventListener('change',event=>{
 if(!event.target.matches('[data-holopedia-filter]'))return;
 const root=event.target.closest('[data-holopedia-root]');if(root)filterHolopedia(root,root.querySelector('[data-holopedia-search]')?.value,root.querySelector('[data-holopedia-filter]')?.value);
});
