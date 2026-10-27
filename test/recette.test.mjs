import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request as httpRequest} from 'node:http';
import {build} from 'esbuild';
import {identities,requireLocalPage,syntheticAssertion} from '../scripts/recette/identities.mjs';
import {requireRecetteEnvironment,requireRuntimes,hosts,projectId,bucket} from '../scripts/recette/config.mjs';
import {seedMissionScenario} from '../scripts/recette/scenario.mjs';
import {acceptanceReport,localCases} from '../scripts/recette/cases.mjs';
import {guideHtml} from '../scripts/recette/guide.mjs';
import {buildRecette,output} from '../scripts/recette/build.mjs';
import {recetteApp} from '../scripts/recette/app.mjs';
import {MemoryStore} from './support/memory.mjs';
import {createWorkflow} from '../src/core/workflow.mjs';

function fixture(){
  const store=new MemoryStore(),actors=Object.fromEntries(identities.map(p=>[p.id,{uid:p.id,email:p.email,emailVerified:true,provider:'google.com',authTime:Math.floor(Date.now()/1000)}]));
  const workflow=createWorkflow({store,ownerEmail:actors.owner.email});
  const call=(action,input={},role='owner')=>workflow.dispatch(action,actors[role],input);
  return {store,call,uids:Object.fromEntries(identities.map(p=>[p.id,p.id]))};
}
test('Recette : configuration refusée avant connexion hors émulateurs locaux',()=>{
  const env={GCLOUD_PROJECT:projectId,...hosts};assert.equal(requireRecetteEnvironment(env,{running:true}).MEDIA_BUCKET,bucket);assert.equal(env.MEDIA_BUCKET,undefined);
  assert.equal(requireRecetteEnvironment({}).OWNER_EMAIL,identities[0].email);
  for(const [key,value] of Object.entries({GCLOUD_PROJECT:'gn-engine',GOOGLE_CLOUD_PROJECT:'real-project',GCP_PROJECT:'real-project',GOOGLE_APPLICATION_CREDENTIALS:'/tmp/credential.json',MEDIA_BUCKET:'real-bucket',OWNER_EMAIL:'real@example.org',FIREBASE_CONFIG:'/tmp/config.json'}))assert.throws(()=>requireRecetteEnvironment({...env,[key]:value}),undefined,key);
  for(const key of Object.keys(hosts))for(const value of [undefined,'remote.example:8080','127.0.0.1:9999','127.0.0.1:8080@remote.example'])assert.throws(()=>requireRecetteEnvironment({...env,[key]:value},{running:true}));
  assert.throws(()=>requireRecetteEnvironment(hosts,{running:true}));
  for(const config of [null,{projectId:'gn-engine'},{projectId,storageBucket:'real-bucket'},{projectId,databaseURL:'https://real.example'}])assert.throws(()=>requireRecetteEnvironment({...env,FIREBASE_CONFIG:JSON.stringify(config)}));
  assert.equal(requireRecetteEnvironment({...env,FIREBASE_CONFIG:JSON.stringify({projectId,storageBucket:bucket})},{running:true}).GCLOUD_PROJECT,projectId);
  const cli=requireRecetteEnvironment({...env,FIREBASE_CONFIG:JSON.stringify({projectId,storageBucket:`${projectId}.appspot.com`,databaseURL:`https://${projectId}.firebaseio.com`})},{running:true});assert.deepEqual(JSON.parse(cli.FIREBASE_CONFIG),{projectId,storageBucket:bucket});
});
test('Recette : prérequis Java/Node explicites et configuration sans Hosting ni Functions',async()=>{
  requireRuntimes('22.23.3','openjdk version "21.0.12"');
  for(const [node,java] of [['20.0.0','openjdk version "21.0.12"'],['24.0.0','openjdk version "17.0.20"'],['24.0.0','Java introuvable']])assert.throws(()=>requireRuntimes(node,java));
  const config=JSON.parse(await readFile(new URL('../firebase.recette.json',import.meta.url)));assert.equal(config.hosting,undefined);assert.equal(config.functions,undefined);
  for(const kind of ['auth','firestore','storage'])assert.equal(config.emulators[kind].host,'127.0.0.1');
});
test('Recette : identités synthétiques et client refusant une origine distante',()=>{
  requireLocalPage(new URL('http://127.0.0.1:4173'));requireLocalPage(new URL('http://localhost:4173'));
  for(const url of ['https://127.0.0.1:4173','http://example.org:4173','http://127.0.0.1:4174','file:///tmp/index.html','http://localhost.evil:4173'])assert.throws(()=>requireLocalPage(new URL(url)));
  const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  for(const person of identities){const token=syntheticAssertion(person.id,enc),claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));assert.equal(claims.email,person.email);assert.equal(claims.email_verified,true);assert.ok(claims.email.endsWith('@recette.example.invalid'));}
  assert.throws(()=>syntheticAssertion('real-user',enc));
});
test('Recette : scénario natif, réserves exactes et rôles séparés',async()=>{
  const f=fixture(),s=await seedMissionScenario(f.call,f.uids),input={sessionId:s.sessionId};
  const session=await f.call('session',input);assert.equal(session.stage,'PAUSE');assert.equal(session.characters.length,2);
  const row=(await f.call('sessionContracts',input)).contracts[0];assert.equal(row.status,'ACTIVE');assert.equal(row.obligations.salaryReserved,100);assert.equal(row.obligations.rewards[0].remaining,3);
  assert.equal((await f.call('myWallet',input,'player')).account.protectedCredits,50);assert.equal((await f.call('myWallet',input,'other')).account.protectedCredits,200);
  const till=session.accounts.find(a=>a.ownerType==='SHOP');assert.equal(till.balance,150);assert.equal(till.reserved,100);
  assert.equal((await f.call('shops',input,'player')).shops[0].offers[0].stock,2);
  assert.equal((await f.call('sessionContracts',input,'mj')).contracts.length,1);
  for(const role of ['reception','player','other','outsider'])await assert.rejects(f.call('sessionContracts',input,role),{code:'FORBIDDEN'});
  assert.match(JSON.stringify(await f.call('contractDetail',{...input,contractId:s.contractId},'player')),/SECRET_RECETTE_BRIEFING/);
  for(const role of ['other','outsider'])await assert.rejects(f.call('contractDetail',{...input,contractId:s.contractId},role),{code:'FORBIDDEN'});
  await assert.rejects(f.call('session',{sessionId:s.otherSessionId},'mj'),{code:'FORBIDDEN'});
  assert.equal(s.humanAcceptance,'NOT_EXECUTED');assert.doesNotMatch(JSON.stringify(s),/token|SECRET_|email/);
});
test('Recette : nouveau scénario sans réinitialiser les acquis du premier',async()=>{
  const f=fixture(),first=await seedMissionScenario(f.call,f.uids),path=`sessions/${first.sessionId}`,before=await f.store.get(path),accounts=await f.store.list(`${path}/accounts`),lots=await f.store.list(`${path}/inventory`);
  const second=await seedMissionScenario(f.call,f.uids);assert.notEqual(first.sessionId,second.sessionId);assert.deepEqual(await f.store.get(path),before);assert.deepEqual(await f.store.list(`${path}/accounts`),accounts);assert.deepEqual(await f.store.list(`${path}/inventory`),lots);
});
test('Recette : relevé non exécuté par défaut et résultats exigeant un constat',()=>{
  const rows=localCases.map(c=>({id:c.id,status:'NOT_EXECUTED'})),metadata={commit:'a'.repeat(40),dirty:true};
  const report=acceptanceReport(metadata,{},rows);assert.equal(report.canonicalAcceptance,'NOT_CERTIFIED');assert.equal(report.deploymentAuthorized,false);assert.equal(report.results.filter(r=>r.status==='PASS').length,0);assert.equal(report.candidate.dirty,true);
  for(const status of ['PASS','FAIL','BLOCKED'])assert.throws(()=>acceptanceReport(metadata,{},[{...rows[0],status},...rows.slice(1)]));
  const result={...rows[0],status:'PASS',role:'MJ',device:'Poste fictif',browser:'Navigateur/version relevés',network:'Local',observed:'Données attendues constatées',evidence:'capture locale 001'};
  assert.throws(()=>acceptanceReport(metadata,{},[result,...rows.slice(1)]));assert.equal(acceptanceReport(metadata,{operator:'Testeur',performedAt:'2026-10-27T12:00:00+01:00'},[result,...rows.slice(1)]).results[0].status,'PASS');
  assert.throws(()=>acceptanceReport(metadata,{},rows.slice(1)));assert.throws(()=>acceptanceReport(metadata,{},[{...rows[0],status:'AUTOMATIC_PASS'},...rows.slice(1)]));
});
test('Recette : guide échappé, rapprochements partiels et aucune certification implicite',()=>{
  const html=guideHtml({commit:'a'.repeat(40),dirty:true},{sessionId:'<script>bad</script>',otherSessionId:'other'});assert.doesNotMatch(html,/<script>bad/);assert.match(html,/&lt;script&gt;/);assert.match(html,/fichiers locaux modifiés/);assert.equal((html.match(/<fieldset data-case=/g)||[]).length,7);assert.equal((html.match(/value="NOT_EXECUTED"/g)||[]).length,7);assert.doesNotMatch(html,/selected[^>]*PASS|name="password"/);
});
test('Recette : compilation isolée sans configuration ni connexion fictive dans la version normale',async()=>{
  const metadata=await buildRecette(),local=await readFile(join(output,'app.js'),'utf8'),config=(await import('../web/firebase-config.mjs')).default;
  assert.equal(metadata.mode,'LOCAL_EMULATORS');assert.match(local,/so-recette-/);assert.match(local,/127\.0\.0\.1:9099/);assert.ok(!local.includes(config.apiKey));assert.ok(!local.includes(config.appId));
  const production=await build({entryPoints:['web/app.mjs'],write:false,bundle:true,minify:true,format:'esm',target:'es2022'}),normal=production.outputFiles[0].text;
  assert.ok(normal.includes(config.apiKey));assert.doesNotMatch(normal,/so-recette-|recette-identity|owner@recette\.example\.invalid/);
});
test('Recette : serveur local refuse Host/Origin étrangers et ne sert pas de sources',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'so-recette-'));await writeFile(join(dir,'index.html'),'interface fictive');let calls=0;
  const app=recetteApp({api:(_req,res)=>{calls++;res.json({result:true});},directory:dir,metadata:{commit:'a'.repeat(40)},scenario:{sessionId:'s'}}),server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const url=`http://127.0.0.1:${server.address().port}`,req=(path,headers={},method='GET')=>new Promise((resolve,reject)=>{const request=httpRequest(url+path,{method,headers:{Host:'127.0.0.1:4173',...headers}},res=>{let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:new Headers(res.headers),json:async()=>JSON.parse(body)}));});request.on('error',reject);request.end();});
  try{
    assert.equal((await req('/')).status,200);assert.equal((await req('/api/command',{},'POST')).status,200);
    for(const headers of [{Host:'example.org:4173'},{Origin:'https://evil.example'},{Origin:'null'},{Origin:'http://localhost:9999'},{'Sec-Fetch-Site':'cross-site'}])assert.equal((await req('/api/command',headers,'POST')).status,403);
    assert.equal(calls,1);assert.equal((await req('/api/command')).status,405);assert.equal((await req('/src/server/index.mjs')).status,404);
    const response=await req('/recette.json');assert.equal((await response.json()).sessionId,'s');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.doesNotMatch(response.headers.get('Content-Security-Policy'),/googleapis|firebaseapp/);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
