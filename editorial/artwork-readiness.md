# Artwork Readiness Report

Status: **semantic mapping complete; print-resolution and publication-rights gates remain open**

Audit date: 2026-08-02

Machine-readable audit: `.superpowers/sdd/artwork-audit-prep/artwork-inventory.json` (generated 2026-08-02T14:57:19.542Z)

Commissioned-art provenance: `research/artwork-ledger.json`

## Executive verdict

The current manuscript has **66 canonical artwork mappings**: 22 archetypes and 44 shadows. Every canonical Markdown entry points to a present source asset, and all 66 Markdown paths agree with generated data in the regenerated scratch audit. The current mapping set has:

- **3 reused** legacy mappings;
- **63 remapped** mappings, consisting of 40 retained legacy remaps and 23 commissioned replacements;
- **23 commissioned** canonical mappings with approved prompt/provenance records;
- **0 missing** canonical mappings;
- **0 currently identified semantically unsuitable** canonical mappings after the 23 commissioned replacements;
- **0 exact duplicate groups** among audited assets; and
- **0 Markdown/generated mapping mismatches**.

These counts clear the current **first-pass semantic mapping gate**, not final visual sign-off or the whole publication gate. They do not clear the 43 retained legacy images for print resolution or publication rights. “No semantically unsuitable mapping” means the current audit found no disqualifying mismatch against the canonical manuscript; 22 retained mappings still carry explicit semantic/editorial risk notes and require conscious sign-off. The result is not a license opinion and does not establish sufficient print resolution.

## Separate readiness gates

| Gate | Current result | Meaning | Remaining action |
| --- | --- | --- | --- |
| Canonical mapping completeness | Pass | 66/66 canonical entries have present, matching files. | Re-run the audit whenever an `image:` field or asset changes. |
| Semantic suitability | First-pass pass; final sign-off open on 22 risk-noted mappings | No current entry is listed in `unsuitable_entries`; the 23 commissioned replacements removed the known disqualifying mismatches. The inventory still records 22 non-DPI editorial risks. | Review and explicitly accept or replace every risk-noted retained mapping below. |
| Print resolution | **Open** | 23 commissioned mappings meet the Mature Masculine reference; all 43 retained legacy mappings fall below it after the actual portrait crop. | Replace or obtain higher-resolution masters for the 43 retained mappings, or approve a documented lower-resolution production exception after press proofing. |
| Publication rights | **Open** | The 23 commissioned assets have prompts and generation provenance. The 43 retained legacy assets do not have independently documented source/license or generation-prompt provenance in this repository. | Project owner must document rights for every retained legacy asset and confirm applicable OpenAI publication terms for commissioned assets. |

Semantic approval must not be used as evidence that either open gate has cleared.

## Print geometry and reference

The production image rail is exactly **3.40 × 5.25 inches**, an aspect ratio of `3.40 / 5.25 = 0.647619…`. Effective DPI is measured after a centered, non-stretched crop:

```text
effective DPI = min(cropped width px / 3.40 in, cropped height px / 5.25 in)
```

The Mature Masculine comparison image is 970 pixels across the same 3.40-inch width:

```text
970 px / 3.40 in = 285.294… DPI ≈ 285.29 DPI
```

The 23 commissioned mappings all meet that reference. Their effective-DPI distribution is 16 at **292.57**, 3 at **292.76**, and 4 at **287.94** DPI; the median is **292.57** and the mean is **291.79**. Thus “about 292.57 effective DPI” is a useful production shorthand, while the per-file values below remain authoritative.

All 43 retained legacy canonical mappings are below the 285.29-DPI reference: 27 are **195.05 DPI** and 16 are **167.62 DPI** after the actual crop. Nominal width-only DPI is not a valid substitute because it ignores pixels discarded by the fixed portrait frame.

The scratch JSON’s prose formula note says all current assets crop horizontally, but its per-asset measurements correctly show **62 horizontal crops and 4 vertical crops**. The vertical exceptions are the 979 × 1606 commissioned files for Justice, Sage, Enmeshing Lover, and Manipulative Sorceress; each crops vertically to about 979 × 1511.69 pixels and measures 287.94 effective DPI. Per-asset `centered_crop_axis` and crop dimensions, not that stale summary sentence, are authoritative.

## Residual semantic/editorial risks: 22 retained mappings

These entries are not classified as currently unsuitable, but the scratch audit records a specific non-DPI risk for each. Zero entries in `unsuitable_entries` must not erase these cautions.

| Canonical mapping | Residual risk requiring sign-off |
| --- | --- |
| `maiden/maiden` | Youthful/ethereal styling may literalize age and innocence despite the canonical instruction not to. |
| `maiden/visionary` | Moon-oracle imagery is visually hard to distinguish from the canonical elder Seer artwork. |
| `lover/healer` | Priestess coding remains even though Priestess and chronology are legacy aliases only. |
| `lover/lover` | Sexualized “sacred whore” legacy art can stereotype the Lover as seduction and obscure Devotion plus Sovereignty. |
| `mother/community-weaver` | Winged/weaver-goddess styling retains legacy sacred or cultural coding while the current resonance is literary and relational. |
| `mother/mother` | Fertility and maternal embodiment may literalize the psychological Mother as reproductive identity. |
| `mother/peacemaker` | Angelic near-white serenity does not visibly communicate truthful conflict or repair. |
| `mother/warrior` | Culture-coded warrior styling needs checking against the verified Mulan tradition rather than treatment as generic decoration. |
| `queen/magician` | Occult regalia foregrounds private mysticism more than accountable transformation within stewardship. |
| `crone/crone` | Underworld-queen and regal identity are stronger than Release, Remembrance, grief, learning, and continuity. |
| `crone/seer` | Moon-oracle imagery is visually hard to distinguish from the canonical younger Visionary artwork. |
| `crone/storyteller` | `STORYTELLER` is visibly embedded in the art, duplicating the spread title. |
| `maiden/adventurer/shadows/reckless-wanderer` | A legacy “Reckless Storm” caption appears in the source and needs checking at final print scale. |
| `lover/lover/shadows/armored-lover` | Masks and performance are only an indirect proxy for defended distance; the noncanonical Aloof Sovereign candidate may be semantically clearer but is not approved. |
| `mother/mother/shadows/absent-mother` | The portrait center crop removes most dependent figures, weakening the relational subject. |
| `mother/mother/shadows/engulfing-mother` | A serpentine maternal embrace risks monstrous or blaming mother imagery. |
| `mother/guardian/shadows/open-gate` | An orphan/fallback source is acceptable only after rights and print-quality review. |
| `queen/justice/shadows/permissive-witness` | `PASSIVE BYSTANDER SHADOW` is visibly embedded, and general passivity is not identical to Mercy without Truth. |
| `queen/magician/shadows/powerless-mystic` | The canonical title is embedded in the art, duplicating print typography. |
| `crone/sage/shadows/arrogant-know-it-all` | The image was promoted from an unmatched fallback key; rights and generation provenance remain undocumented. |
| `crone/storyteller/shadows/silent-keeper` | The canonical title is embedded in the art, duplicating print typography. |
| `crone/sage/shadows/withholding-sage` | This image was reclaimed exclusively from an incorrect Closed Hearth mapping; the duplicate assignment is fixed, but provenance remains legacy and undocumented. |

## Commissioned replacements: 23 canonical mappings

Every row below has `status: approved`, a complete generation prompt, an editorial rationale, pixel dimensions, and a rights-status statement in `research/artwork-ledger.json`. “Approved” is semantic/editorial approval; publication use remains subject to the account holder’s applicable OpenAI terms.

| Canonical mapping | Current asset | Provenance ledger ID | Effective DPI |
| --- | --- | --- | ---: |
| `lover/lover/shadows/enmeshing-lover` | `assets/images/shadow/enmeshing-lover.png` | `art-enmeshing-lover-generated-2026-08-02` | 287.94 |
| `lover/healer/shadows/guarded-healer` | `assets/images/shadow/guarded-healer.png` | `art-guarded-healer-generated-2026-08-02` | 292.57 |
| `lover/creator/shadows/scattered-maker` | `assets/images/shadow/scattered-maker.png` | `art-scattered-maker-generated-2026-08-02` | 292.57 |
| `mother/guardian` | `assets/images/guardian.png` | `art-guardian-generated-2026-08-02` | 292.76 |
| `mother/host` | `assets/images/host.png` | `art-host-generated-2026-08-02` | 292.57 |
| `mother/host/shadows/closed-hearth` | `assets/images/shadow/closed-hearth.png` | `art-closed-hearth-generated-2026-08-02` | 292.57 |
| `mother/guardian/shadows/controlling-sentinel` | `assets/images/shadow/controlling-sentinel.png` | `art-controlling-sentinel-generated-2026-08-02` | 292.76 |
| `mother/community-weaver/shadows/isolated-helper` | `assets/images/shadow/isolated-helper-v2.png` | `art-isolated-helper-generated-2026-08-02` | 292.57 |
| `mother/host/shadows/martyr-host` | `assets/images/shadow/martyr-host.png` | `art-martyr-host-generated-2026-08-02` | 292.57 |
| `mother/peacemaker/shadows/peace-enforcer` | `assets/images/shadow/peace-enforcer.png` | `art-peace-enforcer-generated-2026-08-02` | 292.76 |
| `mother/warrior/shadows/rampaging-warrior` | `assets/images/shadow/rampaging-warrior.png` | `art-rampaging-warrior-generated-2026-08-02` | 292.57 |
| `mother/peacemaker/shadows/resentful-bystander` | `assets/images/shadow/resentful-bystander.png` | `art-resentful-bystander-generated-2026-08-02` | 292.57 |
| `queen/justice` | `assets/images/justice.png` | `art-justice-generated-2026-08-02` | 287.94 |
| `queen/luminary/shadows/blinding-star` | `assets/images/shadow/blinding-star.png` | `art-blinding-star-generated-2026-08-02` | 292.57 |
| `queen/magician/shadows/manipulative-sorceress` | `assets/images/shadow/manipulative-sorceress.png` | `art-manipulative-sorceress-generated-2026-08-02` | 287.94 |
| `crone/sage` | `assets/images/sage.png` | `art-sage-generated-2026-08-02` | 287.94 |
| `crone/witness` | `assets/images/witness.png` | `art-witness-generated-2026-08-02` | 292.57 |
| `crone/rebel/shadows/compliant-critic` | `assets/images/shadow/compliant-critic.png` | `art-compliant-critic-generated-2026-08-02` | 292.57 |
| `crone/witness/shadows/cynical-healer` | `assets/images/shadow/cynical-healer.png` | `art-cynical-healer-generated-2026-08-02` | 292.57 |
| `crone/witness/shadows/martyred-healer` | `assets/images/shadow/martyred-healer.png` | `art-martyred-healer-generated-2026-08-02` | 292.57 |
| `crone/seer/shadows/premature-oracle` | `assets/images/shadow/premature-oracle.png` | `art-premature-oracle-generated-2026-08-02` | 292.57 |
| `crone/crone/shadows/scorched-earth-crone` | `assets/images/shadow/scorched-earth-crone.png` | `art-scorched-earth-crone-generated-2026-08-02` | 292.57 |
| `crone/seer/shadows/withholding-seer` | `assets/images/shadow/withholding-seer.png` | `art-withholding-seer-generated-2026-08-02` | 292.57 |

The provenance ledger is the exact record for these assets. It includes the generator, full prompt, input-image list, dimensions, editorial rationale, and rights-status language; this report intentionally does not duplicate those long prompts.

## Retained legacy mappings below the reference: 43

All rows in this section retain a `legacy-project-asset`. Their current semantic status is acceptable, but their source/license or generation prompt is **not independently documented in this repository**. Every row remains blocked on both print-resolution disposition and publication-rights documentation.

### 195.05 effective DPI: 27 mappings

| Canonical mapping | Current asset | Mapping status |
| --- | --- | --- |
| `maiden/adventurer` | `assets/images/adventurer-storm.jpeg` | remapped legacy asset |
| `maiden/maiden` | `assets/images/maiden.jpeg` | reused legacy mapping |
| `maiden/visionary` | `assets/images/young-visionary-oracle.jpeg` | remapped legacy asset |
| `lover/creator` | `assets/images/creatrix-spider-weaver.jpeg` | remapped legacy asset |
| `lover/healer` | `assets/images/young-healer-priestess.jpeg` | remapped legacy asset |
| `lover/lover` | `assets/images/sacred-whore-love-goddess.jpeg` | remapped legacy asset |
| `mother/community-weaver` | `assets/images/weaver-community-goddess.jpeg` | remapped legacy asset |
| `mother/mother` | `assets/images/mother.jpeg` | reused legacy mapping |
| `mother/peacemaker` | `assets/images/peacemaker-peace-bringer.jpeg` | remapped legacy asset |
| `mother/warrior` | `assets/images/warrior-warrioress-huntress.jpeg` | remapped legacy asset |
| `queen/luminary` | `assets/images/sky-sun-star-goddess.jpeg` | remapped legacy asset |
| `queen/magician` | `assets/images/magician-alchemist-witch-scribe.jpeg` | remapped legacy asset |
| `queen/queen` | `assets/images/queen-hearth-keeper.jpeg` | remapped legacy asset |
| `crone/crone` | `assets/images/crone-underworld-queen.jpeg` | remapped legacy asset |
| `crone/rebel` | `assets/images/rebel-revolutionary-trickster.jpeg` | remapped legacy asset |
| `crone/seer` | `assets/images/elder-visionary-oracle-moon.jpeg` | remapped legacy asset |
| `crone/storyteller` | `assets/images/storyteller.jpeg` | remapped legacy asset |
| `maiden/maiden/shadows/frozen-beginner` | `assets/images/shadow/maiden--fragile-maiden.jpg` | remapped legacy asset |
| `maiden/maiden/shadows/naive-enthusiast` | `assets/images/shadow/maiden--manipulative-maiden.jpg` | remapped legacy asset |
| `maiden/visionary/shadows/self-doubting-seer` | `assets/images/shadow/young-visionary-oracle--lost-dreamer.jpg` | remapped legacy asset |
| `maiden/adventurer/shadows/sheltered-dreamer` | `assets/images/shadow/adventurer-storm-tempest--paralyzed-dreamer.jpg` | remapped legacy asset |
| `lover/lover/shadows/armored-lover` | `assets/images/shadow/sacred-lover-love-goddess--disconnected-performer.jpg` | remapped legacy asset |
| `lover/creator/shadows/compulsive-perfecter` | `assets/images/shadow/creatrix-spider-weaver--perfectionist-creator.jpg` | remapped legacy asset |
| `lover/healer/shadows/rescuing-healer` | `assets/images/shadow/young-healer-priestess--savior-complex.jpg` | remapped legacy asset |
| `mother/mother/shadows/engulfing-mother` | `assets/images/shadow/mother--smothering-mother.jpg` | remapped legacy asset |
| `mother/community-weaver/shadows/enmeshing-networker` | `assets/images/shadow/weaver-community-goddess--controlling-networker.png` | remapped legacy asset |
| `crone/rebel/shadows/chaotic-rebel` | `assets/images/shadow/rebel-revolutionary-trickster--chaotic-destroyer.jpg` | remapped legacy asset |

### 167.62 effective DPI: 16 mappings

| Canonical mapping | Current asset | Mapping status |
| --- | --- | --- |
| `maiden/visionary/shadows/inflated-oracle` | `assets/images/shadow/young-visionary-oracle--fanatic-prophet.jpg` | remapped legacy asset |
| `maiden/adventurer/shadows/reckless-wanderer` | `assets/images/shadow/adventurer-storm-tempest--reckless-storm.jpg` | remapped legacy asset |
| `mother/mother/shadows/absent-mother` | `assets/images/shadow/mother--absent-mother.jpg` | reused legacy mapping |
| `mother/warrior/shadows/disarmed-warrior` | `assets/images/shadow/warrior-warrioress-huntress--collapsed-fighter.jpg` | remapped legacy asset |
| `mother/guardian/shadows/open-gate` | `assets/images/shadow/unmatched--boundaryless-protector.jpg` | remapped legacy asset |
| `queen/queen/shadows/abdicating-queen` | `assets/images/shadow/queen-hearth-keeper--powerless-ruler.jpg` | remapped legacy asset |
| `queen/luminary/shadows/hidden-light` | `assets/images/shadow/sky-sun-star-goddess--disconnected-deity.jpg` | remapped legacy asset |
| `queen/justice/shadows/merciless-judge` | `assets/images/shadow/justice--harsh-judge.jpg` | remapped legacy asset |
| `queen/justice/shadows/permissive-witness` | `assets/images/shadow/justice--passive-bystander.jpg` | remapped legacy asset |
| `queen/magician/shadows/powerless-mystic` | `assets/images/shadow/magician-alchemist-witch-scribe--powerless-mystic.jpg` | remapped legacy asset |
| `queen/queen/shadows/tyrannical-queen` | `assets/images/shadow/queen-hearth-keeper--tyrannical-queen.jpg` | remapped legacy asset |
| `crone/sage/shadows/arrogant-know-it-all` | `assets/images/shadow/unmatched--arrogant-know-it-all.jpg` | remapped legacy asset |
| `crone/storyteller/shadows/exaggerating-dramatist` | `assets/images/shadow/storyteller--exaggerating-dramatist.jpg` | remapped legacy asset |
| `crone/crone/shadows/relic-keeper` | `assets/images/shadow/crone-underworld-queen--eternal-mourner.jpg` | remapped legacy asset |
| `crone/storyteller/shadows/silent-keeper` | `assets/images/shadow/storyteller--silent-keeper.jpg` | remapped legacy asset |
| `crone/sage/shadows/withholding-sage` | `assets/images/shadow/sage-wisdom--withholding-sage.jpg` | remapped legacy asset |

The 3 reused rows and 40 remapped rows above account for all 43 retained legacy canonical mappings. Their migration decisions are traceable through the `migration_ledger_rows` embedded in the scratch JSON and the corresponding numbered rows in `editorial/migration-ledger.md`.

## Noncanonical orphan and alternate assets

The scratch inventory contains 99 source assets. Sixty-six are selected by canonical entries; the following 33 are not canonical entry mappings. They must not be counted as alternatives already approved for publication, and their presence does not create an additional archetype or shadow. “Noncanonical” is a mapping status, not authorization to delete the file.

`src/assets/images/cover.jpeg` is a publication cover support asset rather than entry artwork. The remaining files are legacy alternates, merged candidates, retired identities, or otherwise unselected assets:

- `src/assets/images/elder-healer-priestess.jpeg`
- `src/assets/images/guardian-buffalo-woman.jpeg`
- `src/assets/images/justice-maat.jpeg`
- `src/assets/images/muse-song-goddess.jpeg`
- `src/assets/images/sage-wisdom-athena.jpeg`
- `src/assets/images/wife-nurturer-hestia.jpeg`
- `src/assets/images/shadow/48_Devoted_Consort_Beloved_Main`
- `src/assets/images/shadow/49_Enmeshing_Worshipper_Shadow.png`
- `src/assets/images/shadow/50_Aloof_Sovereign_Shadow.png`
- `src/assets/images/shadow/consumed shadow.jpeg`
- `src/assets/images/shadow/creatrix-spider-weaver--blocked-artist.jpg`
- `src/assets/images/shadow/crone-underworld-queen--destructive-death-bringer.jpg`
- `src/assets/images/shadow/elder-healer-priestess--burned-out-wise-woman.jpg`
- `src/assets/images/shadow/elder-healer-priestess--controlling-healer.jpg`
- `src/assets/images/shadow/elder-visionary-oracle-moon--dogmatic-prophet.jpg`
- `src/assets/images/shadow/elder-visionary-oracle-moon--escapist-dreamer.jpg`
- `src/assets/images/shadow/guardian-buffalo-woman--rigid-gatekeeper.jpg`
- `src/assets/images/shadow/muse-song-goddess--chaotic-inspiration.jpg`
- `src/assets/images/shadow/muse-song-goddess--fickle-wanderer.jpg`
- `src/assets/images/shadow/peacemaker-peace-bringer--conflict-avoider.jpg`
- `src/assets/images/shadow/peacemaker-peace-bringer--passive-enabler.jpg`
- `src/assets/images/shadow/possessive shadow.jpeg`
- `src/assets/images/shadow/rebel-revolutionary-trickster--conformist-rebel.jpg`
- `src/assets/images/shadow/sacred-lover-love-goddess--seductive-enchantress.jpg`
- `src/assets/images/shadow/sky-sun-star-goddess--prideful-dominator.jpg`
- `src/assets/images/shadow/unmatched--bitter-crone.jpg`
- `src/assets/images/shadow/unmatched--gossiping-storyteller.jpg`
- `src/assets/images/shadow/unmatched--self-erasing-servant.jpg`
- `src/assets/images/shadow/warrior-warrioress-huntress--aggressive-bully.jpg`
- `src/assets/images/shadow/weaver-community-goddess--codependent-helper.jpg`
- `src/assets/images/shadow/wife-nurturer-hearth-goddess--enabling-doormat.jpg`
- `src/assets/images/shadow/young-healer-priestess--burned-out-healer.jpg`

The extensionless PNG candidate `shadow/48_Devoted_Consort_Beloved_Main` remains noncanonical and should not be normalized or promoted without a new mapping decision and provenance review.

## Reproducible audit

Run these commands from the repository root. The classifier writes only the scratch audit directory; do not stage its regenerated files unless the project deliberately changes that policy.

```bash
# Regenerate the machine-readable inventory and contact sheets.
node .superpowers/sdd/artwork-audit-prep/build-audit.mjs

# Confirm the headline counts and open gates.
jq '{scope, summary}' .superpowers/sdd/artwork-audit-prep/artwork-inventory.json

# Confirm all canonical Markdown/generated mappings agree and files exist.
jq '[.canonical_mappings[] | select((.file_present | not) or (.markdown_generated_mapping_match | not))]' \
  .superpowers/sdd/artwork-audit-prep/artwork-inventory.json

# List commissioned mappings and their exact provenance records.
jq -r '.records[] | [.assignment, .file, .id, .pixelDimensions, .status] | @tsv' \
  research/artwork-ledger.json

# List every canonical mapping below the Mature Masculine reference.
jq -r '.canonical_mappings[] | select(.asset.print_metrics.meets_masculine_reference_dpi == false) |
  [.canonical_id, .markdown_image, .asset.print_metrics.effective_dpi_after_center_crop] | @tsv' \
  .superpowers/sdd/artwork-audit-prep/artwork-inventory.json

# List noncanonical assets.
jq -r '.source_assets[] | select((.assigned_canonical_entries | length) == 0) | .path' \
  .superpowers/sdd/artwork-audit-prep/artwork-inventory.json

# Verify commissioned provenance records and canonical mappings.
node --test test/artwork_provenance.test.js
```

## Publication blockers

1. **Forty-three retained legacy canonical mappings are below the 285.29-DPI Mature Masculine production reference** after the actual 3.40 × 5.25-inch crop. This is not cleared by semantic fit or by nominal source dimensions.
2. **Those same 43 legacy assets lack independently documented source/license or generation-prompt provenance in the repository.** Publication clearance remains with the project owner until evidence is recorded.
3. **The 23 commissioned assets require an account-holder terms check.** Their ledger says they were generated specifically for this project with no external source image supplied, but publication use remains subject to applicable OpenAI terms.

No missing-file or current semantic-mismatch blocker remains. The next artwork decision is therefore not another taxonomy pass: it is a documented resolution and rights disposition for each retained legacy mapping, followed by production proofing of any approved exception.
