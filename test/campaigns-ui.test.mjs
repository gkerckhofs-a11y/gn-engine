import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignUi} from '../web/campaigns.mjs';
const ui=createCampaignUi({button:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
const summary={characters:[{id:'c',name:'<script>alert(1)</script>',level:1,balance:20,hpBefore:6,hpAfter:6,lots:2,knowledge:1}],groups:1,lots:2,receipts:1,accounts:[{ownerType:'GROUP',label:'<img onerror=alert(1)>',balance:30,reserved:0}]};
test('campagne UI : aucune clôture proposée avec engagement ouvert ou consentement manquant',()=>{
 const blocked=ui.closePreview({summary,blocks:[{kind:'PICKUP',title:'Objet payé'}],cancelled:{market:0,sales:0,transfers:0},canClose:false},{sessionId:'s'});
 assert.doesNotMatch(blocked,/data-form="campaignCommand"/);assert.match(blocked,/Achat payé à remettre/);assert.doesNotMatch(blocked,/<script>|<img /);
 const ready=ui.closePreview({summary,blocks:[],cancelled:{market:1,sales:0,transfers:0},canClose:true,confirmation:'proof'},{sessionId:'s',cancelOffers:true});assert.match(ready,/closeCampaignSession/);assert.match(ready,/&quot;cancelOffers&quot;:true/);
});
test('campagne UI : état de préparation reprenable, une seule action de prochaine session',()=>{
 const base={id:'campaign',title:'Campagne',episodeCount:1,checkpoints:[]};
 const copying=ui.page({...base,activeBuildId:'build',build:{cursor:1,pages:3}});assert.match(copying,/campaignResume/);assert.doesNotMatch(copying,/campaignNext/);
 const active=ui.page({...base,activeSessionId:'session'});assert.doesNotMatch(active,/campaignNext/);assert.match(active,/#\/session\/session/);
 assert.match(ui.page({...base}),/campaignNext/);
});
test('campagne UI : choix obligatoire des blessures et remise à zéro explicitée',()=>{
 const form=ui.episodeForm({id:'c',title:'<script>',episodeCount:1});assert.match(form,/<select name="healthPolicy" required><option value="">/);assert.match(form,/value="PRESERVE"/);assert.match(form,/value="RESTORE"/);assert.match(form,/PA repartiront au maximum/);assert.doesNotMatch(form,/<script>/);
 const closed=ui.panel({id:'s',campaignId:'c',campaignEpisode:1,campaignSealed:true,role:'OWNER',stage:'ARCHIVED'});assert.doesNotMatch(closed,/campaignClose|campaignReopen/);
});
