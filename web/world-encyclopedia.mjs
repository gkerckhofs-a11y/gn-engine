import {worldEncyclopedia} from './world-encyclopedia-data.mjs';
import {escapeHtml as esc} from './groups.mjs';

// Public, read-only world information. Never import M6 secrets, player knowledge or GM records.
export const encyclopediaCategories=['Planètes','Lieux de Breach Port','Breach Port','Culture et galaxie','Histoire'];
const byId=new Map(worldEncyclopedia.map(article=>[article.id,article]));
const searchText=new Map(worldEncyclopedia.map(a=>[a.id,`${a.title} ${a.subtitle??''} ${a.paragraphs.join(' ')}`.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr')]));
const norm=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();
const href=(sessionId,id)=>`#/holopedia/${encodeURIComponent(sessionId)}${id?'/'+encodeURIComponent(id):''}`;
const short=a=>a.paragraphs.find(p=>p.length>80)?.slice(0,155)??'';
const card=(sid,a)=>`<article class="panel holopedia-card" data-holopedia-article="${esc(a.id)}" data-holopedia-category="${esc(a.category)}"><p class="eyebrow">${esc(a.category)}</p><h3><a href="${esc(href(sid,a.id))}">${esc(a.title)}</a></h3>${a.subtitle?`<p class="holopedia-subtitle">${esc(a.subtitle)}</p>`:''}<p>${esc(short(a))}…</p></article>`;
export function holopediaIndexHtml(sessionId){
 const grouped=encyclopediaCategories.map(category=>`<section class="holopedia-section" data-holopedia-section="${esc(category)}"><h2>${esc(category)} <small>(${worldEncyclopedia.filter(a=>a.category===category).length})</small></h2><div class="holopedia-grid">${worldEncyclopedia.filter(a=>a.category===category).map(a=>card(sessionId,a)).join('')}</div></section>`).join('');
 return `<div class="holopedia narrow" data-holopedia-root><p class="eyebrow">Archives publiques · Space Outlaws</p><h1>Holopédia</h1><p class="rp lead">Les mondes, les lieux et les histoires que les habitants de Breach Port connaissent.</p><p><em>Cette encyclopédie rassemble le savoir commun. Les codes de route, les contacts privés et les renseignements commerciaux se découvrent en jeu.</em></p><div class="panel holopedia-search"><label>Rechercher dans l’encyclopédie<input type="search" data-holopedia-search placeholder="Planète, lieu, famille, événement…" autocomplete="off"></label><label>Rubrique<select data-holopedia-filter><option value="">Toutes les rubriques</option>${encyclopediaCategories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></label></div><p class="muted" role="status" data-holopedia-count>${worldEncyclopedia.length} articles disponibles.</p><p class="panel" data-holopedia-empty hidden>Aucun article ne correspond à cette recherche.</p>${grouped}</div>`;
}
const relatedArticles=(article)=>{
 const text=norm(article.paragraphs.join(' '));
 const related=worldEncyclopedia.filter(a=>a.id!==article.id&&a.kind==='planète'&&text.includes(norm(a.title))).slice(0,5);
 return related;
};
export function holopediaArticleHtml(sessionId,id){
 const a=byId.get(id);
 if(!a)return `<div class="narrow holopedia"><h1>Article introuvable</h1><p>Ce lien ne correspond à aucun article public.</p><a class="button" href="${esc(href(sessionId))}">Revenir à l’Holopédia</a></div>`;
 const related=relatedArticles(a);
 return `<article class="holopedia narrow"><nav class="holopedia-breadcrumb" aria-label="Fil d’Ariane"><a href="${esc(href(sessionId))}">Holopédia</a><span aria-hidden="true"> / </span>${esc(a.category)}</nav><p class="eyebrow">${esc(a.kind)} · ${esc(a.category)}</p><h1>${esc(a.title)}</h1>${a.subtitle?`<p class="lead">${esc(a.subtitle)}</p>`:''}<div class="holopedia-reading prose">${a.paragraphs.map(t=>`<p>${esc(t)}</p>`).join('')}</div>${related.length?`<section class="panel"><h2>À consulter aussi</h2><ul>${related.map(t=>`<li><a href="${esc(href(sessionId,t.id))}">${esc(t.title)}</a></li>`).join('')}</ul></section>`:''}<p class="muted"><em>Source : Livre du monde de Space Outlaws, édition joueurs enrichie du 16 novembre 2026. Cette page ne dévoile aucun itinéraire ou renseignement réservé.</em></p><nav class="row" aria-label="Retour"><a class="button quiet" href="${esc(href(sessionId))}">Tous les articles</a><a class="button quiet" href="#/terminal/${encodeURIComponent(sessionId)}">Mon Terminal</a></nav></article>`;
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
