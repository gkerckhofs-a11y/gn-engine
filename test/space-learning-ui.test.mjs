import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {learningHtml,learningPreviewHtml} from '../web/space-outlaws-learning.mjs';
import {playerRoute,playerShell} from '../web/player-spaces.mjs';
import {learningFixture} from './support/space-learning-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
test('Interface apprentissage : choix disponible, coût puis confirmation et plafond consommé',async()=>{
 const f=await learningFixture(()=>new MemoryStore());await f.edit(`characters/${f.cid}`,c=>({...c,public:{...c.public,displayName:'<script>test</script>'}}));
 let html=learningHtml(await f.read('mySoLearning'));assert.match(html,/data-form="soLearningPreview"/);assert.match(html,/3 XP disponibles/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|FOR-01|PNJ_FORCE/);
 html=learningPreviewHtml(await f.preview('TRA-01'));assert.match(html,/2 XP dépensés : 3 → 1/);assert.match(html,/data-form="soLearningConfirm"/);assert.match(html,/type="checkbox" required/);await f.learn('TRA-01');html=learningHtml(await f.read('mySoLearning'));assert.match(html,/déjà utilisé/);assert.doesNotMatch(html,/data-form="soLearningPreview"/);
 const route=playerRoute('learning',f.e.sid);assert.equal(route.space,'character');assert.match(playerShell(await f.read('mySession'),route,html),/Compétences<\/a>/);
});
test('Interface apprentissage : autorisation MJ et reconversion explicite sans dépense immédiate',async()=>{
 const f=await learningFixture(()=>new MemoryStore());let html=learningHtml(await f.read('soLearningAdmin',{},f.f.owner),true);assert.match(html,/data-form="soLearningAuthorize"/);assert.match(html,/ne dépense aucun XP/);assert.match(html,/name="reason"/);assert.doesNotMatch(html,/FOR-01|PNJ_FORCE/);await f.authorize('TRA-01','MED-02');html=learningHtml(await f.read('mySoLearning'));assert.match(html,/Reconversion approuvée/);assert.match(html,/name="replaceId" value="MED-02"/);
 const app=await readFile(new URL('../web/app.mjs',import.meta.url),'utf8');for(const action of ['mySoLearning','soLearningAdmin','prepareSoLearning','learnSoSkill','authorizeSoLearning'])assert.ok(app.includes(action));assert.match(app,/learning\/\$\{d.session.id\}/);
});
