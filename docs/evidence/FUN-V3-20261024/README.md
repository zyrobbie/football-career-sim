# V3.0.1 interaction-feedback candidate verification

Status: UNACCEPTED CANDIDATE. Do not treat this document or the presence of the runner as visual approval. The runtime candidate is commit `934a1117573fd790171acf3937745d49ba4563cd`; this directory and the portable runner are documentation/QA-only additions.

## Scope

- Two or three interaction cards share one horizontal row, including narrow mobile layouts.
- Interaction previews use affected metrics and qualitative direction, not exact stat or cash deltas. Actual results retain exact values; separate personal-arrangement purchase prices remain visible.
- The press-conference bottle event presents a personal sponsor versus competitor conflict, with distinct media and one-time sponsorship-income tradeoffs.
- Compact lower-page typography is aligned with the upper status grid, without changing the hero player metrics.
- Saved completed events retain their original titles and effects. Existing low-cash pending bottle events retain the original free choices, rather than becoming trapped or charged unexpectedly.

## Candidate checks already run

TypeScript, production build, club-parameter consistency, retirement QR verification, and 91 focused assertions passed before this QA-only commit. The complete regression suite was still running when this candidate document was written. Rendered browser acceptance was NOT YET RUN. The production bundle retains the existing large-chunk warning.

## Reproduce visual checks

Use an isolated browser context with anonymous synthetic saves, never an existing player profile. Use the candidate source checkout, an unused loopback port, and already available Node, Playwright and browser installations.

1. Start the development server using `npm run dev -- --host 127.0.0.1 --port PORT --strictPort`.
2. Run `node scripts/qa/v3-feedback-visual.mjs --url http://127.0.0.1:PORT/ --out ABSOLUTE_OUTPUT_DIRECTORY --source EXACT_CANDIDATE_COMMIT --module ABSOLUTE_PLAYWRIGHT_MODULE_PATH --browser ABSOLUTE_BROWSER_EXECUTABLE_PATH`.
3. The optional `--browser` argument may be omitted if the existing Playwright installation already has its configured browser.
4. Inspect `metadata.json`, failure screenshots, and the actual pixels of representative selection, result, full-page and training views. Automated geometry checks are not a substitute for visual review.

The matrix covers 320, 375, 390, 402, 430, 1280 and 1366 CSS-pixel widths; two-step legacy choices, new three-card interactions, bottle outcomes, long copy, sampled club themes, training scale and personal-arrangement price visibility. It checks horizontal alignment, equal columns, overflow, minimum supporting-copy size, public choice/result/reload/continue flows and console errors.

These fixtures exercise rendering and public save/load/choice actions. They do not establish natural event occurrence, physical-device rendering or user-perceived enjoyment. Keep generated screenshots and synthetic save dumps outside the repository; record the tested commit and any NOT RUN cases with the final acceptance result.
