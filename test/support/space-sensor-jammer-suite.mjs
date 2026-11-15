import test from 'node:test';
import assert from 'node:assert/strict';
import {encountersFixture} from './space-encounters-suite.mjs';
import {newLot} from '../../src/core/inventory-state.mjs';
import {sensorJammerQuote,installedShipProfile} from '../../src/shared/space-ship-modules.mjs';
import {resolveSpaceDuel} from '../../src/core/space-combat-state.mjs';
import {resolveConvoyRound} from '../../src/core/space-convoy-combat.mjs';
import {order} from './space-encounters-suite.mjs';
import {moduleMandateFixture} from './space-module-mandates-suite.mjs';
import {moduleOfferValid} from '../../src/core/space-outlaws-shop-state.mjs';

export function sensorJammerSuite(create,prefix='Brouilleur rare R04-01'){
async function mountPrepared(f){
 const base=`sessions/${f.sid}`;
 await f.store.runTransaction(async tx=>{
  const s=await tx.get(base),sh=await tx.get(`${base}/ships/ship`),m={code:'R04-01',size:sh.soProfile.size,lotId:'jammer-01',status:'OPERATIONAL',installationId:'prepared'};
  const item={id:'jammer',name:'Brouilleur préparé',description:'Prototype de recette',category:'Module',legality:'UNSPECIFIED',pillable:false,shipModule:{code:m.code,size:m.size},kind:'INDIVIDUAL',consumable:false,unitVolume:1,unit:'unité',revision:1},lot={...newLot(m.lotId,item,1,f.cid,Date.now(),{kind:'SHIP_RARE_FABRICATION'}),transferable:true,resellable:true};
  tx.set(base,{...s,spaceOutlaws:{...s.spaceOutlaws,sensorJammerVersion:1}});
  tx.set(`${base}/ships/ship`,{...sh,moduleInstallationVersion:1,modules:[m],soProfile:installedShipProfile(sh.soProfile,[m],{rare:true}),revision:sh.revision+1});
  tx.set(`${base}/inventory/${m.lotId}`,{...lot,status:'INSTALLED',holderId:'ship',location:{kind:'SHIP_MODULE',id:'ship'}});
 });
}
const encounter=()=>encountersFixture(create,{beforeDeparture:mountPrepared});

test(`${prefix} : valeurs canoniques et aucun achat standard`,()=>{
 const q=sensorJammerQuote({code:'R04-01',size:2});assert.equal(q.price,3000);assert.equal(q.commonCost,2000);assert.equal(q.rareCost,1000);assert.equal(q.install.seconds,1200);assert.equal(q.remove.seconds,600);
 assert.equal(moduleOfferValid({item:{kind:'INDIVIDUAL',consumable:false,shipModule:{code:'R04-01',size:2}},unitPrice:3000}),false);
 assert.equal(sensorJammerQuote({code:'R04-01',size:0}),null);
 assert.equal(installedShipProfile({id:'CARGO'},[{code:'R04-01',size:2,status:'OPERATIONAL'}]),null);
});

test(`${prefix} : origine fabriquée et MEC-03 N4 indispensables à l’accord de montage`,async()=>{
 const f=await moduleMandateFixture(create),lotId=f.sale.purchasedLotId;
 await f.edit('',s=>({...s,spaceOutlaws:{...s.spaceOutlaws,sensorJammerVersion:1}}));
 await f.edit(`inventory/${lotId}`,l=>({...l,item:{...l.item,shipModule:{code:'R04-01',size:2}}}));
 await assert.rejects(f.preview(),{code:'MODULE_LOT_UNAVAILABLE'});
 await f.edit(`inventory/${lotId}`,l=>({...l,origin:{kind:'SHIP_RARE_FABRICATION'}}));
 await assert.rejects(f.preview(),{code:'MODULE_TECH_REQUIRED'});
 await f.edit(`characters/${f.otherId}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(x=>x.id==='MEC-03'?{...x,level:4}:x)}}));
 const q=await f.preview();assert.equal(q.install.level,4);assert.equal(q.install.seconds,1200);
});

test(`${prefix} : décrochage déclaré, bonus une fois et refus du module inactif`,async()=>{
 const f=await encounter();assert.equal((await f.detail()).sensorJammerReady,true);
 f.setDie(4);const r=await f.combatCmd('spaceBreakaway',{sensorJammer:true});assert.equal(r.total,6);assert.equal(r.success,true);assert.equal((await f.ship()).journey.sensorJammerUsed,true);
 const g=await encounter();await g.edit('ships/ship',sh=>({...sh,modules:sh.modules.map(m=>({...m,status:'DAMAGED'}))}));
 await assert.rejects(g.combatCmd('spaceBreakaway',{sensorJammer:true}),{code:'SPACE_SPECIAL_USED'});
 assert.equal((await g.ship()).journey.sensorJammerUsed,undefined);
});

test(`${prefix} : fuite contestée, usage consommé au jet, pas au simple ordre`,async()=>{
 const f=await encounter();await f.begin();await f.submit('FLEE',f.player,{sensorJammer:true});assert.equal((await f.ship()).journey.sensorJammerUsed,undefined);
 await f.submit('PURSUE',f.other);f.setDice([1,1,1,1,4,1,5,1]);const r=await f.resolve();assert.equal(r.result.rolls.find(x=>x.kind==='FLEE').sensorJammerBonus,1);assert.equal((await f.ship()).journey.sensorJammerUsed,true);
 if((await f.detail()).status==='ROUND')await assert.rejects(f.submit('FLEE',f.player,{sensorJammer:true}),{code:'SPACE_SPECIAL_USED'});
 const g=await encounter();await g.begin();await g.submit('FLEE',g.player,{sensorJammer:true});await g.resolve();assert.equal((await g.ship()).journey.sensorJammerUsed,undefined);
});

test(`${prefix} : moteur duel et convoi n’ajoutent jamais deux bonus spéciaux`,()=>{
 const a={id:'a',team:'A',hull:4,shield:2,fuel:6,maneuverability:1,weapon:'STANDARD'},b={...a,id:'b',team:'B'},c={...a,id:'c',team:'A'};
 const duel=resolveSpaceDuel([a,b],[order('FLEE',{sensorJammer:true}),order('PURSUE')],[1,1,1,1,4,1,5,1]);assert.equal(duel.jammerUsed[0],true);assert.equal(duel.rolls.find(x=>x.kind==='FLEE').total,6);
 const convoy=resolveConvoyRound([a,b,c],[order('FLEE',{targetId:'b',defenseIds:[],sensorJammer:true}),order('PURSUE',{targetId:'a',defenseIds:[]}),order('PASSIVE',{targetId:'b',defenseIds:[]})],Array(13).fill(1));assert.equal(convoy.jammerUsed[0],true);assert.equal(convoy.rolls.find(x=>x.kind==='FLEE').sensorJammerBonus,1);
});

}
