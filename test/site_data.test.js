const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const nunjucks = require("nunjucks");
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

function outputTextForUrl(url) {
  return outputText(path.join(url.slice(1), "index.html"));
}

function filesUnder(directory, predicate = () => true) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(file, predicate) : predicate(file) ? [file] : [];
  });
}

function mainContent(html) {
  const match = html.match(/<main[\s\S]*?<\/main>/);
  assert.ok(match, "page must contain main content");
  return match[0];
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
      anchors: {},
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

test("pending archetype pages render the six populated profile fields and both shadows", () => {
  assert.ifError(buildError);
  const html = outputText("maiden/adventurer/index.html");
  const approvedFields = [
    "lifecycleStage",
    "coreFunction",
    "balancedQualities",
    "activeShadow",
    "passiveShadow",
    "keyQualities",
  ];

  assert.equal((html.match(/data-profile-field=/g) || []).length, approvedFields.length);
  for (const field of approvedFields) {
    assert.match(html, new RegExp(`data-profile-field="${field}"`));
  }
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
  assert.doesNotMatch(html, /#shadow-fragile-maiden/);
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

test("renderQuote preserves poem lineation and renders a separate semantic citation", () => {
  const { renderQuote } = loadConfiguration().filters;
  assert.equal(typeof renderQuote, "function", "renderQuote filter must be registered");

  const html = renderQuote("“Line one\nLine two.”\n\n—Poet, *Book*, lines 1–2");

  assert.match(html, /<span class="entry-quote-text">“Line one<br>\nLine two\.”<\/span>/);
  assert.match(html, /<cite class="entry-quote-attribution">—Poet, <em>Book<\/em>, lines 1–2<\/cite>/);
  assert.ok(html.indexOf("entry-quote-attribution") > html.indexOf("entry-quote-text"));
});

test("renderQuote separates prose attribution only after a blank line", () => {
  const { renderQuote } = loadConfiguration().filters;

  const html = renderQuote("“Wholehearted prose remains one line.”\n\n—Writer, *Title*");

  assert.match(html, /<span class="entry-quote-text">“Wholehearted prose remains one line\.”<\/span>/);
  assert.match(html, /<cite class="entry-quote-attribution">—Writer, <em>Title<\/em><\/cite>/);
});

test("renderQuote escapes raw HTML while retaining safe Markdown title emphasis", () => {
  const { renderQuote } = loadConfiguration().filters;

  const html = renderQuote("<img src=x onerror=alert(1)>\n\n—Writer, *<script>alert(2)</script>*");

  assert.doesNotMatch(html, /<(?:img|script)\b/i);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /<em>&lt;script&gt;alert\(2\)&lt;\/script&gt;<\/em>/);
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

test("the site does not consume legacy siteContent data or render its obsolete prose", () => {
  assert.ifError(buildError);
  const siteSources = [
    path.resolve(".eleventy.js"),
    ...filesUnder(path.resolve("src"), (file) => /\.(?:njk|js)$/.test(file)),
  ];
  for (const file of siteSources) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), /siteContent/, `${file} must not reference siteContent`);
  }

  const legacy = require("../src/_data/siteContent.json");
  const forbidden = [
    legacy.quote.text,
    legacy.quote.author,
    ...legacy.howToUse.map((item) => item.text),
    ...legacy.poles.flatMap((pole) => [pole.name, pole.description]),
  ];
  const renderedHtml = filesUnder(outputDirectory, (file) => file.endsWith(".html"))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  for (const prose of forbidden) {
    assert.ok(!renderedHtml.includes(prose), `legacy prose must not render: ${prose}`);
  }

  const home = outputText("index.html");
  for (const group of archetypeData.groups) {
    assert.match(home, new RegExp(`href="/${group.slug}/"`));
  }
});

test("search input is labelled and accordion buttons own aria-expanded state", () => {
  assert.ifError(buildError);
  const html = outputText("index.html");
  const script = fs.readFileSync("src/assets/main.js", "utf8");

  assert.match(html, /<label[^>]*for="searchInput"[^>]*>[^<]+<\/label>/);
  assert.match(script, /btn\.setAttribute\(['"]aria-expanded['"]/);
  assert.doesNotMatch(script, /collapse\.setAttribute\(['"]aria-expanded['"]/);
});

test("pending profiles render six populated fields in canonical relative order", () => {
  assert.ifError(buildError);
  const approvedFields = [
    "lifecycleStage",
    "coreFunction",
    "balancedQualities",
    "activeShadow",
    "passiveShadow",
    "keyQualities",
  ];
  const approvedLabels = [
    "Lifecycle stage",
    "Core function",
    "Balanced qualities",
    "Active shadow",
    "Passive shadow",
    "Key qualities",
  ];

  for (const entry of archetypeData.entries.filter((candidate) => !candidate.profile.mythicResonances)) {
    const html = outputTextForUrl(expectedEntryUrl(entry));
    const fields = [...html.matchAll(/data-profile-field="([^"]+)"/g)]
      .map((match) => match[1]);
    const labels = [...html.matchAll(/<dt>([^<]+)<\/dt>/g)]
      .map((match) => match[1]);
    assert.deepEqual(fields, approvedFields, `${entry.slug} profile fields`);
    assert.deepEqual(labels, approvedLabels, `${entry.slug} profile labels`);
  }
});

test("a verified nonblank profile renders all seven fields in canonical order", () => {
  const source = fs.readFileSync("src/archetype.njk", "utf8");
  const profileTemplate = source.match(/<dl class="profile-grid mb-0">[\s\S]*?<\/dl>/)?.[0];
  assert.ok(profileTemplate, "archetype profile template must be present");

  const entry = loadCollections().archetypes[0];
  const environment = new nunjucks.Environment(null, { autoescape: false });
  environment.addFilter("url", (value) => value);
  const html = environment.renderString(profileTemplate, {
    entry: {
      ...entry,
      profile: { ...entry.profile, mythicResonances: "Artemis (Greek)" },
    },
  });
  const fields = [...html.matchAll(/data-profile-field="([^"]+)"/g)].map((match) => match[1]);
  const labels = [...html.matchAll(/<dt>([^<]+)<\/dt>/g)].map((match) => match[1]);

  assert.deepEqual(fields, [
    "lifecycleStage",
    "coreFunction",
    "balancedQualities",
    "activeShadow",
    "passiveShadow",
    "mythicResonances",
    "keyQualities",
  ]);
  assert.deepEqual(labels, [
    "Lifecycle stage",
    "Core function",
    "Balanced qualities",
    "Active shadow",
    "Passive shadow",
    "Mythic resonances",
    "Key qualities",
  ]);
});

test("legacy anchor maps are scoped to their canonical parent route", () => {
  const collections = loadCollections();
  const expectedByPath = {};
  for (const redirect of archetypeData.redirects.filter((candidate) => candidate.type === "anchor")) {
    const target = redirect.to.replace(
      /^(\/[a-z-]+\/[a-z-]+\/)#shadow-([a-z-]+)$/,
      "$1shadows/$2/",
    );
    const parentUrl = target.match(/^(\/[a-z-]+\/[a-z-]+\/)shadows\//)?.[1];
    assert.ok(parentUrl, `${redirect.from} must resolve to a standalone shadow`);
    expectedByPath[parentUrl] ||= {};
    expectedByPath[parentUrl][redirect.from] = target;
  }
  const adventurerRedirect = collections.redirects.find(
    (redirect) => redirect.url === "/maiden/adventurer-storm-tempest/",
  );
  const maidenRedirect = collections.redirects.find(
    (redirect) => redirect.url === "/maiden/maiden/shadows/manipulative-maiden/",
  );

  assert.deepEqual(Object.keys(adventurerRedirect.anchors).sort(), [
    "#shadow-paralyzed-dreamer",
    "#shadow-reckless-storm",
  ]);
  assert.deepEqual(maidenRedirect.anchors, {});
  assert.equal(Object.keys(expectedByPath).length, 22);
  assert.equal(Object.values(expectedByPath).flatMap(Object.keys).length, 48);

  for (const redirect of collections.redirects) {
    assert.deepEqual(
      redirect.anchors,
      expectedByPath[redirect.canonicalUrl] || {},
      `${redirect.url} scoped anchors`,
    );
    const html = outputTextForUrl(redirect.url);
    const renderedAnchors = JSON.parse(
      html.match(/const shadowRedirects = (\{[^;]*\});/)?.[1] || "null",
    );
    assert.deepEqual(renderedAnchors, redirect.anchors, `${redirect.url} rendered anchors`);
  }
});

test("canonical legacy hashes are selected by the current pathname", () => {
  const html = outputText("maiden/adventurer/index.html");
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((source) => source.includes("shadowRedirectsByPath"));

  assert.ok(script, "canonical legacy-hash script must render");
  assert.match(html, /shadowRedirectsByPath\[window\.location\.pathname\]/);
  const renderedByPath = JSON.parse(
    script.match(/const shadowRedirectsByPath = (\{[^;]*\});/)?.[1] || "null",
  );
  assert.equal(Object.keys(renderedByPath).length, 22);
  assert.equal(Object.values(renderedByPath).flatMap(Object.keys).length, 48);

  function replacementsFor(pathname, hash) {
    const replacements = [];
    vm.runInNewContext(script, {
      window: {
        location: {
          pathname,
          hash,
          replace(target) {
            replacements.push(target);
          },
        },
      },
    });
    return replacements;
  }

  assert.deepEqual(
    replacementsFor("/maiden/adventurer/", "#shadow-reckless-storm"),
    ["/maiden/adventurer/shadows/reckless-wanderer/"],
  );
  assert.deepEqual(
    replacementsFor("/maiden/adventurer/", "#shadow-fragile-maiden"),
    [],
  );
});

test("internal documentation and CNAME have source-owned locations", () => {
  const plan = "project-docs/superpowers/plans/2026-07-31-mature-feminine-field-guide-implementation.md";
  const design = "project-docs/superpowers/specs/2026-07-31-mature-feminine-field-guide-design.md";

  assert.ok(fs.existsSync(plan));
  assert.ok(fs.existsSync(design));
  assert.ok(!fs.existsSync("docs/superpowers"));
  assert.equal(fs.readFileSync("src/CNAME", "utf8"), "maturefeminine.org");
  assert.equal(outputText("CNAME"), "maturefeminine.org");
  assert.ok(!fs.existsSync(path.join(outputDirectory, "superpowers")));
  assert.ok(!fs.existsSync(path.join(outputDirectory, "assets/images/shadow/conrolling--networker.png")));
  assert.doesNotMatch(fs.readFileSync(".gitignore", "utf8"), /conrolling--networker/);
});

test("site output cleaner accepts only the repository docs directory", () => {
  const packageJson = require("../package.json");
  const cleanerPath = path.resolve("scripts/clean_site_output.js");
  assert.ok(fs.existsSync(cleanerPath), "safe site output cleaner must exist");
  const cleaner = require(cleanerPath);
  const repository = path.resolve(".");
  const expectedOutput = path.join(repository, "docs");

  assert.equal(cleaner.assertSafeOutputDirectory(expectedOutput), expectedOutput);
  for (const unsafe of [repository, path.parse(repository).root, path.join(repository, "project-docs")]) {
    assert.throws(() => cleaner.assertSafeOutputDirectory(unsafe), /Refusing to clean/);
  }
  assert.equal(
    packageJson.scripts.build,
    "npm run content:check && node scripts/clean_site_output.js && eleventy",
  );
});

test("legacy anchor normalization accepts numeric slugs and rejects invalid targets", () => {
  const redirectsPath = path.resolve("scripts/site_redirects.js");
  assert.ok(fs.existsSync(redirectsPath), "site redirect helper must exist");
  const { buildAnchorRedirectsByPath } = require(redirectsPath);

  assert.deepEqual(
    buildAnchorRedirectsByPath([
      {
        type: "anchor",
        from: "#shadow-seer-2",
        to: "/phase-2/guide-3/#shadow-seer-2",
      },
    ]),
    {
      "/phase-2/guide-3/": {
        "#shadow-seer-2": "/phase-2/guide-3/shadows/seer-2/",
      },
    },
  );
  assert.throws(
    () => buildAnchorRedirectsByPath([
      { type: "anchor", from: "#shadow-bad", to: "/not-a-canonical-anchor" },
    ]),
    /Invalid legacy anchor target/,
  );
});

test("every archetype page links both canonical shadows in its main content", () => {
  assert.ifError(buildError);
  for (const entry of archetypeData.entries.filter((candidate) => candidate.kind === "archetype")) {
    const html = mainContent(outputTextForUrl(expectedEntryUrl(entry)));
    assert.equal(entry.shadows.length, 2, `${entry.slug} normalized shadows`);
    for (const shadow of entry.shadows) {
      assert.match(
        html,
        new RegExp(`class="shadow-link-card" href="/${entry.lifecycle}/${entry.slug}/shadows/${shadow.slug}/"`),
      );
    }
  }
});

test("every shadow page links its canonical parent and opposite in main content", () => {
  assert.ifError(buildError);
  for (const entry of archetypeData.entries.filter((candidate) => candidate.kind === "shadow")) {
    const html = mainContent(outputTextForUrl(expectedEntryUrl(entry)));
    assert.match(html, new RegExp(`href="/${entry.lifecycle}/${entry.parent}/"`));
    assert.match(
      html,
      new RegExp(`href="/${entry.lifecycle}/${entry.parent}/shadows/${entry.oppositeShadowSlug}/"`),
    );
  }
});

test("redirect graph has unique noncanonical sources, canonical targets, and no cycles", () => {
  const collections = loadCollections();
  const redirects = requireCollection(collections, "redirects");
  const canonicalUrls = new Set([
    ...collections.groups.map((group) => group.url),
    ...collections.entries.map((entry) => entry.url),
  ]);
  const sourceUrls = redirects.map((redirect) => redirect.url);
  const graph = new Map(redirects.map((redirect) => [redirect.url, redirect.canonicalUrl]));

  assert.equal(new Set(sourceUrls).size, sourceUrls.length);
  for (const redirect of redirects) {
    assert.ok(!canonicalUrls.has(redirect.url), `${redirect.url} must not shadow a canonical route`);
    assert.ok(canonicalUrls.has(redirect.canonicalUrl), `${redirect.url} target must be canonical`);

    const seen = new Set();
    let cursor = redirect.url;
    while (graph.has(cursor)) {
      assert.ok(!seen.has(cursor), `redirect cycle at ${cursor}`);
      seen.add(cursor);
      cursor = graph.get(cursor);
    }
  }
});

test("raw Eleventy text output has no trailing horizontal whitespace", () => {
  assert.ifError(buildError);
  const textFiles = filesUnder(outputDirectory, (file) => /\.(?:html|json|js|css)$/.test(file));
  const violations = textFiles.filter((file) => /[ \t]+$/m.test(fs.readFileSync(file, "utf8")));

  assert.deepEqual(violations.map((file) => path.relative(outputDirectory, file)), []);
});
