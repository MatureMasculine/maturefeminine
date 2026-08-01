# Task 5 Implementation Report — Exact-Spread Infrastructure

## Scope and assumptions

- Implemented directly on `main` from base `79ddffa`.
- Kept `src/_data/archetypes.json` as the sole runtime content input. The print generator no longer reads `group_*.json`, embedded shadows, or `siteContent.json`.
- Targeted the verified Lover trio for passing spread calibration. No canonical prose was changed because the global layout reached the required fit without editorial padding or cuts.
- Installed `PyMuPDF==1.26.7` user-locally for this environment after the managed Python installation required `--break-system-packages`; the pinned requirement is recorded in `book/requirements-print.txt`.

## Implementation

- Replaced the obsolete print generator with normalized first-class entry rendering.
  - `render_entry(entry_slug, output_path)` renders both archetypes and shadows standalone.
  - `--entry SLUG` selects an archetype plus its active/passive shadows; a shadow selects itself.
  - Compiled entries use labeled start/end anchors. Blank pages are inserted only when required to make starts even; `spread-manifest.json` records anchor-derived start/end, page count, and parity.
- Added configured PyMuPDF measurement in `pdf_metrics.py`.
  - `SpreadMeasurement` has the required immutable fields.
  - Metrics inspect text and image blocks inside configured content bounds, ignore outside furniture, flag bottom-boundary overflow, require two nonblank pages, and apply explicit final-fill bounds.
- Added non-mutating spread tools.
  - `adjust_content_size.py`: standalone render/measurement, JSON and Markdown reports, `--entry`, `--all`, `--json`, and `--validate`; editorial direction only, no Markdown mutation or hosted/editor/API integration.
  - `validate_spreads.py`: validates standalone metrics and compiled anchor parity; exits nonzero under `--validate` when an invariant fails.
- Added `book:measure`, `book:spreads`, and `book:validate` commands; ignored local PDFs, manifests, build output, reports, and Python bytecode.
- Added PyMuPDF fixtures/tests for two-page, one-page, three-page, blank-second-page, sparse-second-page, and bottom-overflow PDFs, plus focused normalized entry, standalone-render, title, report, and anchor tests.

## TDD evidence

1. Created `test/test_pdf_metrics.py` before `pdf_metrics.py`; observed `ModuleNotFoundError: No module named 'pdf_metrics'`.
2. Created `test/test_generate_book.py` before generator APIs; observed missing `select_entries`, `lookup_entry`, `manifest_from_aux`, and `render_entry` attributes.
3. Created `test/test_spread_tools.py` before spread tools; observed `ModuleNotFoundError: No module named 'adjust_content_size'`.
4. Added a title expectation after visual QA identified its absence; observed the expected missing `\\section*{Lover}` assertion, then restored the canonical title.
5. Added the machine-readable JSON report test before `console_report`; observed the missing import, then made direct `--json` output valid JSON.

## Verification

All commands below passed:

```sh
python3 -m unittest test/test_pdf_metrics.py test/test_generate_book.py test/test_spread_tools.py -v
npm run content:check
npm run book:check
npm run book:measure -- --entry lover
npm run book:spreads -- --entry lover
npm run book:validate -- --entry lover
npm run book:build
git diff --check
```

Results:

- Python: 15 tests passed.
- Node/content: 86 tests passed; structural validation confirmed 5 lifecycle groups, 22 archetypes, and 44 shadows with generated data in sync.
- Full normalized book PDF compiled: 66 entries.
- Lover trio standalone measurements (two pages, no blank pages, zero overflow):
  - `lover`: final fill `0.8496`.
  - `enmeshing-lover`: final fill `0.8037`.
  - `armored-lover`: final fill `0.8203`.
- Compiled Lover anchor spans: `lover` 2–3, `enmeshing-lover` 4–5, `armored-lover` 6–7; every start is even and every end is odd.
- Visually inspected both standalone Lover pages rendered at 120 DPI. The title, quotations, image, profile, two-column body, and footer are visible and unclipped.

Sample generated artifacts (ignored):

- `book/print-pdf/.latex-build/measurements/spread-measurements.{json,md}`
- `book/print-pdf/.latex-build/validation/spread-validation.{json,md}`
- `book/mature-feminine.pdf`

## Self-review and remaining risk

- No hosted API dependency, key check, Anthropic import, prose mutation, generated-data edit, virtual environment, or sibling-repository dependency was added.
- The full book compiles, but only the independently approved Lover trio was run through exact-spread validation. Pending entries are intentionally not represented as publication-ready; later tasks must run `--all`, resolve any failures, and complete content/research/image readiness before claiming print readiness.

## Review remediation (post-`66339ea`)

- Replaced the symmetric measurement rectangle with parity-aware body rectangles and a configured 2-point overflow tolerance.
- Every text or image block outside any body edge is overflow. The only ignored outside-body block is a narrow configured exception: centered, wholly-below-body text containing only a 1–4 digit page number. Arbitrary below-body text is overflow.
- Final-page fill uses the selected physical page's body rectangle and clipped in-body blocks, so it remains deterministic for asymmetric pages.
- Corrected LaTeX escaping so literal source backslashes become `\\textbackslash{}` without exposing raw TeX. Quote rendering preserves source line breaks, keeps the blank-line attribution separation, and translates only simple canonical `*work title*` attribution spans into escaped `\\emph{...}`.
- Raised the shared lower fill bound to `0.75`. `editorial_direction()` now reads both configured fill bounds.
- Did not add dedication or lifecycle front matter. Those canonical sources are intentionally deferred to Task 7, which owns the exact dedication and lifecycle explanation. The Task 5 title/entry compilation scaffold remains only a structural development artifact and is not publication-ready front matter.

### RED → GREEN evidence

- RED command: `python3 -m unittest test/test_pdf_metrics.py test/test_generate_book.py test/test_spread_tools.py -v`.
- RED failures were expected: wholly-below, odd-left, even-right, and image overflow blocks were missed; verse lineation and safe italic attribution rendering failed; and the configured upper-fill editorial direction fell through to the generic review message.
- GREEN: the same command passed with **23 Python tests**. The focused fixtures now cover wholly-below body text, odd-page left overflow, even-page right overflow, even-page image overflow, and the narrowly ignored numeric footer, in addition to the original page-count/blank/sparse/bottom-overflow cases.

### Final verification

- Passed: Python focused tests, `npm run content:check`, `npm run book:check`, `npm run book:measure -- --entry lover`, `npm run book:spreads -- --entry lover`, `npm run book:validate -- --entry lover`, `npm run book:build`, and `git diff --check`.
- Node/content: 86 tests passed; generated data remained in sync.
- Lover trio standalone measurements: `lover` `0.8496`, `enmeshing-lover` `0.8554`, and `armored-lover` `0.8839`; all are two pages with no blank pages and zero overflow under the `0.75–0.95` shared fill band.
- Compiled anchor spans remained `lover` 2–3, `enmeshing-lover` 4–5, and `armored-lover` 6–7; every start is even and every end is odd.
- Rebuilt the full 66-entry normalized PDF successfully.
- Rendered and visually inspected all six Lover-trio pages at 120 DPI. Browning, Teasdale, and Dickinson lineation is preserved; attributions are separated and long-work titles render in italics; no literal Markdown asterisks, clipping, or page-furniture false positives were observed.

## Final attribution-font remediation (post-`a6bdd34`)

- RED: added a rendered-PDF regression test that compiles `render_quote()` and inspects PyMuPDF font spans. It failed because attribution prose used `TeXGyrePagella-Italic`; this was an observed font result, not a TeX-token assertion.
- GREEN: scoped `\\normalfont` to the attribution before supported `\\emph{...}` work-title rendering. The compiled-PDF test now proves verse is italic, attribution prose is upright, and the `*Book Title*` span is italic. Literal source escaping remains covered by the existing test.
- Verification passed: 24 Python tests; 86 Node/content tests; `npm run book:measure -- --entry lover`; `npm run book:validate -- --entry lover`; and a full 66-entry `npm run book:build`, plus `git diff --check`.
- Final trio results remain unchanged: fills `0.8496`, `0.8554`, and `0.8839`; compiled anchors `2–3`, `4–5`, and `6–7` (all even-to-odd). No prose or per-entry typography changed.
- Rendered and visually inspected all six Lover-trio pages at 120 DPI: verse lineation remains intact, attribution prose is upright, long-work titles are italic, literal asterisks are absent, and no clipping is visible. Front matter remains intentionally deferred to Task 7.
