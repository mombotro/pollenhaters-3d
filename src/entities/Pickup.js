import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { randInt } from '../utils/math.js';
import { PICKUP, XP } from '../constants.js';
import SoundSynth from '../systems/SoundSynth.js';

export default class Pickup extends Entity {
  constructor(x, y, type = 'xp') {
    super(x, y, 'pickup');
    this.spriteScale = 0.5;
    this.type = type;
    this.spriteFrame = { xp: 0, honey: 1, health: 2 }[type] ?? 0;
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 60;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.drag = 0.04;
    this.maxSpeed = 100;
    World.add(this, 'pickup');
  }

  onCollect(player) {
    if (!this.active) return false;
    const resources = World.getSystem('resources');
    if (this.type === 'health') {
      if (player.hp >= player.maxHp) return false;
      player.hp = Math.min(player.maxHp, player.hp + PICKUP.HEAL_AMOUNT);
      SoundSynth.play('health');
      player.setTint(0x00ff00);
      World.after(150, () => { if (player.active) player.clearTint(); });
    } else if (this.type === 'xp') {
      SoundSynth.play('xp');
      World.getSystem('game')?.collectXp(XP.WASP_KILL);
    } else if (this.type === 'honey') {
      SoundSynth.play('pickup');
      resources?.addHoney(PICKUP.HONEY_AMOUNT);
    }
    this.destroy();
    return true;
  }
}
