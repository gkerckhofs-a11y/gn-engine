import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {allSuites,spatialSuites,scopeForChanges,matrixFor,selectFirestoreSuites} from '../scripts/ci-scope.mjs';
import {makePlan,eligibleRuns} from '../scripts/ci-plan.mjs';

test('CI : chaque suite complète est exécutée une seule fois entre les six lots',()=>{
  const ids=allSuites.map(s=>s.id),matrix=matrixFor(ids);
  assert.equal(matrix.length,6);
  const selected=matrix.flatMap(({shard})=>selectFirestoreSuites({GN_FIRESTORE_SUITES:JSON.stringify(ids),GN_FIRESTORE_SHARD:shard}));
  assert.equal(new Set(selected.map(s=>s.id)).size,ids.length);
  assert.deepEqual(selected.map(s=>s.id).sort(),[...ids].sort());
  assert.deepEqual(selectFirestoreSuites({}).map(s=>s.id),ids);
});
test('CI : le profil spatial conserve les dépendances et les règles, sans doublon',()=>{
  const scope=scopeForChanges(['src/core/space-escort.mjs','web/space-escort.mjs','docs/SO-VALIDATION.md']);
  assert.equal(scope.profile,'spatial');assert.equal(scope.http,true);
  for(const id of ['contracts','economy','inventory','space-transport','space-convoy','space-episodes','firestore-rules'])assert.ok(scope.suites.includes(id));
  const chosen=matrixFor(scope.suites).flatMap(({shard})=>selectFirestoreSuites({GN_FIRESTORE_SUITES:JSON.stringify(scope.suites),GN_FIRESTORE_SHARD:shard}));
  assert.deepEqual(chosen.map(s=>s.id).sort(),[...spatialSuites].sort());
});
test('CI : aucune nouvelle suite partagée en mémoire ne disparaît de Firestore par oubli',()=>{
  const registered=new Set(allSuites.map(s=>s.exportName));
  for(const file of readdirSync(new URL('./',import.meta.url)).filter(f=>f.endsWith('.test.mjs'))){
    const text=readFileSync(new URL(file,new URL('./',import.meta.url)),'utf8');
    for(const [,names] of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/support\/[^'"]+-suite\.mjs['"]/g)){
      for(const name of names.split(',').map(s=>s.trim()).filter(n=>/Suite$/.test(n))){
        if(new RegExp(`\\b${name}\\(`).test(text))assert.ok(registered.has(name),`${name} called by ${file} needs a Firestore registry entry`);
      }
    }
  }
});
test('CI : sélection invalide, doublon, suite inconnue et lot vide échouent explicitement',()=>{
  for(const value of ['[]','{}','null','["unknown"]','["workflow","workflow"]','invalid'])assert.throws(()=>selectFirestoreSuites({GN_FIRESTORE_SUITES:value}));
  for(const shard of ['0/6','7/6','1/0','1/17','none'])assert.throws(()=>selectFirestoreSuites({GN_FIRESTORE_SHARD:shard}));
  assert.throws(()=>selectFirestoreSuites({GN_FIRESTORE_SUITES:'["workflow"]',GN_FIRESTORE_SHARD:'2/2'}));
});
test('CI : fondations, dépendances, règles, fichiers inconnus et orchestration imposent le complet',()=>{
  for(const path of ['src/core/workflow.mjs','src/core/contracts.mjs','src/core/space-outlaws-entry-guard.mjs','src/core/new-feature.mjs','src/adapters/firestore.mjs','src/server/index.mjs','src/shared/space-outlaws-rules.mjs','package-lock.json','firestore.rules','storage.rules','.github/workflows/check.yml','scripts/ci-plan.mjs','test/integration/firestore.test.mjs','test/support/firestore-suites.mjs']){
    assert.equal(scopeForChanges(['src/core/space-escort.mjs',path]).profile,'full',path);
  }
  assert.equal(scopeForChanges([],{reliableBase:false}).profile,'full');
  assert.equal(scopeForChanges(['docs/only.md'],{forceFull:true}).profile,'full');
  for(const path of ['test/support/space-outlaws-entry-suite.mjs','test/support/space-outlaws-shops-suite.mjs','test/support/inventory-suite.mjs'])assert.equal(scopeForChanges([path]).profile,'full',path);
  assert.equal(scopeForChanges(['test/support/space-escort-suite.mjs']).profile,'spatial');
});
test('CI : interface et HTTP gardent tous les parcours Auth ; documentation garde les tests applicatifs',()=>{
  for(const paths of [['web/app.mjs'],['test/integration/http.test.mjs']]){
    const scope=scopeForChanges(paths);assert.equal(scope.profile,'http');assert.equal(scope.http,true);assert.deepEqual(scope.suites,[]);
  }
  const scope=scopeForChanges(['AGENTS.md','docs/SO-VALIDATION.md','test/space-escort-ui.test.mjs']);
  assert.equal(scope.profile,'application');assert.equal(scope.http,false);assert.deepEqual(matrixFor(scope.suites),[]);
});

const previous='a'.repeat(40),candidate='b'.repeat(40),checkout='c'.repeat(40);
const environment={GITHUB_REPOSITORY:'owner/repo',GITHUB_REF_NAME:'work/test',GITHUB_RUN_ID:'20',GITHUB_EVENT_NAME:'pull_request'};
const payload={action:'synchronize',pull_request:{draft:true,head:{sha:candidate,ref:'work/test',repo:{full_name:'owner/repo'}}}};
const run=(extra={})=>({id:10,run_number:10,status:'completed',conclusion:'success',event:'pull_request',head_branch:'work/test',head_repository:{full_name:'owner/repo'},head_sha:previous,...extra});
function setup({runs=[run()],paths=['src/core/space-escort.mjs'],message='change',ancestor=true,event=payload,env=environment}={}){
  const calls=[];
  const gitCommand=(...args)=>{
    calls.push(args);
    if(args[0]==='rev-parse')return checkout;
    if(args[0]==='log')return message;
    if(args[0]==='merge-base'){if(!ancestor)throw new Error('not ancestor');return '';}
    if(args[0]==='diff')return paths.join('\0');
    throw new Error('unexpected command');
  };
  return {calls,args:{env,event,gitCommand,fetchRuns:async()=>{if(runs instanceof Error)throw runs;return runs;}}};
}
test('CI : un échec ou une annulation ne devient jamais référence, ni un autre dépôt ou branche',()=>{
  const candidates=[run(),run({id:11,conclusion:'failure'}),run({id:12,conclusion:'cancelled'}),run({id:13,status:'in_progress'}),run({id:14,head_branch:'other'}),run({id:15,head_repository:{full_name:'other/repo'}}),run({id:20}),run({id:16,head_sha:'HEAD'}),run({id:17,event:'workflow_dispatch'})];
  assert.deepEqual(eligibleRuns(candidates,{repository:'owner/repo',branch:'work/test',runId:'20'}),[candidates[0]]);
});
test('CI : comparaison depuis le dernier succès jusqu’au checkout incluant la base de PR',async()=>{
  const {args,calls}=setup({runs:[run({id:11,run_number:11,conclusion:'failure'}),run()],paths:['src/core/space-escort.mjs','src/core/workflow.mjs']});
  const p=await makePlan(args);
  assert.equal(p.baseline,previous);assert.equal(p.candidate,candidate);assert.equal(p.checkout,checkout);assert.equal(p.profile,'full');
  assert.deepEqual(calls.find(x=>x[0]==='diff'),['diff','--no-renames','--name-only','-z',previous,checkout]);
});
test('CI : API indisponible, historique vide, ancêtre absent et fork reviennent au complet',async()=>{
  for(const options of [{runs:new Error('unavailable')},{runs:[]},{ancestor:false},{event:{...payload,pull_request:{...payload.pull_request,head:{...payload.pull_request.head,repo:{full_name:'fork/repo'}}}}}]){
    const p=await makePlan(setup(options).args);assert.equal(p.profile,'full');assert.equal(p.baseline,null);
  }
});
test('CI : PR prête, commit ci full, push et lancement manuel imposent tous les tests',async()=>{
  for(const options of [{message:'change [ci full]'},{event:{...payload,action:'ready_for_review'}},{event:{...payload,pull_request:{...payload.pull_request,draft:false}}},{env:{...environment,GITHUB_EVENT_NAME:'push'}},{env:{...environment,GITHUB_EVENT_NAME:'workflow_dispatch'}}]){
    const {args,calls}=setup(options),p=await makePlan(args);assert.equal(p.profile,'full');assert.ok(!calls.some(x=>x[0]==='diff'));
  }
});
test('CI : une modification étroite après succès produit les quatre lots et HTTP complet',async()=>{
  const p=await makePlan(setup().args);assert.equal(p.profile,'spatial');assert.equal(p.matrix.length,4);assert.equal(p.http,true);assert.equal(p.baselineRun,10);
});
