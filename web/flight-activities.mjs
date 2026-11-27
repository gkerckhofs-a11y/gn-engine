import {circuitNames} from './cockpit/asteroid-faults.mjs';
export {bindHazardHelm} from './cockpit/asteroid-helm.mjs';
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
 const orders=choices.map(choice=>command('steerFlightHazard',{...p,wave:r.wave,choice},names[choice])).join('');
 const pilot=r.phase==='ACTIVE'&&d.canAct&&leader;
 const helm=pilot&&rocks?`<asteroid-helm data-journey="${esc(ship.journey?.id)}" data-wave="${r.wave}" data-clear="${esc(r.clearLane)}" data-seconds="${r.seconds}"><canvas width="900" height="420" aria-label="Vue avant du champ d’astéroïdes"></canvas><output></output><div class="row">${choices.map((choice,i)=>`<button type="button" data-lane="${i}">${names[choice]}</button>`).join('')}</div><small>Changez de cap avec ← ou →, le joystick ou les boutons. ↑ ou la gâchette au neutre ramène au centre. La position est enregistrée à l’approche de l’impact.</small><div hidden data-flight-submit>${orders}</div></asteroid-helm>`:'';
 return `<section class="panel" aria-label="Radar de traversée"><h2>${rocks?'Pluie d’astéroïdes':'Transmission pirate PNJ'}</h2><p>${esc(text)}</p>${helm}${r.lastResult?`<p>${esc(r.lastResult)}</p>`:''}${pilot&&!rocks?`<div class="row">${orders}</div>`:''}</section>`;
}

export function engineeringHtml(data,sid){
 const s=data.station;if(!s)return '<section class="panel"><h2>Poste mécano</h2><p>Aucune avarie de traversée à traiter à bord.</p></section>';
 return `<section class="panel"><h2>Poste mécano · ${esc(s.shipName)}</h2><p>Temps de trajet récupéré : ${s.recoveredSeconds} s.</p>${s.pending.map(f=>`<article><h3>Impact ${f.wave+1} · ${circuitNames[f.system][0]}</h3>${s.canRepair?`<form data-form="flightRepair" data-journey="${esc(s.journeyId)}" data-wave="${f.wave}" data-session="${esc(sid)}"><label>Intervention<select name="system" required><option value="">Choisir le circuit</option>${Object.entries(circuitNames).map(([v,[,label]])=>`<option value="${v}">${label}</option>`).join('')}</select></label><button>Réparer et récupérer ${s.secondsPerRepair} s</button></form>`:'<p>Intervention suspendue.</p>'}</article>`).join('')||'<p>Circuits opérationnels. Les impacts apparaîtront ici.</p>'}</section>`;
}
