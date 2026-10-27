import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {firestoreStore} from '../../src/adapters/firestore.mjs';
import {selectFirestoreSuites} from '../../scripts/ci-scope.mjs';
if(!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Emulators required; never run this suite against production.');
const projectId='demo-gn-engine';
initializeApp({projectId});const firestore=getFirestore();
const selected=selectFirestoreSuites(process.env);
console.log('Firestore suites:',selected.map(x=>x.id).join(', '));
for(const suite of selected){
  if(suite.id==='firestore-rules')continue;
  const module=await import(suite.module);
  module[suite.exportName](()=>firestoreStore(firestore),suite.label);
}
if(selected.some(x=>x.id==='firestore-rules'))
test('règles Firestore : un client non authentifié ne peut lire ni écrire les secrets',async()=>{
  const root=`http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents`;
  await firestore.doc('private/test').set({secret:'invisible'});
  const r=await fetch(`${root}/private/test`);assert.equal(r.status,403);
  const w=await fetch(`${root}/private/new`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:{admin:{booleanValue:true}}})});assert.equal(w.status,403);
});
