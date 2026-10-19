import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForPublishedVersion} from '../scripts/deployment-checks.mjs';
const common={origin:'https://example.invalid',expected:'0.9.0',attempts:3};
test('publication : ancien manifeste réessayé puis version exacte exigée, sans cache partagé',async()=>{
  const urls=[],delays=[];
  const version=await waitForPublishedVersion({...common,delay:async ms=>delays.push(ms),request:async(url,options)=>{
    urls.push(url);assert.equal(options.cache,'no-store');return {status:200,json:async()=>({version:urls.length===1?'0.8.0':'0.9.0'})};
  }});assert.equal(version,'0.9.0');assert.equal(new Set(urls).size,2);assert.deepEqual(delays,[5000]);
});
test('publication : une mauvaise version persistante fait échouer la vérification après la borne',async()=>{
  let count=0,waits=0;await assert.rejects(waitForPublishedVersion({...common,delay:async()=>waits++,request:async()=>{count++;return {status:200,json:async()=>({version:'0.8.0'})};}}),/Hosting doit servir la version demandée/);
  assert.equal(count,3);assert.equal(waits,2);
});
test('publication : indisponibilité réessayée, réponse non autorisée ou manifeste invalide refusés immédiatement',async()=>{
  let count=0;assert.equal(await waitForPublishedVersion({...common,delay:async()=>{},request:async()=>++count===1?{status:503}:{status:200,json:async()=>({version:'0.9.0'})}}),'0.9.0');assert.equal(count,2);
  for(const response of [{status:401},{status:200,json:async()=>({})}]){
    let calls=0;await assert.rejects(waitForPublishedVersion({...common,delay:async()=>assert.fail('Ne pas réessayer ce refus'),request:async()=>{calls++;return response;}}));assert.equal(calls,1);
  }
});
