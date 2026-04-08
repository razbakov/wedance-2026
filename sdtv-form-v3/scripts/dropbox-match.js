// @ts-check
/* ========================================
   SDTV Dropbox Auto-Match
   ========================================
   Matches edited video files from a Dropbox folder to Airtable capture
   records by fuzzy-matching dancer names from the filename against
   Partner 1 Name / Partner 2 Name fields.

   Usage:
     node scripts/dropbox-match.js /path/to/videos [options]

   Options:
     --auto           Apply high-confidence matches without prompting
     --dry-run        Show matches without making any changes
     --dropbox-base   Base Dropbox share URL for constructing links
                      e.g. "https://www.dropbox.com/scl/fo/xxx/yyy?dl=0"
     --min-score N    Minimum match score 0-100 (default: 40)
     --verbose        Show detailed matching debug info

   Flow:
     1. Scan folder for .mp4 / .mov files
     2. Fetch captures from Airtable where Preview URL is empty
     3. Fuzzy-match filenames to capture records by dancer names
     4. For each match:
        a. Generate 720p/10s/faststart preview → {folder}_preview/
        b. Construct Dropbox share URL for preview file
        c. Update Airtable Preview URL with preview link
        d. Trigger server cache warm
   ======================================== */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const readline = require('readline');
const { execFile } = require('child_process');

// ffmpeg for local preview generation
let FFMPEG;
try { FFMPEG = require('ffmpeg-static'); } catch {
  FFMPEG = 'ffmpeg'; // fallback to system ffmpeg
}

// ── CONFIG ────────────────────────────────────────────
const AIRTABLE_TOKEN = 'patXSYqX4Fj24rT3f.4bef825436211ed79cdeffeaa4ffc01968192929f29f4599238379fa156482ef';
const AIRTABLE_BASE_ID = 'appsgtrfnVi2IccFb';
const CAPTURES_TABLE = 'tblgiQssV0qnosiUl';
const AIRTABLE_BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;
const PREVIEW_SERVER = 'http://localhost:8001';
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.MP4', '.MOV']);

// Fields we read from Airtable
const READ_FIELDS = [
  'Partner 1 Name', 'Partner 2 Name',
  'Partner 1 IG', 'Partner 2 IG',
  'Dance Style', 'Session', 'Status', 'Preview URL',
];

// ── PARSE ARGS ────────────────────────────────────────
const args = process.argv.slice(2);
const flags = {
  auto: args.includes('--auto'),
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  dropboxBase: '',
  minScore: 40,
  folderPath: '',
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dropbox-base' && args[i + 1]) {
    flags.dropboxBase = args[i + 1];
    i++;
  } else if (args[i] === '--min-score' && args[i + 1]) {
    flags.minScore = parseInt(args[i + 1], 10) || 40;
    i++;
  } else if (!args[i].startsWith('--') && !flags.folderPath) {
    flags.folderPath = args[i];
  }
}

if (!flags.folderPath) {
  console.error('Usage: node scripts/dropbox-match.js /path/to/videos [--auto] [--dry-run] [--dropbox-base URL]');
  process.exit(1);
}

// Resolve to absolute path
const videoFolder = path.resolve(flags.folderPath);
if (!fs.existsSync(videoFolder) || !fs.statSync(videoFolder).isDirectory()) {
  console.error(`ERROR: Not a valid directory: ${videoFolder}`);
  process.exit(1);
}

// ── HTTP HELPERS ──────────────────────────────────────
// Built-in https/http request wrapper (no dependencies)

/**
 * @param {string} url
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {Record<string, string>} [options.headers]
 * @param {string} [options.body]
 * @returns {Promise<{status: number, data: any}>}
 */
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = mod.request(reqOpts, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode || 0, data: body });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });

    if (options.body) req.write(options.body);
    req.end();
  });
}

/**
 * Airtable API request with retry on 429/5xx.
 * @param {string} pathOrUrl
 * @param {object} [opts]
 * @returns {Promise<any>}
 */
async function airtableFetch(pathOrUrl, opts = {}) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${AIRTABLE_BASE_URL}/${pathOrUrl}`;
  const headers = {
    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await httpRequest(url, { ...opts, headers });

    if (result.status === 429 || (result.status >= 500 && attempt < 2)) {
      const wait = Math.pow(2, attempt) * 1000;
      console.log(`  [retry] Airtable ${result.status}, waiting ${wait}ms...`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }

    if (result.status >= 400) {
      throw new Error(`Airtable ${result.status}: ${JSON.stringify(result.data)}`);
    }

    return result.data;
  }
}

// ── NAME PARSING ──────────────────────────────────────

/**
 * Normalize a name string for comparison.
 * Strips accents, lowercases, removes non-alphanumeric.
 * @param {string} name
 * @returns {string}
 */
function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')    // remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract dancer names from a video filename.
 * Handles patterns like:
 *   "Rocio Calidonio & Ricky - Salsa Friday.mp4"
 *   "Jonathan-Lillu-bachata.mp4"
 *   "Anna_Marco_Kizomba_Night2.mp4"
 *
 * Strategy: split on common separators (&, -, _, and, y, x),
 * then identify name-like segments vs style/session segments.
 *
 * @param {string} filename
 * @returns {{ names: string[], rawParts: string[] }}
 */
function parseFilename(filename) {
  // Remove extension
  const base = filename.replace(/\.(mp4|mov)$/i, '');

  // Common dance styles to filter out (not names)
  const styleWords = new Set([
    'salsa', 'bachata', 'kizomba', 'zouk', 'semba', 'merengue',
    'reggaeton', 'cumbia', 'cha', 'chacha', 'rumba', 'samba',
    'tango', 'swing', 'hustle', 'west coast', 'lindy',
    'friday', 'saturday', 'sunday', 'monday', 'night',
    'day', 'morning', 'evening', 'session', 'social',
    'workshop', 'class', 'party', 'room', 'main',
    'night1', 'night2', 'night3', 'day1', 'day2', 'day3',
    'final', 'prelim', 'semi', 'heat', 'round',
    'j&j', 'jnj', 'jackjill', 'jack', 'jill',
    'competition', 'comp', 'show', 'demo', 'performance',
  ]);

  // Split on separators: &, -, _, "and", "y", "x", "with"
  // Always split on & and word connectors first, then on - and _
  const rawParts = base
    .split(/\s*[&]\s*|\s+(?:and|y|x|with|vs)\s+/i)
    .flatMap(part => {
      // Always split on dashes and underscores — these separate
      // names from each other or names from style/session info
      return part.split(/\s*[-_]\s*/);
    })
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Filter out style/session words, keep name-like parts
  const names = rawParts.filter(part => {
    const norm = normalizeName(part);
    // Skip pure numbers
    if (/^\d+$/.test(norm)) return false;
    // Skip known style/session words
    if (styleWords.has(norm)) return false;
    // Skip if ALL words in the part are style words
    const words = norm.split(' ');
    if (words.every(w => styleWords.has(w) || /^\d+$/.test(w))) return false;
    return true;
  });

  return { names, rawParts };
}

// ── FUZZY MATCHING ────────────────────────────────────

/**
 * Compute similarity between two strings (0-1).
 * Uses token overlap + character bigram similarity.
 * @param {string} a
 * @param {string} b
 * @returns {number} 0.0 to 1.0
 */
function stringSimilarity(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);

  if (na === nb) return 1.0;
  if (!na || !nb) return 0.0;

  // Token overlap score
  // Uses min(lengths) as denominator so that "Rocio" vs "Rocio Calidonio"
  // scores high — the shorter name fully matched.
  const tokensA = na.split(' ');
  const tokensB = nb.split(' ');
  let tokenMatches = 0;

  for (const ta of tokensA) {
    for (const tb of tokensB) {
      if (ta === tb) {
        tokenMatches++;
        break;
      }
      // Prefix match (abbreviations): "Roc" matches "Rocio"
      if (ta.length >= 3 && tb.startsWith(ta)) {
        tokenMatches += 0.8;
        break;
      }
      if (tb.length >= 3 && ta.startsWith(tb)) {
        tokenMatches += 0.8;
        break;
      }
    }
  }

  // Use min so that a single first name matching a "First Last" record
  // still scores highly (all tokens of the shorter string matched)
  const minTokens = Math.min(tokensA.length, tokensB.length);
  const maxTokens = Math.max(tokensA.length, tokensB.length);
  // Base on min, but penalize slightly when lengths differ
  const lengthPenalty = minTokens / maxTokens; // 1.0 if same length
  const tokenScore = minTokens > 0
    ? (tokenMatches / minTokens) * (0.8 + 0.2 * lengthPenalty)
    : 0;

  // Bigram similarity (Dice coefficient)
  const bigramsA = getBigrams(na);
  const bigramsB = getBigrams(nb);
  const intersection = bigramsA.filter(bg => bigramsB.includes(bg)).length;
  const bigramScore = (bigramsA.length + bigramsB.length) > 0
    ? (2 * intersection) / (bigramsA.length + bigramsB.length)
    : 0;

  // Weighted combination — token match is more important
  return tokenScore * 0.7 + bigramScore * 0.3;
}

/**
 * @param {string} str
 * @returns {string[]}
 */
function getBigrams(str) {
  const bigrams = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.slice(i, i + 2));
  }
  return bigrams;
}

/**
 * Check if any filename part appears inside an IG handle.
 * Strips @ and compares normalized tokens.
 * e.g. "Calidonio" found in "@rocalidonio" => true
 *
 * @param {string[]} fileNames — parsed name parts from filename
 * @param {string} igHandle — e.g. "@rocalidonio"
 * @returns {boolean}
 */
function igContainsNamePart(fileNames, igHandle) {
  if (!igHandle) return false;
  const igNorm = normalizeName(igHandle.replace('@', ''));
  for (const fn of fileNames) {
    const parts = normalizeName(fn).split(' ');
    for (const part of parts) {
      if (part.length >= 3 && igNorm.includes(part)) return true;
    }
  }
  return false;
}

/**
 * Match a single filename against all capture records.
 * Returns scored matches sorted by confidence.
 *
 * Uses name similarity as primary signal, plus IG handle cross-check
 * as a secondary signal to disambiguate ties.
 *
 * @param {string} filename
 * @param {Array<{id: string, fields: Record<string, any>}>} captures
 * @returns {Array<{capture: object, score: number, confidence: string, matchedNames: string[]}>}
 */
function matchFile(filename, captures) {
  const { names: fileNames } = parseFilename(filename);

  if (fileNames.length === 0) return [];

  const matches = [];

  for (const capture of captures) {
    const p1Name = capture.fields['Partner 1 Name'] || '';
    const p2Name = capture.fields['Partner 2 Name'] || '';
    const p1IG = capture.fields['Partner 1 IG'] || '';
    const p2IG = capture.fields['Partner 2 IG'] || '';

    if (!p1Name && !p2Name) continue;

    let bestP1Score = 0;
    let bestP2Score = 0;
    const matchedNames = [];

    // Try matching each parsed name against both partners
    for (const fn of fileNames) {
      if (p1Name) {
        const sim = stringSimilarity(fn, p1Name);
        if (sim > bestP1Score) bestP1Score = sim;
      }
      if (p2Name) {
        const sim = stringSimilarity(fn, p2Name);
        if (sim > bestP2Score) bestP2Score = sim;
      }
    }

    // IG cross-check: if a name part from the filename appears inside
    // the IG handle, boost the score for that partner
    const igBoostP1 = igContainsNamePart(fileNames, p1IG) ? 0.15 : 0;
    const igBoostP2 = igContainsNamePart(fileNames, p2IG) ? 0.15 : 0;
    bestP1Score = Math.min(1.0, bestP1Score + igBoostP1);
    bestP2Score = Math.min(1.0, bestP2Score + igBoostP2);

    // Calculate combined score
    const hasP1 = bestP1Score >= 0.5;
    const hasP2 = bestP2Score >= 0.5;

    if (!hasP1 && !hasP2) continue;

    let score;
    let confidence;

    if (hasP1 && hasP2) {
      // Both partners match — high confidence
      score = Math.round(((bestP1Score + bestP2Score) / 2) * 100);
      confidence = 'HIGH';
      if (p1Name) matchedNames.push(p1Name);
      if (p2Name) matchedNames.push(p2Name);
    } else if (hasP1) {
      // Only partner 1 matches
      score = Math.round(bestP1Score * 60); // cap at 60 for single match
      confidence = 'MEDIUM';
      if (p1Name) matchedNames.push(p1Name);
    } else {
      // Only partner 2 matches
      score = Math.round(bestP2Score * 60);
      confidence = 'MEDIUM';
      if (p2Name) matchedNames.push(p2Name);
    }

    if (score >= flags.minScore) {
      matches.push({ capture, score, confidence, matchedNames });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);
  return matches;
}

// ── DROPBOX SHARE LINK ────────────────────────────────

/**
 * Construct a Dropbox share URL from a local file path and base URL.
 * If --dropbox-base is provided, constructs the URL by appending
 * the relative file path to the base folder URL.
 *
 * @param {string} filePath — absolute path to the video file
 * @returns {string|null} share URL or null if no base configured
 */
function constructDropboxUrl(filePath) {
  if (!flags.dropboxBase) return null;

  const relativePath = path.relative(videoFolder, filePath);
  const encodedPath = encodeURIComponent(relativePath.replace(/\\/g, '/'));

  // Dropbox folder share URLs: append the filename
  // Format: base_url/filename?dl=0
  let base = flags.dropboxBase.replace(/\?.*$/, ''); // strip query params
  if (!base.endsWith('/')) base += '/';

  return `${base}${encodedPath}?dl=0`;
}

// ── LOCAL PREVIEW GENERATION ─────────────────────────

/**
 * Generate a 720p/10s/faststart preview file from a source video.
 * Output goes to {sourceFolder}_preview/{filename}.mp4
 * @param {string} sourcePath — full path to original video
 * @returns {Promise<string>} path to generated preview file
 */
function generateLocalPreview(sourcePath) {
  return new Promise((resolve, reject) => {
    const sourceDir = path.dirname(sourcePath);
    const previewDir = sourceDir + '_preview';
    if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });

    const baseName = path.basename(sourcePath, path.extname(sourcePath));
    const outFile = path.join(previewDir, baseName + '.mp4');

    // Skip if preview already exists
    if (fs.existsSync(outFile)) {
      console.log(`  Preview already exists: ${path.basename(outFile)}`);
      return resolve(outFile);
    }

    console.log(`  Generating preview: ${path.basename(outFile)}...`);
    const args = [
      '-y',
      '-i', sourcePath,
      '-t', '10',
      '-vf', 'scale=720:-2',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-b:v', '2M',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      outFile
    ];

    execFile(FFMPEG, args, { timeout: 120000 }, (err) => {
      if (err) {
        console.error(`  [error] ffmpeg failed: ${err.message}`);
        reject(err);
      } else {
        const size = fs.statSync(outFile).size;
        console.log(`  Preview generated: ${(size / 1024 / 1024).toFixed(1)} MB`);
        resolve(outFile);
      }
    });
  });
}

// ── AIRTABLE UPDATE ───────────────────────────────────

/**
 * Update a capture record's Preview URL in Airtable.
 * @param {string} recordId
 * @param {string} previewUrl
 * @returns {Promise<void>}
 */
async function updateCapturePreviewUrl(recordId, previewUrl) {
  await airtableFetch(`${CAPTURES_TABLE}/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: { 'Preview URL': previewUrl },
    }),
  });
}

/**
 * Trigger preview generation on the local server.
 * @param {string} captureId
 * @returns {Promise<void>}
 */
async function triggerPreviewGeneration(captureId) {
  try {
    await httpRequest(`${PREVIEW_SERVER}/api/preview/${captureId}`);
  } catch (err) {
    console.log(`  [warn] Preview trigger failed for ${captureId} — server may be offline`);
  }
}

// ── INTERACTIVE PROMPT ────────────────────────────────

/**
 * Ask user a yes/no question.
 * @param {string} question
 * @returns {Promise<boolean>}
 */
function askConfirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

// ── DISPLAY ───────────────────────────────────────────

/**
 * Format a capture record for display.
 * @param {object} capture
 * @returns {string}
 */
function formatCapture(capture) {
  const f = capture.fields;
  const parts = [];
  if (f['Partner 1 Name']) parts.push(f['Partner 1 Name']);
  if (f['Partner 2 Name']) parts.push(f['Partner 2 Name']);
  const names = parts.join(' & ') || '(unnamed)';
  const style = f['Dance Style'] || '';
  const session = f['Session'] || '';
  const ig1 = f['Partner 1 IG'] || '';
  const ig2 = f['Partner 2 IG'] || '';
  const igStr = [ig1, ig2].filter(Boolean).join(', ');

  let line = `  ${names}`;
  if (style) line += ` | ${style}`;
  if (session) line += ` | ${session}`;
  if (igStr) line += ` | ${igStr}`;
  return line;
}

// ── MAIN ──────────────────────────────────────────────

async function main() {
  console.log('=== SDTV Dropbox Auto-Match ===');
  console.log(`Folder: ${videoFolder}`);
  console.log(`Mode: ${flags.dryRun ? 'DRY RUN' : flags.auto ? 'AUTO' : 'INTERACTIVE'}`);
  if (flags.dropboxBase) console.log(`Dropbox base: ${flags.dropboxBase}`);
  console.log('');

  // 1. Scan folder for video files
  const files = fs.readdirSync(videoFolder)
    .filter(f => VIDEO_EXTENSIONS.has(path.extname(f)))
    .sort();

  if (files.length === 0) {
    console.log('No video files (.mp4, .mov) found in folder.');
    process.exit(0);
  }

  console.log(`Found ${files.length} video file(s):`);
  files.forEach(f => console.log(`  ${f}`));
  console.log('');

  // 2. Fetch captures without Preview URL from Airtable
  console.log('Fetching captures from Airtable...');

  let allCaptures = [];
  let offset = undefined;

  do {
    const fieldsQuery = READ_FIELDS.map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&');
    const formula = encodeURIComponent('OR({Preview URL}=BLANK(), {Preview URL}="")');
    let url = `${CAPTURES_TABLE}?filterByFormula=${formula}&${fieldsQuery}&pageSize=100`;
    if (offset) url += `&offset=${offset}`;

    const data = await airtableFetch(url);
    allCaptures = allCaptures.concat(data.records || []);
    offset = data.offset;
  } while (offset);

  if (allCaptures.length === 0) {
    console.log('No captures without Preview URL found. Nothing to match.');
    process.exit(0);
  }

  console.log(`Found ${allCaptures.length} capture(s) without Preview URL.`);
  console.log('');

  // 3. Match each file
  let applied = 0;
  let skipped = 0;
  let noMatch = 0;

  for (const file of files) {
    console.log(`--- ${file} ---`);

    // Parse names from filename
    const { names } = parseFilename(file);
    if (flags.verbose) {
      console.log(`  Parsed names: ${names.join(', ') || '(none detected)'}`);
    }

    // Find matches
    const matches = matchFile(file, allCaptures);

    if (matches.length === 0) {
      console.log('  No matches found.');
      noMatch++;
      console.log('');
      continue;
    }

    // Show top matches
    const topMatch = matches[0];
    console.log(`  Best match [${topMatch.confidence}] score=${topMatch.score}:`);
    console.log(formatCapture(topMatch.capture));

    if (matches.length > 1 && flags.verbose) {
      console.log(`  Other candidates (${matches.length - 1}):`);
      matches.slice(1, 4).forEach(m => {
        console.log(`    [${m.confidence}] score=${m.score}:`);
        console.log(`  ${formatCapture(m.capture)}`);
      });
    }

    // Decide whether to apply
    let shouldApply = false;

    if (flags.dryRun) {
      console.log('  [dry-run] Would apply this match.');
      skipped++;
    } else if (topMatch.confidence === 'HIGH' && flags.auto) {
      console.log('  [auto] Applying high-confidence match...');
      shouldApply = true;
    } else if (topMatch.confidence === 'HIGH' && !flags.auto) {
      shouldApply = await askConfirm('  Apply this match?');
    } else if (topMatch.confidence === 'MEDIUM') {
      if (flags.auto) {
        console.log('  [auto] Skipping medium-confidence match (use interactive mode to confirm).');
        skipped++;
      } else {
        shouldApply = await askConfirm('  Medium confidence. Apply this match?');
      }
    }

    if (shouldApply) {
      const filePath = path.join(videoFolder, file);
      const captureId = topMatch.capture.id;

      try {
        // a. Generate 720p preview locally → {folder}_preview/
        const previewPath = await generateLocalPreview(filePath);

        // b. Construct Dropbox share URL for the PREVIEW file (not original)
        const shareUrl = constructDropboxUrl(previewPath);

        if (!shareUrl) {
          console.log('  [error] No --dropbox-base provided. Cannot construct share URL.');
          console.log('  Provide --dropbox-base "https://www.dropbox.com/scl/fo/xxx/yyy?dl=0"');
          skipped++;
          console.log('');
          continue;
        }

        // c. Update Airtable with preview share URL
        console.log(`  Updating Airtable: Preview URL = ${shareUrl}`);
        await updateCapturePreviewUrl(captureId, shareUrl);

        // d. Trigger server-side cache warm (optional, server may not be running)
        console.log(`  Triggering server cache warm for ${captureId}...`);
        await triggerPreviewGeneration(captureId);

        // Remove from pool so it does not match again
        const idx = allCaptures.findIndex(c => c.id === captureId);
        if (idx !== -1) allCaptures.splice(idx, 1);

        applied++;
        console.log('  Done.');
      } catch (err) {
        console.error(`  [error] Failed: ${err.message}`);
        skipped++;
      }
    } else if (!flags.dryRun) {
      skipped++;
    }

    console.log('');
  }

  // 4. Summary
  console.log('=== Summary ===');
  console.log(`Files scanned:  ${files.length}`);
  console.log(`Matches applied: ${applied}`);
  console.log(`Skipped:         ${skipped}`);
  console.log(`No match:        ${noMatch}`);

  if (flags.dryRun) {
    console.log('');
    console.log('This was a dry run. No changes were made.');
    console.log('Remove --dry-run to apply matches.');
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
