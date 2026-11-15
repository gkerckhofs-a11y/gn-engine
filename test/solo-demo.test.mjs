import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createWorkflow} from '../src/core/workflow.mjs';
import {MemoryStore} from './support/memory.mjs';
import {seedSoloDemo} from '../web/solo-demo-setup.mjs';
test('Essai solo : huit classes, groupe commun, casino, kits et droits isolés',async()=>{
 const owner={uid:'owner',email:'owner@example.invalid',emailVerified:true,provider:'google.com',authTime:100},store=new MemoryStore(),w=createWorkflow({store,ownerEmail:owner.email,now:()=>100000});
 let sid;
 const call=async(a,i,role='owner')=>{try{const r=await w.dispatch(a,owner,{...i,...(role==='owner'?{}:{demoRole:role,demoSession:sid})});if(a==='createSoloDemo')sid=r.id;return r;}catch(e){e.message=`${a}: ${e.message}`;throw e;}};
 const result=await seedSoloDemo(call);assert.equal((await store.list('sessions')).length,1);
 const session=await call('session',{sessionId:sid});assert.equal(session.characters.filter(c=>c.birth).length,8);assert.equal(session.groups[0].members.length,8);
 assert.equal((await call('sabaccAdmin',{})).tables.find(t=>t.id===result.tableId).status,'OPEN');
 for(const p of result.profiles){const own=await call('mySession',{sessionId:sid},p.id);assert.equal(own.character.primaryClassId,p.id);assert.equal(own.groups.length,1);const bag=await call('myInventory',{sessionId:sid},p.id);assert.equal(bag.lots.filter(l=>l.item.id==='kit_medical-supplies').reduce((n,l)=>n+l.quantity,0),p.id==='MED'?2:0);}
 await assert.rejects(w.dispatch('mySession',{...owner,uid:'intruder'},{sessionId:sid,demoRole:'PIL'}),{code:'FORBIDDEN'});
 await assert.rejects(call('session',{sessionId:sid},'PIL'),{code:'FORBIDDEN'});
 await assert.rejects(call('mySession',{sessionId:randomUUID()},'PIL'),{code:'FORBIDDEN'});
});

test('Essai solo : reprise après réponse perdue sans dupliquer session, personnages ni crédits',async()=>{
 const {runSoloDemo}=await import('../web/solo-demo-run.mjs');
 const owner={uid:'owner-resume',email:'resume@example.invalid',emailVerified:true,provider:'google.com',authTime:100},store=new MemoryStore(),w=createWorkflow({store,ownerEmail:owner.email,now:()=>100000});
 let maxCache=0;const cache=new Map(),storage={getItem:k=>cache.get(k)??null,setItem:(k,v)=>{maxCache=Math.max(maxCache,Buffer.byteLength(v));cache.set(k,v);},removeItem:k=>cache.delete(k)};let lose=true;
 const api=async(a,i)=>{const r=await w.dispatch(a,owner,i);if(a==='saveCentralItem'&&lose){lose=false;throw Error('Réponse perdue');}return r;};
 await assert.rejects(runSoloDemo(api,storage,'test'),/Réponse perdue/);
 const result=await runSoloDemo(api,storage,'test');assert.equal((await store.list('sessions')).length,1);assert.equal(cache.size,0);assert.ok(maxCache<1000000,`Cache de reprise trop volumineux : ${maxCache}`);
 for(const p of result.profiles){const wallet=await w.dispatch('myWallet',owner,{sessionId:result.sessionId,demoRole:p.id});assert.equal(wallet.account.balance,1000);assert.equal(wallet.account.protectedCredits,200);}
});

test('Vaisseau de l’essai : huit classes recrutées sans nouveau compte, compétence, PA ou ressource',async()=>{
 const owner={uid:'ship-demo-owner',email:'ship-demo@example.invalid',emailVerified:true,provider:'google.com',authTime:100},store=new MemoryStore(),w=createWorkflow({store,ownerEmail:owner.email,now:()=>100000});let sid;
 const call=async(a,i={},role='owner')=>{const r=await w.dispatch(a,owner,{...i,...(role==='owner'?{}:{demoRole:role,demoSession:sid})});if(a==='createSoloDemo')sid=r.id;return r;};const result=await seedSoloDemo(call),ships=await store.list(`sessions/${sid}/ships`),characters=await store.list(`sessions/${sid}/characters`),inventory=await store.list(`sessions/${sid}/inventory`),accounts=await store.list(`sessions/${sid}/accounts`);
 for(const p of result.profiles){const own=await call('mySession',{sessionId:sid},p.id);if(p.id!=='PIL'){const input={sessionId:sid,shipId:'pilot-cargo',targetId:own.character.id,role:'MEMBER',permissions:{journal:false,fuelContribution:false,logistics:false,ownerFreight:false,maintenance:false},reason:'Équipage fictif volontaire'},q=await call('prepareShipRecruitment',input,'PIL'),r=await call('inviteShipMember',{...input,confirmation:q.confirmation,requestId:randomUUID()},'PIL'),inv=await call('shipInvitation',{sessionId:sid,invitationId:r.id},p.id);await call('respondShipInvitation',{sessionId:sid,invitationId:r.id,accept:true,confirmation:inv.confirmation,requestId:randomUUID()},p.id);}
  const d=await call('shipWorkspace',{sessionId:sid,shipId:'pilot-cargo'},p.id);assert.equal(d.ship.id,'pilot-cargo');if(p.id!=='PIL'){assert.equal(d.ship.permissions.logistics,false);assert.equal(d.ship.permissions.fuel,false);assert.equal(d.ship.permissions.assignPilot,false);}}
 assert.equal((await store.list('sessions')).length,1);assert.deepEqual(await store.list(`sessions/${sid}/ships`),ships);assert.deepEqual(await store.list(`sessions/${sid}/characters`),characters);assert.deepEqual(await store.list(`sessions/${sid}/inventory`),inventory);assert.deepEqual(await store.list(`sessions/${sid}/accounts`),accounts);
});
