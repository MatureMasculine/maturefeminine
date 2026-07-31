const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "content");
const LIFECYCLES = ["maiden", "lover", "mother", "queen", "crone"];
const PROFILE_FIELDS = [
  ["Lifecycle stage", "lifecycleStage"],
  ["Core function", "coreFunction"],
  ["Balanced qualities", "balancedQualities"],
  ["Active shadow", "activeShadow"],
  ["Passive shadow", "passiveShadow"],
  ["Mythic resonances", "mythicResonances"],
  ["Key qualities", "keyQualities"],
];
const RESEARCH_STATUSES = new Set(["pending", "verified"]);
const WRAPPER_HEADINGS = new Set(["Opening Quotation", "Profile", "Closing Quotation", "Designation"]);

function fail(file, message) {
  const label = path.isAbsolute(file) ? path.relative(root, file) : file;
  throw new Error(`${label}: ${message}`);
}

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function parseFrontMatter(file, source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) fail(file, "missing front matter");
  const data = {};
  for (const line of match[1].split("\n")) {
    if (!line.trim()) continue;
    const separator = line.indexOf(":");
    if (separator < 1) fail(file, `invalid front-matter line: ${line}`);
    const key = line.slice(0, separator).trim();
    if (Object.hasOwn(data, key)) fail(file, `duplicate front-matter field ${key}`);
    data[key] = line.slice(separator + 1).trim();
  }
  return { data, body: source.slice(match[0].length) };
}

function parseDocument(file) {
  const { data, body } = parseFrontMatter(file, read(file));
  const lines = body.split("\n");
  const headings = lines.filter((line) => /^# /.test(line));
  if (headings.length !== 1) fail(file, "must contain exactly one H1");
  const name = headings[0].slice(2).trim();
  if (!name) fail(file, "missing H1 name");

  const sections = new Map();
  let current;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      const title = line.slice(3).trim();
      if (sections.has(title)) fail(file, `duplicate ## ${title} section`);
      current = [];
      sections.set(title, current);
    } else if (current && !line.startsWith("# ")) {
      current.push(line);
    }
  }
  return { data, name, sections };
}

function required(data, key, file) {
  if (!Object.hasOwn(data, key)) fail(file, `missing ${key} in front matter`);
  return data[key];
}

function requiredSection(sections, title, file) {
  if (!sections.has(title)) fail(file, `missing ## ${title} section`);
  return sections.get(title);
}

function paragraphs(lines) {
  const value = lines.join("\n").trim();
  return value ? value.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean) : [];
}

function textBlock(lines) {
  return paragraphs(lines).join("\n\n");
}

function list(lines, file, label) {
  const nonblank = lines.filter((line) => line.trim());
  if (nonblank.some((line) => !line.startsWith("- "))) fail(file, `${label} must be a Markdown list`);
  return nonblank.map((line) => line.slice(2).trim());
}

function fieldList(lines, file, label) {
  const fields = new Map();
  for (const line of lines.filter((candidate) => candidate.trim())) {
    if (!line.startsWith("- ")) fail(file, `${label} must be a Markdown field list`);
    const separator = line.indexOf(":", 2);
    if (separator < 3) fail(file, `invalid ${label} field: ${line}`);
    const key = line.slice(2, separator).trim();
    if (fields.has(key)) fail(file, `duplicate ${label} field ${key}`);
    fields.set(key, line.slice(separator + 1).trim());
  }
  return fields;
}

function pipeList(value) {
  if (!value) return [];
  return value.split("|").map((item) => item.trim()).filter(Boolean);
}

function parseOrder(value, file) {
  if (!/^\d+$/.test(value || "") || Number(value) < 1) fail(file, "order must be a positive integer");
  return Number(value);
}

function parseProfile(lines, file) {
  const fields = fieldList(lines, file, "profile");
  const allowed = new Set(PROFILE_FIELDS.map(([label]) => label));
  for (const label of fields.keys()) {
    if (!allowed.has(label)) fail(file, `forbidden profile field ${label}`);
  }
  const profile = {};
  for (const [label, key] of PROFILE_FIELDS) {
    if (!fields.has(label)) fail(file, `missing profile field ${label}`);
    profile[key] = fields.get(label);
  }
  return profile;
}

function parseSectionRoles(value, defaults, file) {
  if (!value) return { ...defaults };
  const roles = {};
  for (const assignment of pipeList(value)) {
    const separator = assignment.indexOf("=");
    if (separator < 1 || !assignment.slice(separator + 1).trim()) fail(file, `invalid section role ${assignment}`);
    const role = assignment.slice(0, separator).trim();
    const heading = assignment.slice(separator + 1).trim();
    if (!Object.hasOwn(defaults, role)) fail(file, `unknown section role ${role}`);
    if (Object.hasOwn(roles, role)) fail(file, `duplicate section role ${role}`);
    if (WRAPPER_HEADINGS.has(heading)) fail(file, `section role ${role} cannot target wrapper ${heading}`);
    roles[role] = heading;
  }
  for (const role of Object.keys(defaults)) {
    if (!Object.hasOwn(roles, role)) fail(file, `missing section role ${role}`);
  }
  if (new Set(Object.values(roles)).size !== Object.values(roles).length) fail(file, "section roles must map to distinct headings");
  return roles;
}

function structuredSection(lines) {
  const intro = [];
  const subsections = [];
  let current;
  for (const line of lines) {
    if (line.startsWith("### ")) {
      current = { heading: line.slice(4).trim(), lines: [] };
      subsections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      intro.push(line);
    }
  }
  return {
    content: textBlock(intro),
    subsections: subsections.map((subsection) => ({
      heading: subsection.heading,
      content: textBlock(subsection.lines),
    })),
  };
}

function normalizedBodySections(sections, roles, wrappers) {
  const rolesByHeading = new Map(Object.entries(roles).map(([role, heading]) => [heading, role]));
  return [...sections.entries()]
    .filter(([heading]) => !wrappers.includes(heading))
    .map(([heading, lines]) => ({
      role: rolesByHeading.get(heading) || null,
      heading,
      ...structuredSection(lines),
    }));
}

function parseCommon(file, expectedSections) {
  const { data, name, sections } = parseDocument(file);
  const slug = required(data, "slug", file);
  const lifecycle = required(data, "lifecycle", file);
  const qualityA = required(data, "qualityA", file);
  const qualityB = required(data, "qualityB", file);
  const researchStatus = required(data, "researchStatus", file);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail(file, `invalid slug ${slug}`);
  if (!LIFECYCLES.includes(lifecycle)) fail(file, `invalid lifecycle ${lifecycle}`);
  if (!qualityA || !qualityB || qualityA === qualityB) fail(file, "balance requires two distinct qualityA and qualityB values");
  if (!RESEARCH_STATUSES.has(researchStatus)) fail(file, `invalid research status ${researchStatus}`);

  const aliases = pipeList(data.aliases);
  if (aliases.some((alias) => /[/()]/.test(alias))) fail(file, `compound alias in ${aliases.join("|")}`);
  for (const title of expectedSections) requiredSection(sections, title, file);

  return {
    data,
    sections,
    common: {
      name,
      slug,
      lifecycle,
      order: parseOrder(required(data, "order", file), file),
      aliases,
      legacyRoutes: pipeList(data.legacyRoutes),
      legacyAnchors: pipeList(data.legacyAnchors),
      qualities: [qualityA, qualityB],
      image: required(data, "image", file),
      profile: parseProfile(requiredSection(sections, "Profile", file), file),
      quotes: {
        opening: textBlock(requiredSection(sections, "Opening Quotation", file)),
        closing: textBlock(requiredSection(sections, "Closing Quotation", file)),
      },
      research: {
        status: researchStatus,
        quoteIds: pipeList(required(data, "quoteIds", file)),
        mythicResonances: pipeList(required(data, "mythicResonances", file)),
        mythicSourceIds: pipeList(required(data, "mythicSourceIds", file)),
      },
      sourceFile: path.relative(contentDir, file),
    },
  };
}

function parseArchetype(file) {
  const { data, sections, common } = parseCommon(file, ["Opening Quotation", "Profile", "Closing Quotation"]);
  const roles = parseSectionRoles(data.sectionRoles, {
    definition: "Definition",
    declarations: "Declarations",
    balance: "Balance",
    applications: "Applications",
    gifts: "Gifts, Responsibilities, and Challenges",
    practices: "Practices",
    conclusion: `Living as the ${common.name}`,
  }, file);
  for (const heading of Object.values(roles)) requiredSection(sections, heading, file);
  return {
    kind: "archetype",
    ...common,
    coreFunction: required(data, "coreFunction", file),
    keyQualities: pipeList(required(data, "keyQualities", file)),
    activeShadowSlug: required(data, "activeShadowSlug", file),
    passiveShadowSlug: required(data, "passiveShadowSlug", file),
    bodySections: normalizedBodySections(sections, roles, ["Opening Quotation", "Profile", "Closing Quotation"]),
    sections: {
      definition: textBlock(requiredSection(sections, roles.definition, file)),
      declarations: list(requiredSection(sections, roles.declarations, file), file, "Declarations"),
      balance: textBlock(requiredSection(sections, roles.balance, file)),
      applications: textBlock(requiredSection(sections, roles.applications, file)),
      giftsResponsibilitiesChallenges: textBlock(requiredSection(sections, roles.gifts, file)),
      practices: list(requiredSection(sections, roles.practices, file), file, "Practices"),
      conclusion: textBlock(requiredSection(sections, roles.conclusion, file)),
    },
  };
}

function parseShadowFile(file) {
  const { data, sections, common } = parseCommon(file, ["Designation", "Opening Quotation", "Profile", "Closing Quotation"]);
  const roles = parseSectionRoles(data.sectionRoles, {
    balanceBreakdown: "Balance Breakdown",
    declarations: "Declarations",
    psychologicalMechanics: "Psychological Mechanics",
    hiddenEnergy: "Hidden Energy",
    recognition: "Recognition",
    practices: "Practices",
    oppositeShadow: "Opposite Shadow",
    transformation: "Transformation",
    conclusion: "Conclusion",
  }, file);
  for (const heading of Object.values(roles)) requiredSection(sections, heading, file);
  const type = required(data, "type", file);
  if (!new Set(["active", "passive"]).has(type)) fail(file, `invalid shadow type ${type}`);
  const designation = textBlock(requiredSection(sections, "Designation", file));
  const expectedDesignation = type === "active" ? "Active Shadow" : "Passive Shadow";
  if (designation !== expectedDesignation) fail(file, `designation must be ${expectedDesignation}`);
  return {
    kind: "shadow",
    ...common,
    parent: required(data, "parent", file),
    type,
    oppositeShadowSlug: required(data, "oppositeShadowSlug", file),
    bodySections: normalizedBodySections(sections, roles, ["Designation", "Opening Quotation", "Profile", "Closing Quotation"]),
    sections: {
      designation,
      balanceBreakdown: textBlock(requiredSection(sections, roles.balanceBreakdown, file)),
      declarations: list(requiredSection(sections, roles.declarations, file), file, "Declarations"),
      psychologicalMechanics: textBlock(requiredSection(sections, roles.psychologicalMechanics, file)),
      hiddenEnergy: textBlock(requiredSection(sections, roles.hiddenEnergy, file)),
      recognition: textBlock(requiredSection(sections, roles.recognition, file)),
      practices: list(requiredSection(sections, roles.practices, file), file, "Practices"),
      oppositeShadow: textBlock(requiredSection(sections, roles.oppositeShadow, file)),
      transformation: textBlock(requiredSection(sections, roles.transformation, file)),
      conclusion: textBlock(requiredSection(sections, roles.conclusion, file)),
    },
  };
}

function parseGroup(file) {
  const { data, name, sections } = parseDocument(file);
  const slug = required(data, "slug", file);
  return {
    name,
    slug,
    order: parseOrder(required(data, "order", file), file),
    sourceFile: required(data, "sourceFile", file),
    title: textBlock(requiredSection(sections, "Page Title", file)),
    summary: textBlock(requiredSection(sections, "Summary", file)),
    essence: textBlock(requiredSection(sections, "Essence", file)),
  };
}

function markdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((file) => file.endsWith(".md")).sort().map((file) => path.join(directory, file));
}

function normalizeInlineText(value) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeQuotationText(value) {
  return normalizeComparableText(value);
}

function normalizeComparableText(value) {
  return normalizeInlineText(value.normalize("NFKC")).toLocaleLowerCase("en-US");
}

function mythicFigure(resonance) {
  return normalizeInlineText(resonance.replace(/\s*(?:\([^()]*\)\s*)+$/, ""));
}

function phrasePattern(phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "iu");
}

function readerFacingText(entry) {
  const body = entry.bodySections.flatMap((section) => [
    section.heading,
    section.content,
    ...section.subsections.flatMap((subsection) => [subsection.heading, subsection.content]),
  ]);
  const wrappers = entry.kind === "shadow"
    ? ["Designation", entry.sections.designation, "Opening Quotation", "Closing Quotation"]
    : ["Opening Quotation", "Closing Quotation"];
  const profile = PROFILE_FIELDS
    .filter(([, key]) => key !== "mythicResonances")
    .map(([, key]) => entry.profile[key]);
  return [entry.name, ...wrappers, ...profile, entry.quotes.opening, entry.quotes.closing, ...body].join("\n");
}

function semanticBalanceText(entry) {
  return entry.kind === "archetype"
    ? entry.sections.balance
    : `${entry.sections.balanceBreakdown}\n${entry.sections.transformation}`;
}

function validateBook(book, { publish = false } = {}) {
  const failures = [];
  const names = new Set();
  const slugs = new Set();
  const parents = new Map(book.entries.filter((entry) => entry.kind === "archetype").map((entry) => [entry.slug, entry]));
  const sourceOwners = new Map();
  const groupNames = new Set();
  const groupSlugs = new Set();
  const groupOrders = new Set();

  for (const group of book.groups) {
    if (!group.name || !group.slug) failures.push("group missing name or slug");
    if (groupNames.has(group.name)) failures.push(`duplicate group name ${group.name}`);
    if (groupSlugs.has(group.slug)) failures.push(`duplicate group slug ${group.slug}`);
    if (groupOrders.has(group.order)) failures.push(`duplicate group order ${group.order}`);
    groupNames.add(group.name);
    groupSlugs.add(group.slug);
    groupOrders.add(group.order);
    if (group.slug !== LIFECYCLES[group.order - 1]) failures.push(`${group.name} has wrong lifecycle order or slug`);
  }
  for (const entry of book.entries) {
    const label = `${entry.lifecycle}/${entry.slug}`;
    if (!entry.name || !entry.slug) failures.push(`${label} missing name or slug`);
    if (names.has(entry.name)) failures.push(`${label} duplicate name ${entry.name}`);
    if (slugs.has(entry.slug)) failures.push(`${label} duplicate slug ${entry.slug}`);
    names.add(entry.name);
    slugs.add(entry.slug);
    if (entry.aliases.some((alias) => /[/()]/.test(alias))) failures.push(`${label} has compound alias`);
    if (!RESEARCH_STATUSES.has(entry.research.status)) failures.push(`${label} has invalid research status`);
    if (entry.profile.lifecycleStage.toLowerCase() !== entry.lifecycle) failures.push(`${label} profile lifecycle drift`);
    if (entry.profile.balancedQualities !== `${entry.qualities[0]} + ${entry.qualities[1]}`) failures.push(`${label} profile quality drift`);
    if (entry.profile.mythicResonances !== entry.research.mythicResonances.join(", ")) failures.push(`${label} profile mythic resonance drift`);

    const expectedCoreFunction = entry.kind === "archetype"
      ? entry.coreFunction
      : entry.type === "active"
        ? `${entry.qualities[0]} without ${entry.qualities[1]}`
        : `${entry.qualities[0]} collapses while ${entry.qualities[1]} distorts`;
    if (entry.profile.coreFunction !== expectedCoreFunction) failures.push(`${label} profile core function drift`);
    if (entry.kind === "archetype" && entry.profile.keyQualities !== entry.keyQualities.join(", ")) failures.push(`${label} profile key qualities drift`);

    if (entry.kind === "shadow") {
      const expectedKeyQualities = entry.sections.recognition
        .split(/\n\s*\n/)
        .map((quality) => quality.trim())
        .filter(Boolean)
        .join(", ");
      if (entry.profile.keyQualities !== expectedKeyQualities) failures.push(`${label} profile key qualities drift from Recognition`);
      const parent = parents.get(entry.parent);
      if (!parent) {
        failures.push(`${label} missing parent ${entry.parent}`);
      } else {
        if (entry.lifecycle !== parent.lifecycle) failures.push(`${label} has wrong lifecycle`);
        if (entry.qualities[0] !== parent.qualities[0] || entry.qualities[1] !== parent.qualities[1]) failures.push(`${label} parent/child quality drift`);
        const expectedSlug = entry.type === "active" ? parent.activeShadowSlug : parent.passiveShadowSlug;
        if (entry.slug !== expectedSlug) failures.push(`${label} has wrong ${entry.type} shadow relationship`);
        const oppositeSlug = entry.type === "active" ? parent.passiveShadowSlug : parent.activeShadowSlug;
        if (entry.oppositeShadowSlug !== oppositeSlug) failures.push(`${label} has wrong opposite shadow`);
      }
    }

    if (!publish) continue;
    if (entry.research.status === "pending") failures.push(`${label} has pending research`);
    if (entry.research.quoteIds.length !== 2) failures.push(`${label} must have exactly two verified quote IDs`);
    if (new Set(entry.research.quoteIds).size !== entry.research.quoteIds.length) failures.push(`${label} has duplicate quote IDs`);
    if (normalizeQuotationText(entry.quotes.opening) === normalizeQuotationText(entry.quotes.closing)) failures.push(`${label} has identical normalized quotation text`);
    if (!entry.research.mythicResonances.length || !entry.research.mythicSourceIds.length) failures.push(`${label} missing verified mythic assignments or source IDs`);
    if (!entry.image) failures.push(`${label} missing image path`);
    if (!entry.quotes.opening || !entry.quotes.closing) failures.push(`${label} has empty required quotation sections`);
    const declarationCount = entry.sections.declarations.length;
    const [minimum, maximum] = entry.kind === "archetype" ? [8, 12] : [6, 9];
    if (declarationCount < minimum || declarationCount > maximum) failures.push(`${label} declaration count must be ${minimum}–${maximum}`);
    for (const [key, value] of Object.entries(entry.sections)) {
      if ((Array.isArray(value) && !value.length) || (!Array.isArray(value) && !value.trim())) failures.push(`${label} has empty required section ${key}`);
    }
    for (const sourceId of entry.research.mythicSourceIds) {
      if (sourceOwners.has(sourceId)) failures.push(`${label} reuses mythic source ID ${sourceId} from ${sourceOwners.get(sourceId)}`);
      sourceOwners.set(sourceId, label);
    }
    if (entry.research.status === "verified") {
      const visibleText = readerFacingText(entry);
      for (const resonance of entry.research.mythicResonances) {
        const figure = mythicFigure(resonance);
        if (figure && phrasePattern(figure).test(visibleText)) failures.push(`${label} mythic resonance ${figure} appears outside Mythic Resonances profile`);
      }
    }
    if (entry.kind === "shadow") {
      const parent = parents.get(entry.parent);
      if (parent) {
        const parentResonances = new Set(parent.research.mythicResonances.map((resonance) => normalizeComparableText(mythicFigure(resonance))));
        for (const resonance of entry.research.mythicResonances) {
          if (parentResonances.has(normalizeComparableText(mythicFigure(resonance)))) failures.push(`${label} inherits parent mythic resonance ${resonance}`);
        }
      }
    }
  }

  if (failures.length) throw new Error(failures.join("\n"));
  return true;
}

function loadCanonicalTaxonomy(file = path.join(root, "editorial", "canonical-taxonomy.md")) {
  const rows = [];
  for (const line of read(file).split("\n")) {
    if (!/^\| .*\(`[^`]+`\) \| (Maiden|Lover|Mother|Queen|Crone) \|/.test(line)) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    const parent = cells[1].match(/^(.*?) \(`([^`]+)`\)$/);
    const active = cells[5].match(/^(.*?) \(`([^`]+)`\)$/);
    const passive = cells[6].match(/^(.*?) \(`([^`]+)`\)$/);
    const qualities = cells[4].split(" + ");
    if (!parent || !active || !passive || qualities.length !== 2) fail(file, `invalid canonical taxonomy row: ${line}`);
    rows.push({
      name: parent[1],
      slug: parent[2],
      lifecycle: cells[2].toLowerCase(),
      coreFunction: cells[3],
      qualityA: qualities[0],
      qualityB: qualities[1],
      active: { name: active[1], slug: active[2] },
      passive: { name: passive[1], slug: passive[2] },
    });
  }
  if (!rows.length) fail(file, "contains no canonical taxonomy rows");
  return rows;
}

function validateCanonicalBook(book, taxonomy = loadCanonicalTaxonomy()) {
  const failures = [];
  const archetypes = book.groups.flatMap((group) => group.archetypes);
  const bySlug = new Map(archetypes.map((entry) => [entry.slug, entry]));
  const expectedGroups = LIFECYCLES;
  const actualGroups = book.groups.map((group) => group.slug);
  if (JSON.stringify(actualGroups) !== JSON.stringify(expectedGroups)) failures.push(`canonical lifecycle groups drift: expected ${expectedGroups.join(", ")}, found ${actualGroups.join(", ")}`);
  if (archetypes.length !== taxonomy.length) failures.push(`canonical archetype count drift: expected ${taxonomy.length}, found ${archetypes.length}`);
  for (const expected of taxonomy) {
    const actual = bySlug.get(expected.slug);
    if (!actual) {
      failures.push(`missing canonical archetype ${expected.slug}`);
      continue;
    }
    const label = `${expected.lifecycle}/${expected.slug}`;
    if (actual.name !== expected.name) failures.push(`${label} canonical name drift`);
    if (actual.lifecycle !== expected.lifecycle) failures.push(`${label} canonical lifecycle drift`);
    if (actual.coreFunction !== expected.coreFunction) failures.push(`${label} canonical core function drift`);
    if (actual.qualities[0] !== expected.qualityA || actual.qualities[1] !== expected.qualityB) failures.push(`${label} canonical quality drift`);
    if (actual.activeShadowSlug !== expected.active.slug || actual.passiveShadowSlug !== expected.passive.slug) failures.push(`${label} canonical shadow relationship drift`);
    const active = actual.shadows.find((shadow) => shadow.type === "active");
    const passive = actual.shadows.find((shadow) => shadow.type === "passive");
    if (!active || active.name !== expected.active.name || active.slug !== expected.active.slug) failures.push(`${label} canonical active shadow drift`);
    if (!passive || passive.name !== expected.passive.name || passive.slug !== expected.passive.slug) failures.push(`${label} canonical passive shadow drift`);
  }
  const magician = bySlug.get("magician");
  if (magician) {
    const mechanics = [magician, ...magician.shadows].map(semanticBalanceText).join("\n");
    const retiredPower = /\b(?:Power\s*(?:\+|and|with|without)\s*Integrity|Integrity\s*(?:\+|and|with|without)\s*Power|Power\s+(?:acts|guides|balances|moves|works|channels|corrects|tempers)[^.!?\n]*\bIntegrity|Integrity\s+(?:acts|guides|balances|moves|works|channels|corrects|tempers)[^.!?\n]*\bPower|power is never meant to stand alone|without power|coupled with power)\b/i.test(mechanics);
    if (retiredPower) failures.push("queen/magician retired balance language Power");
  }
  const storyteller = bySlug.get("storyteller");
  if (storyteller) {
    const mechanics = [storyteller, ...storyteller.shadows]
      .map(semanticBalanceText)
      .join("\n");
    const retired = /\b(?:Honesty\s*(?:\+|and|with|without)\s*Imagination|Imagination\s*(?:\+|and|with|without)\s*Honesty|Honesty\s+(?:acts|guides|balances|moves|works|channels|corrects|tempers)[^.!?\n]*\bImagination|Imagination\s+(?:acts|guides|balances|moves|works|channels|corrects|tempers)[^.!?\n]*\bHonesty|honesty is never meant to stand alone|imagination is never meant to stand alone|untethered from imagination|without honesty|coupled with honesty)\b/i.test(mechanics);
    if (retired) failures.push("crone/storyteller retired balance language Honesty/Imagination");
  }
  if (failures.length) throw new Error(failures.join("\n"));
  return true;
}

function buildRedirects(entries) {
  const redirects = [];
  for (const entry of entries) {
    const destination = entry.kind === "archetype"
      ? `/${entry.lifecycle}/${entry.slug}/`
      : `/${entry.lifecycle}/${entry.parent}/shadows/${entry.slug}/`;
    for (const from of entry.legacyRoutes) redirects.push({ from, to: destination, type: "route" });
    if (entry.kind === "shadow") {
      for (const anchor of entry.legacyAnchors) redirects.push({
        from: `#shadow-${anchor}`,
        to: `/${entry.lifecycle}/${entry.parent}/#shadow-${entry.slug}`,
        type: "anchor",
      });
    }
  }
  const seen = new Set();
  for (const redirect of redirects) {
    if (seen.has(redirect.from)) throw new Error(`duplicate redirect ${redirect.from}`);
    seen.add(redirect.from);
  }
  return redirects;
}

function loadBook(directory = contentDir) {
  const groupDirectories = LIFECYCLES.map((lifecycle) => {
    const groupDirectory = path.join(directory, lifecycle);
    if (!fs.existsSync(groupDirectory) || !fs.statSync(groupDirectory).isDirectory()) fail(directory, `missing required lifecycle ${lifecycle}`);
    return groupDirectory;
  });
  const groups = groupDirectories.map((groupDirectory) => {
    const groupFile = path.join(groupDirectory, "group.md");
    if (!fs.existsSync(groupFile)) fail(groupDirectory, "missing group.md");
    const group = parseGroup(groupFile);
    const archetypes = markdownFiles(path.join(groupDirectory, "archetypes")).map(parseArchetype).sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
    const shadows = markdownFiles(path.join(groupDirectory, "shadows")).map(parseShadowFile);
    const parentSlugs = new Set(archetypes.map((archetype) => archetype.slug));
    for (const shadow of shadows) {
      if (!parentSlugs.has(shadow.parent)) fail(shadow.sourceFile, `missing parent ${shadow.parent}`);
    }
    const shadowsByParent = new Map();
    for (const shadow of shadows) {
      const values = shadowsByParent.get(shadow.parent) || [];
      values.push(shadow);
      shadowsByParent.set(shadow.parent, values);
    }
    for (const archetype of archetypes) {
      archetype.shadows = (shadowsByParent.get(archetype.slug) || []).sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
    }
    return { ...group, archetypes };
  }).sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));

  const entries = groups.flatMap((group) => group.archetypes.flatMap((archetype) => [archetype, ...archetype.shadows]));
  const book = { groups, entries, redirects: buildRedirects(entries) };
  validateBook(book);

  for (const group of groups) {
    for (const archetype of group.archetypes) {
      if (archetype.lifecycle !== group.slug) fail(archetype.sourceFile, "wrong lifecycle for containing group");
      if (archetype.shadows.length !== 2) fail(archetype.sourceFile, "must have exactly two standalone shadows");
      if (archetype.shadows[0]?.type !== "active" || archetype.shadows[1]?.type !== "passive") fail(archetype.sourceFile, "shadows must be ordered active, then passive");
      const activeName = archetype.shadows[0].name;
      const passiveName = archetype.shadows[1].name;
      for (const entry of [archetype, ...archetype.shadows]) {
        if (entry.profile.activeShadow !== activeName || entry.profile.passiveShadow !== passiveName) fail(entry.sourceFile, "profile shadow relationship drift");
      }
    }
  }
  return book;
}

function generatedFiles(book) {
  const output = new Map();
  for (const group of book.groups) {
    const { sourceFile, ...data } = group;
    output.set(`${sourceFile}.json`, `${JSON.stringify(data, null, 2)}\n`);
  }
  output.set("archetypes.json", `${JSON.stringify({
    title: "The Mature Feminine Archetype System",
    version: "4.0",
    description: "Generated from standalone canonical Markdown. Edit content/<lifecycle>/{archetypes,shadows}/*.md, then run npm run content:sync.",
    groups: book.groups.map(({ sourceFile, ...group }) => group),
    entries: book.entries,
    redirects: book.redirects,
  }, null, 2)}\n`);
  return output;
}

function writeGeneratedData(book, directory) {
  fs.mkdirSync(directory, { recursive: true });
  const files = generatedFiles(book);
  const expectedNames = new Set(files.keys());
  for (const name of fs.readdirSync(directory).filter((candidate) => /^group_.*\.json$/i.test(candidate))) {
    if (!expectedNames.has(name)) fs.unlinkSync(path.join(directory, name));
  }
  for (const [name, source] of files) fs.writeFileSync(path.join(directory, name), source);
}

function checkGeneratedData(book, directory) {
  const failures = [];
  const expectedFiles = generatedFiles(book);
  const expectedNames = new Set(expectedFiles.keys());
  for (const name of fs.readdirSync(directory).filter((candidate) => /^group_.*\.json$/i.test(candidate))) {
    if (!expectedNames.has(name)) failures.push(`unexpected generated file ${name}; run npm run content:sync`);
  }
  for (const [name, expected] of expectedFiles) {
    const file = path.join(directory, name);
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== expected) failures.push(`${name} is out of sync; run npm run content:sync`);
  }
  if (failures.length) throw new Error(failures.join("\n"));
  return true;
}

module.exports = {
  LIFECYCLES,
  checkGeneratedData,
  contentDir,
  generatedFiles,
  loadBook,
  loadCanonicalTaxonomy,
  parseArchetype,
  parseShadowFile,
  validateBook,
  validateCanonicalBook,
  writeGeneratedData,
};
