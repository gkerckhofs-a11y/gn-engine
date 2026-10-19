import assert from 'node:assert/strict';

const origin='https://gn-engine.web.app';
const page=await fetch(origin,{signal:AbortSignal.timeout(30_000)});
assert.equal(page.status,200,'Le site doit répondre HTTP 200');
assert.match(await page.text(),/GN Engine/,'La page GN Engine doit être publiée');

const api=await fetch(`${origin}/api/check`,{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({action:'dashboard',input:{}}),
  signal:AbortSignal.timeout(30_000),
});
assert.equal(api.status,401,'Une lecture organisateur anonyme doit être refusée');
assert.equal((await api.json()).error,'LOGIN_REQUIRED');
console.log('Site accessible et API privée refusant les accès anonymes.');
