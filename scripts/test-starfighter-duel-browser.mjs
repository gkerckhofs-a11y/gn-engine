import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const relay = spawn(process.execPath, ['scripts/starfighter-duel.mjs'], {env: {...process.env, PORT: '0'}});
let browser;
try {
  let log = '';
  for await (const chunk of relay.stdout) {
    log += chunk;
    if (log.includes('Cockpit 2')) break;
  }
  const urls = log.match(/http:\/\/localhost:\d+\/#\w+/g);
  assert.equal(urls?.length, 2);
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns',
      '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required']
  });
  const errors = [];
  const pages = await Promise.all(urls.map(async url => {
    const context = await browser.newContext({permissions: ['camera', 'microphone']});
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    return page;
  }));
  const [pilot, target] = pages;
  for (const page of pages) {
    await page.waitForFunction(() => !document.querySelector('#call').disabled);
    assert.equal(await page.locator('[data-shield-ring][data-active="true"]').count(), 3);
    assert.equal(await page.locator('[data-hull-segment][data-active="true"]').count(), 4);
    await page.click('#call');
  }
  for (const page of pages) {
    await page.waitForFunction(() => document.querySelector('#phase').textContent.startsWith('Négociation')
      && document.querySelector('video').videoWidth > 0);
  }
  // The target stays stationary while the other seat selects and brakes to a speed.
  const lever = pilot.locator('#speed-lever');
  const bounds = await lever.boundingBox();
  assert.ok(bounds && bounds.width > 20);
  await lever.click({position:{x:Math.round(bounds.width * .32), y:Math.round(bounds.height / 2)}});
  const selected = Number(await lever.inputValue());
  assert.ok(selected > 10 && selected < 65, 'Consigne intermédiaire choisie à la souris');
  await pilot.waitForFunction(speed => document.querySelector('#speed').value === speed+' m/s'
    && document.querySelector('#target-speed').value === speed+' m/s', selected);
  assert.equal(await target.locator('#speed').textContent(), '0 m/s');
  await lever.press('ArrowRight');
  await pilot.waitForFunction(speed => document.querySelector('#speed').value === speed+' m/s'
    && document.querySelector('#target-speed').value === speed+' m/s', selected+1);
  await lever.press('Home');
  await pilot.waitForFunction(() => document.querySelector('#speed').value === '0 m/s'
    && document.querySelector('#target-speed').value === '0 m/s');

  // Both crews can maneuver while the weapons are locked.
  for (const [key, selector] of [['e', '[data-attitude-bank]'], ['ArrowDown', '[data-attitude-pitch]']]) {
    const initial = await target.locator(selector).getAttribute('transform');
    await target.keyboard.down(key);
    await target.waitForFunction(({selector, initial}) =>
      document.querySelector(selector).getAttribute('transform') !== initial, {selector, initial});
    await target.keyboard.up(key);
  }

  await pilot.click('#break');
  for (const page of pages) {
    await page.waitForFunction(() => document.querySelector('#guns').value === 'ARMÉ' && document.querySelector('video').hidden);
  }

  await pilot.keyboard.down('Space');
  await target.waitForFunction(() => document.querySelector('#shield').value === '2 / 3'
    && document.querySelectorAll('[data-shield-ring][data-active="true"]').length === 2
    && document.querySelectorAll('[data-hull-segment][data-active="true"]').length === 4);
  await target.waitForFunction(() => document.querySelector('#hull').value === '3 / 4'
    && document.querySelectorAll('[data-shield-ring][data-active="true"]').length === 0
    && document.querySelectorAll('[data-hull-segment][data-active="true"]').length === 3);
  for (const page of pages) assert.equal(await page.locator('.viewport').getAttribute('data-destruction'), null);
  const watchDestruction = (page, expected) => page.waitForFunction(value =>
    document.querySelector('.viewport').dataset.destruction === value, expected);
  await Promise.all([watchDestruction(pilot, 'enemy'), watchDestruction(target, 'self')]);
  await pilot.keyboard.up('Space');
  assert.equal(await pilot.locator('[data-shield-ring][data-active="true"]').count(), 3);
  assert.equal(await target.locator('#hull').textContent(), '0 / 4');
  await Promise.all(pages.map(page => watchDestruction(page, 'finished')));
  assert.equal(await pilot.locator('#phase').textContent(), 'Contact neutralisé');
  assert.equal(await target.locator('#phase').textContent(), 'Vaisseau neutralisé');

  // Record every animated state even if the page is already at its final frame when Playwright resumes.
  const recordEffects = () => {
    window.observedEffects = [];
    new MutationObserver(records => {
      for (const record of records) {
        const previous = record.oldValue;
        const current = record.target.getAttribute('data-destruction');
        if (previous !== current) window.observedEffects.push(previous, current);
      }
    }).observe(document, {subtree:true, attributes:true, attributeFilter:['data-destruction'], attributeOldValue:true});
  };
  await target.addInitScript(recordEffects);
  await target.reload();
  await watchDestruction(target, 'finished');
  assert.ok(!(await target.evaluate(() => window.observedEffects.includes('self'))), 'Une reconnexion tardive ne rejoue pas le choc');

  const solo = await browser.newPage();
  solo.on('pageerror', error => errors.push(error.message));
  await solo.addInitScript(recordEffects);
  await solo.goto(new URL('/', urls[0]).href);
  await solo.locator('#speed-lever').press('ArrowRight');
  await solo.waitForFunction(() => document.querySelector('#target-speed').value === '1 m/s'
    && document.querySelector('#speed').value === '1 m/s');
  await solo.locator('#glass').click();
  await solo.keyboard.down('z');
  await solo.waitForFunction(() => document.querySelector('#target-speed').value === 'Manuel'
    && parseInt(document.querySelector('#speed').value,10) > 15);
  await solo.keyboard.up('z');
  await solo.keyboard.down('s');
  await solo.waitForFunction(() => document.querySelector('#speed').value === '0 m/s');
  await solo.keyboard.up('s');
  await solo.locator('#speed-lever').press('End');
  await solo.waitForFunction(() => document.querySelector('#target-speed').value === '120 m/s');
  await solo.click('#peace');
  await solo.waitForFunction(() => document.querySelector('#phase').textContent.startsWith('Accord conclu'));
  assert.equal(await solo.locator('.viewport').getAttribute('data-destruction'), null);
  await solo.click('#restart');
  await solo.waitForFunction(() => document.querySelector('#speed').value === '0 m/s'
    && document.querySelector('#target-speed').value === 'Manuel');
  // Without pilot input the opposing ship shoots straight ahead.
  await solo.click('#break');
  await watchDestruction(solo, 'self');
  await solo.click('#restart');
  await solo.waitForFunction(() => !document.querySelector('.viewport').hasAttribute('data-destruction')
    && document.querySelector('#hull').value === '4 / 4');
  await solo.emulateMedia({reducedMotion:'reduce'});
  await solo.evaluate(() => {window.observedEffects.length = 0;});
  await solo.click('#break');
  await watchDestruction(solo, 'finished');
  assert.equal(await solo.locator('#phase').textContent(), 'Vaisseau neutralisé');
  assert.equal(await solo.evaluate(() => window.observedEffects.includes('self')), false, 'Mouvement réduit respecté');
  await solo.close();

  // Draw off-screen with the production renderer so moving stars and target markers cannot pass these checks.
  const metrics = await pilot.evaluate(async () => {
    const {drawDuelShip, drawDuelLasers} = await import('./duel-visuals.mjs');
    const {duel} = await import('./duel-model.mjs');
    const {drawShipDestruction} = await import('./duel-destruction.mjs');
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 240;
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    const [self, foe] = duel().ships;
    const project = p => p.z > .05 ? [180 + 200 * p.x/p.z, 120 - 200 * p.y/p.z] : null;
    const center = {x: 0, y: 0, z: self.z + 140};
    function measure(draw) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw();
      const {data} = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let visible = 0, orange = 0, hash = 0;
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b, a] = data.subarray(i, i + 4);
        if (a < 24) continue;
        visible++;
        if (r > 140 && r > g * 1.25 && g > b * 1.25) orange++;
        hash = (Math.imul(hash, 31) + i + r + g + b) >>> 0;
      }
      return {visible, orange, hash};
    }
    const ship = pose => measure(() => drawDuelShip(ctx, self, {...foe, ...center, ...pose}, project));
    const bolt = {owner: 0, ...center, velocity: {x: 0, y: 0, z: 1}, life: 2.2};
    const laser = overrides => measure(() => drawDuelLasers(ctx, self, [{...bolt, ...overrides}], 0, project));
    const blast = (z, elapsed) => measure(() => drawShipDestruction(ctx, {x:0, y:0, z}, project, elapsed));
    return {blast:blast(140, .3), lateBlast:blast(140, .9), hiddenBlast:blast(-140, .3), spentBlast:blast(140, 10),
      front:ship({}), side:ship({yaw: Math.PI/2}), hidden:ship({z:self.z - 140}),
      bolt:laser({}), hiddenBolt:laser({z:self.z - 140})};
  });
  assert.ok(metrics.front.visible > 20 && metrics.side.visible > 20, 'Silhouette lisible de face et de flanc');
  assert.notEqual(metrics.front.hash, metrics.side.hash, 'La silhouette suit le cap');
  assert.equal(metrics.hidden.visible, 0, 'Vaisseau derrière la verrière');
  assert.ok(metrics.bolt.orange > 3, 'Laser orange visible dans l’axe du pilote');
  assert.equal(metrics.hiddenBolt.visible, 0, 'Salve entièrement derrière la verrière');
  assert.ok(metrics.blast.visible > 20 && metrics.lateBlast.visible > 0, 'Explosion visible dans la verrière');
  assert.notEqual(metrics.blast.hash, metrics.lateBlast.hash, 'Explosion évolutive');
  assert.equal(metrics.hiddenBlast.visible, 0, 'Impact derrière le pilote');
  assert.equal(metrics.spentBlast.visible, 0, 'Fin des débris');
  assert.deepEqual(errors, [], 'Erreurs JavaScript dans les cockpits');
  console.log('Deux cockpits vérifiés. Visio, tir orange, silhouette du vaisseau, jauges après impact et horizon en manœuvre. Destruction vue des deux sièges, fin stable après reconnexion, mouvement réduit et rejeu solo vérifiés. Consigne souris/clavier, freinage, reprise manuelle Z/S et indépendance des deux sièges vérifiés.');
} finally {
  await browser?.close();
  relay.kill();
}
