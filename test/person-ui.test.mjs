import test from 'node:test';
import assert from 'node:assert/strict';
import {personTargetHtml,personMineHtml,personAdminHtml} from '../web/person-actions.mjs';
const base={session:{id:'s',stage:'EN_JEU'},character:{id:'me',name:'Moi'},skills:[],aidOffers:[],encounter:{taken:false},captureMs:0,convalescenceMs:0};
const action={id:'a',kind:'CLINIC_FAST',status:'CONTINUING',name:'<script>test</script>',actorName:'Soignant',targetName:'Patient',instructions:'<img src=x>',remainingMs:120000,cost:1,paid:true,role:'ACTOR',result:{roll:1,level:2,bonus:0,aid:0,total:3,threshold:6,success:false}};
test('interactions interface : complément visible, coût déjà payé, présence requise et aucune relance',()=>{
 const h=personMineHtml({...base,actions:[action]});assert.match(h,/Terminer sans nouveau coût/);assert.match(h,/aucun remboursement/);assert.match(h,/type="checkbox" required/);assert.ok(h.includes('&lt;script&gt;'));assert.ok(!h.includes('<script>'));assert.match(h,/data-person-resolve disabled/);
 const patient=personMineHtml({...base,actions:[{...action,role:'TARGET'}]});assert.ok(!patient.includes('data-person-form="finish"'));
});
test('interactions interface : seule la victime confirme la remise et les autres ne choisissent pas',()=>{
 const a={...action,kind:'LOOT_COMMON',status:'AWAITING_HANDOVER',role:'TARGET',result:null,canHandover:true,lootName:'<b>Objet</b>'},h=personMineHtml({...base,actions:[a]});assert.match(h,/data-person-form="handover"/);assert.ok(h.includes('&lt;b&gt;Objet'));assert.ok(!h.includes('data-person-form="choose"'));
 const other=personMineHtml({...base,actions:[{...a,role:'ACTOR',canHandover:false}]});assert.ok(!other.includes('data-person-form="handover"'));
});
test('interactions interface : pause, aide réservée aux tests et configuration scellée',()=>{
 const d={session:{id:'s',stage:'PAUSE'},target:{name:'Cible'},lots:[],aidOffers:[{id:'aid',helperName:'Aide',skillId:'med'}],profiles:[{id:'p',name:'Soin',test:'AUTO',kind:'FIELD_CARE',supplies:[],bonusItems:[],skillId:'med'}]};const h=personTargetHtml(d);assert.match(h,/disabled>Vérifier/);assert.ok(!h.includes('name="aidOfferId"'));d.profiles[0].test='D6';assert.match(personTargetHtml(d),/name="aidOfferId"/);
 const admin=personAdminHtml({scope:'session',parent:{id:'s',sealed:true},personProfiles:[],actions:[],inventory:[]});assert.ok(!admin.includes('data-person-action="new"'));assert.ok(!admin.includes('data-person-action="pillable"'));
});
