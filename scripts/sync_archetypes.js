const path = require("path");
const fs = require("fs");
const { loadGroups } = require("./content_markdown");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "src", "_data");
const groups = loadGroups();

for (const group of groups) {
  const { sourceFile, ...jsonGroup } = group;
  fs.writeFileSync(path.join(dataDir, `${sourceFile}.json`), `${JSON.stringify(jsonGroup, null, 2)}\n`);
}

const output = {
  title: "The Mature Feminine Archetype System",
  version: "3.0",
  description:
    "Generated from Markdown content. Edit content/<group>/*.md, then run npm run content:sync.",
  groups: groups.map(({ sourceFile, ...group }) => group),
};

fs.writeFileSync(
  path.join(dataDir, "archetypes.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(`Synchronized ${groups.length} groups and ${groups.flatMap((group) => group.items).length} archetypes.`);
