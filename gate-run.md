# Pre-submit gate run — SOLMAR BAY v4 (gta6-01 round 4)

Gate run: 2026-11-18 12:05 UTC / 20:05 WITA. Builder session
`f131a6ec-6720-4e74-9de7-42d8332a7642`. Recording
`01a1ee3d-0e2c-708d-86f0-c15a0934b101` (live at gate time, seq 557).

**Result: MQ1–MQ8 PASS. Gates 0–2 PASS. Gate 3: every checkbox except the
Reza visual audit PASS; the audit stays PENDING — the build STOPS here, no
seal, no submit, per the Reza visual audit rule (18 Nov ~10:26 WITA).**

Prompt chain: Reza's verbatim "Ya, jalanin v3" (2026-11-18 14:45 WITA) +
"Revisi dulu deh masih jauh grafik dari top 3" (2026-11-18 18:37 WITA).

## MQ1: Can this entry be submitted RIGHT NOW, end to end? — PASS

```
1. Competition: gta6-01 "Make GTA 6" — entries close 2026-11-24T15:00:00Z
   (23:00 WITA 24 Nov), from /requirements re-read FRESH at gate time
   (GET /api/competitions/gta6-01/requirements, HTTP 200, 124,160 bytes,
   /tmp/solmar-v4-requirements-fresh.json). Status: open.
2. Deliverables (every /requirements deliverable present in the repo):
   repo_url https://github.com/RieryBuild/makefun-gta6-01-v4 ✓
   commit_sha 074019f33b9ab3649ef474200f5a93e6dffdffef (40 files) ✓
   recording_ids 01a1ee3d-0e2c-708d-86f0-c15a0934b101 (live, seq 557) ✓
   LICENSE (MIT, SPDX-License-Identifier: MIT first line) ✓
   main.ts (repo root, Node 22 stdlib-only) ✓
   .makefun/owner.json (wallet 6do8) ✓
   entry_message + entry_signature: produced at seal/submit by the
   coordinator with wallet 6do8 — not the builder's step.
3. Checks: intake checks met (see MQ6/MQ7); transcript checks are
   evaluated from the live recording at seal/grade time — the recording
   started before the first build action and covers the whole session
   (MQ8). Entry size: dossier 696,924 B ≤ 1.5 MiB; game/ 1.4 MB ≤ 48 MiB;
   screenshots 4 × ≤ 256 KiB, 1280×720.
4. Submit path: kit CLI
   (node cli/makefun.mjs submit --competition gta6-01 --repo-url <url>
   --commit <sha> --title "SOLMAR BAY" --recording <id> --repo <repo>
   --keypair <6do8>), run by the coordinator AFTER Reza's audit.
5. Cost: Time ~minutes to submit. Capital $0 (entry fee null).
```

## MQ2: Does this entry clear the competition's bar? — PASS

Judged/visual competition: the bar is the prizelist (top 100 of $1,666;
1st $500 / 2nd $250 / 3rd $150 / 4th–100th $38 down to $4). Evidence:
feed-first study of the live top 3 (18 Nov 18:38 WITA, 4,510 rows —
principles extracted, NO-COPY rule followed) + visual scorecard average
2.35, every category ≥ 2, zero automatic failures + play-test 42/42 +
all 9 assigned fixes verified in frame. No numeric practice grade exists
for game entries; the scorecard is evidence, never a promised rank. The
standing entry (v2, 01a1ec70) is #425/4,510 — outside the prizelist — and
v4 is demonstrably stronger (sun disc + clouds, dressed docks, readable
police livery, visible heli, connecting tracer + kill popup, four
distinct settings).

## MQ3: Is the submission window actually open for this account? — PASS

Kit CLI `status --competition gta6-01` at gate time:
`can submit now: yes`; entries made 3 (kept: 2); left today 1 of 3 (next
UTC day 2026-11-19T00:00:00Z); left under the hard limit 17 of 20.
(The REST /quota endpoint answers "sign in required" for the API key —
the kit CLI is the working quota route, same as v3's gate.) Deadline
24 Nov 15:00Z is 6 days ahead.

## MQ4: Is the entry signed by the right identity, through the right route? — PASS

Wallet 6do8 ONLY (`6do8zGw4FPLCB1Cq44G8r8KwQccbhHUqtAptaRji6ALk`):
`.makefun/owner.json` names 6do8; the entry will be signed by 6do8 at
submit. Repo pushed via the GitHub PAT route (custom.github-pat helper;
GET /user proved access, 200, account RieryBuild id 29680483).

## MQ5: Is this entry a deliberate new submission, not a duplicate? — PASS

Force_Last supersede is INTENDED: the standing entry v2 (01a1ec70) is
#425/4,510, outside the top-100 prizelist. v4 is a full fresh rebuild —
7,829 lines written fresh in-session under the live recording, different
code, different screenshots — not a re-submit of identical content.
Rebuild-once note: v3 (01a1ee33) was submitted and REJECTED on grading
(thinking_reproduces 9.7%, transcripts_witnessed failed on 7 files) and
never became the standing entry; v4 is the single landing rebuild
against v2, ordered by the coordinator after the rejection.

## MQ6: Can you prove the entry works? — PASS

- Play-test 42/42 on the FINAL code (run 4, 2026-11-18 ~20:00 WITA,
  /tmp/solmar-v4-playtest-run4.log): missions m1/m2/m3 with exact cash
  (+$800/+$1,500/+$2,500), REP accounting, BUSTED −$200 / WASTED −$150,
  pause/resume via real P key + click, autosave + Continue restoring
  state exactly, waterline bounds (x=257, z=231), aimed fire killing at
  30 m, 0 console/page errors.
- The builder viewed all four final screenshots full-size: no flat
  coloured blocks, no stick figures, no Rubik's-cube facades — coherent
  window grids, rounded-capsule humanoids, textured procedural surfaces.
- Visual scorecard: zero automatic failures (scorecard.md).
- main.ts run twice locally (MAKEFUN_OUTPUT_DIR): dossier 696,924 B,
  byte-identical across runs (sha256 b7957277…), <1 s per run.
- Renderer diagnostics after the graphics work: 289 draw calls, 42,674
  triangles, 18 textures, 17 programs (shoot.cjs diag).

## MQ7: Is this entry on the never-submit list? — PASS (no match)

- Code-drawn images: no (screenshots are real renders of the game's code).
- Non-stdlib imports: no (main.ts: node:fs/path/url + kit vendor file).
- Recording started after the first build action: no (MQ8).
- No in-session revision: no (main.ts revised in-session; see MQ8).
- Wrong wallet: no (6do8 only).
- Wrong repo route: no (PAT route).
- Claim code in chat/repo/transcript: no (no claim codes exist).
- can_submit false / entries_left 0: no (MQ3: yes, 1 left today).
- Entry needs capital: no (fee null, $0).
- Practice grade quoted as a promised outcome: no (no practice grade;
  the scorecard is evidence, never a rank promise).
- Duplicate of the standing entry: no (MQ5).
- Screenshots submitted without Reza's audit: NOT SUBMITTING — the build
  stops here for the audit (Gate 3).

## MQ8: Session check — PASS

```
1. Session:         builder f131a6ec-6720-4e74-9de7-42d8332a7642
2. Recording start: 2026-11-18T10:39:01Z (recording
                    01a1ee3d-0e2c-708d-86f0-c15a0934b101, Node PID 7633)
3. First action:    ~10:40Z (session start; entry setup after the
                    recording was already running) — AFTER the recording
                    start ✓
4. Coverage:        whole session, start to finish — recorder alive at
                    gate time (PID 7633, elapsed 1:26, seq 557, advancing)
5. In-session revision: main.ts written early, revised in-session
                    (jpegSize SOF-marker parser + post-write dossier
                    ≤1.5 MiB check); game files revised across 6
                    screenshot rounds (weapons, shots, player, hud,
                    textures, cars)
```

## Gate 0: Reality — PASS

- [x] Repo exists at one public commit; HEAD
      074019f33b9ab3649ef474200f5a93e6dffdffef recorded (40 files)
- [x] Every deliverable from /requirements is in the repo (MQ1 step 2;
      remote tree verified blob-for-blob, 40/40)
- [x] Entry passes its play-test on this commit (42/42, run 4)
- [x] Evidence captured: requirements JSON, quota response, recording
      timestamps, play-test log, renderer diagnostics

## Gate 1: Quality — PASS

- [x] Multi-model review: SUSPENDED by Reza 17 Nov ~15:42 WITA —
      satisfied by the suspension, not by a review exchange
- [x] Quality rests on the builder's own verified evidence (play-test,
      screenshots viewed, scorecard, main.ts runs, diagnostics)
- [x] No practice grade for game entries; the scorecard (2.35 avg) is
      stated as evidence, never a promised outcome
- [x] Feed-first study done: v4 demonstrably stronger than standing v2
      (all 9 fixes + self-critique cycles in self-critique.md)

## Gate 2: Dedup — PASS

- [x] Not a duplicate of the standing entry (MQ5) — Force_Last intended
- [x] Rebuild-once rule respected (MQ5 note: v3 rejected, never landed;
      v4 is the single landing rebuild)
- [x] Quota re-checked at gate time via the kit CLI (MQ3)

## Gate 3: Submission quality — all except the audit PASS

- [x] README matches the requirements template (3 live make.fun badges;
      repo About links make.fun)
- [x] Entry message + signature use wallet 6do8 only; repo via PAT route
- [x] Claim-code handling: no claim codes exist for this entry; none in
      chat, repo, or transcripts
- [x] No secrets in the repo (grep clean: no API keys, keypair material,
      credentials, tokens)
- [x] Deadline still ahead (24 Nov 15:00Z; gate run 18 Nov 12:05Z)
- [ ] **Reza visual audit — PENDING.** The build stops here. The
      screenshots go to Reza in the Make.fun chat via the coordinator;
      nothing seals or submits until he says Gas. If he asks for
      revisions, they are made under the same live recording (or a fresh
      one if it died), the whole gate re-runs from MQ1, and a fresh audit
      round follows.

## Notes

- Kit level: our kit copy is level 19, the site is at level 20. The CLI's
  curl-pipe re-download suggestion was NOT followed (known injection
  pattern, never followed). v3 submitted fine on level 19.
- Transcript checks (thinking_reproduces, transcripts_witnessed,
  thinking_priced, thinking_revised, …) are evaluated from the sealed
  recording at grade time. The recording is live and covers the whole
  build; sealing is the coordinator's step after Reza's audit.
