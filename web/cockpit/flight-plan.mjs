import {galacticMapSvg,mapPlansHtml} from '../galactic-map.mjs';

export function cockpitFlightPlan(host,call) {
  let key='',generation=0,selection=0,view=null,quote=null,flight=null;
  function reset(){
    generation++;key='';view=null;quote=null;flight=null;host.replaceChildren();host.hidden=true;
  }
  function update(d){
    if(!d.starfighter?.navigation){reset();return;}
    const next=[d.stationId,d.ship.shipId,d.ship.pilotId,d.confirmation,d.canAct].join('|');
    if(next===key)return;
    reset();view=d;key=next;host.hidden=false;
    if(!document.getElementById('starfighter-map-style')){
      const css=document.createElement('link');css.id='starfighter-map-style';css.rel='stylesheet';css.href='../galactic.css';document.head.append(css);
    }
    host.innerHTML='<details><summary>Carte et plan de vol</summary><label>Codes personnels, un par ligne <textarea rows="3" maxlength="1620"></textarea></label> <button type="button" data-map>Consulter la carte</button><div data-chart></div></details><p data-info role="status"></p><form hidden><label>Code de navigation <input name="navigationCode" maxlength="80" required></label> <label>Codes passagers, séparés par des virgules <input name="crew"></label><button>Vérifier le manifeste</button></form><button type="button" data-depart hidden>Confirmer la présence et réserver 1 PA</button>';
    host.querySelector('details').hidden=!d.starfighter.canReadMap;
    host.querySelector('form').hidden=!d.canAct||!!d.ship.journey||!!d.ship.operation;
    host.querySelector('[data-info]').textContent=(d.ship.operation?.manifest??d.ship.journey?.manifest??[]).map(m=>m.name).filter(Boolean).join(' · ');
  }
  async function run(fn){
    const ticket=generation;
    try{await fn(()=>ticket===generation);}catch(error){if(ticket===generation)host.querySelector('[data-info]').textContent=error.message;}
  }
  function map(destinationId){
    return run(async current=>{
      const request=++selection;
      const codes=host.querySelector('details textarea').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      const data=await call('galacticMap',{codes,...(destinationId?{destinationId}:{})},view);
      if(!current()||request!==selection)return;
      data.session=view.session;data.admin=false;
      host.querySelector('[data-chart]').innerHTML=galacticMapSvg(data)+mapPlansHtml(data);
      const first=data.routes.find(r=>r.id===data.itineraries[0]?.legs[0]);
      if(first?.navigationCode)host.querySelector('[name=navigationCode]').value=first.navigationCode;
    });
  }
  host.addEventListener('click',e=>{
    if(!view)return;
    if(e.target.closest('[data-map]'))map();
    const link=e.target.closest('[data-chart] a');
    if(link){e.preventDefault();const dest=new URLSearchParams(link.getAttribute('href').split('?')[1]).get('destination');if(dest)map(dest);}
    if(e.target.closest('[data-depart]') && quote){
      const confirmation=quote.confirmation;quote=null;e.target.disabled=true;
      run(async current=>{await call('departShip',{...flight,confirmation,present:true},view);if(current())host.querySelector('[data-info]').textContent='Préparation enregistrée.';});
    }
  });
  host.addEventListener('input',()=>{selection++;quote=null;host.querySelector('[data-depart]').hidden=true;});
  host.addEventListener('submit',e=>{
    e.preventDefault();if(!view||e.target.hidden)return;
    const values=new FormData(e.target);
    const request=++selection;
    const proposed={navigationCode:String(values.get('navigationCode')).trim(),passengerCodes:String(values.get('crew')).split(',').map(s=>s.trim()).filter(Boolean)};
    run(async current=>{
      const result=await call('prepareVoyage',proposed,view);if(!current()||request!==selection)return;
      flight=proposed;quote=result;const b=host.querySelector('[data-depart]');b.hidden=false;b.disabled=false;
      host.querySelector('[data-info]').textContent=result.manifest.map(m=>m.name).join(' · ')+' · préparation '+result.durationSeconds+' s · carburant après trajet '+result.remainingFuel+(result.riskFaces?' · jet de traversée, seuil '+result.riskFaces+'/6':'');
    });
  });
  return {update,reset};
}
