import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {createRecycleBinService,recycleBinStore} from '../src/core/recycle-bin.mjs';
function fixture(){const store=new MemoryStore();store.data.set('sessions/s',{id:'s',title:'Essai',ownerUid:'owner',stage:'ARCHIVED',revision:2});store.data.set('sessions/s/characters/c',{id:'c',secret:'conservé'});const admin=a=>{if(a?.uid!=='owner')throw Object.assign(Error(),{code:'FORBIDDEN'});};return {store,view:recycleBinStore(store),run:(action,input={},actor={uid:'owner'})=>createRecycleBinService({store,admin,now:()=>100})(action,actor,{kind:'session',id:'s',revision:2,...input})};}
test('Corbeille : suppression restaurable, accès directs et écritures fermés, historiques conservés',async()=>{
 const f=fixture();await f.run('trashRecord');assert.deepEqual(await f.view.list('sessions'),[]);assert.equal(await f.view.get('sessions/s'),null);assert.equal(await f.view.get('sessions/s/characters/c'),null);
 assert.deepEqual(await f.store.get('sessions/s/characters/c'),{id:'c',secret:'conservé'});
 await assert.rejects(f.view.runTransaction(tx=>tx.set('sessions/s/characters/x',{id:'x'})),{code:'NOT_FOUND'});
 await f.run('restoreRecord');assert.equal((await f.view.get('sessions/s')).id,'s');assert.equal((await f.view.get('sessions/s/characters/c')).secret,'conservé');
});
test('Corbeille : propriétaire seulement, révision vérifiée, partie en cours refusée',async()=>{
 const f=fixture();await assert.rejects(f.run('trashRecord',{}, {uid:'other'}),{code:'FORBIDDEN'});await assert.rejects(f.run('trashRecord',{revision:1}),{code:'STALE_REVISION'});
 f.store.data.set('sessions/s',{...await f.store.get('sessions/s'),stage:'EN_JEU'});await assert.rejects(f.run('trashRecord'),{code:'ARCHIVE_BEFORE_REMOVAL'});assert.equal((await f.view.list('sessions')).length,1);
});
