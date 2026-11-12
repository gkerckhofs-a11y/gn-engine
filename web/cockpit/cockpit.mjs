import {initialState,applyVisualEvent,phases} from './state.mjs';
const $=id=>document.getElementById(id),canvas=$('space'),ctx=canvas.getContext('2d');
let state=initialState(),sequence=0,elapsed=0,phaseTime=0,effectTime=-10,previous=0,audio=null,sound=false,width=1,height=1;
const preference=matchMedia('(prefers-reduced-motion: reduce)');state.reducedMotion=preference.matches;
const order=Object.keys(phases),steps={
 docked:['Autoriser le décollage','Lance une séquence visuelle de sortie du hangar. Aucun véritable départ n’est enregistré.'],
 launch:['Rejoindre la route','Passe à la vue de navigation. La durée de démonstration ne fixe pas celle des voyages en jeu.'],
 cruise:['Engager le saut','Montre la transition vers l’hyperespace. Aucun carburant réel n’est consommé.'],
 hyperspace:['Sortir de l’hyperespace','Révèle un contact fictif pour essayer la rencontre spatiale.'],
 contact:['Passer en alerte','Ouvre les effets de combat de démonstration. Aucun adversaire réel n’est engagé.'],
 combat:['Quitter la rencontre','Passe à l’approche de la destination, sans calcul de victoire ou de fuite.'],
 approach:['Confirmer l’amarrage','Termine la scène de voyage. Aucun personnage n’est déplacé dans une session.'],
 landed:['Retourner au spatioport','Recommence la démonstration et rétablit les valeurs fictives.']};
const stars=Array.from({length:230},(_,i)=>({x:Math.sin(i*127.1)*1.5,y:Math.cos(i*311.7),z:((i*0.61803398875)%1)*1.8+.2,size:1+i%3*.3}));
function log(text){const li=document.createElement('li');li.textContent=String(++sequence).padStart(2,'0')+' / '+text;$('journal').prepend(li);while($('journal').children.length>6)$('journal').lastChild.remove();}
function event(type,extra={}){state=applyVisualEvent(state,{id:crypto.randomUUID(),type,...extra});if(type==='phase'){phaseTime=0;effectTime=-10;log(phases[state.phase].label);}if(type==='shot'||type==='impact'){effectTime=elapsed;tone(type);}render();}
function tone(kind){if(!audio||!sound||state.paused)return;const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type=kind==='impact'?'triangle':'sine';const start=audio.currentTime;oscillator.frequency.setValueAtTime(kind==='shot'?600:75,start);oscillator.frequency.exponentialRampToValueAtTime(kind==='shot'?90:35,start+.3);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.09,start+.02);gain.gain.exponentialRampToValueAtTime(.001,start+.45);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(start+.5);}
function render(){const p=phases[state.phase];$('phase').textContent=p.label;$('location').textContent=p.line;$('message').textContent=state.message;$('step').textContent=String(order.indexOf(state.phase)+1).padStart(2,'0')+' / 08';$('next').textContent=steps[state.phase][0]+' ↗';$('hint').textContent=steps[state.phase][1];
 for(const key of ['hull','shield','fuel']){const max=state['max'+key[0].toUpperCase()+key.slice(1)];$(key).textContent=state[key]+' / '+max;$(key+'-meter').value=state[key];}
 const combat=state.phase==='combat',contact=combat||state.phase==='contact';$('combat-controls').hidden=!combat;$('combat-help').hidden=!combat;$('radar-contact').hidden=!contact;$('radar-label').textContent=contact?'Contact détecté':'Zone calme';$('pause-overlay').hidden=!state.paused;$('pause').textContent=state.paused?'▶ Reprendre':'Ⅱ Pause';$('pause').setAttribute('aria-pressed',String(state.paused));$('motion').setAttribute('aria-pressed',String(state.reducedMotion));document.body.classList.toggle('motion-reduced',state.reducedMotion);document.body.classList.toggle('is-paused',state.paused);
 for(const id of ['next','shot','impact'])$(id).disabled=state.paused;
 for(const button of $('scenes').children){button.disabled=state.paused;button.setAttribute('aria-pressed',String(button.dataset.phase===state.phase));}
}
function reset(){const reducedMotion=state.reducedMotion;state={...initialState(),reducedMotion};phaseTime=0;effectTime=-10;$('journal').replaceChildren();sequence=0;log('Systèmes de démonstration prêts');render();audio?.resume();}
$('next').onclick=()=>{if(state.phase==='landed'){reset();return;}event('phase',{phase:order[order.indexOf(state.phase)+1]});};
$('shot').onclick=()=>{if(state.paused||state.phase!=='combat')return;event('shot');log('Salve fictive · aucun dégât calculé');};
$('impact').onclick=()=>{if(state.paused||state.phase!=='combat')return;event('impact');event('message',{text:'Impact sur le champ de protection. Boucliers sollicités.'});log('Impact fictif · état du vaisseau inchangé');};
// Message events do not erase the pending visual cue; timing drives its rendering.
let lastEffect='';$('shot').addEventListener('click',()=>{lastEffect='shot';});$('impact').addEventListener('click',()=>{lastEffect='impact';});
$('pause').onclick=()=>{state={...state,paused:!state.paused};if(state.paused)audio?.suspend();else if(sound)audio?.resume();render();};
$('motion').onclick=()=>{state={...state,reducedMotion:!state.reducedMotion};render();};
$('reset').onclick=reset;
$('sound').onclick=async()=>{try{audio??=new AudioContext();sound=!sound;if(sound&&!state.paused)await audio.resume();else await audio.suspend();$('sound').textContent='Son : '+(sound?'activé':'désactivé');$('sound').setAttribute('aria-pressed',String(sound));}catch{sound=false;$('sound').textContent='Son indisponible';}};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{log('Plein écran indisponible · agrandissez la fenêtre du navigateur.');}};
for(const [phase,p] of Object.entries(phases)){const b=document.createElement('button');b.textContent=p.label;b.dataset.phase=phase;b.onclick=()=>{if(!state.paused)event('phase',{phase});};$('scenes').append(b);}
new ResizeObserver(()=>{const r=canvas.getBoundingClientRect(),scale=Math.min(devicePixelRatio||1,2);width=r.width;height=r.height;canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);ctx.setTransform(scale,0,0,scale,0,0);}).observe(canvas);
function planet(x,y,r){const g=ctx.createRadialGradient(x-r*.4,y-r*.4,0,x,y,r);g.addColorStop(0,'#8aa6ac');g.addColorStop(.35,'#456978');g.addColorStop(.8,'#162e43');g.addColorStop(1,'#060e1c');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#93d8ed66';ctx.lineWidth=2;ctx.stroke();ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();ctx.strokeStyle='#a3d3d22b';ctx.lineWidth=r*.1;for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(x-r*.15,y-r*.5+i*r*.26,r*1.05,r*.15,-.2,0,Math.PI*2);ctx.stroke();}ctx.restore();}
function enemy(x,y,size){ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.fillStyle='#253a4a';ctx.strokeStyle='#7b9caa';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(12,-4);ctx.lineTo(54,15);ctx.lineTo(48,28);ctx.lineTo(12,17);ctx.lineTo(0,30);ctx.lineTo(-12,17);ctx.lineTo(-48,28);ctx.lineTo(-54,15);ctx.lineTo(-12,-4);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#e9b56b';ctx.fillRect(-5,-8,10,12);ctx.fillStyle='#84e1ef';ctx.shadowColor='#84e1ef';ctx.shadowBlur=14;ctx.fillRect(-24,19,10,3);ctx.fillRect(14,19,10,3);ctx.restore();}
function hangar(amount){ctx.save();const vanishX=width/2,vanishY=height*.42,spread=1+amount*5;ctx.strokeStyle='#4c728755';ctx.lineWidth=1;for(let i=-7;i<=7;i++){ctx.beginPath();ctx.moveTo(vanishX+i*22,vanishY);ctx.lineTo(vanishX+i*100*spread,height);ctx.stroke();}for(let i=1;i<8;i++){const yy=vanishY+(height-vanishY)*(i/8)**2;ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(width,yy);ctx.stroke();}ctx.fillStyle='#101d29';ctx.fillRect(0,0,width*.18*(1-amount),height);ctx.fillRect(width-width*.18*(1-amount),0,width*.18*(1-amount),height);ctx.fillStyle='#e5bd76';for(const x of [width*.19*(1-amount),width-width*.19*(1-amount)])ctx.fillRect(x,0,3,height*.75);ctx.restore();}
function draw(now){const dt=Math.min((now-previous)/1000,.05);previous=now;if(!state.paused&&!document.hidden){elapsed+=dt;phaseTime+=dt;}const t=state.reducedMotion?0:elapsed,phase=state.phase,cx=width/2,cy=height*.43;ctx.fillStyle='#030914';ctx.fillRect(0,0,width,height);const haze=ctx.createRadialGradient(width*.7,height*.2,0,width*.6,height*.4,width*.7);haze.addColorStop(0,'#18324b66');haze.addColorStop(1,'#02060e00');ctx.fillStyle=haze;ctx.fillRect(0,0,width,height);
 if(phase!=='hyperspace')planet(width*.79,height*.37,Math.min(width,height)*(phase==='approach'||phase==='landed'?.38:.22));
 const speed=phase==='hyperspace'?.75:phase==='cruise'?.055:phase==='launch'?.14:.012;
 for(const star of stars){const z=((star.z-t*speed)%2+2)%2+.12,x=cx+star.x*width*.28/z,y=cy+star.y*height*.5/z;if(x<0||x>width||y<0||y>height)continue;ctx.globalAlpha=Math.min(1,1/z);ctx.strokeStyle=phase==='hyperspace'?'#b0eaff':'#d3e2ed';ctx.lineWidth=star.size;ctx.beginPath();ctx.moveTo(x,y);const trail=state.reducedMotion?0:phase==='hyperspace'?.23:.003;ctx.lineTo(x+(x-cx)*trail,y+(y-cy)*trail+1);ctx.stroke();}ctx.globalAlpha=1;
 if(phase==='docked'||phase==='landed')hangar(0);if(phase==='launch'){const amount=state.reducedMotion?.5:Math.min(1,phaseTime/6);if(amount<1)hangar(amount);}
 const ex=cx+Math.sin(t*.5)*width*.07,ey=cy+Math.cos(t*.7)*15;if(phase==='contact'||phase==='combat')enemy(ex,ey,Math.min(width/600,1.6));
 const age=elapsed-effectTime;if(age>=0&&age<.6&&phase==='combat'){
 if(lastEffect==='shot'){ctx.strokeStyle='#8ee9cf';ctx.lineWidth=3;for(const side of [-1,1]){ctx.beginPath();const start=cx+side*width*.36;ctx.moveTo(start+(ex-start)*age, height*.9+(ey-height*.9)*age);ctx.lineTo(ex,ey);ctx.stroke();}}
 if(lastEffect==='impact'){ctx.strokeStyle='#e8b476';ctx.lineWidth=state.reducedMotion?2:5;ctx.beginPath();ctx.ellipse(cx,cy,width*.38,height*.35,0,0,Math.PI*2);ctx.stroke();}
 }
 requestAnimationFrame(draw);
}
document.addEventListener('visibilitychange',()=>{previous=performance.now();if(document.hidden)audio?.suspend();else if(sound&&!state.paused)audio?.resume();});
preference.addEventListener('change',e=>{state={...state,reducedMotion:e.matches};render();});
reset();requestAnimationFrame(draw);
