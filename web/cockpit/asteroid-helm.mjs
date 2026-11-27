import {drawAsteroidField} from './asteroid-view.mjs';

const lanes=['PORT','CENTER','STARBOARD'],names=['bâbord','centre','tribord'];
// Keep the helm position when a station poll replaces its projection.
export function bindHazardHelm(){
 if(customElements.get('asteroid-helm'))return;
 let state=null;
 class AsteroidHelm extends HTMLElement{
  connectedCallback(){
   const key=this.dataset.journey;
   if(state?.key!==key)state={key,lane:1,x:1,lastWave:-1,lastSend:0};
   this.canvas=this.querySelector('canvas').getContext('2d');
   this.buttons=[...this.querySelectorAll('[data-lane]')];
   this.label=this.querySelector('output');
   this.onclick=e=>{const b=e.target.closest('[data-lane]');if(b)this.move(+b.dataset.lane);};
   this.key=e=>{
    if(e.target.closest?.('input,textarea,select')||!['ArrowLeft','ArrowUp','ArrowRight'].includes(e.key))return;
    e.preventDefault();if(!e.repeat)this.move(e.key==='ArrowUp'?1:state.lane+(e.key==='ArrowRight'?1:-1));
   };
   window.addEventListener('keydown',this.key);
   this.end=performance.now()+Number(this.dataset.seconds)*1000;
   this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   this.move(state.lane);
   this.last=performance.now();
   this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  move(index){
   state.lane=Math.max(0,Math.min(2,index));
   this.buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===state.lane)));
   this.label.textContent='Cap '+names[state.lane];
  }
  tick(now){
   if(!this.isConnected)return;
   const dt=Math.min(.1,(now-this.last)/1000);this.last=now;
   let pad;try{pad=Array.from(navigator.getGamepads?.()??[]).find(Boolean);}catch{}
   if(pad){
    const x=pad.axes[0]??0;
    if(Math.abs(x)>.5)this.move(x<0?0:2);else if(pad.buttons[0]?.pressed)this.move(1);
   }
   state.x+=(state.lane-state.x)*Math.min(1,dt*7);
   const left=(this.end-now)/1000,wave=Number(this.dataset.wave);
   drawAsteroidField(this.canvas,state.x,lanes.indexOf(this.dataset.clear),Math.max(0,Math.min(1,1-left/20)),true,this.reduced);
   if(left>0&&left<=3&&!document.hidden&&(state.lastWave!==wave||now-state.lastSend>1600)){
    const command=this.querySelectorAll('[data-flight-submit] button')[Math.round(state.x)];
    if(command&&!command.disabled){
     state.lastWave=wave;state.lastSend=now;
     command.click();
    }
   }
   this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  disconnectedCallback(){
   window.removeEventListener('keydown',this.key);cancelAnimationFrame(this.frame);
  }
 }
 customElements.define('asteroid-helm',AsteroidHelm);
}
