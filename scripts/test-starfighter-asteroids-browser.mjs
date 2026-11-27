import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium,expect} from 'playwright/test';

// Exercise the published static modules as built. All responses come from local files.
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
try{
  const page=await browser.newPage({viewport:{width:1080,height:720}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    const asset=url.pathname.match(/^\/cockpit\/([a-z0-9-]+\.(mjs|css|html))$/);
    if(url.origin!=='http://cockpit.test'||!asset)return route.abort();
    const contentType={html:'text/html',css:'text/css',mjs:'text/javascript'}[asset[2]];
    await route.fulfill({contentType,body:await readFile('public/cockpit/'+asset[1])});
  });
  await page.clock.install();
  await page.goto('http://cockpit.test/cockpit/asteroids.html');
  await page.evaluate(()=>{
    window.stick={id:'Joystick de recette',axes:[0,0,0,0],buttons:[]};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[window.stick]});
    Math.random=()=>997.25/0x7fffffff;
  });
  await page.getByRole('button',{name:'Entrer dans le champ'}).click();
  await page.clock.runFor(280);
  const initialHeading=await page.locator('#heading').textContent();
  await page.evaluate(()=>{window.stick.axes=[.68,.56,.27,-.55];});
  await page.clock.runFor(800);
  assert.notEqual(await page.locator('#heading').textContent(),initialHeading);
  assert.ok(parseInt(await page.locator('#speed').textContent(),10)>56);
  assert.ok(await page.locator('#attitude output').evaluateAll(nodes=>nodes.every(n=>parseInt(n.value,10)!==0)));
  await page.evaluate(()=>{window.stick.axes=[0,0,0,0];});
  await page.clock.runFor(14150);
  await expect(page.locator('#notice')).toContainText('sans impact');
  await page.clock.runFor(17200);
  await expect(page.locator('#repairs')).toBeVisible();
  await page.locator('#system').selectOption({label:'Réaligner l’antenne radar'});
  await page.locator('#fix button').click();
  await expect(page.locator('#repair-status')).toContainText('30 s récupérées');
  await page.locator('summary').click();
  await page.getByLabel('Virage').selectOption('4');
  await page.reload();
  await page.locator('summary').click();
  await expect(page.getByLabel('Virage')).toHaveValue('4');
  assert.deepEqual(errors,[]);
  console.log('Joystick analogique, instruments, esquive, collision, réparation et affectation des axes vérifiés.');
}finally{
  await browser.close();
}
