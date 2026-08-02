const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ledger = require("../research/artwork-ledger.json");

function manuscriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return manuscriptFiles(file);
    return /\/(?:archetypes|shadows)\/[^/]+\.md$/.test(file) ? [file] : [];
  });
}

function frontmatterValue(source, key) {
  const match = source.match(new RegExp(`^${key}: (.+)$`, "m"));
  assert.ok(match, `missing ${key} frontmatter`);
  return match[1].trim();
}

test("all 66 canonical artworks are local, distinct, print-ready, and provenance-complete", () => {
  assert.equal(ledger.records.length, 66);
  assert.equal(new Set(ledger.records.map((item) => item.id)).size, 66);
  assert.equal(new Set(ledger.records.map((item) => item.assignment)).size, 66);
  assert.equal(new Set(ledger.records.map((item) => item.file)).size, 66);

  for (const item of ledger.records) {
    assert.equal(item.status, "approved");
    assert.deepEqual(item.inputImages, []);
    assert.match(item.generator, /OpenAI .*built-in (?:image-generation|tool)/);
    assert.match(item.pixelDimensions, /^\d+x\d+$/);
    assert.match(item.prompt, /vertical(?: editorial illustration,|,? strict)? 2:3 portrait/i);
    assert.match(item.prompt, /\b(?:no|avoid)[^.!;]*\b(?:readable )?text/i);
    assert.match(item.rightsStatus, /(?:Generated specifically|New AI-generated artwork commissioned)/);

    const [width, height] = item.pixelDimensions.split("x").map(Number);
    const cropRatio = 3.4 / 5.25;
    const croppedWidth = Math.min(width, height * cropRatio);
    const croppedHeight = Math.min(height, width / cropRatio);
    const effectiveDpi = Math.min(croppedWidth / 3.4, croppedHeight / 5.25);
    assert.ok(effectiveDpi >= 285.29, `${item.assignment} is only ${effectiveDpi.toFixed(2)} effective DPI`);

    assert.ok(fs.existsSync(path.join("src", item.file)), `${item.file} must exist in the project`);
  }
});

test("every canonical manuscript maps its own approved provenance record", () => {
  const records = new Map(ledger.records.map((item) => [item.assignment, item]));
  const sources = manuscriptFiles("content");
  assert.equal(sources.length, 66);

  for (const sourcePath of sources) {
    const source = fs.readFileSync(sourcePath, "utf8");
    const slug = frontmatterValue(source, "slug");
    const image = frontmatterValue(source, "image");
    const item = records.get(slug);
    assert.ok(item, `${slug} must have artwork provenance`);
    assert.equal(image, item.file, `${sourcePath} must map its approved provenance asset`);
  }
});
