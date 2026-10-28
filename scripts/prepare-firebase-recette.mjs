import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile,readdir,cp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {recetteTarget} from '../src/shared/recette-target.mjs';
import {serverEnvironment} from '../src/server/environment.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const output=join(root,'dist/so-firebase-recette');

export function deploymentPlan(target){
  const env={GN_DEPLOYMENT_ENV:'recette',GN_RECETTE_PROJECT:target.projectId,OWNER_EMAIL:target.ownerEmail,MEDIA_BUCKET:target.mediaBucket};
  serverEnvironment(env);
  const firebase=['--no-install','firebase','deploy','--project',target.projectId,'--config','firebase.json','--non-interactive'];
  return {status:'NOT_DEPLOYED',targetVerification:'NOT_EXECUTED',humanAcceptance:'NOT_EXECUTED',projectId:target.projectId,origin:target.origin,env,
    commands:[
      {program:'npx',args:[...firebase,'--only','firestore:rules,firestore:indexes,storage']},
      {program:'gcloud',args:['functions','deploy','api',`--project=${target.projectId}`,`--region=${target.region}`,'--gen2','--runtime=nodejs22','--entry-point=api','--source=server','--trigger-http','--allow-unauthenticated','--ingress-settings=all',`--service-account=${target.runtimeServiceAccount}`,`--build-service-account=${target.buildServiceAccount}`,`--docker-repository=${target.artifactRepository}`,'--memory=512Mi','--cpu=1','--min-instances=0','--max-instances=3','--concurrency=8','--timeout=60s','--env-vars-file=runtime-env.json','--quiet']},
      {program:'npx',args:[...firebase,'--only','hosting']},
    ]};
}

export async function prepareFirebaseRecette(input,{destination=output}={}){
  const target=recetteTarget(input),plan=deploymentPlan(target);
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  const metadata={mode:'FIREBASE_RECETTE',projectId:target.projectId,commit:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),dirty:!!git('status','--porcelain'),builtAt:new Date().toISOString(),humanAcceptance:'NOT_EXECUTED'};
  await mkdir(dirname(destination),{recursive:true});
  // Never reuse an earlier package or overwrite another target's files.
  await mkdir(destination);
  try{
    const publicDir=join(destination,'public');await mkdir(publicDir);
    await build({entryPoints:[join(root,'web/app.mjs')],outfile:join(publicDir,'app.js'),bundle:true,minify:true,format:'esm',target:'es2022',legalComments:'eof',plugins:[{
      name:'firebase-recette-target',setup(b){b.onLoad({filter:/[/\\]web[/\\]firebase-config\.mjs$/},()=>({contents:`export default ${JSON.stringify(target.firebase)};`,loader:'js'}));},
    }]});
    const version=JSON.parse(await readFile(join(root,'package.json'),'utf8')).version;
    const html=(await readFile(join(root,'web/index.html'),'utf8')).replace('{{APP_VERSION}}',version).replace('<body>','<body><aside class="panel" aria-label="Environnement de recette"><strong>RECETTE · DONNÉES FICTIVES</strong><p>Environnement de test. Les résultats restent à valider sur appareils.</p></aside>');
    await writeFile(join(publicDir,'index.html'),html);
    for(const name of ['style.css','galactic.css'])await copyFile(join(root,'web',name),join(publicDir,name));
    await mkdir(join(publicDir,'masters'));
    for(const name of await readdir(join(root,'assets/masters')))if(name.endsWith('.xlsx'))await copyFile(join(root,'assets/masters',name),join(publicDir,'masters',name));
    await writeFile(join(publicDir,'version.json'),JSON.stringify({version}));
    await writeFile(join(publicDir,'recette-build.json'),JSON.stringify(metadata,null,2));
    const config=JSON.parse(await readFile(join(root,'firebase.json'),'utf8'));
    await writeFile(join(destination,'firebase.json'),JSON.stringify({hosting:config.hosting,firestore:config.firestore,storage:config.storage},null,2));
    await writeFile(join(destination,'.firebaserc'),JSON.stringify({projects:{default:target.projectId}}));
    for(const name of ['firestore.rules','firestore.indexes.json','storage.rules'])await copyFile(join(root,name),join(destination,name));
    await mkdir(join(destination,'server'));
    await cp(join(root,'src'),join(destination,'server/src'),{recursive:true});
    for(const name of ['package.json','package-lock.json','.gcloudignore'])await copyFile(join(root,name),join(destination,'server',name));
    await writeFile(join(destination,'runtime-env.json'),JSON.stringify(plan.env,null,2),{mode:0o600});
    await writeFile(join(destination,'deployment-plan.json'),JSON.stringify({...plan,metadata},null,2),{mode:0o600});
    const hashes={};
    async function visit(dir=''){
      for(const item of (await readdir(join(destination,dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
        const path=dir?`${dir}/${item.name}`:item.name;
        if(item.isDirectory())await visit(path);
        else hashes[path]=createHash('sha256').update(await readFile(join(destination,path))).digest('hex');
      }
    }
    await visit();
    await writeFile(join(destination,'package-hashes.json'),JSON.stringify(hashes,null,2));
    return {metadata,projectId:target.projectId,files:Object.keys(hashes).length};
  }catch(error){await rm(destination,{recursive:true,force:true});throw error;}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3)throw new Error('Usage : node scripts/prepare-firebase-recette.mjs chemin/configuration.private.json');
    const result=await prepareFirebaseRecette(JSON.parse(await readFile(process.argv[2],'utf8')));
    console.log(`Paquet local préparé : ${output}\nProjet déclaré : ${result.projectId} ; ${result.files} fichiers vérifiables. Aucun accès distant ni déploiement exécuté.`);
  }catch(error){console.error(error.message);process.exitCode=1;}
}
