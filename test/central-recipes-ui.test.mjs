import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralUi} from '../web/central-master.mjs';
import {centralRecipePayload} from '../web/central-recipes.mjs';
import {centralWorkshops} from '../src/shared/central-workshops.mjs';
const ui=createCentralUi({button:(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
const d={campaign:{id:'campaign',title:'Recettes'},draft:{revision:3},rights:{readWorkshops:['M4'],editWorkshops:[],manageStaff:false},workshop:'M4',workshops:centralWorkshops.map(w=>({...w,canRead:w.id==='M4',canEdit:false})),changes:[],history:[],staff:[],references:{itemsReadable:false,items:[]},diagnostics:[{entityId:'formula',field:'productItemId',reference:'<b>secret</b>',message:'À préparer'}]};
test('Central M4 UI : lecture seule, diagnostics échappés et absence de publication',()=>{
 const h=ui.page(d);assert.match(h,/&lt;b&gt;secret/);assert.match(h,/lecture de M1 n’est pas accordée/);assert.doesNotMatch(h,/<b>secret|data-action="centralRecipe"|data-action="publish/);
 assert.match(ui.staffForm(d),/name="edit_M4"/);assert.doesNotMatch(ui.staffForm(d),/name="edit_M3"/);
});
test('Central M4 UI : formulaire stable, sélecteur partagé et provenance sans stock',()=>{
 const h=ui.recipeForm({...d,references:{itemsReadable:true,items:[{id:'i',name:'<img src=x>',source:'WEB',revision:2}]}},'stable');assert.match(h,/data-id="stable"/);assert.match(h,/data-draft="3"/);assert.match(h,/data-revision="0"/);assert.match(h,/list="central-recipe-items"/);assert.match(h,/data-action="centralRecipeComponentAdd" type="button"/);assert.match(h,/data-action="centralRecipeComponentRemove" type="button"/);assert.match(h,/&lt;img src=x&gt;/);assert.match(h,/brouillon M1 · r2 · WEB/);assert.doesNotMatch(h,/name="(stock|credits|publicationState|masterArchived)"|<img/);
});
test('Central M4 UI : composants saisis conservés, prix vide distinct de zéro',()=>{
 const v={name:'F',description:'',kind:'SCENARIO',minLevel:'2',productItemId:' dose ',skillId:'',effectId:'',laboratoryTargetId:'',unlockKnowledgeId:'',indicativePrice:'',gmNotes:''};
 const p=centralRecipePayload(v,[{itemId:' ingredient ',quantity:'2'},{itemId:'',quantity:''}]);assert.deepEqual(p.components,[{itemId:'ingredient',quantity:2}]);assert.equal(p.productItemId,'dose');assert.equal(p.indicativePrice,null);assert.equal(centralRecipePayload({...v,indicativePrice:'0'},[]).indicativePrice,0);
 assert.deepEqual(centralRecipePayload(v,[{itemId:'',quantity:'2'}]).components,[{itemId:'',quantity:2}]);
});
test('Central M4 UI : restauration et archive portent les révisions de formule',()=>{
 const c={entityId:'formula',type:'recipe',operation:'ARCHIVE',data:{name:'Formule',revision:2,minLevel:1,components:[]}},model={...d,rights:{...d.rights,editWorkshops:['M4']},changes:[c]};assert.match(ui.page(model),/Restaurer \/ modifier/);assert.doesNotMatch(ui.page(model),/data-action="centralRecipeArchive"/);assert.match(ui.recipeArchiveForm(model,c),/data-revision="2"/);
});
