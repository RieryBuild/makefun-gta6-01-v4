// Gunplay: Dana's rifle, the Kings who shoot back, and the tracers.
//
// One job: resolve shots honestly. A shot is a ray from the camera through
// the crosshair; the first thing it meets — an enemy, an officer, a
// pedestrian, or the ground — takes the hit, and the tracer is drawn from
// the muzzle to the resolved endpoint.
//
// The tracer fix, stated once: v3's combat tracer did not connect the
// muzzle to the enemy, because the shot was fired BEFORE the staging's
// final camera yaw nudge — the aim settled after the shot. v4 fires the
// tracer only after the aim is fully settled: the ray is computed from
// the camera's FINAL direction for the frame, the hit is resolved, and
// only then is the tracer drawn to the resolved point (capped at 18 m so
// a long miss does not draw a line across the whole frame).

import { RIFLE_STATS } from './config.js';
import {
  animateHumanoid, bossLook, createHumanoid, gangLook, layHumanoidDown, muzzleWorld,
} from './people.js';
import { lineBlocked } from './buildings.js';
import { glowPool } from './textures.js';

const ENEMY_STOP_DIST = 18; // enemies hold here and strafe, like v2/v3
const ENEMY_SHOOT_RANGE = 42;
// The tracer must reach its target at rifle range: at 18 m it stopped
// 5 m short of a 23 m target and read as a broken effect. 30 m covers
// real combat distances; longer shots still cap (a 95 m ground hit does
// not need a tracer across the map).
const TRACER_MAX_LEN = 30;

export class Gunplay {
  constructor(scene, rng, colliders) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = colliders;
    this.ammo = RIFLE_STATS.mag;
    this.reloading = false;
    this.reloadTimer = 0;
    this.fireTimer = 0;
    this.enemies = []; // { rig, x, z, hp, boss, shootTimer, strafeDir, strafeTimer, dead }
    this.tracers = []; // { mesh, timer }
    this.sparks = []; // { sprite, velocity, timer }
    // Muzzle flash: an additive sprite that lives 50 ms. It MUST carry the
    // radial glow texture — a sprite with no map renders as a solid square,
    // and at arm's length from the aim camera that square filled a third
    // of the combat screenshot. (Caught in the first v4 screenshots.)
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowPool(), color: 0xffe2a0, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.flash.scale.set(0.9, 0.9, 1);
    this.flashTimer = 0;
    scene.add(this.flash);
    this.raycaster = new THREE.Raycaster();
  }

  spawnEnemy(x, z, isBoss = false) {
    const look = isBoss ? bossLook() : gangLook(this.rng);
    const rig = createHumanoid(look, 'pistol');
    rig.group.position.set(x, 0, z);
    this.scene.add(rig.group);
    const enemy = {
      rig, x, z,
      hp: isBoss ? 300 : 100,
      boss: isBoss,
      shootTimer: this.rng.between(0.8, 2),
      strafeDir: this.rng.chance(0.5) ? 1 : -1,
      strafeTimer: this.rng.between(1.5, 3),
      dead: false,
    };
    this.enemies.push(enemy);
    return enemy;
  }

  clearEnemies() {
    for (const enemy of this.enemies) this.scene.remove(enemy.rig.group);
    this.enemies = [];
  }

  aliveEnemies() {
    return this.enemies.filter((e) => !e.dead);
  }

  enemyPositions() {
    return this.aliveEnemies().map((e) => ({ x: e.x, z: e.z, boss: e.boss }));
  }

  startReload() {
    if (this.reloading || this.ammo === RIFLE_STATS.mag) return false;
    this.reloading = true;
    this.reloadTimer = RIFLE_STATS.reload;
    return true;
  }

  // Fire one round. `targets` is the game's hit list for this shot:
  // enemies, officers and pedestrians, each { x, z, radius, height, hit }.
  // The camera must already be at its final orientation for the frame —
  // the caller fires AFTER the camera update, never before a camera move.
  fire(camera, hero, targets, context) {
    if (this.reloading || this.fireTimer > 0) return 'busy';
    if (this.ammo <= 0) {
      this.startReload();
      return 'empty';
    }
    this.ammo -= 1;
    this.fireTimer = RIFLE_STATS.interval;
    // The ray: from the camera, through the crosshair (screen centre).
    // updateMatrixWorld FIRST: a camera snap (lookAt) only changes the
    // local transform — the world matrix is stale until the next render,
    // and a shot fired from a stale matrix rays along the OLD facing.
    // The combat screenshot caught this: the tracer ran to the enemy the
    // pre-snap camera had faced, not the one at the crosshair.
    camera.updateMatrixWorld();
    this.raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const ray = this.raycaster.ray;
    // Resolve the hit: the nearest target sphere the ray enters, or the
    // ground plane, or the rifle's max range — whichever comes first.
    let bestDist = RIFLE_STATS.range;
    let bestTarget = null;
    const sphere = new THREE.Sphere();
    for (const target of targets) {
      sphere.set(new THREE.Vector3(target.x, target.height || 1.2, target.z), target.radius);
      const hit = ray.intersectSphere(sphere, new THREE.Vector3());
      if (hit) {
        const dist = hit.distanceTo(ray.origin);
        if (dist < bestDist) {
          bestDist = dist;
          bestTarget = target;
        }
      }
    }
    const groundPoint = new THREE.Vector3();
    const groundHit = ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), groundPoint);
    if (groundHit) {
      const dist = groundPoint.distanceTo(ray.origin);
      if (dist < bestDist) {
        bestDist = dist;
        bestTarget = null;
      }
    }
    const endPoint = ray.origin.clone().add(ray.direction.clone().multiplyScalar(bestDist));
    // Apply the hit, then draw the feedback — tracer LAST, to the
    // resolved endpoint, so it always connects muzzle to impact.
    if (bestTarget) {
      bestTarget.hit(RIFLE_STATS.damage, endPoint);
      context?.onHitmarker?.();
    } else if (groundHit) {
      this.addSparks(endPoint, 0xffd9a0);
    }
    const muzzle = hero.muzzlePosition(new THREE.Vector3());
    this.showMuzzleFlash(muzzle);
    this.addTracer(muzzle, endPoint, 0xfff2c0);
    context?.onShotFired?.(bestTarget);
    return bestTarget ? 'hit' : 'miss';
  }

  addTracer(from, to, colour) {
    // A thin glowing rod from the muzzle toward the impact, capped at 18 m
    // so a long miss never draws a line across the whole frame. The rod is
    // oriented by quaternion and centred on the capped segment — the
    // midpoint follows the capped length, never the original distance.
    const dir = to.clone().sub(from);
    const length = Math.min(dir.length(), TRACER_MAX_LEN);
    if (length < 0.5) return;
    dir.normalize();
    const end = from.clone().add(dir.clone().multiplyScalar(length));
    const mid = from.clone().add(end).multiplyScalar(0.5);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, length, 5),
      new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.9 }),
    );
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.scene.add(mesh);
    this.tracers.push({ mesh, timer: 0.07 });
  }

  addSparks(point, colour) {
    // Sparks carry the radial glow texture too: map-less sprites are
    // solid squares, and these sit at the impact point in full view.
    for (let i = 0; i < 6; i += 1) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowPool(), color: colour, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      sprite.scale.set(0.22, 0.22, 1);
      sprite.position.copy(point);
      this.scene.add(sprite);
      this.sparks.push({
        sprite,
        velocity: new THREE.Vector3(
          this.rng.between(-2.5, 2.5),
          this.rng.between(0.5, 3.5),
          this.rng.between(-2.5, 2.5),
        ),
        timer: this.rng.between(0.25, 0.5),
      });
    }
  }

  showMuzzleFlash(position) {
    this.flash.position.copy(position);
    this.flash.material.opacity = 1;
    this.flashTimer = 0.05;
    this.flash.scale.set(0.9, 0.9, 1);
  }

  killEnemy(enemy, context) {
    enemy.dead = true;
    layHumanoidDown(enemy.rig);
    context?.onEnemyKilled?.(enemy);
  }

  update(dt, context) {
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.ammo = RIFLE_STATS.mag;
        context?.onReloaded?.();
      }
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flash.material.opacity = 0;
    }
    for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
      const tracer = this.tracers[i];
      tracer.timer -= dt;
      if (tracer.timer <= 0) {
        this.scene.remove(tracer.mesh);
        this.tracers.splice(i, 1);
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i -= 1) {
      const spark = this.sparks[i];
      spark.timer -= dt;
      spark.sprite.position.addScaledVector(spark.velocity, dt);
      spark.velocity.y -= 6 * dt;
      spark.sprite.material.opacity = Math.max(0, spark.timer * 2);
      if (spark.timer <= 0) {
        this.scene.remove(spark.sprite);
        this.sparks.splice(i, 1);
      }
    }
    // Enemy AI: close to 18 m, strafe, and shoot when the line is clear.
    const { playerX, playerZ } = context;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const dx = playerX - enemy.x;
      const dz = playerZ - enemy.z;
      const dist = Math.hypot(dx, dz);
      const desired = Math.atan2(dx, dz);
      let diff = desired - enemy.rig.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      enemy.rig.group.rotation.y += diff * Math.min(1, dt * 8);
      let speed = 0;
      if (dist > ENEMY_STOP_DIST) {
        speed = 4.2;
        enemy.x += Math.sin(enemy.rig.group.rotation.y) * speed * dt;
        enemy.z += Math.cos(enemy.rig.group.rotation.y) * speed * dt;
      } else {
        // Strafe sideways, flipping direction every couple of seconds.
        enemy.strafeTimer -= dt;
        if (enemy.strafeTimer <= 0) {
          enemy.strafeDir *= -1;
          enemy.strafeTimer = this.rng.between(1.5, 3);
        }
        speed = 1.8;
        const side = enemy.rig.group.rotation.y + Math.PI / 2 * enemy.strafeDir;
        enemy.x += Math.sin(side) * speed * dt;
        enemy.z += Math.cos(side) * speed * dt;
      }
      enemy.rig.group.position.set(enemy.x, 0, enemy.z);
      const aiming = dist < ENEMY_SHOOT_RANGE;
      animateHumanoid(enemy.rig, dt, speed, aiming);
      // Shoot: a tracer from the enemy's muzzle at Dana, with a hit
      // chance that falls with distance. The boss shoots faster.
      enemy.shootTimer -= dt;
      if (aiming && enemy.shootTimer <= 0) {
        enemy.shootTimer = enemy.boss ? 0.9 : this.rng.between(1.0, 1.8);
        const blocked = lineBlocked(enemy.x, enemy.z, playerX, playerZ, this.colliders);
        if (!blocked) {
          const muzzle = muzzleWorld(enemy.rig, new THREE.Vector3());
          const target = new THREE.Vector3(playerX, 1.2, playerZ);
          this.addTracer(muzzle, target, 0xffb0a0);
          this.showMuzzleFlash(muzzle);
          const hitChance = THREE.MathUtils.clamp(0.55 - dist * 0.008, 0.15, 0.55);
          if (this.rng.draw() < hitChance) {
            context.onPlayerHit?.(enemy.boss ? 14 : 9);
          }
        }
      }
    }
  }
}
