const _keys = new Set();
const _justDown = new Set();
const _justUp = new Set();

const _gp = {
  _prevButtons: [],
  axis(index) {
    const pad = navigator.getGamepads?.()[0];
    if (!pad) return 0;
    const axes = [pad.axes[0], pad.axes[1], pad.axes[2], pad.axes[3]];
    const v = axes[index] ?? 0;
    return Math.abs(v) > 0.15 ? v : 0;
  },
  isDown(button) {
    const pad = navigator.getGamepads?.()[0];
    return pad?.buttons[button]?.pressed ?? false;
  },
  justDown(button) {
    const pad = navigator.getGamepads?.()[0];
    const now = pad?.buttons[button]?.pressed ?? false;
    const was = _gp._prevButtons[button] ?? false;
    return now && !was;
  },
  _poll() {
    const pad = navigator.getGamepads?.()[0];
    _gp._prevButtons = pad ? pad.buttons.map(b => b.pressed) : [];
  },
};

const Input = {
  isDown(key) { return _keys.has(key); },
  justDown(key) { return _justDown.has(key); },
  justUp(key) { return _justUp.has(key); },
  gamepad: _gp,

  poll() {
    _justDown.clear();
    _justUp.clear();
    _gp._poll();
  },

  init() {
    window.addEventListener('keydown', e => {
      if (!_keys.has(e.key)) _justDown.add(e.key);
      _keys.add(e.key);
    });
    window.addEventListener('keyup', e => {
      _keys.delete(e.key);
      _justUp.add(e.key);
    });
    window.addEventListener('blur', () => _keys.clear());
  },
};

export default Input;
