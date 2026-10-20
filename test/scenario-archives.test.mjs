import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {archiveSuite,archiveFixture} from './support/scenario-archive-suite.mjs';
import {cleanScenarioPackage} from '../src/core/scenario-package.mjs';
import {readScenarioArchive,packScenarioArchive} from '../web/scenario-archive-format.mjs';
import {zipSync} from 'fflate';
import sharp from 'sharp';
import {randomBytes} from 'node:crypto';
import {processImage} from '../src/adapters/media-images.mjs';
import {createWorkflow} from '../src/core/workflow.mjs';
archiveSuite(()=>new MemoryStore());
test('Fichier de scénario : ZIP complet, empreintes, traversée et compression non prévues',async()=>{
  const f=await archiveFixture(()=>new MemoryStore()),b=await f.exportPackage(),files=Object.fromEntries(b.manifest.images.map(a=>[a.source.path,b.files.get(a.id)])),bytes=await packScenarioArchive(b.manifest,files),read=await readScenarioArchive(bytes);assert.deepEqual(cleanScenarioPackage(read.manifest),cleanScenarioPackage(b.manifest));
  const altered=structuredClone(files);altered[Object.keys(altered)[0]][0]^=1;const invalid=zipSync({'manifest.json':new TextEncoder().encode(JSON.stringify(b.manifest)),...altered},{level:0});await assert.rejects(readScenarioArchive(invalid),{code:'SCENARIO_FILE_MISMATCH'});
  const path=zipSync({'../secret':new Uint8Array([1])},{level:0});await assert.rejects(readScenarioArchive(path),{code:'INVALID_SCENARIO_PACKAGE'});await assert.rejects(readScenarioArchive(zipSync({'manifest.json':new TextEncoder().encode(JSON.stringify(b.manifest))},{level:6})),{code:'INVALID_SCENARIO_PACKAGE'});
});
test('Import sans images : disponible sans Storage, identités et champs d’exécution exclus',async()=>{
  const f=await archiveFixture(()=>new MemoryStore()),b=await f.exportPackage();b.manifest.images=[];for(const c of b.manifest.records.characters){delete c.mediaImages;if(c.startingInventory)delete c.startingInventory.items[0].item.mediaImages;c.assignedUid='identite-interdite';c.sessionId='session-interdite';}for(const i of b.manifest.records.items)delete i.mediaImages;
  const job=await f.begin(b),withoutStorage=createWorkflow({store:f.store,ownerEmail:f.owner.email}),result=await withoutStorage.dispatch('commitScenarioImport',f.owner,{importId:job.id}),s=await f.read('scenario',{scenarioId:result.id});assert.equal(JSON.stringify(s).includes('identite-interdite'),false);assert.equal(JSON.stringify(s).includes('session-interdite'),false);
});
test('Source archivée : image normalisée de plus de 5 Mio conservée exactement, métadonnées refusées',async()=>{
  const data=await sharp(randomBytes(1200*1200*4),{raw:{width:1200,height:1200,channels:4}}).png({compressionLevel:0}).toBuffer();assert.ok(data.length>5*1024*1024);
  await assert.rejects(processImage(data.toString('base64')),{code:'INVALID_IMAGE'});
  const processed=await processImage(data.toString('base64'),{fileBytes:16*1024*1024,preserveSource:true});assert.deepEqual(processed.variants.original.data,data);
  const privateExif=await sharp(data).withExif({IFD0:{Artist:'PRIVATE'}}).png().toBuffer();await assert.rejects(processImage(privateExif.toString('base64'),{fileBytes:16*1024*1024,preserveSource:true}),{code:'INVALID_IMAGE'});
});
test('Archive refusée avant écriture : limites de manifeste et identifiants dupliqués',async()=>{
  const f=await archiveFixture(()=>new MemoryStore()),b=await f.exportPackage(),bad=structuredClone(b.manifest);bad.records.characters.push(bad.records.characters[0]);await assert.rejects(f.begin({manifest:bad}),{code:'INVALID_SCENARIO_PACKAGE'});
  await assert.rejects(f.begin({manifest:{...b.manifest,extra:'x'.repeat(2*1024*1024)}}),{code:'SCENARIO_PACKAGE_TOO_LARGE'});assert.equal((await f.read('listScenarioImports')).imports.length,0);
});
test('Snapshots : un catalogue modifié ne réécrit pas les consommables déjà copiés dans les profils',async()=>{
  const f=await archiveFixture(()=>new MemoryStore());await f.mutateScenario('saveItem',{id:f.itemId,name:'Nouveau modèle',kind:'STACKABLE',consumable:false,publicationState:'DRAFT'});const b=await f.exportPackage(),job=await f.begin(b);await f.upload(job.id,b);const result=await f.read('commitScenarioImport',{importId:job.id}),copy=await f.read('scenario',{scenarioId:result.id}),c=copy.characters.find(x=>x.id===f.ids[0]);assert.equal(copy.items[0].consumable,false);assert.equal(c.startingInventory.items[0].item.consumable,true);assert.ok(c.abilityProfile.skills[0].healing.consumable.itemRevision<copy.items[0].revision);
});
