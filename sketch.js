// Global variables
let WIDTH, HEIGHT;
let backgroundImg;
let player, enemies = [], potions = [], arrows = [], bolts = [], sentries = [], fireWalls = [], tornadoes = [], mysts = [];
let selectingClass = true;
let gameRunning = false;
let paused = false;
let quitDialog = false;
let gameOver = false;
let leftHeld = false;
let attackCooldown = 0;
let spellCooldown = 0;
let spawnTimer = 0;
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

let spellbox = []; // Middle textbox for spell selection
let respecbox = {}; // Respec button
let quitbox = {}; // Quit and change class button
let potbox = []; // HP and MP potion textbox
let attrbox = {}; // Left attributes textbox
let detailbox = {}; // Right spell details textbox

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
    { x: WIDTH / 2 - 150, y: HEIGHT / 2 - 200, w: 300, h: 40, action: "skill1" },
    { x: WIDTH / 2 - 150, y: HEIGHT / 2 - 150, w: 300, h: 40, action: "skill2" },
    { x: WIDTH / 2 - 150, y: HEIGHT / 2 - 100, w: 300, h: 40, action: "skill3" },
    { x: WIDTH / 2 - 150, y: HEIGHT / 2 - 50, w: 300, h: 40, action: "skill4" }
  ];
  respecbox = { x: 3 * WIDTH / 4 - 100, y: HEIGHT / 2 - 100, w: 200, h: 40, action: "respec", color: CYAN };
  quitbox = { x: WIDTH / 2 - 130, y: HEIGHT - 100, w: 260, h: 40, action: "exit", color: YELLOW };
  potbox = [
    { x: 3 * WIDTH / 4 - 100, y: HEIGHT / 2 - 200, w: 200, h: 40, action: "hp", color: RED },
    { x: 3 * WIDTH / 4 - 100, y: HEIGHT / 2 - 150, w: 200, h: 40, action: "mp", color: BLUE }
  ];
  attrbox = { x: WIDTH / 4 - 100, y: HEIGHT / 2 - 250, w: 200, h: 300 };
  detailbox = { x: WIDTH / 4 - 100, y: HEIGHT / 2 + 90, w: WIDTH / 2 + 200, h: 200 };
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
    this.hp = this.baseHp + this.strength * 12;
    this.baseMp = baseMp;
    this.maxMp = this.baseMp + this.intelligence * 5;
    this.mp = this.maxMp;
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
    this.spellHeld = { skill1: false, skill2: false, skill3: false, skill4: false }; // For continuous casting
    this.updateStats();
  }

  updateStats() {
    let prevMaxHp = this.maxHp || this.baseHp + this.strength * 12;
    let newMaxHp = Math.round((this.baseHp + this.strength * 12) * this.warcryHpMult);
    if (this.warcryTimer > 0 && prevMaxHp !== newMaxHp) this.hp = min(newMaxHp, this.hp + (newMaxHp - prevMaxHp));
    else if (this.warcryTimer === 0 && prevMaxHp !== newMaxHp) this.hp = min(newMaxHp, this.hp);
    this.maxHp = newMaxHp;
    this.maxMp = this.baseMp + this.intelligence * 5;
    this.baseAttackPower = this.baseAttack + (this instanceof BrianTheBarbarian ? this.strength : this instanceof RichardTheRogue ? this.agility : this.intelligence) * (1 + this.warcryBoost);
    this.moveSpeed = this.baseMoveSpeed + this.agility * 0.1;
    this.moveSpeed *= (this.vanishTimer > 0 ? 1.5 : 1);
    this.attackSpeed = this.baseAttackSpeed + this.agility * 0.02;
    this.attackSpeed *= (this.vanishTimer > 0 ? 2 : 1);
    this.castSpeed = this.baseCastSpeed + this.agility * 0.02;
    this.mpRegen = this.baseMpRegen + this.intelligence;
    this.hpRegen = 0.5 + this.strength * 0.1;
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
      if (dist > 5) this.move(dx, dy, entities);
      else {
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
    while (this.exp >= this.expToLevel && this.isAlive) this.levelUp();
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
    this.hp = this.maxHp;
    this.mp = this.maxMp;
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

  castSpell(spell, targets, mousePos) {
    if (spellCooldown > 0 || (this.spellAnimation && this.spellAnimation.type === "whirlwind")) return;
    let damage = this[spell](targets, mousePos);
    if (damage || damage === true) spellCooldown = Math.round(60 / this.castSpeed);
  }

  draw() {
    push();
    translate(this.x, this.y);
    if (this.spellAnimation && this.spellAnimation.type === "whirlwind") rotate(this.rotation);
    fill(this.vanishTimer > 0 ? DARK_GRAY.slice(0, 3) : this.color);
    stroke(this.vanishTimer > 0 ? DARK_GRAY.slice(0, 3) : this.color);
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
    this.skillNames = ["War Cry [3]", "Cleave [4]", "Whirlwind [e]", "Devil Dust [r]"];
    this.originalColor = RED.slice();
  }

  skill1(targets, mousePos) {
    let level = this.skillLevels["skill1"];
    if (level === 0) return false;
    let manaCost = 20 + level * 2;
    if (this.mp < manaCost) return false;
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

  skill2(targets, mousePos) {
    let level = this.skillLevels["skill2"];
    if (level === 0) return 0;
    let manaCost = 15 + level * 2;
    if (this.mp < manaCost) return 0;
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
    let damage = 35 + (level - 1) * 7;
    let affectedEnemies = [];
    for (let target of targets) {
      if (Math.hypot(target.x - centerX, target.y - centerY) < 50 && target.isAlive && !affectedEnemies.includes(target)) {
        target.takeDamage(damage * (1 + (target.damageAmplify || 0)));
        affectedEnemies.push(target);
        if (this.skillLevels["skill4"] > 0 && random() < (0.10 + this.skillLevels["skill4"] * 0.05)) {
          tornadoes.push(new Tornado(target.x, target.y, this.skillLevels["skill4"], this.strength));
        }
      }
    }
    this.spellAnimation = { type: "halfCircle", color: RED.slice(), radius: 50, x: centerX, y: centerY, angle: Math.atan2(dy, dx), duration: 6 };
    spellMessage = { text: "Cleave casted", timer: 180 };
    console.log(`${this.name} uses Cleave for ${damage} damage to ${affectedEnemies.length} enemies`);
    return affectedEnemies.length > 0 ? damage : 0;
  }

  skill3(targets, mousePos) {
    let level = this.skillLevels["skill3"];
    if (level === 0) return 0;
    let manaCost = 25 + level * 2;
    if (this.mp < manaCost) return 0;
    this.mp -= manaCost;
    let dx = mousePos[0] - this.x;
    let dy = mousePos[1] - this.y;
    let dist = Math.hypot(dx, dy);
    let damage = 55 + (level - 1) * 10;
    if (dist > 0) {
      dx /= dist;
      dy /= dist;
      this.targetPos = [mousePos[0], mousePos[1]];
      this.spellAnimation = { type: "whirlwind", startX: this.x, startY: this.y, targetX: mousePos[0], targetY: mousePos[1], dx: dx, dy: dy, damage: damage, targets: targets, duration: Math.round(dist / this.moveSpeed), radius: 30 };
      this.rotation = 0;
      spellMessage = { text: "Whirlwind casted", timer: 180 };
      console.log(`${this.name} uses Whirlwind for ${damage} damage/second`);
      return damage;
    }
    return 0;
  }

  skill4(targets, mousePos) { return 0; } // Devil Dust is passive
}

class RichardTheRogue extends Character {
  constructor(x, y, level = 1) {
    super("Richard", x, y, 10, 18, 7, 1, 2, 1, 80, 60, 15, 2.5, 1.0, 1.5, 0.7, level);
    this.color = GREEN.slice();
    this.skillNames = ["Multi-Guided Arrows [3]", "Shadow Step [4]", "Lightning Sentry [e]", "Vanish [r]"];
    this.originalColor = GREEN.slice();
  }

  skill1(targets, mousePos) {
    let level = this.skillLevels["skill1"];
    if (level === 0) return 0;
    let manaCost = 20 + level * 2;
    if (this.mp < manaCost) return 0;
    this.mp -= manaCost;
    let arrowCount = 2 + (level - 1); // 2 at lvl 1, 3 at lvl 2, etc.
    let damagePerArrow = 23 + (level - 1) * 7; // 23 at lvl 1, +7 per level
    let aliveTargets = targets.filter(t => t.isAlive);
    for (let i = 0; i < arrowCount; i++) {
      let dx = mousePos[0] - this.x;
      let dy = mousePos[1] - this.y;
      let dist = Math.hypot(dx, dy);
      if (dist > 0) { dx /= dist; dy /= dist; }
      let target = aliveTargets.length > 0 ? aliveTargets[i % aliveTargets.length] : null;
      arrows.push({
        x: this.x,
        y: this.y,
        dx: dx,
        dy: dy,
        damage: damagePerArrow,
        duration: 300,
        target: target
      });
    }
    spellMessage = { text: "Multi-Guided Arrows casted", timer: 180 };
    console.log(`${this.name} uses Multi-Guided Arrows: ${arrowCount} arrows`);
    return damagePerArrow * arrowCount;
  }

  skill2(targets, mousePos) {
    let level = this.skillLevels["skill2"];
    if (level === 0) return 0;
    let manaCost = 15 + level * 2;
    if (this.mp < manaCost) return 0;
    let closest = targets.reduce((min, t) => {
      let d = Math.hypot(t.x - mousePos[0], t.y - mousePos[1]);
      return (t.isAlive && d < min.dist) ? { target: t, dist: d } : min;
    }, { target: null, dist: Infinity }).target;
    if (!closest || Math.hypot(closest.x - mousePos[0], closest.y - mousePos[1]) >= closest.radius + 10) return 0;
    this.mp -= manaCost;
    let damage = 60 + (level - 1) * 10;
    let dx = closest.x - this.x;
    let dy = closest.y - this.y;
    let dist = Math.hypot(dx, dy);
    if (dist > 0) {
      dx /= dist;
      dy /= dist;
      this.x = closest.x - dx * (closest.radius + this.radius + 5);
      this.y = closest.y - dy * (closest.radius + this.radius + 5);
      this.targetPos = null;
      if (!mysts.some(myst => myst.isInside(this.x, this.y))) this.vanishTimer = 0;
    }
    closest.takeDamage(damage * (1 + (closest.damageAmplify || 0)));
    this.spellAnimation = { type: "circle", color: GREEN.slice(), radius: 30, x: closest.x, y: closest.y, duration: 15 };
    spellMessage = { text: "Shadow Step casted", timer: 180 };
    console.log(`${this.name} uses Shadow Step for ${damage} damage`);
    return damage;
  }

  skill3(targets, mousePos) {
    let level = this.skillLevels["skill3"];
    if (level === 0) return 0;
    let manaCost = 10 + level * 1.5;
    if (this.mp < manaCost) return 0;
    this.mp -= manaCost;
    let damage = 30 + (level - 1) * 10;
    sentries.push(new Sentry(mousePos[0], mousePos[1], damage, targets));
    if (sentries.length > 5) sentries.shift();
    spellMessage = { text: "Lightning Sentry casted", timer: 180 };
    console.log(`${this.name} summons Lightning Sentry`);
    return damage;
  }

  skill4(targets, mousePos) {
    let level = this.skillLevels["skill4"];
    if (level === 0) return false;
    let manaCost = 40 + (level - 1) * 3;
    if (this.mp < manaCost) return false;
    this.mp -= manaCost;
    let duration = (3 + (level - 1) * 0.3) * 60;
    let radius = 150;
    mysts.push(new Myst(this.x, this.y, radius, duration));
    if (mysts.length > 1) mysts.shift();
    this.vanishTimer = duration;
    spellMessage = { text: "Vanish casted", timer: 180 };
    console.log(`${this.name} uses Vanish: Myst for ${(3 + (level - 1) * 0.3).toFixed(1)} sec`);
    return true;
  }
}

class AndersonTheNecromancer extends Character {
  constructor(x, y, level = 1) {
    super("Anderson", x, y, 6, 8, 16, 1, 1, 2, 90, 80, 10, 2.0, 1.0, 1.5, 1.0, level);
    this.color = BLUE.slice();
    this.skillNames = ["Poison Nova [3]", "Bone Spear [4]", "Raise Skeleton [e]", "Amplify Damage [r]"];
    this.originalColor = BLUE.slice();
  }

  skill1(targets, mousePos) {
    let level = this.skillLevels["skill1"];
    if (level === 0) return 0;
    let manaCost = 20 + level * 2;
    if (this.mp < manaCost) return 0;
    this.mp -= manaCost;
    let dps = 15 + (level - 1) * 5;
    let radius = 100 + (level - 1) * 10;
    let castX = this.x;
    let castY = this.y;
    let anim = { type: "poisonNova", x: castX, y: castY, dps: dps, duration: 60, targets: targets, radius: radius };
    for (let i = 0; i < 50; i++) {
      let angle = (i / 50) * TWO_PI;
      bolts.push({ 
        type: "poisonNova", 
        x: castX, 
        y: castY, 
        dx: cos(angle) * 2, 
        dy: sin(angle) * 2, 
        damage: dps, 
        duration: 240, 
        radius: radius, 
        castX: castX, 
        castY: castY,
        hitEnemies: []
      });
    }
    this.spellAnimation = anim;
    spellMessage = { text: "Poison Nova casted", timer: 180 };
    console.log(`${this.name} uses Poison Nova`);
    return dps;
  }

  skill2(targets, mousePos) {
    let level = this.skillLevels["skill2"];
    if (level === 0) return 0;
    let manaCost = 15 + level * 2;
    if (this.mp < manaCost) return 0;
    this.mp -= manaCost;
    let damage = 35 + (level - 1) * 7;
    let dx = mousePos[0] - this.x;
    let dy = mousePos[1] - this.y;
    let dist = Math.hypot(dx, dy);
    if (dist > 0) {
      dx /= dist;
      dy /= dist;
      bolts.push({ type: "boneSpear", x: this.x, y: this.y, dx: dx, dy: dy, damage: damage, duration: 300, piercing: true, hitEnemies: [] });
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
    if (this.mp < manaCost) return false;
    this.mp -= manaCost;
    let maxSkeletons = level;
    let skeletonHp = 120 + (level - 1) * 20;
    let skeletonDmg = 30 + (level - 1) * 5;
    while (this.skeletons.length >= maxSkeletons) this.skeletons.shift();
    this.skeletons.push(new Skeleton(mousePos[0], mousePos[1], skeletonHp, skeletonDmg));
    spellMessage = { text: "Raise Skeleton casted", timer: 180 };
    console.log(`${this.name} raises a skeleton (HP: ${skeletonHp}, Dmg: ${skeletonDmg.toFixed(1)}) at cursor`);
    return true;
  }

  skill4(targets, mousePos) {
    let level = this.skillLevels["skill4"];
    if (level === 0) return false;
    let manaCost = 25 + level * 2;
    if (this.mp < manaCost) return false;
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
}

class JeffTheMage extends Character {
  constructor(x, y, level = 1) {
    super("Jeff", x, y, 5, 7, 20, 1, 1, 2, 70, 100, 10, 2.0, 1.0, 2.0, 1.2, level);
    this.color = [139, 69, 19];
    this.skillNames = ["Charged Bolt [3]", "Nova [4]", "Blizzard [e]", "Fire Wall [r]"];
    this.originalColor = [139, 69, 19];
  }

  skill1(targets, mousePos) {
    let level = this.skillLevels["skill1"];
    if (level === 0) return 0;
    let manaCost = 20 + level * 2;
    if (this.mp < manaCost) return 0;
    this.mp -= manaCost;
    let boltCount = 4 + (level - 1) * 1;
    let damage = 15 + (level - 1) * 5;
    let dx = mousePos[0] - this.x;
    let dy = mousePos[1] - this.y;
    let dist = Math.hypot(dx, dy);
    if (dist > 0) {
      dx /= dist;
      dy /= dist;
      let anim = { type: "chargedBolt", x: this.x, y: this.y, dx: dx, dy: dy, count: boltCount, damage: damage, targets: targets, duration: 60 };
      this.spellAnimation = anim;
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
    if (this.mp < manaCost) return 0;
    this.mp -= manaCost;
    let damage = 30 + (level - 1) * 5;
    this.spellAnimation = { type: "nova", frame: 0, damage: damage, x: this.x, y: this.y, maxRadius: 200, targets: targets, color: WHITE };
    spellMessage = { text: "Nova casted", timer: 180 };
    console.log(`${this.name} uses Nova for ${damage} damage`);
    return damage;
  }

  skill3(targets, mousePos) {
    let level = this.skillLevels["skill3"];
    if (level === 0) return 0;
    let manaCost = 30 + (level - 1) * 5;
    if (this.mp < manaCost) return 0;
    this.mp -= manaCost;
    let damagePerSecond = 30 + (level - 1) * 5;
    let slow = 0.50 + (level - 1) * 0.03;
    fireWalls.push({
      type: "blizzard",
      color: [0, 0, 255, 128],
      size: 150,
      x: mousePos[0],
      y: mousePos[1],
      duration: 240, // 4 seconds
      damage: damagePerSecond / 60, // Damage per frame
      slow: slow,
      targets: targets
    });
    let blizzards = fireWalls.filter(f => f.type === "blizzard");
    if (blizzards.length > 2) fireWalls.splice(fireWalls.indexOf(blizzards[0]), 1);
    spellMessage = { text: "Blizzard casted", timer: 180 };
    console.log(`${this.name} uses Blizzard for ${damagePerSecond} damage per second`);
    return damagePerSecond * 4; // Total damage over duration
  }

  skill4(targets, mousePos) {
    let level = this.skillLevels["skill4"];
    if (level === 0) return 0;
    let manaCost = 30 + level * 2;
    if (this.mp < manaCost) return 0;
    this.mp -= manaCost;
    let damage = 60 + (level - 1) * 10;
    let dx = mousePos[0] - this.x;
    let dy = mousePos[1] - this.y;
    let angle = Math.atan2(dy, dx) + PI / 2;
    fireWalls.push({ type: "fireWall", x: mousePos[0], y: mousePos[1], angle: angle, damage: damage, duration: 5 * 60, width: 0, maxWidth: 300, height: 60, targets: targets });
    if (fireWalls.filter(f => f.type === "fireWall").length > 3) fireWalls.splice(fireWalls.findIndex(f => f.type === "fireWall"), 1);
    spellMessage = { text: "Fire Wall casted", timer: 180 };
    console.log(`${this.name} uses Fire Wall for ${damage} DPS`);
    return damage;
  }
}

class Myst {
  constructor(x, y, radius, duration) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.duration = duration;
  }

  update() {
    this.duration--;
    return this.duration > 0;
  }

  draw() {
    fill(LIGHT_GRAY);
    ellipse(this.x, this.y, this.radius * 2);
  }

  isInside(x, y) {
    return Math.hypot(x - this.x, y - this.y) < this.radius;
  }
}
// Main game loop function
function playGame() {
  if (backgroundImg) image(backgroundImg, 0, 0, WIDTH, HEIGHT);
  else background(0);

  let entities = enemies.concat(player.skeletons || []).concat([player]);
  let isWhirlwind = player.spellAnimation && player.spellAnimation.type === "whirlwind";

  if (!isWhirlwind && leftHeld && attackCooldown === 0 && player.lockedEnemy && player.lockedEnemy.isAlive) {
    let dist = Math.hypot(player.lockedEnemy.x - player.x, player.lockedEnemy.y - player.y);
    if (dist <= player.meleeRange) {
      let damage = player.baseAttackPower * (1 + (player.lockedEnemy.damageAmplify || 0));
      player.lockedEnemy.takeDamage(damage);
      if (player instanceof BrianTheBarbarian && player.skillLevels["skill4"] > 0 && random() < (0.10 + (player.skillLevels["skill4"] - 1) * 0.05)) {
        tornadoes.push(new Tornado(player.lockedEnemy.x, player.lockedEnemy.y, player.skillLevels["skill4"], player.strength));
      }
      if (player.vanishTimer > 0 && player.lockedEnemy.isAlive) player.lockedEnemy.fleeTarget = player;
      console.log(`${player.name} attacks for ${damage} damage`);
      attackCooldown = Math.round(60 / player.attackSpeed);
      attackAnimations.push({ x: player.lockedEnemy.x, y: player.lockedEnemy.y, duration: 6, symbol: "/" });
    } else {
      player.targetPos = [player.lockedEnemy.x, player.lockedEnemy.y];
    }
  } else if (!isWhirlwind && leftHeld && !player.lockedEnemy) {
    player.targetPos = [mouseX, mouseY];
  }
  player.moveToTarget(entities);

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

  mysts = mysts.filter(myst => myst.update());
  let inMyst = mysts.some(myst => myst.isInside(player.x, player.y));
  if (inMyst && player instanceof RichardTheRogue) {
    player.vanishTimer = max(player.vanishTimer, mysts.find(myst => myst.isInside(player.x, player.y)).duration);
  } else if (!inMyst && player.vanishTimer > 0) {
    player.vanishTimer = 0;
  }
  player.updateStats();
  mysts.forEach(myst => myst.draw());

  potions = potions.filter(potion => {
    if (Math.hypot(potion.x - player.x, potion.y - player.y) < player.radius + potion.radius && potion.pickup(player)) return false;
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

  enemies = enemies.filter(enemy => {
    if (enemy.isAlive) {
      let target = player.vanishTimer > 0 ? null : (player.skeletons?.length > 0 ? player.skeletons.concat([player]).reduce((min, t) => {
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
      } else if (player.vanishTimer > 0) {
        enemy.wander(entities);
      }
      enemy.attackCooldown = max(0, enemy.attackCooldown - 1);
      enemy.update();
      enemy.fleeTarget = null;
      return true;
    } else {
      player.gainExp(1);
      if (random(0, 100) < 20) potions.push(new Potion(enemy.x, enemy.y, random(0, 1) < 0.5 ? "hp" : "mp"));
      return false;
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

  if (player.isAlive) {
    if (isWhirlwind && player.spellAnimation) {
      player.rotation += PI / 6;
      for (let enemy of enemies) {
        if (enemy.isAlive && Math.hypot(enemy.x - player.x, enemy.y - player.y) < player.spellAnimation.radius + enemy.radius) {
          let damage = player.spellAnimation.damage / 60;
          enemy.takeDamage(damage);
          if (player instanceof BrianTheBarbarian && player.skillLevels["skill4"] > 0 && random() < (0.10 + (player.skillLevels["skill4"] - 1) * 0.05)) {
            tornadoes.push(new Tornado(enemy.x, enemy.y, player.skillLevels["skill4"], player.strength));
          }
        }
      }
    }
    player.draw();
  }

  let mousePos = [mouseX, mouseY];
  enemies.forEach(enemy => enemy.draw());
  sentries = sentries.filter(sentry => {
    if (sentry.active) {
      sentry.targets = enemies.filter(e => e.isAlive);
      sentry.draw();
      bolts = bolts.concat(sentry.update());
      return true;
    }
    return false;
  });

  fireWalls = fireWalls.filter(fw => {
    if (fw.type === "fireWall") {
      fw.width = min(fw.width + 10, fw.maxWidth);
      push();
      translate(fw.x, fw.y);
      rotate(fw.angle);
      fill(ORANGE.concat(128));
      rect(-fw.width / 2, -fw.height / 2, fw.width, fw.height);
      pop();
      fw.targets = enemies.filter(e => e.isAlive);
      for (let enemy of fw.targets) {
        let dx = enemy.x - fw.x;
        let dy = enemy.y - fw.y;
        let rotatedX = dx * cos(-fw.angle) - dy * sin(-fw.angle);
        let rotatedY = dx * sin(-fw.angle) + dy * cos(-fw.angle);
        if (enemy.isAlive && abs(rotatedX) < fw.width / 2 + enemy.radius && abs(rotatedY) < fw.height / 2 + enemy.radius) {
          enemy.takeDamage(fw.damage / 60);
        }
      }
      fw.duration--;
      return fw.duration > 0;
    } else if (fw.type === "blizzard") {
      fill(fw.color);
      rect(fw.x - fw.size / 2, fw.y - fw.size / 2, fw.size, fw.size);
      fw.targets = enemies.filter(e => e.isAlive);
      for (let enemy of fw.targets) {
        if (enemy.isAlive && Math.hypot(enemy.x - fw.x, enemy.y - fw.y) < fw.size / 2 + enemy.radius) {
          enemy.takeDamage(fw.damage);
          enemy.slowEffect = fw.slow;
          enemy.chilledTimer = 120; // 2 seconds
          enemy.color = BLUE.slice();
        } else if (enemy.chilledTimer > 0) {
          enemy.chilledTimer--;
          if (enemy.chilledTimer <= 0) {
            enemy.slowEffect = 0;
            enemy.color = enemy.originalColor.slice();
          }
        }
      }
      fw.duration--;
      return fw.duration > 0;
    }
    return false;
  });

  tornadoes = tornadoes.filter(t => {
    t.update(enemies);
    t.draw();
    return t.duration > 0;
  });

  arrows = arrows.filter(arrow => {
    let aliveEnemies = enemies.filter(e => e.isAlive);
    if (aliveEnemies.length > 0 && arrow.target && arrow.target.isAlive) {
      let dx = arrow.target.x - arrow.x;
      let dy = arrow.target.y - arrow.y;
      let dist = Math.hypot(dx, dy);
      if (dist > 5) {
        dx /= dist;
        dy /= dist;
        arrow.dx = dx;
        arrow.dy = dy;
      }
    }
    arrow.x += arrow.dx * 5;
    arrow.y += arrow.dy * 5;
    arrow.duration--;

    let hitEnemy = enemies.find(enemy => enemy.isAlive && Math.hypot(enemy.x - arrow.x, enemy.y - arrow.y) < enemy.radius + 5);
    if (hitEnemy) {
      hitEnemy.takeDamage(arrow.damage * (1 + (hitEnemy.damageAmplify || 0)));
      if (player.vanishTimer > 0) hitEnemy.fleeTarget = player;
      return false;
    }
    push();
    translate(arrow.x, arrow.y);
    rotate(Math.atan2(arrow.dy, arrow.dx));
    stroke(BLACK);
    fill(BLACK);
    beginShape();
    vertex(0, 0);
    vertex(-10, -3);
    vertex(-10, 3);
    endShape(CLOSE);
    line(0, 0, 10, 0); // Arrow shaft
    pop();
    return arrow.duration > 0 && arrow.x > 0 && arrow.x < WIDTH && arrow.y > 0 && arrow.y < HEIGHT;
  });

  bolts = bolts.filter(bolt => {
    if (bolt.type === "chargedBolt") {
      bolt.dx += random(-0.1, 0.1);
      bolt.dy += random(-0.1, 0.1);
      let dist = Math.hypot(bolt.dx, bolt.dy);
      if (dist > 0) { bolt.dx /= dist; bolt.dy /= dist; }
    }
    bolt.x += bolt.dx * (bolt.type === "fireBolt" ? 5.625 : bolt.type === "chargedBolt" ? 2 : bolt.type === "sentryBolt" ? 5 : bolt.type === "poisonNova" ? 2 : 10);
    bolt.y += bolt.dy * (bolt.type === "fireBolt" ? 5.625 : bolt.type === "chargedBolt" ? 2 : bolt.type === "sentryBolt" ? 5 : bolt.type === "poisonNova" ? 2 : 10);
    bolt.duration--;
    for (let fw of fireWalls) {
      if (fw.type === "fireWall" && bolt.type === "chargedBolt") {
        let rotatedBolt = { x: bolt.x - fw.x, y: bolt.y - fw.y };
        let cosA = cos(-fw.angle), sinA = sin(-fw.angle);
        let rx = rotatedBolt.x * cosA - rotatedBolt.y * sinA;
        let ry = rotatedBolt.x * sinA + rotatedBolt.y * cosA;
        if (rx > -fw.width / 2 && rx < fw.width / 2 && ry > -fw.height / 2 && ry < fw.height / 2) {
          bolt.type = "fireBolt";
          bolt.damage *= 1.5;
        }
      }
    }
    if (bolt.piercing || bolt.type === "sentryBolt" || bolt.type === "poisonNova") {
      if (!bolt.hitEnemies) bolt.hitEnemies = [];
      enemies.forEach(enemy => {
        if (enemy.isAlive && Math.hypot(enemy.x - bolt.x, enemy.y - bolt.y) < enemy.radius + 5 && !bolt.hitEnemies.includes(enemy)) {
          if (bolt.type === "poisonNova") {
            enemy.poisonTimer = 240;
            enemy.poisonDps = bolt.damage;
            enemy.color = GREEN.slice();
          } else {
            enemy.takeDamage(bolt.damage * (1 + (enemy.damageAmplify || 0)));
            if (bolt.type === "boneSpear" && player.vanishTimer > 0) enemy.fleeTarget = player;
          }
          bolt.hitEnemies.push(enemy);
        }
      });
    } else {
      let hitEnemy = enemies.find(enemy => enemy.isAlive && Math.hypot(enemy.x - bolt.x, enemy.y - bolt.y) < enemy.radius + 5);
      if (hitEnemy) {
        hitEnemy.takeDamage(bolt.damage * (1 + (hitEnemy.damageAmplify || 0)));
        if (player.vanishTimer > 0) hitEnemy.fleeTarget = player;
        return false;
      }
    }
    push();
    translate(bolt.x, bolt.y);
    rotate(Math.atan2(bolt.dy, bolt.dx));
    stroke(bolt.type === "fireBolt" ? [139, 0, 0] : bolt.type === "sentryBolt" ? WHITE : bolt.type === "poisonNova" ? GREEN : bolt.type === "boneSpear" ? BLACK : WHITE);
    strokeWeight(bolt.type === "sentryBolt" ? 2 : 1);
    if (bolt.type === "boneSpear") {
      line(0, 0, -30, 0); // 3x longer
      line(-30, 0, -45, -3);
      line(-30, 0, -45, 3);
    } else if (bolt.type === "poisonNova") {
      fill(GREEN);
      beginShape();
      vertex(5, 0);
      vertex(-5, -3);
      vertex(-5, 3);
      endShape(CLOSE);
      stroke(GREEN);
      for (let i = 1; i <= 5; i++) {
        let offset = sin(frameCount * 0.1 + i) * 2;
        line(-5 - i * 3, offset, -5 - (i - 1) * 3, -offset);
      }
    } else if (bolt.type === "chargedBolt") {
      stroke(WHITE);
      beginShape();
      vertex(0, 0);
      vertex(3, -3);
      vertex(-3, -6);
      vertex(3, -9);
      vertex(-3, -12);
      endShape();
    } else {
      line(0, 0, bolt.type === "sentryBolt" ? 10 : -10, 0);
    }
    strokeWeight(1);
    pop();
    let poisonNovaDist = (bolt.type === "poisonNova") ? Math.hypot(bolt.x - bolt.castX, bolt.y - bolt.castY) : Infinity;
    return bolt.duration > 0 && bolt.x > 0 && bolt.x < WIDTH && bolt.y > 0 && bolt.y < HEIGHT && (bolt.type !== "poisonNova" || poisonNovaDist < bolt.radius);
  });

  if (player.spellAnimation && player.spellAnimation.type !== "whirlwind") {
    if (player.spellAnimation.type === "circle") {
      fill(player.spellAnimation.color);
      ellipse(player.spellAnimation.x, player.spellAnimation.y, player.spellAnimation.radius * 2);
      player.spellAnimation.duration--;
      if (player.spellAnimation.duration <= 0) player.spellAnimation = null;
    } else if (player.spellAnimation.type === "halfCircle") {
      noFill();
      stroke(player.spellAnimation.color);
      arc(player.spellAnimation.x, player.spellAnimation.y, player.spellAnimation.radius * 2, player.spellAnimation.radius * 2, player.spellAnimation.angle - HALF_PI, player.spellAnimation.angle + HALF_PI);
      player.spellAnimation.duration--;
      if (player.spellAnimation.duration <= 0) player.spellAnimation = null;
    }
  }

  attackAnimations = attackAnimations.filter(anim => {
    let enemyExists = enemies.some(e => e.isAlive && Math.hypot(e.x - anim.x, e.y - anim.y) < e.radius);
    if (enemyExists || anim.duration > 0) {
      stroke(WHITE);
      strokeWeight(2);
      textSize(20);
      text(anim.symbol || "/", anim.x, anim.y);
      anim.duration--;
      return anim.duration > 0;
    }
    return false;
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
    text(spellMessage.text, WIDTH / 2, HEIGHT / 8);
    spellMessage.timer--;
  }

  if (!player.isAlive && !gameOver) gameOver = true;
}

class Enemy {
  constructor(x, y) {
    this.name = "Enemy";
    this.x = x;
    this.y = y;
    this.hp = 50;
    this.maxHp = 50;
    this.baseAttackPower = 10;
    this.radius = 15;
    this.moveSpeed = 1.0;
    this.attackCooldown = 0;
    this.attackDelay = 60;
    this.meleeRange = 30;
    this.isAlive = true;
    this.color = GRAY.slice();
    this.originalColor = GRAY.slice();
    this.fleeTarget = null;
    this.damageAmplify = 0;
    this.amplifyTimer = 0;
    this.poisonTimer = 0;
    this.poisonDps = 0;
    this.slowEffect = 0;
    this.chilledTimer = 0;
  }

  wander(entities) {
    let dx = random(-1, 1);
    let dy = random(-1, 1);
    let dist = Math.hypot(dx, dy);
    if (dist > 0) {
      let speed = this.moveSpeed * (1 - this.slowEffect);
      dx = (dx / dist) * speed;
      dy = (dy / dist) * speed;
      let newX = this.x + dx;
      let newY = this.y + dy;
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
      this.x = constrain(newX, this.radius, WIDTH - this.radius);
      this.y = constrain(newY, this.radius, HEIGHT - this.radius);
    }
  }

  moveToward(target, entities) {
    let dx = target.x - this.x;
    let dy = target.y - this.y;
    let dist = Math.hypot(dx, dy);
    if (dist > this.meleeRange) {
      let speed = this.moveSpeed * (1 - this.slowEffect);
      dx /= dist;
      dy /= dist;
      let newX = this.x + dx * speed;
      let newY = this.y + dy * speed;
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
      this.x = constrain(newX, this.radius, WIDTH - this.radius);
      this.y = constrain(newY, this.radius, HEIGHT - this.radius);
    }
  }

  fleeFrom(target, entities) {
    let dx = this.x - target.x;
    let dy = this.y - target.y;
    let dist = Math.hypot(dx, dy);
    if (dist > 0) {
      let speed = this.moveSpeed * (1 - this.slowEffect);
      dx /= dist;
      dy /= dist;
      let newX = this.x + dx * speed;
      let newY = this.y + dy * speed;
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
      this.x = constrain(newX, this.radius, WIDTH - this.radius);
      this.y = constrain(newY, this.radius, HEIGHT - this.radius);
    }
  }

  attack(target, entities) {
    let dist = Math.hypot(target.x - this.x, target.y - this.y);
    if (this.attackCooldown <= 0 && dist < this.meleeRange) {
      let damage = this.baseAttackPower * (1 + (target.damageAmplify || 0));
      target.takeDamage(damage);
      this.attackCooldown = this.attackDelay;
      attackAnimations.push({ x: target.x, y: target.y, duration: 6, symbol: target instanceof Character ? "#" : "/" });
      return damage;
    } else if (dist >= this.meleeRange && !this.fleeTarget) {
      this.moveToward(target, entities);
    }
    return 0;
  }

  takeDamage(damage) {
    this.hp -= damage;
    if (this.hp <= 0) { this.hp = 0; this.isAlive = false; }
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
    if (this.chilledTimer > 0) {
      this.chilledTimer--;
      if (this.chilledTimer <= 0) {
        this.slowEffect = 0;
        this.color = this.originalColor.slice();
      }
    }
  }

  draw() {
    push();
    translate(this.x, this.y);
    fill(this.color);
    ellipse(0, -5, 10, 8);
    rect(-5, 0, 10, 10);
    line(-5, 5, -10, 10);
    line(5, 5, 10, 10);
    line(-3, 10, -5, 15);
    line(3, 10, 5, 15);
    pop();
    fill(RED);
    rect(this.x - 15, this.y - 20, (this.hp / this.maxHp) * 30, 5);
    if (this.amplifyTimer > 0) {
      fill(PURPLE);
      textSize(12);
      text("*", this.x - 5, this.y - 30);
    }
    if (this.slowEffect > 0) {
      fill(CYAN);
      textSize(12);
      text("Chilled", this.x - 5, this.y - 40);
    }
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
    this.attackDelay = 60;
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
    ellipse(0, 0, 12, 10);
    fill(BLACK);
    ellipse(-3, -2, 3, 3);
    ellipse(3, -2, 3, 3);
    rect(-2, 2, 4, 2);
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
          newBolts.push({ x: this.x, y: this.y, dx: dx, dy: dy, damage: this.damage, duration: 60, piercing: true, type: "sentryBolt", hitEnemies: [] });
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
    this.damage = 15 + (level - 1) * 5;
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
      if (entity.isAlive && entity !== player && Math.hypot(entity.x - this.x, entity.y - this.y) < this.radius + entity.radius) {
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
// Function to draw the skill upgrade screen
function drawSkillUpgradeScreen() {
  background(BLACK);
  fill(WHITE);
  textSize(24);
  textAlign(CENTER, CENTER);
  text(`${player.name}'s Skill Upgrades`, WIDTH / 2, HEIGHT / 2 - 250);
  textSize(18);
  text(`Skill Points: ${player.skillPoints}`, WIDTH / 2, HEIGHT / 2 - 220);

  fill(BLACK);
  rect(attrbox.x, attrbox.y, attrbox.w, attrbox.h);
  let hoverAttr = mouseX > attrbox.x && mouseX < attrbox.x + attrbox.w;
  fill(hoverAttr && mouseY >= attrbox.y + 85 && mouseY < attrbox.y + 105 ? LIGHT_GRAY : BLACK);
  rect(attrbox.x, attrbox.y + 85, attrbox.w, 20);
  fill(hoverAttr && mouseY >= attrbox.y + 105 && mouseY < attrbox.y + 125 ? LIGHT_GRAY : BLACK);
  rect(attrbox.x, attrbox.y + 105, attrbox.w, 20);
  fill(hoverAttr && mouseY >= attrbox.y + 125 && mouseY < attrbox.y + 145 ? LIGHT_GRAY : BLACK);
  rect(attrbox.x, attrbox.y + 125, attrbox.w, 20);

  stroke(WHITE);
  strokeWeight(2);
  fill(BLACK);
  rect(detailbox.x, detailbox.y, detailbox.w, detailbox.h);
  strokeWeight(1);
  noStroke();

  spellbox.forEach(btn => {
    fill(mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h ? GRAY : WHITE);
    rect(btn.x, btn.y, btn.w, btn.h);
    fill(BLACK);
    text(player.skillNames[spellbox.indexOf(btn)], btn.x + btn.w / 2, btn.y + btn.h / 2);
  });

  fill(mouseX > respecbox.x && mouseX < respecbox.x + respecbox.w && mouseY > respecbox.y && mouseY < respecbox.y + respecbox.h ? LIGHT_GRAY : respecbox.color);
  rect(respecbox.x, respecbox.y, respecbox.w, respecbox.h);
  fill(BLACK);
  text("Respec Skills", respecbox.x + respecbox.w / 2, respecbox.y + respecbox.h / 2);

  fill(mouseX > quitbox.x && mouseX < quitbox.x + quitbox.w && mouseY > quitbox.y && mouseY < quitbox.y + quitbox.h ? LIGHT_GRAY : quitbox.color);
  rect(quitbox.x, quitbox.y, quitbox.w, quitbox.h);
  fill(BLACK);
  text("Quit & Change Class", quitbox.x + quitbox.w / 2, quitbox.y + quitbox.h / 2);

  potbox.forEach(btn => {
    fill(mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h ? LIGHT_GRAY : btn.color);
    rect(btn.x, btn.y, btn.w, btn.h);
    fill(BLACK);
    text(btn.action === "hp" ? `(${player.hpPotions}) HP Pot [1]` : `(${player.mpPotions}) MP Pot [2]`, btn.x + btn.w / 2, btn.y + btn.h / 2);
  });

  fill(WHITE);
  textAlign(LEFT, TOP);
  textSize(12);
  text(`Class: ${player.name}`, attrbox.x + 10, attrbox.y + 5);
  text(`Level: ${player.level}`, attrbox.x + 10, attrbox.y + 25);
  text(`Exp: ${player.exp}/${player.expToLevel}`, attrbox.x + 10, attrbox.y + 45);
  text(`STR: ${player.strength}`, attrbox.x + 10, attrbox.y + 85);
  text(`AGI: ${player.agility}`, attrbox.x + 10, attrbox.y + 105);
  text(`INT: ${player.intelligence}`, attrbox.x + 10, attrbox.y + 125);
  text(`HP: ${Math.round(player.hp)}/${player.maxHp}`, attrbox.x + 10, attrbox.y + 165);
  text(`MP: ${Math.round(player.mp)}/${player.maxMp}`, attrbox.x + 10, attrbox.y + 185);
  text(`Dmg: ${player.baseAttackPower.toFixed(1)}`, attrbox.x + 10, attrbox.y + 205);
  text(`HP Regen: ${player.hpRegen.toFixed(1)}`, attrbox.x + 10, attrbox.y + 225);
  text(`MP Regen: ${player.mpRegen.toFixed(1)}`, attrbox.x + 10, attrbox.y + 245);
  text(`ATK Spd: ${player.attackSpeed.toFixed(2)}`, attrbox.x + 10, attrbox.y + 265);
  text(`Cast Spd: ${player.castSpeed.toFixed(2)}`, attrbox.x + 10, attrbox.y + 285);

  let hoveredItem = null;
  spellbox.concat(potbox).forEach(btn => {
    if (mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h) hoveredItem = btn.action;
  });

  let details = {};
  if (hoveredItem) {
    if (hoveredItem === "hp") details[hoveredItem] = [`HP Potion (Level 0)`, `Restores HP`, [`Restores: ${50 + player.strength * 2}`, `Max Potions: 10`]];
    else if (hoveredItem === "mp") details[hoveredItem] = [`MP Potion (Level 0)`, `Restores MP`, [`Restores: ${30 + player.intelligence * 1.5}`, `Max Potions: 10`]];
    else {
      details = player instanceof BrianTheBarbarian ? {
        "skill1": [`War Cry (Level ${player.skillLevels["skill1"]})`, `Boosts damage and HP temporarily`, [
          `Increase Dmg: ${player.skillLevels["skill1"] === 0 ? "" : `+${Math.round((0.2 + player.skillLevels["skill1"] * 0.02) * 100)}%`}${player.skillLevels["skill1"] < 10 ? ` (${Math.round((0.2 + (player.skillLevels["skill1"] + 1) * 0.02) * 100)}%)` : ""}`,
          `Increase HP: ${player.skillLevels["skill1"] === 0 ? "" : `+${Math.round((0.11 + player.skillLevels["skill1"] * 0.01) * 100)}%`}${player.skillLevels["skill1"] < 10 ? ` (${Math.round((0.11 + (player.skillLevels["skill1"] + 1) * 0.01) * 100)}%)` : ""}`,
          `Duration: ${player.skillLevels["skill1"] === 0 ? "" : `${(8 + player.skillLevels["skill1"] * 0.4).toFixed(1)}s`}${player.skillLevels["skill1"] < 10 ? ` (${(8 + (player.skillLevels["skill1"] + 1) * 0.4).toFixed(1)}s)` : ""}`,
          `Mana: ${player.skillLevels["skill1"] === 0 ? "20" : `${20 + player.skillLevels["skill1"] * 2}`}${player.skillLevels["skill1"] < 10 ? ` (${20 + (player.skillLevels["skill1"] + 1) * 2})` : ""}`
        ]],
        "skill2": [`Cleave (Level ${player.skillLevels["skill2"]})`, `Hits multiple enemies in front`, [
          `Dmg: ${player.skillLevels["skill2"] === 0 ? "35" : `${35 + (player.skillLevels["skill2"] - 1) * 7}`}${player.skillLevels["skill2"] < 10 ? ` (${35 + player.skillLevels["skill2"] * 7})` : ""}`,
          `Mana: ${player.skillLevels["skill2"] === 0 ? "15" : `${15 + player.skillLevels["skill2"] * 2}`}${player.skillLevels["skill2"] < 10 ? ` (${15 + (player.skillLevels["skill2"] + 1) * 2})` : ""}`
        ]],
        "skill3": [`Whirlwind (Level ${player.skillLevels["skill3"]})`, `Spins to damage nearby enemies`, [
          `Dmg/s: ${player.skillLevels["skill3"] === 0 ? "55" : `${55 + (player.skillLevels["skill3"] - 1) * 10}`}${player.skillLevels["skill3"] < 10 ? ` (${55 + player.skillLevels["skill3"] * 10})` : ""}`,
          `Mana: ${player.skillLevels["skill3"] === 0 ? "25" : `${25 + player.skillLevels["skill3"] * 2}`}${player.skillLevels["skill3"] < 10 ? ` (${25 + (player.skillLevels["skill3"] + 1) * 2})` : ""}`
        ]],
        "skill4": [`Devil Dust (Level ${player.skillLevels["skill4"]})`, `Chance to spawn tornadoes on hit`, [
          `Chance: ${player.skillLevels["skill4"] === 0 ? "10%" : `${Math.round((0.10 + (player.skillLevels["skill4"] - 1) * 0.05) * 100)}%`}${player.skillLevels["skill4"] < 10 ? ` (${Math.round((0.10 + player.skillLevels["skill4"] * 0.05) * 100)}%)` : ""}`,
          `Dmg/s: ${player.skillLevels["skill4"] === 0 ? "15" : `${15 + (player.skillLevels["skill4"] - 1) * 5}`}${player.skillLevels["skill4"] < 10 ? ` (${15 + player.skillLevels["skill4"] * 5})` : ""}`,
          `Passive`
        ]]
      } : player instanceof RichardTheRogue ? {
        "skill1": [`Multi-Guided Arrows (Level ${player.skillLevels["skill1"]})`, `Fires multiple homing arrows`, [
          `Arrows: ${player.skillLevels["skill1"] === 0 ? "2" : `${2 + (player.skillLevels["skill1"] - 1)}`}${player.skillLevels["skill1"] < 10 ? ` (${2 + player.skillLevels["skill1"]})` : ""}`,
          `Dmg/Arrow: ${player.skillLevels["skill1"] === 0 ? "23" : `${23 + (player.skillLevels["skill1"] - 1) * 7}`}${player.skillLevels["skill1"] < 10 ? ` (${23 + player.skillLevels["skill1"] * 7})` : ""}`,
          `Mana: ${player.skillLevels["skill1"] === 0 ? "20" : `${20 + player.skillLevels["skill1"] * 2}`}${player.skillLevels["skill1"] < 10 ? ` (${20 + (player.skillLevels["skill1"] + 1) * 2})` : ""}`
        ]],
        "skill2": [`Shadow Step (Level ${player.skillLevels["skill2"]})`, `Teleports to strike an enemy`, [
          `Dmg: ${player.skillLevels["skill2"] === 0 ? "60" : `${60 + (player.skillLevels["skill2"] - 1) * 10}`}${player.skillLevels["skill2"] < 10 ? ` (${60 + player.skillLevels["skill2"] * 10})` : ""}`,
          `Mana: ${player.skillLevels["skill2"] === 0 ? "15" : `${15 + player.skillLevels["skill2"] * 2}`}${player.skillLevels["skill2"] < 10 ? ` (${15 + (player.skillLevels["skill2"] + 1) * 2})` : ""}`
        ]],
        "skill3": [`Lightning Sentry (Level ${player.skillLevels["skill3"]})`, `Summons a piercing turret`, [
          `Dmg/Bolt: ${player.skillLevels["skill3"] === 0 ? "30" : `${30 + (player.skillLevels["skill3"] - 1) * 10}`}${player.skillLevels["skill3"] < 10 ? ` (${30 + player.skillLevels["skill3"] * 10})` : ""}`,
          `Max Traps: 5 Duration: 6s or 6 shots`,
          `Mana: ${player.skillLevels["skill3"] === 0 ? "10" : `${(10 + player.skillLevels["skill3"] * 1.5).toFixed(1)}`}${player.skillLevels["skill3"] < 10 ? ` (${(10 + (player.skillLevels["skill3"] + 1) * 1.5).toFixed(1)})` : ""}`
        ]],
        "skill4": [`Vanish (Level ${player.skillLevels["skill4"]})`, `Creates a myst granting invisibility`, [
          `Duration: ${player.skillLevels["skill4"] === 0 ? "3.0s" : `${(3 + (player.skillLevels["skill4"] - 1) * 0.3).toFixed(1)}s`}${player.skillLevels["skill4"] < 10 ? ` (${(3 + player.skillLevels["skill4"] * 0.3).toFixed(1)}s)` : ""}`,
          `Radius: 150`,
          `Move Speed: +50% Attack Speed: +100%`,
          `Mana: ${player.skillLevels["skill4"] === 0 ? "40" : `${40 + (player.skillLevels["skill4"] - 1) * 3}`}${player.skillLevels["skill4"] < 10 ? ` (${40 + player.skillLevels["skill4"] * 3})` : ""}`
        ]]
      } : player instanceof AndersonTheNecromancer ? {
        "skill1": [`Poison Nova (Level ${player.skillLevels["skill1"]})`, `Releases a ring of poison`, [
          `DPS: ${player.skillLevels["skill1"] === 0 ? "15" : `${15 + (player.skillLevels["skill1"] - 1) * 5}`}${player.skillLevels["skill1"] < 10 ? ` (${15 + player.skillLevels["skill1"] * 5})` : ""}`,
          `Duration: 4s Projectiles: 50`,
          `Radius: ${player.skillLevels["skill1"] === 0 ? "100" : `${100 + (player.skillLevels["skill1"] - 1) * 10}`}${player.skillLevels["skill1"] < 10 ? ` (${100 + player.skillLevels["skill1"] * 10})` : ""}`,
          `Mana: ${player.skillLevels["skill1"] === 0 ? "20" : `${20 + player.skillLevels["skill1"] * 2}`}${player.skillLevels["skill1"] < 10 ? ` (${20 + (player.skillLevels["skill1"] + 1) * 2})` : ""}`
        ]],
        "skill2": [`Bone Spear (Level ${player.skillLevels["skill2"]})`, `Fires a piercing bone projectile`, [
          `Dmg: ${player.skillLevels["skill2"] === 0 ? "35" : `${35 + (player.skillLevels["skill2"] - 1) * 7}`}${player.skillLevels["skill2"] < 10 ? ` (${35 + player.skillLevels["skill2"] * 7})` : ""}`,
          `Mana: ${player.skillLevels["skill2"] === 0 ? "15" : `${15 + player.skillLevels["skill2"] * 2}`}${player.skillLevels["skill2"] < 10 ? ` (${15 + (player.skillLevels["skill2"] + 1) * 2})` : ""}`
        ]],
        "skill3": [`Raise Skeleton (Level ${player.skillLevels["skill3"]})`, `Summons a skeleton to fight`, [
          `Skeletons: ${player.skillLevels["skill3"] === 0 ? "1" : `${player.skillLevels["skill3"]}`}${player.skillLevels["skill3"] < 10 ? ` (${player.skillLevels["skill3"] + 1})` : ""}`,
          `HP: ${player.skillLevels["skill3"] === 0 ? "120" : `${120 + (player.skillLevels["skill3"] - 1) * 20}`}${player.skillLevels["skill3"] < 10 ? ` (${120 + player.skillLevels["skill3"] * 20})` : ""}`,
          `Dmg: ${player.skillLevels["skill3"] === 0 ? "30" : `${30 + (player.skillLevels["skill3"] - 1) * 5}`}${player.skillLevels["skill3"] < 10 ? ` (${30 + player.skillLevels["skill3"] * 5})` : ""}`,
          `Mana: ${player.skillLevels["skill3"] === 0 ? "30" : `${30 + player.skillLevels["skill3"] * 2}`}${player.skillLevels["skill3"] < 10 ? ` (${30 + (player.skillLevels["skill3"] + 1) * 2})` : ""}`
        ]],
        "skill4": [`Amplify Damage (Level ${player.skillLevels["skill4"]})`, `Increases enemy damage taken`, [
          `Dmg+: ${player.skillLevels["skill4"] === 0 ? "100%" : `${Math.round((1.0 + player.skillLevels["skill4"] * 0.1) * 100)}%`}${player.skillLevels["skill4"] < 10 ? ` (${Math.round((1.0 + (player.skillLevels["skill4"] + 1) * 0.1) * 100)}%)` : ""}`,
          `Radius: ${player.skillLevels["skill4"] === 0 ? "150" : `${150 + player.skillLevels["skill4"] * 15}`}${player.skillLevels["skill4"] < 10 ? ` (${150 + (player.skillLevels["skill4"] + 1) * 15})` : ""}`,
          `Duration: ${player.skillLevels["skill4"] === 0 ? "5.0s" : `${(5 + player.skillLevels["skill4"] * 0.6).toFixed(1)}s`}${player.skillLevels["skill4"] < 10 ? ` (${(5 + (player.skillLevels["skill4"] + 1) * 0.6).toFixed(1)}s)` : ""}`,
          `Mana: ${player.skillLevels["skill4"] === 0 ? "25" : `${25 + player.skillLevels["skill4"] * 2}`}${player.skillLevels["skill4"] < 10 ? ` (${25 + (player.skillLevels["skill4"] + 1) * 2})` : ""}`
        ]]
      } : {
        "skill1": [`Charged Bolt (Level ${player.skillLevels["skill1"]})`, `Fires multiple electric bolts`, [
          `Bolts: ${player.skillLevels["skill1"] === 0 ? "4" : `${4 + (player.skillLevels["skill1"] - 1) * 1}`}${player.skillLevels["skill1"] < 10 ? ` (${4 + player.skillLevels["skill1"] * 1})` : ""}`,
          `Dmg/Bolt: ${player.skillLevels["skill1"] === 0 ? "15" : `${15 + (player.skillLevels["skill1"] - 1) * 5}`}${player.skillLevels["skill1"] < 10 ? ` (${15 + player.skillLevels["skill1"] * 5})` : ""}`,
          `Mana: ${player.skillLevels["skill1"] === 0 ? "20" : `${20 + player.skillLevels["skill1"] * 2}`}${player.skillLevels["skill1"] < 10 ? ` (${20 + (player.skillLevels["skill1"] + 1) * 2})` : ""}`
        ]],
        "skill2": [`Nova (Level ${player.skillLevels["skill2"]})`, `Emits a radial shockwave`, [
          `Dmg: ${player.skillLevels["skill2"] === 0 ? "30" : `${30 + (player.skillLevels["skill2"] - 1) * 5}`}${player.skillLevels["skill2"] < 10 ? ` (${30 + player.skillLevels["skill2"] * 5})` : ""}`,
          `Radius: 200`,
          `Mana: ${player.skillLevels["skill2"] === 0 ? "15" : `${15 + player.skillLevels["skill2"] * 2}`}${player.skillLevels["skill2"] < 10 ? ` (${15 + (player.skillLevels["skill2"] + 1) * 2})` : ""}`
        ]],
        "skill3": [`Blizzard (Level ${player.skillLevels["skill3"]})`, `Summons a chilling storm at cursor`, [
          `Dmg/s: ${player.skillLevels["skill3"] === 0 ? "30" : `${30 + (player.skillLevels["skill3"] - 1) * 5}`}${player.skillLevels["skill3"] < 10 ? ` (${30 + player.skillLevels["skill3"] * 5})` : ""}`,
          `Slow: ${player.skillLevels["skill3"] === 0 ? "50%" : `${Math.round((0.50 + (player.skillLevels["skill3"] - 1) * 0.03) * 100)}%`}${player.skillLevels["skill3"] < 10 ? ` (${Math.round((0.50 + player.skillLevels["skill3"] * 0.03) * 100)}%)` : ""}`,
          `Size: 150 Duration: 4s Max Active: 2`,
          `Mana: ${player.skillLevels["skill3"] === 0 ? "30" : `${30 + (player.skillLevels["skill3"] - 1) * 5}`}${player.skillLevels["skill3"] < 10 ? ` (${30 + player.skillLevels["skill3"] * 5})` : ""}`
        ]],
        "skill4": [`Fire Wall (Level ${player.skillLevels["skill4"]})`, `Creates a burning barrier`, [
          `Dmg/s: ${player.skillLevels["skill4"] === 0 ? "60" : `${60 + (player.skillLevels["skill4"] - 1) * 10}`}${player.skillLevels["skill4"] < 10 ? ` (${60 + player.skillLevels["skill4"] * 10})` : ""}`,
          `Max Walls: 3 Duration: 5s`,
          `Mana: ${player.skillLevels["skill4"] === 0 ? "30" : `${30 + player.skillLevels["skill4"] * 2}`}${player.skillLevels["skill4"] < 10 ? ` (${30 + (player.skillLevels["skill4"] + 1) * 2})` : ""}`
        ]]
      };
    }
  } else if (hoverAttr) {
    if (mouseY >= attrbox.y + 85 && mouseY < attrbox.y + 105) details["str"] = player instanceof BrianTheBarbarian ? ["Strength", "Increases HP and damage", ["HP: +12", "Dmg: +1", "HP Regen: +0.1"]] : ["Strength", "Increases HP", ["HP: +12", "HP Regen: +0.1"]];
    else if (mouseY >= attrbox.y + 105 && mouseY < attrbox.y + 125) details["agi"] = player instanceof RichardTheRogue ? ["Agility", "Boosts speed and damage", ["Move Speed: +0.1", "Atk Spd: +0.02", "Cast Spd: +0.02", "Dmg: +1"]] : ["Agility", "Boosts speed", ["Move Speed: +0.1", "Atk Spd: +0.02", "Cast Spd: +0.02"]];
    else if (mouseY >= attrbox.y + 125 && mouseY < attrbox.y + 145) details["int"] = player instanceof JeffTheMage || player instanceof AndersonTheNecromancer ? ["Intelligence", "Enhances MP and damage", ["MP: +5", "MP Regen: +1", "Dmg: +1"]] : ["Intelligence", "Enhances MP", ["MP: +5", "MP Regen: +1"]];
  }

  if (Object.keys(details).length > 0) {
    let key = hoveredItem || Object.keys(details)[0];
    if (details[key]) {
      textSize(18);
      textAlign(CENTER, CENTER);
      let totalLines = details[key][2].length + 2;
      let yOffset = detailbox.y + detailbox.h / 2 - (20 * totalLines) / 2 + 10;
      let xCenter = detailbox.x + detailbox.w / 2;
      fill(WHITE);
      text(details[key][0], xCenter, yOffset);
      yOffset += 20;
      text(details[key][1], xCenter, yOffset);
      yOffset += 20;
      details[key][2].forEach(line => {
        let parts = line.split(/(\([^)]+\))/);
        let currentText = parts[0] || "";
        let nextText = parts[1] || "";
        fill(WHITE);
        text(currentText, xCenter - textWidth(" " + nextText) / 2, yOffset);
        fill(RED);
        text(nextText, xCenter + textWidth(currentText) / 2 + textWidth(" "), yOffset);
        yOffset += 20;
      });
    }
  }
}

// Mouse pressed event handler
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
    let isWhirlwind = player.spellAnimation && player.spellAnimation.type === "whirlwind";
    if (!isWhirlwind) {
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
      player.vanishTimer = 0;
      player.spellAnimation = null;
      player.skeletons = [];
      sentries = [];
      fireWalls = [];
      tornadoes = [];
      mysts = [];
      player.updateStats();
      console.log(`${player.name} respecced skills, regained ${totalPoints} skill points`);
    }

    if (mouseX > quitbox.x && mouseX < quitbox.x + quitbox.w && mouseY > quitbox.y && mouseY < quitbox.y + quitbox.h) quitDialog = true;

    potbox.forEach(btn => {
      if (mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h) {
        if (btn.action === "hp") player.usePotion("hp");
        else if (btn.action === "mp") player.usePotion("mp");
      }
    });
  } else if (quitDialog) {
    if (mouseX > WIDTH / 2 - 75 && mouseX < WIDTH / 2 - 25 && mouseY > HEIGHT - 60 && mouseY < HEIGHT - 20) {
      quitDialog = false;
      selectingClass = true;
      gameRunning = false;
      enemies = []; potions = []; arrows = []; bolts = []; sentries = []; fireWalls = []; tornadoes = []; mysts = []; spawnTimer = 0;
      player.skeletons = [];
      player.warcryTimer = 0;
      player.vanishTimer = 0;
      player.spellAnimation = null;
    } else if (mouseX > WIDTH / 2 + 25 && mouseX < WIDTH / 2 + 75 && mouseY > HEIGHT - 60 && mouseY < HEIGHT - 20) quitDialog = false;
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
      mysts = [];
      player.skeletons = [];
      player.warcryTimer = 0;
      player.vanishTimer = 0;
      player.spellAnimation = null;
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
      mysts = [];
      player.skeletons = [];
      player.warcryTimer = 0;
      player.vanishTimer = 0;
      player.spellAnimation = null;
    }
  }
}

// Mouse released event handler
function mouseReleased() {
  if (gameRunning && !paused && !gameOver) leftHeld = false;
}

// Key pressed event handler
function keyPressed() {
  if (keyCode === ESCAPE) {
    if (gameRunning && !gameOver && !quitDialog) paused = !paused;
    else if (quitDialog) quitDialog = false;
  } else if (gameRunning && !paused && !gameOver) {
    let targets = enemies.filter(e => e.isAlive).concat(player.skeletons || []);
    if (key === '3' && player.skillLevels["skill1"] > 0) {
      player.spellHeld.skill1 = true;
      player.castSpell("skill1", targets, [mouseX, mouseY]);
    }
    if (key === '4' && player.skillLevels["skill2"] > 0) {
      player.spellHeld.skill2 = true;
      player.castSpell("skill2", targets, [mouseX, mouseY]);
    }
    if (key === 'e' && player.skillLevels["skill3"] > 0) {
      player.spellHeld.skill3 = true;
      player.castSpell("skill3", targets, [mouseX, mouseY]);
    }
    if (key === 'r' && player.skillLevels["skill4"] > 0) {
      player.spellHeld.skill4 = true;
      player.castSpell("skill4", targets, [mouseX, mouseY]);
    }
    if (key === '1') player.usePotion("hp");
    if (key === '2') player.usePotion("mp");
  }
}

// Key released event handler
function keyReleased() {
  if (gameRunning && !paused && !gameOver) {
    if (key === '3') player.spellHeld.skill1 = false;
    if (key === '4') player.spellHeld.skill2 = false;
    if (key === 'e') player.spellHeld.skill3 = false;
    if (key === 'r') player.spellHeld.skill4 = false;
  }
}

// Main draw function
function draw() {
  if (selectingClass) {
    background(BLACK);
    fill(WHITE);
    textSize(48);
    textAlign(CENTER, CENTER);
    text("Select Your Class", WIDTH / 2, HEIGHT / 8);
    textSize(24);
    let x = WIDTH / 2 - 250, w = 500, h = 60;
    fill(mouseX > x && mouseX < x + w && mouseY > HEIGHT / 4 && mouseY < HEIGHT / 4 + h ? LIGHT_GRAY : RED);
    rect(x, HEIGHT / 4, w, h);
    fill(BLACK);
    text("Brian The Barbarian", WIDTH / 2, HEIGHT / 4 + 30);
    fill(mouseX > x && mouseX < x + w && mouseY > HEIGHT / 4 + 100 && mouseY < HEIGHT / 4 + 160 ? LIGHT_GRAY : GREEN);
    rect(x, HEIGHT / 4 + 100, w, h);
    fill(BLACK);
    text("Richard The Rogue", WIDTH / 2, HEIGHT / 4 + 130);
    fill(mouseX > x && mouseX < x + w && mouseY > HEIGHT / 4 + 200 && mouseY < HEIGHT / 4 + 260 ? LIGHT_GRAY : BLUE);
    rect(x, HEIGHT / 4 + 200, w, h);
    fill(BLACK);
    text("Anderson The Necromancer", WIDTH / 2, HEIGHT / 4 + 230);
    fill(mouseX > x && mouseX < x + w && mouseY > HEIGHT / 4 + 300 && mouseY < HEIGHT / 4 + 360 ? LIGHT_GRAY : BROWN_GOLD);
    rect(x, HEIGHT / 4 + 300, w, h);
    fill(BLACK);
    text("Jeff The Mage", WIDTH / 2, HEIGHT / 4 + 330);
    fill(mouseX > x && mouseX < x + w && mouseY > HEIGHT - 100 && mouseY < HEIGHT - 40 ? LIGHT_GRAY : YELLOW);
    rect(x, HEIGHT - 100, w, h);
    fill(BLACK);
    text("Exit", WIDTH / 2, HEIGHT - 70);
  } else if (gameRunning && !paused && !quitDialog && !gameOver) {
    playGame();
    let targets = enemies.filter(e => e.isAlive).concat(player.skeletons || []);
    if (player.spellHeld.skill1) player.castSpell("skill1", targets, [mouseX, mouseY]);
    if (player.spellHeld.skill2) player.castSpell("skill2", targets, [mouseX, mouseY]);
    if (player.spellHeld.skill3) player.castSpell("skill3", targets, [mouseX, mouseY]);
    if (player.spellHeld.skill4) player.castSpell("skill4", targets, [mouseX, mouseY]);
  } else if (paused && !quitDialog) {
    drawSkillUpgradeScreen();
  } else if (quitDialog) {
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
    anim.duration--;
    if (anim.duration <= 0) player.spellAnimation = null;
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
        bolts.push({ x: anim.x, y: anim.y, dx: anim.dx, dy: anim.dy, damage: anim.damage, duration: 240, type: "chargedBolt" });
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
  }
}
