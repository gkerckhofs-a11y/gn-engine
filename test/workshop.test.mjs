import test from 'node:test';
import assert from 'node:assert/strict';
import {workshopDashboard,workshopSection,tariffEditorHtml,tariffSheets} from '../web/workshop.mjs';
import {writeMasterXlsx} from '../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../web/master-xlsx.mjs';
import {workshopModules,masterModuleErrors} from '../src/shared/workshop-modules.mjs';
test('Atelier : six modules, état honnête et imports réservés à la préparation du propriétaire',()=>{
 const base={id:'s',title:'<secret>',revision:1,role:'OWNER',permissions:{content:true},masterWorkspace:{editable:true,modules:workshopModules.map(m=>({id:m.id,counts:{}}))}};
 const html=workshopDashboard(base,'session');assert.equal((html.match(/data-workshop-jump=/g)||[]).length,6);assert.equal((html.match(/data-module=/g)||[]).length,6);assert.ok(html.includes('&lt;secret&gt;'));assert.ok(html.includes('restent à développer'));
 assert.ok(!workshopDashboard({...base,masterWorkspace:{...base.masterWorkspace,editable:false}},'session').includes('data-module='));
 assert.ok(!workshopDashboard({...base,role:'MJ',masterWorkspace:undefined},'session').includes('data-module='));
 assert.equal(workshopDashboard({...base,permissions:{content:false}},'session'),'');
 for(const m of workshopModules)assert.ok(workshopSection(m.id,'outils','scenario').includes(`id="workshop-${m.id}"`));
});
test('Export XLSX : cellules littérales, accents, retours à la ligne et XML échappé',()=>{
 const sheets={Meta:[{format:'gn-engine-master',version:'1',type:'CAMPAGNE',module:'economie'}],Tarifs:[{id:'a',operation:'MODIFIER',version:'2',titre:'=HYPERLINK("https://example.invalid")',description:'  Économie <>&"\nLigne 2  '}]};
 const result=readMasterXlsx(writeMasterXlsx(sheets));assert.equal(result.Meta[0].module,'economie');assert.equal(result.Tarifs[0].titre,sheets.Tarifs[0].titre);assert.equal(result.Tarifs[0].description,sheets.Tarifs[0].description);
 assert.throws(()=>writeMasterXlsx({...sheets,Tarifs:[{...sheets.Tarifs[0],balance:20}]}),/Colonne inconnue/);
 assert.throws(()=>writeMasterXlsx({...sheets,Tarifs:[{...sheets.Tarifs[0],titre:'\u0000'}]}),/non exportable/);
});
test('Atelier : aucune copie de catalogue et toutes les feuilles métier ont un module unique',()=>{
 const sheets=workshopModules.flatMap(m=>m.sheets);assert.equal(new Set(sheets).size,sheets.length);
 assert.equal(masterModuleErrors({Meta:[{module:'economie'}],Tarifs:[],Objets:[]},'economie').length,0);
 assert.equal(masterModuleErrors({Meta:[{module:'magasins'}],Tarifs:[]},'economie').length,1);
});
test('Formulaire tarifs : aucun prix imposé, valeurs existantes et bénéficiaires échappés',()=>{
 const w={newTariff:{id:'nouveau',version:'1'},tariffs:[],items:[],beneficiaries:[]},html=tariffEditorHtml(w);
 assert.match(html,/name="montant_fixe"[^>]+value=""/);assert.match(html,/name="montant_unitaire"[^>]+value=""/);
 w.tariffs=[{archived:true,row:{id:'ancien',version:'5',titre:'<script>',beneficiaire_type:'SINK'}}];assert.ok(tariffEditorHtml(w,'ancien').includes('&lt;script&gt;'));
 assert.deepEqual(tariffSheets(w).Tarifs,[{id:'ancien',operation:'ARCHIVER',version:'5'}]);
});
