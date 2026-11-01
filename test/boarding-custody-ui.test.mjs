import test from 'node:test';
import assert from 'node:assert/strict';
import {boardingCustodyHtml} from '../web/boarding-custody.mjs';
import {createCargoUi} from '../web/cargo.mjs';
import {episodeContinuity} from '../web/space-outlaws-episodes.mjs';
import {boardingCargoFixture} from './support/space-boarding-cargo-suite.mjs';
import {episodeHarness} from './support/space-episodes-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
test('UI suivi des gardes : même état dans régie et bilan, liens natifs sans commande de restitution',async()=>{
 const f=await boardingCargoFixture(()=>new MemoryStore()),t=await f.start();f.advance(180000);await f.finish(t);const d=await f.read('cargoAdmin',{},f.owner),ui=createCargoUi({button:(label)=>`<button>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`}),admin=ui.admin(d),e=await episodeHarness(f);await e.stage('PAUSE');const q=await e.read('prepareCampaignClosure',e.closeInput()),report=boardingCustodyHtml(q.summary.continuity.boardingCustody),balance=episodeContinuity(q.summary.continuity);assert.match(admin,/Fret encore sous garde après abordage/);assert.match(balance,/Fret encore sous garde après abordage/);assert.match(report,new RegExp(`boarding-admin/${f.sid}/${f.combatId()}`));assert.match(report,/Propriétaire :/);assert.match(report,/Gardien enregistré :/);assert.match(report,/2 unités de volume/);assert.doesNotMatch(report,/data-form=|data-command=|confirmation|ownerId|startBoardingCargoTransfer|receiveBoardingCargo/);assert.equal(boardingCustodyHtml(undefined),'');
});
test('UI suivi des gardes : textes et liens échappés, alertes sans héritage ni autorisation automatique',()=>{
 const bad='<script>alert(1)</script>',r={sessionId:'s" onclick="bad()',totalVolume:2,loading:1,lots:[{lotId:bad,name:bad,quantity:2,unit:bad,volume:2,status:'CARGO_RESERVED',owner:{name:bad},holder:{name:bad},ship:{name:bad},port:{name:bad},combatId:'c" onclick="bad()',boardingId:'b',loading:{remainingSeconds:150},alerts:['OWNER_DEAD','OWNER_ACCESS_CHANGED','OWNER_NOT_LOCAL']}]},h=boardingCustodyHtml(r);assert.match(h,/&lt;script&gt;/);assert.doesNotMatch(h,/<script>|onclick="bad|data-command=|data-form=/);assert.match(h,/aucun héritage automatique/);assert.match(h,/150 secondes de jeu/);assert.match(h,/ni restitution automatique/);r.lots[0].alerts.push('DOSSIER_UNAVAILABLE');assert.doesNotMatch(boardingCustodyHtml(r),/href=/);
});
