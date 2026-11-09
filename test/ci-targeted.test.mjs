import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {requestedTarget,isTargetedCommit,targetedScope,targetedProfiles} from '../scripts/ci-targeted.mjs';
import {makePlan} from '../scripts/ci-plan.mjs';
import {applicationCommand,httpCommand,testCommand} from '../scripts/ci-run-tests.mjs';
import {matrixFor,selectFirestoreSuites} from '../scripts/ci-scope.mjs';
const candidate='b'.repeat(40),checkout='c'.repeat(40),base='a'.repeat(40),partial='d'.repeat(40);
const environment={GITHUB_REPOSITORY:'owner/repo',GITHUB_REF_NAME:'work/test',GITHUB_RUN_ID:'30',GITHUB_EVENT_NAME:'pull_request'};
const event={action:'synchronize',pull_request:{draft:true,head:{sha:candidate,ref:'work/test',repo:{full_name:'owner/repo'}}}};
const run=(sha,id)=>({head_sha:sha,id,run_number:id,status:'completed',conclusion:'success',event:'pull_request',head_branch:'work/test',head_repository:{full_name:'owner/repo'}});
function options({message='change [ci targeted:ci]',paths=['scripts/ci-plan.mjs'],runs=[run(base,10)],messages={},env=environment,payload=event}={}){
 const calls=[];return {calls,args:{env,event:payload,fetchRuns:async()=>runs,gitCommand:(...args)=>{calls.push(args);if(args[0]==='rev-parse')return checkout;if(args[0]==='log')return args.at(-1)===candidate?message:messages[args.at(-1)]??'validated global change';if(args[0]==='merge-base')return '';if(args[0]==='diff')return paths.join('\0');throw Error('Unexpected git operation');}}};
}
test('CI ciblée : activation explicite, noms fermés et ambiguïtés refusées',()=>{
 assert.equal(requestedTarget('normal change'),null);assert.equal(requestedTarget('change [ci targeted:ci]'),'ci');assert.equal(requestedTarget('[ci targeted:diagnostic]'),'diagnostic');
 for(const m of ['[ci targeted:unknown]','[ci targeted:ci] [ci targeted:ci]','[ci targeted:ci','[ci targeted:ci] [ci targeted:bad]'])assert.throws(()=>requestedTarget(m));
 assert.ok(isTargetedCommit('[ci targeted:future]'));
});
test('CI ciblée : profil infrastructure ne sélectionne que ses tests sans Firebase/HTTP/navigateur',async()=>{
 const p=await makePlan(options().args);assert.equal(p.profile,'targeted-ci');assert.equal(p.baseline,base);assert.deepEqual(p.applicationTests,['test/ci-selection.test.mjs','test/ci-targeted.test.mjs']);assert.deepEqual(p.suites,[]);assert.deepEqual(p.matrix,[]);assert.equal(p.http,false);assert.equal(p.browser,false);
});
test('CI ciblée : chaque périmètre refuse un fichier extérieur et une base non vérifiée',()=>{
 for(const name of ['ci','diagnostic']){assert.throws(()=>targetedScope(name,[],{}));for(const path of ['src/core/workflow.mjs','src/core/field-actions.mjs','src/core/space-outlaws-entry.mjs','package.json','firestore.rules','src/new.mjs'])assert.throws(()=>targetedScope(name,[path],{reliableBase:true}));}
 assert.throws(()=>targetedScope('ci',['web/field-actions.mjs'],{reliableBase:true}));assert.equal(targetedScope('ci',['docs/notes.md','AGENTS.md'],{reliableBase:true}).profile,'targeted-ci');
});
test('CI ciblée : diagnostic garde ses dépendances explicites et uniquement son parcours HTTP',()=>{
 const p=targetedScope('diagnostic',['src/core/space-technical-analysis.mjs','web/field-actions.mjs'],{reliableBase:true});
 for(const id of ['space-technical-analysis','space-outlaws-actions','field','action-points','knowledge','space-episodes','central-field-targets'])assert.ok(p.suites.includes(id));
 const selected=matrixFor(p.suites).flatMap(({shard})=>selectFirestoreSuites({GN_FIRESTORE_SUITES:JSON.stringify(p.suites),GN_FIRESTORE_SHARD:shard}));assert.deepEqual(selected.map(s=>s.id).sort(),[...p.suites].sort());assert.equal(p.http,true);assert.equal(p.browser,false);assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : diagnostic MEC-01 préparé, PA, carnet privé'));assert.ok(!new RegExp(p.httpPattern).test('HTTP + Auth : duel spatial'));
 for(const file of p.applicationTests)assert.ok(existsSync(file),file);
});
test('CI ciblée : catalogue modules couvre M1, snapshots, inventaire, publication et comptoir sans atelier actif',()=>{
 const name='module-catalog',profile=targetedProfiles[name],p=targetedScope(name,['src/shared/space-ship-modules.mjs','src/core/inventory-state.mjs','src/core/space-outlaws-entry.mjs'],{reliableBase:true});
 assert.equal(requestedTarget('[ci targeted:module-catalog]'),name);assert.throws(()=>targetedScope(name,[],{}));
 for(const path of ['src/core/shops.mjs','src/core/space-maintenance.mjs','src/core/space-combat.mjs','src/core/workflow.mjs','src/core/field-actions.mjs','package.json'])assert.throws(()=>targetedScope(name,[path],{reliableBase:true}));
 for(const id of ['space-ship-module-catalog','central-master','central-import','central-snapshots','central-class-kits','central-shops','inventory','space-outlaws-entry','space-outlaws-shops'])assert.ok(p.suites.includes(id));
 for(const file of p.applicationTests)assert.ok(existsSync(file),file);
 const selected=matrixFor(p.suites).flatMap(({shard})=>selectFirestoreSuites({GN_FIRESTORE_SUITES:JSON.stringify(p.suites),GN_FIRESTORE_SHARD:shard}));assert.deepEqual(selected.map(s=>s.id).sort(),[...p.suites].sort());
 for(const title of ['modules M1 calibrés,','Master central,','XLSX central,'])assert.ok(new RegExp(p.httpPattern).test(`HTTP + Auth : ${title}`));
 assert.ok(!new RegExp(p.httpPattern).test('HTTP + Auth : duel spatial'));assert.equal(p.browser,false);
 assert.deepEqual(testCommand('http',{GN_CI_PROFILE:'targeted-module-catalog',GN_HTTP_PATTERN:JSON.stringify(profile.httpPattern)}).args,['--test',`--test-name-pattern=${profile.httpPattern}`,'test/integration/http.test.mjs']);
 assert.deepEqual(testCommand('application',{GN_CI_PROFILE:'targeted-module-catalog',GN_APPLICATION_TESTS:JSON.stringify(profile.tests)}).args,['--test',...profile.tests]);
});
test('CI ciblée : achat modules garde les dépendances financières, vente, voyages et reprise sans ouvrir le montage',()=>{
 const name='module-purchases',profile=targetedProfiles[name],p=targetedScope(name,['src/core/shops.mjs','src/core/space-outlaws-entry.mjs','web/shops.mjs'],{reliableBase:true});
 assert.equal(requestedTarget('[ci targeted:module-purchases]'),name);assert.throws(()=>targetedScope(name,[],{}));
 for(const path of ['src/core/space-maintenance.mjs','src/core/space-combat.mjs','src/core/workflow.mjs','src/core/economy-state.mjs','package.json'])assert.throws(()=>targetedScope(name,[path],{reliableBase:true}));
 for(const id of ['space-module-purchases','space-ship-module-catalog','space-outlaws-shops','inventory','economy','sales','space-episodes','space-outlaws-voyages'])assert.ok(p.suites.includes(id));
 for(const file of p.applicationTests)assert.ok(existsSync(file),file);
 assert.equal(new Set(p.applicationTests).size,p.applicationTests.length);assert.equal(new Set(p.suites).size,p.suites.length);assert.equal(p.browser,false);
 assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : achat de module calibré, crédits ordinaires'));assert.ok(!new RegExp(p.httpPattern).test('HTTP + Auth : duel spatial'));
 assert.deepEqual(testCommand('application',{GN_CI_PROFILE:`targeted-${name}`,GN_APPLICATION_TESTS:JSON.stringify(profile.tests)}).args,['--test',...profile.tests]);assert.deepEqual(testCommand('http',{GN_CI_PROFILE:`targeted-${name}`,GN_HTTP_PATTERN:JSON.stringify(profile.httpPattern)}).args,['--test',`--test-name-pattern=${profile.httpPattern}`,'test/integration/http.test.mjs']);
});
test('CI ciblée : mandats incluent routage, capacité restreinte et entretien sans installation',()=>{
 const name='module-mandates',profile=targetedProfiles[name],p=targetedScope(name,['src/core/workflow.mjs','src/core/space-module-mandates.mjs','src/core/space-outlaws-entry-guard.mjs','web/app.mjs'],{reliableBase:true});
 assert.equal(requestedTarget('[ci targeted:module-mandates]'),name);assert.throws(()=>targetedScope(name,[],{}));
 for(const path of ['src/core/space-combat.mjs','src/core/economy-state.mjs','src/core/space-outlaws-voyages.mjs','package.json'])assert.throws(()=>targetedScope(name,[path],{reliableBase:true}));
 for(const id of ['space-module-mandates','space-module-purchases','space-logistics','workflow','space-ship-names','space-episodes','inventory'])assert.ok(p.suites.includes(id));
 for(const file of p.applicationTests)assert.ok(existsSync(file),file);assert.equal(new Set(p.applicationTests).size,p.applicationTests.length);assert.equal(p.browser,false);
 assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : mandat de module, accord privé'));assert.ok(!new RegExp(p.httpPattern).test('HTTP + Auth : duel spatial'));
 assert.deepEqual(testCommand('application',{GN_CI_PROFILE:`targeted-${name}`,GN_APPLICATION_TESTS:JSON.stringify(profile.tests)}).args,['--test',...profile.tests]);assert.deepEqual(testCommand('http',{GN_CI_PROFILE:`targeted-${name}`,GN_HTTP_PATTERN:JSON.stringify(profile.httpPattern)}).args,['--test',`--test-name-pattern=${profile.httpPattern}`,'test/integration/http.test.mjs']);
});
test('CI ciblée : travaux modules ajoutent les réserves PA, le terrain et l’interruption sans effets spatiaux',()=>{
 const name='module-work',profile=targetedProfiles[name],p=targetedScope(name,['src/core/space-module-work.mjs','src/core/space-module-mandates.mjs','src/core/workflow.mjs'],{reliableBase:true});
 assert.equal(requestedTarget('[ci targeted:module-work]'),name);assert.throws(()=>targetedScope(name,[],{}));
 for(const path of ['src/core/space-combat.mjs','src/core/space-outlaws-voyages.mjs','src/core/action-point-state.mjs','src/core/economy-state.mjs','package.json'])assert.throws(()=>targetedScope(name,[path],{reliableBase:true}));
 for(const id of ['space-module-work','space-module-mandates','action-points','field','space-logistics','inventory','space-episodes'])assert.ok(p.suites.includes(id));for(const file of p.applicationTests)assert.ok(existsSync(file),file);
 assert.equal(new Set(p.applicationTests).size,p.applicationTests.length);assert.equal(p.browser,false);assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : travail de module, réserve personnelle'));assert.ok(!new RegExp(p.httpPattern).test('HTTP + Auth : duel spatial'));
 assert.deepEqual(testCommand('application',{GN_CI_PROFILE:`targeted-${name}`,GN_APPLICATION_TESTS:JSON.stringify(profile.tests)}).args,['--test',...profile.tests]);assert.deepEqual(testCommand('http',{GN_CI_PROFILE:`targeted-${name}`,GN_HTTP_PATTERN:JSON.stringify(profile.httpPattern)}).args,['--test',`--test-name-pattern=${profile.httpPattern}`,'test/integration/http.test.mjs']);
});
test('CI ciblée : un succès partiel est ignoré comme référence même sans métadonnée de profil API',async()=>{
 const {args,calls}=options({runs:[run(partial,20),run(base,10)],messages:{[partial]:'feature [ci targeted:diagnostic]'}}),p=await makePlan(args);assert.equal(p.baseline,base);assert.equal(p.baselineRun,10);assert.deepEqual(calls.find(c=>c[0]==='diff'),['diff','--no-renames','--name-only','-z',base,checkout]);
 const normal=await makePlan(options({message:'normal',runs:[run(partial,20),run(base,10)],messages:{[partial]:'feature [ci targeted:ci]'},paths:['src/core/workflow.mjs']}).args);assert.equal(normal.baseline,base);assert.equal(normal.profile,'full');
});
test('CI ciblée : absence de succès global, fork ou fichier inconnu échoue sans lancer le complet',async()=>{
 await assert.rejects(makePlan(options({runs:[]}).args));await assert.rejects(makePlan(options({runs:[run(partial,20)],messages:{[partial]:'partial [ci targeted:ci]'}}).args));await assert.rejects(makePlan(options({paths:['src/new.mjs']}).args));await assert.rejects(makePlan(options({payload:{...event,pull_request:{...event.pull_request,head:{...event.pull_request.head,repo:{full_name:'fork/repo'}}}}}).args));
});
test('CI ciblée : main, manuel, PR prête et ci full conservent la validation complète prioritaire',async()=>{
 for(const extra of [{env:{...environment,GITHUB_EVENT_NAME:'push'}},{env:{...environment,GITHUB_EVENT_NAME:'workflow_dispatch'}},{payload:{...event,action:'ready_for_review'}},{payload:{...event,pull_request:{...event.pull_request,draft:false}}},{message:'[ci targeted:ci] [ci full]'}]){const p=await makePlan(options(extra).args);assert.equal(p.profile,'full');assert.equal(p.applicationTests,null);assert.equal(p.httpPattern,null);assert.equal(p.http,true);assert.equal(p.browser,true);assert.equal(p.matrix.length,6);}
});
test('CI ciblée : exécution applicative sans shell, fichiers absents ou sélection vide refusés',()=>{
 const p=targetedProfiles.ci.tests,cmd=applicationCommand(JSON.stringify(p));assert.equal(cmd.command,process.execPath);assert.deepEqual(cmd.args,['--test',...p]);assert.deepEqual(applicationCommand('null'),{command:'npm',args:['test']});
 for(const raw of ['[]','{}','["--test"]','["test/../private.test.mjs"]','["test/ci-selection.test.mjs","test/ci-selection.test.mjs"]','["test/unknown.test.mjs"]','["test/x;touch.test.mjs"]','invalid'])assert.throws(()=>applicationCommand(raw));
});
test('CI ciblée : filtre HTTP transmis comme argument Node unique et profils fermés',()=>{
 const pattern=targetedProfiles.diagnostic.httpPattern;assert.deepEqual(httpCommand(JSON.stringify(pattern)).args,['--test',`--test-name-pattern=${pattern}`,'test/integration/http.test.mjs']);assert.deepEqual(httpCommand('null').args,['--test','test/integration/http.test.mjs']);assert.throws(()=>httpCommand(JSON.stringify(pattern),()=>"test('HTTP + Auth : autre parcours',()=>{});"),/matches no declared test/);for(const p of ['.*','$(env)','; env',''])assert.throws(()=>httpCommand(JSON.stringify(p)));
});
test('CI ciblée : une sélection manquante ou divergente échoue plutôt que lancer tous les tests',()=>{
 for(const mode of ['application','http'])assert.throws(()=>testCommand(mode,{GN_CI_PROFILE:'targeted-diagnostic'}));
 assert.throws(()=>testCommand('application',{GN_CI_PROFILE:'targeted-ci',GN_APPLICATION_TESTS:'["test/ci-selection.test.mjs"]'}));assert.throws(()=>testCommand('http',{GN_CI_PROFILE:'full',GN_HTTP_PATTERN:JSON.stringify(targetedProfiles.diagnostic.httpPattern)}));assert.throws(()=>testCommand('application',{GN_CI_PROFILE:'targeted-unknown',GN_APPLICATION_TESTS:'[]'}));
 assert.deepEqual(testCommand('application',{GN_CI_PROFILE:'targeted-ci',GN_APPLICATION_TESTS:JSON.stringify(targetedProfiles.ci.tests)}).args,['--test',...targetedProfiles.ci.tests]);assert.deepEqual(testCommand('application',{GN_CI_PROFILE:'full',GN_APPLICATION_TESTS:'null'}),{command:'npm',args:['test']});
});
test('CI ciblée : workflow transmet les sélections et limite Chromium aux profils qui le demandent',()=>{
 const y=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');assert.match(y,/GN_APPLICATION_TESTS: \$\{\{ needs\.plan\.outputs\.applicationTests \}\}/);assert.match(y,/GN_HTTP_PATTERN: \$\{\{ needs\.plan\.outputs\.httpPattern \}\}/);assert.equal((y.match(/GN_CI_PROFILE: \$\{\{ needs\.plan\.outputs\.profile \}\}/g)??[]).length,2);assert.match(y,/node scripts\/ci-run-tests\.mjs application/);assert.match(y,/node scripts\/ci-run-tests\.mjs http/);assert.equal((y.match(/if: needs\.plan\.outputs\.browser == 'true'/g)??[]).length,2);
});

test('CI ciblée : montage à quai inclut inventaire, PA, entretiens, vols, convois et continuité',()=>{
 const p=targetedScope('module-installation',['src/core/inventory.mjs','src/core/space-outlaws-voyages.mjs','src/core/space-convoy.mjs','src/core/space-module-work.mjs'],{reliableBase:true});for(const id of ['space-module-installation','space-module-work','space-module-mandates','space-logistics','space-outlaws-voyages','space-convoy','inventory','action-points','space-episodes'])assert.ok(p.suites.includes(id));assert.equal(p.browser,false);assert.equal(new Set(p.applicationTests).size,p.applicationTests.length);assert.ok(p.applicationTests.length<=40);for(const file of p.applicationTests)assert.ok(existsSync(file));assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : montage de module, finalisation'));assert.ok(!new RegExp(p.httpPattern).test('HTTP + Auth : duel spatial'));for(const path of ['src/core/space-combat.mjs','src/core/economy-state.mjs','package.json'])assert.throws(()=>targetedScope('module-installation',[path],{reliableBase:true}));
});

test('CI ciblée : retrait modules inclut le parcours de montage et ses dépendances financières et spatiales',()=>{
 const p=targetedScope('module-removal',['src/core/space-module-mandates.mjs','src/core/space-module-work.mjs','test/support/space-module-removal-suite.mjs'],{reliableBase:true});assert.ok(p.applicationTests.length<=40);for(const id of ['space-module-removal','space-module-installation','space-module-work','space-module-mandates','space-episodes','inventory','space-logistics','space-outlaws-voyages','space-convoy'])assert.ok(p.suites.includes(id));assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : retrait de module, consentement'));assert.equal(p.browser,false);for(const file of p.applicationTests)assert.ok(existsSync(file));assert.throws(()=>targetedScope('module-removal',['src/core/space-combat.mjs'],{reliableBase:true}));
});

test('CI ciblée : canon lourd couvre adaptateur, duels, flottes et acquis modules sans ouvrir les vols',()=>{
 const p=targetedScope('module-combat',['src/core/space-combat.mjs','test/support/space-encounters-suite.mjs','test/support/space-convoy-suite.mjs'],{reliableBase:true});
 assert.equal(requestedTarget('[ci targeted:module-combat]'),'module-combat');assert.equal(p.browser,false);
 assert.deepEqual(testCommand('application',{GN_CI_PROFILE:'targeted-module-combat',GN_APPLICATION_TESTS:JSON.stringify(p.applicationTests)}).args,['--test',...p.applicationTests]);
 assert.equal(applicationCommand(JSON.stringify(Array.from({length:100},(_,i)=>`test/example-${i}.test.mjs`)),()=>true).args.length,101);assert.throws(()=>applicationCommand(JSON.stringify(Array.from({length:101},(_,i)=>`test/example-${i}.test.mjs`)),()=>true));
 for(const id of ['space-module-removal','space-encounters','space-convoy','space-escort-maneuvers','space-alliance-convoy','space-alliance-duels','space-alliance-defense'])assert.ok(p.suites.includes(id));
 for(const file of p.applicationTests)assert.ok(existsSync(file),file);assert.equal(new Set(p.applicationTests).size,p.applicationTests.length);
 const selected=matrixFor(p.suites).flatMap(({shard})=>selectFirestoreSuites({GN_FIRESTORE_SUITES:JSON.stringify(p.suites),GN_FIRESTORE_SHARD:shard}));assert.deepEqual(selected.map(s=>s.id).sort(),[...p.suites].sort());
 for(const title of ['duel privé,','convoi consenti,','alliance contre convoi à quatre,','retrait de module,'])assert.ok(new RegExp(p.httpPattern).test(`HTTP + Auth : ${title}`));
 assert.throws(()=>targetedScope('module-removal',['src/core/space-combat.mjs'],{reliableBase:true}));assert.throws(()=>targetedScope('module-combat',['src/core/economy-state.mjs'],{reliableBase:true}));
});

test('CI ciblée : vols équipés, événement, reprise, entretien et détour passent par l’exécuteur réel',()=>{
 const p=targetedScope('module-flight',['src/core/space-module-flight.mjs','src/core/space-detours.mjs','test/support/space-module-flight-suite.mjs'],{reliableBase:true});
 for(const file of p.applicationTests)assert.ok(existsSync(file),file);assert.equal(new Set(p.applicationTests).size,p.applicationTests.length);assert.ok(p.applicationTests.length<=64);assert.equal(p.browser,false);
 assert.deepEqual(testCommand('application',{GN_CI_PROFILE:'targeted-module-flight',GN_APPLICATION_TESTS:JSON.stringify(p.applicationTests)}).args,['--test',...p.applicationTests]);
 for(const id of ['space-module-flight','space-logistics','space-convoy','space-encounters','space-detours','space-transport','space-episodes'])assert.ok(p.suites.includes(id));
 const selected=matrixFor(p.suites).flatMap(({shard})=>selectFirestoreSuites({GN_FIRESTORE_SUITES:JSON.stringify(p.suites),GN_FIRESTORE_SHARD:shard}));assert.deepEqual(selected.map(s=>s.id).sort(),[...p.suites].sort());
 assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : vol équipé, lecture privée'));assert.throws(()=>targetedScope('module-combat',['src/core/space-module-flight.mjs'],{reliableBase:true}));
});

test('CI ciblée : MOD-04 préparatoire inclut M1, publication, commerce, mandats et vols existants',()=>{
 const p=targetedScope('hidden-catalog',['src/shared/space-ship-modules.mjs','src/core/space-outlaws-entry.mjs','src/core/space-module-mandates.mjs','src/core/space-outlaws-shop-state.mjs','web/central-master.mjs'],{reliableBase:true});
 assert.equal(requestedTarget('[ci targeted:hidden-catalog]'),'hidden-catalog');assert.equal(p.browser,false);for(const id of ['space-ship-module-catalog','central-master','central-import','space-outlaws-entry','space-module-purchases','space-module-mandates','space-module-flight'])assert.ok(p.suites.includes(id));
 assert.deepEqual(testCommand('application',{GN_CI_PROFILE:'targeted-hidden-catalog',GN_APPLICATION_TESTS:JSON.stringify(p.applicationTests)}).args,['--test',...p.applicationTests]);assert.throws(()=>targetedScope('hidden-catalog',['src/core/customs.mjs'],{reliableBase:true}));
});

test('CI ciblée : fret caché préparatoire couvre cargo natif, abordage, droits, PA et reprise sans navigateur',()=>{
 const p=targetedScope('hidden-inspection',['src/core/space-hidden-cargo.mjs','src/core/cargo-batches.mjs','src/core/space-boarding-cargo.mjs'],{reliableBase:true});
 assert.equal(requestedTarget('[ci targeted:hidden-inspection]'),'hidden-inspection');assert.equal(p.applicationTests.length,64);assert.equal(p.browser,false);
 for(const id of ['space-hidden-cargo','cargo','space-boarding-cargo','space-module-flight','space-logistics','space-episodes'])assert.ok(p.suites.includes(id));
 assert.deepEqual(testCommand('application',{GN_CI_PROFILE:p.profile,GN_APPLICATION_TESTS:JSON.stringify(p.applicationTests)}).args,['--test',...p.applicationTests]);
 assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : fret caché préparatoire, droits et inspection'));assert.throws(()=>targetedScope('hidden-inspection',['src/core/customs.mjs'],{reliableBase:true}));
 const selected=matrixFor(p.suites).flatMap(({shard})=>selectFirestoreSuites({GN_FIRESTORE_SUITES:JSON.stringify(p.suites),GN_FIRESTORE_SHARD:shard}));assert.deepEqual(selected.map(s=>s.id).sort(),[...p.suites].sort());
});

test('CI ciblée : retrait MOD-04 garde le composant, mandats, travaux et profil natifs dans le même périmètre',()=>{
 const p=targetedScope('hidden-removal',['src/core/space-module-mandates.mjs','src/core/space-module-work.mjs','web/space-module-mandates.mjs','test/support/space-hidden-cargo-suite.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:hidden-removal]'),'hidden-removal');assert.equal(p.applicationTests.length,64);assert.equal(p.suites.length,37);assert.equal(p.browser,false);for(const id of ['space-hidden-cargo','space-module-mandates','space-module-work','space-module-removal','space-module-flight','cargo'])assert.ok(p.suites.includes(id));assert.deepEqual(testCommand('application',{GN_CI_PROFILE:p.profile,GN_APPLICATION_TESTS:JSON.stringify(p.applicationTests)}).args,['--test',...p.applicationTests]);assert.throws(()=>targetedScope('hidden-removal',['src/core/customs.mjs'],{reliableBase:true}));
});

test('CI ciblée : interface fret/douane avec liens cargo et protocole, sélection bornée sans navigateur',()=>{
 const p=targetedScope('hidden-ui',['web/space-hidden-cargo.mjs','web/cargo.mjs','web/app.mjs','web/player-spaces.mjs','src/core/cargo.mjs','src/core/space-hidden-cargo.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:hidden-ui]'),'hidden-ui');assert.equal(p.applicationTests.length,66);assert.equal(p.suites.length,37);assert.equal(p.browser,false);for(const path of p.applicationTests)assert.ok(existsSync(path),path);assert.deepEqual(testCommand('application',{GN_CI_PROFILE:p.profile,GN_APPLICATION_TESTS:JSON.stringify(p.applicationTests)}).args,['--test',...p.applicationTests]);assert.throws(()=>targetedScope('hidden-ui',['src/core/customs.mjs'],{reliableBase:true}));assert.throws(()=>testCommand('application',{GN_CI_PROFILE:p.profile,GN_APPLICATION_TESTS:JSON.stringify(p.applicationTests.slice(1))}));
});

test('CI ciblée : ouverture MOD-04 versionnée, panne B et consommateurs des nouveaux marqueurs',()=>{
 const p=targetedScope('hidden-flight',['src/shared/space-ship-modules.mjs','src/core/space-outlaws-entry.mjs','src/core/space-outlaws-shop-state.mjs','src/core/space-module-flight.mjs','test/support/space-outlaws-voyages-suite.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:hidden-flight]'),'hidden-flight');assert.equal(p.applicationTests.length,66);assert.equal(p.suites.length,37);assert.equal(p.browser,false);assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : MOD-04 équipé, décision B'));assert.deepEqual(testCommand('http',{GN_CI_PROFILE:p.profile,GN_HTTP_PATTERN:JSON.stringify(p.httpPattern)}).args,['--test',`--test-name-pattern=${p.httpPattern}`,'test/integration/http.test.mjs']);assert.throws(()=>targetedScope('hidden-flight',['src/core/customs.mjs'],{reliableBase:true}));
});

test('CI ciblée : ergonomie fret/douane et recette DOM bornée sans navigateur global',()=>{
 const p=targetedScope('hidden-visual',['web/space-hidden-cargo.mjs','web/app.mjs','web/galactic.css','test/browser/hidden-cargo.spec.mjs','test/browser/hidden-cargo.config.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:hidden-visual]'),'hidden-visual');assert.equal(p.applicationTests.length,66);assert.equal(p.suites.length,37);assert.equal(p.browser,false);assert.deepEqual(testCommand('application',{GN_CI_PROFILE:p.profile,GN_APPLICATION_TESTS:JSON.stringify(p.applicationTests)}).args,['--test',...p.applicationTests]);assert.throws(()=>targetedScope('hidden-visual',['test/browser/recette.spec.mjs'],{reliableBase:true}));
});

test('Ciblage MOD-05 préparatoire : catalogue, publication, commerce et profils conservés',()=>{
 const p=targetedScope('towing-catalog',['src/shared/space-ship-modules.mjs','src/core/space-outlaws-entry.mjs','web/central-master.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:towing-catalog]'),'towing-catalog');assert.equal(p.applicationTests.length,66);assert.equal(p.suites.length,37);assert.equal(p.browser,false);for(const id of ['space-ship-module-catalog','space-outlaws-entry','space-module-purchases','space-module-mandates','space-module-flight'])assert.ok(p.suites.includes(id));assert.throws(()=>targetedScope('towing-catalog',['src/core/unknown-towing.mjs'],{reliableBase:true}));
});

test('Ciblage attelage préparatoire : dossiers, PA, entretien et épisodes avec HTTP borné',()=>{
 const p=targetedScope('towing-work',['src/core/space-towing-work.mjs','src/core/space-maintenance.mjs','src/core/workflow.mjs','src/core/space-outlaws-entry-guard.mjs','test/support/space-towing-work-suite.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:towing-work]'),'towing-work');assert.equal(p.applicationTests.length,67);assert.equal(p.suites.length,38);assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : attelage préparatoire, droits courants'));assert.equal(p.browser,false);assert.throws(()=>targetedScope('towing-work',['src/core/unknown-towing.mjs'],{reliableBase:true}));
});

test('Ciblage finalisation attelage : même composant, HTTP supplémentaire sans ouverture du navigateur',()=>{const p=targetedScope('towing-attachment',['src/core/space-towing-work.mjs','src/core/space-outlaws-entry-guard.mjs','test/support/space-towing-work-suite.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:towing-attachment]'),'towing-attachment');assert.equal(p.applicationTests.length,67);assert.equal(p.suites.length,38);assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : attelage finalisé, PA consommé'));assert.equal(p.browser,false);});

test('Ciblage trajet remorqué sécurisé : voyages natifs, profils et composant dans la sélection bornée',()=>{const p=targetedScope('towing-flight',['src/core/space-towing-flight.mjs','src/core/space-outlaws-voyages.mjs','src/core/space-module-flight.mjs','src/shared/space-ship-modules.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:towing-flight]'),'towing-flight');assert.equal(p.applicationTests.length,68);assert.equal(p.suites.length,39);assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : trajet remorqué sécurisé, même épave'));assert.equal(p.browser,false);});

test('Ciblage interception/largage : duel natif, remorquage et effets sans navigateur global',()=>{const p=targetedScope('towing-combat',['src/core/space-combat.mjs','src/core/space-towing-combat.mjs','src/core/space-outlaws-voyages.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:towing-combat]'),'towing-combat');assert.equal(p.applicationTests.length,69);assert.equal(p.suites.length,40);assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : largage remorqué, gratuit'));assert.equal(p.browser,false);});

test('Ciblage interface largage : rencontres, projection et DOM ciblés sans navigateur global',()=>{const p=targetedScope('towing-ui',['web/space-towing-combat.mjs','web/space-encounters.mjs','web/app.mjs','src/core/space-combat.mjs','test/browser/towing-combat.spec.mjs','test/browser/towing-combat.config.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:towing-ui]'),'towing-ui');assert.equal(p.applicationTests.length,70);assert.equal(p.suites.length,40);assert.equal(p.browser,false);assert.throws(()=>targetedScope('towing-ui',['test/browser/recette.spec.mjs'],{reliableBase:true}));});

test('Ciblage attente MOD-05 décision B : horloge et reprise natives, navigateur global fermé',()=>{const p=targetedScope('towing-outage',['src/core/space-towing-outage.mjs','src/core/space-module-flight.mjs','src/core/space-combat-state.mjs','web/space-outlaws-voyages.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:towing-outage]'),'towing-outage');assert.equal(p.applicationTests.length,71);assert.equal(p.suites.length,41);assert.equal(p.browser,false);assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : attente MOD-05, conservation'));});

test('Ciblage bureau attelage : rôles, interface et parcours natif sans navigateur global',()=>{const p=targetedScope('towing-desk',['src/core/space-towing-work.mjs','web/space-towing-work.mjs','web/app.mjs','web/player-spaces.mjs','test/browser/towing-desk.spec.mjs','test/browser/towing-desk.config.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:towing-desk]'),'towing-desk');assert.equal(p.applicationTests.length,73);assert.equal(p.suites.length,42);assert.equal(p.browser,false);assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : bureau attelage, parcours'));});


test('Ciblage remorquage complet : récupération, chaîne publiée et dépannage natif dans le périmètre',()=>{const p=targetedScope('towing-complete',['src/core/space-rescue.mjs','src/core/space-towing-recovery.mjs','src/core/space-outlaws-entry.mjs','web/space-towing-recovery.mjs'],{reliableBase:true});assert.equal(p.applicationTests.length,76);assert.equal(p.suites.length,44);assert.equal(p.browser,false);for(const id of ['space-towing-completion','space-towing-recovery','space-encounters','space-module-installation'])assert.ok(p.suites.includes(id));assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : récupération PNJ, prestation financée'));assert.throws(()=>targetedScope('towing-complete',['src/core/new-wallet.mjs'],{reliableBase:true}));});

test('Ciblage groupes SO : régie native, relève et périmètre cumulé sans navigateur global',()=>{
 const p=targetedScope('space-groups',['src/core/group-management.mjs','src/core/workflow.mjs','web/group-management.mjs','test/browser/space-groups.spec.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:space-groups]'),'space-groups');
 for(const id of ['space-groups','group-management','groups','space-succession','space-towing-completion','space-episodes'])assert.ok(p.suites.includes(id));assert.equal(p.browser,false);assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : groupes SO, transfert'));assert.equal(new Set(p.applicationTests).size,p.applicationTests.length);assert.ok(p.applicationTests.length<=96);for(const file of p.applicationTests)assert.ok(existsSync(file));assert.doesNotThrow(()=>applicationCommand(JSON.stringify(p.applicationTests)));assert.throws(()=>targetedScope('space-groups',['package.json'],{reliableBase:true}));
});

test('Ciblage groupes M2 : publication, régie, réserves, continuité et suites cumulées',()=>{
 const p=targetedScope('group-definitions',['src/core/space-outlaws-group-state.mjs','src/shared/space-outlaws-groups.mjs','src/core/space-outlaws-entry.mjs','test/support/space-groups-suite.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:group-definitions]'),'group-definitions');for(const id of ['space-group-definitions','central-groups','space-groups','space-succession','group-management','space-episodes'])assert.ok(p.suites.includes(id));assert.equal(p.browser,false);assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : groupes M2, publication'));assert.doesNotThrow(()=>applicationCommand(JSON.stringify(p.applicationTests)));assert.throws(()=>targetedScope('group-definitions',['package.json'],{reliableBase:true}));
});

test('Ciblage souhaits : lecture privée et régie native, sans régression intégrale',()=>{
 const p=targetedScope('friend-requests',['src/core/space-outlaws-group-requests.mjs','src/core/group-management.mjs','web/group-management.mjs','test/support/space-outlaws-entry-suite.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:friend-requests]'),'friend-requests');for(const id of ['space-group-requests','space-groups','space-group-definitions','group-management','space-succession','space-episodes'])assert.ok(p.suites.includes(id));assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : souhaits de groupe, confidentialité'));assert.equal(p.browser,false);assert.doesNotThrow(()=>applicationCommand(JSON.stringify(p.applicationTests)));assert.throws(()=>targetedScope('friend-requests',['package.json'],{reliableBase:true}));
});

test('Ciblage catalogue : réserves, relève et recherche sans régression intégrale',()=>{
 const p=targetedScope('roster-search',['src/core/space-outlaws-roster.mjs','web/group-management.mjs','test/support/space-roster-suite.mjs'],{reliableBase:true});assert.equal(requestedTarget('[ci targeted:roster-search]'),'roster-search');assert.ok(p.suites.includes('space-roster'));assert.ok(p.suites.includes('space-succession'));assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : catalogue de personnages, confidentialité'));assert.equal(p.browser,false);assert.doesNotThrow(()=>applicationCommand(JSON.stringify(p.applicationTests)));assert.throws(()=>targetedScope('roster-search',['package.json'],{reliableBase:true}));
});

test('Ciblage caisses SO : scénario natif, mandats et HTTP sélectionnés',()=>{
 const p=targetedScope('group-wallets',['src/core/collective-accounts.mjs','src/core/space-outlaws-entry-guard.mjs','web/collective-accounts.mjs','test/support/space-group-wallets-suite.mjs'],{reliableBase:true});
 assert.equal(requestedTarget('[ci targeted:group-wallets]'),'group-wallets');
 assert.ok(p.suites.includes('collective'));assert.ok(p.suites.includes('space-group-wallets'));
 assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : caisse SO, mandat'));
 assert.equal(p.browser,false);assert.doesNotThrow(()=>applicationCommand(JSON.stringify(p.applicationTests)));
});

test('Ciblage stock SO : stock versionné, logistique et cas HTTP sélectionné',()=>{
 const p=targetedScope('group-stock',['src/core/logistics.mjs','src/core/storage-state.mjs','web/logistics.mjs','test/support/space-group-stock-suite.mjs'],{reliableBase:true});
 assert.equal(requestedTarget('[ci targeted:group-stock]'),'group-stock');
 assert.ok(p.suites.includes('logistics'));assert.ok(p.suites.includes('space-group-stock'));
 assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : stock SO, dépôt'));
 assert.equal(p.browser,false);assert.doesNotThrow(()=>applicationCommand(JSON.stringify(p.applicationTests)));
});

test('Ciblage pilotage SO : navigation, changement de mandat et cas HTTP dédié',()=>{
 const p=targetedScope('group-pilot',['src/core/space-outlaws-voyages.mjs','web/space-outlaws-voyages.mjs','test/support/space-group-pilot-suite.mjs'],{reliableBase:true});
 assert.equal(requestedTarget('[ci targeted:group-pilot]'),'group-pilot');
 assert.ok(p.suites.includes('space-group-pilot'));assert.ok(p.suites.includes('space-outlaws-voyages'));
 assert.ok(new RegExp(p.httpPattern).test('HTTP + Auth : pilotage de groupe SO, révocation'));
 assert.equal(p.browser,false);assert.doesNotThrow(()=>applicationCommand(JSON.stringify(p.applicationTests)));
});

test('CI cible la publication du Master révisé et conserve les suites de session',()=>{
 const p=targetedScope('central-revision-release',['src/core/central-master.mjs','src/core/space-outlaws-learning.mjs'],{reliableBase:true});
 assert.ok(p.suites.includes('central-revision'));
 assert.ok(p.suites.includes('space-learning'));
 assert.ok(p.suites.includes('space-succession'));
 assert.doesNotThrow(()=>testCommand('application',{GN_CI_PROFILE:p.profile,GN_APPLICATION_TESTS:JSON.stringify(p.applicationTests)}));
});

// ROG-02 retains the cumulative Master dependencies from the last trusted global baseline.
test('CI ciblée : ROG-02 garde la sélection cumulée et refuse les chemins étrangers',()=>{
 const p=targetedScope('rogue-pickpocket',['src/core/space-pickpocket.mjs','src/core/campaigns.mjs','scripts/ci-run-tests.mjs'],{reliableBase:true});
 assert.equal(p.applicationTests.length,100);assert.ok(p.applicationTests.includes('test/space-pickpocket.test.mjs'));
 assert.ok(p.suites.includes('space-pickpocket'));assert.ok(p.suites.includes('central-revision'));
 assert.doesNotThrow(()=>applicationCommand(JSON.stringify(p.applicationTests)));
 assert.throws(()=>targetedScope('rogue-pickpocket',['src/adapters/firestore.mjs'],{reliableBase:true}));
});
