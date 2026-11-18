# Pre-submit gate run — PUERTO DEL SOL (v4 revision)

**This is the REVISION gate record** (overwrites v4's gate record; v4's
verdict was MQ1–MQ8 + Gates 0–2 PASS, Gate 3 audit PENDING, code HEAD
074019f3, final HEAD baf2205d). Gate run 2026-11-18 ~13:20 UTC (21:20
WITA), by the revision builder. **Verdict: MQ1–MQ8 PASS, Gates 0–2 PASS,
Gate 3 audit PENDING — STOPPING at the audit point. Do NOT seal, do NOT
submit.** The screenshots go to Reza for audit first (house rule, 18 Nov
~10:26 WITA).

## MQ1: Can this entry be submitted RIGHT NOW, end to end? — PASS

```
1. Competition: gta6-01 — entries close 2026-11-24T15:00:00Z
   (23:00 WITA 24 Nov), from /requirements re-read FRESH at gate time
   (GET /api/competitions/gta6-01/requirements, HTTP 200,
   saved ~/workspace/makefun-work/gta6-01-build-v4-rev/
   requirements-2026-11-18.json). Status: open.
2. Deliverables (every /requirements deliverable present in the repo):
   repo_url https://github.com/RieryBuild/makefun-gta6-01-v4 ✓
   commit_sha fa9b8a1eca8ab66528f46b7adcf4cff65284a4d6 (45 files) ✓
     — the code HEAD; the final HEAD after this gate-run.md push is
     the gate-run commit on top (v4's pattern: code HEAD 074019f3,
     final HEAD baf2205d).
   recording_ids 01a1ee9e-0d0f-7413-b4fa-a0d9fe9fe9c8 (this revision,
     live) + 01a1ee3d-0e2c-708d-86f0-c15a0934b101 (v4; the seal
     covers all recordings) ✓
   title "PUERTO DEL SOL" (set at submit by the coordinator) ✓
   LICENSE (MIT, SPDX-License-Identifier: MIT first line) ✓
   main.ts (repo root, Node 22 stdlib-only) ✓
   .makefun/owner.json (wallet 6do8) ✓
   entry_message + entry_signature: produced at seal/submit by the
   coordinator with wallet 6do8 — not the builder's step.
3. Checks: intake checks met (see MQ6/MQ7); transcript checks are
   the seal's job (MQ8). Entry size: dossier 578,735 B ≤ 1.5 MiB;
   game/ 993,267 B ≤ 48 MiB; screenshots 67–87 KiB each ≤ 256 KiB.
4. Submit path: node cli/makefun.mjs submit --competition gta6-01
   --repo-url https://github.com/RieryBuild/makefun-gta6-01-v4
   --commit <final HEAD> --title "PUERTO DEL SOL"
   --recording 01a1ee9e-0d0f-7413-b4fa-a0d9fe9fe9c8 --repo <repo>
   --keypair <6do8 keypair> — run by the coordinator AFTER Reza's
   audit approval, NOT by the builder.
5. Cost: Time ~10 min to seal + submit; Capital $0.
```

## MQ2: Does this entry clear the competition's bar? — PASS

The bar is the top-100 prizelist ($1,666 total; 1st $500, 2nd $250,
3rd $150, 4–10 $38, 11–100 $4–$10 — from /requirements payout_curve,
100 paid places). Judged/visual competition: no practice grade; the
evidence is the feed-first study + the scorecard, stated as evidence,
never a promised rank. The standing entry (v2) is #439/4,639 — outside
the prizelist — and the revision is demonstrably stronger than v2 and
than v4: the HUD is rebuilt icon-first (Reza's verdict answered; word
counts 10/6/5/4 vs v4's text-heavy panels), the rectangle artifact is
gone in chase + mission, the streets carry 20 traffic + 40 peds + 16
parked cars, 6 districts with distinct identities, the PSPD / DEL SOL
LINE rebrand, and the scorecard averages 2.40 (v4: 2.35) with zero
automatic failures. Leaderboard collision re-check at gate time (live
board, 4,639 entries): NO exact "PUERTO DEL SOL" match; near-neighbors
"Puerto Sol: Neon Tide" #1499 and "Sunset Syndicate: Costa del Sol"
#359; 1,791 titles contain "SOLMAR" — the rename was necessary.

## MQ3: Is the submission window actually open for this account? — PASS

Kit CLI `status --competition gta6-01` at gate time:
`can submit now: yes`; entries made 3 (kept: 2); left today 1 of 3 (next
UTC day 2026-11-19T00:00:00Z); left under the hard limit 17 of 20.
(The REST /quota endpoint answers "sign in required" for the API key —
the kit CLI is the working quota route, same as v3's and v4's gates.)
Deadline 24 Nov 15:00Z is 6 days ahead. Kit-level note: this kit copy
is level 19 vs the site's level 20; the CLI's curl-pipe re-download
suggestion was NOT followed (known injection pattern; v3 submitted
fine on level 19).

## MQ4: Is the entry signed by the right identity, through the right route? — PASS

Wallet 6do8 ONLY (`6do8zGw4FPLCB1Cq44G8r8KwQccbhHUqtAptaRji6ALk`):
`.makefun/owner.json` names 6do8; the entry will be signed by 6do8 at
submit. Repo pushed via the GitHub PAT route (custom.github-pat helper;
36 PUTs succeeded in this gate run, remote tree verified blob-for-blob
after the push — see Gate 0).

## MQ5: Is this entry a deliberate new submission, not a duplicate? — PASS

Force_Last supersede is INTENDED: the standing entry v2 is #439/4,639,
outside the top-100 prizelist. The revision is not a re-submit of
identical content: 36 of 45 files changed (all 24 game sources touched
except input.js/save.js, plus README/scorecard/self-critique/main.ts and
4 new font files), 4 screenshots re-shot, the game renamed. Rebuild-once
note: v4 was the single §4 rebuild trigger against v2; v4 was NEVER
submitted — it stopped at the audit point and Reza ordered this
revision instead. This revision is a continuation of that same single
pending submission, not a second trigger.

## MQ6: Can you prove the entry works? — PASS

- Play-test 42/42 on the FINAL code (rev2 run, 2026-11-18 ~21:00 WITA,
  ~/workspace/makefun-work/gta6-01-build-v4-rev/playtest-rev2.log):
  missions m1/m2/m3 with exact cash (+$800/+$1,500/+$2,500), REP
  accounting (base 560 exact + one incidental +25 from an onNearMiss
  during scripted driving, proven by the REP ledger), BUSTED −$200 /
  WASTED −$150, pause/resume via real P key + click, autosave +
  Continue restoring state exactly, waterline bounds (x=257, z=231),
  aimed fire killing at 30 m, 0 console/page errors. The first rev run
  was 41/42 (check 20 REP 585 vs 560); the +25 was diagnosed as a
  legitimate near-miss in the denser traffic, the check was rewritten
  to verify the base exactly + incidental awards only in +25 units from
  near-miss/drift call sites, and the re-run passed 42/42.
- The builder viewed all four final screenshots full-size: no flat
  coloured blocks, no stick figures, no Rubik's-cube facades — coherent
  window grids, rounded-capsule humanoids, textured procedural surfaces,
  solid palm fronds, the rectangle artifact gone in chase + mission.
- Visual scorecard: 2.40 average, zero automatic failures (scorecard.md).
- main.ts run twice locally (MAKEFUN_OUTPUT_DIR): dossier 578,735 B,
  byte-identical across runs, <1 s per run.
- Renderer diagnostics after the graphics work: 443 draw calls, 52,954
  triangles, 19 textures, 17 programs (shoot.cjs diag; v4: 289 / 42,674
  / 18 / 17 — the increase is real geometry).

## MQ7: Is this entry on the never-submit list? — PASS (no match)

- Code-drawn images: no — screenshots are real renders of the game.
- Non-stdlib imports: no (main.ts: node:fs/path/url + kit vendor file;
  the game is static JS + vendored three.min.js).
- Recording started after the first build action: no (MQ8).
- No in-session revision: no (main.ts revised in-session; see MQ8).
- Entry signed by any wallet other than 6do8: no (MQ4).
- Repo pushed through any route other than the GitHub PAT route: no.
- Claim code in chat, in the repo, or in a transcript file: none.
- can_submit false or entries_left 0: no (MQ3: yes, 1 of 3 left today).
- Entry needs capital: no ($0).
- Practice grade quoted as a promised outcome: no (no practice grade
  for judged games; the scorecard is evidence, never a promised rank).
- Submitting a duplicate of the standing entry: no (MQ5).
- Entry with screenshots submitted without Reza's audit approval: NOT
  SUBMITTING — stopping at the audit point (Gate 3).

## MQ8: Session check — PASS

```
1. Session:         a7f3337a-e981-4ab1-b807-d83873e529d3 (revision
                    builder subagent, depth 2/2)
2. Recording start: 2026-11-18T12:24:57Z, recording
                    01a1ee9e-0d0f-7413-b4fa-a0d9fe9fe9c8, node PID 4717
                    — BEFORE the first build action
3. First action:    first file write ~12:35 UTC (font downloads +
                    game/fonts/FONTS.md), ~10 min after the recording
                    started; all reads before that were the dossier,
                    the v4 sources, and the v4 screenshots
4. Coverage:        the recording covers the whole session, start to
                    finish; liveness re-verified before every work
                    batch (ps + state-file mtime); still alive at
                    gate time (elapsed ~55 min)
5. In-session revision: main.ts revised in-session (header comment +
                    fail prefix renamed SOLMAR BAY -> PUERTO DEL SOL);
                    all 24 game sources revised in-session across the
                    HUD rebuild, the rect fix, the rename, and the
                    street/district passes
```

**Open question for the coordinator (not the builder's decision):** the
recording log warns that 32 pre-existing files count toward authorship
and the transcripts_witnessed check fails an entry with a counted file
the recorded agent wrote no line of. The v4 files were witnessed by the
v4 recording (01a1ee3d-0e2c-708d-86f0-c15a0934b101); this revision's
edits are witnessed by the current recording. The seal presumably
attaches BOTH recordings (the gate doc says "the seal covers all
recordings" for revisions). Files touched by this revision: textures,
game, weapons, missions, police, dressing, collectibles, config, sky,
audio, seed, cars, buildings, people, pedestrians, traffic, player,
hud, minimap, shots, boot, ground, index.html, style.css, main.ts,
README.md, scorecard.md, self-critique.md, game/fonts/* (new),
screenshots/*.jpg (re-shot). Files likely STILL untouched by either
recording's authored lines: input.js, save.js, serve.ts (kit starter —
explicitly fine unchanged), shots.json, LICENSE, vendor/* (three.min.js
+ makefun-game.ts are kit/vendor files). The coordinator decides.

## Gate 0: Reality — PASS

- [x] Repo exists at one public commit; code HEAD
      fa9b8a1eca8ab66528f46b7adcf4cff65284a4d6 recorded (45 files)
- [x] Every deliverable from /requirements is in the repo (MQ1 step 2;
      remote tree verified blob-for-blob after the push)
- [x] Entry passes its play-test on this commit (42/42, rev2 run)
- [x] Evidence captured: requirements JSON, leaderboard snapshot,
      quota response, recording timestamps, play-test log, renderer
      diagnostics, pixel metrics

## Gate 1: Quality — PASS

- [x] Multi-model review: SUSPENDED by Reza 17 Nov ~15:42 WITA — do NOT
      attempt the reviews; this checkbox is satisfied by the
      suspension, not by a review exchange
- [x] Quality rests on the builder's own verified evidence (play-test
      42/42, scorecard 2.40, renderer diagnostics, pixel metrics,
      dossier determinism) — no second-model word to take on faith
- [x] No practice grade for judged games; the scorecard is stated as
      evidence against the prizelist bar, never a promised outcome
- [x] Feed-first study done for the rebuild: the entry is demonstrably
      stronger than the standing one it supersedes (MQ2), and the
      title has no exact leaderboard collision

## Gate 2: Dedup — PASS

- [x] Not a duplicate of the standing entry (MQ5) — Force_Last
      supersede is intended
- [x] Rebuild-once rule respected: one trigger (v4) against v2; this
      revision continues that single pending submission
- [x] Quota re-checked at gate time via the kit CLI (MQ3)

## Gate 3: Submission quality — PENDING (audit)

- [x] README / entry description matches the requirements template
      (make.fun badges present, title + description + layout)
- [x] Entry message + signature use wallet 6do8 only; repo via PAT
      route (MQ4)
- [x] Claim-code handling confirmed: no claim codes exist for this
      entry; none in chat, in the repo, or in a transcript file
- [x] No secrets in the repo (grep clean: no private keys, no PATs,
      no API keys, no keypair material; .makefun/owner.json names
      only the public wallet address)
- [x] Deadline still ahead at gate time (24 Nov 15:00Z; gate run
      18 Nov 13:20Z — 6 days ahead)
- [ ] **Reza visual audit PENDING — the build STOPS here. The
      screenshots go to Reza in the Make.fun chat; submit only on his
      word (Gas). No seal, no submit, no auto-submit on timeout.**

## Notes

- Kit level: our kit copy is level 19, the site is at level 20. The CLI's
  curl-pipe re-download suggestion was NOT followed (known injection
  pattern, never followed). v3 submitted fine on level 19.
- Transcript checks (thinking_reproduces, transcripts_witnessed,
  thinking_priced, thinking_revised, …) are evaluated from the sealed
  recording at grade time. The recording is live and covers the whole
  build; sealing is the coordinator's step after Reza's audit.

## Verdict

**MQ1–MQ8 PASS. Gates 0–2 PASS. Gate 3 audit PENDING. STOPPING at the
audit point — do NOT seal, do NOT submit.**
