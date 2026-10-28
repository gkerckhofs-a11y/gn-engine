import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralImportUi,centralImportErrors} from '../web/central-import.mjs';
import {readCentralXlsx,writeCentralXlsx} from '../web/central-xlsx.mjs';
import {storyImportFixture,centralKnowledgeRow,centralMissionRow} from './support/central-story-import-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
const ui=createCentralImportUi({button:(label,action)=>`<button data-action="${action}">${label}</button>`});
const data=workshop=>({campaign:{id:'c'},workshop,rights:{editWorkshops:[]},changes:[{type:workshop==='M6'?'knowledge':'mission',entityId:'story',operation:'UPSERT',data:{title:'<img>Fiction',revision:3}},{type:'other',entityId:'foreign',data:{}}]});
test('Excel M6/M7 UI : sélection ciblée, titres échappés et export en lecture seule',()=>{
 for(const workshop of ['M6','M7']){const d=data(workshop),h=ui.exportForm(d);assert.match(h,/&lt;img&gt;Fiction · story · r3/);assert.doesNotMatch(h,/<img>|undefined|value="foreign"/);assert.match(ui.buttons(d),/data-action="centralExport"/);assert.doesNotMatch(ui.buttons(d),/data-action="centralImport"/);assert.match(ui.buttons({...d,rights:{editWorkshops:[workshop]}}),/data-action="centralImport"/);}
});
test('Excel M6/M7 UI : instructions M6 expliquent destinataires, QR et retrait explicite',()=>{
 const h=ui.importForm(data('M6'));for(const text of ['32 000','tableau entier','destinataires_initiaux_json','destinataires_qr_json','conserve les deux listes','de 1 à 5','les deux cellules','secrets restent privés','éditeur web'])assert.ok(h.includes(text),text);assert.match(h,/accept=".xlsx" required/);assert.doesNotMatch(h,/etapes_json/);
});
test('Excel M6/M7 UI : instructions M7 préservent IDs et distinguent propositions de récompenses',()=>{
 const h=ui.importForm(data('M7'));for(const text of ['etapes_json','conservez les IDs','prerequis_informations_json','recompenses_objets_json','itemId, quantity','Aucune source réelle','!EFFACER'])assert.ok(h.includes(text),text);assert.match(centralImportErrors.CENTRAL_STORY_EXPORT_LIMIT,/aucun contenu n’a été tronqué/);assert.match(ui.buttons({...data('M7'),workshop:'M3'}),/centralExport/);assert.match(ui.buttons({...data('M7'),workshop:'M5'}),/centralExport/);
});
test('Excel M6/M7 UI : aperçu échappe les secrets, situe la référence et exige confirmation',()=>{
 const p={errors:[],changes:[{id:'story',operation:'MODIFIER',sheet:'Missions',row:3,fields:[{field:'gmNotes',before:'Privé',after:'<script>Secret</script>'}]}],diagnostics:[{entityId:'story',field:'requiredKnowledgeIds.0',reference:'<x>',sheet:'Missions',row:3,column:'prerequis_informations_json',message:'Manquant'}],confirmation:'hash'},h=ui.preview(data('M7'),p,'<b>.xlsx');assert.match(h,/&lt;script&gt;Secret/);assert.match(h,/Missions ligne 3 · prerequis_informations_json/);assert.match(h,/name="confirmed" type="checkbox" required/);assert.doesNotMatch(h,/<script>|<x>|<b>/);assert.doesNotMatch(ui.preview(data('M7'),{...p,errors:[{sheet:'Missions',row:3,column:'etapes_json',message:'<img>'}],confirmation:null},'Test.xlsx'),/data-form="centralImportApply"|<img>/);
});
test('Excel M6/M7 UI : vrai XLSX conserve textes littéraux et identifiants privés',async()=>{
 const f=await storyImportFixture(()=>new MemoryStore());for(const [workshop,row,sheet] of [['M6',{...centralKnowledgeRow,titre:'=1+1',texte:'!!EFFACER'},'Informations'],['M7',{...centralMissionRow,titre:'@mission',notes_mj:'!!EFFACER'},'Missions']]){const input=await f.file(workshop,[row]);await f.apply(input,await f.prepare(input));const out=readCentralXlsx(writeCentralXlsx((await f.exportFile(workshop,[row.id])).sheets));assert.equal(out[sheet][0].titre,row.titre);if(workshop==='M6'){assert.equal(out.Informations[0].texte,'!!EFFACER');assert.deepEqual(JSON.parse(out.Informations[0].destinataires_qr_json),['character']);}else{assert.equal(out.Missions[0].notes_mj,'!!EFFACER');assert.equal(JSON.parse(out.Missions[0].etapes_json)[0].id,'first');}}
});
