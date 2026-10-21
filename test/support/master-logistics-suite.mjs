import test from 'node:test';
import assert from 'node:assert/strict';
import {masterExample} from '../../src/shared/master-examples.mjs';
import {cleanScenarioSnapshot} from '../../src/core/scenario-package.mjs';
const warehouse={id:'hangar',operation:'CREER',version:'1',nom:'Hangar test',capacite_volume:'8',loyer:'15',periode_minutes:'30',ouvert:'OUI'};
const extra=()=>({Entrepots:[warehouse],Objets:[{id:'recharge',operation:'CREER',version:'1',nom:'Recharge test',type:'STACKABLE',consommable:'OUI',volume_unitaire:'1',billes_par_recharge:'600',publication:'PUBLISHED'}]});
export function masterLogisticsSuite(fixture,prefix){
  test(`${prefix} : logistique importée, version figée, archive et session sans bail implicite`,async()=>{
    const f=await fixture(),s=masterExample(),x=extra();s.Objets.push(...x.Objets);s.Entrepots=x.Entrepots;s.Membres[0].droits='readStock;depositStock;withdrawStock;manageStorage';s.Dotations.push({id:'recharge-pilote',operation:'CREER',version:'1',personnage_id:'pilote',type:'OBJET',objet_id:'recharge',quantite:'2'});
    assert.deepEqual((await f.prepare(s)).errors,[]);assert.equal((await f.store.list(`scenarios/${f.scenarioId}/warehouses`)).length,0);await f.apply(s);assert.equal((await f.apply(s)).unchanged,true);
    const records={};for(const k of ['characters','groups','knowledge','skills','classes','items','warehouses'])records[k]=await f.store.list(`scenarios/${f.scenarioId}/${k}`);
    const archive=cleanScenarioSnapshot({scenario:await f.read('scenario',{scenarioId:f.scenarioId}),records});assert.equal(archive.records.warehouses[0].rent,15);assert.equal(archive.records.groups[0].members[0].permissions.manageStorage,true);
    const episode=await f.session(),w=await f.store.get(`sessions/${episode.id}/warehouses/hangar`);assert.equal(w.tenantId,null);assert.equal(w.expiresAtGameMs,null);
    const inventory=await f.store.list(`sessions/${episode.id}/inventory`);assert.equal(inventory.find(l=>l.item.id==='recharge').item.laserRecharge.pelletsPerUnit,600);assert.equal(inventory.filter(l=>l.location.kind==='WAREHOUSE').length,0);
    const clean=cleanScenarioSnapshot({scenario:archive.scenario,records:{...records,warehouses:[{...w,tenantType:'GROUP',tenantId:'secret',expiresAtGameMs:999}]}});assert.equal(Object.hasOwn(clean.records.warehouses[0],'tenantId'),false);
  });
  test(`${prefix} : ancien conditionnement conservé, cellule vide et effacement explicite`,async()=>{
    const f=await fixture();await f.apply(masterExample());await f.apply({Meta:masterExample().Meta,...extra()});
    const modify={Meta:masterExample().Meta,Objets:[{id:'recharge',operation:'MODIFIER',version:'2',nom:'Recharge renommée',billes_par_recharge:''}]};await f.apply(modify);assert.equal((await f.store.get(`scenarios/${f.scenarioId}/items/recharge`)).laserRecharge.pelletsPerUnit,600);
    const episode=await f.session(),target={scenarioId:undefined,sessionId:episode.id},meta=[{format:'gn-engine-master',version:'1',type:'SESSION',campaign_id:episode.campaignId}];
    const grant={Meta:meta,Personnages:[{id:'porteur',operation:'CREER',version:'1',nom:'Porteur',publication:'PUBLISHED',publication_publique:'PUBLISHED',niveau_global:'1'}],Dotations:[{id:'recharge-porteur',operation:'CREER',version:'1',personnage_id:'porteur',type:'OBJET',objet_id:'recharge',quantite:'2'}]};await f.apply(grant,target);
    await f.apply({Meta:meta,Objets:[{id:'recharge',operation:'MODIFIER',version:'3',billes_par_recharge:'!EFFACER'}]},target);
    assert.equal((await f.store.get(`sessions/${episode.id}/items/recharge`)).laserRecharge,undefined);assert.equal((await f.store.list(`sessions/${episode.id}/inventory`)).find(l=>l.ownerId==='porteur').item.laserRecharge.pelletsPerUnit,600);
  });
  test(`${prefix} : complément protège bail, propriétaire, volume et stock existants`,async()=>{
    const f=await fixture();await f.apply(masterExample());await f.apply({Meta:masterExample().Meta,...extra()});const episode=await f.session(),base=`sessions/${episode.id}`,target={scenarioId:undefined,sessionId:episode.id},Meta=[{format:'gn-engine-master',version:'1',type:'SESSION',campaign_id:episode.campaignId}];
    // Represents a lease and goods carried from a previous episode, before this episode's first launch.
    await f.store.runTransaction(async tx=>{const w=await tx.get(`${base}/warehouses/hangar`),item=await tx.get(`${base}/items/recharge`);tx.set(`${base}/warehouses/hangar`,{...w,tenantType:'GROUP',tenantId:'equipage',expiresAtGameMs:123000});tx.set(`${base}/inventory/carried`,{id:'carried',item,quantity:4,status:'AVAILABLE',ownerType:'GROUP',ownerId:'equipage',holderId:null,location:{kind:'WAREHOUSE',id:'hangar'},revision:1});});
    const before=await f.store.get(`${base}/inventory/carried`),input={Meta,Entrepots:[{id:'hangar',operation:'MODIFIER',version:'2',capacite_volume:'3'}]};assert.ok((await f.prepare(input,target)).errors.some(e=>e.column==='capacite_volume'));
    input.Entrepots[0]={id:'hangar',operation:'MODIFIER',version:'2',capacite_volume:'10',loyer:'25'};await f.apply(input,target);const w=await f.store.get(`${base}/warehouses/hangar`);assert.equal(w.tenantType,'GROUP');assert.equal(w.tenantId,'equipage');assert.equal(w.expiresAtGameMs,123000);assert.equal(w.rent,25);assert.deepEqual(await f.store.get(`${base}/inventory/carried`),before);
    await f.apply({Meta,Entrepots:[{id:'hangar',operation:'ARCHIVER',version:'3'}]},target);assert.equal((await f.store.get(`${base}/warehouses/hangar`)).enabled,false);assert.deepEqual(await f.store.get(`${base}/inventory/carried`),before);
  });
  test(`${prefix} : logistique invalide localisée et import atomique`,async()=>{
    const f=await fixture();await f.apply(masterExample());
    for(const patch of [{capacite_volume:'0'},{loyer:'-1'},{periode_minutes:'0'},{loyer_groupe_id:'absent'},{loyer_groupe_id:'equipage'},{ouvert:'peut-être'}]){const p=await f.prepare({Meta:masterExample().Meta,Entrepots:[{...warehouse,...patch}]});assert.ok(p.errors.some(e=>e.sheet==='Entrepots'&&e.row===2));assert.equal(p.canApply,false);}
    for(const patch of [{billes_par_recharge:'0'},{billes_par_recharge:'1.5'},{consommable:'NON'}]){const x=extra();x.Objets[0]={...x.Objets[0],...patch};assert.equal((await f.prepare({Meta:masterExample().Meta,...x})).canApply,false);}
    assert.equal((await f.store.list(`scenarios/${f.scenarioId}/warehouses`)).length,0);
  });
  test(`${prefix} : ajout de colonne vide compatible avec les empreintes des anciens masters`,async()=>{
    const f=await fixture(),s=masterExample();await f.apply(s);s.Objets[0].billes_par_recharge='';assert.equal((await f.apply(s)).unchanged,true);
    s.Objets[0].billes_par_recharge='500';assert.ok((await f.prepare(s)).errors.some(e=>e.sheet==='Objets'&&e.column==='version'));
  });
}
