# Artwork Readiness Report

Status: **production-ready; account-holder publication-terms confirmation remains external**

Audit date: 2026-08-02

Authoritative provenance: `research/artwork-ledger.json`

## Executive verdict

All **66 canonical spreads** now map to distinct, local, no-input artwork commissioned specifically for this project:

- 22 archetype images and 44 shadow images;
- 66 approved provenance records;
- 66 unique canonical assignments, files, and ledger IDs;
- 0 missing canonical images;
- 0 duplicate canonical file assignments;
- 0 source/generated-data mapping mismatches; and
- 0 retained legacy images in canonical print or site mappings.

The final 43 replacements cover every image that previously remained below the Mature Masculine print-resolution reference or carried unresolved legacy provenance. The other 23 images were commissioned in the earlier replacement pass and remain approved.

## Print geometry and resolution

The book uses a centered, non-stretched **3.40 × 5.25 inch** portrait crop. Effective DPI is measured after that crop:

```text
effective DPI = min(cropped width px / 3.40 in, cropped height px / 5.25 in)
```

The Mature Masculine comparison image establishes a **285.29 effective-DPI** reference. Every canonical Mature Feminine image exceeds it.

| Effective DPI | Canonical images |
| ---: | ---: |
| 287.94 | 4 |
| 292.57 | 59 |
| 292.76 | 3 |

The minimum is **287.94**, the median is **292.57**, and the mean is **292.30 effective DPI**. All 43 newly refreshed files are 1024 × 1536 pixels; the four 979 × 1606 and three 1023 × 1537 files belong to the earlier commissioned set and also clear the reference after the actual crop.

## Visual and semantic review

The 43-image refresh was inspected as a complete contact sheet and in representative full-size views. The accepted set has:

- crop-safe faces, hands, and core symbolic mechanisms;
- no embedded titles, captions, borders, logos, or watermarks;
- no obvious anatomy failures at print scale;
- no deity-specific or living-tradition regalia;
- no child-coded, sexualized, or moralizing treatment of the women; and
- distinct mechanisms for each mature archetype and each active/passive shadow.

The replacement set also resolves the documented legacy risks: embedded shadow labels, visibly youthful Maiden coding, sexualized Lover imagery, culture-coded Warrior and goddess imagery, generic occult Magician imagery, and semantically weak or duplicated fallbacks.

## Provenance

`research/artwork-ledger.json` contains one record for every canonical spread with:

- generator identity;
- exact generation prompt;
- an empty input-image list;
- pixel dimensions;
- editorial rationale;
- approval state; and
- rights-status language.

The 43-image refresh was generated with OpenAI's built-in image-generation capability from text prompts only. No external or legacy source image was supplied to the generator. The two scratch generation manifests are retained outside version control for working-session traceability; the tracked provenance ledger is the durable publication record.

## Rights gate

Repository evidence establishes project-specific, no-input generation provenance for all 66 canonical images. It does **not** replace legal review or the account holder's confirmation of the applicable OpenAI terms. Before commercial publication, the project owner should record that confirmation. Until then, artwork is technically and editorially ready but legal clearance remains an external owner action.

## Retired and noncanonical assets

The repository still contains **75 image files that are not canonical spread mappings**. One is the cover support asset. The other 74 are retired legacy sources, historical alternates, or unused candidates. They remain for migration traceability and are not included in the printed guide or canonical site entries.

They should not be counted as approved alternatives, and their presence does not create additional archetypes or shadows. No deletion is required for publication because canonical mapping and provenance tests exclude them.

## Automated gates

`test/artwork_provenance.test.js` now verifies all 66 records and canonical manuscripts. It enforces:

- exact production count and uniqueness;
- approved status and empty input-image lists;
- local-file presence;
- portrait/no-text prompt constraints;
- effective DPI at or above the Mature Masculine reference; and
- exact agreement between each manuscript's `image:` field and its provenance record.

Any future artwork change must update the canonical Markdown and provenance ledger together, regenerate normalized data, and pass the publication and print checks.
