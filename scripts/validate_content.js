const path = require("node:path");
const {
  checkGeneratedData,
  loadBook,
  validateBook,
  validateCanonicalBook,
} = require("./content_markdown");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "src", "_data");
const publish = process.argv.includes("--publish");

try {
  const book = loadBook();
  validateBook(book, { publish });
  validateCanonicalBook(book);
  checkGeneratedData(book, dataDir);
  const archetypeCount = book.entries.filter((entry) => entry.kind === "archetype").length;
  const shadowCount = book.entries.filter((entry) => entry.kind === "shadow").length;
  console.log(`Validated ${book.groups.length} lifecycle groups, ${archetypeCount} archetypes, and ${shadowCount} shadows${publish ? " for publication" : " structurally"}; generated data is in sync.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
