import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {centralCheckFixture} from './central-check-suite.mjs';
import {centralTestCharacter} from './central-characters-suite.mjs';
import {centralTestItem} from './central-master-suite.mjs';
import {centralItemRow} from './central-import-suite.mjs';
import {centralCharacterRow} from './central-character-import-suite.mjs';
import {centralLimits} from '../../src/core/central-master.mjs';
import {centralCheckLimits} from '../../src/core/central-check.mjs';

export const centralTestShop={name:'Comptoir synthétique',description:'Boutique fictive',sellerCharacterId:'character',locationTargetId:'counter',gmNotes:'Note M5 boutique privée'};
export const centralTestOffer={name:'Offre synthétique',shopId:'shop',itemId:'ingredient',unitPrice:17,buybackPrice:null,conditions:'Condition fictive',gmNotes:'Note M5 offre privée'};
export async function centralShopsFixture(makeStore){
 const f=await centralCheckFixture(makeStore);
 const saveShop=(extra={},actor=f.owner)=>f.cmd('saveCentralShop',{campaignId:f.cid,shopId:'shop',draftRevision:0,shopRevision:0,shop:centralTestShop,reason:'Préparer une boutique',...extra},actor);
 const saveOffer=(extra={},actor=f.owner)=>f.cmd('saveCentralOffer',{campaignId:f.cid,offerId:'offer',draftRevision:0,offerRevision:0,offer:centralTestOffer,reason:'Préparer une offre',...extra},actor);
 const archiveShop=(extra={},actor=f.owner)=>f.cmd('archiveCentralShop',{campaignId:f.cid,shopId:'shop',draftRevision:1,shopRevision:1,reason:'Archiver la boutique',...extra},actor);
 const archiveOffer=(extra={},actor=f.owner)=>f.cmd('archiveCentralOffer',{campaignId:f.cid,offerId:'offer',draftRevision:1,offerRevision:1,reason:'Archiver l’offre',...extra},actor);
 return {...f,saveShop,saveOffer,archiveShop,archiveOffer};
}
const refs=d=>d.diagnostics.filter(x=>x.code==='REFERENCE_MISSING');
export function centralShopsSuite(makeStore,prefix='Boutiques centrales C2g'){
 test(`${prefix} : lecture vide sans écriture, droits M5 explicites`,async()=>{
  const f=await centralShopsFixture(makeStore),d=await f.view('M5');assert.deepEqual(d.changes,[]);assert.deepEqual(d.references.shops,[]);assert.equal(d.draft.revision,0);assert.equal(d.publicationAvailable,false);assert.equal(await f.store.get(f.base),null);
  await f.grant({readWorkshops:['M5'],editWorkshops:[]});await f.view('M5',f.mj);await assert.rejects(f.saveShop({},f.mj),{code:'FORBIDDEN'});await assert.rejects(f.saveOffer({},f.mj),{code:'FORBIDDEN'});
  await f.grant({revision:1,readWorkshops:['M5'],editWorkshops:['M5']});assert.ok((await f.view('M5',f.mj)).workshops.find(w=>w.id==='M5').canEdit);
  await assert.rejects(f.grant({revision:2,readWorkshops:['M1'],editWorkshops:['M5']}),{code:'INVALID_CENTRAL_GRANT'});
 });
 test(`${prefix} : boutiques et offres natives, aucune ressource ni publication`,async()=>{
  const f=await centralShopsFixture(makeStore),before=await f.store.get(`sessions/${f.sid}`);await f.saveShop();await f.saveOffer({draftRevision:1});const d=await f.view('M5');
  assert.equal(d.draft.revision,2);assert.deepEqual(d.changes.map(c=>c.type),['offer','shop']);assert.equal(d.history.length,2);assert.equal(d.history[0].before,null);
  for(const c of d.changes){assert.equal(c.workshop,'M5');assert.equal(c.source,'WEB');assert.equal(c.data.publicationState,'DRAFT');assert.equal(c.data.schemaVersion,1);assert.equal(c.data.revision,1);assert.equal(c.data.masterArchived,false);}
  assert.deepEqual(await f.store.get(`sessions/${f.sid}`),before);for(const k of ['shops','offers','characters','items','inventory','accounts','ledger','actionPoints','knowledge','fieldTargets','registrations'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${k}`),[],k);
  assert.deepEqual(await f.store.list(`campaigns/${f.cid}/versions`),[]);assert.deepEqual(await f.store.list('scenarios',['ownerUid',f.owner.uid]),[]);
 });
 test(`${prefix} : offre préparée avant boutique, vendeur et objet, résolution sans copie`,async()=>{
  const f=await centralShopsFixture(makeStore);await f.saveOffer();let d=await f.view('M5');assert.deepEqual(refs(d).map(x=>x.referenceType),['shop','item']);const original=await f.store.get(`${f.base}/changes/offer_offer`);
  await f.saveShop({draftRevision:1});d=await f.view('M5');assert.deepEqual(refs(d).map(x=>x.referenceType).sort(),['character','item']);
  await f.save({draftRevision:2});await f.saveCharacter({draftRevision:3,character:{...centralTestCharacter,relations:[]}});d=await f.view('M5');assert.deepEqual(refs(d),[]);assert.deepEqual(d.diagnostics.map(x=>x.code),['REFERENCE_PENDING']);assert.equal(d.diagnostics[0].referenceType,'fieldTarget');
  assert.deepEqual(await f.store.get(`${f.base}/changes/offer_offer`),original);assert.equal(d.references.items.length,1);assert.equal(d.references.characters.length,1);assert.equal(d.references.shops.length,1);
  assert.doesNotMatch(JSON.stringify(d),/Note M1 privée|Secret de fiction|Biographie fictive|Note M2 privée|playerSecrets|abilityProfile/);
 });
 test(`${prefix} : lecture M5 seule ne consulte aucun catalogue M1 ou M2`,async()=>{
  const f=await centralShopsFixture(makeStore);await f.save();await f.saveCharacter({draftRevision:1});await f.configure(2);await f.saveShop({draftRevision:3});await f.saveOffer({draftRevision:4});await f.grant({readWorkshops:['M5'],editWorkshops:['M5']});
  const run=f.store.runTransaction.bind(f.store),reads=[];f.store.runTransaction=cb=>run(tx=>cb({...tx,get:async p=>{reads.push([p]);return tx.get(p);},list:async(...args)=>{reads.push(args);return tx.list(...args);}}));
  const d=await f.view('M5',f.mj);assert.deepEqual(reads.filter(([p])=>p===`${f.base}/changes`).map(x=>x[1]),[['workshop','M5']]);assert.ok(reads.every(([p])=>!p.includes('/admission/')&&!p.includes('/registrations')));
  assert.deepEqual(d.references.items,[]);assert.deepEqual(d.references.characters,[]);assert.equal(d.references.itemsReadable,false);assert.equal(d.references.charactersReadable,false);assert.equal(d.diagnostics.filter(x=>x.code==='REFERENCE_NOT_CHECKED').length,2);
  assert.doesNotMatch(JSON.stringify(d),/Ingrédient synthétique|Voyageuse synthétique|Note M[12] privée|species-test|Règles fictives|Notice fictive/);assert.equal(d.history.length,2);
  await assert.rejects(f.view('M1',f.mj),{code:'FORBIDDEN'});await assert.rejects(f.view('M2',f.mj),{code:'FORBIDDEN'});await assert.rejects(f.check(5,f.mj),{code:'FORBIDDEN'});await assert.rejects(f.read('admissionAdmin',f.mj,{sessionId:f.sid}),{code:'FORBIDDEN'});
 });
 test(`${prefix} : droits croisés indépendants et retrait immédiat des suggestions`,async()=>{
  const f=await centralShopsFixture(makeStore);await f.save();await f.saveCharacter({draftRevision:1});await f.saveShop({draftRevision:2});await f.saveOffer({draftRevision:3});
  await f.grant({readWorkshops:['M1','M5'],editWorkshops:['M5']});let d=await f.view('M5',f.mj);assert.equal(d.references.items.length,1);assert.equal(d.references.characters.length,0);assert.deepEqual(d.diagnostics.filter(x=>x.code==='REFERENCE_NOT_CHECKED').map(x=>x.referenceType),['character']);
  await f.grant({revision:1,readWorkshops:['M2','M5'],editWorkshops:['M5']});d=await f.view('M5',f.mj);assert.equal(d.references.items.length,0);assert.equal(d.references.characters.length,1);assert.doesNotMatch(JSON.stringify(d),/Ingrédient synthétique/);
  await f.grant({revision:2,readWorkshops:['M5'],editWorkshops:['M5']});d=await f.view('M5',f.mj);assert.doesNotMatch(JSON.stringify(d),/Voyageuse synthétique|Ingrédient synthétique/);
 });
 test(`${prefix} : existence et archives étrangères indiscernables sans lecture`,async()=>{
  const f=await centralShopsFixture(makeStore);await f.saveShop();await f.saveOffer({draftRevision:1});await f.grant({readWorkshops:['M5'],editWorkshops:[]});const before=(await f.view('M5',f.mj)).diagnostics;
  await f.save({draftRevision:2});await f.saveCharacter({draftRevision:3});await f.cmd('archiveCentralItem',{campaignId:f.cid,itemId:'ingredient',draftRevision:4,itemRevision:1,reason:'Essai'});await f.archiveCharacter({draftRevision:5});
  assert.deepEqual((await f.view('M5',f.mj)).diagnostics,before);assert.equal((await f.view('M5')).diagnostics.filter(x=>x.code==='REFERENCE_ARCHIVED').length,2);
 });
 test(`${prefix} : champs privilégiés et paramètres étrangers refusés atomiquement`,async()=>{
  const f=await centralShopsFixture(makeStore);for(const patch of [{stock:10},{accountId:'cash'},{publicationState:'PUBLISHED'},{sellerUid:'uid'},{role:'NPC'},{publicCode:'qr'},{schemaVersion:2},{id:'other'}])await assert.rejects(f.saveShop({shop:{...centralTestShop,...patch}}),{code:'INVALID_CENTRAL_SHOP'});
  for(const patch of [{stock:10},{quantity:2},{cash:200},{publicationState:'PUBLISHED'},{canSell:true},{id:'other'},{revision:7}])await assert.rejects(f.saveOffer({offer:{...centralTestOffer,...patch}}),{code:'INVALID_CENTRAL_OFFER'});
  await assert.rejects(f.saveShop({sessionId:f.sid}),{code:'INVALID_CENTRAL_MASTER'});await assert.rejects(f.saveOffer({workshop:'M1'}),{code:'INVALID_CENTRAL_MASTER'});assert.equal(await f.store.get(f.base),null);
 });
 test(`${prefix} : prix explicites positifs entiers, absence de tarif automatique`,async()=>{
  const f=await centralShopsFixture(makeStore);for(const v of [0,-1,1.5,'17',Infinity,Number.MAX_SAFE_INTEGER+1])for(const key of ['unitPrice','buybackPrice'])await assert.rejects(f.saveOffer({offer:{...centralTestOffer,[key]:v}}),{code:'INVALID_AMOUNT'});
  await f.saveOffer({offer:{...centralTestOffer,unitPrice:null,buybackPrice:null}});let d=await f.view('M5');assert.equal(d.changes[0].data.unitPrice,null);assert.ok(d.diagnostics.some(x=>x.code==='PRICE_REQUIRED'));const r=await f.check(1);assert.ok(r.diagnostics.some(x=>x.code==='PRICE_REQUIRED'&&x.entityType==='offer'));
  await f.saveOffer({draftRevision:1,offerRevision:1,offer:{...centralTestOffer,buybackPrice:4}});d=await f.view('M5');assert.equal(d.changes[0].data.buybackPrice,4);assert.equal(d.diagnostics.some(x=>x.code==='PRICE_REQUIRED'),false);
 });
 test(`${prefix} : textes bornés, identifiants valides et références manquantes visibles`,async()=>{
  const f=await centralShopsFixture(makeStore);for(const patch of [{name:''},{name:' '.repeat(3)},{name:'n'.repeat(151)},{description:'d'.repeat(6001)},{gmNotes:'n'.repeat(10001)}])await assert.rejects(f.saveShop({shop:{...centralTestShop,...patch}}),{code:'INVALID_CENTRAL_SHOP'});
  for(const patch of [{name:''},{name:'n'.repeat(151)},{conditions:'c'.repeat(2001)},{gmNotes:'n'.repeat(10001)}])await assert.rejects(f.saveOffer({offer:{...centralTestOffer,...patch}}),{code:'INVALID_CENTRAL_OFFER'});
  await assert.rejects(f.saveShop({shop:{...centralTestShop,sellerCharacterId:'../seller'}}),{code:'INVALID_ID'});await assert.rejects(f.saveOffer({offer:{...centralTestOffer,shopId:'x/y'}}),{code:'INVALID_ID'});
  await f.saveShop({shop:{name:' Boutique '}});await f.saveOffer({draftRevision:1,offer:{name:' Offre '}});const d=await f.view('M5');assert.equal(d.changes.find(c=>c.type==='shop').data.name,'Boutique');assert.equal(d.diagnostics.filter(x=>x.code==='REFERENCE_REQUIRED').length,4);assert.ok(d.diagnostics.some(x=>x.code==='PRICE_REQUIRED'));
 });
 test(`${prefix} : vendeur narratif sans rôle PNJ, lieu jamais validé par une instance`,async()=>{
  const f=await centralShopsFixture(makeStore);await f.saveCharacter({character:{...centralTestCharacter,relations:[]}});await f.saveShop({draftRevision:1});await f.store.runTransaction(async tx=>tx.set(`sessions/${f.sid}/fieldTargets/counter`,{id:'counter',name:'Lieu en jeu'}));
  const r=await f.check(2);assert.equal(r.edges.find(e=>e.to.type==='character').status,'RESOLVED');assert.equal(r.edges.find(e=>e.to.type==='fieldTarget').status,'NOT_CHECKED');assert.equal(r.publicationAvailable,false);assert.equal(r.workshops.find(w=>w.id==='M5').coverage,'PARTIAL');
  const c=await f.store.get(`${f.base}/changes/character_character`);assert.equal(c.data.role,undefined);assert.equal(c.data.assignedUid,undefined);assert.ok(r.remainingChecks.some(x=>x.message.includes('habilitations des vendeurs')));
 });
 test(`${prefix} : archive et restauration sans cascade, offre conservée`,async()=>{
  const f=await centralShopsFixture(makeStore);await f.saveShop();await f.saveOffer({draftRevision:1});const offer=await f.store.get(`${f.base}/changes/offer_offer`);await f.archiveShop({draftRevision:2});let d=await f.view('M5');
  assert.ok(d.diagnostics.some(x=>x.referenceType==='shop'&&x.code==='REFERENCE_ARCHIVED'));assert.equal(d.references.shops[0].archived,true);assert.deepEqual(await f.store.get(`${f.base}/changes/offer_offer`),offer);
  await f.saveShop({draftRevision:3,shopRevision:2});d=await f.view('M5');assert.equal(d.diagnostics.some(x=>x.code==='REFERENCE_ARCHIVED'),false);assert.equal(d.history[0].before.operation,'ARCHIVE');assert.equal(d.changes.find(c=>c.type==='shop').data.revision,3);
  await f.archiveOffer({draftRevision:4});d=await f.view('M5');assert.equal(d.diagnostics.some(x=>x.entityType==='offer'),false);await assert.rejects(f.archiveOffer({draftRevision:5,offerRevision:2}),{code:'CENTRAL_OFFER_UNAVAILABLE'});await f.saveOffer({draftRevision:5,offerRevision:2});assert.equal((await f.view('M5')).changes.find(c=>c.type==='offer').data.revision,3);
 });
 test(`${prefix} : identifiants homonymes typés et cibles incohérentes signalées`,async()=>{
  const f=await centralShopsFixture(makeStore);await f.saveShop({shopId:'shared',shop:{...centralTestShop,sellerCharacterId:'shared'}});await f.saveOffer({offerId:'shared',draftRevision:1,offer:{...centralTestOffer,shopId:'shared',itemId:'shared'}});await f.save({itemId:'shared',draftRevision:2});await f.saveCharacter({characterId:'shared',draftRevision:3,character:{...centralTestCharacter,relations:[]}});
  let r=await f.check(4);assert.equal(r.totals.invalid,0);assert.equal(r.edges.filter(e=>e.status==='RESOLVED').length,3);const shop=await f.store.get(`${f.base}/changes/shop_shared`);await f.inject(shop.id,{data:{...shop.data,stock:1}});r=await f.check(4);
  assert.equal(r.totals.invalid,1);assert.equal(r.edges.find(e=>e.from.type==='offer'&&e.to.type==='shop').status,'INVALID');assert.equal(r.edges.find(e=>e.from.type==='offer'&&e.to.type==='item').status,'RESOLVED');assert.ok(r.diagnostics.some(x=>x.entityType==='offer'&&x.referenceType==='shop'&&x.code==='REFERENCE_INVALID'));
 });
 test(`${prefix} : une recette et une offre désignent le même modèle M1`,async()=>{
  const f=await centralShopsFixture(makeStore);await f.save();await f.save({draftRevision:1,itemId:'dose',item:{...centralTestItem,name:'Dose'}});await f.recipe(2);await f.saveShop({draftRevision:3});await f.saveOffer({draftRevision:4,offer:{...centralTestOffer,itemId:'dose'}});
  const r=await f.check(5),uses=r.edges.filter(e=>e.to.type==='item'&&e.to.id==='dose');assert.deepEqual(uses.map(e=>e.from.type).sort(),['offer','recipe']);assert.ok(uses.every(e=>e.status==='RESOLVED'));assert.equal((await f.view('M1')).changes.length,2);assert.equal((await f.view('M4')).changes[0].data.productItemId,'dose');
  await f.cmd('archiveCentralItem',{campaignId:f.cid,itemId:'dose',draftRevision:5,itemRevision:1,reason:'Essai'});assert.ok((await f.check(6)).edges.filter(e=>e.to.id==='dose').every(e=>e.status==='ARCHIVED'));
 });
 test(`${prefix} : réessais stables, contenu modifié refusé et révocation avant reçu`,async()=>{
  const f=await centralShopsFixture(makeStore);await f.grant({readWorkshops:['M5'],editWorkshops:['M5']});const input={requestId:randomUUID()},r=await f.saveShop(input,f.mj);assert.deepEqual(await f.saveShop(input,f.mj),r);
  await assert.rejects(f.saveShop({...input,shop:{...centralTestShop,name:'Autre'}},f.mj),{code:'REQUEST_ID_REUSED'});await f.grant({revision:1,readWorkshops:['M5'],editWorkshops:[]});await assert.rejects(f.saveShop(input,f.mj),{code:'FORBIDDEN'});
  await f.grant({revision:2,readWorkshops:['M5'],editWorkshops:['M5']});assert.deepEqual(await f.saveShop(input,f.mj),r);assert.equal((await f.view('M5')).history.length,1);
 });
 test(`${prefix} : réessai offre puis archive ne duplique pas l’historique`,async()=>{
  const f=await centralShopsFixture(makeStore),input={requestId:randomUUID()},r=await f.saveOffer(input);assert.deepEqual(await f.saveOffer(input),r);const archive={requestId:randomUUID()},a=await f.archiveOffer(archive);assert.deepEqual(await f.archiveOffer(archive),a);assert.equal((await f.view('M5')).history.length,2);
 });
 test(`${prefix} : concurrence M5 contre M1, M2 et M4 sans écrasement`,async()=>{
  for(const other of ['item','character','recipe']){
   const f=await centralShopsFixture(makeStore),save=rev=>other==='item'?f.save({draftRevision:rev}):other==='character'?f.saveCharacter({draftRevision:rev}):f.recipe(rev),r=await Promise.allSettled([f.saveShop(),save(0)]);
   assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');if(r[0].status==='rejected')await f.saveShop({draftRevision:1});else await save(1);
   assert.equal((await f.view('M5')).draft.revision,2);assert.equal((await f.store.list(`${f.base}/changes`)).length,2);
  }
 });
 test(`${prefix} : concurrence boutique et offre, révision de contenu périmée refusée`,async()=>{
  const f=await centralShopsFixture(makeStore),r=await Promise.allSettled([f.saveShop(),f.saveOffer()]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');
  if(r[0].status==='rejected')await f.saveShop({draftRevision:1});else await f.saveOffer({draftRevision:1});await assert.rejects(f.saveShop({draftRevision:2,shopRevision:0}),{code:'STALE_REVISION'});await assert.rejects(f.saveOffer({draftRevision:2,offerRevision:0}),{code:'STALE_REVISION'});assert.equal((await f.view('M5')).history.length,2);
 });
 test(`${prefix} : limites boutiques et offres, archives comprises, édition encore possible`,async()=>{
  const f=await centralShopsFixture(makeStore);await f.saveShop();await f.saveOffer({draftRevision:1});const rows=(await f.view('M5')).changes;
  await f.store.runTransaction(async tx=>{for(const type of ['shop','offer']){const c=rows.find(c=>c.type===type);for(let i=1;i<centralLimits[`${type}s`];i++)tx.set(`${f.base}/changes/${type}_limit${i}`,{...c,id:`${type}_limit${i}`,entityId:`limit${i}`,operation:'ARCHIVE',data:{...c.data,id:`limit${i}`,masterArchived:true}});}});
  await assert.rejects(f.saveShop({shopId:'overflow',draftRevision:2}),{code:'CENTRAL_LIMIT'});await assert.rejects(f.saveOffer({offerId:'overflow',draftRevision:2}),{code:'CENTRAL_LIMIT'});await f.saveShop({draftRevision:2,shopRevision:1});await f.saveOffer({draftRevision:3,offerRevision:1});
  const r=await f.check(4);assert.equal(r.totals.records,300);assert.equal(r.totals.invalid,0);assert.equal(centralCheckLimits.records,1659);
 });
 test(`${prefix} : formats stockés corrompus et provenance Excel M5 refusés`,async()=>{
  const f=await centralShopsFixture(makeStore);await f.saveShop();await f.saveOffer({draftRevision:1});const shop=await f.store.get(`${f.base}/changes/shop_shop`),offer=await f.store.get(`${f.base}/changes/offer_offer`);
  for(const data of [{...shop.data,schemaVersion:2},{...shop.data,masterArchived:true},{...shop.data,sellerCharacterId:'../x'},{...shop.data,gmNotes:null}]){await f.inject(shop.id,{data});const r=await f.check(2);assert.equal(r.totals.invalid,1);assert.ok(r.diagnostics.some(x=>x.code==='REFERENCE_INVALID'&&x.referenceType==='shop'));}
  await f.inject(shop.id,shop);await f.inject(offer.id,{data:{...offer.data,unitPrice:0}});assert.equal((await f.check(2)).totals.invalid,1);await f.inject(offer.id,offer);
  await f.inject(shop.id,{source:'XLSX',provenance:{schemaVersion:1,batchId:'batch',fileName:'M5.xlsx',sheet:'Boutiques',row:2}});assert.equal((await f.check(2)).totals.invalid,1);
 });
 test(`${prefix} : import M1 puis M2 résout les références sans réécrire M5`,async()=>{
  const f=await centralShopsFixture(makeStore);await f.saveShop();await f.saveOffer({draftRevision:1});const before=(await f.view('M5')).changes;
  for(const [workshop,sheet,row] of [['M1','Objets',centralItemRow],['M2','Personnages',{...centralCharacterRow,id:'character',relations_json:'[]'}]]){
   const e=await f.read('exportCentralDraft',f.owner,{campaignId:f.cid,workshop,ids:[]});e.sheets[sheet]=[row];const input={campaignId:f.cid,workshop,fileName:`${workshop}.xlsx`,sheets:e.sheets},p=await f.read('prepareCentralImport',f.owner,input);assert.deepEqual(p.errors,[]);await f.cmd('applyCentralImport',{...input,confirmation:p.confirmation,reason:'Lier les définitions'});
  }
  const d=await f.view('M5');assert.deepEqual(d.changes,before);assert.deepEqual(refs(d),[]);assert.equal(d.references.items[0].source,'XLSX');assert.equal(d.references.characters[0].source,'XLSX');assert.equal((await f.check(4)).totals.invalid,0);
 });
 test(`${prefix} : Excel M5 indisponible, aperçus existants périmés après édition`,async()=>{
  const f=await centralShopsFixture(makeStore);await assert.rejects(f.read('exportCentralDraft',f.owner,{campaignId:f.cid,workshop:'M5',ids:[]}),{code:'INVALID_CENTRAL_IMPORT'});
  await assert.rejects(f.read('prepareCentralImport',f.owner,{campaignId:f.cid,workshop:'M5',fileName:'M5.xlsx',sheets:{}}),{code:'INVALID_CENTRAL_IMPORT'});
  const e=await f.read('exportCentralDraft',f.owner,{campaignId:f.cid,workshop:'M1',ids:[]});e.sheets.Objets=[centralItemRow];const input={campaignId:f.cid,workshop:'M1',fileName:'M1.xlsx',sheets:e.sheets},p=await f.read('prepareCentralImport',f.owner,input);await f.saveShop();await assert.rejects(f.cmd('applyCentralImport',{...input,confirmation:p.confirmation,reason:'Aperçu périmé'}),{code:'STALE_REVISION'});
 });
 test(`${prefix} : autre campagne et instances de session ne résolvent pas les liens`,async()=>{
  const f=await centralShopsFixture(makeStore),other=await f.create({creationId:randomUUID()});await f.saveShop({campaignId:other.campaignId});await f.save({campaignId:other.campaignId,draftRevision:1});await f.saveCharacter({campaignId:other.campaignId,draftRevision:2});
  await f.store.runTransaction(async tx=>{tx.set(`sessions/${f.sid}/characters/character`,{id:'character',public:{displayName:'Instance'}});tx.set(`sessions/${f.sid}/items/ingredient`,{id:'ingredient',name:'Instance'});});await f.saveOffer();let d=await f.view('M5');assert.equal(refs(d).length,2);await f.saveShop({draftRevision:1});d=await f.view('M5');assert.equal(refs(d).length,2);assert.deepEqual(d.references.characters,[]);assert.deepEqual(d.references.items,[]);
 });
 test(`${prefix} : interruption transactionnelle, reprise sans écritures partielles`,async()=>{
  const base=makeStore();let fail=false;const store={get:base.get.bind(base),list:base.list.bind(base),runTransaction:cb=>base.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw new Error('INTERRUPTION');return r;})},f=await centralShopsFixture(()=>store),input={requestId:randomUUID()};
  fail=true;await assert.rejects(f.saveOffer(input),/INTERRUPTION/);fail=false;assert.equal(await base.get(f.base),null);assert.deepEqual(await base.list(`${f.base}/changes`),[]);assert.deepEqual(await base.list(`${f.base}/history`),[]);await f.saveOffer(input);assert.equal((await f.view('M5')).history.length,1);
 });
 test(`${prefix} : préparation, gel et publication contrôlés avant restitution des reçus`,async()=>{
  const f=await centralShopsFixture(makeStore),input={requestId:randomUUID()};await f.saveShop(input);const d=await f.store.get(f.base),c=await f.store.get(`campaigns/${f.cid}`),s=await f.store.get(`sessions/${f.sid}`);
  await f.store.runTransaction(async tx=>tx.set(f.base,{...d,status:'FROZEN'}));await assert.rejects(f.saveShop(input),{code:'CENTRAL_DRAFT_UNAVAILABLE'});await f.store.runTransaction(async tx=>{tx.set(f.base,d);tx.set(`campaigns/${f.cid}`,{...c,master:{...c.master,activeVersionId:'version'}});});await assert.rejects(f.saveShop(input),{code:'CENTRAL_DRAFT_UNAVAILABLE'});
  await f.store.runTransaction(async tx=>{tx.set(`campaigns/${f.cid}`,c);tx.set(`sessions/${f.sid}`,{...s,preparationKind:null});});await assert.rejects(f.saveShop(input),{code:'CENTRAL_PREPARATION_REQUIRED'});
 });
}
