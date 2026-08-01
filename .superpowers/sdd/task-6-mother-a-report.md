# Task 6C1 Report: Mother — Care, Protection, and Defense

Date: 2026-08-01

## Delivered

Completed the first Mother lifecycle batch as nine canonical exact-spread manuscripts:

- Mother, Engulfing Mother, Unavailable Mother (`absent-mother` slug)
- Guardian, Controlling Sentinel, Open Gate
- Warrior, Rampaging Warrior, Disarmed Warrior

Each entry now has two exact verified quotations, one independent verified mythic resonance, a seven-row profile with the literal parent-linked balance equation, calibrated field-guide prose, declarations, concrete shared practices, opposite-shadow mechanics, and grounded return language. Mythic names appear in reader-facing copy only in the profile row.

The approved Maiden and Lover manuscripts were not edited. The remaining Mother entries, later lifecycles, front/back matter, artwork, print tooling, and sibling repository were not edited.

## Research and Editorial Results

- Added 18 unique quotation records and nine unique mythic-resonance records while preserving existing ledger prefixes.
- Added focused regression coverage for assignment counts, uniqueness, source limits, exact restoration risks, Mulan version/rights limits, canonical printed titles, and manuscript source IDs.
- Resolved all 18 quotations in nonempty source bodies and matched their exact normalized text. Resolved all nine myth sources in nonempty primary source bodies.
- Confirmed 234 unique declaration strings and 197 unique practice strings across all 27 verified entries, with no exact reuse.
- Compared 44,692 eligible batch/approved paragraph pairs; none reached Jaccard `0.55` (maximum `0.286`).
- Appended the complete developmental, anti-fluff/redundancy, line, copy, source-selection, and production record to `editorial/lifecycle-review.md`.

## Exact-Spread Results

| Entry | Pages | Final fill | Blank pages | Overflow | Compiled span |
| --- | ---: | ---: | --- | ---: | --- |
| Mother | 2 | 0.8634 | none | 0 | 2–3 |
| Engulfing Mother | 2 | 0.8161 | none | 0 | 4–5 |
| Unavailable Mother | 2 | 0.8369 | none | 0 | 6–7 |
| Guardian | 2 | 0.9128 | none | 0 | 2–3 |
| Controlling Sentinel | 2 | 0.8161 | none | 0 | 4–5 |
| Open Gate | 2 | 0.7658 | none | 0 | 6–7 |
| Warrior | 2 | 0.8248 | none | 0 | 2–3 |
| Rampaging Warrior | 2 | 0.7677 | none | 0 | 4–5 |
| Disarmed Warrior | 2 | 0.8142 | none | 0 | 6–7 |

All 18 rendered pages were visually inspected at 120 DPI. Quotation lineation, attribution, artwork/profile hierarchy, headings, column flow, paragraph continuity, and page furniture are intact; no clipping, collision, blank page, overflow, literal Markdown, orphaned heading, or conspicuous imbalance remains.

## Verification

- `node --test test/mother_research.test.js`: 5/5 passed.
- `npm run content:check`: 109/109 Node tests passed; structural validation passed; generated data in sync.
- `npm run build`: passed.
- `python3 -m unittest test.test_pdf_metrics test.test_generate_book test.test_spread_tools`: 24/24 passed.
- `npm run content:publish-check`: Node suite passed 109/109; publish validation failed only for the untouched remaining Mother entries and Queen/Crone entries, as expected. None of the nine delivered spreads appeared in the failure list.
- `book:validate --entry mother --validate`: passed standalone and compiled validation.
- `book:validate --entry guardian --validate`: passed standalone and compiled validation.
- `book:validate --entry warrior --validate`: passed standalone and compiled validation.

## Residual Scope

Peacemaker, Community Weaver, Host and their shadows remain pending for Task 6C2. Queen and Crone entries also remain outside this batch. No push was performed.
