import test from 'node:test';
import assert from 'node:assert/strict';
import {spaceCombatsHtml,spaceFormInput,spaceEncounterErrors} from '../web/space-encounters.mjs';
import {towingCombatHtml} from '../web/space-towing-combat.mjs';

const e={id:'combat',status:'ROUND',ships:[{id:'tug',name:'Cargo <script>',hull:4,shield:2,maneuverability:0,fuel:4}],ownShipId:'tug',canOrder:true,skillLevel:0,remainingSeconds:90,round:1,quietRounds:0,surrenderOffers:[],confirmation:'proof',towing:{canDrop:true,cost:0,wreckId:'SECRET_ID'}};
const render=(patch={},admin=false)=>spaceCombatsHtml({session:{id:'sid'},admin,ships:[],combat:{...e,...patch}});
test('Largage UI : conséquences, présence et commande propre avant premier round ou résolution',()=>{
 for(const patch of [{status:'ENCOUNTER'},{remainingSeconds:90},{remainingSeconds:0}]){const html=render(patch);assert.match(html,/data-command="dropTowedWreck"/);assert.match(html,/name="present" type="checkbox" required/);assert.match(html,/sans PA ni dé/);assert.match(html,/ordre déjà enregistré reste/);assert.match(html,/Impossible de la raccrocher/);assert.doesNotMatch(html,/SECRET_ID|<script>|towingCombatVersion/);}
});
test('Largage UI : autorisation courante seule, lecture équipage, pause et régie sans commande',()=>{
 for(const patch of [{towing:null},{towing:undefined},{ownShipId:null,canOrder:false},{canOrder:false},{towing:{canDrop:false,cost:0}},{towing:{canDrop:true,cost:1}},{status:'CLOSED',reason:'QUIET'}])assert.doesNotMatch(render(patch),/data-command="dropTowedWreck"/);
 assert.doesNotMatch(render({},true),/data-command="dropTowedWreck"/);assert.match(render({towing:{canDrop:false,cost:0}}),/<button disabled>Largage indisponible/);
});
test('Largage UI : résultat volontaire et interruption automatique sans promesse de récupération',()=>{
 for(const [reason,title]of [['TOWING_DROPPED','Épave larguée'],['TOWING_INTERRUPTED_ZERO_HULL','Remorquage interrompu : Coque à zéro']]){const html=render({towing:null,towingReleases:[{shipId:'tug',reason}]});assert.match(html,new RegExp(title));assert.match(html,/conserve son propriétaire, son fret et son état/);assert.match(html,/ne suit plus l’arrivée/);assert.doesNotMatch(html,/data-command="dropTowedWreck"|Réparer|Récupérer|prime/);}
});
test('Largage UI : historique régie échappé et motif inconnu non interprété',()=>{
 const html=render({status:'CLOSED',reason:'QUIET',towing:null,towingReleases:[{shipId:'tug',reason:'TOWING_INTERRUPTED_ZERO_HULL'}]},true);assert.match(html,/Cargo &lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.equal(towingCombatHtml({...e,towing:null,towingReleases:[{shipId:'tug',reason:'UNKNOWN'}]},{}),'');
});
test('Largage UI : payload strict, attestation réelle, aucun PA ou dé transmis',()=>{
 const html=render(),raw=html.match(/data-command="dropTowedWreck" data-payload="([^"]+)"/)[1].replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&'),base=JSON.parse(raw);assert.deepEqual(base,{sessionId:'sid',combatId:'combat',shipId:'tug',confirmation:'proof'});
 for(const checked of [false,true]){const form={dataset:{form:'spaceCommand',payload:raw},elements:{namedItem:n=>n==='present'?{checked}:null}};assert.deepEqual(spaceFormInput(form,{die:6,points:undefined,actionPoints:0}),{...base,present:checked});}
 assert.ok(spaceEncounterErrors.TOWING_COMBAT_NOT_OPEN);assert.ok(spaceEncounterErrors.TOWING_RESERVATION);
});
