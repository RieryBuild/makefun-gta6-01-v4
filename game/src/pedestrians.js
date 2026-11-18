// Pedestrians: the city's foot traffic.
//
// One job: fill the sidewalks with people who stroll, flee gunfire, and
// get knocked down when a car hits them. They walk between random sidewalk
// points, keep to the land, and never enter a building.

import { CITY_LIFE, ROAD_LINES } from './config.js';
import { animateHumanoid, createHumanoid, layHumanoidDown, pedLook } from './people.js';
import { pushOutOfColliders } from './buildings.js';
import { clampToLand } from './ground.js';

function sidewalkPoint(rng) {
  // A point on a sidewalk: beside a street line, somewhere in the city.
  const line = rng.pick(ROAD_LINES);
  const alongX = rng.chance(0.5);
  const side = rng.chance(0.5) ? 1 : -1;
  const at = rng.between(-180, 180);
  if (alongX) return { x: at, z: line + side * 10.5 };
  return { x: line + side * 10.5, z: at };
}

export class Pedestrians {
  constructor(scene, rng, colliders) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = colliders;
    this.peds = [];
    for (let i = 0; i < CITY_LIFE.peds; i += 1) {
      this.spawn(sidewalkPoint(rng));
    }
    // Two dock workers on the apron, for life in the yard.
    this.spawn({ x: 200, z: -40 });
    this.spawn({ x: 216, z: 30 });
    // Two beachgoers on the sand.
    this.spawn({ x: -20, z: 210 });
    this.spawn({ x: 80, z: 208 });
  }

  spawn(point) {
    const rig = createHumanoid(pedLook(this.rng), false);
    rig.group.position.set(point.x, 0, point.z);
    this.scene.add(rig.group);
    const ped = {
      rig,
      x: point.x,
      z: point.z,
      heading: this.rng.between(0, Math.PI * 2),
      speed: 0,
      state: 'stroll',
      target: sidewalkPoint(this.rng),
      panicTimer: 0,
      downTimer: 0,
    };
    this.peds.push(ped);
    return ped;
  }

  panicNear(x, z) {
    for (const ped of this.peds) {
      if (ped.state === 'down') continue;
      const dist = Math.hypot(ped.x - x, ped.z - z);
      if (dist < 28) {
        ped.state = 'flee';
        ped.panicTimer = 4;
        // Flee away from the scare, toward a far sidewalk point.
        const away = Math.atan2(ped.x - x, ped.z - z);
        ped.target = {
          x: ped.x + Math.sin(away) * 40,
          z: ped.z + Math.cos(away) * 40,
        };
      }
    }
  }

  knockDown(ped) {
    if (ped.state === 'down') return;
    ped.state = 'down';
    ped.downTimer = 6;
    ped.speed = 0;
    layHumanoidDown(ped.rig);
  }

  update(dt) {
    for (const ped of this.peds) {
      if (ped.state === 'down') {
        ped.downTimer -= dt;
        if (ped.downTimer <= 0) {
          // Get up, dust off, stroll on.
          ped.rig.down = false;
          ped.rig.group.rotation.x = 0;
          ped.rig.group.position.y = 0;
          ped.state = 'stroll';
          ped.target = sidewalkPoint(this.rng);
        }
        continue;
      }
      if (ped.state === 'flee') {
        ped.panicTimer -= dt;
        if (ped.panicTimer <= 0) {
          ped.state = 'stroll';
          ped.target = sidewalkPoint(this.rng);
        }
      }
      const dx = ped.target.x - ped.x;
      const dz = ped.target.z - ped.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.5) {
        ped.target = ped.state === 'flee' ? sidewalkPoint(this.rng) : sidewalkPoint(this.rng);
        ped.speed = 0;
      } else {
        const topSpeed = ped.state === 'flee' ? CITY_LIFE.pedFlee : CITY_LIFE.pedWalk;
        ped.speed = topSpeed;
        const targetHeading = Math.atan2(dx, dz);
        let diff = targetHeading - ped.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        ped.heading += diff * Math.min(1, dt * 6);
        ped.x += Math.sin(ped.heading) * topSpeed * dt;
        ped.z += Math.cos(ped.heading) * topSpeed * dt;
        const land = clampToLand(ped.x, ped.z, 1);
        ped.x = land.x;
        ped.z = land.z;
        const pos = { x: ped.x, z: ped.z };
        pushOutOfColliders(pos, 0.6, this.colliders);
        ped.x = pos.x;
        ped.z = pos.z;
      }
      ped.rig.group.position.set(ped.x, 0, ped.z);
      ped.rig.group.rotation.y = ped.heading;
      animateHumanoid(ped.rig, dt, ped.speed, false);
    }
  }
}
