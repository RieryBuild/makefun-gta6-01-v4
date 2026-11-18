// The heat: SBPD's wanted response.
//
// One job: answer Dana's crimes. Stars bring cruisers that chase and ram,
// officers on foot who close in to arrest, and — from three stars — the
// GULL-1 helicopter with its searchlight. Every unit has a callsign and a
// state, so the HUD's response list names the hunt, not just a number.
//
// The helicopter is built BIG and its searchlight is a real cone + pool:
// at three stars the player should see it in the sky without hunting for
// it, and the chase screenshot stages it low and close on purpose.

import {
  CRUISER_CALLSIGNS, HEAT_RULES, HELI_CALLSIGN, OFFICER_CALLSIGNS, ROAD_LINES,
} from './config.js';
import { createCar, flashLightBar, updateCar } from './cars.js';
import { animateHumanoid, copLook, createHumanoid, layHumanoidDown } from './people.js';
import { pushOutOfColliders } from './buildings.js';
import { clampToLand } from './ground.js';
import { glowPool } from './textures.js';

const CRUISER_SPEED = 30;
const OFFICER_SPEED = 6.5;

function snapToStreet(value) {
  let best = ROAD_LINES[0];
  for (const line of ROAD_LINES) {
    if (Math.abs(line - value) < Math.abs(best - value)) best = line;
  }
  return best;
}

export class Police {
  constructor(scene, rng, colliders) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = colliders;
    this.stars = 0;
    this.cruisers = []; // { car, callsign, state, speed }
    this.officers = []; // { rig, callsign, state, arrestTimer, down }
    this.heli = null; // { group, rotor, beam, pool, beacon, callsign }
    this.lastSeen = 0;
    this.callsignIndex = 0;
    this.officerIndex = 0;
  }

  addStars(n, time) {
    const before = this.stars;
    this.stars = Math.min(HEAT_RULES.maxStars, this.stars + n);
    if (this.stars !== before) {
      this.lastSeen = time;
      this.spawnForStars();
    }
  }

  clear() {
    this.stars = 0;
    this.removeAllUnits();
  }

  spawnPoint(playerX, playerZ) {
    // On a street, spawnRange out from the player, inside the city.
    const angle = this.rng.between(0, Math.PI * 2);
    const range = HEAT_RULES.spawnRange;
    let x = playerX + Math.sin(angle) * range;
    let z = playerZ + Math.cos(angle) * range;
    x = THREE.MathUtils.clamp(x, -180, 180);
    z = THREE.MathUtils.clamp(z, -180, 180);
    if (this.rng.chance(0.5)) x = snapToStreet(x);
    else z = snapToStreet(z);
    return { x, z };
  }

  spawnCruiser() {
    const car = createCar(this.rng, 'police', 0x1a1e28);
    this.scene.add(car.group);
    const cruiser = {
      car,
      callsign: CRUISER_CALLSIGNS[this.callsignIndex % CRUISER_CALLSIGNS.length],
      state: 'Pursuit',
      speed: 0,
    };
    this.callsignIndex += 1;
    this.cruisers.push(cruiser);
    return cruiser;
  }

  spawnOfficer(x, z) {
    const rig = createHumanoid(copLook(this.rng), 'pistol');
    rig.group.position.set(x, 0, z);
    this.scene.add(rig.group);
    const officer = {
      rig,
      callsign: OFFICER_CALLSIGNS[this.officerIndex % OFFICER_CALLSIGNS.length],
      state: 'Pursuit',
      arrestTimer: 0,
      down: false,
    };
    this.officerIndex += 1;
    this.officers.push(officer);
    return officer;
  }

  spawnHeli() {
    if (this.heli) return this.heli;
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.4, metalness: 0.5 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.4, metalness: 0.3 });
    // Body: a rounded cabin + a tail boom, scaled up to read in the sky.
    const cabin = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 2.2, 6, 12), bodyMat);
    cabin.rotation.x = Math.PI / 2;
    cabin.position.y = 0;
    cabin.castShadow = true;
    group.add(cabin);
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x2e4258, roughness: 0.15, metalness: 0.2 }),
    );
    nose.scale.set(1, 0.85, 0.9);
    nose.position.set(0, -0.1, 1.9);
    group.add(nose);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.18, 4.2, 8), whiteMat);
    boom.rotation.x = Math.PI / 2;
    boom.position.set(0, 0.2, -3.4);
    group.add(boom);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.9), bodyMat);
    fin.position.set(0, 0.7, -5.3);
    group.add(fin);
    // Tail rotor.
    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.14), bodyMat);
    tailRotor.position.set(0.3, 0.4, -5.3);
    group.add(tailRotor);
    // Main rotor: a mast + two long blades + a translucent disc.
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 6), bodyMat);
    mast.position.y = 1.3;
    group.add(mast);
    const rotor = new THREE.Group();
    rotor.position.y = 1.8;
    for (const angle of [0, Math.PI / 2]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.06, 0.35), bodyMat);
      blade.rotation.y = angle;
      rotor.add(blade);
    }
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(4.8, 24),
      new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
    );
    disc.rotation.x = -Math.PI / 2;
    rotor.add(disc);
    group.add(rotor);
    // Skids.
    for (const side of [-1, 1]) {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 6), bodyMat);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(side * 1.1, -1.3, 0);
      group.add(skid);
      for (const sz of [-1, 1]) {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 5), bodyMat);
        strut.position.set(side * 1.1, -0.95, sz * 1.2);
        group.add(strut);
      }
    }
    // Beacon: a red lamp that blinks.
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xff2a22, emissive: 0xff2a22, emissiveIntensity: 2.5, roughness: 0.4,
    });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), beaconMat);
    beacon.position.set(0, -0.9, -1.6);
    group.add(beacon);
    // Searchlight: a cone from the belly + a pool where it lands.
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(4.5, 48, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff2c0, transparent: true, opacity: 0.13,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }),
    );
    // Pre-rotated so the group's lookAt aims the cone down its axis.
    beam.geometry.rotateX(-Math.PI / 2);
    beam.geometry.translate(0, 0, -24);
    this.scene.add(beam);
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 11),
      new THREE.MeshBasicMaterial({
        map: glowPool(), color: 0xfff2c0, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.15;
    this.scene.add(pool);
    group.scale.setScalar(1.25);
    this.scene.add(group);
    this.heli = {
      group, rotor, beam, pool, beacon, beaconMat,
      callsign: HELI_CALLSIGN, state: 'Air support',
    };
    return this.heli;
  }

  removeHeli() {
    if (!this.heli) return;
    this.scene.remove(this.heli.group);
    this.scene.remove(this.heli.beam);
    this.scene.remove(this.heli.pool);
    this.heli = null;
  }

  removeAllUnits() {
    for (const cruiser of this.cruisers) this.scene.remove(cruiser.car.group);
    for (const officer of this.officers) this.scene.remove(officer.rig.group);
    this.cruisers = [];
    this.officers = [];
    this.removeHeli();
  }

  spawnForStars() {
    // Cruisers: one per star up to four; officers from two stars; the
    // helicopter from three. Units already out stay out.
    const wantCruisers = Math.min(4, this.stars);
    const wantOfficers = this.stars >= 2 ? Math.min(3, this.stars - 1) : 0;
    while (this.cruisers.length < wantCruisers) this.spawnCruiser();
    while (this.officers.length < wantOfficers) {
      const spot = this.spawnPoint(0, 0);
      this.spawnOfficer(spot.x, spot.z);
    }
    if (this.stars >= HEAT_RULES.heliStars) this.spawnHeli();
    else this.removeHeli();
  }

  responseList(playerX, playerZ) {
    const list = [];
    for (const cruiser of this.cruisers) {
      const pos = cruiser.car.group.position;
      list.push({
        name: cruiser.callsign,
        distance: Math.round(Math.hypot(pos.x - playerX, pos.z - playerZ)),
        state: cruiser.state.toUpperCase(),
      });
    }
    for (const officer of this.officers) {
      if (officer.down) continue;
      const pos = officer.rig.group.position;
      list.push({
        name: officer.callsign,
        distance: Math.round(Math.hypot(pos.x - playerX, pos.z - playerZ)),
        state: officer.state.toUpperCase(),
      });
    }
    if (this.heli) {
      const pos = this.heli.group.position;
      list.push({
        name: this.heli.callsign,
        distance: Math.round(Math.hypot(pos.x - playerX, pos.z - playerZ)),
        state: this.heli.state.toUpperCase(),
      });
    }
    return list;
  }

  blips() {
    const out = [];
    for (const cruiser of this.cruisers) {
      const pos = cruiser.car.group.position;
      out.push({ x: pos.x, z: pos.z, kind: 'police' });
    }
    for (const officer of this.officers) {
      if (officer.down) continue;
      const pos = officer.rig.group.position;
      out.push({ x: pos.x, z: pos.z, kind: 'police' });
    }
    if (this.heli) {
      out.push({ x: this.heli.group.position.x, z: this.heli.group.position.z, kind: 'heli' });
    }
    return out;
  }

  officerRigs() {
    return this.officers.filter((o) => !o.down).map((o) => ({ rig: o.rig, officer: o }));
  }

  knockDownOfficer(officer) {
    if (officer.down) return;
    officer.down = true;
    layHumanoidDown(officer.rig);
  }

  update(dt, context) {
    const { playerX, playerZ, playerCar, time } = context;
    // Decay: a star drops after decayDelay seconds with no unit close.
    if (this.stars > 0) {
      const nearest = this.nearestUnitDistance(playerX, playerZ);
      if (nearest < 45) this.lastSeen = time;
      else if (time - this.lastSeen > HEAT_RULES.decayDelay) {
        this.stars -= 1;
        this.lastSeen = time;
        if (this.cruisers.length > this.stars && this.cruisers.length > 0) {
          const gone = this.cruisers.pop();
          this.scene.remove(gone.car.group);
        }
        if (this.stars < HEAT_RULES.heliStars) this.removeHeli();
      }
    }
    // Cruisers chase: steer toward the player, ram on contact.
    for (const cruiser of this.cruisers) {
      const car = cruiser.car;
      const pos = car.group.position;
      const dx = playerX - pos.x;
      const dz = playerZ - pos.z;
      const dist = Math.hypot(dx, dz);
      const desired = Math.atan2(dx, dz);
      let diff = desired - car.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.group.rotation.y += THREE.MathUtils.clamp(diff, -2.4 * dt, 2.4 * dt);
      const targetSpeed = dist > 6 ? CRUISER_SPEED : CRUISER_SPEED * 0.6;
      cruiser.speed += (targetSpeed - cruiser.speed) * Math.min(1, dt * 1.5);
      pos.x += Math.sin(car.group.rotation.y) * cruiser.speed * dt;
      pos.z += Math.cos(car.group.rotation.y) * cruiser.speed * dt;
      const land = clampToLand(pos.x, pos.z, 2);
      pos.x = land.x;
      pos.z = land.z;
      const p = { x: pos.x, z: pos.z };
      pushOutOfColliders(p, 1.6, this.colliders);
      if (Math.hypot(p.x - pos.x, p.z - pos.z) > 0.05) {
        pos.x = p.x;
        pos.z = p.z;
        cruiser.speed *= 0.4;
        // Nudge the heading away from the wall it just hit.
        car.group.rotation.y += 0.5 * dt * 4;
      }
      // Ram: contact with the player's car shoves it and hurts it.
      if (playerCar && dist < 3.2) {
        context.onRam?.(cruiser, dist);
      } else if (!playerCar && dist < 2.2) {
        context.onRamPerson?.(cruiser);
      }
      updateCar(car, cruiser.speed, THREE.MathUtils.clamp(diff, -1, 1), dt);
      flashLightBar(car, time);
      cruiser.state = dist < 30 ? 'Pursuit' : 'Responding';
    }
    // Officers run at Dana; close in long enough and she is cuffed.
    for (const officer of this.officers) {
      if (officer.down) continue;
      const pos = officer.rig.group.position;
      const dx = playerX - pos.x;
      const dz = playerZ - pos.z;
      const dist = Math.hypot(dx, dz);
      if (playerCar || dist > 2.5) {
        officer.arrestTimer = 0;
        officer.state = 'Pursuit';
        const desired = Math.atan2(dx, dz);
        let diff = desired - officer.rig.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        officer.rig.group.rotation.y += diff * Math.min(1, dt * 8);
        pos.x += Math.sin(officer.rig.group.rotation.y) * OFFICER_SPEED * dt;
        pos.z += Math.cos(officer.rig.group.rotation.y) * OFFICER_SPEED * dt;
        const land = clampToLand(pos.x, pos.z, 1);
        pos.x = land.x;
        pos.z = land.z;
        const p = { x: pos.x, z: pos.z };
        pushOutOfColliders(p, 0.6, this.colliders);
        pos.x = p.x;
        pos.z = p.z;
        animateHumanoid(officer.rig, dt, OFFICER_SPEED, false);
      } else {
        // Close in: the arrest hold counts up.
        officer.arrestTimer += dt;
        officer.state = 'Arresting';
        context.onArrestProgress?.(officer.arrestTimer / HEAT_RULES.arrestHold);
        animateHumanoid(officer.rig, dt, 0, false);
        if (officer.arrestTimer >= HEAT_RULES.arrestHold) {
          context.onArrest?.();
          officer.arrestTimer = 0;
        }
      }
    }
    // The helicopter shadows Dana from above, searchlight pinned on her.
    if (this.heli) {
      const heli = this.heli;
      const target = new THREE.Vector3(playerX + 14, 26, playerZ - 10);
      heli.group.position.lerp(target, Math.min(1, dt * 0.7));
      heli.group.rotation.y = Math.atan2(playerX - heli.group.position.x, playerZ - heli.group.position.z);
      heli.rotor.rotation.y += dt * 22;
      heli.beaconMat.emissiveIntensity = (Math.sin(time * 6) > 0) ? 3.2 : 0.4;
      heli.beam.position.copy(heli.group.position).add(new THREE.Vector3(0, -1, 0));
      heli.beam.lookAt(playerX, 0, playerZ);
      heli.pool.position.set(playerX, 0.15, playerZ);
    }
  }

  nearestUnitDistance(playerX, playerZ) {
    let best = Infinity;
    for (const cruiser of this.cruisers) {
      const pos = cruiser.car.group.position;
      best = Math.min(best, Math.hypot(pos.x - playerX, pos.z - playerZ));
    }
    for (const officer of this.officers) {
      if (officer.down) continue;
      const pos = officer.rig.group.position;
      best = Math.min(best, Math.hypot(pos.x - playerX, pos.z - playerZ));
    }
    if (this.heli) {
      const pos = this.heli.group.position;
      best = Math.min(best, Math.hypot(pos.x - playerX, pos.z - playerZ));
    }
    return best;
  }
}
