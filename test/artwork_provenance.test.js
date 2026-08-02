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
  const assignments = [
    "closed-hearth",
    "manipulative-sorceress",
    "scattered-maker",
    "enmeshing-lover",
    "guarded-healer",
    "guardian",
    "controlling-sentinel",
    "host",
    "martyr-host",
    "peace-enforcer",
    "resentful-bystander",
    "isolated-helper",
    "rampaging-warrior",
    "justice",
  ];
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

test("commissioned artwork is mapped by its canonical manuscript", () => {
  const sources = {
    "closed-hearth": "content/mother/shadows/closed-hearth.md",
    "manipulative-sorceress": "content/queen/shadows/manipulative-sorceress.md",
    "scattered-maker": "content/lover/shadows/scattered-maker.md",
    "enmeshing-lover": "content/lover/shadows/enmeshing-lover.md",
    "guarded-healer": "content/lover/shadows/guarded-healer.md",
    guardian: "content/mother/archetypes/guardian.md",
    "controlling-sentinel": "content/mother/shadows/controlling-sentinel.md",
    host: "content/mother/archetypes/host.md",
    "martyr-host": "content/mother/shadows/martyr-host.md",
    "peace-enforcer": "content/mother/shadows/peace-enforcer.md",
    "resentful-bystander": "content/mother/shadows/resentful-bystander.md",
    "isolated-helper": "content/mother/shadows/isolated-helper.md",
    "rampaging-warrior": "content/mother/shadows/rampaging-warrior.md",
    justice: "content/queen/archetypes/justice.md",
  };

  for (const [assignment, sourcePath] of Object.entries(sources)) {
    const source = fs.readFileSync(sourcePath, "utf8");
    assert.match(source, new RegExp(`^image: ${record(assignment).file.replaceAll(".", "\\.")}$`, "m"));
  }
});
