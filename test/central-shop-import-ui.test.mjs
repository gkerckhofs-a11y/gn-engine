import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralImportUi} from '../web/central-import.mjs';
import {shopImportFixture,centralShopRow,centralOfferRow} from './support/central-shop-import-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
const ui=createCentralImportUi({button:(label,action)=>`<button data-action="${action}">${label}</button>`});
const d={campaign:{id:'c'},workshop:'M5',rights:{editWorkshops:[]},changes:[{type:'shop',entityId:'same',operation:'UPSERT',data:{name:'<img>Boutique',revision:3}},{type:'offer',entityId:'same',operation:'ARCHIVE',data:{name:'<b>Offre',revision:2}},{type:'item',entityId:'foreign',operation:'UPSERT',data:{name:'Étranger'}}]};
test('Excel M5 UI : sélection typée des homonymes et noms échappés',()=>{
 const h=ui.exportForm(d);assert.match(h,/value="shop_same"/);assert.match(h,/value="offer_same"/);assert.match(h,/Boutiques · &lt;img&gt;Boutique · same · r3/);assert.match(h,/Offres · &lt;b&gt;Offre · same · r2 · archivé/);assert.doesNotMatch(h,/value="foreign"|<img>|<b>|undefined/);
});
test('Excel M5 UI : lecture seule autorise export, édition requise pour importer',()=>{
 assert.match(ui.buttons(d),/centralExport/);assert.doesNotMatch(ui.buttons(d),/data-action="centralImport"/);assert.match(ui.buttons({...d,rights:{editWorkshops:['M5']}}),/data-action="centralImport"/);assert.match(ui.buttons({...d,workshop:'M3'}),/centralExport/);
});
test('Excel M5 UI : deux feuilles, limite commune et prix sans valeur implicite',()=>{
 const h=ui.importForm(d);for(const text of ['deux feuilles Boutiques et Offres','même vides','100 lignes au total','sans ajouter de préfixe','boutique_id','objet_id','vendeur_personnage_id','prix_vente_cr','prix_rachat_cr','strictement positifs','!EFFACER retire le prix','Aucun prix par défaut'])assert.ok(h.includes(text),text);assert.match(h,/accept=".xlsx" required/);assert.doesNotMatch(ui.importForm({...d,workshop:'M1'}),/deux feuilles Boutiques/);
});
test('Excel M5 UI : aperçu distingue les feuilles, situe les erreurs et exige confirmation',()=>{
 const p={errors:[],changes:[{id:'same',type:'shop',sheet:'Boutiques',row:2,operation:'MODIFIER',fields:[{field:'gmNotes',before:'Privé',after:'<script>Note</script>'}]},{id:'same',type:'offer',sheet:'Offres',row:4,operation:'CREER',fields:[]}],diagnostics:[{entityId:'same',field:'itemId',reference:'<x>',sheet:'Offres',row:4,column:'objet_id',message:'À préparer'}],confirmation:'hash'},h=ui.preview(d,p,'<b>.xlsx');assert.match(h,/Boutiques ligne 2/);assert.match(h,/Offres ligne 4 · objet_id/);assert.match(h,/&lt;script&gt;Note/);assert.match(h,/name="confirmed" type="checkbox" required/);assert.doesNotMatch(h,/<script>|<x>|<b>/);const bad=ui.preview(d,{...p,errors:[{sheet:'Offres',row:4,column:'prix_vente_cr',message:'Invalide'}],confirmation:null},'M5.xlsx');assert.match(bad,/Offres · ligne 4 · prix_vente_cr/);assert.doesNotMatch(bad,/data-form="centralImportApply"/);
});
test('Excel M5 UI : vrai XLSX, deux feuilles et même ID sans perte des littéraux',async()=>{
 const f=await shopImportFixture(()=>new MemoryStore()),input=await f.file([{...centralShopRow,id:'same',nom:'=1+1',notes_mj:'!!EFFACER'}],[{...centralOfferRow,id:'same',boutique_id:'same',nom:'@offre',notes_mj:'!!!Privé'}]);await f.apply(input,await f.prepare(input));const output=await f.round(['shop_same','offer_same']);assert.equal(output.sheets.Boutiques[0].nom,'=1+1');assert.equal(output.sheets.Boutiques[0].notes_mj,'!!EFFACER');assert.equal(output.sheets.Offres[0].nom,'@offre');assert.equal(output.sheets.Offres[0].notes_mj,'!!!Privé');assert.ok((await f.prepare(output)).changes.every(c=>c.operation==='INCHANGE'));
});
