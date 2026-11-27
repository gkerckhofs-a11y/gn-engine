import {escapeHtml as esc} from './groups.mjs';

export const exercises={VOYAGE:['Voyage et navigation','starfighter'],DUEL:['Duel contre le pilote automatique','duel'],ASTEROIDS:['Slalom dans les astéroïdes','asteroids']};
const names={PORT:'Bâbord',CENTER:'Centre',STARBOARD:'Tribord',HAIL:'Répondre à la sommation',EVADE:'Brouiller le signal et fuir'};
const date=n=>new Date(n).toLocaleString('fr-BE',{dateStyle:'short',timeStyle:'short'});

export function trainingHtml(training,sid,command,role){
 const admin=typeof command==='function';
 return `<section class="panel"><h2>Simulateur de vol</h2><p>Entraînement individuel sur vaisseau fictif. Le carburant, les boucliers et la coque de campagne sont préservés.</p>${training.slots.map(slot=>{
  const [name,file]=exercises[slot.kind],query=new URLSearchParams({session:sid,slot:slot.id,...(role?{role}:{})});
  return `<article><h3>${name}</h3><p>${esc(date(slot.start))} → ${esc(date(slot.end))} · ${slot.active?'Poste ouvert':'Poste fermé'}</p>${admin?command('cancelFlightTraining',{sessionId:sid,revision:training.revision,slotId:slot.id},'Annuler ce créneau'):slot.active?`<a class="button primary" href="/cockpit/exercise-${file}.html?${esc(query.toString())}">Prendre les commandes</a>`:''}</article>`;
 }).join('')||'<p>Aucun créneau programmé.</p>'}${admin?command('scheduleFlightTraining',{sessionId:sid,revision:training.revision},'Programmer le simulateur',`<label>Exercice<select name="exercise">${Object.entries(exercises).map(([id,[name]])=>`<option value="${id}">${name}</option>`).join('')}</select></label><p>Horaires locaux · ${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}</p><label>Ouverture<input type="datetime-local" name="start" required></label><label>Fermeture<input type="datetime-local" name="end" required></label>`):''}</section>`;
}

export function hazardHtml(d,command){
 const ship=d.ship,r=ship.radar,risk=ship.operation?.risk,p={sessionId:d.session.id,shipId:ship.shipId,confirmation:d.confirmation};
 if(risk){
  return `<section class="panel"><h2>Jet de traversée</h2><p>Un événement survient sur ${risk.faces} face(s) du D6. ${risk.roll?'Dé du pilote : '+risk.roll+'/6.':risk.leader?'Lancez le dé avant le décollage.':'Le vaisseau de tête lance le dé pour le convoi.'}</p>${!risk.roll&&risk.leader&&d.canAct?command('rollFlightRisk',p,'Lancer le D6 de traversée'):''}</section>`;
 }
 if(!r)return ship.journey?.event.riskFaces?`<p>Jet de traversée · ${ship.journey.event.roll}/6 · seuil ${ship.journey.event.riskFaces}/6.</p>`:'';
 const rocks=r.kind==='ASTEROIDS',leader=!ship.convoy||ship.convoy.leaderShipId===ship.shipId;
 let text={APPROACH:`Contact dans ${r.seconds} s.`,OVERRIDDEN:'Radar réservé à l’interception en cours.',WAIT:`Prochain écho dans ${r.seconds} s.`,DONE:rocks?`Champ traversé. Retard total : ${r.delaySeconds} s.`:'Le patrouilleur s’éloigne.'}[r.phase];
 if(r.phase==='ACTIVE')text=rocks?`Vague ${r.wave+1}/${r.count} · trajectoire libre à ${names[r.clearLane].toLowerCase()} · ${r.seconds} s pour virer.`:`« Cargo en approche, identifiez-vous. » · ${r.seconds} s pour répondre au capitaine pirate.`;
 const choices=rocks?['PORT','CENTER','STARBOARD']:['HAIL','EVADE'];
 const plot=rocks&&r.phase==='ACTIVE'?`<div class="travel-scan" aria-hidden="true">${choices.map(lane=>`<span class="${r.clearLane===lane?'clear':'echo'}">${names[lane]}</span>`).join('')}</div>`:'';
 return `<section class="panel" aria-label="Radar de traversée"><h2>${rocks?'Pluie d’astéroïdes':'Transmission pirate PNJ'}</h2>${plot}<p>${esc(text)}</p>${r.lastResult?`<p>${esc(r.lastResult)}</p>`:''}${r.phase==='ACTIVE'&&d.canAct&&leader?`<div class="row" data-flight-controls="${rocks?'lanes':'radio'}">${choices.map(choice=>command('steerFlightHazard',{...p,wave:r.wave,choice},names[choice])).join('')}</div>${rocks?'<small>Flèches ← ↑ → ou joystick. Gâchette au neutre pour le centre.</small>':''}`:''}</section>`;
}

// A held control must return to neutral between waves. Buttons also work by touch.
export function bindHazardHelm(){
 let held=false;
 const connectedPad=()=>{try{return Array.from(navigator.getGamepads?.()??[]).find(Boolean);}catch{return null;}};
 const panel=()=>document.querySelector('[data-flight-controls="lanes"]');
 const steer=index=>panel()?.querySelectorAll('button')[index]?.click();
 window.addEventListener('keydown',e=>{
  const index=['ArrowLeft','ArrowUp','ArrowRight'].indexOf(e.key);
  if(index<0||!panel()||e.repeat||e.target.closest('input,textarea,select'))return;
  e.preventDefault();steer(index);
 });
 let poll;
 function startJoystick(){
  if(poll)return;
  poll=setInterval(()=>{
   const pad=connectedPad();
   if(!pad){clearInterval(poll);poll=null;held=false;return;}
   const x=pad.axes[0]??0,press=pad.buttons[0]?.pressed||Math.abs(x)>.55;
   if(press&&!held&&!document.hidden&&panel())steer(x<-.55?0:x>.55?2:1);
   held=!!press;
  },100);
 }
 window.addEventListener('gamepadconnected',startJoystick);
 if(connectedPad())startJoystick();
 window.addEventListener('pagehide',e=>{if(!e.persisted)clearInterval(poll);});
}
