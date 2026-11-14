import test from 'node:test';
import assert from 'node:assert/strict';
import {doseTarget,toxicologyHtml,toxicDoseHtml} from '../web/toxicology.mjs';
import {actionMenuItems,previewSelectedAction} from '../web/player-action-menu.mjs';
import {personTargetHtml} from '../web/person-actions.mjs';
import {centralRecipePayload} from '../web/central-recipes.mjs';
test('Dose : QR et code brut, refus d’une autre session ou origine',()=>{
 assert.equal(doseTarget('dose1','https://gn.test','s1'),'dose1');assert.equal(doseTarget('https://gn.test/#/dose/s1/dose1','https://gn.test','s1'),'dose1');for(const url of ['https://evil.test/#/dose/s1/dose1','https://gn.test/#/dose/s2/dose1','https://gn.test/#/person/s1/dose1'])assert.throws(()=>doseTarget(url,'https://gn.test','s1'));
});
test('Dose : choix volontaire explicite, champs échappés et aucun déclenchement sur scan',()=>{
 const html=toxicDoseHtml({id:'x',name:'<script>',available:true,instructions:'Jeu fictif'},'s1');assert.match(html,/name="voluntary" type="checkbox" required/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/checked/);assert.doesNotMatch(toxicDoseHtml({id:'x',name:'x',available:false},'s1'),/data-command="activate/);
 const bag=toxicologyHtml({sessionId:'s1',doses:[{id:'dose1',name:'x',status:'PLACED',kind:'MALAISE'}]});assert.match(bag,/toxicDoseQr/);assert.match(bag,/name="code"/);
});
test('TOXI : cartes personnalisées, laboratoire avant confirmation et maintien de la cible',()=>{
 const own={session:{id:'s',stage:'EN_JEU',spaceOutlaws:{actionsVersion:1,toxicologyVersion:1}},character:{id:'c',abilities:{skills:[{id:'TOXI-01',level:2}]}},health:{hp:3}};
 const cards=actionMenuItems(own);assert.ok(cards.some(x=>x.id==='TOXI-01-craft'&&x.self));assert.ok(cards.some(x=>x.id==='TOXI-01-treat'&&x.kind==='TOXI_TREAT'));own.health.toxicology={status:'ACTIVE'};assert.ok(actionMenuItems(own).filter(x=>x.skill==='TOXI-01').every(x=>x.blocked));
 const html=personTargetHtml({session:{id:'s',stage:'EN_JEU'},target:{id:'c',name:'Moi'},profiles:[{id:'p',name:'Recette',kind:'TOXI_CRAFT',laboratoryId:'lab',supplies:[],instructions:'5 min'}],lots:[],aidOffers:[]});assert.match(html,/name="laboratoryId"[^>]*required data-qr/);
 let submitted=false;previewSelectedAction({querySelector:()=>({querySelector:()=>({}),requestSubmit:()=>{submitted=true;}})});assert.equal(submitted,false);
});
test('M4 : compatibilité antidote explicitement préparée',()=>{
 const v={name:'Antidote',kind:'ANTIDOTE',minLevel:'1',productItemId:'dose',skillId:'TOXI-01',effectId:'STAT-MALAISE-01',laboratoryTargetId:'lab',unlockKnowledgeId:'recipe',indicativePrice:'',compatibleRecipeIds:'p1, p2'};assert.deepEqual(centralRecipePayload(v,[]).compatibleRecipeIds,['p1','p2']);
});
