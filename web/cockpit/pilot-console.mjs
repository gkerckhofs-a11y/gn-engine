import {duel,step} from './duel-model.mjs';
import {mountDuelConsole} from './duel-console.mjs';
import {DESTRUCTION_SECONDS} from './duel-destruction.mjs';

export function pilotConsole(host,{exchange,peace}) {
  const root=host.attachShadow({mode:'open'});
  let panel,template,station,combat,room,display,received=0,seat=0,seq=null,signalSeq=0;
  let key='',generation=0,latest={},sending=false,trigger=false,ready=false,interval,endedAt=0,finished='',locked=false;
  const css=name=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/cockpit/'+name+'.css';return link;};
  function show(){
    if(!panel||!station||!room)return;
    const c=combat,live=station.canAct&&!locked,ended=room.phase==='fin';
    const contact=!!c?.flightDuel && !!key;
    const status=ended?(room.ships[seat].hull?'Contact neutralisé':'Vaisseau immobilisé'):!live?'Commandes suspendues':
      contact?(!ready?'En attente des deux postes':c.status==='ENCOUNTER'?'Négociation · '+room.seconds+' s':'Duel de pilotage'):
      station.ship.journey?.suspended?'Voyage suspendu':'En vol vers '+station.ship.journey.toPort;
    panel.update({room:display??room,seat,ready:live&&!ended&&(contact?ready:!station.ship.journey?.suspended),
      contact,status,station:station.ship.name+' · '+station.stationId,
      reduce:document.body.classList.contains('motion-reduced'),intensity:station.starfighter.intensity/100});
  }
  async function poll(){
    if(document.hidden||sending||!station?.canAct||!combat?.flightDuel||combat.status==='CLOSED'||room.phase==='fin')return;
    const ticket=generation;
    sending=true;
    try{
      const controls={...latest,fire:trigger||latest.fire===true};trigger=false;
      const data=await exchange('starfighterFrame',station,combat,seq===null?{}:{seq:seq+1,controls});
      if(ticket!==generation)return;
      seat=data.seat;seq=data.seq;room=data.room;ready=data.ready;locked=false;
      display=structuredClone(room);received=performance.now();
      if(room.phase==='fin'&&!endedAt)endedAt=performance.now();
      if(data.signal&&data.signal.seq>signalSeq){signalSeq=data.signal.seq;panel.signal(data.signal);}
    }catch{if(ticket===generation){ready=false;locked=true;latest={};}}
    finally{if(ticket===generation){sending=false;show();}}
  }
  async function command(type,data){
    if(!station?.canAct||!ready||locked||combat?.status!=='ENCOUNTER')return;
    if(type==='accord')return peace(station,combat);
    if(type==='liaison')return;
    const m=type==='hangup'?{type:'hangup'}:data?.ready?{type:'ready'}:data?.description;
    if(m)await exchange('starfighterSignal',station,combat,{message:m.sdp?{type:m.type,sdp:m.sdp}:{type:m.type}});
  }
  async function mount(){
    if(!template)template=fetch('/cockpit/console.html',{cache:'no-store'}).then(async r=>{
      if(!r.ok)throw Error('Console de pilotage inaccessible');return r.text();
    }).catch(e=>{template=null;throw e;});
    const markup=await template;
    if(!station||panel)return;
    const body=document.createElement('div');body.innerHTML=markup;
    root.replaceChildren(css('duel'),css('duel-instruments'),body);
    const glass=root.getElementById('glass');glass.tabIndex=0;
    glass.addEventListener('pointerdown',()=>glass.focus({preventScroll:true}));
    panel=mountDuelConsole(root,{command,input(c){
      if(!station?.canAct||locked)return;
      latest=c;trigger||=c.fire&&room.phase==='combat';
      if(!combat?.flightDuel && !station.ship.journey.suspended)step(room,[{...c,fire:false},{}]);
      else if(ready && display && performance.now()-received<400 && room.phase!=='fin'){
        // Predict motion only. Damage and the final visual cue come from the server.
        const inputs=[{},{}];inputs[seat]=c;step(display,inputs);
        display.ships.forEach((v,i)=>{v.hull=room.ships[i].hull;v.shield=room.ships[i].shield;});
        display.phase=room.phase;
      }
    }});
    interval=setInterval(poll,300);show();void poll();
  }
  function reset(){
    generation++;clearInterval(interval);panel?.close();panel=null;station=null;combat=null;display=null;key='';
    ready=false;locked=false;seq=null;sending=false;signalSeq=0;latest={};trigger=false;endedAt=0;finished='';host.hidden=true;root.replaceChildren();
  }
  async function update(d,c=null){
    if(!d.starfighter || !d.ship.journey || (c&&!c.flightDuel&&c.status!=='CLOSED')){reset();return;}
    if(c?.flightResult && finished!==c.id){
      endedAt ||=performance.now();
      if(performance.now()-endedAt>=DESTRUCTION_SECONDS*1000){finished=c.id;c=null;}
    }else if(c?.status==='CLOSED')c=null;
    if(!c && combat?.flightDuel && room?.phase==='fin' && performance.now()-endedAt<DESTRUCTION_SECONDS*1000)c=combat;
    const nextKey=[d.stationId,d.ship.shipId,d.ship.journey.id,c?.flightDuel?c.id:'cruise'].join('/');
    if(nextKey!==key){
      const seen=finished;reset();finished=seen;key=nextKey;
      room=duel();room.phase=c?.flightDuel?'negotiating':'cruise';seat=c?.flightDuel?c.ships.findIndex(s=>s.id===d.ship.shipId):0;
      const factor=c?.shieldFactor??1;
      Object.assign(room.ships[seat],{hull:d.ship.hull,hullMax:d.ship.profile.hullMax,shield:d.ship.shield*factor,shieldMax:d.ship.profile.shieldMax*factor});
    }
    station=d;combat=c?.flightDuel?c:null;host.hidden=false;
    if(!combat){
      const v=room.ships[0];Object.assign(v,{hull:d.ship.hull,shield:d.ship.shield,hullMax:d.ship.profile.hullMax,shieldMax:d.ship.profile.shieldMax});
    }else if(c.flightResult){
      room=c.flightResult;display=null;seat=c.ships.findIndex(sh=>sh.id===c.ownShipId);endedAt||=performance.now();
    }
    if(!d.canAct){ready=false;latest={};trigger=false;}
    await mount();show();
  }
  return {update,reset};
}
