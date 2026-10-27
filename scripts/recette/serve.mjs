import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {requireRecetteEnvironment,origin} from './config.mjs';
import {createRecetteIdentities} from './auth.mjs';
import {output} from './build.mjs';
import {seedMissionScenario} from './scenario.mjs';
import {recetteApp} from './app.mjs';

// Check all emulator destinations before importing the real Firebase handler.
Object.assign(process.env,requireRecetteEnvironment(process.env,{running:true}));
const metadata=JSON.parse(await readFile(resolve(output,'recette-build.json'),'utf8'));
if(metadata.mode!=='LOCAL_EMULATORS'||metadata.projectId!==process.env.GCLOUD_PROJECT)throw new Error('Compilation locale de recette requise');
const {api}=await import('../../src/server/index.mjs');
const {tokens,uids}=await createRecetteIdentities(process.env);
const scenario={};
const app=recetteApp({api,directory:output,metadata,scenario});
const server=await new Promise((resolve,reject)=>{const s=app.listen(4173,'127.0.0.1',()=>resolve(s));s.once('error',reject);});
try{
  const call=async(action,input,role)=>{
    const response=await fetch(`${origin}/api/command`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${tokens[role]}`},body:JSON.stringify({action,input})});
    const data=await response.json();if(!response.ok)throw new Error(`${action}: ${data.error??response.status}`);return data.result;
  };
  Object.assign(scenario,await seedMissionScenario(call,uids));
  console.log(`Recette locale prête : ${origin}/recette.html · session ${scenario.sessionId} en pause. Aucune recette humaine exécutée.`);
}catch(error){server.closeAllConnections();server.close();throw error;}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{server.closeAllConnections();server.close(()=>process.exit(0));});
