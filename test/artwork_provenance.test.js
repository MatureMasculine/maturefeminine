const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ledger = require("../research/artwork-ledger.json");

function record(assignment) {
  const match = ledger.records.find((item) => item.assignment === assignment);
  assert.ok(match, `${assignment} must have artwork provenance`);
  return match;
}

test("newly commissioned shadow artwork is local, distinct, and provenance-complete", () => {
  const assignments = ["closed-hearth", "manipulative-sorceress"];
  const records = assignments.map(record);

  assert.equal(new Set(records.map((item) => item.id)).size, records.length);
  assert.equal(new Set(records.map((item) => item.file)).size, records.length);

  for (const item of records) {
    assert.equal(item.status, "approved");
    assert.equal(item.inputImages.length, 0);
    assert.match(item.generator, /OpenAI built-in image-generation tool/);
    assert.match(item.pixelDimensions, /^\d+x\d+$/);
    assert.match(item.prompt, /vertical 2:3 portrait/);
    assert.match(item.prompt, /no text/i);
    assert.match(item.rightsStatus, /Generated specifically for this project/);
    assert.ok(fs.existsSync(path.join("src", item.file)), `${item.file} must exist in the project`);
  }
});

test("the Closed Hearth manuscript uses its dedicated generated artwork", () => {
  const source = fs.readFileSync("content/mother/shadows/closed-hearth.md", "utf8");

  assert.match(source, /^image: assets\/images\/shadow\/closed-hearth\.png$/m);
});
