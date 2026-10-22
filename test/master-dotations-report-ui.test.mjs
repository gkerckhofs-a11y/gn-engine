import test from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
import {dotationsProjection} from '../src/core/master-dotations-projection.mjs';
import {dotationsReportSheets} from '../web/master-dotations-report.mjs';
import {moduleListHtml,filteredMasterRows,moduleDraft,moduleFormSheets,moduleMasterSheets} from '../web/master-editor.mjs';
import {writeDotationsReportXlsx,writeMasterXlsx} from '../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../web/master-xlsx.mjs';
const workspace=()=>({...dotationsProjection([
 {id:'a',public:{displayName:'=1+1 <script>'},startingCredits:{amount:0,revision:2},startingInventory:{revision:1,items:[{item:{id:'kit',name:'Kit <privé>',unit:'pièce'},quantity:3}]}},
 {id:'b',public:{displayName:'Sans dotation'},masterArchived:true},
]),meta:[{type:'CAMPAGNE',destination_id:'scenario',campaign_id:'',base_revision:'4'}]});
test('Relevé dotations : filtrage, échappement et aucune action de redistribution',()=>{
 const w=workspace(),html=moduleListHtml(w);assert.match(html,/&lt;script&gt;/);assert.match(html,/Kit &lt;privé&gt;/);assert.match(html,/Crédits de départ : 0/);assert.match(html,/non renseignés/);assert.match(html,/ne peut pas être réimporté/);
 for(const action of ['moduleEdit','moduleDuplicate','moduleArchive','moduleView'])assert.ok(!html.includes(`data-master-action="${action}"`));assert.ok(!html.includes('data-master-form="moduleRow"'));
 assert.equal(filteredMasterRows(w,'kit').length,1);assert.equal(filteredMasterRows(w,'','archived')[0].row.id,'b');
 for(const mode of ['edit','duplicate','archive'])assert.throws(()=>moduleDraft(w,'a',mode),/lecture seule/);assert.throws(()=>moduleFormSheets({...w,editable:true},{},{}),/lecture seule/);assert.throws(()=>moduleMasterSheets(w),/pas un Master/);
 const report=dotationsReportSheets(w,filteredMasterRows(w,'','archived'));assert.equal(report.Releve.length,1);assert.equal(report.Releve[0].credits_configures,'NON');assert.equal(report.Releve[0].credits_depart,'');assert.equal(report.ObjetsDepart.length,0);
});
test('Relevé dotations XLSX : valeurs littérales, périmètre filtré, rejet comme Master et limites',()=>{
 const w=workspace(),bytes=writeDotationsReportXlsx(w,filteredMasterRows(w,'kit')),files=unzipSync(bytes),wb=strFromU8(files['xl/workbook.xml']),row=strFromU8(files['xl/worksheets/sheet2.xml']);
 assert.match(wb,/Notice/);assert.match(wb,/Releve/);assert.match(wb,/ObjetsDepart/);assert.ok(!wb.includes('name="Meta"'));assert.match(row,/=1\+1 &lt;script&gt;/);assert.ok(!row.includes('<f>'));assert.ok(!row.includes('Sans dotation'));
 assert.throws(()=>readMasterXlsx(bytes),{code:'INVALID_MASTER_FILE'});assert.throws(()=>writeMasterXlsx(dotationsReportSheets(w)),/Meta requis/);
 assert.throws(()=>writeDotationsReportXlsx(w,Array(251).fill(w.rows[0])),/limites/);assert.throws(()=>writeDotationsReportXlsx(w,[{...w.rows[0],title:'\u0001'}]),/Valeur non exportable/);
 const ordinary={Meta:[{format:'gn-engine-master',version:'1',type:'CAMPAGNE'}],Dotations:[{id:'d',operation:'CREER',version:'1',personnage_id:'a',type:'CREDIT',quantite:'1'}]};assert.equal(readMasterXlsx(writeMasterXlsx(ordinary)).Dotations[0].id,'d');
});
