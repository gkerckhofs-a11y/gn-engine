import test from 'node:test';
import assert from 'node:assert/strict';
import {successionHtml,successionPreviewHtml} from '../web/space-outlaws-succession.mjs';
import {successionFixture,successorProposal} from './support/space-succession-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
test('Interface succession : formulaire canonique, proposition privée et validation MJ',async()=>{
 const f=await successionFixture(()=>new MemoryStore());await f.open();let d=await f.readSuccession('mySpaceOutlawsSuccession',{},f.player),html=successionHtml(d);assert.match(html,/data-form="soSuccessorProposal"/);assert.match(html,/name="secondaryId"/);assert.doesNotMatch(html,/FOR-01|PNJ_FORCE|Dana Réserve|gmNotes/);await f.submit({...successorProposal,background:'<script>alert(1)</script>'});
 html=successionHtml(await f.readSuccession('spaceOutlawsSuccession'),true);assert.match(html,/Proposition du joueur/);assert.match(html,/Dana Réserve/);assert.match(html,/Demander une correction/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 const p=f.input({source:'PROPOSAL',reserveId:undefined}),q=await f.previewSuccession(p);html=successionPreviewHtml(q);assert.match(html,/0 XP hérités \+ 0 XP en attente = 0 XP/);assert.match(html,/5 PA neufs/);assert.match(html,/data-form="soSuccessionConfirm"/);assert.doesNotMatch(html,/<script>/);
 await f.succeed(q,p);html=successionHtml(await f.readSuccession('mySpaceOutlawsSuccession',{},f.player));assert.match(html,/personnage est actif/);assert.doesNotMatch(html,/soSuccessorProposal/);
});
test('Interface succession : accès suspendu sans bouton de naissance',async()=>{
 const f=await successionFixture(()=>new MemoryStore());await f.cmdSuccession('revokeAccess',{uid:f.player.uid});const html=successionHtml(await f.readSuccession('spaceOutlawsSuccession'),true);assert.match(html,/accès suspendu/);assert.doesNotMatch(html,/data-form="soSuccessionPreview"|data-form="soSuccessionOpen"/);
});
