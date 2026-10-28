import {execFileSync} from 'node:child_process';
import {readFileSync,appendFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {scopeForChanges,matrixFor} from './ci-scope.mjs';

const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const sha=value=>typeof value==='string'&&/^[0-9a-f]{40}$/.test(value);
export function eligibleRuns(runs,{repository,branch,runId}){
  return runs.filter(r=>r.conclusion==='success'&&r.status==='completed'&&r.id!==Number(runId)
    &&['push','pull_request'].includes(r.event)&&r.head_branch===branch
    &&r.head_repository?.full_name===repository&&sha(r.head_sha))
    .sort((a,b)=>b.run_number-a.run_number);
}

export async function makePlan({env=process.env,event,fetchRuns,gitCommand=git}={}){
  event??=JSON.parse(readFileSync(env.GITHUB_EVENT_PATH,'utf8'));
  const repository=env.GITHUB_REPOSITORY,branch=event.pull_request?.head.ref??env.GITHUB_REF_NAME;
  const checkout=gitCommand('rev-parse','HEAD');
  const candidate=event.pull_request?.head.sha??checkout;
  if(!sha(candidate)||!sha(checkout))throw new Error('Invalid candidate SHA');
  const message=gitCommand('log','-1','--format=%B',candidate);
  const forceFull=env.GITHUB_EVENT_NAME!=='pull_request'||event.action==='ready_for_review'
    ||event.pull_request?.draft===false||message.includes('[ci full]');
  let baseline=null,paths=[],baselineRun=null;
  if(!forceFull&&event.pull_request?.head.repo.full_name===repository){
    try{
      const runs=await (fetchRuns??(async()=>{
        const url=`https://api.github.com/repos/${repository}/actions/workflows/check.yml/runs?branch=${encodeURIComponent(branch)}&status=success&per_page=100`;
        const response=await fetch(url,{headers:{Authorization:`Bearer ${env.GH_TOKEN}`,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw new Error(`GitHub status ${response.status}`);
        return (await response.json()).workflow_runs;
      }))();
      for(const run of eligibleRuns(runs,{repository,branch,runId:env.GITHUB_RUN_ID})){
        try{
          gitCommand('merge-base','--is-ancestor',run.head_sha,checkout);
          // Compare trees, including the current merge with base. Do not just compare
          // the latest push: an earlier failing/cancelled commit must remain covered.
          paths=gitCommand('diff','--no-renames','--name-only','-z',run.head_sha,checkout).split('\0').filter(Boolean);
          baseline=run.head_sha;baselineRun=run.id;break;
        }catch{ /* Non-ancestor, unavailable commit or diff: try another successful run. */ }
      }
    }catch{ /* No trustworthy API history: full validation. */ }
  }
  const scope=scopeForChanges(paths,{forceFull,reliableBase:!!baseline});
  return {...scope,checkout,candidate,baseline,baselineRun,paths,matrix:matrixFor(scope.suites)};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const plan=await makePlan();
  writeFileSync('ci-plan.json',JSON.stringify(plan,null,2)+'\n');
  console.log(JSON.stringify(plan,null,2));
  if(process.env.GITHUB_OUTPUT)for(const [key,value] of Object.entries({
    profile:plan.profile,matrix:JSON.stringify(plan.matrix),suites:JSON.stringify(plan.suites),http:String(plan.http),
  }))appendFileSync(process.env.GITHUB_OUTPUT,`${key}=${value}\n`);
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `### Tests sélectionnés : ${plan.profile}\n\n${plan.reason}\n\nCandidat : \`${plan.candidate}\` ; checkout : \`${plan.checkout}\`.\n\nRéférence réussie : ${plan.baseline??'aucune (suite complète)'}${plan.baselineRun?` — run ${plan.baselineRun}`:''}.\n\nTous les tests applicatifs et le build ; ${plan.suites.length} suites Firestore en ${plan.matrix.length} lots ; HTTP/Auth/Storage : ${plan.http?'complet':'non requis'}.\n\nSuites : ${plan.suites.join(', ')||'aucune'}.\n`);
}
