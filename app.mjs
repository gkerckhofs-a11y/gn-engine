import {holopediaIndexHtml,holopediaArticleHtml,holopediaSidebarHtml,filterHolopedia,encyclopediaCategories} from './world-encyclopedia.mjs';
const root=document.getElementById('content');
function render(){
 const match=/^#\/holopedia\/public\/([^/?]+)/.exec(location.hash);
 const id=match?decodeURIComponent(match[1]):null;
 const params=new URLSearchParams(location.hash.split('?')[1]||'');
 const category=encyclopediaCategories.includes(params.get('category'))?params.get('category'):'';
 const keyword=params.get('keyword')||'';
 const sessionId=new URLSearchParams(location.search).get('session');
 const validSession=typeof sessionId==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(sessionId);
 const terminalUrl=validSession?'https://gn-engine.web.app/#/terminal/'+encodeURIComponent(sessionId):'https://gn-engine.web.app/';
 root.innerHTML='<div class="wiki-layout">'+holopediaSidebarHtml('public',id,category)+'<div class="wiki-main">'+(id?holopediaArticleHtml('public',id):holopediaIndexHtml('public'))+'</div></div>';
 if(!id){
  const search=root.querySelector('[data-holopedia-search]');
  const filter=root.querySelector('[data-holopedia-filter]');
  if(search)search.value=keyword;
  if(filter)filter.value=category;
  if(keyword||category)filterHolopedia(root,keyword,category);
 }
 const sidebar=root.querySelector('[data-wiki-sidebar]');
 const menuButton=root.querySelector('[data-wiki-nav-toggle]');
 if(sidebar&&menuButton)menuButton.addEventListener('click',()=>{
  const opened=sidebar.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded',String(opened));
  menuButton.textContent=opened?'Fermer le sommaire ▲':'Rubriques ▾';
 });
 for(const link of document.querySelectorAll('[data-return-terminal]')){
   link.href=terminalUrl;
   link.textContent='← Retour à votre terminal';
 }
 document.title=(id?'Registre · ':'')+'Holopédia · Archives impériales';
 window.scrollTo(0,0);
}
window.addEventListener('hashchange',render);
if(!location.hash)location.hash='#/holopedia/public';
render();
