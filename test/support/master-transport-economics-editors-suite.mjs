import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {economicMasterExample} from '../../src/shared/master-examples.mjs';
import {masterSheets} from '../../src/shared/master-schema.mjs';
import {moduleDraft,moduleFormRow,moduleMasterSheets} from '../../web/master-editor.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
import {writeMasterXlsx} from '../../web/master-xlsx-write.mjs';
const moduleFor=sheet=>sheet==='Vaisseaux'?'spatioport':'economie';
const view=(f,sheet,extra={})=>f.read('masterWorkspace',{scenarioId:f.scenarioId,module:moduleFor(sheet),sheet,...extra});
const payload=(w,row)=>({Meta:w.meta,[w.sheet]:[row]});
const edited=(w,id,patch={})=>{const d=moduleDraft(w,id);return moduleFormRow(w,d,{...d.row,...patch});};
export function masterTransportEconomicsEditorsSuite(fixture,prefix){
 test(`${prefix} : feuilles vaisseaux et économie, références communes et exports au contrat historique`,async()=>{
  const f=await fixture();await f.apply(economicMasterExample());
  for(const sheet of ['Vaisseaux','Cours','EvenementsEco']){
   const w=await view(f,sheet);assert.ok(w.rows.length);
   for(const {row} of w.rows)assert.ok(Object.keys(row).every(k=>masterSheets[sheet].includes(k)));
   const file=readMasterXlsx(writeMasterXlsx(moduleMasterSheets(w)));assert.deepEqual(Object.keys(file),['Meta',sheet]);
   await assert.rejects(view(f,sheet,{module:'personnages'}),{code:'INVALID_MASTER_SHEET'});
   await assert.rejects(f.read('masterWorkspace',{scenarioId:f.scenarioId,module:moduleFor(sheet),sheet},f.player),{code:'FORBIDDEN'});
  }
  const w=await view(f,'Cours');assert.equal(w.newRow.id,'');assert.equal(w.rows[0].title,'Carburant de démonstration');assert.equal(w.rows[0].state,'active');
  assert.ok(w.references.unpricedItems.some(i=>i.id==='kit'));assert.ok(!w.references.unpricedItems.some(i=>i.id==='carburant-demo'));
  assert.ok(!w.references.fuels.some(i=>i.id==='recharge-demo'));assert.ok(w.references.installations.some(i=>i.id==='generateur'));
  for(const sheet of ['Vaisseaux','Cours','EvenementsEco'])await f.apply(readMasterXlsx(writeMasterXlsx(moduleMasterSheets(await view(f,sheet)))));
 });
 test(`${prefix} : cours unique par objet, création sans doublon, identité immuable et réactivation`,async()=>{
  const f=await fixture();await f.apply(economicMasterExample());let w=await view(f,'Cours');
  const row=edited(w,'',{id:'kit',prix_base:'17',actif:'OUI'});assert.equal(row.id,'kit');await f.apply(payload(w,row));assert.equal((await f.apply(payload(w,row))).unchanged,true);
  w=await view(f,'Cours');assert.throws(()=>edited(w,'',{id:'kit',prix_base:'2'}),/sans cours existant/);assert.throws(()=>moduleDraft(w,'kit','duplicate'),/unique/);
  const changed=edited(w,'kit',{id:'carburant-demo',prix_base:'23'});assert.equal(changed.id,'kit');await f.apply(payload(w,changed));
  w=await view(f,'Cours');await f.apply(payload(w,moduleFormRow(w,moduleDraft(w,'kit','archive'),{})));
  w=await view(f,'Cours');const archived=w.rows.find(r=>r.row.id==='kit');assert.equal(archived.archived,true);assert.equal(moduleMasterSheets(w,[archived]).Cours[0].operation,'ARCHIVER');assert.ok(!w.references.unpricedItems.some(i=>i.id==='kit'));
  await f.apply(payload(w,edited(w,'kit',{actif:'OUI'})));assert.equal((await f.store.get(`scenarios/${f.scenarioId}/commodityPrices/kit`)).enabled,true);
  assert.equal((await f.store.list(`scenarios/${f.scenarioId}/commodityPrices`)).length,2);
 });
 test(`${prefix} : événement change de cible et de déclencheur sans conserver d’effets incompatibles`,async()=>{
  const f=await fixture();await f.apply(economicMasterExample());let w=await view(f,'EvenementsEco');
  const route=edited(w,'penurie-demo',{cible_type:'ROUTE',route_id:'aller-demo',variation_carburant_pct:'12',variation_duree_pct:'-10',depart_suspendu:'OUI',declenchement:'MANUAL',actif:'OUI'});
  assert.equal(route.objet_id,'!EFFACER');assert.equal(route.variation_prix_pct,'0');assert.equal(route.commerce_suspendu,'NON');assert.equal(route.installation_id,'!EFFACER');await f.apply(payload(w,route));
  const path=`scenarios/${f.scenarioId}/priceEvents/penurie-demo`;let e=await f.store.get(path);assert.equal(e.itemId,null);assert.equal(e.targetId,null);assert.equal(e.departureBlocked,true);assert.equal(e.fuelPercent,12);
  w=await view(f,'EvenementsEco');await f.apply(payload(w,edited(w,'penurie-demo',{cible_type:'COMMODITY',objet_id:'kit',variation_prix_pct:'-20',commerce_suspendu:'OUI',declenchement:'INSTALLATION_OFFLINE',installation_id:'generateur'})));
  e=await f.store.get(path);assert.equal(e.routeId,null);assert.equal(e.fuelPercent,0);assert.equal(e.durationPercent,0);assert.equal(e.departureBlocked,false);assert.equal(e.percent,-20);assert.equal(e.targetId,'generateur');
  w=await view(f,'EvenementsEco');const d=moduleDraft(w,'penurie-demo','duplicate'),copy=moduleFormRow(w,d,d.row);assert.equal(copy.actif,'NON');await f.apply(payload(w,copy));
  w=await view(f,'EvenementsEco');await f.apply(payload(w,moduleFormRow(w,moduleDraft(w,copy.id,'archive'),{})));
  assert.equal((await f.store.get(`scenarios/${f.scenarioId}/priceEvents/${copy.id}`)).masterArchived,true);
 });
 test(`${prefix} : vaisseau dupliqué fermé, sans stock, avec initialisation explicitement saisie`,async()=>{
  const f=await fixture();await f.apply(economicMasterExample());let w=await view(f,'Vaisseaux');const d=moduleDraft(w,'cargo-demo','duplicate');
  assert.equal(d.row.ouvert,'NON');assert.equal(d.row.a_quai,'NON');assert.equal(d.row.carburant_initial,undefined);assert.equal(d.row.port_initial,undefined);assert.throws(()=>moduleFormRow(w,d,d.row),/Carburant initial/);
  const copy=moduleFormRow(w,d,{...d.row,carburant_initial:'0',port_initial:'port-demo'});await f.apply(payload(w,copy));
  let ship=await f.store.get(`scenarios/${f.scenarioId}/ships/${copy.id}`);assert.equal(ship.enabled,false);assert.equal(ship.navigation.initialFuel,0);
  w=await view(f,'Vaisseaux');await f.apply(payload(w,edited(w,copy.id,{proprietaire_type:'CHARACTER',proprietaire_id:'pilote',nom:'Vaisseau personnel'})));
  ship=await f.store.get(`scenarios/${f.scenarioId}/ships/${copy.id}`);assert.equal(ship.ownerType,'CHARACTER');assert.equal(ship.ownerId,'pilote');
  w=await view(f,'Vaisseaux');await f.apply(payload(w,moduleFormRow(w,moduleDraft(w,copy.id,'archive'),{})));assert.equal((await f.store.get(`scenarios/${f.scenarioId}/ships/${copy.id}`)).masterArchived,true);
 });
 test(`${prefix} : Masters préservent carburant, port, stocks et comptes, et initialisent une navigation une seule fois`,async()=>{
  const f=await fixture(),example=economicMasterExample();example.Vaisseaux.push({id:'soute',operation:'CREER',version:'1',nom:'Soute sans navigation',proprietaire_type:'GROUP',proprietaire_id:'equipage',capacite_volume:'20',a_quai:'OUI',ouvert:'NON'});await f.apply(example);
  const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id},base=`sessions/${s.id}`;
  await f.store.runTransaction(async tx=>{const ship=await tx.get(`${base}/ships/cargo-demo`);tx.set(`${base}/ships/cargo-demo`,{...ship,fuel:7,portId:'relais-demo',docked:false});});
  const inventory=await f.store.list(`${base}/inventory`),accounts=await f.store.list(`${base}/accounts`);
  let w=await view(f,'Vaisseaux',extra),row=edited(w,'cargo-demo',{capacite_reservoir:'25',carburant_initial:'999',port_initial:'ailleurs',a_quai:'OUI'});
  for(const key of ['carburant_initial','port_initial','a_quai']){assert.ok(!Object.hasOwn(row,key));assert.ok(!Object.hasOwn(w.rows.find(r=>r.row.id==='cargo-demo').row,key));}
  await f.apply(payload(w,row),extra);let ship=await f.store.get(`${base}/ships/cargo-demo`);assert.equal(ship.fuel,7);assert.equal(ship.portId,'relais-demo');assert.equal(ship.docked,false);
  w=await view(f,'Vaisseaux',extra);row=edited(w,'soute',{carburant_objet_id:'carburant-demo',capacite_reservoir:'12',carburant_initial:'2',port_initial:'port-demo'});await f.apply(payload(w,row),extra);
  ship=await f.store.get(`${base}/ships/soute`);assert.equal(ship.fuel,2);assert.equal(ship.portId,'port-demo');
  w=await view(f,'Vaisseaux',extra);await f.apply(payload(w,edited(w,'soute',{nom:'Soute renommée',carburant_initial:'11'})),extra);assert.equal((await f.store.get(`${base}/ships/soute`)).fuel,2);
  for(const sheet of ['Cours','EvenementsEco']){w=await view(f,sheet,extra);await f.apply(moduleMasterSheets(w),extra);}
  assert.deepEqual(await f.store.list(`${base}/inventory`),inventory);assert.deepEqual(await f.store.list(`${base}/accounts`),accounts);
  const current=await f.read('session',{sessionId:s.id});await f.cmd('setStage',{sessionId:s.id,revision:current.revision,stage:'BRIEFING'});
  for(const sheet of ['Vaisseaux','Cours','EvenementsEco'])assert.equal((await view(f,sheet,extra)).editable,false);
  await assert.rejects(f.prepare(moduleMasterSheets(await view(f,'Cours',extra)),extra),{code:'MASTER_PREPARATION_REQUIRED'});
 });
 test(`${prefix} : capacité, propriétaire chargé, trajet et références invalides bloquent sans écriture partielle`,async()=>{
  const f=await fixture();await f.apply(economicMasterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id},base=`sessions/${s.id}`;
  await f.store.runTransaction(async tx=>{const ship=await tx.get(`${base}/ships/cargo-demo`);tx.set(`${base}/ships/cargo-demo`,{...ship,fuel:7});});
  let w=await view(f,'Vaisseaux',extra);const before=await f.store.get(`${base}/ships/cargo-demo`);
  for(const patch of [{capacite_reservoir:'6'},{proprietaire_id:'absent'},{carburant_objet_id:'recharge-demo'}])assert.equal((await f.prepare(payload(w,edited(w,'cargo-demo',patch)),extra)).canApply,false);
  // Fictitious cargo uses an existing lot; no second inventory is introduced.
  const lot=(await f.store.list(`${base}/inventory`)).find(l=>l.quantity>0);
  await f.store.runTransaction(async tx=>tx.set(`${base}/inventory/${lot.id}`,{...lot,item:{...lot.item,unitVolume:2},ownerType:'GROUP',ownerId:'equipage',holderId:null,location:{kind:'HOLD',id:'cargo-demo'}}));
  w=await view(f,'Vaisseaux',extra);const cargo=await f.store.get(`${base}/inventory/${lot.id}`);
  for(const patch of [{capacite_volume:'1'},{proprietaire_type:'CHARACTER',proprietaire_id:'pilote'}])assert.equal((await f.prepare(payload(w,edited(w,'cargo-demo',patch)),extra)).canApply,false);
  await f.apply(payload(w,edited(w,'cargo-demo',{nom:'Cargo renommé'})),extra);assert.deepEqual(await f.store.get(`${base}/inventory/${lot.id}`),cargo);
  await f.store.runTransaction(async tx=>tx.set(`${base}/ships/cargo-demo`,{...before,journey:{id:'trajet-test'}}));
  w=await view(f,'Vaisseaux',extra);assert.equal((await f.prepare(payload(w,edited(w,'cargo-demo',{nom:'Interdit en trajet'})),extra)).canApply,false);
  w=await view(f,'EvenementsEco',extra);const eventBefore=await f.store.get(`${base}/priceEvents/penurie-demo`);
  for(const patch of [{variation_prix_pct:'1001'},{variation_prix_pct:'2.5'},{installation_id:'absente'},{objet_id:'absent'}])assert.equal((await f.prepare(payload(w,edited(w,'penurie-demo',patch)),extra)).canApply,false);
  const invalid=payload(w,edited(w,'penurie-demo',{objet_id:'absent'}));await assert.rejects(f.cmd('applyMasterImport',{...extra,sheets:invalid,reason:'Test',confirmation:'invalide'}),{code:'INVALID_MASTER'});
  assert.deepEqual(await f.store.get(`${base}/priceEvents/penurie-demo`),eventBefore);
 });
 test(`${prefix} : cours concurrents, confirmation périmée et réessai sans seconde écriture`,async()=>{
  const f=await fixture();await f.apply(economicMasterExample());const w=await view(f,'Cours');
  const inputs=await Promise.all(['21','22'].map(async prix_base=>{const sheets=payload(w,edited(w,'carburant-demo',{prix_base})),p=await f.prepare(sheets);return {scenarioId:f.scenarioId,module:'economie',sheets,reason:'Import de test',confirmation:p.confirmation,requestId:randomUUID()};}));
  const results=await Promise.allSettled(inputs.map(input=>f.cmd('applyMasterImport',input)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.ok(['STALE_REVISION','INVALID_MASTER'].includes(results.find(r=>r.status==='rejected').reason.code));const winner=results.findIndex(r=>r.status==='fulfilled');
  assert.deepEqual(await f.cmd('applyMasterImport',inputs[winner]),results[winner].value);
 });
}
