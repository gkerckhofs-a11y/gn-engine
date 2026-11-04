import {test,expect} from 'playwright/test';
import {build} from 'esbuild';
import {readFile,mkdir} from 'node:fs/promises';
import {towingCombatFixture} from '../support/space-towing-combat-suite.mjs';
import {MemoryStore} from '../support/memory.mjs';
import {spaceCombatsHtml} from '../../web/space-encounters.mjs';
import {playerShell,playerRoute} from '../../web/player-spaces.mjs';

let template,bundle;
test.beforeAll(async()=>{
 const css=await readFile('web/style.css','utf8')+'\n'+await readFile('web/galactic.css','utf8');
 template=(await readFile('web/index.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link[^>]*rel="stylesheet"[^>]*>/g,'').replace('</head>',`<style>${css}</style></head>`).replace('{{APP_VERSION}}','RECETTE LOCALE');
 bundle=(await build({entryPoints:['web/space-encounters.mjs'],bundle:true,format:'iife',globalName:'CombatUi',write:false})).outputFiles[0].text;
 await mkdir('dist/towing-combat-browser',{recursive:true});
});
async function mount(page,f,role='pilot'){
 const actor={pilot:f.player,pirate:f.other,admin:f.owner}[role],errors=[],remote=[],writes=[];
 const render=async()=>{const data=role==='admin'?await f.read('spaceCombatAdmin',{},actor):await f.read('spaceCombat',{combatId:f.combatId},actor),html=spaceCombatsHtml(data);return role==='admin'?html:playerShell(await f.read('mySession',{},actor),playerRoute('space-combat',f.sid,f.combatId),html);};
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{remote.push(r.request().url());return r.abort();});
 await page.exposeBinding('__combatRender',()=>render());await page.exposeBinding('__combatWrite',async(_,action,p)=>{const out=await f.cmd(action,p,actor);writes.push(action);return out;});
 await page.setContent(template);await page.locator('#app').evaluate((el,html)=>el.innerHTML=html,await render());await page.addScriptTag({content:bundle});
 await page.evaluate(()=>{
  let busy=false;document.addEventListener('submit',async e=>{const form=e.target.closest('[data-form="spaceCommand"]');if(!form)return;e.preventDefault();if(busy)return;busy=true;const button=form.querySelector('button');button.disabled=true;
   try{await window.__combatWrite(form.dataset.command,window.CombatUi.spaceFormInput(form,Object.fromEntries(new FormData(form))));document.querySelector('#app').innerHTML=await window.__combatRender();}
   catch(error){window.__combatError=error.message;document.querySelector('#notice').textContent=error.message;}finally{busy=false;button.disabled=false;}
  });
 });
 return {writes,async check(testInfo,name){expect(errors).toEqual([]);expect(remote).toEqual([]);expect(await page.evaluate(()=>window.__combatError??null)).toBeNull();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('.space-towing .check,.space-towing button').evaluateAll(rows=>rows.filter(e=>e.getClientRects().length&&e.getBoundingClientRect().height<44).length)).toBe(0);const path=testInfo.outputPath(name+'.png');await page.screenshot({path,fullPage:true});await testInfo.attach(name,{path,contentType:'image/png'});}};
}
test('Pilote : présence requise, largage avant round et résultat natif sans PA',async({page},testInfo)=>{
 const f=await towingCombatFixture(()=>new MemoryStore(),{round:false}),pa=await f.points(),owner=(await f.get('ships/wreck')).ownerId,h=await mount(page,f),drop=page.getByRole('button',{name:'Larguer l’épave — 0 PA'});await drop.click();expect(h.writes).toEqual([]);await page.getByLabel('Je suis présent et je confirme le largage de l’épave.').check();await drop.dblclick();await expect(page.getByRole('heading',{name:'Épave larguée',exact:true})).toBeVisible();expect(h.writes).toEqual(['dropTowedWreck']);expect(await f.points()).toEqual(pa);expect((await f.get('ships/wreck')).ownerId).toBe(owner);expect((await f.navigation()).ship.profile.maneuverability).toBe(1);await h.check(testInfo,'largage-confirme');
});
test('Round échu non résolu : largage encore possible avant la résolution native',async({page},testInfo)=>{
 const f=await towingCombatFixture(()=>new MemoryStore());f.advance(90000);const h=await mount(page,f);await expect(page.getByRole('button',{name:'Résoudre le round',exact:true})).toBeVisible();await page.getByLabel('Je suis présent et je confirme le largage de l’épave.').check();await page.getByRole('button',{name:'Larguer l’épave — 0 PA'}).click();await expect(page.getByRole('heading',{name:'Épave larguée',exact:true})).toBeVisible();expect((await f.ship()).journey.towing).toBeUndefined();await h.check(testInfo,'avant-resolution');
});
test('Zéro Coque : résultat du round et interruption automatique lisibles',async({page},testInfo)=>{
 const f=await towingCombatFixture(()=>new MemoryStore(),{sameOwner:true}),owner=(await f.get('ships/wreck')).ownerId;await f.edit('ships/ship',s=>({...s,hull:1,shield:0}));await f.submit('PASSIVE');await f.submit('ATTACK',f.other);f.setDie(6);f.advance(90000);const h=await mount(page,f);await page.getByRole('button',{name:'Résoudre le round',exact:true}).click();await expect(page.getByRole('heading',{name:'Remorquage interrompu : Coque à zéro'})).toBeVisible();await expect(page.getByRole('button',{name:'Larguer l’épave — 0 PA'})).toHaveCount(0);expect((await f.get('ships/wreck')).ownerId).toBe(owner);expect((await f.get('ships/wreck')).wreckSpacePosition.combatId).toBe(f.combatId);await h.check(testInfo,'interruption-zero-coque');
});
test('Pause, pirate et régie : aucune commande de largage pour un rôle non autorisé',async({page},testInfo)=>{
 const f=await towingCombatFixture(()=>new MemoryStore());await f.stage('PAUSE');const h=await mount(page,f);await expect(page.getByRole('button',{name:'Largage indisponible'})).toBeDisabled();await h.check(testInfo,'pause');
 for(const role of ['pirate','admin']){const p=await page.context().newPage(),v=await mount(p,f,role);await expect(p.locator('[data-command="dropTowedWreck"]')).toHaveCount(0);expect(v.writes).toEqual([]);await p.close();}
});
