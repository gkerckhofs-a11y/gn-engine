import {createActionPointUi,actionPointQuick} from '../../web/action-points.mjs';
import {createHealthUi} from '../../web/health.mjs';
const button=(label,action,extra='',kind='')=>`<button class="${kind}" data-action="${action}" ${extra}>${label}</button>`;
const link=(label,path,kind='button')=>`<a class="${kind}" href="#/${path}">${label}</a>`;
const ui=createActionPointUi({button}),health=createHealthUi({button,link});
const rules={enabled:true,maxByLevel:{1:5,2:8},renewalMinutes:300,cost:1,cooldownSeconds:600,patientCooldownSeconds:600};
const ap={available:4,reserved:0,maximum:5,globalLevel:1,nextRefillInMs:20*60000,stage:'PAUSE'};
const context={id:'session-test',revision:2,actionPointRules:rules,characters:[{id:'medic',public:{displayName:'Médecin de test'},globalLevel:1,actionPoints:ap}]};
const screens={rules:()=>ui.rules(context,'session'),admin:()=>ui.admin(context,'session'),player:()=>actionPointQuick(ap),
  confirm:()=>ui.confirm({afterRules:{...rules,renewalMinutes:120},nextAtGameMs:300*60000,changes:[{id:'medic',name:'Médecin de test',levelBefore:1,levelAfter:1,before:{available:4,maximum:5},after:{available:4,maximum:5}}]}, {},'saveActionPointRules'),
  care:()=>health.confirm('applyTreatment',{skill:{name:'Soin de terrain'},target:{name:'Patient de test'},before:{hp:1,maxHp:3},after:{hp:2,maxHp:3},restored:1,remainingAfter:null,cooldownScope:'PATIENT',cooldownSeconds:600,actionPoints:{cost:1,before:4,after:3},confirmation:'test'}, {})};
const render=()=>document.querySelector('#app').innerHTML=`<div class="narrow">${(screens[location.hash.slice(1)]??screens.rules)()}</div>`;
addEventListener('hashchange',render);render();
