const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const quotations = require("../research/quotation-ledger.json").records;
const myths = require("../research/mythic-resonance-ledger.json").records;

const spreads = [
  "mother",
  "engulfing-mother",
  "absent-mother",
  "guardian",
  "controlling-sentinel",
  "open-gate",
  "warrior",
  "rampaging-warrior",
  "disarmed-warrior",
];

function record(records, id) {
  const match = records.find((item) => item.id === id);
  assert.ok(match, `${id} must resolve`);
  return match;
}

test("Mother care, protection, and defense records are complete and independent", () => {
  const assignedQuotes = quotations.filter((item) => spreads.includes(item.assignedSpread));
  const assignedMyths = myths.filter((item) => spreads.includes(item.assignedSpread));

  assert.equal(assignedQuotes.length, 18);
  assert.equal(new Set(assignedQuotes.map((item) => item.id)).size, 18);
  assert.equal(new Set(assignedQuotes.map((item) => item.exactQuotation)).size, 18);
  assert.equal(assignedMyths.length, 9);
  assert.equal(new Set(assignedMyths.map((item) => item.id)).size, 9);
  assert.equal(new Set(assignedMyths.map((item) => item.figure)).size, 9);

  for (const spread of spreads) {
    const spreadQuotes = assignedQuotes.filter((item) => item.assignedSpread === spread);
    const spreadMyths = assignedMyths.filter((item) => item.assignedSpread === spread);
    assert.deepEqual(spreadQuotes.map((item) => item.position), ["opening", "closing"]);
    assert.equal(spreadMyths.length, 1);
    assert.equal(spreadMyths[0].verificationStatus, "verified");
  }
});

test("Mother and Guardian source records retain their necessary scope limits", () => {
  const mill = record(quotations, "quote-guardian-opening-mill-harm");
  assert.match(mill.context, /mature faculties|competent adults/i);
  assert.match(mill.verificationNotes, /children|dependent/i);
  assert.equal(mill.exactQuotation.includes("civilised"), true);
  assert.match(mill.exactQuotation, /^\[T\]he only purpose/);
  assert.match(mill.verificationNotes, /source begins.*That the only purpose/i);

  const burnett = record(quotations, "quote-absent-mother-opening-burnett-out-of-sight");
  assert.match(burnett.exactQuotation, /keep the child out of sight as much as possible\.$/);
  assert.match(`${burnett.context} ${burnett.verificationNotes}`, /colonial/i);
  assert.match(`${burnett.context} ${burnett.verificationNotes}`, /Ayah/i);

  const montessori = record(quotations, "quote-mother-opening-montessori-individual-aims");
  assert.equal(montessori.origin.publicationDetails.includes("Anne E. George"), true);
  assert.match(`${montessori.context} ${montessori.verificationNotes}`, /disability|continuing support/i);
});

test("active and passive Mother shadows use exact restoration evidence", () => {
  const austen = record(quotations, "quote-rampaging-warrior-closing-austen-angry-wise");
  assert.equal(austen.exactQuotation, "[A]ngry people are not always wise.");
  assert.match(austen.verificationNotes, /lowercase/i);
  assert.match(austen.verificationNotes, /bracket/i);

  const unavailable = record(myths, "myth-absent-mother-victor-frankenstein-chapter-5");
  assert.match(unavailable.culturalContextNote, /systemic deprivation|capacity/i);

  const disarmed = record(myths, "myth-disarmed-warrior-hamlet-shakespeare-3-1");
  assert.match(disarmed.culturalContextNote, /freeze|fawn/i);
  assert.match(disarmed.culturalContextNote, /revenge/i);
  assert.match(disarmed.culturalContextNote, /not.*integration/i);
  assert.match(disarmed.relevantFunction, /suicide soliloquy/i);
  assert.match(disarmed.verificationNotes, /act II, scene 2/i);
  assert.match(disarmed.verificationNotes, /act III, scene 1/i);
  assert.match(disarmed.verificationNotes, /act III, scene 4/i);
  assert.match(disarmed.culturalContextNote, /suicid/i);
  assert.equal(Array.isArray(disarmed.corroboratingUrls), true);
  assert.equal(disarmed.corroboratingUrls.length >= 3, true);
});

test("Mulan evidence is verification-only and excludes later adaptations", () => {
  const mulan = record(myths, "myth-warrior-mulan-ballad");
  assert.equal(mulan.figure, "Mulan");
  assert.match(mulan.verificationNotes, /verification only/i);
  assert.match(mulan.verificationNotes, /all rights reserved/i);
  assert.match(mulan.culturalContextNote, /Disney/i);
  assert.match(mulan.culturalContextNote, /not sacred/i);
});

test("reviewed Mother manuscripts print canonical titles and source assignments", () => {
  const mother = fs.readFileSync("content/mother/archetypes/mother.md", "utf8");
  const unavailable = fs.readFileSync("content/mother/shadows/absent-mother.md", "utf8");
  const guardian = fs.readFileSync("content/mother/archetypes/guardian.md", "utf8");
  const warrior = fs.readFileSync("content/mother/archetypes/warrior.md", "utf8");

  assert.match(mother, /Mature Mother = Nurture \+ Autonomy/);
  assert.match(unavailable, /^# Unavailable Mother$/m);
  assert.match(unavailable, /myth-absent-mother-victor-frankenstein-chapter-5/);
  assert.match(guardian, /myth-guardian-scylding-coastguard-beowulf-4/);
  assert.match(warrior, /myth-warrior-mulan-ballad/);
  assert.doesNotMatch(warrior, /The Mature Warrioress|The Huntress archetype/);
});
