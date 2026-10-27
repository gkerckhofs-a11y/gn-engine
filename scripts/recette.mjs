import {spawn,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {requireRecetteEnvironment,requireRuntimes,projectId,origin} from './recette/config.mjs';
import {buildRecette,root} from './recette/build.mjs';

export async function launch(args=process.argv.slice(2)){
  if(args.length&&!(args.length===1&&args[0]==='--check'))throw new Error('Usage : npm run recette [-- --check]');
  const env=requireRecetteEnvironment(process.env);
  const java=spawnSync('java',['-version'],{encoding:'utf8'});
  requireRuntimes(process.versions.node,`${java.stdout??''}${java.stderr??''}`);
  if(java.status!==0)throw new Error('Java indisponible');
  if(args[0]==='--check'){console.log(`Prérequis locaux vérifiés ; projet ${projectId}, interface ${origin}. Aucun émulateur lancé.`);return;}
  const metadata=await buildRecette();
  console.log(`Recette ${metadata.commit}${metadata.dirty?' (arbre modifié)':''} · ${origin} · projet fictif ${projectId}`);
  const require=createRequire(import.meta.url),cli=require.resolve('firebase-tools/lib/bin/firebase.js');
  const child=spawn(process.execPath,[cli,'emulators:exec','--project',projectId,'--config','firebase.recette.json','--only','auth,firestore,storage','node scripts/recette/serve.mjs'],{cwd:root,env,stdio:'inherit'});
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>child.kill(signal));
  await new Promise((done,reject)=>{child.once('error',reject);child.once('exit',code=>code===0?done():reject(new Error(`Recette arrêtée (code ${code??'signal'})`)));});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))launch().catch(e=>{console.error(e.message);process.exitCode=1;});
