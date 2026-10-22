import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {readMasterXlsx} from '../web/master-xlsx.mjs';
import {masterPreviewHtml,masterPanel} from '../web/masters.mjs';
import {masterFixture} from './support/masters-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
const file=name=>readFile(new URL(`../assets/masters/GN_Engine_${name}.xlsx`,import.meta.url));
test('XLSX : les quatre fichiers livrés sont lisibles et les deux exemples importables',async()=>{
 for(const name of await readdir(new URL('../assets/masters/',import.meta.url))){const sheets=readMasterXlsx(new Uint8Array(await readFile(new URL(`../assets/masters/${name}`,import.meta.url))));assert.equal(sheets.Meta[0].version,'1');for(const tab of ['Lieux','ActionsTerrain','Recompenses','Interactions','Entrepots','Vaisseaux','Routes','Cours','EvenementsEco','Tarifs'])assert.ok(Array.isArray(sheets[tab]));}
 const f=await masterFixture(()=>new MemoryStore());await f.apply(readMasterXlsx(new Uint8Array(await file('Exemple_Campagne'))));const start=await f.session();
 const sheets=readMasterXlsx(new Uint8Array(await file('Exemple_Session')));sheets.Meta[0].campaign_id=start.campaignId;await f.apply(sheets,{scenarioId:undefined,sessionId:start.id});const s=await f.read('session',{sessionId:start.id});assert.equal(s.characters.length,2);assert.equal((await f.store.get(`sessions/${start.id}/cargoTariffs/douane-demo`)).flatAmount,4);assert.equal((await f.store.list(`sessions/${start.id}/cargoTariffs`)).length,3);assert.ok((await f.store.list(`sessions/${start.id}/cargoTariffs`)).every(t=>!t.enabled));assert.equal((await f.store.get(`sessions/${start.id}/warehouses/hangar-demo`)).capacity,25);assert.equal(s.items.find(i=>i.id==='recharge-demo').laserRecharge.pelletsPerUnit,500);assert.equal(s.inventory.reduce((n,l)=>n+l.quantity,0),5);assert.equal(s.accounts.reduce((n,a)=>n+a.balance,0),120);assert.equal((await f.store.list(`sessions/${start.id}/fieldTargets`)).length,3);assert.equal((await f.store.get(`sessions/${start.id}/fieldStates/cache-episode`)).stock['reserve-episode'],2);assert.equal((await f.store.list(`sessions/${start.id}/personProfiles`)).length,5);
});
test('XLSX : formules, entités, colonnes et feuilles étrangères sont refusées avec localisation',async()=>{
 const original=unzipSync(new Uint8Array(await file('Exemple_Campagne')));
 const mutated=fn=>{const files=structuredClone(original);fn(files);return zipSync(files);};
 const worksheet=Object.keys(original).find(k=>/^xl\/worksheets\//.test(k)&&strFromU8(original[k]).includes('gn-engine-master'));
 assert.ok(worksheet);
 assert.throws(()=>readMasterXlsx(mutated(f=>f[worksheet]=strToU8(strFromU8(f[worksheet]).replace('<x:v>1</x:v>','<x:f>1+1</x:f><x:v>1</x:v>')))),/formule/);
 assert.throws(()=>readMasterXlsx(mutated(f=>f['xl/workbook.xml']=strToU8(strFromU8(f['xl/workbook.xml']).replace('?>','?><!DOCTYPE w [<!ENTITY x SYSTEM "file:///etc/passwd">]>')))),/XML/);
 assert.throws(()=>readMasterXlsx(mutated(f=>f['xl/workbook.xml']=strToU8(strFromU8(f['xl/workbook.xml']).replace('name="Personnages"','name="OngletInconnu"')))),/Onglet/);
 assert.throws(()=>readMasterXlsx(mutated(f=>f[worksheet]=strToU8(strFromU8(f[worksheet]).replace('destination_id','balance')))),/Colonne/);
 assert.throws(()=>readMasterXlsx(new Uint8Array(8*1024*1024+1)),/8 Mio/);
});
test('Masters UI : erreurs bloquantes, différences échappées et import réservé au propriétaire',()=>{
 const p={errors:[{sheet:'<script>',row:4,column:'nom',message:'Corriger'}],changes:[{sheet:'Personnages',row:2,id:'abc',status:'UPDATE',fields:[{field:'nom',before:'Ancien',after:'<img src=x onerror=alert(1)>'}]}],canApply:false};const html=masterPreviewHtml(p);
 assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('ligne 4'));assert.ok(!html.includes('data-master-form="confirm"'));
 assert.equal(masterPanel({role:'MJ'},'session'),'');const panel=masterPanel({role:'OWNER',stage:'EN_JEU'},'session');assert.ok(!panel.includes('data-master-action="open"'));assert.ok(panel.includes('Historique des imports'));
});
