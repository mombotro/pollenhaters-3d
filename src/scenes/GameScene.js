import World from '../engine/World.js';
import Camera from '../engine/Camera.js';
import { update as physicsUpdate } from '../engine/Physics.js';
import Input from '../engine/Input.js';
import BuildMenu from '../ui/BuildMenu.js';
import LevelUpMenu from '../ui/LevelUpMenu.js';
import PauseMenu from '../ui/PauseMenu.js';
import {
  WORLD, BEE, HIVE, WASP, WAVE, FLOWER, TIMER, WORKER, TOWER, XP,
  BUTTERFLY, SPIDER, WEB, BREAKABLE, SOLDIER, PICKUP, NECTAR_ATTRACTOR, pickFlowerType,
} from '../constants.js';
import MetaSave from '../systems/MetaSave.js';
import Flower from '../entities/Flower.js';
import Hive from '../entities/Hive.js';
import ResourceManager from '../systems/ResourceManager.js';
import PollinationSystem from '../systems/PollinationSystem.js';
import UpgradeManager from '../systems/UpgradeManager.js';
import PlayerBee from '../entities/PlayerBee.js';
import Stinger from '../entities/Stinger.js';
import WorkerBee from '../entities/WorkerBee.js';
import WaveManager from '../systems/WaveManager.js';
import WaspHiveSystem from '../systems/WaspHiveSystem.js';
import HunterWasp from '../entities/HunterWasp.js';
import RaiderWasp from '../entities/RaiderWasp.js';
import Pickup from '../entities/Pickup.js';
import EnvironmentFeature from '../entities/EnvironmentFeature.js';
import Breakable from '../entities/Breakable.js';
import WindSystem from '../systems/WindSystem.js';
import Butterfly from '../entities/Butterfly.js';
import Spider from '../entities/Spider.js';
import SoldierBee from '../entities/SoldierBee.js';
import GuardPost from '../towers/GuardPost.js';
import ResinTrap from '../towers/ResinTrap.js';
import PoisonHoney from '../towers/PoisonHoney.js';
import NectarAttractor from '../towers/NectarAttractor.js';
import ArcherWasp from '../entities/ArcherWasp.js';
import WebTrap from '../entities/WebTrap.js';
import * as Particles from '../systems/ParticleSystem.js';
import SoundSynth from '../systems/SoundSynth.js';
import { dist, randInt } from '../utils/math.js';

const BOUNDS = { minX: 0, minY: 0, maxX: WORLD.WIDTH, maxY: WORLD.HEIGHT };

export default class GameScene {
  constructor(data = {}) {
    this.hiveX = data.hiveX ?? WORLD.WIDTH / 2;
    this.hiveY = data.hiveY ?? WORLD.HEIGHT / 2;
    this._ended = false;
    this._gameTime = 0;
    this._playTime = 0;
    this.xp = 0;
    this.xpFloor = 0;
    this._xpIncrement = XP.BASE_REQ;
    this.level = 1;
    this.reqXp = XP.BASE_REQ;
    this._playground = data.playground ?? false;
  }

  create() {
    World.clear();

    const meta = MetaSave.load();
    const _u = meta.upgrades ?? {};

    this.resources = new ResourceManager({
      honeyStorage: HIVE.HONEY_STORAGE,
      sapConversionRate: HIVE.SAP_CONVERSION_RATE,
    });
    World.addSystem('resources', this.resources);

    this._runDuration = TIMER.RUN_DURATION
      - (_u.QUICK_RUN_META ?? 0) * 60000
      + (_u.LONG_RUN_META  ?? 0) * 300000;

    this._sapConversionInterval = HIVE.SAP_CONVERSION_INTERVAL;
    this._lastSapConversionAt = 0;
    this._lastBreakableSpawnAt = 0;

    this.waveManager = new WaveManager({
      firstWaveDelay: WAVE.FIRST_WAVE_DELAY,
      waveInterval: WAVE.WAVE_INTERVAL,
      baseCount: WAVE.BASE_COUNT + (_u.HARD_MODE_META ?? 0) * 2,
      countIncrement: WAVE.COUNT_INCREMENT,
    });

    this.wind = new WindSystem();

    this.pollination = new PollinationSystem({
      spawnDelay: FLOWER.SPAWN_DELAY,
      radius: FLOWER.POLLINATION_RADIUS,
      onSpawn: ({ x, y }) => {
        const activeFlowers = World.getByTag('flower').filter(f => f.active).length;
        if (activeFlowers >= FLOWER.MAX_COUNT) return;
        const fx = Math.max(40, Math.min(WORLD.WIDTH - 40, x));
        const fy = Math.max(40, Math.min(WORLD.HEIGHT - 40, y));
        this._spawnFlower(fx, fy);
      },
    });
    World.addSystem('pollination', this.pollination);

    this.upgrades = new UpgradeManager();
    World.addSystem('upgrades', this.upgrades);

    this.waspHiveSystem = new WaspHiveSystem({
      playerHiveX: this.hiveX,
      playerHiveY: this.hiveY,
      extraHives: _u.EXTRA_HIVES_META ?? 0,
      onDestroyed: () => this._endGame(true, true),
    });
    World.addSystem('waspHive', this.waspHiveSystem);

    World.addSystem('fx', { burst: () => {} });
    World.addSystem('game', {
      collectXp: (val) => this._collectXp(val),
      isPlacing: () => !!this._placementKey || !!this._placementJustDone
    });

    this._placementKey = null;

    const _canvas = document.getElementById('game');
    this.pauseMenu = new PauseMenu(_canvas, key => this._onPauseSelect(key));
    this.buildMenu = new BuildMenu(_canvas, this.resources, key => {
      if (key === 'recruit-worker' || key === 'recruit-soldier') {
        const cost = key === 'recruit-worker' ? WORKER.COST : SOLDIER.COST;
        if (this.resources.spendHoney(cost)) {
          if (key === 'recruit-worker') new WorkerBee(this.hiveX, this.hiveY);
          else this._recruitSoldier(true);
          SoundSynth.play('spawn');
        } else {
          SoundSynth.play('hit');
        }
      } else {
        this._enterPlacement(key);
      }
    });
    this.levelUpMenu = new LevelUpMenu(key => {
      this.upgrades.purchase(key);
      this._applyUpgrade(key);
    });
    World.addSystem('buildMenu', {
      toggle: () => {
        if (this._placementKey) this._exitPlacement();
        else this.buildMenu.toggle();
      },
    });

    if (this._playground) this._initPlaygroundMenu();

    this._spawnInitialFlowers();
    this.hive = new Hive(this.hiveX, this.hiveY);

    this.player = new PlayerBee(
      this.hiveX, this.hiveY + 80,
      (x, y, range, damage, speed, backwardAngle, forced = false) => {
        if (!forced) {
          let hasTarget = false;
          for (const w of World.getByTag('wasp')) {
            if (w.active && dist(x, y, w.x, w.y) < range) { hasTarget = true; break; }
          }
          if (!hasTarget) {
            for (const b of World.getByTag('breakable')) {
              if (b.active && dist(x, y, b.x, b.y) < range) { hasTarget = true; break; }
            }
          }
          if (!hasTarget) {
            for (const wh of this.waspHiveSystem.hives) {
              if (wh.hp > 0 && dist(x, y, wh.x, wh.y) < range) { hasTarget = true; break; }
            }
          }
          if (!hasTarget) return false;
        }
        const spawnX = x + Math.cos(backwardAngle) * 14;
        const spawnY = y + Math.sin(backwardAngle) * 14;
        new Stinger(spawnX, spawnY, damage, range, speed,
          spawnX + Math.cos(backwardAngle) * range,
          spawnY + Math.sin(backwardAngle) * range);
        return true;
      },
    );
    World.addSystem('player', this.player);

    this.camera = new Camera({ offset: 0, lerpAngle: 0.12, pitch: Math.PI / 6, fixedAngle: Math.PI * 1.75 });
    World.addSystem('camera', this.camera);

    // Meta upgrades
    this._metaSpeedBonus = (_u.BEE_SPEED_META ?? 0) * 20;
    if (this._metaSpeedBonus) this.player._speed += this._metaSpeedBonus;
    if (_u.BEE_HP_META)       { this.player.maxHp += _u.BEE_HP_META * 2; this.player.hp = this.player.maxHp; }
    if (_u.HIVE_HP_META)      { this.hive.maxHp   += _u.HIVE_HP_META * 5; this.hive.hp  = this.hive.maxHp; }
    if (_u.HIVE_STORAGE_META) this.resources.setHoneyStorage(HIVE.HONEY_STORAGE + _u.HIVE_STORAGE_META * 50);
    if (_u.START_WORKER)      new WorkerBee(this.hiveX, this.hiveY);
    if (_u.START_ARMOR)       this.player.armor = 1;
    if (_u.START_HONEY)       { this.resources.addPendingSap(30); this.resources.convertSap(30); }
    if (_u.START_GUARD)       new GuardPost(this.hiveX + 80, this.hiveY);
    if (_u.START_SOLDIER)     this._recruitSoldier(true);
    this._metaSoldierDmg = _u.SOLDIER_DMG_META ?? 0;

    this._spawnEnvironment();
    this._spawnPassiveEntities();
  }

  update(dt, time) {
    if (this._ended) return;
    this._placementJustDone = false;

    if (Input.justDown('Escape') || Input.gamepad.justDown(9)) {
      if (this.buildMenu?.visible) {
        this.buildMenu.hide();
      } else if (this.levelUpMenu?.visible) {
        // do nothing
      } else if (this._placementKey) {
        this._exitPlacement();
      } else {
        this.pauseMenu.toggle();
      }
    }

    if (this.pauseMenu?.visible) {
      this.pauseMenu.update();
      return;
    }

    if (this.levelUpMenu?.visible) {
      this.levelUpMenu.update();
      return;
    }

    if (this.buildMenu?.visible) {
      this.buildMenu.update();
      return;
    }

    if (this._placementKey) {
      if (Input.justDown('x') || Input.justDown('X') || Input.gamepad.justDown(0) || Input.mouseJustDown(0)) {
        const tooClose = dist(this.player.x, this.player.y, this.hiveX, this.hiveY) < 100;
        if (!tooClose) {
          if (this._placeTower(this._placementKey, this.player.x, this.player.y)) {
            this._exitPlacement();
          } else {
            SoundSynth.play('hit');
            this._exitPlacement();
          }
        }
      } else if (Input.justDown('b') || Input.justDown('B') || Input.gamepad.justDown(1) || Input.mouseJustDown(2)) {
        this._exitPlacement();
      }
    }

    const scaledDelta = dt * 1000;
    this._gameTime += scaledDelta;
    this._playTime += scaledDelta;

    if (!this._playground && this._playTime >= this._runDuration) {
      this._endGame(true);
      return;
    }

    if (this._gameTime - this._lastSapConversionAt >= this._sapConversionInterval) {
      this.resources.convertSap(1);
      this._lastSapConversionAt = this._gameTime;
    }

    if (this._gameTime - this._lastBreakableSpawnAt >= BREAKABLE.SPAWN_DELAY) {
      this._spawnBreakable();
      this._lastBreakableSpawnAt = this._gameTime;
    }

    this.wind.update(this._gameTime);
    const windVec = this.wind.getVector();

    this.pollination.update(this._gameTime);

    for (const f of World.getByTag('flower')) {
      if (f.active) f.update(this._gameTime);
    }

    if (this.player.alive) this.player.update(this._gameTime, dt);

    // Poison honey attraction
    for (const tower of World.getByTag('tower')) {
      if (tower.towerType !== 'poison-honey' || !tower.active) continue;
      for (const wasp of World.getByTag('wasp')) {
        if (!wasp.active || wasp.isRetreating || wasp.poisonCarried) continue;
        const d = dist(wasp.x, wasp.y, tower.x, tower.y);
        if (d < TOWER.POISON_HONEY_RADIUS) {
          wasp._poisonTarget = tower;
        } else if (wasp._poisonTarget === tower) {
          wasp._poisonTarget = null;
        }
        if (d < 40) {
          tower.consume();
          wasp.poisonCarried = true;
          wasp._poisonTarget = null;
          if (typeof wasp.retreat === 'function') wasp.retreat();
        }
      }
    }

    for (const w of World.getByTag('wasp')) {
      if (w.active) w.update(this._gameTime, dt, windVec);
    }

    // Wasps steal dropped honey pickups
    for (const wasp of World.getByTag('wasp')) {
      if (!wasp.active) continue;
      for (const pickup of World.getByTag('pickup')) {
        if (!pickup.active || pickup.type !== 'honey') continue;
        if (dist(wasp.x, wasp.y, pickup.x, pickup.y) < 60) {
          this.waspHiveSystem.onHoneyStolen(PICKUP.HONEY_AMOUNT);
          pickup.destroy();
        }
      }
    }

    for (const w of World.getByTag('worker')) {
      if (w.alive && w.active) w.update(this._gameTime, dt);
    }

    for (const tower of World.getByTag('tower')) {
      if (!tower.active) continue;
      if (tower.towerType === 'resin') tower.update(this._gameTime);
      else if (tower.towerType === 'guard') tower.guard?.update(this._gameTime, dt);
    }

    for (const s of World.getByTag('soldier')) {
      if (s.alive && s.active) s.update(this._gameTime, dt);
    }

    for (const b of World.getByTag('butterfly')) {
      if (b.active) b.update(this._gameTime, dt);
    }

    const spiderAnchors = [
      ...World.getByTag('flower').filter(f => f.active && f.lifecycle !== 'young'),
      ...World.getByTag('breakable').filter(b => b.active),
      ...World.getByTag('environment').filter(e => e.active),
    ];
    for (const s of World.getByTag('spider')) {
      if (s.active) s.update(this._gameTime, dt, spiderAnchors, (f1, f2) => this._placeWeb(f1, f2));
    }

    this._applyWind(windVec);

    const trappableEntities = [
      ...(this.player.alive ? [this.player] : []),
      ...World.getByTag('wasp').filter(w => w.active),
      ...World.getByTag('worker').filter(w => w.active && w.alive),
    ];
    for (const web of World.getByTag('web')) {
      web.update(this._gameTime, trappableEntities);
    }

    // Physics update for all moving entities
    const seen = new Set();
    for (const tag of ['bee', 'wasp', 'stinger', 'gem', 'pickup', 'spider', 'butterfly', 'breakable']) {
      for (const e of World.getByTag(tag)) {
        if (seen.has(e) || !e.active) continue;
        seen.add(e);
        physicsUpdate(e, dt, BOUNDS);
      }
    }

    this.camera.follow(this.player, dt);
    this.buildMenu?.update();

    this._checkPlayerFlowerOverlap();
    this._checkPlayerHiveOverlap();
    this._checkPlayerPickupOverlap();
    this._checkStingerWaspOverlap();
    this._checkStingerBreakableOverlap();
    this._checkEnemyStingerPlayerOverlap();
    this._checkEnemyStingerWorkerOverlap();
    this._checkEnemyStingerSoldierOverlap();
    this._checkStingerWaspHiveOverlap();
    this._checkPlayerWaspHiveOverlap();
    this._checkPlayerBreakableOverlap();
    this._checkPlayerWaspOverlap();
    this._checkWaspHiveOverlap();
    this._checkWorkerHunterCollisions();
    this._checkRaiderTowerCollisions();

    if (!this._playground) {
      const wave = this.waveManager.update(this._playTime);
      if (wave) this.waspHiveSystem.spawnWave(wave);
    } else {
      this._updatePlaygroundMenu();
    }
    this.waspHiveSystem.update(this._gameTime);
    this._updateParticles(dt);

    if (this.hive && this.hive.hp <= 0) this._endGame(false);
  }

  _updateParticles(dt) {
    Particles.update(dt);
    const now = this._gameTime;
    const RATE = 250; // ms between emissions per entity

    // All wasps carrying honey → yellow sparkles
    for (const wasp of World.getByTag('wasp')) {
      if (!wasp.active || !wasp.honeyCarried) continue;
      if (now - (wasp._lastParticle ?? 0) < RATE) continue;
      wasp._lastParticle = now;
      Particles.emit(wasp.x, wasp.y, '#ffd700', 2, 25);
    }

    // Player carrying sap → yellow sparkles
    if (this.player.alive && this.resources.getSapCarried('player') > 0) {
      if (now - (this._playerSapParticle ?? 0) >= RATE) {
        this._playerSapParticle = now;
        Particles.emit(this.player.x, this.player.y, '#ffe066', 2, 20);
      }
    }
  }

  _checkPlayerFlowerOverlap() {
    if (!this.player.alive) return;
    for (const flower of World.getByTag('flower')) {
      if (!flower.active || dist(this.player.x, this.player.y, flower.x, flower.y) > 75) continue;
      const space = this.player._sapCapacity - this.resources.getSapCarried('player');
      if (space > 0 && flower.sapRemaining > 0) {
        if (flower.collectPollen()) this.pollination.pollinate({ x: flower.x, y: flower.y }, this._gameTime);
        const taken = flower.collectSap(space);
        if (taken > 0) {
          const now = this._gameTime;
          if (!flower._lastBurst || now - flower._lastBurst > 400) {
            SoundSynth.play('pickup');
            flower._lastBurst = now;
          }
        }
        this.resources.addSap('player', taken, this.player._sapCapacity);
      } else if (flower.sapRemaining <= 0) {
        if (flower.collectPollen()) this.pollination.pollinate({ x: flower.x, y: flower.y }, this._gameTime);
      }
    }
  }

  _checkPlayerHiveOverlap() {
    if (!this.player.alive || !this.hive?.active) return;
    if (dist(this.player.x, this.player.y, this.hive.x, this.hive.y) > 120) return;
    if (this.resources.getSapCarried('player') > 0) {
      SoundSynth.play('deposit');
      this.resources.depositSap('player');
    }
  }

  _checkPlayerPickupOverlap() {
    if (!this.player.alive) return;
    for (const pickup of World.getByTag('pickup')) {
      if (!pickup.active) continue;
      if (dist(this.player.x, this.player.y, pickup.x, pickup.y) <= 50) pickup.onCollect(this.player);
    }
  }

  _checkStingerWaspOverlap() {
    for (const stinger of World.getByTag('player-stinger')) {
      if (!stinger.active) continue;
      for (const wasp of World.getByTag('wasp')) {
        if (!wasp.active || dist(stinger.x, stinger.y, wasp.x, wasp.y) > 36) continue;
        stinger.destroy();
        SoundSynth.play('hit');
        if (wasp.takeDamage(stinger.damage)) {
          new Pickup(wasp.x, wasp.y, wasp.honeyCarried ? 'honey' : 'xp');
          if (Math.random() < 0.10) new Pickup(wasp.x, wasp.y, 'health');
        }
        break;
      }
    }
  }

  _checkStingerBreakableOverlap() {
    for (const stinger of World.getByTag('player-stinger')) {
      if (!stinger.active) continue;
      for (const b of World.getByTag('breakable')) {
        if (!b.active || dist(stinger.x, stinger.y, b.x, b.y) > 50) continue;
        stinger.destroy();
        b.takeDamage(stinger.damage);
        break;
      }
    }
  }

  _checkEnemyStingerPlayerOverlap() {
    if (!this.player.alive) return;
    for (const stinger of World.getByTag('enemy-stinger')) {
      if (!stinger.active) continue;
      if (dist(stinger.x, stinger.y, this.player.x, this.player.y) <= 36) {
        stinger.destroy();
        if (this.player.takeDamage(stinger.damage)) this._onPlayerDeath();
      }
    }
  }

  _checkEnemyStingerWorkerOverlap() {
    for (const stinger of World.getByTag('enemy-stinger')) {
      if (!stinger.active) continue;
      for (const worker of World.getByTag('worker')) {
        if (!worker.active || !worker.alive || dist(stinger.x, stinger.y, worker.x, worker.y) > 36) continue;
        stinger.destroy();
        worker.takeDamage(stinger.damage);
        break;
      }
    }
  }

  _checkEnemyStingerSoldierOverlap() {
    for (const stinger of World.getByTag('enemy-stinger')) {
      if (!stinger.active) continue;
      for (const soldier of World.getByTag('soldier')) {
        if (!soldier.active || !soldier.alive || dist(stinger.x, stinger.y, soldier.x, soldier.y) > 36) continue;
        stinger.destroy();
        soldier.takeDamage(stinger.damage);
        break;
      }
    }
  }

  _checkStingerWaspHiveOverlap() {
    for (const stinger of World.getByTag('player-stinger')) {
      if (!stinger.active) continue;
      for (const wh of this.waspHiveSystem.hives) {
        if (wh.hp <= 0 || dist(stinger.x, stinger.y, wh.x, wh.y) > 75) continue;
        stinger.destroy();
        this.waspHiveSystem.onHiveAttacked(this._gameTime, wh);
        if (wh.takeDamage(stinger.damage)) this.waspHiveSystem.onHiveDestroyed();
        break;
      }
    }
  }

  _checkPlayerWaspHiveOverlap() {
    if (!this.player.alive || !this.player.isDashing) return;
    const now = this._gameTime;
    for (const wh of this.waspHiveSystem.hives) {
      if (wh.hp <= 0 || now - (wh._lastDashHit || 0) < 500) continue;
      if (dist(this.player.x, this.player.y, wh.x, wh.y) <= 90) {
        wh._lastDashHit = now;
        this.waspHiveSystem.onHiveAttacked(now);
        if (wh.takeDamage(1)) this._endGame(true, true);
      }
    }
  }

  _checkPlayerBreakableOverlap() {
    if (!this.player.alive || !this.player.isDashing) return;
    const now = this._gameTime;
    for (const b of World.getByTag('breakable')) {
      if (!b.active || now - (b._lastDashHit || 0) < 500) continue;
      if (dist(this.player.x, this.player.y, b.x, b.y) <= 70) {
        b._lastDashHit = now;
        b.takeDamage(1);
      }
    }
  }

  _checkPlayerWaspOverlap() {
    if (!this.player.alive) return;
    const now = this._gameTime;
    for (const wasp of World.getByTag('wasp')) {
      if (!wasp.active || dist(this.player.x, this.player.y, wasp.x, wasp.y) > 90) continue;

      if (this.player.isDashing) {
        if (now - (wasp.lastDashedHit || 0) < 500) continue;
        wasp.lastDashedHit = now;
        if (wasp.takeDamage(1)) {
          new Pickup(wasp.x, wasp.y, wasp.honeyCarried ? 'honey' : 'xp');
          if (Math.random() < 0.10) new Pickup(wasp.x, wasp.y, 'health');
        }
        continue;
      }

      if (now - wasp.lastHit < WASP.HIT_COOLDOWN) continue;
      wasp.lastHit = now;
      const sap = this.resources.getSapCarried('player');
      if (sap > 0 && wasp.waspType === 'hunter') {
        this.resources.stealSap('player', Math.max(1, WASP.SAP_STEAL - this.player.armor));
        this.waspHiveSystem.onHoneyStolen(Math.max(1, WASP.SAP_STEAL - this.player.armor));
      } else {
        if (this.player.takeDamage(WASP.DAMAGE)) this._onPlayerDeath();
      }
    }
  }

  _checkWaspHiveOverlap() {
    const hive = this.hive;
    if (!hive?.active) return;
    const now = this._gameTime;
    for (const wasp of World.getByTag('wasp')) {
      if (!wasp.active || wasp.isRetreating || now - wasp.lastHit < WASP.HIT_COOLDOWN) continue;
      if (dist(wasp.x, wasp.y, hive.x, hive.y) > 110) continue;
      wasp.lastHit = now;
      if (this.resources.getHoney() > 0) {
        SoundSynth.play('hive-hit');
        this.resources.stealHoney(WASP.HONEY_STEAL);
        wasp.honeyCarried = WASP.HONEY_STEAL;
        if (typeof wasp.retreat === 'function') wasp.retreat();
      } else {
        SoundSynth.play('hive-hit');
        if (hive.takeDamage(WASP.DAMAGE)) this._endGame(false);
      }
    }
  }

  _checkWorkerHunterCollisions() {
    const now = this._gameTime;
    for (const wasp of World.getByTag('wasp')) {
      if (!wasp.active || wasp.waspType !== 'hunter' || now - wasp.lastHit < WASP.HIT_COOLDOWN) continue;
      for (const worker of World.getByTag('worker')) {
        if (!worker.active || !worker.alive || dist(wasp.x, wasp.y, worker.x, worker.y) > 50) continue;
        wasp.lastHit = now;
        if (worker._sap > 0) worker._sap = Math.max(0, worker._sap - WASP.SAP_STEAL);
        else worker.takeDamage(WASP.DAMAGE);
      }
      for (const soldier of World.getByTag('soldier')) {
        if (!soldier.active || !soldier.alive || dist(wasp.x, wasp.y, soldier.x, soldier.y) > 65) continue;
        wasp.lastHit = now;
        soldier.takeDamage(WASP.DAMAGE);
      }
    }
  }

  _checkRaiderTowerCollisions() {
    const now = this._gameTime;
    for (const wasp of World.getByTag('wasp')) {
      if (!wasp.active || wasp.waspType !== 'raider' || wasp.isRetreating || now - wasp.lastHit < WASP.HIT_COOLDOWN) continue;
      for (const tower of World.getByTag('guard-post')) {
        if (!tower.active || tower.hp <= 0 || dist(wasp.x, wasp.y, tower.x, tower.y) > 70) continue;
        wasp.lastHit = now;
        tower.takeDamage(WASP.DAMAGE);
        wasp.retreat();
      }
      for (const attractor of World.getByTag('nectar-attractor')) {
        if (!attractor.active || dist(wasp.x, wasp.y, attractor.x, attractor.y) > 70) continue;
        const stolen = attractor.stealNectar(NECTAR_ATTRACTOR.STEAL_AMOUNT, now);
        if (stolen > 0) {
          wasp.honeyCarried = (wasp.honeyCarried ?? 0) + stolen;
          wasp.lastHit = now;
          wasp.retreat?.();
        }
      }
    }
  }

  _applyWind(windVec) {
    if (this.player.alive) { this.player.vx += windVec.x; this.player.vy += windVec.y; }
    for (const w of World.getByTag('wasp')) { if (w.active) { w.vx += windVec.x; w.vy += windVec.y; } }
    for (const w of World.getByTag('worker')) { if (w.active && w.alive) { w.vx += windVec.x; w.vy += windVec.y; } }
    for (const b of World.getByTag('butterfly')) { if (b.active) { b.vx += windVec.x; b.vy += windVec.y; } }
  }

  _collectXp(val) {
    this.xp += val;
    if (this.xp >= this.reqXp) {
      this.xpFloor = this.reqXp;
      this.level++;
      this._xpIncrement = Math.floor(this._xpIncrement * XP.REQ_MULTIPLIER);
      this.reqXp = this.xpFloor + this._xpIncrement;
      this.levelUpMenu.show(this.upgrades);
    }
  }

  _spawnFlower(x, y, initialBloom = false) {
    const type = pickFlowerType(randInt(1, 100));
    const f = new Flower(x, y, type, initialBloom);
    f.onDead = () => {
      World.after(FLOWER.RESPAWN_DELAY, () => {
        if (!this._ended) {
          const pos = this._biasedFlowerPos();
          this._spawnFlower(pos.x, pos.y);
        }
      });
    };
  }

  _biasedFlowerPos() {
    const butterflies = World.getByTag('butterfly').filter(b => b.active);
    if (butterflies.length > 0 && Math.random() < 0.7) {
      const b = butterflies[Math.floor(Math.random() * butterflies.length)];
      const r = 80 + Math.random() * 160;
      const a = Math.random() * Math.PI * 2;
      return {
        x: Math.max(100, Math.min(WORLD.WIDTH - 100,  b.x + Math.cos(a) * r)),
        y: Math.max(100, Math.min(WORLD.HEIGHT - 100, b.y + Math.sin(a) * r)),
      };
    }
    return { x: randInt(100, WORLD.WIDTH - 100), y: randInt(100, WORLD.HEIGHT - 100) };
  }

  _spawnInitialFlowers() {
    for (let i = 0; i < FLOWER.INITIAL_COUNT; i++) {
      this._spawnFlower(randInt(100, WORLD.WIDTH - 100), randInt(100, WORLD.HEIGHT - 100), true);
    }
  }

  _spawnPassiveEntities() {
    for (let i = 0; i < BUTTERFLY.COUNT; i++) new Butterfly(randInt(200, WORLD.WIDTH - 200), randInt(200, WORLD.HEIGHT - 200));
    for (let i = 0; i < SPIDER.COUNT; i++) new Spider(randInt(200, WORLD.WIDTH - 200), randInt(200, WORLD.HEIGHT - 200));
    for (let i = 0; i < 15; i++) this._spawnBreakable();
  }

  _spawnEnvironment() {
    for (let i = 0; i < 800; i++) {
      new EnvironmentFeature(randInt(100, WORLD.WIDTH - 100), randInt(100, WORLD.HEIGHT - 100));
    }
  }

  _spawnBreakable() {
    if (World.getByTag('breakable').filter(b => b.active).length >= BREAKABLE.MAX_COUNT) return;
    new Breakable(randInt(100, WORLD.WIDTH - 100), randInt(100, WORLD.HEIGHT - 100));
  }

  _placeWeb(f1, f2) {
    if (World.getByTag('web').filter(w => w.active).length >= WEB.MAX_COUNT) return;
    new WebTrap(f1, f2);
  }

  _recruitWorker() {
    if (!this.resources.spendHoney(WORKER.COST)) return;
    new WorkerBee(this.hiveX, this.hiveY);
  }

  _recruitSoldier(free = false) {
    if (!free && !this.resources.spendHoney(SOLDIER.COST)) return;
    const s = new SoldierBee(this.hiveX, this.hiveY);
    s.damage = SOLDIER.DAMAGE + (this._metaSoldierDmg ?? 0) + this.upgrades.getLevel('SOLDIER_DMG');
    s.fireRate = Math.max(400, SOLDIER.FIRE_RATE - this.upgrades.getLevel('SOLDIER_RATE') * 100);
  }

  _placeTower(key, x, y) {
    const costs = {
      'resin-trap': TOWER.RESIN_TRAP_COST,
      'guard-post': TOWER.GUARD_POST_COST,
      'poison-honey': TOWER.POISON_HONEY_COST,
      'nectar-attractor': NECTAR_ATTRACTOR.COST,
    };
    if (dist(x, y, this.hiveX, this.hiveY) < 100) return false;
    if (!this.resources.spendHoney(costs[key])) return false;
    if (key === 'resin-trap')            new ResinTrap(x, y);
    else if (key === 'guard-post')       new GuardPost(x, y);
    else if (key === 'poison-honey')     new PoisonHoney(x, y);
    else if (key === 'nectar-attractor') new NectarAttractor(x, y);
    return true;
  }

  _applyUpgrade(key) {
    const lvl = this.upgrades.getLevel(key);
    switch (key) {
      case 'BEE_SPEED':      this.player._speed = BEE.SPEED + (this._metaSpeedBonus ?? 0) + lvl * 20; break;
      case 'BEE_CAPACITY':   this.player._sapCapacity = BEE.SAP_CAPACITY + lvl * 3; break;
      case 'BEE_STINGER_DMG': this.player._stingerDamage = BEE.STINGER_DAMAGE + lvl; break;
      case 'BEE_STINGER_RATE': this.player._stingerRate = Math.max(200, BEE.STINGER_RATE - lvl * 100); break;
      case 'BEE_STINGER_DIST': this.player._stingerRange = BEE.STINGER_RANGE + lvl * 40; break;
      case 'BEE_STINGER_SPEED': this.player._stingerSpeed = BEE.STINGER_SPEED + lvl * 80; break;
      case 'BEE_HP':
        this.player.maxHp = BEE.HP + lvl * 2;
        this.player.hp = Math.min(this.player.hp + 2, this.player.maxHp);
        break;
      case 'BEE_ARMOR':      this.player.armor = lvl; break;
      case 'HIVE_STORAGE':   this.resources.setHoneyStorage(HIVE.HONEY_STORAGE + lvl * 50); break;
      case 'HIVE_PRODUCTION': this._sapConversionInterval = Math.max(500, HIVE.SAP_CONVERSION_INTERVAL - lvl * 300); break;
      case 'HIVE_HP':
        this.hive.maxHp = HIVE.HP + lvl * 5;
        this.hive.hp = Math.min(this.hive.hp + 5, this.hive.maxHp);
        break;
      case 'HIVE_WORKERS':   new WorkerBee(this.hiveX, this.hiveY); break;
      case 'SOLDIER_DMG':
        for (const s of World.getByTag('soldier')) s.damage = SOLDIER.DAMAGE + (this._metaSoldierDmg ?? 0) + lvl;
        break;
      case 'SOLDIER_RATE':
        for (const s of World.getByTag('soldier')) s.fireRate = Math.max(400, SOLDIER.FIRE_RATE - lvl * 100);
        break;
    }
  }

  _onPlayerDeath() {
    if (this.resources.spendHoney(BEE.RESPAWN_COST)) {
      World.after(2000, () => { if (!this._ended) this.player.respawn(this.hiveX, this.hiveY); });
    } else {
      this._endGame(false);
    }
  }

  _endGame(won, wonByDestruction = false) {
    if (this._ended) return;
    this._ended = true;
    const score = this._calculateScore();
    const waves = this.waveManager.getWaveNumber();
    const timeSurvived = Math.floor(this._playTime / 1000);
    import('./index.js').then(({ transition }) =>
      import('./GameOverScene.js').then(({ default: S }) =>
        transition(S, { won, score, waves, timeSurvived, wonByDestruction, playground: this._playground })
      )
    );
  }

  _onPauseSelect(key) {
    if (key === 'resume') {
      // automatically handled by pauseMenu hiding
    } else if (key === 'restart') {
      import('./index.js').then(({ transition }) =>
        import('./GameScene.js').then(({ default: GameScene }) =>
          transition(GameScene, { playground: this._playground })
        )
      );
    } else if (key === 'quit') {
      import('./index.js').then(({ transition }) =>
        import('./MenuScene.js').then(({ default: MenuScene }) =>
          transition(MenuScene)
        )
      );
    }
  }

  _calculateScore() {
    return Math.floor(this.resources.getHoney() * 10 + this.waveManager.getWaveNumber() * 100);
  }

  _onBuildSelect(key) {
    if (key === 'recruit-worker')  { this._recruitWorker();  return; }
    if (key === 'recruit-soldier') { this._recruitSoldier(); return; }
    this._enterPlacement(key);
  }

  _enterPlacement(key) {
    this._placementKey = key;
  }

  _exitPlacement() {
    this._placementKey     = null;
    this._placementJustDone = true;
  }

  _initPlaygroundMenu() {
    this._pgOptions = [
      { label: 'Hunter Wasp',       key: 'hunter' },
      { label: 'Raider Wasp',       key: 'raider' },
      { label: 'Archer Wasp',       key: 'archer' },
      { label: 'Max Honey',         key: 'maxhoney' },
      { label: 'Wave 1  (Easy)',    key: 'wave-1' },
      { label: 'Wave 5',            key: 'wave-5' },
      { label: 'Wave 10  (Hard)',   key: 'wave-10' },
      { label: 'Wave 20',           key: 'wave-20' },
      { label: 'Wave 50  (Brutal)', key: 'wave-50' },
      { label: 'Wave 100 (Insane)', key: 'wave-100' },
    ];
    this._pgIdx = 0;
    this._pgLBWas = false;
    this._pgRBWas = false;
    this._pgXWas = false;
  }

  _updatePlaygroundMenu() {
    const pad = navigator.getGamepads?.()[0];
    const lb = pad?.buttons[4]?.pressed ?? false;
    const rb = pad?.buttons[5]?.pressed ?? false;
    const xb = pad?.buttons[2]?.pressed ?? false;

    if (lb && !this._pgLBWas) this._pgIdx = (this._pgIdx - 1 + this._pgOptions.length) % this._pgOptions.length;
    if (rb && !this._pgRBWas) this._pgIdx = (this._pgIdx + 1) % this._pgOptions.length;
    this._pgLBWas = lb;
    this._pgRBWas = rb;

    if (Input.justDown(',')) this._pgIdx = (this._pgIdx - 1 + this._pgOptions.length) % this._pgOptions.length;
    if (Input.justDown('.')) this._pgIdx = (this._pgIdx + 1) % this._pgOptions.length;

    const activate = (xb && !this._pgXWas) || Input.justDown('x') || Input.justDown('X');
    this._pgXWas = xb;
    if (activate) this._spawnPlaygroundEntity(this._pgOptions[this._pgIdx].key);
  }

  _spawnPlaygroundEntity(key) {
    if (key === 'maxhoney') {
      this.resources.addHoney(this.resources.getHoneyStorage());
      return;
    }
    if (key.startsWith('wave-')) {
      const n = parseInt(key.slice(5));
      this.waspHiveSystem.spawnWave(WaveManager.computeWave(n));
      return;
    }
    const hives = this.waspHiveSystem.hives.filter(h => h.hp > 0);
    let sx, sy;
    if (hives.length) {
      sx = hives[0].x + (Math.random() - 0.5) * 100;
      sy = hives[0].y + (Math.random() - 0.5) * 100;
    } else {
      const edge = Math.floor(Math.random() * 4);
      sx = edge === 0 ? 50 : edge === 1 ? WORLD.WIDTH - 50 : 50 + Math.random() * (WORLD.WIDTH - 100);
      sy = edge === 2 ? 50 : edge === 3 ? WORLD.HEIGHT - 50 : 50 + Math.random() * (WORLD.HEIGHT - 100);
    }
    if (key === 'hunter') {
      const w = new HunterWasp(sx, sy);
      w.setTarget(this.player);
    } else if (key === 'raider') {
      new RaiderWasp(sx, sy);
    } else if (key === 'archer') {
      const w = new ArcherWasp(sx, sy);
      w.setTarget(this.player);
    }
  }

  _screenToWorld(sx, sy) {
    const PPU = 0.25, SCREEN_W = 400, ANCHOR_Y = 150;
    const sinP = Math.sin(this.camera.pitch ?? Math.PI / 6);
    const camCos = Math.cos(this.camera.angle);
    const camSin = Math.sin(this.camera.angle);
    const lx = (ANCHOR_Y - sy) / (PPU * sinP);
    const ly = (sx - SCREEN_W / 2) / PPU;
    return {
      x: this.camera.x + lx * camCos - ly * camSin,
      y: this.camera.y + lx * camSin + ly * camCos,
    };
  }

  _worldToScreen(wx, wy) {
    const PPU = 0.25, SCREEN_W = 400, ANCHOR_Y = 150;
    const sinP = Math.sin(this.camera.pitch ?? Math.PI / 6);
    const camCos = Math.cos(this.camera.angle);
    const camSin = Math.sin(this.camera.angle);
    const dx = wx - this.camera.x;
    const dy = wy - this.camera.y;
    const lx = dx * camCos + dy * camSin;
    const ly = -dx * camSin + dy * camCos;
    const sx = ly * PPU + SCREEN_W / 2;
    const sy = ANCHOR_Y - lx * PPU * sinP;
    return { x: sx, y: sy };
  }

  renderOverlay(ctx) {
    this.pauseMenu?.render(ctx);
    this.buildMenu?.render(ctx);
    this.levelUpMenu?.render(ctx);

    if (this._placementKey && this.player?.alive) {
      const pos = this._worldToScreen(this.player.x, this.player.y);
      const invalid = dist(this.player.x, this.player.y, this.hiveX, this.hiveY) < 100;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = invalid ? '#ff0000' : '#00ff00';
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`Place ${this._placementKey.replace('-', ' ')}`, pos.x, pos.y - 15);
      ctx.font = '6px monospace';
      ctx.fillText(invalid ? 'Too close to hive!' : '[A] Place  [B] Cancel', pos.x, pos.y - 5);
      ctx.restore();
    }

    if (this._playground && this._pgOptions) {
      ctx.save();
      const opt = this._pgOptions[this._pgIdx];
      const panelY = 217;
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      ctx.fillRect(0, panelY, 400, 23);
      ctx.textAlign = 'center';
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`< ${opt.label} >`, 200, panelY + 9);
      ctx.font = '7px monospace';
      ctx.fillStyle = '#555';
      ctx.fillText('LB/RB or ,/. scroll    X or x spawn', 200, panelY + 19);
      ctx.textAlign = 'right';
      ctx.font = 'bold 6px monospace';
      ctx.fillStyle = '#00ff88';
      ctx.fillText('PLAYGROUND', 398, panelY + 7);
      ctx.restore();
    }

  }

  getCamera() { return this.camera; }

  destroy() {
    this._exitPlacement();
    this.pauseMenu?.destroy();
    this.buildMenu?.destroy();
    this.levelUpMenu?.hide();
    Particles.clear();
    World.clear();
  }
}
