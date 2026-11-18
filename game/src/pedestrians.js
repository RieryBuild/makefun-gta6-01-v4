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

// Six of the city's peds stand instead of stroll: two chat pairs (two
// people facing each other, idle) and two phone starers (head down, a
// phone in hand). Standing people are what make a sidewalk read as lived
// in — a crowd where everyone walks looks like an evacuation.
const STANDING_PEDS = 6;

export class Pedestrians {
  constructor(scene, rng, colliders) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = colliders;
    this.peds = [];
    for (let i = 0; i < CITY_LIFE.peds - STANDING_PEDS; i += 1) {
      this.spawn(sidewalkPoint(rng));
    }
    // Two chat pairs on the sidewalks.
    this.spawnChatPair(sidewalkPoint(rng));
    this.spawnChatPair(sidewalkPoint(rng));
    // Two phone starers, head down over a tiny phone.
    this.spawnPhoneStarer(sidewalkPoint(rng));
    this.spawnPhoneStarer(sidewalkPoint(rng));
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
      gait: this.rng.between(0.85, 1.2),
      state: 'stroll',
      target: sidewalkPoint(this.rng),
      panicTimer: 0,
      downTimer: 0,
    };
    this.peds.push(ped);
    return ped;
  }

  spawnChatPair(point) {
    // Two peds a step apart, facing each other, standing still.
    const a = this.spawn(point);
    const b = this.spawn({ x: point.x + 1.2, z: point.z + 0.4 });
    a.state = 'stand';
    b.state = 'stand';
    a.heading = Math.atan2(b.x - a.x, b.z - a.z);
    b.heading = Math.atan2(a.x - b.x, a.z - b.z);
    a.rig.group.rotation.y = a.heading;
    b.rig.group.rotation.y = b.heading;
    return [a, b];
  }

  spawnPhoneStarer(point) {
    const ped = this.spawn(point);
    ped.state = 'stand';
    // Head tilted down at the phone, and a phone box in the right hand.
    ped.rig.head.rotation.x = 0.45;
    const phone = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.13, 0.015),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.4 }),
    );
    phone.position.set(0, -0.4, 0.09);
    phone.rotation.x = -0.5;
    ped.rig.armR.elbow.add(phone);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 0.11),
      new THREE.MeshBasicMaterial({ color: 0x9ad8ff }),
    );
    screen.position.set(0, -0.4, 0.1);
    screen.rotation.x = -0.5;
    ped.rig.armR.elbow.add(screen);
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
      if (ped.state === 'stand') {
        // Standing still: idle in place. (Gunfire still scares them —
        // panicNear flips them to 'flee' like everyone else.)
        ped.speed = 0;
        ped.rig.group.position.set(ped.x, 0, ped.z);
        ped.rig.group.rotation.y = ped.heading;
        animateHumanoid(ped.rig, dt, 0, false);
        continue;
      }
      const dx = ped.target.x - ped.x;
      const dz = ped.target.z - ped.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.5) {
        ped.target = ped.state === 'flee' ? sidewalkPoint(this.rng) : sidewalkPoint(this.rng);
        ped.speed = 0;
      } else {
        const topSpeed = (ped.state === 'flee' ? CITY_LIFE.pedFlee : CITY_LIFE.pedWalk) * ped.gait;
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
