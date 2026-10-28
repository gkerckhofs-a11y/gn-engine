import test from 'node:test';
import assert from 'node:assert/strict';
import {createHealthUi,survivalAdminHtml} from '../web/health.mjs';
import {personMineHtml,personTargetHtml} from '../web/person-actions.mjs';
import {actionIntroHtml} from '../web/player-spaces.mjs';
const ui=createHealthUi({button:(l,a,x='')=>`<button data-action="${a}" ${x}>${l}</button>`,link:(l,p)=>`<a href="#/${p}">${l}</a>`});
test('Santé SO UI : dégâts explicites, temps déjà écoulé et sécurité privée',()=>{
 const form=ui.damageForm('s',true);assert.match(form,/fenêtre de 2 s/);assert.match(form,/name="secondsSinceDown"/);assert.match(form,/name="counted"/);
 const h={hp:0,maxHp:3,outOfCombat:true,stage:'PAUSE',spaceOutlaws:true,status:'URGENT',remainingMs:40000,protection:0,allowed:{}};
 const html=ui.quick(h,'s');assert.match(html,/40 s de survie/);assert.match(html,/soSafetyStop/);assert.doesNotMatch(html,/permet le retour en jeu/);
 const confirm=ui.confirm('applyDamage',{characterName:'A <script>',before:h,after:h,amount:3,confirmation:'c',reportedAt:123},{sessionId:'s'});assert.match(confirm,/reportedAt/);assert.doesNotMatch(confirm,/<script>/);
});
test('Santé SO UI : secours dans la pause, durée réelle et liens joueur',()=>{
 const d={session:{id:'s',stage:'PAUSE',spaceOutlaws:true,healthReady:true},character:{id:'c',name:'A'},skills:[],aidOffers:[],actions:[{id:'a',kind:'STABILIZE',name:'Secours',status:'ACTIVE',role:'ACTOR',actorName:'A',targetName:'B',remainingMs:0,urgent:true,stabilizationMs:0,cost:0,paid:false}],convalescenceMs:0};
 const html=personMineHtml(d,{embedded:true});assert.match(html,/Secours, soins et aide/);assert.match(html,/data-running="true" data-real="true"/);assert.doesNotMatch(html,/data-person-resolve disabled/);
 assert.match(actionIntroHtml('s','c',true,true),/value="person"/);assert.match(actionIntroHtml('s','c',true,true),/Soins sur moi/);assert.doesNotMatch(actionIntroHtml('s','c',true,false),/Soins sur moi/);
 const target=personTargetHtml({session:d.session,urgent:true,target:{name:'B <script>'},profiles:[{id:'p',name:'Secours',test:'AUTO',supplies:[],instructions:'60 s'}],lots:[],aidOffers:[]});assert.doesNotMatch(target,/disabled|<script>/);
});
test('Santé SO UI : régie affiche urgences, blocage pendant soin et reprise MJ',()=>{
 const html=survivalAdminHtml({session:{id:'s',stage:'PAUSE',revision:5,safetyStopped:true},characters:[{id:'c',name:'A <script>',hp:0,maxHp:3,status:'EXPIRED',healthRevision:3,busy:true}]});assert.match(html,/soSafetyResume/);assert.match(html,/soDeath[^>]*disabled/);assert.doesNotMatch(html,/<script>/);
});
