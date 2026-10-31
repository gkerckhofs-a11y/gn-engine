import test from 'node:test';
import assert from 'node:assert/strict';
import {boardingHtml,boardingConfirmHtml,boardingFormInput} from '../web/space-boarding.mjs';
import {spaceCombatsHtml} from '../web/space-encounters.mjs';
import {playerRoute} from '../web/player-spaces.mjs';
import {boardingFixture} from './support/space-boarding-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
test('UI abordage : routes privées depuis la rencontre, arrimage préparé et confirmation explicite',async()=>{
 const f=await boardingFixture(()=>new MemoryStore()),d=await f.board(),h=boardingHtml(d);assert.match(h,/prepareSpaceDocking/);assert.match(h,/name="zone"/);assert.match(h,/name="safe"/);assert.match(h,/deux minutes de jeu/);assert.match(spaceCombatsHtml({session:{id:f.sid},combat:await f.detail()}),new RegExp(`boarding/${f.sid}/${f.combatId()}`));assert.equal(playerRoute('boarding',f.sid,f.combatId()).space,'terminal');const q=await f.prepare();assert.match(boardingConfirmHtml('prepareSpaceDocking',q,f.input),/startSpaceDocking/);assert.doesNotMatch(boardingConfirmHtml('prepareSpaceDocking',q,f.input),/triggerSpaceInterception/);
});
test('UI abordage : joueur en lecture, scène MJ, ordres annoncés et contrôle libérable',async()=>{
 const f=await boardingFixture(()=>new MemoryStore());await f.scene();const player=boardingHtml(await f.board(f.player)),admin=boardingHtml(await f.board());assert.doesNotMatch(player,/data-form=|confirmation|resolveSpaceBoarding|name="reason"/);assert.match(player,/Équipages embarqués/);assert.match(admin,/prepareSpaceBoardingOutcome/);assert.match(admin,/ANNOUNCED/);assert.match(admin,/Aucune capture automatique/);await f.outcome();const held=boardingHtml(await f.board());assert.match(held,/releaseSpaceBoarding/);assert.doesNotMatch(held,/cancelSpaceBoarding|prepareSpaceDocking/);assert.match(held,/ne transfère ni la propriété/);
});
test('UI abordage : saisie stricte, cases attestées et contenu annoncé échappé',async()=>{
 const form={dataset:{payload:JSON.stringify({sessionId:'s',combatId:'c'})},querySelector:s=>s.includes('present')||s.includes('safe')?{}:null},p=boardingFormInput(form,{pair:JSON.stringify({attackerShipId:'a',targetShipId:'b'}),zone:'Pont',reason:'Supervision',present:'on',safe:'on',ownerId:'intrus',crew:['intrus']});assert.deepEqual(p,{sessionId:'s',combatId:'c',attackerShipId:'a',targetShipId:'b',zone:'Pont',reason:'Supervision',present:true,safe:true});const h=boardingConfirmHtml('prepareSpaceBoardingOutcome',{outcome:'CONTROLLED',mode:'ANNOUNCED',orders:'<script>vol</script>',confirmation:'preuve'},{sessionId:'s'});assert.match(h,/&lt;script&gt;/);assert.doesNotMatch(h,/<script>/);assert.match(h,/resolveSpaceBoarding/);
});
