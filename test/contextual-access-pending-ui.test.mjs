import test from 'node:test';
import assert from 'node:assert/strict';
import {bindLocalAccess} from '../web/contextual-access.mjs';

test('Terminal local : accès inerte jusqu’à la fin de l’actualisation, saisie protégée et double envoi bloqué',async()=>{
 const handlers={},button={disabled:false},error={textContent:''},attributes=new Map();
 const form={dataset:{local:'code',id:'dock'},querySelector:()=>button};
 const root={inert:false,addEventListener:(kind,fn)=>handlers[kind]=fn,setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k),querySelector:()=>error};
 const SavedFormData=globalThis.FormData;
 globalThis.FormData=class {get(k){return k==='code'?'synthetic-test-code':null;}};
 try{
  let resolveApi,resolveRefresh,calls=0;const api=()=>{calls++;return new Promise(r=>resolveApi=r);},refresh=()=>new Promise(r=>resolveRefresh=r);
  bindLocalAccess(root,{api,sid:'session',data:null,origin:'https://example.invalid',refresh});
  const event=()=>({target:{closest:()=>form},preventDefault(){},stopPropagation(){}}),pending=handlers.submit(event());
  assert.equal(root.inert,true);assert.equal(attributes.get('aria-busy'),'true');assert.equal(button.disabled,true);
  await handlers.submit(event());assert.equal(calls,1);resolveApi({});await new Promise(r=>setImmediate(r));
  assert.equal(root.inert,true);assert.equal(button.disabled,true);resolveRefresh();await pending;
  assert.equal(root.inert,false);assert.equal(attributes.has('aria-busy'),false);assert.equal(button.disabled,false);
  bindLocalAccess(root,{api:async()=>{throw Error('Code refusé');},sid:'session',data:null,origin:'https://example.invalid',refresh:async()=>assert.fail('Pas de rafraîchissement sur refus')});
  await handlers.submit(event());assert.equal(root.inert,false);assert.equal(button.disabled,false);assert.equal(error.textContent,'Code refusé');
 }finally{globalThis.FormData=SavedFormData;}
});
