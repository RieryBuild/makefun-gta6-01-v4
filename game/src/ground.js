// The ground: heightfield, streets, sidewalks and the waterline.
//
// One job: the land Dana walks and drives on. A heightfield plane forms the
// shelf (flat city, south dunes, west and north hills, the sea floor east
// and south of the waterline); roads and block aprons sit on it in thin
// height steps so nothing z-fights; and the waterline helpers keep the
// player and the traffic on dry land.
//
// Heights, from the ground up: shelf 0.02, sidewalk aprons 0.06, asphalt
// 0.10, crosswalks 0.14. Each layer is one step above the last, so overlaps
// at intersections never shimmer.

import {
  BLOCK_MAX, BLOCK_MIN, CITY_HALF, GRID_PITCH, ROAD_LINES, ROAD_WIDTH,
  TERRAIN, WATERLINE, WORLD_HALF, blockCenter,
} from './config.js';
import { asphalt, roadStrip, sand, sidewalk } from './textures.js';

// The heightfield: flat in the city, dunes to the south beach, hills
// hemming the west and north, and the sea floor past the waterline.
export function groundHeight(x, z) {
  let height = 0.02;
  // South beach dunes: a gentle swell past the last street.
  if (z > TERRAIN.duneStart) {
    const t = Math.min(1, (z - TERRAIN.duneStart) / 36);
    height += TERRAIN.duneHeight * t * (0.7 + 0.3 * Math.sin(x * 0.08) * Math.cos(z * 0.05));
  }
  // West ridge and north ridge.
  if (x < -TERRAIN.hillStart) {
    const t = Math.min(1, (-x - TERRAIN.hillStart) / 90);
    height += TERRAIN.hillWest * t * t * (0.8 + 0.2 * Math.sin(z * 0.05));
  }
  if (z < -TERRAIN.hillStart) {
    const t = Math.min(1, (-z - TERRAIN.hillStart) / 90);
    height += TERRAIN.hillNorth * t * t * (0.8 + 0.2 * Math.sin(x * 0.06));
  }
  // The sea floor, east and south of the waterline.
  if (x > WATERLINE.eastX) {
    const t = Math.min(1, (x - WATERLINE.eastX) / 24);
    height = height * (1 - t) + TERRAIN.seaFloor * t;
  }
  if (z > WATERLINE.southZ) {
    const t = Math.min(1, (z - WATERLINE.southZ) / 24);
    height = height * (1 - t) + TERRAIN.seaFloor * t;
  }
  return height;
}

export function isWater(x, z) {
  return x > WATERLINE.eastX || z > WATERLINE.southZ;
}

// Keep a point on dry land, with a margin for the character's radius.
export function clampToLand(x, z, margin = 1) {
  return {
    x: Math.min(x, WATERLINE.eastX - margin),
    z: Math.min(z, WATERLINE.southZ - margin),
  };
}

export function buildGround(scene, rng) {
  const size = WORLD_HALF * 2 + 80;
  const segments = 120;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colours = new Float32Array(positions.count * 3);
  const shelf = new THREE.Color(0x8d8272);
  const beachSand = new THREE.Color(0xe3c98f);
  const seabed = new THREE.Color(0x274b5e);
  const hillRock = new THREE.Color(0x6e5a48);
  const colour = new THREE.Color();
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const height = groundHeight(x, z);
    positions.setY(i, height);
    // Sand on the beach band and the shore; seabed under the water; rock
    // on the hills; packed earth for the shelf.
    if (x > WATERLINE.eastX || z > WATERLINE.southZ) colour.copy(seabed);
    else if (z > TERRAIN.duneStart - 6) colour.copy(beachSand);
    else if (x < -TERRAIN.hillStart || z < -TERRAIN.hillStart) colour.copy(hillRock);
    else colour.copy(shelf);
    // A little variation so the shelf is not one flat tone.
    const variation = 0.94 + 0.06 * Math.sin(x * 0.35) * Math.cos(z * 0.3);
    colours[i * 3] = colour.r * variation;
    colours[i * 3 + 1] = colour.g * variation;
    colours[i * 3 + 2] = colour.b * variation;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, metalness: 0,
  }));
  ground.receiveShadow = true;
  scene.add(ground);

  // Roads: one asphalt strip per street line, both directions, with the
  // centre dashes painted into the strip texture.
  const roadTex = roadStrip();
  // The cross-town roads run along X, so their dashes repeat along U, not
  // V: a clone of the strip texture with the repeat swapped (same image).
  const roadTexCross = roadTex.clone();
  roadTexCross.needsUpdate = true;
  roadTexCross.repeat.set(12, 1);
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95, metalness: 0 });
  const roadMatCross = new THREE.MeshStandardMaterial({ map: roadTexCross, roughness: 0.95, metalness: 0 });
  const roadLength = CITY_HALF * 2 + ROAD_WIDTH;
  for (const line of ROAD_LINES) {
    const north = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, roadLength), roadMat);
    north.rotation.x = -Math.PI / 2;
    north.position.set(line, 0.10, 0);
    north.receiveShadow = true;
    scene.add(north);
    const east = new THREE.Mesh(new THREE.PlaneGeometry(roadLength, ROAD_WIDTH), roadMatCross);
    east.rotation.x = -Math.PI / 2;
    east.position.set(0, 0.10, line);
    east.receiveShadow = true;
    scene.add(east);
  }

  // Block aprons: a sidewalk slab under every block, tucked slightly under
  // the road edges. One slab per block, so intersections never overlap.
  const walkMat = new THREE.MeshStandardMaterial({ map: sidewalk(rng), roughness: 1, metalness: 0 });
  const apronSize = GRID_PITCH - ROAD_WIDTH + 4;
  for (let bx = BLOCK_MIN; bx <= BLOCK_MAX; bx += 1) {
    for (let bz = BLOCK_MIN; bz <= BLOCK_MAX; bz += 1) {
      const centre = blockCenter(bx, bz);
      const apron = new THREE.Mesh(new THREE.PlaneGeometry(apronSize, apronSize), walkMat);
      apron.rotation.x = -Math.PI / 2;
      apron.position.set(centre.x, 0.06, centre.z);
      apron.receiveShadow = true;
      scene.add(apron);
    }
  }

  // Crosswalks on the two main boulevards (x=0 and z=0): painted stripe
  // planes at every crossing, one step above the asphalt.
  const crossingMat = new THREE.MeshBasicMaterial({ color: 0xe8e2d4, transparent: true, opacity: 0.85 });
  const stripe = new THREE.PlaneGeometry(2.2, 1.1);
  for (const line of ROAD_LINES) {
    for (let i = -2; i <= 2; i += 1) {
      const a = new THREE.Mesh(stripe, crossingMat);
      a.rotation.x = -Math.PI / 2;
      a.position.set(i * 2.6, 0.14, line + 8.5);
      scene.add(a);
      const b = new THREE.Mesh(stripe, crossingMat);
      b.rotation.x = -Math.PI / 2;
      b.rotation.z = Math.PI / 2;
      b.position.set(line + 8.5, 0.14, i * 2.6);
      scene.add(b);
    }
  }

  // The beach: a sand blanket over the dune band so the shoreline reads
  // as beach, not shelf, from the street.
  const sandMat = new THREE.MeshStandardMaterial({ map: sand(rng), roughness: 1, metalness: 0 });
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2 + 60, 40), sandMat);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.05, TERRAIN.duneStart + 18);
  beach.receiveShadow = true;
  scene.add(beach);

  return { groundHeight, asphaltTexture: asphalt(rng) };
}
