import {test,expect} from 'playwright/test';
import {build} from 'esbuild';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {nativeHiddenFlightFixture} from '../support/space-hidden-cargo-suite.mjs';
import {MemoryStore} from '../support/memory.mjs';
import {hiddenCargoHtml,customsDeskHtml,customsAdminHtml,customsInspectionHtml} from '../../web/space-hidden-cargo.mjs';
import {playerShell,playerRoute} from '../../web/player-spaces.mjs';

let template,bundle;
test.beforeAll(async()=>{
 const css=await readFile('web/style.css','utf8')+'\n'+await readFile('web/galactic.css','utf8');
 template=(await readFile('web/index.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link[^>]*rel="stylesheet"[^>]*>/g,'').replace('</head>',`<style>${css}</style></head>`).replace('{{APP_VERSION}}','RECETTE LOCALE');
 bundle=(await build({entryPoints:['web/space-hidden-cargo.mjs'],bundle:true,format:'iife',globalName:'HiddenCargoUi',write:false})).outputFiles[0].text;
 await mkdir('dist/hidden-cargo-browser',{recursive:true});
});
async function fixture(){const f=await nativeHiddenFlightFixture(()=>new MemoryStore());await f.cmd('setCustomsAuthority',{characterId:f.otherId,level:5,portId:'home',authorityRevision:0,reason:'Poste de recette locale'},f.owner);return f;}
async function mount(page,f,role,path){
 const actor={owner:f.player,agent:f.other,admin:f.owner}[role],errors=[],remote=[],writes=[];let current=path;
 async function render(path=current){current=path;const [mode,,id]=path.slice(2).split('/');let html;
  if(mode==='hidden-cargo')html=hiddenCargoHtml(await f.read('hiddenCargo',{shipId:id},actor));
  else if(mode.startsWith('customs-inspection'))html=customsInspectionHtml(await f.read(mode.endsWith('-admin')?'customsInspectionAdmin':'customsInspection',{inspectionId:id},actor),role==='admin');
  else html=role==='admin'?customsAdminHtml(await f.read('customsAdmin',{},actor)):customsDeskHtml(await f.read('customsDesk',{},actor));
  return role==='admin'?html:playerShell(await f.read('mySession',{},actor),playerRoute(mode,f.sid),html);
 }
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{remote.push(r.request().url());return r.abort();});
 await page.exposeBinding('__hiddenRead',(_,action,p)=>f.read(action,p,actor));
 await page.exposeBinding('__hiddenWrite',async(_,action,p)=>{const result=await f.cmd(action,p,actor);writes.push(action);return result;});
 await page.exposeBinding('__hiddenRender',(_,path)=>render(path));
 await page.setContent(template);await page.locator('#app').evaluate((el,html)=>el.innerHTML=html,await render());await page.addScriptTag({content:bundle});
 await page.evaluate(()=>{
  const app=document.querySelector('#app'),dialog=document.querySelector('#dialog'),notice=document.querySelector('#notice');let busy=false;
  const refresh=async path=>{app.innerHTML=await window.__hiddenRender(path);};
  document.addEventListener('submit',async e=>{const form=e.target.closest('[data-form="hiddenCargoCommand"]');if(!form)return;e.preventDefault();if(busy)return;busy=true;
   try{await window.HiddenCargoUi.submitHiddenCargo(form.dataset.command,JSON.parse(form.dataset.payload),Object.fromEntries(new FormData(form)),{read:window.__hiddenRead,write:window.__hiddenWrite,isCurrent:()=>true,confirm:html=>{dialog.innerHTML=html;dialog.showModal();},close:()=>dialog.close(),announce:text=>notice.textContent=text,navigate:path=>{refresh(path);},refresh:()=>refresh()});}
   catch(error){notice.textContent=error.message;window.__hiddenError=error.message;}finally{busy=false;}
  });
  document.addEventListener('click',e=>{if(e.target.closest('[data-action="refresh"]'))refresh();const a=e.target.closest('a[href^="#/customs"]');if(a){e.preventDefault();refresh(a.getAttribute('href'));}});
 });
 return {writes,errors,remote,async check(){expect(errors).toEqual([]);expect(remote).toEqual([]);expect(await page.evaluate(()=>window.__hiddenError??null)).toBeNull();}};
}
async function layout(page,testInfo,name){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const bad=await page.locator('.cargo-customs .check').evaluateAll(labels=>labels.filter(e=>e.getClientRects().length&&e.getBoundingClientRect().height<44).length);expect(bad).toBe(0);
 const capture=testInfo.outputPath(name.replace(/[^a-zA-Z0-9-]+/g,'-')+'.png');await page.screenshot({path:capture,fullPage:true});await testInfo.attach(name,{path:capture,contentType:'image/png'});
 const record={scope:'COMPONENT_DOM_NATIVE_MEMORY_WORKFLOW',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),browser:page.context().browser().version(),viewport:page.viewportSize(),humanAcceptance:'NOT_EXECUTED',firebaseAuth:'NOT_EXECUTED'};
 await writeFile(`dist/hidden-cargo-browser/${testInfo.project.name}-context.json`,JSON.stringify(record,null,2));
}
test('Propriétaire : aperçu sans mutation, présence requise et rangement natif',async({page},testInfo)=>{
 const f=await fixture(),h=await mount(page,f,'owner',`#/hidden-cargo/${f.sid}/ship`),before=await f.get(`inventory/${f.extraLotId}`);
 await page.getByRole('button',{name:'Ranger dans le compartiment',exact:true}).click();await expect(page.locator('dialog')).toBeVisible();expect(await f.get(`inventory/${f.extraLotId}`)).toEqual(before);expect(h.writes).toEqual([]);
 await layout(page,testInfo,'aperçu propriétaire');await page.getByRole('button',{name:'Confirmer le rangement'}).click();expect(await page.locator('dialog input[name="present"]').evaluate(e=>e.validity.valueMissing)).toBe(true);expect(h.writes).toEqual([]);
 await page.locator('dialog input[name="present"]').check();await page.getByRole('button',{name:'Confirmer le rangement'}).click();await expect(page.locator('dialog')).not.toBeVisible();await expect(page.locator('#app')).toContainText('5 / 5 unités dissimulées');expect((await f.get(`inventory/${f.extraLotId}`)).hiddenCargo.concealed).toBe(true);await layout(page,testInfo,'rangement propriétaire');await h.check();
});
test('Agent : délai, deux attestations, fin personnelle et découverte persistante',async({page},testInfo)=>{
 const f=await fixture(),h=await mount(page,f,'agent',`#/customs/${f.sid}`);await page.locator('select[name="shipId"]').selectOption('ship');await page.locator('select[name="kind"]').selectOption('DEEP');await page.getByRole('button',{name:'Vérifier le contrôle'}).click();await expect(page.locator('dialog')).toContainText('1 PA réservé');await page.locator('dialog input[name="present"]').check();await page.getByRole('button',{name:'Démarrer le contrôle'}).click();await expect(page.locator('#app')).toContainText('120 secondes de jeu restantes');await expect(page.getByRole('button',{name:'Confirmer le contrôle'})).toHaveCount(0);expect((await f.points(f.other)).reserved).toBe(1);
 f.advance(120000);await page.locator('#app [data-action="refresh"]').last().click();await expect(page.getByRole('button',{name:'Confirmer le contrôle'})).toBeVisible();await page.locator('#app input[name="present"]').check();await page.getByRole('button',{name:'Confirmer le contrôle'}).click();expect(await page.locator('#app input[name="performed"]').evaluate(e=>e.validity.valueMissing)).toBe(true);expect((await f.points(f.other)).reserved).toBe(1);await layout(page,testInfo,'attestations contrôle');await page.locator('#app input[name="performed"]').check();await page.getByRole('button',{name:'Confirmer le contrôle'}).click();await expect(page.locator('#app')).toContainText('inspection réussie');expect((await f.get(`inventory/${f.lotId}`)).hiddenCargo.discovered).toBe(true);expect((await f.points(f.other)).available).toBe(3);expect((await f.points(f.other)).reserved).toBe(0);await layout(page,testInfo,'résultat contrôle');await h.check();
});
test('Régie : joueur révoqué, aucune fin à sa place et interruption motivée',async({page},testInfo)=>{
 const f=await fixture(),p={shipId:'ship',kind:'DEEP'},q=await f.read('prepareCustomsInspection',p,f.other),r=await f.cmd('startCustomsInspection',{...p,confirmation:q.confirmation,present:true},f.other);f.advance(120000);await f.cmd('setCustomsAuthority',{characterId:f.otherId,level:0,portId:'home',authorityRevision:1,reason:'Fin du poste'},f.owner);const h=await mount(page,f,'admin',`#/customs-admin/${f.sid}`);await layout(page,testInfo,'régie douane');await page.locator(`a[href="#/customs-inspection-admin/${f.sid}/${r.id}"]`).click();await expect(page.locator('#app')).toContainText('Seul l’agent joueur');await expect(page.getByRole('button',{name:'Confirmer le contrôle'})).toHaveCount(0);await page.getByRole('button',{name:'Interrompre le contrôle'}).click();expect(await page.locator('input[name="reason"]').evaluate(e=>e.validity.valueMissing)).toBe(true);expect(h.writes).toEqual([]);await page.locator('input[name="reason"]').fill('Poste révoqué, contrôle interrompu');await page.getByRole('button',{name:'Interrompre le contrôle'}).click();await expect(page.locator('#app')).toContainText('Annulé');expect((await f.points(f.other)).reserved).toBe(0);expect((await f.points(f.other)).available).toBe(4);await layout(page,testInfo,'interruption régie');await h.check();
});
test('Panne B : ancien contenu protégé, nouveau rangement absent et texte lisible',async({page},testInfo)=>{
 const f=await nativeHiddenFlightFixture(()=>new MemoryStore());await f.launch();await f.arrive();const before=await f.get(`inventory/${f.lotId}`),h=await mount(page,f,'owner',`#/hidden-cargo/${f.sid}/ship`);await expect(page.locator('#app')).toContainText('3 / 5 unités dissimulées');await expect(page.locator('#app')).toContainText('Les biens déjà rangés restent cachés.');await expect(page.getByRole('button',{name:'Ranger dans le compartiment',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Sortir du compartiment'})).toBeVisible();expect(await f.get(`inventory/${f.lotId}`)).toEqual(before);await layout(page,testInfo,'panne B');await h.check();
});
