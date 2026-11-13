import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stealthAttemptsHtml} from '../web/space-stealth.mjs';
import {actionMenuItems,actionBlocked} from '../web/player-action-menu.mjs';
test('Neutralisation : déclaration après scène sans cible, accessible blessé et en pause',()=>{
 const own={session:{id:'s',stage:'PAUSE',spaceOutlaws:{actionsVersion:1,healthVersion:1}},character:{abilities:{skills:[{id:'ROG-01',level:1}]}},health:{hp:0},actionPoints:{available:0}};
 const item=actionMenuItems(own).find(i=>i.id==='ROG-01');assert.ok(item);assert.equal(item.blocked,null);assert.equal(item.cost,0);
 assert.match(actionBlocked(item,{...own,health:{safetyStopped:true}}),/STOP/);
 assert.ok(!actionMenuItems({...own,character:{abilities:{skills:[]}}}).some(i=>i.id==='ROG-01'));
 const d={session:own.session,revision:2,waitMs:50000,events:[],stopped:false},html=stealthAttemptsHtml(d);
 assert.match(html,/50 secondes de jeu/);assert.match(html,/Aucune nouvelle tentative autorisée/);
 assert.match(html,/data-form="stealthAttempt"/);assert.match(html,/hors pauses/);assert.doesNotMatch(html,/name="(?:targetId|code|badgeUrl)"/);
 assert.match(html,/déjà annoncée/);assert.match(html,/0 PA, aucun dé/);
 assert.doesNotMatch(stealthAttemptsHtml({...d,stopped:true}),/data-form="stealthAttempt"/);
 const app=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');assert.match(app,/api\('myStealthAttempts'/);assert.match(app,/mutate\('recordStealthAttempt'/);
});
