const fs = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..");
const siteOutput = path.join(repositoryRoot, "docs");

function assertSafeOutputDirectory(target) {
  const resolvedTarget = path.resolve(target);
  const root = path.parse(resolvedTarget).root;
  const hasExpectedParent = path.dirname(resolvedTarget) === repositoryRoot;
  const hasExpectedName = path.basename(resolvedTarget) === "docs";
  const isExactOutput = resolvedTarget === siteOutput;
  const repositoryIsNotRoot = repositoryRoot !== root;

  if (!hasExpectedParent || !hasExpectedName || !isExactOutput || !repositoryIsNotRoot) {
    throw new Error(`Refusing to clean unexpected site output: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

function cleanSiteOutput() {
  const output = assertSafeOutputDirectory(siteOutput);
  fs.rmSync(output, { recursive: true, force: true });
}

if (require.main === module) {
  cleanSiteOutput();
}

module.exports = { assertSafeOutputDirectory, cleanSiteOutput };
