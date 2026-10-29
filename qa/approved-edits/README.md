# Seven approved local changes: independent component layout QA

Authority: approved review pages 01–07, identity variant 04A. Baseline restored v3.1.2 / eb2f252; not the rejected v3.2.0 branch.

Fresh anonymous game-factory inputs are server-rendered to disposable local HTML. No user saves, browser storage injection, or private screenshots in repository. Generated HTML/artifacts are not source deliverables.

Matrix: 12 scenarios × (320/375/390/430 CSS px at normal and text-only 200%, plus520/521/600/760/820/821/1188 normal) =180 cases. Text-only200% is an approximation, not real iOS or device zoom. Native real UI smoke and retirement4case tests are separate.

Checks:01 desktop report12px gap/14px top;02 desktop section12+12 and old mobile unchanged;03 academy3columns/all5comparison fields;04A player/team/cash positions and full long-name/large-cash wrapping;05 parent8/child6 and seven data columns;06 arrival2×2/main13/risk≥9;07 strategy3/training3×2/main12.5/effects≥9.5/selected explanations. Event2/3horizontal and transfer horizontal retained as out-of-scope guards. No global14/16font minimum or task-first/stacked-transfer assertion from rejected3.2.0.

Screenshots must additionally be reviewed against approved illustrations: passing geometry does not establish design fidelity. Full-page height is recorded for layout inspection, not asserted to fit one phone screen.

Desktop arrival1188 overflow is compared to exact restored-baseline CareerHub/CSS rendered from the same synthetic fixture in officialCI. A baseline-equivalent existing overflow is explicitly recorded with both screenshots; it is not claimed fixed or a clean full-site accessibility result. New/increased overflow still fails. Initial0e3cb0f failure artifacts remain retained.
