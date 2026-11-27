import auth from '../firebase-client.mjs';

const query=new URLSearchParams(location.search),sessionId=query.get('session'),slotId=query.get('slot');
const type=document.body.dataset.exercise;
const back='/#/flight-training/'+encodeURIComponent(sessionId??'');
let started=false,timer,deadline,stopped=false;
function closeExercise(){
 if(stopped)return;
 stopped=true;
 document.body.hidden=true;
 clearTimeout(timer);clearTimeout(deadline);
 location.replace(back);
}
async function check(){
 clearTimeout(timer);
 try{
  await auth.authStateReady();
  if(!auth.currentUser)return closeExercise();
  const response=await fetch('/api/command',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(6000),
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+await auth.currentUser.getIdToken()},
   body:JSON.stringify({action:'flightTraining',input:{sessionId,...(query.get('role')?{demoRole:query.get('role')}:{})}})});
  if(!response.ok)return closeExercise();
  const {result}=await response.json(),slot=result.slots.find(x=>x.id===slotId&&x.kind===type&&x.active);
  if(!slot||stopped)return closeExercise();
  clearTimeout(deadline);
  deadline=setTimeout(closeExercise,Math.min(2147483647,slot.end-result.serverNow));
  if(!started){
   started=true;
   const modules={DUEL:'./duel-ui.mjs',VOYAGE:'./flight-ui.mjs',ASTEROIDS:'./asteroids.mjs'};
   document.querySelector('a[href="./duel.html"]')?.remove();
   const link=document.createElement('a');link.href=back;link.textContent='Quitter le simulateur';document.body.prepend(link);
   document.body.hidden=false;
   await import(modules[type]);
  }
  timer=setTimeout(check,5000);
 }catch{closeExercise();}
}
window.addEventListener('offline',closeExercise);
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
check();
