# Visual scorecard — PUERTO DEL SOL (v4 revision)

Scored against the FINAL revised screenshots (2026-11-18 ~21:10 WITA)
using the threejs-game 10-category scorecard
(`threejs-aaa-graphics-builder/references/visual-scorecard.md`). Anchors
viewed first: scene-1.jpg (score 1 — flat arena, capsule, utility HUD),
scene-3.jpg (2.5–3 — dense layered world, readable hero, event VFX,
cohesive HUD). Scale: 0 placeholder · 1 basic styled · 2 premium
stylized · 3 showcase. Half-points where a category sits between the
anchor bands. v4's baseline was 2.35 (zero automatic failures); every
change below names the revision fix that earned it.

| # | Category | v4 | rev | Evidence (final screenshots) |
|---|----------|----|-----|------------------------------|
| 1 | Art direction | 2.5 | **2.5** | The sunset grade still drives every surface, and the revision adds four hard district identities (Downtown glass, Beachfront pastel Deco, Docks industrial, Hills estates), the PSPD / DEL SOL LINE rebrand, and 10 original fake brands with geometric marks. Stronger identity, still "GTA sunset diorama" — not distinct in every surface, so not a 3. |
| 2 | Hero/player | 2 | **2** | Dana unchanged (rounded humanoid, mint shirt, ponytail, rifle, aim/drive poses). The hero car gained door seams, chrome side trim, twin exhausts and a license plate, and the chase cam is lower/closer with a speed FOV kick plus crash/ram screen shake. Still no facial feedback or gear changes on Dana, so the category stays at 2. |
| 3 | Obstacles/enemies | 2.5 | **2.5** | PSPD livery re-drawn (same quality, new initials); the heli searchlight beam was inverted and is now fixed — it points at the player with a feathered cone and a ground pool. Cruisers, heli, Kings and officers stay role-distinct. A correctness fix, not a new capability. |
| 4 | Rewards/interactables | 2 | **2** | The mission beacon is now a soft glow sprite + diamond (the hard cylinder is gone), the postcard glow uses the radial glow texture instead of the postcard face, and the vest glow is feathered. Same variety, better reads; purpose stays clear. |
| 5 | World/environment | 2.5 | **2.5** | Hills estates district (6th archetype, garden walls + gate pillars), the DEL SOL LINE freighter offshore, the eastern sand band, 4 beachfront pastel families, Art Deco villas with parapets and sun medallions, and denser streets (20 traffic, 40 peds, 16 parked + prize car). Denser and more varied, but per-block variety is still procedural tiling rather than authored set-dressing, so not a 3. |
| 6 | Materials/textures | 2 | **2.5** | The revision's biggest material step: panel lines and trim on cars (door seams, chrome strip, exhausts, plate), 10 fake brands with geometric marks, re-drawn PSPD livery and DEL SOL LINE containers, district palette families, filled palm fronds, and feathered smoke/beam/pillar textures. v4's note was "no panel-line/trim detail on cars beyond decals" — that gap is closed. Not a 3: wear and variation are still light. |
| 7 | Lighting/render | 2.5 | **2.5** | A warm rim light (0xff9a8a, 0.55) now comes from the sunset direction, joining the sun disc + glow, ACES tone mapping, PMREM sunset environment, directional sun with shadows, and fog depth. Still no post pipeline, and the pavilion blowout in the mission frame shows the exposure is not yet fully disciplined — not a 3. |
| 8 | VFX/motion | 2.5 | **2.5** | Added drift dust particles, crash/ram screen shake, and a speed FOV kick, on top of the tracer, hitmarker, KING DOWN popup, muzzle flash, strobes, searchlight and lighthouse beam. Event-driven and cheap, but the individual effects are sprite-based and modest — no particle burst system or slow-mo kill cam, so not a 3. |
| 9 | UI/HUD | 3 | **3** | The HUD was rebuilt icon-first per the GTA law: the 7 permanent text panels are deleted; health/armour/REP are 3 bare bars under the radar, cash is a bare green number, wanted is stars only when wanted, the weapon is a canvas silhouette + bare ammo, and text appears only transiently (objective, subtitle, name cards, radio card). Word counts: chase 10, city 6, mission 5, combat 4 (target ≤10). Cohesive, strong hierarchy, polished transitions (fades, wanted pulse, rank-up popup). The pause menu carries the relocated stats (mission/stage/goal/rep/postcards). |
| 10 | Performance evidence | 2 | **2** | Renderer diagnostics re-run after the graphics work (below), play-test 42/42, target-viewport shots 1280×720, and a before/after baseline now exists (v4 289 calls / 42,674 tris vs rev 443 / 52,954, with the increase explained by real geometry). No bottleneck analysis, so not a 3. |

**Average: 2.40** (24.0 / 10). Premium bar: every category ≥ 2 ✓,
average ≥ 2.3 ✓. v4 baseline: 2.35.

## Automatic failures — all clear

- No frame is dominated by placeholders or unjustified empty space
  (streets carry traffic, peds, kerb-lined cars, palms, lamps).
- The hero is not an unrefined primitive + glow (Dana: rounded humanoid
  with clothing, hair, rifle; the hero car: multi-part model with trim).
- The HUD is not rectangular stat/debug cards — the 7 text panels were
  deleted; the HUD is bars, icons, stars and bare numbers.
- Fog is depth cueing, not a stand-in for geometry (no bloom at all;
  the draw-call count went UP on real geometry).
- No UI overlaps the play path, clips text, or breaks safe areas at
  1280×720 in any of the four frames.
- The game is playable through real input (play-test 42/42, including
  real key presses and clicks) and all four shots are active play.
- Renderer diagnostics reported after the graphics work (below).

## Pixel metrics (advisory signals, per the scorecard doc)

Measured on the four final frames (160×90 downsample, PIL):

| Frame | colorEntropyBits | dominantColorShare | edgeDensity | luminance std |
|-------|------------------|--------------------|-------------|---------------|
| 1-chase | 4.01 | 0.20 | 0.113 | 33.7 |
| 2-city | 4.75 | 0.19 | 0.119 | 46.6 |
| 3-mission | 4.95 | 0.14 | 0.132 | 53.6 |
| 4-combat | 4.19 | 0.23 | 0.105 | 47.2 |

All four frames clear the sparse-scene thresholds (entropy > 3.0,
dominant share < 0.6, edge density > 0.04). The luminance column is a
standard deviation, not the doc's contrast metric, so it is reported
without a threshold claim.

## Renderer diagnostics (final code, chase scene)

`node shoot.cjs diag` (2026-11-18): 443 draw calls, 52,954 triangles,
2,114 geometries, 19 textures, 17 programs.
v4 baseline: 289 draw calls, 42,674 triangles, 1,819 geometries,
18 textures, 17 programs. The increase is real geometry: +6 traffic
cars, +10 peds (chat pairs, phone starers, dock workers, beachgoers),
+6 parked cars, the cargo ship, the estates district, and per-car
trim (door seams, chrome strip, exhausts, plate).
0 console/page errors, 0 external requests across all four shots.
Screenshot sizes: 1-chase 87,447 B, 2-city 73,669 B, 3-mission 79,115 B,
4-combat 67,087 B (all ≤ 256 KiB, 1280×720).

## What is still short of the top 3 (honest)

The remaining gap is the same one v4 named, narrowed: surface richness
at the small scale. The revision added car trim, brands, districts and
denser streets, but Dana's model is still unexpressive, the per-block
variety is still procedural tiling, and the sun-facing facades still
wash out in direct glare (the pavilion in the mission frame). The HUD
gap is closed — the revision's HUD is now genre-correct where v4's was
text-heavy — and the rectangle artifact is gone.
