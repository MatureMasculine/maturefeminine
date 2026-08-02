const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const quotations = require("../research/quotation-ledger.json").records;
const myths = require("../research/mythic-resonance-ledger.json").records;

const trios = {
  crone: ["crone", "scorched-earth-crone", "relic-keeper"],
  witness: ["witness", "martyred-healer", "cynical-healer"],
  seer: ["seer", "premature-oracle", "withholding-seer"],
  rebel: ["rebel", "chaotic-rebel", "compliant-critic"],
  sage: ["sage", "arrogant-know-it-all", "withholding-sage"],
  storyteller: ["storyteller", "exaggerating-dramatist", "silent-keeper"],
};

const spreads = Object.values(trios).flat();
const parents = new Set(Object.keys(trios));

const expected = {
  crone: ["quote-crone-opening-dickinson-my-life-closed-twice", "quote-crone-closing-rossetti-remember", "myth-crone-demeter-homeric-hymn", "Demeter"],
  "scorched-earth-crone": ["quote-scorched-opening-euripides-medea", "quote-scorched-closing-bronte-jane-eyre", "myth-scorched-hecuba-euripides", "Hecuba"],
  "relic-keeper": ["quote-relic-opening-bronte-wuthering-heights", "quote-relic-closing-longfellow-psalm-of-life", "myth-relic-miss-havisham-great-expectations", "Miss Havisham"],
  witness: ["quote-witness-opening-eliot-middlemarch", "quote-witness-closing-julian-revelations", "myth-witness-sonya-crime-and-punishment", "Sofya (Sonya) Semyonovna Marmeladova"],
  "martyred-healer": ["quote-martyred-opening-wilde-happy-prince", "quote-martyred-closing-nightingale-nurses", "myth-martyred-little-mermaid-andersen", "The Little Mermaid"],
  "cynical-healer": ["quote-cynical-opening-dickens-christmas-carol", "quote-cynical-closing-tolstoy-what-men-live-by", "myth-cynical-silas-marner", "Silas Marner"],
  seer: ["quote-seer-opening-browning-aurora-leigh", "quote-seer-closing-thoreau-walden", "myth-seer-cumaean-sibyl-aeneid", "Cumaean Sibyl"],
  "premature-oracle": ["quote-premature-opening-shakespeare-othello", "quote-premature-closing-dickinson-tell-all-truth", "myth-premature-weird-sisters-macbeth", "The Weird Sisters"],
  "withholding-seer": ["quote-withholding-seer-opening-shakespeare-julius-caesar", "quote-withholding-seer-closing-wollstonecraft-vindication", "myth-withholding-seer-tiresias-oedipus", "Tiresias"],
  rebel: ["quote-rebel-opening-grimke-letters-beecher", "quote-rebel-closing-douglass-west-india-emancipation", "myth-rebel-antigone-sophocles", "Antigone"],
  "chaotic-rebel": ["quote-chaotic-opening-dickens-tale-two-cities", "quote-chaotic-closing-ruskin-seven-lamps", "myth-chaotic-jack-cade-henry-vi-2", "Jack Cade"],
  "compliant-critic": ["quote-compliant-opening-mill-on-liberty", "quote-compliant-closing-stanton-solitude-self", "myth-compliant-prufrock", "J. Alfred Prufrock"],
  sage: ["quote-sage-opening-bacon-advancement-learning", "quote-sage-closing-lovelace-analytical-engine", "myth-sage-athena-odyssey", "Athena"],
  "arrogant-know-it-all": ["quote-arrogant-opening-pope-essay-criticism", "quote-arrogant-closing-austen-pride-prejudice", "myth-arrogant-oedipus", "Oedipus"],
  "withholding-sage": ["quote-withholding-sage-opening-bradstreet-prologue", "quote-withholding-sage-closing-astell-reflections-marriage", "myth-withholding-casaubon-middlemarch", "Edward Casaubon"],
  storyteller: ["quote-storyteller-opening-tennyson-ulysses", "quote-storyteller-closing-eliot-adam-bede", "myth-storyteller-scheherazade-arabian-nights", "Scheherazade"],
  "exaggerating-dramatist": ["quote-exaggerating-opening-byron-don-juan", "quote-exaggerating-closing-scott-marmion", "myth-exaggerating-baron-munchausen", "Baron Munchausen"],
  "silent-keeper": ["quote-silent-opening-gray-elegy", "quote-silent-closing-dickinson-letter-world", "myth-silent-lucy-snowe-villette", "Lucy Snowe"],
};

const images = {
  crone: "assets/images/commissioned/crone/crone.png",
  "scorched-earth-crone": "assets/images/shadow/scorched-earth-crone.png",
  "relic-keeper": "assets/images/commissioned/crone/relic-keeper.png",
  witness: "assets/images/witness.png",
  "martyred-healer": "assets/images/shadow/martyred-healer.png",
  "cynical-healer": "assets/images/shadow/cynical-healer.png",
  seer: "assets/images/commissioned/crone/seer.png",
  "premature-oracle": "assets/images/shadow/premature-oracle.png",
  "withholding-seer": "assets/images/shadow/withholding-seer.png",
  rebel: "assets/images/commissioned/crone/rebel.png",
  "chaotic-rebel": "assets/images/commissioned/crone/chaotic-rebel.png",
  "compliant-critic": "assets/images/shadow/compliant-critic.png",
  sage: "assets/images/sage.png",
  "arrogant-know-it-all": "assets/images/commissioned/crone/arrogant-know-it-all.png",
  "withholding-sage": "assets/images/commissioned/crone/withholding-sage.png",
  storyteller: "assets/images/commissioned/crone/storyteller.png",
  "exaggerating-dramatist": "assets/images/commissioned/crone/exaggerating-dramatist.png",
  "silent-keeper": "assets/images/commissioned/crone/silent-keeper.png",
};

function sourcePath(slug) {
  return path.join("content", "crone", parents.has(slug) ? "archetypes" : "shadows", `${slug}.md`);
}

function manuscript(slug) {
  return fs.readFileSync(sourcePath(slug), "utf8");
}

function metadata(source, key) {
  const match = source.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  assert.ok(match, `${key} must exist`);
  return match[1];
}

function section(source, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`## ${escaped}\\n\\n([\\s\\S]*?)(?=\\n## |$)`));
  assert.ok(match, `${heading} must exist`);
  return match[1].trim();
}

function quotationText(source, heading) {
  return section(source, heading).replace(/^> ?/gm, "");
}

function roles(source) {
  return Object.fromEntries(metadata(source, "sectionRoles").split("|").map((item) => item.split("=")));
}

function bodyWithoutResearchDisplay(source) {
  return source
    .replace(/^---[\s\S]*?---\n/, "")
    .replace(/## Opening Quotation\n[\s\S]*?(?=\n## )/, "")
    .replace(/## Profile\n[\s\S]*?(?=\n## )/, "")
    .replace(/## Closing Quotation\n[\s\S]*$/, "");
}

test("Crone ledgers contain the complete independently verified source packet", () => {
  const assignedQuotes = quotations.filter((item) => spreads.includes(item.assignedSpread));
  const assignedMyths = myths.filter((item) => spreads.includes(item.assignedSpread));

  assert.equal(assignedQuotes.length, 36);
  assert.equal(new Set(assignedQuotes.map((item) => item.id)).size, 36);
  assert.equal(new Set(assignedQuotes.map((item) => item.exactQuotation)).size, 36);
  assert.equal(assignedMyths.length, 18);
  assert.equal(new Set(assignedMyths.map((item) => item.id)).size, 18);
  assert.equal(new Set(assignedMyths.map((item) => item.figure)).size, 18);

  for (const [parent, trio] of Object.entries(trios)) {
    const trioQuotes = assignedQuotes.filter((item) => trio.includes(item.assignedSpread));
    const trioMyths = assignedMyths.filter((item) => trio.includes(item.assignedSpread));
    const workKeys = [...trioQuotes.map((item) => item.origin.work), ...trioMyths.map((item) => item.source.originatingWork)];
    assert.equal(new Set(workKeys).size, 9, `${parent} trio must use nine distinct source works`);
  }

  for (const slug of spreads) {
    const spreadQuotes = assignedQuotes.filter((item) => item.assignedSpread === slug);
    const spreadMyths = assignedMyths.filter((item) => item.assignedSpread === slug);
    assert.deepEqual(spreadQuotes.map((item) => item.id), expected[slug].slice(0, 2));
    assert.deepEqual(spreadQuotes.map((item) => item.position), ["opening", "closing"]);
    assert.equal(spreadMyths.length, 1);
    assert.equal(spreadMyths[0].id, expected[slug][2]);
    assert.equal(spreadMyths[0].figure, expected[slug][3]);

    for (const quote of spreadQuotes) {
      assert.equal(quote.verificationStatus, "verified");
      assert.match(quote.rightsStatus, /public domain/i);
      assert.match(quote.sourceUrl, /^https:\/\//);
      assert.match(quote.corroboratingUrl, /^https:\/\//);
      for (const field of ["work", "workType", "location", "publicationDetails"]) {
        assert.match(quote.origin[field], /\S/, `${quote.id} origin.${field}`);
      }
      assert.match(quote.context, /\S/);
      assert.match(quote.verificationNotes, /\S/);
    }

    const myth = spreadMyths[0];
    assert.equal(myth.verificationStatus, "verified");
    assert.match(myth.rightsStatus, /public domain in the United States/i);
    assert.match(myth.source.url, /^https:\/\//);
    for (const field of ["title", "authorOrInstitution", "originatingWork", "location", "publicationDetails"]) {
      assert.match(myth.source[field], /\S/, `${myth.id} source.${field}`);
    }
    assert.match(myth.relevantFunction, /\S/);
    assert.match(myth.verificationNotes, /\S/);
    assert.match(myth.culturalContextNote, /\S/);
  }
});

test("Crone manuscripts preserve taxonomy, commissioned artwork, and exact research", () => {
  for (const [parent, trio] of Object.entries(trios)) {
    for (const slug of trio) {
      const source = manuscript(slug);
      const spreadQuotes = quotations.filter((item) => item.assignedSpread === slug);
      const spreadMyths = myths.filter((item) => item.assignedSpread === slug);
      assert.equal(metadata(source, "lifecycle"), "crone");
      assert.equal(metadata(source, "image"), images[slug]);
      assert.equal(metadata(source, "researchStatus"), "verified");
      assert.deepEqual(metadata(source, "quoteIds").split("|"), expected[slug].slice(0, 2));
      assert.equal(metadata(source, "mythicSourceIds"), expected[slug][2]);
      assert.match(metadata(source, "mythicResonances"), /\S/);
      assert.ok(quotationText(source, "Opening Quotation").includes(spreadQuotes[0].exactQuotation), `${slug} opening quotation drift`);
      assert.ok(quotationText(source, "Closing Quotation").includes(spreadQuotes[1].exactQuotation), `${slug} closing quotation drift`);
      assert.ok(section(source, "Profile").includes(`- Mythic resonances: ${metadata(source, "mythicResonances")}`));
      assert.equal(spreadMyths[0].id, metadata(source, "mythicSourceIds"));

      if (slug !== parent) {
        assert.equal(metadata(source, "parent"), parent);
        assert.equal(metadata(source, "oppositeShadowSlug"), trio.find((item) => item !== parent && item !== slug));
      }
    }
  }
});

test("Crone manuscripts satisfy full spread structure and shared-practice voice", () => {
  for (const [parent, trio] of Object.entries(trios)) {
    for (const slug of trio) {
      const source = manuscript(slug);
      const entryRoles = roles(source);
      const expectedRoles = parents.has(slug)
        ? ["definition", "declarations", "balance", "applications", "gifts", "practices", "conclusion"]
        : ["balanceBreakdown", "declarations", "psychologicalMechanics", "hiddenEnergy", "recognition", "practices", "oppositeShadow", "transformation", "conclusion"];
      assert.deepEqual(Object.keys(entryRoles), expectedRoles, `${slug} section role contract`);
      for (const heading of Object.values(entryRoles)) {
        assert.ok(section(source, heading).length >= 80, `${slug} ${heading} must be substantive`);
      }

      const declarations = section(source, entryRoles.declarations).split("\n").filter((line) => line.startsWith("- "));
      assert.equal(declarations.length, parents.has(slug) ? 10 : 8, `${slug} declaration count`);
      for (const declaration of declarations) assert.match(declaration, /\.$/);

      const practices = section(source, entryRoles.practices).split("\n").filter((line) => line.startsWith("- "));
      assert.ok(practices.length >= 6, `${slug} must have at least six practices`);
      for (const practice of practices) {
        assert.match(practice, /^- We\b/);
        assert.match(practice, /[.!?][”’"]?$/);
      }

      const profile = section(source, "Profile");
      assert.equal((profile.match(/^- [^:]+:/gm) || []).length, 7, `${slug} profile field count`);
      assert.match(profile, new RegExp(`- Balanced qualities: Mature ${parent.replace(/(^|-)([a-z])/g, (_, sep, letter) => `${sep ? " " : ""}${letter.toUpperCase()}`)} = .+ \\+ .+`, "i"));
    }
  }
});

test("Crone resonances stay confined to the profile", () => {
  for (const slug of spreads) {
    const source = manuscript(slug);
    const figure = expected[slug][3];
    const needles = [figure];
    if (figure.includes("(")) needles.push(figure.match(/\(([^)]+)\)/)[1]);
    for (const needle of needles) {
      assert.doesNotMatch(bodyWithoutResearchDisplay(source), new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"));
    }
  }
});
