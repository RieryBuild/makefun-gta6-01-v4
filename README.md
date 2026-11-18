# PUERTO DEL SOL — an open-world crime game at golden hour

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/RieryBuild/makefun-gta6-01-v4/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/RieryBuild/makefun-gta6-01-v4/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Dana Vega runs courier jobs out of Rosa's garage on Marlin Street. The
Dockside Kings want the garage — fifty thousand dollars of "protection" or
they torch it. Dana has one week, one battered van, and no plans to pay.

PUERTO DEL SOL is an open-world crime game in the spirit of GTA 6, built
in Three.js for the desktop web browser: a full city to drive and walk, a
five-mission story, a police response that escalates from one cruiser to a
helicopter, and a sunset that never quite sets.

This is the revised round-4 entry (renamed from SOLMAR BAY at the
player's pick): the HUD was rebuilt icon-first on the GTA law — icons,
bars and bare numbers, text only transiently — the rectangle artifact
in the chase and mission frames was killed at the texture level, the
streets were filled (20 moving cars, 40 pedestrians, kerb-lined parking),
and the districts were given hard identities (glass Centro, pastel Art
Deco Playa del Sol, industrial El Puerto, walled Lomas Altas estates).

## What's in the game

- **A city that reads as a place**: 49 blocks in six hard districts —
  glass towers in Centro, pastel Art Deco villas with stepped parapets
  in Playa del Sol, brick warehouses in El Puerto, walled estates in
  Lomas Altas — palm-lined streets, a beach with umbrellas and a
  lifeguard tower, three piers, a Ferris wheel, a striped lighthouse
  with a sweeping beam, a working docks yard (gantry cranes, container
  rows, a forklift, oil stains), and a DEL SOL LINE freighter at anchor.
- **A five-mission story** (First Delivery → Hot Wheels → Dockside Heat →
  The Getaway → Harbor Showdown) worth $49,800 plus the $250 start cash:
  finishing the story raises the $50,000 that saves the garage.
- **A police response with names**: PSPD cruisers (SNAPPER-11, MARLIN-10,
  …), officers on foot who can arrest Dana, and the GULL-1 helicopter
  from three stars. Wanted stars decay when Dana breaks line of sight;
  the hunt reads on the radar (flashing blips, a flashing rim, a search
  ring), never in a text table.
- **BUSTED and WASTED with exact accounting**: a $200 fine and a respawn
  at the PSPD steps, or a $150 fine and a respawn at Del Sol General.
- **Systems that keep score**: REP ranks (New in Town → Del Sol Legend),
  10 postcards worth $200 each, armour vests, a radio with three
  generative stations, a round minimap, autosave with Continue, and a
  pause menu that actually pauses — and carries the clock, goal and
  stats the HUD no longer shows.
- **A golden-hour look, committed**: one orange-pink grade across sky,
  fog, light and HUD; a visible sun disc; long shadows; and a menu
  panorama that orbits the city while you decide.

## Controls

| Key | Action |
| --- | --- |
| WASD | Move / drive |
| Mouse | Look (click the canvas to lock the pointer) |
| Left-click | Shoot |
| Right-click (hold) | Aim |
| E | Interact — start a mission, enter/exit a car |
| R | Reload |
| Space | Handbrake |
| Shift | Run |
| N | Next radio station |
| M | Mute |
| P / Esc | Pause |

## Run it

```sh
# Serve the game (Node 22+)
node serve.ts
# then open http://localhost:8080/
```

No build step, no network calls: Three.js is vendored under
`game/vendor/`, the three HUD fonts (Passion One, Barlow Condensed,
Yellowtail — all OFL) are vendored under `game/fonts/`, and every
texture is drawn procedurally at load.

## Layout

```
main.ts            entrypoint: copies game/ + screenshots/ to /output,
                   writes dossier.json
serve.ts           local dev server (kit starter)
shots.json         the four screenshot scenes
game/
  index.html       the page + the HUD
  style.css        HUD and menu styling
  fonts/           the three OFL HUD fonts (WOFF2, vendored)
  vendor/three.min.js   Three.js r147, vendored
  src/
    boot.js        bootstrap: menus, game loop, ?shot= staging
    config.js      tuning: the city, the sun, the cars, the heat
    game.js        the engine: state, clock, fines, autosave
    shots.js       the four screenshot scenes (real play, frozen)
    sky.js         sky dome, sun disc, clouds, sea, light
    ground.js      terrain, roads, crosswalks, beach
    buildings.js   the six archetypes + landmarks + colliders
    dressing.js    palms, props, Ferris wheel, lighthouse, docks yard
    people.js      humanoids from rounded primitives + weapons
    cars.js        the six car types + the PSPD cruiser
    player.js      walking, driving, the camera
    traffic.js     moving + parked cars
    pedestrians.js the crowd: stroll, flee, get back up
    police.js      stars, cruisers, officers, helicopter
    weapons.js     the rifle: raycast fire, tracers, enemies
    missions.js    the five jobs + the waypoint beacon
    collectibles.js  the ten postcards
    hud.js         the icon-first HUD: bars, icons, transient text
    minimap.js     the round north-up map
    audio.js       the synthesized soundscape + radio
    input.js       keys, mouse, pointer lock
    save.js        localStorage autosave
    seed.js        the seeded RNG
    textures.js    procedural canvas textures (cached)
screenshots/       the four entry screenshots (real renders)
```

## Screenshots

1. **1-chase.jpg** — a three-star pursuit down Marlin Street: the Marlin
   GT at 79 km/h, cruisers alongside and head-on, GULL-1 overhead, the
   objective line the frame's one transient.
2. **2-city.jpg** — Dana on foot at golden hour, the street vista ahead,
   the sun disc over the sea, the Ferris wheel upper-left, the Beach
   Pavilion district card the frame's one transient.
3. **3-mission.jpg** — Hot Wheels at the beach lot: Dana beside the prize
   sports car, the soft mission beacon, the Ferris wheel behind, a bare
   subtitle the frame's one transient.
4. **4-combat.jpg** — Dockside Heat at the docks: the tracer connecting
   the muzzle to a King, KING DOWN scored, the lighthouse whole in frame.

## make.fun

Built for the [gta6-01 competition](https://make.fun/bounty/gta6-01)
on make.fun. The entry is sealed and submitted with the make.fun CLI; see
`gate-run.md` for the pre-submit gate and `scorecard.md` for the visual
self-assessment.

---

<sub>Entered on [make.fun](https://make.fun/?ref=wa8s3t3t&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
