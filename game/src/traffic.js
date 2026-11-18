// Traffic: cars that drive the streets and cars parked at the kerb.
//
// One job: keep the city moving. Moving cars run along the street lines,
// brake for the car ahead, and respawn at the far end when they leave the
// city; parked cars wait at the kerbs to be stolen. The m2 prize car — a
// cherry-red sports car at the beach lot — is parked at build time.

import { BEACH_LOT, CITY_HALF, CITY_LIFE, ROAD_LINES } from './config.js';
import { PAINT_JOBS, createCar, updateCar } from './cars.js';
import { pushOutOfColliders } from './buildings.js';

const PARKED_TYPES = ['sedan', 'sedan', 'pickup', 'van', 'taxi', 'sports'];

export class Traffic {
  constructor(scene, rng, colliders) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = colliders;
    this.moving = [];
    this.parked = [];
    this.all = [];
    this.spawnMoving();
    this.spawnParked();
  }

  addRecord(car, moving) {
    const record = {
      car, speed: 0, direction: { x: 0, z: 1 }, taken: false, isTraffic: true,
    };
    this.all.push(record);
    if (moving) this.moving.push(record);
    else this.parked.push(record);
    return record;
  }

  spawnMoving() {
    for (let i = 0; i < CITY_LIFE.traffic; i += 1) {
      const type = this.rng.pick(['sedan', 'sedan', 'pickup', 'van', 'taxi']);
      const car = createCar(this.rng, type, this.rng.pick(PAINT_JOBS));
      const alongX = this.rng.chance(0.5);
      const line = this.rng.pick(ROAD_LINES);
      const dir = this.rng.chance(0.5) ? 1 : -1;
      const lane = dir > 0 ? 3.5 : -3.5; // right-hand traffic
      const at = this.rng.between(-CITY_HALF, CITY_HALF);
      if (alongX) car.group.position.set(at, 0, line + lane);
      else car.group.position.set(line + lane, 0, at);
      const heading = alongX ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
      car.group.rotation.y = heading;
      this.scene.add(car.group);
      const record = this.addRecord(car, true);
      record.speed = CITY_LIFE.trafficSpeed * this.rng.between(0.85, 1.1);
      record.direction = alongX ? { x: dir, z: 0 } : { x: 0, z: dir };
      record.line = line;
      record.alongX = alongX;
    }
  }

  spawnParked() {
    // The m2 prize car first: cherry red, keys in, at the beach lot.
    this.addParked(BEACH_LOT.x, BEACH_LOT.z, Math.PI / 2, 'sports', 0x8a2f2f);
    // Kerb-lined boulevards: the two main streets carry parked cars on
    // BOTH kerbs, placed deterministically, so the city frame never opens
    // on an empty street. Eight fixed, the rest random.
    const kerbed = [
      // The x=0 avenue (north–south): both kerbs.
      [9.5, -40, 0], [-9.5, -8, Math.PI], [9.5, 24, 0], [-9.5, 56, Math.PI],
      // The z=0 boulevard (east–west): both kerbs.
      [-72, 9.5, Math.PI / 2], [-24, -9.5, -Math.PI / 2],
      [40, 9.5, Math.PI / 2], [88, -9.5, -Math.PI / 2],
    ];
    for (const [x, z, heading] of kerbed) {
      this.addParked(x, z, heading, this.rng.pick(PARKED_TYPES));
    }
    for (let i = 0; i < CITY_LIFE.parked - kerbed.length; i += 1) {
      const line = this.rng.pick(ROAD_LINES);
      const alongX = this.rng.chance(0.5);
      const side = this.rng.chance(0.5) ? 1 : -1;
      const at = this.rng.between(-160, 160);
      const type = this.rng.pick(PARKED_TYPES);
      const heading = alongX ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI);
      if (alongX) this.addParked(at, line + side * 9.5, heading, type);
      else this.addParked(line + side * 9.5, at, heading, type);
    }
  }

  addParked(x, z, heading, type, colour) {
    const car = createCar(this.rng, type, colour ?? this.rng.pick(PAINT_JOBS));
    car.group.position.set(x, 0, z);
    car.group.rotation.y = heading;
    this.scene.add(car.group);
    return this.addRecord(car, false);
  }

  nearestParked(x, z, range) {
    let best = null;
    let bestDist = range;
    for (const record of this.parked) {
      if (record.taken) continue;
      const pos = record.car.group.position;
      const dist = Math.hypot(pos.x - x, pos.z - z);
      if (dist < bestDist) {
        best = record;
        bestDist = dist;
      }
    }
    return best;
  }

  nearestCar(x, z, range, exclude) {
    let best = null;
    let bestDist = range;
    for (const record of this.all) {
      if (record === exclude || record.taken) continue;
      const pos = record.car.group.position;
      const dist = Math.hypot(pos.x - x, pos.z - z);
      if (dist < bestDist) {
        best = record;
        bestDist = dist;
      }
    }
    return best;
  }

  // A car ahead on the same line and direction, within braking distance.
  carAhead(record, distance) {
    const pos = record.car.group.position;
    for (const other of this.all) {
      if (other === record || other.taken) continue;
      const op = other.car.group.position;
      const dx = op.x - pos.x;
      const dz = op.z - pos.z;
      const ahead = dx * record.direction.x + dz * record.direction.z;
      const lateral = Math.abs(dx * record.direction.z - dz * record.direction.x);
      if (ahead > 0 && ahead < distance && lateral < 2.6) return other;
    }
    return null;
  }

  update(dt, context) {
    for (const record of this.moving) {
      if (record.taken) continue;
      const pos = record.car.group.position;
      // Brake for the car ahead; otherwise cruise.
      const ahead = this.carAhead(record, 11);
      const target = ahead ? 0 : CITY_LIFE.trafficSpeed;
      record.speed += (target - record.speed) * Math.min(1, dt * (ahead ? 4 : 1.2));
      pos.x += record.direction.x * record.speed * dt;
      pos.z += record.direction.z * record.speed * dt;
      // Leave the city, come back at the far end on a fresh line.
      if (Math.abs(pos.x) > CITY_HALF + 8 || Math.abs(pos.z) > CITY_HALF + 8) {
        const alongX = this.rng.chance(0.5);
        const line = this.rng.pick(ROAD_LINES);
        const dir = this.rng.chance(0.5) ? 1 : -1;
        const lane = dir > 0 ? 3.5 : -3.5;
        if (alongX) pos.set(-dir * (CITY_HALF + 4), 0, line + lane);
        else pos.set(line + lane, 0, -dir * (CITY_HALF + 4));
        record.direction = alongX ? { x: dir, z: 0 } : { x: 0, z: dir };
        record.car.group.rotation.y = alongX
          ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2)
          : (dir > 0 ? 0 : Math.PI);
      }
      updateCar(record.car, record.speed, 0, dt);
      // Traffic never enters a building or the sea.
      const p = { x: pos.x, z: pos.z };
      pushOutOfColliders(p, 1.6, this.colliders);
      pos.x = p.x;
      pos.z = p.z;
      if (pos.x > 256) pos.x = 256;
      if (pos.z > 230) pos.z = 230;
    }
    if (context?.onTrafficTick) context.onTrafficTick(dt);
  }
}
