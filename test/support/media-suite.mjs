import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {createWorkflow} from '../../src/core/workflow.mjs';
import {processImage} from '../../src/adapters/media-images.mjs';
import {mediaLimits} from '../../src/core/media-state.mjs';
import {economyFixture} from './economy-suite.mjs';
export class MemoryImages{
  constructor(){this.data=new Map();this.writes=0;this.failAt=0;this.failRemove=false;}
  async put(p,b,m){this.writes++;if(this.failAt===this.writes)throw new Error('Storage unavailable');this.data.set(p,{data:Buffer.from(b),mime:m});}
  async exists(p){return this.data.has(p);}
  async read(p){const r=this.data.get(p);if(!r)throw new Error('Missing');return r.data;}
  async remove(p){if(this.failRemove)throw new Error('Unavailable');this.data.delete(p);}
}
export const sampleImage=async color=> (await sharp({create:{width:24,height:16,channels:4,background:color??{r:20,g:40,b:60,alpha:.4}}}).png().toBuffer()).toString('base64');
export async function mediaFixture(makeStore){
  const f=await economyFixture(makeStore),images=new MemoryImages();let time=100000;
  const workflow=createWorkflow({store:f.store,ownerEmail:f.owner.email,now:()=>time,images,processImage});
  const read=(a,who=f.owner,i={})=>workflow.dispatch(a,who,i),cmd=(a,who=f.owner,i={})=>read(a,who,{requestId:randomUUID(),...i});
  const upload=async(patch={},who=f.owner)=>cmd('mediaUpload',who,{name:'IMAGE_INTERNE_SECRETE',data:await sampleImage(),...patch});
  const assign=async(targets,who=f.owner,patch={})=>{const p={targets,reason:'Recette visuels'},x=await read('prepareMediaAssignments',who,p);return cmd('assignMedia',who,{...p,confirmation:x.confirmation,...patch});};
  const target=(mediaId,patch={})=>({scope:'session',scopeId:f.sessionId,kind:'character',id:f.characters[0],slot:'private',mediaId,...patch});
  const picture=(who=f.alice,patch={})=>read('mediaRead',who,{context:{mode:'player',scope:'session',scopeId:f.sessionId,kind:'character',id:f.characters[0]},slot:'private',...patch});
  const removal=async(ids,action='trashMedia',patch={},who=f.owner)=>{const p={ids,...patch},x=await read('prepareMediaRemoval',who,p);return cmd(action,who,{...p,confirmation:x.confirmation});};
  return {...f,read,cmd,images,upload,assign,target,picture,removal,advance:ms=>{time+=ms;f.advance(ms);}};
}
export function mediaSuite(makeStore,prefix='Médiathèque'){
  test(`${prefix} : lot de 20 images, un refus et réessais sans duplication`,async()=>{
    const f=await mediaFixture(makeStore),inputs=[];for(let i=0;i<20;i++)inputs.push({name:`Image ${i}`,data:await sampleImage({r:i*10,g:20,b:40,alpha:1}),requestId:randomUUID()});
    const results=[];for(const input of [...inputs,{name:'Refus',data:Buffer.from('<svg/>').toString('base64'),requestId:randomUUID()}])try{results.push(await f.read('mediaUpload',f.owner,input));}catch(e){results.push(e);}
    assert.equal(results.filter(x=>x.status==='READY').length,20);assert.equal(results[20].code,'INVALID_IMAGE');
    for(let i=0;i<20;i++)assert.deepEqual(await f.read('mediaUpload',f.owner,inputs[i]),results[i]);
    const d=await f.read('mediaCatalog');assert.equal(d.total,20);assert.equal(d.quota.count,20);assert.equal(d.quota.pendingBytes,0);assert.equal(f.images.data.size,60);
    await assert.rejects(f.upload({data:inputs[0].data}),{code:'MEDIA_DUPLICATE'});await f.upload({data:inputs[0].data,allowDuplicate:true});assert.equal((await f.read('mediaCatalog')).total,21);
    await assert.rejects(f.read('mediaUpload',f.owner,{...inputs[0],name:'Changed'}),{code:'REQUEST_ID_REUSED'});
  });
  test(`${prefix} : portrait public, fiche privée et accès direct selon le contenu`,async()=>{
    const f=await mediaFixture(makeStore),a=await f.upload();await f.assign([f.target(a.id),f.target(a.id,{slot:'portrait'})]);
    for(const variant of ['thumb','mobile','original']){const r=await f.picture(f.alice,{variant});assert.ok(r.data);assert.equal(JSON.stringify(r).includes('IMAGE_INTERNE_SECRETE'),false);await assert.rejects(f.picture(f.bob,{variant}),{code:'FORBIDDEN'});await assert.rejects(f.picture(null,{variant}),{code:'LOGIN_REQUIRED'});}
    const publicInput={context:{mode:'public',scope:'session',scopeId:f.sessionId,kind:'character',id:f.characters[0]},slot:'portrait'};assert.ok((await f.read('mediaRead',null,publicInput)).data);
    await assert.rejects(f.read('mediaRead',null,{...publicInput,slot:'private'}),{code:'FORBIDDEN'});
    await assert.rejects(f.read('mediaRead',f.bob,{context:{mode:'library'},mediaId:a.id}),{code:'FORBIDDEN'});
    await assert.rejects(f.read('mediaCatalog',f.bob),{code:'FORBIDDEN'});
    const own=await f.read('mySession',f.alice,{sessionId:f.sessionId}),badge=await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[0]});assert.ok(own.character.mediaImages.private);assert.equal(badge.mediaImages.private,undefined);
    await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,uid:f.alice.uid});await assert.rejects(f.picture(),{code:'FORBIDDEN'});
  });
  test(`${prefix} : MJ limité à sa session et révocation effective`,async()=>{
    const f=await mediaFixture(makeStore);await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:true,reason:'Recette'});
    const global=await f.upload(),local=await f.upload({sessionId:f.sessionId},f.staff);
    await assert.rejects(f.assign([f.target(global.id)],f.staff),{code:'FORBIDDEN'});await f.assign([f.target(local.id)],f.staff);
    const d=await f.read('mediaCatalog',f.staff,{sessionId:f.sessionId});assert.deepEqual(d.images.map(x=>x.id),[local.id]);
    await assert.rejects(f.read('mediaCatalog',f.staff),{code:'FORBIDDEN'});
    await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Recette'});
    await assert.rejects(f.read('mediaCatalog',f.staff,{sessionId:f.sessionId}),{code:'FORBIDDEN'});
    await assert.rejects(f.read('mediaRead',f.staff,{sessionId:f.sessionId,mediaId:local.id,context:{mode:'library'}}),{code:'FORBIDDEN'});
  });
  test(`${prefix} : versions de scénario et sessions figées, remplacement explicite`,async()=>{
    const f=await mediaFixture(makeStore),a=await f.upload(),b=await f.upload({data:await sampleImage('#ff0000')}),t=f.target(a.id,{scope:'scenario',scopeId:f.scenarioId});await f.assign([t]);
    const {id:versionId}=await f.cmd('publishScenario',f.owner,{scenarioId:f.scenarioId,revision:(await f.scenario()).revision}),{id:sid}=await f.cmd('createSession',f.owner,{...f.sessionInput,versionId});
    await f.assign([{...t,mediaId:b.id}]);const copy=await f.read('session',f.owner,{sessionId:sid});assert.equal(copy.characters.find(x=>x.id===f.characters[0]).mediaImages.private.id,a.id);
    await assert.rejects(f.removal([a.id]),{code:'MEDIA_IN_USE'});const uses=await f.read('prepareMediaRemoval',f.owner,{ids:[a.id]});assert.ok(uses.rows[0].usages.some(u=>u.path.includes('/versions/')));assert.ok(uses.rows[0].usages.some(u=>u.scopeId===sid));
    await f.assign([f.target(b.id,{scopeId:sid})]);assert.equal((await f.read('session',f.owner,{sessionId:sid})).characters.find(x=>x.id===f.characters[0]).mediaImages.private.id,b.id);
  });
  test(`${prefix} : objet attribué conserve son visuel après édition du modèle`,async()=>{
    const f=await mediaFixture(makeStore),a=await f.upload(),b=await f.upload({data:await sampleImage('#010203')});const {id:itemId}=await f.cmd('saveSessionItem',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,name:'Objet',kind:'STACKABLE',consumable:false,publicationState:'PUBLISHED',reason:'Recette'});
    await f.assign([f.target(a.id,{kind:'item',id:itemId,slot:'illustration'})]);const p={sessionId:f.sessionId,revision:(await f.session()).revision,characterId:f.characters[0],itemId,quantity:1,reason:'Recette'},g=await f.read('prepareGrantItem',f.owner,p),lot=await f.cmd('grantItem',f.owner,{...p,confirmation:g.confirmation});
    await f.assign([f.target(b.id,{kind:'item',id:itemId,slot:'illustration'})]);const bag=await f.read('myInventory',f.alice,{sessionId:f.sessionId});assert.equal(bag.lots[0].item.mediaImages.illustration.id,a.id);
    assert.ok((await f.read('mediaRead',f.alice,{context:{mode:'player',scope:'session',scopeId:f.sessionId,kind:'inventory',id:lot.id},slot:'illustration'})).data);
    await assert.rejects(f.read('mediaRead',f.bob,{context:{mode:'player',scope:'session',scopeId:f.sessionId,kind:'inventory',id:lot.id},slot:'illustration'}),{code:'FORBIDDEN'});
  });
  test(`${prefix} : confirmation périmée, série atomique et réessai unique`,async()=>{
    const f=await mediaFixture(makeStore),a=await f.upload(),input={targets:[f.target(a.id),f.target(a.id,{id:f.characters[1]})],reason:'Série'},p=await f.read('prepareMediaAssignments',f.owner,input),payload={...input,confirmation:p.confirmation,requestId:randomUUID()};
    const r=await f.read('assignMedia',f.owner,payload);assert.deepEqual(await f.read('assignMedia',f.owner,payload),r);assert.equal(r.updated,2);
    await assert.rejects(f.cmd('assignMedia',f.owner,{...payload,requestId:randomUUID()}),{code:'STALE_REVISION'});
    const before=(await f.session()).revision;await assert.rejects(f.assign([f.target(null),f.target(a.id,{id:randomUUID()})]),{code:'NOT_FOUND'});assert.equal((await f.session()).revision,before);
  });
  test(`${prefix} : concurrence suppression / attribution sans lien cassé`,async()=>{
    const f=await mediaFixture(makeStore),a=await f.upload(),assign={targets:[f.target(a.id)],reason:'Concurrence'},ap=await f.read('prepareMediaAssignments',f.owner,assign),rp=await f.read('prepareMediaRemoval',f.owner,{ids:[a.id]});
    const results=await Promise.allSettled([f.cmd('assignMedia',f.owner,{...assign,confirmation:ap.confirmation}),f.cmd('trashMedia',f.owner,{ids:[a.id],confirmation:rp.confirmation})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const stored=await f.store.get(`media/${a.id}`),c=(await f.session()).characters.find(c=>c.id===f.characters[0]);if(c.mediaImages?.private){assert.equal(stored.status,'READY');assert.ok(stored.usageCount>0);}else assert.equal(stored.status,'TRASHED');
  });
  test(`${prefix} : corbeille, restauration, délai de purge et reprise après panne`,async()=>{
    const f=await mediaFixture(makeStore),a=await f.upload();await f.removal([a.id]);assert.equal((await f.read('mediaCatalog',f.owner,{status:'TRASHED'})).total,1);await assert.rejects(f.removal([a.id],'purgeMedia'),{code:'MEDIA_PURGE_BLOCKED'});await f.removal([a.id],'restoreMedia');assert.equal((await f.read('mediaCatalog')).total,1);
    await f.removal([a.id]);f.advance(31*86400000);const p=await f.read('prepareMediaRemoval',f.owner,{ids:[a.id]}),input={ids:[a.id],confirmation:p.confirmation,requestId:randomUUID()};f.images.failRemove=true;await assert.rejects(f.read('purgeMedia',f.owner,input),{code:'MEDIA_STORAGE_UNAVAILABLE'});assert.equal((await f.store.get(`media/${a.id}`)).status,'PURGING');f.images.failRemove=false;
    const result=await f.read('purgeMedia',f.owner,input);assert.deepEqual(await f.read('purgeMedia',f.owner,input),result);assert.equal(f.images.data.size,0);assert.equal((await f.read('mediaCatalog')).quota.bytes,0);
  });
  test(`${prefix} : import interrompu nettoyé puis relancé sans affecter un succès`,async()=>{
    const f=await mediaFixture(makeStore);await f.upload();f.images.failAt=f.images.writes+2;f.images.failRemove=true;const input={name:'Interrompu',data:await sampleImage('#aabbcc'),requestId:randomUUID()};await assert.rejects(f.read('mediaUpload',f.owner,input),{code:'MEDIA_STORAGE_UNAVAILABLE'});assert.equal((await f.read('mediaCatalog')).quota.pendingCount,1);
    f.images.failRemove=false;f.advance(16*60000);assert.equal((await f.read('mediaCleanup')).cleaned,1);assert.equal(f.images.data.size,3);assert.equal((await f.read('mediaCatalog')).quota.pendingCount,0);await f.read('mediaUpload',f.owner,input);assert.equal(f.images.data.size,6);
  });
  test(`${prefix} : métadonnées, recherche, pagination, quota et droits avant décodage`,async()=>{
    const f=await mediaFixture(makeStore),a=await f.upload();await f.cmd('mediaMetadata',f.owner,{mediaId:a.id,revision:1,name:'Portrait',category:'Personnage',universe:'Univers A',tags:'garde, bleu',credit:'Auteur'});assert.equal((await f.read('mediaCatalog',f.owner,{search:'bleu',universe:'Univers A',category:'Personnage'})).total,1);
    await assert.rejects(f.upload({data:'invalid'},f.bob),{code:'FORBIDDEN'});await assert.rejects(f.read('mediaUpload',null,{}),{code:'LOGIN_REQUIRED'});
    await f.store.runTransaction(async tx=>{const path=`mediaQuotas/${awaitImportHash(f.owner.uid)}`,q=await tx.get(path);tx.set(path,{...q,count:mediaLimits.images});});
    await assert.rejects(f.upload({data:await sampleImage('#abcdef')}),{code:'MEDIA_QUOTA'});
  });
}
import {mediaHash as awaitImportHash} from '../../src/core/media-state.mjs';
