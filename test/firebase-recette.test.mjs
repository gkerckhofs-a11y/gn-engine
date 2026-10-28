import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,readdir,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {recetteTarget,recetteProject} from '../src/shared/recette-target.mjs';
import {serverEnvironment} from '../src/server/environment.mjs';
import {deploymentPlan,prepareFirebaseRecette} from '../scripts/prepare-firebase-recette.mjs';
import production from '../web/firebase-config.mjs';

const input={projectId:'gn-engine-recette-fixture',projectNumber:'123456789012',apiKey:`AIza${'x'.repeat(35)}`,appId:'1:123456789012:web:abcdef123456',ownerEmail:'owner@example.test'};
const target=recetteTarget(input),plan=deploymentPlan(target);

test('Firebase recette : configuration explicite sans cible production, émulateur ou champ injecté',()=>{
  assert.equal(target.firebase.authDomain,`${input.projectId}.firebaseapp.com`);
  for(const project of ['gn-engine','demo-gn-engine','123456','../public','abc','abc-','UPPER-case',`${input.projectId};echo`])assert.throws(()=>recetteProject(project));
  for(const patch of [{projectNumber:'936415509528'},{projectNumber:123456789012},{apiKey:production.apiKey},{apiKey:'placeholder'},{appId:production.appId},{ownerEmail:'owner@example.test\nOTHER=1'},{ownerEmail:''},{private_key:'never accepted'},{mediaBucket:'gn-engine-media-936415509528'}])assert.throws(()=>recetteTarget({...input,...patch}));
  for(const key of Object.keys(input)){const missing={...input};delete missing[key];assert.throws(()=>recetteTarget(missing));}
  for(const value of [null,[],{},'configuration'])assert.throws(()=>recetteTarget(value));
});

test('Firebase recette : le serveur refuse les cibles contradictoires et tout repli de médias',()=>{
  const resolved=serverEnvironment(plan.env);
  assert.deepEqual(resolved.appOptions,{projectId:input.projectId,storageBucket:target.mediaBucket});
  assert.equal(resolved.serviceAccount,target.runtimeServiceAccount);
  assert.equal(resolved.ownerEmail,input.ownerEmail);
  for(const key of ['GN_DEPLOYMENT_ENV','GN_RECETTE_PROJECT','OWNER_EMAIL','MEDIA_BUCKET']){const env={...plan.env};delete env[key];assert.throws(()=>serverEnvironment(env),undefined,key);}
  for(const patch of [{GN_DEPLOYMENT_ENV:'production'},{GN_RECETTE_PROJECT:'gn-engine'},{MEDIA_BUCKET:'gn-engine-media-936415509528'},{GCLOUD_PROJECT:'gn-engine'},{GOOGLE_CLOUD_PROJECT:'other-project'},{GCP_PROJECT:'other-project'},{FIREBASE_CONFIG:'file.json'},{FIREBASE_CONFIG:'null'},{FIREBASE_CONFIG:JSON.stringify({projectId:'gn-engine'})},{FIREBASE_CONFIG:JSON.stringify({projectId:input.projectId,storageBucket:'other-bucket'})}])assert.throws(()=>serverEnvironment({...plan.env,...patch}));
  for(const key of ['FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST','STORAGE_EMULATOR_HOST'])assert.throws(()=>serverEnvironment({...plan.env,[key]:'127.0.0.1:8080'}));
  assert.deepEqual(serverEnvironment({...plan.env,GCLOUD_PROJECT:input.projectId,FIREBASE_CONFIG:JSON.stringify({projectId:input.projectId,storageBucket:target.mediaBucket})}),resolved);
});

test('Firebase recette : les entrées historiques et émulateurs conservent leur configuration',()=>{
  assert.equal(serverEnvironment({}).mediaBucket,'gn-engine-media-936415509528');
  const local=serverEnvironment({GCLOUD_PROJECT:'demo-gn-engine',MEDIA_BUCKET:'demo-gn-engine-media',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'});
  assert.equal(local.mediaBucket,'demo-gn-engine-media');assert.equal(local.appOptions,undefined);
});

test('Firebase recette : le véritable point d’entrée initialise Admin et la fonction sur la cible',()=>{
  const script=`const {api}=await import('./src/server/index.mjs');const {getApp}=await import('firebase-admin/app');console.log(JSON.stringify({options:getApp().options,endpoint:api.__endpoint}));`;
  const env={...process.env,...plan.env};
  for(const key of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT','GCP_PROJECT','FIREBASE_CONFIG','FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST','STORAGE_EMULATOR_HOST'])delete env[key];
  const result=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{env,encoding:'utf8',timeout:15000}));
  assert.equal(result.options.projectId,input.projectId);assert.equal(result.options.storageBucket,target.mediaBucket);
  assert.equal(result.endpoint.serviceAccountEmail,target.runtimeServiceAccount);
  assert.deepEqual(result.endpoint.region,['europe-west1']);assert.equal(result.endpoint.maxInstances,3);
});

test('Firebase recette : plan explicite règles/index/Storage avant API puis Hosting, sans exécution',()=>{
  assert.equal(plan.status,'NOT_DEPLOYED');assert.equal(plan.targetVerification,'NOT_EXECUTED');
  assert.equal(plan.humanAcceptance,'NOT_EXECUTED');
  assert.equal(plan.commands[0].args.at(-1),'firestore:rules,firestore:indexes,storage');
  assert.equal(plan.commands[2].args.at(-1),'hosting');
  for(const command of plan.commands)assert.ok(command.args.includes(input.projectId)||command.args.includes(`--project=${input.projectId}`));
  const command=plan.commands[1];
  assert.ok(command.args.includes(`--service-account=${target.runtimeServiceAccount}`));
  assert.ok(command.args.includes(`--build-service-account=${target.buildServiceAccount}`));
  assert.ok(command.args.includes('--env-vars-file=runtime-env.json'));
  assert.equal(JSON.stringify(plan).includes('gn-engine.iam.gserviceaccount.com'),false);
});

test('Firebase recette : paquet isolé, authentification réelle, règles natives et empreintes complètes',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'gn-firebase-recette-')),destination=join(temp,'bundle');
  const original=await readFile('web/firebase-config.mjs');
  try{
    const result=await prepareFirebaseRecette(input,{destination});
    const bundle=await readFile(join(destination,'public/app.js'),'utf8');
    assert.ok(bundle.includes(input.apiKey));assert.ok(bundle.includes(target.authDomain));
    assert.equal(bundle.includes(production.apiKey),false);assert.equal(bundle.includes(production.authDomain),false);
    assert.equal(bundle.includes('demo-gn-engine'),false);assert.equal(bundle.includes('recette-identity'),false);
    assert.ok((await readFile(join(destination,'public/index.html'),'utf8')).includes('RECETTE · DONNÉES FICTIVES'));
    assert.deepEqual(await readFile('web/firebase-config.mjs'),original);
    const publicNames=await readdir(join(destination,'public'));
    for(const name of ['runtime-env.json','deployment-plan.json','server','package-hashes.json'])assert.equal(publicNames.includes(name),false);
    const metadata=JSON.parse(await readFile(join(destination,'public/recette-build.json'),'utf8'));
    assert.match(metadata.commit,/^[a-f0-9]{40}$/);assert.equal(metadata.humanAcceptance,'NOT_EXECUTED');
    assert.equal(JSON.stringify(metadata).includes(input.ownerEmail),false);
    const config=JSON.parse(await readFile(join(destination,'firebase.json'),'utf8'));
    assert.equal(config.hosting.public,'public');assert.equal(config.storage.rules,'storage.rules');assert.equal(config.functions,undefined);
    for(const name of ['firestore.rules','firestore.indexes.json','storage.rules'])assert.deepEqual(await readFile(join(destination,name)),await readFile(name));
    assert.deepEqual(JSON.parse(await readFile(join(destination,'runtime-env.json'),'utf8')),plan.env);
    assert.deepEqual(await readFile(join(destination,'server/src/server/index.mjs')),await readFile('src/server/index.mjs'));
    const hashes=JSON.parse(await readFile(join(destination,'package-hashes.json'),'utf8'));
    assert.equal(Object.keys(hashes).length,result.files);
    for(const [path,digest] of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(join(destination,path))).digest('hex'),digest,path);
    await writeFile(join(destination,'sentinel'),'preserve');
    await assert.rejects(prepareFirebaseRecette(input,{destination}),{code:'EEXIST'});
    assert.equal(await readFile(join(destination,'sentinel'),'utf8'),'preserve');
  }finally{await rm(temp,{recursive:true,force:true});}
});

test('Firebase recette : une configuration refusée ne produit aucun paquet',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'gn-firebase-refusal-')),destination=join(temp,'bundle');
  try{await assert.rejects(prepareFirebaseRecette({...input,projectId:'gn-engine'},{destination}));await assert.rejects(access(destination));}
  finally{await rm(temp,{recursive:true,force:true});}
});
