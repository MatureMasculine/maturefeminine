const fs = require("node:fs");
const path = require("node:path");

const FINAL_COUNTS = Object.freeze({ spreads: 66, quotations: 132, myths: 66 });
const QUOTATION_HEADING = "## Sources Used for Quotations";
const MYTH_HEADING = "## Sources Used for Mythic Resonances";
const FURTHER_READING_HEADING = "## Further Reading";
const ROOT = path.resolve(__dirname, "..");
const BIBLIOGRAPHY_FILE = path.join(ROOT, "content", "special", "bibliography.md");

function normalizedKeyPart(value) {
  return requiredText(value, "bibliography key value")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function sourceKey(source, kind) {
  return `${kind}:${normalizedKeyPart(source.creator)}:${normalizedKeyPart(source.work)}`;
}

function uniqueById(records, label) {
  const byId = new Map();
  for (const record of records) {
    if (byId.has(record.id)) throw new Error(`duplicate ${label} record ID ${record.id}`);
    byId.set(record.id, record);
  }
  return byId;
}

function requiredText(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is blank`);
  return value.trim();
}

function validateReference(record, { id, entrySlug, expectedPosition, kind }) {
  if (!record) throw new Error(`${entrySlug} references missing ${kind} ${id}`);
  if (record.verificationStatus !== "verified") throw new Error(`${id} is not verified`);
  if (record.assignedSpread !== entrySlug) {
    throw new Error(`${id} is assigned to ${record.assignedSpread}, not ${entrySlug}`);
  }
  if (expectedPosition && record.position !== expectedPosition) {
    throw new Error(`${id} has position ${record.position}, expected ${expectedPosition}`);
  }
}

function normalizeQuotationSource(record) {
  return {
    kind: "quote",
    id: record.id,
    assignedSpread: record.assignedSpread,
    creator: requiredText(record.author, `${record.id} author`),
    work: requiredText(record.origin?.work, `${record.id} work`),
    publicationDetails: requiredText(record.origin?.publicationDetails, `${record.id} publication details`),
    sourceUrl: requiredText(record.sourceUrl, `${record.id} source URL`),
    record,
  };
}

function normalizeMythSource(record) {
  return {
    kind: "myth",
    id: record.id,
    assignedSpread: record.assignedSpread,
    creator: requiredText(record.source?.authorOrInstitution, `${record.id} author or institution`),
    work: requiredText(record.source?.originatingWork || record.source?.title, `${record.id} work`),
    publicationDetails: requiredText(record.source?.publicationDetails, `${record.id} publication details`),
    sourceUrl: requiredText(record.source?.url, `${record.id} source URL`),
    record,
  };
}

function rejectOrphans(records, usedIds, label) {
  for (const record of records.filter((item) => item.verificationStatus === "verified")) {
    if (!usedIds.has(record.id)) throw new Error(`verified ${label} ${record.id} is not referenced`);
  }
}

function assertCount(actual, expected, label) {
  if (actual !== expected) throw new Error(`expected ${expected} ${label}, found ${actual}`);
}

function collectAssignedSources({
  book,
  quotationRecords,
  mythRecords,
  expectedCounts = FINAL_COUNTS,
}) {
  if (book.entries.length !== expectedCounts.spreads) {
    throw new Error(`expected ${expectedCounts.spreads} canonical spreads, found ${book.entries.length}`);
  }
  const quoteById = uniqueById(quotationRecords, "quotation");
  const mythById = uniqueById(mythRecords, "myth");
  const usedQuotes = new Set();
  const usedMyths = new Set();
  const quotations = [];
  const myths = [];

  for (const entry of book.entries) {
    if (entry.research.quoteIds.length !== 2 || entry.research.mythicSourceIds.length !== 1) {
      throw new Error(`${entry.slug} must reference two quotations and one myth source`);
    }
    entry.research.quoteIds.forEach((id, index) => {
      const record = quoteById.get(id);
      const expectedPosition = index === 0 ? "opening" : "closing";
      if (usedQuotes.has(id)) throw new Error(`quotation ${id} is referenced more than once`);
      validateReference(record, { id, entrySlug: entry.slug, expectedPosition, kind: "quotation" });
      usedQuotes.add(id);
      quotations.push(normalizeQuotationSource(record));
    });
    for (const id of entry.research.mythicSourceIds) {
      const record = mythById.get(id);
      if (usedMyths.has(id)) throw new Error(`myth ${id} is referenced more than once`);
      validateReference(record, { id, entrySlug: entry.slug, kind: "myth" });
      usedMyths.add(id);
      myths.push(normalizeMythSource(record));
    }
  }

  rejectOrphans(quotationRecords, usedQuotes, "quotation");
  rejectOrphans(mythRecords, usedMyths, "myth");
  assertCount(quotations.length, expectedCounts.quotations, "verified quotation assignments");
  assertCount(myths.length, expectedCounts.myths, "verified myth assignments");
  return { quotations, myths };
}

function objectField(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value;
}

function reconciliationFields(reconciliation) {
  if (reconciliation?.schemaVersion !== 1) throw new Error("bibliography reconciliation schemaVersion must be 1");
  return {
    workAliases: objectField(reconciliation.workAliases, "workAliases"),
    sortKeyOverrides: objectField(reconciliation.sortKeyOverrides, "sortKeyOverrides"),
    sourceOverrides: objectField(reconciliation.sourceOverrides, "sourceOverrides"),
  };
}

function resolveAliases(rawKeys, aliases, kind) {
  const prefix = `${kind}:`;
  const relevantAliases = Object.entries(aliases).filter(([key]) => key.startsWith(prefix));
  for (const [source, target] of relevantAliases) {
    if (!rawKeys.has(source)) throw new Error(`unknown ${kind} work alias source ${source}`);
    if (!rawKeys.has(target)) throw new Error(`unknown ${kind} work alias target ${target}`);
  }

  const resolved = new Map();
  for (const rawKey of rawKeys) {
    const seen = new Set();
    let current = rawKey;
    while (Object.hasOwn(aliases, current)) {
      if (seen.has(current)) throw new Error(`work alias cycle includes ${current}`);
      seen.add(current);
      current = aliases[current];
    }
    resolved.set(rawKey, current);
  }
  return resolved;
}

function overridePublications(groupKey, sources, override) {
  const groupIds = new Set(sources.map((source) => source.id));
  const covered = new Set();
  if (!Array.isArray(override.publications) || !override.publications.length) {
    throw new Error(`source override ${groupKey} publications must be nonempty`);
  }
  const publications = override.publications.map((publication) => {
    if (!Array.isArray(publication.recordIds) || !publication.recordIds.length) {
      throw new Error(`publication override ${groupKey} has blank record IDs`);
    }
    const text = requiredText(publication.text, `publication override ${groupKey} text`);
    const recordIds = publication.recordIds.map((id) => requiredText(id, `publication override ${groupKey} record ID`));
    for (const id of recordIds) {
      if (!groupIds.has(id)) throw new Error(`publication override ${groupKey} contains unknown record ${id}`);
      if (covered.has(id)) throw new Error(`publication override ${groupKey} repeats record ${id}`);
      covered.add(id);
    }
    return { recordIds, text };
  });
  for (const id of groupIds) {
    if (!covered.has(id)) throw new Error(`publication override ${groupKey} is missing record ${id}`);
  }
  return publications;
}

function groupBibliographySources(sources, reconciliation, kind) {
  const { workAliases, sortKeyOverrides, sourceOverrides } = reconciliationFields(reconciliation);
  const normalizedSources = sources.map((source) => ({ ...source, rawKey: sourceKey(source, kind) }));
  const rawKeys = new Set(normalizedSources.map((source) => source.rawKey));
  const aliases = resolveAliases(rawKeys, workAliases, kind);
  const grouped = new Map();
  for (const source of normalizedSources) {
    const key = aliases.get(source.rawKey);
    const values = grouped.get(key) || [];
    values.push(source);
    grouped.set(key, values);
  }

  const prefix = `${kind}:`;
  for (const key of Object.keys(sourceOverrides).filter((value) => value.startsWith(prefix))) {
    if (!grouped.has(key)) throw new Error(`source override references unknown group ${key}`);
  }
  for (const key of Object.keys(sortKeyOverrides).filter((value) => value.startsWith(prefix))) {
    if (!grouped.has(key)) throw new Error(`sort key override references unknown group ${key}`);
  }

  const groups = [];
  for (const [key, values] of grouped) {
    const sourcesById = [...values].sort((left, right) => left.id.localeCompare(right.id, "en-US"));
    const representative = sourcesById.find((source) => source.rawKey === key) || sourcesById[0];
    const detailGroups = new Map();
    for (const source of sourcesById) {
      const recordIds = detailGroups.get(source.publicationDetails) || [];
      recordIds.push(source.id);
      detailGroups.set(source.publicationDetails, recordIds);
    }
    const override = sourceOverrides[key];
    if (!override && detailGroups.size > 1) throw new Error(`${key} requires an edition/witness override`);
    const creator = override
      ? requiredText(override.displayCreator, `source override ${key} display creator`)
      : representative.creator;
    const work = override
      ? requiredText(override.displayWork, `source override ${key} display work`)
      : representative.work;
    const publications = override
      ? overridePublications(key, sourcesById, override)
      : [...detailGroups].map(([text, recordIds]) => ({ recordIds, text }));
    const sortKey = Object.hasOwn(sortKeyOverrides, key)
      ? requiredText(sortKeyOverrides[key], `sort key override ${key}`)
      : `${normalizedKeyPart(creator)}:${normalizedKeyPart(work)}`;
    groups.push({ key, kind, creator, work, sortKey, publications });
  }

  return groups.sort((left, right) => left.sortKey.localeCompare(right.sortKey, "en-US") || left.key.localeCompare(right.key, "en-US"));
}

function safeMarkdownText(value, label) {
  const text = requiredText(value, label);
  if (/[\r\n*<>\[\]]/.test(text)) throw new Error(`${label} contains unsafe Markdown`);
  return text;
}

function renderGroup(group) {
  const creator = safeMarkdownText(group.creator, `${group.key} creator`);
  const work = safeMarkdownText(group.work, `${group.key} work`);
  return group.publications
    .map(({ text }) => `${creator}. *${work}*. ${safeMarkdownText(text, `${group.key} publication`)}`)
    .join("\n\n");
}

function renderSourceSections({ quotationGroups, mythGroups }) {
  return [
    QUOTATION_HEADING,
    quotationGroups.map(renderGroup).join("\n\n"),
    MYTH_HEADING,
    mythGroups.map(renderGroup).join("\n\n"),
  ].join("\n\n") + "\n";
}

function headingIndex(markdown, heading) {
  const matches = [...markdown.matchAll(new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "gm"))];
  if (matches.length !== 1) throw new Error(`bibliography must contain exactly one ${heading} heading`);
  return matches[0].index;
}

function replaceSourceSections(markdown, renderedSections) {
  const quotationIndex = headingIndex(markdown, QUOTATION_HEADING);
  const mythIndex = headingIndex(markdown, MYTH_HEADING);
  const furtherReadingIndex = headingIndex(markdown, FURTHER_READING_HEADING);
  if (!(quotationIndex < mythIndex && mythIndex < furtherReadingIndex)) {
    throw new Error("bibliography source and Further Reading headings are out of order");
  }
  return `${markdown.slice(0, quotationIndex)}${renderedSections.trimEnd()}\n\n${markdown.slice(furtherReadingIndex)}`;
}

function checkBibliographyFile({ file, expected }) {
  if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== expected) {
    throw new Error("bibliography source sections are out of sync; run npm run bibliography:sync");
  }
  return true;
}

function syncBibliographyFile({ file, expected }) {
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === expected) return false;
  fs.writeFileSync(file, expected);
  return true;
}

function repositoryBibliography({ book }) {
  const quotationRecords = JSON.parse(fs.readFileSync(path.join(ROOT, "research", "quotation-ledger.json"), "utf8")).records;
  const mythRecords = JSON.parse(fs.readFileSync(path.join(ROOT, "research", "mythic-resonance-ledger.json"), "utf8")).records;
  const reconciliation = JSON.parse(fs.readFileSync(path.join(ROOT, "research", "bibliography-reconciliation.json"), "utf8"));
  const assigned = collectAssignedSources({ book, quotationRecords, mythRecords });
  const renderedSections = renderSourceSections({
    quotationGroups: groupBibliographySources(assigned.quotations, reconciliation, "quote"),
    mythGroups: groupBibliographySources(assigned.myths, reconciliation, "myth"),
  });
  const current = fs.readFileSync(BIBLIOGRAPHY_FILE, "utf8");
  return { file: BIBLIOGRAPHY_FILE, expected: replaceSourceSections(current, renderedSections) };
}

function checkRepositoryBibliography({ book }) {
  return checkBibliographyFile(repositoryBibliography({ book }));
}

function syncRepositoryBibliography({ book }) {
  return syncBibliographyFile(repositoryBibliography({ book }));
}

function main() {
  const check = process.argv.includes("--check");
  const write = process.argv.includes("--write");
  if (check === write) throw new Error("choose exactly one of --check or --write");
  const { loadBook } = require("./content_markdown");
  const state = repositoryBibliography({ book: loadBook() });
  if (check) {
    checkBibliographyFile(state);
    console.log("Bibliography source sections are synchronized.");
    return;
  }
  const changed = syncBibliographyFile(state);
  console.log(changed ? "Synchronized bibliography source sections." : "Bibliography source sections were already synchronized.");
}

module.exports = {
  checkBibliographyFile,
  checkRepositoryBibliography,
  collectAssignedSources,
  FINAL_COUNTS,
  groupBibliographySources,
  renderSourceSections,
  replaceSourceSections,
  syncBibliographyFile,
  syncRepositoryBibliography,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
