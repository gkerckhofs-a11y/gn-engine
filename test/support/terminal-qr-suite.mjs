import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {planetMarketsFixture} from './planet-markets-suite.mjs';
export async function terminalQrFixture(makeStore,options={}){
 const f=await planetMarketsFixture(makeStore,options);
 const operations=['commodityMarket','galacticMarkets','preparePlanetSale','sellToPlanetMarket'].map(action=>({action,resourceId:f.sid,characterIds:[],skillId:null,minLevel:0}));
 const terminal={id:'bourse',name:'Comptoir des marchandises',placeId:'scene',portId:null,active:true,durationSeconds:60,operations};
 const save=(patch={},revision=0)=>f.cmd('saveLocalTerminal',{terminal:{...terminal,...patch},revision},f.owner);
 const scan=()=>f.cmd('scanLocalTerminal',{terminalId:terminal.id});
 const adopt=async()=>{await f.stage('PAUSE');const s=await f.store.get(`sessions/${f.sid}`);await f.cmd('setTerminalQrMode',{version:1,revision:s.revision},f.owner);await f.stage('EN_JEU');};
 return {...f,terminal,save,scan,adopt};
}
export function terminalQrSuite(makeStore,prefix='Terminaux QR'){
 test(`${prefix} TQ-01 : opt-in explicite, héritage intact, absence de raccordement fermée`,async()=>{
  const f=await terminalQrFixture(makeStore);await f.read('commodityMarket');await f.read('galacticMarkets');
  const s=await f.store.get(`sessions/${f.sid}`);await assert.rejects(f.cmd('setTerminalQrMode',{version:1,revision:s.revision},f.player),{code:'FORBIDDEN'});
  await assert.rejects(f.cmd('setTerminalQrMode',{version:1,revision:s.revision},f.owner),{code:'SESSION_NOT_PAUSED'});
  await f.adopt();await assert.rejects(f.read('commodityMarket'),{code:'LOCAL_BINDING_REQUIRED'});await assert.rejects(f.read('galacticMarkets'),{code:'LOCAL_BINDING_REQUIRED'});
 });
 test(`${prefix} TQ-01 : Courtier, comptoir courant, expiration et fermeture sans effet économique`,async()=>{
  const f=await terminalQrFixture(makeStore);await f.save();await f.adopt();const before=await f.wallet();
  for(const a of ['commodityMarket','galacticMarkets'])await assert.rejects(f.read(a),{code:'LOCAL_SCAN_REQUIRED'});
  await f.scan();await f.read('commodityMarket');await f.read('galacticMarkets');await f.move('away');await f.read('galacticMarkets');
  f.advance(61000);for(const a of ['commodityMarket','galacticMarkets'])await assert.rejects(f.read(a),{code:'LOCAL_SCAN_REQUIRED'});
  assert.deepEqual(await f.wallet(),before);await f.save({active:false},1);await assert.rejects(f.read('commodityMarket'),{code:'LOCAL_TERMINAL_CLOSED'});
 });
 test(`${prefix} TQ-01 : non-Courtier consulte les cours publics sans recevoir les prix professionnels`,async()=>{
  const f=await terminalQrFixture(makeStore,{classId:'MED',usage:'PERSONAL'});await f.save();await f.adopt();
  await assert.rejects(f.read('commodityMarket'),{code:'LOCAL_SCAN_REQUIRED'});await f.scan();const d=await f.read('commodityMarket');assert.ok(Array.isArray(d.prices));
  await assert.rejects(f.read('galacticMarkets'),{code:'FORBIDDEN'});assert.doesNotMatch(JSON.stringify(d),/assignedUid|gmNotes|SECRET/);
 });
}
