# V3.0.1 interaction feedback implementation acceptance

Runtime tested: `934a1117573fd790171acf3937745d49ba4563cd`. App 3.0.1, save/data schema 14/14. Later candidate commits change only QA tooling and documentation.

## Requirement mapping

1. Shared event cards use actual visible option counts, retaining two or three choices in a horizontal row. Both stages of legacy interactions use their own count. Text wraps fully rather than being ellipsized or clamped.
2. Story-choice effects show affected metrics and qualitative directions rather than exact stat/cash changes. Story expenses say cash decreases. Personal-arrangement product prices remain visible; exact settled results remain visible and persisted. Existing risk probabilities remain meaningful probability disclosure, not numeric stat deltas.
3. The bottle event now concerns a just-signed personal mineral-water sponsor and a competitor's bottle in the press-conference shot. Ignore: media +1 / one-time sponsorship settlement -€200; turn logo away: media -1 / +€400; drink: media +2 / -€400. New scheduling requires €400 so all three options are available and settle accurately. Wages, attributes, potential and recurring income are unchanged.
4. Shared lower event lead/card/result copy and mobile arrangement/history/training copy use compact scales aligned with upper status labels. Hero player metrics are unchanged.

## Save compatibility

Completed titles and effects render from saved records. Old unselected low-cash bottle saves retain the original free scene, avoiding unavailable choices or unexpected charges. Funded unselected saves can display the corrected scene. Historical MOVE/JOKE/STAFF selections retain their original definition during result validation; completed-node bookkeeping accepts those historical choices. No history is rewritten and no schema migration is introduced.

## Checks

- PASS: TypeScript, production build, club parameter consistency, retirement QR verification and whitespace validation.
- PASS: 91 focused assertions covering previews, actual column count, sponsor outcomes, all three old low-cash choices, public save/reload/continue and no repeated settlement.
- PASS: full regression, 93 files / 1,180 tests, 711.40 seconds, four workers. No exclusions added.
- PASS: independent strategy review, 9 checks.
- PASS: isolated Mac Chromium candidate visual matrix, 32 cases and zero browser errors; actual original screenshots inspected by the executing reviewer. See README for matrix, fixture correction and evidence-transfer limits.

The approximately 1.1 MB main JavaScript chunk retains the existing size warning. Physical-device behavior and production deployment are not claimed by this implementation acceptance document.
