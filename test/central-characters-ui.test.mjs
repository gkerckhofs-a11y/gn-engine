import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralUi} from '../web/central-master.mjs';
import {centralCharacterPayload,readCentralCharacterNarrative} from '../web/central-characters.mjs';
import {centralWorkshops} from '../src/shared/central-workshops.mjs';
const ui=createCentralUi({button:(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
const character={id:'person',nature:'HUMANOID',public:{displayName:'<b>Voyageur</b>',profession:'Couverture',description:'Texte fictif'},biography:'<img src=x>',roleplay:'Consignes',playerSecrets:'Secret privé',gmNotes:'Note réservée',contentRevision:3,objectives:[{id:'goal',title:'But',description:'Texte',gmNotes:'MJ',steps:[{id:'step',title:'Étape',description:'Texte étape'}]}],relations:[{id:'relation',title:'Alias',targetId:'target',description:'Conflit narratif',gmNotes:'MJ'}]};
const d={campaign:{id:'campaign',title:'Préparation'},draft:{revision:4},rights:{readWorkshops:['M2'],editWorkshops:[],manageStaff:false},workshop:'M2',workshops:centralWorkshops.map(w=>({...w,canRead:w.id==='M2',canEdit:false})),changes:[{id:'character_person',type:'character',entityId:'person',operation:'UPSERT',data:character}],history:[],staff:[],references:{characters:[{id:'person',displayName:'Soi',revision:3,source:'WEB'},{id:'target',displayName:'<i>Autre</i>',revision:1,source:'WEB',archived:true}]},diagnostics:[{entityId:'person',field:'relations.r.targetId',reference:'<b>cible</b>',message:'À préparer'}]};
test('M2 central UI : lecture privée échappée, sans édition ni accès aux admissions',()=>{
 const h=ui.page(d);assert.match(h,/Secret privé/);assert.match(h,/Note réservée/);assert.match(h,/&lt;img src=x&gt;/);assert.match(h,/&lt;b&gt;cible/);assert.doesNotMatch(h,/<img|<b>|data-action="centralCharacter"|data-action="centralExport"|admissions-admin|data-action="publish/);
 const grant=ui.staffForm(d);assert.match(grant,/name="edit_M2"/);assert.doesNotMatch(grant,/name="edit_M3"|name="publish"/);
});
test('M2 central UI : identifiants, révisions natives, étapes conservées et boutons non soumis',()=>{
 const h=ui.characterForm(d,'person',d.changes[0]);assert.match(h,/data-id="person"/);assert.match(h,/data-draft="4"/);assert.match(h,/data-revision="3"/);assert.match(h,/data-central-objective="goal"/);assert.match(h,/data-central-step="step"/);assert.match(h,/data-central-relation="relation"/);assert.match(h,/value="target"/);assert.match(h,/&lt;i&gt;Autre/);assert.match(h,/archivé · r1 · WEB/);assert.doesNotMatch(h,/<option value="person"/);
 for(const action of ['centralCharacterObjectiveAdd','centralCharacterRelationAdd','centralCharacterStepAdd','centralCharacterRemove'])assert.match(h,new RegExp(`data-action="${action}" type="button"`));
 assert.doesNotMatch(h,/name="(publicationState|published|email|uid|assignedUid|hp|credits|globalLevel|abilityProfile)"/);assert.match(h,/name="reason"[^>]+required/);assert.match(ui.characterForm(d,'new'),/data-revision="0"/);
});
test('M2 central UI : lecture des objectifs et étapes sans perte de leurs IDs',()=>{
 const row=(dataset,values,steps=[])=>({dataset,querySelector:selector=>({value:values[selector.match(/name="([^"]+)"/)[1]]}),querySelectorAll:()=>steps});
 const step=row({centralStep:'stable-step'},{stepTitle:'Étape',stepDescription:'Détail'}),objective=row({centralObjective:'stable-goal'},{objectiveTitle:'Objectif',objectiveDescription:'Texte',objectiveNotes:'Notes'},[step]),relation=row({centralRelation:'stable-relation'},{relationTitle:'Alias',relationDescription:'Privé',relationNotes:'Notes',relationTarget:' target '});
 const parsed=readCentralCharacterNarrative({querySelectorAll:selector=>selector.includes('objective')?[objective]:[relation]});const v={displayName:'Nom',profession:'Profession',description:'Public',nature:'',biography:'Biographie',roleplay:'Rôle',playerSecrets:'Secret',gmNotes:'Note'};
 const result=centralCharacterPayload(v,parsed.objectives,parsed.relations);assert.equal(result.nature,null);assert.equal(result.objectives[0].id,'stable-goal');assert.deepEqual(result.objectives[0].steps,[{id:'stable-step',title:'Étape',description:'Détail'}]);assert.equal(result.relations[0].targetId,'target');assert.equal(result.relations[0].id,'stable-relation');assert.equal('published' in result.objectives[0],false);assert.equal('published' in result.relations[0],false);
});
test('M2 central UI : archive/restauration explicites et motif de contre-opération',()=>{
 const edit={...d,rights:{...d.rights,editWorkshops:['M2']}};assert.match(ui.page(edit),/data-action="centralCharacterArchive"/);const archived={...d.changes[0],operation:'ARCHIVE'};const h=ui.page({...edit,changes:[archived]});assert.match(h,/Restaurer \/ modifier/);assert.doesNotMatch(h,/data-action="centralCharacterArchive"/);const form=ui.characterArchiveForm(d,d.changes[0]);assert.match(form,/data-revision="3"/);assert.match(form,/name="reason"[^>]+required/);assert.match(form,/&lt;b&gt;Voyageur/);
});
