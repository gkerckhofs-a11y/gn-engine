// The range selects an absolute speed. Keyboard and moving joystick axes take
// over as acceleration inputs, retaining the original flight controls.
export function mountThrottle() {
  const lever = document.getElementById('speed-lever');
  const readout = document.getElementById('target-speed');
  let selected = null;
  let axisAnchor = null;
  let lastAxis = 0;
  let firstActiveFrame = true;
  let inheritAxis = false;
  let lastValue = '';

  function show(value, label) {
    const field = String(Math.round(value));
    if (lever.value !== field) lever.value = field;
    if (lastValue !== field) {
      lever.setAttribute('aria-valuetext', field + ' m/s');
      lever.style.setProperty('--lever', (100 * value / Number(lever.max)) + '%');
      lastValue = field;
    }
    if (readout.value !== label) readout.value = label;
  }

  lever.addEventListener('input', () => {
    selected = lever.valueAsNumber;
    axisAnchor = lastAxis;
    show(selected, selected + ' m/s');
  });

  function reset() {
    selected = null;
    firstActiveFrame = true;
    inheritAxis = false;
    axisAnchor = null;
  }

  function controls(keyboard, axis = 0) {
    lastAxis = axis;
    // A parked physical lever must not cancel the on-screen selection. Capture
    // its initial position also when rejoining a seat already holding a speed.
    if (inheritAxis) {
      axisAnchor = axis;
      inheritAxis = false;
    }
    if (axisAnchor !== null && Math.abs(axis - axisAnchor) >= .08) axisAnchor = null;
    const manual = keyboard || (axisAnchor === null ? axis : 0);
    if (manual) {
      selected = null;
      return {throttle: manual};
    }
    return selected === null ? {throttle: 0} : {throttle: 0, targetSpeed: selected};
  }

  function render(ship, enabled) {
    lever.disabled = !enabled;
    const shipTarget = Number.isFinite(ship.targetSpeed) ? ship.targetSpeed : null;
    if (enabled && firstActiveFrame) {
      inheritAxis = shipTarget !== null;
      firstActiveFrame = false;
    }
    const target = enabled ? selected ?? shipTarget : shipTarget;
    show(target ?? ship.speed, target === null ? 'Manuel' : Math.round(target) + ' m/s');
  }

  return {controls, render, reset};
}
