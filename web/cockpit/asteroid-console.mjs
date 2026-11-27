import {asteroidRun,recordFlight,FLIGHT_TICKS} from './asteroid-model.mjs';
import {STEP,MAX_SPEED} from './duel-model.mjs';
import {mountFlightControls} from './flight-controls.mjs';
import {mountDuelInstruments} from './duel-instruments.mjs';
import {asteroidView} from './asteroid-view.mjs';

export function mountAsteroidConsole(root,{seed,systems,resume=null,initialTicks=0,localKeys=false,onFinish,title,waiting=false}){
 const $=id=>root.getElementById(id);
 const glass=$('glass');glass.tabIndex=0;
 glass.setAttribute('aria-label','Verrière STARFIGHTER · champ d’astéroïdes');
 $('optic').setAttribute('aria-label','Vue agrandie de l’astéroïde le plus proche');
 glass.onpointerdown=()=>glass.focus({preventScroll:true});
 for(const id of ['call','break','peace','restart','remote'])$(id).hidden=true;
 $('station').textContent=title;
 $('guns').value='VERROUILLÉ';
 root.querySelector('.comms .face-label').textContent='Navigation';
 root.querySelector('details p').textContent='← → Virage · ↑ ↓ Tangage · A / E Roulis · Z / S Poussée. Sur écran tactile, faites glisser le doigt sur la verrière.';
 const controls=mountFlightControls(root,localKeys),instruments=mountDuelInstruments($('attitude'),$('systems')),draw=asteroidView(root);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let run,active=false,frame=0,last=0,acc=0,reported=false,label='';
 function begin(nextSeed,elapsedTicks=0,previous=null){
  run=previous??asteroidRun(nextSeed,systems);reported=false;active=true;acc=0;last=0;controls.clear();
  // Late entry flies the unattended part straight ahead, like an idle stick.
  for(let n=run.tick;n<Math.min(elapsedTicks,FLIGHT_TICKS);n++)recordFlight(run,{});
 }
 function render(now){
  const dt=last?Math.max(0,Math.min(.5,(now-last)/1000)):0;last=now;
  if(active&&!document.hidden){
   acc+=dt;
   while(acc>=STEP&&run.tick<FLIGHT_TICKS){recordFlight(run,controls.input());acc-=STEP;}
  }
  const s=run.ship;
  draw(run,reduced.matches);instruments.update(s);
  $('speed').value=Math.round(s.speed)+' m/s';
  $('heading').value=String((Math.round(s.yaw*180/Math.PI)%360+360)%360).padStart(3,'0')+'°';
  $('thrust').style.setProperty('--fill',Math.round(s.speed/MAX_SPEED*100)+'%');
  controls.propulsion.render(s,active);
  const status=active?(run.hit?'Impact enregistré':label)+' · '+Math.ceil((FLIGHT_TICKS-run.tick)*STEP)+' s':label;
  if($('phase').textContent!==status)$('phase').textContent=status;
  if(active&&run.tick===FLIGHT_TICKS&&!reported){active=false;reported=true;onFinish(run);}
  frame=requestAnimationFrame(render);
 }
 begin(seed,initialTicks,resume);active=!waiting;label=waiting?'En attente du départ':'Évitez les rochers';
 frame=requestAnimationFrame(render);
 return {begin,snapshot(){return run;},setLabel(text){label=text;},pause(){active=false;controls.clear();},close(){cancelAnimationFrame(frame);controls.close();}};
}
