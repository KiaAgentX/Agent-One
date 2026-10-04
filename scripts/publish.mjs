import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = path.resolve(HERE, '..');
const DIST = path.join(PORT, 'dist');
const PUB = path.join(PORT, '.publish');
const REMOTE = process.env.PUBLISH_REMOTE || 'https://github.com/KiaAgentX/portfolio.git';
const CHUNK = 9 * 1024 * 1024;

function sh(cmd, args, cwd, allowFail = false) {
  const r = spawnSync(cmd, args, {
    cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    /* never prompt: no GitHub account-picker dialogs, fail fast instead */
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
  });
  if (r.status !== 0 && !allowFail) {
    console.error(`CMD FAIL: ${cmd} ${args.join(' ')}\n${(r.stderr || '').slice(0, 2000)}`);
    process.exit(1);
  }
  return r;
}

function walk(dir, base = dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, acc);
    else acc.push({ rel: path.relative(base, p).replace(/\\/g, '/'), size: fs.statSync(p).size });
  }
  return acc;
}

/* deterministic chunking: order + greedy bins <= CHUNK, big files own bin */
function makeChunks(files) {
  const order = { 'index.html': 0 };
  const rank = f => {
    if (f.rel === 'index.html') return 0;
    if (f.rel.startsWith('assets/')) return 1;
    if (f.rel.startsWith('data/')) return 2;
    if (f.rel.startsWith('projects/')) return 3;
    return 4;
  };
  const sorted = [...files].sort((a, b) => rank(a) - rank(b) || a.rel.localeCompare(b.rel));
  const chunks = [];
  let cur = [], curSize = 0;
  for (const f of sorted) {
    if (f.size > CHUNK) {
      if (cur.length) { chunks.push(cur); cur = []; curSize = 0; }
      chunks.push([f]);
      continue;
    }
    if (curSize + f.size > CHUNK) { chunks.push(cur); cur = []; curSize = 0; }
    cur.push(f);
    curSize += f.size;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

const files = walk(DIST);
const total = files.reduce((a, f) => a + f.size, 0);
console.log(`dist: ${files.length} files, ${(total / 1048576).toFixed(1)} MB`);

const chunks = makeChunks(files);
console.log(`chunks: ${chunks.length}`);

/* prepare publish clone */
if (!fs.existsSync(path.join(PUB, '.git'))) {
  fs.rmSync(PUB, { recursive: true, force: true });
  console.log('cloning publish repo…');
  sh('git', ['clone', REMOTE, PUB], PORT);
}
/* ensure gh-pages branch */
const cur = sh('git', ['branch', '--show-current'], PUB, true).stdout.trim();
if (cur !== 'gh-pages') {
  const hasRemote = sh('git', ['ls-remote', '--heads', 'origin', 'gh-pages'], PUB, true).stdout.trim();
  if (hasRemote) {
    sh('git', ['checkout', 'gh-pages'], PUB);
  } else {
    sh('git', ['checkout', '--orphan', 'gh-pages'], PUB);
    sh('git', ['rm', '-rf', '--quiet', '.'], PUB, true);
    sh('git', ['commit', '-q', '--allow-empty', '-m', 'init'], PUB);
  }
}

function headHas(f) {
  const r = sh('git', ['cat-file', '-e', `HEAD:${f.rel}`], PUB, true);
  if (r.status !== 0) return false;
  const sz = sh('git', ['cat-file', '-s', `HEAD:${f.rel}`], PUB, true).stdout.trim();
  return Number(sz) === f.size;
}

let pushed = 0, skipped = 0, failed = 0;
for (let i = 0; i < chunks.length; i++) {
  const c = chunks[i];
  const pending = c.filter(f => !headHas(f));
  if (!pending.length) { skipped++; continue; }

  for (const f of c) {
    const src = path.join(DIST, f.rel);
    const dst = path.join(PUB, f.rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
  sh('git', ['add', '-A'], PUB);
  const mb = (c.reduce((a, f) => a + f.size, 0) / 1048576).toFixed(1);
  sh('git', ['commit', '-q', '-m', `chunk ${i + 1}/${chunks.length} (${mb} MB)`], PUB, true);

  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    console.log(`chunk ${i + 1}/${chunks.length} push (${mb} MB, attempt ${attempt})…`);
    const r = sh('git', ['push', 'origin', 'gh-pages'], PUB, true);
    if (r.status === 0) { ok = true; pushed++; }
    else console.log(`  retry needed: ${(r.stderr || '').split('\n')[0]}`);
    if (!ok && attempt < 3) spawnSync('ping', ['-n', '6', '127.0.0.1'], { stdio: 'ignore' });
  }
  if (!ok) { failed++; console.log(`CHUNK ${i + 1} FAILED — re-run this script to resume`); break; }
}

/* prune: delete tracked files that no longer exist in dist (e.g. removed hero.mp4) */
const treeR0 = sh('git', ['-c', 'core.quotePath=false', '-C', path.join(PORT, '.publish'), 'ls-tree', '-r', '--name-only', 'HEAD'], PORT);
const tracked = (treeR0.stdout || '').split('\n').map(s => s.trim()).filter(Boolean);
const distSet = new Set(files.map(f => f.rel));
const obsolete = tracked.filter(t => !distSet.has(t));
if (obsolete.length) {
  console.log(`pruning ${obsolete.length} obsolete file(s): ${obsolete.slice(0, 3).join(', ')}${obsolete.length > 3 ? '…' : ''}`);
  obsolete.forEach(t => sh('git', ['-C', path.join(PORT, '.publish'), 'rm', '-q', '--', t], PORT, true));
  const pr = sh('git', ['-C', path.join(PORT, '.publish'), 'commit', '-q', '-m', 'prune: remove files no longer in dist'], PORT, true);
  if (pr.status === 0) pushWithRetry();
}

/* final verification — path-based (CRLF-insensitive) against the publish clone */
const treeR = sh('git', ['-c', 'core.quotePath=false', '-C', path.join(PORT, '.publish'), 'ls-tree', '-r', '--name-only', 'HEAD'], PORT);
const treePaths = new Set((treeR.stdout || '').split('\n').map(s => s.trim()).filter(Boolean));
const missing = files.filter(f => !treePaths.has(f.rel));
if (failed === 0 && !missing.length) {
  console.log(`DONE: all ${files.length} files present on gh-pages (pushed ${pushed} chunks, skipped ${skipped})`);
  process.exit(0);
} else if (missing.length) {
  console.log(`INCOMPLETE: ${missing.length} files missing (e.g. ${missing[0].rel}) — re-run to resume`);
  process.exit(2);
} else {
  process.exit(1);
}
