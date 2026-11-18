# Visual scorecard — SOLMAR BAY v4

Scored against the FINAL screenshots (round 6, 2026-11-18 ~20:30 WITA)
using the threejs-game 10-category scorecard
(`threejs-aaa-graphics-builder/references/visual-scorecard.md`). Anchors
viewed first: scene-1.jpg (score 1 — flat arena, capsule, utility HUD),
scene-3.jpg (2.5–3 — dense layered world, readable hero, event VFX,
cohesive HUD). Scale: 0 placeholder · 1 basic styled · 2 premium
stylized · 3 showcase. Half-points where a category sits between the
anchor bands. v3's baseline was 2.1 (zero automatic failures); every
+0.5 below names the v4 fix that earned it.

| # | Category | v3 | v4 | Evidence (final screenshots) |
|---|----------|----|----|------------------------------|
| 1 | Art direction | 2 | **2.5** | One committed orange-pink sunset grade drives forms, materials, UI, and feedback in all four frames; the beach-lot mission frame adds a second setting to the palette instead of repeating the docks. Not a 3: the identity is "GTA sunset diorama" — strong, not distinct in every surface. |
| 2 | Hero/player | 2 | **2** | Dana is an authored rounded-capsule humanoid (mint shirt, near-black trousers, ponytail, rifle) with aim/drive poses; the hero Marlin GT is a multi-part model with decals. Not expressive — no facial feedback, no gear changes. |
| 3 | Obstacles/enemies | 2 | **2.5** | Cruisers read as police at distance (SBPD door decals, flashing light bars); the heli carries a searchlight cone and pool; Kings (red shirts, pistols) and officers (navy, caps) are role-distinct. v3's cruisers read as brown boxes — the livery fix earned the half-point. |
| 4 | Rewards/interactables | 2 | **2** | Postcards (spinning, +$200), armour vests, mission beacons (light pillar + diamond), the marked prize car, cash/REP popups — authored forms with UI feedback. Variety is limited; purpose stays clear. |
| 5 | World/environment | 2 | **2.5** | Layered prop kit in every frame: palms, lamps, benches, hydrants, containers, gantry cranes, forklift, Ferris wheel, lighthouse, piers, boats — foreground/midground/background with scale cues. v3's docks were a bare mauve apron; the dressing earned the half-point. |
| 6 | Materials/textures | 2 | **2** | Shared material roles: stucco/glass/brick facades with aligned window grids, asphalt with lane markings, sand, sea, SOLMAR LINE container branding, police door decals, oil stains and wear. The sunset wash flattens some reads; no panel-line/trim detail on cars beyond decals. |
| 7 | Lighting/render | 2 | **2.5** | Visible sun disc + glow, soft clouds, ACES tone mapping, PMREM sunset environment, directional sun with shadows, hemi/ambient fill, fog depth. v3's sky was flat peach — the sun and clouds earned the half-point. No rim lights or post pipeline, so not a 3. |
| 8 | VFX/motion | 2 | **2.5** | Event-driven and visible in frame: muzzle flash + tracer connecting to the target, hitmarker, KING DOWN score popup, light-bar strobes, searchlight, lighthouse beam, rotor disc, crash smoke. v3 had no connecting tracer and no popup in frame. No particle systems or screen shake, so not a 3. |
| 9 | UI/HUD | 3 | **3** | Dense GTA-faithful HUD: mission panel with stage pips, clock + location pill, cash + goal bar, postcards, REP bar + rank, wanted stars, health/armour, SBPD response list (callsigns, distances, states), speed + vehicle + condition, ammo + weapon slot, radio station + track, dialogue with portraits, round minimap with blips. Cohesive, strong hierarchy. |
| 10 | Performance evidence | 2 | **2** | Renderer diagnostics reported after the graphics work (below); play-test 42/42; target-viewport shots 1280×720; budget notes. No before/after baseline comparison or bottleneck analysis, so not a 3. |

**Average: 2.35** (23.5 / 10). Premium bar: every category ≥ 2 ✓,
average ≥ 2.3 ✓.

## Automatic failures — all clear

- No frame is dominated by placeholders or unjustified empty space.
- The hero is not an unrefined primitive + glow (Dana: rounded humanoid
  with clothing, hair, rifle; the hero car: multi-part model).
- The HUD is not rectangular stat/debug cards (genre-specific GTA HUD).
- Fog is depth cueing, not a stand-in for geometry (no bloom at all).
- No UI overlaps the play path, clips text, or breaks safe areas at
  1280×720 in any of the four frames.
- The game is playable through real input (play-test 42/42, including
  real key presses and clicks) and all four shots are active play.
- Renderer diagnostics reported after the graphics work (below).

## Renderer diagnostics (final code, menu panorama view)

`node shoot.cjs diag` (2026-11-18): 289 draw calls, 42,674 triangles,
1,819 geometries, 18 textures, 17 programs, 366 scene children.
0 console/page errors, 0 external requests across all four shots.
Screenshot sizes: 1-chase 114.6 KiB, 2-city 89.7 KiB, 3-mission 94.2 KiB,
4-combat 88.1 KiB (all ≤ 256 KiB, 1280×720).

## What is still short of the top 3 (honest)

The top-3 entries' edge is density and finish at the small scale: richer
material detail (panel lines, trim, wear on hero surfaces), more varied
enemy/prop families, and particle-driven VFX. v4 closed the composition
gap (sun, heli, tracer, popup, dressed docks, four distinct settings) and
matches their HUD density; the remaining gap is surface richness, which
is a texture/modeling pass, not a composition pass.
