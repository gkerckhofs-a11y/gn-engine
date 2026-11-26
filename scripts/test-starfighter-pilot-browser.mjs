// Browser integration on loopback. Only the identity provider is replaced for these two test pilots.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {MemoryStore} from '../test/support/memory.mjs';
import {encountersFixture} from '../test/support/space-encounters-suite.mjs';
import {soNavigationHtml} from '../web/space-outlaws-voyages.mjs';

const f=await encountersFixture(()=>new MemoryStore(),{encounter:false});
await f.cmd('configureStarfighter',{revision:0,stationCount:2,combat:true,flightDuel:true,shieldFactor:10},f.owner);
const ids=['ship','second'],actors=[f.player,f.other];
for(const [i,id] of ids.entries()){
 const stationId='cockpit-'+(i+1);
 await f.edit('ships/'+id,s=>({...s,shield:1,hull:2,cockpit:{status:'ASSIGNED',starfighter:true,pilotId:s.pilotId,stationId,operationId:id}}));
 await f.edit('cockpitStations/'+stationId,()=>({id:stationId,shipId:id,operationId:id}));
}
const js=await build({entryPoints:['web/cockpit/connected.mjs'],format:'esm',bundle:true,write:false,plugins:[{
 name:'loopback-test-auth',setup(b){
  b.onResolve({filter:/firebase-client\.mjs$|^firebase\/auth$/},args=>({path:args.path,namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:path==='firebase/auth'?
    'export class GoogleAuthProvider{};export const setPersistence=async()=>{},signInWithPopup=()=>{},browserSessionPersistence={},signOut=()=>{},onAuthStateChanged=(a,cb)=>cb(a.currentUser);':
    'export default {currentUser:{getIdToken:async()=>sessionStorage.seat}};'}));
 }}]});
const pub=resolve('public'),errors=[];
const csp=JSON.parse(await readFile('firebase.json','utf8')).hosting.headers[0].headers.find(h=>h.key==='Content-Security-Policy').value;
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  res.setHeader('content-security-policy',csp);
  if(path==='/api/command'){
   const i=['Bearer seat0','Bearer seat1'].indexOf(req.headers.authorization);assert.ok(i>=0);
   let body='';for await(const chunk of req)body+=chunk;
   const {action,input}=JSON.parse(body);
   const result=await f.read(action,input,actors[i]);res.setHeader('content-type','application/json');return res.end(JSON.stringify({result}));
  }
  if(path==='/navigation/0'||path==='/navigation/1'){
   const i=Number(path.at(-1)),nav=await f.read('shipNavigation',{shipId:ids[i]},actors[i]);
   res.setHeader('content-type','text/html;charset=utf-8');return res.end(soNavigationHtml(nav));
  }
  if(path==='/cockpit/connected.js'){res.setHeader('content-type','application/javascript');return res.end(js.outputFiles[0].contents);}
  const file=resolve(pub,'.'+path);assert.ok(file.startsWith(pub+sep));
  res.setHeader('content-type',path.endsWith('.html')?'text/html;charset=utf-8':path.endsWith('.css')?'text/css':'application/javascript');
  res.end(await readFile(file));
 }catch(e){res.statusCode=400;res.end(JSON.stringify({error:e.code??e.message}));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const clock=setInterval(()=>f.advance(50),50);
let browser,pages;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--allow-loopback-in-peer-connection','--disable-features=WebRtcHideLocalIpsWithMdns','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 pages=await Promise.all(ids.map(async(_,i)=>{
  const context=await browser.newContext({permissions:['camera','microphone']});const page=await context.newPage();
  await page.addInitScript(i=>{sessionStorage.seat='seat'+i;},i);
  page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/navigation/'+i);
  await page.getByRole('link',{name:/Prendre les commandes/}).click();
  return page;
 }));
 const bridge=p=>p.locator('[aria-label="Pilotage manuel"]');
 const [pilot,target]=pages.map(bridge);
 await Promise.all(pages.map(async p=>{await bridge(p).getByRole('button',{name:'Ouvrir la visio'}).click();}));
 for(const p of pages)await p.waitForFunction(()=>document.querySelector('[aria-label="Pilotage manuel"]').shadowRoot.querySelector('video').videoWidth>0);
 const max=await target.locator('#shield').textContent();assert.match(max,/^10 \/ \d+$/);
 await pilot.locator('#speed-lever').press('ArrowRight');
 await pages[0].waitForFunction(()=>document.querySelector('[aria-label="Pilotage manuel"]').shadowRoot.getElementById('speed').value==='1 m/s');
 await pilot.locator('#speed-lever').press('Home');
 await f.stage('PAUSE');
 await pages[0].waitForFunction(()=>document.querySelector('[aria-label="Pilotage manuel"]').shadowRoot.getElementById('speed-lever').disabled);
 const room=(await f.get('ships/ship')).combatId;
 await f.stage('EN_JEU');f.advance(91000);
 for(const p of pages)await bridge(p).getByText('Duel de pilotage',{exact:true}).waitFor();
 await pilot.locator('#glass').click();await pages[0].keyboard.down('Space');
 await target.getByText('Vaisseau immobilisé',{exact:true}).waitFor({timeout:45000});
 await pages[0].keyboard.up('Space');assert.equal((await f.get('spaceCombats/'+room)).reason,'IMMOBILIZED');
 assert.equal((await f.get('ships/second')).journey.immobilized,true);assert.equal((await f.get('ships/ship')).combatId,null);
 assert.deepEqual(errors,[]);console.log('Deux navigateurs : entrée depuis Navigation, visio, vitesse, pause, reprise, combat et immobilisation vérifiés.');
}catch(error){
 const sh=await f.get('ships/ship'),e=await f.get('spaceCombats/'+sh.starfighterEncounter?.id);
 console.error({status:e?.status,helm:await Promise.all((pages??[]).map(p=>p.locator('[aria-label="Pilotage manuel"]').evaluate(host=>host.shadowRoot.getElementById('phase')?.textContent))),ships:(await f.get('spaceCombats/'+e?.id+'/flight/state'))?.room.ships,errors});
 throw error;
}finally{clearInterval(clock);await browser?.close();server.closeAllConnections();server.close();}
