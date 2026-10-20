import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForPublishedPage,waitForPublishedVersion} from '../scripts/deployment-checks.mjs';
const common={origin:'https://example.invalid',expected:'0.9.0',attempts:3};
const page=version=>({status:200,text:async()=>`<footer>GN Engine · ${version} <span>Scénarios</span></footer>`});
test('publication : version exacte dans le pied de page, indépendante de son habillage',async()=>{
  for(const html of ['<footer><span>GN Engine · 0.9.0</span><span>Scénarios</span></footer>','<footer class="site-footer">GN Engine · <strong>0.9.0</strong></footer>']){
    assert.equal(await waitForPublishedPage({...common,attempts:1,request:async()=>({status:200,text:async()=>html})}),html);
  }
  for(const html of ['<footer>GN Engine · 0.9.01 </footer>','<footer>GN Engine · 0.9.0-beta </footer>','<div>GN Engine · 0.9.0 </div><footer>Ancienne page</footer>']){
    await assert.rejects(waitForPublishedPage({...common,attempts:1,request:async()=>({status:200,text:async()=>html})}),/Le pied de page doit afficher la version publiée/);
  }
});
test('publication : ancienne page réessayée puis pied de page exact exigé',async()=>{
  const urls=[],delays=[],pending=[];
  const html=await waitForPublishedPage({...common,delay:async ms=>delays.push(ms),onPending:p=>pending.push(p),request:async(url,options)=>{
    urls.push(url);assert.equal(options.cache,'no-store');return page(urls.length===1?'0.8.0':'0.9.0');
  }});assert.match(html,/0\.9\.0/);assert.equal(new Set(urls).size,2);assert.deepEqual(delays,[5000]);assert.equal(pending[0].observed,'0.8.0');
});
test('publication : ancienne page persistante refusée après le nombre maximal de tentatives',async()=>{
  let calls=0,waits=0;
  await assert.rejects(waitForPublishedPage({...common,delay:async()=>waits++,request:async()=>{calls++;return page('0.8.0');}}),/Le pied de page doit afficher la version publiée/);
  assert.equal(calls,3);assert.equal(waits,2);
});
test('publication : page indisponible réessayée, refus HTTP et mauvaise page immédiatement bloquants',async()=>{
  let calls=0;await waitForPublishedPage({...common,delay:async()=>{},request:async()=>++calls===1?{status:503}:page('0.9.0')});assert.equal(calls,2);
  for(const response of [{status:401},{status:200,text:async()=>'<html>Autre site</html>'}]){
    let count=0;await assert.rejects(waitForPublishedPage({...common,delay:async()=>assert.fail('Ne pas réessayer ce refus'),request:async()=>{count++;return response;}}));assert.equal(count,1);
  }
});
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
