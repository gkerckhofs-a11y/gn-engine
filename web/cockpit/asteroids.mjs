const canvas=document.querySelector('#scope'),ctx=canvas.getContext('2d'),names=['bâbord','centre','tribord'];
const contact=document.querySelector('#contact'),telemetry=document.querySelector('#telemetry'),start=document.querySelector('#start');
const buttons=[...document.querySelectorAll('[data-lane]')],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let lane=1,clear=1,wave=0,passed=0,elapsed=0,previous=0,running=false,stick=0;
function select(n){lane=Math.max(0,Math.min(2,n));buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===lane)));}
buttons.forEach((b,i)=>b.onclick=()=>select(i));
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();if(!e.repeat)select(lane+(e.key==='ArrowLeft'?-1:1));}});
function next(){
 clear=Math.floor(Math.random()*3);wave++;elapsed=0;
 contact.textContent='Vague '+wave+'/6 · couloir libre à '+names[clear];
}
start.onclick=()=>{wave=0;passed=0;previous=0;running=true;select(1);telemetry.textContent='Visez le couloir libre.';start.hidden=true;next();};
function draw(now){
 if(running&&!document.hidden)elapsed+=previous?Math.min(now-previous,200):0;
 previous=now;
 let pad;try{pad=Array.from(navigator.getGamepads?.()??[]).find(Boolean);}catch{}
 const axis=pad?.axes[0]??0,dir=Math.abs(axis)>.45?Math.sign(axis):0;
 if(dir&&dir!==stick)select(lane+dir);stick=dir;
 if(running&&elapsed>=3600){
  const hit=lane!==clear;if(!hit)passed++;
  telemetry.textContent=(hit?'Impact au bouclier':'Passage réussi')+' · '+passed+' esquive(s) sur '+wave;
  if(wave===6){running=false;contact.textContent='Exercice terminé · '+passed+'/6';start.hidden=false;start.textContent='Recommencer';}else next();
 }
 const w=canvas.width,h=canvas.height;
 ctx.fillStyle='#06121d';ctx.fillRect(0,0,w,h);
 for(let i=0;i<80;i++){ctx.fillStyle=i%4?'#638185':'#a0b7ad';ctx.fillRect((i*179+17)%w,(i*227+41)%h,2,2);}
 const point=(n,z)=>w/2+(n-1)*w*.31*z;
 ctx.strokeStyle='#375a60';
 for(const n of [-.5,.5,1.5,2.5]){ctx.beginPath();ctx.moveTo(point(n,.1),h*.17);ctx.lineTo(point(n,1.2),h);ctx.stroke();}
 if(running){
  const z=reduced ? 0.7 : 0.15+0.85*elapsed/3600;
  for(let i=0;i<3;i++)if(i!==clear){const x=point(i,z),y=h*(.15+.6*z),r=12+40*z;ctx.fillStyle='#a28874';ctx.beginPath();for(let j=0;j<9;j++){const a=j*Math.PI*2/9,rad=r*(.78+(j*7%5)*.065);ctx.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);}ctx.closePath();ctx.fill();ctx.fillStyle='#74675e';ctx.beginPath();ctx.arc(x-r*.2,y,r*.2,0,Math.PI*2);ctx.fill();}
 }
 const x=point(lane,1);ctx.fillStyle='#8feac5';ctx.beginPath();ctx.moveTo(x,h*.75);ctx.lineTo(x+23,h*.91);ctx.lineTo(x,h*.86);ctx.lineTo(x-23,h*.91);ctx.fill();
 requestAnimationFrame(draw);
}
select(1);requestAnimationFrame(draw);
