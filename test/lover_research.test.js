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

test("Whitman closing matches the authoritative 1855 text and exposes inspectable evidence", () => {
  const whitman = record(quotations, "quote-creator-closing-whitman-simplicity");
  assert.equal(
    whitman.exactQuotation,
    "The art of art, the glory of expression and the sunshine of the light of letters is simplicity.",
  );
  assert.equal(
    whitman.sourceUrl,
    "https://whitmanarchive.org/item/ppp.00271_preface",
  );
  assert.equal(
    whitman.corroboratingUrl,
    "https://raw.githubusercontent.com/whitmanarchive/whitman-leaves_of_grass/main/source/tei/ppp.00271.xml",
  );
  assert.match(whitman.verificationNotes, /1855/i);
  assert.match(whitman.verificationNotes, /no comma/i);
});

test("Eliot Healer opening transparently marks its excerpted initial", () => {
  const eliot = record(quotations, "quote-healer-opening-eliot-compassion-speaks");
  assert.equal(
    eliot.exactQuotation,
    "[P]ity is strong only because we are strongly impressed by suffering; and only in proportion as it is compassion that speaks through the eyes when we soothe, and moves the arm when we succor, is a deed strictly benevolent.",
  );
  assert.match(eliot.verificationNotes, /begins lowercase/i);
  assert.match(eliot.verificationNotes, /longer semicolon-linked sentence/i);
});

test("Wilde Guarded opening preserves the contiguous dialogue and punctuation", () => {
  const wilde = record(quotations, "quote-guarded-healer-opening-wilde-selfish-garden");
  assert.equal(
    wilde.exactQuotation,
    "“My own garden is my own garden,” said the Giant; “any one can understand that, and I will allow nobody to play in it but myself.”",
  );
});

test("Guarded Healer closes with an honest Addams excerpt about common life", () => {
  const addams = record(quotations, "quote-guarded-healer-closing-addams-common-life");
  assert.equal(
    addams.exactQuotation,
    "[T]he good we secure for ourselves is precarious and uncertain, is floating in mid-air, until it is secured for all of us and incorporated into our common life.",
  );
  assert.equal(
    addams.sourceUrl,
    "https://archive.org/details/philanthropysoci00newy/page/n23/mode/2up",
  );
  assert.equal(
    addams.corroboratingUrl,
    "https://archive.org/download/philanthropysoci00newy/philanthropysoci00newy.pdf",
  );
  assert.match(addams.verificationNotes, /source begins “that the good/i);
  assert.match(addams.verificationNotes, /semicolon series/i);
  assert.equal(
    quotations.some((item) => item.id === "quote-guarded-healer-closing-eliot-diffusive"),
    false,
  );
});

test("Dorian Gray quotation uses a live source whose content contains the line", () => {
  const wilde = record(quotations, "quote-compulsive-perfecter-opening-wilde-conceal-life");
  assert.equal(
    wilde.sourceUrl,
    "https://www.gutenberg.org/files/174/174-h/174-h.htm",
  );
  assert.match(wilde.verificationNotes, /retrieved as nonempty HTML/i);
  assert.match(wilde.verificationNotes, /contains the exact sentence/i);
  assert.doesNotMatch(wilde.sourceUrl, /virginia\.edu/i);
});

test("Rescuing Healer uses the Swallow's compassion and unsustainable self-sacrifice", () => {
  const swallow = record(
    myths,
    "myth-rescuing-healer-swallow-wilde-happy-prince",
  );
  assert.equal(swallow.figure, "The Swallow");
  assert.match(swallow.relevantFunction, /one night/i);
  assert.match(swallow.relevantFunction, /stay with you always/i);
  assert.match(swallow.relevantFunction, /colder and colder/i);
  assert.match(swallow.culturalContextNote, /honors? (?:the )?sacrifice/i);
  assert.match(swallow.culturalContextNote, /death|exhaustion/i);
  assert.match(swallow.culturalContextNote, /not a modern consent model/i);
  assert.equal(
    myths.some((item) => item.id === "myth-rescuing-healer-asclepius-apollodorus-3"),
    false,
  );
});

test("Healer declaration returns responsibility without claiming Witness territory", () => {
  const healer = fs.readFileSync("content/lover/archetypes/healer.md", "utf8");
  assert.match(
    healer,
    /- I return responsibility as capacity grows rather than making my help permanent\./,
  );
  assert.doesNotMatch(healer, /nothing more (?:for me )?to fix/i);
});

test("Healer closes with Nightingale's historically scoped do-no-harm principle", () => {
  const nightingale = record(
    quotations,
    "quote-healer-closing-nightingale-do-no-harm",
  );
  assert.equal(
    nightingale.exactQuotation,
    "It may seem a strange principle to enunciate as the very first requirement in a Hospital that it should do the sick no harm.",
  );
  assert.equal(
    nightingale.sourceUrl,
    "https://archive.org/details/cu31924012356485",
  );
  assert.match(nightingale.verificationNotes, /opening unnumbered page \[iii\]/i);
  assert.match(nightingale.verificationNotes, /hospital construction/i);
  assert.equal(
    quotations.some((item) => item.id === "quote-healer-closing-nightingale-nature-cures"),
    false,
  );
});

test("Good Samaritan record distinguishes finite handoff from open reimbursement", () => {
  const samaritan = record(myths, "myth-healer-good-samaritan-luke-10");
  assert.match(samaritan.relevantFunction, /finite immediate payment/i);
  assert.match(samaritan.relevantFunction, /open reimbursement promise/i);
  assert.doesNotMatch(samaritan.relevantFunction, /bounded continuing commitment/i);
});

test("Rescuing Nightingale is not presented as a modern consent model", () => {
  const nightingale = record(
    quotations,
    "quote-rescuing-healer-closing-nightingale-not-everything",
  );
  const notes = `${nightingale.context} ${nightingale.verificationNotes}`;
  assert.match(notes, /hierarchical household management/i);
  assert.match(notes, /defined responsibility/i);
  assert.match(notes, /not (?:a|as a) modern consent model/i);
});

test("reviewed Lover manuscripts print every repaired assignment", () => {
  const creator = fs.readFileSync("content/lover/archetypes/creator.md", "utf8");
  const healer = fs.readFileSync("content/lover/archetypes/healer.md", "utf8");
  const rescuing = fs.readFileSync("content/lover/shadows/rescuing-healer.md", "utf8");
  const guarded = fs.readFileSync("content/lover/shadows/guarded-healer.md", "utf8");

  assert.match(creator, /light of letters is simplicity\./);
  assert.match(healer, /“\[P\]ity is strong only/);
  assert.match(healer, /quote-healer-closing-nightingale-do-no-harm/);
  assert.match(
    rescuing,
    /mythicSourceIds: myth-rescuing-healer-swallow-wilde-happy-prince/,
  );
  assert.match(guarded, /,” said the Giant; “any one can understand/);
  assert.match(guarded, /quote-guarded-healer-closing-addams-common-life/);
});
