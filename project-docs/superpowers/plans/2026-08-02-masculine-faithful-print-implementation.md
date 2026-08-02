# Masculine-Faithful Print Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current feminine banner-and-card spread with a locally self-contained renderer that reproduces the Mature Masculine typography, geometry, tall image rail, black floral profile panel, quote hierarchy, drop caps, headings, and folios while preserving exact two-page facing spreads.

**Architecture:** Keep canonical Markdown and normalized generated data as the content source. Localize the masculine fonts and ornaments under the feminine print directory, render the opener and profile rail directly in LuaLaTeX, and let one `multicols` flow carry the body from the first-page right column into both columns of the facing page. Extend the existing PyMuPDF metrics so visual furniture, text bounds, black profile presence, font embedding, and even-to-odd anchors are independently validated.

**Tech Stack:** CommonJS Node.js content parser and tests, Python 3, LuaLaTeX, PyMuPDF, `fontspec`, `graphicx`, `multicol`, `tikz`, `tcolorbox`, `lettrine`, `needspace`, `fontawesome5`, `fancyhdr`, and `microtype`.

## Global Constraints

- Page size is US Letter, 8.5 × 11 inches, with 0.75-inch inner/top/bottom margins, a 0.65-inch outer margin, and a 0.30-inch column gap.
- Entry titles use localized Cinzel Decorative Bold at 20/24 pt; body copy uses Palatino at 9.5/11.4 pt; no entry-specific typography or geometry override is allowed.
- The opener rail is globally fixed at 7.90 inches: 5.25 inches of cropped artwork plus a 2.65-inch black profile panel.
- The profile panel contains exactly Lifecycle stage, Core function, Balanced qualities, Active shadow, Passive shadow, Mythic resonances, and Key qualities, in that order.
- Shadow Key qualities are five to eight compact source-authored phrases, not copied Recognition paragraphs; each phrase is at most 28 characters and the comma-joined value is at most 160 characters.
- Every standalone entry remains exactly two nonblank pages; compiled entries begin even and end odd.
- The feminine renderer has no runtime dependency on `../maturemasculinedeck`, a browser, a remote stylesheet, Anthropic, or network access.
- Generated JSON is derived only through `npm run content:sync`; never hand-edit it.
- Preserve all existing and in-progress Mother manuscript changes; stage only task-owned paths and hunks.
- Do not modify the sibling masculine repository.

---

### Task 1: Localize and validate the masculine print assets

**Files:**
- Create: `book/print-pdf/assets/fonts/CinzelDecorative-Regular.ttf`
- Create: `book/print-pdf/assets/fonts/CinzelDecorative-Bold.ttf`
- Create: `book/print-pdf/assets/fonts/OFL.txt`
- Create: `book/print-pdf/assets/ornaments/grasswide1.png`
- Create: `book/print-pdf/assets/ornaments/grasswide2.png`
- Create: `book/print-pdf/assets/ornaments/grasswide3.png`
- Create: `book/print-pdf/assets/ornaments/grasswide4.png`
- Create: `book/print-pdf/assets/ornaments/grasswide5.png`
- Create: `book/print-pdf/assets/ornaments/endofchapter.png`
- Create: `book/print-pdf/assets/lettrine.cfl`
- Modify: `book/print-pdf/print_config.json`
- Modify: `book/print-pdf/generate_book.py`
- Modify: `test/test_generate_book.py`

**Interfaces:**
- Consumes: source assets from the read-only masculine sibling.
- Produces: `required_print_assets(config: dict[str, Any]) -> dict[str, Path]`, which resolves every runtime asset inside `book/print-pdf/assets/` or fails with the missing relative path.

- [ ] **Step 1: Write the failing asset-preflight test**

Add to `test/test_generate_book.py`:

```python
def test_required_print_assets_are_local_and_complete(self) -> None:
    assets = generate_book.required_print_assets(generate_book.read_json(generate_book.CONFIG_PATH))

    self.assertEqual(
        set(assets),
        {"title_regular", "title_bold", "font_license", "grasswide1", "grasswide2", "grasswide3", "grasswide4", "grasswide5", "end_ornament", "lettrine_config"},
    )
    for path in assets.values():
        self.assertTrue(path.is_file())
        self.assertTrue(path.is_relative_to(generate_book.SCRIPT_DIR))
        self.assertNotIn("maturemasculinedeck", str(path))
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
python3 -m unittest test.test_generate_book.GenerateBookTests.test_required_print_assets_are_local_and_complete -v
```

Expected: FAIL because `required_print_assets` does not exist.

- [ ] **Step 3: Copy the approved binary assets without touching the sibling**

Copy the exact files named in the task into the new local asset directories. Record SHA-256 hashes for source and destination and assert they match. Copy `lettrine.cfl` from the masculine print directory. Obtain `OFL.txt` from `https://raw.githubusercontent.com/google/fonts/main/ofl/cinzeldecorative/OFL.txt`, verify that its heading identifies the SIL Open Font License, and record that source URL and retrieval date in `book/README.md`. Do not copy `innermap.jpg`, masculine prose, metadata, or unused grass variants.

- [ ] **Step 4: Add exact visual constants to `print_config.json`**

Replace the current geometry and type values with:

```json
{
  "page": {
    "width": "8.5in",
    "height": "11in",
    "insideMargin": "0.75in",
    "outsideMargin": "0.65in",
    "topMargin": "0.75in",
    "bottomMargin": "0.75in"
  },
  "layout": {
    "columns": 2,
    "columnGap": "0.30in",
    "paragraphSpacing": "0.10in",
    "artworkHeight": "5.25in",
    "profileHeight": "2.65in",
    "railHeight": "7.90in",
    "titleQuoteGap": "0.25in",
    "quoteBodyGap": "0.40in"
  },
  "type": {
    "bodySize": 9.5,
    "bodyLeading": 11.4,
    "chapterSize": 20,
    "chapterLeading": 24,
    "sectionSize": 9.5,
    "subsectionSize": 10.5,
    "quoteSize": 10,
    "quoteLeading": 12,
    "profileSize": 7.6,
    "profileLeading": 9.2,
    "folioSize": 9
  }
}
```

Preserve and update the `metrics` block in Task 4 rather than deleting it.

- [ ] **Step 5: Implement local preflight**

Add constants and resolver:

```python
ASSET_DIR = SCRIPT_DIR / "assets"

def required_print_assets(config: dict[str, Any]) -> dict[str, Path]:
    relative = {
        "title_regular": Path("fonts/CinzelDecorative-Regular.ttf"),
        "title_bold": Path("fonts/CinzelDecorative-Bold.ttf"),
        "font_license": Path("fonts/OFL.txt"),
        **{f"grasswide{i}": Path(f"ornaments/grasswide{i}.png") for i in range(1, 6)},
        "end_ornament": Path("ornaments/endofchapter.png"),
        "lettrine_config": Path("lettrine.cfl"),
    }
    missing = [str(path) for path in relative.values() if not (ASSET_DIR / path).is_file()]
    if missing:
        fail("missing local print assets: " + ", ".join(missing))
    return {name: ASSET_DIR / path for name, path in relative.items()}
```

Call it from `write_tex` before copying entry images.

- [ ] **Step 6: Run tests and commit**

Run:

```bash
python3 -m unittest test.test_generate_book -v
git diff --check
```

Expected: all print-generator tests pass and diff check is silent.

Commit only Task 1 paths:

```bash
git add book/print-pdf/assets book/print-pdf/print_config.json book/print-pdf/generate_book.py test/test_generate_book.py
git commit -m "feat: localize masculine print assets"
```

### Task 2: Make shadow profile qualities compact canonical metadata

**Files:**
- Modify: `scripts/content_markdown.js`
- Modify: `test/content_markdown.test.js`
- Modify: `content/*/shadows/*.md`
- Regenerate: `src/_data/archetypes.json`
- Regenerate: `src/_data/group_*.json`

**Interfaces:**
- Consumes: a pipe-delimited `keyQualities` front-matter scalar on every shadow.
- Produces: `entry.keyQualities: string[]` and `entry.profile.keyQualities === entry.keyQualities.join(", ")` for both archetypes and shadows.

- [ ] **Step 1: Write failing parser and validator tests**

Update the shadow fixture in `test/content_markdown.test.js` with:

```text
keyQualities: Controlling|Hypervigilant|Intrusive|Distrustful|Preemptive
```

Assert:

```js
assert.deepEqual(shadow.keyQualities, ["Controlling", "Hypervigilant", "Intrusive", "Distrustful", "Preemptive"]);
assert.equal(shadow.profile.keyQualities, shadow.keyQualities.join(", "));
```

Add a negative fixture with four qualities and assert publish validation contains `shadow key qualities must contain 5–8 items`.

Add negative fixtures for a 29-character phrase and a comma-joined value over 160 characters. Assert publish validation reports `shadow key quality must be at most 28 characters` and `shadow key qualities must be at most 160 characters joined` respectively.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```bash
node --test test/content_markdown.test.js
```

Expected: FAIL because shadows do not parse `keyQualities` and validation still compares the profile with Recognition prose.

- [ ] **Step 3: Implement the normalized shadow field**

In `parseShadowFile`, add:

```js
keyQualities: pipeList(required(data, "keyQualities", file)),
```

Replace the Recognition-derived validation with:

```js
if (entry.profile.keyQualities !== entry.keyQualities.join(", ")) {
  failures.push(`${label} profile key qualities drift`);
}
if (publish && (entry.keyQualities.length < 5 || entry.keyQualities.length > 8)) {
  failures.push(`${label} shadow key qualities must contain 5–8 items`);
}
if (publish && entry.keyQualities.some((quality) => quality.length > 28)) {
  failures.push(`${label} shadow key quality must be at most 28 characters`);
}
if (publish && entry.keyQualities.join(", ").length > 160) {
  failures.push(`${label} shadow key qualities must be at most 160 characters joined`);
}
```

- [ ] **Step 4: Migrate all 44 shadow sources**

Add five to eight compact, behaviorally precise `keyQualities` values to each shadow's front matter and print the same comma-separated values in its Profile. Keep every phrase at or below 28 characters and every joined value at or below 160 characters. Do not shorten or remove the full Recognition section. Preserve all approved Mother prose and research fields.

- [ ] **Step 5: Regenerate data and run all content gates**

Run:

```bash
npm test
npm run content:sync
npm run content:check
git diff --check
```

Expected: all tests pass, 22 archetypes and 44 shadows validate structurally, and generated data is synchronized.

- [ ] **Step 6: Commit**

Stage the parser, tests, all shadow Markdown, and generated JSON. For any shadow file containing pre-existing manuscript changes, stage only the `keyQualities` front-matter and Profile hunks; do not sweep unrelated prose into this commit.

```bash
git commit -m "feat: compact shadow profile qualities"
```

### Task 3: Render the masculine-faithful opener and continuation

**Files:**
- Modify: `book/print-pdf/generate_book.py`
- Modify: `test/test_generate_book.py`

**Interfaces:**
- Consumes: normalized entries, localized assets, and exact layout/type config.
- Produces: `render_opening_quote`, `render_profile_panel`, `render_artwork_rail`, `apply_drop_cap`, and one two-page `render_entry_content` flow.

- [ ] **Step 1: Add failing structural renderer tests**

Add tests asserting that rendered Lover TeX:

```python
content = generate_book.render_entry_content(generate_book.lookup_entry("lover"), "images/lover.jpg", 0)
self.assertIn(r"\EntryTitle{Lover}", content)
self.assertIn(r"\OpeningQuote", content)
self.assertIn(r"\ArtworkRail", content)
self.assertIn(r"\columnbreak", content)
self.assertIn(r"\lettrine[lines=3]", content)
self.assertEqual(content.count("Lifecycle stage"), 1)
self.assertNotIn("FeminineMist", content)
```

Add a shadow test asserting `Active Shadow` is centered before the opening quote and all seven profile labels appear exactly once.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```bash
python3 -m unittest test.test_generate_book -v
```

Expected: FAIL because the masculine-faithful renderer macros and `variant_index` argument do not exist.

- [ ] **Step 3: Implement quote balancing and drop-cap selection**

Port the masculine `_balance_quote_text` behavior into a pure helper. Add `apply_drop_cap` that scans rendered body sections for the first prose paragraph, leaves headings and lists untouched, and emits:

```tex
\lettrine[lines=3]{T}{he} rest of the first word...
```

If the first eligible word does not begin with an ASCII capital, leave it unchanged and record no drop cap rather than corrupting source punctuation.

- [ ] **Step 4: Implement the direct-LaTeX profile panel**

Emit a fixed-height near-black `tcolorbox` with seven rows. Use `fontawesome5` icons, white labels/values, muted gray icons, 0.15-inch horizontal padding, 0.12-inch top padding, and a 0.52-inch lower floral reserve. Overlay `grasswide{variant}.png` at the bottom edge. Escape all entry values with `tex()`.

Variant is deterministic:

```python
variant = variant_index % 5 + 1
```

- [ ] **Step 5: Implement the fixed artwork rail**

Use TikZ clipping so every source image fills the 5.25-inch portrait frame without stretching. Center the crop. Join the image and profile with the masculine `\vspace{-3pt}` seam treatment and no border, rounded corner, or caption.

- [ ] **Step 6: Replace the entry layout and preamble**

Replace the horizontal banner and rose profile card with:

```tex
\EntryTitle{...}
\OpeningQuote{...}{...}
\vspace{0.40in}
\begin{multicols}{2}
  \ArtworkRail{...}
  \columnbreak
  \BodyFont ...
  \ClosingQuote{...}{...}
\end{multicols}
```

Localize fonts and `lettrine.cfl` into the build directory, set Palatino as the main face, define Cinzel Decorative from the copied files, add `lettrine`, `needspace`, and `fontawesome5`, and reproduce the masculine chapter-start/continuation page styles.

- [ ] **Step 7: Run unit tests and a TeX smoke build**

Run:

```bash
python3 -m unittest test.test_generate_book -v
npm run book:check
npm run book:build -- --entry lover --output book/print-pdf/.latex-build/design-lover.pdf
```

Expected: tests pass; generated TeX contains no sibling path or HTTP URL; the Lover trio compiles.

- [ ] **Step 8: Commit**

```bash
git add book/print-pdf/generate_book.py test/test_generate_book.py
git commit -m "feat: match masculine entry spread design"
```

### Task 4: Extend numerical validation for the new visual grammar

**Files:**
- Modify: `book/print-pdf/pdf_metrics.py`
- Modify: `book/print-pdf/validate_spreads.py`
- Modify: `book/print-pdf/print_config.json`
- Modify: `test/test_pdf_metrics.py`
- Modify: `test/test_spread_tools.py`

**Interfaces:**
- Consumes: standalone PDFs and compiled anchor manifest.
- Produces: `measure_pdf(path, config_path=CONFIG_PATH, expected_entry=None, physical_start_page=2) -> SpreadMeasurement`, covering text/image bounds, black-panel presence, artwork presence, font embedding, opening/closing quote page placement, two-page count, blank pages, fill band, and compiled parity. Standalone page one is measured as physical even page 2.

- [ ] **Step 1: Write failing visual-structure metric fixtures**

Create PyMuPDF fixtures for: missing image, missing black panel, black panel outside bounds, page-one quote repeated on page two, missing closing quote on page two, and missing Cinzel font. Assert each fails with a distinct reason in the measurement result.

- [ ] **Step 2: Run metric tests and confirm RED**

Run:

```bash
python3 -m unittest test.test_pdf_metrics test.test_spread_tools -v
```

Expected: FAIL because `SpreadMeasurement` lacks visual-structure fields.

- [ ] **Step 3: Extend `SpreadMeasurement`**

Add immutable fields:

```python
visual_checked: bool
artwork_on_first: bool
black_panel_on_first: bool
opening_quote_first_only: bool
closing_quote_on_second: bool
required_fonts_embedded: bool
failure_reasons: tuple[str, ...]
```

Use normalized extracted text, image blocks, vector drawings, and `page.get_fonts(full=True)` as evidence. When `expected_entry` is supplied, set `visual_checked=True` and locate normalized opening- and closing-quote text from that record. When it is absent, preserve the generic page-count/fill/overflow fixture behavior with `visual_checked=False`; final entry validation must always supply the record. Map local page index zero to `physical_start_page`; use that physical parity for mirrored bounds. Keep numeric folio exclusion narrow enough to accept the centered page-one footer and outer page-two header without hiding arbitrary out-of-bounds text.

- [ ] **Step 4: Update exact physical bounds**

Set metric bounds from the final 0.75/0.65/0.75 geometry in PDF points and add explicit allowed regions for the centered first-page folio and outer continuation folio. Do not enlarge body bounds until failures disappear.

- [ ] **Step 5: Update reports and validators**

Include every visual-structure field and failure reason in JSON and Markdown reports. `--validate` exits nonzero for any failed visual, font, fill, page-count, overflow, blank-page, or parity invariant.

- [ ] **Step 6: Run focused tests and commit**

Run:

```bash
python3 -m unittest test.test_pdf_metrics test.test_spread_tools -v
git diff --check
```

Expected: all metric/report tests pass.

```bash
git add book/print-pdf/pdf_metrics.py book/print-pdf/validate_spreads.py book/print-pdf/print_config.json test/test_pdf_metrics.py test/test_spread_tools.py
git commit -m "test: validate masculine-faithful spread structure"
```

### Task 5: Calibrate and visually approve the Lover trio

**Files:**
- Modify only if substance requires fitting: `content/lover/archetypes/lover.md`
- Modify only if substance requires fitting: `content/lover/shadows/enmeshing-lover.md`
- Modify only if substance requires fitting: `content/lover/shadows/armored-lover.md`
- Modify: `editorial/calibration-notes.md`
- Create: `book/print-pdf/contact-sheets/lover-design.png`

**Interfaces:**
- Consumes: the finished renderer and validators.
- Produces: a visually inspected six-page Lover trio that establishes the global design constants for all remaining spreads.

- [ ] **Step 1: Render and validate all three entries**

Run:

```bash
npm run content:sync
npm run content:check
npm run book:validate -- --entry lover --output-dir book/print-pdf/.latex-build/design-lover
```

Expected: three standalone PDFs and one compiled trio are created. Record all failures before editing.

- [ ] **Step 2: Rasterize all six pages and create a contact sheet**

Rasterize the compiled trio at 150 DPI. Arrange pages in physical order without scaling individual pages differently. Save the final contact sheet at the required source path.

- [ ] **Step 3: Compare against the masculine reference**

Inspect title baseline, title-to-quote spacing, quote line balance and attribution, top of the image/body columns, image crop, black-panel height and seam, floral edge, profile wrapping, drop-cap size, body density, headings, list rhythm, closing quote, ornament, and both folio positions.

- [ ] **Step 4: Correct only global constants first**

If the trio shares a visual defect, adjust only the global renderer/config value responsible. Re-render all six pages after each global change. Once global geometry is locked, fit individual manuscripts by cutting redundancy or adding a genuinely missing distinction; never change per-entry type or geometry.

- [ ] **Step 5: Record visual evidence**

Extend `editorial/calibration-notes.md` with exact page-level findings, corrections, final font names/sizes, final rail dimensions, final profile size, final margins, embedded-font evidence, standalone metrics, compiled anchors, and an explicit statement that all six pages were inspected.

- [ ] **Step 6: Run the full calibrated gate and commit**

Run:

```bash
npm test
npm run content:sync
npm run content:check
npm run build
python3 -m unittest discover -s test -p 'test_*.py' -v
npm run book:validate -- --entry lover --output-dir book/print-pdf/.latex-build/design-lover-final
git diff --check
```

Expected: all tests and structural checks pass; every Lover standalone spread is exactly two nonblank pages; compiled anchors are 2–3, 4–5, and 6–7; visual-structure checks pass; the contact sheet has no unresolved defects.

```bash
git add content/lover editorial/calibration-notes.md book/print-pdf/contact-sheets/lover-design.png src/_data docs
git commit -m "feat: calibrate masculine-faithful Lover spreads"
```

### Task 6: Update print documentation and hand the design to whole-book fitting

**Files:**
- Modify: `book/README.md`
- Modify: `README.md`
- Modify: `.superpowers/sdd/progress.md`

**Interfaces:**
- Consumes: approved renderer, local assets, calibrated trio, and validation commands.
- Produces: current operator instructions and durable completion evidence for resuming the main field-guide plan.

- [ ] **Step 1: Correct the print README**

Document the local font/ornament paths, LuaLaTeX package prerequisites, page-one/page-two structure, exact-spread commands, contact-sheet location, and the rule that content rather than per-entry typography is edited for fit. Remove the obsolete statement that hero images are horizontal banners.

- [ ] **Step 2: Update the project README**

Link the canonical Markdown source, generated-data command, masculine-faithful print spec, build command, exact validator, and final PDF path. Do not claim the full book is publish-ready before Tasks 6–11 of the main plan pass.

- [ ] **Step 3: Record durable progress**

Append a reviewed task line to `.superpowers/sdd/progress.md` naming the styling commit range and clean review status. The next active main-plan item remains completion of the second Mother manuscript batch, now fitted against the approved renderer.

- [ ] **Step 4: Verify and commit**

Run:

```bash
npm run book:check
git diff --check
```

Expected: TeX prepares from local sources and diff check is silent.

```bash
git add README.md book/README.md .superpowers/sdd/progress.md
git commit -m "docs: document companion-volume print workflow"
```
