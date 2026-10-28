import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreparationUi,preparationDraftId,finishPreparationDraft} from '../web/preparations.mjs';
import {createCampaignUi} from '../web/campaigns.mjs';
const helpers={button:(label,action)=>`<button data-action="${action}">${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`},ui=createPreparationUi(helpers);
test('Préparation UI : édition selon le rôle, textes échappés, aucune ouverture de jeu ou import',()=>{
 const s={id:'s',title:'<script>alert(1)</script>',summary:'<img onerror=x>',practical:'Texte',privacy:'<svg>',capacity:60,permissions:{content:true}};
 const html=ui.page(s);assert.doesNotMatch(html,/<script>|<img |<svg>/);assert.match(html,/editSpaceOutlawsPreparation/);
 assert.doesNotMatch(html,/data-action="(?:setStage|toggleRegistration|shareSession|applyMasterImport)"/);
 assert.doesNotMatch(ui.page({...s,permissions:{content:false}}),/editSpaceOutlawsPreparation/);
 const form=ui.form(s);assert.match(form,/name="reason"[^>]*required/);assert.doesNotMatch(form,/<script>/);
 assert.match(ui.form({},'stable-id','owner'),/data-creation="stable-id"/);
});
test('Préparation UI : campagne sans épisode conduit au contexte de préparation, jamais à une reprise jouée',()=>{
 const html=createCampaignUi(helpers).page({id:'c',title:'<script>',preparationSessionId:'s',episodeCount:0});
 assert.match(html,/#\/session\/s/);assert.doesNotMatch(html,/campaignNext|campaignClose|campaignResume|<script>/);
});
test('Préparation UI : la clé survit à la perte de réponse et seul le succès la libère',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};let n=0;
 const make=()=>`creation-${++n}`,uid='test-key';
 assert.equal(preparationDraftId(storage,uid,make),'creation-1');assert.equal(preparationDraftId(storage,uid,make),'creation-1');
 finishPreparationDraft(storage,uid,'unrelated');assert.equal(preparationDraftId(storage,uid,make),'creation-1');
 finishPreparationDraft(storage,uid,'creation-1');assert.equal(preparationDraftId(storage,uid,make),'creation-2');
 data.set('gn-engine:so-preparation:reloaded','durable');assert.equal(preparationDraftId(storage,'reloaded',make),'durable');
 const unavailable={getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}};
 assert.equal(preparationDraftId(unavailable,'blocked',make),preparationDraftId(unavailable,'blocked',make));
});
