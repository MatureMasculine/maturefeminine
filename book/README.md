# The Mature Feminine Book

This directory generates a print-ready, Mature Feminine-only PDF. Archetype content is not edited here: the canonical source is Markdown in `../content/`. The website's `src/_data/group_*.json` files are deterministic outputs of that Markdown and are used only after synchronization is verified.

## Build

From the repository root:

```sh
npm run book:check
npm run book:build
```

The final PDF is written to `book/mature-feminine.pdf`. Intermediate LaTeX and copied print assets are written to `book/print-pdf/.latex-build/` and are ignored by Git.

## Prerequisites

- Python 3.10 or later (standard library only)
- LuaLaTeX, with the `book`, `fontspec`, `graphicx`, `multicol`, `tikz`, `tcolorbox`, `enumitem`, `fancyhdr`, `hyperref`, and `microtype` packages

On macOS, installing MacTeX makes `lualatex` available at `/Library/TeX/texbin/lualatex`. After installation, rerun `npm run book:build`.

## Content coverage and layout

The generator checks every lifecycle group, archetype, active/passive shadow, virtue, practice, declaration, and hero-image mapping before it writes TeX. It renders a table of contents and a two-column body for each archetype. Hero images are center-cropped into horizontal banners that span the full text width above both columns; they are never placed as vertical single-column images.
