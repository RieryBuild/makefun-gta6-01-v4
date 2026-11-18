// The HUD: everything Dana reads while playing.
//
// One job: keep the dense GTA-faithful interface honest — mission panel
// with stage pips, the status panel (cash, goal, postcards, REP, stars,
// health, armour), the clock + location pill, the SBPD response list, the
// speed + vehicle panel, the weapon panel, the radio, the dialogue box
// with its cartoon portrait, and the score popups that pay the player in
// feedback. The minimap lives in minimap.js; this file owns the DOM.

import { GOAL_CASH, REP_RANKS, ROAD_LINES, districtAt } from './config.js';

// Street names, one per line: the location pill names the nearest street.
const NORTH_SOUTH = {
  '-144': 'Harbor Way', '-96': 'Coral Ave', '-48': 'Palm Blvd', 0: 'Marlin St',
  48: 'Sunset Ave', 96: 'Bayview Dr', 144: 'Dockside Rd',
};
const EAST_WEST = {
  '-144': 'Northgate Ave', '-96': 'Jacaranda St', '-48': 'Lighthouse Rd', 0: 'Main St',
  48: 'Seabreeze Ave', 96: 'Pelican Way', 144: 'Beachfront Dr',
};

export function locationName(x, z) {
  // District from the block, street from the nearest line.
  const bx = Math.floor((x + 192) / 48) - 4;
  const bz = Math.floor((z + 192) / 48) - 4;
  let district = 'Solmar Bay';
  if (bx >= -4 && bx <= 3 && bz >= -4 && bz <= 3) {
    district = districtAt(bx, bz);
  }
  let nearestLine = ROAD_LINES[0];
  let nearestDist = Infinity;
  let vertical = true;
  for (const line of ROAD_LINES) {
    if (Math.abs(x - line) < nearestDist) {
      nearestDist = Math.abs(x - line);
      nearestLine = line;
      vertical = true;
    }
    if (Math.abs(z - line) < nearestDist) {
      nearestDist = Math.abs(z - line);
      nearestLine = line;
      vertical = false;
    }
  }
  const street = vertical ? NORTH_SOUTH[String(nearestLine)] : EAST_WEST[String(nearestLine)];
  return { district: district.toUpperCase(), street };
}

// Cartoon portraits, drawn on the dialogue canvas per speaker.
const PORTRAITS = {
  Dana: { skin: '#d9a077', hair: '#5a3a22', shirt: '#7ac4b8', style: 'ponytail' },
  Rosa: { skin: '#c98a5e', hair: '#2a2a2e', shirt: '#c25a6a', style: 'bun' },
  Kane: { skin: '#c98a5e', hair: '#141210', shirt: '#1e1e22', style: 'shades' },
};

function drawPortrait(canvas, speaker) {
  const ctx = canvas.getContext('2d');
  const look = PORTRAITS[speaker] || PORTRAITS.Dana;
  ctx.clearRect(0, 0, 72, 72);
  // Backdrop.
  ctx.fillStyle = '#2a2438';
  ctx.fillRect(0, 0, 72, 72);
  // Shoulders + shirt.
  ctx.fillStyle = look.shirt;
  ctx.beginPath();
  ctx.ellipse(36, 72, 30, 22, 0, Math.PI, 0);
  ctx.fill();
  // Head.
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(36, 32, 20, 0, Math.PI * 2);
  ctx.fill();
  // Hair.
  ctx.fillStyle = look.hair;
  ctx.beginPath();
  ctx.arc(36, 28, 20, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(16, 24, 40, 8);
  if (look.style === 'ponytail') {
    ctx.beginPath();
    ctx.ellipse(54, 40, 6, 12, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (look.style === 'bun') {
    ctx.beginPath();
    ctx.arc(36, 8, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Eyes + mouth (or shades for Kane).
  if (look.style === 'shades') {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(20, 28, 32, 8);
  } else {
    ctx.fillStyle = '#1a1410';
    ctx.beginPath();
    ctx.arc(29, 32, 2.4, 0, Math.PI * 2);
    ctx.arc(43, 32, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#6a3a2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(36, 42, 6, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

export class Hud {
  constructor() {
    const get = (id) => document.getElementById(id);
    this.el = {
      missionName: get('mission-name'),
      objective: get('objective'),
      stagePips: get('stage-pips'),
      nextLine: get('next-line'),
      cash: get('cash'),
      goalFill: get('goal-fill'),
      goal: get('goal'),
      postcards: get('postcards'),
      repLine: get('rep-line'),
      repFill: get('rep-fill'),
      stars: get('stars'),
      healthFill: get('health-fill'),
      armourFill: get('armour-fill'),
      healthText: get('health-text'),
      clock: get('clock'),
      location: get('location'),
      responseList: get('response-list'),
      responsePanel: get('response-panel'),
      speed: get('speed'),
      speedUnit: get('speed-unit'),
      vehicleName: get('vehicle-name'),
      conditionFill: get('condition-fill'),
      drivePanel: get('drive-panel'),
      ammo: get('ammo'),
      radioName: get('radio-name'),
      radioTrack: get('radio-track'),
      dialogue: get('dialogue'),
      dialoguePortrait: get('dialogue-portrait'),
      dialogueSpeaker: get('dialogue-speaker'),
      dialogueText: get('dialogue-text'),
      prompt: get('prompt'),
      banner: get('banner'),
      bannerTitle: get('banner-title'),
      bannerText: get('banner-text'),
      toast: get('toast'),
      crosshair: get('crosshair'),
      hitmarker: get('hitmarker'),
      damageFlash: get('damage-flash'),
      arrestWrap: get('arrest-wrap'),
      arrestFill: get('arrest-fill'),
      scorePopups: get('score-popups'),
      wasted: get('wasted'),
      busted: get('busted'),
      startScreen: get('start-screen'),
      pauseMenu: get('pause-menu'),
      hint: get('hint'),
      btnContinue: get('btn-continue'),
    };
    this.dialogueTimer = 0;
    this.bannerTimer = 0;
    this.toastTimer = 0;
    this.hitmarkerTimer = 0;
    this.damageTimer = 0;
  }

  setCash(cash, goal = GOAL_CASH) {
    this.el.cash.textContent = `$${Math.floor(cash).toLocaleString('en-US')}`;
    const pct = Math.min(100, Math.floor((cash / goal) * 100));
    this.el.goalFill.style.width = `${pct}%`;
    this.el.goal.textContent = `SAVE THE GARAGE — $${goal.toLocaleString('en-US')} GOAL · ${pct}%`;
  }

  setPostcards(found, total) {
    this.el.postcards.textContent = `✉ POSTCARDS ${found} / ${total}`;
  }

  setHealth(health) {
    const pct = Math.max(0, Math.min(100, health));
    this.el.healthFill.style.width = `${pct}%`;
    this.el.healthText.textContent = String(Math.round(health));
    this.el.healthFill.className = pct < 30 ? 'low' : '';
  }

  setArmour(armour) {
    this.el.armourFill.style.width = `${Math.max(0, Math.min(100, armour))}%`;
  }

  setRep(rep) {
    let rank = REP_RANKS[0];
    let next = REP_RANKS[1];
    for (let i = 0; i < REP_RANKS.length; i += 1) {
      if (rep >= REP_RANKS[i].at) {
        rank = REP_RANKS[i];
        next = REP_RANKS[i + 1] || null;
      }
    }
    const into = rep - rank.at;
    const span = next ? next.at - rank.at : 1;
    this.el.repLine.textContent = next
      ? `REP ${rank.level} · ${rank.name} — ${into}/${span}`
      : `REP ${rank.level} · ${rank.name} — MAX`;
    this.el.repFill.style.width = `${Math.min(100, (into / span) * 100)}%`;
  }

  setWanted(stars) {
    const spans = this.el.stars.querySelectorAll('.star');
    spans.forEach((span, i) => {
      span.classList.toggle('lit', i < stars);
    });
    this.el.responsePanel.classList.toggle('show', stars > 0);
  }

  setClock(day, minutes) {
    // The clock accumulates fractional minutes (1 game minute per 6 real
    // seconds), so the minutes MUST be floored — without it the HUD shows
    // "18:23.9999999999986358". (Caught in the first v4 screenshots.)
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    this.el.clock.textContent = `DAY ${day} · ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  setLocation(x, z) {
    const { district, street } = locationName(x, z);
    this.el.location.innerHTML = `<b>${district}</b><span>${street}</span>`;
  }

  setSpeed(kmh, inCar, vehicleName, condition) {
    this.el.drivePanel.classList.toggle('show', Boolean(inCar));
    if (!inCar) return;
    this.el.speed.textContent = String(Math.round(kmh));
    this.el.speedUnit.textContent = 'km/h';
    this.el.vehicleName.textContent = vehicleName || '';
    this.el.conditionFill.style.width = `${Math.max(0, Math.min(100, condition * 100))}%`;
    this.el.conditionFill.className = condition < 0.3 ? 'low' : '';
  }

  setAmmo(ammo, reloading) {
    this.el.ammo.textContent = reloading ? 'RIFLE — RELOADING' : `RIFLE ${ammo} / 12`;
  }

  setObjective(text) {
    this.el.objective.textContent = text;
  }

  setMissionName(name) {
    this.el.missionName.textContent = name;
  }

  setStagePips(progress) {
    if (!progress) {
      this.el.stagePips.innerHTML = '';
      return;
    }
    let html = `STAGE ${progress.index}/${progress.total} `;
    for (let i = 0; i < progress.total; i += 1) {
      html += `<span class="pip${i < progress.index ? ' done' : ''}">●</span>`;
    }
    this.el.stagePips.innerHTML = html;
  }

  setNextLine(text) {
    this.el.nextLine.textContent = text || '';
  }

  setResponse(list, wanted) {
    if (!wanted || list.length === 0) {
      this.el.responseList.innerHTML = '';
      return;
    }
    this.el.responseList.innerHTML = list.map((unit) => (
      `<div class="response-row"><span>${unit.name}</span><span>${unit.distance} m</span><span class="state">${unit.state}</span></div>`
    )).join('');
  }

  setRadio(station) {
    this.el.radioName.textContent = `♪ ${station.name}`;
    this.el.radioTrack.textContent = station.track;
  }

  // A score popup. By default it rises and fades on a 2.2 s wall-clock
  // timer. `persist` keeps it: no removal timer and no rise animation,
  // so it renders at full opacity on the first frame — the screenshot
  // staging uses it for the combat frame, where the frozen render runs
  // at ~4 fps and the transient popup would expire (or never fade in)
  // before the shutter.
  showScorePopup(text, kind = 'cash', persist = false) {
    const popup = document.createElement('div');
    popup.className = `score-popup ${kind}`;
    popup.textContent = text;
    if (persist) popup.style.animation = 'none';
    this.el.scorePopups.appendChild(popup);
    if (!persist) window.setTimeout(() => popup.remove(), 2200);
  }

  showDialogue(speaker, text) {
    drawPortrait(this.el.dialoguePortrait, speaker);
    this.el.dialogueSpeaker.textContent = speaker;
    this.el.dialogueText.textContent = text;
    this.el.dialogue.classList.add('show');
    this.dialogueTimer = 6;
  }

  showBanner(title, text, seconds = 4) {
    this.el.bannerTitle.textContent = title;
    this.el.bannerText.textContent = text;
    this.el.banner.classList.add('show');
    this.bannerTimer = seconds;
  }

  hideBanner() {
    this.el.banner.classList.remove('show');
    this.bannerTimer = 0;
  }

  hideTransientFx() {
    this.el.damageFlash.classList.remove('show');
    this.el.hitmarker.classList.remove('show');
    this.el.arrestWrap.classList.remove('show');
    this.el.dialogue.classList.remove('show');
    this.el.scorePopups.innerHTML = '';
    this.damageTimer = 0;
    this.hitmarkerTimer = 0;
    this.dialogueTimer = 0;
  }

  // Like hideTransientFx, but KEEPS the dialogue: the screenshot staging
  // wants the dialogue line in the frame (it is part of the scene) while
  // the combat flashes would read as bugs frozen mid-frame.
  // Freeze the frame clean: the damage flash (a red vignette) and the
  // arrest bar read as bugs when frozen mid-animation, so they go. The
  // hitmarker and the score popups STAY — they are the frame's payoff
  // (a hit confirmed, a KING DOWN scored), and the first version of this
  // function cleared them, which cost the combat shot its popup.
  hideCombatFx() {
    this.el.damageFlash.classList.remove('show');
    this.el.arrestWrap.classList.remove('show');
    this.damageTimer = 0;
  }

  showToast(text, seconds = 3) {
    this.el.toast.textContent = text;
    this.el.toast.classList.add('show');
    this.toastTimer = seconds;
  }

  showPrompt(text) {
    this.el.prompt.textContent = text;
    this.el.prompt.classList.add('show');
  }

  hidePrompt() {
    this.el.prompt.classList.remove('show');
  }

  setCrosshairVisible(visible) {
    this.el.crosshair.classList.toggle('show', visible);
  }

  flashHitmarker() {
    this.el.hitmarker.classList.add('show');
    this.hitmarkerTimer = 0.25;
  }

  damageFlash() {
    this.el.damageFlash.classList.add('show');
    this.damageTimer = 0.4;
  }

  setArrestProgress(p) {
    if (p > 0) {
      this.el.arrestWrap.classList.add('show');
      this.el.arrestFill.style.width = `${Math.min(100, p * 100)}%`;
    } else {
      this.el.arrestWrap.classList.remove('show');
    }
  }

  showWasted() { this.el.wasted.classList.add('show'); }
  showBusted() { this.el.busted.classList.add('show'); }
  hideEndScreens() {
    this.el.wasted.classList.remove('show');
    this.el.busted.classList.remove('show');
  }

  showStart(canContinue) {
    this.el.startScreen.classList.add('show');
    this.el.btnContinue.classList.toggle('hidden', !canContinue);
    // The HUD hides while the menu is up: the panels showing through the
    // start screen read as a bug, and the panorama deserves a clean frame.
    document.body.classList.add('menu-open');
  }

  hideStart() {
    this.el.startScreen.classList.remove('show');
    document.body.classList.remove('menu-open');
  }

  showPause(show) {
    this.el.pauseMenu.classList.toggle('show', show);
  }

  setHintVisible(visible) {
    this.el.hint.classList.toggle('show', visible);
  }

  update(dt) {
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) this.el.dialogue.classList.remove('show');
    }
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.el.banner.classList.remove('show');
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el.toast.classList.remove('show');
    }
    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= dt;
      if (this.hitmarkerTimer <= 0) this.el.hitmarker.classList.remove('show');
    }
    if (this.damageTimer > 0) {
      this.damageTimer -= dt;
      if (this.damageTimer <= 0) this.el.damageFlash.classList.remove('show');
    }
  }
}
