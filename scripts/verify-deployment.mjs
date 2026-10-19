import assert from 'node:assert/strict';

const origin='https://gn-engine.web.app';
// Le premier raccordement Hosting -> Cloud Run peut répondre brièvement 404.
// Réessayer seulement les erreurs de disponibilité ; un accès privé accepté
// à tort (HTTP 200 au lieu de 401) reste immédiatement bloquant.
async function waitForAvailability(url,options={}) {
  for(let attempt=1;attempt<=12;attempt++) {
    let response;
    try {
      response=await fetch(url,{...options,signal:AbortSignal.timeout(10_000)});
    } catch(error) {
      if(attempt===12)throw error;
    }
    if(response && response.status!==404 && response.status<500)return response;
    if(attempt===12)return response;
    await response?.body?.cancel();
    console.log(`Propagation de la publication : tentative ${attempt}/12.`);
    await new Promise(resolve=>setTimeout(resolve,5_000));
  }
}
const page=await waitForAvailability(origin);
assert.equal(page.status,200,'Le site doit répondre HTTP 200');
assert.match(await page.text(),/GN Engine/,'La page GN Engine doit être publiée');

const api=await waitForAvailability(`${origin}/api/check`,{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({action:'dashboard',input:{}}),
});
assert.equal(api.status,401,'Une lecture organisateur anonyme doit être refusée');
assert.equal((await api.json()).error,'LOGIN_REQUIRED');
console.log('Site accessible et API privée refusant les accès anonymes.');
