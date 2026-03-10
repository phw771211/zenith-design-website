/**
 * fetch-figma-references.js
 *
 * Downloads the full Figma page as a single image, then crops each section
 * to the exact pixel height that the browser renders it. This produces
 * Figma references that have the same dimensions as BackstopJS test screenshots,
 * enabling meaningful pixel comparison.
 *
 * Setup:
 *   1. Go to figma.com → Settings → Security → Personal access tokens
 *   2. Add to .env:  FIGMA_TOKEN=your_token_here
 *   3. Run:  npm run qa:update-refs
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { PNG } = require('pngjs');

// Load .env if present
try {
  const env = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
  env.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  });
} catch (_) { /* .env optional */ }

const TOKEN    = process.env.FIGMA_TOKEN;
const FILE_KEY = 'QTyUfUwoqT0MFxPE1xIawe';
const PAGE_NODE = '30:4';  // The full-page frame ("Big In Japan")
const OUT_DIR  = path.join(__dirname, '../backstop_data/bitmaps_reference');

// Each section's starting Y position within the Figma full-page frame.
// Determined from Figma node metadata (section frame positions inside 30:4).
// The crop height is read from the latest BackstopJS test screenshots so that
// reference dimensions always match test dimensions exactly.
const SECTIONS = [
  { label: '01_hero',     selector: 'hero',             figmaY: 0    },
  { label: '02_approach', selector: 'section-approach', figmaY: 980  },
  { label: '03_services', selector: 'section-services', figmaY: 2081 },
  { label: '04_works',    selector: 'section-works',    figmaY: 2816 },
  { label: '05_impact',   selector: 'section-impact',   figmaY: 4013 },
  { label: '06_contact',  selector: 'section-contact',  figmaY: 5003 },
];

// BackstopJS reference filename format
function refFilename(label, selector) {
  return `zenith-design_${label}_0_${selector}_0_desktop.png`;
}

// Read PNG width/height from the IHDR chunk (bytes 16-23) — no library needed
function readPngDims(filepath) {
  const buf = Buffer.alloc(24);
  const fd  = fs.openSync(filepath, 'r');
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// Find browser section heights from the most recent BackstopJS test run
function loadBrowserHeights() {
  const testRoot = path.join(__dirname, '../backstop_data/bitmaps_test');
  if (!fs.existsSync(testRoot)) return null;
  const runs = fs.readdirSync(testRoot).filter(d =>
    fs.statSync(path.join(testRoot, d)).isDirectory()
  ).sort();
  if (!runs.length) return null;

  const latest  = runs[runs.length - 1];
  const heights = {};
  for (const section of SECTIONS) {
    const filename = refFilename(section.label, section.selector);
    // test screenshots use same naming but live in the test dir
    const testFile = path.join(testRoot, latest, filename);
    if (fs.existsSync(testFile)) {
      heights[section.label] = readPngDims(testFile).height;
    }
  }
  return heights;
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const opts = { headers: token ? { 'X-Figma-Token': token } : {} };
    https.get(url, opts, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return get(res.headers.location, null).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

async function fetchImageUrl(nodeId) {
  const id  = nodeId.replace(':', '%3A');
  const url = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${id}&format=png&scale=1`;
  const { status, body } = await get(url, TOKEN);
  if (status !== 200) throw new Error(`Figma API error ${status}: ${body.toString()}`);
  const images = JSON.parse(body.toString()).images;
  return images[nodeId];
}

async function downloadBuffer(url) {
  const { body } = await get(url, null);
  return body;
}

// Crop a PNG buffer: extract rows [y .. y+height) at full width
function cropPng(srcBuf, cropY, cropHeight) {
  return new Promise((resolve, reject) => {
    const src = new PNG();
    src.parse(srcBuf, (err, img) => {
      if (err) return reject(err);

      const actualHeight = Math.min(cropHeight, img.height - cropY);
      const dst = new PNG({ width: img.width, height: actualHeight });

      for (let row = 0; row < actualHeight; row++) {
        const srcOff = ((cropY + row) * img.width) * 4;
        const dstOff = (row * img.width) * 4;
        img.data.copy(dst.data, dstOff, srcOff, srcOff + img.width * 4);
      }

      resolve(PNG.sync.write(dst));
    });
  });
}

async function main() {
  if (!TOKEN) {
    console.error(`
ERROR: FIGMA_TOKEN is not set.

Steps to fix:
  1. Go to figma.com → Settings → Security → Personal access tokens
  2. Click "Generate new token", give it a name, copy it
  3. Create a file called .env in this project folder with:
       FIGMA_TOKEN=paste_your_token_here
  4. Run again: npm run qa:update-refs
`);
    process.exit(1);
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Load browser heights from the latest BackstopJS test run
  const browserHeights = loadBrowserHeights();
  if (!browserHeights || !Object.keys(browserHeights).length) {
    console.error(`
ERROR: No BackstopJS test screenshots found.

Run  npm run qa  first (with the server running) so that BackstopJS captures
test screenshots. Then run  npm run qa:update-refs  to build Figma references
that match those exact dimensions.
`);
    process.exit(1);
  }

  console.log('Browser section heights detected:');
  for (const s of SECTIONS) {
    const h = browserHeights[s.label];
    console.log(`  ${s.label}: ${h ? h + 'px' : '(not found – will use Figma height)'}`);
  }

  // Download the full Figma page once
  console.log(`\nDownloading full Figma page (${PAGE_NODE})...`);
  const pageUrl = await fetchImageUrl(PAGE_NODE);
  if (!pageUrl) throw new Error(`Figma returned no URL for page node ${PAGE_NODE}`);
  const pageBuffer = await downloadBuffer(pageUrl);
  const pageDims = await new Promise((res, rej) => {
    const p = new PNG();
    p.parse(pageBuffer, (err, img) => err ? rej(err) : res({ width: img.width, height: img.height }));
  });
  console.log(`Full page downloaded: ${pageDims.width}x${pageDims.height}px`);

  // Crop each section from the full-page image
  for (const section of SECTIONS) {
    const cropHeight = browserHeights[section.label] || 900;
    const cropY      = section.figmaY;

    if (cropY >= pageDims.height) {
      console.warn(`  ⚠ ${section.label}: figmaY=${cropY} exceeds page height ${pageDims.height}, skipping`);
      continue;
    }

    process.stdout.write(`  Cropping ${section.label} (y=${cropY}, h=${cropHeight}px)... `);
    const cropped  = await cropPng(pageBuffer, cropY, cropHeight);
    const filename = refFilename(section.label, section.selector);
    fs.writeFileSync(path.join(OUT_DIR, filename), cropped);
    console.log(`saved → ${filename}`);
  }

  console.log(`\n✅ All Figma references saved to backstop_data/bitmaps_reference/`);
  console.log(`   Run  npm run qa  to compare your website against them.\n`);
}

main().catch(err => { console.error('Failed:', err.message); process.exit(1); });
