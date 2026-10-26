import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldTargetHtml,fieldResultHtml,fieldAdminHtml} from '../web/field-actions.mjs';
import {placeFields,placePayload,placeDiscoveriesHtml} from '../web/place-search.mjs';
import {searchTargetInput} from '../src/core/space-outlaws-search-state.mjs';
import {searchFixture} from './support/space-search-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
test('V36 UI : QR universel, D12 12 lisible, seuil caché, prise confirmée et état après reconnexion',async()=>{
 const f=await searchFixture(()=>new MemoryStore()),d=await f.actionRead('fieldTarget',{targetId:'cache'}),h=fieldTargetHtml(d);assert.match(h,/1D12/);assert.doesNotMatch(h,/D6|Gravure|Datapad|seuil null/);assert.match(h,/data-field-form="prepare"/);
 const a=await f.search(),r=fieldResultHtml(a);assert.match(r,/D12 · 12/);assert.doesNotMatch(r,/undefined|seuil null/);assert.match(r,/data-field-form="take"/);await f.take(a,'cash');const mine=await f.actionRead('myFieldActions'),taken=mine.actions[0].result.discoveries.find(d=>d.id==='cash');assert.equal(taken.status,'TAKEN');assert.doesNotMatch(placeDiscoveriesHtml({...a,result:{discoveries:[taken]}}),/data-field-form="take"/);
 const admin=fieldAdminHtml(await f.actionRead('fieldAdmin',{},f.owner));assert.match(admin,/pris par/);assert.match(admin,/session/);
});
test('V36 UI : édition M6 des quatre types, bornes et bonus sans moteur de formulaire parallèle',()=>{
 const h=placeFields();assert.match(h,/min="1" max="12"/);assert.match(h,/INDICE_A_VOIR/);assert.match(h,/CREDITS_A_TROUVER/);assert.match(h,/placeFindUp/);assert.doesNotMatch(h,/textarea name="bonuses"/);
 const v={title:'Lieu',description:'',gmNotes:'',difficulty:'12',active:'on',maxAttempts:'1',find_f_kind:'INDICE_A_VOIR',find_f_title:'<Indice>',find_f_knowledgeId:'info',find_f_active:'on',find_f_quantity:'1',bonus_0_id:'authorized',bonus_0_kind:'SKILL',bonus_0_sourceId:'TRA-01',bonus_0_minLevel:'2',bonus_0_value:'1',bonus_0_rule:'Texte publié'};
 const d=searchTargetInput({...placePayload(v,['f']),publicationState:'DRAFT'},'lieu');assert.equal(d.search.difficulty,12);assert.equal(d.profiles.SEARCH.skillId,null);assert.equal(d.search.bonuses[0].value,1);assert.match(placeFields(d),/&lt;Indice&gt;/);
});
