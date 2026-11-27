import {circuitNames} from './asteroid-faults.mjs';
import {drawAsteroidField} from './asteroid-view.mjs';
const canvas=document.querySelector('#scope'),ctx=canvas.getContext('2d'),names=['bâbord','centre','tribord'];
const contact=document.querySelector('#contact'),telemetry=document.querySelector('#telemetry'),start=document.querySelector('#start');
const buttons=[...document.querySelectorAll('[data-lane]')],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let lane=1,clear=1,wave=0,passed=0,elapsed=0,previous=0,running=false,stick=0;
let repairs=[],delay=0;
const bay=document.querySelector('#repairs'),system=document.querySelector('#system'),message=document.querySelector('#repair-status');
for(const [id,[,label]] of Object.entries(circuitNames))system.add(new Option(label,id));
function repairView(){
 bay.hidden=!delay&&!repairs.length;
 document.querySelector('#fix').hidden=!repairs.length;
 document.querySelector('#symptom').textContent=repairs.length?'Vague '+repairs[0].wave+' · '+circuitNames[repairs[0].system][0]:'Circuits réparés.';
}
document.querySelector('#fix').onsubmit=e=>{
 e.preventDefault();const fault=repairs[0];if(!fault)return;
 if(system.value!==fault.system){message.textContent='Ce circuit répond normalement. Relisez le symptôme.';return;}
 repairs.shift();delay-=30;system.value='';
 message.textContent='Circuit réparé · 30 s récupérées. Retard de l’exercice : '+delay+' s.';repairView();
};
function select(n){lane=Math.max(0,Math.min(2,n));buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===lane)));}
buttons.forEach((b,i)=>b.onclick=()=>select(i));
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();if(!e.repeat)select(lane+(e.key==='ArrowLeft'?-1:1));}});
function next(){
 clear=Math.floor(Math.random()*3);wave++;elapsed=0;
 contact.textContent='Vague '+wave+'/6 · couloir libre à '+names[clear];
}
start.onclick=()=>{wave=0;passed=0;repairs=[];delay=0;system.value='';message.textContent='';repairView();previous=0;running=true;select(1);telemetry.textContent='Visez le couloir libre.';start.hidden=true;next();};
function draw(now){
 if(running&&!document.hidden)elapsed+=previous?Math.min(now-previous,200):0;
 previous=now;
 let pad;try{pad=Array.from(navigator.getGamepads?.()??[]).find(Boolean);}catch{}
 const axis=pad?.axes[0]??0,dir=Math.abs(axis)>.45?Math.sign(axis):0;
 if(dir&&dir!==stick)select(lane+dir);stick=dir;
 if(running&&elapsed>=3600){
  const hit=lane!==clear;
  if(hit){delay+=60;repairs.push({wave,system:Object.keys(circuitNames)[(wave-1)%3]});message.textContent='Le diagnostic permet de récupérer 30 des 60 secondes perdues.';repairView();}else passed++;
  telemetry.textContent=(hit?'Impact au bouclier':'Passage réussi')+' · '+passed+' esquive(s) sur '+wave;
  if(wave===6){running=false;contact.textContent='Exercice terminé · '+passed+'/6';start.hidden=false;start.textContent='Recommencer';}else next();
 }
 drawAsteroidField(ctx,lane,clear,elapsed/3600,running,reduced);
 requestAnimationFrame(draw);
}
select(1);requestAnimationFrame(draw);
