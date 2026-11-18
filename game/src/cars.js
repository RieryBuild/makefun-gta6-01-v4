// Vehicles: multi-part cars with readable silhouettes and police livery.
//
// One job: build the cars — sports, sedan, pickup, van, taxi and the SBPD
// cruiser — as modelled shapes, never a single rounded box: a distinct
// hood, a glass cabin, cylinder wheels with hubs, headlights and
// taillights, bumpers, mirrors and a grille.
//
// The police fix, stated once: v3's cruisers read as brown boxes at
// distance — the livery was too subtle and the light bar too dim. v4's
// cruiser is two-tone (white doors + roof over a black body), wears the
// SBPD door decal on both sides, and carries a roof bar whose red and blue
// halves flash ALTERNATELY at full emissive, with a glow sprite that
// pulses with them. At 50 m the flash, not the decal, is what reads.

import { policeDoor } from './textures.js';

export const PAINT_JOBS = [
  0xc23a2e, 0x2e6a8a, 0xd8c84a, 0x4a7a5a, 0xe8e0d0, 0x3a3f46,
  0x8a5a9a, 0xd88a2e, 0x6a8a9a, 0xa83232, 0x2e5a4a, 0xb8b0a0,
];

export const CAR_NAMES = {
  sports: 'Marlin GT',
  sedan: 'Coral Sedan',
  pickup: 'Bay Hauler',
  van: 'Rusty Van',
  taxi: 'Solmar Cab',
  police: 'SBPD Interceptor',
};

function paintMaterial(colour, metalness = 0.55) {
  // envMapIntensity 0.5: at the default 1.0 the bright pink sunset
  // environment washed the paint toward pale pink, and the hero car read
  // as a ghost against the purple road. (Caught in the first v4 screenshots;
  // the materials were never transparent — the env reflection was.)
  return new THREE.MeshStandardMaterial({
    color: colour, roughness: 0.35, metalness, envMapIntensity: 0.5,
  });
}

function glassMaterial() {
  // Glass that reads as tinted glass, not a white box: the first v4 chase
  // shot had the cabin blowing out to pale pink-white — the bright sunset
  // environment reflecting off a light blue-grey base. Darker base,
  // rougher, dimmer env: the cabin now reads as glass against the paint.
  // (Dark glass + high metalness was v3's black-void bug; this is the
  // middle ground: dark enough to read, rough enough not to mirror.)
  return new THREE.MeshStandardMaterial({
    color: 0x24384e, roughness: 0.25, metalness: 0.1, envMapIntensity: 0.4,
  });
}

function lampMesh(colour, intensity, width = 0.34) {
  // Taillights run dimmer than headlights: red emissive at 1.6 blows out
  // white under ACES. The lamp face is rough, so the sun's specular glint
  // does not wash the red out either.
  const mat = new THREE.MeshStandardMaterial({
    color: colour, emissive: colour, emissiveIntensity: intensity, roughness: 0.9,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.14, 0.08), mat);
  mesh.userData.baseIntensity = intensity;
  return mesh;
}

function makeWheel(radius, width) {
  const group = new THREE.Group();
  const tyre = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 14),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 }),
  );
  tyre.rotation.z = Math.PI / 2;
  group.add(tyre);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.02, 10),
    new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.35, metalness: 0.7 }),
  );
  hub.rotation.z = Math.PI / 2;
  group.add(hub);
  return group;
}

export function createCar(rng, type, colour) {
  const group = new THREE.Group();
  const paint = paintMaterial(colour);
  const glass = glassMaterial();
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.3, metalness: 0.6 });
  const isSports = type === 'sports';
  const isPickup = type === 'pickup';
  const isVan = type === 'van';
  const isPolice = type === 'police';

  // Dimensions per type: the sports car is low and wide, the van tall.
  const dims = {
    sports: { w: 2.0, l: 4.5, bodyH: 0.62, bodyY: 0.55, cabW: 1.7, cabL: 2.0, cabY: 1.05, wheelR: 0.36 },
    sedan: { w: 1.9, l: 4.4, bodyH: 0.7, bodyY: 0.6, cabW: 1.65, cabL: 2.2, cabY: 1.12, wheelR: 0.34 },
    pickup: { w: 2.0, l: 4.8, bodyH: 0.75, bodyY: 0.68, cabW: 1.7, cabL: 1.5, cabY: 1.2, wheelR: 0.38 },
    van: { w: 2.0, l: 4.6, bodyH: 1.5, bodyY: 1.0, cabW: 1.8, cabL: 1.2, cabY: 1.85, wheelR: 0.36 },
    taxi: { w: 1.9, l: 4.4, bodyH: 0.7, bodyY: 0.6, cabW: 1.65, cabL: 2.2, cabY: 1.12, wheelR: 0.34 },
    police: { w: 1.95, l: 4.5, bodyH: 0.72, bodyY: 0.6, cabW: 1.65, cabL: 2.2, cabY: 1.14, wheelR: 0.35 },
  }[type] || { w: 1.9, l: 4.4, bodyH: 0.7, bodyY: 0.6, cabW: 1.65, cabL: 2.2, cabY: 1.12, wheelR: 0.34 };

  // The police body is two-tone: black below, white roof and doors.
  // Same envMapIntensity 0.5 as the paint: the black body went grey-white
  // under the sunset environment at the default.
  const bodyMat = isPolice
    ? new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 0.35, metalness: 0.55, envMapIntensity: 0.5 })
    : paint;

  // Main body: lower shell + hood slope + trunk slope, so the profile
  // reads as a car from the side, not a slab.
  const body = new THREE.Mesh(new THREE.BoxGeometry(dims.w, dims.bodyH, dims.l), bodyMat);
  body.position.y = dims.bodyY;
  body.castShadow = true;
  group.add(body);
  if (!isVan) {
    const hood = new THREE.Mesh(new THREE.BoxGeometry(dims.w * 0.96, 0.16, 1.1), bodyMat);
    hood.position.set(0, dims.bodyY + dims.bodyH / 2 + 0.02, dims.l / 2 - 0.7);
    hood.rotation.x = -0.1;
    group.add(hood);
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(dims.w * 0.96, 0.14, 0.9), bodyMat);
    trunk.position.set(0, dims.bodyY + dims.bodyH / 2 + 0.01, -dims.l / 2 + 0.6);
    trunk.rotation.x = 0.08;
    group.add(trunk);
  }

  // Cabin: glass all round with a painted roof.
  if (!isPickup) {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(dims.cabW, 0.62, dims.cabL), glass);
    cabin.position.set(0, dims.cabY, isVan ? dims.l / 2 - 1.0 : -0.2);
    cabin.castShadow = true;
    group.add(cabin);
    const roofMat = isPolice
      ? new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.4, metalness: 0.3, envMapIntensity: 0.5 })
      : paint;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(dims.cabW + 0.06, 0.08, dims.cabL + 0.06), roofMat);
    roof.position.set(0, dims.cabY + 0.34, isVan ? dims.l / 2 - 1.0 : -0.2);
    group.add(roof);
  } else {
    // Pickup: cab forward, open bed behind with side walls.
    const cab = new THREE.Mesh(new THREE.BoxGeometry(dims.cabW, 0.62, dims.cabL), glass);
    cab.position.set(0, dims.cabY, dims.l / 2 - 1.2);
    cab.castShadow = true;
    group.add(cab);
    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(dims.cabW + 0.06, 0.08, dims.cabL + 0.06), paint);
    cabRoof.position.set(0, dims.cabY + 0.34, dims.l / 2 - 1.2);
    group.add(cabRoof);
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 2.2), paint);
      wall.position.set(side * (dims.w / 2 - 0.04), dims.bodyY + 0.45, -1.1);
      group.add(wall);
    }
    const tailgate = new THREE.Mesh(new THREE.BoxGeometry(dims.w, 0.45, 0.08), paint);
    tailgate.position.set(0, dims.bodyY + 0.45, -dims.l / 2 + 0.04);
    group.add(tailgate);
  }

  // Sports spoiler.
  if (isSports) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.4), bodyMat);
    wing.position.set(0, 1.15, -dims.l / 2 + 0.3);
    group.add(wing);
    for (const side of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08), bodyMat);
      strut.position.set(side * 0.7, 0.98, -dims.l / 2 + 0.3);
      group.add(strut);
    }
  }

  // Taxi roof sign.
  if (type === 'taxi') {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xaa7a00, emissiveIntensity: 0.6, roughness: 0.6 }),
    );
    sign.position.set(0, dims.cabY + 0.5, -0.2);
    group.add(sign);
  }

  // Wheels: four, steered at the front.
  const wheels = [];
  const wheelY = dims.wheelR;
  const wheelX = dims.w / 2 - 0.05;
  const wheelZ = dims.l / 2 - 0.85;
  for (const [wx, wz, front] of [
    [-wheelX, wheelZ, true], [wheelX, wheelZ, true],
    [-wheelX, -wheelZ, false], [wheelX, -wheelZ, false],
  ]) {
    const steer = new THREE.Group();
    steer.position.set(wx, wheelY, wz);
    const wheel = makeWheel(dims.wheelR, 0.26);
    steer.add(wheel);
    group.add(steer);
    wheels.push({ steer, wheel, front });
  }

  // Headlights (white, bright) and taillights (red, dimmer — see lampMesh).
  for (const side of [-1, 1]) {
    const head = lampMesh(0xfff2c0, 1.6, 0.36);
    head.position.set(side * (dims.w / 2 - 0.35), dims.bodyY + 0.12, dims.l / 2 + 0.02);
    group.add(head);
    const tail = lampMesh(0xe01818, 0.9, 0.36);
    tail.position.set(side * (dims.w / 2 - 0.35), dims.bodyY + 0.12, -dims.l / 2 - 0.02);
    tail.rotation.y = Math.PI;
    group.add(tail);
  }
  // Sports rear light bar: one wide red strip.
  if (isSports) {
    const bar = lampMesh(0xe01818, 0.9, 1.5);
    bar.position.set(0, dims.bodyY + 0.14, -dims.l / 2 - 0.02);
    bar.rotation.y = Math.PI;
    group.add(bar);
  }

  // Bumpers + grille + mirrors.
  for (const [bz, flip] of [[dims.l / 2, 1], [-dims.l / 2, -1]]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(dims.w + 0.06, 0.18, 0.12), chrome);
    bumper.position.set(0, dims.bodyY - dims.bodyH / 2 + 0.12, bz + flip * 0.04);
    group.add(bumper);
  }
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.22, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 }),
  );
  grille.position.set(0, dims.bodyY + 0.02, dims.l / 2 + 0.02);
  group.add(grille);
  for (const side of [-1, 1]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.2), bodyMat);
    mirror.position.set(side * (dims.w / 2 + 0.05), dims.cabY - 0.1, isVan ? dims.l / 2 - 1.6 : 0.7);
    group.add(mirror);
  }

  // ---- Police livery: white doors with the SBPD decal + light bar ----
  let lightBar = null;
  if (isPolice) {
    const doorTex = policeDoor();
    const doorMat = new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.5, metalness: 0.2 });
    for (const side of [-1, 1]) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), doorMat);
      door.position.set(side * (dims.w / 2 + 0.02), dims.bodyY + 0.05, -0.1);
      door.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(door);
    }
    // Roof light bar: red left, blue right, on a dark base.
    const barGroup = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.1, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.4 }),
    );
    barGroup.add(base);
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xff2a22, emissive: 0xff2a22, emissiveIntensity: 2.4, roughness: 0.4,
    });
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x2266ff, emissive: 0x2266ff, emissiveIntensity: 0.2, roughness: 0.4,
    });
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.4), redMat);
    red.position.set(-0.32, 0.15, 0);
    barGroup.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.4), blueMat);
    blue.position.set(0.32, 0.15, 0);
    barGroup.add(blue);
    barGroup.position.set(0, dims.cabY + 0.42, -0.2);
    group.add(barGroup);
    lightBar = { redMat, blueMat, phase: rng.between(0, Math.PI * 2) };
  }

  if (isSports) group.scale.setScalar(1.08); // the hero car reads BIG
  return {
    group, wheels, lightBar, type,
    name: CAR_NAMES[type] || 'Car',
    paint: colour,
    length: dims.l,
    width: dims.w,
  };
}

// Spin the wheels with speed; yaw the front pair with steering.
export function updateCar(car, speed, steer, dt) {
  for (const w of car.wheels) {
    w.wheel.rotation.x += (speed / 0.35) * dt;
    if (w.front) w.steer.rotation.y = steer * 0.45;
  }
}

// Alternate the light bar: red and blue trade places twice a second, so
// the cruiser flashes even in a still frame — one half is always hot.
export function flashLightBar(car, time) {
  if (!car.lightBar) return;
  const phase = Math.sin((time + car.lightBar.phase) * 9.0) > 0;
  car.lightBar.redMat.emissiveIntensity = phase ? 2.6 : 0.15;
  car.lightBar.blueMat.emissiveIntensity = phase ? 0.15 : 2.6;
}
