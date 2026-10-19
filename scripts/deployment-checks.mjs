import assert from 'node:assert/strict';

// A completed Hosting release may briefly serve the previous manifest at an edge.
// Retry availability and version propagation, never accept a different version.
export async function waitForPublishedVersion({origin,expected,request=fetch,delay=ms=>new Promise(r=>setTimeout(r,ms)),attempts=12,onPending=()=>{}}){
  const nonce=Date.now();let observed;
  for(let attempt=1;attempt<=attempts;attempt++){
    let response;
    try{response=await request(`${origin}/version.json?release=${encodeURIComponent(expected)}&check=${nonce}-${attempt}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});}
    catch(error){if(attempt===attempts)throw error;}
    if(response&&response.status!==404&&response.status<500){
      assert.equal(response.status,200,'Le manifeste de version doit être accessible');
      observed=(await response.json()).version;
      assert.equal(typeof observed,'string','Le manifeste doit contenir une version');
      if(observed===expected)return observed;
    }else await response?.body?.cancel();
    if(attempt===attempts)assert.equal(observed,expected,'Hosting doit servir la version demandée');
    onPending({attempt,observed});await delay(5000);
  }
}
