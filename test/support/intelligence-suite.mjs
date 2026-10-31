import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {shopAccountId} from '../../src/core/space-outlaws-shop-state.mjs';

export async function intelligenceFixture(makeStore,{voyage=false}={}){
 const f=await soVoyagesFixture(makeStore),buyer=f.other,buyerId=f.otherId,base=`sessions/${f.sid}`;
 await f.store.runTransaction(async tx=>{const a=await tx.get(`${base}/accounts/${accountId(buyerId)}`);tx.set(`${base}/accounts/${a.id}`,{...a,balance:2000,revision:a.revision+1});});
 if(voyage){await f.refuel(4);await f.fly();}
 const read=(a,p={},actor=buyer)=>f.read(a,p,actor),cmd=(a,p={},actor=buyer)=>f.cmd(a,p,actor),offerInput=(patch={})=>({characterId:buyerId,knowledgeId:'ordinary',shopId:'counter',category:'RUMOR',title:'Renseignement du comptoir',voyageId:null,source:'Informateur présent et texte M6 vérifié',reason:'Proposition privée préparée',present:true,...patch});
 const offer=async(patch={})=>{const p=offerInput(patch),q=await read('prepareIntelligenceOffer',p,f.owner);return cmd('offerIntelligence',{...p,confirmation:q.confirmation},f.owner);};
 const offers=async(actor=buyer)=>(await read(actor===f.owner?'intelligenceAdmin':'myIntelligence',{},actor)).offers;
 const buy=async(r,actor=buyer)=>{const q=await read('prepareIntelligencePurchase',{offerId:r.id},actor);return cmd('buyIntelligence',{offerId:r.id,confirmation:q.confirmation,present:true},actor);};
 const close=async(r,admin=false)=>{const actor=admin?f.owner:buyer,q=(await offers(actor)).find(o=>o.id===r.id);return cmd(admin?'cancelIntelligenceOffer':'declineIntelligence',{offerId:r.id,confirmation:q.confirmation,reason:'Renoncer à la proposition'},actor);};
 const edit=async(path,fn)=>f.store.runTransaction(async tx=>tx.set(`${base}/${path}`,fn(await tx.get(`${base}/${path}`))));
 return {...f,buyer,buyerId,base,read,cmd,offerInput,offer,offers,buy,close,edit,wallet:()=>f.store.get(`${base}/accounts/${accountId(buyerId)}`),till:()=>f.store.get(`${base}/accounts/${shopAccountId('counter')}`),receipt:kid=>f.store.get(`${base}/characters/${buyerId}/knowledge/${kid}`)};
}
export function intelligenceSuite(makeStore,prefix='Renseignements PNJ'){
 test(`${prefix} : trois tarifs canoniques, fonds réels et carnet privé sans vérité MJ`,async()=>{
  const f=await intelligenceFixture(makeStore,{voyage:true}),before=await f.wallet(),till=await f.till(),voyageId=(await f.ship()).journey.id;
  for(const [category,knowledgeId,price] of [['RUMOR','ordinary',50],['FLIGHT_PLAN','higher',150],['CONFIDENTIAL','bonus',300]]){const r=await f.offer({category,knowledgeId,voyageId:category==='RUMOR'?null:voyageId});assert.equal((await f.offers()).find(o=>o.id===r.id).price,price);await f.buy(r);const detail=await f.read('knowledgeDetail',{knowledgeId});assert.equal(detail.knowledge.body,`TEXTE_PRIVE_${knowledgeId}`);assert.doesNotMatch(JSON.stringify(detail),/VERITE_MJ|gmTruth|voyageId|OUT-SECRET|AWAY-CODE/);assert.equal((await f.receipt(knowledgeId)).intelligence.voyageId,category==='RUMOR'?null:voyageId);}
  assert.equal((await f.wallet()).balance,before.balance-500);assert.equal((await f.wallet()).protectedCredits,before.protectedCredits);assert.equal((await f.till()).balance,till.balance+500);assert.equal((await f.read('myWallet')).entries.filter(e=>e.kind==='INTELLIGENCE_PURCHASE').length,3);assert.equal((await f.read('myWallet')).entries.find(e=>e.kind==='INTELLIGENCE_PURCHASE').counterparty.name,'Dispensaire');
 });
 test(`${prefix} : avant paiement, aucun texte, identifiant M6 ou lien de voyage envoyé`,async()=>{
  const f=await intelligenceFixture(makeStore),r=await f.offer(),q=await f.read('prepareIntelligencePurchase',{offerId:r.id});assert.doesNotMatch(JSON.stringify([await f.offers(),q]),/TEXTE_PRIVE|VERITE_MJ|knowledgeId|knowledgeTitle|voyageId|recipientVersion|sourceName|actorUid/);await assert.rejects(f.read('knowledgeDetail',{knowledgeId:'ordinary'}),{code:'FORBIDDEN'});assert.ok(!(await f.read('myKnowledge')).items.some(k=>k.id==='ordinary'));assert.equal((await f.receipt('ordinary')).active,false);assert.equal((await f.receipt('ordinary')).pendingOfferId,r.id);
 });
 test(`${prefix} : rôles, champs injectés, catégories et voyage inconnu refusés`,async()=>{
  const f=await intelligenceFixture(makeStore);await assert.rejects(f.read('intelligenceAdmin'),{code:'FORBIDDEN'});await assert.rejects(f.read('prepareIntelligenceOffer',f.offerInput()),{code:'FORBIDDEN'});await assert.rejects(f.offer({price:1}),{code:'INVALID_ADMISSION'});await assert.rejects(f.offer({category:'FREE'}),{code:'INVALID_INTELLIGENCE'});await assert.rejects(f.offer({category:'FLIGHT_PLAN'}),{code:'INVALID_INTELLIGENCE'});await assert.rejects(f.offer({category:'CONFIDENTIAL',voyageId:'absent'}),{code:'INVALID_INTELLIGENCE'});await assert.rejects(f.offer({voyageId:'absent'}),{code:'INVALID_INTELLIGENCE'});
 });
 test(`${prefix} : crédits protégés et fonds réservés ne paient pas les renseignements`,async()=>{
  const f=await intelligenceFixture(makeStore),r=await f.offer();await f.edit(`accounts/${accountId(f.buyerId)}`,a=>({...a,balance:49,reserved:0,protectedCredits:10000}));await assert.rejects(f.buy(r),{code:'INSUFFICIENT_FUNDS'});await f.edit(`accounts/${accountId(f.buyerId)}`,a=>({...a,balance:50,reserved:1}));await assert.rejects(f.buy(r),{code:'INSUFFICIENT_FUNDS'});assert.equal((await f.receipt('ordinary')).active,false);assert.equal((await f.offers())[0].status,'OFFERED');
 });
 test(`${prefix} : aperçu monétaire périmé sans débit ni révélation`,async()=>{
  const f=await intelligenceFixture(makeStore),r=await f.offer(),q=await f.read('prepareIntelligencePurchase',{offerId:r.id});await f.edit(`accounts/${accountId(f.buyerId)}`,a=>({...a,balance:a.balance+1,revision:a.revision+1}));await assert.rejects(f.cmd('buyIntelligence',{offerId:r.id,confirmation:q.confirmation,present:true}),{code:'STALE_REVISION'});assert.equal((await f.receipt('ordinary')).active,false);await f.buy(r);assert.equal((await f.wallet()).balance,1951);
 });
 test(`${prefix} : deux propositions concurrentes réservent une seule révélation native`,async()=>{
  const f=await intelligenceFixture(makeStore),rs=await Promise.allSettled([f.offer(),f.offer()]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.offers()).length,1);assert.equal((await f.receipt('ordinary')).pendingOfferId,(await f.offers())[0].id);
 });
 test(`${prefix} : deux achats concurrents et reçu rejoué ne paient qu’une fois`,async()=>{
  const f=await intelligenceFixture(makeStore),r=await f.offer(),q=await f.read('prepareIntelligencePurchase',{offerId:r.id}),inputs=[1,2].map(()=>({offerId:r.id,confirmation:q.confirmation,present:true,requestId:randomUUID()})),rs=await Promise.allSettled(inputs.map(p=>f.cmd('buyIntelligence',p)));assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);const i=rs.findIndex(r=>r.status==='fulfilled');assert.deepEqual(await f.cmd('buyIntelligence',inputs[i]),rs[i].value);assert.equal((await f.wallet()).balance,1950);assert.equal((await f.store.list(`${f.base}/ledger`)).filter(e=>e.kind==='INTELLIGENCE_PURCHASE').length,1);await assert.rejects(f.offer(),{code:'INTELLIGENCE_ALREADY_KNOWN'});
 });
 test(`${prefix} : refus et annulation libèrent le dossier sans argent ni connaissance`,async()=>{
  const f=await intelligenceFixture(makeStore),before=await f.wallet(),r=await f.offer();await f.close(r);assert.equal((await f.receipt('ordinary')).pendingOfferId,null);assert.equal((await f.receipt('ordinary')).active,false);const again=await f.offer();await f.stage('PAUSE');await f.close(again,true);assert.equal((await f.offers(f.owner)).find(o=>o.id===again.id).status,'CANCELLED');assert.deepEqual(await f.wallet(),before);
 });
 test(`${prefix} : révocation bloque aussi un reçu d’achat historique`,async()=>{
  const f=await intelligenceFixture(makeStore),r=await f.offer(),q=await f.read('prepareIntelligencePurchase',{offerId:r.id}),p={offerId:r.id,confirmation:q.confirmation,present:true,requestId:randomUUID()};await f.cmd('buyIntelligence',p);await f.cmd('revokeAccess',{uid:f.buyer.uid},f.owner);await assert.rejects(f.cmd('buyIntelligence',p),{code:'FORBIDDEN'});assert.equal((await f.wallet()).balance,1950);
 });
 test(`${prefix} : STOP et pause interdisent le paiement mais gardent la proposition`,async()=>{
  const f=await intelligenceFixture(makeStore),r=await f.offer();await f.cmd('stopSafety',{reason:'Sécurité'});await assert.rejects(f.buy(r),{code:'SO_SAFETY_STOP'});await f.cmd('resumeSafety',{revision:(await f.store.get(f.base)).revision,reason:'Reprise'},f.owner);await f.stage('PAUSE');await assert.rejects(f.buy(r),{code:'SESSION_NOT_RUNNING'});await f.close(r,true);assert.equal((await f.wallet()).balance,2000);
 });
 test(`${prefix} : voyage, autre scène ou port empêchent une prestation distante`,async()=>{
  const f=await intelligenceFixture(makeStore),r=await f.offer(),path=`characters/${f.buyerId}`,original=await f.store.get(`${f.base}/${path}`);for(const patch of [{activeVoyageId:'elsewhere'},{activeFieldActionId:'elsewhere'},{spacePortId:'away'}]){await f.edit(path,()=>({...original,...patch}));await assert.rejects(f.buy(r),{code:'INTELLIGENCE_UNAVAILABLE'});}await f.edit(path,()=>original);assert.equal((await f.wallet()).balance,2000);
 });
 test(`${prefix} : une révélation indépendante bloque le paiement et n’est pas annulée avec l’offre`,async()=>{
  const f=await intelligenceFixture(makeStore),r=await f.offer(),path=`characters/${f.buyerId}/knowledge/ordinary`;await f.edit(path,k=>({...k,active:true,pendingOfferId:null,source:'FIELD',grantRevision:1}));const before=await f.receipt('ordinary');await assert.rejects(f.buy(r),{code:'INTELLIGENCE_ALREADY_KNOWN'});await f.close(r,true);assert.deepEqual(await f.receipt('ordinary'),before);assert.equal((await f.wallet()).balance,2000);
 });
 test(`${prefix} : arrivée du voyage ne met pas à jour le document ni ne révèle sa péremption`,async()=>{
  const f=await intelligenceFixture(makeStore,{voyage:true}),voyageId=(await f.ship()).journey.id,r=await f.offer({category:'FLIGHT_PLAN',knowledgeId:'higher',voyageId});f.advance(1000000);const n=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation},f.player);await f.buy(r);assert.equal((await f.receipt('higher')).intelligence.voyageId,voyageId);const detail=await f.read('knowledgeDetail',{knowledgeId:'higher'});assert.equal(detail.knowledge.body,'TEXTE_PRIVE_higher');assert.doesNotMatch(JSON.stringify(detail),/ARRIVED|voyageId|AWAY-CODE|VERITE_MJ/);
 });
 test(`${prefix} : transaction interrompue ne laisse ni quote partielle ni paiement sans texte`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await intelligenceFixture(()=>store),p=f.offerInput(),q=await f.read('prepareIntelligenceOffer',p,f.owner),input={...p,confirmation:q.confirmation,requestId:randomUUID()};fail=true;await assert.rejects(f.cmd('offerIntelligence',input,f.owner),/INTERRUPTION/);fail=false;assert.equal((await f.offers()).length,0);const r=await f.cmd('offerIntelligence',input,f.owner),a=await f.read('prepareIntelligencePurchase',{offerId:r.id}),buy={offerId:r.id,confirmation:a.confirmation,present:true,requestId:randomUUID()};fail=true;await assert.rejects(f.cmd('buyIntelligence',buy),/INTERRUPTION/);fail=false;assert.equal((await f.wallet()).balance,2000);assert.equal((await f.receipt('ordinary')).active,false);await f.cmd('buyIntelligence',buy);assert.equal((await f.wallet()).balance,1950);assert.equal((await f.receipt('ordinary')).active,true);
 });
 test(`${prefix} : carnet et proposition encore privée conservés entre épisodes`,async()=>{
  const {episodeHarness}=await import('./space-episodes-suite.mjs'),f=await intelligenceFixture(makeStore),r=await f.offer(),pending=await f.offer({knowledgeId:'higher'});await f.buy(r);const e=await episodeHarness(f);await e.close();await e.resume(await e.begin());assert.equal((await e.get('')).spaceOutlaws.intelligenceVersion,1);assert.equal((await e.get(`knowledgeDeals/${pending.id}`)).status,'OFFERED');assert.equal((await e.get(`characters/${f.buyerId}/knowledge/higher`)).active,false);assert.equal((await e.read('knowledgeDetail',{knowledgeId:'ordinary'},f.buyer)).knowledge.body,'TEXTE_PRIVE_ordinary');await e.stage('EN_JEU');const q=await e.read('prepareIntelligencePurchase',{offerId:pending.id},f.buyer);await e.cmd('buyIntelligence',{offerId:pending.id,confirmation:q.confirmation,present:true},f.buyer);assert.equal((await e.get(`characters/${f.buyerId}/knowledge/higher`)).active,true);
 });
 test(`${prefix} : ancien manifeste non enrichi conserve son carnet sans vente d’informations`,async()=>{
  const f=await soVoyagesFixture(makeStore,{release:false}),r=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${r.versionId}`,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;await f.store.runTransaction(async tx=>{const {intelligenceVersion,manifestDigest,...h}=await tx.get(path);tx.set(path,{...h,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(h))).digest('hex')});});await f.birth(await f.birthPreview());assert.equal((await f.read('mySession')).session.spaceOutlaws.intelligenceVersion,undefined);await assert.rejects(f.read('myIntelligence'),{code:'SO_GAMEPLAY_NOT_OPEN'});assert.ok((await f.read('myKnowledge')).items);
 });
}
