// PUERTO DEL SOL — the numbers every system agrees on.
//
// One job: declare the map, the tuning and the look in one place, so the
// city, the traffic, the police, the missions and the camera all share one
// map and one golden hour. Nothing here draws anything; it only declares.
//
// The art thesis, in three rules:
//   1. DISTRICTS, not dice. Every block belongs to a district with its own
//      archetype and palette family. Neighbours share a family, so a street
//      reads as a street, not a raffle.
//   2. A HEIGHT GRADIENT. Floors fall with distance from the centre, so the
//      skyline slopes down in every direction instead of forming a flat wall.
//   3. ONE GOLDEN HOUR, committed. A deep warm sun low in the southwest,
//      violet overhead, a rose band, a burning amber horizon, golden haze.
//      The sky values are deliberately deeper than they look on a swatch:
//      the dome is un-tonemapped and the colours must survive the output curve.

// ---------- The map: an 8x8 street grid on a coastal shelf (metres) ----------
export const GRID_PITCH = 48; // centreline to centreline of parallel streets
export const ROAD_WIDTH = 14; // asphalt width
export const BLOCK_MIN = -4; // block indices BLOCK_MIN..BLOCK_MAX; city spans -192..192
export const BLOCK_MAX = 3;
export const CITY_HALF = 192; // half-width of the built-up city
export const WORLD_HALF = 330; // half-width of the ground plane + sea
export const ROAD_LINES = [-144, -96, -48, 0, 48, 96, 144]; // street centrelines

// A block (bx, bz) spans x in [bx*48+7, (bx+1)*48-7]; its centre is bx*48+24.
export function blockCenter(bx, bz) {
  return { x: bx * GRID_PITCH + GRID_PITCH / 2, z: bz * GRID_PITCH + GRID_PITCH / 2 };
}

// ---------- Landmark addresses (x, z) ----------
export const GARAGE = { x: -24, z: -24 }; // Rosa's garage, the story hub
export const GARAGE_FORECOURT = { x: -24, z: -38 }; // the apron in front of the workshop
export const HOSPITAL_DOOR = { x: -72, z: -134 }; // respawn after WASTED
export const STATION_DOOR = { x: -120, z: 134 }; // respawn after BUSTED
export const DOCKS_YARD = { x: 184, z: 0 }; // east piers, Kings territory
export const BEACH_HOUSE = { x: 150, z: 150 }; // the getaway goal
export const BEACH_LOT = { x: 8, z: 148 }; // where the Kings park their prize car
export const CRATE_PICKUP = { x: 168, z: -48 }; // the m1 parts crate
export const SPAWN_POINT = { x: -24, z: -48 }; // first step: on the road by the garage
export const LIGHTHOUSE_POS = { x: 254, z: 0 }; // end of the middle pier, closing the z=0 boulevard

// The waterline: Dana and the cars stop here. The sea begins just past it.
export const WATERLINE = { eastX: 258, southZ: 232 };

// ---------- Districts: the city's order ----------
// Six hard identities, not one grid: downtown is the glass core around
// the centre; midtown rings it in brick-and-stucco mid-rise; old town is
// pastel stucco walk-ups; the docks (east) are brick warehouses and
// containers; the beachfront (south) is pastel Art Deco villas under
// terracotta; the hills (west + north edges) are walled estates under
// the ridges. Parks and landmarks are fixed.
export const DISTRICT_NAMES = ['downtown', 'midtown', 'oldtown', 'docks', 'beachfront', 'hills', 'park', 'landmark'];
export const LANDMARK_BLOCKS = new Set(['-1,-1', '-2,-3', '-3,2', '2,-3', '0,3']);
export const PARK_BLOCKS = new Set(['1,1', '-3,-2']);

// Player-facing district names for the transient district card (GTA's
// location text, script font, on entry — never a permanent label).
export const DISTRICT_DISPLAY = {
  downtown: 'Centro',
  midtown: 'Barrio Central',
  oldtown: 'Casco Viejo',
  docks: 'El Puerto',
  beachfront: 'Playa del Sol',
  hills: 'Lomas Altas',
  park: 'Parque del Sol',
  landmark: 'Puerto del Sol',
};

// Landmark blocks show their own name on the district card.
export const LANDMARK_DISPLAY = {
  '-1,-1': "Rosa's Garage",
  '-2,-3': 'Del Sol General',
  '-3,2': 'PSPD Precinct 4',
  '2,-3': 'Water Tower',
  '0,3': 'Beach Pavilion',
};

export function districtAt(bx, bz) {
  const key = `${bx},${bz}`;
  if (LANDMARK_BLOCKS.has(key)) return 'landmark';
  if (PARK_BLOCKS.has(key)) return 'park';
  if (bz === 3) return 'beachfront';
  if (bx === 3) return 'docks';
  if (bx === -4 || bz === -4) return 'hills';
  // Manhattan distance from the centre block, in blocks.
  const ring = Math.abs(bx + 0.5) + Math.abs(bz + 0.5);
  if (ring <= 2) return 'downtown';
  if (ring <= 4) return 'midtown';
  return 'oldtown';
}

// The name the district card shows for a block: the landmark's own name
// on landmark blocks, the district's display name everywhere else.
export function districtDisplayName(bx, bz) {
  const key = `${bx},${bz}`;
  if (LANDMARK_DISPLAY[key]) return LANDMARK_DISPLAY[key];
  return DISTRICT_DISPLAY[districtAt(bx, bz)] || 'Puerto del Sol';
}

// The height gradient: floors fall as the block moves away from the centre,
// with a small deterministic step per block so no two neighbours are the
// same height but the skyline still slopes down in every direction.
export function floorsAt(bx, bz, kind) {
  const ring = Math.abs(bx + 0.5) + Math.abs(bz + 0.5);
  const step = ((bx * 7 + bz * 11) % 3 + 3) % 3; // 0..2, deterministic per block
  if (kind === 'tower') return Math.max(11, 18 - Math.floor(ring) * 2 - step);
  if (kind === 'midrise') return Math.max(4, 8 - Math.floor(ring) - step);
  if (kind === 'walkup') return 2 + (step % 2); // 2-3 floors, low and even
  if (kind === 'estate') return 2; // hills estates: two floors behind walls
  return 2;
}

// ---------- Facade palettes, one family per district ----------
// A palette is base stucco + trim + glass + lit-window glow. Within a
// district the families harmonise; the per-block pick is a slow hash of the
// block coordinates, so the same street always shows the same pairing and
// neighbours never clash. No per-building dice roll.
export const FACADE_FAMILIES = {
  // Downtown glass: cool slate-navy shells, one hue per building. The glass
  // values are lighter than a first pass would pick: dark glass + metal +
  // no environment map renders black, and black towers read as voids. The
  // reflection gradient in the facade texture does the work of reading as
  // glass, not the darkness of the base.
  downtown: [
    { base: '#54657e', trim: '#8a94a2', glass: '#46608a', glow: '#ffc27a' },
    { base: '#4c5a6e', trim: '#7e8a98', glass: '#3f587e', glow: '#ffbe6e' },
    { base: '#5f6d80', trim: '#96a0aa', glass: '#4e6a8c', glow: '#ffd27a' },
  ],
  // Midtown: warm stone and brick-red stucco, muted and even.
  midtown: [
    { base: '#e3c9a8', trim: '#c4a87e', glass: '#4a6a84', glow: '#ffca7a' },
    { base: '#d9bfa0', trim: '#b89a72', glass: '#46607a', glow: '#ffc27a' },
    { base: '#cbb49a', trim: '#a89474', glass: '#52708c', glow: '#ffd27a' },
  ],
  // Old town: pastel coastal stucco — cream, peach, soft coral.
  oldtown: [
    { base: '#f0dcc0', trim: '#cbb28c', glass: '#5d7f9e', glow: '#ffca7a' },
    { base: '#f2cdb4', trim: '#d9a586', glass: '#4f7390', glow: '#ffc27a' },
    { base: '#eeb9a8', trim: '#d18f80', glass: '#46667f', glow: '#ffd27a' },
  ],
  // Beachfront villas: pastel Art Deco — pink, mint, peach, lavender —
  // under terracotta roofs. Four families, so the beachfront reads as a
  // painted row, not one white wall.
  beachfront: [
    { base: '#f2c4c4', trim: '#d8a0a0', glass: '#5d8aa0', glow: '#ffca7a' },
    { base: '#c4e8d8', trim: '#9ac8b0', glass: '#54708a', glow: '#ffc27a' },
    { base: '#f2d4b4', trim: '#d8b088', glass: '#5d8aa0', glow: '#ffca7a' },
    { base: '#d8c8e8', trim: '#b8a0d0', glass: '#54708a', glow: '#ffc27a' },
  ],
  // Hills estates: warm stone and cream behind garden walls.
  hills: [
    { base: '#e8dcc0', trim: '#c8b898', glass: '#4a6a84', glow: '#ffca7a' },
    { base: '#dfd0ae', trim: '#bcae8c', glass: '#46607a', glow: '#ffc27a' },
  ],
};

// Deterministic per-block palette: the hash walks the family slowly across
// the grid instead of rolling per building, so neighbours harmonise.
export function facadeAt(bx, bz, district) {
  const family = FACADE_FAMILIES[district] || FACADE_FAMILIES.oldtown;
  const hash = Math.abs(bx * 5 + bz * 3 + ((bx + bz) % 2) * 7);
  return family[hash % family.length];
}

// ---------- Golden hour, committed ----------
// The sun sits low in the southwest (azimuth measured from +z/south toward
// -x/west), so the south-looking street shots catch the disc low over the
// rooftops at the end of the boulevard, and the light rakes sideways across
// the facades. Key intensity 2.5, not 2.9: the stronger key washed dark
// clothing pale under ACES (the v3 pants problem), and the grade stays
// committed at the softer value.
export const GOLDEN_HOUR = {
  sunColor: 0xff7a2e, // deep amber sun, not pale yellow
  sunIntensity: 2.5,
  sunElevation: 0.22, // low sun, long shadows, disc just above the rooftops
  // Azimuth -0.35: 20° west of south, so the disc sits inside the frame of
  // a south-looking camera, left of the status panel. At -0.95 no shot
  // ever showed the disc; at -0.45 it projected to x=1031, behind the
  // panel. The disc is only visible where the street opens (the beach
  // vista) — the street-wall buildings occlude it from mid-city.
  // (v4 screenshots + projection probe.)
  sunAzimuth: -0.35,
  skyZenith: 0x241239, // deep indigo-violet overhead
  skyMid: 0x9e2c58, // rose-magenta band, deepened
  skyHorizon: 0xff6a24, // burning amber at the horizon
  fogColor: 0xc96a55, // warm golden-rose haze
  fogNear: 120,
  fogFar: 400,
  hemiSky: 0x8a6ab0, // violet bounce from the sky
  hemiGround: 0x7a4a30, // warm bounce from the streets
  hemiIntensity: 0.85,
  exposure: 1.05,
  seaColor: 0x1e4266, // deep blue sea catching the sunset
  sandColor: 0xe3c98f,
};

// ---------- Terrain: gentle shelf, beach dunes, hills hemming west and north ----------
export const TERRAIN = {
  duneStart: 196, // south beach dunes begin here (z > duneStart)
  duneHeight: 1.4,
  hillStart: 212, // hills rise beyond this |x| / |z|
  hillWest: 15, // west ridge height
  hillNorth: 11, // north ridge height
  seaFloor: -2.5, // ground under the eastern sea
};

// ---------- Reputation: the street learns Dana's name as she works ----------
export const REP_RANKS = [
  { level: 1, name: 'NEW IN TOWN', at: 0 },
  { level: 2, name: 'STREET KNOWN', at: 250 },
  { level: 3, name: 'GARAGE REGULAR', at: 600 },
  { level: 4, name: 'BAY RUNNER', at: 1100 },
  { level: 5, name: 'DOCKSIDE NAME', at: 1800 },
  { level: 6, name: 'DEL SOL LEGEND', at: 2800 },
];
export const REP_AWARDS = { mission: 150, nearMiss: 25, drift: 25, postcard: 50 };

// ---------- Armour vests: pickup spots that refill Dana's vest ----------
export const ARMOUR_SPOTS = [
  { x: -30, z: -38, name: "Rosa's Garage" },
  { x: -72, z: -128, name: 'Del Sol General' },
  { x: 176, z: 24, name: 'The Docks' },
];
export const ARMOUR_MAX = 100;
export const ARMOUR_PICKUP_VALUE = 50;

// ---------- The hero ----------
export const HERO_STATS = {
  walk: 5.4,
  run: 9.0,
  maxHealth: 100,
  startCash: 250,
  regenDelay: 8, // quiet seconds before health returns
  regenRate: 2.5, // health per second
  eyeHeight: 1.62,
};

// ---------- Driving ----------
export const DRIVE_STATS = {
  accel: 15,
  brake: 28,
  topSpeed: 36, // m/s, ~130 km/h
  reverse: 11,
  steerRate: 2.0, // rad/s at full lock
  drag: 0.55,
  handbrakeGrip: 0.35, // grip left while the handbrake is held
};

// ---------- The rifle ----------
export const RIFLE_STATS = {
  mag: 12,
  damage: 34,
  range: 95,
  interval: 0.16, // seconds between shots
  reload: 1.4,
};

// ---------- Heat: the PSPD response ----------
export const HEAT_RULES = {
  maxStars: 5,
  decayDelay: 18, // unseen seconds before a star drops
  spawnRange: 70,
  arrestHold: 2.5, // seconds an officer must stay close to cuff Dana
  bustedFine: 200,
  wastedFine: 150,
  heliStars: 3, // the helicopter joins at 3 stars
};

// ---------- PSPD callsigns: every unit carries a name ----------
// GTA-faithful: named units, not copies of one generic label. Cruisers
// take the next free callsign in order; the helicopter is always GULL-1.
// (The callsigns live on the units; the radar shows them as blips.)
export const CRUISER_CALLSIGNS = ['SNAPPER-11', 'MARLIN-10', 'TARPON-18', 'KESTREL-31', 'HERON-7', 'BARRACUDA-4'];
export const OFFICER_CALLSIGNS = ['OFC. REYES', 'OFC. KANE', 'OFC. MARLOW', 'OFC. DUVALL'];
export const HELI_CALLSIGN = 'GULL-1';

// ---------- The living city ----------
// GTA streets are never empty in daylight: 20 moving cars, 36 strolling
// peds plus the fixed dock workers, beachgoers and standing pairs, and
// 16 parked cars lining both kerbs. The play-test counts these exactly.
export const CITY_LIFE = {
  traffic: 20,
  trafficSpeed: 9,
  peds: 36,
  parked: 16,
  pedWalk: 1.4,
  pedFlee: 4.4,
};

// ---------- The story ----------
export const TITLE = 'PUERTO DEL SOL';
export const SUBTITLE = 'a sun-soaked open-world crime story';
export const HERO_NAME = 'Dana Vega';
export const GOAL_CASH = 50000; // the garage's protection bill. Mission rewards
// (800 + 1500 + 2500 + 3000 + 42000) plus $250 start cash land Dana at
// $50,050 — the goal is reachable by finishing the story.
export const POSTCARD_REWARD = 200;
export const INTRO =
  'Dana Vega runs courier jobs out of Rosa\u2019s garage on Marlin Street. ' +
  'The Dockside Kings want the garage — fifty thousand dollars of "protection" ' +
  'or they torch it. Dana has one week, one battered van, and no plans to pay.';
export const SAVE_KEY = 'solmar-bay-save-v4';
export const DEFAULT_SEED = 1;

// ---------- Camera: low and close, so Dana is LARGE in frame ----------
// The chase cam sits tight behind the bumper, GTA III's defining choice:
// lower and closer than v4 (6.8 m / 2.6 m), with the speed FOV kick kept.
export const CAMERA_TUNING = {
  onFootDist: 3.9,
  onFootHeight: 1.9,
  onFootShoulder: 0.5, // over-the-shoulder offset while aiming
  driveDist: 6.8,
  driveHeight: 2.6,
  fov: 60,
  driveFov: 66,
  fovKick: 7, // extra FOV at top speed
};
