import {duel,step,relative,decision,STEP,MAX_SPEED} from './duel-model.mjs';
import {drawDuelShip,drawDuelLasers} from './duel-visuals.mjs';
import {mountThrottle} from './duel-throttle.mjs';
import {mountDuelInstruments} from './duel-instruments.mjs';
import {initDuelSky} from './duel-sky.mjs';
import {drawRadar,mountCanopy,fitDisplay} from './duel-canopy.mjs';
import {DESTRUCTION_SECONDS,drawShipDestruction,drawCockpitDestruction} from './duel-destruction.mjs';
const $=id=>document.getElementById(id);
const token=location.hash.slice(1), online=/^[0-9a-f]{48}$/.test(token);
let state=duel(),seat=0,ready=!online,rtc=null,media=null,callVersion=0,peerReady=false,offering=false;
const viewport=document.querySelector('.viewport');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let endedAt=null;
let notice=t=>{$('notice').textContent=t;};
const keys=new Set();
const propulsion=mountThrottle();
onkeydown=e=>{
  if(e.target.matches('input[type="range"], select') && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))return;
  if(e.target.matches('select,input,button') && e.code==='Space')return;
  if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
  keys.add(e.key.toLowerCase());};
onkeyup=e=>keys.delete(e.key.toLowerCase());onblur=()=>keys.clear();
const bindings={turn:['Virage',0],pitch:['Tangage',1],roll:['Roulis',2],throttle:['Poussée',3]};
for(const [id,[label,index]] of Object.entries(bindings)){
  const wrap=document.createElement('label'),select=document.createElement('select');
  wrap.textContent=label+' ';select.id=id;
  for(let n=-1;n<8;n++)select.add(new Option(n<0?'Aucun':'Axe '+(n+1),n));
  select.value=index;wrap.append(select);$('axes').append(wrap);
}
function input(){
  let pad;try{pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean);}catch{}
  $('device').textContent=pad?.id||'Clavier actif';
  const axis=id=>{const n=pad?.axes[Number($(id).value)]||0;return Math.abs(n)<.12?0:n;};
  const key=(a,b)=>Number(keys.has(a))-Number(keys.has(b));
  return {turn:key('arrowright','arrowleft')||axis('turn'),pitch:key('arrowdown','arrowup')||axis('pitch'),
    roll:key('e','a')||axis('roll'),...propulsion.controls(key('z','s'),-axis('throttle')),fire:keys.has(' ')||!!pad?.buttons[0]?.pressed};
}
async function command(type,data){
  if(!online){decision(state,seat,type);if(type==='accord')decision(state,1,type);return;}
  const r=await fetch('/command',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({type,data})});
  if(!r.ok)throw Error('Commande refusée.');
}
function act(type){command(type).catch(e=>notice(e.message));document.activeElement?.blur();}
$('peace').onclick=()=>act('accord');$('break').onclick=()=>act('rompre');
$('restart').onclick=()=>{state=duel();endedAt=null;propulsion.reset();notice('');};
function hangup(){callVersion++;if(rtc){rtc.onconnectionstatechange=null;rtc.close();rtc=null;}
  for(const t of media?.getTracks()||[])t.stop();media=null;peerReady=false;offering=false;
  $('remote').srcObject=null;$('remote').hidden=true;$('call').textContent='Ouvrir la visio';}
async function description(desc){
  const pc=rtc;await pc.setLocalDescription(desc);
  if(pc.iceGatheringState!=='complete')await new Promise(resolve=>{
    const done=()=>{clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',changed);resolve();};
    const changed=()=>{if(pc.iceGatheringState==='complete')done();};
    const timer=setTimeout(done,3500);pc.addEventListener('icegatheringstatechange',changed);
  });
  if(pc===rtc)await command('signal',{description:pc.localDescription});
}
async function offer(){
  if(!seat && media && peerReady && !offering){offering=true;await description(await rtc.createOffer());}
}
async function signal(data){
  if(data?.ready){peerReady=true;await offer();}
  else if(data?.description && rtc){await rtc.setRemoteDescription(data.description);
    if(data.description.type==='offer')await description(await rtc.createAnswer());}
}
$('call').onclick=async()=>{
  if(media){hangup();act('hangup');return;}
  const version=++callVersion;
  try{
    if(!navigator.mediaDevices)throw Error('La visio demande HTTPS ou localhost.');
    const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    if(version!==callVersion || !ready || !['appel','parole'].includes(state.phase)){stream.getTracks().forEach(t=>t.stop());return;}
    media=stream;rtc=new RTCPeerConnection();
    for(const t of media.getTracks())rtc.addTrack(t,media);
    rtc.ontrack=e=>{$('remote').srcObject=e.streams[0];$('remote').hidden=false;};
    rtc.onconnectionstatechange=()=>{if(rtc?.connectionState==='connected'){act('liaison');notice('Canal audiovisuel ouvert.');}
      if(rtc?.connectionState==='failed'){hangup();act('hangup');notice('Liaison interrompue.');}};
    $('call').textContent='Raccrocher';await command('signal',{ready:true});await offer();
  }catch(e){hangup();act('hangup');notice('Visio indisponible · '+e.message);}
};
async function connect(){
  try{
    const r=await fetch('/stream',{headers:{Authorization:'Bearer '+token}});
    if(r.status===409){notice('Ce cockpit est déjà ouvert. Fermez son autre fenêtre puis rechargez.');return;}
    if(r.status===403){notice('Invitation invalide.');return;}
    if(!r.ok)throw Error('Connexion indisponible');
    const reader=r.body.pipeThrough(new TextDecoderStream()).getReader();let pending='';
    for(;;){const {value,done}=await reader.read();if(done)break;pending+=value;
      let boundary;while((boundary=pending.indexOf('\n'))>=0){
        const {type,data}=JSON.parse(pending.slice(0,boundary));pending=pending.slice(boundary+1);
        if(type==='seat'){seat=data;$('station').textContent='Cockpit '+(seat+1)+' · Exercice en réseau';}
        if(type==='frame'){
          state=data.room;ready=data.ready;
          if(state.phase==='fin' && endedAt===null)endedAt=performance.now()-(data.secondsSinceEnd??0)*1000;
          if(state.phase!=='fin')endedAt=null;
          if(media && !['parole','appel'].includes(state.phase))hangup();
        }
        if(type==='signal')signal(data).catch(e=>notice(e.message));
        if(type==='hangup')hangup();
      }
    }
  }catch(e){notice(e.message);}
  ready=false;propulsion.reset();hangup();notice('Liaison perdue. Reconnexion en cours…');setTimeout(connect,1500);
}
if(online)connect();
let sending=false;
setInterval(()=>{
  const c=input();
  if(!online){
    const ai=state.ships[1],p=relative(ai,state.ships[0]);
    step(state,[c,{turn:Math.atan2(p.x,p.z),pitch:Math.atan2(p.y,Math.hypot(p.x,p.z)),throttle:ai.speed<35?.5:0,fire:p.z>0&&Math.hypot(p.x,p.y)<22}]);
    if(state.phase==='fin')endedAt??=performance.now();
  }else if(ready&&!sending&&state.phase!=='fin'){sending=true;command('input',c).catch(e=>notice(e.message)).finally(()=>sending=false);}
},STEP*1000);
const canvas=$('glass'),ctx=canvas.getContext('2d');
const avionics=mountDuelInstruments($('attitude'),$('systems'));
const drawSky=initDuelSky(), drawCanopy=mountCanopy();
const scope=$('radar').getContext('2d');
const optic=$('optic').getContext('2d');
function drawOptic(self,foe,contact,elapsed,project,pixel,w,h){
  const panel=fitDisplay(optic);
  const midX=panel.w/2,midY=panel.h/2;
  optic.clearRect(0,0,panel.w,panel.h);
  if(!foe.hull && elapsed>=DESTRUCTION_SECONDS){
    optic.fillStyle='#849f94';optic.font='11px monospace';optic.textAlign='center';
    optic.fillText('CONTACT PERDU',midX,midY+4);return;
  }
  if(!pixel || pixel[0]<0 || pixel[0]>w || pixel[1]<0 || pixel[1]>h){
    optic.fillStyle='#849f94';optic.font='11px monospace';optic.textAlign='center';
    optic.fillText('HORS CHAMP',midX,midY+4);return;
  }
  // Stabilised crop of the same perspective and pose as the forward view.
  const cropped=p=>{
    const point=project(p);return point && [midX+(point[0]-pixel[0])*4,midY+(point[1]-pixel[1])*4];
  };
  if(foe.hull)drawDuelShip(optic,self,foe,cropped);
  else drawShipDestruction(optic,contact,cropped,elapsed);
  optic.strokeStyle='#62877a';optic.lineWidth=1;optic.beginPath();
  for(const x of [5,panel.w-5]){
    const sign=x===5?1:-1;optic.moveTo(x,midY-5);optic.lineTo(x,midY+5);
    optic.moveTo(x,midY);optic.lineTo(x+sign*5,midY);
  }
  optic.stroke();
}
const degrees=radians=>(Math.round(radians*180/Math.PI)%360+360)%360;
const setValue=(element,value)=>{if(element.value!==value)element.value=value;};
const phaseLabels={appel:'Contact · appel entrant',parole:'Négociation',combat:'Combat libre',paix:'Accord conclu · passage libre'};
function draw(){
  const {w,h}=fitDisplay(ctx);
  const self=state.ships[seat],foe=state.ships[1-seat];
  const focal=Math.min(w*.64,h*.95);
  const project=p=>p.z>.05?[w/2+p.x/p.z*focal,h/2-p.y/p.z*focal]:null;
  drawSky(ctx,self,project,w,h,focal);
  const contact=relative(self,foe),pixel=project(contact);
  const distance=Math.round(Math.hypot(contact.x,contact.y,contact.z));
  const finished=state.phase==='fin';
  const elapsed=endedAt===null||reducedMotion.matches?Infinity:(performance.now()-endedAt)/1000;
  let outcome='';
  if(finished){
    if(elapsed>=DESTRUCTION_SECONDS)outcome='finished';
    else if(!self.hull)outcome=foe.hull?'self':'both';
    else outcome='enemy';
  }
  if(outcome && viewport.dataset.destruction!==outcome)viewport.dataset.destruction=outcome;
  if(!outcome && viewport.hasAttribute('data-destruction'))delete viewport.dataset.destruction;
  if(foe.hull)drawDuelShip(ctx,self,foe,project);
  else if(elapsed<DESTRUCTION_SECONDS)drawShipDestruction(ctx,contact,project,elapsed);
  if(!finished)drawDuelLasers(ctx,self,state.shots,seat,project);
  if(foe.hull && pixel && pixel[0]>28 && pixel[0]<w-28 && pixel[1]>45 && pixel[1]<h-16){
    const gap=Math.min(90,Math.max(14,18*focal/contact.z));
    ctx.strokeStyle='#e6b98eaa';ctx.lineWidth=1;ctx.beginPath();
    for(const side of [-1,1]){
      const x=pixel[0]+side*gap,y=pixel[1]-gap*.65;
      ctx.moveTo(x-side*5,y);ctx.lineTo(x,y);ctx.lineTo(x,y+5);
    }
    ctx.stroke();ctx.fillStyle='#edc8a9';ctx.font='12px monospace';
    ctx.fillText(distance+' m',pixel[0]+gap+5,pixel[1]+4);
  }
  ctx.strokeStyle='#9ce1bf';ctx.lineWidth=1;ctx.beginPath();
  const cx=w/2,cy=h/2;
  for(const side of [-1,1]){
    ctx.moveTo(cx+side*7,cy);ctx.lineTo(cx+side*20,cy);ctx.lineTo(cx+side*20,cy-3);
    ctx.moveTo(cx,cy+side*9);ctx.lineTo(cx,cy+side*15);
  }
  ctx.stroke();drawCanopy(ctx,w,h);
  if(!self.hull && elapsed<DESTRUCTION_SECONDS)drawCockpitDestruction(ctx,w,h,elapsed);
  drawOptic(self,foe,contact,elapsed,project,pixel,w,h);
  drawRadar(scope,foe.hull?contact:null,distance);
  avionics.update(self);
  setValue($('heading'),String(degrees(self.yaw)).padStart(3,'0')+'°');
  setValue($('range'),foe.hull?distance+' m':'—');
  setValue($('bearing'),foe.hull?(contact.z>=0?'AVANT':'ARRIÈRE'):'PERDU');
  setValue($('speed'),Math.round(self.speed)+' m/s');
  $('thrust').style.setProperty('--fill',Math.round(self.speed/MAX_SPEED*100)+'%');
  propulsion.render(self,ready && !finished && state.phase!=='paix');
  const armed=state.phase==='combat';
  setValue($('guns'),armed?'ARMÉ':'VERROUILLÉ');$('guns').dataset.armed=String(armed);
  const talking=['appel','parole'].includes(state.phase);
  const phase=phaseLabels[state.phase]??(!self.hull && !foe.hull?'Deux vaisseaux neutralisés':!self.hull?'Vaisseau neutralisé':'Contact neutralisé');
  const status=ready||finished?phase+(talking?' · '+Math.ceil(state.seconds)+' s':''):'En attente du second cockpit';
  if($('phase').textContent!==status)$('phase').textContent=status;
  $('peace').disabled=!ready||!talking||state.agreement[seat];$('break').disabled=!ready||!talking;
  $('call').disabled=!online||!ready||!talking;$('restart').hidden=online;
  requestAnimationFrame(draw);
}
draw();
