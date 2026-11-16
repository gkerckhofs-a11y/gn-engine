import {holopediaIndexHtml,holopediaArticleHtml} from './world-encyclopedia.mjs';
const root=document.getElementById('content');
function render(){
 const match=/^#\/holopedia\/public\/([^/?]+)/.exec(location.hash);
 const id=match?decodeURIComponent(match[1]):null;
 root.innerHTML=id?holopediaArticleHtml('public',id):holopediaIndexHtml('public');
 document.title=(id?'Article · ':'')+'Holopédia · Space Outlaws';
 window.scrollTo(0,0);
}
window.addEventListener('hashchange',render);
if(!location.hash)location.hash='#/holopedia/public';
render();