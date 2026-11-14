import test from 'node:test';
import assert from 'node:assert/strict';
import {actionMenuItems,actionMenuHtml,actionBlocked,selectedTargetPath,focusActionTarget,actionTargetHtml,previewSelectedAction} from '../web/player-action-menu.mjs';
import {fieldTargetHtml,fieldMineHtml} from '../web/field-actions.mjs';
import {personMineHtml} from '../web/person-actions.mjs';
import {playerRoute} from '../web/player-spaces.mjs';
const flags={actionsVersion:1,healthVersion:1,searchVersion:1,inf01Version:1,inf02Version:1,inf03Version:1,pickpocketVersion:1,escapeVersion:1,navigationVersion:1,routeAnalysisVersion:1,logisticsVersion:1,moduleMandatesVersion:1};
const own=(skills=[],patch={})=>({session:{id:'s',stage:'EN_JEU',spaceOutlaws:flags},character:{id:'c',abilities:{skills:skills.map(([id,level=1])=>({id,level}))}},health:{hp:3,status:'ACTIVE'},actionPoints:{available:5},...patch});
const ids=d=>actionMenuItems(d).map(i=>i.id);
test('actions : sans spécialité, uniquement les trois capacités communes raccordées',()=>{
 assert.deepEqual(ids(own()),['search','discover','stabilize']);assert.deepEqual(ids(own([],{session:{id:'s',spaceOutlaws:{}}})),[]);
 assert.ok(!ids(own([['MED-01'],['COU-01'],['COU-02'],['SABOTAGE']])).some(id=>/MED-01|COU|SABOTAGE/.test(id)));
});
test('actions : acquis MED, MEC et INF sans droits dérivés de la classe',()=>{
 assert.ok(ids(own([['MED-02']])).includes('MED-02'));assert.ok(!ids(own([['MED-02']])).includes('MEC-02'));
 assert.ok(!ids(own([['MEC-02',1]])).includes('maintenance'));assert.ok(ids(own([['MEC-02',2],['MEC-01'],['MEC-03']])).includes('maintenance'));
 const inf=ids(own([['INF-01'],['INF-02'],['INF-03']]));for(const id of ['INF-01','INF-02','INF-03'])assert.ok(inf.includes(id));
 assert.ok(ids(own([['MED-02'],['INF-02'],['PIL-01']])).includes('flight'));
});
test('actions : blocages explicites, urgence commune sans PA et fermeture par manifeste',()=>{
 const d=own([['MED-02']],{actionPoints:{available:0}}),rows=actionMenuItems(d);assert.match(rows.find(i=>i.id==='MED-02').blocked,/PA/);assert.equal(rows.find(i=>i.id==='stabilize').blocked,null);
 for(const [patch,context,re] of [[{health:{status:'DEAD'}},{},/décédé/],[{health:{hp:0}},{},/hors combat/],[{}, {person:{convalescenceMs:1000}},/Convalescence/],[{}, {escape:{captivity:{status:'ACTIVE'}}},/captif/],[{health:{safetyStopped:true}},{},/STOP/],[{session:{id:'s',stage:'PAUSE',spaceOutlaws:flags}},{},/pendant le jeu/]])assert.match(actionBlocked({mode:'field',cost:1},own([],patch),context),re);
 assert.ok(!ids(own([['INF-01']],{session:{id:'s',stage:'EN_JEU',spaceOutlaws:{actionsVersion:1}}})).includes('INF-01'));
});
test('actions : changement personnage, niveau et session recalculés sans cache de droits',()=>{
 assert.ok(ids(own([['INF-02']])).includes('INF-02'));assert.ok(!ids(own()).includes('INF-02'));
 assert.ok(!ids(own([['MEC-02',1]])).includes('maintenance'));assert.ok(ids(own([['MEC-02',2]])).includes('maintenance'));
 assert.equal(playerRoute('act','s','MED-02').space,'action');
});
test('actions : QR et ID conservent le type et la session de l’intention',()=>{
 const item=actionMenuItems(own([['MED-02']])).find(i=>i.id==='MED-02');
 assert.equal(selectedTargetPath('target',item,'https://test.invalid','s'),'target');assert.equal(selectedTargetPath('https://test.invalid/#/badge/s/target',item,'https://test.invalid','s'),'target');
 for(const value of ['https://test.invalid/#/field/s/x','https://test.invalid/#/person/other/x','https://foreign.invalid/#/person/s/x'])assert.throws(()=>selectedTargetPath(value,item,'https://test.invalid','s'));
 assert.match(actionTargetHtml('s',item),/data-intent="MED-02"/);
});
test('actions : après scan, seule l’action choisie autorisée subsiste, sans repli sur une autre',()=>{
 const item={kind:'ANALYZE',skill:'MEC-01'},d={profiles:[{kind:'ANALYZE',skillId:'MEC-01',qualified:true},{kind:'SEARCH',qualified:true},{kind:'ANALYZE',skillId:'COM-03',qualified:true}]};
 assert.equal(focusActionTarget(item,d).profiles.length,1);assert.equal(focusActionTarget(item,{profiles:[{...d.profiles[0],qualified:false}]}).profiles.length,0);assert.equal(focusActionTarget({kind:'FIELD_CARE',skill:'MED-02'},d).profiles.length,0);
});
test('actions : lien direct, cartes tactiles et une actualisation, HTML échappé',()=>{
 const html=actionMenuHtml(own([['INF-02']]),{});assert.match(html,/#\/act\/s\/INF-02/);assert.equal((html.match(/data-action="refresh"/g)??[]).length,1);assert.match(html,/action-menu-grid/);assert.doesNotMatch(actionTargetHtml('s',{title:'<script>',id:'x',mode:'field'}),/<script>/);
});
test('actions : historique et commandes natives conservés sans actualisations multiples',()=>{
 const field=fieldMineHtml({session:{id:'s',stage:'EN_JEU'},actions:[{id:'a',targetTitle:'Balise',status:'ACTIVE',kind:'SEARCH',cost:1,remainingMs:30}]},{embedded:true,refreshButton:false});assert.match(field,/data-field-form="finish"/);assert.match(field,/Balise/);assert.doesNotMatch(field,/data-field-action="refresh"/);
 const person=personMineHtml({session:{id:'s',stage:'EN_JEU',spaceOutlaws:true},skills:[],aidOffers:[],actions:[]},{embedded:true,refreshButton:false});assert.doesNotMatch(person,/data-person-action="refresh"/);
});
test('actions : un aperçu automatique ne soumet jamais une mutation',()=>{
 let submitted=0;const form={querySelectorAll:()=>[],querySelector:selector=>selector==='button.primary'?{disabled:false}:null,requestSubmit:()=>submitted++};
 previewSelectedAction({querySelector:selector=>{assert.match(selector,/prepare/);assert.doesNotMatch(selector,/start|finish/);return form;}});assert.equal(submitted,1);
 previewSelectedAction({querySelector:()=>null});assert.equal(submitted,1);
});
test('actions : aucun profil interdit affiché sur un QR terrain ordinaire',()=>{
 const d={session:{id:'s',stage:'EN_JEU'},target:{id:'t',title:'Lieu'},profiles:[{qualified:false,kind:'ANALYZE',instructions:'INTERDIT'}]};assert.doesNotMatch(fieldTargetHtml(d),/INTERDIT|data-field-form="prepare"/);
});

test('actions : choisir le lieu clinique ou la quantité du lot avant la confirmation automatique',()=>{
 let calls=0;const form={querySelector:()=>null,requestSubmit:()=>calls++,querySelectorAll:()=>[]};
 previewSelectedAction({querySelector:()=>form,querySelectorAll:()=>[{},{}]});assert.equal(calls,0);
 previewSelectedAction({querySelector:()=>({...form,querySelector:selector=>selector.includes('tradeQuantity')?{}:null}),querySelectorAll:()=>[{}]});assert.equal(calls,0);
});

test('actions : liens cliniques identiques après encodage navigateur',()=>{
 const d=own([['MED-02',2],['MED-03',2]]),items=actionMenuItems(d).filter(i=>i.kind?.startsWith('CLINIC'));assert.deepEqual(items.map(i=>i.id),['MED-03-safe','MED-03-fast']);
 for(const i of items)assert.equal(new URL(`https://example.invalid/#/act/s/${i.id}`).hash.split('/').at(-1),i.id);
});
