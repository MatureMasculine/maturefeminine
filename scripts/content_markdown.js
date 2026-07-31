const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "content");

function fail(file, message) {
  throw new Error(`${path.relative(root, file)}: ${message}`);
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
    data[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return { data, lines: source.slice(match[0].length).split("\n") };
}

function headingSections(lines, level) {
  const prefix = `${"#".repeat(level)} `;
  const sections = [];
  let current;
  for (const line of lines) {
    if (line.startsWith(prefix)) {
      if (current) sections.push(current);
      current = { title: line.slice(prefix.length).trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

function firstHeading(lines, level) {
  const section = headingSections(lines, level)[0];
  return section?.title;
}

function section(sections, title, file) {
  const found = sections.find((candidate) => candidate.title === title);
  if (!found) fail(file, `missing ## ${title} section`);
  return found.lines;
}

function paragraphs(lines) {
  return lines
    .join("\n")
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function text(lines, file, label) {
  const values = paragraphs(lines);
  if (values.length !== 1) fail(file, `${label} must contain one paragraph`);
  return values[0];
}

function list(lines, file, label) {
  const values = lines.filter((line) => line.startsWith("- ")).map((line) => line.slice(2));
  if (!values.length) fail(file, `${label} must contain at least one list item`);
  return values;
}

function fieldList(lines, file, label) {
  const result = {};
  for (const line of lines.filter((line) => line.startsWith("- "))) {
    const separator = line.indexOf(":", 2);
    if (separator < 3) fail(file, `invalid ${label} entry: ${line}`);
    result[line.slice(2, separator).trim()] = line.slice(separator + 1).trim();
  }
  return result;
}

function renderList(values) {
  return values.map((value) => `- ${value}`).join("\n");
}

function renderParagraphs(values) {
  return values.join("\n\n");
}

function parseGroup(file) {
  const { data, lines } = parseFrontMatter(file, read(file));
  const name = firstHeading(lines, 1);
  if (!name) fail(file, "missing # group name");
  const sections = headingSections(lines, 2);
  return {
    title: text(section(sections, "Page Title", file), file, "Page Title"),
    group: name,
    name,
    slug: data.slug || fail(file, "missing slug in front matter"),
    summary: text(section(sections, "Summary", file), file, "Summary"),
    essence: text(section(sections, "Essence", file), file, "Essence"),
    sourceFile: data.sourceFile || fail(file, "missing sourceFile in front matter"),
  };
}

function parseShadow(file, sectionData) {
  const match = sectionData.title.match(/^(Active|Passive) Shadow: (.+)$/);
  if (!match) fail(file, `invalid shadow heading: ${sectionData.title}`);
  const sections = headingSections(sectionData.lines, 4);
  const metadata = fieldList(section(sections, "Metadata", file), file, "shadow metadata");
  const shadow = {
    name: match[2],
    type: match[1].toLowerCase(),
    slug: metadata.slug || fail(file, `missing shadow slug for ${match[2]}`),
    description: paragraphs(section(sections, "Description", file)),
    declarations: list(section(sections, "Declarations", file), file, "shadow declarations"),
    balancing: list(section(sections, "Balancing", file), file, "shadow balancing"),
    gift: text(section(sections, "Gift", file), file, "shadow gift"),
    outOfBalance: list(section(sections, "Out of Balance", file), file, "shadow out-of-balance indicators"),
  };
  const qualities = sections.find((candidate) => candidate.title === "Qualities");
  if (qualities) shadow.qualities = text(qualities.lines, file, "shadow qualities");
  return shadow;
}

function parseItem(file) {
  const { data, lines } = parseFrontMatter(file, read(file));
  const name = firstHeading(lines, 1);
  if (!name) fail(file, "missing # item name");
  const sections = headingSections(lines, 2);
  const shadows = headingSections(section(sections, "Shadows", file), 3).map((shadow) => parseShadow(file, shadow));
  const matureSections = headingSections(section(sections, "Mature Expression", file), 3);
  const matureTitle = text(section(matureSections, "Title", file), file, "mature title");
  const virtues = headingSections(section(sections, "Virtues", file), 3).map((virtue) => {
    const virtueSections = headingSections(virtue.lines, 4);
    const result = { title: virtue.title, paragraphs: paragraphs(section(virtueSections, "Description", file)) };
    const quote = virtueSections.find((candidate) => candidate.title === "Quote");
    if (quote) result.quote = text(quote.lines, file, "virtue quote");
    return result;
  });
  const balanceFields = fieldList(section(sections, "Balance", file), file, "balance");
  return {
    name,
    slug: data.slug || fail(file, "missing slug in front matter"),
    qualities: list(section(sections, "Qualities", file), file, "qualities"),
    gifts: text(section(sections, "Gifts", file), file, "Gifts"),
    growthPath: text(section(sections, "Growth Path", file), file, "Growth Path"),
    practices: list(section(sections, "Practices", file), file, "Practices"),
    extended: {
      shadows,
      mature: { title: matureTitle, paragraphs: paragraphs(section(matureSections, "Paragraphs", file)) },
      declarations: list(section(sections, "Mature Declarations", file), file, "mature declarations"),
      balance: {
        balance: balanceFields.Pair || fail(file, "missing balance Pair"),
        shadow: balanceFields.Shadows || fail(file, "missing balance Shadows"),
        powerAnimals: balanceFields["Power Animals"] || "",
        qualities: balanceFields.Qualities || "",
      },
      virtues,
    },
  };
}

function loadGroups() {
  const groupDirs = fs.readdirSync(contentDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  const groups = groupDirs.map((entry) => {
    const directory = path.join(contentDir, entry.name);
    const group = parseGroup(path.join(directory, "group.md"));
    const itemFiles = fs.readdirSync(directory).filter((file) => file.endsWith(".md") && file !== "group.md").sort();
    const items = itemFiles.map((file) => parseItem(path.join(directory, file)));
    for (const item of items) {
    }
    return { ...group, items };
  }).sort((a, b) => a.sourceFile.localeCompare(b.sourceFile, undefined, { numeric: true }));
  return groups;
}

function renderGroup(group) {
  return `---\nsourceFile: ${group.sourceFile}\nslug: ${group.slug}\n---\n# ${group.name}\n\n## Page Title\n\n${group.title}\n\n## Summary\n\n${group.summary}\n\n## Essence\n\n${group.essence}\n`;
}

function renderShadow(shadow) {
  const optionalQualities = shadow.qualities ? `\n\n#### Qualities\n\n${shadow.qualities}` : "";
  return `### ${shadow.type === "active" ? "Active" : "Passive"} Shadow: ${shadow.name}\n\n#### Metadata\n\n- slug: ${shadow.slug}\n\n#### Description\n\n${renderParagraphs(shadow.description)}\n\n#### Declarations\n\n${renderList(shadow.declarations)}\n\n#### Balancing\n\n${renderList(shadow.balancing)}\n\n#### Gift\n\n${shadow.gift}\n\n#### Out of Balance\n\n${renderList(shadow.outOfBalance)}${optionalQualities}`;
}

function renderItem(item) {
  const virtues = item.extended.virtues.map((virtue) => {
    const quote = virtue.quote ? `\n\n#### Quote\n\n${virtue.quote}` : "";
    return `### ${virtue.title}\n\n#### Description\n\n${renderParagraphs(virtue.paragraphs)}${quote}`;
  }).join("\n\n");
  return `---\nslug: ${item.slug}\n---\n# ${item.name}\n\n## Qualities\n\n${renderList(item.qualities)}\n\n## Gifts\n\n${item.gifts}\n\n## Growth Path\n\n${item.growthPath}\n\n## Practices\n\n${renderList(item.practices)}\n\n## Shadows\n\n${item.extended.shadows.map(renderShadow).join("\n\n")}\n\n## Mature Expression\n\n### Title\n\n${item.extended.mature.title}\n\n### Paragraphs\n\n${renderParagraphs(item.extended.mature.paragraphs)}\n\n## Mature Declarations\n\n${renderList(item.extended.declarations)}\n\n## Balance\n\n- Pair: ${item.extended.balance.balance}\n- Shadows: ${item.extended.balance.shadow}\n- Power Animals: ${item.extended.balance.powerAnimals}\n- Qualities: ${item.extended.balance.qualities}\n\n## Virtues\n\n${virtues}\n`;
}

function writeMarkdown(groups) {
  for (const group of groups) {
    const directory = path.join(contentDir, group.slug);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "group.md"), renderGroup(group));
    for (const item of group.items) fs.writeFileSync(path.join(directory, `${item.slug}.md`), renderItem(item));
  }
}

module.exports = { contentDir, loadGroups, writeMarkdown };
