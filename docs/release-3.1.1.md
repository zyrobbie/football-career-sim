# 3.1.1 — Mobile-readable career archive

## Changes

- Refreshed retirement poster with a mobile-first, single-column layout, larger supporting text and top safe space.
- Read the full archive at a normal width in a vertically scrollable viewport on phones, tablets and desktop screens.
- Preserved career sections, statistics, club records, honors and explained career tags.
- Off-field memories identify the year and concrete event in a concise sentence. Subscription and refund notices are excluded from the summary, without changing the financial ledger.
- Normal careers export as a lossless PNG. Oversized archives offer individually downloadable high-resolution parts rather than reducing text below the readability floor or truncating records.
- Keyboard navigation, close/reopen behavior and a text archive remain available.

Save schema and game simulation rules are unchanged.

## Validation

The release candidate is checked with the complete unit suite, TypeScript and production build. The browser workflow uses synthetic saves in isolated contexts to verify Chromium phone/tablet/desktop layouts, mobile WebKit, actual PNG downloads, QR codes and oversized archives. Browser emulation is not physical-device testing.

See the GitHub Actions results for the exact candidate commit before deploying. This document alone is not a claim that a pending check has passed.
