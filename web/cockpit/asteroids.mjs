import {mountAsteroidConsole} from './asteroid-console.mjs';
import {circuitNames} from './asteroid-faults.mjs';

const $=id=>document.getElementById(id);
let wave=0,passed=0,delay=0,repairs=[],nextWave;
const systems=Object.keys(circuitNames);
for(const [id,[,label]] of Object.entries(circuitNames))$('system').add(new Option(label,id));
function repairView(){
 $('repairs').hidden=!delay&&!repairs.length;
 $('fix').hidden=!repairs.length;
 $('symptom').textContent=repairs.length?'Vague '+repairs[0].wave+' · '+circuitNames[repairs[0].system][0]:'Circuits réparés.';
}
$('fix').onsubmit=e=>{
 e.preventDefault();if(!repairs.length)return;
 if($('system').value!==repairs[0].system){$('repair-status').textContent='Ce circuit répond normalement. Relisez le symptôme.';return;}
 repairs.shift();delay-=30;$('system').value='';$('repair-status').textContent='Circuit réparé · 30 s récupérées. Retard : '+delay+' s.';repairView();
};
const seed=()=>Math.floor(Math.random()*0x7fffffff);
const panel=mountAsteroidConsole(document,{title:'École de vol · ceinture d’astéroïdes',seed:22,waiting:true,onFinish(run){
 if(run.hit){delay+=60;repairs.push({wave,system:systems[(wave-1)%systems.length]});repairView();}else passed++;
 $('notice').textContent=(run.hit?'Collision · avarie transmise au poste mécano':'Passage sans impact')+' · '+passed+' esquive(s) sur '+wave;
 if(wave===6){panel.setLabel('Exercice terminé · '+passed+'/6');$('restart').hidden=false;$('restart').textContent='Rejouer';}
 else{panel.setLabel('Prochain front en approche');nextWave=setTimeout(begin,1350);}
}});
function begin(){wave++;panel.begin(seed());panel.setLabel('Traversée '+wave+'/6');}
$('restart').hidden=false;$('restart').textContent='Entrer dans le champ';
$('restart').onclick=()=>{clearTimeout(nextWave);wave=passed=delay=0;repairs=[];repairView();$('repair-status').textContent='';$('notice').textContent='Manœuvrez pour écarter les rochers de votre trajectoire.';$('restart').hidden=true;$('glass').focus({preventScroll:true});begin();};
window.addEventListener('pagehide',e=>{if(!e.persisted){clearTimeout(nextWave);panel.close();}});
