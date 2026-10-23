# Final engineering verification

2026-10-23 14:20 UTC. Runtime/test source: `3dbddbdd189a240ff814d0b0cf3036f25ee2f940`. Later commits contain documentation/evidence only; source, tests, lockfile, configuration and workflows are unchanged. Main and rollback tag remain `37411e336d1b837e99720bb444eb0b0761eb852e`.

## Independent clean verification: PASS

The release coordinator created a clean detached worktree, performed fresh `npm ci`, and used Node22.23.4 (matching the CI major version), npm11.9.0.

- `npm run typecheck`: passed.
- `npm run generate:clubs:check`: passed,366 club parameter rows.
- `npm run verify:retirement-qr`: passed, existing GitHub Pages custom domain retained.
- `npm run build`: passed. The large main-bundle warning is retained and not misrepresented as a failure or eliminated performance risk.
- `npm run test:run -- --maxWorkers=4`: exit0, **90 files /1167 tests passed**,771.00 seconds. Every intended `src/**/*.test.{ts,tsx}` file is included, including the existing2 TSX files and the default192-career +80-cash-run +8-replay experiment harness. No test exclusions or source/config changes were introduced to obtain this result.

Logs: `parent-node22-install.txt`, `parent-node22-checks.txt`, `parent-node22-full-tests-workers4.txt`.

The first unlimited-worker attempt was interrupted withSIGINT/exit130 while its log was quiet. No assertion failure or proven stall was established. `parent-node22-initial-interrupted.txt` retains that unconfirmed attempt; the identical-coverage bounded-worker pass is authoritative. Experimental proxy warnings and npm upgrade notices are environment output, not application assertion failures.

## Compatibility and rollback

The default suite includes35 genuine originalV13 successor cases, strict service/persistence faults, allsix first-stage public story successors and the complete current20-node selector. Earlier failures and narrow correction rationale remain in the stage-one and intermediate logs; they are not substituted for the final clean pass.

An additional independent isolated14-case drill migrated anonymous originalV13 states, advancedV14, preserved its raw progress, restored the byte-exactV13 backup and resumed under untouched original37411e3 to the exact original expected report, then restoredV14 unchanged. `rollback-rehearsal.json` and `rollback-rehearsal-log.txt` record this. This is an isolated recovery rehearsal, **not an automatic production downgrade feature**. Its external original-archive runner is not a hidden dependency of defaultCI.

## Separate gates

Strategy accepted correctedR2 numerical/narrative calibration and unchanged9tiers/cap85/UNCAPPED, with the strong fixed-BODY availability preference explicitly retained as a tradeoff. Visual accepted the exact runtime commit in isolated cloud Chromium, with synthetic boundaries and natural histories labeled separately. These engineering and visual checks do not prove subjective enjoyment or real-device Safari/WeChat behavior.

GitHub publication remains blocked by the coordinator's confirmed403 access response; no push, remote backup or deployment is claimed here. The authorized local copy is a subsequent release-coordination step. Browser screenshots/exported PNGs were inspected but intentionally remain cloud-only and are excluded from repository/source transfer.
