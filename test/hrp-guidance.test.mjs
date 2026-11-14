import test from 'node:test';
import assert from 'node:assert/strict';
import parse5 from 'parse5';
import {skillGuidance,skillGuidanceHtml} from '../web/skill-guidance.mjs';
import {playerSkillRules} from '../web/player-skill-rules.mjs';
import {entrySkills} from '../web/space-outlaws-entry.mjs';
import {commonUiErrors,explainUiError,uiErrorMessage,uiStatus} from '../web/ui-language.mjs';
import {playerGuidanceHtml,gameTermsHtml} from '../web/player-guidance.mjs';
import {soInventoryHtml} from '../web/shops.mjs';
import {createTransferUi} from '../web/transfers.mjs';
const flat=n=>[n,...(n.childNodes??[]).flatMap(flat)];
const txt=n=>n.nodeName==='#text'?n.value:(n.childNodes??[]).map(txt).join('');
const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
const cls=(n,k)=>(attr(n,'class')??'').split(' ').includes(k);
const helpers={button:(label,action)=>`<button data-action="${action}">${label}</button>`};
test('HRP : les 34 aides gardent les règles détaillées intactes, fermées et sans commandes supplémentaires',()=>{
 assert.deepEqual(Object.keys(skillGuidance).sort(),Object.keys(playerSkillRules).sort());
 for(const id of Object.keys(playerSkillRules)){
  const profile={className:'Classe',skills:[{id,name:id,kind:'PASSIVE',level:2}],secondarySlotsUsed:0},before=structuredClone(profile),nodes=flat(parse5.parseFragment(entrySkills(profile)));
  assert.deepEqual(profile,before);assert.equal(nodes.filter(n=>n.tagName==='button').length,0);
  const rules=nodes.find(n=>cls(n,'rules-text'));assert.ok(rules,id);assert.equal(attr(rules,'open'),undefined);
  const body=flat(rules).find(n=>n.tagName==='p');assert.equal(txt(body),playerSkillRules[id],id);
  const use=nodes.find(n=>cls(n,'skill-instructions'));assert.equal(attr(use,'open'),undefined);
  assert.deepEqual(flat(use).filter(n=>n.tagName==='dt').map(txt),['Comment l’utiliser','Conditions','Coût et durée','Résultat']);
 }
 assert.equal(skillGuidanceHtml('FOR-01'),''); // no new PNJ workflow is promised
});
test('HRP : messages fondés sur les codes connus, aucune cause ni durée restante inventée',()=>{
 assert.match(explainUiError('FORBIDDEN'),/autorisé/);assert.match(explainUiError('COOLDOWN_ACTIVE'),/délai indiqué/);assert.doesNotMatch(explainUiError('COOLDOWN_ACTIVE'),/6 minutes|serveur|payload/);
 assert.equal(explainUiError('NEW_INTERNAL_CODE',{KNOWN:'Message précis'}),commonUiErrors.SERVER_ERROR);assert.doesNotMatch(explainUiError('NEW_INTERNAL_CODE'),/NEW_INTERNAL_CODE/);
 assert.equal(explainUiError('KNOWN',{KNOWN:'Le document a changé.'}),'Le document a changé.');
 assert.match(uiErrorMessage({code:'NETWORK_UNAVAILABLE',message:'L’opération peut déjà être enregistrée. Réessayez cette confirmation sans la modifier.'}),/peut déjà être enregistrée/);
 assert.equal(uiErrorMessage(Error('Scannez un badge de cette session.')),'Scannez un badge de cette session.');assert.equal(uiStatus('ACTIVE'),'En cours');assert.equal(uiStatus('FUTURE_STATE'),'FUTURE_STATE');
});
test('HRP : le texte narratif du MJ n’est ni traduit ni remplacé dans le sac ou les confirmations',()=>{
 const story='Le Master M6 protège son payload secret. <script>fiction</script>',item={id:'model',name:'Objet',description:story,unit:'unité',revision:8,kind:'STACKABLE',consumable:false},lot={id:'lot',item,quantity:3,status:'AVAILABLE',canTransferByHand:true},d={session:{id:'s'},lots:[lot],sales:[],transfers:[]},before=structuredClone(d),ui=createTransferUi(helpers);
 const html=soInventoryHtml(d,null)+ui.confirm({item,lotId:'lot',quantity:2,before:3,remaining:1,source:{name:'A'},recipient:{name:'B'},confirmation:'proof'},{sessionId:'s',lotId:'lot',quantity:2});
 assert.deepEqual(d,before);const nodes=flat(parse5.parseFragment(html));assert.ok(nodes.some(n=>cls(n,'prose')&&txt(n)===story));assert.ok(nodes.some(n=>attr(n,'data-command')==='proposeLotTransfer'));
 assert.match(html,/3 → 1/);assert.match(html,/seulement après acceptation/);assert.doesNotMatch(html,/<script>/);
});
test('HRP : légende lisible et aide courte distincte des récits',()=>{
 const intro=playerGuidanceHtml({page:'ship'});assert.match(intro,/class="hrp player-help"/);assert.doesNotMatch(intro,/data-action|data-command|<button/);assert.equal(playerGuidanceHtml({page:'unknown'}),'');assert.match(gameTermsHtml(),/points d’action.*points de vie.*crédits.*scanner/);
});
