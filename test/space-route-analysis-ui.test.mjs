import test from 'node:test';
import assert from 'node:assert/strict';
import {soSpaceportHtml} from '../web/space-outlaws-voyages.mjs';
import {centralSpacePayload,createCentralSpaceUi} from '../web/central-space.mjs';
import {fieldTargetHtml,fieldAdminHtml} from '../web/field-actions.mjs';
import {analysisProfile} from '../src/shared/space-outlaws-analysis.mjs';

test('PIL-01 analyse UI : entrée au code sans vaisseau, fermée aux anciens manifestes',()=>{
 const d={session:{id:'s',routeAnalysisReady:true},ships:[]},h=soSpaceportHtml(d);assert.match(h,/soRouteAnalysis/);assert.match(h,/Aucun vaisseau requis/);assert.match(h,/name="navigationCode"/);assert.doesNotMatch(h,/name="targetId"|name="roll"/);assert.doesNotMatch(soSpaceportHtml({...d,session:{id:'s'}}),/soRouteAnalysis/);
});
test('PIL-01 analyse UI : lien M3/M6 facultatif, conservé et effaçable dans le formulaire',()=>{
 const v={name:'Route',navigationCode:'CODE',fromPort:'home',toPort:'away',distanceId:'SHORT',riskId:'SECURED',analysisTargetId:' nav '};assert.equal(centralSpacePayload('route',v).analysisTargetId,'nav');assert.equal(centralSpacePayload('route',{...v,analysisTargetId:''}).analysisTargetId,undefined);
 const ui=createCentralSpaceUi({button:()=>''}),h=ui.form({campaign:{id:'c'},draft:{revision:1},references:{ports:[]}},'route','r',{data:v});assert.match(h,/name="analysisTargetId"/);assert.match(h,/Dossier de navigation PIL-01/);
});
test('PIL-01 analyse UI : règles graduées, information acquise et absence de QR de contournement',()=>{
 const target={id:'nav',kind:'ANALYSIS',title:'Dossier <script>',description:'Scène',profiles:{ANALYZE:analysisProfile('PIL-01')},rewards:[]},d={session:{id:'s',stage:'EN_JEU'},navigation:{name:'Liaison <script>',fromPort:'home',toPort:'away'},target,profiles:[{...analysisProfile('PIL-01'),kind:'ANALYZE',level:2,durationSeconds:105,qualified:true,waitMs:0,bonusLots:[]}],aidOffers:[]};const h=fieldTargetHtml(d);assert.match(h,/105 s de jeu/);assert.match(h,/Informations garanties/);assert.match(h,/seuil 6/);assert.doesNotMatch(h,/<script>|Traqueur/);
 const admin=fieldAdminHtml({scope:'session',parent:{id:'s',sealed:true},fieldTargets:[target],states:[],actions:[]});assert.doesNotMatch(admin,/data-field-action="qr"/);assert.match(admin,/code de la liaison publiée/);
});
