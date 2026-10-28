import test from 'node:test';
import assert from 'node:assert/strict';
import {fullReleaseCI,awaitReleaseCI,requiredJobs} from '../scripts/await-release-ci.mjs';
const sha='a'.repeat(40);
const run={id:12,head_sha:sha,head_branch:'main',event:'push',path:'.github/workflows/check.yml',repository:{full_name:'gkerckhofs-a11y/gn-engine'},status:'completed',conclusion:'success'};
const jobs=()=>requiredJobs.map(name=>({name,run_id:12,head_sha:sha,status:'completed',conclusion:'success'}));
test('Publication : exige les dix jobs réussis du SHA main exact',()=>{
  assert.equal(fullReleaseCI(run,jobs(),sha),12);
  for(const patch of [{head_sha:'b'.repeat(40)},{head_branch:'other'},{event:'pull_request'},{path:'.github/workflows/other.yml'},{repository:{full_name:'other/repo'}},{status:'in_progress'},{conclusion:'failure'}])assert.throws(()=>fullReleaseCI({...run,...patch},jobs(),sha));
  for(const patch of [{status:'in_progress'},{conclusion:'skipped'},{conclusion:'cancelled'},{conclusion:'failure'},{head_sha:'b'.repeat(40)},{run_id:13}]){const list=jobs();list[5]={...list[5],...patch};assert.throws(()=>fullReleaseCI(run,list,sha));}
  assert.throws(()=>fullReleaseCI(run,jobs().slice(0,-1),sha));
  assert.throws(()=>fullReleaseCI(run,[...jobs(),jobs()[0]],sha));
});
test('Publication : attend la fin, ignore une autre CI et vérifie la liste complète',async()=>{
  let polls=0,delays=0;
  const request=async url=>({ok:true,json:async()=>url.includes('/jobs?')?{total_count:10,jobs:jobs()}:url.endsWith('/12')?run:{workflow_runs:[{...run,status:++polls===1?'in_progress':'completed'},{...run,id:13,path:'.github/workflows/other.yml'}]}});
  assert.equal(await awaitReleaseCI({sha,token:'fake',request,delay:async()=>{delays++;},attempts:2}),12);assert.equal(delays,1);
});
test('Publication : refus fermé sur erreur API, délai, échec, troncature ou ancienne réussite',async()=>{
  const response=value=>async()=>({ok:true,json:async()=>value});
  await assert.rejects(awaitReleaseCI({sha,token:'fake',attempts:1,request:async()=>({ok:false,status:403})}));
  await assert.rejects(awaitReleaseCI({sha,token:'fake',attempts:1,request:response({workflow_runs:[]})}));
  await assert.rejects(awaitReleaseCI({sha,token:'fake',attempts:1,request:async url=>({ok:true,json:async()=>url.includes('/jobs?')?{total_count:11,jobs:jobs()}:url.endsWith('/12')?run:{workflow_runs:[run]}})}));
  const failed={...run,id:13,conclusion:'failure'};
  await assert.rejects(awaitReleaseCI({sha,token:'fake',attempts:1,request:async url=>({ok:true,json:async()=>url.includes('/jobs?')?{total_count:10,jobs:jobs()}:url.endsWith('/13')?failed:{workflow_runs:[run,failed]}})}));
});
