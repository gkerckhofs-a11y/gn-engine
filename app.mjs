import {holopediaIndexHtml,holopediaArticleHtml} from './world-encyclopedia.mjs';
const root=document.getElementById('content');
function render(){
 const match=/^#\/holopedia\/public\/([^/?]+)/.exec(location.hash);
 const id=match?decodeURIComponent(match[1]):null;
 const sessionId=new URLSearchParams(location.search).get('session');
 const validSession=typeof sessionId==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(sessionId);
 const terminalUrl=validSession?'https://gn-engine.web.app/#/terminal/'+encodeURIComponent(sessionId):'https://gn-engine.web.app/';
 root.innerHTML=id?holopediaArticleHtml('public',id):holopediaIndexHtml('public');
 for(const link of document.querySelectorAll('[data-return-terminal]')){
   link.href=terminalUrl;
   link.textContent=validSession?'← Retour au Terminal':'← Retour à GN Engine';
 }
 document.title=(id?'Article · ':'')+'Holopédia · Space Outlaws';
 window.scrollTo(0,0);
}
window.addEventListener('hashchange',render);
if(!location.hash)location.hash='#/holopedia/public';
render();