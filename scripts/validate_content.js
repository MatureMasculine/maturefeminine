const fs = require("fs");
const path = require("path");
const { loadGroups } = require("./content_markdown");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "src", "_data");
const failures = [];

const sourceGroups = loadGroups();
const aggregate = JSON.parse(fs.readFileSync(path.join(dataDir, "archetypes.json"), "utf8"));
const aggregateGroups = sourceGroups.map((group) => ({
  title: group.title,
  group: group.group,
  name: group.name,
  slug: group.slug,
  summary: group.summary,
  essence: group.essence,
  items: group.items,
}));

for (const group of sourceGroups) {
  const { sourceFile, ...generatedGroup } = group;
  const outputFile = path.join(dataDir, `${sourceFile}.json`);
  if (!fs.existsSync(outputFile) || fs.readFileSync(outputFile, "utf8") !== `${JSON.stringify(generatedGroup, null, 2)}\n`) {
    failures.push(`${sourceFile}.json is out of sync; run npm run content:sync`);
  }
}

if (JSON.stringify(aggregate.groups) !== JSON.stringify(aggregateGroups)) {
  failures.push("archetypes.json is out of sync; run npm run content:sync");
}

const names = new Set();
const slugs = new Set();
const shadowSlugs = new Set();
for (const group of sourceGroups) {
  const groupName = group.name;
  if (/[/()]/.test(groupName)) failures.push(`group has an alternative/parenthetical title: ${groupName}`);

  for (const item of group.items || []) {
    const label = `${groupName} > ${item.name}`;
    if (/[/()]/.test(item.name)) failures.push(`${label} has an alternative/parenthetical title`);
    if (names.has(item.name)) failures.push(`${label} duplicates another archetype name`);
    if (slugs.has(item.slug)) failures.push(`${label} duplicates slug ${item.slug}`);
    names.add(item.name);
    slugs.add(item.slug);

    const balance = item.extended?.balance;
    const shadows = item.extended?.shadows || [];
    const poles = (balance?.balance || "").split(" ↔ ");
    if (poles.length !== 2 || poles.some((pole) => !pole.trim())) {
      failures.push(`${label} must have exactly two balance qualities separated by ↔`);
    }
    if (shadows.length !== 2) failures.push(`${label} must have exactly two shadows`);
    if (shadows[0]?.type !== "active" || shadows[1]?.type !== "passive") {
      failures.push(`${label} shadows must be ordered active, then passive`);
    }
    if (shadows.filter((shadow) => shadow.type === "active").length !== 1) {
      failures.push(`${label} must have exactly one active shadow`);
    }
    if (shadows.filter((shadow) => shadow.type === "passive").length !== 1) {
      failures.push(`${label} must have exactly one passive shadow`);
    }
    const shadowNames = shadows.map((shadow) => shadow.name).join(" ↔ ");
    if (balance?.shadow !== shadowNames) {
      failures.push(`${label} shadow summary does not match its active/passive shadow names`);
    }
    for (const shadow of shadows) {
      const shadowLabel = `${label} > ${shadow.name}`;
      if (/[/()]/.test(shadow.name)) failures.push(`${shadowLabel} has an alternative/parenthetical title`);
      if (!shadow.slug) failures.push(`${shadowLabel} needs an explicit stable slug`);
      if (shadowSlugs.has(shadow.slug)) failures.push(`${shadowLabel} duplicates shadow slug ${shadow.slug}`);
      shadowSlugs.add(shadow.slug);
    }
    const virtueNames = (item.extended?.virtues || []).map((virtue) => virtue.title);
    if (poles.length === 2 && JSON.stringify(virtueNames) !== JSON.stringify(poles)) {
      failures.push(`${label} virtue titles do not match its balance qualities`);
    }
  }
}


if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Validated ${sourceGroups.length} groups and ${names.size} archetypes.`);
