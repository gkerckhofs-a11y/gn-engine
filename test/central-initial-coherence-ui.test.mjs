import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralCheckUi} from '../web/central-check.mjs';
import {initialCoherenceFixture} from './support/central-initial-coherence-suite.mjs';
import {centralCheckFixture} from './support/central-check-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
const link=(label,path,cls)=>`<a class="${cls}" href="#/${path}">${label}</a>`;
const ui=createCentralCheckUi({link});
test('C2f UI : huit classes, fiches concernées, liens M1/M2 et limite explicite',async()=>{
 const f=await initialCoherenceFixture(()=>new MemoryStore()),html=ui.page(await f.check(2));
 assert.match(html,/Classes et kits/);assert.match(html,/1 fiche\(s\) avec plan initial dans 1 classe/);assert.match(html,/Kit absent/);assert.match(html,/Médecin/);assert.match(html,/Infiltrateur/);assert.match(html,/pas les participants/);assert.match(html,/ne certifient pas les effets/);
 assert.ok(html.includes(`central/${f.cid}/M1`));assert.ok(html.includes(`central/${f.cid}/M2`));assert.match(html,/scope="col"/);assert.match(html,/class="table-scroll"/);assert.doesNotMatch(html,/<form|data-action="publish|Secret de fiction/);
});
test('C2f UI : références contrôlées ne signifient pas naissance ni publication',async()=>{
 const f=await initialCoherenceFixture(()=>new MemoryStore(),true),html=ui.page(await f.check(7));
 assert.match(html,/Références du kit contrôlées/);assert.match(html,/n’attribuent aucune dotation/);assert.match(html,/l’initiation secondaire n’en ajoute pas/);assert.match(html,/ne certifie pas encore toute la campagne/);assert.doesNotMatch(html,/Prêt à jouer|Kit validé|Publier maintenant/);
});
test('C2f UI : champs du résumé échappés et anciens rapports compatibles',async()=>{
 const f=await centralCheckFixture(()=>new MemoryStore()),r=await f.check();r.initialPreparation.classes[0].className='<img onerror=bad>';r.initialPreparation.classes[0].characterIds=['<script>bad</script>'];
 const html=ui.page(r);assert.doesNotMatch(html,/<img|<script/);assert.match(html,/&lt;img/);assert.match(html,/&lt;script/);assert.match(html,/aucune fiche ne le requiert/);
 delete r.initialPreparation;assert.doesNotThrow(()=>ui.page(r));
});
