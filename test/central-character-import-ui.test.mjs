import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralImportUi} from '../web/central-import.mjs';
import {readCentralXlsx,writeCentralXlsx} from '../web/central-xlsx.mjs';
import {importFixture} from './support/central-import-suite.mjs';
import {centralCharacterRow} from './support/central-character-import-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
const ui=createCentralImportUi({button:(label,action)=>`<button data-action="${action}">${label}</button>`});
const d={campaign:{id:'c'},workshop:'M2',rights:{editWorkshops:[]},changes:[{type:'character',entityId:'person',operation:'UPSERT',data:{public:{displayName:'<img>'},contentRevision:3}},{type:'speciesCatalogue',entityId:'player',operation:'UPSERT',data:[]}]};
test('Excel M2 UI : sélection limitée aux personnages et révision native',()=>{
 const h=ui.exportForm(d);assert.match(h,/value="person"/);assert.match(h,/&lt;img&gt; · person · r3/);assert.doesNotMatch(h,/value="player"|undefined|<img>/);assert.match(ui.buttons(d),/centralExport/);assert.doesNotMatch(ui.buttons(d),/data-action="centralImport"/);assert.match(ui.buttons({...d,rights:{editWorkshops:['M2']}}),/data-action="centralImport"/);
});
test('Excel M2 UI : instructions expliquent tableaux complets, plan et confidentialité',()=>{
 const h=ui.importForm(d);for(const text of ['JOUEUR','SANS','objectifs_json','relations_json','32 000','tableau entier','éditeur web','privés'])assert.ok(h.includes(text),text);assert.match(h,/accept=".xlsx" required/);assert.doesNotMatch(ui.importForm({...d,workshop:'M1'}),/objectifs_json/);
});
test('Excel M2 UI : aperçu échappe les secrets et situe les références',()=>{
 const h=ui.preview(d,{errors:[],changes:[{id:'person',operation:'MODIFIER',sheet:'Personnages',row:2,fields:[{field:'playerSecrets',before:'Ancien',after:'<script>privé</script>'}]}],diagnostics:[{entityId:'person',field:'creationPlan.speciesId',reference:'<x>',sheet:'Personnages',row:2,column:'espece_id',message:'À préparer'}],confirmation:'hash'},'Fiction.xlsx');assert.match(h,/&lt;script&gt;privé/);assert.match(h,/Personnages ligne 2 · espece_id/);assert.match(h,/name="confirmed"/);assert.doesNotMatch(h,/<script>|<x>/);
});
test('Excel M2 XLSX : textes littéraux et identifiants imbriqués survivent au format',async()=>{
 const f=await importFixture(()=>new MemoryStore());const e=await f.exportFile('M2');e.sheets.Personnages=[{...centralCharacterRow,nom:'=1+1',biographie:'!!EFFACER',notes_mj:'+nom',relations_json:'[]'}];
 const sheets=readCentralXlsx(writeCentralXlsx(e.sheets)),input={campaignId:f.cid,workshop:'M2',fileName:'Fiction.xlsx',sheets};await f.apply(input,await f.prepare(input));const c=(await f.view('M2')).changes[0].data;assert.equal(c.public.displayName,'=1+1');assert.equal(c.biography,'!EFFACER');assert.equal(c.gmNotes,'+nom');assert.equal(c.objectives[0].steps[0].id,'step');
 const out=readCentralXlsx(writeCentralXlsx((await f.exportFile('M2',['person'])).sheets));assert.equal(out.Personnages[0].biographie,'!!EFFACER');assert.equal(out.Personnages[0].nom,'=1+1');
});
