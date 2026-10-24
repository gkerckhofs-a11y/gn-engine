import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralUi} from '../web/central-master.mjs';
import {centralKnowledgePayload} from '../web/central-knowledge.mjs';
import {centralWorkshops} from '../src/shared/central-workshops.mjs';
const ui=createCentralUi({button:(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
const c={type:'knowledge',entityId:'document',operation:'UPSERT',data:{title:'<b>Document</b>',kind:'DOCUMENT',body:'<img src=x>',origin:'Fiction',gmTruth:'Vérité privée',gmNotes:'Note privée',shareMode:'SHOW',initialCharacterIds:['person'],qrEnabled:true,qrAudience:'SELECTED',qrCharacterIds:['other'],qrSkillId:'skill',qrSkillLevel:2,revision:3}};
const d={campaign:{id:'campaign',title:'Préparation'},draft:{revision:6},rights:{readWorkshops:['M6'],editWorkshops:[],manageStaff:false},workshop:'M6',workshops:centralWorkshops.map(w=>({...w,canRead:w.id==='M6',canEdit:false})),changes:[c],history:[],staff:[],references:{charactersReadable:false,characters:[]},diagnostics:[{entityId:'document',field:'initialCharacterIds.0',reference:'<script>',message:'Lecture M2 requise'}]};
test('M6 central UI : lecture privée échappée et édition uniquement selon droits',()=>{
 const h=ui.page(d);assert.match(h,/&lt;b&gt;Document/);assert.match(h,/&lt;img src=x&gt;/);assert.match(h,/&lt;script&gt;/);assert.match(h,/Vérité privée/);assert.match(h,/Note privée/);assert.match(h,/Lecture M2 non accordée/);
 assert.doesNotMatch(h,/<img|<b>|<script>|data-action="central(?:Knowledge|Import|Export)/);assert.match(h,/import\/export Excel M6 n’est pas encore disponible/);assert.match(ui.staffForm(d),/name="edit_M6"/);assert.doesNotMatch(h,/data-action="publish/);
});
test('M6 central UI : révisions, listes indépendantes, propositions sans accès actif',()=>{
 const h=ui.knowledgeForm(d,'document',c);assert.match(h,/data-id="document"/);assert.match(h,/data-draft="6"/);assert.match(h,/data-revision="3"/);assert.match(h,/value="person"/);assert.match(h,/value="other"/);assert.match(h,/data-central-recipients="initialCharacterIds"/);assert.match(h,/data-central-recipients="qrCharacterIds"/);assert.match(h,/name="reason"[^>]+required/);assert.match(h,/inactive en brouillon/);
 assert.match(h,/data-action="centralKnowledgeRecipientAdd" type="button"/);assert.match(h,/data-action="centralKnowledgeRecipientRemove" type="button"/);assert.doesNotMatch(h,/name="(publicationState|receipt|stock|assignedUid|qrId)"/);const fresh=ui.knowledgeForm(d,'new');assert.match(fresh,/value="SHOW" selected/);assert.match(fresh,/value="SELECTED" selected/);assert.doesNotMatch(fresh,/name="qrEnabled" checked/);assert.match(fresh,/name="qrSkillLevel"[^>]*value=""/);
});
test('M6 central UI : suggestions M2 minimales, identifiants et provenance conservés',()=>{
 const data={...d,references:{charactersReadable:true,characters:[{id:'person',name:'<i>Personnage</i>',revision:2,source:'XLSX',archived:true}]}},h=ui.knowledgeForm(data,'document',c);assert.match(h,/&lt;i&gt;Personnage/);assert.match(h,/archivé · r2 · XLSX/);assert.match(h,/list="central-knowledge-characters"/);assert.doesNotMatch(h,/<i>/);assert.match(ui.knowledgeRecipientRow('<script>'),/value="&lt;script&gt;"/);
});
test('M6 central UI : charge utile complète, destinataires normalisés sans droits inventés',()=>{
 const values={kind:'DOCUMENT',title:'Titre',body:'Texte',origin:'',shareMode:'SHOW',gmTruth:'Vérité',gmNotes:'Notes',qrEnabled:'on',qrAudience:'SELECTED',qrSkillId:' skill ',qrSkillLevel:'3',publicationState:'PUBLISHED'},p=centralKnowledgePayload(values,[' first ','','second'],[' second ']);
 assert.deepEqual(p.initialCharacterIds,['first','second']);assert.deepEqual(p.qrCharacterIds,['second']);assert.equal(p.qrSkillId,'skill');assert.equal(p.qrSkillLevel,3);assert.equal(p.qrEnabled,true);assert.equal(p.publicationState,undefined);assert.equal(p.gmTruth,'Vérité');const blank=centralKnowledgePayload({...values,qrEnabled:undefined,qrSkillId:' ',qrSkillLevel:''});assert.equal(blank.qrSkillId,null);assert.equal(blank.qrSkillLevel,null);assert.equal(blank.qrEnabled,false);assert.deepEqual(blank.initialCharacterIds,[]);
});
test('M6 central UI : archive et restauration explicites sans suppression des références',()=>{
 const edit={...d,rights:{...d.rights,editWorkshops:['M6']}};assert.match(ui.page(edit),/data-action="centralKnowledgeArchive"/);const h=ui.page({...edit,changes:[{...c,operation:'ARCHIVE'}]});assert.match(h,/Restaurer \/ modifier/);assert.doesNotMatch(h,/data-action="centralKnowledgeArchive"/);const form=ui.knowledgeArchiveForm(d,c);assert.match(form,/data-revision="3"/);assert.match(form,/data-form="centralKnowledgeArchive"/);assert.match(form,/Aucun reçu joueur n’est modifié/);assert.match(form,/&lt;b&gt;Document/);
});
test('M4 central UI : sélection M6 limitée au titre, à la provenance et à l’état',()=>{
 const data={...d,workshop:'M4',changes:[],references:{itemsReadable:false,items:[],knowledgeReadable:true,knowledge:[{id:'document',title:'<b>Document</b>',kind:'DOCUMENT',source:'WEB',revision:3,archived:true}]}},h=ui.recipeForm(data,'formula');assert.match(h,/list="central-recipe-knowledge"/);assert.match(h,/&lt;b&gt;Document/);assert.match(h,/archivée · r3 · WEB/);assert.doesNotMatch(h,/Vérité privée|Note privée|initialCharacterIds/);assert.match(h,/ne débloque aucune fabrication/);const denied=ui.recipeForm({...data,references:{...data.references,knowledgeReadable:false,knowledge:[]}},'formula');assert.match(denied,/Lecture M6 non accordée/);assert.doesNotMatch(denied,/option value="document"/);
});
