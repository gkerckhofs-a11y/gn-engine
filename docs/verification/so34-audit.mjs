// Read-only input audit and disposable MemoryStore probes. No Firebase/network.
// node docs/verification/so34-audit.mjs /absolute/path/SO_Masters_V01.zip
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {unzipSync} from 'fflate';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
import {masterFixture,masterExample} from '../../test/support/masters-suite.mjs';
import {MemoryStore} from '../../test/support/memory.mjs';

assert.ok(process.argv[2], 'Supply the original preparation ZIP');
const source=unzipSync(new Uint8Array(await readFile(process.argv[2])));
const templates=[];
for(const [file,bytes] of Object.entries(source)){
 if(!file.endsWith('.xlsx'))continue;
 let rejection;
 try{readMasterXlsx(bytes);}catch(error){rejection=error.message;}
 assert.ok(rejection, `${file} must not be mistaken for a certified Master`);
 templates.push({file,status:'REJECTED_BY_CURRENT_READER',reason:rejection});
}
assert.equal(templates.length,7);

const f=await masterFixture(()=>new MemoryStore());
await f.apply(masterExample());
const Meta=masterExample().Meta;
const recipe={id:'audit-recipe',operation:'CREER',version:'1',nom:'Audit draft',type:'SCENARIO',niveau_minimum:'1',publication:'DRAFT',composants:'audit-ingredient:1'};
const missing=await f.prepare({Meta,Recettes:[recipe]});
assert.equal(missing.canApply,false);
assert.equal((await f.store.list(`scenarios/${f.scenarioId}/recipes`)).length,0);
const item={id:'audit-ingredient',operation:'CREER',version:'1',nom:'Audit ingredient',type:'STACKABLE',consommable:'OUI',publication:'DRAFT',unite:'unité',categorie:'Audit'};
await f.apply({Meta,Objets:[item],Recettes:[recipe]});
assert.equal((await f.store.list(`scenarios/${f.scenarioId}/recipes`)).length,1);
assert.equal((await f.store.list(`scenarios/${f.scenarioId}/inventory`)).length,0);

const scenario=await f.read('scenario',{scenarioId:f.scenarioId});
const versions=await Promise.all([1,2].map(()=>f.cmd('publishScenario',{scenarioId:f.scenarioId,revision:scenario.revision})));
assert.notEqual(versions[0].id,versions[1].id);
assert.equal((await f.read('scenario',{scenarioId:f.scenarioId})).revision,scenario.revision);
const start=await f.session();
const playedBefore={accounts:await f.store.list(`sessions/${start.id}/accounts`),inventory:await f.store.list(`sessions/${start.id}/inventory`)};
const exported=await f.read('prepareScenarioExport',{scenarioId:f.scenarioId,versionId:versions[0].id});
assert.equal(exported.manifest.images.length,0);
const archive={manifest:exported.manifest,title:'Audit restored copy'};
const preview=await f.read('prepareScenarioImport',archive);
const staged=await f.cmd('beginScenarioImport',{...archive,confirmation:preview.confirmation});
const restored=await f.cmd('commitScenarioImport',{importId:staged.id});
const restoredAgain=await f.cmd('commitScenarioImport',{importId:staged.id});
assert.equal(restored.id,restoredAgain.id);
assert.deepEqual(await f.store.list(`scenarios/${restored.id}/recipes`),await f.store.list(`scenarios/${f.scenarioId}/versions/${versions[0].id}/recipes`));
assert.deepEqual(await f.store.list(`sessions/${start.id}/accounts`),playedBefore.accounts);
assert.deepEqual(await f.store.list(`sessions/${start.id}/inventory`),playedBefore.inventory);

console.log(JSON.stringify({environment:'MemoryStore, synthetic data only',templates,
 observations:{missingReference:{canApply:missing.canApply,errors:missing.errors},combinedImport:'item + recipe DRAFT accepted in one legacy batch',legacyPublish:'two separate request IDs create two snapshots at the same scenario revision; no campaign pointer CAS',archive:'existing version exported, restored as a separate scenario, retry returns same result; session accounts/inventory unchanged'},
 limits:'This is not an MST acceptance run, central publication/rollback proof, complete backup restore, or emulator run.'},null,2));
