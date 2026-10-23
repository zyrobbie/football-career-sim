# FUN-V3 deterministic balance evidence

Status: R2 deterministic objective batch complete. See REPORT-R2.md for final counts, preserved R1 rejection and the remaining fixed-BODY balance tradeoff. No release, deployment, visual acceptance or human enjoyment claim is made here.

## Inputs and scope

- `frozen-policy.md`: predeclared seeds, legal position cycling, original-code adult prelude, market/training/event/arrangement policies, cash salary strata and investigation thresholds.
- `frozen-inputs.sha256`: frozen policy and initial harness identities. Later instrumentation-only changes are documented separately; no outcome-driven strategy adjustment is permitted.
- `original-v2.5-source.sha256`: read-only original-code source identities, archived tracked baseline commit `37411e336d1b837e99720bb444eb0b0761eb852e`.
- `baseline-business-projections.json`: original V2.5 public-action business hashes, 48 seeds. Bundled CI input, generated separately with original code, not the candidate's OFF implementation.
- `analyze-results.py`: descriptive aggregate and paired-difference analysis; flags are investigation prompts, never an automatic fun/balance pass.

Default focused reproduction:

    node_modules/.bin/vitest run src/store/gameStore.v3Balance.test.ts

It generates the 48 adult fixtures through public legacy prelude actions, runs four groups (192 main full careers), runs 20 controlled cash starts in four arms (80 eight-window runs), and performs eight additional exact replay runs on four preselected starts. It does not require local captures. The original reference fixture must be present; missing reference cannot silently bypass OFF equivalence.

Capture explicitly, using a new output directory for a revision:

    FUNV3_CAPTURE=1 FUNV3_CAPTURE_DIR=outputs/FUN-V3-20261023/balance/revision-name node_modules/.bin/vitest run src/store/gameStore.v3Balance.test.ts

`FUNV3_SUITE=long`, `cash`, or `replay` selects one finite experiment; `FUNV3_INDICES=0,11` is a diagnostic subset, not the 48-start acceptance batch.

## Interim findings

- A fresh MENTAL quote failed Store payment because JSON key order changed across schema normalization. Preserved failure: `outputs/FUN-V3-20261023/balance/pilot-long-quote/quote-mismatch-FUNV3-LONG-00-10.json`. Engineering canonicalized quote hashing; the subsequent four-arm pilot completed and OFF matched original V2.5.
- Two original-code preflights rejected fixture secondary-position assumptions before a career started. The actual `SECONDARY_POSITIONS[position][0]` catalog now defines all legal pairs. Partial batches are explicitly not complete reference evidence; no game outcome or strategy threshold was selected around those failures.
- CASH20 x4 completed in `outputs/FUN-V3-20261023/balance/cash-frozen-v2/`, with 20 green tests, 80 runs and eight completed windows each. At the €2m controlled salary, capped BODY spending across five starts was €400,000 and capped salary credited was exactly €400,000, leaving aggregate balance unchanged at €2,175,000. Capped no-spend credited €0 of €5,800,000 due. UNCAPPED credited all €5,800,000; BODY then had a €400,000 opportunity cost relative to free. This supports the cash-use rationale for removing the cap, not an all-domain economic conclusion.

## Limits and next work

Original V2.5 reference: all 48 seeds completed, 48 tests green in 136.05 seconds. A subsequent three-position pilot (ST/LM/LB) matched original prelude and every public-action business projection for candidate OFF and completed all four groups. R2 completed all 192 main adult careers with all 20 production nodes reached in each ON group. Boundary tests elsewhere must cover naturally missing services/tiers, cap 80/85/90, PUSH and recovery ordering. Automated careers cannot establish user enjoyment, readability, willingness to pay, or subjective FUN-10 acceptance.

## Original reference regeneration

The separate read-only V2.5 runner is kept outside default test discovery as `outputs/FUN-V3-20261023/balance/baseline-reference.reference.ts`; its dedicated `baseline-vitest.config.mts` includes only that file. The original source archive is required to regenerate, but not to run candidate CI. Do not rename that runner to `.test.ts` inside outputs, because default Vitest discovery would execute it as an unintended additional suite.

    FUNV3_BASELINE=1 FUNV3_CAPTURE=1 FUNV3_SUITE=long FUNV3_CAPTURE_DIR=/absolute/new/capture node_modules/.bin/vitest run --root /workspace/shared/football-career-v3/outputs/FUN-V3-20261023/balance --config /workspace/shared/football-career-v3/outputs/FUN-V3-20261023/balance/baseline-vitest.config.mts

Instrumentation after the original reference run added a mandatory bundled-reference check, age-banded/attribute and story-delay counters, and a replay-only selector. None change seeds, business actions, purchase policies or the expected original-code hashes.

## R1 rejected batch and R2 correction

The first complete full-20 batch is preserved under `outputs/FUN-V3-20261023/balance/main-full20/`. Its 192 adult careers all retired, with all 48 OFF cases matching 13,048 adult public states plus 2,582 prelude public states against original V2.5. The two last shard process exits were a diagnostic-only empty skipped CASH-suite collection error, not failed career assertions. The selector was fixed and both affected index ranges passed collection/reference-only verification. This distinction is preserved in the original logs.

R1 is not balance/story acceptance. `aggregate-analysis.json` and `story-priority-investigation.json` are R1 observations, not final R2 evidence. Broad legacy health eligibility was being promoted to mandatory urgency: KEY_MATCH_PAIN is normally eligible for virtually every adult with a contract, and FITNESS_WARNING uses fitness <78. ON_FREE therefore saw 498 KEY_MATCH_PAIN and 490 FITNESS_WARNING events versus original OFF 16 and 19. The ON_FREE event fitness total was -1,270 versus OFF +137, while the direct new V3-node contribution was only -16. This explained the recovery increase and follow-up starvation without blaming free non-purchase itself.

Natural R1 union reached 19 of 20 nodes; C03B was absent. Across three ON groups there were 35 completed, 63 expired and 6 retirement-closed chains. These findings triggered review rather than being automatically called a pass.

Strategy and engineering approved R2: only the actual original slot winner can receive explicit urgent priority if it is one of the three named IDs, rather than scanning all merely eligible candidates. Original transitions, cadence, 48 seeds, raw business fixtures, training/market/event-choice policies, service prices/gains/cap and cash rules remain unchanged. The R1 batch and hashes are not overwritten. R2 runs in a separate `main-r2/` directory under Node 22.23.4. Engineering also included first-call-preserving expense idempotence and current-city validation hardening before R2.

R2 capture instrumentation additionally retains every report receipt, reconciles it one-to-one against executed period records and all payment/refund totals, independently compares identical original preparation with/without paid support, proves no direct attribute/potential change, and checks the frozen key-moment preparation where present. This does not lock or force subsequent sporting outcomes.

## Final compact delivery

REPORT-R2.md is the readable outcome. aggregate-analysis-r2.json and story-coverage-r2.json give complete descriptive counts and flags. archive-manifest.json lists authoritative rejected R1 and candidate R2 gzip captures, with exact source and gzip hashes; all archives decompress byte-for-byte to untouched local outputs. gzip uses a blank filename and mtime0 for deterministic output. Verify from this directory with `sha256sum -c archives.sha256`.

The 48/192 main counts are not inflated by the separate baseline48, rejected R1 rerun, cash80, replay8, diagnostic pilots or the two partial natural-impression screenshot replays. These are explicitly separate execution batches of the same fixed seed set, not additional unique starts.
