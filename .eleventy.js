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

  // Helper: load all group_*.json files from src/_data, sorted by filename
  function loadGroups() {
    const fs = require("fs");
    const path = require("path");
    const dataDir = path.join(__dirname, "src", "_data");
    const files = fs
      .readdirSync(dataDir)
      .filter(f => /^group_.*\.json$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    const groups = [];
    for (const file of files) {
      const raw = fs.readFileSync(path.join(dataDir, file), "utf8");
      const obj = JSON.parse(raw);
      // Map file schema to group schema
      groups.push({
        name: obj.name || obj.group || "",
        slug: obj.slug || "",
        summary: obj.summary || "",
        essence: obj.essence || "",
        items: Array.isArray(obj.items) ? obj.items : []
      });
    }
    return groups;
  }

  // Provide a collection for groups from data
  eleventyConfig.addCollection("groups", () => {
    return loadGroups();
  });

  // Flatten items with group metadata
  eleventyConfig.addCollection("items", () => {
    const groups = loadGroups();
    const items = [];
    for (const g of groups) {
      for (const it of (g.items || [])) {
        items.push({
          ...it,
          groupName: g.name,
          groupSlug: g.slug,
          groupSummary: g.summary,
        });
      }
    }
    return items;
  });

  // Filters for prev/next navigation
  eleventyConfig.addFilter("itemsByGroup", (items, groupSlug) => {
    return (items || []).filter(i => i.groupSlug === groupSlug);
  });
  eleventyConfig.addFilter("findIndexBySlug", (items, slug) => {
    return (items || []).findIndex(i => i.slug === slug);
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
