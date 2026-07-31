const slugPattern = "[a-z0-9]+(?:-[a-z0-9]+)*";
const legacyAnchorTargetPattern = new RegExp(
  `^(/${slugPattern}/${slugPattern}/)#shadow-(${slugPattern})$`,
);
const standaloneShadowPattern = new RegExp(
  `^(/${slugPattern}/${slugPattern}/)shadows/${slugPattern}/$`,
);

function standaloneAnchorTarget(target) {
  const match = target.match(legacyAnchorTargetPattern);
  if (!match) {
    throw new Error(`Invalid legacy anchor target: ${target}`);
  }
  return `${match[1]}shadows/${match[2]}/`;
}

function buildAnchorRedirectsByPath(redirects) {
  const anchorsByPath = {};
  for (const redirect of redirects.filter((candidate) => candidate.type === "anchor")) {
    const target = standaloneAnchorTarget(redirect.to);
    const parentUrl = target.match(standaloneShadowPattern)?.[1];
    if (!parentUrl) {
      throw new Error(`Invalid standalone shadow target: ${target}`);
    }
    anchorsByPath[parentUrl] ||= {};
    anchorsByPath[parentUrl][redirect.from] = target;
  }
  return anchorsByPath;
}

module.exports = { buildAnchorRedirectsByPath };
