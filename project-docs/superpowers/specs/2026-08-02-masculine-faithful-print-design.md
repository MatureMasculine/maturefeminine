# Masculine-Faithful Print Design for the Mature Feminine Field Guide

## Purpose

The Mature Feminine book will adopt the production design of the Mature Masculine book as closely as the feminine content contract permits. The result should read as a companion volume: the same page geometry, title and quote hierarchy, typography, tall artwork rail, black metadata field, white botanical transition, drop caps, section treatment, and folio behavior.

This adaptation must preserve the stronger production guarantees already built for the feminine book. Every archetype and shadow remains an independently renderable, exact facing two-page spread. Every spread begins on an even page, ends on the facing odd page, uses one global typographic system, and passes numerical and visual validation.

## Source of Truth

The visual reference is the active masculine LuaLaTeX renderer and its configuration:

- `../maturemasculinedeck/book/print-pdf/generate_print_pdf_latex.py`
- `../maturemasculinedeck/book/print-pdf/print_config.yaml`
- `../maturemasculinedeck/book/print-pdf/images/grasswide1.png` through `grasswide5.png`
- `../maturemasculinedeck/book/print-pdf/endofchapter.png`
- `../maturemasculinedeck/website/src/assets/fonts/CinzelDecorative-Regular.ttf`
- `../maturemasculinedeck/website/src/assets/fonts/CinzelDecorative-Bold.ttf`

The sibling repository remains read-only. Required fonts and ornaments are copied into the feminine repository so the feminine print pipeline has no runtime dependency on the sibling.

## Considered Layouts

### 1. Repeat the masculine opener on both pages

This would maximize decoration but leave too little room for the required 800–1,000 words, declarations, applications, and practices. Repeating the visual rail would make fitting depend on tiny type or severe content loss. Rejected.

### 2. Stretch the current feminine banner layout across two pages

This is mechanically easy but preserves the current visual hierarchy the user has rejected. It would not reproduce the tall image, black metadata field, floral transition, or masculine opener rhythm. Rejected.

### 3. Masculine opener plus facing continuation

The first page reproduces the masculine chapter opener. Its title and quotation span the text width; beneath them, a tall image and black floral profile occupy the left column while the manuscript begins in the right column with a three-line drop cap. The facing page continues in two text columns and lands the closing quote and end ornament at the end of the spread. Selected.

## Page Geometry

- Trim size: US Letter, 8.5 × 11 inches.
- Two-sided layout with mirrored margins.
- Inner margin: 0.75 inch.
- Outer margin: 0.65 inch.
- Top margin: 0.75 inch.
- Bottom margin: 0.75 inch.
- Two equal columns beneath the opener.
- Column gap: 0.30 inch.
- No column rule.
- Text alignment: justified, with microtypographic expansion and hyphenation enabled.
- Paragraph indent: zero.
- Paragraph spacing: 0.10 inch in entry prose.
- Widow, orphan, and broken-word penalties remain strict.

These values match the masculine print configuration. The spread metrics must be updated to the physical bounds produced by this geometry rather than retaining the current approximate feminine values.

## Typography

- Display face: Cinzel Decorative, localized from the masculine project.
- Body face: Palatino through LuaLaTeX, matching the masculine renderer.
- Entry title: Cinzel Decorative Bold, 20 pt on 24 pt leading, centered.
- Opening quote: Palatino Italic, 10 pt on 12 pt leading, centered.
- Opening attribution: Palatino Roman, 9 pt on 11 pt leading, medium gray.
- Body: Palatino Roman, 9.5 pt on 11.4 pt leading.
- H2: Cinzel Decorative Bold, 9.5 pt on 11.4 pt leading.
- H3: Palatino Bold, 10.5 pt on 12.6 pt leading.
- Profile: Palatino, 7.6 pt on 9.2 pt leading; labels bold, values bold italic. This is the one necessary adaptation from the masculine 8 pt panel because the feminine profile has seven required fields and longer canonical functions.
- Closing quote: Palatino Italic at body size; attribution Roman at 90 percent of body size.
- Folios: Palatino Roman, 9 pt.
- First paragraph: three-line Cinzel drop cap using `lettrine`.

No entry-specific font size, leading, margin, image height, or profile-size override is allowed.

## Entry Spread Composition

### First page: opener

1. The entry begins on a physical even page.
2. The centered title sits at the top of the text block.
3. A 0.25-inch title-to-quotation gap is used when the opening quote exists.
4. The opening quote is line-balanced and centered, with its attribution beneath or inline only when necessary for a long quote.
5. A 0.40-inch gap follows the quote.
6. A two-column environment begins.
7. The left column contains the artwork and profile as one uninterrupted visual rail.
8. The right column begins the manuscript body. The first eligible prose paragraph receives a three-line drop cap.

The title, quote, image rail, and body start must occupy the same visual positions as the masculine opener rather than being vertically recentered to accommodate individual entries.

### Facing page: continuation

The manuscript flows from the first-page right column into both columns of the facing page. Headings may not be stranded at a column or page bottom. Lists remain with their introducing heading where practical. The closing quotation and small end ornament follow the final conclusion in the final text column.

The first page uses the masculine `chapter-start` folio treatment: centered page number at the bottom. The continuation page uses the masculine continuation treatment: page number at the outer top corner, with no running title and no rule.

## Artwork Rail

- The combined artwork and profile rail is fixed at 7.90 inches high.
- Artwork occupies the full left-column width and a fixed height of 5.25 inches.
- It is cropped to a fixed portrait frame rather than stretched.
- Crop uses a centered focal point. If that crop removes an essential subject, the artwork itself must be remapped or replaced during the artwork workstream rather than receiving entry-specific print geometry.
- The image meets the black profile panel with the same near-seamless transition as the masculine book; no colored border, rounded box, caption, or white gap is introduced.
- The artwork and black profile panel together create one vertical slab.

The black profile field occupies the remaining 2.65 inches of the fixed rail. These global dimensions reproduce the masculine opener's tall visual mass while accommodating the longer feminine profile. Calibration may change them once as a global pair, but the final values must be recorded in `print_config.json` and used for every entry.

## Black Floral Profile Panel

The panel is rendered directly in LuaLaTeX rather than through the masculine renderer's WeasyPrint subprocess. Direct rendering avoids a remote Font Awesome stylesheet, browser-engine variability, cache drift, and an unnecessary runtime dependency while preserving the same visible composition.

- Background: near-black `#0D0D0D`.
- Text: white or near-white.
- Icons: muted gray.
- Horizontal padding: 0.15 inch.
- Top padding: 0.12 inch.
- Bottom reserve: 0.52 inch for the white botanical transition, matching the masculine panel's 50 CSS-pixel reserve.
- White floral/grass artwork is anchored to the panel's lower edge and scaled to full panel width.
- The five masculine `grasswide` variants rotate deterministically by canonical entry order.

Only the seven approved feminine fields appear, in this order:

1. Lifecycle stage
2. Core function
3. Balanced qualities
4. Active shadow
5. Passive shadow
6. Mythic resonances
7. Key qualities

No element, direction, center, power animal, cultural explanation, or extra profile row may be added. Profile content may wrap naturally. The global panel height must accommodate the longest validated profile without clipping; shorter profiles retain the same panel height so the book keeps a consistent visual rhythm.

Shadow `Key qualities` must be migrated from the current full Recognition prose to a dedicated pipe-delimited source field containing five to eight compact, behaviorally precise qualities. Archetype profiles retain their existing compact `keyQualities` source field. The body Recognition section remains full prose and is no longer duplicated into the image profile. This corrects the current schema's conflict with the original requirement for a compact image panel.

## Shadow Design

Shadows use the same opener architecture, typography, black profile rail, and page flow as archetypes. `Active Shadow` or `Passive Shadow` appears as a restrained centered designation between the title and opening quote, without changing title size or shifting the artwork rail between entries. The profile still prints all seven approved parent-linked fields.

## Closing Treatment

- Closing quote follows the final conclusion with 0.20 inch of separation.
- It is centered within the current text column.
- Attribution is upright and gray.
- The masculine `endofchapter.png` ornament appears beneath qualifying entry text, centered at 0.5 inch width.
- The ornament is suppressed only when collision or page spill would occur; its suppression may not hide an otherwise underfilled or unfinished spread.

## Local Assets and Dependencies

Copy into `book/print-pdf/assets/`:

- Cinzel Decorative Regular and Bold font files.
- The authoritative SIL Open Font License text corresponding to the localized Cinzel files.
- `grasswide1.png` through `grasswide5.png`.
- `endofchapter.png`.
- `lettrine.cfl`.

The generator depends only on assets within the feminine repository at runtime. It uses the installed LuaLaTeX packages already required by the local print pipeline, including `fontspec`, `graphicx`, `multicol`, `tikz`, `tcolorbox`, `lettrine`, `needspace`, `fancyhdr`, `microtype`, and `fontawesome5`. It must not require Anthropic, a browser, a remote stylesheet, or network access to measure, build, or validate the book. A missing required LaTeX package fails preflight with its exact package name; it never silently drops a profile field or icon.

## Renderer Boundaries

The renderer keeps the following units explicit and independently testable:

- `render_opening_quote(entry)` handles line balancing and attribution placement.
- `render_profile_panel(entry, variant)` emits only the seven approved rows.
- `render_artwork_rail(entry)` performs the fixed crop and joins image to profile.
- `render_entry_content(entry)` creates one multi-page, two-column flow with a forced visual first column.
- `render_page_styles()` defines chapter-start and continuation folios.
- Asset localization validates that every required font and ornament exists inside this repository.

The normalized Markdown contract changes only to add compact `keyQualities` metadata to shadows and stop copying full Recognition prose into the profile. All other styling remains renderer-owned. Generated JSON remains derived output and is never hand-edited.

## Calibration Sequence

1. Reproduce the masculine geometry, fonts, title, opening quote, artwork rail, profile panel, and drop cap on the calibrated Lover spread.
2. Render Lover, Enmeshing Lover, and Armored Lover as standalone PDFs and as a compiled trio.
3. Rasterize all six pages at inspection resolution.
4. Compare the first-page opener directly with the supplied masculine reference for title baseline, quote block, column top, image width/height, panel join, floral edge, body baseline, drop-cap size, and folio position.
5. Adjust only global design constants.
6. After the trio is visually approved, run the same renderer across all entries and edit manuscript substance to recover exact spread fit.

## Verification

Automated checks must prove:

- Every standalone entry is exactly two nonblank pages.
- Every compiled entry begins even and ends odd.
- Text, images, profile background, floral artwork, and folios remain inside configured physical bounds.
- No profile row or artwork rail is missing.
- No per-entry typography or geometry override exists.
- The PDF embeds Cinzel Decorative and Palatino-compatible body fonts.
- The opening quote appears only on page one and the closing quote on page two.
- Page-one content includes a black profile field and artwork image.
- No remote asset or sibling-repository path appears in generated TeX or build metadata.

Visual inspection must check every rendered spread for:

- title and quote alignment;
- image focal crop and resolution;
- image-to-black-panel seam;
- floral transition rendering;
- complete, legible profile rows;
- drop-cap collision or incorrect paragraph selection;
- heading hierarchy and column starts;
- widows, orphans, broken words, and awkward quote breaks;
- conspicuous underfill;
- closing quote and ornament balance;
- folio position and parity.

Contact sheets and page-level findings remain required final deliverables. The design is not complete merely because the PDF compiles or its page count is correct.

## Non-Goals

- Do not import the masculine taxonomy, metadata fields, prose, initiation framing, virtue chapters, or skill chapters.
- Do not retain the feminine book's current rose profile card or horizontal banner treatment.
- Do not use per-entry font reductions or geometry overrides.
- Do not make the feminine renderer depend on the masculine repository at runtime.
- Do not weaken the exact-spread validator to accommodate the new design.
