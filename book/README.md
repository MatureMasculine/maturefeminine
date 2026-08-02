# The Mature Feminine Book

This directory generates a print-ready, Mature Feminine-only PDF. Archetype content is not edited here: the canonical source is Markdown in `../content/`. The website's `src/_data/group_*.json` files are deterministic outputs of that Markdown and are used only after synchronization is verified.

## Build

From the repository root:

```sh
npm run content:publish-check
npm run book:check
npm run book:validate -- --all
npm run book:build
```

The final PDF is written to `book/mature-feminine.pdf`. Intermediate LaTeX and copied print assets are written to `book/print-pdf/.latex-build/` and are ignored by Git.

`book:check` is non-mutating. It validates the canonical Markdown and the local print dependencies without replacing the final PDF. `book:validate -- --all` renders and measures all 66 entries independently, and fails if an entry does not occupy exactly two nonblank pages or falls outside the locked fill and overflow limits. `book:build` assembles the front matter, lifecycle entries, and back matter into the final PDF and writes `book/spread-manifest.json`.

Cinzel Decorative is bundled for print-title use under the SIL Open Font License. Its license text was retrieved from https://raw.githubusercontent.com/google/fonts/main/ofl/cinzeldecorative/OFL.txt on 2026-08-02.

## Prerequisites

- Python 3.10 or later (standard library only)
- LuaLaTeX, with the `book`, `fontspec`, `graphicx`, `multicol`, `tikz`, `tcolorbox`, `enumitem`, `fancyhdr`, `hyperref`, and `microtype` packages

On macOS, installing MacTeX makes `lualatex` available at `/Library/TeX/texbin/lualatex`. After installation, rerun `npm run book:build`.

## Content coverage and layout

Canonical content lives in `content/<lifecycle>/archetypes/` and `content/<lifecycle>/shadows/`. The `src/_data/group_*.json` files are generated outputs; update them with `npm run content:sync`, never by hand.

Every archetype and shadow begins on a left/even page and ends on its facing right/odd page. The opening page follows the Mature Masculine print system:

- US Letter with mirrored `0.75in` inner, top, and bottom margins and a `0.65in` outer margin.
- Cinzel Decorative `20/24pt` centered titles; Palatino `9.5/11.4pt` body copy.
- A centered opening quotation above the two-column spread body.
- A `3.40in`-wide left rail containing a `5.25in` portrait crop and a fixed `2.65in` black profile panel.
- Seven profile rows only: lifecycle stage, core function, balanced qualities, active shadow, passive shadow, mythic resonances, and key qualities.
- White profile type, muted gray icons, and the same white floral/grass transition used by the Masculine reference.
- A right body column on the opening page, continued across two columns on the facing page, with an opening drop cap and fixed global typography.

Artwork is center-cropped inside the fixed portrait frame without stretching. The validator judges the visible clipped rail rather than the hidden overhang of the source raster. No entry-specific font reduction, manual padding, or generated-data edit is part of the fitting workflow; prose is fitted through substantive editorial revision.
