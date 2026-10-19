import test from 'node:test';
import assert from 'node:assert/strict';
import {createHealthUi} from '../web/health.mjs';
import {createAbilityUi} from '../web/abilities.mjs';
import {createKnowledgeUi} from '../web/knowledge.mjs';
import {abilityLevel} from '../src/core/abilities.mjs';
const helpers={button:(l,a,x='')=>`<button data-action="${a}" ${x}>${l}</button>`,link:(l,u)=>`<a href="#/${u}">${l}</a>`,textarea:()=>'',input:()=>'',pill:x=>x};
const ui=createHealthUi(helpers),evil='<img src=x onerror="bad()">';
const health={hp:4,maxHp:10,outOfCombat:false,stage:'EN_JEU',returnMode:'MJ',allowed:{heal:false}};
const skill={id:'skill',name:evil,description:evil,instructions:evil,kind:'ACTIVE_TARGET',level:3,healing:{effect:'HEAL_HP',amount:3,uses:2,cooldownSeconds:60},remaining:1,waitMs:0};
const view={session:{id:'session',stage:'EN_JEU'},character:{id:'character',name:evil},health,skills:[skill],events:[]};
test('interface PV : module absent masqué, aperçu sans action et règles hors combat explicites',()=>{
  assert.equal(ui.quick(null,'session'),'');assert.doesNotMatch(ui.quick(health,'session',true),/<button|<a /);
  assert.match(ui.quick({...health,outOfCombat:true},'session'),/retour en jeu exige une correction du MJ/);
  assert.doesNotMatch(ui.page({...view,preview:true}),/<button|<img/);
  const rules=ui.rules({id:'session',revision:1},'session');assert.match(rules,/name="defaultMaxHp"[^>]*value=""/);assert.match(rules,/name="reason"/);assert.match(rules,/ne soigne pas/);
});
test('interface soins : indisponibilité visible selon pause, quota, délai, état et cible soi',()=>{
  const action=html=>html.match(/<button data-action="treatmentForm"[^>]*>/)[0];
  assert.doesNotMatch(action(ui.page(view)),/disabled/);
  for(const d of [{...view,session:{...view.session,stage:'PAUSE'}},{...view,health:{...health,outOfCombat:true}},{...view,skills:[{...skill,remaining:0}]},{...view,skills:[{...skill,waitMs:1000}]},{...view,health:{...health,hp:10},skills:[{...skill,kind:'ACTIVE_SELF'}]}])assert.match(action(ui.page(d)),/disabled/);
  assert.doesNotMatch(action(ui.page({...view,health:{...health,outOfCombat:true,allowed:{heal:true}}})),/disabled/);
  assert.doesNotMatch(ui.page(view),/<img/);assert.match(ui.page(view),/&lt;img/);
});
test('interface soin : confirmation précise et historique joueur sans motif MJ',()=>{
  const d={skill,target:{name:evil},before:health,after:{...health,hp:7},restored:3,remainingAfter:0,cooldownSeconds:60,confirmation:'proof'};
  const html=ui.confirm('applyTreatment',d,{targetId:evil});assert.match(html,/4 \/ 10 PV/);assert.match(html,/7 \/ 10 PV/);assert.match(html,/il en restera 0/);assert.match(html,/60 s de jeu/);assert.doesNotMatch(html,/<img/);assert.match(html,/data-command="applyTreatment"/);
  const event={kind:'GM',at:1,before:health,after:health,reason:'MOTIF_PRIVE'};assert.doesNotMatch(ui.history([event]),/MOTIF_PRIVE/);assert.match(ui.history([event],true),/MOTIF_PRIVE/);
});
test('interface modèle : soins configurables, champs passifs désactivés et soin distinct d’une expertise QR',()=>{
  const abilities=createAbilityUi(helpers),context={id:'scenario',revision:1};
  assert.match(abilities.editor(context,'scenario','skills',{kind:'PASSIVE'}),/<fieldset data-healing-fields hidden disabled>/);
  const active=abilities.editor(context,'scenario','skills',skill);assert.match(active,/<fieldset data-healing-fields >/);assert.match(active,/name="healAmount"[^>]*value="3"/);assert.match(active,/name="healUses"[^>]*value="2"/);assert.doesNotMatch(active,/<img/);
  assert.equal(abilityLevel({abilityProfile:{published:true,skills:[skill]}},skill.id),0);
  assert.doesNotMatch(createKnowledgeUi(helpers).editor({},[],'scenario',[skill]),/value="skill"/);
});
