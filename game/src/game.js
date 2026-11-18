// The game: everything wired together.
//
// One job: own the loop. The renderer, the world build, the menus, the
// clock, the cash and REP, BUSTED and WASTED, autosave, and the update
// order every subsystem shares. The update order matters and is stated
// here, because two bugs lived in it before:
//   1. The camera updates BEFORE shooting each frame, so the shot ray is
//      computed from the camera's final orientation (the tracer fix).
//   2. The player moves BEFORE the police and the enemies update, so the
//      hunt always chases Dana's current position, never last frame's.
//
// States: menu → playing ⇄ paused → wasted/busted → playing. The menu
// shows a slow panorama orbit over the city (the title screen sells the
// game); the pause menu freezes the simulation but keeps rendering.

import {
  ARMOUR_MAX, ARMOUR_PICKUP_VALUE, ARMOUR_SPOTS, CAMERA_TUNING,
  GARAGE_FORECOURT, GOAL_CASH, GOLDEN_HOUR, HEAT_RULES, HERO_STATS,
  HOSPITAL_DOOR, REP_AWARDS, SPAWN_POINT, STATION_DOOR,
} from './config.js';
import { makeSeededRandom } from './seed.js';
import { Input } from './input.js';
import { eraseSave, readSave, writeSave } from './save.js';
import { buildSky } from './sky.js';
import { buildGround } from './ground.js';
import { buildCity } from './buildings.js';
import { buildDressing } from './dressing.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Pedestrians } from './pedestrians.js';
import { Police } from './police.js';
import { Gunplay } from './weapons.js';
import { Missions } from './missions.js';
import { Collectibles } from './collectibles.js';
import { Hud } from './hud.js';
import { Minimap } from './minimap.js';
import { Soundscape } from './audio.js';

const CLOCK_MINUTES_PER_SECOND = 1 / 6; // one game minute per six real seconds
const AUTOSAVE_EVERY = 30;

export class Game {
  constructor(canvas, seed) {
    this.canvas = canvas;
    this.seed = seed;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = GOLDEN_HOUR.exposure;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      CAMERA_TUNING.fov, window.innerWidth / window.innerHeight, 0.1, 2000,
    );
    this.camera.position.set(0, 30, -120);
    this.input = new Input(canvas);
    this.input.onUnlock = () => {
      if (this.state === 'playing') this.pauseGame();
    };
    this.hud = new Hud();
    this.minimap = new Minimap(document.getElementById('minimap'));
    this.audio = new Soundscape();
    this.state = 'menu';
    this.time = 0;
    this.day = 1;
    this.minutes = 17 * 60 + 24; // the story starts at 17:24
    this.cash = HERO_STATS.startCash;
    this.rep = 0;
    this.health = HERO_STATS.maxHealth;
    this.armour = 0;
    this.carCondition = 1;
    this.lastDamageTime = -100;
    this.autosaveTimer = 0;
    this.endTimer = 0;
    this.endKind = null;
    this.smoke = [];
    this.menuAngle = 0.6;
    window.addEventListener('resize', () => this.onResize());
    this.build(seed);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  build(seed) {
    // A fresh world from the seed: clear the old scene's children first
    // so a rebuild (new game, screenshot staging) never doubles the city.
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    this.scene.environment = null;
    this.scene.fog = null;
    this.rng = makeSeededRandom(seed);
    this.sky = buildSky(this.scene, this.renderer, this.rng.fork(1));
    buildGround(this.scene, this.rng.fork(2));
    const city = buildCity(this.scene, this.rng.fork(3));
    this.colliders = city.colliders;
    this.dressing = buildDressing(this.scene, this.rng.fork(4));
    this.colliders.push(...this.dressing.colliders);
    this.traffic = new Traffic(this.scene, this.rng.fork(5), this.colliders);
    this.crowd = new Pedestrians(this.scene, this.rng.fork(6), this.colliders);
    this.police = new Police(this.scene, this.rng.fork(7), this.colliders);
    this.weapons = new Gunplay(this.scene, this.rng.fork(8), this.colliders);
    this.missions = new Missions(this.scene, this.rng.fork(9));
    this.collectibles = new Collectibles(this.scene);
    this.player = new Player(this.scene, this.rng.fork(10), this.colliders);
    this.player.reset(SPAWN_POINT.x, SPAWN_POINT.z);
    this.spawnArmourVests();
    this.smoke = [];
    this.time = 0;
  }

  spawnArmourVests() {
    this.armourVests = [];
    for (const spot of ARMOUR_SPOTS) {
      const group = new THREE.Group();
      // A vest on a stand: a torso-shaped shell with straps.
      const shell = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.32, 0.4, 4, 10),
        new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.8 }),
      );
      shell.scale.set(1, 1, 0.55);
      shell.position.y = 1.1;
      group.add(shell);
      const strap = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.1, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.4 }),
      );
      strap.position.y = 1.25;
      group.add(strap);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        color: 0x7ae0ff, transparent: true, opacity: 0.4,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      glow.scale.set(2, 2, 1);
      glow.position.y = 1.1;
      group.add(glow);
      group.position.set(spot.x, 0, spot.z);
      this.scene.add(group);
      this.armourVests.push({ group, spot, taken: false, respawnTimer: 0 });
    }
  }

  updateArmourVests(dt) {
    for (const vest of this.armourVests) {
      if (vest.taken) {
        vest.respawnTimer -= dt;
        if (vest.respawnTimer <= 0) {
          vest.taken = false;
          vest.group.visible = true;
        }
        continue;
      }
      vest.group.rotation.y += dt * 1.2;
      if (Math.hypot(this.player.x - vest.spot.x, this.player.z - vest.spot.z) < 2.6) {
        vest.taken = true;
        vest.group.visible = false;
        vest.respawnTimer = 90;
        this.armour = Math.min(ARMOUR_MAX, this.armour + ARMOUR_PICKUP_VALUE);
        this.hud.showScorePopup(`ARMOUR +${ARMOUR_PICKUP_VALUE}`, 'armour');
        this.hud.showToast(`Armour vest — ${vest.spot.name}`);
        this.audio.blip(740, 0.12, 0.14);
      }
    }
  }

  startNewGame() {
    eraseSave();
    this.build(this.seed);
    this.state = 'playing';
    this.cash = HERO_STATS.startCash;
    this.rep = 0;
    this.health = HERO_STATS.maxHealth;
    this.armour = 0;
    this.carCondition = 1;
    this.day = 1;
    this.minutes = 17 * 60 + 24;
    this.input.enabled = true;
    this.input.clear();
    this.input.requestLock();
    this.audio.init();
    this.audio.startEngineLoop();
    this.audio.startSirenLoop();
    this.audio.startRadio();
    this.hud.hideStart();
    this.hud.hideEndScreens();
    this.hud.setHintVisible(true);
    this.hud.showDialogue('Rosa', 'Dana! The Kings want fifty thousand by Friday, or they torch the garage. Come inside — I have got work for you.');
    this.refreshHud();
  }

  continueGame() {
    const save = readSave();
    if (!save) {
      this.startNewGame();
      return;
    }
    this.build(this.seed);
    this.state = 'playing';
    this.cash = save.cash ?? HERO_STATS.startCash;
    this.rep = save.rep ?? 0;
    this.health = save.health ?? HERO_STATS.maxHealth;
    this.armour = save.armour ?? 0;
    this.carCondition = save.carCondition ?? 1;
    this.day = save.day ?? 1;
    this.minutes = save.minutes ?? 17 * 60 + 24;
    this.missions.completedCount = save.completed ?? 0;
    this.missions.storyComplete = this.missions.completedCount >= 5;
    this.collectibles.restore(save.postcards || []);
    this.player.reset(save.x ?? SPAWN_POINT.x, save.z ?? SPAWN_POINT.z);
    this.input.enabled = true;
    this.input.clear();
    this.input.requestLock();
    this.audio.init();
    this.audio.startEngineLoop();
    this.audio.startSirenLoop();
    this.audio.startRadio();
    this.hud.hideStart();
    this.hud.hideEndScreens();
    this.hud.showToast('Save restored — welcome back to Solmar Bay');
    this.refreshHud();
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.releaseLock();
    this.input.enabled = false;
    this.hud.showPause(true);
    this.audio.setEngine(0, false);
  }

  resumeGame() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.input.enabled = true;
    this.input.clear();
    this.input.requestLock();
    this.hud.showPause(false);
  }

  quitToMenu() {
    this.autosave();
    this.state = 'menu';
    this.input.enabled = false;
    this.input.releaseLock();
    this.hud.showPause(false);
    this.hud.showStart(true);
    this.audio.setEngine(0, false);
    this.audio.setSiren(false);
  }

  autosave() {
    writeSave({
      v: 4,
      cash: this.cash,
      rep: this.rep,
      health: this.health,
      armour: this.armour,
      completed: this.missions.completedCount,
      postcards: this.collectibles.collectedIds(),
      x: this.player.x,
      z: this.player.z,
      day: this.day,
      minutes: this.minutes,
      carCondition: this.carCondition,
    });
  }

  addRep(points) {
    this.rep += points;
    this.hud.showScorePopup(`REP +${points}`, 'rep');
  }

  refreshHud() {
    this.hud.setCash(this.cash, GOAL_CASH);
    this.hud.setPostcards(this.collectibles.collectedCount, this.collectibles.cards.length);
    this.hud.setHealth(this.health);
    this.hud.setArmour(this.armour);
    this.hud.setRep(this.rep);
    this.hud.setWanted(this.police.stars);
    this.hud.setClock(this.day, this.minutes);
    this.hud.setLocation(this.player.x, this.player.z);
    const inCar = Boolean(this.player.inCar);
    this.hud.setSpeed(
      inCar ? Math.abs(this.player.carSpeed) * 3.6 : 0,
      inCar,
      inCar ? this.player.inCar.car.name : '',
      this.carCondition,
    );
    this.hud.setAmmo(this.weapons.ammo, this.weapons.reloading);
    const mission = this.missions.active ? this.missions.active.def : this.missions.nextMission();
    this.hud.setMissionName(mission ? mission.title.toUpperCase() : 'SOLMAR BAY');
    this.hud.setObjective(this.missions.objectiveText());
    this.hud.setStagePips(this.missions.stageProgress());
    this.hud.setResponse(this.responseUnits(), this.police.stars);
    this.hud.setRadio(this.audio.currentStation());
    this.minimap.draw({
      playerX: this.player.x,
      playerZ: this.player.z,
      heading: this.player.inCar
        ? this.player.inCar.car.group.rotation.y
        : this.player.heading,
      waypoint: this.missions.waypoint(),
      police: this.police.blips(),
      enemies: this.weapons.enemyPositions(),
      postcards: this.collectibles.remaining(),
    });
  }

  onCrime(kind, stars) {
    this.police.addStars(stars, this.time);
    if (kind === 'theft') this.hud.showScorePopup('CAR STOLEN — WANTED +1★', 'heat');
    else if (kind === 'assault') this.hud.showScorePopup('ASSAULT — WANTED +1★', 'heat');
    else if (kind === 'cop') this.hud.showScorePopup('OFFICER DOWN — WANTED +2★', 'heat');
  }

  nearestPoliceDistance() {
    return this.police.nearestUnitDistance(this.player.x, this.player.z);
  }

  damagePlayer(amount) {
    if (this.state !== 'playing') return;
    let rest = amount;
    if (this.armour > 0) {
      const absorbed = Math.min(this.armour, rest);
      this.armour -= absorbed;
      rest -= absorbed;
    }
    this.health -= rest;
    this.lastDamageTime = this.time;
    this.hud.damageFlash();
    if (this.health <= 0) {
      this.health = 0;
      this.wasted();
    }
  }

  wasted() {
    if (this.state !== 'playing') return;
    this.state = 'wasted';
    this.endKind = 'wasted';
    this.endTimer = 2.5;
    this.hud.showWasted();
    this.audio.failSting();
    this.missions.failActive('Dana was wasted', this.storyContext());
  }

  busted() {
    if (this.state !== 'playing') return;
    this.state = 'busted';
    this.endKind = 'busted';
    this.endTimer = 2.5;
    this.hud.showBusted();
    this.audio.failSting();
    this.missions.failActive('Dana was busted', this.storyContext());
  }

  respawn() {
    // The fine comes off the cash; the respawn door collects its postcard
    // (+$200) on the next update, so the NET fine is what the books show.
    const fine = this.endKind === 'busted' ? HEAT_RULES.bustedFine : HEAT_RULES.wastedFine;
    this.cash = Math.max(0, this.cash - fine);
    this.health = HERO_STATS.maxHealth;
    this.armour = 0;
    this.police.clear();
    this.weapons.clearEnemies();
    if (this.player.inCar) this.player.leaveCar(true);
    const door = this.endKind === 'busted' ? STATION_DOOR : HOSPITAL_DOOR;
    this.player.reset(door.x, door.z);
    this.carCondition = 1;
    this.state = 'playing';
    this.hud.hideEndScreens();
    this.hud.showToast(this.endKind === 'busted'
      ? `Released with a $${fine} fine`
      : `Patched up — $${fine} hospital bill`);
    this.endKind = null;
    this.refreshHud();
  }

  storyContext() {
    return {
      time: this.time,
      playerX: this.player.x,
      playerZ: this.player.z,
      playerCar: this.player.inCar,
      police: this.police,
      weapons: this.weapons,
      traffic: this.traffic,
      onBanner: (title, text, seconds) => this.hud.showBanner(title, text, seconds),
      onDialogue: (speaker, text) => this.hud.showDialogue(speaker, text),
      onCash: (amount) => {
        this.cash += amount;
        this.hud.showScorePopup(`+$${amount.toLocaleString('en-US')}`, 'cash');
      },
      onMissionComplete: () => {
        this.addRep(REP_AWARDS.mission);
        this.audio.missionComplete();
        this.autosave();
      },
    };
  }

  policeContext() {
    return {
      time: this.time,
      playerX: this.player.x,
      playerZ: this.player.z,
      playerCar: this.player.inCar,
      onRam: (cruiser) => {
        // A cruiser ramming the player's car: shove it and hurt it.
        const car = this.player.inCar.car;
        const pos = car.group.position;
        const cpos = cruiser.car.group.position;
        const dx = pos.x - cpos.x;
        const dz = pos.z - cpos.z;
        const len = Math.hypot(dx, dz) || 1;
        this.player.carVelocity.x += (dx / len) * 6;
        this.player.carVelocity.z += (dz / len) * 6;
        this.carCondition = Math.max(0, this.carCondition - 0.03);
        this.audio.crash(8);
        this.spawnSmoke(pos.x, pos.z);
      },
      onRamPerson: () => {
        this.damagePlayer(12);
      },
      onArrestProgress: (p) => this.hud.setArrestProgress(p),
      onArrest: () => {
        this.hud.setArrestProgress(0);
        this.busted();
      },
    };
  }

  weaponsContext() {
    return {
      playerX: this.player.x,
      playerZ: this.player.z,
      onPlayerHit: (damage) => this.damagePlayer(damage),
      onEnemyKilled: (enemy) => {
        this.missions.onEnemyKilled();
        this.hud.showScorePopup(enemy.boss ? 'KANE DOWN' : 'KING DOWN', 'kill');
        this.addRep(10);
      },
      onReloaded: () => this.audio.reload(),
      onHitmarker: () => this.hud.flashHitmarker(),
      onShotFired: () => {
        this.audio.gunshot();
        this.crowd.panicNear(this.player.x, this.player.z);
      },
    };
  }

  // Build the shot's target list: Kings, officers and pedestrians.
  // Officers and peds are crimes to hit; Kings are the job.
  shotTargets() {
    const targets = [];
    for (const enemy of this.weapons.aliveEnemies()) {
      targets.push({
        x: enemy.x, z: enemy.z, radius: 0.9, height: 1.2,
        hit: (damage) => {
          enemy.hp -= damage;
          if (enemy.hp <= 0) this.weapons.killEnemy(enemy, this.weaponsContext());
          else this.weapons.addSparks(new THREE.Vector3(enemy.x, 1.2, enemy.z), 0xff6a5e);
        },
      });
    }
    for (const { rig, officer } of this.police.officerRigs()) {
      const pos = rig.group.position;
      targets.push({
        x: pos.x, z: pos.z, radius: 0.9, height: 1.2,
        hit: () => {
          this.police.knockDownOfficer(officer);
          this.onCrime('cop', 2);
        },
      });
    }
    for (const ped of this.crowd.peds) {
      if (ped.state === 'down') continue;
      targets.push({
        x: ped.x, z: ped.z, radius: 0.8, height: 1.2,
        hit: () => {
          this.crowd.knockDown(ped);
          this.crowd.panicNear(ped.x, ped.z);
          this.onCrime('assault', 1);
        },
      });
    }
    return targets;
  }

  tryShoot() {
    if (this.state !== 'playing' || this.player.inCar) return;
    this.weapons.fire(this.camera, this.player, this.shotTargets(), this.weaponsContext());
  }

  spawnSmoke(x, z) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      color: 0x8a8078, transparent: true, opacity: 0.5, depthWrite: false,
    }));
    sprite.scale.set(2, 2, 1);
    sprite.position.set(x, 1, z);
    this.scene.add(sprite);
    this.smoke.push({ sprite, timer: 1.2 });
  }

  updateSmoke(dt) {
    for (let i = this.smoke.length - 1; i >= 0; i -= 1) {
      const puff = this.smoke[i];
      puff.timer -= dt;
      puff.sprite.position.y += dt * 1.2;
      puff.sprite.scale.multiplyScalar(1 + dt * 0.8);
      puff.sprite.material.opacity = Math.max(0, puff.timer * 0.4);
      if (puff.timer <= 0) {
        this.scene.remove(puff.sprite);
        this.smoke.splice(i, 1);
      }
    }
  }

  handleInteract() {
    if (this.player.inCar) {
      this.player.leaveCar();
      this.audio.blip(520, 0.08, 0.1);
      return;
    }
    // Start the next mission at the garage.
    const nearGarage = Math.hypot(this.player.x - GARAGE_FORECOURT.x, this.player.z - GARAGE_FORECOURT.z) < 8;
    if (nearGarage && !this.missions.active && this.missions.nextMission()) {
      this.missions.startNext(this.storyContext());
      return;
    }
    // Steal the nearest car. The record stays in its traffic list with
    // taken=true (moving cars skip taken records); leaveCar clears the
    // flag, so Dana can always get back into her own car.
    const car = this.traffic.nearestCar(this.player.x, this.player.z, 4, null);
    if (car) {
      car.taken = true;
      this.player.enterCar(car);
      this.carCondition = 1;
      this.onCrime('theft', 1);
      this.audio.blip(520, 0.08, 0.1);
    }
  }

  updatePrompt() {
    if (this.state !== 'playing' || this.player.inCar) {
      if (this.player.inCar) this.hud.showPrompt('E — Leave car');
      else this.hud.hidePrompt();
      return;
    }
    const nearGarage = Math.hypot(this.player.x - GARAGE_FORECOURT.x, this.player.z - GARAGE_FORECOURT.z) < 8;
    if (nearGarage && !this.missions.active && this.missions.nextMission()) {
      this.hud.showPrompt(`E — Start "${this.missions.nextMission().title}"`);
      return;
    }
    const car = this.traffic.nearestCar(this.player.x, this.player.z, 4, null);
    if (car) {
      this.hud.showPrompt(`E — Steal ${car.car.name}`);
      return;
    }
    this.hud.hidePrompt();
  }

  // Player car vs the world's cars: push apart, damage, noise.
  resolveCarContacts() {
    if (!this.player.inCar) return;
    const mine = this.player.inCar.car.group.position;
    const all = [...this.traffic.all, ...this.police.cruisers.map((c) => ({ car: c.car }))];
    for (const other of all) {
      if (other.car === this.player.inCar.car) continue;
      const pos = other.car.group.position;
      const dx = mine.x - pos.x;
      const dz = mine.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 3.0 && dist > 0.01) {
        const push = (3.0 - dist) / 2;
        const nx = dx / dist;
        const nz = dz / dist;
        mine.x += nx * push;
        mine.z += nz * push;
        pos.x -= nx * push;
        pos.z -= nz * push;
        const impact = Math.abs(this.player.carSpeed);
        if (impact > 5) {
          this.carCondition = Math.max(0, this.carCondition - 0.04);
          this.audio.crash(impact);
          this.spawnSmoke(mine.x, mine.z);
        }
        this.player.carSpeed *= 0.6;
      }
    }
    // The player's car vs pedestrians: a hit knocks them down — and is a crime.
    const speed = Math.hypot(this.player.carVelocity.x, this.player.carVelocity.z);
    if (speed > 4) {
      for (const ped of this.crowd.peds) {
        if (ped.state === 'down') continue;
        if (Math.hypot(ped.x - mine.x, ped.z - mine.z) < 2.2) {
          this.crowd.knockDown(ped);
          this.crowd.panicNear(ped.x, ped.z);
          this.onCrime('assault', 1);
          this.player.carSpeed *= 0.7;
        }
      }
    }
  }

  responseUnits() {
    return this.police.responseList(this.player.x, this.player.z);
  }

  update(dt) {
    // The menu panorama: the world lives (clouds, wheel, sea) while the
    // camera orbits the city — the title screen sells the game.
    if (this.state === 'menu') {
      this.time += dt;
      this.sky.update(dt);
      this.dressing.update(dt, this.time);
      this.menuAngle += dt * 0.02;
      const radius = 150;
      this.camera.position.set(
        Math.sin(this.menuAngle) * radius,
        52,
        Math.cos(this.menuAngle) * radius,
      );
      this.camera.lookAt(0, 6, 20);
      return;
    }
    if (this.state === 'paused') return;
    // WASTED / BUSTED: the end screen holds, then the respawn.
    if (this.state === 'wasted' || this.state === 'busted') {
      this.endTimer -= dt;
      this.hud.update(dt);
      if (this.endTimer <= 0) this.respawn();
      return;
    }
    this.time += dt;
    this.minutes += dt * CLOCK_MINUTES_PER_SECOND * 60;
    if (this.minutes >= 24 * 60) {
      this.minutes -= 24 * 60;
      this.day += 1;
    }
    // One-shot keys.
    if (this.input.tapped('KeyP')) { this.pauseGame(); return; }
    if (this.input.tapped('KeyM')) {
      const muted = this.audio.toggleMute();
      document.getElementById('btn-mute').textContent = muted ? 'Sound: OFF' : 'Sound: ON';
    }
    if (this.input.tapped('KeyN')) {
      this.hud.setRadio(this.audio.nextStation());
      this.hud.showToast(this.audio.currentStation().name);
    }
    if (this.input.tapped('KeyR')) this.weapons.startReload();
    if (this.input.tapped('KeyE')) this.handleInteract();
    // The player moves, then the camera settles, THEN the shot fires —
    // the ray is computed from the camera's final orientation.
    const driveContext = {
      traffic: this.traffic,
      onCrash: (impact) => {
        this.carCondition = Math.max(0, this.carCondition - impact * 0.004);
        this.audio.crash(impact);
        this.spawnSmoke(this.player.x, this.player.z);
      },
      onDrift: () => {
        this.addRep(REP_AWARDS.drift);
        this.hud.showScorePopup('DRIFT +25 REP', 'rep');
      },
      onNearMiss: () => {
        this.addRep(REP_AWARDS.nearMiss);
        this.hud.showScorePopup('NEAR MISS +25 REP', 'rep');
      },
      onDrive: () => {},
      onFootstep: () => {},
    };
    this.player.update(dt, this.input, driveContext);
    // A wrecked car barely moves.
    if (this.player.inCar && this.carCondition <= 0.05) {
      this.player.carSpeed *= 0.9;
    }
    this.player.updateCamera(this.camera, dt);
    this.hud.setCrosshairVisible(this.player.aiming && !this.player.inCar);
    if (this.input.fireDown) this.tryShoot();
    // The world answers.
    this.traffic.update(dt, {});
    this.crowd.update(dt);
    this.police.update(dt, this.policeContext());
    this.weapons.update(dt, this.weaponsContext());
    this.missions.update(dt, this.storyContext());
    this.collectibles.update(dt, {
      playerX: this.player.x,
      playerZ: this.player.z,
      onPickup: (card, reward, found, total) => {
        this.cash += reward;
        this.addRep(REP_AWARDS.postcard);
        this.hud.showScorePopup(`POSTCARD +$${reward}`, 'cash');
        this.hud.showToast(`${card.name} — postcard ${found}/${total}`);
        this.audio.blip(990, 0.15, 0.14);
      },
    });
    this.updateArmourVests(dt);
    this.resolveCarContacts();
    this.updateSmoke(dt);
    this.sky.update(dt);
    this.dressing.update(dt, this.time);
    // Health regen after a quiet stretch.
    if (this.health < HERO_STATS.maxHealth && this.time - this.lastDamageTime > HERO_STATS.regenDelay) {
      this.health = Math.min(HERO_STATS.maxHealth, this.health + HERO_STATS.regenRate * dt);
    }
    // Autosave.
    this.autosaveTimer += dt;
    if (this.autosaveTimer >= AUTOSAVE_EVERY) {
      this.autosaveTimer = 0;
      this.autosave();
    }
    // Audio follows the state.
    this.audio.setEngine(
      this.player.inCar ? Math.abs(this.player.carSpeed) / 36 : 0,
      Boolean(this.player.inCar),
    );
    this.audio.setSiren(this.police.stars > 0);
    // The arrest bar hides only when no officer is holding Dana — clearing
    // it unconditionally here would erase the progress police.update set.
    const arresting = this.police.officers.some((o) => !o.down && o.state === 'Arresting');
    if (!arresting) this.hud.setArrestProgress(0);
    this.updatePrompt();
    this.hud.update(dt);
    this.refreshHud();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
