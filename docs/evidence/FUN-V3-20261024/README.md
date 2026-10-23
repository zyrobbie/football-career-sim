# V3.0.1 interaction-feedback candidate verification

Status: implementation, strategy and candidate-browser gates PASSED; production publication is a separate step and is not claimed here. The tested runtime is commit `934a1117573fd790171acf3937745d49ba4563cd`; later commits in this revision add only documentation and QA tooling.

## Scope

- Two or three interaction cards share one horizontal row, including narrow mobile layouts.
- Interaction previews use affected metrics and qualitative direction, not exact stat or cash deltas. Actual results retain exact values; separate personal-arrangement purchase prices remain visible.
- The press-conference bottle event presents a personal sponsor versus competitor conflict, with distinct media and one-time sponsorship-income tradeoffs.
- Compact lower-page typography is aligned with the upper status grid, without changing the hero player metrics.
- Saved completed events retain their original titles and effects. Existing low-cash pending bottle events retain the original free choices, rather than becoming trapped or charged unexpectedly.

## Candidate checks already run

- TypeScript, production build, club-parameter consistency, retirement QR verification and 91 focused assertions: PASS.
- Complete regression suite: 93 test files / 1,180 assertions PASS, 711.40 seconds, four workers, no test exclusions added.
- Independent strategy checks: 9 PASS, including sponsor tradeoffs, historical pending/result compatibility and save/reload/settlement behavior.
- Isolated Mac Chromium visual checks: 32/32 PASS, zero browser errors. The executing reviewer opened six key original screenshots, plus long-copy and training views, and verified horizontal cards, readable typography and no clipping.
- The initial runner attempt failed 29 cases because the synthetic fixture omitted required training focus and development approach. Setting BALANCED/STEADY fixed the fixture; all 32 cases then passed without changing runtime code. The committed runner contains this correction.

The production bundle retains the existing large-chunk warning. These are candidate-browser checks, not physical-device or live-production verification. Library screenshot upload was unavailable; the original screenshots remain in the local QA output rather than being represented as transferred cloud evidence.

## Reproduce visual checks

Use an isolated browser context with anonymous synthetic saves, never an existing player profile. Use the candidate source checkout, an unused loopback port, and already available Node, Playwright and browser installations.

1. Start the development server using `npm run dev -- --host 127.0.0.1 --port PORT --strictPort`.
2. Run `node scripts/qa/v3-feedback-visual.mjs --url http://127.0.0.1:PORT/ --out ABSOLUTE_OUTPUT_DIRECTORY --source EXACT_CANDIDATE_COMMIT --module ABSOLUTE_PLAYWRIGHT_MODULE_PATH --browser ABSOLUTE_BROWSER_EXECUTABLE_PATH`.
3. The optional `--browser` argument may be omitted if the existing Playwright installation already has its configured browser.
4. Inspect `metadata.json`, failure screenshots, and the actual pixels of representative selection, result, full-page and training views. Automated geometry checks are not a substitute for visual review.

The matrix covers 320, 375, 390, 402, 430, 1280 and 1366 CSS-pixel widths; two-step legacy choices, new three-card interactions, bottle outcomes, long copy, sampled club themes, training scale and personal-arrangement price visibility. It checks horizontal alignment, equal columns, overflow, minimum supporting-copy size, public choice/result/reload/continue flows and console errors.

These fixtures exercise rendering and public save/load/choice actions. They do not establish natural event occurrence, physical-device rendering or user-perceived enjoyment. Keep generated screenshots and synthetic save dumps outside the repository; record the tested commit and any NOT RUN cases with the final acceptance result.
