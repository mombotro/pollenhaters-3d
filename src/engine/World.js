const _tags = new Map();
const _entityTags = new Map();
const _timers = [];
const _systems = new Map();

const World = {
  add(entity, ...tags) {
    if (!_entityTags.has(entity)) _entityTags.set(entity, new Set());
    for (const tag of tags) {
      if (!_tags.has(tag)) _tags.set(tag, new Set());
      _tags.get(tag).add(entity);
      _entityTags.get(entity).add(tag);
    }
  },

  remove(entity) {
    const tags = _entityTags.get(entity);
    if (!tags) return;
    for (const tag of tags) _tags.get(tag)?.delete(entity);
    _entityTags.delete(entity);
  },

  getByTag(tag) {
    return _tags.has(tag) ? [..._tags.get(tag)] : [];
  },

  query(tag, x, y, radius) {
    const r2 = radius * radius;
    return World.getByTag(tag).filter(e => {
      if (!e.active) return false;
      const dx = e.x - x, dy = e.y - y;
      return dx * dx + dy * dy <= r2;
    });
  },

  after(ms, fn) {
    _timers.push({ remaining: ms, fn });
  },

  update(dt) {
    for (let i = _timers.length - 1; i >= 0; i--) {
      _timers[i].remaining -= dt;
      if (_timers[i].remaining <= 0) {
        _timers[i].fn();
        _timers.splice(i, 1);
      }
    }
  },

  addSystem(name, instance) { _systems.set(name, instance); },
  getSystem(name) { return _systems.get(name); },

  clear() {
    _tags.clear();
    _entityTags.clear();
    _timers.length = 0;
    _systems.clear();
  },
};

export default World;
