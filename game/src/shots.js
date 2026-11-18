// Screenshot scenes behind ?shot=chase|city|mission|combat.
//
// One job: stage each shot by playing the real game forward from a fresh
// seeded world with a scripted autopilot — the frame is what real play
// looks like, and the same seed always gives the same frame. After staging,
// the simulation freezes on that exact frame for the screenshot.
//
// The staged numbers are chosen for the frame, not the fight: Dana's
// health is topped back up after the staged advance (a hero at 36 HP reads
// as a bug, not a battle), and the chase car's condition is reset to 0.85
// after the staged ramming. The simulation is real; the last touch-up is
// the photographer's, not the player's.
//
// The lighthouse rule, stated once: v3's mission/combat frames cropped
// the lighthouse at the frame edge, because the final yaw nudge was tuned
// by feel. v4 computes the lighthouse's bearing from Dana and sets the
// camera yaw from it, so the lighthouse lands left-of-centre, whole, clear
// of the panels — and the harness verifies it by projection.
// The combat-shot rule: the final shot fires AFTER the last camera snap,
// never before — the tracer is drawn from the camera's final orientation,
// so it connects the muzzle to the enemy.

import { LIGHTHOUSE_POS } from './config.js';
import { createCar } from './cars.js';

const STEP = 1 / 30;

// Finish a shot: hide the briefing banner, the E prompt and the combat
// flashes (a frozen damage flash reads as a bug), keep the subtitle (it
// is part of the frame), refresh the HUD, render.
function finishShot(game) {
  game.hud.hideBanner();
  game.hud.hidePrompt();
  game.hud.hideCombatFx();
  game.refreshHud();
  game.render();
}

// Put the game in a fresh playing state for a shot.
function freshGameForShot(game, seed) {
  game.build(seed);
  game.state = 'playing';
  game.input.enabled = true;
  game.input.clear();
  game.hud.hideStart();
  game.hud.hideEndScreens();
  game.hud.setHintVisible(false);
  game.health = 100;
  game.cash = 2450;
}

// Run the simulation forward `seconds` with `drive` held each step.
function runForward(game, seconds, drive) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    drive(game, i * STEP);
    game.update(STEP);
  }
}

// Hold W most of the time (a 0.25 s lift per second lets the cruisers keep
// up); steer by heading error toward the road's centreline.
function pulsedChaseAutopilot(game, t) {
  const keys = game.input.keys;
  keys.delete('KeyW');
  if (t % 1 < 0.75) keys.add('KeyW');
  keys.delete('KeyA');
  keys.delete('KeyD');
  if (!game.player.inCar) return;
  const car = game.player.inCar.car;
  const pos = car.group.position;
  // Desired heading: mostly south, angled back toward x = 0 when off-centre.
  const desired = Math.atan2(-pos.x * 0.06, 1);
  let error = desired - car.group.rotation.y;
  while (error > Math.PI) error -= Math.PI * 2;
  while (error < -Math.PI) error += Math.PI * 2;
  if (error > 0.06) keys.add('KeyA');
  else if (error < -0.06) keys.add('KeyD');
}

// Walk forward (W) with the camera already aimed where the shot wants.
function walkAutopilot(game) {
  game.input.keys.add('KeyW');
}

// Stand still: clear every movement key.
function standStill(game) {
  game.input.keys.delete('KeyW');
  game.input.keys.delete('KeyA');
  game.input.keys.delete('KeyS');
  game.input.keys.delete('KeyD');
}

// Hold the aim pose (right mouse) while facing the nearest enemy.
function aimPose(game) {
  game.input.aimDown = true;
  const enemies = game.weapons.aliveEnemies();
  if (enemies.length > 0) {
    const pos = enemies[0].rig.group.position;
    aimCameraAt(game, pos.x, pos.z);
  }
  standStill(game);
}

// Put Dana in a fresh sports car at (x, z), facing `heading`.
function putPlayerInSportsCar(game, x, z, heading) {
  const car = createCar(game.rng.fork(201), 'sports', 0xc23a2e);
  car.group.position.set(x, 0, z);
  car.group.rotation.y = heading;
  game.scene.add(car.group);
  const record = { car, speed: 0, direction: { x: 0, z: 1 }, taken: true, isTraffic: false };
  game.traffic.all.push(record);
  game.traffic.parked.push(record);
  game.player.enterCar(record);
}

// Aim Dana's camera at a point (for the on-foot action shots).
function aimCameraAt(game, x, z) {
  const dx = x - game.player.x;
  const dz = z - game.player.z;
  game.player.cameraYaw = Math.atan2(dx, dz);
  game.player.cameraPitch = 0.3;
}

// Compose the lighthouse into the frame: the camera yaw is set from the
// lighthouse's bearing, so the tower lands left-of-centre and whole —
// clear of the transient objective line (top-left) and the cash (top-right).
// `offset` is how far left of centre it sits, in radians.
function frameLighthouse(game, offset = 0.38, pitch = 0.28) {
  const dx = LIGHTHOUSE_POS.x - game.player.x;
  const dz = LIGHTHOUSE_POS.z - game.player.z;
  const bearing = Math.atan2(dx, dz);
  // A bearing SMALLER than the camera yaw appears LEFT of centre (facing
  // south, east is left; the convention holds around the compass).
  game.player.cameraYaw = bearing + offset;
  game.player.snapCamera(game.camera, game.player.cameraYaw, pitch, 5.5, 2.4);
}

// Pull the nearest enemies into a composed firing line ahead of Dana —
// the fight reads better when the Kings are large in frame, not dots.
function bringEnemiesCloser(game, spots) {
  const enemies = game.weapons.aliveEnemies()
    .sort((a, b) => {
      const pa = a.rig.group.position;
      const pb = b.rig.group.position;
      return Math.hypot(pa.x - game.player.x, pa.z - game.player.z)
        - Math.hypot(pb.x - game.player.x, pb.z - game.player.z);
    });
  const forward = { x: Math.sin(game.player.cameraYaw), z: Math.cos(game.player.cameraYaw) };
  const side = { x: -forward.z, z: forward.x };
  for (let i = 0; i < Math.min(spots.length, enemies.length); i += 1) {
    const enemy = enemies[i];
    const [dist, lateral] = spots[i];
    const x = game.player.x + forward.x * dist + side.x * lateral;
    const z = game.player.z + forward.z * dist + side.z * lateral;
    enemy.rig.group.position.set(x, 0, z);
    enemy.x = x;
    enemy.z = z;
    enemy.rig.group.rotation.y = Math.atan2(game.player.x - x, game.player.z - z);
  }
}

/**
 * Stage the named shot and freeze the frame. Returns the shot's name.
 * Unknown names stage the chase (the cover).
 */
export function stageShot(name, game, seed) {
  if (name === 'city') {
    freshGameForShot(game, seed);
    game.missions.startNext(game.storyContext()); // m1: objective + waypoint on the HUD
    // The south end of Marlin Street: the street opens onto the beach,
    // the sea and the sun disc — the one sightline in the city where the
    // disc clears the rooftops. (Mid-city the street-wall buildings
    // occlude it from every angle; and the chase already owns the
    // building-lined street vista, so the city shot takes the beach.)
    game.player.spawnAt(0, 128, 0);
    game.player.cameraYaw = 0; // look south down Marlin Street, toward the sun
    game.player.cameraPitch = 0.3;
    runForward(game, 5, walkAutopilot);
    // A living street for the frame: parked cars lining BOTH kerbs ahead
    // and eight pedestrians on the sidewalks ahead of Dana — the revision
    // minimum for the city frame. The near ped is ~13 m ahead, close
    // enough to read as a person, not a dot; the far ones anchor the
    // beach end. (The first beach-vista frame parked one car and one ped
    // BEHIND the camera; the fourth left the near-midground empty.)
    game.traffic.addParked(5.5, 168, 0, 'sedan');
    game.traffic.addParked(-5.5, 178, Math.PI, 'pickup');
    game.traffic.addParked(5.5, 195, 0, 'taxi');
    game.traffic.addParked(-5.5, 155, Math.PI, 'van');
    const nearPeds = game.crowd.peds.slice(0, 8);
    const pedSpots = [
      [10.5, 152, Math.PI], [-10.5, 160, 0], [10.5, 170, Math.PI], [-10.5, 178, 0],
      [10.5, 188, Math.PI], [-10.5, 196, 0], [10.5, 205, Math.PI], [-10.5, 212, 0],
    ];
    for (let i = 0; i < nearPeds.length; i += 1) {
      const ped = nearPeds[i];
      const spot = pedSpots[i];
      ped.rig.group.position.set(spot[0], 0, spot[1]);
      ped.rig.group.rotation.y = spot[2];
      ped.x = spot[0];
      ped.z = spot[1];
    }
    // The city frame's transient: the district name card. Dana ends the
    // walk on the pavilion landmark block, so the card reads the
    // landmark's own name — Beach Pavilion. The objective line and the
    // m1 start subtitle are cleared — one transient per frame.
    game.hud.showLocationNow();
    finishShot(game);
    game.hud.hideObjective();
    game.hud.hideSubtitle();
    return 'city';
  }

  if (name === 'mission') {
    freshGameForShot(game, seed);
    game.missions.completedCount = 1;
    game.missions.startNext(game.storyContext()); // m2: steal the prize car
    game.cash = 1050; // exact: $250 start + $800 for m1
    // Walk Dana onto the beach lot: stage 1 (reach the lot) completes and
    // stage 2 marks the prize sports car. The mission frame is the steal
    // itself — Dana beside the car, the beach and the Ferris wheel behind.
    // (The first v4 mission frame was m3 at the docks — a near-duplicate
    // of the combat frame. The contact sheet needs four distinct settings,
    // so the mission shot moved to the beach lot.)
    game.player.spawnAt(8, 138, 0);
    game.player.cameraYaw = 0; // walk south, onto the lot
    runForward(game, 1.5, walkAutopilot); // cross the lot waypoint
    const car = game.missions.markedCar;
    const cp = car.car.group.position;
    // Clear the lot around the prize car: a parked van sat between the
    // camera and Dana in the first beach-lot frame and ate the left half
    // of it. Anything parked within 15 m of the prize car (other than the
    // prize car itself) moves two blocks north, out of the frame.
    for (const rec of game.traffic.parked) {
      if (rec.car === car.car) continue;
      const rp = rec.car.group.position;
      if (Math.hypot(rp.x - cp.x, rp.z - cp.z) < 15) {
        rp.x += 8;
        rp.z -= 96;
      }
    }
    // Frame the Ferris wheel (60, 214) the way the docks frames frame the
    // lighthouse: bearing from the car plus an offset, so the wheel lands
    // left-of-centre with the sea behind it. Dana stands up-frame of the
    // car, facing it and the beach beyond. The pitch is 0.34 (up from the
    // usual 0.28): the wheel sits high and the beachfront roofline cuts
    // it at the lower pitch.
    const wheelBearing = Math.atan2(60 - cp.x, 214 - cp.z);
    const yaw = wheelBearing + 0.3;
    game.player.x = cp.x - Math.sin(yaw) * 4;
    game.player.z = cp.z - Math.cos(yaw) * 4;
    game.player.cameraYaw = yaw;
    game.player.snapCamera(game.camera, yaw, 0.34, 5.5, 2.4);
    finishShot(game);
    // The mission frame's transient is the subtitle (fresh from stage 2).
    // The objective line, the radio card (the 1.5 s staging is shorter
    // than its 4 s life) and the district card (the walk crosses into
    // the pavilion block) are all cleared — one transient per frame.
    game.hud.hideObjective();
    game.hud.hideRadioCard();
    game.hud.hideNameCard();
    return 'mission';
  }

  if (name === 'combat') {
    freshGameForShot(game, seed);
    game.missions.completedCount = 2;
    game.missions.startNext(game.storyContext()); // m3: Dockside Heat
    game.player.spawnAt(182, -10, Math.PI / 2);
    // Advance on the nearest King until close, then stand and trade fire —
    // a few shots only, so the mission stays live for the frame.
    let shotsFired = 0;
    runForward(game, 4.5, (g) => {
      const enemies = g.weapons.aliveEnemies();
      if (enemies.length === 0) { standStill(g); return; }
      const pos = enemies[0].rig.group.position;
      const dist = Math.hypot(pos.x - g.player.x, pos.z - g.player.z);
      aimCameraAt(g, pos.x, pos.z);
      if (dist > 14) walkAutopilot(g);
      else {
        standStill(g);
        g.input.aimDown = true; // raise the rifle once in range
        if (shotsFired < 4) { g.tryShoot(); shotsFired += 1; }
      }
    });
    runForward(game, 0.4, aimPose); // settle the aim pose for the frame
    // Lighthouse first, then the enemies relative to the final yaw (see
    // the mission shot): the target King lands on the crosshair ray, so
    // the final shot hits him and the tracer connects.
    // The aiming camera's ray is nearly flat (it looks 8 m ahead from
    // 3.4 m up) and offset 0.5 m right by the shoulder shift: at pitch
    // 0.18 it only descends to chest height at ~23 m, and at 11 m it
    // passes over the target's head — the kill popup never appeared in
    // the fifth screenshots, at lateral 0 or 0.5. So the target stands
    // at 23 m, lateral -0.5 (on the ray's line), and the near King at
    // 11 m gives the frame its depth. (A lower pitch would reach the
    // chest sooner, but it tilts the lighthouse out of the frame.)
    frameLighthouse(game, 0.38, 0.18);
    bringEnemiesCloser(game, [[23, -0.5], [11, 3.5]]);
    // The final shot kills: pre-damage the TARGET King (the one placed on
    // the ray at 23 m) to 30 HP so the 34-damage round drops him and the
    // frame shows the KING DOWN score popup — the top-3 frames all carry
    // score popups, and a hit without a payoff reads as a miss. The
    // target is the enemy CLOSEST TO 23 m out — not the nearest (that was
    // the 11 m bystander) and not the farthest (that was an unplaced King
    // still at his spawn post, 40 m away; both wrong picks cost a round
    // of screenshots each).
    {
      const dist = (e) => Math.hypot(e.rig.group.position.x - game.player.x, e.rig.group.position.z - game.player.z);
      const target = game.weapons.aliveEnemies()
        .sort((a, b) => Math.abs(dist(a) - 23) - Math.abs(dist(b) - 23))[0];
      if (target) target.hp = 30;
    }
    // Fire AFTER the last camera snap, so the tracer is drawn from the
    // camera's final orientation and lands on the enemy at ~11 m.
    game.tryShoot();
    game.health = 85; // top up after the staged advance
    finishShot(game);
    // The combat frame's transient is the KING DOWN popup. The objective
    // line, the m3 start subtitle and the one-shot aim help are cleared
    // individually — the blanket hide would also kill the hitmarker,
    // which is the frame's payoff.
    game.hud.hideObjective();
    game.hud.hideSubtitle();
    game.hud.hideHelp();
    // Re-show the kill's score popup for the photograph, persistent: the
    // kill's own popup is real, but its 2.2 s wall-clock life expires
    // during the slow frozen-frame render (and the rise animation never
    // fades in at ~4 fps), so the frame would show the kill (3 enemies
    // left, REP +10, the body) with no popup. This is the same kill's
    // feedback, re-timed — not a second kill.
    game.hud.showScorePopup('KING DOWN', 'kill', true);
    return 'combat';
  }

  // 'chase' (the cover) and any other name: a 3-star pursuit with a mission live.
  freshGameForShot(game, seed);
  game.missions.completedCount = 3;
  game.missions.startNext(game.storyContext()); // m4: The Getaway — wanted 3, objective live
  putPlayerInSportsCar(game, 0, -108, 0);
  game.player.cameraPitch = 0.22; // lower chase camera: more speed, more car
  // The car drives south (heading 0) but the spawn yaw is π (north): left
  // alone, the camera sits IN FRONT of the car looking back at its front,
  // and every staged element ahead lands behind the lens. Yaw 0 puts the
  // camera north of the car, looking south down the chase.
  game.player.cameraYaw = 0;
  // Cruisers staged for the camera, which looks forward from the chase car:
  // one oncoming ahead, one alongside, one behind (visible on the minimap).
  const cruiserSpots = [
    { x: 5, z: -44, heading: Math.PI },
    { x: -7, z: -96, heading: 0 },
    { x: 3, z: -160, heading: 0 },
  ];
  for (const spot of cruiserSpots) {
    const cruiser = game.police.spawnCruiser();
    cruiser.car.group.position.set(spot.x, 0, spot.z);
    cruiser.car.group.rotation.y = spot.heading;
  }
  runForward(game, 6, pulsedChaseAutopilot);
  // The staged ramming stalls the car (the HUD froze at 0 km/h in the
  // first v4 chase shot). Re-set the chase speed for the frozen frame —
  // the sim stops here, so this is the photographed speed, 79 km/h.
  game.player.carSpeed = 22;
  {
    const heading = game.player.inCar.car.group.rotation.y;
    game.player.carVelocity.x = Math.sin(heading) * 22;
    game.player.carVelocity.z = Math.cos(heading) * 22;
  }
  // Compose the frozen frame: officers on foot can't keep up with a car,
  // so they leave the frame (their heads were clipping the camera); one
  // cruiser comes at Dana head-on in the oncoming lane, close enough to
  // read; a second pulls alongside on the left; and the helicopter swings
  // low and close ahead, inside the frame. The street stays ALIVE — the
  // revision minimum is four moving traffic cars and six visible peds in
  // the chase frame, so the traffic ahead is composed, not cleared:
  // two oncoming, two same-direction, all clear of the cruisers.
  for (const officer of game.police.officers) game.scene.remove(officer.rig.group);
  game.police.officers = [];
  const trafficSpots = [
    [-3.5, game.player.z + 35, 0], [3.5, game.player.z + 45, Math.PI],
    [-3.5, game.player.z + 58, 0], [3.5, game.player.z + 68, Math.PI],
  ];
  const moving = game.traffic.moving.slice(0, 4);
  for (let i = 0; i < moving.length; i += 1) {
    const pos = moving[i].car.group.position;
    pos.set(trafficSpots[i][0], 0, trafficSpots[i][1]);
    moving[i].car.group.rotation.y = trafficSpots[i][2];
  }
  // Six peds on the sidewalks ahead, watching the chase go by.
  const chasePeds = game.crowd.peds.slice(0, 6);
  const chasePedSpots = [
    [10.5, 12], [-10.5, 20], [10.5, 28], [-10.5, 36], [10.5, 44], [-10.5, 50],
  ];
  for (let i = 0; i < chasePeds.length; i += 1) {
    const ped = chasePeds[i];
    const spot = chasePedSpots[i];
    ped.x = spot[0];
    ped.z = game.player.z + spot[1];
    ped.rig.group.position.set(ped.x, 0, ped.z);
    ped.rig.group.rotation.y = ped.x > 0 ? -Math.PI / 2 : Math.PI / 2;
  }
  if (game.police.cruisers.length > 0) {
    const cruiser = game.police.cruisers[0];
    cruiser.car.group.position.set(3.5, 0, game.player.z + 22);
    cruiser.car.group.rotation.y = Math.PI;
  }
  if (game.police.cruisers.length > 1) {
    const alongside = game.police.cruisers[1];
    // Further out and further ahead than v3's spot: at 4.5 m lateral the
    // cruiser merged with the hero car into one blob in the chase frame.
    alongside.car.group.position.set(game.player.x - 7, 0, game.player.z + 16);
    alongside.car.group.rotation.y = 0;
  }
  // Every other cruiser goes behind the player, out of the frame but on
  // the minimap. The third cruiser was never repositioned, and the
  // pursuit parked it right beside the camera — the fourth v4 chase shot
  // is dominated by a police car, not the hero.
  for (let i = 2; i < game.police.cruisers.length; i += 1) {
    const extra = game.police.cruisers[i];
    extra.car.group.position.set(
      game.player.x + (i % 2 === 0 ? 5 : -5), 0, game.player.z - 25 - i * 8);
    extra.car.group.rotation.y = 0;
  }
  if (game.police.heli) {
    const heli = game.police.heli;
    // Low over the street corridor, ahead-left: at y=10 and x=+14 the heli
    // sat behind the street-wall buildings (invisible in the first v4
    // chase shot); at y=24 it projected behind the clock pill (second
    // v4 screenshots). At y=15 over the road itself (x=+8, inside the
    // street corridor the buildings never cover) it clears the traffic,
    // sits below the cash and stars, and reads against the sky.
    // The beacon is frozen ON: at freeze time the blink could be dim.
    const hx = game.player.x + 8;
    const hz = game.player.z + 45;
    heli.group.position.set(hx, 15, hz);
    heli.group.rotation.y = Math.atan2(game.player.x - hx, game.player.z - hz);
    heli.beaconMat.emissiveIntensity = 3.2;
    // Re-aim the searchlight from the heli's new position onto Dana.
    heli.beam.position.set(hx, 14, hz);
    heli.beam.lookAt(game.player.x, 0, game.player.z);
    const beamDist = Math.hypot(game.player.x - hx, 15, game.player.z - hz);
    heli.beam.scale.setScalar(beamDist / 48);
    heli.pool.position.set(game.player.x, 0.15, game.player.z);
  }
  // Lock the chase frame exactly: behind the car, looking south, at the
  // revision's lower, closer chase cam (6.8 m / 2.6 m, pitch 0.18) — the
  // staging IS the cinematic cam for the frozen frame.
  game.player.snapCamera(game.camera, 0, 0.18, 6.8, 2.6);
  game.carCondition = 0.85; // reset after the staged ramming
  finishShot(game);
  // The chase frame's transient is the objective line — and ONLY the
  // objective line. The m4 start dialogue and the district card both
  // survive staging on their timers (the drive crosses into Centro), so
  // every transient is cleared and the objective re-shown on its own.
  game.hud.hideTransientFx();
  game.hud.showObjectiveNow();
  return 'chase';
}
