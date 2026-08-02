const path = require("node:path");
const { syncRepositoryBibliography } = require("./bibliography_sources");
const { loadBook, writeGeneratedData } = require("./content_markdown");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "src", "_data");
const book = loadBook();

writeGeneratedData(book, dataDir);
syncRepositoryBibliography({ book });

const archetypeCount = book.entries.filter((entry) => entry.kind === "archetype").length;
const shadowCount = book.entries.filter((entry) => entry.kind === "shadow").length;
console.log(`Synchronized ${book.groups.length} lifecycle groups, ${archetypeCount} archetypes, and ${shadowCount} shadows.`);
