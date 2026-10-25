import test from 'node:test';
import assert from 'node:assert/strict';
import {centralFieldTargetPayload,createCentralFieldTargetsUi} from '../web/central-field-targets.mjs';
import {fieldTargetHtml,fieldResultHtml,fieldMineHtml} from '../web/field-actions.mjs';
import {playerShell,actionIntroHtml} from '../web/player-spaces.mjs';
import {createEntryUi} from '../web/space-outlaws-entry.mjs';
import {analysisProfile} from '../src/shared/space-outlaws-analysis.mjs';
import {fieldTargetInput} from '../src/core/field-state.mjs';
import {importedField,exportedField} from '../src/core/central-field-import.mjs';
import {centralFieldTargetInput} from '../src/core/central-field-targets.mjs';
const uiArgs={button:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`};
const values={kind:'ANALYSIS',title:'Lieu <script>',description:'Public',gmNotes:'Réservé',analysisSkill:'TRA-01',analysisInstructions:'Scène <b>',analysisBonus:'scanner:2',reward_info__knowledge:'k',reward_info__level:'1',reward_info__bonus:'false'};
test('Actions SO UI : formulaire M6 fixe les règles et conserve les références natives',()=>{
 const t=centralFieldTargetPayload(values,['info']);assert.deepEqual(t.profiles.ANALYZE,analysisProfile('TRA-01',{instructions:'Scène <b>',bonusItems:[{itemId:'scanner',bonus:2}]}));assert.equal(t.rewards[0].minLevel,1);assert.equal(t.rewards[0].bonus,false);assert.ok(fieldTargetInput({...t,publicationState:'DRAFT'},'scene'));
 const data=centralFieldTargetInput(t,'scene'),row=Object.fromEntries(Object.entries(exportedField({entityId:'scene',operation:'UPSERT',data})).map(([k,v])=>[k,String(v)]));assert.deepEqual(importedField(row,null),data);
 const ui=createCentralFieldTargetsUi(uiArgs),html=ui.form({campaign:{id:'c'},draft:{revision:4},changes:[]},'scene',{data},'ANALYSIS');assert.match(html,/data-form="centralFieldTarget"/);assert.match(html,/analysisSkill/);assert.match(html,/data-central-field-reward="info"/);assert.doesNotMatch(html,/<script>/);assert.doesNotMatch(html,/name="action_ANALYZE__cout_pa"/);
});
test('Actions SO UI : lecture gratuite, résolution mixte et liens vers les informations',()=>{
 const d={session:{id:'s',stage:'EN_JEU'},target:{id:'scene',title:'Lieu',description:'Texte',kind:'ANALYSIS'},analysisDone:true,profiles:[{...analysisProfile('TRA-01'),kind:'ANALYZE',level:2,qualified:true,waitMs:0,bonusLots:[],consumable:null}],aidOffers:[]};const html=fieldTargetHtml(d);assert.match(html,/Relire mes informations sans PA/);assert.match(html,/disabled/);assert.match(html,/supplément/);
 const a={id:'a',kind:'ANALYZE',targetTitle:'Lieu',status:'SUCCEEDED',result:{roll:1,total:3,level:2,bonus:0,aid:0,threshold:6,bonusSuccess:false,text:'Garanti',information:[{id:'k',title:'Info <script>',bonus:false}]}};assert.match(fieldResultHtml(a),/supplément non obtenu/);assert.doesNotMatch(fieldResultHtml(a),/<script>/);assert.match(fieldMineHtml({session:{id:'s',stage:'EN_JEU'},actions:[a]}),/#\/infos\/s/);
});
test('Actions SO UI : navigation ouvre seulement les parcours disponibles et commande MJ explicite',()=>{
 const html=playerShell({session:{id:'s',title:'Session',stage:'EN_JEU',spaceOutlaws:{actionsVersion:1}},character:{id:'c',displayName:'A'}},{space:'character',page:'play'},'Fiche');assert.match(html,/#\/action\/s/);assert.match(html,/#\/infos\/s/);assert.doesNotMatch(html,/#\/(market|groups|terminal)\//);
 const intro=actionIntroHtml('s','c',true);assert.match(intro,/value="field"/);assert.doesNotMatch(intro,/value="cargo"|Soins sur moi/);
 const page=createEntryUi(uiArgs).page({session:{id:'s',title:'Session',revision:7},versionId:'v',stage:'BRIEFING',actionsReady:true,registrations:[],targets:[{id:'scene',title:'Poste'}]});assert.match(page,/data-action="soStage".*data-revision="7".*data-stage="EN_JEU"/);assert.match(page,/#\/field-admin\/session\/s/);
});
test('Actions SO : durées canoniques N1 à N5 et bonus tactiques exclus',()=>{
 const p=analysisProfile('COM-03',{bonusItems:[{itemId:'tool',bonus:2}]});assert.deepEqual(Object.values(p.durationByLevel),[120,105,90,75,60]);assert.deepEqual(p.bonusItems,[]);for(const id of ['TRA-01','TRA-03']){const p=analysisProfile(id);assert.equal(p.durationSeconds,120);assert.equal(p.test,'D6');assert.equal(p.threshold,6);}assert.equal(analysisProfile('MED-01'),null);
});
