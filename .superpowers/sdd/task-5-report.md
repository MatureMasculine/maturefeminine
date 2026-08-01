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
