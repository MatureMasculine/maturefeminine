const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  checkGeneratedData,
  loadBook,
  parseArchetype,
  parseShadowFile,
  validateBook,
  validateCanonicalBook,
  writeGeneratedData,
} = require("../scripts/content_markdown");

function write(file, source) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, source);
}

function archetype(overrides = {}) {
  const data = {
    slug: "adventurer",
    lifecycle: "maiden",
    order: "1",
    qualityA: "Daring",
    qualityB: "Prudence",
    activeShadowSlug: "reckless-wanderer",
    passiveShadowSlug: "sheltered-dreamer",
    aliases: "Storm|Tempest",
    legacyRoutes: "/maiden/adventurer-storm-tempest/",
    coreFunction: "Expand life's range through intelligent, accountable risk.",
    keyQualities: "Bold|Adaptive|Grounded",
    image: "assets/images/adventurer-storm.jpeg",
    quoteIds: "quote-opening|quote-closing",
    mythicResonances: "Artemis (Greek)",
    mythicSourceIds: "myth-parent-1",
    researchStatus: "verified",
    ...overrides,
  };
  return `---\n${Object.entries(data).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---
# Adventurer

## Opening Quotation

Opening quotation text.

## Profile

- Lifecycle stage: Maiden
- Core function: Expand life's range through intelligent, accountable risk.
- Balanced qualities: Daring + Prudence
- Active shadow: Reckless Wanderer
- Passive shadow: Sheltered Dreamer
- Mythic resonances: Artemis (Greek)
- Key qualities: Bold, Adaptive, Grounded

## Definition

The mature expression crosses a chosen threshold while remaining accountable.

## Declarations

- I make room for risk and consequence.
- I prepare without worshiping safety.
- I keep promises while exploring.
- I can change course without fleeing.
- I finish what depth asks of me.
- I measure freedom by responsibility.
- I accept uncertainty without manufacturing crisis.
- I return, repair, and learn.

## Balance

Daring initiates movement. Prudence protects people and future choice.

## Applications

At work and in relationship, she distinguishes expansion from escape.

## Gifts, Responsibilities, and Challenges

Her courage expands possibility, and her responsibility preserves trust.

## Practices

- Name the value, risk, and exit before a leap.

## Living as the Adventurer

She leaves familiar ground without abandoning responsibility.

## Closing Quotation

Closing quotation text.
`;
}

function shadow(type, overrides = {}) {
  const active = type === "active";
  const data = {
    slug: active ? "reckless-wanderer" : "sheltered-dreamer",
    lifecycle: "maiden",
    order: active ? "1" : "2",
    parent: "adventurer",
    type,
    oppositeShadowSlug: active ? "sheltered-dreamer" : "reckless-wanderer",
    qualityA: "Daring",
    qualityB: "Prudence",
    aliases: active ? "Reckless Storm" : "Paralyzed Dreamer",
    legacyRoutes: active
      ? "/maiden/adventurer-storm-tempest/shadows/reckless-storm/"
      : "/maiden/adventurer-storm-tempest/shadows/paralyzed-dreamer/",
    legacyAnchors: active ? "reckless-storm" : "paralyzed-dreamer",
    image: active ? "assets/images/shadow/reckless.jpg" : "assets/images/shadow/sheltered.jpg",
    quoteIds: active ? "quote-active-open|quote-active-close" : "quote-passive-open|quote-passive-close",
    mythicResonances: active ? "Phaethon (Greek)" : "Sleeping Beauty (literary)",
    mythicSourceIds: active ? "myth-active-1" : "myth-passive-1",
    researchStatus: "verified",
    ...overrides,
  };
  const name = active ? "Reckless Wanderer" : "Sheltered Dreamer";
  const designation = active ? "Active Shadow" : "Passive Shadow";
  return `---\n${Object.entries(data).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---
# ${name}

## Designation

${designation}

## Opening Quotation

Opening quotation text.

## Profile

- Lifecycle stage: Maiden
- Core function: ${active ? "Daring without Prudence" : "Daring collapses while Prudence distorts"}
- Balanced qualities: Daring + Prudence
- Active shadow: Reckless Wanderer
- Passive shadow: Sheltered Dreamer
- Mythic resonances: ${active ? "Phaethon (Greek)" : "Sleeping Beauty (literary)"}
- Key qualities: ${active ? "Intensity, Motion" : "Foresight, Caution"}

## Balance Breakdown

${active ? "Daring inflates without Prudence." : "Daring collapses while Prudence becomes a refuge."}

## Declarations

- I trust this impulse.
- I avoid the missing quality.
- I repeat the familiar logic.
- I overlook the consequence.
- I protect this pattern.
- I can recognize its cost.

## Psychological Mechanics

The imbalance protects against uncertainty while narrowing choice.

## Hidden Energy

Its useful energy can return to the mature expression.

## Recognition

The pattern appears in choices, work, and relationship.

## Practices

- Restore ${active ? "Prudence" : "Daring"} through one concrete act.

## Opposite Shadow

The ${active ? "Sheltered Dreamer" : "Reckless Wanderer"} expresses the opposite imbalance.

## Transformation

Integration restores ${active ? "Prudence" : "Daring"} and the relationship between both qualities.

## Conclusion

The shadow's energy becomes available without running the whole pattern.

## Closing Quotation

Closing quotation text.
`;
}

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mature-feminine-content-"));
  write(path.join(directory, "maiden", "group.md"), `---
slug: maiden
order: 1
sourceFile: group_1_maiden
---
# Maiden

## Page Title

The Maiden

## Summary

Beginnings and first choices.

## Essence

Open contact shaped by discernment.
`);
  write(path.join(directory, "maiden", "archetypes", "adventurer.md"), archetype());
  write(path.join(directory, "maiden", "shadows", "reckless-wanderer.md"), shadow("active"));
  write(path.join(directory, "maiden", "shadows", "sheltered-dreamer.md"), shadow("passive"));
  return directory;
}

test("parseArchetype normalizes scalar metadata, arrays, profile, quotes, and sections", () => {
  const directory = fixture();
  const file = path.join(directory, "maiden", "archetypes", "adventurer.md");
  const entry = parseArchetype(file);

  assert.equal(entry.kind, "archetype");
  assert.equal(entry.name, "Adventurer");
  assert.deepEqual(entry.qualities, ["Daring", "Prudence"]);
  assert.deepEqual(entry.aliases, ["Storm", "Tempest"]);
  assert.deepEqual(entry.research.quoteIds, ["quote-opening", "quote-closing"]);
  assert.deepEqual(entry.research.mythicSourceIds, ["myth-parent-1"]);
  assert.deepEqual(entry.quotes, { opening: "Opening quotation text.", closing: "Closing quotation text." });
  assert.equal(entry.sections.definition, "The mature expression crosses a chosen threshold while remaining accountable.");
  assert.equal(entry.sections.declarations.length, 8);
  assert.deepEqual(Object.keys(entry.profile), [
    "lifecycleStage",
    "coreFunction",
    "balancedQualities",
    "activeShadow",
    "passiveShadow",
    "mythicResonances",
    "keyQualities",
  ]);
});

test("parseArchetype maps semantic roles onto tailored display headings", () => {
  const directory = fixture();
  const file = path.join(directory, "maiden", "archetypes", "adventurer.md");
  const sectionRoles = [
    "definition=Crossing the Threshold",
    "declarations=Declarations",
    "balance=The Two-Part Compass",
    "applications=Applications",
    "gifts=Gifts, Responsibilities, and Challenges",
    "practices=Practices",
    "conclusion=Living as the Adventurer",
  ].join("|");
  const source = archetype({ sectionRoles })
    .replace("## Definition", "## Crossing the Threshold")
    .replace("## Balance", "## The Two-Part Compass")
    .replace("## Gifts, Responsibilities, and Challenges", "## A Field Note\n\nA tailored, non-required section.\n\n## Gifts, Responsibilities, and Challenges");
  write(file, source);

  const entry = parseArchetype(file);
  assert.equal(entry.sections.definition, "The mature expression crosses a chosen threshold while remaining accountable.");
  assert.equal(entry.sections.balance, "Daring initiates movement. Prudence protects people and future choice.");
  assert.ok(entry.bodySections.some((section) => section.role === "definition" && section.heading === "Crossing the Threshold"));
  assert.ok(entry.bodySections.some((section) => section.role === null && section.heading === "A Field Note"));
});

test("parseShadowFile preserves explicit parent, type, opposite shadow, and structured sections", () => {
  const directory = fixture();
  const active = parseShadowFile(path.join(directory, "maiden", "shadows", "reckless-wanderer.md"));
  const passive = parseShadowFile(path.join(directory, "maiden", "shadows", "sheltered-dreamer.md"));

  assert.equal(active.parent, "adventurer");
  assert.equal(active.type, "active");
  assert.equal(active.oppositeShadowSlug, "sheltered-dreamer");
  assert.equal(active.sections.practices[0], "Restore Prudence through one concrete act.");
  assert.equal(passive.parent, "adventurer");
  assert.equal(passive.type, "passive");
  assert.equal(passive.oppositeShadowSlug, "reckless-wanderer");
  assert.deepEqual(passive.research.quoteIds, ["quote-passive-open", "quote-passive-close"]);
});

test("loadBook orders groups and parent children and returns redirects", () => {
  const directory = fixture();
  const book = loadBook(directory);

  assert.equal(book.groups.length, 1);
  assert.deepEqual(book.groups[0].archetypes.map((entry) => entry.slug), ["adventurer"]);
  assert.deepEqual(book.groups[0].archetypes[0].shadows.map((entry) => entry.type), ["active", "passive"]);
  assert.equal(book.entries.length, 3);
  assert.deepEqual(book.redirects[0], {
    from: "/maiden/adventurer-storm-tempest/",
    to: "/maiden/adventurer/",
    type: "route",
  });
  assert.ok(book.redirects.some((redirect) => redirect.from === "#shadow-reckless-storm"));
});

test("loadBook rejects malformed balance pairs", () => {
  const directory = fixture();
  write(path.join(directory, "maiden", "archetypes", "adventurer.md"), archetype({ qualityB: "" }));
  assert.throws(() => loadBook(directory), /qualityB|balance/i);
});

test("loadBook rejects duplicate slugs across parents and shadows", () => {
  const directory = fixture();
  write(path.join(directory, "maiden", "shadows", "sheltered-dreamer.md"), shadow("passive", { slug: "reckless-wanderer" }));
  assert.throws(() => loadBook(directory), /duplicate slug reckless-wanderer/i);
});

test("loadBook rejects slash-separated aliases", () => {
  const directory = fixture();
  write(path.join(directory, "maiden", "archetypes", "adventurer.md"), archetype({ aliases: "Storm/Tempest" }));
  assert.throws(() => loadBook(directory), /compound alias/i);
});

test("loadBook rejects a shadow whose explicit parent is missing", () => {
  const directory = fixture();
  write(path.join(directory, "maiden", "shadows", "reckless-wanderer.md"), shadow("active", { parent: "missing-parent" }));
  assert.throws(() => loadBook(directory), /missing parent missing-parent/i);
});

test("writeGeneratedData is deterministic and detects no implicit source mutation", () => {
  const directory = fixture();
  const book = loadBook(directory);
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "mature-feminine-data-"));
  const before = fs.readFileSync(path.join(directory, "maiden", "archetypes", "adventurer.md"), "utf8");

  writeGeneratedData(book, output);

  const aggregate = JSON.parse(fs.readFileSync(path.join(output, "archetypes.json"), "utf8"));
  assert.equal(aggregate.groups[0].archetypes[0].slug, "adventurer");
  assert.equal(fs.readFileSync(path.join(directory, "maiden", "archetypes", "adventurer.md"), "utf8"), before);
});

test("checkGeneratedData rejects generated JSON drift", () => {
  const directory = fixture();
  const book = loadBook(directory);
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "mature-feminine-drift-"));
  writeGeneratedData(book, output);
  assert.doesNotThrow(() => checkGeneratedData(book, output));

  fs.appendFileSync(path.join(output, "archetypes.json"), "drift\n");
  assert.throws(() => checkGeneratedData(book, output), /archetypes\.json is out of sync/i);
});

test("checkGeneratedData rejects stale generated group files", () => {
  const directory = fixture();
  const book = loadBook(directory);
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "mature-feminine-stale-data-"));
  writeGeneratedData(book, output);
  write(path.join(output, "group_99_stale.json"), "{}\n");

  assert.throws(() => checkGeneratedData(book, output), /unexpected generated file group_99_stale\.json/i);
});

test("publish validation enforces research, quotes, mythic sources, declarations, sections, and images", () => {
  const directory = fixture();
  const book = loadBook(directory);
  assert.doesNotThrow(() => validateBook(book, { publish: true }));

  book.entries[0].research.status = "pending";
  assert.throws(() => validateBook(book, { publish: true }), /pending research/i);
});

test("publish validation does not call two blank pending mythic assignments inherited", () => {
  const directory = fixture();
  const book = loadBook(directory);
  for (const entry of book.entries) {
    entry.research.status = "pending";
    entry.research.mythicResonances = [];
    entry.research.mythicSourceIds = [];
  }
  assert.throws(
    () => validateBook(book, { publish: true }),
    (error) => /pending research/.test(error.message) && !/inherits its parent's mythic assignment/.test(error.message),
  );
});

test("publish validation rejects any parent-shadow mythic resonance overlap", () => {
  const directory = fixture();
  const book = loadBook(directory);
  const active = book.entries.find((entry) => entry.slug === "reckless-wanderer");
  active.research.mythicResonances.push("Artemis (Greek)");

  assert.throws(() => validateBook(book, { publish: true }), /inherits parent mythic resonance Artemis \(Greek\)/i);
});

test("structural validation rejects printed profile drift from normalized metadata", () => {
  const directory = fixture();
  const book = loadBook(directory);
  book.entries[0].profile.mythicResonances = "Unverified Figure";

  assert.throws(() => validateBook(book), /profile mythic resonance drift/i);
});

test("structural validation rejects duplicate lifecycle groups", () => {
  const directory = fixture();
  const book = loadBook(directory);
  book.groups.push({ ...book.groups[0] });

  assert.throws(() => validateBook(book), /duplicate group (name|slug|order)/i);
});

test("canonical validation locks names, lifecycle, qualities, and parent-shadow relationships", () => {
  const directory = fixture();
  const book = loadBook(directory);
  const taxonomy = [{
    name: "Adventurer",
    slug: "adventurer",
    lifecycle: "maiden",
    coreFunction: "Expand life's range through intelligent, accountable risk.",
    qualityA: "Daring",
    qualityB: "Prudence",
    active: { name: "Reckless Wanderer", slug: "reckless-wanderer" },
    passive: { name: "Sheltered Dreamer", slug: "sheltered-dreamer" },
  }];
  assert.doesNotThrow(() => validateCanonicalBook(book, taxonomy));

  book.groups[0].archetypes[0].coreFunction = "Drifted function.";
  assert.throws(() => validateCanonicalBook(book, taxonomy), /canonical core function drift/i);
});
