const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const CONTENT_ROOT = path.join(__dirname, "..", "content");

function entrySources() {
  const files = [];
  for (const lifecycle of fs.readdirSync(CONTENT_ROOT, { withFileTypes: true })) {
    if (!lifecycle.isDirectory() || lifecycle.name === "special") continue;
    for (const kind of ["archetypes", "shadows"]) {
      const directory = path.join(CONTENT_ROOT, lifecycle.name, kind);
      if (!fs.existsSync(directory)) continue;
      for (const name of fs.readdirSync(directory).filter((item) => item.endsWith(".md"))) {
        files.push(path.join(directory, name));
      }
    }
  }
  return files.sort();
}

test("entry sources do not print raw Markdown blockquote markers", () => {
  for (const file of entrySources()) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /^>\s?/m,
      `${path.relative(CONTENT_ROOT, file)} must use plain quotation lines for the controlled print renderer`,
    );
  }
});
