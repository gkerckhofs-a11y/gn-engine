import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralUi,centralItemPayload} from '../web/central-master.mjs';
import {centralWorkshops} from '../src/shared/central-workshops.mjs';
const ui=createCentralUi({button:(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`});
const model={campaign:{id:'campaign',title:'<script>secret</script>'},draft:{revision:3},rights:{readWorkshops:['M1'],editWorkshops:[],manageStaff:false},workshop:'M1',workshops:centralWorkshops.map(w=>({...w,canRead:w.id==='M1',canEdit:false})),changes:[],history:[],staff:[]};
test('Central UI : six domaines, sept ateliers et aucune édition pour la lecture seule',()=>{
 const h=ui.page(model);for(const id of centralWorkshops.map(w=>w.id))assert.match(h,new RegExp(id));assert.equal((h.match(/class="card"/g)||[]).length,6);
 assert.doesNotMatch(h,/data-action="centralItem"|data-action="centralStaff"|#\/central\/campaign\/M2/);assert.match(h,/&lt;script&gt;/);assert.doesNotMatch(h,/<script>/);
});
test('Central UI : intention stable, révisions et absence de stock ou publication dans le formulaire',()=>{
 const h=ui.itemForm(model,'stable-id');assert.match(h,/data-id="stable-id"/);assert.match(h,/data-draft="3"/);assert.match(h,/data-revision="0"/);assert.doesNotMatch(h,/name="(stock|credits|publicationState|quantity|ownerId)"/);
 const payload=centralItemPayload({name:'Test',description:'',category:'Bien',unit:'unité',kind:'STACKABLE',consumable:'on',pillable:'on',unitVolume:'0',legality:'LEGAL',gmNotes:'',pelletsPerUnit:'3'});
 assert.equal(payload.unitVolume,0);assert.equal(payload.consumable,true);assert.equal(payload.pillable,true);assert.deepEqual(payload.laserRecharge,{pelletsPerUnit:3});assert.equal('publicationState' in payload,false);
});
test('Central UI : espèces M2 échappées et délégations sans pouvoir de publication',()=>{
 const h=ui.page({...model,workshop:'M2',changes:[{id:'speciesCatalogue_player',data:[{id:'human',label:'<b>Human</b>',nature:'HUMANOID',description:'<img src=x>',available:true}]}]});assert.match(h,/&lt;b&gt;Human/);assert.doesNotMatch(h,/<img/);
 const grant=ui.staffForm(model);assert.match(grant,/name="edit_M1"/);assert.match(grant,/name="edit_M3"/);assert.doesNotMatch(grant,/name="publish"/);assert.match(grant,/Aucun message/);
});
test('Central UI : archive et restauration restent des modifications de brouillon',()=>{
 const c={entityId:'item',type:'item',operation:'ARCHIVE',data:{name:'<i>Item</i>',description:'',unit:'unité',revision:2}},d={...model,rights:{...model.rights,editWorkshops:['M1']},changes:[c]};
 assert.match(ui.page(d),/Restaurer \/ modifier/);assert.doesNotMatch(ui.page(d),/data-action="centralArchive"/);assert.match(ui.archiveForm(d,c),/data-revision="2"/);assert.match(ui.archiveForm(d,c),/&lt;i&gt;Item/);
});
test('Central UI : module calibré, prix fixe et limites de préparation visibles',()=>{
 const c={entityId:'module',type:'item',operation:'UPSERT',data:{name:'<b>Bouclier</b>',shipModule:{code:'MOD-01',size:2},kind:'INDIVIDUAL',consumable:false,revision:1}},h=ui.itemForm(model,'module',c);
 assert.match(h,/name="shipModuleCode"/);assert.match(h,/value="MOD-01" selected/);assert.match(h,/value="2" selected/);assert.match(h,/1500 Cr/);assert.match(h,/MEC-03 N2, 10 min/);assert.match(h,/L’achat ne monte pas le module/);assert.match(h,/colonnes Excel/);assert.doesNotMatch(h,/name="(modulePrice|moduleBonus|moduleSlots|installed)"/);
 assert.doesNotMatch(h,/<b>Bouclier/);assert.match(ui.page({...model,changes:[c]}),/1500 Cr/);
 const values={name:'Module',kind:'INDIVIDUAL',unitVolume:'',pelletsPerUnit:'',shipModuleCode:'MOD-06',shipModuleSize:'3'};
 assert.deepEqual(centralItemPayload(values).shipModule,{code:'MOD-06',size:3});assert.equal(centralItemPayload({...values,shipModuleCode:''}).shipModule,null);
 const {shipModuleCode,shipModuleSize,...old}=values;assert.equal('shipModule' in centralItemPayload(old),false);
});

test('Central UI : soute clandestine versionnée, capacité dans le volume existant',()=>{
 const c={type:'item',entityId:'hidden',operation:'UPSERT',data:{name:'Soute <script>',description:'',revision:1,shipModule:{code:'MOD-04',size:3}}},h=ui.page({...model,changes:[c]});assert.match(h,/2000 Cr/);assert.match(h,/Cache 10 unités dans les 50 existantes/);assert.match(h,/biens déjà rangés restent cachés/);assert.doesNotMatch(h,/<script>/);const form=ui.itemForm(model,'hidden',c);assert.match(form,/MOD-04.*nouvelle version compatible/);assert.match(form,/cargo ou transport seulement/);assert.doesNotMatch(form,/name="hiddenCargoCapacity"|name="price"/);
});

test('Central UI : MOD-05 préparatoire, prix non éditable et remorquage explicitement fermé',()=>{
 const c={type:'item',entityId:'tow',operation:'UPSERT',data:{name:'Treuil <script>',description:'',revision:1,shipModule:{code:'MOD-05',size:2}}},h=ui.itemForm(model,'tow',c);assert.match(h,/1000 Cr/);assert.match(h,/MEC-03 N2, 10 min/);assert.match(h,/MOD-05 : nécessite une nouvelle version compatible remorquage/);assert.match(h,/Achat, montage et attelage sont distincts/);assert.match(h,/MOD-05 · Remorquage/);assert.doesNotMatch(h,/<script>|name="(towedShipId|towFuel|modulePrice)"/);assert.match(ui.page({...model,changes:[c]}),/ce modèle ne crée aucun remorquage/);
});

test('Central UI : ouvre la version suivante puis montre les éditeurs web',()=>{
 const base={baseVersionId:'v1',pointerRevision:1};
 const published=ui.page({...model,draft:{status:'PUBLISHED',...base}});
 assert.match(published,/data-form="centralRevision" data-cid="campaign" data-version="v1" data-pointer="1"/);
 assert.match(published,/Ouvrir le brouillon V2/);
 assert.doesNotMatch(published,/data-action="centralItem"|data-action="centralImport"/);
 const draft=ui.page({...model,draft:{...base,status:'DRAFT',revision:0},rights:{...model.rights,editWorkshops:['M1'],checkCentral:true,manageStaff:true}});
 assert.match(draft,/brouillon V2/);
 assert.match(draft,/data-action="centralItem"/);
 assert.doesNotMatch(draft,/data-action="centralImport"|data-action="centralExport"|data-action="centralSnapshotPreview"|#\/central-check\//);
});
