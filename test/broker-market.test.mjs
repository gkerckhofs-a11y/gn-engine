import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {marketFixture} from './support/market-suite.mjs';
test('Marché SO : Courtier principal autorisé, sept autres classes refusées y compris compétences COU secondaires',async()=>{
 const f=await marketFixture(()=>new MemoryStore()),sid=f.sessionId,cid=f.characters[1],sp=`sessions/${sid}`,cp=`${sp}/characters/${cid}`;
 const s=await f.store.get(sp),c=await f.store.get(cp);
 f.store.data.set(sp,{...s,spaceOutlaws:{ruleProfile:'SPACE_OUTLAWS_V07'}});
 for(const id of ['COM','TRA','PIL','MED','MEC','INF','ROG']){
  f.store.data.set(cp,{...c,abilityProfile:{class:{id},skills:[{id:'COU-01',level:5}]}});
  for(const action of ['market','commodityMarket','myMarketNegotiations'])await assert.rejects(f.read(action,f.bob,{sessionId:sid}),{code:'FORBIDDEN'});
 }
 f.store.data.set(cp,{...c,abilityProfile:{class:{id:'COU'},skills:[]}});
 assert.ok((await f.market()).economyEnabled);await f.read('commodityMarket',f.bob,{sessionId:sid});
});
