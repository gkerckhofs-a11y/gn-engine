import test from 'node:test';
import assert from 'node:assert/strict';
import {moduleDraft,moduleEditorHtml,moduleListHtml,moduleRefreshDraft,moduleFormSheets,moduleMasterSheets} from '../web/master-editor.mjs';
import {terrainRewardAction} from '../web/master-terrain-editor.mjs';
import {terrainValues} from './support/master-terrain-editors-suite.mjs';
const workspace=()=>({module:'informations',sheet:'Lieux',session:false,editable:true,errors:[],meta:[{module:'informations'}],newRow:{id:'server-id',operation:'CREER',version:'1'},rows:[],references:{skills:[{id:'s',name:'Savoir <fictif>'}],items:[{id:'kit',name:'Kit'}],knowledge:[],installations:[],fieldConsumables:[]}});
test('Terrain en ligne : trois feuilles groupées, champs conditionnels et barèmes explicites',()=>{
 const w=workspace(),d=moduleDraft(w);let html=moduleEditorHtml(w,d);assert.ok(moduleListHtml(w).includes('Lieux + ActionsTerrain + Recompenses'));assert.ok(html.includes('action_SEARCH__duree_secondes'));assert.ok(!html.includes('action_SABOTAGE__duree_secondes'));
 for(const field of ['action_SEARCH__duree_secondes','reward_reward-server-id-0__quantite','reward_reward-server-id-0__stock_initial'])assert.match(html,new RegExp(`name="${field}"[^>]*value=""`));
 let next=moduleRefreshDraft(w,d,{titre:'Lieu <fictif>',reason:'Préparation',action_SEARCH__test:'D6',action_SEARCH__competence_id:'s'});html=moduleEditorHtml(w,next);assert.ok(html.includes('name="action_SEARCH__seuil"'));assert.ok(html.includes('name="action_SEARCH__niveau_minimum"'));assert.ok(html.includes('Savoir &lt;fictif&gt;'));assert.ok(html.includes('Lieu &lt;fictif&gt;'));
 next=moduleRefreshDraft(w,next,{type:'INSTALLATION',action_SEARCH__seuil:'7'});html=moduleEditorHtml(w,next);assert.ok(html.includes('action_SABOTAGE__duree_secondes'));assert.ok(html.includes('action_REPAIR__duree_secondes'));assert.ok(!html.includes('terrainAddReward'));assert.ok(html.includes('Préparation'));assert.match(html,/name="verrou_echec_secondes"[^>]*value=""/);
 assert.equal(moduleRefreshDraft(w,next,{type:'SEARCH'}).actions.SEARCH.seuil,'7');assert.ok(!moduleEditorHtml(w,next,true).includes('data-master-form='));
});
test('Terrain en ligne : récompenses ajoutées, retirées et restaurées gardent la saisie et des identités uniques',()=>{
 const w=workspace();let d=moduleDraft(w);const first=d.rewards[0].row.id;
 d=terrainRewardAction(w,d,'terrainAddReward','',{titre:'Essai',reason:'Motif',action_SEARCH__duree_secondes:'0',[`reward_${first}__quantite`]:'2'});assert.equal(d.row.titre,'Essai');assert.equal(d.reason,'Motif');assert.equal(d.rewards[0].row.quantite,'2');assert.equal(new Set(d.rewards.map(r=>r.row.id)).size,2);
 d=terrainRewardAction(w,d,'terrainRemoveReward',first,{});assert.ok(moduleEditorHtml(w,d).includes('Retrait prévu à la confirmation'));d=terrainRewardAction(w,d,'terrainRestoreReward',first,{});assert.equal(d.rewards[0].row.quantite,'2');
 for(let i=d.rewards.length;i<20;i++)d=terrainRewardAction(w,d,'terrainAddReward','',{});assert.throws(()=>terrainRewardAction(w,d,'terrainAddReward','',{}),/Maximum 20/);
 // Existing reward ids can include previously deleted positions: new rows use the fresh server seed.
 const old={row:{id:'old-place',version:'2',type:'SEARCH',titre:'Lieu',publication:'DRAFT'},actions:[{id:'old-action',type:'SEARCH',version:'2',test:'AUTO',duree_secondes:'0'}],rewards:[{id:'reward-old-place-1',version:'2',lieu_id:'old-place',type:'ITEM',objet_id:'kit',quantite:'1',stock_initial:'1',limite_personnage:'1'}]};w.rows=[old];d=terrainRewardAction(w,moduleDraft(w,'old-place'),'terrainAddReward','',{});assert.notEqual(d.rewards[1].row.id,old.rewards[0].id);assert.match(d.rewards[1].row.id,/server-id/);
});
test('Terrain en ligne : session verrouille type et récompenses, export conserve les trois feuilles et diagnostic bloque',()=>{
 const w=workspace();w.session=true;w.rows=[{row:{id:'cache',version:'2',type:'SEARCH',titre:'Cache',publication:'DRAFT'},actions:[{id:'action',version:'4',type:'SEARCH',test:'AUTO',duree_secondes:'1'}],rewards:[{id:'reward',version:'3',lieu_id:'cache',type:'ITEM',objet_id:'kit',quantite:'1',stock_initial:'4',limite_personnage:'1'}],title:'Cache',ownerLabel:'Fouille',state:'draft'}];const d=moduleDraft(w,'cache'),html=moduleEditorHtml(w,d);
 assert.match(html,/name="type" disabled/);assert.match(html,/name="reward_reward__stock_initial" disabled/);assert.ok(!html.includes('terrainAddReward'));assert.ok(!html.includes('terrainRemoveReward'));assert.throws(()=>terrainRewardAction(w,d,'terrainAddReward','',{}),/ne peuvent pas/);
 const sheets=moduleFormSheets(w,d,{...terrainValues(d),type:'INSTALLATION',reward_reward__stock_initial:'100'});assert.equal(sheets.Lieux[0].type,'SEARCH');assert.deepEqual(sheets.Recompenses,[]);assert.deepEqual(Object.keys(moduleMasterSheets(w)),['Meta','Lieux','ActionsTerrain','Recompenses']);
 w.errors=['Identifiant <ambigu>'];assert.ok(moduleListHtml(w).includes('Identifiant &lt;ambigu&gt;'));assert.ok(!moduleListHtml(w).includes('data-master-action="moduleExport"'));assert.throws(()=>moduleMasterSheets(w),/ambigu/);
});
