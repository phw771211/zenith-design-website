/**
 * fetch-figma-references.js
 *
 * Downloads section screenshots directly from the Figma API and saves them
 * as BackstopJS reference images. Run this whenever the Figma design changes
 * so the QA baseline always reflects the latest approved design.
 *
 * Setup:
 *   1. Go to figma.com → Settings → Personal access tokens → Generate new token
 *   2. Add to .env:  FIGMA_TOKEN=your_token_here
 *   3. Run:  npm run qa:update-refs
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

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
const OUT_DIR  = path.join(__dirname, '../backstop_data/bitmaps_reference');

// Section node IDs → BackstopJS label (must match backstop.json scenario labels)
const SECTIONS = [
  { nodeId: '30:14',  label: '01_hero',     selector: '.hero'            },
  { nodeId: '30:17',  label: '02_approach', selector: '.section-approach'},
  { nodeId: '30:81',  label: '03_services', selector: '.section-services'},
  { nodeId: '30:42',  label: '04_works',    selector: '.section-works'   },
  { nodeId: '30:110', label: '05_impact',   selector: '.section-impact'  },
  { nodeId: '30:65',  label: '06_contact',  selector: '.section-contact' },
];

// BackstopJS reference filename format (verified from actual output):
// {id}_{label}_0_{selector-without-leading-dot}_0_{viewport}.png
function refFilename(label, selector) {
  const safeSelector = selector.replace(/^\./, ''); // remove leading dot
  return `zenith-design_${label}_0_${safeSelector}_0_desktop.png`;
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

async function fetchImageUrls(nodeIds) {
  const ids = nodeIds.map(id => id.replace(':', '%3A')).join(',');
  const url = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${ids}&format=png&scale=2`;
  const { status, body } = await get(url, TOKEN);
  if (status !== 200) throw new Error(`Figma API error ${status}: ${body.toString()}`);
  return JSON.parse(body.toString()).images; // { "nodeId": "https://..." }
}

async function downloadImage(url, dest) {
  const { body } = await get(url, null);
  fs.writeFileSync(dest, body);
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

  console.log(`Fetching ${SECTIONS.length} section screenshots from Figma...`);
  const nodeIds = SECTIONS.map(s => s.nodeId);
  const imageUrls = await fetchImageUrls(nodeIds);

  for (const section of SECTIONS) {
    const url = imageUrls[section.nodeId];
    if (!url) { console.warn(`  ⚠ No URL for ${section.label}`); continue; }
    const filename = refFilename(section.label, section.selector);
    const dest = path.join(OUT_DIR, filename);
    process.stdout.write(`  Downloading ${section.label}... `);
    await downloadImage(url, dest);
    console.log(`saved → ${filename}`);
  }

  console.log(`\n✅ All references saved to backstop_data/bitmaps_reference/`);
  console.log(`   Run  npm run qa  to compare your website against them.\n`);
}

main().catch(err => { console.error('Failed:', err.message); process.exit(1); });
