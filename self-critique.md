# Self-critique — SOLMAR BAY v4

Reza's verbatim prompt, applied after each screenshot round:

> "Review the results you just generated. Identify 3–5 weaknesses, logical
> flaws, or areas that can still be optimized. Then, create a much better
> and more robust version based on those findings."

Cycles run until a full cycle finds no material weakness. Three cycles ran:
two productive, one confirming. The stop condition was met on cycle 3.

## Cycle 1 — round-4 screenshots (2026-11-18 ~19:30 WITA)

Reviewed the four round-4 frames (chase / city / mission-m3 / combat) after
the 9 fixes landed. Three material weaknesses found:

1. **The chase frame is dominated by a police car, not the hero car.**
   A big white SBPD cruiser fills the bottom-right foreground; the red
   Marlin GT is a small shape half-hidden behind it. Root cause: the
   mission spawns 3 cruisers and the staging spawns 3 more, but only the
   first two were repositioned after the pursuit run — the third (and the
   mission's) cruisers stayed wherever the pursuit parked them, one right
   beside the camera. Fix: every cruiser past the first two is now placed
   behind the player (out of frame, still on the minimap and in the SBPD
   response list). The hero car is the frame's subject again.
2. **The mission and combat frames are the same setting.** Both were m3 at
   the docks — same lighthouse, same apron, same enemies. The contact
   sheet needs four distinct settings. Fix: the mission shot re-staged to
   m2 (steal the prize sports car) at the beach lot — Dana beside the red
   car, the mission beacon pillar, the Ferris wheel behind, "HOT WHEELS /
   Steal the sports car / STAGE 2/3", cash $1,050 (exact: $250 + $800).
3. **The city frame's near-midground is empty.** Between Dana and the
   parked cars (~15–35 m ahead) there is a long bare stretch of road.
   Fix: one pedestrian moved to ~13 m ahead of Dana, close enough to read
   as a person instead of a dot.

Considered and dropped:

- *Docks ground looks flat.* Checked: the dockConcrete texture already
  carries expansion joints, oil stains, and tyre scuffs — the flatness is
  the sunset wash at distance, not missing dressing. No change.
- *The sun disc is half behind a palm frond in the city frame.* A palm
  silhouette against the sun is the classic GTA shot; the disc still
  reads. No change.

Round-5 re-shoot verified fixes 1 and 3 immediately. Fix 2 needed one
more pass: a parked van sat between the camera and Dana and ate the left
half of the beach-lot frame, and the Ferris wheel was cut by the
beachfront roofline. The staging now clears parked cars within 15 m of
the prize car, and the camera pitch went 0.28 → 0.34 so the wheel clears
the roof. Round-5b confirmed the mission frame.

## Cycle 2 — round-5/5b screenshots (2026-11-18 ~20:00 WITA)

Reviewed the improved set. One material weakness found:

4. **No score popup in any frame.** The top-3 frames all carry score
   popups; the combat frame showed a hit with no payoff. Fixing it took
   four rounds of debugging, each teaching something real:
   - *The final shot missed over the target's head.* The aiming camera's
     ray is nearly flat (it looks 8 m ahead from 3.4 m up) and offset
     0.5 m right by the shoulder shift. At pitch 0.28 it grazes the top
     of an 11 m target's head. The target moved to 23 m (where the ray
     meets chest height at pitch 0.18), lateral −0.5 (on the ray's line),
     and the tracer cap went 18 m → 30 m so the tracer reaches it.
   - *The pre-damage picked the wrong King — twice.* Nearest-first hit
     the 11 m bystander; farthest-first hit an unplaced King still at
     his spawn post. The target is now the enemy closest to 23 m out.
   - *`hideCombatFx` cleared the popups.* It was written to hide a frozen
     damage flash and also wiped the score popups and the hitmarker. It
     now hides only the damage flash and the arrest bar.
   - *The popup expired before the shutter.* Its 2.2 s wall-clock life
     outlasts the kill but not the slow frozen-frame render (~4 fps in
     this environment), and the rise animation never fades in at that
     frame rate. `showScorePopup` gained a `persist` flag (no removal
     timer, no animation — full opacity on the first frame); the staging
     re-shows the same kill's popup persistently after the freeze. The
     kill is real (panel reads 3 left, REP +10, the body lies at the
     crosshair); the popup is that kill's feedback, re-timed.

   Verified: the final combat frame shows "KING DOWN", the red hitmarker
   X, the fallen King at the crosshair, and the tracer connecting the
   muzzle to the body.

## Cycle 3 — round-6 screenshots (2026-11-18 ~20:30 WITA)

Reviewed the final set (chase / city / mission-beach-lot / combat) after
the full re-shoot. Findings:

- The chase cover: hero car subject, heli in frame, two cruisers ahead,
  79 km/h, six-unit SBPD response list. No weakness.
- The city frame: sun disc, Ferris wheel, Dana, two parked cars, two
  pedestrians, beach vista. The right-hand building's side wall is
  sun-washed and plain — a nit, not material; the facade windows face the
  street, the side is correctly blank.
- The mission frame: Dana beside the prize car, beacon pillar, wheel
  above the roofline, "HOT WHEELS" stage 2/3. The palm trunk crossing
  the left third frames the shot rather than blocking it. No weakness.
- The combat frame: tracer, kill, popup, hitmarker, body, lighthouse,
  dressed docks. The popup's orange-on-orange contrast is moderate —
  readable (the text-shadow carries it), not striking. A brighter kill
  colour would help, but it is a polish nit, not a material weakness.

**No material weakness found. Stopping here per the house rule.**
