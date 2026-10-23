# V3 visual stage A: implementation direction and evidence contract

Date: 2026-10-23. Status: specifications established, candidate visual acceptance pending. Source reference: 37411e336d1b837e99720bb444eb0b0761eb852e, V2.5.0. Production code belongs to the developer. This role writes only QA scripts, fixtures, screenshots, and reports outside src.

## Observed reference

Manually inspected original 390×844 age30 and age31 training-control PNGs and 1280×720 age31 first viewport. Existing paper background, serif headings, dark ink, thin rules, and compact three-column strategy/training controls remain the visual identity. Club themes are different in the two age fixtures; those screenshots do not establish age-only equivalence. docs/51 overrides the older docs/04 density direction.

## Concrete implementation decisions

- Embed one optional PersonalArrangementsPanel after CareerPreferencesEditor and before training strategies. Default entry uses a title/status line and cash/active-service summary, with one 44px-or-taller expand control. Normal height target 44–64px; multiple services may add a line.
- Use local .personal-arrangements and .v3-* classes only. Do not alter generic .event-summary, .choice-list, body typography, report tables, or existing career header sizes.
- Use existing --paper, --paper-muted, --ink, --text, --muted, --line, --positive, --negative tokens. Borders 1px, radius0 or neighboring small radius, no new shadows or decorative backgrounds. A selected entry needs a check/radio indicator as well as ink border and pale theme-colored background.
- Type selector is always repeat(3,minmax(0,1fr)); each control min-height44px. Tier rows are always vertical; selected type displays only its three tiers. Tier name12px/1.35 weight600–700; price12px; effect11–12px/1.4; body/confirmation/reasons12px/1.4–1.5. Internal spacing4/6/8px and padding8px; typical tier rows56–76px but natural height for long text.
- Inline confirmation uses a definition-list-like stack: full category/tier, full euro price, current→after cash, each period × count and theoretical total, real start window, cap/eligibility/refund conditions. Submit text repeats exact price. Keep cancel/free continue visible. No receive/redeem button.
- Annual purchase status is separate from cash and each service’s pending period count. Settlement separately names nominal contribution, actual contribution, post-execution remaining periods, refunds, and entire-half-year net changes.
- All layout children min-width0. Prose white-space:normal and overflow-wrap:anywhere only as needed for long Latin strings. No ellipsis/line-clamp/fixed-height clipping for prices, reasons, confirmation, actual results, or stories. Short amounts/period tokens may be indivisible spans but whole groups may wrap.
- Same styles at ages30/31/33/34. Age alters content/count only. Three available training choices remain one horizontal row rather than three large stacked cards.
- Mobile CTA must be verified by viewport screenshots at both entry and scroll-to-actions, not inferred from full-page captures where fixed navigation can misleadingly appear in the middle.

## Fixture and capture protocol

1. Use anonymous saves in fresh isolated cloud Chromium contexts. Never open a user browser profile or real save.
2. Freeze one normalized V2.5 save as controlled common input. Construct ages30/31/33/34 by changing only windowIndex to34/36/40/42; keep club, theme, name, states, contract, and history equal. Label as synthetic layout comparisons, not natural gameplay progression.
3. Capture same fixtures against immutable V2.5 source archive and candidate. Record input SHA, candidate source fingerprints, viewport, club/theme, scrollY, console/page errors, and actual DOM measurements.
4. Separately exercise public gameplay next-window transitions for30→31 and33→34. Do not confuse synthetic comparisons with public progression evidence.
5. Primary widths390/402; boundaries320/375/430 and desktop1280/1366. Nine tier selections, balance0/insufficient/exact, cap/partial/zero, annual-used with old service, cross-year, dual services, same/changed/unknown city, interruption/refund, long events/history/retirement, three theme families, actual exported PNG.
6. Record title/font-size/line-height/padding/gap/columns; strategy region≤170px, six-choice training grid≤210px, recovery≤160px, old default plan≤750px at390/402. New collapsed entry counted separately. Exceedance triggers screenshot-based review, not automatic hiding or font shrink.
7. Stable accessible names or data-testid requested for entry/category/tier/confirm/status/settlement. Test-generated saved snapshots and fixture constructors are acceptable only when explicitly labeled synthetic, not described as natural play.

## Browser route

The earlier baseline documented CUA cloud-CDP localhost ERR_CONNECTION_REFUSED and command-sandbox Chromium socket failure; isolated Playwright running from the supported cloud desktop terminal succeeded. Reuse that permitted cloud-only route for localhost capture; no user-local fallback. Current available cloud desktop was verified and a dedicated terminal opened. Existing dependencies are reused; no dependency install or production debug switch.

## Acceptance discipline

Build/test success is not visual acceptance. Every claimed visual surface must be manually inspected from a real rendered screenshot. Browser UI claims need actual click and persisted-state evidence. Linux Chromium does not establish iPhone Safari, WeChat, or real-device behavior. Any untested branch stays explicitly pending.
