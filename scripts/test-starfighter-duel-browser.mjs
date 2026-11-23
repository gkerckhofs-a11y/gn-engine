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
  await pilot.keyboard.up('Space');
  assert.equal(await pilot.locator('[data-shield-ring][data-active="true"]').count(), 3);

  // Draw off-screen with the production renderer so moving stars and target markers cannot pass these checks.
  const metrics = await pilot.evaluate(async () => {
    const {drawDuelShip, drawDuelLasers} = await import('./duel-visuals.mjs');
    const {duel} = await import('./duel-model.mjs');
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
    return {front:ship({}), side:ship({yaw: Math.PI/2}), hidden:ship({z:self.z - 140}),
      bolt:laser({}), hiddenBolt:laser({z:self.z - 140})};
  });
  assert.ok(metrics.front.visible > 20 && metrics.side.visible > 20, 'Silhouette lisible de face et de flanc');
  assert.notEqual(metrics.front.hash, metrics.side.hash, 'La silhouette suit le cap');
  assert.equal(metrics.hidden.visible, 0, 'Vaisseau derrière la verrière');
  assert.ok(metrics.bolt.orange > 3, 'Laser orange visible dans l’axe du pilote');
  assert.equal(metrics.hiddenBolt.visible, 0, 'Salve entièrement derrière la verrière');
  assert.deepEqual(errors, [], 'Erreurs JavaScript dans les cockpits');
  console.log('Deux cockpits vérifiés. Visio, tir orange, silhouette du vaisseau, jauges après impact et horizon en manœuvre.');
} finally {
  await browser?.close();
  relay.kill();
}
