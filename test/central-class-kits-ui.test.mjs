import test from 'node:test';
import assert from 'node:assert/strict';
import {centralClassKitPayload,createCentralClassKitUi} from '../web/central-class-kits.mjs';
import {createCentralImportUi} from '../web/central-import.mjs';
const button=(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`,ui=createCentralClassKitUi({button});
const c={entityId:'MED',type:'classKit',operation:'UPSERT',data:{name:'Kit initial — Médecin',revision:2,bindings:[{slotId:'medical-supplies',itemId:'supply'}],gmNotes:'<script>Privé</script>'}};
const d={campaign:{id:'campaign'},draft:{revision:5},workshop:'M1',rights:{editWorkshops:[]},changes:[c,{entityId:'supply',type:'item',operation:'ARCHIVE',data:{name:'<img>',revision:1}}],diagnostics:[]};
test('Kits M1 UI : huit classes, règles fixes, aucune édition en lecture seule',()=>{
 const h=ui.page(d);assert.equal((h.match(/<h4>Kit initial/g)||[]).length,8);assert.match(h,/2 × Trousse médicale/);assert.match(h,/200 Cr protégés/);assert.match(h,/modèle archivé/);assert.match(h,/&lt;script&gt;Privé/);assert.doesNotMatch(h,/<script>|<img>|data-action="centralClassKit/);assert.match(ui.page({...d,rights:{editWorkshops:['M1']}}),/data-action="centralClassKitArchive"/);
});
test('Kits M1 UI : formulaire de références, révisions et motif sans quantité libre',()=>{
 const h=ui.form(d,'MED',c);assert.match(h,/data-id="MED"/);assert.match(h,/data-draft="5"/);assert.match(h,/data-revision="2"/);assert.match(h,/name="kit_medical-supplies"/);assert.match(h,/value="supply"/);assert.match(h,/&lt;img&gt;/);assert.doesNotMatch(h,/<img>|<script>|name="(quantity|credits|pillable|resellable|publicationState|classId|effect)"/);assert.match(h,/name="reason"[^>]*required/);assert.match(h,/maxlength="128"/);assert.doesNotMatch(h,/<option value="MED"/);
 const p=centralClassKitPayload('MED',{'kit_communicator':' com ','kit_medical-supplies':' supplies ',gmNotes:'Note',credits:'999',quantity:'20'});assert.deepEqual(p,{bindings:[{slotId:'communicator',itemId:'com'},{slotId:'medical-supplies',itemId:'supplies'}],gmNotes:'Note'});
});
test('Kits M1 UI : restauration, archive et diagnostics échappés',()=>{
 const archived={...c,operation:'ARCHIVE'},h=ui.page({...d,rights:{editWorkshops:['M1']},changes:[archived],diagnostics:[{entityId:'MED',field:'bindings.weapon.itemId',reference:'<x>',message:'Manquant'}]});assert.match(h,/Restaurer \/ modifier le kit/);assert.doesNotMatch(h,/centralClassKitArchive/);assert.match(h,/&lt;x&gt;/);assert.match(ui.form(d,'MED',archived),/Restaurer dans le brouillon/);assert.match(ui.archiveForm(d,c),/data-revision="2"/);assert.match(ui.archiveForm(d,c),/name="reason"[^>]*required/);
});
test('Kits M1 UI : les exports Excel restent limités aux modèles d’objets',()=>{
 const imports=createCentralImportUi({button}),h=imports.exportForm(d);assert.match(h,/value="supply"/);assert.doesNotMatch(h,/value="MED"/);assert.match(imports.buttons(d),/kits.*éditeur web/);
});
