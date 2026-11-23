// Fixed celestial coordinates keep the view consistent for both crews.
import {relative} from './duel-model.mjs';

const clamp = (x, low = 0, high = 1) => Math.min(high, Math.max(low, x));
const mix = (a, b, weight) => a + (b - a) * weight;
const ease = t => t * t * (3 - 2 * t);

function generator(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function noiseField(random) {
  const values = Uint8Array.from({length: 128 * 128}, () => random() * 256);
  const at = (x, y) => values[(y & 127) * 128 + (x & 127)] / 255;
  function noise(x, y) {
    const i = Math.floor(x), j = Math.floor(y);
    const u = ease(x - i), v = ease(y - j);
    return mix(mix(at(i, j), at(i + 1, j), u), mix(at(i, j + 1), at(i + 1, j + 1), u), v);
  }
  return (x, y) => .51 * noise(x, y) + .27 * noise(18 + y * 2.01, 11 - x * 2.01)
    + .14 * noise(x * 4.12, y * 4.12) + .08 * noise(23 + y * 8.31, x * 8.31);
}

function texture(width, height, paint) {
  const image = document.createElement('canvas');
  image.width = width;
  image.height = height;
  const ctx = image.getContext('2d');
  const pixels = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) paint(pixels.data, (y * width + x) * 4, x, y);
  }
  ctx.putImageData(pixels, 0, 0);
  return image;
}

function planetTexture(noise) {
  const size = 384, radius = .464 * size;
  return texture(size, size, (rgba, i, px, py) => {
    const x = (px + .5 - size / 2) / radius, y = (size / 2 - py - .5) / radius;
    const distance = Math.hypot(x, y);
    const limbLight = clamp(-.84 * x + .42 * y);
    if (distance > 1) {
      // The atmosphere thins quickly just outside the sunlit limb.
      rgba[i] = 128; rgba[i + 1] = 210; rgba[i + 2] = 230;
      rgba[i + 3] = 162 * Math.exp((1 - distance) * 95) * limbLight;
      return;
    }
    const z = Math.sqrt(1 - distance * distance);
    const sun = -.84 * x + .42 * y - .34 * z;
    const light = Math.sqrt(clamp(sun));
    const u = Math.atan2(x, z) * 3.2 + 38, v = Math.asin(y) * 4.5 + 32;
    const wind = noise(u * .57, v * .75);
    const relief = noise(u * 1.8 + wind, v * 1.9);
    const land = ease(clamp((relief - .48) * 18));
    const cloud = ease(clamp((noise(u * 2.5 + 6 * wind, v * 4.2 + wind * 5) - .43) * 4.7));
    const ice = clamp((Math.abs(y) - .84) * 5);
    const haze = Math.pow(1 - z, 4) * (.11 + .89 * limbLight);
    const terrain = 65 * relief;
    const albedo = [
      mix(12, 72 + terrain, land),
      mix(53, 89 + terrain, land),
      mix(69, 84 + terrain, land)
    ];
    const air = [118, 206, 232];
    for (let c = 0; c < 3; c++) {
      const surface = mix(mix(albedo[c], 205, ice), 226, cloud);
      rgba[i + c] = mix([4, 10, 15][c] + surface * (.055 + .91 * light), air[c], haze);
    }
    rgba[i + 3] = 255;
  });
}

function dustTexture(noise, shift) {
  return texture(160, 96, (rgba, i, px, py) => {
    const x = (px + .5 - 80) / 80, y = (py + .5 - 48) / 48;
    const edge = clamp(1 - x * x - y * y);
    const cloud = noise(shift + x * 2, 15 + y * 2.9);
    const folds = noise(25 + x * 5 + 4 * cloud, shift + y * 6);
    const density = clamp((cloud * .6 + folds * .4 - .23) * 1.8);
    rgba[i] = 70 + 102 * folds;
    rgba[i + 1] = 102 + 66 * folds;
    rgba[i + 2] = 133 + 40 * folds;
    rgba[i + 3] = 115 * edge * edge * density * density;
  });
}

function direction(lon, lat) {
  return {x: Math.sin(lon) * Math.cos(lat), y: Math.sin(lat), z: Math.cos(lon) * Math.cos(lat)};
}

function galaxyLatitude(lon) {
  return .37 * Math.sin(lon - .85) + .07 * Math.cos(lon * 2 + 1.7);
}

export function initDuelSky() {
  const random = generator(10991), noise = noiseField(random);
  const planet = planetTexture(noise);
  const globe = direction(.48, .24);
  const globeNorth = direction(.48, .242);
  const dust = [4, 14, 24].map(offset => dustTexture(noise, offset));
  const clouds = Array.from({length: 36}, (_, i) => {
    const lon = i * Math.PI / 18, lat = galaxyLatitude(lon);
    return {image: dust[i % dust.length], center: direction(lon, lat),
      east: direction(lon + .003, galaxyLatitude(lon + .003)), size: .34 + random() * .11};
  });
  const colors = ['#566573', '#7a8995', '#b8c2c7', '#cfb99f', '#d2e0eb'];
  const stars = Array.from({length: 2100}, (_, i) => {
    const lon = random() * Math.PI * 2, brightness = random() ** 3;
    const lat = i < 1450 ? Math.asin(2 * random() - 1) : galaxyLatitude(lon) + (random() - random()) * .19;
    return {...direction(lon, lat), tint: colors[Math.floor(brightness * colors.length)],
      radius: .55 + brightness * 1.14, halo: brightness > .987};
  });

  return (ctx, self, project, w, h, focal) => {
    ctx.fillStyle = '#070d17';
    ctx.fillRect(0, 0, w, h);
    const view = {...self, x: 0, y: 0, z: 0};
    // Transform unit vectors once per frame, then rotate the star catalogue by dot products.
    const a = relative(view, {x: 1, y: 0, z: 0}), b = relative(view, {x: 0, y: 1, z: 0});
    const c = relative(view, {x: 0, y: 0, z: 1});
    const local = p => ({x: p.x * a.x + p.y * b.x + p.z * c.x,
      y: p.x * a.y + p.y * b.y + p.z * c.y, z: p.x * a.z + p.y * b.z + p.z * c.z});

    for (const patch of clouds) {
      const p = local(patch.center);
      if (p.z < .25) continue;
      const center = project(p), east = project(local(patch.east));
      if (!center || !east) continue;
      const size = focal * patch.size / p.z;
      if (center[0] < -size || center[0] > w + size || center[1] < -size || center[1] > h + size) continue;
      ctx.save();
      ctx.translate(...center);
      ctx.rotate(Math.atan2(east[1] - center[1], east[0] - center[0]));
      ctx.drawImage(patch.image, -size, -size * .42, size * 2, size * .84);
      ctx.restore();
    }

    for (const star of stars) {
      const p = local(star);
      if (p.z < .05) continue;
      const x = w / 2 + focal * p.x / p.z, y = h / 2 - focal * p.y / p.z;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      ctx.fillStyle = star.tint;
      ctx.fillRect(x, y, star.radius, star.radius);
      if (star.halo) {
        ctx.fillStyle = 'rgba(161,187,209,.16)';
        ctx.fillRect(x - 2, y + .5, 6, 1);
        ctx.fillRect(x + .5, y - 2, 1, 6);
      }
    }

    const p = local(globe);
    if (p.z < .15) return;
    const center = project(p), north = project(local(globeNorth));
    if (!center || !north) return;
    const radius = focal * .19 / p.z;
    if (center[0] + radius < 0 || center[0] - radius > w || center[1] + radius < 0 || center[1] - radius > h) return;
    ctx.save();
    ctx.translate(...center);
    ctx.rotate(Math.atan2(north[1] - center[1], north[0] - center[0]) + Math.PI / 2);
    ctx.drawImage(planet, -radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  };
}
