// Global variables
let WIDTH, HEIGHT;
let backgroundImg;
let player, enemies = [], potions = [], arrows = [], bolts = [], sentries = [], fireWalls = [], tornadoes = [];
let selectingClass = true;
let gameRunning = false;
let paused = false;
let quitDialog = false;
let gameOver = false;
let leftHeld = false;
let attackCooldown = 0;
let spellCooldown = 0;
let spawnTimer = 0;
let vanishDamageTimer = 0;
let rainbowIndex = 0;
let spellMessage = { text: "", timer: 0 };
let attackAnimations = [];
const SPAWN_INTERVAL = 180;
const RAINBOW = [[255, 0, 0], [255, 127, 0], [255, 255, 0], [0, 255, 0], [0, 0, 255], [75, 0, 130], [148, 0, 211]];
const WHITE = [255, 255, 255];
const RED = [255, 0, 0];
const BLUE = [0, 0, 255];
const GREEN = [0, 255, 0];
const BLACK = [0, 0, 0];
const GRAY = [150, 150, 150];
const YELLOW = [255, 255, 0];
const PURPLE = [128, 0, 128];
const ORANGE = [255, 165, 0];
const CYAN = [0, 255, 255];
const BROWN_GOLD = [184, 134, 11];
const LIGHT_GRAY = [200, 200, 200, 128];
const DARK_GRAY = [100, 100, 100, 128];

let spellbox = [];
let respecbox = {};
let quitbox = {};
let potbox = [];

function preload() {
  try {
    backgroundImg = loadImage("background.jpg");
  } catch (e) {
    console.log("Background image not found, using black background.");
    backgroundImg = null;
  }
}

function setup() {
  WIDTH = windowWidth;
  HEIGHT = windowHeight;
  createCanvas(WIDTH, HEIGHT);
  textFont("Arial");

  spellbox = [
    { x: 0, y: 0, w: 300, h: 40, action: "skill1" },
    { x: 0, y: 0, w: 300, h: 40, action: "skill2" },
    { x: 0, y: 0, w: 300, h: 40, action: "skill3" },
    { x: 0, y: 0, w: 300, h: 40, action: "skill4" }
  ];
  respecbox = { x: 0, y: 0, w: 300, h: 40, action: "respec", color: CYAN };
  quitbox = { x: 0, y: 0, w: 260, h: 40, action: "exit", color: YELLOW };
  potbox = [
    { x: 0, y: 0, w: 300, h: 40, action: "hp", color: RED },
    { x: 0, y: 0, w: 300, h: 40, action: "mp", color: BLUE }
  ];
}

class Character {
  constructor(name, x, y, strBase, agiBase, intBase, strPerLevel, agiPerLevel, intPerLevel, baseHp, baseMp, baseAttack, baseMoveSpeed, baseAttackSpeed, baseCastSpeed, baseMpRegen, level = 1) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.level = level;
    this.strength = strBase + (level - 1) * (strPerLevel || 0);
    this.agility = agiBase + (level - 1) * (agiPerLevel || 0);
    this.intelligence = intBase + (level - 1) * (intPerLevel || 0);
    this.isAlive = true;
    this.exp = 0;
    this.expToLevel = 10 + (level - 1) * 2;
    this.skillLevels = { skill1: 0, skill2: 0, skill3: 0, skill4: 0 };
    this.skillPoints = 1;
    this.hpPotions = 0;
    this.mpPotions = 0;
    this.selectedSpell = null;
    this.spellAnimation = null;
    this.lockedEnemy = null;
    this.skeletons = [];
    this.baseHp = baseHp;
    this.baseMp = baseMp;
    this.baseAttack = baseAttack;
    this.baseMoveSpeed = baseMoveSpeed;
    this.baseAttackSpeed = baseAttackSpeed * 3;
    this.baseCastSpeed = baseCastSpeed;
    this.baseMpRegen = baseMpRegen;
    this.hpRegen = 0.5;
    this.vanishTimer = 0;
    this.warcryTimer = 0;
    this.warcryBoost = 0;
    this.warcryHpMult = 1.0;
    this.originalColor = null;
    this.targetPos = null;
    this.radius = 15;
    this.meleeRange = 50;
    this.rotation = 0;
    this.updateStats();
  }

  updateStats() {
    let prevMaxHp = this.maxHp || this.baseHp + this.strength * 12;
    let newMaxHp = Math.round((this.baseHp + this.strength * 12) * this.warcryHpMult);
    if (this.warcryTimer > 0 && prevMaxHp !== newMaxHp) {
      this.hp = min(newMaxHp, this.hp + (newMaxHp - prevMaxHp));
    } else if (this.warcryTimer === 0 && prevMaxHp !== newMaxHp) {
      this.hp = min(newMaxHp, this.hp);
    }
    this.maxHp = newMaxHp;
    this.mp = Number.isFinite(this.baseMp + this.intelligence * 5) ? this.baseMp + this.intelligence * 5 : this.baseMp;
    this.maxMp = this.mp;
    this.baseAttackPower = Number.isFinite(this.baseAttack + 
      (this instanceof BrianTheBarbarian ? this.strength : 
       this instanceof RichardTheRogue ? this.agility : 
       this.intelligence) * (1 + this.warcryBoost)) ? 
      (this.baseAttack + 
      (this instanceof BrianTheBarbarian ? this.strength : 
       this instanceof RichardTheRogue ? this.agility : 
       this.intelligence)) * (1 + this.warcryBoost) : this.baseAttack;
    this.moveSpeed = Number.isFinite(this.baseMoveSpeed + this.agility * 0.1) ? this.baseMoveSpeed + this.agility * 0.1 : this.baseMoveSpeed;
    this.moveSpeed *= (this.vanishTimer > 0 ? 1.5 : 1);
    this.attackSpeed = Number.isFinite(this.baseAttackSpeed + this.agility * 0.02) ? this.baseAttackSpeed + this.agility * 0.02 : this.baseAttackSpeed;
    this.attackSpeed *= (this.vanishTimer > 0 ? 2 : 1);
    this.castSpeed = Number.isFinite(this.baseCastSpeed + this.agility * 0.02) ? this.baseCastSpeed + this.agility * 0.02 : this.baseCastSpeed;
    this.mpRegen = Number.isFinite(this.baseMpRegen + this.intelligence) ? this.baseMpRegen + this.intelligence : this.baseMpRegen;
    this.hpRegen = Number.isFinite(this.hpRegen + this.strength * 0.1) ? this.hpRegen + this.strength * 0.1 : this.hpRegen;
  }

  move(dx, dy, entities) {
    let dist = Math.hypot(dx, dy);
    if (dist !== 0) {
      let newX = this.x + dx * this.moveSpeed / dist;
      let newY = this.y + dy * this.moveSpeed / dist;
      if (!this.spellAnimation || this.spellAnimation.type !== "whirlwind") {
        for (let entity of entities) {
          if (entity.isAlive && entity !== this) {
            let distToEntity = Math.hypot(newX - entity.x, newY - entity.y);
            if (distToEntity < this.radius + entity.radius) {
              let pushDx = distToEntity > 0 ? (newX - entity.x) / distToEntity : 0;
              let pushDy = distToEntity > 0 ? (newY - entity.y) / distToEntity : 0;
              newX = entity.x + pushDx * (this.radius + entity.radius);
              newY = entity.y + pushDy * (this.radius + entity.radius);
            }
          }
        }
      }
      this.x = constrain(newX, this.radius, WIDTH - this.radius);
      this.y = constrain(newY, this.radius, HEIGHT - this.radius);
    }
  }

  moveToTarget(entities) {
    if (this.targetPos) {
      let dx = this.targetPos[0] - this.x;
      let dy = this.targetPos[1] - this.y;
      let dist = Math.hypot(dx, dy);
      if (dist > 5) {
        this.move(dx, dy, entities);
      } else {
        this.targetPos = null;
        if (this.spellAnimation && this.spellAnimation.type === "whirlwind") this.spellAnimation = null;
      }
    }
  }

  takeDamage(damage) {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
    }
  }

  gainExp(amount) {
    this.exp += amount;
    while (this.exp >= this.expToLevel && this.isAlive) {
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.exp -= this.expToLevel;
    this.expToLevel = 10 + (this.level - 1) * 2;
    if (this instanceof BrianTheBarbarian) {
      this.strength += 2;
      this.agility += 1;
      this.intelligence += 1;
    } else if (this instanceof RichardTheRogue) {
      this.agility += 2;
      this.strength += 1;
      this.intelligence += 1;
    } else {
      this.intelligence += 2;
      this.strength += 1;
      this.agility += 1;
    }
    this.skillPoints++;
    this.updateStats();
    console.log(`${this.name} leveled up to Level ${this.level}! +1 skill point`);
  }

  usePotion(potionType) {
    if (potionType === "hp" && this.hpPotions > 0 && this.hp < this.maxHp) {
      let hpRestore = 50 + this.strength * 2;
      this.hp = min(this.maxHp, this.hp + hpRestore);
      this.hpPotions--;
      console.log(`${this.name} used an HP potion. HP: ${this.hp} (+${hpRestore})`);
    } else if (potionType === "mp" && this.mpPotions > 0 && this.mp < this.maxMp) {
      let mpRestore = 30 + this.intelligence * 1.5;
      this.mp = min(this.maxMp, this.mp + mpRestore);
      this.mpPotions--;
      console.log(`${this.name} used an MP potion. MP: ${this.mp} (+${mpRestore})`);
    }
  }

  draw() {
    push();
    translate(this.x, this.y);
    if (this.spellAnimation && this.spellAnimation.type === "whirlwind") rotate(this.rotation);
    fill(this.vanishTimer > 0 ? [100, 100, 100] : this.color);
    stroke(this.vanishTimer > 0 ? [100, 100, 100] : this.color);
    strokeWeight(2);
    ellipse(0, -15, 10, 10); // Head
    line(0, -10, 0, 5); // Body
    line(0, 0, -10, -5); // Left arm
    line(0, 0, 10, -5); // Right arm
    line(0, 5, -10, 20); // Left leg
    line(0, 5, 10, 20); // Right leg
    pop();
  }
}
class BrianTheBarbarian extends Character {
  constructor(x, y, level = 1) {
    super("Brian", x, y, 20, 8, 5, 2, 1, 1, 100, 50, 20, 2.0, 1.0, 1.0, 0.5, level);
    this.color = RED.slice();
    this.skillNames = ["War Cry", "Cleave", "Whirlwind", "Devil Dust"];
    this.originalColor = RED.slice();
  }

  skill1(targets, mousePos) {
    let level = this.skillLevels["skill1"];
    if (level === 0 || this.warcryTimer > 0) return false;
    let manaCost = 20 + level * 2;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      this.warcryTimer = (8 + level * 0.4) * 60;
      this.warcryBoost = 0.2 + level * 0.02;
      this.warcryHpMult = 1 + 0.11 + level * 0.01;
      this.spellAnimation = { type: "circle", color: [255, 0, 0, 77], radius: 30, x: this.x, y: this.y, duration: 6 };
      spellMessage = { text: "War Cry casted", timer: 180 };
      console.log(`${this.name} uses War Cry: +${Math.round(this.warcryBoost * 100)}% damage, +${Math.round((this.warcryHpMult - 1) * 100)}% HP for ${(8 + level * 0.4).toFixed(1)} sec`);
      this.updateStats();
      return true;
    }
    return false;
  }

  skill2(targets, mousePos) {
    let level = this.skillLevels["skill2"];
    if (level === 0) return 0;
    let manaCost = 15 + level * 2;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      let dx = mousePos[0] - this.x;
      let dy = mousePos[1] - this.y;
      let dist = Math.hypot(dx, dy);
      let centerX, centerY;
      if (dist > 0) {
        dx /= dist;
        dy /= dist;
        centerX = this.x + dx * (this.meleeRange / 2);
        centerY = this.y + dy * (this.meleeRange / 2);
      } else {
        centerX = this.x;
        centerY = this.y;
      }
      let damage = 20 + level * 5 + this.strength * 1;
      let affected = 0;
      for (let target of targets) {
        if (Math.hypot(target.x - centerX, target.y - centerY) < 50 && target.isAlive) {
          target.takeDamage(damage);
          if (this.skillLevels["skill4"] > 0 && random() < 0.15) {
            tornadoes.push(new Tornado(target.x, target.y, this.skillLevels["skill4"], this.strength));
          }
          affected++;
        }
      }
      this.spellAnimation = { type: "halfCircle", color: RED.slice(), radius: 50, x: centerX, y: centerY, angle: Math.atan2(dy, dx), duration: 6 };
      spellMessage = { text: "Cleave casted", timer: 180 };
      console.log(`${this.name} uses Cleave for ${damage} damage to ${affected} enemies`);
      return affected > 0 ? damage : 0;
    }
    return 0;
  }

  skill3(targets, mousePos) {
    let level = this.skillLevels["skill3"];
    if (level === 0) return 0;
    let manaCost = 25 + level * 2;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      let dx = mousePos[0] - this.x;
      let dy = mousePos[1] - this.y;
      let dist = Math.hypot(dx, dy);
      let damage = 30 + this.strength * 1; // Damage per second
      if (dist > 0) {
        dx /= dist;
        dy /= dist;
        this.targetPos = [mousePos[0], mousePos[1]];
        this.spellAnimation = { type: "whirlwind", startX: this.x, startY: this.y, targetX: mousePos[0], targetY: mousePos[1], 
                                dx: dx, dy: dy, damage: damage, targets: targets, duration: Math.round(dist / this.moveSpeed), radius: 30 };
        this.rotation = 0;
        spellMessage = { text: "Whirlwind casted", timer: 180 };
        console.log(`${this.name} uses Whirlwind for ${damage} damage/second`);
        return damage;
      }
    }
    return 0;
  }

  skill4(targets, mousePos) {
    return 0; // Devil Dust is passive, no active effect
  }
}

class RichardTheRogue extends Character {
  constructor(x, y, level = 1) {
    super("Richard", x, y, 10, 18, 7, 1, 2, 1, 80, 60, 15, 2.5, 1.0, 1.5, 0.7, level);
    this.color = GREEN.slice();
    this.skillNames = ["Multi-Guided Arrows", "Shadow Step", "Lightning Sentry", "Vanish"];
    this.originalColor = GREEN.slice();
  }

  skill1(targets, mousePos) {
    let level = this.skillLevels["skill1"];
    if (level === 0) return 0;
    let manaCost = 20 + level * 2;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      let arrowCount = 3 + Math.floor(level / 2);
      let damagePerArrow = 20 + level * 2 + this.agility * (1 + level * 0.05);
      this.spellAnimation = { type: "guidedArrows", count: arrowCount, damage: damagePerArrow, x: this.x, y: this.y, targets: targets, duration: 60 };
      spellMessage = { text: "Multi-Guided Arrows casted", timer: 180 };
      console.log(`${this.name} uses Multi-Guided Arrows: ${arrowCount} arrows`);
      return damagePerArrow * arrowCount;
    }
    return 0;
  }

  skill2(targets, mousePos) {
    let level = this.skillLevels["skill2"];
    if (level === 0) return 0;
    let manaCost = 15 + level * 2;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      let damage = 50 + level * 5 + this.agility * (2 + level * 0.1);
      let closest = targets.reduce((min, t) => {
        let d = Math.hypot(t.x - mousePos[0], t.y - mousePos[1]);
        return (t.isAlive && d < min.dist) ? { target: t, dist: d } : min;
      }, { target: null, dist: Infinity }).target;
      if (closest && Math.hypot(closest.x - mousePos[0], closest.y - mousePos[1]) < closest.radius + 10) {
        let dx = closest.x - this.x;
        let dy = closest.y - this.y;
        let dist = Math.hypot(dx, dy);
        if (dist > 0) {
          dx /= dist;
          dy /= dist;
          this.x = closest.x - dx * (closest.radius + this.radius + 5);
          this.y = closest.y - dy * (closest.radius + this.radius + 5);
          this.targetPos = null;
        }
        closest.takeDamage(damage);
        this.spellAnimation = { type: "circle", color: GREEN.slice(), radius: 30, x: closest.x, y: closest.y, duration: 15 };
        spellMessage = { text: "Shadow Step casted", timer: 180 };
        console.log(`${this.name} uses Shadow Step for ${damage} damage`);
        return damage;
      }
    }
    return 0;
  }

  skill3(targets, mousePos) {
    let level = this.skillLevels["skill3"];
    if (level === 0) return 0;
    let manaCost = 10 + level * 1.5;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      let damage = 40 + level * 5 + this.agility * (1 + level * 0.1);
      this.spellAnimation = { type: "lightningSentry", x: mousePos[0], y: mousePos[1], damage: damage, targets: targets, duration: 6 * 60, shots: 6, shotTimer: 60 };
      spellMessage = { text: "Lightning Sentry casted", timer: 180 };
      console.log(`${this.name} summons Lightning Sentry`);
      return damage;
    }
    return 0;
  }

  skill4(targets, mousePos) {
    let level = this.skillLevels["skill4"];
    if (level === 0 || this.vanishTimer > 0) return false;
    let manaCost = 20 + level * 2;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      let duration = (3 + level * 0.3) * 60;
      let radius = 150;
      this.vanishTimer = duration;
      this.spellAnimation = { type: "vanish", radius: radius, x: this.x, y: this.y, duration: duration, targets: targets };
      spellMessage = { text: "Vanish casted", timer: 180 };
      console.log(`${this.name} uses Vanish: Myst for ${(3 + level * 0.3).toFixed(1)} sec`);
      this.updateStats();
      return true;
    }
    return false;
  }
}
function playGame() {
  if (backgroundImg) image(backgroundImg, 0, 0, WIDTH, HEIGHT);
  else background(0);
  let entities = enemies.concat(player.skeletons || []).concat([player]);

  let canMove = true;
  if (leftHeld && attackCooldown === 0 && player.lockedEnemy && player.lockedEnemy.isAlive) {
    let dist = Math.hypot(player.lockedEnemy.x - player.x, player.lockedEnemy.y - player.y);
    if (dist <= player.meleeRange) {
      canMove = false;
      player.lockedEnemy.takeDamage(player.baseAttackPower);
      if (player instanceof BrianTheBarbarian && player.skillLevels["skill4"] > 0 && random() < 0.15) {
        tornadoes.push(new Tornado(player.lockedEnemy.x, player.lockedEnemy.y, player.skillLevels["skill4"], player.strength));
      }
      console.log(`${player.name} attacks for ${player.baseAttackPower} damage`);
      attackCooldown = Math.round(60 / player.attackSpeed);
      attackAnimations.push({ x: player.lockedEnemy.x, y: player.lockedEnemy.y, duration: 6, symbol: "/" });
    } else {
      player.targetPos = [player.lockedEnemy.x, player.lockedEnemy.y];
    }
  }
  if (canMove) {
    player.moveToTarget(entities);
    if (leftHeld && !player.lockedEnemy) player.targetPos = [mouseX, mouseY];
  }

  player.mp = min(player.maxMp, player.mp + player.mpRegen / 60);
  player.hp = min(player.maxHp, player.hp + player.hpRegen / 60);
  attackCooldown = max(0, attackCooldown - 1);
  spellCooldown = max(0, spellCooldown - 1);

  if (player.warcryTimer > 0) {
    player.warcryTimer--;
    if (player.warcryTimer === 0) {
      player.color = player.originalColor.slice();
      player.warcryBoost = 0;
      player.warcryHpMult = 1.0;
      player.updateStats();
    } else {
      rainbowIndex = (rainbowIndex + 1) % RAINBOW.length;
      player.color = RAINBOW[rainbowIndex].slice();
    }
  }

  if (player.vanishTimer > 0) {
    player.vanishTimer--;
    if (player.spellAnimation && player.spellAnimation.type === "vanish") {
      let dist = Math.hypot(player.x - player.spellAnimation.x, player.y - player.spellAnimation.y);
      if (dist > player.spellAnimation.radius) {
        player.vanishTimer = 0;
        player.color = player.originalColor.slice();
        player.updateStats();
      }
    }
    if (player.vanishTimer === 0) {
      player.color = player.originalColor.slice();
      player.updateStats();
    }
  }

  potions = potions.filter(potion => {
    if (Math.hypot(potion.x - player.x, potion.y - player.radius) < player.radius + potion.radius && potion.pickup(player)) return false;
    if (!potion.update()) return false;
    potion.draw();
    return true;
  });

  spawnTimer++;
  if (spawnTimer >= SPAWN_INTERVAL) {
    let spawnCount = Math.round(random(1, 4));
    for (let i = 0; i < spawnCount; i++) enemies.push(new Enemy(random(WIDTH), random(HEIGHT)));
    spawnTimer = 0;
  }

  enemies.forEach(enemy => {
    if (enemy.isAlive) {
      let target = player.vanishTimer > 0 ? null : (player.skeletons?.length > 0 ? 
        player.skeletons.concat([player]).reduce((min, t) => {
          let d = Math.hypot(t.x - enemy.x, t.y - enemy.y);
          return (t.isAlive && d < min.dist) ? { target: t, dist: d } : min;
        }, { target: null, dist: Infinity }).target : player);
      if (target) {
        if (enemy.fleeTarget) enemy.fleeFrom(enemy.fleeTarget, entities);
        else {
          enemy.moveToward(target, entities);
          let damage = enemy.attack(target, entities);
          if (damage > 0) console.log(`${enemy.name} deals ${damage} damage`);
        }
      } else if (player.vanishTimer > 0 && player.spellAnimation?.type === "vanish" &&
                 Math.hypot(enemy.x - player.spellAnimation.x, enemy.y - player.spellAnimation.y) < player.spellAnimation.radius) {
        enemy.wander(entities);
      }
      enemy.attackCooldown = max(0, enemy.attackCooldown - 1);
      enemy.update();
      enemy.fleeTarget = null;
    }
  });

  if (player instanceof AndersonTheNecromancer) {
    player.skeletons = player.skeletons.filter(skeleton => {
      if (skeleton.isAlive) {
        let closestEnemy = enemies.reduce((min, e) => {
          let d = Math.hypot(e.x - skeleton.x, e.y - skeleton.y);
          return (e.isAlive && d < min.dist) ? { enemy: e, dist: d } : min;
        }, { enemy: null, dist: Infinity }).enemy;
        if (closestEnemy) {
          skeleton.moveToward(closestEnemy, entities);
          let damage = skeleton.attack(closestEnemy);
          if (damage > 0) console.log(`Skeleton deals ${damage} damage`);
          skeleton.attackCooldown = max(0, skeleton.attackCooldown - 1);
        }
        skeleton.draw();
        return true;
      }
      return false;
    });
  }

  if (player instanceof JeffTheMage && player.spellAnimation?.type === "square") {
    player.blizzardCooldown = max(0, player.blizzardCooldown - 1);
    let blizzard = player.spellAnimation;
    enemies.forEach(enemy => {
      let inAoe = (Math.abs(enemy.x - blizzard.x) < blizzard.size / 2 && Math.abs(enemy.y - blizzard.y) < blizzard.size / 2) && enemy.isAlive;
      if (inAoe && !enemy.activeBlizzard) {
        enemy.takeDamage(blizzard.dps);
        enemy.blizzardTimer = blizzard.duration;
        enemy.blizzardDps = blizzard.dps;
        enemy.slowEffect = 0.5;
        enemy.activeBlizzard = true;
        enemy.originalColor = enemy.color.slice();
        enemy.color = BLUE.slice();
      } else if (!inAoe && enemy.activeBlizzard && enemy.blizzardTimer <= 0) {
        enemy.chilledTimer = max(enemy.chilledTimer, 0);
      }
    });
  }

  if (player.isAlive) {
    if (player.spellAnimation?.type === "whirlwind") {
      player.rotation += PI / 6;
      for (let enemy of enemies) {
        if (enemy.isAlive && Math.hypot(enemy.x - player.x, enemy.y - player.y) < player.spellAnimation.radius + enemy.radius) {
          enemy.takeDamage(player.spellAnimation.damage / 60);
        }
      }
    }
    player.draw();
  }

  let mousePos = [mouseX, mouseY];
  enemies.forEach(enemy => {
    if (enemy.isAlive) {
      enemy.highlighted = Math.hypot(enemy.x - mousePos[0], enemy.y - mousePos[1]) < enemy.radius + 10 || enemy === player.lockedEnemy;
      enemy.draw();
    }
  });

  enemies = enemies.filter(enemy => {
    if (!enemy.isAlive) {
      if (random() < 0.15) potions.push(new Potion(enemy.x, enemy.y, "hp"));
      if (random() < 0.15) potions.push(new Potion(enemy.x, enemy.y, "mp"));
      player.gainExp(1);
      if (enemy === player.lockedEnemy) player.lockedEnemy = null;
      return false;
    }
    return true;
  });

  if (player.spellAnimation?.type === "lightningSentry") {
    if (sentries.length >= 5) sentries.shift();
    sentries.push(new Sentry(player.spellAnimation.x, player.spellAnimation.y, player.spellAnimation.damage, player.spellAnimation.targets));
  }

  sentries = sentries.filter(sentry => {
    let newBolts = sentry.update();
    bolts = bolts.concat(newBolts);
    if (sentry.active) {
      sentry.draw();
      return true;
    }
    return false;
  });

  bolts = bolts.filter(bolt => {
    if ("fireDamage" in bolt) {
      bolt.x += bolt.dx * 10;
      bolt.y += bolt.dy * 10;
    } else {
      bolt.x += bolt.dx * (bolt.type === "chargedBolt" ? 0.83 : 7.5);
      bolt.y += bolt.dy * (bolt.type === "chargedBolt" ? 0.83 : 7.5);
      if (bolt.type === "chargedBolt") {
        bolt.dx += random(-0.1, 0.1);
        bolt.dy += random(-0.1, 0.1);
        let dist = Math.hypot(bolt.dx, bolt.dy);
        if (dist > 0) { bolt.dx /= dist; bolt.dy /= dist; }
      }
    }
    bolt.duration--;
    let hitTargets = [];
    for (let target of enemies) {
      if (Math.hypot(target.x - bolt.x, target.y - bolt.y) < target.radius + 5 && target.isAlive) {
        target.takeDamage(bolt.damage + (bolt.fireDamage || 0));
        if (bolt.penetrating) hitTargets.push(target);
        else return false;
      }
    }
    if (bolt.penetrating && hitTargets.length > 0) return true;
    if (bolt.x < 0 || bolt.x > WIDTH || bolt.y < 0 || bolt.y > HEIGHT || bolt.duration <= 0) return false;
    for (let fw of fireWalls) {
      let fwCenter = { x: fw.x, y: fw.y };
      let rotatedBolt = { x: bolt.x - fwCenter.x, y: bolt.y - fwCenter.y };
      let cosA = Math.cos(-fw.angle), sinA = Math.sin(-fw.angle);
      let rx = rotatedBolt.x * cosA - rotatedBolt.y * sinA;
      let ry = rotatedBolt.x * sinA + rotatedBolt.y * cosA;
      let fwRect = { left: -fw.width / 2, right: fw.width / 2, top: -fw.height / 2, bottom: fw.height / 2 };
      if (rx > fwRect.left && rx < fwRect.right && ry > fwRect.top && ry < fwRect.bottom && !("fireDamage" in bolt)) {
        bolt.fireDamage = fw.damage * 0.5;
        bolt.color = ORANGE.slice();
      }
    }
    stroke(bolt.color || WHITE);
    strokeWeight(2);
    line(bolt.x, bolt.y, bolt.x + bolt.dx * (bolt.length || 20), bolt.y + bolt.dy * (bolt.length || 20));
    strokeWeight(1);
    return true;
  });

  if (player.spellAnimation?.type === "fireWall") {
    if (fireWalls.length >= 3) fireWalls.shift();
    fireWalls.push(player.spellAnimation);
  }

  fireWalls = fireWalls.filter(fw => {
    fw.duration--;
    enemies.forEach(enemy => {
      let fwCenter = { x: fw.x, y: fw.y };
      let rotatedEnemy = { x: enemy.x - fwCenter.x, y: enemy.y - fwCenter.y };
      let cosA = Math.cos(-fw.angle), sinA = Math.sin(-fw.angle);
      let rx = rotatedEnemy.x * cosA - rotatedEnemy.y * sinA;
      let ry = rotatedEnemy.x * sinA + rotatedEnemy.y * cosA;
      let fwRect = { left: -fw.width / 2, right: fw.width / 2, top: -fw.height / 2, bottom: fw.height / 2 };
      if (rx > fwRect.left && rx < fwRect.right && ry > fwRect.top && ry < fwRect.bottom && enemy.isAlive) {
        enemy.takeDamage(fw.damage / 60);
      }
    });
    push();
    translate(fw.x, fw.y);
    rotate(fw.angle);
    noStroke();
    fill([255, 165, 0, 77]);
    rect(-fw.width / 2, -fw.height / 2, fw.width, fw.height);
    pop();
    return fw.duration > 0;
  });

  arrows = arrows.filter(arrow => {
    if (!arrow.target || arrow.duration <= 0) return false;
    let dx, dy;
    if ('x' in arrow.target && arrow.target.isAlive) {
      dx = arrow.target.x - arrow.x;
      dy = arrow.target.y - arrow.y;
    } else {
      dx = arrow.target[0] - arrow.x;
      dy = arrow.target[1] - arrow.y;
    }
    let dist = Math.hypot(dx, dy);
    if (dist > 5) {
      dx /= dist;
      dy /= dist;
      arrow.x += dx * 5;
      arrow.y += dy * 5;
      arrow.duration--;
    } else if ('takeDamage' in arrow.target && arrow.target.isAlive) {
      arrow.target.takeDamage(arrow.damage);
      if (player.vanishTimer > 0) arrow.target.fleeTarget = player;
      return false;
    } else return false;
    push();
    translate(arrow.x, arrow.y);
    rotate(Math.atan2(dy, dx));
    fill(BLUE);
    beginShape();
    vertex(5, 0);
    vertex(-5, -3);
    vertex(-5, 3);
    endShape(CLOSE);
    line(-5, 0, -10, 0);
    pop();
    return true;
  });

  tornadoes = tornadoes.filter(tornado => {
    tornado.update(entities);
    tornado.draw();
    return tornado.duration > 0;
  });

  if (player.spellAnimation) {
    if (player.spellAnimation.type === "circle") {
      fill(player.spellAnimation.color);
      ellipse(player.spellAnimation.x, player.spellAnimation.y, player.spellAnimation.radius * 2);
      player.spellAnimation.duration--;
      if (player.spellAnimation.duration <= 0 && player.spellAnimation.type !== "vanish") player.spellAnimation = null;
    } else if (player.spellAnimation.type === "halfCircle") {
      noFill();
      stroke(player.spellAnimation.color);
      arc(player.spellAnimation.x, player.spellAnimation.y, player.spellAnimation.radius * 2, player.spellAnimation.radius * 2, 
          player.spellAnimation.angle - HALF_PI, player.spellAnimation.angle + HALF_PI);
      player.spellAnimation.duration--;
      if (player.spellAnimation.duration <= 0) player.spellAnimation = null;
    } else if (player.spellAnimation.type === "vanish") {
      fill(LIGHT_GRAY);
      ellipse(player.spellAnimation.x, player.spellAnimation.y, player.spellAnimation.radius * 2);
      player.spellAnimation.duration--;
      if (player.spellAnimation.duration <= 0) player.spellAnimation = null;
    } else if (player.spellAnimation.type === "square") {
      fill(player.spellAnimation.color);
      rect(player.spellAnimation.x - player.spellAnimation.size / 2, player.spellAnimation.y - player.spellAnimation.size / 2, 
           player.spellAnimation.size, player.spellAnimation.size);
      player.spellAnimation.duration--;
      if (player.spellAnimation.duration <= 0) player.spellAnimation = null;
    }
  }

  attackAnimations = attackAnimations.filter(anim => {
    stroke(WHITE);
    strokeWeight(2);
    textSize(20);
    text(anim.symbol || "/", anim.x, anim.y);
    anim.duration--;
    return anim.duration > 0;
  });
  strokeWeight(1);

  if (player.skillPoints > 0) {
    fill(BROWN_GOLD);
    noStroke();
    rect(10, HEIGHT - 60, 40, 40, 5);
    fill(139, 0, 0);
    textSize(48);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text("+", 30, HEIGHT - 40);
  }

  noFill();
  stroke(WHITE);
  rect(10, 10, 200, 10, 2);
  noStroke();
  fill(RED);
  rect(10, 10, (player.hp / player.maxHp) * 200, 10);
  noFill();
  stroke(WHITE);
  rect(10, 25, 200, 10, 2);
  noStroke();
  fill(BLUE);
  rect(10, 25, (player.mp / player.maxMp) * 200, 10);
  fill(WHITE);
  textSize(20);
  textAlign(LEFT, TOP);
  text(`HP: ${Math.round(player.hp)}/${player.maxHp}`, 10, 40);
  text(`MP: ${Math.round(player.mp)}/${player.maxMp}`, 10, 60);
  text(`LVL: ${player.level} EXP: ${player.exp}/${player.expToLevel}`, 10, 80);
  fill(RED);
  text(`HP Potions: ${player.hpPotions}/10`, WIDTH - 150, HEIGHT - 60);
  fill(BLUE);
  text(`MP Potions: ${player.mpPotions}/10`, WIDTH - 150, HEIGHT - 30);

  if (spellMessage.timer > 0) {
    fill(WHITE);
    textSize(20);
    textAlign(CENTER, CENTER);
    text(spellMessage.text, WIDTH / 2, HEIGHT - 20);
    spellMessage.timer--;
    if (spellMessage.timer <= 0) spellMessage.text = "";
  }

  if (!player.isAlive) {
    console.log("Defeated!");
    gameRunning = false;
    gameOver = true;
  }
}
class AndersonTheNecromancer extends Character {
  constructor(x, y, level = 1) {
    super("Anderson", x, y, 6, 8, 16, 1, 1, 2, 90, 80, 10, 2.0, 1.0, 1.5, 1.0, level);
    this.color = BLUE.slice();
    this.skillNames = ["Poison Nova", "Bone Spear", "Raise Skeleton", "Amplify Damage"];
    this.originalColor = BLUE.slice();
  }

  skill1(targets, mousePos) {
    let level = this.skillLevels["skill1"];
    if (level === 0) return 0;
    let manaCost = 20 + level * 2;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      let dps = 5 + level * 1 + this.intelligence * (0.2 + level * 0.02);
      let duration = (5 + level * 0.3) * 60;
      let maxRadius = 100 + level * 15;
      this.spellAnimation = { type: "poisonNova", color: GREEN.slice(), radius: 0, maxRadius: maxRadius, x: this.x, y: this.y, dps: dps, duration: duration, targets: targets, frame: 0 };
      spellMessage = { text: "Poison Nova casted", timer: 180 };
      console.log(`${this.name} uses Poison Nova`);
      return dps;
    }
    return 0;
  }

  skill2(targets, mousePos) {
    let level = this.skillLevels["skill2"];
    if (level === 0) return 0;
    let manaCost = 15 + level * 2;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      let damage = 30 + level * 5 + this.intelligence * (1.5 + level * 0.1);
      let dx = mousePos[0] - this.x;
      let dy = mousePos[1] - this.y;
      let dist = Math.hypot(dx, dy);
      if (dist > 0) {
        dx /= dist;
        dy /= dist;
        let maxDist = max(WIDTH, HEIGHT);
        this.spellAnimation = { type: "boneSpear", x: this.x, y: this.y, dx: dx, dy: dy, damage: damage, targets: targets, duration: Math.round(maxDist / 10) };
      }
      spellMessage = { text: "Bone Spear casted", timer: 180 };
      console.log(`${this.name} uses Bone Spear for ${damage} damage`);
      return damage;
    }
    return 0;
  }

  skill3(targets, mousePos) {
    let level = this.skillLevels["skill3"];
    if (level === 0) return false;
    let manaCost = 30 + level * 2;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      let maxSkeletons = level;
      let skeletonHp = 50 + level * 10 + this.intelligence * 5;
      let skeletonDmg = 10 + level * 2 + this.intelligence * 0.5;
      while (this.skeletons.length >= maxSkeletons) this.skeletons.shift();
      this.skeletons.push(new Skeleton(mousePos[0], mousePos[1], skeletonHp, skeletonDmg));
      spellMessage = { text: "Raise Skeleton casted", timer: 180 };
      console.log(`${this.name} raises a skeleton (HP: ${skeletonHp}, Dmg: ${skeletonDmg.toFixed(1)}) at cursor`);
      return true;
    }
    return false;
  }

  skill4(targets, mousePos) {
    let level = this.skillLevels["skill4"];
    if (level === 0) return false;
    let manaCost = 25 + level * 2;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      let damageIncrease = 1.0 + level * 0.1;
      let duration = (5 + level * 0.6) * 60;
      let radius = 150 + level * 15;
      this.spellAnimation = { type: "amplify", color: PURPLE.concat(128), radius: radius, x: mousePos[0], y: mousePos[1], duration: 30, damageIncrease: damageIncrease, effectDuration: duration, targets: targets };
      for (let target of targets) {
        if (Math.hypot(target.x - mousePos[0], target.y - mousePos[1]) < radius && target.isAlive && !(target instanceof Skeleton)) {
          target.damageAmplify = damageIncrease;
          target.amplifyTimer = duration;
        }
      }
      spellMessage = { text: "Amplify Damage casted", timer: 180 };
      console.log(`${this.name} uses Amplify Damage`);
      return true;
    }
    return false;
  }
}

class Enemy extends Character {
  constructor(x, y) {
    super("Mob1", x, y, 5, 10, 5, 1, 1, 1, 0, 20, 0, 0.75, 1.5, 0, 0.2, 1);
    this.color = RED.slice();
    this.attackCooldown = 0;
    this.attackDelay = 60;
    this.highlighted = false;
    this.poisonTimer = 0;
    this.poisonDps = 0;
    this.damageAmplify = 0;
    this.amplifyTimer = 0;
    this.stunTimer = 0;
    this.blizzardTimer = 0;
    this.blizzardDps = 0;
    this.slowEffect = 0;
    this.activeBlizzard = false;
    this.chilledTimer = 0;
    this.originalColor = RED.slice();
    this.radius = 10;
    this.fleeTarget = null;
  }

  moveToward(target, entities) {
    if (this.stunTimer > 0) {
      this.stunTimer--;
      return;
    }
    let dx = target.x - this.x;
    let dy = target.y - this.y;
    let dist = Math.hypot(dx, dy);
    if (dist > this.meleeRange) {
      let speed = this.moveSpeed * (1 - this.slowEffect);
      dx /= dist;
      dy /= dist;
      this.move(dx * speed, dy * speed, entities);
    }
  }

  wander(entities) {
    let dx = random(-1, 1);
    let dy = random(-1, 1);
    let speed = this.moveSpeed * (1 - this.slowEffect);
    this.move(dx * speed, dy * speed, entities);
  }

  fleeFrom(target, entities) {
    let dx = this.x - target.x;
    let dy = this.y - target.y;
    let dist = Math.hypot(dx, dy);
    if (dist > 0) {
      dx /= dist;
      dy /= dist;
      let speed = this.moveSpeed * (1 - this.slowEffect);
      this.move(dx * speed, dy * speed, entities);
    }
  }

  attack(target, entities) {
    if (this.stunTimer > 0) {
      this.stunTimer--;
      return 0;
    }
    let dist = Math.hypot(target.x - this.x, target.y - this.y);
    if (this.attackCooldown <= 0 && dist < this.meleeRange) {
      let damage = this.baseAttackPower + random(5, 10);
      target.takeDamage(damage * (1 + this.damageAmplify));
      this.attackCooldown = this.attackDelay * (1 + this.slowEffect);
      attackAnimations.push({ x: target.x, y: target.y, duration: 6, symbol: target instanceof Character ? "#" : "/" });
      return damage;
    } else if (dist >= this.meleeRange && !this.fleeTarget) {
      this.moveToward(target, entities);
    }
    return 0;
  }

  update() {
    if (this.poisonTimer > 0) {
      this.takeDamage(this.poisonDps / 60 * (1 + this.damageAmplify));
      this.poisonTimer--;
      if (this.poisonTimer <= 0 && this.isAlive) this.color = this.originalColor.slice();
    }
    if (this.amplifyTimer > 0) {
      this.amplifyTimer--;
      if (this.amplifyTimer <= 0) this.damageAmplify = 0;
    }
    if (this.blizzardTimer > 0) {
      this.takeDamage(this.blizzardDps);
      this.blizzardTimer--;
      if (this.blizzardTimer <= 0 && this.isAlive) this.chilledTimer = 120;
    }
    if (this.chilledTimer > 0) {
      this.chilledTimer--;
      this.slowEffect = 0.5;
      this.color = BLUE.slice();
      if (this.chilledTimer <= 0) {
        this.slowEffect = 0;
        this.color = this.originalColor.slice();
        this.activeBlizzard = false;
      }
    }
  }

  draw() {
    push();
    translate(this.x, this.y);
    fill(this.color);
    ellipse(0, -5, 10, 8); // Head
    rect(-5, 0, 10, 10); // Body
    line(-5, 5, -10, 10); // Left arm
    line(5, 5, 10, 10); // Right arm
    line(-3, 10, -5, 15); // Left leg
    line(3, 10, 5, 15); // Right leg
    pop();
    fill(RED);
    rect(this.x - 15, this.y - 20, (this.hp / this.maxHp) * 30, 5);
    if (this.amplifyTimer > 0) {
      fill(PURPLE);
      textSize(12);
      text("*", this.x - 5, this.y - 30);
    }
  }
}
class JeffTheMage extends Character {
  constructor(x, y, level = 1) {
    super("Jeff", x, y, 5, 7, 20, 1, 1, 2, 70, 100, 10, 2.0, 1.0, 2.0, 1.2, level);
    this.color = [139, 69, 19];
    this.skillNames = ["Charged Bolt", "Nova", "Blizzard", "Fire Wall"];
    this.blizzardCooldown = 0;
    this.originalColor = [139, 69, 19];
  }

  skill1(targets, mousePos) {
    let level = this.skillLevels["skill1"];
    if (level === 0) return 0;
    let manaCost = 20 + level * 2;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      let boltCount = 4 + level * 2;
      let damage = 15 + level * 2 + this.intelligence * (1 + level * 0.1);
      let dx = mousePos[0] - this.x;
      let dy = mousePos[1] - this.y;
      let dist = Math.hypot(dx, dy);
      if (dist > 0) { dx /= dist; dy /= dist; }
      this.spellAnimation = { type: "chargedBolt", x: this.x, y: this.y, dx: dx, dy: dy, count: boltCount, damage: damage, targets: targets, duration: 60 };
      spellMessage = { text: "Charged Bolt casted", timer: 180 };
      console.log(`${this.name} uses Charged Bolt: ${boltCount} bolts`);
      return damage * boltCount;
    }
    return 0;
  }

  skill2(targets, mousePos) {
    let level = this.skillLevels["skill2"];
    if (level === 0) return 0;
    let manaCost = 15 + level * 2;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      let damage = (35 + level * 5 + this.intelligence * (1.5 + level * 0.1)) * 2 / 3;
      this.spellAnimation = { type: "nova", color: WHITE.slice(), radius: 0, maxRadius: 200, x: this.x, y: this.y, damage: damage, targets: targets, frame: 0, duration: 10 };
      spellMessage = { text: "Nova casted", timer: 180 };
      console.log(`${this.name} uses Nova`);
      return damage;
    }
    return 0;
  }

  skill3(targets, mousePos) {
    let level = this.skillLevels["skill3"];
    if (level === 0 || this.blizzardCooldown > 0) return 0;
    let manaCost = 15 + level * 2;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      let dps = 25 + level * 5 + this.intelligence * (1 + level * 0.1);
      let duration = 4 * 60;
      this.blizzardCooldown = 120;
      this.spellAnimation = { type: "square", color: [0, 0, 255, 128], size: 150, x: mousePos[0], y: mousePos[1], duration: duration, dps: dps / 60, slow: 0.5 };
      spellMessage = { text: "Blizzard casted", timer: 180 };
      console.log(`${this.name} uses Blizzard for ${dps} DPS (Slow 50%)`);
      return dps;
    }
    return 0;
  }

  skill4(targets, mousePos) {
    let level = this.skillLevels["skill4"];
    if (level === 0) return 0;
    let manaCost = 30 + level * 2;
    if (this.mp >= manaCost) {
      this.mp -= manaCost;
      let damage = 30 + level * 5 + this.intelligence * (1.5 + level * 0.1);
      let dx = mousePos[0] - this.x;
      let dy = mousePos[1] - this.y;
      let angle = Math.atan2(dy, dx) + PI / 2;
      this.spellAnimation = { type: "fireWall", x: mousePos[0], y: mousePos[1], angle: angle, damage: damage, duration: 5 * 60, width: 300, height: 30 };
      spellMessage = { text: "Fire Wall casted", timer: 180 };
      console.log(`${this.name} uses Fire Wall for ${damage} DPS`);
      return damage;
    }
    return 0;
  }
}

class Skeleton {
  constructor(x, y, hp, damage) {
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.maxHp = hp;
    this.damage = damage;
    this.radius = 12;
    this.color = [200, 200, 200];
    this.isAlive = true;
    this.attackCooldown = 0;
    this.attackDelay = 120;
    this.stunTimer = 0;
    this.meleeRange = 20;
    this.originalColor = [200, 200, 200];
    this.moveSpeed = 1.0;
  }

  moveToward(target, entities) {
    if (this.stunTimer > 0) { this.stunTimer--; return; }
    let dx = target.x - this.x;
    let dy = target.y - this.y;
    let dist = Math.hypot(dx, dy);
    if (dist > this.meleeRange) {
      let speed = this.moveSpeed;
      dx /= dist;
      dy /= dist;
      let newX = this.x + dx * speed;
      let newY = this.y + dy * speed;
      for (let entity of entities) {
        if (entity.isAlive && entity !== this && !(entity instanceof Enemy)) {
          let distToEntity = Math.hypot(newX - entity.x, newY - entity.y);
          if (distToEntity < this.radius + entity.radius) {
            let pushDx = distToEntity > 0 ? (newX - entity.x) / distToEntity : 0;
            let pushDy = distToEntity > 0 ? (newY - entity.y) / distToEntity : 0;
            newX = entity.x + pushDx * (this.radius + entity.radius);
            newY = entity.y + pushDy * (this.radius + entity.radius);
          }
        }
      }
      this.x = newX;
      this.y = newY;
    }
  }

  attack(target) {
    if (this.stunTimer > 0) { this.stunTimer--; return 0; }
    let dist = Math.hypot(target.x - this.x, target.y - this.y);
    if (this.attackCooldown <= 0 && dist < this.meleeRange) {
      let damage = this.damage * (1 + (target.damageAmplify || 0));
      target.takeDamage(damage);
      this.attackCooldown = this.attackDelay;
      attackAnimations.push({ x: target.x, y: target.y, duration: 6 });
      return damage;
    }
    return 0;
  }

  takeDamage(damage) {
    this.hp -= damage;
    if (this.hp <= 0) { this.hp = 0; this.isAlive = false; }
  }

  draw() {
    push();
    translate(this.x, this.y);
    fill(this.color);
    ellipse(0, 0, 12, 10); // Skull head
    fill(BLACK);
    ellipse(-3, -2, 3, 3); // Left eye
    ellipse(3, -2, 3, 3); // Right eye
    rect(-2, 2, 4, 2); // Mouth
    pop();
    fill(RED);
    rect(this.x - 15, this.y - 15, (this.hp / this.maxHp) * 30, 5);
  }
}

class Sentry {
  constructor(x, y, damage, targets) {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.targets = targets;
    this.duration = 6 * 60;
    this.shots = 6;
    this.shotTimer = 60;
    this.active = true;
  }

  update() {
    if (!this.active) return [];
    this.duration--;
    this.shotTimer--;
    let newBolts = [];
    if (this.shotTimer <= 0 && this.shots > 0) {
      this.shots--;
      let aliveTargets = this.targets.filter(t => t.isAlive);
      if (aliveTargets.length > 0) {
        let closest = aliveTargets.reduce((min, t) => {
          let d = Math.hypot(t.x - this.x, t.y - this.y);
          return d < min.dist ? { target: t, dist: d } : min;
        }, { target: null, dist: Infinity }).target;
        if (closest) {
          let dx = closest.x - this.x;
          let dy = closest.y - this.y;
          let dist = Math.hypot(dx, dy);
          if (dist > 0) { dx /= dist; dy /= dist; }
          newBolts.push({ x: this.x, y: this.y, dx: dx, dy: dy, damage: this.damage, duration: 60, length: 120, penetrating: true });
        }
      }
      this.shotTimer = 60;
    }
    if (this.duration <= 0 || this.shots <= 0) this.active = false;
    return newBolts;
  }

  draw() {
    fill(YELLOW);
    ellipse(this.x, this.y, 20);
  }
}

class Potion {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 10;
    this.color = this.type === "hp" ? RED.slice() : BLUE.slice();
    this.timer = 10 * 60;
  }

  pickup(player) {
    if (this.type === "hp" && player.hpPotions < 10) {
      player.hpPotions++;
      return true;
    } else if (this.type === "mp" && player.mpPotions < 10) {
      player.mpPotions++;
      return true;
    }
    return false;
  }

  update() {
    this.timer--;
    return this.timer > 0;
  }

  draw() {
    fill(this.color);
    ellipse(this.x, this.y, this.radius * 2);
  }
}

class Tornado {
  constructor(x, y, level, strength) {
    this.x = x;
    this.y = y;
    this.level = level;
    this.strength = strength;
    this.damage = 5 + level * 5 + strength * 0.5;
    this.duration = 5 * 60;
    this.radius = 25;
    this.dx = random(-1, 1);
    this.dy = random(-1, 1);
    this.rotation = 0;
  }

  update(entities) {
    this.x += this.dx;
    this.y += this.dy;
    this.dx += random(-0.2, 0.2);
    this.dy += random(-0.2, 0.2);
    let dist = Math.hypot(this.dx, this.dy);
    if (dist > 1) { this.dx /= dist; this.dy /= dist; }
    this.x = constrain(this.x, this.radius, WIDTH - this.radius);
    this.y = constrain(this.y, this.radius, HEIGHT - this.radius);
    this.duration--;
    entities.forEach(entity => {
      if (entity.isAlive && Math.hypot(entity.x - this.x, entity.y - this.y) < this.radius + entity.radius) {
        entity.takeDamage(this.damage / 60);
      }
    });
  }

  draw() {
    push();
    translate(this.x, this.y);
    this.rotation += PI / 12;
    rotate(this.rotation);
    fill(DARK_GRAY);
    beginShape();
    vertex(0, -25);
    vertex(12, -12);
    vertex(18, 0);
    vertex(12, 12);
    vertex(0, 25);
    vertex(-12, 12);
    vertex(-18, 0);
    vertex(-12, -12);
    endShape(CLOSE);
    pop();
  }
}
function draw() {
  if (selectingClass) drawClassSelection();
  else if (gameRunning && !paused && !quitDialog && !gameOver) playGame();
  else if (paused && !quitDialog) drawSkillUpgradeScreen();
  else if (quitDialog) {
    background(BLACK);
    fill(WHITE);
    textSize(20);
    textAlign(CENTER, CENTER);
    text("Are you sure you want to quit and change class?", WIDTH / 2, HEIGHT - 100);
    fill(mouseX > WIDTH / 2 - 75 && mouseX < WIDTH / 2 - 25 && mouseY > HEIGHT - 60 && mouseY < HEIGHT - 20 ? GRAY : WHITE);
    rect(WIDTH / 2 - 75, HEIGHT - 60, 50, 40);
    fill(BLACK);
    text("Yes", WIDTH / 2 - 50, HEIGHT - 40);
    fill(mouseX > WIDTH / 2 + 25 && mouseX < WIDTH / 2 + 75 && mouseY > HEIGHT - 60 && mouseY < HEIGHT - 20 ? GRAY : WHITE);
    rect(WIDTH / 2 + 25, HEIGHT - 60, 50, 40);
    fill(BLACK);
    text("No", WIDTH / 2 + 50, HEIGHT - 40);
  } else if (gameOver) {
    background(BLACK);
    fill(WHITE);
    textSize(72);
    textAlign(CENTER, CENTER);
    text("You Have Died", WIDTH / 2, HEIGHT / 2 - 50);
    textSize(24);
    fill(mouseX > WIDTH / 2 - 120 && mouseX < WIDTH / 2 - 20 && mouseY > HEIGHT / 2 + 20 && mouseY < HEIGHT / 2 + 60 ? GRAY : WHITE);
    rect(WIDTH / 2 - 120, HEIGHT / 2 + 20, 100, 40);
    fill(BLACK);
    text("Respawn", WIDTH / 2 - 70, HEIGHT / 2 + 40);
    fill(mouseX > WIDTH / 2 + 20 && mouseX < WIDTH / 2 + 120 && mouseY > HEIGHT / 2 + 20 && mouseY < HEIGHT / 2 + 60 ? GRAY : WHITE);
    rect(WIDTH / 2 + 20, HEIGHT / 2 + 20, 100, 40);
    fill(BLACK);
    text("Restart", WIDTH / 2 + 70, HEIGHT / 2 + 40);
  }

  if (player?.spellAnimation?.type === "poisonNova") {
    let anim = player.spellAnimation;
    anim.frame++;
    anim.radius = anim.maxRadius * (anim.frame / (anim.duration / 2));
    fill(anim.color);
    ellipse(anim.x, anim.y, anim.radius * 2);
    for (let target of anim.targets) {
      if (Math.hypot(target.x - anim.x, target.y - anim.y) < anim.radius && target.isAlive) {
        target.poisonTimer = anim.duration;
        target.poisonDps = anim.dps;
        target.color = GREEN.slice();
      }
    }
    if (anim.frame >= anim.duration / 2) player.spellAnimation = null;
  } else if (player?.spellAnimation?.type === "boneSpear") {
    let anim = player.spellAnimation;
    anim.x += anim.dx * 10;
    anim.y += anim.dy * 10;
    stroke(WHITE);
    strokeWeight(2);
    line(anim.x, anim.y, anim.x - anim.dx * 20, anim.y - anim.dy * 20);
    strokeWeight(1);
    for (let target of anim.targets) {
      if (Math.hypot(target.x - anim.x, target.y - anim.y) < target.radius + 5 && target.isAlive) {
        target.takeDamage(anim.damage);
        player.spellAnimation = null;
        break;
      }
    }
    anim.duration--;
    if (anim.x < 0 || anim.x > WIDTH || anim.y < 0 || anim.y > HEIGHT || anim.duration <= 0) player.spellAnimation = null;
  } else if (player?.spellAnimation?.type === "amplify") {
    fill(player.spellAnimation.color);
    ellipse(player.spellAnimation.x, player.spellAnimation.y, player.spellAnimation.radius * 2);
    player.spellAnimation.duration--;
    if (player.spellAnimation.duration <= 0) player.spellAnimation = null;
  } else if (player?.spellAnimation?.type === "chargedBolt") {
    let anim = player.spellAnimation;
    anim.duration--;
    if (anim.duration === 59) {
      for (let i = 0; i < anim.count; i++) {
        let dx = anim.dx + random(-0.2, 0.2);
        let dy = anim.dy + random(-0.2, 0.2);
        let dist = Math.hypot(dx, dy);
        if (dist > 0) { dx /= dist; dy /= dist; }
        bolts.push({ x: anim.x, y: anim.y, dx: dx, dy: dy, damage: anim.damage, duration: 300, type: "chargedBolt" });
      }
    }
    if (anim.duration <= 0) player.spellAnimation = null;
  } else if (player?.spellAnimation?.type === "nova") {
    let anim = player.spellAnimation;
    anim.frame++;
    anim.radius = anim.maxRadius * (anim.frame / 10);
    noFill();
    stroke(anim.color);
    ellipse(anim.x, anim.y, anim.radius * 2);
    if (anim.frame >= 10) {
      for (let target of anim.targets) {
        if (Math.hypot(target.x - anim.x, target.y - anim.y) < anim.maxRadius && target.isAlive) {
          target.takeDamage(anim.damage);
          target.stunTimer = 30;
          let pushDx = (target.x - anim.x) / max(1, Math.hypot(target.x - anim.x, target.y - anim.y));
          let pushDy = (target.y - anim.y) / max(1, Math.hypot(target.x - anim.x, target.y - anim.y));
          target.x += pushDx * 10;
          target.y += pushDy * 10;
        }
      }
      player.spellAnimation = null;
    }
  } else if (player?.spellAnimation?.type === "guidedArrows") {
    let anim = player.spellAnimation;
    anim.duration--;
    if (anim.duration === 59) {
      let aliveTargets = anim.targets.filter(t => t.isAlive);
      for (let i = 0; i < anim.count; i++) {
        let target = aliveTargets.length > 0 ? random(aliveTargets) : { x: anim.x + random(-100, 100), y: anim.y + random(-100, 100) };
        arrows.push({ x: anim.x, y: anim.y, target: 'isAlive' in target ? target : [target.x, target.y], damage: anim.damage, duration: 300 });
      }
    }
    if (anim.duration <= 0) player.spellAnimation = null;
  }
}

function drawClassSelection() {
  background(0);
  fill(WHITE);
  textSize(48);
  textAlign(CENTER, CENTER);
  text("DIABLO: LLZ", WIDTH / 2, 50);
  textSize(36);
  text("Who do you want to be?", WIDTH / 2, 100);

  let buttons = [
    { text: "Brian the Barbarian", y: HEIGHT / 4, action: () => new BrianTheBarbarian(WIDTH / 2, HEIGHT / 2) },
    { text: "Richard the Rogue", y: HEIGHT / 4 + 100, action: () => new RichardTheRogue(WIDTH / 2, HEIGHT / 2) },
    { text: "Anderson the Necromancer", y: HEIGHT / 4 + 200, action: () => new AndersonTheNecromancer(WIDTH / 2, HEIGHT / 2) },
    { text: "Jeff the Mage", y: HEIGHT / 4 + 300, action: () => new JeffTheMage(WIDTH / 2, HEIGHT / 2) },
    { text: "Exit", y: HEIGHT - 100, action: () => window.close(), color: RED, hoverColor: YELLOW }
  ];

  buttons.forEach(btn => {
    let x = WIDTH / 2 - 250;
    let w = 500, h = 60;
    fill(mouseX > x && mouseX < x + w && mouseY > btn.y && mouseY < btn.y + h ? (btn.hoverColor || GRAY) : (btn.color || WHITE));
    rect(x, btn.y, w, h);
    fill(BLACK);
    textSize(36);
    text(btn.text, WIDTH / 2, btn.y + h / 2);
  });
}

function drawSkillUpgradeScreen() {
  background(BLACK);
  fill(WHITE);
  textSize(16);
  textAlign(LEFT, CENTER);

  spellbox[0].text = `${player.skillNames[0]} (Lv${player.skillLevels["skill1"]}) [3]`;
  spellbox[1].text = `${player.skillNames[1]} (Lv${player.skillLevels["skill2"]}) [4]`;
  spellbox[2].text = `${player.skillNames[2]} (Lv${player.skillLevels["skill3"]}) [E]`;
  spellbox[3].text = `${player.skillNames[3]} (Lv${player.skillLevels["skill4"]}) [R]`;
  spellbox.forEach((btn, i) => { btn.x = WIDTH / 2 - 50; btn.y = HEIGHT / 2 - 180 + i * 60; });

  respecbox.text = "Respec Skills";
  respecbox.x = WIDTH / 2 - 50;
  respecbox.y = HEIGHT / 2 + 60;

  quitbox.text = "Quit and Change Class";
  quitbox.x = WIDTH / 2 - 130;
  quitbox.y = HEIGHT - 80;

  potbox[0].text = `HP Potion (${player.hpPotions}/10) [1]`;
  potbox[1].text = `MP Potion (${player.mpPotions}/10) [2]`;
  potbox[0].x = WIDTH / 2 - 50;
  potbox[0].y = HEIGHT / 2 + 120;
  potbox[1].x = WIDTH / 2 - 50;
  potbox[1].y = HEIGHT / 2 + 180;

  let attrbox = { x: 50, y: HEIGHT / 2 - 180, w: 200, h: 400 };
  let spacing = 30;
  text(`Class: ${player.name}`, attrbox.x, attrbox.y);
  text(`Level: ${player.level}`, attrbox.x, attrbox.y + spacing);
  text(`EXP: ${player.exp}/${player.expToLevel}`, attrbox.x, attrbox.y + spacing * 2);
  text(`STR: ${player.strength}`, attrbox.x, attrbox.y + spacing * 4);
  text(`AGI: ${player.agility}`, attrbox.x, attrbox.y + spacing * 5);
  text(`INT: ${player.intelligence}`, attrbox.x, attrbox.y + spacing * 6);
  let attrHover = mouseY > attrbox.y + spacing * 4 && mouseY < attrbox.y + spacing * 7 && mouseX < attrbox.x + 150;
  if (attrHover) {
    fill(GRAY);
    if (player instanceof BrianTheBarbarian) {
      text("+12 HP, +1 Dmg", attrbox.x + 120, attrbox.y + spacing * 4);
      text("+0.1 Speed, +0.02 Atk/Cast", attrbox.x + 120, attrbox.y + spacing * 5);
      text("+5 MP", attrbox.x + 120, attrbox.y + spacing * 6);
    } else if (player instanceof RichardTheRogue) {
      text("+12 HP", attrbox.x + 120, attrbox.y + spacing * 4);
      text("+0.1 Speed, +0.02 Atk/Cast, +1 Dmg", attrbox.x + 120, attrbox.y + spacing * 5);
      text("+5 MP", attrbox.x + 120, attrbox.y + spacing * 6);
    } else {
      text("+12 HP", attrbox.x + 120, attrbox.y + spacing * 4);
      text("+0.1 Speed, +0.02 Atk/Cast", attrbox.x + 120, attrbox.y + spacing * 5);
      text("+5 MP, +1 Dmg", attrbox.x + 120, attrbox.y + spacing * 6);
    }
  }

  fill(WHITE);
  text(`HP: ${Math.round(player.hp)}/${player.maxHp}`, attrbox.x, attrbox.y + spacing * 8);
  text(`MP: ${Math.round(player.mp)}/${player.maxMp}`, attrbox.x, attrbox.y + spacing * 9);
  text(`Base Damage: ${player.baseAttackPower.toFixed(1)}`, attrbox.x, attrbox.y + spacing * 10);
  text(`Move Speed: ${player.moveSpeed.toFixed(1)}`, attrbox.x, attrbox.y + spacing * 11);
  text(`Attack Speed: ${player.attackSpeed.toFixed(2)}`, attrbox.x, attrbox.y + spacing * 12);
  text(`Cast Speed: ${player.castSpeed.toFixed(2)}`, attrbox.x, attrbox.y + spacing * 13);
  text(`HP Regen: ${player.hpRegen.toFixed(1)}/s`, attrbox.x, attrbox.y + spacing * 14);
  text(`MP Regen: ${player.mpRegen.toFixed(1)}/s`, attrbox.x, attrbox.y + spacing * 15);

  let detailbox = { x: WIDTH / 2 + 260, y: HEIGHT / 2 - 180, w: 180, h: potbox[1].y + potbox[1].h - (HEIGHT / 2 - 180) };
  fill(BLACK);
  rect(detailbox.x, detailbox.y, detailbox.w, detailbox.h);

  if (player.skillPoints > 0) {
    fill(WHITE);
    textSize(20);
    textAlign(CENTER, CENTER);
    text(`Skill Points: ${player.skillPoints}`, spellbox[0].x + spellbox[0].w / 2, spellbox[0].y - 30);
  }

  spellbox.forEach(btn => {
    fill(mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h ? GRAY : WHITE);
    rect(btn.x, btn.y, btn.w, btn.h);
    fill(BLACK);
    textAlign(CENTER, CENTER);
    text(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
  });

  fill(mouseX > respecbox.x && mouseX < respecbox.x + respecbox.w && mouseY > respecbox.y && mouseY < respecbox.y + respecbox.h ? GRAY : respecbox.color);
  rect(respecbox.x, respecbox.y, respecbox.w, respecbox.h);
  fill(BLACK);
  text(respecbox.text, respecbox.x + respecbox.w / 2, respecbox.y + respecbox.h / 2);

  fill(mouseX > quitbox.x && mouseX < quitbox.x + quitbox.w && mouseY > quitbox.y && mouseY < quitbox.y + quitbox.h ? GRAY : quitbox.color);
  rect(quitbox.x, quitbox.y, quitbox.w, quitbox.h);
  fill(BLACK);
  text(quitbox.text, quitbox.x + quitbox.w / 2, quitbox.y + quitbox.h / 2);

  potbox.forEach(btn => {
    fill(mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h ? GRAY : btn.color);
    rect(btn.x, btn.y, btn.w, btn.h);
    fill(BLACK);
    text(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
  });

  let hoveredItem = null;
  spellbox.forEach(btn => { if (mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h) hoveredItem = btn.action; });
  potbox.forEach(btn => { if (mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h) hoveredItem = btn.action; });

  if (hoveredItem) {
    let statName = player instanceof BrianTheBarbarian ? "STR" : player instanceof RichardTheRogue ? "AGI" : "INT";
    let statValue = player instanceof BrianTheBarbarian ? player.strength : player instanceof RichardTheRogue ? player.agility : player.intelligence;
    let details = player instanceof BrianTheBarbarian ? {
      "skill1": `Increase Dmg: ${player.skillLevels["skill1"] > 0 ? `+${Math.round((0.2 + player.skillLevels["skill1"] * 0.02) * 100)}%` : ""}${player.skillLevels["skill1"] < 10 ? " / " : ""}${player.skillLevels["skill1"] < 10 ? `<red>+${Math.round((0.2 + (player.skillLevels["skill1"] + 1) * 0.02) * 100)}%</red>` : ""}\nIncrease HP: ${player.skillLevels["skill1"] > 0 ? `+${Math.round((0.11 + player.skillLevels["skill1"] * 0.01) * 100)}%` : ""}${player.skillLevels["skill1"] < 10 ? " / " : ""}${player.skillLevels["skill1"] < 10 ? `<red>+${Math.round((0.11 + (player.skillLevels["skill1"] + 1) * 0.01) * 100)}%</red>` : ""}\nDuration: ${player.skillLevels["skill1"] > 0 ? `${(8 + player.skillLevels["skill1"] * 0.4).toFixed(1)}s` : ""}${player.skillLevels["skill1"] < 10 ? " / " : ""}${player.skillLevels["skill1"] < 10 ? `<red>${(8 + (player.skillLevels["skill1"] + 1) * 0.4).toFixed(1)}s</red>` : ""}\nMana: ${player.skillLevels["skill1"] > 0 ? 20 + player.skillLevels["skill1"] * 2 : ""}${player.skillLevels["skill1"] < 10 ? " / " : ""}${player.skillLevels["skill1"] < 10 ? `<red>${20 + (player.skillLevels["skill1"] + 1) * 2}</red>` : ""}`,
      "skill2": `Dmg: ${player.skillLevels["skill2"] > 0 ? `${(20 + player.skillLevels["skill2"] * 5 + statValue).toFixed(1)} = 20 + 1 x ${statName}(${statValue})` : ""}${player.skillLevels["skill2"] < 10 ? " / " : ""}${player.skillLevels["skill2"] < 10 ? `<red>${(20 + (player.skillLevels["skill2"] + 1) * 5 + statValue).toFixed(1)} = 20 + 1 x ${statName}(${statValue})</red>` : ""}\nMana: ${player.skillLevels["skill2"] > 0 ? 15 + player.skillLevels["skill2"] * 2 : ""}${player.skillLevels["skill2"] < 10 ? " / " : ""}${player.skillLevels["skill2"] < 10 ? `<red>${15 + (player.skillLevels["skill2"] + 1) * 2}</red>` : ""}`,
      "skill3": `Dmg/s: ${player.skillLevels["skill3"] > 0 ? `${(30 + statValue).toFixed(1)} = 30 + 1 x ${statName}(${statValue})` : ""}${player.skillLevels["skill3"] < 10 ? " / " : ""}${player.skillLevels["skill3"] < 10 ? `<red>${(30 + statValue).toFixed(1)} = 30 + 1 x ${statName}(${statValue})</red>` : ""}\nMana: ${player.skillLevels["skill3"] > 0 ? 25 + player.skillLevels["skill3"] * 2 : ""}${player.skillLevels["skill3"] < 10 ? " / " : ""}${player.skillLevels["skill3"] < 10 ? `<red>${25 + (player.skillLevels["skill3"] + 1) * 2}</red>` : ""}`,
      "skill4": `Chance: ${player.skillLevels["skill4"] > 0 ? "15%" : ""}${player.skillLevels["skill4"] < 10 ? " / " : ""}${player.skillLevels["skill4"] < 10 ? "<red>15%</red>" : ""}\nDmg/s: ${player.skillLevels["skill4"] > 0 ? `${(5 + player.skillLevels["skill4"] * 5 + statValue * 0.5).toFixed(1)} = 5 + 0.5 x ${statName}(${statValue})` : ""}${player.skillLevels["skill4"] < 10 ? " / " : ""}${player.skillLevels["skill4"] < 10 ? `<red>${(5 + (player.skillLevels["skill4"] + 1) * 5 + statValue * 0.5).toFixed(1)} = 5 + 0.5 x ${statName}(${statValue})</red>` : ""}\nPassive`
    } : player instanceof RichardTheRogue ? {
      "skill1": `Arrows: ${player.skillLevels["skill1"] > 0 ? 3 + Math.floor(player.skillLevels["skill1"] / 2) : ""}${player.skillLevels["skill1"] < 10 ? " / " : ""}${player.skillLevels["skill1"] < 10 ? `<red>${3 + Math.floor((player.skillLevels["skill1"] + 1) / 2)}</red>` : ""}\nDmg/Arrow: ${player.skillLevels["skill1"] > 0 ? (20 + player.skillLevels["skill1"] * 2 + statValue * (1 + player.skillLevels["skill1"] * 0.05)).toFixed(1) : ""}${player.skillLevels["skill1"] < 10 ? " / " : ""}${player.skillLevels["skill1"] < 10 ? `<red>${(20 + (player.skillLevels["skill1"] + 1) * 2 + statValue * (1 + (player.skillLevels["skill1"] + 1) * 0.05)).toFixed(1)}</red>` : ""}\nMana: ${player.skillLevels["skill1"] > 0 ? 20 + player.skillLevels["skill1"] * 2 : ""}${player.skillLevels["skill1"] < 10 ? " / " : ""}${player.skillLevels["skill1"] < 10 ? `<red>${20 + (player.skillLevels["skill1"] + 1) * 2}</red>` : ""}`,
      "skill2": `Dmg: ${player.skillLevels["skill2"] > 0 ? (50 + player.skillLevels["skill2"] * 5 + statValue * (2 + player.skillLevels["skill2"] * 0.1)).toFixed(1) : ""}${player.skillLevels["skill2"] < 10 ? " / " : ""}${player.skillLevels["skill2"] < 10 ? `<red>${(50 + (player.skillLevels["skill2"] + 1) * 5 + statValue * (2 + (player.skillLevels["skill2"] + 1) * 0.1)).toFixed(1)}</red>` : ""}\nMana: ${player.skillLevels["skill2"] > 0 ? 15 + player.skillLevels["skill2"] * 2 : ""}${player.skillLevels["skill2"] < 10 ? " / " : ""}${player.skillLevels["skill2"] < 10 ? `<red>${15 + (player.skillLevels["skill2"] + 1) * 2}</red>` : ""}`,
      "skill3": `Dmg/Bolt: ${player.skillLevels["skill3"] > 0 ? (40 + player.skillLevels["skill3"] * 5 + statValue * (1 + player.skillLevels["skill3"] * 0.1)).toFixed(1) : ""}${player.skillLevels["skill3"] < 10 ? " / " : ""}${player.skillLevels["skill3"] < 10 ? `<red>${(40 + (player.skillLevels["skill3"] + 1) * 5 + statValue * (1 + (player.skillLevels["skill3"] + 1) * 0.1)).toFixed(1)}</red>` : ""}\nMax Traps: 5\nDuration: 6s or 6 shots\nMana: ${player.skillLevels["skill3"] > 0 ? (10 + player.skillLevels["skill3"] * 1.5).toFixed(1) : ""}${player.skillLevels["skill3"] < 10 ? " / " : ""}${player.skillLevels["skill3"] < 10 ? `<red>${(10 + (player.skillLevels["skill3"] + 1) * 1.5).toFixed(1)}</red>` : ""}`,
      "skill4": `Duration: ${player.skillLevels["skill4"] > 0 ? (3 + player.skillLevels["skill4"] * 0.3).toFixed(1) : ""}${player.skillLevels["skill4"] < 10 ? " / " : ""}${player.skillLevels["skill4"] < 10 ? `<red>${(3 + (player.skillLevels["skill4"] + 1) * 0.3).toFixed(1)}</red>` : ""}s\nRadius: 150\nEffects: +50% Move Speed, +100% Atk Speed\nMana: ${player.skillLevels["skill4"] > 0 ? 20 + player.skillLevels["skill4"] * 2 : ""}${player.skillLevels["skill4"] < 10 ? " / " : ""}${player.skillLevels["skill4"] < 10 ? `<red>${20 + (player.skillLevels["skill4"] + 1) * 2}</red>` : ""}`
    } : player instanceof AndersonTheNecromancer ? {
      "skill1": `DPS: ${player.skillLevels["skill1"] > 0 ? (5 + player.skillLevels["skill1"] * 1 + statValue * (0.2 + player.skillLevels["skill1"] * 0.02)).toFixed(1) : ""}${player.skillLevels["skill1"] < 10 ? " / " : ""}${player.skillLevels["skill1"] < 10 ? `<red>${(5 + (player.skillLevels["skill1"] + 1) * 1 + statValue * (0.2 + (player.skillLevels["skill1"] + 1) * 0.02)).toFixed(1)}</red>` : ""}\nDuration: ${player.skillLevels["skill1"] > 0 ? (5 + player.skillLevels["skill1"] * 0.3).toFixed(1) : ""}${player.skillLevels["skill1"] < 10 ? " / " : ""}${player.skillLevels["skill1"] < 10 ? `<red>${(5 + (player.skillLevels["skill1"] + 1) * 0.3).toFixed(1)}</red>` : ""}s\nMana: ${player.skillLevels["skill1"] > 0 ? 20 + player.skillLevels["skill1"] * 2 : ""}${player.skillLevels["skill1"] < 10 ? " / " : ""}${player.skillLevels["skill1"] < 10 ? `<red>${20 + (player.skillLevels["skill1"] + 1) * 2}</red>` : ""}\nRadius: ${player.skillLevels["skill1"] > 0 ? 100 + player.skillLevels["skill1"] * 15 : ""}${player.skillLevels["skill1"] < 10 ? " / " : ""}${player.skillLevels["skill1"] < 10 ? `<red>${100 + (player.skillLevels["skill1"] + 1) * 15}</red>` : ""}`,
      "skill2": `Dmg: ${player.skillLevels["skill2"] > 0 ? (30 + player.skillLevels["skill2"] * 5 + statValue * (1.5 + player.skillLevels["skill2"] * 0.1)).toFixed(1) : ""}${player.skillLevels["skill2"] < 10 ? " / " : ""}${player.skillLevels["skill2"] < 10 ? `<red>${(30 + (player.skillLevels["skill2"] + 1) * 5 + statValue * (1.5 + (player.skillLevels["skill2"] + 1) * 0.1)).toFixed(1)}</red>` : ""}\nMana: ${player.skillLevels["skill2"] > 0 ? 15 + player.skillLevels["skill2"] * 2 : ""}${player.skillLevels["skill2"] < 10 ? " / " : ""}${player.skillLevels["skill2"] < 10 ? `<red>${15 + (player.skillLevels["skill2"] + 1) * 2}</red>` : ""}`,
      "skill3": `Skeletons: ${player.skillLevels["skill3"] > 0 ? player.skillLevels["skill3"] : ""}${player.skillLevels["skill3"] < 10 ? " / " : ""}${player.skillLevels["skill3"] < 10 ? `<red>${player.skillLevels["skill3"] + 1}</red>` : ""}\nHP: ${player.skillLevels["skill3"] > 0 ? 50 + player.skillLevels["skill3"] * 10 + statValue * 5 : ""}${player.skillLevels["skill3"] < 10 ? " / " : ""}${player.skillLevels["skill3"] < 10 ? `<red>${50 + (player.skillLevels["skill3"] + 1) * 10 + statValue * 5}</red>` : ""}\nDmg: ${player.skillLevels["skill3"] > 0 ? (10 + player.skillLevels["skill3"] * 2 + statValue * 0.5).toFixed(1) : ""}${player.skillLevels["skill3"] < 10 ? " / " : ""}${player.skillLevels["skill3"] < 10 ? `<red>${(10 + (player.skillLevels["skill3"] + 1) * 2 + statValue * 0.5).toFixed(1)}</red>` : ""}\nMana: ${player.skillLevels["skill3"] > 0 ? 30 + player.skillLevels["skill3"] * 2 : ""}${player.skillLevels["skill3"] < 10 ? " / " : ""}${player.skillLevels["skill3"] < 10 ? `<red>${30 + (player.skillLevels["skill3"] + 1) * 2}</red>` : ""}`,
      "skill4": `Dmg+: ${player.skillLevels["skill4"] > 0 ? Math.round((1.0 + player.skillLevels["skill4"] * 0.1) * 100) : ""}${player.skillLevels["skill4"] < 10 ? " / " : ""}${player.skillLevels["skill4"] < 10 ? `<red>${Math.round((1.0 + (player.skillLevels["skill4"] + 1) * 0.1) * 100)}</red>` : ""}%\nRadius: ${player.skillLevels["skill4"] > 0 ? 150 + player.skillLevels["skill4"] * 15 : ""}${player.skillLevels["skill4"] < 10 ? " / " : ""}${player.skillLevels["skill4"] < 10 ? `<red>${150 + (player.skillLevels["skill4"] + 1) * 15}</red>` : ""}\nDuration: ${player.skillLevels["skill4"] > 0 ? (5 + player.skillLevels["skill4"] * 0.6).toFixed(1) : ""}${player.skillLevels["skill4"] < 10 ? " / " : ""}${player.skillLevels["skill4"] < 10 ? `<red>${(5 + (player.skillLevels["skill4"] + 1) * 0.6).toFixed(1)}</red>` : ""}s\nMana: ${player.skillLevels["skill4"] > 0 ? 25 + player.skillLevels["skill4"] * 2 : ""}${player.skillLevels["skill4"] < 10 ? " / " : ""}${player.skillLevels["skill4"] < 10 ? `<red>${25 + (player.skillLevels["skill4"] + 1) * 2}</red>` : ""}`
    } : {
      "skill1": `Bolts: ${player.skillLevels["skill1"] > 0 ? 4 + player.skillLevels["skill1"] * 2 : ""}${player.skillLevels["skill1"] < 10 ? " / " : ""}${player.skillLevels["skill1"] < 10 ? `<red>${4 + (player.skillLevels["skill1"] + 1) * 2}</red>` : ""}\nDmg/Bolt: ${player.skillLevels["skill1"] > 0 ? (15 + player.skillLevels["skill1"] * 2 + statValue * (1 + player.skillLevels["skill1"] * 0.1)).toFixed(1) : ""}${player.skillLevels["skill1"] < 10 ? " / " : ""}${player.skillLevels["skill1"] < 10 ? `<red>${(15 + (player.skillLevels["skill1"] + 1) * 2 + statValue * (1 + (player.skillLevels["skill1"] + 1) * 0.1)).toFixed(1)}</red>` : ""}\nMana: ${player.skillLevels["skill1"] > 0 ? 20 + player.skillLevels["skill1"] * 2 : ""}${player.skillLevels["skill1"] < 10 ? " / " : ""}${player.skillLevels["skill1"] < 10 ? `<red>${20 + (player.skillLevels["skill1"] + 1) * 2}</red>` : ""}`,
      "skill2": `Dmg: ${player.skillLevels["skill2"] > 0 ? ((35 + player.skillLevels["skill2"] * 5 + statValue * (1.5 + player.skillLevels["skill2"] * 0.1)) * 2 / 3).toFixed(1) : ""}${player.skillLevels["skill2"] < 10 ? " / " : ""}${player.skillLevels["skill2"] < 10 ? `<red>${((35 + (player.skillLevels["skill2"] + 1) * 5 + statValue * (1.5 + (player.skillLevels["skill2"] + 1) * 0.1)) * 2 / 3).toFixed(1)}</red>` : ""}\nRadius: 200\nMana: ${player.skillLevels["skill2"] > 0 ? 15 + player.skillLevels["skill2"] * 2 : ""}${player.skillLevels["skill2"] < 10 ? " / " : ""}${player.skillLevels["skill2"] < 10 ? `<red>${15 + (player.skillLevels["skill2"] + 1) * 2}</red>` : ""}`,
      "skill3": `DPS: ${player.skillLevels["skill3"] > 0 ? (25 + player.skillLevels["skill3"] * 5 + statValue * (1 + player.skillLevels["skill3"] * 0.1)).toFixed(1) : ""}${player.skillLevels["skill3"] < 10 ? " / " : ""}${player.skillLevels["skill3"] < 10 ? `<red>${(25 + (player.skillLevels["skill3"] + 1) * 5 + statValue * (1 + (player.skillLevels["skill3"] + 1) * 0.1)).toFixed(1)}</red>` : ""}\nSlow: 50%\nSize: 150\nMana: ${player.skillLevels["skill3"] > 0 ? 15 + player.skillLevels["skill3"] * 2 : ""}${player.skillLevels["skill3"] < 10 ? " / " : ""}${player.skillLevels["skill3"] < 10 ? `<red>${15 + (player.skillLevels["skill3"] + 1) * 2}</red>` : ""}`,
      "skill4": `DPS: ${player.skillLevels["skill4"] > 0 ? (30 + player.skillLevels["skill4"] * 5 + statValue * (1.5 + player.skillLevels["skill4"] * 0.1)).toFixed(1) : ""}${player.skillLevels["skill4"] < 10 ? " / " : ""}${player.skillLevels["skill4"] < 10 ? `<red>${(30 + (player.skillLevels["skill4"] + 1) * 5 + statValue * (1.5 + (player.skillLevels["skill4"] + 1) * 0.1)).toFixed(1)}</red>` : ""}\nMana: ${player.skillLevels["skill4"] > 0 ? 30 + player.skillLevels["skill4"] * 2 : ""}${player.skillLevels["skill4"] < 10 ? " / " : ""}${player.skillLevels["skill4"] < 10 ? `<red>${30 + (player.skillLevels["skill4"] + 1) * 2}</red>` : ""}`
    };
    if (hoveredItem === "hp") details[hoveredItem] = `Restores ${50 + player.strength * 2} HP = 50 + 2 x STR (${player.strength})\nMax Potions: 10`;
    else if (hoveredItem === "mp") details[hoveredItem] = `Restores ${30 + player.intelligence * 1.5} MP = 30 + 1.5 x INT (${player.intelligence})\nMax Potions: 10`;
    if (hoveredItem in details) {
      fill(WHITE);
      textSize(18);
      textAlign(LEFT, TOP);
      let textLines = details[hoveredItem].split('\n');
      let yOffset = detailbox.y + 5;
      textLines.forEach(line => {
        let parts = line.split(/(<red>.*?<\/red>)/);
        let xOffset = detailbox.x + 5;
        let currentLine = "";
        parts.forEach(part => {
          let textPart = part.replace(/<red>|<\/red>/g, "");
          if (textWidth(currentLine + textPart) + xOffset - detailbox.x > detailbox.w) {
            text(currentLine, xOffset, yOffset);
            yOffset += 20;
            currentLine = textPart;
            xOffset = detailbox.x + 5;
          } else {
            currentLine += textPart;
          }
          if (part.match(/<red>.*<\/red>/)) {
            fill(RED);
            text(textPart, xOffset, yOffset);
            xOffset += textWidth(textPart);
          } else {
            fill(WHITE);
            text(textPart, xOffset, yOffset);
            xOffset += textWidth(textPart);
          }
        });
        if (currentLine) {
          text(currentLine, detailbox.x + 5, yOffset);
          yOffset += 20;
        }
      });
    }
  }
}

function confirmQuit() {
  quitDialog = true;
  return new Promise(resolve => { window.confirmQuitResolve = resolve; });
}

function mousePressed() {
  if (selectingClass) {
    let x = WIDTH / 2 - 250, w = 500, h = 60;
    if (mouseX > x && mouseX < x + w) {
      if (mouseY > HEIGHT / 4 && mouseY < HEIGHT / 4 + h) {
        player = new BrianTheBarbarian(WIDTH / 2, HEIGHT / 2);
        selectingClass = false;
        gameRunning = true;
      } else if (mouseY > HEIGHT / 4 + 100 && mouseY < HEIGHT / 4 + 160) {
        player = new RichardTheRogue(WIDTH / 2, HEIGHT / 2);
        selectingClass = false;
        gameRunning = true;
      } else if (mouseY > HEIGHT / 4 + 200 && mouseY < HEIGHT / 4 + 260) {
        player = new AndersonTheNecromancer(WIDTH / 2, HEIGHT / 2);
        selectingClass = false;
        gameRunning = true;
      } else if (mouseY > HEIGHT / 4 + 300 && mouseY < HEIGHT / 4 + 360) {
        player = new JeffTheMage(WIDTH / 2, HEIGHT / 2);
        selectingClass = false;
        gameRunning = true;
      } else if (mouseY > HEIGHT - 100 && mouseY < HEIGHT - 40) window.close();
    }
  } else if (gameRunning && !paused && !gameOver) {
    leftHeld = true;
    let mousePos = [mouseX, mouseY];
    let closestEnemy = enemies.reduce((min, e) => {
      let d = Math.hypot(e.x - mousePos[0], e.y - mousePos[1]);
      return (e.isAlive && d < min.dist) ? { enemy: e, dist: d } : min;
    }, { enemy: null, dist: Infinity }).enemy;
    if (closestEnemy && Math.hypot(closestEnemy.x - mousePos[0], closestEnemy.y - mousePos[1]) < closestEnemy.radius + 10) {
      player.lockedEnemy = closestEnemy;
      player.targetPos = [closestEnemy.x, closestEnemy.y];
    } else {
      player.targetPos = mousePos;
      player.lockedEnemy = null;
    }
    if (player.skillPoints > 0 && mouseX > 10 && mouseX < 50 && mouseY > HEIGHT - 60 && mouseY < HEIGHT - 20) paused = true;
  } else if (paused && !quitDialog) {
    spellbox.forEach(btn => {
      if (mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h) {
        if (player.skillPoints > 0 && player.skillLevels[btn.action] < 10) {
          player.skillLevels[btn.action]++;
          player.skillPoints--;
          console.log(`${player.name} upgraded ${btn.action} to level ${player.skillLevels[btn.action]}`);
        }
      }
    });

    if (mouseX > respecbox.x && mouseX < respecbox.x + respecbox.w && mouseY > respecbox.y && mouseY < respecbox.y + respecbox.h) {
      let totalPoints = player.skillLevels.skill1 + player.skillLevels.skill2 + player.skillLevels.skill3 + player.skillLevels.skill4;
      player.skillLevels = { skill1: 0, skill2: 0, skill3: 0, skill4: 0 };
      player.skillPoints += totalPoints;
      player.warcryTimer = 0;
      player.warcryBoost = 0;
      player.warcryHpMult = 1.0;
      player.updateStats();
      if (player instanceof AndersonTheNecromancer) player.skeletons = [];
      if (player instanceof RichardTheRogue) sentries = [];
      console.log(`${player.name} respecced skills, regained ${totalPoints} skill points`);
    }

    if (mouseX > quitbox.x && mouseX < quitbox.x + quitbox.w && mouseY > quitbox.y && mouseY < quitbox.y + quitbox.h) confirmQuit();

    potbox.forEach(btn => {
      if (mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h) {
        if (btn.action === "hp") player.usePotion("hp");
        else if (btn.action === "mp") player.usePotion("mp");
      }
    });
  } else if (quitDialog) {
    if (mouseX > WIDTH / 2 - 75 && mouseX < WIDTH / 2 - 25 && mouseY > HEIGHT - 60 && mouseY < HEIGHT - 20) {
      window.confirmQuitResolve(true);
      quitDialog = false;
      selectingClass = true;
      gameRunning = false;
      enemies = []; potions = []; arrows = []; bolts = []; sentries = []; fireWalls = []; tornadoes = []; spawnTimer = 0;
    } else if (mouseX > WIDTH / 2 + 25 && mouseX < WIDTH / 2 + 75 && mouseY > HEIGHT - 60 && mouseY < HEIGHT - 20) {
      window.confirmQuitResolve(false);
      quitDialog = false;
    }
  } else if (gameOver) {
    if (mouseX > WIDTH / 2 - 120 && mouseX < WIDTH / 2 - 20 && mouseY > HEIGHT / 2 + 20 && mouseY < HEIGHT / 2 + 60) {
      player.isAlive = true;
      player.hp = player.maxHp;
      player.mp = player.maxMp;
      enemies = [];
      potions = [];
      arrows = [];
      bolts = [];
      sentries = [];
      fireWalls = [];
      tornadoes = [];
      gameRunning = true;
      gameOver = false;
    } else if (mouseX > WIDTH / 2 + 20 && mouseX < WIDTH / 2 + 120 && mouseY > HEIGHT / 2 + 20 && mouseY < HEIGHT / 2 + 60) {
      selectingClass = true;
      gameRunning = false;
      gameOver = false;
      enemies = [];
      potions = [];
      arrows = [];
      bolts = [];
      sentries = [];
      fireWalls = [];
      tornadoes = [];
    }
  }
}

function mouseReleased() {
  if (gameRunning && !paused && !gameOver) leftHeld = false;
}

function keyPressed() {
  if (keyCode === ESCAPE) {
    if (gameRunning && !gameOver && !quitDialog) paused = !paused;
    else if (quitDialog) {
      window.confirmQuitResolve(false);
      quitDialog = false;
    }
  } else if (gameRunning && !paused && !gameOver) {
    let targets = enemies.filter(e => e.isAlive).concat(player.skeletons || []);
    if (keyIsDown(51) && player.skillLevels["skill1"] > 0 && spellCooldown === 0) { // '3'
      let damage = player.skill1(targets, [mouseX, mouseY]);
      if (damage || damage === true) spellCooldown = Math.round(60 / player.castSpeed);
    }
    if (keyIsDown(52) && player.skillLevels["skill2"] > 0 && spellCooldown === 0) { // '4'
      let damage = player.skill2(targets, [mouseX, mouseY]);
      if (damage && player instanceof BrianTheBarbarian && player.skillLevels["skill4"] > 0 && random() < 0.15) {
        let closest = targets.reduce((min, t) => {
          let d = Math.hypot(t.x - mouseX, t.y - mouseY);
          return (t.isAlive && d < min.dist) ? { target: t, dist: d } : min;
        }, { target: null, dist: Infinity }).target;
        if (closest) tornadoes.push(new Tornado(closest.x, closest.y, player.skillLevels["skill4"], player.strength));
      }
      if (damage) spellCooldown = Math.round(60 / player.castSpeed);
    }
    if (keyIsDown(69) && player.skillLevels["skill3"] > 0 && spellCooldown === 0) { // 'e'
      let damage = player.skill3(targets, [mouseX, mouseY]);
      if (damage && player instanceof BrianTheBarbarian && player.skillLevels["skill4"] > 0 && random() < 0.15) {
        let closest = targets.reduce((min, t) => {
          let d = Math.hypot(t.x - mouseX, t.y - mouseY);
          return (t.isAlive && d < min.dist) ? { target: t, dist: d } : min;
        }, { target: null, dist: Infinity }).target;
        if (closest) tornadoes.push(new Tornado(closest.x, closest.y, player.skillLevels["skill4"], player.strength));
      }
      if (damage) spellCooldown = Math.round(60 / player.castSpeed);
    }
    if (keyIsDown(82) && player.skillLevels["skill4"] > 0 && spellCooldown === 0) { // 'r'
      let damage = player.skill4(targets, [mouseX, mouseY]);
      if (damage || damage === true) spellCooldown = Math.round(60 / player.castSpeed);
    }
    if (key === '1') player.usePotion("hp");
    if (key === '2') player.usePotion("mp");
  }
}