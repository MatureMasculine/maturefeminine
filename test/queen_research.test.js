const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const quotations = require("../research/quotation-ledger.json").records;
const myths = require("../research/mythic-resonance-ledger.json").records;

const trios = {
  justice: ["justice", "merciless-judge", "permissive-witness"],
  queen: ["queen", "tyrannical-queen", "abdicating-queen"],
  luminary: ["luminary", "blinding-star", "hidden-light"],
  magician: ["magician", "manipulative-sorceress", "powerless-mystic"],
};

const spreads = Object.values(trios).flat();

function sourcePath(slug) {
  const kind = Object.hasOwn(trios, slug) ? "archetypes" : "shadows";
  return path.join("content", "queen", kind, `${slug}.md`);
}

function manuscript(slug) {
  return fs.readFileSync(sourcePath(slug), "utf8");
}

function metadata(source, key) {
  const match = source.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  assert.ok(match, `${key} must exist`);
  return match[1];
}

function section(source, heading, nextHeading) {
  const end = nextHeading ? `(?=\\n## ${nextHeading}\\n)` : "(?=\\n## |$)";
  const match = source.match(new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)${end}`));
  assert.ok(match, `${heading} must exist`);
  return match[1].trim();
}

test("Queen records are complete, verified, independent, and public domain", () => {
  const assignedQuotes = quotations.filter((item) => spreads.includes(item.assignedSpread));
  const assignedMyths = myths.filter((item) => spreads.includes(item.assignedSpread));

  assert.equal(assignedQuotes.length, 24);
  assert.equal(new Set(assignedQuotes.map((item) => item.id)).size, 24);
  assert.equal(new Set(assignedQuotes.map((item) => item.exactQuotation)).size, 24);
  assert.equal(assignedMyths.length, 12);
  assert.equal(new Set(assignedMyths.map((item) => item.id)).size, 12);
  assert.equal(new Set(assignedMyths.map((item) => item.figure)).size, 12);

  for (const [parent, trio] of Object.entries(trios)) {
    const trioQuotes = assignedQuotes.filter((item) => trio.includes(item.assignedSpread));
    assert.equal(new Set(trioQuotes.map((item) => item.origin.work)).size, 6, `${parent} trio must use six distinct works`);
  }

  for (const slug of spreads) {
    const spreadQuotes = assignedQuotes.filter((item) => item.assignedSpread === slug);
    const spreadMyths = assignedMyths.filter((item) => item.assignedSpread === slug);
    assert.deepEqual(spreadQuotes.map((item) => item.position), ["opening", "closing"]);
    assert.equal(spreadMyths.length, 1);
    assert.equal(spreadMyths[0].verificationStatus, "verified");
    assert.match(spreadMyths[0].rightsStatus, /public domain in the United States/i);
    for (const quote of spreadQuotes) {
      assert.equal(quote.verificationStatus, "verified");
      assert.match(quote.rightsStatus, /public domain/i);
      assert.match(quote.sourceUrl, /^https:\/\//);
    }
  }
});

test("Queen manuscripts print canonical research and declaration counts", () => {
  for (const slug of spreads) {
    const source = manuscript(slug);
    const spreadQuotes = quotations.filter((item) => item.assignedSpread === slug);
    const spreadMyths = myths.filter((item) => item.assignedSpread === slug);
    assert.equal(metadata(source, "researchStatus"), "verified");
    assert.deepEqual(metadata(source, "quoteIds").split("|"), spreadQuotes.map((item) => item.id));
    assert.deepEqual(metadata(source, "mythicSourceIds").split("|"), spreadMyths.map((item) => item.id));
    assert.match(metadata(source, "mythicResonances"), /\S/);
    assert.ok(section(source, "Opening Quotation").includes(spreadQuotes[0].exactQuotation), `${slug} opening quotation drift`);
    assert.ok(section(source, "Closing Quotation").includes(spreadQuotes[1].exactQuotation), `${slug} closing quotation drift`);

    const declarations = section(source, metadata(source, "sectionRoles").match(/declarations=([^|]+)/)[1]).match(/^- /gm) || [];
    assert.equal(declarations.length, Object.hasOwn(trios, slug) ? 10 : 8, `${slug} declaration count`);

    const profile = section(source, "Profile");
    const fields = profile.match(/^- [^:]+:/gm) || [];
    assert.equal(fields.length, 7, `${slug} profile field count`);
    assert.match(profile, new RegExp(`- Balanced qualities: Mature .+ = .+ \\+ .+`));
  }
});

test("Queen practices use shared observable invitations", () => {
  for (const slug of spreads) {
    const source = manuscript(slug);
    const practicesHeading = metadata(source, "sectionRoles").match(/practices=([^|]+)/)[1];
    const practices = section(source, practicesHeading).split("\n").filter((line) => line.startsWith("- "));
    assert.ok(practices.length >= 6, `${slug} must have at least six practices`);
    for (const practice of practices) {
      assert.match(practice, /^- We\b/);
      assert.match(practice, /\.$/);
    }
  }
});

test("Queen mythic names appear only in profile fields", () => {
  for (const slug of spreads) {
    const source = manuscript(slug);
    const resonance = metadata(source, "mythicResonances");
    const figure = resonance.replace(/\s*\([^)]*\)\s*$/, "");
    const withoutMetadataAndProfile = source
      .replace(/^---[\s\S]*?---\n/, "")
      .replace(/## Profile\n[\s\S]*?(?=\n## )/, "");
    assert.doesNotMatch(withoutMetadataAndProfile, new RegExp(`\\b${figure.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"));
  }
});
