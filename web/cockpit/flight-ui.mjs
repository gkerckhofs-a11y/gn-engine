import {mountGunnery} from './gunnery.mjs';
import {ports,itinerary,training,advance,refuel} from './flight.mjs';
const $=id=>document.getElementById(id);
let ship=training(), paused=false, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let elapsed=0, previous=performance.now(), phaseTime=0;
const labels={map:'Carte galactique',ready:'Manifeste confirmé',launch:'Décollage',hyperspace:'Hyperespace',contact:'Contact radar',combat:'Rencontre simulée',approach:'Approche finale'};
const actions={map:'Préparer le tronçon',ready:'Confirmer le décollage',launch:'Engager le saut',hyperspace:'Rejoindre le contact',contact:'Clore la négociation',combat:'Rompre le contact',approach:'Confirmer l’amarrage'};
let sound=false,audio,combatSeconds=0,shield=2,hull=4;
const gunnery=mountGunnery($('combat'),$('screen'),()=>{
  if(sound && audio){
    const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);
    osc.frequency.setValueAtTime(420,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(80,audio.currentTime+.14);
    gain.gain.value=.045;osc.start();osc.stop(audio.currentTime+.15);
  }
});
$('audio').onclick=async()=>{try{audio??=new AudioContext();await audio.resume();sound=!sound;$('audio').textContent=sound?'Couper le son':'Activer le son';}catch{$('audio').textContent='Audio indisponible';}};
$('peace').onclick=()=>{if(ship.phase==='contact'&&!paused){ship={...ship,phase:'approach'};phaseTime=0;render();}};
const fmt=r=>ports[r.from]+' → '+ports[r.to]+' · '+r.seconds+' s · '+r.cost+' unités (minimum '+r.min+')';
function render() {
  gunnery.enable(!paused&&ship.phase==='combat');
  $('combat').hidden=paused||ship.phase!=='combat';
  $('peace').hidden=ship.phase!=='contact';$('peace').disabled=paused;
  $('tactics').hidden=ship.phase!=='combat';$('tactic').disabled=paused;
  const map=ship.phase==='map', plans=itinerary(ship.port,ship.destination,ship.economy);
  $('phase').textContent=labels[ship.phase]+(paused?' · PAUSE':'');
  $('planning').hidden=!map;
  $('dest').replaceChildren(...ports.slice(ship.port+1).map((name,i)=>new Option(name,ship.port+i+1)));
  $('dest').value=ship.destination;
  $('mode').selectedIndex=Number(ship.economy);
  $('plans').textContent=map?plans.map(fmt).join(' / '):fmt(ship.leg);
  $('systems').textContent='Réservoir '+ship.fuel+'/8 · '+(map?'Quai '+ports[ship.port]:'Cap sur '+ports[ship.leg.to]);
  $('step').textContent=actions[ship.phase];
  $('step').disabled=paused || (map && (!plans.length || ship.fuel<plans[0].min));
  $('supply').disabled=paused || refuel(ship)===ship;
  $('radio').textContent=map?(plans.length?(ship.fuel<plans[0].min?'Carburant insuffisant. ':'')+'Stock au quai : '+ship.stock[ship.port]:'Exercice terminé. Amarrage confirmé.'):ship.phase==='contact'?'Interception fictive · négociez une paix avant l’ouverture automatique du combat dans 12 secondes d’exercice.':'Canal de bord · '+labels[ship.phase];
  $('pause').textContent=paused?'Reprendre':'Pause';
  $('motion').setAttribute('aria-pressed',String(reduced));
  for(const id of ['dest','mode']) $(id).disabled=paused;
}
function step(){if(ship.phase==='contact'){shield=2;hull=4;combatSeconds=0;$('outcome').textContent='Contact hostile. Boucliers fictifs : 2 · coque fictive : 4';}if(!paused){ship=advance(ship);phaseTime=0;render();}}
$('step').onclick=step;
$('dest').onchange=e=>{ship.destination=Number(e.target.value);render();};
$('mode').onchange=e=>{ship.economy=!!e.target.selectedIndex;render();};
$('supply').onclick=()=>{ship=refuel(ship);render();};
$('pause').onclick=()=>{paused=!paused;render();};
$('motion').onclick=()=>{reduced=!reduced;render();};
function reset(fuel){ship=training(fuel);paused=false;phaseTime=0;render();}
$('reset').onclick=()=>reset(8);$('shortage').onclick=()=>reset(1);
const canvas=$('screen'),ctx=canvas.getContext('2d');
const points=[[.24,.66],[.39,.30],[.57,.59],[.75,.33]];
function draw(now){
  const dt=Math.min(.1,(now-previous)/1000);previous=now;
  if(!paused&&!document.hidden){phaseTime+=dt;if(!reduced)elapsed+=dt;}
  if(!paused && !document.hidden && ship.phase==='combat'){
    combatSeconds+=dt;
    if(combatSeconds>=6){
      combatSeconds=0;const maneuver=$('tactic').value;
      if(maneuver==='Fuir'){step();$('radio').textContent='Exercice · fuite confirmée, cap repris.';}
      else if(maneuver==='Défendre')$('outcome').textContent='Résolution fictive · attaque adverse repoussée.';
      else{if(shield>0)shield--;else hull=Math.max(0,hull-1);
        $('outcome').textContent='Résolution fictive · impact adverse. Boucliers : '+shield+' · coque : '+hull;
        if(!hull){step();$('radio').textContent='Exercice · assistance fictive, retour en approche.';}
      }
    }
  }
  if(ship.phase==='contact'&&phaseTime>=12)step();
  if(ship.phase==='launch'&&phaseTime>=2 || ship.phase==='hyperspace'&&phaseTime>=ship.leg.seconds) step();
  const w=canvas.clientWidth,h=canvas.clientHeight,scale=Math.min(devicePixelRatio,2);
  if(canvas.width!==Math.round(w*scale)||canvas.height!==Math.round(h*scale)){canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);}
  ctx.setTransform(scale,0,0,scale,0,0);ctx.fillStyle='#06101d';ctx.fillRect(0,0,w,h);
  for(let i=1;i<=180;i++){
    const z=1.1-((i*.618+elapsed*(ship.phase==='hyperspace'?.35:.018))%1);
    const x=w*(.5+Math.sin(i*17)*.45/z),y=h*(.5+Math.cos(i*29)*.45/z);
    ctx.strokeStyle='#a5d6e5';ctx.beginPath();ctx.moveTo(x,y);
    const tail=ship.phase==='hyperspace'&&!reduced?.12:0;
    ctx.lineTo(x+(x-w/2)*tail+1.3,y+(y-h/2)*tail+1.3);ctx.stroke();
  }
  if(ship.phase==='map'||ship.phase==='ready'){
    ctx.strokeStyle='#679aab';ctx.beginPath();
    for(const [x,y] of points)ctx.lineTo(w*x,h*y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(w*points[0][0],h*points[0][1]);ctx.lineTo(w*points[3][0],h*points[3][1]);ctx.stroke();
    ctx.strokeStyle='#e7b879';ctx.lineWidth=2;
    for(const leg of itinerary(ship.port,ship.destination,ship.economy)){
      const [ax,ay]=points[leg.from],[bx,by]=points[leg.to];ctx.beginPath();ctx.moveTo(w*ax,h*ay);ctx.lineTo(w*bx,h*by);ctx.stroke();
    }
    ctx.lineWidth=1;
    points.forEach(([x,y],i)=>{ctx.fillStyle=i===ship.port?'#fab778':'#94e4dd';ctx.beginPath();ctx.arc(w*x,h*y,8,0,7);ctx.fill();ctx.font='15px system-ui';ctx.fillText(ports[i],w*x-20,h*y+28);});
  }else if(ship.phase==='approach'){
    const r=h*.34,g=ctx.createRadialGradient(w*.62,h*.45,0,w*.7,h*.52,r);g.addColorStop(0,'#aae5ce');g.addColorStop(.7,'#406b86');g.addColorStop(1,'#101c35');ctx.fillStyle=g;ctx.beginPath();ctx.arc(w*.7,h*.52,r,0,7);ctx.fill();
  }
  gunnery.draw(ctx,w,h,paused?0:dt,reduced);
  requestAnimationFrame(draw);
}
render();requestAnimationFrame(draw);
