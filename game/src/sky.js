// The sky: dome, sun disc, clouds, sea, lights and the sunset environment.
//
// One job: make the golden hour a place, not a tint. v3's sky was a flat
// peach dome — no sun, no clouds — so the docks frames read empty above the
// horizon. v4 puts a VISIBLE sun disc low in the southwest (it lands in the
// south-looking street shots, over the rooftops at the end of the
// boulevard), a drift of warm-lit cloud billboards, and a PMREM sunset
// environment so glass and paint catch the hour without washing out.
//
// The sun direction is shared: the disc, the glow, the directional light
// and the environment all read it from one function, so the light in the
// scene always agrees with the sun in the sky.

import { GOLDEN_HOUR, WORLD_HALF } from './config.js';
import { cloudPuff, glowPool, sea } from './textures.js';

// Azimuth is measured from +z (south) toward -x (west); elevation from the
// horizon. GOLDEN_HOUR puts the sun low in the southwest.
export function sunDirection() {
  const el = GOLDEN_HOUR.sunElevation;
  const az = GOLDEN_HOUR.sunAzimuth;
  return new THREE.Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el),
  ).normalize();
}

function skyDomeMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      zenith: { value: new THREE.Color(GOLDEN_HOUR.skyZenith) },
      mid: { value: new THREE.Color(GOLDEN_HOUR.skyMid) },
      horizon: { value: new THREE.Color(GOLDEN_HOUR.skyHorizon) },
    },
    vertexShader: `
      varying vec3 vWorldDirection;
      void main() {
        vWorldDirection = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 zenith;
      uniform vec3 mid;
      uniform vec3 horizon;
      varying vec3 vWorldDirection;
      void main() {
        float h = clamp(vWorldDirection.y, -0.08, 1.0);
        vec3 colour = h > 0.28
          ? mix(mid, zenith, smoothstep(0.28, 0.75, h))
          : mix(horizon, mid, smoothstep(-0.02, 0.28, h));
        gl_FragColor = vec4(colour, 1.0);
      }
    `,
  });
}

// The sun disc: a bright circle low in the southwest, with a wide warm
// glow behind it. At ~780 m out with a 34 m radius it reads as a real sun
// in the street shots, not a speck — and the glow sells the haze around it.
function buildSunDisc(scene) {
  const dir = sunDirection();
  const group = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(34, 48),
    new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false, toneMapped: false }),
  );
  disc.position.copy(dir).multiplyScalar(780);
  disc.lookAt(0, 0, 0);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowPool(), color: 0xff9a4a, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  glow.scale.set(340, 340, 1);
  glow.position.copy(dir).multiplyScalar(770);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowPool(), color: 0xff6a30, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  halo.scale.set(620, 620, 1);
  halo.position.copy(dir).multiplyScalar(760);
  group.add(disc, glow, halo);
  scene.add(group);
  return group;
}

// Cloud billboards: warm-lit puffs drifting slowly across the sky. They
// sit high and far out, so they frame the skyline instead of crowding it.
function buildClouds(scene, rng) {
  const group = new THREE.Group();
  const puff = cloudPuff();
  const clouds = [];
  for (let i = 0; i < 16; i += 1) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: puff, transparent: true, opacity: rng.between(0.55, 0.9),
      depthWrite: false, fog: false,
    }));
    const angle = rng.between(0, Math.PI * 2);
    const radius = rng.between(260, 560);
    const width = rng.between(90, 210);
    sprite.position.set(
      Math.cos(angle) * radius,
      rng.between(95, 190),
      Math.sin(angle) * radius,
    );
    sprite.scale.set(width, width * 0.42, 1);
    group.add(sprite);
    clouds.push({ sprite, drift: rng.between(0.4, 1.1) });
  }
  scene.add(group);
  return { group, clouds };
}

// The sea: two planes beyond the waterline (east strip + south strip) with
// the glitter texture, scrolling slowly so the water reads as alive.
function buildSea(scene, rng) {
  const water = sea(rng);
  water.repeat.set(24, 24);
  const material = new THREE.MeshStandardMaterial({
    map: water, color: 0x9fc4dd, roughness: 0.35, metalness: 0.25,
  });
  const group = new THREE.Group();
  const east = new THREE.Mesh(new THREE.PlaneGeometry(140, WORLD_HALF * 2 + 80), material);
  east.rotation.x = -Math.PI / 2;
  east.position.set(258 + 70, 0.0, 0);
  const south = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_HALF * 2 + 80, 140), material);
  south.rotation.x = -Math.PI / 2;
  south.position.set(0, 0.0, 232 + 70);
  group.add(east, south);
  scene.add(group);
  return { group, water };
}

// A tiny sunset environment, PMREM'd once: the sky gradient plus a warm
// sun patch, dimmed so it sheens the glass without washing the clothing.
// Materials that must not wash (clothing) set envMapIntensity 0 themselves.
function applySunsetEnvironment(renderer, scene) {
  const envScene = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 16, 12), skyDomeMaterial());
  envScene.add(dome);
  const sunPatch = new THREE.Mesh(
    new THREE.SphereGeometry(6, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
  );
  sunPatch.position.copy(sunDirection()).multiplyScalar(40);
  envScene.add(sunPatch);
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromScene(envScene, 0.06).texture;
  scene.environment = envMap;
  pmrem.dispose();
}

export function buildSky(scene, renderer, rng) {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyDomeMaterial());
  scene.add(dome);

  const sun = buildSunDisc(scene);
  const clouds = buildClouds(scene, rng.fork(7));
  const seaParts = buildSea(scene, rng.fork(8));

  // The key light: the low southwest sun, long shadows across the city.
  const sunLight = new THREE.DirectionalLight(GOLDEN_HOUR.sunColor, GOLDEN_HOUR.sunIntensity);
  sunLight.position.copy(sunDirection()).multiplyScalar(320);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -260;
  sunLight.shadow.camera.right = 260;
  sunLight.shadow.camera.top = 260;
  sunLight.shadow.camera.bottom = -260;
  sunLight.shadow.camera.near = 40;
  sunLight.shadow.camera.far = 700;
  sunLight.shadow.bias = -0.0006;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Violet sky bounce + warm street bounce, and a soft fill so the shade
  // side of the city never goes dead black.
  const hemi = new THREE.HemisphereLight(
    GOLDEN_HOUR.hemiSky, GOLDEN_HOUR.hemiGround, GOLDEN_HOUR.hemiIntensity,
  );
  scene.add(hemi);
  const fill = new THREE.AmbientLight(0x60405a, 0.55);
  scene.add(fill);

  scene.fog = new THREE.Fog(GOLDEN_HOUR.fogColor, GOLDEN_HOUR.fogNear, GOLDEN_HOUR.fogFar);
  applySunsetEnvironment(renderer, scene);

  return {
    sun,
    clouds: clouds.clouds,
    seaTexture: seaParts.water,
    update(dt) {
      // Clouds drift eastward and wrap; the sea texture scrolls slowly.
      for (const cloud of clouds.clouds) {
        cloud.sprite.position.x += cloud.drift * dt;
        if (cloud.sprite.position.x > 620) cloud.sprite.position.x = -620;
      }
      seaParts.water.offset.x += dt * 0.004;
      seaParts.water.offset.y += dt * 0.002;
    },
  };
}
