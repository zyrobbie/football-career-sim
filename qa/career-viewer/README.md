# Career viewer independent browser regression

Run after `npm ci`, installation of `@playwright/test@1.56.1`, Playwright Chromium/WebKit and Noto CJK fonts, and `npm run build`:

    npx vitest run --config qa/career-viewer/vitest.config.ts
    node qa/career-viewer/run.mjs

The script launches the production preview server on localhost4173 (or uses BASE_URL), seeds isolated browser contexts with explicitly synthetic DemoPlayer save envelopes, and exercises actual UI. It never contacts live save storage or a cloud provider. Artifacts are gitignored and collected by CI.

Coverage: Chromium390/768/1280, WebKit390 (engine test, not physical iPhone); continuous readable archive viewport, bounded vertical scroll/no horizontal overflow, keyboard scrolling, actual PNG links/downloads and QR decode, Escape/focus restore/close/reopen, unchanged local synthetic save, home/new-game confirmation cancel/accept. Chromium390 also exercises32clubs and an escaped adversarial player name, all separately selected high-resolution pages, full document text/assets, aggregate page coverage, and final-page QR.

A local syntax check is not a browser pass. See CI result.json and screenshots/downloads for executed evidence. Independent renderer fixtures from design approval remain unchanged outside this test bundle.

## Fixture provenance

CI generates fresh minimal cases from existing game factory, catalog and explicit constants in generate-fixtures.test.ts. The generator reads no prior JSON, personal save, screenshot or external input. Generated JSON stays ephemeral/gitignored. Financial fields are fictional game-currency constants required by the game schema, not real accounts. The public test bundle does not include historical design-demo save JSON.
