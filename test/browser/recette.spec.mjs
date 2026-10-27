import {test,expect} from 'playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

let scenario;
const contexts=[];
function apiResponse(page,action){return page.waitForResponse(r=>r.url().endsWith('/api/command')&&r.request().postDataJSON()?.action===action);}
async function navigate(page,path,action){await page.goto('about:blank');const response=apiResponse(page,action);await page.goto(`/#/${path}`);return response;}
async function clickCommand(page,selector,action){const response=apiResponse(page,action);await page.locator(selector).click();const result=await response;expect(result.status()).toBe(200);return (await result.json()).result;}
async function login(browser,role){
  const context=await browser.newContext({baseURL:'http://127.0.0.1:4173',viewport:{width:1280,height:900}}),page=await context.newPage(),remote=[],errors=[];
  contexts.push({context,remote,errors});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(['data:','blob:'].includes(url.protocol)||url.protocol==='http:'&&url.hostname==='127.0.0.1'&&['4173','9099','9199'].includes(url.port))return route.continue();remote.push(url.origin);return route.abort();});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await page.locator('#recette-identity').selectOption(role);
  const response=apiResponse(page,'identity');await page.locator('#recette-login').click();expect((await response).status()).toBe(200);
  await expect(page.locator('#recette-status')).toContainText('Identité fictive connectée');
  return {page,context};
}
async function capture(page,testInfo,name){await testInfo.attach(name,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});}
test.beforeAll(async({request,browser})=>{
  const response=await request.get('http://127.0.0.1:4173/recette.json');expect(response.status()).toBe(200);scenario=await response.json();
  expect(scenario.sessionId).toMatch(/^so_/);expect(scenario.humanAcceptance).toBe('NOT_EXECUTED');expect(scenario.projectId).toBe('demo-gn-engine');
  expect(scenario.commit).toBe(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
  await mkdir('dist/recette-browser',{recursive:true});await writeFile('dist/recette-browser/context.json',JSON.stringify({scope:'AUTOMATED_CHROMIUM',browser:browser.version(),viewport:{width:1280,height:900},...scenario,humanAcceptance:'NOT_EXECUTED'},null,2));
});
test.afterEach(async()=>{
  const active=contexts.splice(0);for(const item of active)await item.context.close();
  expect(active.flatMap(x=>x.remote)).toEqual([]);expect(active.flatMap(x=>x.errors)).toEqual([]);
});

test('Navigateur : guide et export restent non exécutés par défaut',async({page},info)=>{
  await page.goto('/recette.html');await expect(page.getByRole('heading',{name:'Recette locale des missions'})).toBeVisible();
  await expect(page.locator('[data-case]')).toHaveCount(7);
  expect(await page.locator('[data-case] select').evaluateAll(selects=>selects.map(s=>s.value))).toEqual(Array(7).fill('NOT_EXECUTED'));
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter le relevé JSON'}).click();
  const file=await download,result=JSON.parse(await readFile(await file.path(),'utf8'));
  expect(result.candidate.commit).toBe(scenario.commit);expect(result.canonicalAcceptance).toBe('NOT_CERTIFIED');expect(result.deploymentAuthorized).toBe(false);expect(result.results.every(r=>r.status==='NOT_EXECUTED')).toBe(true);
  await page.locator('[data-case="LOCAL-01"] select').selectOption('PASS');await page.getByRole('button',{name:'Exporter le relevé JSON'}).click();
  await expect(page.locator('#report-status')).toContainText('renseigner rôle');
  // Leave the manual form unexecuted; no human PASS is recorded by automation.
  await page.locator('[data-case="LOCAL-01"] select').selectOption('NOT_EXECUTED');
  await capture(page,info,'guide-non-execute');
});

test('Navigateur : six identités, filtres et secrets du contrat',async({browser},info)=>{
  for(const role of ['owner','mj','reception','player','other','outsider']){
    const {page}=await login(browser,role),response=await navigate(page,`contracts-admin/${scenario.sessionId}`,'sessionContracts');
    expect(response.status()).toBe(['owner','mj'].includes(role)?200:403);
    await expect(page.locator('#recette-identity')).toHaveValue(role);
    if(['owner','mj'].includes(role)){
      await expect(page.getByRole('heading',{name:'Régie des missions',exact:true})).toBeVisible();
      await page.locator('[data-obligation-filter]').selectOption('FUEL');await expect(page.locator('[data-obligation-empty]')).toBeVisible();await expect(page.locator('[data-obligation-row]')).toBeHidden();
      await page.locator('[data-obligation-filter]').selectOption('ALL');await expect(page.locator('[data-obligation-row]')).toBeVisible();
      if(role==='owner')await capture(page,info,'regie-en-pause');
    }else{
      await expect(page.locator('[data-obligation-row]')).toHaveCount(0);await expect(page.locator('#app')).not.toContainText('SECRET_RECETTE');
    }
    if(['player','other'].includes(role)){
      const contract=await navigate(page,`contract/${scenario.sessionId}/${scenario.contractId}`,'contractDetail');expect(contract.status()).toBe(role==='player'?200:403);
      if(role==='player'){
        await expect(page.locator('#app')).toContainText('SECRET_RECETTE_BRIEFING');await page.setViewportSize({width:390,height:844});
        const layout=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth).map(e=>({tag:e.tagName,id:e.id,width:e.getBoundingClientRect().width}))}));
        await info.attach('disposition-390px',{body:Buffer.from(JSON.stringify(layout,null,2)),contentType:'application/json'});
        expect(layout.width).toBeLessThanOrEqual(layout.viewport);
        await capture(page,info,'titulaire-390px');
      }else await expect(page.locator('#app')).not.toContainText('SECRET_RECETTE_BRIEFING');
    }
    if(role==='mj'){const other=await navigate(page,`session/${scenario.otherSessionId}`,'session');expect(other.status()).toBe(403);}
  }
});

test('Navigateur : STOP puis reprise depuis la régie, sans modifier les réserves',async({browser},info)=>{
  const {page}=await login(browser,'owner');await navigate(page,`session/${scenario.sessionId}`,'spaceOutlawsEntry');
  await clickCommand(page,'[data-action="soSafetyStopMJ"]','stopSafetyMJ');
  let response=await navigate(page,`contracts-admin/${scenario.sessionId}`,'sessionContracts'),d=(await response.json()).result;
  expect(d.session.safetyStopped).toBe(true);expect(d.contracts[0].obligations.salaryReserved).toBe(100);await expect(page.locator('#app')).toContainText('STOP SÉCURITÉ');await capture(page,info,'regie-stop');
  await navigate(page,`session/${scenario.sessionId}`,'spaceOutlawsEntry');page.once('dialog',dialog=>dialog.accept('Danger fictif résolu lors du contrôle navigateur'));
  await clickCommand(page,'[data-action="soSafetyResume"]','resumeSafety');
  response=await navigate(page,`contracts-admin/${scenario.sessionId}`,'sessionContracts');d=(await response.json()).result;
  expect(d.session.safetyStopped).toBe(false);expect(d.session.stage).toBe('PAUSE');expect(d.contracts[0].obligations.salaryReserved).toBe(100);
});

test('Navigateur : preuve après reconnexion, validation MJ sans paiement et délai figé en pause',async({browser},info)=>{
  const {page:owner}=await login(browser,'owner'),{page:player,context}=await login(browser,'player');
  await navigate(owner,`session/${scenario.sessionId}`,'spaceOutlawsEntry');owner.once('dialog',dialog=>dialog.accept());await clickCommand(owner,'[data-action="soStage"][data-stage="EN_JEU"]','setStage');
  await navigate(player,`contract/${scenario.sessionId}/${scenario.contractId}`,'contractDetail');
  const form=player.locator('[data-form="contractProof"]');await expect(form).toBeVisible();
  await form.locator('[name="body"]').fill('Contrôle automatique navigateur : contact et rapport fictifs.');
  for(const checkbox of await form.locator('[name="completedStep"]').all())await checkbox.check();
  await context.setOffline(true);const failed=player.waitForEvent('requestfailed',r=>r.url().endsWith('/api/command'));await form.getByRole('button').click();await failed;await expect(form.getByRole('button')).toBeEnabled();
  await context.setOffline(false);await clickCommand(player,'[data-form="contractProof"] button','prepareContractProof');
  await expect(player.locator('#dialog')).toBeVisible();await clickCommand(player,'[data-command="submitContractProof"] button','submitContractProof');
  await navigate(owner,`contract-admin/${scenario.sessionId}/${scenario.contractId}`,'sessionContract');
  await owner.locator('[data-form="contractReview"] [name="reason"]').fill('Preuve fictive examinée dans le contrôle navigateur.');
  await clickCommand(owner,'[data-form="contractReview"] button','prepareContractReview');await expect(owner.locator('#dialog')).toContainText('Aucun versement immédiat');
  await clickCommand(owner,'[data-command="reviewContract"] button','reviewContract');
  const reviewed=await navigate(owner,`contract-admin/${scenario.sessionId}/${scenario.contractId}`,'sessionContract'),review=(await reviewed.json()).result;
  expect(review.contract.status).toBe('REVIEWED');expect(review.settlement.contestRemainingMs).toBeGreaterThan(0);expect(review.canSettle).toBe(false);
  const wallet=await navigate(player,`wallet/${scenario.sessionId}`,'myWallet'),account=(await wallet.json()).result.account;expect(account.balance).toBe(0);expect(account.protectedCredits).toBe(50);
  await navigate(owner,`session/${scenario.sessionId}`,'spaceOutlawsEntry');owner.once('dialog',dialog=>dialog.accept());await clickCommand(owner,'[data-action="soStage"][data-stage="PAUSE"]','setStage');
  const first=await navigate(owner,`contract-admin/${scenario.sessionId}/${scenario.contractId}`,'sessionContract'),a=(await first.json()).result;
  const second=await navigate(owner,`contract-admin/${scenario.sessionId}/${scenario.contractId}`,'sessionContract'),b=(await second.json()).result;
  expect(a.settlement.contestRemainingMs).toBeGreaterThan(0);expect(b.settlement.contestRemainingMs).toBe(a.settlement.contestRemainingMs);
  await capture(owner,info,'preuve-validee-fonds-conserves');
});
