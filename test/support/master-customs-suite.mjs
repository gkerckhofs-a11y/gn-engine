import test from 'node:test';
import assert from 'node:assert/strict';
import {customsMasterExample,customsSessionMasterExample} from '../../src/shared/master-examples.mjs';
import {cleanScenarioSnapshot,scenarioCollections} from '../../src/core/scenario-package.mjs';
import {accountId,groupAccountId} from '../../src/core/economy-state.mjs';
import {quoteCargoFees,prepareCargoFees,settleCargoFees,publicClearance} from '../../src/core/customs-state.mjs';
const meta=()=>customsMasterExample().Meta;
const tariff=(patch={})=>({...customsMasterExample().Tarifs[0],...patch});
const sessionMeta=s=>[{format:'gn-engine-master',version:'1',type:'SESSION',campaign_id:s.campaignId}];
const target=s=>({scenarioId:undefined,sessionId:s.id});
const sorted=a=>a.sort((x,y)=>x.id.localeCompare(y.id));
export function masterCustomsSuite(fixture,prefix){
 test(`${prefix} : tarifs importés, aperçu lisible, réimport et anciennes archives`,async()=>{
  const f=await fixture(),s=customsMasterExample(),p=await f.prepare(s);assert.deepEqual(p.errors,[]);assert.match(p.changes.find(x=>x.id==='arrangement-demo').beneficiary.after,/Personnage.*pilote/);assert.deepEqual(await f.store.list(`scenarios/${f.scenarioId}/cargoTariffs`),[]);
  await f.apply(s);assert.equal((await f.apply(s)).unchanged,true);const base=`scenarios/${f.scenarioId}`,original=await f.store.list(`${base}/cargoTariffs`);
  await f.apply({Meta:meta()});assert.deepEqual(await f.store.list(`${base}/cargoTariffs`),original);
  const records=Object.fromEntries(await Promise.all(scenarioCollections.map(async k=>[k,await f.store.list(`${base}/${k}`)])));
  const clean=cleanScenarioSnapshot({scenario:await f.read('scenario',{scenarioId:f.scenarioId}),records:{...records,cargoTariffs:records.cargoTariffs.map(t=>({...t,receipt:'PRIVATE',actorUid:'PRIVATE',accountBalance:900}))}});assert.ok(clean.records.cargoTariffs.every(t=>t.receipt===undefined&&t.actorUid===undefined&&t.accountBalance===undefined));
  const {manifest}=await f.read('prepareScenarioExport',{scenarioId:f.scenarioId}),input={manifest,title:'Copie des droits'},preview=await f.read('prepareScenarioImport',input),job=await f.cmd('beginScenarioImport',{...input,confirmation:preview.confirmation}),copy=await f.read('commitScenarioImport',{importId:job.id});assert.deepEqual(sorted(await f.store.list(`scenarios/${copy.id}/cargoTariffs`)),clean.records.cargoTariffs);
  delete records.cargoTariffs;assert.deepEqual(cleanScenarioSnapshot({scenario:await f.read('scenario',{scenarioId:f.scenarioId}),records}).records.cargoTariffs,[]);
 });
 test(`${prefix} : montants explicites, bénéficiaires et plafond contrôlés sans écriture partielle`,async()=>{
  const f=await fixture();
  for(const patch of [{montant_fixe:''},{montant_unitaire:''},{montant_fixe:'-1'},{montant_unitaire:'1.5'},{montant_fixe:'9007199254740992'},{nature:'EXEMPTION'},{mouvement:'BUY'},{actif:'yes'},{objet_id:'absent'},{beneficiaire_type:''},{beneficiaire_type:'CHARACTER',beneficiaire_id:'absent'},{beneficiaire_type:'GROUP',beneficiaire_id:'equipage'},{beneficiaire_type:'SINK',beneficiaire_id:'pilote'}]){
   const s=customsMasterExample();s.Tarifs=[tariff(patch)];const p=await f.prepare(s);assert.equal(p.canApply,false,JSON.stringify(patch));assert.ok(p.errors.some(e=>e.sheet==='Tarifs'));await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,sheets:s,reason:'Test',confirmation:p.confirmation}),{code:'INVALID_MASTER'});
  }
  assert.deepEqual(await f.store.list(`scenarios/${f.scenarioId}/characters`),[]);
  const s=customsMasterExample();s.Tarifs=Array.from({length:51},(_,i)=>tariff({id:`tarif-${i}`,montant_fixe:'0',montant_unitaire:'0'}));assert.equal((await f.prepare(s)).canApply,false);s.Tarifs.pop();await f.apply(s);assert.equal((await f.store.list(`scenarios/${f.scenarioId}/cargoTariffs`)).length,50);
  assert.equal((await f.prepare({Meta:meta(),Tarifs:[tariff({id:'extra'})]})).canApply,false);
 });
 test(`${prefix} : modification partielle, effacement, archivage et réactivation des tarifs`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const get=()=>f.store.get(`scenarios/${f.scenarioId}/cargoTariffs/arrangement-demo`);
  await f.apply({Meta:meta(),Tarifs:[{id:'arrangement-demo',operation:'MODIFIER',version:'2',montant_fixe:'0',objet_id:'!EFFACER',actif:'OUI'}]});let t=await get();assert.equal(t.flatAmount,0);assert.equal(t.unitAmount,0);assert.equal(t.itemId,null);assert.equal(t.recipientAccountId,accountId('pilote'));assert.equal(t.enabled,true);
  assert.equal((await f.prepare({Meta:meta(),Tarifs:[{id:t.id,operation:'MODIFIER',version:'3',beneficiaire_type:'GROUP'}]})).canApply,false);
  assert.equal((await f.prepare({Meta:meta(),Tarifs:[{id:t.id,operation:'ARCHIVER',version:'3',actif:'OUI'}]})).canApply,false);
  await f.apply({Meta:meta(),Tarifs:[{id:t.id,operation:'ARCHIVER',version:'3'}]});assert.equal((await get()).enabled,false);
  await f.apply({Meta:meta(),Tarifs:[{id:t.id,operation:'MODIFIER',version:'4',actif:'OUI',beneficiaire_type:'SINK',beneficiaire_id:'!EFFACER'}]});t=await get();assert.equal(t.enabled,true);assert.equal(t.recipientAccountId,null);
 });
 test(`${prefix} : références actives protégées et caisse de groupe préconfigurée`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const input={scenarioId:f.scenarioId,revision:(await f.read('scenario',{scenarioId:f.scenarioId})).revision,groupId:'equipage',label:'Comptoir discret',amount:0},p=await f.read('prepareGroupWallet',input);await f.cmd('setGroupWallet',{...input,confirmation:p.confirmation});
  await f.apply({Meta:meta(),Objets:[{id:'fret-libre',operation:'CREER',version:'1',nom:'Fret',publication:'PUBLISHED'}],Tarifs:[tariff({id:'droit-groupe',objet_id:'fret-libre',beneficiaire_type:'GROUP',beneficiaire_id:'equipage',actif:'OUI'})]});
  assert.equal((await f.store.get(`scenarios/${f.scenarioId}/cargoTariffs/droit-groupe`)).recipientAccountId,groupAccountId('equipage'));
  for(const patch of [{Objets:[{id:'fret-libre',operation:'ARCHIVER',version:'2'}]},{Groupes:[{id:'equipage',operation:'ARCHIVER',version:'2'}]}])assert.equal((await f.prepare({Meta:meta(),...patch})).canApply,false);
  await f.apply({Meta:meta(),Tarifs:[{id:'droit-groupe',operation:'ARCHIVER',version:'2'}],Objets:[{id:'fret-libre',operation:'ARCHIVER',version:'2'}]});
  assert.equal((await f.prepare({Meta:meta(),Tarifs:[{id:'droit-groupe',operation:'MODIFIER',version:'3',actif:'OUI'}]})).canApply,false);
  await f.apply({Meta:meta(),Tarifs:[{id:'droit-groupe',operation:'MODIFIER',version:'3',objet_id:'!EFFACER',actif:'OUI'}]});
  const s=await f.session(),q=await f.store.runTransaction(async tx=>quoteCargoFees(tx,await tx.get(`sessions/${s.id}`),{item:{id:'kit'}},2,{kind:'CHARACTER'},{kind:'HOLD'}));assert.equal(q.total,4);const view=JSON.stringify(publicClearance(q));assert.match(view,/Comptoir discret/);assert.equal(view.includes('equipage'),false);
 });
 test(`${prefix} : version figée, sessions indépendantes et campagne héritent des tarifs`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const start=await f.session(),base=`sessions/${start.id}`,session=await f.read('session',{sessionId:start.id});const original=sorted(await f.store.list(`${base}/cargoTariffs`));assert.equal(original.length,2);
  await f.apply({Meta:meta(),Tarifs:[{id:'douane-demo',operation:'MODIFIER',version:'2',montant_fixe:'999'}]});
  const single=await f.cmd('createSession',{scenarioId:f.scenarioId,versionId:session.versionId,title:'Indépendante',capacity:60,privacy:'Notice'});assert.deepEqual(sorted(await f.store.list(`sessions/${single.id}/cargoTariffs`)),original);
  const lots=await f.store.list(`${base}/inventory`),accounts=await f.store.list(`${base}/accounts`),s=customsSessionMasterExample();s.Meta[0].campaign_id=start.campaignId;await f.apply(s,target(start));assert.equal((await f.store.get(`${base}/cargoTariffs/douane-demo`)).flatAmount,4);
  for(const l of lots)assert.deepEqual(await f.store.get(`${base}/inventory/${l.id}`),l);for(const a of accounts)assert.deepEqual(await f.store.get(`${base}/accounts/${a.id}`),a);assert.deepEqual(await f.store.list(`${base}/cargoTransfers`),[]);
  const closeInput={sessionId:start.id,reason:'Clôture',cancelOffers:false},close=await f.read('prepareCampaignClosure',closeInput);await f.cmd('closeCampaignSession',{...closeInput,confirmation:close.confirmation});
  const nextInput={campaignId:start.campaignId,title:'Suite',capacity:60,privacy:'Notice',healthPolicy:'PRESERVE',reason:'Suite'},p=await f.read('prepareCampaignEpisode',nextInput);let next=await f.cmd('beginCampaignEpisode',{...nextInput,confirmation:p.confirmation});while(next.status!=='READY')next=await f.cmd('advanceCampaignEpisode',{campaignId:start.campaignId,buildId:next.buildId??(await f.read('campaign',{campaignId:start.campaignId})).activeBuildId});assert.deepEqual(sorted(await f.store.list(`sessions/${next.id}/cargoTariffs`)),sorted(await f.store.list(`${base}/cargoTariffs`)));
 });
 test(`${prefix} : nouvel ayant droit de session, compte courant contrôlé et aperçu périmé`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const start=await f.session(),base=`sessions/${start.id}`,Meta=sessionMeta(start),extra=target(start),s={Meta,Personnages:[{id:'percepteur',operation:'CREER',version:'1',nom:'Percepteur',publication:'PUBLISHED',publication_publique:'PUBLISHED'}],Tarifs:[tariff({id:'nouveau',beneficiaire_type:'CHARACTER',beneficiaire_id:'percepteur',actif:'OUI'})]};await f.apply(s,extra);assert.equal((await f.store.get(`${base}/accounts/${accountId('percepteur')}`)).balance,0);
  const mod={Meta,Tarifs:[{id:'nouveau',operation:'MODIFIER',version:'2',montant_fixe:'5'}]},p=await f.prepare(mod,extra),a=await f.store.get(`${base}/accounts/${accountId('percepteur')}`);await f.store.runTransaction(async tx=>tx.set(`${base}/accounts/${a.id}`,{...a,balance:9,revision:a.revision+1}));
  await assert.rejects(f.cmd('applyMasterImport',{...extra,sheets:mod,reason:'Import de test',confirmation:p.confirmation}),{code:'STALE_REVISION'});assert.equal((await f.store.get(`${base}/cargoTariffs/nouveau`)).flatAmount,2);
  await f.apply(mod,extra);assert.equal((await f.store.get(`${base}/accounts/${a.id}`)).balance,9);
  await f.store.runTransaction(async tx=>tx.set(`${base}/accounts/${a.id}`,{...a,characterId:'autre'}));assert.equal((await f.prepare({Meta},extra)).canApply,false);
 });
 test(`${prefix} : barème importé utilisé par le règlement, devis réservé et reçus conservés`,async()=>{
  const f=await fixture(),s=customsMasterExample();s.Tarifs[0].actif='OUI';await f.apply(s);const start=await f.session(),base=`sessions/${start.id}`,getSession=()=>f.store.get(base),payerId=accountId('pilote');
  const quote=await f.store.runTransaction(async tx=>quoteCargoFees(tx,await tx.get(base),{item:{id:'kit'}},3,{kind:'CHARACTER'},{kind:'HOLD'}));assert.equal(quote.total,5);
  await f.apply({Meta:sessionMeta(start),Tarifs:[{id:'douane-demo',operation:'MODIFIER',version:'2',montant_fixe:'50'}]},target(start));assert.equal((await f.store.get(`${base}/accounts/${payerId}`)).balance,100);
  const receipt=await f.store.runTransaction(async tx=>{const session=await tx.get(base),a=await tx.get(`${base}/accounts/${payerId}`),from={a,spend:true,read:true,name:'Pilote',guard:'test'},prepared=await prepareCargoFees(tx,session,quote,from);return settleCargoFees(tx,session,{id:'transfert-test',clearance:quote,receivedByCharacterId:'pilote'},prepared,from,1,'paiement-test',f.owner);});assert.equal(receipt.total,5);assert.equal((await f.store.get(`${base}/accounts/${payerId}`)).balance,95);
  const ledger=await f.store.list(`${base}/ledger`);await f.apply({Meta:sessionMeta(start),Tarifs:[{id:'douane-demo',operation:'ARCHIVER',version:'3'}]},target(start));assert.deepEqual(await f.store.list(`${base}/ledger`),ledger);assert.equal((await f.store.get(`${base}/accounts/${payerId}`)).balance,95);
  const state=await getSession();await f.cmd('setStage',{sessionId:start.id,revision:state.revision,stage:'BRIEFING'});await assert.rejects(f.prepare({Meta:sessionMeta(start)},target(start)),{code:'MASTER_PREPARATION_REQUIRED'});
 });
}
