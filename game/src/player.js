// The hero: Dana on foot and behind the wheel, and her camera.
//
// One job: move Dana, drive her car, and point the camera. The camera is a
// third-person follow cam — low and close on foot, lower and further back
// in the car — and the aim is honest: the look target follows the pitch,
// so the crosshair ray goes where the player looks.
//
// Two fixes live here, both proven against v2's behaviour:
//   MOUSE PITCH (v3 was inverted): mouse UP raises the pitch (look up).
//   v3 added dy to the pitch, so moving the mouse down looked up; v2
//   subtracted it, which is the standard. v4 subtracts, like v2.
//   AIMED FIRE (v3's shots dived into the ground past ~18 m): v3's camera
//   looked at a fixed point, so the shot ray fell short of the crosshair
//   at range. v4's look target rises with sin(pitch) * 2.0, exactly as
//   v2's did — the ray follows the pitch, and kills at range work.

import { CAMERA_TUNING, DRIVE_STATS, HERO_STATS } from './config.js';
import { animateHumanoid, createHumanoid, danaLook, muzzleWorld } from './people.js';
import { pushOutOfColliders } from './buildings.js';
import { clampToLand } from './ground.js';
import { updateCar } from './cars.js';

const MOUSE_SENSITIVITY = 0.0022;

export class Player {
  constructor(scene, rng, colliders) {
    this.scene = scene;
    this.colliders = colliders;
    this.rig = createHumanoid(danaLook(), 'rifle');
    scene.add(this.rig.group);
    this.x = 0;
    this.z = 0;
    this.heading = 0; // facing direction: (sin h, cos h) in (x, z)
    this.cameraYaw = Math.PI;
    this.cameraPitch = 0.32;
    this.cameraDistance = CAMERA_TUNING.onFootDist;
    this.cameraHeight = CAMERA_TUNING.onFootHeight;
    this.inCar = null; // the traffic record Dana is driving, or null
    this.speed = 0; // on-foot speed, for the walk cycle
    this.carSpeed = 0; // signed speed along the car's heading
    this.carVelocity = { x: 0, z: 0 }; // world velocity: lags the heading in a drift
    this.steer = 0; // smoothed steering input, -1..1
    this.drifting = false;
    this.aiming = false;
    this.nearMissCooldown = 0;
    this.lastNearMissCar = null;
  }

  reset(x, z) {
    this.leaveCar(true);
    this.spawnAt(x, z, Math.PI);
    this.carSpeed = 0;
    this.carVelocity = { x: 0, z: 0 };
  }

  spawnAt(x, z, angle) {
    this.x = x;
    this.z = z;
    this.heading = angle;
    this.rig.group.position.set(x, 0, z);
    this.rig.group.rotation.y = angle;
  }

  enterCar(record) {
    this.inCar = record;
    this.carSpeed = 0;
    this.carVelocity = { x: 0, z: 0 };
    this.rig.group.visible = false;
    this.cameraDistance = CAMERA_TUNING.driveDist;
    this.cameraHeight = CAMERA_TUNING.driveHeight;
  }

  leaveCar(silent = false) {
    if (!this.inCar) return;
    this.inCar.taken = false;
    const car = this.inCar.car;
    const pos = car.group.position;
    const heading = car.group.rotation.y;
    // Step out on the driver's side, clear of the car.
    this.x = pos.x + Math.cos(heading) * 2.2;
    this.z = pos.z - Math.sin(heading) * 2.2;
    const land = clampToLand(this.x, this.z, 1);
    this.x = land.x;
    this.z = land.z;
    this.heading = heading;
    this.inCar = null;
    this.carSpeed = 0;
    this.rig.group.visible = true;
    this.rig.group.position.set(this.x, 0, this.z);
    this.rig.group.rotation.y = heading;
    this.cameraDistance = CAMERA_TUNING.onFootDist;
    this.cameraHeight = CAMERA_TUNING.onFootHeight;
    if (!silent) this.cameraYaw = heading;
  }

  update(dt, input, context) {
    // Mouse look: yaw follows dx, pitch follows dy the STANDARD way —
    // mouse up (dy negative) raises the pitch. v3 had this backwards.
    const mouse = input.takeMouse();
    this.cameraYaw -= mouse.dx * MOUSE_SENSITIVITY;
    this.cameraPitch = THREE.MathUtils.clamp(
      this.cameraPitch - mouse.dy * MOUSE_SENSITIVITY, -0.1, 0.9,
    );
    this.aiming = input.aimDown && !this.inCar;
    if (this.inCar) this.updateDriving(dt, input, context);
    else this.updateWalking(dt, input, context);
    if (this.nearMissCooldown > 0) this.nearMissCooldown -= dt;
  }

  updateWalking(dt, input, context) {
    let forward = 0;
    let strafe = 0;
    if (input.held('KeyW')) forward += 1;
    if (input.held('KeyS')) forward -= 1;
    if (input.held('KeyA')) strafe -= 1;
    if (input.held('KeyD')) strafe += 1;
    const running = input.held('ShiftLeft') || input.held('ShiftRight');
    const topSpeed = running ? HERO_STATS.run : HERO_STATS.walk;
    const moving = forward !== 0 || strafe !== 0;
    if (moving) {
      // Movement is camera-relative: W walks away from the camera.
      const sin = Math.sin(this.cameraYaw);
      const cos = Math.cos(this.cameraYaw);
      let dx = sin * forward + cos * strafe;
      let dz = cos * forward - sin * strafe;
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
      this.speed = topSpeed;
      this.x += dx * topSpeed * dt;
      this.z += dz * topSpeed * dt;
      // Face the movement, or the camera while aiming.
      const targetHeading = this.aiming ? this.cameraYaw : Math.atan2(dx, dz);
      let diff = targetHeading - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * Math.min(1, dt * (this.aiming ? 18 : 10));
    } else {
      this.speed = 0;
      if (this.aiming) {
        let diff = this.cameraYaw - this.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.heading += diff * Math.min(1, dt * 18);
      }
    }
    const pos = { x: this.x, z: this.z };
    pushOutOfColliders(pos, 0.6, this.colliders);
    // The waterline clamp runs AFTER the collider push: the push can shove
    // the player past the line (the lighthouse collider sits 4 m from it),
    // so the clamp is the final word on where the player may stand.
    const land = clampToLand(pos.x, pos.z, 1);
    this.x = land.x;
    this.z = land.z;
    this.rig.group.position.set(this.x, 0, this.z);
    this.rig.group.rotation.y = this.heading;
    animateHumanoid(this.rig, dt, this.speed, this.aiming);
    context?.onFootstep?.(this.speed);
  }

  updateDriving(dt, input, context) {
    const car = this.inCar.car;
    const stats = DRIVE_STATS;
    // Steering input, smoothed so the wheel does not snap.
    let steerTarget = 0;
    if (input.held('KeyA')) steerTarget += 1;
    if (input.held('KeyD')) steerTarget -= 1;
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    const handbrake = input.held('Space');
    // Throttle and brake.
    if (input.held('KeyW')) this.carSpeed += stats.accel * dt;
    if (input.held('KeyS')) {
      if (this.carSpeed > 0.5) this.carSpeed -= stats.brake * dt;
      else this.carSpeed -= stats.accel * 0.6 * dt;
    }
    // Drag + rolling resistance.
    this.carSpeed -= this.carSpeed * 0.28 * dt;
    if (!input.held('KeyW') && !input.held('KeyS')) this.carSpeed -= this.carSpeed * 0.5 * dt;
    if (handbrake) this.carSpeed -= this.carSpeed * 1.2 * dt;
    this.carSpeed = THREE.MathUtils.clamp(this.carSpeed, -stats.reverse, stats.topSpeed);
    if (Math.abs(this.carSpeed) < 0.05 && !input.held('KeyW')) this.carSpeed = 0;
    // Steering: yaw rate scales with speed, reverses in reverse.
    const speedFactor = THREE.MathUtils.clamp(Math.abs(this.carSpeed) / 12, 0.25, 1);
    const direction = this.carSpeed >= 0 ? 1 : -1;
    const yawRate = this.steer * stats.steerRate * speedFactor * direction * (handbrake ? 1.5 : 1);
    car.group.rotation.y += yawRate * dt;
    const heading = car.group.rotation.y;
    // Velocity chases the heading: fast on grip, slow on the handbrake —
    // the lag IS the drift, and the drift angle is measurable.
    const desiredX = Math.sin(heading) * this.carSpeed;
    const desiredZ = Math.cos(heading) * this.carSpeed;
    const gripRate = handbrake ? 2.0 : 9.0;
    const blend = Math.min(1, gripRate * dt);
    this.carVelocity.x += (desiredX - this.carVelocity.x) * blend;
    this.carVelocity.z += (desiredZ - this.carVelocity.z) * blend;
    const pos = car.group.position;
    pos.x += this.carVelocity.x * dt;
    pos.z += this.carVelocity.z * dt;
    // Colliders: push out and bleed speed, with a crash report.
    const before = { x: pos.x, z: pos.z };
    const p = { x: pos.x, z: pos.z };
    pushOutOfColliders(p, 1.6, this.colliders);
    const pushed = Math.hypot(p.x - before.x, p.z - before.z);
    if (pushed > 0.01) {
      pos.x = p.x;
      pos.z = p.z;
      const impact = Math.abs(this.carSpeed);
      this.carSpeed *= 0.35;
      this.carVelocity.x *= 0.35;
      this.carVelocity.z *= 0.35;
      if (impact > 6) context?.onCrash?.(impact);
    }
    // The waterline clamp runs AFTER the collider push, for the same
    // reason as on foot: the push is allowed to shove the car around,
    // the clamp is the final word on where it may sit.
    const land = clampToLand(pos.x, pos.z, 2);
    pos.x = land.x;
    pos.z = land.z;
    // Drift: handbrake + speed + a real slide angle between velocity and heading.
    const velSpeed = Math.hypot(this.carVelocity.x, this.carVelocity.z);
    const slideAngle = velSpeed > 6
      ? Math.abs(Math.atan2(this.carVelocity.x, this.carVelocity.z) - heading)
      : 0;
    const wasDrifting = this.drifting;
    this.drifting = handbrake && velSpeed > 12 && slideAngle > 0.3;
    if (this.drifting && !wasDrifting) context?.onDrift?.();
    // Near-miss: fast, close, no contact — scored once per car.
    if (context?.traffic && velSpeed > 15 && this.nearMissCooldown <= 0) {
      for (const other of context.traffic.moving) {
        if (other === this.inCar) continue;
        const op = other.car.group.position;
        const dist = Math.hypot(op.x - pos.x, op.z - pos.z);
        if (dist < 3.4 && dist > 2.0 && other !== this.lastNearMissCar) {
          this.lastNearMissCar = other;
          this.nearMissCooldown = 2;
          context.onNearMiss?.();
          break;
        }
      }
    }
    this.x = pos.x;
    this.z = pos.z;
    updateCar(car, this.carSpeed, this.steer, dt);
    context?.onDrive?.(velSpeed);
  }

  updateCamera(camera, dt) {
    const inCar = Boolean(this.inCar);
    const target = inCar ? this.inCar.car.group.position : this.rig.group.position;
    const headY = inCar ? 1.2 : HERO_STATS.eyeHeight;
    // In the car the camera swings behind the heading; on foot it stays
    // where the mouse put it.
    if (inCar) {
      const carHeading = this.inCar.car.group.rotation.y;
      let diff = carHeading - this.cameraYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.cameraYaw += diff * Math.min(1, dt * 2.2);
    }
    // The aim camera sits a little further back than v3's (3.6/2.0 vs
    // 3.0/1.7): at 3.0 m Dana was cropped to a head and a rifle barrel in
    // the combat frame, and the muzzle flash filled the screen.
    const distance = this.aiming ? 3.6 : this.cameraDistance;
    const height = this.aiming ? 2.0 : this.cameraHeight;
    // v2's camera geometry, which aimed true: the camera drops as the
    // pitch rises, and the look point rises with the pitch — so the
    // crosshair ray follows the pitch instead of diving at range.
    const pitchDrop = Math.sin(this.cameraPitch) * distance;
    const cx = target.x - Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * distance;
    const cy = headY + height - pitchDrop * 0.4;
    const cz = target.z - Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * distance;
    // Over-the-shoulder while aiming: shift the camera right of the spine.
    const shoulder = this.aiming ? CAMERA_TUNING.onFootShoulder : 0;
    const sx = Math.cos(this.cameraYaw) * shoulder;
    const sz = -Math.sin(this.cameraYaw) * shoulder;
    camera.position.set(cx + sx, Math.max(0.6, cy), cz + sz);
    const ahead = this.aiming ? 8 : 3;
    camera.lookAt(
      target.x + Math.sin(this.cameraYaw) * ahead + sx,
      headY + 0.4 + Math.sin(this.cameraPitch) * 2.0,
      target.z + Math.cos(this.cameraYaw) * ahead + sz,
    );
    // FOV: wider in the car, wider still at speed; narrower while aiming.
    const speedNorm = inCar
      ? THREE.MathUtils.clamp(Math.abs(this.carSpeed) / DRIVE_STATS.topSpeed, 0, 1)
      : 0;
    const targetFov = this.aiming
      ? 50
      : (inCar ? CAMERA_TUNING.driveFov : CAMERA_TUNING.fov) + speedNorm * CAMERA_TUNING.fovKick;
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
      camera.updateProjectionMatrix();
    }
  }

  // Place the camera exactly (screenshot staging): yaw, pitch, distance, height.
  snapCamera(camera, yaw, pitch, distance, height) {
    this.cameraYaw = yaw;
    this.cameraPitch = pitch;
    this.cameraDistance = distance;
    this.cameraHeight = height;
    this.updateCamera(camera, 1);
  }

  muzzlePosition(out) {
    return muzzleWorld(this.rig, out);
  }
}
