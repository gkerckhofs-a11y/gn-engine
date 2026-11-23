import {duel,step,relative,forward,decision,STEP} from './duel-model.mjs';
const $=id=>document.getElementById(id);
const token=location.hash.slice(1), online=/^[0-9a-f]{48}$/.test(token);
let state=duel(),seat=0,ready=!online,rtc=null,media=null,callVersion=0,peerReady=false,offering=false;
let notice=t=>{$('notice').textContent=t;};
const keys=new Set();
onkeydown=e=>{if(e.target.matches('select,input,button') && e.code==='Space')return;
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
    roll:key('e','a')||axis('roll'),throttle:key('z','s')||-axis('throttle'),fire:keys.has(' ')||!!pad?.buttons[0]?.pressed};
}
async function command(type,data){
  if(!online){decision(state,seat,type);if(type==='accord')decision(state,1,type);return;}
  const r=await fetch('/command',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({type,data})});
  if(!r.ok)throw Error('Commande refusée.');
}
function act(type){command(type).catch(e=>notice(e.message));document.activeElement?.blur();}
$('peace').onclick=()=>act('accord');$('break').onclick=()=>act('rompre');
$('restart').onclick=()=>{state=duel();notice('');};
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
        if(type==='frame'){state=data.room;ready=data.ready;if(media && !['parole','appel'].includes(state.phase))hangup();}
        if(type==='signal')signal(data).catch(e=>notice(e.message));
        if(type==='hangup')hangup();
      }
    }
  }catch(e){notice(e.message);}
  ready=false;hangup();notice('Liaison perdue. Reconnexion en cours…');setTimeout(connect,1500);
}
if(online)connect();
let sending=false;
setInterval(()=>{
  const c=input();
  if(!online){
    const ai=state.ships[1],p=relative(ai,state.ships[0]);
    step(state,[c,{turn:Math.atan2(p.x,p.z),pitch:Math.atan2(p.y,Math.hypot(p.x,p.z)),throttle:ai.speed<35?.5:0,fire:p.z>0&&Math.hypot(p.x,p.y)<22}]);
  }else if(ready&&!sending){sending=true;command('input',c).catch(e=>notice(e.message)).finally(()=>sending=false);}
},STEP*1000);
const canvas=$('glass'),ctx=canvas.getContext('2d');
const stars=Array.from({length:460},(_,i)=>{
  const angle=i*2.399963, y=1-2*(i+.5)/460,r=Math.sqrt(1-y*y);
  return {x:r*Math.sin(angle),y,z:r*Math.cos(angle)};
});
function draw(){
  const w=canvas.clientWidth,h=canvas.clientHeight;
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const self=state.ships[seat],foe=state.ships[1-seat];
  const focal=Math.min(w*.64,h*.95);
  const project=p=>p.z>.05?[w/2+p.x/p.z*focal,h/2-p.y/p.z*focal]:null;
  const line=(a,b,color,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();};
  const sky=ctx.createLinearGradient(0,0,w,h);sky.addColorStop(0,'#030914');sky.addColorStop(.6,'#132436');sky.addColorStop(1,'#080e19');
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  const orientation={...self,x:0,y:0,z:0};
  ctx.fillStyle='#cee1ed';for(const s of stars){const pixel=project(relative(orientation,s));if(pixel)ctx.fillRect(...pixel,1.6,1.6);}
  const contact=relative(self,foe),pixel=project(contact);
  if(pixel){
    const nose=forward(foe),right={x:Math.cos(foe.yaw),z:-Math.sin(foe.yaw)};
    const points=[[0,15],[-11,-8],[-3,-5],[0,-9],[3,-5],[11,-8]].map(([side,ahead])=>
      project(relative(self,{x:foe.x+ahead*nose.x+side*right.x,y:foe.y+ahead*nose.y+side*Math.sin(foe.bank),z:foe.z+ahead*nose.z+side*right.z})));
    if(points.every(Boolean)){ctx.fillStyle='#ac8064';ctx.strokeStyle='#ffcb85';ctx.beginPath();
      points.forEach(([x,y])=>ctx.lineTo(x,y));ctx.closePath();ctx.fill();ctx.stroke();}
    ctx.fillStyle='#ffce9c';ctx.font='13px monospace';ctx.fillText(Math.round(Math.hypot(contact.x,contact.y,contact.z))+' m',pixel[0]+12,pixel[1]-10);
  }
  for(const p of state.shots){
    const a=project(relative(self,p));
    const b=project(relative(self,{x:p.x-p.velocity.x*12,y:p.y-p.velocity.y*12,z:p.z-p.velocity.z*12}));
    if(a&&b)line(a,b,p.owner===seat?'#a1ffd4':'#ff9675',3);
  }
  const cx=w/2,cy=h/2;
  for(const side of [-1,1]){line([cx+side*8,cy],[cx+side*24,cy],'#82e1c4');line([cx,cy+side*8],[cx,cy+side*16],'#82e1c4');}
  // Canopy spars frame the forward view; the radar covers both hemispheres.
  for(const side of [-1,1]){const edge=side<0?0:w;
    line([edge,h*.08],[edge-side*w*.17,h],'#43525a',12);line([edge,h*.08],[edge-side*w*.17,h],'#17222a',7);}
  const rx=60,ry=h-56,rad=36;
  ctx.fillStyle='#092121';ctx.beginPath();ctx.arc(rx,ry,rad,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#538e83';ctx.stroke();
  line([rx-rad,ry],[rx+rad,ry],'#30594e');line([rx,ry-rad],[rx,ry+rad],'#30594e');
  const bearing=Math.atan2(contact.x,contact.z),range=rad*Math.min(.92,Math.hypot(contact.z,contact.x)/550);
  ctx.fillStyle='#ffba79';ctx.beginPath();ctx.arc(rx+Math.sin(bearing)*range,ry-Math.cos(bearing)*range,3.8,0,7);ctx.fill();
  $('speed').value=Math.round(self.speed)+' m/s';$('shield').value=self.shield+' / 3';$('hull').value=self.hull+' / 4';
  $('guns').value=state.phase==='combat'?'ARMÉ':'VERROUILLÉ';
  const talking=['appel','parole'].includes(state.phase);
  const phase={appel:'Contact · appel entrant',parole:'Négociation',combat:'Combat libre',paix:'Accord conclu · passage libre',fin:!self.hull?'Vaisseau neutralisé':'Contact neutralisé'};
  $('phase').textContent=ready?phase[state.phase]+(talking?' · '+Math.ceil(state.seconds)+' s':''):'En attente du second cockpit';
  $('peace').disabled=!ready||!talking||state.agreement[seat];$('break').disabled=!ready||!talking;
  $('call').disabled=!online||!ready||!talking;$('restart').hidden=online;
  requestAnimationFrame(draw);
}
draw();
