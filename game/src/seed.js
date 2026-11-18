// Seeded chance: one seed always builds the same Puerto del Sol.
//
// A mulberry32 stream with forks, so every subsystem draws from its own
// stream and a change in one never reshuffles the others. The streams are
// for PLACEMENT only (which palm leans where, which car parks on which
// kerb) — never for LOOK decisions. A facade's palette and a window's lit
// state come from the district rules in config.js, so the city reads as
// designed, not rolled.

export function makeSeededRandom(seed) {
  let state = seed >>> 0;
  const draw = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    draw,
    between(lo, hi) { return lo + draw() * (hi - lo); },
    whole(lo, hi) { return lo + Math.floor(draw() * (hi - lo + 1)); },
    pick(items) { return items[Math.floor(draw() * items.length)]; },
    chance(p) { return draw() < p; },
    // A child stream, decorrelated from its parent by a large odd stride.
    fork(salt) { return makeSeededRandom(((seed >>> 0) + salt * 2654435761) >>> 0); },
  };
}

export function seedFromQuery(fallback) {
  const raw = new URLSearchParams(window.location.search).get('seed');
  const parsed = raw === null ? NaN : parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
