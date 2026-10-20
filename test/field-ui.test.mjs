import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldTargetHtml,fieldResultHtml,fieldAdminHtml} from '../web/field-actions.mjs';
test('terrain interface : contenu échappé, choix du matériel, action bloquée en pause',()=>{
 const html=fieldTargetHtml({session:{id:'session',stage:'PAUSE'},target:{id:'lieu',title:'<script>secret</script>',description:'<b>Lieu</b>',kind:'SEARCH'},profiles:[{kind:'SEARCH',instructions:'<img src=x>',level:2,qualified:true,waitMs:0,durationSeconds:60,cost:1,test:'D6',threshold:5,bonusLots:[{id:'outil',name:'Matériel',bonus:2}],consumable:null}]});
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.match(html,/name="bonusLotId"/);assert.match(html,/disabled>Préparer cette action/);
});
test('terrain interface : résultat enregistré détaille le calcul sans proposer de nouveau jet',()=>{
 const html=fieldResultHtml({status:'SUCCEEDED',kind:'SEARCH',result:{success:true,roll:4,level:2,bonus:2,total:8,threshold:7,text:'<secret>',reward:{name:'Crédits',quantity:10}}});assert.match(html,/4 \+ compétence 2 \+ matériel 2 \+ aide 0 = <b>8/);assert.ok(html.includes('&lt;secret&gt;'));assert.ok(!html.includes('<button'));
 const admin=fieldAdminHtml({scope:'session',parent:{id:'s',title:'Test',sealed:true},fieldTargets:[],states:[],actions:[],skills:[],items:[],knowledge:[]});assert.ok(!admin.includes('data-field-action="new"'));
});
