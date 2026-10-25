import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCentralSnapshotUi,centralSnapshotFile} from '../web/central-snapshots.mjs';
import {createCentralUi} from '../web/central-master.mjs';
import {MemoryStore} from './support/memory.mjs';
import {centralSnapshotsFixture} from './support/central-snapshots-suite.mjs';
const helpers={button:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`};
const ui=createCentralSnapshotUi(helpers);
test('Instantanés centraux UI : aperçu réel, confirmation et périmètre explicites',async()=>{
 const f=await centralSnapshotsFixture(()=>new MemoryStore(),{full:true}),p=await f.preview(),html=ui.preview(p);
 assert.match(html,/Révision 8 · 8 définitions/);assert.match(html,/name="reason" maxlength="500" required/);assert.match(html,/name="confirmed" required/);assert.ok(html.includes(p.confirmation));assert.match(html,/ne remplace pas une sauvegarde complète/);assert.match(html,/Le brouillon demeure modifiable/);
});
test('Instantanés centraux UI : relecture historique, textes échappés et copie complète',async()=>{
 const f=await centralSnapshotsFixture(()=>new MemoryStore());await f.save();const out=await f.capture(await f.preview(1),{reason:'<script>Motif</script>'});await f.save({draftRevision:1,itemRevision:1});const d=await f.saved(out.id),html=ui.detail(d),list=ui.list({...await f.list(),hasMore:true}),file=JSON.parse(centralSnapshotFile(d));
 assert.match(html,/révision 2/);assert.match(html,/rapport ci-dessous est historique/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/centralSnapshotDownload/);assert.match(html,/récits et secrets/);assert.match(list,/vingt instantanés/);assert.ok(list.includes(out.id));assert.deepEqual(file.changes,d.changes);assert.deepEqual(file.report,d.report);assert.deepEqual(file.manifest,d.header);assert.equal(file.format,'gn-engine-central-snapshot');
});
test('Instantanés centraux UI : commandes réservées au propriétaire et lecture contrôlée',async()=>{
 const f=await centralSnapshotsFixture(()=>new MemoryStore()),d=await f.view(),central=createCentralUi(helpers);
 assert.match(central.page(d),/data-action="centralSnapshotPreview"/);assert.match(central.page(d),/Instantanés conservés/);const reader={...d,rights:{...d.rights,manageStaff:false}};assert.doesNotMatch(central.page(reader),/data-action="centralSnapshotPreview"/);assert.match(central.page(reader),/Instantanés conservés/);assert.doesNotMatch(central.page({...reader,rights:{...reader.rights,checkCentral:false}}),/Instantanés conservés/);
});
test('Instantanés centraux UI : téléchargement relu par API et réponses tardives écartées',()=>{
 const source=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');
 assert.match(source,/if\(a==='centralSnapshotDownload'\)\{const d=await api\('centralSnapshot',\{campaignId:b.dataset.cid,snapshotId:b.dataset.id\}\);if\(actionVersion!==routeVersion\)return;/);
 assert.match(source,/if\(v.confirmed!=='on'\)return;const d=await mutate\('captureCentralSnapshot',\{campaignId:form.dataset.cid,draftRevision:Number\(form.dataset.draft\),confirmation:form.dataset.confirmation,reason:v.reason\}\);if\(submitVersion!==routeVersion\)return;/);
 assert.match(source,/if\(render.current\(\)\)render\(snapshotId\?centralSnapshotUi.detail\(d\)\+centralCheckUi.page\(d.report\)/);
});
