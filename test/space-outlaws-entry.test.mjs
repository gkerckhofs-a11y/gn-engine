import test from 'node:test';
import assert from 'node:assert/strict';
import {soReleaseDefinitionChecks,soReleaseManifest} from '../src/core/space-outlaws-release-check.mjs';
import {spaceOutlawsEntrySuite} from './support/space-outlaws-entry-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceOutlawsEntrySuite(()=>new MemoryStore());

test('Publication Space Outlaws : la limite d’activation compte le pire cas initial et écarte les archives',()=>{
 const changes=[
  {type:'character',operation:'UPSERT',entityId:'first'},
  {type:'character',operation:'UPSERT',entityId:'second'},
  {type:'knowledge',operation:'UPSERT',data:{initialCharacterIds:['first']}},
  {type:'knowledge',operation:'UPSERT',data:{initialCharacterIds:['second']}},
  {type:'fieldTarget',operation:'UPSERT',data:{kind:'ANALYSIS'}},
  ...Array.from({length:435},()=>({type:'item',operation:'UPSERT',data:{}})),
 ];
 const limited=changes=>soReleaseDefinitionChecks(changes).definitions.some(d=>d.code==='SO_RUNTIME_LIMIT');
 assert.equal(limited(changes),false);
 const extra={type:'mission',operation:'UPSERT',data:{}};
 assert.equal(limited([...changes,extra]),true);
 assert.equal(limited([...changes,{...extra,operation:'ARCHIVE'}]),false);
});

test('Publication Space Outlaws : bornes du manifeste sans tri mutatif ni troncature',()=>{
 const changes=[{id:'b'},{id:'a'}];
 assert.deepEqual(soReleaseManifest(changes).entries.map(e=>e.path),['changes/a','changes/b']);
 assert.deepEqual(changes.map(c=>c.id),['b','a']);
 assert.throws(()=>soReleaseManifest([]),{code:'SO_RELEASE_LIMIT'});
 assert.throws(()=>soReleaseManifest([{id:'oversized',value:'x'.repeat(800000)}]),{code:'CAMPAIGN_RECORD_TOO_LARGE'});
 const value='é'.repeat(50000);
 assert.throws(()=>soReleaseManifest(Array.from({length:64},(_,i)=>({id:String(i),value}))),{code:'SO_RELEASE_LIMIT'});
});
