import {mountThrottle} from './duel-throttle.mjs';

export function mountFlightControls(root,localKeys=false){
  const $=id=>root.getElementById(id);
  const keys=new Set(),propulsion=mountThrottle(root),stick={x:0,y:0};
  const glass=$('glass');
  function touch(e){
   if(e.pointerType==='mouse')return;
   if(e.type==='pointerdown'){glass.setPointerCapture(e.pointerId);glass.focus({preventScroll:true});}
   if(!glass.hasPointerCapture(e.pointerId))return;
   const box=glass.getBoundingClientRect();
   stick.x=Math.max(-1,Math.min(1,(e.clientX-box.left-box.width/2)/(box.width*.34)));
   stick.y=Math.max(-1,Math.min(1,(box.top+box.height/2-e.clientY)/(box.height*.34)));
  }
  function release(){stick.x=stick.y=0;}
  glass.addEventListener('pointerdown',touch);glass.addEventListener('pointermove',touch);
  glass.addEventListener('lostpointercapture',release);
  const listener=localKeys?root:window;
  const keydown=e=>{
    const target=e.composedPath()[0];
    if(target.matches?.('input[type="range"], select') && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))return;
    if(target.matches?.('select,input,button') && e.code==='Space')return;
    if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
    keys.add(e.key.toLowerCase());};
  const keyup=e=>keys.delete(e.key.toLowerCase()),blur=()=>keys.clear();
  listener.addEventListener('keydown',keydown);listener.addEventListener('keyup',keyup);
  window.addEventListener('blur',blur);root.addEventListener('focusout',blur);
  const bindings={turn:['Virage',0],pitch:['Tangage',1],roll:['Roulis',2],throttle:['Poussée',3]};
  for(const [id,[label,index]] of Object.entries(bindings)){
    const wrap=document.createElement('label'),select=document.createElement('select');
    wrap.textContent=label+' ';select.id=id;
    for(let n=-1;n<8;n++)select.add(new Option(n<0?'Aucun':'Axe '+(n+1),n));
    let saved=null;try{saved=localStorage.getItem('starfighter.axis.'+id);}catch{}
    select.value=saved!==null&&Number.isInteger(+saved)&&+saved>=-1&&+saved<8?+saved:index;
    select.onchange=()=>{try{localStorage.setItem('starfighter.axis.'+id,select.value);}catch{}};
    wrap.append(select);$('axes').append(wrap);
  }
  function input(){
    let pad;try{pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean);}catch{}
    $('device').textContent=pad?.id||'Clavier actif';
    const axis=id=>{const n=pad?.axes[Number($(id).value)]||0;return Math.abs(n)<.12?0:n;};
    const key=(a,b)=>Number(keys.has(a))-Number(keys.has(b));
    return {turn:key('arrowright','arrowleft')||axis('turn')||stick.x,pitch:key('arrowdown','arrowup')||axis('pitch')||stick.y,
      roll:key('e','a')||axis('roll'),...propulsion.controls(key('z','s'),-axis('throttle')),fire:keys.has(' ')||!!pad?.buttons[0]?.pressed};
  }
  return {input,propulsion,clear(){keys.clear();release();},close(){
   listener.removeEventListener('keydown',keydown);listener.removeEventListener('keyup',keyup);
   window.removeEventListener('blur',blur);root.removeEventListener('focusout',blur);
   glass.removeEventListener('pointerdown',touch);glass.removeEventListener('pointermove',touch);glass.removeEventListener('lostpointercapture',release);
   keys.clear();release();
  }};
}
