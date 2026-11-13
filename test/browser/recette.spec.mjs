import {test,expect} from 'playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

// Only deliberate captures are archived; private invitation links must stay out of failure screenshots.
test.use({screenshot:'off'});

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

async function setStage(page,stage){
  await navigate(page,`session/${scenario.sessionId}`,'spaceOutlawsEntry');page.once('dialog',dialog=>dialog.accept());
  return clickCommand(page,`[data-action="soStage"][data-stage="${stage}"]`,'setStage');
}
async function readPage(page,path,action){const response=await navigate(page,path,action);expect(response.status()).toBe(200);return (await response.json()).result;}

test('Navigateur : achat préparé avant STOP refusé, puis devis périmé sans débit',async({browser},info)=>{
  const {page:owner}=await login(browser,'owner'),{page:player}=await login(browser,'player');
  await setStage(owner,'EN_JEU');await navigate(player,`shops/${scenario.sessionId}`,'shops');
  await clickCommand(player,'[data-form="shopPurchase"][data-offer="supply"] button','prepareShopPurchase');
  await clickCommand(owner,'[data-action="soSafetyStopMJ"]','stopSafetyMJ');
  const stopped=apiResponse(player,'buyShopOffer');await player.locator('[data-command="buyShopOffer"] button').click();
  const denied=await stopped;expect(denied.status()).toBe(400);expect((await denied.json()).error).toBe('SO_SAFETY_STOP');
  await expect(player.locator('#dialog [role="alert"]')).toContainText('STOP SÉCURITÉ actif');await capture(player,info,'achat-bloque-stop');
  await navigate(owner,`session/${scenario.sessionId}`,'spaceOutlawsEntry');owner.once('dialog',dialog=>dialog.accept('Danger fictif résolu, contrôle du devis antérieur'));
  await clickCommand(owner,'[data-action="soSafetyResume"]','resumeSafety');
  const stale=apiResponse(player,'buyShopOffer');await player.locator('[data-command="buyShopOffer"] button').click();
  const expired=await stale;expect(expired.status()).toBe(400);expect((await expired.json()).error).toBe('STALE_REVISION');
  await expect(player.locator('#dialog [role="alert"]')).toBeVisible();
  const wallet=await readPage(player,`wallet/${scenario.sessionId}`,'myWallet');expect(wallet.account.balance).toBe(0);expect(wallet.account.protectedCredits).toBe(50);
  const admin=await readPage(owner,`shops-admin/${scenario.sessionId}`,'shopAdmin'),shop=admin.shops.find(s=>s.id==='counter');
  expect(shop.account.balance).toBe(150);expect(shop.account.reserved).toBe(100);expect(shop.offers.find(o=>o.id==='supply').stock).toBe(2);expect(admin.orders).toHaveLength(1);
  await setStage(owner,'PAUSE');
});

test('Navigateur : réponse perdue après achat, réessai et double clic sans second débit ni lot',async({browser},info)=>{
  const {page:owner}=await login(browser,'owner'),{page:buyer}=await login(browser,'other');
  await setStage(owner,'EN_JEU');
  const before=await readPage(buyer,`wallet/${scenario.sessionId}`,'myWallet');expect(before.account.protectedCredits).toBe(200);
  await navigate(buyer,`shops/${scenario.sessionId}`,'shops');
  await clickCommand(buyer,'[data-form="shopPurchase"][data-offer="supply"] button','prepareShopPurchase');
  const attempts=[],pickups=[],serverReceipts=[];let interrupted=0;
  buyer.on('request',request=>{if(!request.url().endsWith('/api/command'))return;const p=request.postDataJSON();if(p.action==='buyShopOffer')attempts.push(p.input.requestId);if(p.action==='confirmShopPickup')pickups.push(p.input.requestId);});
  // Forward the original UI request, then lose its response AFTER the server commits.
  await buyer.route('**/api/command',async route=>{
    if(route.request().postDataJSON()?.action!=='buyShopOffer'||interrupted>=2)return route.fallback();
    const attempt=interrupted++,response=await route.fetch();serverReceipts.push({status:response.status(),body:await response.json()});
    if(attempt===0)return route.abort('failed');
    const body='{"result":';return route.fulfill({response,body,headers:{...response.headers(),'content-type':'application/json','content-length':String(Buffer.byteLength(body))}});
  });
  const failed=buyer.waitForEvent('requestfailed',r=>r.url().endsWith('/api/command')&&r.postDataJSON()?.action==='buyShopOffer');
  const pay=buyer.locator('[data-command="buyShopOffer"] button');await pay.click();await failed;
  const committed=serverReceipts[0];expect(committed.status).toBe(200);expect(committed.body.result.amount).toBe(30);
  await expect(buyer.locator('#dialog [role="alert"]')).toContainText('L’opération peut déjà être enregistrée');await expect(pay).toBeEnabled();await capture(buyer,info,'achat-reponse-perdue');
  const malformed=apiResponse(buyer,'buyShopOffer');await pay.click();expect((await malformed).status()).toBe(200);await expect(pay).toBeEnabled();
  expect(serverReceipts).toHaveLength(2);expect(serverReceipts[1]).toEqual(committed);await expect(buyer.locator('#dialog [role="alert"]')).toContainText('L’opération peut déjà être enregistrée');
  const retried=apiResponse(buyer,'buyShopOffer');await pay.dblclick();const replay=await retried;expect(replay.status()).toBe(200);const receipt=(await replay.json()).result;
  expect(receipt).toEqual(committed.body.result);expect(attempts).toHaveLength(3);expect(new Set(attempts).size).toBe(1);
  let d=await readPage(buyer,`shops/${scenario.sessionId}`,'shops');expect(d.orders).toHaveLength(1);
  const order=d.orders[0];expect(order.id).toBe(receipt.id);expect(order.quantity).toBe(1);expect(order.amount).toBe(30);expect(order.protectedAmount).toBe(30);expect(order.pickupStatus).toBe('WAITING');
  const wallet=await readPage(buyer,`wallet/${scenario.sessionId}`,'myWallet');expect(wallet.account.balance).toBe(0);expect(wallet.account.protectedCredits).toBe(170);
  let admin=await readPage(owner,`shops-admin/${scenario.sessionId}`,'shopAdmin'),shop=admin.shops.find(s=>s.id==='counter');
  expect(shop.account.balance).toBe(180);expect(shop.account.reserved).toBe(100);expect(shop.offers.find(o=>o.id==='supply').stock).toBe(1);expect(admin.orders).toHaveLength(2);
  await clickCommand(owner,`[data-command="offerShopPickup"][data-payload*="${order.id}"] button`,'offerShopPickup');
  await navigate(buyer,`shops/${scenario.sessionId}`,'shops');const pickup=buyer.locator('[data-command="confirmShopPickup"]');
  await pickup.locator('[name="received"]').check();const received=apiResponse(buyer,'confirmShopPickup');await pickup.getByRole('button').dblclick();expect((await received).status()).toBe(200);expect(pickups).toHaveLength(1);
  d=await readPage(buyer,`shops/${scenario.sessionId}`,'shops');expect(d.orders).toHaveLength(1);expect(d.orders[0].pickupStatus).toBe('RECEIVED');
  const bag=await readPage(buyer,`bag/${scenario.sessionId}`,'myInventory'),lots=bag.lots.filter(l=>l.id===order.purchasedLotId);
  expect(lots).toHaveLength(1);expect(lots[0].quantity).toBe(1);expect(lots[0].status).toBe('AVAILABLE');expect(lots[0].transferable).toBe(false);expect(lots[0].resellable).toBe(false);expect(lots[0].pillable).toBe(false);
  await expect(buyer.locator('#app')).toContainText('170 Cr de création protégés');await capture(buyer,info,'achat-recu-une-fois');
  admin=await readPage(owner,`shops-admin/${scenario.sessionId}`,'shopAdmin');expect(admin.shops.find(s=>s.id==='counter').account.balance).toBe(180);
  await info.attach('reprise-achat',{body:Buffer.from(JSON.stringify({scope:'AUTOMATED_CHROMIUM_PURCHASE',faults:['RESPONSE_LOST_AFTER_COMMIT','TRUNCATED_JSON_RECEIPT'],requests:attempts,receiptId:receipt.id,pickupRequests:pickups.length,protectedBefore:200,protectedAfter:170,shopBalance:180,salaryReserved:100,stockRemaining:1,receivedQuantity:1,humanAcceptance:'NOT_EXECUTED'},null,2)),contentType:'application/json'});
  await setStage(owner,'PAUSE');
});

test.describe('Accès privé depuis la régie',()=>{
  test('Navigateur : suspension MJ, confirmation refusée et réouverture sans nouvelle dotation',async({browser},info)=>{
    const {page:manager}=await login(browser,'mj'),{page:player}=await login(browser,'player'),{page:other}=await login(browser,'other');
    await setStage(manager,'EN_JEU');
    const before=await readPage(player,`play/${scenario.sessionId}`,'mySession');
    const wallet=await readPage(player,`wallet/${scenario.sessionId}`,'myWallet'),bag=await readPage(player,`bag/${scenario.sessionId}`,'myInventory');
    const inventory=d=>d.lots.map(l=>({id:l.id,quantity:l.quantity,status:l.status})).sort((a,b)=>a.id.localeCompare(b.id));
    const admin=await readPage(manager,`shops-admin/${scenario.sessionId}`,'shopAdmin');
    await navigate(player,`shops/${scenario.sessionId}`,'shops');await clickCommand(player,'[data-form="shopPurchase"][data-offer="supply"] button','prepareShopPurchase');
    const entry=await readPage(manager,`session/${scenario.sessionId}`,'spaceOutlawsEntry'),participant=entry.registrations.find(r=>r.characterId===before.character.id);
    const access=manager.locator(`[data-player-access="${participant.uid}"]`);
    await expect(access.locator('[data-action="invite"]')).toHaveCount(0);
    manager.once('dialog',dialog=>dialog.accept());await clickCommand(manager,`[data-player-access="${participant.uid}"] [data-action="revoke"]`,'revokeAccess');
    await expect(access.locator('[data-action="invite"]')).toBeVisible();
    const denied=apiResponse(player,'buyShopOffer');await player.locator('[data-command="buyShopOffer"] button').click();
    const refusal=await denied;expect(refusal.status()).toBe(403);expect((await refusal.json()).error).toBe('FORBIDDEN');await expect(player.locator('#dialog [role="alert"]')).toBeVisible();
    await capture(player,info,'confirmation-apres-revocation');
    const blocked=await readPage(player,`contract/${scenario.sessionId}/${scenario.contractId}`,'mySession');expect(blocked.character).toBeNull();expect(blocked.reason).toBe('ACCESS_INACTIVE');
    await expect(player.locator('#app')).not.toContainText('SECRET_RECETTE_BRIEFING');await expect(player.locator('#app')).toContainText('Votre accès privé doit être activé');
    const registry=await readPage(manager,`contracts-admin/${scenario.sessionId}`,'sessionContracts'),contract=registry.contracts.find(c=>c.id===scenario.contractId);
    expect(contract.obligations.alerts).toContain('ACCESS_CHANGED');expect(contract.obligations.salaryReserved).toBe(100);await capture(manager,info,'obligations-acces-suspendu');
    await navigate(manager,`session/${scenario.sessionId}`,'spaceOutlawsEntry');
    await clickCommand(manager,`[data-player-access="${participant.uid}"] [data-action="invite"]`,'issueInvitation');
    const invitation=await manager.locator('#dialog [data-action="copy"]').getAttribute('data-value');
    await manager.locator('#dialog [data-action="close"]').click();
    // Use the generated link without putting its secret in a named navigation step.
    const openInvitation=async page=>{await page.evaluate(href=>{location.hash=new URL(href).hash;},invitation);await expect(page.locator('[data-action="redeem"]')).toBeVisible();};
    await openInvitation(other);const foreign=apiResponse(other,'redeem');await other.locator('[data-action="redeem"]').click();expect((await foreign).status()).toBe(400);
    await openInvitation(player);const staleAuth=apiResponse(player,'redeem');await player.locator('[data-action="redeem"]').click();const oldAuth=await staleAuth;expect((await oldAuth.json()).error).toBe('REAUTH_REQUIRED');
    await player.locator('[data-action="logout"]').click();await expect(player.locator('#recette-status')).toContainText('Aucune identité');
    const signedIn=apiResponse(player,'identity');await player.locator('#recette-login').click();expect((await signedIn).status()).toBe(200);
    await clickCommand(player,'[data-action="redeem"]','redeem');
    const restored=await readPage(player,`play/${scenario.sessionId}`,'mySession');expect(restored.character.id).toBe(before.character.id);expect(restored.actionPoints.available).toBe(before.actionPoints.available);
    expect((await readPage(player,`wallet/${scenario.sessionId}`,'myWallet')).account).toEqual(wallet.account);
    expect(inventory(await readPage(player,`bag/${scenario.sessionId}`,'myInventory'))).toEqual(inventory(bag));
    const after=await readPage(manager,`shops-admin/${scenario.sessionId}`,'shopAdmin');expect(after.orders.map(o=>o.id).sort()).toEqual(admin.orders.map(o=>o.id).sort());
    const balances=d=>d.shops.map(s=>({id:s.id,account:s.account,stock:s.offers.map(o=>o.stock)}));expect(balances(after)).toEqual(balances(admin));
    await openInvitation(player);const reused=apiResponse(player,'redeem');await player.locator('[data-action="redeem"]').click();expect((await (await reused).json()).error).toBe('INVITATION_EXPIRED_OR_USED');
    const oldContract=await navigate(player,`contract/${scenario.sessionId}/${scenario.contractId}`,'contractDetail');expect(oldContract.status()).toBe(403);expect((await oldContract.json()).error).toBe('FORBIDDEN');
    await expect(player.locator('#app')).not.toContainText('SECRET_RECETTE_BRIEFING');
    const retained=await readPage(manager,`contracts-admin/${scenario.sessionId}`,'sessionContracts'),obligations=retained.contracts.find(c=>c.id===scenario.contractId).obligations;
    expect(obligations.alerts).toContain('ACCESS_CHANGED');expect(obligations.salaryReserved).toBe(100);
    await navigate(player,`bag/${scenario.sessionId}`,'myInventory');await expect(player.locator('#app')).toContainText('50 Cr de création protégés');await capture(player,info,'sac-apres-reouverture');
    await info.attach('reouverture-acces',{body:Buffer.from(JSON.stringify({scope:'AUTOMATED_CHROMIUM_ACCESS',sameCharacter:true,sameInventory:true,sameWallet:true,salaryReserved:100,preparedPurchase:'FORBIDDEN',wrongAccount:'REFUSED',oldAuthentication:'REAUTH_REQUIRED',invitationReuse:'INVITATION_EXPIRED_OR_USED',oldContract:'FORBIDDEN',humanAcceptance:'NOT_EXECUTED'},null,2)),contentType:'application/json'});
    await setStage(manager,'PAUSE');
  });
});

test('Cockpit autonome : scènes, pause, effets sans dépense et petit écran',async({page},testInfo)=>{
 const allowed=new Map([['index.html','text/html'],['cockpit.css','text/css'],['cockpit.mjs','text/javascript'],['state.mjs','text/javascript']]);
 const errors=[],unexpected=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url()),name=url.pathname.split('/').pop();
  if(url.origin!=='http://127.0.0.1:4173'||!url.pathname.startsWith('/cockpit/')||!allowed.has(name)){unexpected.push(url.href);return route.abort();}
  await route.fulfill({contentType:allowed.get(name),body:await readFile(`web/cockpit/${name}`)});
 });
 await page.goto('/cockpit/index.html');
 await expect(page.locator('#phase')).toHaveText('À quai');
 await page.locator('#next').click();await expect(page.locator('#phase')).toHaveText('Décollage');
 await page.locator('#pause').click();await expect(page.locator('#next')).toBeDisabled();await expect(page.locator('#pause-overlay')).toBeVisible();
 await page.locator('#pause').click();
 for(let i=0;i<4;i++)await page.locator('#next').click();
 await expect(page.locator('#phase')).toHaveText('Alerte combat');
 await page.locator('#shot').click();await page.locator('#impact').click();
 await expect(page.locator('#hull')).toHaveText('4 / 4');await expect(page.locator('#shield')).toHaveText('2 / 2');await expect(page.locator('#fuel')).toHaveText('8 / 12');
 await page.locator('#motion').click();await expect(page.locator('#motion')).toHaveAttribute('aria-pressed','true');
 await capture(page,testInfo,'cockpit-desktop');
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await capture(page,testInfo,'cockpit-mobile');
 await page.locator('#next').click();await page.locator('#next').click();await expect(page.locator('#phase')).toHaveText('Amarré');
 await page.locator('#reset').click();await expect(page.locator('#phase')).toHaveText('À quai');await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','false');
 expect(errors).toEqual([]);expect(unexpected).toEqual([]);
});

test('Cockpit connecté : pilote, départ serveur, poste révoqué et petit écran',async({page},testInfo)=>{
 const {build}=await import('esbuild');
 const bundle=await build({entryPoints:['web/cockpit/connected.mjs'],bundle:true,write:false,format:'esm',plugins:[{name:'isolated-cockpit-auth',setup(b){
  b.onResolve({filter:/firebase-client\.mjs$/},()=>({path:'client',namespace:'fake-auth'}));
  b.onResolve({filter:/^firebase\/auth$/},()=>({path:'auth',namespace:'fake-auth'}));
  b.onLoad({filter:/.*/,namespace:'fake-auth'},({path})=>({contents:path==='client'?"export default {currentUser:{getIdToken:async()=> 'isolated-test-token'}};":"export class GoogleAuthProvider{};export const browserSessionPersistence={};export const setPersistence=async()=>{};export const signInWithPopup=async()=>{};export const signOut=async()=>{};export const onAuthStateChanged=(auth,fn)=>queueMicrotask(()=>fn(auth.currentUser));",loader:'js'}));
 }}]});
 const html=(await readFile('web/cockpit/index.html','utf8')).replace('<body>','<body data-connected="true">').replace('src="./cockpit.mjs"','src="./connected.js"');
 const calls=[],errors=[];let revoked=false,departed=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
 const projection=()=>({session:{id:'test-session',stage:'EN_JEU',stopped:false},stationId:'cockpit-1',pilotName:'Pilote test',canAct:true,confirmation:departed?'flight-proof':'ready-proof',ship:{shipId:'ship',name:'Vaisseau connecté',portId:'home',profile:{label:'Cargo',hullMax:4,shieldMax:2},hull:4,shield:2,fuel:departed?2:4,tankCapacity:12,operation:departed?null:{kind:'PREPARE',remainingSeconds:0},journey:departed?{fromPort:'home',toPort:'away',departedAt:Date.now()-10000,remainingSeconds:300,suspended:false,event:{label:'Route libre'}}:null}});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/api/command'){
   const req=route.request().postDataJSON();calls.push(req);
   if(revoked)return route.fulfill({status:403,json:{error:'COCKPIT_UNAVAILABLE'}});
   if(req.action==='cockpitStation')return route.fulfill({json:{result:projection()}});
   expect(req.action).toBe('cockpitCommand');expect(req.input.command).toBe('finishSoPreparation');expect(req.input.stationId).toBe('cockpit-1');expect(req.input.payload.present).toBe(true);departed=true;return route.fulfill({json:{result:{status:'DEPARTED'}}});
  }
  if(u.pathname==='/cockpit/live.html')return route.fulfill({contentType:'text/html',body:html});
  if(u.pathname==='/cockpit/connected.js')return route.fulfill({contentType:'text/javascript',body:bundle.outputFiles[0].text});
  if(u.pathname==='/cockpit/cockpit.css')return route.fulfill({contentType:'text/css',body:await readFile('web/cockpit/cockpit.css')});
  return route.abort();
 });
 await page.goto('/cockpit/live.html?session=test-session&station=cockpit-1');
 await expect(page.locator('h1')).toHaveText('Vaisseau connecté');await expect(page.locator('#next')).toHaveText('Décoller');
 await expect(page.locator('.director')).toBeHidden();await expect(page.locator('#reset')).toBeHidden();await expect(page.locator('#fuel')).toHaveText('4 / 12');
 await page.locator('#next').click();await expect(page.locator('#fuel')).toHaveText('2 / 12');await expect(page.locator('#next')).toBeDisabled();
 expect(calls.filter(x=>x.action==='cockpitCommand')).toHaveLength(1);await capture(page,testInfo,'cockpit-connecte');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 revoked=true;await expect(page.locator('main')).toBeHidden();await expect(page.locator('#connection-status')).toContainText('plus disponibles');expect(errors).toEqual([]);
});

test('Navigateur : messagerie de groupe, brouillon conservé, envoi et révocation',async({browser},info)=>{
 const {page}=await login(browser,'player'),messages=[],calls=[];let denied=false;
 await page.route('**/api/command',async route=>{
  const req=route.request().postDataJSON();
  if(!['myGroup','groupMessages','sendGroupMessage'].includes(req.action))return route.fallback();
  calls.push(req);
  if(denied)return route.fulfill({status:403,json:{error:'FORBIDDEN'}});
  if(req.action==='myGroup')return route.fulfill({json:{result:{session:{id:scenario.sessionId,stage:'EN_JEU',spaceOutlaws:{groupsVersion:1}},characterName:'Pilote test',group:{id:'chat-test',name:'Équipage test',visibility:'SECRET',description:'',permissions:{}}}}});
  if(req.action==='sendGroupMessage'){messages.push({id:'sent',at:2000,authorName:'Pilote test',body:req.input.body});return route.fulfill({json:{result:{id:'sent'}}});}
  return route.fulfill({json:{result:{canSend:true,characterName:'Pilote test',messages}}});
 });
 await navigate(page,`group/${scenario.sessionId}/chat-test`,'groupMessages');
 const form=page.locator('[data-form="groupMessage"]'),body=form.locator('textarea');await expect(form).toBeVisible();await body.fill('Mon brouillon');
 messages.push({id:'remote',at:1000,authorName:'Mécano',body:'<img src=x onerror=alert(1)> Message reçu'});
 await expect(page.getByRole('log')).toContainText('Message reçu');await expect(page.getByRole('log').locator('img')).toHaveCount(0);await expect(body).toHaveValue('Mon brouillon');
 await clickCommand(page,'[data-form="groupMessage"] button','sendGroupMessage');await expect(page.getByRole('log')).toContainText('Mon brouillon');await expect(body).toHaveValue('');expect(calls.filter(r=>r.action==='sendGroupMessage')).toHaveLength(1);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await capture(page,info,'messagerie-groupe-mobile');
 denied=true;await expect(page.locator('[data-group-chat]')).toContainText('Impossible de vérifier');await expect(page.getByRole('log')).toHaveCount(0);await expect(form).toHaveCount(0);
});

test('Navigateur : Sabacc autonome, deux comptes, cartes privées et régie mobile',async({browser},info)=>{
  test.setTimeout(150000);
  const gm=await login(browser,'owner'),one=await login(browser,'player'),two=await login(browser,'other');
  async function token(page){const wait=apiResponse(page,'identity');await page.reload();return (await wait).request().headers().authorization;}
  const tokens=await Promise.all([gm,one,two].map(x=>token(x.page)));
  async function command(page,authorization,action,input={}){return page.evaluate(async({authorization,action,input})=>{const r=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json',authorization},body:JSON.stringify({action,input:{requestId:crypto.randomUUID(),...input}})});const b=await r.json();if(!r.ok)throw Error(b.error);return b.result;},{authorization,action,input});}
  await gm.page.goto('/sabacc/');await gm.page.getByRole('button',{name:'Régie MJ'}).click();await gm.page.getByText('Activation, MJ et modèles',{exact:true}).click();
  await gm.page.locator('[data-form="settings"] [name="enabled"]').selectOption('true');await clickCommand(gm.page,'[data-form="settings"] button','sabaccSettings');
  await gm.page.getByText('Créer une table',{exact:true}).click();const form=gm.page.locator('[data-form="create"]');await form.locator('[name="name"]').fill('Cantina navigateur');await form.locator('[name="location"]').fill('Salon test');
  const created=await clickCommand(gm.page,'[data-form="create"] button','sabaccCreate');await expect(gm.page.locator('[data-status="OPEN"]')).toBeVisible();await clickCommand(gm.page,'[data-status="OPEN"]','sabaccStatus');
  const url=`/sabacc/?table=${created.tableId}&key=${created.qrToken}`;
  for(const [i,p]of [[1,one],[2,two]]){await command(p.page,tokens[i],'sabaccProfile',{name:i===1?'Alpha Sabacc':'Bravo Sabacc'});await p.page.goto(url);await expect(p.page.locator(`[data-seat="${i-1}"]`)).toBeVisible();await clickCommand(p.page,`[data-seat="${i-1}"]`,'sabaccJoin');}
  let state=await command(gm.page,tokens[0],'sabaccHome');const t=state.tables.find(t=>t.id===created.tableId);for(const s of t.seats){const d=await command(gm.page,tokens[0],'sabaccTable',{tableId:t.id,qrToken:t.qrToken});await command(gm.page,tokens[0],'sabaccGrant',{tableId:t.id,revision:d.table.revision,playerId:s.playerId,amount:500,reason:'Recette navigateur'});}
  await expect(one.page.locator('[data-ready="true"]')).toBeEnabled();await clickCommand(one.page,'[data-ready="true"]','sabaccReady');await expect(two.page.locator('.seat').nth(0)).toContainText('Prêt');await expect(two.page.locator('[data-ready="true"]')).toBeEnabled();await clickCommand(two.page,'[data-ready="true"]','sabaccReady');
  for(const p of [one,two]){await p.page.getByRole('button',{name:'Ma main',exact:true}).click();await expect(p.page.locator('#content > .cards .card')).toHaveCount(2);}
  const d1=await command(one.page,tokens[1],'sabaccTable',{tableId:t.id,qrToken:t.qrToken}),d2=await command(two.page,tokens[2],'sabaccTable',{tableId:t.id,qrToken:t.qrToken}),director=await command(gm.page,tokens[0],'sabaccTable',{tableId:t.id,qrToken:t.qrToken});expect(director.cards).toEqual([]);expect(d1.cards.map(c=>c.id).some(id=>d2.cards.some(c=>c.id===id))).toBe(false);expect(JSON.stringify(d1)).not.toContain('"deck"');
  const active=d1.canAct?one:two;await active.page.locator('[data-card]').first().click();await active.page.getByRole('button',{name:'Règles',exact:true}).click();await expect(active.page.getByRole('heading',{name:'Classement des mains'})).toBeVisible();await active.page.getByRole('button',{name:'Ma main',exact:true}).click();await expect(active.page.locator('[data-card][aria-pressed="true"]')).toHaveCount(1);await clickCommand(active.page,'[data-move="GAIN"]','sabaccPlay');await expect(active.page.locator('#content > .cards .card')).toHaveCount(3);
  expect(await active.page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--gold').trim())).toBe('#e4b568');await active.page.setViewportSize({width:390,height:844});await capture(active.page,info,'sabacc-main-mobile-fictive');expect.soft(await active.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await gm.page.reload();await gm.page.getByRole('button',{name:'Régie MJ'}).click();await clickCommand(gm.page,'[data-status="PAUSED"]','sabaccStatus');await gm.page.locator(`[data-qr="${t.id}"]`).click();await expect(gm.page.locator('#qr-image')).toBeVisible();await capture(gm.page,info,'sabacc-regie-qr-fictif');await gm.page.locator('#close-qr').click();await gm.page.setViewportSize({width:390,height:844});await capture(gm.page,info,'sabacc-regie-mobile-fictive');expect.soft(await gm.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await one.context.setOffline(true);await one.page.getByRole('button',{name:'Règles',exact:true}).click();await expect(one.page.getByRole('heading',{name:'Les règles du Sabacc'})).toBeVisible();await one.context.setOffline(false);
  gm.page.once('dialog',dialog=>dialog.accept());await gm.page.locator('[data-form="emergency"] [name="reason"]').fill('Fin de recette');await clickCommand(gm.page,'[data-form="emergency"] [value="cancel"]','sabaccCancel');
  const refunded=await command(one.page,tokens[1],'sabaccTable',{tableId:t.id,qrToken:t.qrToken});expect(refunded.self.balance).toBe(500);expect(refunded.hand.phase).toBe('CANCELLED');
  gm.page.once('dialog',dialog=>dialog.accept());await clickCommand(gm.page,'[data-rotate]','sabaccRotateQR');await one.page.getByRole('button',{name:'Table',exact:true}).click();await expect(one.page.locator('[data-return]')).toBeVisible();await one.page.locator('[data-return]').click();await expect(one.page.getByRole('heading',{name:'Cantina navigateur',exact:true})).toBeVisible();
});

test('Dashboard orga : trois espaces, recherche, droits et Sabacc sur mobile',async({browser},info)=>{
 const {page}=await login(browser,'owner');
 await navigate(page,`session/${scenario.sessionId}/animate`,'spaceOutlawsEntry');
 await expect(page.locator('.org-tabs [aria-current="page"]')).toHaveText('Animer');
 await expect(page.locator('.org-main h1')).toHaveText('Animer');
 await expect(page.locator('[data-org-section="prepare"]:visible')).toHaveCount(0);
 await page.locator('[data-org-character]').fill('AUCUN_PERSONNAGE_123');
 await expect(page.locator('[data-org-no-match]')).toBeVisible();
 await page.locator('[data-org-character]').fill('');
 await expect(page.locator('[data-org-name]').first()).toBeVisible();
 await page.locator('[data-org-name] button[data-action="preview"]').first().click();
 await expect(page.locator('#dialog')).toBeVisible();await page.keyboard.press('Escape');
 await capture(page,info,'organisateur-animer-desktop');
 await page.getByRole('navigation',{name:'Organisation de la session'}).getByRole('link',{name:'Préparer',exact:true}).click();
 await expect(page.locator('.org-main h1')).toHaveText('Préparer');
 await expect(page.getByRole('heading',{name:'Joueurs approuvés',exact:true})).toBeVisible();
 await page.locator('[data-org-tool]').fill('sabacc');
 await expect(page.locator('.org-sidebar a[href="/sabacc/?view=admin"]')).toBeVisible();
 await page.locator('[data-org-tool]').fill('');
 await page.getByRole('navigation',{name:'Organisation de la session'}).getByRole('link',{name:'Superviser',exact:true}).click();
 await expect(page.locator('.org-main h1')).toHaveText('Superviser');
 await expect(page.getByRole('heading',{name:'Journal des dernières opérations',exact:true})).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 await capture(page,info,'organisateur-superviser-mobile');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('[data-org-tool]').fill('sabacc');await page.locator('.org-sidebar a[href="/sabacc/?view=admin"]').click();
 await expect(page.locator('#tabs [data-tab="admin"]')).toHaveAttribute('aria-current','page');
 await expect(page.locator('#content')).toContainText('Régie');
 for(const role of ['mj','reception']){
  const other=await login(browser,role);await navigate(other.page,`session/${scenario.sessionId}/animate`,'session');
  await expect(other.page.locator('.org-shell')).toBeVisible();
  await expect(other.page.locator('.org-sidebar a[href="/sabacc/?view=admin"]')).toHaveCount(0);
  if(role==='reception'){
   await expect(other.page.locator('[data-org-character]')).toHaveCount(0);
   await expect(other.page.locator('#app')).not.toContainText('SECRET_RECETTE');
   await expect(other.page.locator('[data-action="setStage"]')).toHaveCount(0);
  }
 }
});

test('Dashboard orga : accès missions et spatioport, pause et reprise sans changer de contexte',async({browser},info)=>{
 const {page}=await login(browser,'owner');
 await navigate(page,`session/${scenario.sessionId}/animate`,'spaceOutlawsEntry');
 const initial=await page.locator('.org-context-meta').innerText();
 const first=initial.includes('En pause')?'EN_JEU':'PAUSE',second=first==='PAUSE'?'EN_JEU':'PAUSE';
 page.once('dialog',d=>d.accept());await clickCommand(page,`[data-action="soStage"][data-stage="${first}"]`,'setStage');
 await expect(page.locator(`[data-action="soStage"][data-stage="${second}"]`)).toBeVisible();
 page.once('dialog',d=>d.accept());await clickCommand(page,`[data-action="soStage"][data-stage="${second}"]`,'setStage');
 await expect(page.locator('.org-context-meta')).toHaveText(initial);
 await page.locator('.org-sidebar').getByRole('link',{name:'Contrats et arbitrages',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Régie des missions',exact:true})).toBeVisible();
 await expect(page.locator('.org-context')).toBeVisible();
 await page.locator('[data-org-tool]').fill('cockpit');
 await page.locator('.org-sidebar').getByRole('link',{name:'Décollages et cockpits',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Régie du spatioport',exact:true})).toBeVisible();
 await capture(page,info,'organisateur-spatioport-navigation');
 await page.locator('.org-context').getByRole('link',{name:'Changer de session',exact:true}).click();
 await expect(page.locator('.org-shell')).toHaveCount(0);
});
