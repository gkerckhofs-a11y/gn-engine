import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {MemoryStore} from './support/memory.mjs';
import {mediaSuite,mediaFixture,sampleImage} from './support/media-suite.mjs';
import {processImage} from '../src/adapters/media-images.mjs';
mediaSuite(()=>new MemoryStore());
test('Images : transparence conservée et métadonnées retirées de toutes les variantes',async()=>{
  const bytes=await sharp(Buffer.from(await sampleImage(),'base64')).withExif({IFD0:{Artist:'Private Artist',Copyright:'Private copyright'}}).png().toBuffer(),p=await processImage(bytes.toString('base64'));
  for(const v of Object.values(p.variants)){const m=await sharp(v.data).metadata();assert.equal(m.hasAlpha,true);assert.equal(m.exif,undefined);assert.equal(m.xmp,undefined);assert.equal(m.iptc,undefined);}
});
test('Images : orientation normalisée, formats réels et bornes de dimensions',async()=>{
  const b=await sharp({create:{width:16,height:24,channels:3,background:'#fff'}}).withMetadata({orientation:6}).jpeg().toBuffer(),p=await processImage(b.toString('base64'));assert.equal(p.width,24);assert.equal(p.height,16);
  for(const b of [Buffer.from('<svg><script/></svg>'),Buffer.from('GIF89a'),Buffer.from([255,216,255,0])])await assert.rejects(processImage(b.toString('base64')),{code:'INVALID_IMAGE'});
  const huge=await sharp({create:{width:8001,height:1,channels:3,background:'#fff'}}).png().toBuffer();await assert.rejects(processImage(huge.toString('base64')),{code:'IMAGE_DIMENSIONS'});
});
test('Import : réponse de commit perdue ne supprime pas les binaires validés',async()=>{
  const store=new MemoryStore(),f=await mediaFixture(()=>store),original=store.runTransaction.bind(store);let failed=false;
  store.runTransaction=async cb=>{const result=await original(cb);if(!failed&&result?.status==='READY'){failed=true;throw new Error('Lost response after commit');}return result;};
  const a=await f.upload();assert.equal(a.status,'READY');assert.equal(f.images.data.size,3);assert.equal((await f.read('mediaCatalog')).total,1);
});

test('Mission : image ciblée, briefing verrouillé puis figé au contrat accepté',async()=>{
  const {contractFixture}=await import('./support/contracts-suite.mjs'),{MemoryImages}=await import('./support/media-suite.mjs'),{createWorkflow}=await import('../src/core/workflow.mjs'),{randomUUID}=await import('node:crypto');
  const f=await contractFixture(()=>new MemoryStore()),images=new MemoryImages(),w=createWorkflow({store:f.store,ownerEmail:f.owner.email,now:()=>100000,images,processImage});
  const read=(a,who=f.owner,i={})=>w.dispatch(a,who,i),cmd=(a,who=f.owner,i={})=>read(a,who,{requestId:randomUUID(),...i});
  const a=await cmd('mediaUpload',f.owner,{name:'Briefing SECRET',data:await sampleImage()}),b=await cmd('mediaUpload',f.owner,{name:'Autre SECRET',data:await sampleImage('#ccdd00')});
  const target=(id,slot='briefing',kind='announcement',entity=f.aid)=>({scope:'session',scopeId:f.sessionId,kind,id:entity,slot,mediaId:id});
  const assign=async targets=>{const input={targets,reason:'Recette mission'},p=await read('prepareMediaAssignments',f.owner,input);await cmd('assignMedia',f.owner,{...input,confirmation:p.confirmation});};
  await assign([target(a.id),target(b.id,'illustration')]);await f.edit({audience:{kind:'TARGETED',characterIds:[f.characters[1]],groupIds:[]}});
  const context={mode:'player',scope:'session',scopeId:f.sessionId,kind:'announcement',id:f.aid};
  assert.ok((await read('mediaRead',f.bob,{context,slot:'illustration'})).data);
  await assert.rejects(read('mediaRead',f.eve,{context,slot:'illustration'}),{code:'FORBIDDEN'});
  await assert.rejects(read('mediaRead',f.bob,{context,slot:'briefing'}),{code:'MEDIA_UNAVAILABLE'});
  const c=await f.propose(await f.prepareContract()),cc={...context,kind:'contract',id:c.id};assert.equal((await f.detail(c.id)).contract.mediaImages.briefing,undefined);
  await assert.rejects(read('mediaRead',f.bob,{context:cc,slot:'briefing'}),{code:'MEDIA_UNAVAILABLE'});
  await f.accept(c.id,await f.prepareAccept(c.id));assert.ok((await read('mediaRead',f.bob,{context:cc,slot:'briefing'})).data);
  await assign([target(b.id)]);assert.equal((await f.detail(c.id)).contract.mediaImages.briefing.id,a.id);
  await assign([target(b.id,'briefing','contract',c.id)]);assert.equal((await f.detail(c.id)).contract.mediaImages.briefing.id,b.id);
  await assert.rejects(read('mediaRead',f.eve,{context:cc,slot:'briefing'}),{code:'FORBIDDEN'});
});

test('Galerie : pages de 24 et filtrage sans télécharger les originaux',async()=>{
  const f=await mediaFixture(()=>new MemoryStore());for(let i=0;i<25;i++)await f.upload({name:`Visuel ${i}`,data:await sampleImage({r:i,g:0,b:50,alpha:1})});
  const first=await f.read('mediaCatalog'),second=await f.read('mediaCatalog',f.owner,{after:first.next});assert.equal(first.images.length,24);assert.equal(second.images.length,1);assert.equal(new Set([...first.images,...second.images].map(a=>a.id)).size,25);assert.equal(JSON.stringify(first).includes('base64'),false);assert.equal(JSON.stringify(first).includes('variants'),false);
});

test('Préouverture : image manquante signalée et reprise sans bloquer la lecture du texte',async()=>{
  const f=await mediaFixture(()=>new MemoryStore()),a=await f.upload();await f.assign([f.target(a.id)]);const p={sessionId:f.sessionId};assert.deepEqual(await f.read('mediaHealth',f.owner,p),{checked:1,issues:[]});
  const [path,value]=[...f.images.data.entries()][0];f.images.data.delete(path);const h=await f.read('mediaHealth',f.owner,p);assert.equal(h.issues.length,1);assert.equal((await f.read('mySession',f.alice,p)).character.displayName,'Alice');
  await f.cmd('setStage',f.owner,{...p,stage:'PAUSE',revision:(await f.session()).revision});await assert.rejects(f.cmd('setStage',f.owner,{...p,stage:'EN_JEU',revision:(await f.session()).revision}),{code:'MEDIA_MISSING'});f.images.data.set(path,value);await f.cmd('setStage',f.owner,{...p,stage:'EN_JEU',revision:(await f.session()).revision});
});
