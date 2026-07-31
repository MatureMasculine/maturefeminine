const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { after, before } = test;

const Eleventy = require("@11ty/eleventy");

const archetypeData = require("../src/_data/archetypes.json");
const configureEleventy = require("../.eleventy.js");

function loadConfiguration() {
  const factories = new Map();
  const filters = new Map();
  const config = {
    addCollection(name, factory) {
      factories.set(name, factory);
    },
    addFilter(name, filter) {
      filters.set(name, filter);
    },
    addGlobalData() {},
    addPassthroughCopy() {},
  };

  configureEleventy(config);

  return {
    collections: Object.fromEntries(
      [...factories].map(([name, factory]) => [name, factory()]),
    ),
    filters: Object.fromEntries(filters),
  };
}

function loadCollections() {
  return loadConfiguration().collections;
}

function expectedEntryUrl(entry) {
  if (entry.kind === "archetype") {
    return `/${entry.lifecycle}/${entry.slug}/`;
  }
  return `/${entry.lifecycle}/${entry.parent}/shadows/${entry.slug}/`;
}

function requireCollection(collections, name) {
  assert.ok(Array.isArray(collections[name]), `${name} collection must be registered`);
  return collections[name];
}

let buildError;
let outputDirectory;

before(async () => {
  outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "mature-feminine-site-"));
  try {
    const eleventy = new Eleventy("src", outputDirectory, {
      configPath: ".eleventy.js",
      quietMode: true,
    });
    await eleventy.write();
  } catch (error) {
    buildError = error;
  }
});

after(() => {
  fs.rmSync(outputDirectory, { recursive: true, force: true });
});

function outputFile(relativePath) {
  const file = path.join(outputDirectory, relativePath);
  assert.ok(fs.existsSync(file), `${relativePath} must be emitted`);
  return file;
}

function outputText(relativePath) {
  return fs.readFileSync(outputFile(relativePath), "utf8");
}

test("site collections consume every normalized lifecycle and entry", () => {
  const collections = loadCollections();
  const entries = requireCollection(collections, "entries");

  assert.equal(collections.groups.length, archetypeData.groups.length);
  assert.equal(entries.length, archetypeData.entries.length);
  assert.deepEqual(
    entries.map((entry) => entry.kind).sort(),
    archetypeData.entries.map((entry) => entry.kind).sort(),
  );
});

test("every entry has one unique canonical URL", () => {
  const entries = requireCollection(loadCollections(), "entries");
  const urls = entries.map((entry) => entry.url);

  assert.deepEqual(
    urls,
    entries.map(expectedEntryUrl),
  );
  assert.equal(new Set(urls).size, urls.length);
});

test("shadow URLs are standalone pages", () => {
  const entries = requireCollection(loadCollections(), "entries");
  const shadows = entries.filter((entry) => entry.kind === "shadow");

  assert.equal(shadows.length, 44);
  for (const shadow of shadows) {
    assert.match(shadow.url, /^\/[a-z-]+\/[a-z-]+\/shadows\/[a-z-]+\/$/);
    assert.doesNotMatch(shadow.url, /#/);
  }
});

test("every shadow parent and opposite URL resolves", () => {
  const entries = requireCollection(loadCollections(), "entries");
  const urls = new Set(entries.map((entry) => entry.url));

  for (const shadow of entries.filter((entry) => entry.kind === "shadow")) {
    assert.equal(shadow.parentUrl, `/${shadow.lifecycle}/${shadow.parent}/`);
    assert.equal(
      shadow.oppositeUrl,
      `/${shadow.lifecycle}/${shadow.parent}/shadows/${shadow.oppositeShadowSlug}/`,
    );
    assert.ok(urls.has(shadow.parentUrl), `${shadow.slug} parent URL must resolve`);
    assert.ok(urls.has(shadow.oppositeUrl), `${shadow.slug} opposite URL must resolve`);
  }
});

test("legacy route redirects point to canonical site URLs", () => {
  const collections = loadCollections();
  const groups = requireCollection(collections, "groups");
  const entries = requireCollection(collections, "entries");
  const redirects = requireCollection(collections, "redirects");
  const canonicalUrls = new Set([
    ...groups.map((group) => group.url),
    ...entries.map((entry) => entry.url),
  ]);

  assert.ok(redirects.length > 0);
  for (const redirect of redirects) {
    assert.equal(redirect.type, "route");
    assert.ok(redirect.url.startsWith("/"));
    assert.ok(canonicalUrls.has(redirect.canonicalUrl), `${redirect.url} must target a canonical route`);
  }
});

test("the legacy Lover lifecycle root redirects to the canonical lifecycle", () => {
  const redirects = requireCollection(loadCollections(), "redirects");

  assert.deepEqual(
    redirects.find((redirect) => redirect.url === "/lover-creatrix/"),
    {
      from: "/lover-creatrix/",
      to: "/lover/",
      type: "route",
      url: "/lover-creatrix/",
      canonicalUrl: "/lover/",
      canonicalName: "Lover",
      anchors: redirects[0].anchors,
    },
  );
});

test("Eleventy emits lifecycle, archetype, shadow, and legacy redirect pages", () => {
  assert.ifError(buildError);

  for (const relativePath of [
    "maiden/index.html",
    "maiden/adventurer/index.html",
    "maiden/adventurer/shadows/reckless-wanderer/index.html",
    "maiden/adventurer/shadows/sheltered-dreamer/index.html",
    "maiden/adventurer-storm-tempest/index.html",
    "lover-creatrix/index.html",
  ]) {
    outputFile(relativePath);
  }
});

test("archetype pages render only populated approved profile fields and both shadows", () => {
  assert.ifError(buildError);
  const html = outputText("maiden/adventurer/index.html");
  const populatedFields = [
    "lifecycleStage",
    "coreFunction",
    "balancedQualities",
    "activeShadow",
    "passiveShadow",
    "keyQualities",
  ];

  assert.equal((html.match(/data-profile-field=/g) || []).length, populatedFields.length);
  for (const field of populatedFields) {
    assert.match(html, new RegExp(`data-profile-field="${field}"`));
  }
  assert.doesNotMatch(html, /data-profile-field="mythicResonances"/);
  assert.match(html, /href="\/maiden\/adventurer\/shadows\/reckless-wanderer\/"/);
  assert.match(html, /href="\/maiden\/adventurer\/shadows\/sheltered-dreamer\/"/);
  assert.doesNotMatch(html, /quoteIds|mythicSourceIds|researchStatus/);
});

test("blank quotations do not render ornamental quotation blocks", () => {
  assert.ifError(buildError);
  const archetype = outputText("maiden/adventurer/index.html");
  const shadow = outputText("maiden/adventurer/shadows/reckless-wanderer/index.html");

  assert.doesNotMatch(archetype, /entry-quote/);
  assert.doesNotMatch(shadow, /entry-quote/);
});

test("shadow pages link to their parent and opposite shadow", () => {
  assert.ifError(buildError);
  const html = outputText("maiden/adventurer/shadows/reckless-wanderer/index.html");

  assert.match(html, />Active shadow</i);
  assert.match(html, /href="\/maiden\/adventurer\/"[^>]*>Adventurer</);
  assert.match(html, /href="\/maiden\/adventurer\/shadows\/sheltered-dreamer\/"[^>]*>Sheltered Dreamer</);
  assert.doesNotMatch(html, /quoteIds|mythicSourceIds|researchStatus/);
});

test("search emits one unique canonical record per lifecycle and entry", () => {
  assert.ifError(buildError);
  const search = JSON.parse(outputText("search.json"));
  const hrefs = search.items.map((item) => item.href);

  assert.equal(search.items.length, 71);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.deepEqual(
    Object.fromEntries(
      ["lifecycle", "archetype", "shadow"].map((type) => [
        type,
        search.items.filter((item) => item.type === type).length,
      ]),
    ),
    { lifecycle: 5, archetype: 22, shadow: 44 },
  );
  const shadow = search.items.find((item) => item.slug === "reckless-wanderer");
  assert.deepEqual(
    {
      type: shadow.type,
      lifecycle: shadow.lifecycle,
      lifecycleSlug: shadow.lifecycleSlug,
      name: shadow.name,
      slug: shadow.slug,
      parent: shadow.parent,
      parentSlug: shadow.parentSlug,
      balanceQualities: shadow.balanceQualities,
      keyQualities: shadow.keyQualities,
      href: shadow.href,
    },
    {
      type: "shadow",
      lifecycle: "Maiden",
      lifecycleSlug: "maiden",
      name: "Reckless Wanderer",
      slug: "reckless-wanderer",
      parent: "Adventurer",
      parentSlug: "adventurer",
      balanceQualities: ["Daring", "Prudence"],
      keyQualities: "Creates preventable emergencies, Breaks agreements for novelty, Uses motion to avoid feeling",
      href: "/maiden/adventurer/shadows/reckless-wanderer/",
    },
  );
});

test("legacy redirects expose canonical metadata and map old shadow fragments", () => {
  assert.ifError(buildError);
  const html = outputText("maiden/adventurer-storm-tempest/index.html");

  assert.match(html, /rel="canonical" href="\/maiden\/adventurer\/"/);
  assert.match(html, /http-equiv="refresh" content="0; url=\/maiden\/adventurer\/"/);
  assert.match(html, /#shadow-reckless-storm/);
  assert.match(html, /\/maiden\/adventurer\/shadows\/reckless-wanderer\//);
});

test("body sections render full Markdown and normalized subsections", () => {
  const { renderSections } = loadConfiguration().filters;
  assert.equal(typeof renderSections, "function", "renderSections filter must be registered");

  const html = renderSections([
    {
      heading: "Field Note",
      content: "A **bold** [link](https://example.com).\n\n1. First\n2. Second",
      subsections: [
        { heading: "Detail", content: "> Quoted guidance." },
      ],
    },
  ]);

  assert.match(html, /<h2[^>]*>Field Note<\/h2>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<a href="https:\/\/example\.com">link<\/a>/);
  assert.match(html, /<ol>/);
  assert.match(html, /<h3[^>]*>Detail<\/h3>/);
  assert.match(html, /<blockquote>/);
});

test("search indexes emitted metadata and exposes it to the no-index fallback", () => {
  assert.ifError(buildError);
  const script = fs.readFileSync("src/assets/main.js", "utf8");
  const html = outputText("maiden/adventurer/index.html");

  for (const key of ["keyQualities", "balanceQualities", "parent"]) {
    assert.match(script, new RegExp(`keys: \\[.*['\"]${key}['\"]`, "s"));
  }
  assert.match(html, /data-name="adventurer" data-qualities="[^"]*resilient/);
  assert.match(html, /data-name="reckless wanderer" data-qualities="[^"]*adventurer/);
});
