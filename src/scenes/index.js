let _current = null;

export function transition(SceneClass, data = {}) {
  _current?.destroy?.();
  _current = new SceneClass(data);
  _current.create();
}

export function update(dt, time) {
  _current?.update?.(dt, time);
}

export function getCurrent() { return _current; }
