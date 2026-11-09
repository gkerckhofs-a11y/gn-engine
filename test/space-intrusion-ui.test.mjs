import test from 'node:test';
import assert from 'node:assert/strict';
import {soIntrusionHtml} from '../web/space-intrusion.mjs';
import {centralFieldTargetPayload} from '../web/central-field-targets.mjs';
const input={enabled:true,level:2,session:{id:'sid',stage:'EN_JEU'},target:{id:'lock',title:'<script>',description:'Décor',
 category:'LOCK',minLevel:1,threshold:6,busy:false},active:null,cooldownMs:0,previous:[]};
test('INF-01 : HTML échappé, texte secret jamais projeté par formulaire',()=>{
 const html=soIntrusionHtml(input,'sid');
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
 assert.match(html,/soIntrusionStart/);assert.doesNotMatch(html,/SECRET_MJ/);
});
test('INF-01 : configuration M6 exclut toute permission système et matériel',()=>{
 const d=centralFieldTargetPayload({kind:'INTRUSION',title:'Serrure',description:'Déco',gmNotes:'',
 intrusionCategory:'LOCK',intrusionLevel:'2',intrusionThreshold:'6',intrusionSuccess:'Indice',
 intrusionFailure:'Échec'},[]);
 assert.equal(d.kind,'INTRUSION');assert.deepEqual(d.profiles,{});
 assert.equal(d.intrusion.threshold,6);assert.deepEqual(d.rewards,[]);
});
test('INF-01 : mini-jeu montre la consigne mais jamais le code attendu',()=>{
 const d={...input,target:{...input.target,threshold:null,
  challenge:{type:'CODE',prompt:'Retrouve les symboles gravés.',durationSeconds:90}},
  active:{id:'act',targetId:'lock',mode:'CODE',remainingMs:0,status:'RUNNING'}};
 const html=soIntrusionHtml(d,'sid');
 assert.match(html,/name="answer"/);
 assert.match(html,/Retrouve les symboles gravés/);
 assert.match(html,/sans lancer de dé/);
 assert.doesNotMatch(html,/Lancer le D6/);
 assert.doesNotMatch(html,/NOVA 2042|answerDigest/);
});
test('INF-01 : cible occupée ne propose pas un second départ',()=>{
 const html=soIntrusionHtml({...input,target:{...input.target,busy:true}},'sid');
 assert.match(html,/disabled/);
});
