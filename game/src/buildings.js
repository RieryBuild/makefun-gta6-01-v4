// The city: districts, archetypes, facades and colliders.
//
// One job: raise Puerto del Sol — one building per block (two where the
// archetype is small), each with a coherent facade, a varied silhouette and
// a collider the player, the traffic and the enemies all respect.
//
// Six archetypes, one per district family:
//   tower     — downtown glass, set back at the top, antenna on the roof
//   midrise   — midtown stucco with a shopfront, sign and striped awning
//   walkup    — old-town pastel stucco with balconies and a tile roof
//   warehouse — docks brick with a roller door and roof vents
//   villa     — beachfront pastel Art Deco, stepped parapet, flat roof
//   estate    — hills walled villa with a gate, driveway and garden
// Landmark blocks get hand-placed buildings instead: Rosa's garage, the
// hospital, the police station, the water tower and the beach pavilion.
//
// Facades follow the rule in textures.js: aligned window grids, one palette
// per building, lit floors by rule. The lit rule lives here: a window is
// lit when its floor and column satisfy a small function of the block, so
// the same building always shows the same lit pattern and no two neighbours
// match.

import {
  BLOCK_MAX, BLOCK_MIN, DISTRICT_NAMES, GRID_PITCH, ROAD_WIDTH,
  blockCenter, districtAt, facadeAt, floorsAt,
} from './config.js';
import {
  awningStripes, brickFacade, glassFacade, roofTop, shopSign, stuccoFacade,
  tileRoof,
} from './textures.js';

const FLOOR_HEIGHT = 3.4;
// Ten original shop brands, each with a geometric mark for its sign disc
// (see textures.js drawBrandMark): the shops read as brands, not words.
const SHOP_NAMES = [
  ['MARLIN BAIT', 'tackle · ice · live shrimp', 'fish'],
  ['CORAL CAFE', 'coffee · all day breakfast', 'cup'],
  ['SUNSET MOTEL', 'vacancy · weekly rates', 'sun'],
  ['PALM GROCER', 'fresh · local · open late', 'palm'],
  ['TIDE LAUNDRY', 'wash · fold · 24h', 'wave'],
  ['BAY BURGERS', 'smash burgers · shakes', 'burger'],
  ['REEF CYCLES', 'sales · repairs · rentals', 'wheel'],
  ['GULL BOOKS', 'used books · maps', 'bird'],
  ['SOL FUEL', 'petrol · diesel · 24h', 'drop'],
  ['DEL SOL TACO', 'tacos · burritos · late', 'sun'],
];

// ---------- Collision ----------
// Circle colliders: cheap, robust, and forgiving at building corners (a
// box collider would snag the player on every corner). Radius is 82% of
// the half-diagonal, so the walls read as solid without sealing the gaps
// between neighbouring buildings.
export function circleCollider(x, z, width, depth) {
  return { x, z, radius: Math.hypot(width, depth) / 2 * 0.82 };
}

export function pushOutOfColliders(pos, radius, colliders) {
  for (const c of colliders) {
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const dist = Math.hypot(dx, dz);
    const min = c.radius + radius;
    if (dist < min && dist > 0.0001) {
      const push = (min - dist) / dist;
      pos.x += dx * push;
      pos.z += dz * push;
    }
  }
}

export function pointBlocked(x, z, colliders) {
  for (const c of colliders) {
    if (Math.hypot(x - c.x, z - c.z) < c.radius) return true;
  }
  return false;
}

// Sampled line-of-sight: enough for enemy aim checks at street ranges.
export function lineBlocked(x1, z1, x2, z2, colliders) {
  const dist = Math.hypot(x2 - x1, z2 - z1);
  const steps = Math.max(1, Math.ceil(dist / 2));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (pointBlocked(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, colliders)) return true;
  }
  return false;
}

// ---------- Lit windows, by rule ----------
// A window is lit when its floor satisfies the block's rhythm and its
// column is not a dark one. Ground floors of shopfronts are always lit:
// the shops are open at golden hour. The signature is a string the facade
// painter reads left to right, top to bottom.
export function litSignature(bx, bz, floors, cols) {
  const rhythm = ((bx * 3 + bz * 5) % 4 + 4) % 4;
  let out = '';
  for (let floor = floors - 1; floor >= 0; floor -= 1) {
    for (let col = 0; col < cols; col += 1) {
      let lit = false;
      if (floor === 0) lit = true;
      else if ((floor + rhythm) % 3 === 0) lit = (col + floor) % 4 !== 0;
      else lit = (floor * 7 + col * 3 + rhythm) % 9 === 0;
      out += lit ? '1' : '0';
    }
  }
  return out;
}

// ---------- Shared dressing ----------

function addRoofDressing(group, width, depth, topY, rng) {
  // AC units, a water tank and an antenna, placed by the block's stream.
  const acCount = rng.whole(1, 3);
  for (let i = 0; i < acCount; i += 1) {
    const ac = new THREE.Mesh(
      new THREE.BoxGeometry(rng.between(1.2, 2.2), 0.9, rng.between(1.2, 2)),
      new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.7, metalness: 0.4 }),
    );
    ac.position.set(
      rng.between(-width / 2 + 2, width / 2 - 2),
      topY + 0.45,
      rng.between(-depth / 2 + 2, depth / 2 - 2),
    );
    ac.castShadow = true;
    group.add(ac);
  }
  if (rng.chance(0.6)) {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 2.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x7a6a58, roughness: 0.8, metalness: 0.3 }),
    );
    tank.position.set(width / 2 - 2.4, topY + 1.1, depth / 2 - 2.4);
    tank.castShadow = true;
    group.add(tank);
  }
  if (rng.chance(0.5)) {
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.1, rng.between(4, 8), 5),
      new THREE.MeshStandardMaterial({ color: 0x555a60, roughness: 0.6, metalness: 0.6 }),
    );
    mast.position.set(-width / 2 + 2, topY + 3, -depth / 2 + 2);
    group.add(mast);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff3a3a }),
    );
    tip.position.set(mast.position.x, topY + 3 + mast.geometry.parameters.height / 2, mast.position.z);
    group.add(tip);
  }
}

function addShopfront(group, width, depth, palette, rng) {
  // A sign board and a striped awning on the street face (the -z face is
  // the one the south-looking shots see; the sign faces both ways).
  const [name, sub, mark] = SHOP_NAMES[rng.whole(0, SHOP_NAMES.length - 1)];
  const signMat = new THREE.MeshStandardMaterial({
    map: shopSign(name, sub, '#2a2438', '#ffd9a0', rng, mark), roughness: 0.8,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width * 0.7, 10), 1.6), signMat);
  sign.position.set(0, FLOOR_HEIGHT + 0.6, depth / 2 + 0.08);
  group.add(sign);
  const awnMat = new THREE.MeshStandardMaterial({
    map: awningStripes('#c23a4e', '#f4ead6'), roughness: 0.9, side: THREE.DoubleSide,
  });
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width * 0.6, 8), 1.6), awnMat);
  awning.rotation.x = -Math.PI / 3;
  awning.position.set(0, FLOOR_HEIGHT - 0.4, depth / 2 + 0.9);
  group.add(awning);
}

function boxWithFacade(width, height, depth, facadeTexture, roofTexture) {
  const side = new THREE.MeshStandardMaterial({ map: facadeTexture, roughness: 0.85, metalness: 0.05 });
  const roof = new THREE.MeshStandardMaterial({ map: roofTexture, roughness: 1, metalness: 0 });
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    [side, side, roof, roof, side, side],
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ---------- Archetypes ----------

function buildTower(group, cx, cz, bx, bz, rng) {
  const floors = floorsAt(bx, bz, 'tower');
  const palette = facadeAt(bx, bz, 'downtown');
  const lit = litSignature(bx, bz, floors, 6);
  const width = rng.between(24, 30);
  const depth = rng.between(24, 30);
  const height = floors * FLOOR_HEIGHT;
  const facade = glassFacade(palette, floors, lit, rng);
  const main = boxWithFacade(width, height, depth, facade, roofTop(rng));
  main.position.set(cx, height / 2, cz);
  group.add(main);
  // Setback crown: a smaller glass box on top, so the silhouette steps.
  const crownH = FLOOR_HEIGHT * 2;
  const crown = boxWithFacade(width * 0.62, crownH, depth * 0.62, facade, roofTop(rng));
  crown.position.set(cx, height + crownH / 2, cz);
  group.add(crown);
  addRoofDressing(group, width * 0.62, depth * 0.62, height + crownH, rng);
  return [circleCollider(cx, cz, width, depth)];
}

function buildMidrise(group, cx, cz, bx, bz, rng) {
  const floors = floorsAt(bx, bz, 'midrise');
  const palette = facadeAt(bx, bz, 'midtown');
  const lit = litSignature(bx, bz, floors, 5);
  const width = rng.between(26, 32);
  const depth = rng.between(22, 28);
  const height = floors * FLOOR_HEIGHT;
  const facade = stuccoFacade(palette, floors, lit, rng);
  const main = boxWithFacade(width, height, depth, facade, roofTop(rng));
  main.position.set(cx, height / 2, cz);
  group.add(main);
  // Parapet lip around the roof edge.
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.4, 0.5, depth + 0.4),
    new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.9 }),
  );
  lip.position.set(cx, height + 0.2, cz);
  group.add(lip);
  addRoofDressing(group, width, depth, height + 0.4, rng);
  const shop = new THREE.Group();
  shop.position.set(cx, 0, cz);
  addShopfront(shop, width, depth, palette, rng);
  group.add(shop);
  return [circleCollider(cx, cz, width, depth)];
}

function buildWalkup(group, cx, cz, bx, bz, rng) {
  const colliders = [];
  const palette = facadeAt(bx, bz, 'oldtown');
  // Two narrow walk-ups side by side, with a gap between them.
  for (let i = 0; i < 2; i += 1) {
    const floors = floorsAt(bx + i, bz, 'walkup');
    const lit = litSignature(bx + i, bz, floors, 4);
    const width = 13;
    const depth = rng.between(20, 24);
    const height = floors * FLOOR_HEIGHT;
    const ox = cx + (i === 0 ? -8.5 : 8.5);
    const facade = stuccoFacade(palette, floors, lit, rng);
    const main = boxWithFacade(width, height, depth, facade, roofTop(rng));
    main.position.set(ox, height / 2, cz);
    group.add(main);
    // Tile roof cap: a shallow prism, terracotta.
    const roofMat = new THREE.MeshStandardMaterial({ map: tileRoof(rng), roughness: 0.9 });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, width * 0.72, 2.2, 4, 1), roofMat);
    cap.rotation.y = Math.PI / 4;
    cap.scale.set(1, 1, depth / width);
    cap.position.set(ox, height + 1.1, cz);
    cap.castShadow = true;
    group.add(cap);
    // Balconies on the upper floors: slab + railing.
    for (let f = 1; f < floors; f += 1) {
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.25, 1.2),
        new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.9 }),
      );
      slab.position.set(ox, f * FLOOR_HEIGHT + 0.4, cz + depth / 2 + 0.6);
      slab.castShadow = true;
      group.add(slab);
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.9, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x2a2a32, roughness: 0.6, metalness: 0.5 }),
      );
      rail.position.set(ox, f * FLOOR_HEIGHT + 1.0, cz + depth / 2 + 1.15);
      group.add(rail);
    }
    colliders.push(circleCollider(ox, cz, width, depth));
  }
  return colliders;
}

function buildWarehouse(group, cx, cz, bx, bz, rng) {
  const width = rng.between(28, 32);
  const depth = rng.between(22, 26);
  const height = 9;
  const brick = brickFacade(rng);
  const main = boxWithFacade(width, height, depth, brick, roofTop(rng));
  main.position.set(cx, height / 2, cz);
  group.add(main);
  // Roller door on the street face.
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 5.5),
    new THREE.MeshStandardMaterial({ color: 0x9aa2ac, roughness: 0.5, metalness: 0.6 }),
  );
  door.position.set(cx - width * 0.2, 2.75, cz + depth / 2 + 0.06);
  group.add(door);
  for (let i = 0; i < 6; i += 1) {
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.12, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x6a727c, roughness: 0.6, metalness: 0.5 }),
    );
    slat.position.set(cx - width * 0.2, 0.8 + i * 0.85, cz + depth / 2 + 0.1);
    group.add(slat);
  }
  // Roof vents: short cylinders in a row.
  for (let i = 0; i < 3; i += 1) {
    const vent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.9, 1.6, 10),
      new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.5 }),
    );
    vent.position.set(cx - width / 2 + 4 + i * 6, height + 0.8, cz);
    vent.castShadow = true;
    group.add(vent);
  }
  // A stencilled warehouse name above the door.
  const nameMat = new THREE.MeshStandardMaterial({
    map: shopSign('DEL SOL LINE', 'warehouse 4 · freight & storage', '#3a2e28', '#ffd9a0', rng, 'anchor'),
    roughness: 0.9,
  });
  const name = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), nameMat);
  name.position.set(cx, height - 1.2, cz + depth / 2 + 0.08);
  group.add(name);
  return [circleCollider(cx, cz, width, depth)];
}

function buildVilla(group, cx, cz, bx, bz, rng) {
  const colliders = [];
  const palette = facadeAt(bx, bz, 'beachfront');
  for (let i = 0; i < 2; i += 1) {
    const floors = 2;
    const lit = litSignature(bx + i * 2, bz, floors, 4);
    const width = 14;
    const depth = 16;
    const height = floors * FLOOR_HEIGHT;
    const ox = cx + (i === 0 ? -9 : 9);
    const facade = stuccoFacade(palette, floors, lit, rng);
    const main = boxWithFacade(width, height, depth, facade, roofTop(rng));
    main.position.set(ox, height / 2, cz);
    group.add(main);
    // Miami Deco roofline: a flat slab, a three-step parapet rising over
    // the street face, and a gold sun medallion on the middle step. The
    // stepped silhouette is what reads as Art Deco from down the street —
    // v4's tile prism read as a generic villa roof.
    const trimMat = new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.9 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.3, depth + 0.4), trimMat);
    slab.position.set(ox, height + 0.15, cz);
    group.add(slab);
    const steps = [[6, 1.2, 0.6], [4, 1.0, 1.6], [2, 0.8, 2.4]];
    for (const [stepW, stepH, stepY] of steps) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, 0.4), trimMat);
      step.position.set(ox, height + stepY, cz + depth / 2 - 0.15);
      step.castShadow = true;
      group.add(step);
    }
    const medallion = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 20),
      new THREE.MeshStandardMaterial({ color: 0xd8a83a, roughness: 0.4, metalness: 0.5 }),
    );
    medallion.position.set(ox, height + 1.6, cz + depth / 2 + 0.08);
    group.add(medallion);
    // Eyebrow ledge over the ground floor: the Deco horizontal.
    const brow = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 0.15, 0.9), trimMat);
    brow.position.set(ox, FLOOR_HEIGHT + 0.3, cz + depth / 2 + 0.35);
    group.add(brow);
    // A low terrace wall and a gate pillar by the street.
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(width, 1.1, 0.3),
      new THREE.MeshStandardMaterial({ color: palette.base, roughness: 0.95 }),
    );
    wall.position.set(ox, 0.55, cz + depth / 2 + 3);
    group.add(wall);
    colliders.push(circleCollider(ox, cz, width, depth));
  }
  return colliders;
}

// ---------- Hills estate ----------
// A walled two-floor villa: the house sits behind a garden wall with a
// gate on the street side, a driveway apron, and two round trees in the
// garden. The walls are 1.4 m — garden walls, the same clipping class as
// the villa terrace wall (no collider), so the player can step over them
// rather than snag on an invisible circle.
function buildEstate(group, cx, cz, bx, bz, rng) {
  const palette = facadeAt(bx, bz, 'hills');
  const floors = floorsAt(bx, bz, 'estate');
  const lit = litSignature(bx, bz, floors, 5);
  const width = 20;
  const depth = 16;
  const height = floors * FLOOR_HEIGHT;
  const facade = stuccoFacade(palette, floors, lit, rng);
  const main = boxWithFacade(width, height, depth, facade, roofTop(rng));
  main.position.set(cx, height / 2, cz - 4);
  group.add(main);
  const roofMat = new THREE.MeshStandardMaterial({ map: tileRoof(rng), roughness: 0.9 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, width * 0.72, 2.4, 4, 1), roofMat);
  cap.rotation.y = Math.PI / 4;
  cap.scale.set(1, 1, depth / width);
  cap.position.set(cx, height + 1.2, cz - 4);
  cap.castShadow = true;
  group.add(cap);
  // Garden wall: back + sides full, front split for the gate.
  const wallMat = new THREE.MeshStandardMaterial({ color: palette.base, roughness: 0.95 });
  const wallH = 1.4;
  const back = new THREE.Mesh(new THREE.BoxGeometry(36, wallH, 0.4), wallMat);
  back.position.set(cx, wallH / 2, cz - 18);
  group.add(back);
  for (const side of [-1, 1]) {
    const flank = new THREE.Mesh(new THREE.BoxGeometry(0.4, wallH, 36), wallMat);
    flank.position.set(cx + side * 18, wallH / 2, cz);
    group.add(flank);
    const front = new THREE.Mesh(new THREE.BoxGeometry(13, wallH, 0.4), wallMat);
    front.position.set(cx + side * 11.5, wallH / 2, cz + 18);
    group.add(front);
    // Gate pillars with ball tops.
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.9), wallMat);
    pillar.position.set(cx + side * 5, 1.1, cz + 18);
    pillar.castShadow = true;
    group.add(pillar);
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 10, 8),
      new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.6 }),
    );
    ball.position.set(cx + side * 5, 2.5, cz + 18);
    group.add(ball);
  }
  // Driveway apron from the gate to the house.
  const drive = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 12),
    new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: 1 }),
  );
  drive.rotation.x = -Math.PI / 2;
  drive.position.set(cx, 0.07, cz + 10);
  drive.receiveShadow = true;
  group.add(drive);
  // Two round garden trees.
  for (const [tx, tz] of [[-11, -10], [12, 6]]) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 2.4, 7),
      new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.9 }),
    );
    trunk.position.set(cx + tx, 1.2, cz + tz);
    group.add(trunk);
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(rng.between(2.2, 3), 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.9 }),
    );
    canopy.position.set(cx + tx, 3.6, cz + tz);
    canopy.castShadow = true;
    group.add(canopy);
  }
  return [circleCollider(cx, cz - 4, width, depth)];
}

// ---------- Landmarks ----------

function buildGarage(group, cx, cz, rng) {
  // Rosa's garage: a workshop with a big open bay, a sign, and a forecourt
  // apron where the story starts and ends.
  const width = 26;
  const depth = 18;
  const height = 7.5;
  const brick = brickFacade(rng);
  const main = boxWithFacade(width, height, depth, brick, roofTop(rng));
  main.position.set(cx, height / 2, cz);
  group.add(main);
  const signMat = new THREE.MeshStandardMaterial({
    map: shopSign("ROSA'S GARAGE", 'repairs · parts · no questions', '#1e2a3a', '#ffd23a', rng, 'wheel'),
    roughness: 0.85,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), signMat);
  sign.position.set(cx, height - 1.2, cz + depth / 2 + 0.1);
  group.add(sign);
  // Two open bays: dark recesses with a car silhouette inside one.
  for (let i = 0; i < 2; i += 1) {
    const bay = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 4.5),
      new THREE.MeshStandardMaterial({ color: 0x14101c, roughness: 1 }),
    );
    bay.position.set(cx - 6 + i * 12, 2.25, cz + depth / 2 + 0.06);
    group.add(bay);
  }
  const forecourt = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 12),
    new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: 1 }),
  );
  forecourt.rotation.x = -Math.PI / 2;
  forecourt.position.set(cx, 0.08, cz + depth / 2 + 6);
  forecourt.receiveShadow = true;
  group.add(forecourt);
  return [circleCollider(cx, cz, width, depth)];
}

function buildHospital(group, cx, cz, rng) {
  const width = 30;
  const depth = 20;
  const height = 13.6;
  const palette = { base: '#eef0ea', trim: '#c8d2cc', glass: '#5d8aa0', glow: '#ffd27a' };
  const facade = stuccoFacade(palette, 4, litSignature(-2, -3, 4, 5), rng);
  const main = boxWithFacade(width, height, depth, facade, roofTop(rng));
  main.position.set(cx, height / 2, cz);
  group.add(main);
  // Red cross on a white panel + the hospital name.
  const crossMat = new THREE.MeshStandardMaterial({
    map: shopSign('DEL SOL GENERAL', 'hospital · emergency 24h', '#eef0ea', '#c23a3a', rng),
    roughness: 0.85,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.6), crossMat);
  sign.position.set(cx, height - 1.6, cz + depth / 2 + 0.1);
  group.add(sign);
  const crossBarV = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 3, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xc23a3a }),
  );
  crossBarV.position.set(cx - width / 2 + 3, height - 1.6, cz + depth / 2 + 0.15);
  group.add(crossBarV);
  const crossBarH = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.9, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xc23a3a }),
  );
  crossBarH.position.set(cx - width / 2 + 3, height - 1.6, cz + depth / 2 + 0.15);
  group.add(crossBarH);
  return [circleCollider(cx, cz, width, depth)];
}

function buildStation(group, cx, cz, rng) {
  const width = 28;
  const depth = 20;
  const height = 10.2;
  const palette = { base: '#aab4c4', trim: '#7e8a9c', glass: '#3f587e', glow: '#ffd27a' };
  const facade = stuccoFacade(palette, 3, litSignature(-3, 2, 3, 5), rng);
  const main = boxWithFacade(width, height, depth, facade, roofTop(rng));
  main.position.set(cx, height / 2, cz);
  group.add(main);
  const signMat = new THREE.MeshStandardMaterial({
    map: shopSign('PSPD', 'puerto del sol police · precinct 4', '#1a2a4a', '#f4f2ec', rng, 'star'),
    roughness: 0.85,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), signMat);
  sign.position.set(cx, height - 1.4, cz + depth / 2 + 0.1);
  group.add(sign);
  // Flag pole with a small pennant by the steps.
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 9, 6),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.7 }),
  );
  pole.position.set(cx + width / 2 + 3, 4.5, cz + depth / 2 + 2);
  group.add(pole);
  const pennant = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x2a4a8a, side: THREE.DoubleSide, roughness: 0.9 }),
  );
  pennant.position.set(cx + width / 2 + 4.3, 8.2, cz + depth / 2 + 2);
  group.add(pennant);
  return [circleCollider(cx, cz, width, depth)];
}

function buildWaterTower(group, cx, cz) {
  // Four legs, a tank, a conical cap: the east park's landmark.
  const legMat = new THREE.MeshStandardMaterial({ color: 0x6a7078, roughness: 0.6, metalness: 0.5 });
  for (const [lx, lz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 16, 6), legMat);
    leg.position.set(cx + lx, 8, cz + lz);
    leg.castShadow = true;
    group.add(leg);
  }
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(5.5, 5.5, 7, 16),
    new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.7, metalness: 0.2 }),
  );
  tank.position.set(cx, 19.5, cz);
  tank.castShadow = true;
  group.add(tank);
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(5.8, 2.5, 16),
    new THREE.MeshStandardMaterial({ color: 0xc23a4e, roughness: 0.7 }),
  );
  cap.position.set(cx, 24.2, cz);
  cap.castShadow = true;
  group.add(cap);
  return [circleCollider(cx, cz, 9, 9)];
}

function buildPavilion(group, cx, cz, rng) {
  // Beach pavilion: an open-sided hall on the beachfront block, with a
  // wide tile roof and a snack bar sign.
  const width = 22;
  const depth = 14;
  const height = 6;
  // Terracotta, not white: the pavilion sits in full sun facing the
  // camera in the mission frame, and the white stucco blew out to a
  // featureless mass. The first revision pass used pale peach and it
  // still washed out — this deeper terracotta holds its windows in
  // direct sun and matches the Deco beachfront row.
  const palette = { base: '#e0a878', trim: '#c08a5a', glass: '#5d8aa0', glow: '#ffca7a' };
  const facade = stuccoFacade(palette, 2, litSignature(0, 3, 2, 4), rng);
  const main = boxWithFacade(width, height, depth, facade, roofTop(rng));
  main.position.set(cx, height / 2, cz);
  group.add(main);
  const roofMat = new THREE.MeshStandardMaterial({ map: tileRoof(rng), roughness: 0.9 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, width * 0.72, 2.6, 4, 1), roofMat);
  cap.rotation.y = Math.PI / 4;
  cap.scale.set(1, 1, depth / width);
  cap.position.set(cx, height + 1.3, cz);
  cap.castShadow = true;
  group.add(cap);
  const signMat = new THREE.MeshStandardMaterial({
    map: shopSign('PIER SNACKS', 'ice cream · cold drinks · bait', '#2a6a8a', '#fff2c0', rng, 'sun'),
    roughness: 0.85,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), signMat);
  sign.position.set(cx, height - 1.2, cz + depth / 2 + 0.1);
  group.add(sign);
  // Sunburst over the sign: a gold disc with eight rays, the pavilion's
  // Deco signature against the beachfront sky.
  const sunMat = new THREE.MeshStandardMaterial({ color: 0xd8a83a, roughness: 0.4, metalness: 0.5 });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.3, 20), sunMat);
  disc.position.set(cx, height + 1.8, cz + depth / 2 + 0.15);
  group.add(disc);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const ray = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.08), sunMat);
    ray.position.set(cx + Math.cos(angle) * 2.1, height + 1.8 + Math.sin(angle) * 2.1, cz + depth / 2 + 0.15);
    ray.rotation.z = angle - Math.PI / 2;
    group.add(ray);
  }
  return [circleCollider(cx, cz, width, depth)];
}

// The dock office: the m5 stash sits here, so it gets its own small
// building at the yard's edge with a lit window and a sign.
function buildDockOffice(group, rng) {
  const cx = 196;
  const cz = -60;
  const main = boxWithFacade(12, 5, 9, brickFacade(rng), roofTop(rng));
  main.position.set(cx, 2.5, cz);
  group.add(main);
  const signMat = new THREE.MeshStandardMaterial({
    map: shopSign('DOCK OFFICE', 'harbour master · est. 1974', '#3a2e28', '#ffd9a0', rng, 'anchor'),
    roughness: 0.9,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), signMat);
  sign.position.set(cx, 4, cz + 4.6);
  group.add(sign);
  return [circleCollider(cx, cz, 12, 9)];
}

// ---------- Build the whole city ----------

const LANDMARK_BUILDERS = {
  '-1,-1': buildGarage,
  '-2,-3': buildHospital,
  '-3,2': buildStation,
  '2,-3': buildWaterTower,
  '0,3': buildPavilion,
};

const ARCHETYPE_BUILDERS = {
  downtown: buildTower,
  midtown: buildMidrise,
  oldtown: buildWalkup,
  docks: buildWarehouse,
  beachfront: buildVilla,
  hills: buildEstate,
};

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];
  for (let bx = BLOCK_MIN; bx <= BLOCK_MAX; bx += 1) {
    for (let bz = BLOCK_MIN; bz <= BLOCK_MAX; bz += 1) {
      const key = `${bx},${bz}`;
      const centre = blockCenter(bx, bz);
      const blockRng = rng.fork(bx * 31 + bz * 17 + 5);
      if (LANDMARK_BUILDERS[key]) {
        colliders.push(...LANDMARK_BUILDERS[key](group, centre.x, centre.z, blockRng));
        continue;
      }
      const district = districtAt(bx, bz);
      if (district === 'park') continue; // parks get trees, not buildings
      const builder = ARCHETYPE_BUILDERS[district];
      if (builder) colliders.push(...builder(group, centre.x, centre.z, bx, bz, blockRng));
    }
  }
  colliders.push(...buildDockOffice(group, rng.fork(91)));
  return { group, colliders };
}

export { DISTRICT_NAMES };
