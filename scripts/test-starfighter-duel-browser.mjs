import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const relay=spawn(process.execPath,['scripts/starfighter-duel.mjs'],{env:{...process.env,PORT:'0'}});
let browser;
try{
 let log='';for await(const chunk of relay.stdout){log+=chunk;if(log.includes('Cockpit 2'))break;}
 const urls=log.match(/http:\/\/localhost:\d+\/#\w+/g);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--allow-loopback-in-peer-connection','--disable-features=WebRtcHideLocalIpsWithMdns','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 const pages=await Promise.all(urls.map(async url=>{
  const ctx=await browser.newContext({permissions:['camera','microphone']});const p=await ctx.newPage();await p.goto(url);return p;
 }));
 for(const p of pages)await p.waitForFunction(()=>!document.querySelector('#call').disabled);
 for(const p of pages)await p.click('#call');
 for(const p of pages)await p.waitForFunction(()=>document.querySelector('#phase').textContent.startsWith('Négociation')&&document.querySelector('video').videoWidth>0);
 await pages[0].click('#break');
 for(const p of pages)await p.waitForFunction(()=>document.querySelector('#guns').value==='ARMÉ' && document.querySelector('video').hidden);
 await pages[0].keyboard.down('Space');
 await pages[1].waitForFunction(()=>document.querySelector('#shield').value!=='3 / 3');
 console.log('Deux navigateurs : caméra et micro simulés, négociation, coupure visio, tir et impact distant vérifiés.');
}finally{await browser?.close();relay.kill();}
