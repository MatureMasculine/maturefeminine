# Publication Readiness

Audit date: 2026-08-02

Status: **production-ready; artwork terms confirmation remains an external owner action**

## Final artifact

- Output: `book/mature-feminine.pdf`
- SHA-256: `34308ee68c1f409a4df6d39f8092d549860eb327bc0b0ef9beaffa1f5a5d992f`
- Physical pages: 157
- Trim size: US Letter, 612 × 792 points
- Canonical entries: 66 across 22 archetypes and 44 shadows
- Entry pagination: 66 of 66 exact two-page spreads; zero anchor failures
- Intentional blank: physical page 13, used to begin the spread sequence on an even left-hand page

## Reference-layout match

The print generator uses the Mature Masculine production model for the spread system: mirrored page margins, Palatino body type, Cinzel Decorative display type, centered title and quotation, a 3.40 × 5.25 inch image above a fixed black seven-row profile panel, gray symbolic icons, white bold/italic metadata, a floral grass transition, a drop-cap opening, two-column facing continuation, and centered/outer folios.

All 157 physical pages were reviewed in contact sheets. Representative opening and continuation pages were also inspected at full resolution. No clipping, collisions, accidental blank pages, broken image crops, missing profile rows, misplaced quotations, literal Markdown, or inconsistent spread geometry were found.

## Automated gates

- `npm test`: 154 passed, 0 failed
- `node scripts/validate_content.js --publish`: passed; generated data is synchronized
- `python3 -m unittest discover -s test -p 'test_*.py'`: 50 passed, 0 failed
- Site build: 141 HTML/data files written and 73 support files copied
- Standalone spread validation: 66 passed, 0 failed
- Compiled anchor validation: 66 passed, 0 failed
- Required fonts embedded: passed
- Artwork provenance and effective-DPI gate: 66 passed, 0 failed
- Bibliography reconciliation: all 132 quotation assignments and 66 mythic assignments represented

## Remaining owner action

The repository documents project-specific, no-input generation provenance for all 66 canonical spread images. Before commercial publication, the account holder should record confirmation that the intended use complies with the applicable OpenAI image-generation terms. This is a legal/account action, not a missing production asset or layout defect.
