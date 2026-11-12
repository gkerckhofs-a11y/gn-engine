import auth from '../firebase-client.mjs';
import {GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut,browserSessionPersistence,setPersistence} from 'firebase/auth';
import {projectCockpit,lockCockpit} from './cockpit.mjs';
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
const status=text=>{$('connection-status').textContent=text;};
function fail(error){main.hidden=true;current=null;lockCockpit();orders.replaceChildren();status(soNavigationErrors[error.code]??spaceEncounterErrors[error.code]??'Connexion ou autorisation indisponible. Vérifiez le pilote connecté et l’affectation du poste auprès du MJ.');}
async function api(action,input){
 if(!auth.currentUser)throw new Error('Connexion requise');
 const token=await auth.currentUser.getIdToken();
 const response=await fetch('/api/command',{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action,input}),cache:'no-store',signal:AbortSignal.timeout(12000)});
 const body=await response.json();if(!response.ok||body.error){const e=new Error(body.error);e.code=body.error;throw e;}return body.result;
}
async function mutate(action,input){
 const key=JSON.stringify([action,input]);const requestId=pending.get(key)??crypto.randomUUID();pending.set(key,requestId);
 const result=await api(action,{...input,requestId});pending.delete(key);return result;
}
async function refresh(){
 clearTimeout(timer);if(!auth.currentUser||busy)return;const ticket=generation;
 try{
  const d=await api('cockpitStation',{sessionId,stationId});if(ticket!==generation)return;
  current=d;main.hidden=false;projectCockpit(d);document.querySelector('.connection').textContent='COCKPIT · CONNECTÉ';
  status(`Poste ${stationId} · pilote : ${d.pilotName}`);
  const s=d.ship,ready=d.canAct&&s.operation?.kind==='PREPARE'&&s.operation.remainingSeconds===0;
  const arrived=d.canAct&&s.journey&&!s.journey.suspended&&!s.combatId&&!s.rescueId&&s.journey.remainingSeconds===0;
  $('next').textContent=ready?'Décoller':arrived?'Confirmer l’amarrage':s.journey?'Voyage en cours':'En attente du MJ';
  $('next').disabled=!(ready||arrived);$('next').dataset.command=ready?'finishSoPreparation':'arriveShip';
  $('hint').textContent=ready?'Confirmez que le pilote et l’équipage sont installés. Le départ consommera les ressources prévues.':arrived?'Confirmez l’arrivée pour libérer l’équipage à destination.':'Le MJ contrôle l’affectation de ce poste. La pause du jeu suspend les commandes.';
  if(s.combatId){
   const combat=await api('spaceCombat',{sessionId,combatId:s.combatId});if(ticket!==generation)return;
   if(!combat.combat||combat.combat.ownShipId!==s.shipId)throw new Error('Vaisseau différent');
   // Keep an order being entered intact. Server confirmations reject stale submissions.
   if(!orders.contains(document.activeElement)){
    orders.innerHTML=spaceCombatsHtml(combat);
    for(const a of orders.querySelectorAll('a'))a.remove();
   }
  }else if(!previewing&&!orders.contains(document.activeElement)){orders.innerHTML=d.canAct&&s.journey&&!s.groupShip&&!s.journey.suspended&&!s.journey.intercepted&&!s.journey.interceptionCovered&&!s.ambushId&&!s.convoy&&!s.towingAttached&&s.journey.remainingSeconds>0?spaceArmHtml(sessionId,s.shipId):'';}
 }catch(e){if(ticket===generation)fail(e);}
 finally{if(ticket===generation&&!busy&&auth.currentUser)timer=setTimeout(refresh,3000);}
}
async function execute(action,input){
 previewing=false;
 if(busy)return;busy=true;clearTimeout(timer);$('next').disabled=true;
 for(const b of orders.querySelectorAll('button'))b.disabled=true;
 try{
  // Revocation is checked again before each command; native services recheck the pilot.
  const live=await api('cockpitStation',{sessionId,stationId});
  if(live.ship.shipId!==input.shipId||!live.canAct)throw new Error('Poste indisponible');
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
onAuthStateChanged(auth,user=>{generation++;clearTimeout(timer);current=null;main.hidden=true;lockCockpit();orders.replaceChildren();$('pilot-login').hidden=!!user;$('pilot-logout').hidden=!user;if(user)refresh();else status('Connectez le pilote mandaté pour ce vaisseau. Le compte MJ ne commande pas à sa place.');});
window.addEventListener('pagehide',()=>{generation++;clearTimeout(timer);});
