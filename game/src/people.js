// People: proportioned humanoids from rounded primitives, and their guns.
//
// One job: build the characters — Dana, Rosa, the cops, the Kings, Kane and
// the pedestrians — as jointed capsule figures with faces, hair and
// clothing colour separation, and animate them walking, running and aiming.
//
// The shape rule, from the house bar: NO box heads on box torsos. Heads
// are spheres with faces, torsos are capsules, arms and legs are separate
// tapered cylinders with elbow and knee joints. A figure is a rig of joint
// groups, so the walk cycle swings real limbs.
//
// The pants fix, stated once: v3's dark-navy trousers washed pale lavender
// under the 2.9 amber key + ACES + exposure. v4 answers it three ways —
// the key light is softer (2.5, see config.js), the trouser base is darker
// (near-black blue), and every clothing material sets envMapIntensity 0 so
// the warm PMREM sheen never touches cloth. Skin keeps a little sheen;
// cloth keeps none.

function cloth(colour, roughness = 0.92) {
  const mat = new THREE.MeshStandardMaterial({ color: colour, roughness, metalness: 0 });
  mat.envMapIntensity = 0;
  return mat;
}

function skinTone(colour) {
  const mat = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.65, metalness: 0 });
  mat.envMapIntensity = 0.25;
  return mat;
}

// ---------- Weapons (multi-part, readable silhouettes) ----------

export function createRifle() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.5, metalness: 0.6 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 0.8 });
  // Receiver body.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.55), bodyMat);
  body.position.set(0, 0, 0);
  group.add(body);
  // Barrel + muzzle brake.
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), bodyMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, 0.5);
  group.add(barrel);
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.09, 8), bodyMat);
  brake.rotation.x = Math.PI / 2;
  brake.position.set(0, 0.02, 0.76);
  group.add(brake);
  // Stock.
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.13, 0.3), gripMat);
  stock.position.set(0, -0.01, -0.4);
  group.add(stock);
  // Grip + trigger guard.
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.09), gripMat);
  grip.position.set(0, -0.14, -0.08);
  grip.rotation.x = 0.35;
  group.add(grip);
  // Magazine.
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.11), bodyMat);
  mag.position.set(0, -0.15, 0.14);
  mag.rotation.x = 0.12;
  group.add(mag);
  // Sight: a post + a ring on top.
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.03), bodyMat);
  post.position.set(0, 0.11, 0.18);
  group.add(post);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.012, 6, 14),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.7 }),
  );
  ring.position.set(0, 0.16, 0.18);
  group.add(ring);
  // The muzzle point: the tracer and the flash start here.
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.02, 0.82);
  group.add(muzzle);
  group.userData.muzzle = muzzle;
  return group;
}

export function createPistol() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.45, metalness: 0.65 });
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.24), bodyMat);
  slide.position.set(0, 0.02, 0.05);
  group.add(slide);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.08), bodyMat);
  grip.position.set(0, -0.07, -0.03);
  grip.rotation.x = 0.25;
  group.add(grip);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.02, 0.18);
  group.add(muzzle);
  group.userData.muzzle = muzzle;
  return group;
}

// ---------- Looks ----------
// A look is skin + hair + shirt + trousers + shoes, plus a hat or gear
// flag. Dana's identity: mint shirt, near-black trousers, brown hair.

export function danaLook() {
  return {
    skin: 0xd9a077, hair: 0x5a3a22, hairStyle: 'ponytail',
    shirt: 0x7ac4b8, shirtAlt: 0x5fae9f, trousers: 0x14161f, shoes: 0x8a6a44,
    hat: null, scale: 1,
  };
}

export function rosaLook() {
  return {
    skin: 0xc98a5e, hair: 0x2a2a2e, hairStyle: 'bun',
    shirt: 0xc25a6a, shirtAlt: 0xa84a58, trousers: 0x2e3138, shoes: 0x3a2e22,
    hat: null, scale: 0.98,
  };
}

export function copLook(rng) {
  return {
    skin: rng.pick([0xd9a077, 0xb87a52, 0x8a5a3a, 0xe8b88a]), hair: 0x2e2620, hairStyle: 'short',
    shirt: 0x2a3a5c, shirtAlt: 0x22304c, trousers: 0x1e2430, shoes: 0x1a1a1a,
    hat: 'cap', scale: 1.01,
  };
}

export function gangLook(rng) {
  return {
    skin: rng.pick([0xd9a077, 0xb87a52, 0x8a5a3a, 0xe8b88a]), hair: 0x1e1a16, hairStyle: 'short',
    shirt: rng.pick([0x8a2f2f, 0x7a2a3a, 0x9a3a2a]), shirtAlt: 0x2a2a2e, trousers: 0x2e3138, shoes: 0x2a2a2a,
    hat: 'bandana', scale: 1,
  };
}

export function bossLook() {
  return {
    skin: 0xc98a5e, hair: 0x141210, hairStyle: 'slick',
    shirt: 0x1e1e22, shirtAlt: 0x2a2a2e, trousers: 0x1a1c22, shoes: 0x141414,
    hat: 'shades', scale: 1.09,
  };
}

export function pedLook(rng) {
  const shirts = [0xe8a0a0, 0xa0c8e8, 0xe8d8a0, 0xa0e8c0, 0xd8a0e8, 0xf0f0e8, 0x8ac8d8, 0xe8b88a];
  const trousers = [0x2e3138, 0x4a3a2e, 0x3a4a5a, 0x5a5a5a, 0x2a3a4a];
  return {
    skin: rng.pick([0xd9a077, 0xb87a52, 0x8a5a3a, 0xe8b88a, 0xf0c8a0]),
    hair: rng.pick([0x2e2620, 0x5a3a22, 0x1e1a16, 0x8a6a3a, 0x6a6a6a]),
    hairStyle: rng.pick(['short', 'short', 'ponytail', 'bun']),
    shirt: rng.pick(shirts), shirtAlt: 0xffffff, trousers: rng.pick(trousers), shoes: rng.pick([0x3a2e22, 0x2a2a2a, 0x5a4a3a]),
    hat: rng.chance(0.2) ? 'cap' : null, scale: rng.between(0.94, 1.04),
  };
}

// ---------- The rig ----------

function limbSegment(radiusTop, radiusBottom, length, material) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 10),
    material,
  );
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  return mesh;
}

function buildArm(side, look) {
  const shoulder = new THREE.Group();
  const upperMat = cloth(look.shirt);
  const lowerMat = cloth(look.shirtAlt === 0xffffff ? look.shirt : look.shirtAlt);
  const upper = limbSegment(0.075, 0.065, 0.34, upperMat);
  shoulder.add(upper);
  const elbow = new THREE.Group();
  elbow.position.y = -0.34;
  const forearm = limbSegment(0.06, 0.05, 0.32, lowerMat);
  elbow.add(forearm);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), skinTone(look.skin));
  hand.position.y = -0.36;
  hand.castShadow = true;
  elbow.add(hand);
  shoulder.add(elbow);
  shoulder.position.set(side * 0.26, 1.38, 0);
  return { shoulder, elbow, hand };
}

function buildLeg(side, look) {
  const hip = new THREE.Group();
  const trouserMat = cloth(look.trousers, 0.95);
  const thigh = limbSegment(0.1, 0.085, 0.42, trouserMat);
  hip.add(thigh);
  const knee = new THREE.Group();
  knee.position.y = -0.42;
  const shin = limbSegment(0.08, 0.06, 0.42, trouserMat);
  knee.add(shin);
  const shoe = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshStandardMaterial({ color: look.shoes, roughness: 0.8 }),
  );
  shoe.scale.set(0.9, 0.6, 1.5);
  shoe.position.set(0, -0.46, 0.05);
  shoe.castShadow = true;
  knee.add(shoe);
  hip.add(knee);
  hip.position.set(side * 0.13, 0.92, 0);
  return { hip, knee, shoe };
}

function buildHead(look) {
  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), skinTone(look.skin));
  skull.castShadow = true;
  head.add(skull);
  // Face: two eyes and a mouth, on the +z face.
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1410 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), eyeMat);
    eye.position.set(side * 0.06, 0.02, 0.145);
    head.add(eye);
  }
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.012, 0.01),
    new THREE.MeshBasicMaterial({ color: 0x6a3a2e }),
  );
  mouth.position.set(0, -0.06, 0.15);
  head.add(mouth);
  // Hair: a cap over the top and back of the skull.
  const hairMat = new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.95 });
  hairMat.envMapIntensity = 0;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  cap.position.y = 0.02;
  cap.rotation.x = -0.25;
  head.add(cap);
  if (look.hairStyle === 'ponytail') {
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.22, 4, 8), hairMat);
    tail.position.set(0, -0.05, -0.17);
    tail.rotation.x = 0.5;
    head.add(tail);
  } else if (look.hairStyle === 'bun') {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), hairMat);
    bun.position.set(0, 0.1, -0.16);
    head.add(bun);
  }
  if (look.hat === 'cap') {
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.165, 0.17, 0.09, 12),
      cloth(look.shirt),
    );
    crown.position.y = 0.12;
    head.add(crown);
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.02, 12, 1, false, -0.6, 1.2),
      cloth(look.shirt),
    );
    brim.position.set(0, 0.09, 0.06);
    head.add(brim);
  } else if (look.hat === 'bandana') {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.165, 0.165, 0.07, 12, 1, true),
      cloth(0x8a2f2f),
    );
    band.position.y = 0.08;
    head.add(band);
  } else if (look.hat === 'shades') {
    const shades = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.05, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2, metalness: 0.6 }),
    );
    shades.position.set(0, 0.03, 0.145);
    head.add(shades);
  }
  head.position.y = 1.62;
  return head;
}

export function createHumanoid(look, armed = false) {
  const group = new THREE.Group();
  // Torso: a capsule with a clothing split — shirt above, a belt line,
  // trousers below. The vest panel on armed figures reads as gear.
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.21, 0.42, 6, 12),
    cloth(look.shirt),
  );
  torso.position.y = 1.18;
  torso.castShadow = true;
  group.add(torso);
  if (armed) {
    const vest = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.225, 0.3, 4, 12),
      cloth(look.shirtAlt === 0xffffff ? 0x3a3f46 : look.shirtAlt, 0.85),
    );
    vest.position.y = 1.22;
    vest.scale.set(1, 1, 0.85);
    group.add(vest);
  }
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.215, 0.215, 0.07, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.85 }),
  );
  belt.position.y = 0.94;
  group.add(belt);
  const head = buildHead(look);
  group.add(head);
  const armL = buildArm(-1, look);
  const armR = buildArm(1, look);
  group.add(armL.shoulder, armR.shoulder);
  const legL = buildLeg(-1, look);
  const legR = buildLeg(1, look);
  group.add(legL.hip, legR.hip);

  let weapon = null;
  if (armed === 'rifle') {
    weapon = createRifle();
    weapon.position.set(0.05, -0.36, 0.1);
    weapon.rotation.x = -0.1;
    armR.elbow.add(weapon);
  } else if (armed === 'pistol') {
    weapon = createPistol();
    weapon.position.set(0, -0.38, 0.08);
    armR.elbow.add(weapon);
  }

  group.scale.setScalar(look.scale || 1);
  return {
    group, head, torso,
    armL, armR, legL, legR, weapon,
    walkPhase: Math.random() * Math.PI * 2,
    down: false,
  };
}

// ---------- Animation ----------

// Walk/run cycle: legs swing opposite, arms counter-swing, the body bobs
// and leans into the run. Aiming freezes the right arm forward on the
// rifle and squares the shoulders to the target.
export function animateHumanoid(rig, dt, speed, aiming) {
  if (rig.down) return;
  const moving = speed > 0.3;
  if (moving) {
    rig.walkPhase += dt * (4 + speed * 0.9);
    const swing = Math.min(0.75, 0.35 + speed * 0.045);
    const s = Math.sin(rig.walkPhase);
    rig.legL.hip.rotation.x = s * swing;
    rig.legR.hip.rotation.x = -s * swing;
    rig.legL.knee.rotation.x = Math.max(0, -s) * swing * 1.1;
    rig.legR.knee.rotation.x = Math.max(0, s) * swing * 1.1;
    rig.group.position.y = Math.abs(Math.cos(rig.walkPhase)) * 0.045;
    rig.group.rotation.x = Math.min(0.1, speed * 0.008);
  } else {
    rig.legL.hip.rotation.x *= 0.8;
    rig.legR.hip.rotation.x *= 0.8;
    rig.legL.knee.rotation.x *= 0.8;
    rig.legR.knee.rotation.x *= 0.8;
    rig.group.position.y *= 0.8;
    rig.group.rotation.x *= 0.8;
  }
  if (aiming && rig.weapon) {
    // Right arm forward on the grip, left arm across to support.
    rig.armR.shoulder.rotation.x = -Math.PI / 2 + 0.12;
    rig.armR.shoulder.rotation.z = -0.15;
    rig.armR.elbow.rotation.x = -0.15;
    rig.armL.shoulder.rotation.x = -Math.PI / 2 + 0.35;
    rig.armL.shoulder.rotation.z = 0.35;
    rig.armL.elbow.rotation.x = -0.9;
  } else if (moving) {
    const s = Math.sin(rig.walkPhase);
    rig.armL.shoulder.rotation.x = -s * 0.55;
    rig.armR.shoulder.rotation.x = s * 0.55;
    rig.armL.shoulder.rotation.z = 0.08;
    rig.armR.shoulder.rotation.z = -0.08;
    rig.armL.elbow.rotation.x = -0.35;
    rig.armR.elbow.rotation.x = -0.35;
  } else {
    rig.armL.shoulder.rotation.x *= 0.8;
    rig.armR.shoulder.rotation.x *= 0.8;
    rig.armL.shoulder.rotation.z = 0.08;
    rig.armR.shoulder.rotation.z = -0.08;
    rig.armL.elbow.rotation.x = -0.25;
    rig.armR.elbow.rotation.x = -0.25;
  }
}

export function layHumanoidDown(rig) {
  rig.down = true;
  rig.group.rotation.x = -Math.PI / 2;
  rig.group.position.y = 0.25;
  rig.armL.shoulder.rotation.x = 0.6;
  rig.armR.shoulder.rotation.x = -0.4;
  rig.legL.hip.rotation.x = 0.1;
  rig.legR.hip.rotation.x = -0.1;
}

export function muzzleWorld(rig, out) {
  if (!rig.weapon) return null;
  return rig.weapon.userData.muzzle.getWorldPosition(out || new THREE.Vector3());
}
