import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const repository='gkerckhofs-a11y/gn-engine';
export const requiredJobs=['plan','application','http','core',...Array.from({length:6},(_,i)=>`firestore (${i+1}/6)`)];

export function fullReleaseCI(run,jobs,sha){
  if(run.head_sha!==sha||run.head_branch!=='main'||run.event!=='push'||run.path!=='.github/workflows/check.yml'||run.repository?.full_name!==repository)throw new Error('CI étrangère au candidat main');
  if(run.status!=='completed'||run.conclusion!=='success')throw new Error('CI du candidat non réussie');
  if(jobs.length!==requiredJobs.length||requiredJobs.some(name=>jobs.filter(j=>j.name===name&&j.run_id===run.id&&j.head_sha===sha&&j.status==='completed'&&j.conclusion==='success').length!==1))throw new Error('Les dix jobs de la CI complète doivent réussir sur le candidat exact');
  return run.id;
}

export async function awaitReleaseCI({sha,token,request=fetch,delay=ms=>new Promise(r=>setTimeout(r,ms)),attempts=45,onPending=()=>{}}){
  if(!/^[a-f0-9]{40}$/.test(sha)||!token)throw new Error('SHA et authentification GitHub requis');
  const read=async path=>{
    const response=await request(`https://api.github.com/repos/${repository}/${path}`,{headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(`Lecture CI refusée : HTTP ${response.status}`);
    return response.json();
  };
  for(let attempt=1;attempt<=attempts;attempt++){
    const data=await read(`actions/runs?head_sha=${sha}&event=push&per_page=100`);
    const runs=data.workflow_runs.filter(r=>r.path==='.github/workflows/check.yml'&&r.head_sha===sha&&r.event==='push'&&r.head_branch==='main').sort((a,b)=>b.id-a.id);
    const run=runs[0];
    if(run?.status==='completed'){
      const detail=await read(`actions/runs/${run.id}`);
      const jobs=await read(`actions/runs/${run.id}/jobs?filter=latest&per_page=100`);
      if(jobs.total_count!==jobs.jobs.length)throw new Error('Liste de jobs incomplète');
      return fullReleaseCI(detail,jobs.jobs,sha);
    }
    onPending(attempt);
    if(attempt<attempts)await delay(20000);
  }
  throw new Error('CI complète du candidat indisponible dans le délai ; publication bloquée');
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.env.GITHUB_REPOSITORY!==repository||process.env.GITHUB_REF!=='refs/heads/main')throw new Error('Publication réservée à main du dépôt autorisé');
    const id=await awaitReleaseCI({sha:process.env.GITHUB_SHA,token:process.env.GH_TOKEN,onPending:n=>console.log(`Attente de la CI complète du candidat (${n}/45)`)});
    console.log(`CI complète validée : https://github.com/${repository}/actions/runs/${id}`);
  }catch(error){console.error(error.message);process.exitCode=1;}
}
