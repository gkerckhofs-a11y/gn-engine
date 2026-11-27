import {hazardHtml,bindHazardHelm,updateHazardPanel} from '../flight-activities.mjs';
import {pilotConsole} from './pilot-console.mjs';
import {cockpitFlightPlan} from './flight-plan.mjs';
import {uiErrorMessage} from '../ui-language.mjs';
import auth from '../firebase-client.mjs';
import {GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut,browserSessionPersistence,setPersistence} from 'firebase/auth';
import {projectCockpit,lockCockpit,connectGunnery,combatTelemetry} from './cockpit.mjs';
import {spaceCombatsHtml,spaceArmHtml,spaceConfirmHtml,spaceFormInput,spaceEncounterErrors} from '../space-encounters.mjs';
import {soNavigationErrors} from '../space-outlaws-voyages.mjs';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const sessionId=params.get('session'),stationId=params.get('station');
let current=null,timer,busy=false,generation=0,previewing=false;
const pending=new Map();
const main=document.querySelector('main');main.hidden=true;
$('pause-overlay').textContent='COMMANDES SUSPENDUES';
document.title='Space Outlaws · Cockpit connecté';
document.querySelector('.connection').textContent='COCKPIT · CONNEXION REQUISE';
for(const selector of ['.director','#reset','#pause','#combat-controls','#combat-help'])document.querySelector(selector).hidden=true;
document.querySelector('.comms .hrp').textContent='Ce poste commande le vaisseau affecté par le MJ. Les valeurs affichées proviennent du jeu. Déconnectez le pilote avant de changer d’équipage.';
const account=document.createElement('section');account.className='cockpit-account';
account.innerHTML='<button id="pilot-login">Connecter le pilote désigné</button><button id="pilot-logout" hidden>Déconnecter le pilote</button><p id="connection-status" role="status"></p>';
document.querySelector('header').after(account);
const orders=document.createElement('section');orders.id='live-orders';document.querySelector('footer').before(orders);
const radar=document.createElement('section');orders.before(radar);
radar.addEventListener('click',e=>{
 const button=e.target.closest('[data-helm-command]');
 if(!button||!current?.canAct)return;
 execute(button.dataset.helmCommand,JSON.parse(decodeURIComponent(button.dataset.payload)));
});
const chart=document.createElement('section');orders.before(chart);
const plan=cockpitFlightPlan(chart,async (command,fields,d)=>{
 if(!current||current.confirmation!==d.confirmation||busy)throw new Error('Actualisez le poste.');
 const input={sessionId,stationId,command,payload:{sessionId,shipId:d.ship.shipId,...fields}};
 if(command==='departShip'){
  busy=true;clearTimeout(timer);
  try{return await mutate('cockpitCommand',input);}finally{busy=false;await refresh();}
 }
 return api('cockpitCommand',input);
});
const bridge=document.createElement('section');bridge.hidden=true;bridge.setAttribute('aria-label','Pilotage manuel');
document.querySelector('.viewport').before(bridge);
const helm=pilotConsole(bridge,{
 exchange(command,d,c,fields){
  if(current?.ship.shipId!==d.ship.shipId||current?.ship.combatId!==c.id||!current.canAct)throw Error('Poste indisponible');
  return api('cockpitCommand',{sessionId,stationId,command,payload:{sessionId,shipId:d.ship.shipId,combatId:c.id,...fields}});
 },
 peace(d,c){return execute('consentSpacePeace',{sessionId,shipId:d.ship.shipId,combatId:c.id,confirmation:c.confirmation,agree:true});}
});
async function displayHelm(d,c){
 const evasion=!!radar.querySelector('asteroid-helm');
 if(evasion){helm.reset();if(radar.nextElementSibling!==bridge)bridge.before(radar);document.querySelector('.viewport').hidden=true;return;}
 if(radar.nextElementSibling===bridge)orders.before(radar);
 await helm.update(d,c);
 document.querySelector('.viewport').hidden=!bridge.hidden;
}
const roundStatus=document.createElement('p');roundStatus.hidden=true;orders.before(roundStatus);
function showRound(c){
 roundStatus.hidden=!c;
 if(!c){roundStatus.textContent='';return;}
 roundStatus.textContent=c.status==='DOGFIGHT'?'Combat de pilotage en temps réel':c.status==='ENCOUNTER'?
  (c.negotiationSeconds==null?'Négociation ouverte':'Négociation · '+c.negotiationSeconds+' s de jeu') :
  'Round '+c.round+' · '+c.remainingSeconds+' s de jeu · '+(c.ownOrder?'ordre enregistré':'ordre à transmettre');
}
const guns=document.createElement('section');guns.hidden=true;orders.before(guns);
connectGunnery(guns);
let nextScan=0,lastCombatId=null,reportedCombatId=null,orderPhase='';
async function pulse(d,combat){
 if(!d.starfighter?.combat||!d.canAct)return;
 const s=d.ship,j=s.journey;
 if(combat ? !combat.canOrder || !(combat.status==='ROUND'&&combat.remainingSeconds===0 || combat.status==='ENCOUNTER'&&combat.negotiationSeconds===0)
    : !j||j.suspended||j.intercepted||j.interceptionCovered||j.remainingSeconds<=0||s.groupShip||Date.now()<nextScan)return;
 if(!combat)nextScan=Date.now()+15000;
 const payload={sessionId,shipId:s.shipId,confirmation:d.confirmation,...(combat?{combatId:combat.id,roundConfirmation:combat.confirmation}:{})};
 try{await mutate('cockpitCommand',{sessionId,stationId,command:'starfighterPulse',payload});}
 catch(e){if(!['STALE_REVISION','COCKPIT_COMMAND','SPACE_INTERCEPTION_USED','SPACE_ALLIANCE_UNAVAILABLE','TOWING_ACTION_NOT_OPEN'].includes(e.code))throw e;}
}
const status=text=>{$('connection-status').textContent=text;};
function fail(error){radar.replaceChildren();helm.reset();orderPhase='';$('journal').replaceChildren();showRound(null);combatTelemetry(null,null);plan.reset();main.hidden=true;current=null;lockCockpit();orders.replaceChildren();status(uiErrorMessage(error,{...soNavigationErrors,...spaceEncounterErrors}));}
async function api(action,input){
 if(!auth.currentUser)throw new Error('Connexion requise');
 const token=await auth.currentUser.getIdToken();
 const response=await fetch('/api/command',{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action,input}),cache:'no-store',signal:AbortSignal.timeout(12000)});
 const body=await response.json();if(!response.ok||body.error){const e=new Error(body.error);e.code=body.error;throw e;}return body.result;
}
async function mutate(action,input){
 const key=JSON.stringify([action,input]);const requestId=pending.get(key)??crypto.randomUUID();pending.set(key,requestId);
 try{
  const result=await api(action,{...input,requestId});pending.delete(key);return result;
 }catch(error){if(error.code)pending.delete(key);throw error;}
}
async function refresh(){
 clearTimeout(timer);if(!auth.currentUser||busy)return;const ticket=++generation;
 try{
  const d=await api('cockpitStation',{sessionId,stationId});if(ticket!==generation)return;
  current=d;main.hidden=false;projectCockpit(d);plan.update(d);document.querySelector('.connection').textContent=d.starfighter?'SESSION CONNECTÉE':'COCKPIT · CONNECTÉ';
  status(`Poste ${stationId} · pilote : ${d.pilotName}`);
  if(d.ship.radar?.kind==='ASTEROIDS'&&d.ship.radar.phase==='ACTIVE'&&radar.nextElementSibling!==bridge)bridge.before(radar);
  updateHazardPanel(radar,hazardHtml(d,(action,input,label)=>`<button data-helm-command="${action}" data-payload="${encodeURIComponent(JSON.stringify(input))}">${label}</button>`));
  const s=d.ship,ready=d.canAct&&(!s.operation?.risk?.leader||s.operation.risk.roll)&&s.operation?.kind==='PREPARE'&&s.operation.remainingSeconds===0;
  const arrived=d.canAct&&s.journey&&!s.journey.suspended&&!s.combatId&&!s.rescueId&&s.journey.remainingSeconds===0;
  $('next').textContent=ready?'Décoller':arrived?'Confirmer l’amarrage':s.journey?'Voyage en cours':'Préparation en cours';
  $('next').disabled=!(ready||arrived);$('next').dataset.command=ready?'finishSoPreparation':'arriveShip';
  $('hint').textContent=ready?'Confirmez que le pilote et l’équipage sont installés. Le départ consommera les ressources prévues.':arrived?'Confirmez l’arrivée pour libérer l’équipage à destination.':'La pause du jeu suspend les commandes de ce poste.';
  if(s.combatId){
   const combat=await api('spaceCombat',{sessionId,combatId:s.combatId});if(ticket!==generation)return;
   if(!combat.combat||combat.combat.ownShipId!==s.shipId)throw new Error('Vaisseau différent');
   await displayHelm(d,combat.combat);if(ticket!==generation)return;
   showRound(d.starfighter?.combat?combat.combat:null);
   if(d.starfighter?.combat){lastCombatId=combat.combat.id;combatTelemetry(d,combat.combat.flightDuel?null:combat.combat);}
   await pulse(d,combat.combat);if(ticket!==generation)return;
   // Keep an order being entered intact. Server confirmations reject stale submissions.
   const phaseKey=[combat.combat.id,combat.combat.round,combat.combat.status,combat.combat.canOrder,combat.combat.remainingSeconds===0].join('/');
   if(orderPhase!==phaseKey||!orders.contains(document.activeElement)){
    orderPhase=phaseKey;
    orders.innerHTML=spaceCombatsHtml(combat);
    for(const a of orders.querySelectorAll('a'))a.remove();
   }
  }else{
   orderPhase='';
   showRound(null);
   let result=null;
   const previous=lastCombatId??d.starfighter?.previousCombatId;
   if(previous&&previous!==reportedCombatId&&d.starfighter?.combat){
    const ended=await api('spaceCombat',{sessionId,combatId:previous});if(ticket!==generation)return;
    if(ended.combat?.ownShipId===s.shipId){result=ended.combat;combatTelemetry(d,result.flightDuel?null:result);}reportedCombatId=previous;lastCombatId=null;
   }else combatTelemetry(d,null);
   await displayHelm(d,result);if(ticket!==generation)return;
   await pulse(d,null);if(ticket!==generation)return;
  }
  if(!s.combatId&&!previewing&&!orders.contains(document.activeElement)){orders.innerHTML=d.canAct&&s.journey&&!s.groupShip&&!s.journey.suspended&&!s.journey.intercepted&&!s.journey.interceptionCovered&&!s.ambushId&&!s.convoy&&!s.towingAttached&&s.journey.remainingSeconds>0?spaceArmHtml(sessionId,s.shipId,false,[],d.starfighter?.combat):'';}
 }catch(e){if(ticket===generation)fail(e);}
 finally{if(ticket===generation&&!busy&&auth.currentUser)timer=setTimeout(refresh,3000);}
}
async function execute(action,input){
 previewing=false;
 if(busy)return;const ticket=++generation;busy=true;clearTimeout(timer);$('next').disabled=true;
 for(const b of orders.querySelectorAll('button'))b.disabled=true;
 try{
  // Revocation is checked again before each command; native services recheck the pilot.
  const live=await api('cockpitStation',{sessionId,stationId});
  if(ticket!==generation||live.ship.shipId!==input.shipId||!live.canAct)throw new Error('Poste indisponible');
  await mutate('cockpitCommand',{sessionId,stationId,command:action,payload:input});status('Commande enregistrée.');orders.replaceChildren();
 }catch(e){fail(e);}finally{busy=false;await refresh();}
}
$('next').onclick=()=>{
 if(!current||$('next').disabled)return;
 const action=$('next').dataset.command;
 if(action==='finishSoPreparation'&&!confirm('Le pilote désigné et tous les passagers sont-ils installés ? Confirmer le décollage et la consommation prévue.'))return;
 execute(action,{sessionId,shipId:current.ship.shipId,confirmation:current.confirmation,...(action==='finishSoPreparation'?{stationId,present:true}:{})});
};
$('motion').addEventListener('click',()=>refresh());
orders.addEventListener('submit',async e=>{
 e.preventDefault();const form=e.target;if(!current||!form.checkValidity())return;
 if(form.dataset.form==='spacePrepare'&&form.dataset.command==='prepareSpaceAmbush'){try{previewing=true;const ticket=generation,p=spaceFormInput(form,Object.fromEntries(new FormData(form))),d=await api('prepareSpaceAmbush',p);if(ticket!==generation||!current)return;orders.innerHTML=spaceConfirmHtml('prepareSpaceAmbush',d,p)+'<button type="button" data-action="refresh">Annuler</button>';}catch(error){previewing=false;fail(error);}return;}
 if(!['spaceCommand','spaceOrder'].includes(form.dataset.form))return;
 const input=spaceFormInput(form,Object.fromEntries(new FormData(form)));
 if(input.shipId!==current.ship.shipId||input.combatId&&input.combatId!==current.ship.combatId)return;
 execute(form.dataset.form==='spaceOrder'?'submitSpaceOrder':form.dataset.command,input);
});
orders.addEventListener('click',e=>{if(e.target.closest('[data-action="refresh"]')){previewing=false;orders.replaceChildren();refresh();}});
$('pilot-login').onclick=async()=>{try{await setPersistence(auth,browserSessionPersistence);await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){fail(e);}};
$('pilot-logout').onclick=()=>signOut(auth);
onAuthStateChanged(auth,user=>{helm.reset();$('journal').replaceChildren();plan.reset();showRound(null);combatTelemetry(null,null);lastCombatId=null;reportedCombatId=null;nextScan=0;pending.clear();generation++;clearTimeout(timer);current=null;main.hidden=true;lockCockpit();orders.replaceChildren();$('pilot-login').hidden=!!user;$('pilot-logout').hidden=!user;if(user)refresh();else status('Connectez le pilote mandaté pour ce vaisseau. Le compte MJ ne commande pas à sa place.');});
window.addEventListener('offline',()=>{generation++;clearTimeout(timer);fail(new Error('Connexion perdue'));status('Connexion perdue · commandes suspendues.');});
window.addEventListener('online',()=>refresh());
window.addEventListener('pagehide',()=>{helm.reset();generation++;clearTimeout(timer);});

bindHazardHelm();
