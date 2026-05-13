# Assets Needed

## Sprites (all currently generated placeholders)

### Characters
| Key | Current | Size | Notes |
|-----|---------|------|-------|
| `player-bee` | `bee.png` loaded | ? | Only real image file; confirm final art |
| `hunter-wasp` | orange/black square | 28×28 | Chasing wasp |
| `raider-wasp` | dark orange/black square | 28×28 | Attacks player hive/towers |
| `guard-bee` | blue circle | 28×28 | Tower unit |
| `butterfly` | cyan triangles | 20×20 | Passive entity |
| `spider` | dark grey circle | 20×20 | Passive entity |

### Structures
| Key | Current | Size | Notes |
|-----|---------|------|-------|
| `hive` | amber square | 64×64 | Player hive |
| `wasp-hive` | brown square | 64×64 | Enemy hive, destructible |
| `guard-post` | brown square | 40×40 | Tower |
| `stinger-turret` | grey circle | 40×40 | Tower |
| `resin-trap` | amber blob | 48×48 | Tower |
| `flower` | green circle + pink | 40×40 | Honey source |
| `web` | concentric rings | 48×48 | Spider web obstacle |
| `breakable` | brown crate | 32×32 | Destructible crate |

### Projectiles & Pickups
| Key | Current | Size | Notes |
|-----|---------|------|-------|
| `stinger` | white rectangle | 8×3 | Player projectile |
| `xp-gem` | cyan circle | 12×12 | XP drop |
| `health-pickup` | red cross | 12×12 | Health drop |

### Animated
| File | Used | Notes |
|------|------|-------|
| `bee.gif` | Menu screen only | Already final |

---

## Audio (nothing exists)

### Music
- Background loop (gameplay)
- Menu music (optional)

### SFX
| Sound | Trigger |
|-------|---------|
| Stinger fire | Player fires |
| Stinger hit | Hits enemy |
| Bee damage | Player takes hit |
| Bee dash | Dash starts |
| Wasp death | Wasp killed |
| Hive hit | Player hive damaged |
| Wasp hive hit | Enemy hive damaged |
| Wasp hive destroyed | Win by destruction |
| Honey collect | Worker collects honey |
| Honey stolen | Wasp steals honey |
| Level up | Upgrade screen opens |
| Game over | Player hive destroyed |

---

## Priority Order

1. `hunter-wasp`, `raider-wasp` — seen constantly in gameplay
2. `player-bee` — confirm `bee.png` is final
3. `hive`, `wasp-hive` — central game objects
4. `stinger` — fires every second
5. SFX: stinger fire, bee damage, dash
6. Everything else
