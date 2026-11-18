// The HUD: everything Dana reads while playing.
//
// One job: GTA's HUD law — icons, bars and bare numbers; text only
// transiently. The v4 HUD was seven permanent text panels (mission,
// status, clock, response table, drive, combat, radio) and Reza's verdict
// was exact: too much text, not enough GUI. The revision deletes all
// seven. What stays permanent: the radar, three bare bars under it
// (health / armour / REP), a bare cash number, stars when wanted, and a
// weapon icon + bare ammo. Everything else appears, says its piece, and
// fades: the objective (5 s on change), the district/vehicle name card
// (4 s on entry), the radio card (4 s on station change), subtitles
// (while someone speaks), help (4 s, the one box allowed). The clock,
// the goal, the REP rank and the postcard total live only in the pause
// menu. Target: ten words or fewer on screen in a typical frame.
//
// The setters are called every frame from refreshHud, so the transient
// ones carry change detection inside: a setter that re-shows its card
// every frame would never fade. The minimap lives in minimap.js; this
// file owns the DOM.

import { GOAL_CASH, REP_RANKS, ROAD_LINES, districtDisplayName } from './config.js';

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
  // District display name from the block, street from the nearest line.
  const bx = Math.floor((x + 192) / 48) - 4;
  const bz = Math.floor((z + 192) / 48) - 4;
  let district = 'Puerto del Sol';
  if (bx >= -4 && bx <= 3 && bz >= -4 && bz <= 3) {
    district = districtDisplayName(bx, bz);
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
  return { district, street };
}

// Subtitle speaker colours: the name rides inline, colour-coded.
const SPEAKER_COLOURS = { Dana: '#7ac4b8', Rosa: '#ff9a9a', Kane: '#ff9a4a' };

// Draw the rifle silhouette on the weapon icon canvas: receiver, barrel,
// stock, magazine and grip as one dark side profile. While reloading the
// icon greys out and the number dims — the reload state reads without
// a word.
function drawWeaponIcon(canvas, reloading) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 96, 40);
  ctx.fillStyle = reloading ? 'rgba(180,180,180,0.45)' : 'rgba(244,242,236,0.92)';
  // Receiver.
  ctx.fillRect(28, 14, 34, 8);
  // Barrel + muzzle.
  ctx.fillRect(62, 16, 26, 4);
  ctx.fillRect(86, 15, 6, 6);
  // Stock.
  ctx.fillRect(8, 15, 20, 7);
  ctx.fillRect(8, 15, 5, 12);
  // Grip + magazine.
  ctx.fillRect(38, 22, 7, 10);
  ctx.fillRect(52, 22, 8, 13);
  // Sight post + ring.
  ctx.fillRect(44, 8, 3, 6);
  ctx.beginPath();
  ctx.arc(45, 7, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,16,28,0.9)';
  ctx.beginPath();
  ctx.arc(45, 7, 2, 0, Math.PI * 2);
  ctx.fill();
}

// Radio logo marks, one per station: a sun for Golden Hour FM, a wave
// for Coastal Hits, a bolt for Night Drive.
function drawRadioMark(canvas, stationName) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 44, 44);
  ctx.strokeStyle = '#ffd23a';
  ctx.fillStyle = '#ffd23a';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  if (stationName.includes('BAYWAVE')) {
    for (const dy of [14, 22, 30]) {
      ctx.beginPath();
      ctx.moveTo(8, dy);
      ctx.quadraticCurveTo(15, dy - 5, 22, dy);
      ctx.quadraticCurveTo(29, dy + 5, 36, dy);
      ctx.stroke();
    }
  } else if (stationName.includes('STATIC')) {
    ctx.beginPath();
    ctx.moveTo(25, 6);
    ctx.lineTo(14, 24);
    ctx.lineTo(21, 24);
    ctx.lineTo(18, 38);
    ctx.lineTo(30, 20);
    ctx.lineTo(23, 20);
    ctx.closePath();
    ctx.fill();
  } else {
    // SUNSET 104.2: a sun disc with rays.
    ctx.beginPath();
    ctx.arc(22, 22, 8, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(22 + Math.cos(a) * 11, 22 + Math.sin(a) * 11);
      ctx.lineTo(22 + Math.cos(a) * 15, 22 + Math.sin(a) * 15);
      ctx.stroke();
    }
  }
}

export class Hud {
  constructor() {
    const get = (id) => document.getElementById(id);
    this.el = {
      minimap: get('minimap'),
      cash: get('cash'),
      stars: get('stars'),
      healthFill: get('health-fill'),
      healthBar: get('health-bar'),
      armourFill: get('armour-fill'),
      armourBar: get('armour-bar'),
      repFill: get('rep-fill'),
      objectiveLine: get('objective-line'),
      objectiveMark: get('objective-mark'),
      objective: get('objective'),
      helpBox: get('help-box'),
      weapon: get('weapon'),
      weaponIcon: get('weapon-icon'),
      ammo: get('ammo'),
      speedo: get('speedo'),
      speed: get('speed'),
      conditionFill: get('condition-fill'),
      nameCard: get('name-card'),
      nameCardMain: get('name-card-main'),
      nameCardSub: get('name-card-sub'),
      radioCard: get('radio-card'),
      radioMark: get('radio-mark'),
      radioName: get('radio-name'),
      radioTrack: get('radio-track'),
      subtitle: get('subtitle'),
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
      pauseClock: get('pause-clock'),
      pauseMission: get('pause-mission'),
      pauseStage: get('pause-stage'),
      pauseGoal: get('pause-goal'),
      pauseRep: get('pause-rep'),
      pausePostcards: get('pause-postcards'),
      hint: get('hint'),
      btnContinue: get('btn-continue'),
    };
    // Transient timers (game time — the screenshot freeze stops them).
    this.subtitleTimer = 0;
    this.bannerTimer = 0;
    this.toastTimer = 0;
    this.hitmarkerTimer = 0;
    this.damageTimer = 0;
    this.objectiveTimer = 0;
    this.nameCardTimer = 0;
    this.radioTimer = 0;
    this.helpTimer = 0;
    // Change-detection memory: the setters are called every frame.
    this.lastObjective = null;
    this.lastDistrict = null;
    this.lastVehicle = null;
    this.lastStation = null;
    this.lastWanted = 0;
    this.repRank = 1;
    this.repValue = 0;
    drawWeaponIcon(this.el.weaponIcon, false);
  }

  // Cash: a bare green number, top-right. The goal bar and its label
  // moved to the pause menu.
  setCash(cash, goal = GOAL_CASH) {
    this.el.cash.textContent = `$${Math.floor(cash).toLocaleString('en-US')}`;
    const pct = Math.min(100, Math.floor((cash / goal) * 100));
    this.el.pauseGoal.textContent = `SAVE THE GARAGE — $${goal.toLocaleString('en-US')} GOAL · ${pct}%`;
  }

  // Postcards: pause menu only. The pickup moment shows ✉ n/10 in the
  // score popup instead (see game.js onPickup).
  setPostcards(found, total) {
    this.el.pausePostcards.textContent = `✉ POSTCARDS ${found} / ${total}`;
  }

  // Health: a bare green bar. Below 25% it flashes red (CSS animation
  // on the bar, not a number — the number is gone).
  setHealth(health) {
    const pct = Math.max(0, Math.min(100, health));
    this.el.healthFill.style.width = `${pct}%`;
    this.el.healthBar.classList.toggle('low', pct < 25);
  }

  // Armour: a bare blue bar, hidden at 0.
  setArmour(armour) {
    const pct = Math.max(0, Math.min(100, armour));
    this.el.armourFill.style.width = `${pct}%`;
    this.el.armourBar.classList.toggle('hidden', pct <= 0);
  }

  // REP: a bare gold bar. A rank-up earns one transient gold popup; the
  // rank name itself lives in the pause menu.
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
    this.el.repFill.style.width = `${Math.min(100, (into / span) * 100)}%`;
    this.el.pauseRep.textContent = next
      ? `REP ${rank.level} · ${rank.name} — ${into}/${span}`
      : `REP ${rank.level} · ${rank.name} — MAX`;
    if (rank.level > this.repRank) {
      this.showScorePopup(`REP ${rank.level} · ${rank.name}`, 'rep');
    }
    this.repRank = rank.level;
    this.repValue = rep;
  }

  // Wanted: five stars, visible ONLY when wanted, pulsing on a rise.
  setWanted(stars) {
    const spans = this.el.stars.querySelectorAll('.star');
    spans.forEach((span, i) => {
      span.classList.toggle('lit', i < stars);
    });
    this.el.stars.classList.toggle('show', stars > 0);
    if (stars > this.lastWanted) {
      this.el.stars.classList.remove('pulse');
      // Reflow, so the pulse animation restarts on every rise.
      void this.el.stars.offsetWidth;
      this.el.stars.classList.add('pulse');
    }
    this.lastWanted = stars;
  }

  // The clock lives in the pause menu only — the HUD has no clock pill.
  setClock(day, minutes) {
    // The clock accumulates fractional minutes (1 game minute per 6 real
    // seconds), so the minutes MUST be floored — without it the HUD shows
    // "18:23.9999999999986358". (Caught in the first v4 screenshots.)
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    this.el.pauseClock.textContent = `DAY ${day} · ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  // Location: a script-font name card, shown 4 s when the district
  // changes. The card names the district and the street beneath it.
  setLocation(x, z) {
    this.lastX = x;
    this.lastZ = z;
    const { district, street } = locationName(x, z);
    if (district === this.lastDistrict) return;
    this.lastDistrict = district;
    this.el.nameCardMain.textContent = district;
    this.el.nameCardSub.textContent = street;
    this.el.nameCard.classList.add('show');
    this.nameCardTimer = 4;
  }

  // Force-show the district card (screenshot staging: the city frame
  // wants the card visible at the freeze).
  showLocationNow() {
    this.lastDistrict = null;
    this.setLocation(this.lastX || 0, this.lastZ || 0);
  }

  // Speed: a bare numeral + tiny km/h, only while driving. A new vehicle
  // earns its own script-font name card (4 s); the thin bar under the
  // numeral is the car's condition.
  setSpeed(kmh, inCar, vehicleName, condition) {
    this.el.speedo.classList.toggle('show', Boolean(inCar));
    if (!inCar) return;
    this.el.speed.textContent = String(Math.round(kmh));
    this.el.conditionFill.style.width = `${Math.max(0, Math.min(100, condition * 100))}%`;
    this.el.conditionFill.className = condition < 0.3 ? 'low' : '';
    if (vehicleName && vehicleName !== this.lastVehicle) {
      this.lastVehicle = vehicleName;
      this.el.nameCardMain.textContent = vehicleName;
      this.el.nameCardSub.textContent = '';
      this.el.nameCard.classList.add('show');
      this.nameCardTimer = 4;
    }
  }

  // Ammo: the bare mag number next to the rifle icon. The game has no
  // reserve ammo — the number is the mag alone, and inventing a reserve
  // count would lie about the inventory. While reloading the icon greys
  // and the number dims.
  setAmmo(ammo, reloading) {
    this.el.ammo.textContent = String(ammo);
    this.el.ammo.classList.toggle('reloading', Boolean(reloading));
    if (reloading !== this.lastReloading) {
      this.lastReloading = reloading;
      drawWeaponIcon(this.el.weaponIcon, reloading);
    }
  }

  // Objective: a coloured square + one line, top-left, shown 5 s when
  // the objective changes. Colour-coded words: gold for money, red for
  // the Kings, blue for the police.
  setObjective(text) {
    if (text === this.lastObjective) return;
    this.lastObjective = text;
    this.el.objective.innerHTML = this.colourObjective(text);
    this.el.objectiveLine.classList.add('show');
    this.objectiveTimer = 5;
  }

  // Force-show the current objective (screenshot staging: the chase frame
  // stages for 6 s, longer than the 5 s transient, so the line must be
  // re-shown right before the freeze).
  showObjectiveNow() {
    if (!this.lastObjective) return;
    this.el.objective.innerHTML = this.colourObjective(this.lastObjective);
    this.el.objectiveLine.classList.add('show');
    this.objectiveTimer = 5;
  }

  // Hide the objective line (screenshot staging: the city, mission and
  // combat frames each carry a different single transient, so the
  // objective — which often survives staging on its 5 s timer — is
  // cleared for the photograph).
  hideObjective() {
    this.el.objectiveLine.classList.remove('show');
    this.objectiveTimer = 0;
  }

  // Targeted transient hides for the same staging rule: each frame keeps
  // exactly one transient, so the others are cleared individually (the
  // blanket hideTransientFx would also kill the combat frame's hitmarker).
  hideSubtitle() {
    this.el.subtitle.classList.remove('show');
    this.subtitleTimer = 0;
  }

  hideRadioCard() {
    this.el.radioCard.classList.remove('show');
    this.radioTimer = 0;
  }

  hideNameCard() {
    this.el.nameCard.classList.remove('show');
    this.nameCardTimer = 0;
  }

  hideHelp() {
    this.el.helpBox.classList.remove('show');
    this.helpTimer = 0;
  }

  colourObjective(text) {
    // Escape first, then colour the money and the two factions.
    const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return safe
      .replace(/(\$[\d,]+)/g, '<b class="gold">$1</b>')
      .replace(/Kings/g, '<b class="red">Kings</b>')
      .replace(/PSPD/g, '<b class="blue">PSPD</b>');
  }

  // Mission name + stage pips: pause menu only.
  setMissionName(name) {
    this.el.pauseMission.textContent = name;
  }

  setStagePips(progress) {
    if (!progress) {
      this.el.pauseStage.innerHTML = '';
      return;
    }
    let html = `STAGE ${progress.index}/${progress.total} `;
    for (let i = 0; i < progress.total; i += 1) {
      html += `<span class="pip${i < progress.index ? ' done' : ''}">●</span>`;
    }
    this.el.pauseStage.innerHTML = html;
  }

  // Radio: a logo mark + station + track card, shown 4 s when the
  // station changes (or the track changes — a new song earns the card
  // too, since the track name is the card's second line).
  setRadio(station) {
    const key = `${station.name}|${station.track}`;
    if (key === this.lastStation) return;
    this.lastStation = key;
    drawRadioMark(this.el.radioMark, station.name);
    this.el.radioName.textContent = station.name;
    this.el.radioTrack.textContent = station.track;
    this.el.radioCard.classList.add('show');
    this.radioTimer = 4;
  }

  // Help: the ONE transient box allowed, top-left under the objective.
  // One-shot hints (first car, first aim) — never a permanent tutorial.
  showHelp(text) {
    this.el.helpBox.textContent = text;
    this.el.helpBox.classList.add('show');
    this.helpTimer = 4;
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

  // Dialogue is a bare subtitle now: the speaker's name inline,
  // colour-coded, no panel, no portrait. The line stays 6 s.
  showDialogue(speaker, text) {
    const colour = SPEAKER_COLOURS[speaker] || '#f4f2ec';
    const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    this.el.subtitle.innerHTML = `<span style="color:${colour}">${speaker}:</span> ${safe}`;
    this.el.subtitle.classList.add('show');
    this.subtitleTimer = 6;
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
    this.el.subtitle.classList.remove('show');
    this.el.objectiveLine.classList.remove('show');
    this.el.nameCard.classList.remove('show');
    this.el.radioCard.classList.remove('show');
    this.el.helpBox.classList.remove('show');
    this.el.scorePopups.innerHTML = '';
    this.damageTimer = 0;
    this.hitmarkerTimer = 0;
    this.subtitleTimer = 0;
    this.objectiveTimer = 0;
    this.nameCardTimer = 0;
    this.radioTimer = 0;
    this.helpTimer = 0;
  }

  // Like hideTransientFx, but KEEPS the subtitle: the screenshot staging
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
    // The radar takes the hit too: a red box-shadow pulse on the rim,
    // GTA V's hurt feedback on the minimap itself.
    this.el.minimap.classList.add('hurt');
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
    if (this.subtitleTimer > 0) {
      this.subtitleTimer -= dt;
      if (this.subtitleTimer <= 0) this.el.subtitle.classList.remove('show');
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
      if (this.damageTimer <= 0) {
        this.el.damageFlash.classList.remove('show');
        this.el.minimap.classList.remove('hurt');
      }
    }
    if (this.objectiveTimer > 0) {
      this.objectiveTimer -= dt;
      if (this.objectiveTimer <= 0) this.el.objectiveLine.classList.remove('show');
    }
    if (this.nameCardTimer > 0) {
      this.nameCardTimer -= dt;
      if (this.nameCardTimer <= 0) this.el.nameCard.classList.remove('show');
    }
    if (this.radioTimer > 0) {
      this.radioTimer -= dt;
      if (this.radioTimer <= 0) this.el.radioCard.classList.remove('show');
    }
    if (this.helpTimer > 0) {
      this.helpTimer -= dt;
      if (this.helpTimer <= 0) this.el.helpBox.classList.remove('show');
    }
  }
}
