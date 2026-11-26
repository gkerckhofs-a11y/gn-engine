// Display-only effects. All phases are sampled from the age of the same fatal hit.
export const DESTRUCTION_SECONDS = 2.2;
const tau = Math.PI * 2;
const clamp = x => Math.max(0, Math.min(1, x));
const visible = t => t >= 0 && t < DESTRUCTION_SECONDS;

const fragments = Array.from({length: 32}, (_, i) => {
  const angle = i * 2.39996 + .28 * Math.sin(i * 3);
  const reach = 25 + (i * 41 % 56);
  return {
    dx: Math.cos(angle) * reach,
    dy: Math.sin(angle) * reach * .79,
    spin: ((i % 5) - 2) * 2.1,
    size: 1.1 + (i * 3 % 8) * .29,
    life: 1.22 + (i % 7) * .16
  };
});

function glow(ctx, x, y, radius, stops) {
  const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
  for (const [position, color] of stops) light.addColorStop(position, color);
  ctx.fillStyle = light;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

const flame = [[0,'#fffae5'],[.16,'#ffde87'],[.36,'#ff9742'],[.63,'#e24b103d'],[1,'#d53e0000']];
const smoke = [[0,'#3f393b9e'],[.45,'#4c454371'],[.76,'#4f45402c'],[1,'#332e2900']];

export function drawShipDestruction(ctx, target, project, elapsed) {
  if (!visible(elapsed) || target.z <= .05) return;
  const center = project(target);
  const unit = project({...target, x: target.x + 1});
  if (!center || !unit) return;

  // One model metre in the current view, including the optical sight's magnification.
  const scale = Math.min(32, Math.hypot(unit[0] - center[0], unit[1] - center[1]));
  if (!Number.isFinite(scale) || scale <= 0) return;
  const t = elapsed;
  const fade = clamp((DESTRUCTION_SECONDS - t) / .64);
  ctx.save();
  ctx.translate(center[0], center[1]);
  ctx.scale(scale, scale);

  // Separate plumes roll out of the nacelles and fade behind the shards.
  ctx.globalAlpha = clamp(t * 3) * fade;
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4;
    const reach = (1 - Math.exp(-1.3 * t)) * (i % 3 + 2) * 7;
    const x = Math.cos(a) * reach, y = Math.sin(a) * reach * .8;
    glow(ctx, x, y, 5 + t * (8 + i % 4), smoke);
  }

  ctx.globalCompositeOperation = 'lighter';
  const core = clamp(1 - t / .84);
  ctx.globalAlpha = core * .86;
  if (core > 0) {
    const swell = 1 - Math.exp(-8 * t);
    glow(ctx, 0, 0, 12 + 23 * swell, flame);
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4, r = swell * (6 + i);
      glow(ctx, r * Math.cos(a), r * Math.sin(a), 5 + 6 * swell, flame);
    }
  }

  ctx.globalCompositeOperation = 'source-over';
  const travel = 1 - Math.exp(-1.32 * t);
  for (const f of fragments) {
    const remaining = clamp((f.life - t) / .58);
    if (!remaining) continue;
    const x = f.dx * travel, y = f.dy * travel;
    ctx.globalAlpha = remaining * fade;
    ctx.strokeStyle = t < .55 ? '#ffae49' : '#cc6a3d';
    ctx.lineWidth = .55;
    ctx.beginPath();
    ctx.moveTo(x - f.dx * .08 * (1 - travel), y - f.dy * .08 * (1 - travel));
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(f.dy, f.dx) + f.spin * t);
    ctx.fillStyle = t < .38 ? '#ffdd8f' : t < .9 ? '#ce865a' : '#84776c';
    ctx.beginPath();
    ctx.moveTo(f.size, 0);
    ctx.lineTo(-f.size * .7, -f.size * .42);
    ctx.lineTo(-f.size * .34, f.size * .64);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// Three short, branching fractures grow from the frame. The reticle remains readable.
const fractures = [
  [[0,.22],[.055,.27],[.083,.262],[.114,.324],[.15,.35]],
  [[.055,.27],[.069,.314],[.062,.348]],
  [[.083,.262],[.096,.235],[.121,.224]],
  [[1,.49],[.963,.517],[.933,.511],[.909,.561],[.864,.585]],
  [[.933,.511],[.924,.478],[.893,.46]],
  [[.33,1],[.348,.932],[.339,.897],[.363,.84]],
  [[.348,.932],[.374,.914],[.39,.921]]
];

export function drawCockpitDestruction(ctx, w, h, elapsed) {
  if (!visible(elapsed) || w <= 0 || h <= 0) return;
  const t = elapsed;
  const fade = clamp((DESTRUCTION_SECONDS - t) / .58);
  const onset = clamp((t + .02) / .16);
  ctx.save();
  const radius = Math.hypot(w, h) / 2;
  const vignette = ctx.createRadialGradient(w / 2, h / 2, radius * .21, w / 2, h / 2, radius);
  vignette.addColorStop(0, '#38120200');
  vignette.addColorStop(.64, '#72301e3d');
  vignette.addColorStop(1, '#eb682dce');
  ctx.globalAlpha = onset * fade * (.40 + .60 * Math.exp(-t));
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  const extent = Math.min(1, t * 5);
  ctx.globalAlpha = .8 * fade;
  ctx.strokeStyle = '#d1b3a5';
  ctx.lineWidth = 1;
  for (const points of fractures) {
    const length = extent * (points.length - 1);
    ctx.beginPath();
    ctx.moveTo(points[0][0] * w, points[0][1] * h);
    for (let i = 1; i < points.length && i - 1 < length; i++) {
      const [x0, y0] = points[i - 1], [x, y] = points[i];
      const f = Math.min(1, length - i + 1);
      ctx.lineTo(w * (x0 + (x - x0) * f), h * (y0 + (y - y0) * f));
    }
    ctx.stroke();
  }
  ctx.restore();
}
