import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import express from 'express';
if(!process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Auth emulator required');
process.env.OWNER_EMAIL='gkerckhofs@gmail.com';
const {api}=await import('../../src/server/index.mjs');
// The actual exported HTTP handler is mounted in Express; Firebase Auth and
// Firestore use their emulators. No Functions runtime socket needed locally.
const app=express();app.use(express.json());app.post('/api',api);
const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
after(()=>new Promise(resolve=>server.close(resolve)));
const endpoint=`http://127.0.0.1:${server.address().port}/api`;
const request=async(action,input={},token)=>{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({action,input})});
  return {status:response.status,...await response.json()};
};
async function googleTestAccount(email){
  // Only Auth Emulator accepts these unsigned synthetic Google assertions.
  const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const jwt=`${enc({alg:'none',typ:'JWT'})}.${enc({sub:randomUUID(),email,email_verified:true,name:'Test isolé'})}.`;
  const response=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake-key`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestUri:'http://localhost',postBody:`id_token=${jwt}&providerId=google.com`,returnSecureToken:true})});
  const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data.idToken;
}
test('HTTP + Auth : le jeton vérifié détermine le rôle, jamais le JSON ou un en-tête Sites',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),player=await googleTestAccount(`${randomUUID()}@example.invalid`);
  assert.equal((await request('identity',{},owner)).result.admin,true);
  assert.equal((await request('identity',{email:'gkerckhofs@gmail.com',admin:true},player)).result.admin,false);
  assert.equal((await request('dashboard',{},player)).status,403);
  assert.equal((await request('dashboard')).status,401);
  assert.equal((await request('dashboard',{},'forged')).status,401);
  const spoof=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'owner'},body:JSON.stringify({action:'dashboard'})});
  assert.equal(spoof.status,401);
  const created=await request('createScenario',{requestId:randomUUID(),title:'API intégrée'},owner);assert.equal(created.status,200);assert.ok(created.result.id);
});
