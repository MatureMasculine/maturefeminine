# Mature Feminine Field Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a researched, copy-edited, print-ready Mature Feminine lifecycle field guide in which every archetype and shadow is a standalone canonical Markdown entry and an exact two-page facing spread.

**Architecture:** Canonical Markdown lives under lifecycle directories, with separate `archetypes/` and `shadows/` sources and explicit parent-child references. A single parser builds normalized generated JSON for Eleventy and LuaLaTeX; validation checks taxonomy, research, images, and standalone/compiled pagination from those same records. Editorial ledgers record every taxonomy, quotation, mythic-source, artwork, and readiness decision without placing scholarly apparatus inside the reading experience.

**Tech Stack:** CommonJS Node.js content tooling, Eleventy 2, Nunjucks, Python 3, LuaLaTeX, PyMuPDF, Markdown, JSON.

## Global Constraints

- Work on `main`; preserve unrelated user changes and never modify `../maturemasculinedeck`.
- Canonical authoring is Markdown; never hand-edit generated JSON.
- Lifecycle order is Maiden → Lover → Mother → Queen → Crone and is explicitly non-linear, non-biological, and revisitable.
- Each archetype has one canonical name, one unique function, two complementary qualities, one active shadow, and one passive shadow.
- Each archetype and shadow has exactly two verified quotations, sourced mythic resonances, and one appropriate print-quality image.
- Each archetype and shadow begins on an even page, ends on the facing odd page, and occupies exactly two pages using global typography.
- Printed profile fields are limited to Lifecycle stage, Core function, Balanced qualities, Active shadow, Passive shadow, Mythic resonances, and Key qualities.
- The dedication is exactly `For my beloved,` followed by `and her root sisters.`
- No elements, directions, centers, power animals, separate virtue chapters, or separate skill chapters.
- Measurement and validation must work without Anthropic or another hosted editing API.

---

### Task 1: Lock the evidence-led taxonomy

**Files:**
- Create: `editorial/taxonomy-audit.md`
- Create: `editorial/canonical-taxonomy.md`
- Create: `editorial/migration-ledger.md`
- Create: `editorial/style-sheet.md`
- Reference: `content/*/*.md`
- Reference: `src/_data/images.json`
- Reference: `../maturemasculinedeck/ARCHETYPE_PILLARS.md`

**Interfaces:**
- Consumes: the 21 current archetypes, 42 current shadows, three previously retired-but-imaged entries, and the approved balance invariant.
- Produces: final lifecycle order, canonical slugs, parent/shadow relationships, legacy aliases, image remaps, and editorial conventions used by every later task.

- [ ] **Step 1: Inventory every current and historically relevant entry**

Record each current title, lifecycle, function, qualities, shadow names/slugs, image mapping, and status. Include Sage, Magician, and Storyteller because the repository retains their images and prior canonical data.

- [ ] **Step 2: Apply explicit survival tests**

For each archetype, answer: Is its function necessary? Is it distinct from every neighbor? Are both qualities necessary and complementary? Does each shadow arise from the imbalance? Can both integrations restore the parent? Mark retain, rename, move, merge, restore, replace, or retire and state why.

- [ ] **Step 3: Publish the canonical map**

Use one row per final archetype with lifecycle, function, balance equation, active shadow, passive shadow, absorbed concepts, mythic resonances, and distinctness note. Do not assign equal quotas to lifecycle stages.

- [ ] **Step 4: Publish the migration ledger**

Use one row for every current archetype and shadow plus restored historical entries. Record old slug, canonical slug, operation, destination, content disposition, legacy URL behavior, and image disposition.

- [ ] **Step 5: Publish the house style sheet**

Specify voice, point of view, lifecycle language, capitalization, headings, declarations, quotation punctuation, Oxford comma, tight em dashes, number style, mythic-resonance boundaries, and the sequence of developmental, anti-fluff, line, and copy edits.

- [ ] **Step 6: Verify coverage and commit**

Run:

```bash
node -e "const {loadGroups}=require('./scripts/content_markdown'); const n=loadGroups().flatMap(g=>g.items.flatMap(a=>[a,...a.extended.shadows])).length; console.log(n)"
rg -n "retain|rename|move|merge|restore|replace|retire" editorial/migration-ledger.md
git diff --check
```

Expected: the legacy corpus count is printed, every legacy row has an operation, and `git diff --check` is silent.

### Task 2: Define and test the standalone Markdown contract

**Files:**
- Create: `test/content_markdown.test.js`
- Modify: `scripts/content_markdown.js`
- Modify: `scripts/validate_content.js`
- Modify: `scripts/sync_archetypes.js`
- Modify: `package.json`
- Create: `content/<lifecycle>/archetypes/*.md`
- Create: `content/<lifecycle>/shadows/*.md`
- Modify: `content/<lifecycle>/group.md`

**Interfaces:**
- Consumes: canonical slugs and relationships from Task 1.
- Produces: `loadBook(): { groups, entries, redirects }`, where each group has `archetypes`, each archetype has `activeShadowSlug` and `passiveShadowSlug`, and every entry has normalized profile, quote, body-section, image, and research metadata.

- [ ] **Step 1: Add the Node test command**

Add `"test": "node --test"` and make `content:check` run the schema validator after the unit tests.

- [ ] **Step 2: Write failing parser tests**

Use `node:test`, temporary directories, and `assert`. Cover one archetype, one active shadow, one passive shadow, ordering, explicit parent references, quote/source IDs, structured sections, malformed balance pairs, duplicate slugs, slash aliases, and a missing parent.

- [ ] **Step 3: Verify the tests fail under the embedded-shadow parser**

Run:

```bash
npm test
```

Expected: FAIL because `loadBook`, `parseArchetype`, and `parseShadowFile` do not yet exist.

- [ ] **Step 4: Implement the normalized parser**

Export these stable functions:

```js
function parseArchetype(file) {}
function parseShadowFile(file) {}
function loadBook(directory = contentDir) {}
function writeGeneratedData(book, directory) {}
```

Use only Node built-ins. Parse YAML-like scalar front matter plus pipe-delimited arrays, then required Markdown headings. Keep reading and rendering functions focused by entry type.

- [ ] **Step 5: Strengthen validation**

Reject missing/duplicate names and slugs; compound aliases; wrong lifecycle; missing parent; wrong active/passive order; parent/child quality drift; fewer or more than two quotes; duplicate quote IDs; missing mythic source IDs; forbidden profile fields; declaration counts outside 8–12 for archetypes or 6–9 for shadows; empty required sections; missing image paths; and generated-data drift.

- [ ] **Step 6: Migrate all canonical source files**

Move prose mechanically first. Each archetype references exactly two shadow slugs; each shadow declares `parent`, `type`, identical `qualityA`/`qualityB`, `image`, two quote IDs, and mythic source IDs. Remove the old embedded item files only after the new parser reads every entry.

- [ ] **Step 7: Generate JSON and verify**

Run:

```bash
npm test
npm run content:sync
npm run content:check
```

Expected: all tests pass; sync reports all lifecycle groups, archetypes, and shadows; check reports no drift.

### Task 3: Make archetypes and shadows first-class site pages

**Files:**
- Modify: `.eleventy.js`
- Modify: `src/index.njk`
- Modify: `src/archetype.njk`
- Create: `src/shadow.njk`
- Remove: `src/item.njk`
- Modify: `src/search.json.njk`
- Modify: `src/_includes/layout.njk`
- Modify: `src/assets/styles.css`
- Create: `test/site_data.test.js`

**Interfaces:**
- Consumes: normalized generated groups and entries from Task 2.
- Produces: canonical `/lifecycle/archetype/` and `/lifecycle/shadows/shadow/` pages, search records, parent/opposite links, and redirects for practical legacy slugs.

- [ ] **Step 1: Write failing collection and route tests**

Assert that flattened collections distinguish `kind: archetype|shadow`, every URL is unique, every shadow URL is standalone, parent and opposite URLs resolve, and legacy redirects point to a canonical URL.

- [ ] **Step 2: Verify the new route tests fail**

Run `npm test`; expect route assertions to fail against the embedded-shadow collections.

- [ ] **Step 3: Implement normalized collections and templates**

Render only the seven approved profile fields. Archetype pages link to both shadows; shadow pages link to the parent and opposite shadow. Keep images and two quotation positions available without displaying research IDs.

- [ ] **Step 4: Update search and navigation**

Emit separate canonical records for lifecycle, archetype, and shadow; include correct URLs, type, parent, balance qualities, and key qualities.

- [ ] **Step 5: Build and verify**

Run:

```bash
npm test
npm run build
node -e "const x=require('./docs/search.json'); const u=x.items.map(i=>i.href); if(new Set(u).size!==u.length) process.exit(1); console.log(u.length)"
```

Expected: tests and Eleventy build pass; the script prints the entry count and exits zero.

### Task 4: Calibrate one complete archetype trio

**Files:**
- Modify: `content/lover/archetypes/lover.md`
- Modify: `content/lover/shadows/enmeshing-lover.md`
- Modify: `content/lover/shadows/armored-lover.md`
- Create: `research/quotation-ledger.json`
- Create: `research/mythic-resonance-ledger.json`
- Create: `editorial/calibration-notes.md`

**Interfaces:**
- Consumes: schema, house style, and canonical Lover balance.
- Produces: the approved structural and tonal pattern for the remaining 63+ spreads, plus complete ledger records referenced by source IDs.

- [ ] **Step 1: Research six short quotations**

Verify exact text, author, original work/speech/interview, publication details, context, stable URL, and assigned opening/closing position. Prefer primary editions, author/institution archives, or reputable publishers.

- [ ] **Step 2: Research Lover mythic resonances**

For each selected resonance, record tradition, precise relevant function, authoritative source, URL, and verification status. Do not equate figures across traditions.

- [ ] **Step 3: Draft the Lover spread**

Include one title, two quotations, approved profile, definition, 8–12 unique declarations, both qualities and their unbalanced forms, applications, gifts/responsibilities/challenges, concrete practices, and a `Living as the Lover` conclusion.

- [ ] **Step 4: Draft both shadow spreads**

Each includes designation, two quotations, approved profile, balance breakdown, 6–9 unique declarations, mechanics, protection/fear/need, hidden energy, recognition, concrete integration, opposite-shadow relationship, transformation, and grounded conclusion.

- [ ] **Step 5: Run the four editorial passes**

Record developmental decisions, removed repetition/AI patterns, line-level changes, and copy-edit exceptions in `editorial/calibration-notes.md`. Copy editing must change mechanics only.

- [ ] **Step 6: Validate before pagination calibration**

Run `npm test && npm run content:sync && npm run content:check && npm run build`; expect all commands to pass.

### Task 5: Build standalone rendering and exact-spread measurement

**Files:**
- Modify: `book/print-pdf/generate_book.py`
- Create: `book/print-pdf/adjust_content_size.py`
- Create: `book/print-pdf/validate_spreads.py`
- Create: `book/print-pdf/pdf_metrics.py`
- Create: `test/test_pdf_metrics.py`
- Modify: `book/print-pdf/print_config.json`
- Modify: `book/requirements-print.txt`
- Modify: `package.json`

**Interfaces:**
- Consumes: one normalized archetype or shadow entry.
- Produces: `render_entry(entry_slug, output_path)`, `measure_pdf(path) -> SpreadMeasurement`, JSON/Markdown measurement reports, and a nonzero validator exit when any standalone or compiled invariant fails.

- [ ] **Step 1: Write failing measurement tests**

Generate fixture PDFs with PyMuPDF for exactly two pages, one page, three pages, blank second page, sparse second page, and content beyond the configured bottom boundary. Assert page count, fill, blank detection, and pass/fail classifications.

- [ ] **Step 2: Verify measurement tests fail**

Run `python3 -m unittest test/test_pdf_metrics.py -v`; expect import failure for `pdf_metrics`.

- [ ] **Step 3: Implement PDF metrics without hosted APIs**

Define:

```python
@dataclass(frozen=True)
class SpreadMeasurement:
    pages: int
    final_fill: float
    blank_pages: tuple[int, ...]
    overflow_blocks: int
    passed: bool
```

Measure text and image blocks, ignore page furniture, use configured content bounds, and require two nonblank pages with second-page fill inside the configured band.

- [ ] **Step 4: Adapt the masculine sizing script locally**

Retain single-entry render, PyMuPDF analysis, conservative reporting, and target fill. Remove Anthropic imports, environment-key checks, and automatic prose mutation. Add `--entry`, `--all`, `--json`, and `--validate` modes; report editorial direction without editing Markdown.

- [ ] **Step 5: Render each entry independently and in sequence**

Add `--entry SLUG` to `generate_book.py`. In the compiled book, insert a blank page only before an entry when needed so the entry always begins on an even page; record physical start and end pages from labeled anchors.

- [ ] **Step 6: Calibrate the representative trio**

Measure Lover and both shadows, then edit substance or remove redundancy until all three occupy exactly two pages with no conspicuous underfill. Do not use entry-specific font sizes.

- [ ] **Step 7: Add commands and verify**

Add `book:measure`, `book:spreads`, and `book:validate` scripts. Run:

```bash
python3 -m unittest test/test_pdf_metrics.py -v
npm run book:measure -- --entry lover
npm run book:validate -- --entry lover
```

Expected: unit tests pass; all three representative entries report exactly two pages and pass fill, blank-page, and overflow checks.

### Task 6: Research and draft the remaining entries lifecycle by lifecycle

**Files:**
- Modify: `content/*/archetypes/*.md`
- Modify: `content/*/shadows/*.md`
- Modify: `research/quotation-ledger.json`
- Modify: `research/mythic-resonance-ledger.json`
- Create: `editorial/lifecycle-review.md`

**Interfaces:**
- Consumes: calibrated trio, schema, source ledgers, and style sheet.
- Produces: publication-length, fully sourced standalone manuscripts for every canonical entry.

- [ ] **Step 1: Complete Maiden**

Research, draft, edit, sync, validate, build, and measure every Maiden trio before moving on.

- [ ] **Step 2: Complete Lover**

Finish the remaining Lover trios and compare them with the calibrated Lover trio for overlap and tone.

- [ ] **Step 3: Complete Mother**

Finish Mother trios and explicitly distinguish nurturing, protection, defense, repair, reconciliation, community, and place-making functions.

- [ ] **Step 4: Complete Queen**

Finish Queen trios and explicitly distinguish authority, judgment, visibility, and ethical transformation.

- [ ] **Step 5: Complete Crone**

Finish Crone trios and explicitly distinguish release, foresight, liberation, wisdom, and intergenerational meaning-making.

- [ ] **Step 6: Verify ledger completeness**

Run a validator that proves every entry has exactly two unique assigned quote records with `verificationStatus: verified`, and every mythic resonance has a corresponding verified source record.

### Task 7: Write front and back matter

**Files:**
- Create: `content/front-matter/01-title.md`
- Create: `content/front-matter/02-copyright.md`
- Create: `content/front-matter/03-dedication.md`
- Create: `content/front-matter/04-introduction.md`
- Create: `content/front-matter/05-how-to-use.md`
- Create: `content/front-matter/06-working-with-archetypes.md`
- Create: `content/front-matter/07-working-with-shadows.md`
- Create: `content/front-matter/08-feminine-lifecycle.md`
- Create: `content/front-matter/09-reading-a-spread.md`
- Create: `content/back-matter/01-integrating-the-lifecycle.md`
- Create: `content/back-matter/02-self-assessment.md`
- Create: `content/back-matter/03-conclusion.md`
- Create: `content/back-matter/04-bibliography.md`
- Create: `content/back-matter/05-acknowledgments.md`

**Interfaces:**
- Consumes: lifecycle model, spread vocabulary, research ledgers, and compatible masculine front-matter concepts.
- Produces: final ordered front/back matter and table-of-contents inputs.

- [ ] **Step 1: Adapt the reader orientation**

Rewrite rather than word-swap the masculine Introduction, How to Use, Working with Archetypes, and Working with Shadows. State the non-linear, non-biological lifecycle boundary in the Introduction and lifecycle chapter.

- [ ] **Step 2: Explain the spread grammar**

Define the two qualities, active/passive imbalance, declarations, profile, practices, and opposite-shadow relationship in reader-facing language.

- [ ] **Step 3: Write integration and assessment tools**

Provide behaviorally specific reflection prompts without scores that diagnose, rank, or essentialize the reader.

- [ ] **Step 4: Compile the bibliography from verified ledgers**

Deduplicate works, preserve full publication details, and include further reading that materially informed the lifecycle and shadow model.

- [ ] **Step 5: Verify exact dedication and sequence**

Run a source-order check and exact-string test. Expect the dedication body to equal `For my beloved,\nand her root sisters.` byte for byte after newline normalization.

### Task 8: Complete the artwork workstream

**Files:**
- Modify: `src/_data/images.json` only through `scripts/sync_archetypes.js` output
- Create: `research/artwork-manifest.json`
- Create: `editorial/artwork-readiness.md`
- Create or replace: `src/assets/images/archetypes/*`
- Create or replace: `src/assets/images/shadows/*`

**Interfaces:**
- Consumes: canonical entry slugs and existing image inventory.
- Produces: one unique suitable image per entry with dimensions, DPI-at-print-size, source, status, and remapping provenance.

- [ ] **Step 1: Inspect every existing asset**

Record file type, pixel dimensions, aspect ratio, effective print DPI, visual subject, legacy assignment, and duplicate hash.

- [ ] **Step 2: Classify every canonical mapping**

Use `reused`, `remapped`, `unsuitable`, or `missing`; state the visual reason for every unsuitable/remapped choice.

- [ ] **Step 3: Fill only genuine gaps**

Generate or replace artwork only for canonical entries lacking a congruent print-quality asset. Keep generation prompts and provenance in the manifest.

- [ ] **Step 4: Validate artwork**

Fail on missing files, duplicates assigned to different entries without an explicit approved exception, unreadable formats, and effective print resolution below the configured threshold.

### Task 9: Perform whole-book editorial passes

**Files:**
- Modify: `content/**/*.md`
- Create: `editorial/developmental-edit.md`
- Create: `editorial/redundancy-audit.md`
- Create: `editorial/line-edit.md`
- Create: `editorial/copy-edit.md`

**Interfaces:**
- Consumes: complete drafted manuscript.
- Produces: conceptually distinct, nonrepetitive, line-edited, and mechanically consistent final prose.

- [ ] **Step 1: Developmental edit**

Compare every function, quality pair, shadow mechanism, lifecycle placement, application, declaration, practice, and integration path. Resolve overlaps, gaps, contradictions, and generic passages.

- [ ] **Step 2: Redundancy and AI-pattern edit**

Remove throat clearing, synonym cycling, forced triads, repeated conclusions, decorative mysticism, vague uplift, unnecessary em dashes, and passages that add no new distinction.

- [ ] **Step 3: Line edit**

Strengthen openings, paragraph logic, verbs, rhythm, declaration memorability, concrete recognition, and endings while preserving intended meaning.

- [ ] **Step 4: Copy edit**

Enforce the style sheet mechanically. Record only genuine exceptions and avoid reopening voice or structure.

- [ ] **Step 5: Run textual gates**

Run schema checks plus project scripts that flag duplicate declarations, high-overlap paragraphs, forbidden profile fields, repeated adjacent sentence openings, unresolved placeholders, and malformed quotation punctuation.

### Task 10: Fit, compile, and visually inspect the final book

**Files:**
- Modify: `content/**/*.md`
- Modify: `book/print-pdf/generate_book.py`
- Modify: `book/print-pdf/print_config.json`
- Create: `editorial/pagination-report.md`
- Create: `book/print-pdf/pagination-report.json`
- Create: `book/print-pdf/contact-sheets/*.png`
- Generate: `book/mature-feminine.pdf`

**Interfaces:**
- Consumes: final manuscript and artwork.
- Produces: exact standalone and compiled spread evidence plus the final print PDF.

- [ ] **Step 1: Measure all standalone entries**

Generate the non-mutating report. Edit content, not per-entry typography, until every standalone entry is exactly two naturally filled pages.

- [ ] **Step 2: Build the complete book**

Render title, copyright, dedication, generated table of contents, front matter, lifecycle dividers, every entry, and back matter. Ensure each entry begins even and ends odd.

- [ ] **Step 3: Validate compiled boundaries**

Compare labeled start/end anchors with physical PDF pages. Fail any entry not spanning exactly one even/odd pair or containing blank, clipped, or overflowing content.

- [ ] **Step 4: Generate contact sheets and inspect every page**

Inspect covers, contents, dividers, every spread, headers, folios, images, quotes, headings, widows/orphans, blanks, underfill, and final pages. Record page-specific findings and resolutions.

- [ ] **Step 5: Rebuild after every correction**

Repeat measurement, compiled validation, and visual inspection until the report has zero unresolved defects.

### Task 11: Publish-readiness audit

**Files:**
- Create: `editorial/publish-readiness.md`
- Modify: `README.md`
- Modify: `book/README.md`

**Interfaces:**
- Consumes: all source files, ledgers, generated data, website output, validators, pagination evidence, contact sheets, and PDF.
- Produces: requirement-by-requirement proof that the user’s complete goal is achieved.

- [ ] **Step 1: Run the full command suite**

```bash
npm test
npm run content:sync
npm run content:check
npm run build
npm run book:check
npm run book:build
npm run book:validate
git diff --check
```

Expected: every command exits zero; sync is followed by a clean generated-data check.

- [ ] **Step 2: Audit every explicit requirement**

For each item in the approved design and active goal, cite the authoritative file, command output, PDF page, or report row proving it. Treat missing or indirect evidence as incomplete.

- [ ] **Step 3: Verify repository state**

Confirm no edits occurred in the sibling masculine repository, no hand-edited generated drift exists, no unrelated user work was removed, and the intended source/report/PDF files are present.

- [ ] **Step 4: Commit and push the complete result**

Stage only goal-related files, commit with an accurate message, push `main` to `origin`, and confirm `main` matches `origin/main`.
