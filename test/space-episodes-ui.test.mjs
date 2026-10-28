import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignUi} from '../web/campaigns.mjs';
import {createEntryUi} from '../web/space-outlaws-entry.mjs';
const helpers={button:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`},ui=createCampaignUi(helpers);
test('Épisodes SO UI : participation explicite, noms échappés et absence de remise des PV',()=>{
 const form=ui.closeForm('s','',{episodesReady:true,registrations:[{uid:'u',name:'<script>MJ</script>'}]});assert.match(form,/name="participantUid"/);assert.doesNotMatch(form,/checked|<script>|cancelOffers/);
 const next=ui.episodeForm({id:'c',title:'Campagne',episodeCount:1,episodesVersion:1});assert.doesNotMatch(next,/RESTORE|réinscrire|name="fields"/);assert.match(next,/conservant ceux réservés/);
});
test('Épisodes SO UI : dossiers et voyages visibles au bilan, clôture bloquée sans bouton',()=>{
 const summary={characters:[],accounts:[],groups:0,lots:0,receipts:0,continuity:{participants:[{name:'<img>',played:true,completedSessions:1}],contracts:[{title:'Mission',status:'DISPUTED',reserved:40,deadlineMs:60000}],voyages:[{name:'Cargo',remainingMs:120000,hull:3,shield:1,fuel:2,combatId:'fight'}],pickups:1}},d={summary,blocks:[{kind:'SURVIVAL',title:'Urgence'}],cancelled:{market:0,sales:0,transfers:0},canClose:false};
 const html=ui.closePreview(d,{sessionId:'s'});assert.match(html,/40 Cr réservés/);assert.match(html,/combat en cours/);assert.match(html,/Urgence vitale/);assert.doesNotMatch(html,/data-command="closeCampaignSession"|<img>/);
});
test('Épisodes SO UI : régie de campagne après première naissance et reprise sans nouvelle attribution',()=>{
 const c={id:'c',title:'Campagne',episodeCount:1,episodesVersion:1,preparationSessionId:'old',activeSessionId:'s',checkpoints:[]};assert.match(ui.page(c),/session\/s/);assert.doesNotMatch(ui.page(c),/Aucun épisode joué/);
 const page=createEntryUi(helpers).page({session:{id:'s',title:'Épisode 2',revision:1},campaignEpisode:2,episodesReady:true,versionId:'v',actionsReady:true,stage:'PAUSE',registrations:[{uid:'u',name:'Joueur',classId:'PIL',m2Prepared:true}]});assert.doesNotMatch(page,/soBirthOptions|data-stage="FINISHED"/);assert.match(page,/Épisode 2/);
});
