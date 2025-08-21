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

  // Provide a collection for groups from data
  eleventyConfig.addCollection("groups", () => {
    const data = require("./src/_data/archetypes.json");
    return data.groups || [];
  });

  // Flatten items with group metadata
  eleventyConfig.addCollection("items", () => {
    const data = require("./src/_data/archetypes.json");
    const groups = data.groups || [];
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
