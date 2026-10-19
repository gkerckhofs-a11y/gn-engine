import test from 'node:test';
import assert from 'node:assert/strict';
import {createAbilityUi,abilityPlayerSection} from '../web/abilities.mjs';
import {createKnowledgeUi} from '../web/knowledge.mjs';
import {escapeHtml as esc} from '../web/groups.mjs';
const helpers={button:(l,a,x='')=>`<button data-action="${a}" ${x}>${l}</button>`,pill:esc,input:()=>'',textarea:()=>''};
const ui=createAbilityUi(helpers),evil='<img src=x onerror="bad()">';
const skill={id:'expertise',name:evil,description:evil,instructions:evil,category:evil,level:2,publicationState:'PUBLISHED',kind:'PASSIVE',revision:1};
const context={id:'parent',revision:3,skills:[skill],classes:[{id:'class',name:'Classe',description:'Texte',skills:[{skillId:skill.id,level:2}],revision:1,publicationState:'PUBLISHED'}]};
test('interface compétences : texte échappé, profil vide masqué et aucune action active inventée',()=>{
  assert.equal(abilityPlayerSection(null),'');assert.equal(abilityPlayerSection({className:'',skills:[]}), '');
  const html=abilityPlayerSection({className:evil,classDescription:evil,skills:[skill]});assert.doesNotMatch(html,/<img|<button/);assert.match(html,/&lt;img/);assert.match(html,/Niveau 2/);
  assert.doesNotMatch(ui.editor(context,'scenario','skills',skill),/<img/);
  assert.match(ui.editor(context,'session','skills',skill),/Aucun lancer de dés ni effet différé/);
});
test('interface compétences : copie brouillon, exceptions à zéro et confirmation explicite avant remplacement',()=>{
  const copy=ui.editor(context,'scenario','classes',context.classes[0],true);assert.match(copy,/data-id=""/);assert.match(copy,/<option value="DRAFT" selected>/);
  const c={id:'character',public:{displayName:'Joueur'},abilityProfile:{published:true,class:{name:'Classe'},skills:[skill],choices:{classId:'class',overrides:[{skillId:skill.id,level:0}]}}};
  const editor=ui.assignment(context,'session',c);assert.match(editor,/min="0"/);assert.match(editor,/data-ability-level[^>]*value="0"/);assert.match(editor,/Voir les changements avant confirmation/);
  const html=ui.confirm({characterName:evil,before:c.abilityProfile,after:c.abilityProfile,confirmation:'proof'},{reason:evil});assert.doesNotMatch(html,/<img/);assert.match(html,/Confirmer ce profil pour ce personnage/);assert.match(html,/data-form="abilityConfirm"/);
});
test('interface découverte : expertise et seuil explicites, sans restriction rétroactive sur les textes acquis',()=>{
  const knowledge=createKnowledgeUi(helpers);const html=knowledge.editor({qrSkillId:'expertise',qrSkillLevel:3},[],'scenario',[skill]);
  assert.match(html,/name="qrSkillId"/);assert.match(html,/value="expertise" selected/);assert.match(html,/name="qrSkillLevel"[^>]*value="3"/);assert.match(html,/ne retire pas un texte déjà acquis/);assert.doesNotMatch(html,/<img/);
});
