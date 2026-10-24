import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralUi,centralStaffPayload,centralErrors} from '../web/central-master.mjs';
import {createCentralCheckUi} from '../web/central-check.mjs';
import {centralCheckFixture} from './support/central-check-suite.mjs';
import {reviewGrant} from './support/central-review-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
const link=(label,path)=>`<a href="#/${path}">${label}</a>`;
const button=(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`;
const ui=createCentralUi({button,link});
test('C2b UI : contrôle distinct, explicite et aucune lecture précochée par défaut',async()=>{
 const f=await centralCheckFixture(()=>new MemoryStore()),d=await f.view(),html=ui.staffForm(d);
 assert.match(html,/name="checkCentral"\s*>/);assert.doesNotMatch(html,/name="read_M\d" checked/);assert.match(html,/contenus privés/);assert.match(html,/Aucun atelier n’est coché automatiquement/);
 await f.grant(reviewGrant);const grant=(await f.view()).staff[0];assert.match(ui.staffForm(d,grant),/name="checkCentral" checked/);assert.doesNotMatch(ui.staffForm(d,{...grant,active:false}),/name="checkCentral" checked/);
});
test('C2b UI : charge utile explicite, révocation prioritaire et pas de lectures ajoutées',()=>{
 const r=centralStaffPayload({active:'on',checkCentral:'on',read_M1:'on',reason:'Choix'});assert.equal(r.checkCentral,true);assert.deepEqual(r.readWorkshops,['M1']);assert.deepEqual(r.editWorkshops,[]);
 assert.equal(centralStaffPayload({active:'on'}).checkCentral,false);assert.equal(centralStaffPayload({checkCentral:'on'}).checkCentral,false);
 assert.match(centralErrors.CENTRAL_CHECK_ACCESS_REQUIRED,/sept ateliers/);assert.match(centralErrors.CENTRAL_CHECK_CHOICE_REQUIRED,/explicitement/);
});
test('C2b UI : entrée du contrôleur sans édition ni gestion des délégations',async()=>{
 const f=await centralCheckFixture(()=>new MemoryStore());await f.grant(reviewGrant);const html=ui.page(await f.view('M1',f.mj));
 assert.ok(html.includes(`central-check/${f.cid}/0`));assert.doesNotMatch(html,/data-action="centralStaff"|data-action="centralItem"/);assert.match(ui.page(await f.view()),/contrôle global autorisé/);
 await f.grant({...reviewGrant,checkCentral:false,revision:1});assert.doesNotMatch(ui.page(await f.view('M1',f.mj)),/central-check/);
});
test('C2b UI : rapport identifie les droits utilisés sans action de publication',async()=>{
 const f=await centralCheckFixture(()=>new MemoryStore());await f.grant(reviewGrant);const html=createCentralCheckUi({link}).page(await f.check(0,f.mj));
 assert.match(html,/Contrôle délégué · droits révision 1/);assert.match(html,/ne constitue pas une autorisation réutilisable/);assert.doesNotMatch(html,/<form|data-action="publish/);
});
