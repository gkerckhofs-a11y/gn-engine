import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createWorkflow} from '../src/core/workflow.mjs';
import {MemoryStore} from './support/memory.mjs';
import {seedShowcase} from '../scripts/recette/showcase.mjs';
import {initialClassKit} from '../src/shared/initial-class-kit.mjs';
for(const classId of ['COM','ROG','TRA','MED','MEC','PIL','COU','INF'])test(`Démonstration ${classId} : dotation canonique seule, aucun achat médical automatique`,async()=>{
 const suffix=randomUUID(),actors=Object.fromEntries(['owner','player'].map(role=>[role,{uid:role+suffix,email:role+suffix+'@example.invalid',emailVerified:true,provider:'google.com',authTime:100}]));
 const workflow=createWorkflow({store:new MemoryStore(),ownerEmail:actors.owner.email,now:()=>100000});
 const call=(action,input,role='owner')=>workflow.dispatch(action,actors[role],input);
 const result=await seedShowcase(call,Object.fromEntries(Object.entries(actors).map(([k,v])=>[k,v.uid])),{classId,label:classId,name:'Personnage test',pilot:true});
 const bag=await call('myInventory',{sessionId:result.sessionId},'player');
 const expected=initialClassKit(classId);assert.ok(expected);
 const medical=bag.lots.filter(l=>l.item.id==='kit_medical-supplies');assert.equal(medical.reduce((n,l)=>n+l.quantity,0),classId==='MED'?2:0);
 assert.equal(bag.transfers.length,0);const wallet=await call('myWallet',{sessionId:result.sessionId},'player');assert.equal(wallet.account.protectedCredits,200);
});
