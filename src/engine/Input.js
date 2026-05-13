const _keys = new Set();
const _justDown = new Set();
const _justUp = new Set();
const _mouseDown = new Set();
const _mouseJustDown = new Set();
let _mouseClientX = 0;
let _mouseClientY = 0;

const _gp = {
  _prevButtons: [],
  axis(index) {
    const pad = navigator.getGamepads?.()[0];
    if (!pad || !pad.axes) return 0;
    const v = pad.axes[index] ?? 0;
    return Math.abs(v) > 0.15 ? v : 0;
  },
  isDown(button) {
    const pad = navigator.getGamepads?.()[0];
    if (!pad || !pad.buttons) return false;
    return pad.buttons[button]?.pressed ?? false;
  },
  justDown(button) {
    const pad = navigator.getGamepads?.()[0];
    if (!pad || !pad.buttons) return false;
    const now = pad.buttons[button]?.pressed ?? false;
    const was = _gp._prevButtons[button] ?? false;
    return now && !was;
  },
  _poll() {
    const pad = navigator.getGamepads?.()[0];
    if (!pad || !pad.buttons) {
      _gp._prevButtons = [];
      return;
    }
    const arr = [];
    for (let i = 0; i < pad.buttons.length; i++) {
      arr.push(pad.buttons[i].pressed);
    }
    _gp._prevButtons = arr;
  },
};

const Input = {
  isDown(key) { return _keys.has(key); },
  justDown(key) { return _justDown.has(key); },
  justUp(key) { return _justUp.has(key); },
  mouseDown(btn) { return _mouseDown.has(btn); },
  mouseJustDown(btn) { return _mouseJustDown.has(btn); },
  mouseClientX() { return _mouseClientX; },
  mouseClientY() { return _mouseClientY; },
  gamepad: _gp,

  poll() {
    _justDown.clear();
    _justUp.clear();
    _mouseJustDown.clear();
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
    window.addEventListener('mousedown', e => {
      if (!_mouseDown.has(e.button)) _mouseJustDown.add(e.button);
      _mouseDown.add(e.button);
    });
    window.addEventListener('mouseup', e => _mouseDown.delete(e.button));
    window.addEventListener('mousemove', e => { _mouseClientX = e.clientX; _mouseClientY = e.clientY; });
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('blur', () => { _keys.clear(); _mouseDown.clear(); });
  },
};

export default Input;
