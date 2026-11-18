// The story: five jobs for Rosa's garage, and the $50,000 that saves it.
//
// One job: run the missions — staged objectives with a waypoint beacon,
// dialogue from Rosa, Dana and Kane, cash rewards, and progression into
// the next job. Free roam continues after the final job.
//
// Each stage kind has one setup handler and one completion test, kept in
// small maps so a new stage kind is one entry, not a new branch in the
// update. The rewards (800 + 1500 + 2500 + 3000 + 42000) plus the $250
// start cash land Dana at $50,050 — the goal is reachable by finishing
// the story.

import {
  BEACH_HOUSE, BEACH_LOT, CRATE_PICKUP, DOCKS_YARD, GARAGE_FORECOURT,
} from './config.js';
import { pillarGlow } from './textures.js';

// id, title, reward, briefing, stages. A stage is a kind + a target +
// the line its speaker says when it begins.
export const MISSIONS = [
  {
    id: 'm1',
    title: 'First Delivery',
    reward: 800,
    briefing: 'Rosa: "A parts crate is sitting at the docks warehouse. Go fetch it — and Dana? Drive like the van is yours. Because it is."',
    stages: [
      { kind: 'goto', x: CRATE_PICKUP.x, z: CRATE_PICKUP.z, radius: 6, text: 'Pick up the parts crate at the docks warehouse', say: ['Rosa', 'North warehouse, by the big door. Grab it and bring it home in one piece.'] },
      { kind: 'goto', x: GARAGE_FORECOURT.x, z: GARAGE_FORECOURT.z, radius: 7, text: 'Deliver the crate to Rosa\u2019s garage', say: ['Dana', 'One crate, zero dents. Rosa owes me lunch.'] },
    ],
  },
  {
    id: 'm2',
    title: 'Hot Wheels',
    reward: 1500,
    briefing: 'Rosa: "The Kings parked a sports car at the beach lot — keys still in it, because they are geniuses. Go get it. And Dana? Try not to bring the whole precinct home with you."',
    stages: [
      { kind: 'goto', x: BEACH_LOT.x, z: BEACH_LOT.z, radius: 7, text: 'Find the sports car at the beach lot', say: ['Dana', 'Cherry red, keys in. Somebody is having a bad day.'] },
      { kind: 'enterCar', x: BEACH_LOT.x, z: BEACH_LOT.z, text: 'Steal the sports car', say: ['Dana', 'Borrowed. Forever.'] },
      { kind: 'deliverCar', x: GARAGE_FORECOURT.x, z: GARAGE_FORECOURT.z, radius: 8, text: 'Deliver the car to Rosa\u2019s garage', say: ['Rosa', 'Gorgeous. The Kings are going to cry about this one.'] },
    ],
  },
  {
    id: 'm3',
    title: 'Dockside Heat',
    reward: 2500,
    briefing: 'Rosa: "Kings collectors are leaning on my supplier at the docks. Go lean back — harder. Take the rifle, and come home whole."',
    stages: [
      { kind: 'goto', x: DOCKS_YARD.x, z: DOCKS_YARD.z, radius: 12, text: 'Reach the docks', say: ['Dana', 'The docks. Time to lean back.'] },
      { kind: 'eliminate', count: 4, text: 'Clear the Kings out of the docks', say: ['Dana', 'Four of them. Me and the rifle say hi.'] },
      { kind: 'goto', x: GARAGE_FORECOURT.x, z: GARAGE_FORECOURT.z, radius: 7, text: 'Report back to Rosa\u2019s garage', say: ['Dana', 'Docks are quiet now. Tell your supplier Rosa sends her regards.'] },
    ],
  },
  {
    id: 'm4',
    title: 'The Getaway',
    reward: 3000,
    briefing: 'Rosa: "The Kings tipped off PSPD — there is a warrant out with your name on it. Get to the beach house and lie low. Do NOT get cuffed."',
    stages: [
      { kind: 'reachHideout', x: BEACH_HOUSE.x, z: BEACH_HOUSE.z, radius: 8, text: 'Lose the cops — reach the beach house', say: ['Dana', 'Three stars and a beach house. Just a regular Tuesday.'] },
      { kind: 'goto', x: GARAGE_FORECOURT.x, z: GARAGE_FORECOURT.z, radius: 7, text: 'Sneak back to Rosa\u2019s garage', say: ['Rosa', 'Warrant is gone. I know a guy. Do not ask.'] },
    ],
  },
  {
    id: 'm5',
    title: 'Harbor Showdown',
    reward: 42000,
    briefing: 'Rosa: "Kane is at the docks himself tonight, collecting — and his stash is in the dock office: forty-two thousand in protection money. Finish this, Dana, and bring it home. The garage — and this city — are worth more than his whole crew."',
    stages: [
      { kind: 'goto', x: DOCKS_YARD.x, z: DOCKS_YARD.z, radius: 12, text: 'Reach the docks', say: ['Kane', 'Vega. You came to my docks. You do not leave my docks.'] },
      { kind: 'eliminate', count: 5, boss: true, text: 'Take down Kane and his crew', say: ['Dana', 'His crew first. Then Kane.'] },
      { kind: 'goto', x: GARAGE_FORECOURT.x, z: GARAGE_FORECOURT.z, radius: 7, text: 'Come home to Rosa\u2019s garage', say: ['Rosa', 'Fifty thousand. We just bought the whole street, Dana.'] },
    ],
  },
];

// Gang posts for the dock fights: the open apron east of the warehouses,
// so the shootout happens in the open with the piers and water behind it.
const GANG_POSTS = [
  { x: 198, z: -24 }, { x: 204, z: 8 }, { x: 194, z: 30 },
  { x: 208, z: -6 }, { x: 200, z: 44 }, { x: 210, z: 20 },
];

// Per-stage setup, run once when the stage begins.
const STAGE_SETUP = {
  eliminate(story, stage, context) {
    story.enemiesToKill = stage.count;
    story.kills = 0;
    for (let i = 0; i < stage.count; i += 1) {
      const post = GANG_POSTS[i % GANG_POSTS.length];
      const isBoss = stage.boss === true && i === stage.count - 1;
      context.weapons.spawnEnemy(
        post.x + story.rng.between(-4, 4), post.z + story.rng.between(-4, 4), isBoss,
      );
    }
  },
  enterCar(story, stage, context) {
    // Only a car actually AT the lot counts — a kerb car (or the prize
    // shoved 20 m off by a cruiser ram) is not the lot car. If the prize
    // is gone, the Kings left another one, so the job can never soft-lock.
    story.markedCar = context.traffic.nearestParked(stage.x, stage.z, 6);
    if (!story.markedCar) {
      story.markedCar = context.traffic.addParked(stage.x, stage.z, Math.PI / 2, 'sports', 0x8a2f2f);
    }
  },
  reachHideout(story, stage, context) {
    if (story.active.def.id === 'm4' && story.active.stageIndex === 0) {
      context.police.addStars(3, context.time);
    }
  },
};

// Per-stage completion tests, run every frame while the stage is live.
const STAGE_DONE = {
  goto(story, stage, context) {
    return Math.hypot(context.playerX - stage.x, context.playerZ - stage.z) < stage.radius;
  },
  reachHideout(story, stage, context) {
    if (Math.hypot(context.playerX - stage.x, context.playerZ - stage.z) < stage.radius) {
      context.police.clear();
      return true;
    }
    return false;
  },
  enterCar(story, stage, context) {
    return Boolean(context.playerCar && story.markedCar && context.playerCar === story.markedCar);
  },
  deliverCar(story, stage, context) {
    return Boolean(context.playerCar && story.markedCar && context.playerCar === story.markedCar
      && Math.hypot(context.playerX - stage.x, context.playerZ - stage.z) < stage.radius);
  },
  eliminate(story) {
    return story.kills >= story.enemiesToKill;
  },
};

export class Missions {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.completedCount = 0;
    this.storyComplete = false;
    this.active = null; // { def, stageIndex }
    this.markedCar = null; // the car m2 wants stolen
    this.enemiesToKill = 0;
    this.kills = 0;
    // Waypoint beacon: a soft light pillar + a spinning diamond over the
    // target. The pillar is a camera-facing sprite with the feathered
    // pillar texture — v4's open cylinder had razor-sharp vertical
    // silhouette edges, and at 6 m it read as a 240 px pale column over
    // the beach-lot frame (measured in the revision probe). A sprite has
    // no silhouette: its alpha fades to zero on all four edges.
    this.beacon = new THREE.Group();
    const beam = new THREE.Sprite(new THREE.SpriteMaterial({
      map: pillarGlow(), color: 0xffd23a, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    beam.scale.set(4.5, 60, 1);
    beam.position.y = 30;
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.1),
      new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xaa7a00, emissiveIntensity: 0.8 }),
    );
    diamond.position.y = 7;
    this.beacon.add(beam, diamond);
    this.beacon.visible = false;
    scene.add(this.beacon);
  }

  nextMission() {
    return this.completedCount < MISSIONS.length ? MISSIONS[this.completedCount] : null;
  }

  currentStage() {
    return this.active ? this.active.def.stages[this.active.stageIndex] : null;
  }

  stageProgress() {
    if (!this.active) return null;
    return { index: this.active.stageIndex + 1, total: this.active.def.stages.length };
  }

  objectiveText() {
    if (!this.active) {
      const next = this.nextMission();
      return next ? `Go to Rosa\u2019s garage — next job: ${next.title}` : 'Free roam — Puerto del Sol is yours';
    }
    const stage = this.currentStage();
    if (stage.kind === 'eliminate') {
      const left = Math.max(0, this.enemiesToKill - this.kills);
      return `${stage.text} (${left} left)`;
    }
    return stage.text;
  }

  waypoint() {
    const stage = this.currentStage();
    if (!stage) return null;
    if (stage.kind === 'eliminate') return { x: DOCKS_YARD.x, z: DOCKS_YARD.z };
    return { x: stage.x, z: stage.z };
  }

  startNext(context) {
    const def = this.nextMission();
    if (!def || this.active) return false;
    this.active = { def, stageIndex: 0 };
    this.kills = 0;
    this.enemiesToKill = 0;
    context.onBanner?.(def.title, def.briefing, 6);
    context.onDialogue?.('Rosa', def.briefing);
    this.setupStage(context);
    return true;
  }

  setupStage(context) {
    const stage = this.currentStage();
    if (!stage) return;
    this.placeBeacon();
    if (stage.say) context.onDialogue?.(stage.say[0], stage.say[1]);
    STAGE_SETUP[stage.kind]?.(this, stage, context);
  }

  placeBeacon() {
    const waypoint = this.waypoint();
    if (!waypoint) {
      this.beacon.visible = false;
      return;
    }
    this.beacon.position.set(waypoint.x, 0, waypoint.z);
    this.beacon.visible = true;
  }

  advanceStage(context) {
    this.active.stageIndex += 1;
    if (this.active.stageIndex >= this.active.def.stages.length) {
      this.completeMission(context);
      return;
    }
    this.setupStage(context);
  }

  completeMission(context) {
    const def = this.active.def;
    this.completedCount += 1;
    this.active = null;
    this.markedCar = null;
    this.beacon.visible = false;
    context.onCash?.(def.reward);
    if (this.completedCount >= MISSIONS.length) {
      this.storyComplete = true;
      context.onBanner?.('PUERTO DEL SOL IS YOURS', 'Kane is finished and the garage is saved — $50,000 raised, the whole street is Dana\u2019s. Free roam — drive, explore, cause trouble.', 7);
    } else {
      context.onBanner?.('MISSION COMPLETE', `${def.title} — $${def.reward.toLocaleString('en-US')} earned`, 4);
      context.onDialogue?.('Rosa', 'Job done. Come back to the garage when you are ready for the next one.');
    }
    context.onMissionComplete?.(def);
  }

  failActive(reason, context) {
    if (!this.active) return;
    const def = this.active.def;
    this.active = null;
    this.markedCar = null;
    this.beacon.visible = false;
    context.weapons.clearEnemies();
    context.onBanner?.('MISSION FAILED', `${def.title} — ${reason}. Return to the garage to try again.`, 4);
  }

  onEnemyKilled() {
    this.kills += 1;
  }

  update(dt, context) {
    this.beacon.children[1].rotation.y += dt * 2;
    if (!this.active) return;
    const stage = this.currentStage();
    if (STAGE_DONE[stage.kind]?.(this, stage, context)) this.advanceStage(context);
  }
}
