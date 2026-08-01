const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const quotations = require("../research/quotation-ledger.json").records;
const myths = require("../research/mythic-resonance-ledger.json").records;

function record(records, id) {
  const match = records.find((item) => item.id === id);
  assert.ok(match, `${id} must resolve`);
  return match;
}

test("Shelley quotation preserves the complete source sentence", () => {
  const shelley = record(quotations, "quote-visionary-opening-shelley-invention-chaos");
  assert.equal(
    shelley.exactQuotation,
    "Invention, it must be humbly admitted, does not consist in creating out of void, but out of chaos; the materials must, in the first place, be afforded: it can give form to dark, shapeless substances, but cannot bring into being the substance itself.",
  );
});

test("Alcott quotation preserves its opening clause and global chapter locator", () => {
  const alcott = record(quotations, "quote-frozen-beginner-closing-alcott-learning-sail");
  assert.equal(
    alcott.exactQuotation,
    "Lovely weather so far; I don’t know how long it will last, but I’m not afraid of storms, for I’m learning how to sail my ship.",
  );
  assert.equal(alcott.origin.location, "global chapter XLIV, ‘My Lord and Lady’");
});

test("Atalanta record omits the unsupported first-wound claim", () => {
  const atalanta = record(myths, "myth-adventurer-atalanta-apollodorus-library-3");
  assert.doesNotMatch(`${atalanta.relevantFunction} ${atalanta.verificationNotes}`, /first wounds?/i);
});

test("Self-Doubting Seer resolves to mechanism-specific research", () => {
  const romola = record(
    myths,
    "myth-self-doubting-seer-romola-eliot-chapter-40",
  );
  assert.equal(romola.figure, "Romola");
  assert.match(romola.relevantFunction, /spiritual authority/i);
  assert.match(romola.verificationNotes, /unfinished warning/i);
  assert.match(romola.culturalContextNote, /coercive marriage/i);
  assert.match(romola.culturalContextNote, /not.*Catholicism|not.*Dominican/i);
});

test("Leavitt quotation records the modest Table VI observation", () => {
  const leavitt = record(
    quotations,
    "quote-self-doubting-seer-closing-leavitt-brighter-variables",
  );
  assert.equal(
    leavitt.exactQuotation,
    "It is worthy of notice that in Table VI the brighter variables have the longer periods.",
  );
  assert.equal(leavitt.origin.location, "page 107, paragraph following Table VI");
});

test("Wollstonecraft verification relies only on displayed Gutenberg evidence", () => {
  const wollstonecraft = record(
    quotations,
    "quote-naive-enthusiast-closing-wollstonecraft-unstable-mind",
  );
  assert.ok(!Object.hasOwn(wollstonecraft, "corroboratingUrl"));
  assert.doesNotMatch(wollstonecraft.verificationNotes, /Cambridge/i);
});

test("reviewed Maiden manuscripts print the repaired source assignments", () => {
  const visionary = fs.readFileSync("content/maiden/archetypes/visionary.md", "utf8");
  const frozen = fs.readFileSync("content/maiden/shadows/frozen-beginner.md", "utf8");
  const selfDoubting = fs.readFileSync("content/maiden/shadows/self-doubting-seer.md", "utf8");

  assert.match(visionary, /the materials must, in the first place, be afforded:/);
  assert.match(frozen, /“Lovely weather so far;/);
  assert.match(
    selfDoubting,
    /mythicSourceIds: myth-self-doubting-seer-romola-eliot-chapter-40/,
  );
  assert.match(
    selfDoubting,
    /quote-self-doubting-seer-closing-leavitt-brighter-variables/,
  );
});
