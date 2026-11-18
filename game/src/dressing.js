// Dressing: palms, trees, street props, landmarks and the working docks.
//
// One job: make the city feel inhabited and the docks feel worked. The
// docks were v3's weakest frame — a bare mauve apron with two crates — so
// the yard gets the full treatment here: container stacks in rows, two
// gantry cranes with a bobbing hook, a forklift, oil stains, barrels,
// pallets, tyre stacks, floodlights and bollards. Nothing here is a lone
// box: every prop is a small multi-part build.

import {
  BLOCK_MAX, BLOCK_MIN, CITY_HALF, GRID_PITCH, LIGHTHOUSE_POS, PARK_BLOCKS,
  ROAD_LINES, blockCenter,
} from './config.js';
import {
  beamFade, containerSide, dockConcrete, glowPool, lawn, oilStain, palmFrond, planks, wheelFace,
} from './textures.js';
import { circleCollider } from './buildings.js';

// ---------- Palms and trees ----------

// A palm: a leaning trunk in three segments, a crown of nine fronds, and a
// cluster of coconuts. The lean is per-palm, so a row of palms never lines
// up like soldiers.
export function buildPalm(rng, height = 7) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 });
  const lean = rng.between(-0.14, 0.14);
  const leanDir = rng.between(0, Math.PI * 2);
  let y = 0;
  let x = 0;
  let z = 0;
  for (let i = 0; i < 3; i += 1) {
    const segH = height / 3;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 - i * 0.03, 0.28 - i * 0.03, segH, 7),
      trunkMat,
    );
    seg.position.set(x, y + segH / 2, z);
    seg.rotation.set(Math.sin(leanDir) * lean, 0, Math.cos(leanDir) * lean);
    seg.castShadow = true;
    group.add(seg);
    x += Math.sin(leanDir) * lean * segH;
    z += Math.cos(leanDir) * lean * segH;
    y += segH;
  }
  const frondMat = new THREE.MeshStandardMaterial({
    map: palmFrond(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9,
  });
  for (let i = 0; i < 9; i += 1) {
    const frond = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.4), frondMat);
    const angle = (i / 9) * Math.PI * 2 + rng.between(-0.1, 0.1);
    frond.position.set(x, y + 0.2, z);
    frond.rotation.order = 'YXZ';
    frond.rotation.y = angle;
    frond.rotation.x = -0.9 - rng.between(-0.12, 0.12);
    frond.translateY(1.5);
    frond.castShadow = true;
    group.add(frond);
  }
  const nutMat = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 });
  for (let i = 0; i < 3; i += 1) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), nutMat);
    nut.position.set(x + rng.between(-0.3, 0.3), y - 0.25, z + rng.between(-0.3, 0.3));
    group.add(nut);
  }
  return group;
}

// A park tree: trunk + three layered foliage shells, so the canopy reads
// as a tree, not a blob on a stick.
export function buildParkTree(rng, height = 5.5) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.34, height * 0.45, 7),
    new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 1 }),
  );
  trunk.position.y = height * 0.22;
  trunk.castShadow = true;
  group.add(trunk);
  const greens = [0x4a7a34, 0x558638, 0x3f6e2e];
  for (let i = 0; i < 3; i += 1) {
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(height * (0.30 - i * 0.05), 1),
      new THREE.MeshStandardMaterial({ color: greens[i], roughness: 1, flatShading: true }),
    );
    shell.scale.y = 0.72;
    shell.position.set(
      rng.between(-0.5, 0.5),
      height * (0.5 + i * 0.18),
      rng.between(-0.5, 0.5),
    );
    shell.castShadow = true;
    group.add(shell);
  }
  return group;
}

// ---------- Street props ----------

function buildLampPost() {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.5, metalness: 0.6 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 6.5, 8), metal);
  pole.position.y = 3.25;
  pole.castShadow = true;
  group.add(pole);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 6), metal);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.8, 6.4, 0);
  group.add(arm);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.18, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.6, metalness: 0.4 }),
  );
  head.position.set(1.6, 6.35, 0);
  group.add(head);
  const bulb = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.3),
    new THREE.MeshBasicMaterial({ color: 0xffe2a0 }),
  );
  bulb.rotation.x = Math.PI / 2;
  bulb.position.set(1.6, 6.25, 0);
  group.add(bulb);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowPool(), color: 0xffe2a0, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.set(3.2, 3.2, 1);
  glow.position.set(1.6, 6.1, 0);
  group.add(glow);
  return group;
}

function buildTrafficLight() {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.6, metalness: 0.4 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 8), metal);
  pole.position.y = 2.6;
  pole.castShadow = true;
  group.add(pole);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.3, 0.35), metal);
  box.position.y = 5.2;
  group.add(box);
  const colours = [0xff3a30, 0xffc21e, 0x2ee06a];
  for (let i = 0; i < 3; i += 1) {
    const lamp = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 12),
      new THREE.MeshBasicMaterial({ color: i === 2 ? colours[i] : 0x1a1a1a }),
    );
    lamp.position.set(0, 5.6 - i * 0.42, 0.19);
    group.add(lamp);
  }
  return group;
}

function buildBench() {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.9 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.6, metalness: 0.5 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.6), wood);
  seat.position.y = 0.5;
  seat.castShadow = true;
  group.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.1), wood);
  back.position.set(0, 0.95, -0.28);
  group.add(back);
  for (const sx of [-0.9, 0.9]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.55), iron);
    leg.position.set(sx, 0.25, 0);
    group.add(leg);
  }
  return group;
}

function buildHydrant() {
  const group = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xc23a3a, roughness: 0.6, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 8), red);
  body.position.y = 0.35;
  body.castShadow = true;
  group.add(body);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), red);
  cap.position.y = 0.72;
  group.add(cap);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 6), red);
  nozzle.rotation.z = Math.PI / 2;
  nozzle.position.set(0.22, 0.45, 0);
  group.add(nozzle);
  return group;
}

// ---------- Ferris wheel ----------

function buildFerrisWheel(scene, rng) {
  const group = new THREE.Group();
  const cx = 60;
  const cz = 214;
  const hubY = 17;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.6, metalness: 0.3 });
  for (const side of [-1, 1]) {
    for (const tilt of [-0.28, 0.28]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 19, 8), frameMat);
      leg.position.set(cx + side * 3.2, 8.5, cz + tilt * 30);
      leg.rotation.x = tilt;
      leg.castShadow = true;
      group.add(leg);
    }
  }
  const wheel = new THREE.Group();
  wheel.position.set(cx, hubY, cz);
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(15, 40),
    new THREE.MeshStandardMaterial({
      map: wheelFace(), transparent: true, side: THREE.DoubleSide, roughness: 0.6,
    }),
  );
  wheel.add(face);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(15, 0.35, 8, 48),
    new THREE.MeshStandardMaterial({ color: 0xf2e8d8, roughness: 0.5, metalness: 0.3 }),
  );
  wheel.add(rim);
  // Gondolas around the rim: small cabins that hang below their mounts.
  const cabinColours = [0xff7a5e, 0x7ae0ff, 0xffd23a, 0xff9ad5];
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.5, 1.4),
      new THREE.MeshStandardMaterial({ color: cabinColours[i % cabinColours.length], roughness: 0.7 }),
    );
    cabin.position.set(Math.cos(angle) * 15, Math.sin(angle) * 15 - 1.1, 0);
    cabin.castShadow = true;
    wheel.add(cabin);
    const hanger = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.2, 5),
      new THREE.MeshStandardMaterial({ color: 0x555a60, metalness: 0.6, roughness: 0.5 }),
    );
    hanger.position.set(Math.cos(angle) * 15, Math.sin(angle) * 15 - 0.3, 0);
    wheel.add(hanger);
  }
  group.add(wheel);
  scene.add(group);
  return { group, wheel, hub: new THREE.Vector3(cx, hubY, cz) };
}

// ---------- Piers, lighthouse, boats ----------

function buildPier(scene, z, length, rng) {
  const group = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(length, 7),
    new THREE.MeshStandardMaterial({ map: planks(rng), roughness: 1 }),
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(192 + length / 2, 0.7, z);
  deck.receiveShadow = true;
  group.add(deck);
  // Posts under the deck edge.
  for (let x = 196; x < 192 + length; x += 8) {
    for (const side of [-3.2, 3.2]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.32, 2.4, 7),
        new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 1 }),
      );
      post.position.set(x, -0.3, z + side);
      group.add(post);
    }
  }
  // Rails along both edges.
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.5, metalness: 0.6 });
  for (const side of [-3.4, 3.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.08, 0.08), railMat);
    rail.position.set(192 + length / 2, 1.7, z + side);
    group.add(rail);
    for (let x = 196; x < 192 + length; x += 6) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), railMat);
      post.position.set(x, 1.2, z + side);
      group.add(post);
    }
  }
  // Bollards along the deck.
  const bollardMat = new THREE.MeshStandardMaterial({ color: 0x2a4a6a, roughness: 0.6, metalness: 0.4 });
  for (let x = 204; x < 192 + length; x += 16) {
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.8, 8), bollardMat);
    bollard.position.set(x, 1.1, z - 2.8);
    bollard.castShadow = true;
    group.add(bollard);
  }
  scene.add(group);
  return group;
}

function buildLighthouse(scene) {
  const group = new THREE.Group();
  const { x, z } = LIGHTHOUSE_POS;
  // Striped tower: alternating coral and white drums.
  const bands = [0xf2e8d8, 0xe86a5e, 0xf2e8d8, 0xe86a5e, 0xf2e8d8, 0xe86a5e];
  let y = 0.7;
  for (let i = 0; i < bands.length; i += 1) {
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6 - i * 0.12, 2.8 - i * 0.12, 3.6, 14),
      new THREE.MeshStandardMaterial({ color: bands[i], roughness: 0.8 }),
    );
    drum.position.set(x, y + 1.8, z);
    drum.castShadow = true;
    group.add(drum);
    y += 3.6;
  }
  // Gallery platform + railing.
  const gallery = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.4, 0.4, 14),
    new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.6, metalness: 0.4 }),
  );
  gallery.position.set(x, y + 0.2, z);
  group.add(gallery);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.6, metalness: 0.4 });
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), railMat);
    post.position.set(x + Math.cos(angle) * 3.2, y + 0.9, z + Math.sin(angle) * 3.2);
    group.add(post);
  }
  // Lamp room: glass drum + bright lamp + cap.
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.9, 2.6, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffe2a0, emissive: 0xffc46a, emissiveIntensity: 1.6,
      transparent: true, opacity: 0.85, roughness: 0.3,
    }),
  );
  lampRoom.position.set(x, y + 1.7, z);
  group.add(lampRoom);
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 1.8, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.6, metalness: 0.4 }),
  );
  cap.position.set(x, y + 3.9, z);
  group.add(cap);
  // Rotating beam: two opposed cones of warm light. The length-fade
  // texture dissolves the wide end — a bare cone ends in a hard circular
  // rim 60 m out, which reads as a cut-off disc against the dark sky.
  const beamGroup = new THREE.Group();
  beamGroup.position.set(x, y + 1.7, z);
  const beamMat = new THREE.MeshBasicMaterial({
    map: beamFade(), color: 0xffe2a0, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  for (const dir of [0, Math.PI]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 60, 12, 1, true), beamMat);
    cone.rotation.z = Math.PI / 2;
    cone.rotation.y = dir;
    cone.position.x = Math.cos(dir) * 30;
    beamGroup.add(cone);
  }
  group.add(beamGroup);
  // A small keeper's cottage at the pier end.
  const cottage = new THREE.Mesh(
    new THREE.BoxGeometry(6, 3.4, 5),
    new THREE.MeshStandardMaterial({ color: 0xf2e8d8, roughness: 0.9 }),
  );
  cottage.position.set(x - 7, 2.4, z + 6);
  cottage.castShadow = true;
  group.add(cottage);
  scene.add(group);
  return { group, beam: beamGroup, topY: y + 4.5 };
}

function buildBoat(scene, x, z, heading, colour) {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.0, 7),
    new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6 }),
  );
  hull.position.y = 0.5;
  hull.castShadow = true;
  group.add(hull);
  const bow = new THREE.Mesh(
    new THREE.ConeGeometry(1.2, 2.2, 4),
    new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6 }),
  );
  bow.rotation.x = Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.scale.set(1, 1, 0.6);
  bow.position.set(0, 0.5, 4.4);
  group.add(bow);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.1, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xf2e8d8, roughness: 0.7 }),
  );
  cabin.position.set(0, 1.5, -0.6);
  group.add(cabin);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 5.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.6, roughness: 0.5 }),
  );
  mast.position.set(0, 3.2, 1.2);
  group.add(mast);
  group.position.set(x, 0.1, z);
  group.rotation.y = heading;
  scene.add(group);
  return group;
}

// A DEL SOL LINE freighter riding at anchor off the docks: a long hull,
// a white bridge tower, and container stacks in the line's colours. It
// closes the eastern sea vista from the yard — the docks frame no longer
// ends in empty water.
function buildCargoShip(scene, rng) {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x2e4a5e, roughness: 0.6, metalness: 0.3 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 64), hullMat);
  hull.position.y = 2;
  hull.castShadow = true;
  group.add(hull);
  const bow = new THREE.Mesh(
    new THREE.ConeGeometry(8, 12, 4),
    hullMat,
  );
  bow.rotation.x = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.scale.set(1, 1, 0.55);
  bow.position.set(0, 2, 38);
  group.add(bow);
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x8a2f2f, roughness: 0.7 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(15, 1, 58), deckMat);
  deck.position.y = 5.5;
  group.add(deck);
  // Bridge tower at the stern.
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xf2e8d8, roughness: 0.7 });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(12, 9, 8), bridgeMat);
  bridge.position.set(0, 10, -24);
  bridge.castShadow = true;
  group.add(bridge);
  const bridgeGlass = new THREE.Mesh(
    new THREE.BoxGeometry(12.4, 1.6, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x24384e, roughness: 0.25, metalness: 0.1 }),
  );
  bridgeGlass.position.set(0, 12.5, -20);
  group.add(bridgeGlass);
  const funnel = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.8, 5, 10),
    new THREE.MeshStandardMaterial({ color: 0xc28a2e, roughness: 0.6, metalness: 0.3 }),
  );
  funnel.position.set(0, 17, -26);
  group.add(funnel);
  // Container stacks along the deck.
  const colours = ['#a83a2e', '#2e6a8a', '#c28a2e', '#5a7a4a'];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      if (rng.chance(0.25)) continue;
      const stack = (col + row) % 3 === 0 ? 2 : 1;
      for (let level = 0; level < stack; level += 1) {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(5.6, 2.4, 2.4),
          new THREE.MeshStandardMaterial({
            map: containerSide(colours[(row + col + level) % colours.length], rng),
            roughness: 0.7, metalness: 0.3,
          }),
        );
        box.position.set(-5.4 + row * 3.6, 7.2 + level * 2.5, -14 + col * 7.5);
        box.castShadow = true;
        group.add(box);
      }
    }
  }
  group.position.set(300, -1, -40);
  group.rotation.y = 0.15;
  scene.add(group);
  return group;
}

// ---------- The working docks ----------

const CONTAINER_COLOURS = ['#a83a2e', '#2e6a8a', '#c28a2e', '#5a7a4a', '#7a5a8a', '#3a6a6a'];

function buildContainer(x, z, heading, colour, rng, stacked = 0) {
  const group = new THREE.Group();
  const sideMat = new THREE.MeshStandardMaterial({ map: containerSide(colour, rng), roughness: 0.7, metalness: 0.3 });
  const endMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colour).multiplyScalar(0.8), roughness: 0.7, metalness: 0.3 });
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(6.1, 2.6, 2.5),
    [endMat, endMat, endMat, endMat, sideMat, sideMat],
  );
  box.position.y = 1.3 + stacked * 2.6;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  return group;
}

function buildGantryCrane(scene, x, z, rng) {
  // A dockside gantry crane: four legs, a portal beam, a jib out over the
  // water, a cab, and a hook on a cable that bobs while the yard works.
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xc28a2e, roughness: 0.6, metalness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.6, metalness: 0.5 });
  for (const [lx, lz] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 16, 0.9), paint);
    leg.position.set(x + lx, 8, z + lz);
    leg.castShadow = true;
    group.add(leg);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(11, 1.4, 8.4), paint);
  beam.position.set(x, 16.7, z);
  beam.castShadow = true;
  group.add(beam);
  const jib = new THREE.Mesh(new THREE.BoxGeometry(20, 1.1, 1.4), paint);
  jib.position.set(x + 12, 17.6, z);
  jib.castShadow = true;
  group.add(jib);
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 2, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.5, metalness: 0.4 }),
  );
  cab.position.set(x + 3, 15, z + 4.6);
  group.add(cab);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x9fd4e8, roughness: 0.2, metalness: 0.6 }),
  );
  glass.position.set(x + 3, 15.2, z + 5.75);
  group.add(glass);
  // Hook on a cable, hanging from the jib's end.
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 9, 5), dark);
  cable.position.set(x + 20, 13, z);
  group.add(cable);
  const hook = new THREE.Group();
  const block = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.7), dark);
  hook.add(block);
  const claw = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.12, 6, 12, Math.PI * 1.4),
    new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.7, roughness: 0.4 }),
  );
  claw.position.y = -0.7;
  claw.rotation.z = Math.PI * 0.8;
  hook.add(claw);
  hook.position.set(x + 20, 8.4, z);
  group.add(hook);
  scene.add(group);
  return { group, hook, hookBaseY: 8.4, phase: rng.between(0, Math.PI * 2) };
}

function buildForklift(scene, x, z, heading) {
  // A small yard forklift: body, overhead guard, mast, forks, wheels.
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd86a1e, roughness: 0.6, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 2.4), bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 0.7), bodyMat);
  counter.position.set(0, 0.7, -1.4);
  group.add(counter);
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.5, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.9 }),
  );
  seat.position.set(0, 1.3, -0.4);
  group.add(seat);
  const guardMat = new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.5, metalness: 0.6 });
  for (const [gx, gz] of [[-0.6, -0.9], [0.6, -0.9], [-0.6, 0.5], [0.6, 0.5]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), guardMat);
    post.position.set(gx, 1.9, gz);
    group.add(post);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.8), guardMat);
  roof.position.set(0, 2.6, -0.2);
  group.add(roof);
  // Mast + twin forks at the front.
  for (const mx of [-0.5, 0.5]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), guardMat);
    rail.position.set(mx, 1.4, 1.35);
    group.add(rail);
    const fork = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.06, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.7, roughness: 0.4 }),
    );
    fork.position.set(mx, 0.25, 1.9);
    group.add(fork);
  }
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
  for (const [wx, wz, wr] of [[-0.72, 0.8, 0.34], [0.72, 0.8, 0.34], [-0.72, -0.9, 0.3], [0.72, -0.9, 0.3]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wr, wr, 0.22, 12), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wr, wz);
    group.add(wheel);
  }
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  scene.add(group);
  return group;
}

function buildDocksYard(scene, rng, colliders) {
  const yard = new THREE.Group();
  scene.add(yard);
  // The apron: a stained concrete slab over the yard, so the ground reads
  // as a working surface instead of bare mauve.
  const apronTex = dockConcrete(rng);
  apronTex.repeat.set(3, 3);
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(72, 150),
    new THREE.MeshStandardMaterial({ map: apronTex, roughness: 1 }),
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(212, 0.09, 0);
  apron.receiveShadow = true;
  yard.add(apron);
  // Container rows: two rows of stacked boxes east of the warehouses, plus
  // singles scattered through the yard.
  const rows = [
    { x: 214, z: -72, count: 5, heading: 0 },
    { x: 214, z: 72, count: 5, heading: 0 },
    { x: 232, z: -36, count: 3, heading: Math.PI / 2 },
  ];
  for (const row of rows) {
    for (let i = 0; i < row.count; i += 1) {
      const along = (i - (row.count - 1) / 2) * 7;
      const cx = row.heading === 0 ? row.x : row.x + along;
      const cz = row.heading === 0 ? row.z + along : row.z;
      const colour = CONTAINER_COLOURS[(i + Math.abs(row.z)) % CONTAINER_COLOURS.length];
      yard.add(buildContainer(cx, cz, row.heading, colour, rng));
      if (i % 2 === 0) yard.add(buildContainer(cx, cz, row.heading, CONTAINER_COLOURS[(i + 2) % CONTAINER_COLOURS.length], rng, 1));
      colliders.push(circleCollider(cx, cz, 6.5, 3));
    }
  }
  // Loose singles near the apron, for cover in the dock fights. The last
  // two sit mid-apron in the mission camera's sightline — the first v4
  // mission frame read empty between the crane and the lighthouse.
  const singles = [[196, -40, 0.3], [202, 36, -0.2], [222, 12, 0.1], [188, 60, 0.5], [216, -8, 0.15], [212, 20, -0.1]];
  for (const [sx, sz, rot] of singles) {
    yard.add(buildContainer(sx, sz, rot, CONTAINER_COLOURS[Math.abs(sx + sz) % CONTAINER_COLOURS.length], rng));
    colliders.push(circleCollider(sx, sz, 6.5, 3));
  }
  // Barrels in rusty clusters.
  const barrelMats = [0x8a4a2a, 0x4a6a8a, 0x6a6a5a].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0.3 }),
  );
  const barrelSpots = [[186, -30], [188, -26], [206, 48], [210, 52], [224, -52], [228, -48]];
  for (const [bx, bz] of barrelSpots) {
    for (let i = 0; i < 3; i += 1) {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 1.1, 10),
        barrelMats[(bx + bz + i) % barrelMats.length],
      );
      barrel.position.set(bx + (i % 2) * 1.1, 0.55, bz + Math.floor(i / 2) * 1.1);
      barrel.castShadow = true;
      yard.add(barrel);
    }
  }
  // Pallets and crates.
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x9a7a4a, roughness: 1 });
  const crateSpots = [[190, 16, 1.6], [192, 18, 1.2], [208, -18, 1.8], [210, -16, 1.3], [218, 44, 1.5], [214, -2, 1.5], [200, 24, 1.3]];
  for (const [px, pz, size] of crateSpots) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), crateMat);
    crate.position.set(px, size / 2, pz);
    crate.rotation.y = (px * 7) % 1;
    crate.castShadow = true;
    yard.add(crate);
    colliders.push(circleCollider(px, pz, size, size));
  }
  // Tyre stacks.
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.95 });
  for (const [tx, tz] of [[184, 44], [226, -20]]) {
    for (let i = 0; i < 3; i += 1) {
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.24, 8, 18), tyreMat);
      tyre.rotation.x = Math.PI / 2;
      tyre.position.set(tx, 0.25 + i * 0.48, tz);
      tyre.castShadow = true;
      yard.add(tyre);
    }
  }
  // Oil stains on the apron.
  const stainMat = new THREE.MeshBasicMaterial({
    map: oilStain(rng), transparent: true, depthWrite: false,
  });
  const stainSpots = [[200, -12, 7], [212, 28, 9], [196, 52, 6], [222, -44, 8], [186, 4, 5]];
  for (const [sx, sz, size] of stainSpots) {
    const stain = new THREE.Mesh(new THREE.PlaneGeometry(size, size), stainMat);
    stain.rotation.x = -Math.PI / 2;
    stain.rotation.z = (sx * 13) % Math.PI;
    stain.position.set(sx, 0.12, sz);
    yard.add(stain);
  }
  // Floodlight poles around the yard.
  for (const [fx, fz] of [[188, -64], [188, 64], [238, -64], [238, 64]]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.2, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.5, metalness: 0.6 }),
    );
    pole.position.set(fx, 6, fz);
    pole.castShadow = true;
    yard.add(pole);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.6, metalness: 0.4 }),
    );
    head.position.set(fx, 12.2, fz);
    yard.add(head);
    const lamp = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0 }),
    );
    lamp.rotation.x = Math.PI / 2.4;
    lamp.position.set(fx, 11.9, fz + 0.3);
    yard.add(lamp);
  }
  // The forklift, parked by the north row with its forks down.
  buildForklift(scene, 208, -58, Math.PI / 2);
  colliders.push(circleCollider(208, -58, 2.5, 3));
  // Two gantry cranes over the yard, hooks bobbing.
  const cranes = [
    buildGantryCrane(scene, 228, -48, rng.fork(21)),
    buildGantryCrane(scene, 228, 48, rng.fork(22)),
  ];
  colliders.push(circleCollider(228, -48, 10, 8));
  colliders.push(circleCollider(228, 48, 10, 8));
  return { yard, cranes };
}

// ---------- Beach and parks ----------

function buildBeach(scene, rng) {
  // Umbrellas, towels and a lifeguard tower along the south beach.
  const umbrellaColours = [0xff7a5e, 0x7ae0ff, 0xffd23a, 0xff9ad5];
  const spots = [[-40, 208], [-16, 214], [24, 206], [96, 210], [120, 204], [-80, 210]];
  for (let i = 0; i < spots.length; i += 1) {
    const [ux, uz] = spots[i];
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.7 }),
    );
    pole.position.set(ux, 1.2, uz);
    scene.add(pole);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(1.9, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: umbrellaColours[i % umbrellaColours.length], roughness: 0.9 }),
    );
    canopy.position.set(ux, 2.6, uz);
    canopy.castShadow = true;
    scene.add(canopy);
    const towel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 2.1),
      new THREE.MeshStandardMaterial({ color: umbrellaColours[(i + 1) % umbrellaColours.length], roughness: 1 }),
    );
    towel.rotation.x = -Math.PI / 2;
    towel.rotation.z = rng.between(0, Math.PI);
    towel.position.set(ux + 1.6, 0.12, uz + 1);
    scene.add(towel);
  }
  // Lifeguard tower.
  const tower = new THREE.Group();
  const legMat = new THREE.MeshStandardMaterial({ color: 0xf2e8d8, roughness: 0.8 });
  for (const [lx, lz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.5, 0.25), legMat);
    leg.position.set(lx, 2.25, lz);
    tower.add(leg);
  }
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 2.4, 3),
    new THREE.MeshStandardMaterial({ color: 0xff7a5e, roughness: 0.8 }),
  );
  cabin.position.y = 5.6;
  cabin.castShadow = true;
  tower.add(cabin);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.8, 1.2, 4),
    new THREE.MeshStandardMaterial({ color: 0xf2e8d8, roughness: 0.8 }),
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 7.4;
  tower.add(roof);
  tower.position.set(36, 0.4, 210);
  scene.add(tower);
}

function buildParks(scene, rng) {
  for (const key of PARK_BLOCKS) {
    const [bx, bz] = key.split(',').map(Number);
    const centre = blockCenter(bx, bz);
    const lawnMat = new THREE.MeshStandardMaterial({ map: lawn(rng), roughness: 1 });
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), lawnMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(centre.x, 0.09, centre.z);
    grass.receiveShadow = true;
    scene.add(grass);
    for (let i = 0; i < 7; i += 1) {
      const tree = buildParkTree(rng.fork(bx * 13 + bz * 7 + i), rng.between(4.5, 6.5));
      tree.position.set(
        centre.x + rng.between(-14, 14),
        0.1,
        centre.z + rng.between(-14, 14),
      );
      scene.add(tree);
    }
    for (let i = 0; i < 2; i += 1) {
      const bench = buildBench();
      bench.position.set(centre.x + rng.between(-10, 10), 0.1, centre.z + rng.between(-10, 10));
      bench.rotation.y = rng.between(0, Math.PI * 2);
      scene.add(bench);
    }
  }
}

// ---------- Assemble all dressing ----------

export function buildDressing(scene, rng) {
  const colliders = [];
  const animated = { wheel: null, beam: null, cranes: [] };

  // Palm-lined streets: palms along the main boulevards and the beach road.
  const palmSpots = [];
  for (let z = -168; z <= 168; z += 24) {
    palmSpots.push([9.5, z], [-9.5, z]);
  }
  for (let x = -168; x <= 168; x += 24) {
    palmSpots.push([x, 170], [x, -170]);
  }
  for (const [px, pz] of palmSpots) {
    const palm = buildPalm(rng.fork(Math.abs(px * 3 + pz * 7) + 1), rng.between(6, 8.5));
    palm.position.set(px, 0.06, pz);
    scene.add(palm);
    colliders.push(circleCollider(px, pz, 0.8, 0.8));
  }

  // Lamp posts at the intersections of the two main boulevards.
  for (const line of ROAD_LINES) {
    for (const [lx, lz, rot] of [[8.5, line + 8.5, 0], [-8.5, line - 8.5, Math.PI]]) {
      const lamp = buildLampPost();
      lamp.position.set(lx, 0.06, lz);
      lamp.rotation.y = rot;
      scene.add(lamp);
    }
  }

  // Traffic lights at the centre crossings.
  for (const [tx, tz, rot] of [[8.5, 8.5, 0], [-8.5, -8.5, Math.PI], [8.5, -48, 0], [-48, 8.5, Math.PI / 2]]) {
    const light = buildTrafficLight();
    light.position.set(tx, 0.06, tz);
    light.rotation.y = rot;
    scene.add(light);
  }

  // Hydrants and benches scattered on the sidewalks.
  const hydrantSpots = [[-32, -56], [40, 104], [104, -40], [-104, 56], [56, -104]];
  for (const [hx, hz] of hydrantSpots) {
    const hydrant = buildHydrant();
    hydrant.position.set(hx, 0.06, hz);
    scene.add(hydrant);
  }

  buildParks(scene, rng.fork(31));
  buildBeach(scene, rng.fork(32));

  // The ferris wheel on the beach, and the piers + lighthouse to the east.
  const wheel = buildFerrisWheel(scene, rng.fork(33));
  animated.wheel = wheel.wheel;
  colliders.push(circleCollider(60, 214, 8, 8));
  buildPier(scene, -48, 66, rng.fork(34));
  buildPier(scene, 0, 66, rng.fork(35));
  buildPier(scene, 48, 66, rng.fork(36));
  const lighthouse = buildLighthouse(scene);
  animated.beam = lighthouse.beam;
  colliders.push(circleCollider(LIGHTHOUSE_POS.x, LIGHTHOUSE_POS.z, 7, 7));
  buildBoat(scene, 262, -64, 0.4, 0xe8e0d0);
  buildBoat(scene, 268, 40, -0.3, 0x7ae0ff);
  buildBoat(scene, 258, 96, 0.9, 0xff7a5e);
  buildCargoShip(scene, rng.fork(38));

  // The working docks.
  const docks = buildDocksYard(scene, rng.fork(37), colliders);
  animated.cranes = docks.cranes;

  return {
    colliders,
    update(dt, time) {
      if (animated.wheel) animated.wheel.rotation.z += dt * 0.08;
      if (animated.beam) animated.beam.rotation.y += dt * 0.35;
      for (const crane of animated.cranes) {
        crane.hook.position.y = crane.hookBaseY + Math.sin(time * 0.5 + crane.phase) * 0.8;
      }
    },
  };
}
