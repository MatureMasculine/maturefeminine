const fs = require("node:fs");
const path = require("node:path");
const MarkdownIt = require("markdown-it");

const markdown = new MarkdownIt({ html: false, linkify: true });

function entryUrl(entry) {
  if (entry.kind === "archetype") {
    return `/${entry.lifecycle}/${entry.slug}/`;
  }
  return `/${entry.lifecycle}/${entry.parent}/shadows/${entry.slug}/`;
}

function standaloneAnchorTarget(target) {
  return target.replace(
    /^(\/[a-z-]+\/[a-z-]+\/)#shadow-([a-z-]+)$/,
    "$1shadows/$2/",
  );
}

function renderSections(sections) {
  return (sections || []).map((section) => {
    const subsections = (section.subsections || []).map((subsection) => `
<section class="entry-subsection">
  <h3 class="h5">${markdown.utils.escapeHtml(subsection.heading)}</h3>
  ${markdown.render(subsection.content || "")}
</section>`).join("");

    return `<section class="mf-box entry-section mb-3">
  <h2 class="h4">${markdown.utils.escapeHtml(section.heading)}</h2>
  ${markdown.render(section.content || "")}${subsections}
</section>`;
  }).join("\n");
}

function loadSiteData() {
  const file = path.join(__dirname, "src", "_data", "archetypes.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const groupBySlug = new Map(data.groups.map((group) => [group.slug, group]));
  const baseEntries = data.entries.map((entry) => ({
    ...entry,
    url: entryUrl(entry),
    lifecycleName: groupBySlug.get(entry.lifecycle)?.name || entry.lifecycle,
  }));
  const entryByUrl = new Map(baseEntries.map((entry) => [entry.url, entry]));

  const entries = baseEntries.map((entry) => {
    if (entry.kind === "archetype") {
      const shadows = baseEntries.filter(
        (candidate) => candidate.kind === "shadow"
          && candidate.lifecycle === entry.lifecycle
          && candidate.parent === entry.slug,
      );
      return {
        ...entry,
        shadows,
        activeShadow: shadows.find((shadow) => shadow.type === "active"),
        passiveShadow: shadows.find((shadow) => shadow.type === "passive"),
      };
    }

    const parentUrl = `/${entry.lifecycle}/${entry.parent}/`;
    const oppositeUrl = `/${entry.lifecycle}/${entry.parent}/shadows/${entry.oppositeShadowSlug}/`;
    return {
      ...entry,
      parentUrl,
      parentName: entryByUrl.get(parentUrl)?.name || entry.parent,
      oppositeUrl,
      oppositeName: entryByUrl.get(oppositeUrl)?.name || entry.oppositeShadowSlug,
    };
  });
  const groups = data.groups.map((group) => ({
    ...group,
    url: `/${group.slug}/`,
    archetypes: entries.filter(
      (entry) => entry.kind === "archetype" && entry.lifecycle === group.slug,
    ),
  }));
  const anchors = Object.fromEntries(
    data.redirects
      .filter((redirect) => redirect.type === "anchor")
      .map((redirect) => [redirect.from, standaloneAnchorTarget(redirect.to)]),
  );
  const canonicalNameByUrl = new Map([
    ...groups.map((group) => [group.url, group.name]),
    ...entries.map((entry) => [entry.url, entry.name]),
  ]);
  const redirects = [
    ...data.redirects.filter((redirect) => redirect.type === "route"),
    { from: "/lover-creatrix/", to: "/lover/", type: "route" },
  ]
    .map((redirect) => ({
      ...redirect,
      url: redirect.from,
      canonicalUrl: redirect.to,
      canonicalName: canonicalNameByUrl.get(redirect.to) || "Mature Feminine field guide entry",
      anchors,
    }));

  return { groups, entries, redirects, anchors };
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    "src/assets": "assets"
  });
  eleventyConfig.addPassthroughCopy({
    "src/.nojekyll": ".nojekyll"
  });

  eleventyConfig.addFilter("slug", function(str) {
    return (str || "")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9\s/()-]+/g, "")
      .replace(/[\s/]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  });

  // All site collections share the normalized aggregate generated from Markdown.
  eleventyConfig.addCollection("groups", () => {
    return loadSiteData().groups;
  });

  eleventyConfig.addCollection("indexes", () => {
    return [
      { kind: "home", name: "The Mature Feminine", url: "/" },
      ...loadSiteData().groups.map((group) => ({ ...group, kind: "lifecycle" })),
    ];
  });

  eleventyConfig.addCollection("entries", () => {
    return loadSiteData().entries;
  });

  eleventyConfig.addCollection("archetypes", () => {
    return loadSiteData().entries.filter((entry) => entry.kind === "archetype");
  });

  eleventyConfig.addCollection("shadows", () => {
    return loadSiteData().entries.filter((entry) => entry.kind === "shadow");
  });

  eleventyConfig.addCollection("redirects", () => {
    return loadSiteData().redirects;
  });

  eleventyConfig.addGlobalData("shadowAnchorRedirects", () => {
    return loadSiteData().anchors;
  });

  // Fix common UTF-8/Latin-1 mojibake artifacts at render time
  eleventyConfig.addFilter("fixEncoding", (value) => {
    if (value === undefined || value === null) return value;
    let str = String(value);
    // Attempt to decode strings that were UTF-8 but read as Latin-1
    try {
      const decoded = decodeURIComponent(escape(str));
      if (decoded) str = decoded;
    } catch (e) {
      // no-op, fall back to manual replacements
    }
    const replacements = {
      'â€“': '–', // en dash
      'â€”': '—', // em dash
      'â€˜': '‘', // left single quote
      'â€™': '’', // right single quote
      'â€œ': '“', // left double quote
      'â€\u009d': '”', // right double quote (mojibake variant)
      'â€¢': '•', // bullet
      'â€¦': '…', // ellipsis
      'Â\u00a0': ' ', // non-breaking space variant
      'Â\u00a0 ': ' ',
      'Â ': ' ',
    };
    for (const [bad, good] of Object.entries(replacements)) {
      str = str.split(bad).join(good);
    }
    return str;
  });

  // Strip outermost wrapping quotes (smart/straight, single/double)
  eleventyConfig.addFilter("stripOuterQuotes", (value) => {
    if (value === undefined || value === null) return value;
    let str = String(value).trim();
    const opens = ['"', '“', '„', '«', '‹', '‘', "'"];
    const closes = ['"', '”', '‟', '»', '›', '’', "'"];
    // Remove matching outer quote pairs iteratively to handle multiple layers
    while (str.length >= 2 && opens.includes(str[0]) && closes.includes(str[str.length - 1])) {
      str = str.slice(1, -1).trim();
    }
    return str;
  });

  eleventyConfig.addFilter("renderSections", renderSections);

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "docs"
    },
    pathPrefix: "/",
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"]
  };
};
