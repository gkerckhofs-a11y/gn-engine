// Avionics displays for the local seat. Shield rings show global charge, with
// no implied hit direction or local damage compartments in the duel model.
const TO_DEGREES = 180 / Math.PI;
const SHIELD_MAX = 3;
const HULL_MAX = 4;
const face = (radians) => ((radians * TO_DEGREES + 180) % 360 + 360) % 360 - 180;
const signed = degrees => {
  const value = Math.round(degrees);
  return (value > 0 ? '+' : '') + value + '°';
};
const style = `
.sf-instrument {
  --phosphor:#8ee4da; --amber:#ffbd75;
  position:relative; isolation:isolate; display:grid; grid-template-rows:auto 1fr auto;
  min-width:0; overflow:hidden; padding:9px 13px 10px;
  color:#bcd8d7; background:radial-gradient(ellipse at 50% 20%,#122b30,#08171d 72%);
  font-family:ui-monospace,SFMono-Regular,Consolas,monospace;
  border:1px solid #334c53; border-radius:4px;
  box-shadow:inset 0 2px 6px #000b,0 1px #ffffff12;
}
.sf-instrument header.sf-legend {
  position:static; display:flex; flex-flow:row nowrap; align-items:center; justify-content:space-between;
  min-height:0; gap:5px; background:none; border:none; padding:0; margin:0;
  color:#b7cecd; letter-spacing:.12em; font:600 0.75rem/1.2 ui-monospace,monospace;
}
.sf-legend i {width:6px; height:6px; border-radius:50%; background:var(--phosphor); box-shadow:0 0 7px #8ee4da66}
.sf-instrument[data-critical="true"] .sf-legend i {background:var(--amber);box-shadow:0 0 7px #ffbd7566}
.sf-instrument .sf-scope {display:block; position:static; width:100%; height:clamp(6.6rem,14vh,10.5rem); margin:0 auto}
.sf-instrument .sf-values {display:flex; align-items:flex-start; justify-content:space-between; gap:6px; padding-top:5px; border-top:1px solid #375258}
.sf-instrument .sf-values > span {display:grid; gap:3px; white-space:nowrap; text-align:left}
.sf-instrument .sf-values > span:last-child {text-align:right}
.sf-instrument .sf-values small {display:block; color:#a3b8ba; letter-spacing:.055em; font:500 .68rem/1.2 ui-monospace,monospace; text-transform:uppercase}
.sf-instrument .sf-values output {font:600 .94rem/1.1 ui-monospace,monospace; color:#bdf8ea; font-variant-numeric:tabular-nums}
.sf-instrument [data-active="false"] {stroke:#30464b}
.sf-instrument [data-shield-ring][data-active="true"] {stroke:#6fdfda}
.sf-instrument [data-hull-segment][data-active="true"] {fill:#8be3c6}
.sf-instrument [data-hull-segment][data-active="false"] {fill:#23383d}
.sf-instrument .sf-values [data-low="true"] {color:var(--amber)}
`;

function attitudeMarkup() {
  const ladder = [];
  for (let degrees = -80; degrees <= 80; degrees += 10) {
    if (!degrees) continue;
    const y = 66 - degrees * 1.65;
    const halfWidth = degrees % 20 === 0 ? 13 : 7;
    ladder.push(`<path d="M${80-halfWidth} ${y}h${halfWidth*2}" ${degrees<0?'stroke-dasharray="3 2"':''}/>`);
  }
  const bankTicks = [-60,-45,-30,-20,-10,0,10,20,30,45,60].map(angle =>
    `<path transform="rotate(${angle} 80 66)" d="M80 11v${angle%30===0?7:4}"/>`
  ).join('');
  return `<header class="sf-legend">HORIZON ARTIFICIEL<i aria-hidden="true"></i></header>
  <svg class="sf-scope" viewBox="0 0 160 131" aria-hidden="true" focusable="false">
    <defs><clipPath id="sf-attitude-window"><circle cx="80" cy="66" r="44"/></clipPath></defs>
    <circle cx="80" cy="66" r="51" fill="#0b141a" stroke="#385058"/>
    <g clip-path="url(#sf-attitude-window)">
      <g data-attitude-bank><g data-attitude-pitch>
        <rect x="-140" y="-180" width="440" height="246" fill="#24434e"/>
        <rect x="-140" y="66" width="440" height="246" fill="#593e32"/>
        <path d="M-65 66h290" stroke="#d7efde" stroke-width="1.7"/>
        <g fill="none" stroke="#b8cbca" stroke-width="1">${ladder.join('')}</g>
      </g></g>
    </g>
    <circle cx="80" cy="66" r="44" fill="none" stroke="#698087" stroke-width="1"/>
    <g fill="none" stroke="#99b7b9" stroke-width="1.4">${bankTicks}</g>
    <path data-bank-pointer d="m80 19-3 5h6z" fill="#f3ae63"/>
    <path d="M53 66h14l4 4 5-4m8 0 5 4 4-4h14" fill="none" stroke="#191d1b" stroke-width="4.3"/>
    <path d="M53 66h14l4 4 5-4m8 0 5 4 4-4h14" fill="none" stroke="#ffc375" stroke-width="2.1"/>
    <circle cx="80" cy="66" r="1.5" fill="#ffdb9a"/>
  </svg>
  <div class="sf-values"><span><small>Tangage</small><output data-pitch-value></output></span>
    <span><small>Roulis</small><output data-bank-value></output></span></div>`;
}

function systemsMarkup() {
  const rings = [0,1,2].map(n =>
    `<ellipse data-shield-ring cx="90" cy="61" rx="${42+6*n}" ry="${41+5*n}" fill="none" stroke-width="${n===0?1.8:1.3}"/>`
  ).join('');
  const hull = Array.from({length:HULL_MAX},(_,i) =>
    `<rect data-hull-segment x="${57+i*17}" y="119" width="14" height="4" rx=".7" stroke-width=".5"/>`
  ).join('');
  return `<header class="sf-legend">ÉTAT DU VAISSEAU<i aria-hidden="true"></i></header>
  <svg class="sf-scope" viewBox="0 0 180 131" aria-hidden="true" focusable="false">
    <g stroke="#456168" stroke-width=".7" fill="none">
      <path d="M14 61h14m124 0h14M90 1v6m0 104v4M17 28v-8h8m138 8v-8h-8M17 95v8h8m138-8v8h-8"/>
    </g>
    ${rings}
    <g stroke-linejoin="round" stroke-width="1.15">
      <path data-hull-outline d="m90 27 5 10 5 24 11 8 7-13 3 2-1 25-16-3-7-4-1 13H84l-1-13-7 4-16 3-1-25 3-2 7 13 11-8 5-24z" fill="#264951" stroke="#a8d7d2"/>
      <g fill="none" stroke="#739e9f">
        <path d="m90 34-5 24 1 11h8l1-11zM85 57h10M83 64l-12 9-9 5m35-14 12 9 9 5M83 75l3-6m11 6-3-6M87 73v12m6-12v12"/>
        <path d="m60 61 2 3 2 12m56-15-2 3-2 12"/>
      </g>
      <path d="m90 41-3.1 13h6.2z" fill="#8bbec5" stroke="none"/>
      <path d="M85 87h10" stroke="#eda66c" stroke-width="2.6"/>
    </g>
    ${hull}
  </svg>
  <div class="sf-values"><span><small>Boucliers</small><output id="shield"></output></span>
    <span><small>Coque</small><output id="hull"></output></span></div>`;
}

export function mountDuelInstruments(attitudeElement, systemsElement) {
  attitudeElement.classList.add('sf-instrument');
  systemsElement.classList.add('sf-instrument');
  attitudeElement.innerHTML = `<style>${style}</style>${attitudeMarkup()}`;
  systemsElement.innerHTML = systemsMarkup();
  const bankGroup = attitudeElement.querySelector('[data-attitude-bank]');
  const pitchGroup = attitudeElement.querySelector('[data-attitude-pitch]');
  const bankPointer = attitudeElement.querySelector('[data-bank-pointer]');
  const bankText = attitudeElement.querySelector('[data-bank-value]');
  const pitchText = attitudeElement.querySelector('[data-pitch-value]');
  const shields = systemsElement.querySelector('#shield');
  const hull = systemsElement.querySelector('#hull');
  const hullShape = systemsElement.querySelector('[data-hull-outline]');
  const rings = systemsElement.querySelectorAll('[data-shield-ring]');
  const hullSegments = systemsElement.querySelectorAll('[data-hull-segment]');
  let lastBank, lastPitch, lastShield, lastHull;

  function update(ship) {
    if (ship.bank !== lastBank) {
      const bank = face(ship.bank);
      // relative() rotates the projected world clockwise for positive bank.
      const rotation = `rotate(${bank.toFixed(2)} 80 66)`;
      bankGroup.setAttribute('transform',rotation);
      bankPointer.setAttribute('transform',rotation);
      bankText.value = signed(bank);
      lastBank = ship.bank;
    }
    if (ship.pitch !== lastPitch) {
      const pitch = ship.pitch * TO_DEGREES;
      pitchGroup.setAttribute('transform',`translate(0 ${(pitch * 1.65).toFixed(2)})`);
      pitchText.value = signed(pitch);
      lastPitch = ship.pitch;
    }
    if (ship.shield !== lastShield || ship.hull !== lastHull) {
      rings.forEach((ring,i) => { ring.dataset.active = String(i < ship.shield); });
      hullSegments.forEach((cell,i) => { cell.dataset.active = String(i < ship.hull); });
      shields.value = ship.shield + ' / ' + SHIELD_MAX;
      hull.value = ship.hull + ' / ' + HULL_MAX;
      hull.dataset.low = String(ship.hull <= 1);
      shields.dataset.low = String(ship.shield === 0);
      systemsElement.dataset.critical = String(ship.shield === 0 || ship.hull <= 1);
      hullShape.setAttribute('stroke',ship.hull === 0 ? '#de8b74' : ship.hull < HULL_MAX ? '#f6bc82' : '#a8d7d2');
      lastShield = ship.shield;
      lastHull = ship.hull;
    }
  }
  return {update};
}
