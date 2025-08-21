#!/usr/bin/env node
/**
 * Download all shadow images referenced in images.txt into src/assets/images/shadow/
 * and update src/_data/images.json with mappings so templates can render them.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const IMAGES_TXT = path.join(ROOT, 'images.txt');
const DEST_DIR = path.join(ROOT, 'src', 'assets', 'images', 'shadow');
const ARCHETYPES_JSON = path.join(ROOT, 'src', '_data', 'archetypes.json');
const IMAGES_JSON = path.join(ROOT, 'src', '_data', 'images.json');

function slug(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s/()-]+/g, '')
    .replace(/[\s/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    function get(urlToGet, redirectsLeft = 5) {
      https
        .get(urlToGet, res => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
            const next = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, urlToGet).toString();
            res.resume();
            return get(next, redirectsLeft - 1);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode} for ${urlToGet}`));
          }
          const file = fs.createWriteStream(dest);
          res.pipe(file);
          file.on('finish', () => file.close(() => resolve()));
          file.on('error', reject);
        })
        .on('error', reject);
    }
    get(url);
  });
}

function extractShadowNameFromFilename(filename) {
  // Examples:
  // 01_Manipulative_Maiden_Shadow.jpg -> Manipulative Maiden
  // 27_Tyrannical_Queen_Shadow.jpg -> Tyrannical Queen
  // Additional_Possessive_Shadow.jpg -> Additional Possessive (no match in data)
  let base = filename.replace(/\.jpg$/i, '').replace(/\.jpeg$/i, '');
  // Remove leading numbering like "01_", "01.", or "01- "
  base = base.replace(/^\d+[._-]?\s*/, '');
  base = base.replace(/_Shadow$/i, '');
  // Turn underscores into spaces and collapse multiple spaces
  base = base.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return base;
}

async function main() {
  console.log('Reading archetypes to map shadows → items...');
  const arch = readJson(ARCHETYPES_JSON);
  const nameToItemSlug = new Map();
  for (const group of arch.groups || []) {
    for (const item of group.items || []) {
      const itemSlug = item.slug;
      const shadows = (((item || {}).extended || {}).shadows) || [];
      for (const sh of shadows) {
        if (sh && sh.name) {
          nameToItemSlug.set(String(sh.name).toLowerCase(), itemSlug);
        }
      }
    }
  }

  console.log('Loading images.json...');
  const imagesJson = readJson(IMAGES_JSON);
  if (!imagesJson.shadow) imagesJson.shadow = {};

  console.log('Parsing images.txt...');
  const lines = fs.readFileSync(IMAGES_TXT, 'utf8').split(/\r?\n/);
  let currentFilename = null;
  let processed = 0;
  let skipped = 0;
  ensureDir(DEST_DIR);

  function isCdnUrl(line) {
    return /^https:\/\/cdn1\.genspark\.ai\/user-upload-image\/22_generated\//.test(line) && !/[\[\]]/.test(line);
  }

  for (let i = 0; i < lines.length; i++) {
    // Remove any leading "+" markers (e.g., from diff/paste), then trim
    const line = lines[i].replace(/^\s*\+\s*/, '').trim();

    // Capture filename lines that look like image file names
    if (/\.(jpg|jpeg)$/i.test(line)) {
      currentFilename = line;
      continue;
    }

    if (currentFilename && isCdnUrl(line)) {
      const url = line;
      const displayName = extractShadowNameFromFilename(path.basename(currentFilename));
      const key = displayName.toLowerCase();
      const itemSlug = nameToItemSlug.get(key);
      const shadowSlug = slug(displayName);
      const fileBase = itemSlug ? `${itemSlug}--${shadowSlug}.jpg` : `unmatched--${shadowSlug}.jpg`;
      const destPath = path.join(DEST_DIR, fileBase);

      try {
        if (fs.existsSync(destPath)) {
          console.log(`SKIP (exists): ${fileBase}`);
        } else {
          console.log(`Downloading: ${displayName} -> ${fileBase}`);
          await download(url, destPath);
        }

        // Update images.json mapping if item is known
        if (itemSlug) {
          if (!imagesJson.shadow[itemSlug]) imagesJson.shadow[itemSlug] = {};
          imagesJson.shadow[itemSlug][shadowSlug] = path.posix.join('shadow', fileBase);
        } else {
          // Track extras separately
          if (!imagesJson.extraShadow) imagesJson.extraShadow = {};
          imagesJson.extraShadow[shadowSlug] = path.posix.join('shadow', fileBase);
        }
        processed++;
      } catch (err) {
        console.warn(`Failed ${displayName}: ${err.message}`);
        skipped++;
      }

      // Reset for next block
      currentFilename = null;
    }
  }

  writeJson(IMAGES_JSON, imagesJson);
  console.log(`Done. Processed=${processed}, Skipped=${skipped}`);
  console.log(`Images saved to: ${path.relative(ROOT, DEST_DIR)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
