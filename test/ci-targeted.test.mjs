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
