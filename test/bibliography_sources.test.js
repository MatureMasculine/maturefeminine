const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { loadBook } = require("../scripts/content_markdown");
const quotationLedger = require("../research/quotation-ledger.json");
const mythLedger = require("../research/mythic-resonance-ledger.json");
const repositoryReconciliation = require("../research/bibliography-reconciliation.json");

const {
  collectAssignedSources,
  checkBibliographyFile,
  checkRepositoryBibliography,
  FINAL_COUNTS,
  groupBibliographySources,
  renderSourceSections,
  replaceSourceSections,
  syncBibliographyFile,
} = require("../scripts/bibliography_sources");

function quote(id, assignedSpread, position) {
  return {
    id,
    author: "Example Author",
    origin: {
      work: `Work for ${id}`,
      workType: "book",
      location: "chapter 1",
      publicationDetails: "Published in Example City by Example Press in 1900.",
    },
    sourceUrl: `https://example.test/${id}`,
    verificationStatus: "verified",
    assignedSpread,
    position,
  };
}

function myth(id, assignedSpread) {
  return {
    id,
    source: {
      authorOrInstitution: "Example Author; Example Archive",
      originatingWork: `Source work for ${id}`,
      title: `Source title for ${id}`,
      location: "chapter 1",
      publicationDetails: "Published in Example City by Example Press in 1900.",
      url: `https://example.test/${id}`,
    },
    verificationStatus: "verified",
    assignedSpread,
  };
}

function fixture() {
  return {
    book: {
      entries: [
        { slug: "alpha", research: { quoteIds: ["q-a-open", "q-a-close"], mythicSourceIds: ["m-a"] } },
        { slug: "beta", research: { quoteIds: ["q-b-open", "q-b-close"], mythicSourceIds: ["m-b"] } },
      ],
    },
    quotationRecords: [
      quote("q-a-open", "alpha", "opening"),
      quote("q-a-close", "alpha", "closing"),
      quote("q-b-open", "beta", "opening"),
      quote("q-b-close", "beta", "closing"),
    ],
    mythRecords: [myth("m-a", "alpha"), myth("m-b", "beta")],
    expectedCounts: { spreads: 2, quotations: 4, myths: 2 },
  };
}

test("collectAssignedSources resolves every assignment exactly once", () => {
  const data = fixture();
  const result = collectAssignedSources(data);

  assert.deepEqual(result.quotations.map((item) => item.id), data.quotationRecords.map((item) => item.id));
  assert.deepEqual(result.myths.map((item) => item.id), data.mythRecords.map((item) => item.id));
});

test("production counts stay locked", () => {
  assert.deepEqual(FINAL_COUNTS, { spreads: 66, quotations: 132, myths: 66 });
});

const invalidCases = [
  {
    name: "duplicate quotation ledger ID",
    pattern: /duplicate quotation record ID q-a-open/,
    mutate(data) {
      data.quotationRecords.push({ ...data.quotationRecords[0] });
    },
  },
  {
    name: "unknown entry quotation ID",
    pattern: /alpha references missing quotation q-missing/,
    mutate(data) {
      data.book.entries[0].research.quoteIds[0] = "q-missing";
    },
  },
  {
    name: "unverified quotation",
    pattern: /q-a-open is not verified/,
    mutate(data) {
      data.quotationRecords[0].verificationStatus = "pending";
    },
  },
  {
    name: "wrong assigned spread",
    pattern: /q-a-open is assigned to beta, not alpha/,
    mutate(data) {
      data.quotationRecords[0].assignedSpread = "beta";
    },
  },
  {
    name: "wrong opening or closing position",
    pattern: /q-a-open has position closing, expected opening/,
    mutate(data) {
      data.quotationRecords[0].position = "closing";
    },
  },
  {
    name: "orphaned verified quotation",
    pattern: /verified quotation q-orphan is not referenced/,
    mutate(data) {
      data.quotationRecords.push(quote("q-orphan", "alpha", "opening"));
    },
  },
  {
    name: "duplicate myth assignment",
    pattern: /myth m-a is referenced more than once/,
    mutate(data) {
      data.book.entries[1].research.mythicSourceIds[0] = "m-a";
    },
  },
  {
    name: "wrong final count",
    pattern: /expected 5 verified quotation assignments, found 4/,
    mutate(data) {
      data.expectedCounts.quotations = 5;
    },
  },
];

for (const { name, pattern, mutate } of invalidCases) {
  test(`collectAssignedSources rejects ${name}`, () => {
    const data = fixture();
    mutate(data);
    assert.throws(() => collectAssignedSources(data), pattern);
  });
}

function source(id, creator, work, publicationDetails = "Published in Example City in 1900.") {
  return { kind: "quote", id, creator, work, publicationDetails };
}

function frankensteinSources() {
  return [
    source("q-frankenstein-1818", "Mary Shelley", "Frankenstein; or, The Modern Prometheus", "First published in London in 1818."),
    source("q-frankenstein-1831", "Mary Shelley", "Frankenstein; or, The Modern Prometheus", "Revised edition published in London in 1831."),
  ];
}

function reconciliation(overrides = {}) {
  return { schemaVersion: 1, workAliases: {}, sortKeyOverrides: {}, sourceOverrides: {}, ...overrides };
}

function reconciliationWithOneRecordOmitted() {
  const key = "quote:mary shelley:frankenstein or the modern prometheus";
  return reconciliation({
    sourceOverrides: {
      [key]: {
        displayCreator: "Mary Shelley",
        displayWork: "Frankenstein; or, The Modern Prometheus",
        publications: [{ recordIds: ["q-frankenstein-1818"], text: "First published in London in 1818." }],
      },
    },
  });
}

function completeReconciliation() {
  const key = "quote:mary shelley:frankenstein or the modern prometheus";
  return reconciliation({
    sourceOverrides: {
      [key]: {
        displayCreator: "Mary Shelley",
        displayWork: "Frankenstein; or, The Modern Prometheus",
        publications: [
          { recordIds: ["q-frankenstein-1818"], text: "First published in London in 1818." },
          { recordIds: ["q-frankenstein-1831"], text: "Revised edition published in London in 1831." },
        ],
      },
    },
  });
}

function shuffledSources() {
  return [
    source("q-z", "Zora Example", "A Later Work"),
    ...frankensteinSources(),
    source("q-a", "Ada Example", "An Earlier Work"),
  ];
}

test("grouping is conservative until an explicit alias is approved", () => {
  const groups = groupBibliographySources(
    [source("q1", "Charlotte Brontë", "Jane Eyre"), source("q2", "Charlotte Brontë", "Jane Eyre: An Autobiography")],
    reconciliation({
      workAliases: {
        "quote:charlotte brontë:jane eyre an autobiography": "quote:charlotte brontë:jane eyre",
      },
    }),
    "quote",
  );
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].publications.flatMap((item) => item.recordIds).sort(), ["q1", "q2"]);
});

test("multiple publication details require an explicit publication override", () => {
  assert.throws(
    () => groupBibliographySources(frankensteinSources(), reconciliation(), "quote"),
    /requires an edition\/witness override/,
  );
});

test("publication overrides cover every group record exactly once", () => {
  assert.throws(
    () => groupBibliographySources(frankensteinSources(), reconciliationWithOneRecordOmitted(), "quote"),
    /publication override.*missing record q-frankenstein-1831/,
  );
});

test("source groups sort deterministically without ledger-order dependence", () => {
  assert.deepEqual(
    groupBibliographySources(shuffledSources(), completeReconciliation(), "quote").map((group) => group.key),
    groupBibliographySources(shuffledSources().reverse(), completeReconciliation(), "quote").map((group) => group.key),
  );
});

test("final reconciliation groups every canonical source exactly once", () => {
  const assigned = collectAssignedSources({
    book: loadBook(),
    quotationRecords: quotationLedger.records,
    mythRecords: mythLedger.records,
  });
  const quoteGroups = groupBibliographySources(assigned.quotations, repositoryReconciliation, "quote");
  const mythGroups = groupBibliographySources(assigned.myths, repositoryReconciliation, "myth");

  assert.equal(assigned.quotations.length, 132);
  assert.equal(assigned.myths.length, 66);
  assert.deepEqual(
    quoteGroups.flatMap((group) => group.publications.flatMap((publication) => publication.recordIds)).sort(),
    assigned.quotations.map((source) => source.id).sort(),
  );
  assert.deepEqual(
    mythGroups.flatMap((group) => group.publications.flatMap((publication) => publication.recordIds)).sort(),
    assigned.myths.map((source) => source.id).sort(),
  );
});

test("reconciliation preserves every incomplete witness qualification", () => {
  const assigned = collectAssignedSources({
    book: loadBook(),
    quotationRecords: quotationLedger.records,
    mythRecords: mythLedger.records,
  });
  const groups = [
    ...groupBibliographySources(assigned.quotations, repositoryReconciliation, "quote"),
    ...groupBibliographySources(assigned.myths, repositoryReconciliation, "myth"),
  ];
  const publicationsByRecord = new Map(groups.flatMap((group) => group.publications.flatMap((publication) => (
    publication.recordIds.map((id) => [id, publication.text])
  ))));
  const incompleteWitness = /does not (?:declare|identify)|not identified|undated|not established|uncertain/i;
  const qualifiedSources = [...assigned.quotations, ...assigned.myths]
    .filter((source) => incompleteWitness.test(source.publicationDetails));

  assert.ok(qualifiedSources.length > 0);
  for (const source of qualifiedSources) {
    assert.match(publicationsByRecord.get(source.id), incompleteWitness, `${source.id} lost its witness qualification`);
  }
  assert.match(publicationsByRecord.get("myth-seer-cumaean-sibyl-aeneid"), /does not identify the chosen translation or printed witness/i);
});

test("editorial myth instructions render as conservative human-readable witnesses", () => {
  const assigned = collectAssignedSources({
    book: loadBook(),
    quotationRecords: quotationLedger.records,
    mythRecords: mythLedger.records,
  });
  const mythGroups = groupBibliographySources(assigned.myths, repositoryReconciliation, "myth");
  const creatorsByRecord = new Map(mythGroups.flatMap((group) => group.publications.flatMap((publication) => (
    publication.recordIds.map((id) => [id, group.creator])
  ))));
  const instructionPattern = /\b(?:cite|identify|specify|name the play|translation used)\b/i;
  const instructionSources = assigned.myths.filter((source) => (
    source.creator === source.publicationDetails || instructionPattern.test(`${source.creator} ${source.publicationDetails}`)
  ));
  const rendered = renderSourceSections({ quotationGroups: [], mythGroups });

  assert.ok(instructionSources.length > 0);
  for (const source of instructionSources) {
    assert.doesNotMatch(creatorsByRecord.get(source.id), instructionPattern, `${source.id} retained an editorial instruction as its creator`);
  }
  assert.doesNotMatch(rendered, /\.\. \*/);
});

function renderedGroups() {
  return {
    quotationGroups: [{
      key: "quote:mary shelley:frankenstein or the modern prometheus",
      kind: "quote",
      creator: "Mary Shelley",
      work: "Frankenstein; or, The Modern Prometheus",
      sortKey: "mary shelley:frankenstein",
      publications: [{ recordIds: ["q1"], text: "First published in London in 1818." }],
    }],
    mythGroups: [{
      key: "myth:lucius apuleius:apuleius metamorphoses",
      kind: "myth",
      creator: "Lucius Apuleius; translated by William Adlington; Project Gutenberg",
      work: "Apuleius, Metamorphoses",
      sortKey: "lucius apuleius:metamorphoses",
      publications: [{ recordIds: ["m1"], text: "William Adlington's English translation was first published in 1566." }],
    }],
  };
}

function bibliographyFixture(sourceSections = "Old quotation sources.\n\n## Sources Used for Mythic Resonances\n\nOld myth sources.\n") {
  return [
    "# Bibliography and Further Reading",
    "",
    "Preserved introduction.",
    "",
    "## Sources Used for Quotations",
    "",
    sourceSections.trimEnd(),
    "",
    "## Further Reading",
    "",
    "### Curated Sources",
    "",
    "This suffix must remain byte-preserved.",
    "",
  ].join("\n");
}

test("renderSourceSections produces safe human-readable source sections", () => {
  const rendered = renderSourceSections(renderedGroups());

  assert.match(rendered, /## Sources Used for Quotations\n\nMary Shelley\. \*Frankenstein; or, The Modern Prometheus\*\. First published/);
  assert.match(rendered, /## Sources Used for Mythic Resonances\n\nLucius Apuleius; translated by William Adlington; Project Gutenberg\. \*Apuleius, Metamorphoses\*\./);
  assert.equal(rendered.includes("<!--"), false);
  assert.equal(/https?:\/\//.test(rendered), false);
  assert.equal(/\[[^\]]+\]\([^)]+\)/.test(rendered), false);
});

for (const [field, value] of [
  ["creator", "Unsafe\nCreator"],
  ["work", "Unsafe *Work*"],
  ["publication", "Unsafe [witness] detail."],
]) {
  test(`renderSourceSections rejects unsafe ${field} text`, () => {
    const groups = renderedGroups();
    if (field === "creator") groups.quotationGroups[0].creator = value;
    if (field === "work") groups.quotationGroups[0].work = value;
    if (field === "publication") groups.quotationGroups[0].publications[0].text = value;
    assert.throws(() => renderSourceSections(groups), /unsafe Markdown/);
  });
}

test("replaceSourceSections preserves the curated Further Reading suffix byte for byte", () => {
  const input = bibliographyFixture();
  const expected = replaceSourceSections(input, renderSourceSections(renderedGroups()));

  assert.equal(expected.split("## Further Reading")[1], input.split("## Further Reading")[1]);
  assert.match(expected, /Mary Shelley/);
  assert.doesNotMatch(expected, /Old quotation sources/);
});

test("checkBibliographyFile reports staleness without mutating bytes", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bibliography-check-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "bibliography.md");
  const staleBytes = bibliographyFixture();
  fs.writeFileSync(file, staleBytes);
  const expected = replaceSourceSections(staleBytes, renderSourceSections(renderedGroups()));

  assert.throws(() => checkBibliographyFile({ file, expected }), /bibliography source sections are out of sync/);
  assert.equal(fs.readFileSync(file, "utf8"), staleBytes);
});

test("syncBibliographyFile writes only changed bytes and is idempotent", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bibliography-sync-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "bibliography.md");
  const staleBytes = bibliographyFixture();
  fs.writeFileSync(file, staleBytes);
  const expected = replaceSourceSections(staleBytes, renderSourceSections(renderedGroups()));

  assert.equal(syncBibliographyFile({ file, expected }), true);
  assert.equal(syncBibliographyFile({ file, expected }), false);
  assert.equal(fs.readFileSync(file, "utf8"), expected);
});

test("final repository bibliography covers every canonical source and is synchronized", () => {
  const book = loadBook();
  const assigned = collectAssignedSources({
    book,
    quotationRecords: quotationLedger.records,
    mythRecords: mythLedger.records,
  });
  assert.equal(assigned.quotations.length, 132);
  assert.equal(assigned.myths.length, 66);
  assert.equal(new Set(assigned.quotations.map((item) => item.id)).size, 132);
  assert.equal(new Set(assigned.myths.map((item) => item.id)).size, 66);
  assert.doesNotThrow(() => checkRepositoryBibliography({ book }));
});

test("bibliography check CLI is nonmutating", () => {
  const file = path.join(__dirname, "..", "content", "special", "bibliography.md");
  const before = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  const result = spawnSync(process.execPath, ["scripts/bibliography_sources.js", "--check"], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
  });
  const after = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

  assert.equal(result.status, 0, result.stderr);
  assert.equal(after, before);
});

test("package scripts expose explicit bibliography check and sync commands", () => {
  const scripts = require("../package.json").scripts;
  assert.equal(scripts["bibliography:check"], "node scripts/bibliography_sources.js --check");
  assert.equal(scripts["bibliography:sync"], "node scripts/bibliography_sources.js --write");
});
