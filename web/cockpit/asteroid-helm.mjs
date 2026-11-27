import {mountAsteroidConsole} from './asteroid-console.mjs';
import {FLIGHT_TICKS} from './asteroid-model.mjs';

let deck,previousFlight;
function cockpitMarkup(){
 deck??=fetch('/cockpit/console.html',{cache:'no-store'}).then(response=>{
  if(!response.ok)throw Error('Cockpit indisponible');return response.text();
 }).catch(error=>{deck=null;throw error;});
 return deck;
}

// Polls refresh the command receipt without rebuilding the glass, losing key-down
// events or changing the flight path. A different wave starts a new command trace.
export function updateHazardPanel(host,markup,outer=false){
 const template=document.createElement('template');template.innerHTML=markup;
 const next=template.content.querySelector('asteroid-helm'),current=host.querySelector('asteroid-helm');
 if(current&&next&&current.dataset.key===next.dataset.key){
  current.dataset.seconds=next.dataset.seconds;
  current.parentElement.querySelector('[data-radar-status]').textContent=next.parentElement.querySelector('[data-radar-status]').textContent;
  current.querySelector('[data-flight-submit]').replaceChildren(next.querySelector('[data-flight-submit]').cloneNode(true).firstElementChild);
  current.transmit();return;
 }
 if(outer)host.replaceWith(template.content);else host.replaceChildren(template.content);
}

export function bindHazardHelm(){
 if(customElements.get('asteroid-helm'))return;
 class AsteroidHelm extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});}
  async connectedCallback(){
   const stamp=performance.now(),seconds=+this.dataset.seconds;
   try{
    const markup=await cockpitMarkup();if(!this.isConnected)return;
    const root=this.shadowRoot;root.innerHTML=markup;
    await Promise.all(['duel','duel-instruments'].map(name=>new Promise((resolve,reject)=>{
     const link=document.createElement('link');link.rel='stylesheet';link.href='/cockpit/'+name+'.css';link.onload=resolve;link.onerror=reject;root.prepend(link);
    })));
    if(!this.isConnected)return;
    const elapsed=20-seconds+(performance.now()-stamp)/1000;
    const resume=previousFlight?.key===this.dataset.key?previousFlight.run:null;
    this.console=mountAsteroidConsole(root,{resume,seed:+this.dataset.seed,systems:JSON.parse(this.dataset.systems),localKeys:false,
     initialTicks:Math.min(FLIGHT_TICKS,Math.max(0,Math.floor(elapsed*20))),title:this.dataset.name,onFinish:run=>{
      this.trace=run.trace;this.console.setLabel(run.hit?'Impact · diagnostic transmis':'Front traversé');this.transmit();
     }});
    this.console.setLabel('Évitement · front '+this.dataset.wave);
   }catch{if(this.isConnected)this.shadowRoot.textContent='Cockpit de vol inaccessible. Actualisez le poste.';}
  }
  transmit(){
   if(!this.trace||+this.dataset.seconds>5||!this.isConnected||document.hidden)return;
   const button=this.querySelector('[data-flight-submit] button');
   if(!button||button.disabled||performance.now()-(this.sent??-Infinity)<1200)return;
   const carrier=button.closest('form')??button;
   const payload=carrier.dataset.helmCommand?JSON.parse(decodeURIComponent(carrier.dataset.payload)):JSON.parse(carrier.dataset.payload);
   payload.trace=this.trace;
   carrier.dataset.payload=carrier.dataset.helmCommand?encodeURIComponent(JSON.stringify(payload)):JSON.stringify(payload);
   this.sent=performance.now();button.click();
  }
  disconnectedCallback(){if(this.console){previousFlight={key:this.dataset.key,run:this.console.snapshot()};this.console.close();}}
 }
 customElements.define('asteroid-helm',AsteroidHelm);
}
